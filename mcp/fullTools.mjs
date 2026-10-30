// The rest of the app for MCP clients: projects and templates, import / export, project
// settings (notes tabs, keywords, labels, statuses, custom fields, section types, targets,
// collections, bookmarks), comments and footnotes, binder operations (duplicate, split,
// merge, trash), snapshots, analysis (statistics, timeline, pacing, relations), research
// search, glossaries, web lookups, backups and the deterministic part of I-EDIT.
//
// Every tool goes through server.mjs `tool()`: write tools are refused in --read-only and
// logged in agent-log.jsonl; binder changes use `mutate` (project.json lock + backup);
// documents get a snapshot before they are overwritten, notes a backup; files written for
// the client go only to the path it names, never inside a project (`outsideProjects`).
// The logic lives in lib/ and src/lib/; this file only wires it. AI calls stay out: the
// MCP client is the AI (editorial_round hands it the round prompt instead).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { diffWords } from 'diff';
import { convertNode, duplicateNode, emptyTrash, findParent, flatten, inOrder, moveToTrash, restoreFromTrash, rootOf, updateNode } from '../src/lib/tree.js';
import { autofix, htmlToManuscript, profileFor, ROUNDS, roundContext, roundPrompt, systemPrompt } from '../src/lib/editorial.js';
import { authorParagraphs } from '../src/lib/authorText.js';
import { findCanonDoc, parseCanonIndex } from '../src/lib/canonIndex.js';
import {
  addKeyword,
  addToCollection,
  collectionNodes,
  createCollection,
  deleteCollection,
  deleteKeyword,
  listKeywords,
  moveInCollection,
  recolorCollection,
  removeFromCollection,
  renameCollection,
  renameKeyword,
  setKeywordColor,
  setKeywordParent,
} from '../src/lib/collections.js';
import { addNoteTab, moveNoteTab, projectNoteTabs, removeNoteTab, renameNoteTab } from '../src/lib/projectNotes.js';
import {
  deleteCustomField,
  deleteLabel,
  deleteSectionType,
  deleteStatus,
  FIELD_TYPES,
  NONE,
  renameCustomField,
  renameLabel,
  renameSectionType,
  renameStatus,
  uniqueId,
} from '../src/lib/projectSettings.js';
import { deadlinePlan, projectStats, projectText, sentenceLengths, wordFrequency } from '../src/lib/stats.js';
import { buildTimeline } from '../src/lib/timeline.js';
import { analyzePacing } from '../src/lib/pacing.js';
import { buildRelations } from '../src/lib/relations.js';
import { buildGlossaries, findGlossaryDoc, glossaryEntries, glossaryEntryHtml, glossaryHasTerm } from '../src/lib/glossary.js';
import { LOOKUPS, lookupGroups, lookupUrl } from '../src/lib/lookups.js';
import { mediaNode, opmlToNodes, parseComments, parseFootnotes, updateComment } from '../src/lib/panelsExtra.js';

const require = createRequire(import.meta.url);
const templates = require('../lib/templates.cjs');
const importers = require('../lib/importers.cjs');
const { splitHtml } = require('../lib/docxImport.cjs');
const { importScriv } = require('../lib/scrivImport.cjs');
const exporters = require('../lib/exporters.cjs');
const { exportScriv } = require('../lib/scrivExport.cjs');
const { scrivExportIo } = require('../electron/v04Handlers.cjs');
const notebookLm = require('../lib/notebookLm.cjs');
const editorPackage = require('../lib/editorPackage.cjs');
const bundle = require('../lib/bundle.cjs');
const backup = require('../lib/backup.cjs');
const rag = require('../lib/rag.cjs');
const compileFormats = require('../lib/compileFormats.cjs');
const { parseBibliography } = require('../lib/bibliography.cjs');

// Names of every tool this module registers (tests assert the server lists them all).
export const FULL_TOOL_NAMES = [];

export function registerFullTools(ctx) {
  const { z, project, store, load, mutate, trashIds, nodeOrThrow, textNodeOrThrow, pathOf, outsideProjects, addProject, appSettings, userData } = ctx;
  const tool = (name, ...rest) => {
    FULL_TOOL_NAMES.push(name);
    return ctx.tool(name, ...rest);
  };
  const W = { writes: true };

  // ------------------------------------------------------------------ helpers
  const templatesDir = () => path.join(userData, 'templates');
  const readDocSafe = (dir, id, kind = 'docs') => {
    try {
      return store.readDoc(dir, id, kind);
    } catch {
      return '';
    }
  };
  // id -> html for every binder item (and its notes when asked).
  const loadDocs = (dir, p, { notes = false } = {}) => {
    const docs = {};
    const notesById = {};
    for (const n of flatten(p.tree)) {
      if (n.root || n.type === 'file') continue;
      docs[n.id] = readDocSafe(dir, n.id);
      if (notes) notesById[n.id] = readDocSafe(dir, n.id, 'notes');
    }
    return { docs, notesById };
  };
  const existingDir = (p, what) => {
    const abs = path.resolve(p);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) throw new Error(`${what}: folderul nu există: ${abs}`);
    return abs;
  };
  const existingFile = (p) => {
    const abs = path.resolve(p);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new Error(`Fișier inexistent: ${abs}`);
    return abs;
  };
  // Output folder named by the client: must exist (or be creatable) and lie outside every project.
  const outputDir = (p) => {
    const abs = outsideProjects(p, 'output_dir');
    fs.mkdirSync(abs, { recursive: true });
    return abs;
  };
  const outputFile = (p) => {
    const abs = outsideProjects(p, 'output_path');
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    return abs;
  };
  const rootByKind = (p, kind) => p.tree.find((n) => n.root === kind) || (kind === 'research' ? p.tree[1] : p.tree[0]);
  const containerOrThrow = (p, id) => {
    const n = nodeOrThrow(p, id);
    if (!n.children) throw new Error('parent_id trebuie să fie un dosar.');
    if (trashIds(p).has(id) || n.root === 'trash') throw new Error('Nu se poate adăuga în coș.');
    return n;
  };
  const inTrash = (p, id) => {
    const r = rootOf(p.tree, id);
    return Boolean(r && r.root === 'trash');
  };
  const writeWithSnapshot = (dir, id, html, name) => {
    store.takeSnapshot(dir, id, name);
    store.writeDoc(dir, id, 'docs', html);
  };
  const writeNotesWithBackup = (dir, id, html) => {
    const old = readDocSafe(dir, id, 'notes');
    if (old) store.backupFile(dir, `notes-${id}.html`, old);
    store.writeDoc(dir, id, 'notes', html);
  };
  const textDocs = (p, id) => {
    if (!id) return flatten(p.tree).filter((n) => !n.root && n.type === 'text' && !inTrash(p, n.id));
    const n = nodeOrThrow(p, id);
    return (n.type === 'text' ? [n] : flatten(n.children || [])).filter((x) => x.type === 'text');
  };
  const slimNode = (n) => ({ id: n.id, title: n.title, type: n.type });
  const findTitle = (p, id) => flatten(p.tree).find((n) => n.id === id)?.title;
  const settings = () => appSettings();

  // ------------------------------------------------------------------ projects and templates
  tool('list_templates', 'Șabloanele de proiect: cele incluse și cele salvate de utilizator (id, nume, categorie).', {}, () => templates.listTemplates(templatesDir()), { global: true });

  tool(
    'create_project',
    'Creează un proiect nou dintr-un șablon (list_templates) în folderul parent_dir. Proiectul nou devine disponibil în această sesiune (parametrul project = calea întoarsă).',
    { parent_dir: z.string(), title: z.string().min(1), template: z.string().default('blank') },
    (_dir, { parent_dir, title, template }) => {
      const parent = existingDir(outsideProjects(parent_dir, 'parent_dir'), 'parent_dir');
      const dir = store.projectDirFor(parent, title.trim());
      if (template.startsWith(templates.USER_PREFIX)) templates.createFromUserTemplate(templatesDir(), template, dir, title.trim());
      else if (!templates.TEMPLATES[template]) throw new Error(`Șablon necunoscut: ${template}. Vezi list_templates.`);
      else store.createProject(dir, title.trim(), template);
      store.loadProject(dir); // missing sub-folders of a user template
      return { dir: addProject(dir), title: title.trim(), template };
    },
    { writes: true, global: true },
  );

  tool(
    'set_project_info',
    'Schimbă datele proiectului: titlu, autor (nume complet, prenume, nume), titlu prescurtat, profil editorial (karma | generic).',
    { project, title: z.string().optional(), author: z.string().optional(), author_first: z.string().optional(), author_last: z.string().optional(), title_abbreviation: z.string().optional(), editorial_profile: z.enum(['karma', 'generic']).optional() },
    (dir, input) => {
      const changed = [];
      mutate(dir, (p) => {
        for (const [k, key] of [['title', 'title'], ['author', 'author'], ['author_first', 'authorFirst'], ['author_last', 'authorLast'], ['title_abbreviation', 'titleAbbreviation']]) {
          if (input[k] === undefined) continue;
          if (k === 'title' && !input.title.trim()) throw new Error('Titlul nu poate fi gol.');
          p[key] = input[k];
          changed.push(key);
        }
        if (input.editorial_profile) {
          p.editorialProfile = { ...(p.editorialProfile || {}), base: input.editorial_profile };
          changed.push('editorialProfile');
        }
      });
      return `Actualizat: ${changed.join(', ') || 'nimic'}`;
    },
    W,
  );

  // ------------------------------------------------------------------ import
  tool(
    'import_files',
    'Importă fișiere în binder: DOCX, RTF, ODT, HTML, TXT, Markdown, Fountain, Final Draft (FDX) devin documente (opțional împărțite după titluri sau separator); OPML devine schiță (dosare/documente cu sinopsis); imaginile, PDF-urile, audio/video intră în media (Cercetare). Se citesc doar fișierele date.',
    {
      project,
      files: z.array(z.string()).min(1),
      parent_id: z.string().optional().describe('Dosarul în care intră (implicit: textele în Manuscris, media în Cercetare)'),
      split: z.enum(['none', 'h1', 'h2', 'separator']).default('none'),
      separator: z.string().default('#'),
    },
    async (dir, { files, parent_id, split, separator }) => {
      const p0 = load(dir);
      if (parent_id) containerOrThrow(p0, parent_id);
      const texts = [];
      const media = [];
      for (const f of files) {
        const file = existingFile(f);
        const base = path.basename(file).replace(/\.[^.]+$/, '');
        const ext = path.extname(file).toLowerCase();
        if (ext === '.opml') {
          texts.push(...opmlToNodes(importers.importOpml(fs.readFileSync(file, 'utf8')), p0, store.newNode));
        } else if (importers.classifyFile(file) === 'text') {
          for (const part of splitHtml(await importers.fileToHtml(file), split, separator, base)) {
            const node = store.newNode('text', part.title);
            store.writeDoc(dir, node.id, 'docs', part.html || '<p></p>');
            texts.push(node);
          }
        } else {
          const id = store.newId();
          const stored = store.writeMedia(dir, id, ext.slice(1) || 'bin', fs.readFileSync(file));
          media.push(mediaNode(store.newNode, { id, title: base, media: { file: stored, mime: store.mimeFor(stored), name: path.basename(file) } }));
        }
      }
      const p = mutate(dir, (pr) => {
        const into = (node, kind) => (parent_id ? nodeOrThrow(pr, parent_id) : rootByKind(pr, kind)).children.push(node);
        texts.forEach((n) => into(n, 'draft'));
        media.forEach((n) => into(n, 'research'));
      });
      return [...texts, ...media].map((n) => ({ id: n.id, title: n.title, type: n.type, path: pathOf(p, n.id) }));
    },
    W,
  );

  tool(
    'import_web_page',
    'Importă o pagină web (http/https) ca document în Cercetare (sau în parent_id), cu imaginile descărcate în media (copie offline).',
    { project, url: z.string(), parent_id: z.string().optional(), images: z.boolean().default(true) },
    async (dir, { url, parent_id, images }) => {
      let u;
      try {
        u = new URL(url);
      } catch {
        throw new Error('Adresă web invalidă.');
      }
      if (!/^https?:$/.test(u.protocol)) throw new Error('Sunt acceptate doar adrese http(s).');
      if (parent_id) containerOrThrow(load(dir), parent_id);
      const r = await fetch(u.href, { redirect: 'follow' });
      if (!r.ok) throw new Error(`Pagina nu a putut fi descărcată (HTTP ${r.status}).`);
      let page = importers.webPageToHtml(await r.text(), r.url || u.href);
      let media = [];
      if (images) {
        const local = await importers.localizeImages(page.html, {
          fetchImage: async (src) => {
            const res = await fetch(src, { redirect: 'follow' });
            if (!res.ok) return null;
            return { data: Buffer.from(await res.arrayBuffer()), mime: res.headers.get('content-type') || '' };
          },
          saveMedia: ({ data, ext, name }) => {
            const id = store.newId();
            const file = store.writeMedia(dir, id, ext, data);
            return { id, title: name.replace(/\.[^.]+$/, '') || 'Imagine', file, mime: store.mimeFor(file), name };
          },
        });
        page = { ...page, html: local.html };
        media = local.media.map((m) => mediaNode(store.newNode, { id: m.id, title: m.title, media: { file: m.file, mime: m.mime, name: m.name } }));
      }
      const node = store.newNode('text', page.title || u.href);
      store.writeDoc(dir, node.id, 'docs', page.html || '<p></p>');
      const p = mutate(dir, (pr) => {
        const parent = parent_id ? nodeOrThrow(pr, parent_id) : rootByKind(pr, 'research');
        parent.children.push(node, ...media);
      });
      return { id: node.id, title: node.title, path: pathOf(p, node.id), images: media.length };
    },
    W,
  );

  tool(
    'import_bibliography',
    'Importă bibliografia proiectului dintr-un fișier BibTeX (.bib) sau CSL-JSON (Zotero); înlocuiește bibliografia existentă.',
    { project, file: z.string() },
    (dir, { file }) => {
      const entries = parseBibliography(fs.readFileSync(existingFile(file), 'utf8'));
      mutate(dir, (p) => {
        p.bibliography = entries;
      });
      return `${entries.length} intrări bibliografice importate.`;
    },
    W,
  );

  tool(
    'import_scriv',
    'Importă un proiect Scrivener (.scriv) ca proiect Pneuma Sofer nou în dest_dir. Proiectul nou devine disponibil în această sesiune.',
    { scriv_path: z.string(), dest_dir: z.string() },
    (_dir, { scriv_path, dest_dir }) => {
      const src = existingDir(scriv_path, 'scriv_path');
      const dest = existingDir(outsideProjects(dest_dir, 'dest_dir'), 'dest_dir');
      const res = importScriv(src, dest);
      return { dir: addProject(res.dir), title: res.project.title, report: res.stats };
    },
    { writes: true, global: true },
  );

  tool(
    'import_bundle',
    'Importă un pachet de proiect (.scribner.json, din versiunea web/mobil sau export_bundle) ca proiect nou în dest_dir.',
    { file: z.string(), dest_dir: z.string() },
    (_dir, { file, dest_dir }) => {
      const data = JSON.parse(fs.readFileSync(existingFile(file), 'utf8'));
      const dest = existingDir(outsideProjects(dest_dir, 'dest_dir'), 'dest_dir');
      const res = bundle.importBundle(data, dest);
      return { dir: addProject(res.dir), title: res.project.title };
    },
    { writes: true, global: true },
  );

  // ------------------------------------------------------------------ export
  tool(
    'export_documents',
    'Exportă documentele câte un fișier (docx | odt | rtf | md | txt | html), cu structura binderului, în output_dir/<Titlu>; opțional doar ids, cu note, sinopsis, metadate, reviziile urmărite (docx).',
    {
      project,
      output_dir: z.string(),
      format: z.enum(exporters.FORMATS).default('docx'),
      ids: z.array(z.string()).optional(),
      with_notes: z.boolean().default(false),
      with_synopsis: z.boolean().default(false),
      with_meta: z.boolean().default(false),
      track_changes: z.boolean().default(false),
    },
    async (dir, { output_dir, format, ids, with_notes, with_synopsis, with_meta, track_changes }) => {
      const p = load(dir);
      if (ids) ids.forEach((id) => nodeOrThrow(p, id));
      const outDir = outsideProjects(path.join(outputDir(output_dir), exporters.safeName(p.title || 'Export')));
      const res = await exporters.exportDocuments(p, dir, (id) => readDocSafe(dir, id), (id) => readDocSafe(dir, id, 'notes'), ids || null, outDir, {
        format,
        withNotes: with_notes,
        withSynopsis: with_synopsis,
        withMeta: with_meta,
        trackChanges: format === 'docx' && track_changes,
      });
      return { dir: outDir, count: res.count, files: res.files.length };
    },
    W,
  );

  tool(
    'export_outline',
    'Exportă schița binderului: opml (titluri, sinopsis, etichetă, status) sau csv (metadatele și numărul de cuvinte al fiecărui element).',
    { project, format: z.enum(['opml', 'csv']), output_path: z.string() },
    (dir, { format, output_path }) => {
      const p = load(dir);
      const out = outputFile(output_path);
      if (format === 'opml') fs.writeFileSync(out, exporters.exportOpml(p));
      else {
        const counts = {};
        store.walk(p.tree, (n) => {
          if (n.type !== 'file') counts[n.id] = store.wordCount(readDocSafe(dir, n.id));
        });
        fs.writeFileSync(out, exporters.exportMetadataCsv(p, counts));
      }
      return `Exportat: ${out}`;
    },
    W,
  );

  tool(
    'export_scriv',
    'Exportă proiectul ca proiect Scrivener 3 (.scriv) în output_dir: text, note, media, snapshot-uri, etichete, statusuri, cuvinte cheie, istoricul scrisului.',
    { project, output_dir: z.string() },
    (dir, { output_dir }) => {
      const res = exportScriv(load(dir), scrivExportIo(store, dir), outputDir(output_dir));
      return { dir: res.dir, items: res.items, media: res.media, snapshots: res.snapshots, comments: res.comments, warnings: res.warnings };
    },
    W,
  );

  tool(
    'export_notebooklm',
    'Pregătește sursele pentru NotebookLM (cuprins, capitole, cercetare, note) ca fișiere Markdown în output_dir/NotebookLM - <Titlu>.',
    { project, output_dir: z.string(), include_notes: z.boolean().default(true), include_synopsis: z.boolean().default(true), include_metadata: z.boolean().default(true), include_research: z.boolean().default(true) },
    (dir, { output_dir, include_notes, include_synopsis, include_metadata, include_research }) =>
      notebookLm.exportNotebookLm({
        project: load(dir),
        readDoc: (id, kind) => readDocSafe(dir, id, kind),
        outDir: outputDir(output_dir),
        includeNotes: include_notes,
        includeSynopsis: include_synopsis,
        includeMetadata: include_metadata,
        includeResearch: include_research,
      }),
    W,
  );

  tool(
    'export_editor_package',
    'Creează pachetul PENTRU EDITOR în output_dir: manuscrisul compilat, sinopsisul, glosarele, cuprinsul de tipar, raportul I-REP și jurnalul snapshot-urilor.',
    {
      project,
      output_dir: z.string(),
      manuscript_format: z.enum(['docx', 'odt', 'rtf', 'epub', 'html', 'md', 'txt']).default('docx'),
      synopsis: z.boolean().default(true),
      glossaries: z.boolean().default(true),
      report: z.boolean().default(true),
      snapshots: z.boolean().default(true),
    },
    async (dir, { output_dir, manuscript_format, synopsis, glossaries, report, snapshots }) => {
      const p = load(dir);
      const pkg = await editorPackage.buildEditorPackage(p, (id) => readDocSafe(dir, id), (id) => readDocSafe(dir, id, 'notes'), outputDir(output_dir), {
        manuscript: { format: manuscript_format },
        synopsis: synopsis ? {} : false,
        glossaries: glossaries ? {} : false,
        report: report ? {} : false,
        snapshots: snapshots ? {} : false,
        compile: { projectDir: dir },
        settings: settings(),
        readSnapshots: (id) => store.listSnapshots(dir, id),
      });
      return { dir: pkg.dir, files: pkg.files.map((f) => f.name) };
    },
    W,
  );

  tool(
    'export_bundle',
    'Exportă proiectul ca pachet într-un singur fișier JSON (pentru versiunea web/mobil): text, note, snapshot-uri (fără media).',
    { project, output_path: z.string() },
    (dir, { output_path }) => {
      const out = outputFile(output_path);
      fs.writeFileSync(out, JSON.stringify(bundle.exportBundle(dir)));
      return `Exportat: ${out}`;
    },
    W,
  );

  tool(
    'save_project_as',
    'Salvează o copie a proiectului cu titlu nou în parent_dir (Salvează ca). Copia devine disponibilă în această sesiune.',
    { project, parent_dir: z.string(), title: z.string().min(1) },
    (dir, { parent_dir, title }) => {
      const copy = exporters.saveProjectAs(dir, existingDir(outsideProjects(parent_dir, 'parent_dir'), 'parent_dir'), title);
      return { dir: addProject(copy.dir), title: copy.project.title };
    },
    W,
  );

  tool('list_compile_formats', 'Formatele de Compile disponibile (presetări, formate globale, formate ale proiectului): id și nume, pentru compile format_id.', { project }, (dir) => {
    const p = load(dir);
    const own = new Set(((p.compile && p.compile.formats) || []).map((f) => f.id));
    const presets = new Set(compileFormats.PRESETS.map((f) => f.id));
    return {
      current: (p.compile && p.compile.formatId) || null,
      formats: compileFormats.allFormats(p).map((f) => ({ id: f.id, name: f.name, source: own.has(f.id) ? 'proiect' : presets.has(f.id) ? 'presetare' : 'global', basedOn: f.basedOn })),
    };
  });

  // ------------------------------------------------------------------ project notes (tabs)
  tool('list_project_notes', 'Taburile de note ale proiectului (id, titlu, număr de cuvinte). Textul se citește/scrie cu get_notes/set_notes și id-ul tabului.', { project }, (dir) =>
    projectNoteTabs(load(dir)).map((t) => ({ ...t, words: store.wordCount(readDocSafe(dir, t.id, 'notes')) })),
  );

  tool(
    'manage_project_note_tab',
    'Taburile de note ale proiectului: add (title, content opțional) | rename (id, title) | remove (id; textul rămâne pe disc, cu backup) | move (id, delta -1/+1).',
    { project, action: z.enum(['add', 'rename', 'remove', 'move']), id: z.string().optional(), title: z.string().optional(), content: z.string().optional(), delta: z.number().int().optional() },
    (dir, { action, id, title, content, delta }) => {
      let added = null;
      const p = mutate(dir, (pr) => {
        const tabs = projectNoteTabs(pr);
        if (action !== 'add' && !tabs.some((t) => t.id === id)) throw new Error(`Tab de note inexistent: ${id}`);
        if (action === 'add') {
          const res = addNoteTab(pr.projectNotes, title);
          added = res.tab;
          pr.projectNotes = res.tabs;
        } else if (action === 'rename') {
          if (!title || !title.trim()) throw new Error('Titlul lipsește.');
          pr.projectNotes = renameNoteTab(pr.projectNotes, id, title);
        } else if (action === 'remove') {
          const next = removeNoteTab(pr.projectNotes, id);
          if (next.length === tabs.length) throw new Error('Primul tab de note nu poate fi șters.');
          pr.projectNotes = next;
        } else pr.projectNotes = moveNoteTab(pr.projectNotes, id, delta || 0);
      });
      if (added && content) store.writeDoc(dir, added.id, 'notes', `${content.split(/\n{2,}/).map((s) => `<p>${s.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join('')}`);
      if (action === 'remove') {
        const old = readDocSafe(dir, id, 'notes');
        if (old) store.backupFile(dir, `notes-${id}.html`, old);
      }
      return { tabs: projectNoteTabs(p), added };
    },
    W,
  );

  // ------------------------------------------------------------------ keywords
  tool('list_keywords', 'Cuvintele cheie ale proiectului: nume, culoare, părinte, de câte ori sunt folosite.', { project }, (dir) => listKeywords(load(dir)));

  tool(
    'manage_keyword',
    'Cuvinte cheie: add (name, color, parent) | rename (name, new_name; peste tot în binder) | delete (name; scos din toate documentele) | set_color (name, color) | set_parent (name, parent; "" fără părinte).',
    { project, action: z.enum(['add', 'rename', 'delete', 'set_color', 'set_parent']), name: z.string().min(1), new_name: z.string().optional(), color: z.string().optional(), parent: z.string().optional() },
    (dir, { action, name, new_name, color, parent }) => {
      mutate(dir, (p) => {
        const known = listKeywords(p).some((k) => k.name === name);
        if (action !== 'add' && !known) throw new Error(`Cuvânt cheie inexistent: ${name}`);
        if (action === 'add') return addKeyword(p, name, { color: color || '', parent: parent || null });
        if (action === 'rename') {
          if (!new_name || !new_name.trim()) throw new Error('new_name lipsește.');
          return renameKeyword(p, name, new_name);
        }
        if (action === 'delete') return deleteKeyword(p, name);
        if (action === 'set_color') return setKeywordColor(p, name, color || '');
        const next = setKeywordParent(p, name, parent || null);
        if (parent && (next.keywordDefs || []).find((d) => d.name === name)?.parent !== parent) throw new Error('Părinte invalid (ciclu).');
        return next;
      });
      return listKeywords(load(dir)).find((k) => k.name === (action === 'rename' ? new_name.trim() : name)) || `Șters: ${name}`;
    },
    W,
  );

  // ------------------------------------------------------------------ labels, statuses, custom fields, section types
  tool(
    'manage_label',
    `Etichete: add (name, color) | rename (name, new_name; peste tot în binder) | delete (name; elementele trec la „${NONE}”) | set_color (name, color). „${NONE}” nu se schimbă.`,
    { project, action: z.enum(['add', 'rename', 'delete', 'set_color']), name: z.string().min(1), new_name: z.string().optional(), color: z.string().optional() },
    (dir, { action, name, new_name, color }) => {
      const p = mutate(dir, (pr) => {
        const labels = pr.labels || [];
        const has = (n) => labels.some((l) => l.name === n);
        if (action === 'add') {
          if (has(name)) throw new Error(`Eticheta există deja: ${name}`);
          pr.labels = [...labels, { name, color: color || '' }];
          return pr;
        }
        if (!has(name)) throw new Error(`Etichetă inexistentă: ${name}`);
        if (name === NONE && action !== 'set_color') throw new Error(`Eticheta „${NONE}” nu poate fi schimbată.`);
        if (action === 'rename') {
          if (!new_name || !new_name.trim() || has(new_name.trim())) throw new Error('new_name lipsește sau există deja.');
          return renameLabel(pr, name, new_name.trim());
        }
        if (action === 'delete') return deleteLabel(pr, name);
        pr.labels = labels.map((l) => (l.name === name ? { ...l, color: color || '' } : l));
        return pr;
      });
      return p.labels;
    },
    W,
  );

  tool(
    'manage_status',
    `Statusuri: add (name) | rename (name, new_name; peste tot în binder) | delete (name; elementele trec la „${NONE}”) | move (name, delta -1/+1).`,
    { project, action: z.enum(['add', 'rename', 'delete', 'move']), name: z.string().min(1), new_name: z.string().optional(), delta: z.number().int().optional() },
    (dir, { action, name, new_name, delta }) => {
      const p = mutate(dir, (pr) => {
        const list = pr.statuses || [];
        if (action === 'add') {
          if (list.includes(name)) throw new Error(`Statusul există deja: ${name}`);
          pr.statuses = [...list, name];
          return pr;
        }
        if (!list.includes(name)) throw new Error(`Status inexistent: ${name}`);
        if (name === NONE) throw new Error(`Statusul „${NONE}” nu poate fi schimbat.`);
        if (action === 'rename') {
          if (!new_name || !new_name.trim() || list.includes(new_name.trim())) throw new Error('new_name lipsește sau există deja.');
          return renameStatus(pr, name, new_name.trim());
        }
        if (action === 'delete') return deleteStatus(pr, name);
        const i = list.indexOf(name);
        const j = i + (delta || 0);
        if (j < 1 || j >= list.length) return false; // "Fără" stays first
        const next = [...list];
        [next[i], next[j]] = [next[j], next[i]];
        pr.statuses = next;
        return pr;
      });
      return p.statuses;
    },
    W,
  );

  tool(
    'manage_custom_field',
    `Metadate personalizate: add (title, type ${FIELD_TYPES.join('|')}, options pentru list, default) | rename (title, new_title; valorile se păstrează) | delete (title; valorile se șterg). Valorile se pun cu set_metadata custom.`,
    { project, action: z.enum(['add', 'rename', 'delete']), title: z.string().min(1), new_title: z.string().optional(), type: z.enum(FIELD_TYPES).default('text'), options: z.array(z.string()).optional(), default: z.union([z.string(), z.boolean()]).optional() },
    (dir, input) => {
      const p = mutate(dir, (pr) => {
        const fields = pr.customFields || [];
        const has = (t) => fields.some((f) => f.title === t);
        if (input.action === 'add') {
          if (has(input.title)) throw new Error(`Câmpul există deja: ${input.title}`);
          const optIds = new Set();
          const options = input.type === 'list' ? (input.options || []).map((t) => { const id = uniqueId('opt', optIds); optIds.add(id); return { id, title: t }; }) : [];
          const def = input.type === 'checkbox' ? input.default === true || input.default === 'true' : input.default ?? '';
          pr.customFields = [...fields, { id: uniqueId('field', fields.map((f) => f.id)), title: input.title, type: input.type, options, default: def, wraps: false }];
          return pr;
        }
        if (!has(input.title)) throw new Error(`Câmp inexistent: ${input.title}`);
        if (input.action === 'rename') {
          if (!input.new_title || !input.new_title.trim() || has(input.new_title.trim())) throw new Error('new_title lipsește sau există deja.');
          return renameCustomField(pr, input.title, input.new_title.trim());
        }
        return deleteCustomField(pr, input.title);
      });
      return p.customFields;
    },
    W,
  );

  tool(
    'manage_section_type',
    'Tipuri de secțiune (pentru Compile): add (title) | rename (title, new_title) | delete (title) | set_level (level folders|containers|files; title "" = automat). Tipul unui element se pune cu set_metadata section_type.',
    { project, action: z.enum(['add', 'rename', 'delete', 'set_level']), title: z.string(), new_title: z.string().optional(), level: z.enum(['folders', 'containers', 'files']).optional() },
    (dir, { action, title, new_title, level }) => {
      const p = mutate(dir, (pr) => {
        const types = pr.sectionTypes || [];
        const find = (t) => types.find((x) => x.title === t);
        if (action === 'add') {
          if (!title.trim() || find(title)) throw new Error('Titlul lipsește sau există deja.');
          pr.sectionTypes = [...types, { id: uniqueId('st', types.map((t) => t.id)), title: title.trim() }];
          return pr;
        }
        if (action === 'set_level') {
          if (!level) throw new Error('level lipsește.');
          if (title && !find(title)) throw new Error(`Tip de secțiune inexistent: ${title}`);
          pr.sectionTypeLevels = { folders: null, containers: null, files: null, ...(pr.sectionTypeLevels || {}), [level]: title ? find(title).id : null };
          return pr;
        }
        if (!find(title)) throw new Error(`Tip de secțiune inexistent: ${title}`);
        if (action === 'rename') {
          if (!new_title || !new_title.trim() || find(new_title.trim())) throw new Error('new_title lipsește sau există deja.');
          return renameSectionType(pr, title, new_title.trim());
        }
        return deleteSectionType(pr, title);
      });
      return { sectionTypes: p.sectionTypes || [], sectionTypeLevels: p.sectionTypeLevels || {} };
    },
    W,
  );

  // ------------------------------------------------------------------ targets
  const draftWordsOf = (dir, p, onlyCompiled) =>
    flatten(p.tree[0].children || []).filter((n) => n.type === 'text' && (!onlyCompiled || n.includeInCompile !== false)).reduce((s, n) => s + store.wordCount(readDocSafe(dir, n.id)), 0);

  tool('get_targets', 'Țintele proiectului (manuscris, sesiune, termen, zile de scris), cuvintele actuale, planul pe zi până la termen și țintele documentelor.', { project }, (dir) => {
    const p = load(dir);
    const t = p.targets || {};
    const words = draftWordsOf(dir, p, t.countOnlyCompiled);
    return {
      targets: t,
      draftWords: words,
      draftPercent: t.draft ? Math.round((words / t.draft) * 1000) / 10 : null,
      plan: deadlinePlan(t, words),
      documents: flatten(p.tree)
        .filter((n) => n.target > 0)
        .map((n) => {
          const w = store.wordCount(readDocSafe(dir, n.id));
          return { id: n.id, title: n.title, target: n.target, words: w, percent: Math.round((w / n.target) * 1000) / 10 };
        }),
    };
  });

  tool(
    'set_targets',
    'Schimbă țintele proiectului: draft (cuvinte/caractere în manuscris), session, deadline (AAAA-LL-ZZ, "" fără termen), writing_days (0=duminică…6), session_reset, count_only_compiled, notificări. Ținta unui document: set_metadata target.',
    {
      project,
      draft: z.number().int().min(0).optional(),
      draft_type: z.enum(['Words', 'Characters']).optional(),
      session: z.number().int().min(0).optional(),
      session_type: z.enum(['Words', 'Characters']).optional(),
      deadline: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).optional(),
      writing_days: z.array(z.number().int().min(0).max(6)).optional(),
      session_reset: z.string().optional(),
      count_only_compiled: z.boolean().optional(),
      notify: z.boolean().optional(),
      notify_documents: z.boolean().optional(),
      words_per_page: z.number().int().min(1).optional(),
    },
    (dir, input) => {
      const map = { draft: 'draft', draft_type: 'draftType', session: 'session', session_type: 'sessionType', deadline: 'deadline', writing_days: 'writingDays', session_reset: 'sessionReset', count_only_compiled: 'countOnlyCompiled', notify: 'notify', notify_documents: 'notifyDocuments', words_per_page: 'wordsPerPage' };
      const p = mutate(dir, (pr) => {
        const t = { ...(pr.targets || {}) };
        for (const [k, key] of Object.entries(map)) if (input[k] !== undefined) t[key] = input[k];
        pr.targets = t;
      });
      return p.targets;
    },
    W,
  );

  // ------------------------------------------------------------------ collections
  const collectionOrThrow = (p, id) => {
    const c = (p.collections || []).find((x) => x.id === id);
    if (!c) throw new Error(`Colecție inexistentă: ${id}`);
    return c;
  };

  tool('list_collections', 'Colecțiile proiectului (manuale sau căutări salvate) cu elementele lor, în ordine.', { project }, (dir) => {
    const p = load(dir);
    const needDocs = (p.collections || []).some((c) => c.type === 'search');
    const { docs, notesById } = needDocs ? loadDocs(dir, p, { notes: true }) : { docs: {}, notesById: {} };
    return (p.collections || []).map((c) => ({ id: c.id, title: c.title, color: c.color || '', type: c.type, search: c.search, items: collectionNodes(p, c, docs, notesById).map(slimNode) }));
  });

  tool(
    'manage_collection',
    'Colecții: create (title, type manual|search, ids sau query, color) | rename (collection_id, title) | recolor (collection_id, color) | delete (collection_id) | add / remove (collection_id, ids) | move (collection_id, ids[0], index).',
    {
      project,
      action: z.enum(['create', 'rename', 'recolor', 'delete', 'add', 'remove', 'move']),
      collection_id: z.string().optional(),
      title: z.string().optional(),
      color: z.string().optional(),
      type: z.enum(['manual', 'search']).default('manual'),
      ids: z.array(z.string()).optional(),
      query: z.string().optional(),
      search_options: z.record(z.string(), z.any()).optional(),
      index: z.number().int().min(0).optional(),
    },
    (dir, input) => {
      let createdId = null;
      const p = mutate(dir, (pr) => {
        for (const id of input.ids || []) nodeOrThrow(pr, id);
        if (input.action === 'create') {
          const res = createCollection(pr, { title: input.title || 'Colecție nouă', color: input.color || '', type: input.type, ids: input.ids || [], search: input.type === 'search' ? { query: input.query || '', options: input.search_options || {} } : null });
          createdId = res.id;
          return res.project;
        }
        const c = collectionOrThrow(pr, input.collection_id);
        switch (input.action) {
          case 'rename':
            if (!input.title) throw new Error('title lipsește.');
            return renameCollection(pr, c.id, input.title);
          case 'recolor':
            return recolorCollection(pr, c.id, input.color || '');
          case 'delete':
            return deleteCollection(pr, c.id);
          case 'add':
            if (c.type === 'search') throw new Error('O căutare salvată nu primește elemente manual.');
            return addToCollection(pr, c.id, input.ids || []);
          case 'remove':
            return removeFromCollection(pr, c.id, input.ids || []);
          default:
            if (!input.ids || !input.ids.length || input.index === undefined) throw new Error('move: ids[0] și index.');
            return moveInCollection(pr, c.id, input.ids[0], input.index);
        }
      });
      const id = createdId || input.collection_id;
      const c = (p.collections || []).find((x) => x.id === id);
      return c ? { id: c.id, title: c.title, type: c.type, ids: c.ids, search: c.search } : `Colecție ștearsă: ${id}`;
    },
    W,
  );

  tool('list_bookmarks', 'Semnele de carte ale proiectului (id, titlu).', { project }, (dir) => {
    const p = load(dir);
    return (p.bookmarks || []).map((b) => ({ id: b.id, title: findTitle(p, b.id) ?? b.title }));
  });

  tool(
    'manage_bookmark',
    'Semnele de carte ale proiectului: add (id) | remove (id).',
    { project, action: z.enum(['add', 'remove']), id: z.string() },
    (dir, { action, id }) => {
      const p = mutate(dir, (pr) => {
        const list = pr.bookmarks || [];
        if (action === 'add') {
          const n = nodeOrThrow(pr, id);
          if (list.some((b) => b.id === id)) return false;
          pr.bookmarks = [...list, { id, title: n.title }];
        } else {
          if (!list.some((b) => b.id === id)) throw new Error('Elementul nu are semn de carte.');
          pr.bookmarks = list.filter((b) => b.id !== id);
        }
      });
      return p.bookmarks || [];
    },
    W,
  );

  // ------------------------------------------------------------------ comments and footnotes
  tool(
    'list_comments',
    'Comentariile unui document (index, text, fragmentul comentat, autor, culoare, dată) sau, fără id, ale tuturor documentelor.',
    { project, id: z.string().optional() },
    (dir, { id }) => {
      const p = load(dir);
      if (id) {
        textNodeOrThrow(dir, id);
        return parseComments(store.readDoc(dir, id));
      }
      return textDocs(p).map((n) => ({ id: n.id, title: n.title, comments: parseComments(readDocSafe(dir, n.id)) })).filter((d) => d.comments.length);
    },
  );

  tool(
    'update_comment',
    'Schimbă textul sau culoarea comentariului cu numărul index (din list_comments). Face snapshot înainte.',
    { project, id: z.string(), index: z.number().int().min(0), text: z.string().optional(), color: z.string().optional() },
    (dir, { id, index, text: t, color }) => {
      textNodeOrThrow(dir, id);
      const html = store.readDoc(dir, id);
      if (!parseComments(html)[index]) throw new Error(`Comentariu inexistent: ${index}`);
      const patch = {};
      if (t !== undefined) patch.text = t;
      if (color !== undefined) patch.color = color;
      writeWithSnapshot(dir, id, updateComment(html, index, patch), 'Înainte de modificarea unui comentariu (agent AI)');
      return parseComments(store.readDoc(dir, id))[index];
    },
    W,
  );

  tool(
    'delete_comment',
    'Rezolvă (șterge) comentariul cu numărul index; textul comentat rămâne. Face snapshot înainte.',
    { project, id: z.string(), index: z.number().int().min(0) },
    (dir, { id, index }) => {
      textNodeOrThrow(dir, id);
      const html = store.readDoc(dir, id);
      const c = parseComments(html)[index];
      if (!c) throw new Error(`Comentariu inexistent: ${index}`);
      writeWithSnapshot(dir, id, updateComment(html, index, null), 'Înainte de ștergerea unui comentariu (agent AI)');
      return `Comentariu șters: „${c.text}” (pe „${c.on}”).`;
    },
    W,
  );

  tool(
    'list_footnotes',
    'Notele de subsol ale unui document (inline și legate: text, fragmentul ancorat, textul dinainte) sau, fără id, ale tuturor documentelor.',
    { project, id: z.string().optional() },
    (dir, { id }) => {
      const p = load(dir);
      if (id) {
        textNodeOrThrow(dir, id);
        return parseFootnotes(store.readDoc(dir, id));
      }
      return textDocs(p).map((n) => ({ id: n.id, title: n.title, footnotes: parseFootnotes(readDocSafe(dir, n.id)) })).filter((d) => d.footnotes.length);
    },
  );

  // ------------------------------------------------------------------ binder operations
  tool(
    'duplicate_item',
    'Duplică un element (cu text, note, sinopsis și metadate), opțional cu tot cu subdocumentele; copia apare imediat după original.',
    { project, id: z.string(), with_children: z.boolean().default(true) },
    (dir, { id, with_children }) => {
      const p0 = load(dir);
      const n = nodeOrThrow(p0, id);
      if (n.root) throw new Error('Rădăcinile nu pot fi duplicate.');
      const res = duplicateNode(p0.tree, id, { withChildren: with_children, newId: store.newId });
      // Text and notes first: when the app sees the copies their documents already exist.
      for (const [from, to] of res.pairs) {
        const html = readDocSafe(dir, from);
        const notes = readDocSafe(dir, from, 'notes');
        if (html) store.writeDoc(dir, to, 'docs', html);
        if (notes) store.writeDoc(dir, to, 'notes', notes);
      }
      const copy = structuredClone(flatten(res.tree).find((x) => x.id === res.id));
      const p = mutate(dir, (pr) => {
        nodeOrThrow(pr, id);
        const parent = findParent(pr.tree, id);
        const list = parent ? parent.children : pr.tree;
        list.splice(list.findIndex((x) => x.id === id) + 1, 0, copy);
      });
      return { id: copy.id, path: pathOf(p, copy.id), items: res.pairs.length };
    },
    W,
  );

  tool(
    'split_document',
    'Împarte un document în două la prima apariție a textului at_text (începutul părții a doua, în interiorul unui paragraf sau la început de paragraf). Partea a doua devine document nou imediat după. Face snapshot înainte.',
    { project, id: z.string(), at_text: z.string().min(1), new_title: z.string().optional() },
    (dir, { id, at_text, new_title }) => {
      const n = textNodeOrThrow(dir, id);
      const html = store.readDoc(dir, id);
      const idx = html.indexOf(at_text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      if (idx < 0) throw new Error('Textul nu a fost găsit exact (în interiorul unui singur paragraf, fără formatare la mijloc).');
      const { before, after } = splitHtmlAt(html, idx);
      if (!store.htmlToText(before).trim()) throw new Error('Prima parte ar rămâne goală.');
      store.takeSnapshot(dir, id, 'Automat înainte de împărțire (agent AI)');
      const second = store.newNode('text', new_title || `${n.title} (continuare)`);
      second.label = n.label;
      second.status = n.status;
      store.writeDoc(dir, second.id, 'docs', after);
      const p = mutate(dir, (pr) => {
        nodeOrThrow(pr, id);
        const parent = findParent(pr.tree, id);
        const list = parent ? parent.children : pr.tree;
        list.splice(list.findIndex((x) => x.id === id) + 1, 0, second);
      });
      store.writeDoc(dir, id, 'docs', before);
      return { id: second.id, path: pathOf(p, second.id), wordsFirst: store.wordCount(before), wordsSecond: store.wordCount(after) };
    },
    W,
  );

  tool(
    'merge_documents',
    'Unește documentele text date (cel puțin două) în primul, în ordinea din binder, cu separator „* * *”; notele și sinopsisurile se adună, celelalte documente merg în coș. Face snapshot înainte.',
    { project, ids: z.array(z.string()).min(2) },
    (dir, { ids }) => {
      const p0 = load(dir);
      ids.forEach((id) => nodeOrThrow(p0, id));
      const nodes = inOrder(p0.tree, ids).filter((n) => n.type === 'text' && !n.root && !inTrash(p0, n.id));
      if (nodes.length < 2) throw new Error('Alege cel puțin două documente text (care nu sunt în coș).');
      if (!p0.tree.some((r) => r.root === 'trash')) throw new Error('Proiectul nu are coș.');
      const [first, ...rest] = nodes;
      store.takeSnapshot(dir, first.id, 'Automat înainte de unire (agent AI)');
      const html = nodes.map((n) => readDocSafe(dir, n.id)).join('<p>* * *</p>');
      const notes = nodes.map((n) => readDocSafe(dir, n.id, 'notes')).filter((h) => store.htmlToText(h).trim()).join('<hr>');
      const synopsis = nodes.map((n) => n.synopsis).filter(Boolean).join('\n');
      store.writeDoc(dir, first.id, 'docs', html);
      if (notes) writeNotesWithBackup(dir, first.id, notes);
      mutate(dir, (pr) => {
        let tree = updateNode(pr.tree, first.id, { synopsis });
        for (const n of rest) if (findTitle({ tree }, n.id) !== undefined) tree = moveToTrash(tree, n.id);
        pr.tree = tree;
      });
      return `Unite în „${first.title}”: ${nodes.length} documente, ${store.wordCount(html)} cuvinte; ${rest.length} mutate în coș.`;
    },
    W,
  );

  tool(
    'convert_item',
    'Transformă un document text în dosar sau un dosar în document text (textul și subdocumentele rămân).',
    { project, id: z.string(), type: z.enum(['text', 'folder']) },
    (dir, { id, type }) => {
      const p = mutate(dir, (pr) => {
        const n = nodeOrThrow(pr, id);
        if (n.root || n.type === 'file') throw new Error('Doar documentele text și dosarele se pot transforma.');
        pr.tree = convertNode(pr.tree, id, type);
      });
      return `„${findTitle(p, id)}” este acum ${type === 'folder' ? 'dosar' : 'document text'}.`;
    },
    W,
  );

  tool('list_trash', 'Elementele din coș (id, titlu, tip, adâncime).', { project }, (dir) => {
    const p = load(dir);
    const trash = p.tree.find((n) => n.root === 'trash');
    const out = [];
    store.walk(trash ? trash.children || [] : [], (n, depth) => out.push({ id: n.id, title: n.title, type: n.type, depth }));
    return out;
  });

  tool('restore_from_trash', 'Scoate un element din coș și îl pune la locul de unde a fost șters (sau în Manuscris).', { project, id: z.string() }, (dir, { id }) => {
    const p = mutate(dir, (pr) => {
      nodeOrThrow(pr, id);
      const next = restoreFromTrash(pr.tree, id);
      if (next === pr.tree) throw new Error('Elementul nu este (direct) în coș.');
      pr.tree = next;
    });
    return `Restaurat la: ${pathOf(p, id)}`;
  }, W);

  tool(
    'empty_trash',
    'Golește coșul: elementele dispar din binder. Fișierele lor rămân pe disc, iar project.json anterior e păstrat în snapshots/_backup (recuperabil).',
    { project },
    (dir) => {
      let count = 0;
      mutate(dir, (pr) => {
        const trash = pr.tree.find((n) => n.root === 'trash');
        if (!trash) throw new Error('Proiectul nu are coș.');
        count = flatten(trash.children || []).length;
        if (!count) return false;
        pr.tree = emptyTrash(pr.tree);
      });
      return `${count} elemente scoase din coș.`;
    },
    W,
  );

  // ------------------------------------------------------------------ snapshots
  tool(
    'compare_snapshots',
    'Compară două snapshot-uri ale unui document, sau un snapshot cu textul curent (fără file_b): cuvinte adăugate {+…+} și șterse [-…-].',
    { project, id: z.string(), file_a: z.string(), file_b: z.string().optional() },
    (dir, { id, file_a, file_b }) => {
      nodeOrThrow(load(dir), id);
      const snaps = store.listSnapshots(dir, id);
      const pick = (f) => {
        const s = snaps.find((x) => x.file === f);
        if (!s) throw new Error(`Snapshot inexistent: ${f}`);
        return s;
      };
      const a = pick(file_a);
      const b = file_b ? pick(file_b) : { name: 'Text curent', html: store.readDoc(dir, id) };
      const parts = diffWords(store.htmlToText(a.html), store.htmlToText(b.html));
      const count = (k) => parts.filter((x) => x[k]).reduce((s, x) => s + store.wordCount(x.value.replace(/</g, '&lt;')), 0);
      return {
        from: a.name,
        to: b.name,
        added: count('added'),
        removed: count('removed'),
        diff: parts.map((x) => (x.added ? `{+${x.value}+}` : x.removed ? `[-${x.value}-]` : x.value)).join(''),
      };
    },
  );

  tool(
    'manage_snapshot',
    'Redenumește (rename, name) sau șterge (delete; o copie rămâne în snapshots/_backup) un snapshot al unui document.',
    { project, id: z.string(), file: z.string(), action: z.enum(['rename', 'delete']), name: z.string().optional() },
    (dir, { id, file, action, name }) => {
      nodeOrThrow(load(dir), id);
      if (!/^[\w.-]+\.json$/.test(file) || !store.listSnapshots(dir, id).some((s) => s.file === file)) throw new Error(`Snapshot inexistent: ${file}`);
      const f = path.join(dir, 'snapshots', id, file);
      const raw = fs.readFileSync(f, 'utf8');
      if (action === 'delete') {
        store.backupFile(dir, `snapshot-${id}-${file}`, raw);
        fs.unlinkSync(f);
        return `Snapshot șters: ${file}`;
      }
      if (!name || !name.trim()) throw new Error('name lipsește.');
      fs.writeFileSync(f, JSON.stringify({ ...JSON.parse(raw), name: name.trim() }));
      return `Snapshot redenumit: ${name.trim()}`;
    },
    W,
  );

  // ------------------------------------------------------------------ analysis
  const scopeArg = z.enum(['draft', 'compile', 'all']).default('draft');
  tool(
    'statistics',
    'Statistici: cuvinte, caractere, fraze, paragrafe, documente, pagini, minute de citit; cele mai folosite cuvinte; lungimea frazelor. scope draft | compile | all, opțional doar ids.',
    { project, scope: scopeArg, ids: z.array(z.string()).optional(), top_words: z.number().int().min(0).max(500).default(30) },
    (dir, { scope, ids, top_words }) => {
      const p = load(dir);
      if (ids) ids.forEach((id) => nodeOrThrow(p, id));
      const { docs } = loadDocs(dir, p);
      const opts = { scope, selectionIds: ids };
      const textAll = projectText(p, docs, opts);
      return { ...projectStats(p, docs, opts), sentences: sentenceLengths(textAll), topWords: top_words ? wordFrequency(textAll, { limit: top_words }) : [] };
    },
  );

  tool(
    'timeline',
    'Cronologia scenelor din data/ora/durata/POV/loc (metadate personalizate sau sinopsis „Data: …”): evenimente ordonate, culoare (lane) după pov | location, scene fără dată, flashback-uri (outOfOrder).',
    { project, lane_by: z.enum(['pov', 'location']).default('pov'), scope: z.enum(['draft', 'all']).default('draft') },
    (dir, { lane_by, scope }) => buildTimeline(load(dir), { laneBy: lane_by, scope }),
  );

  tool('analyze_pacing', 'Ritmul scenelor: lungime, dialog, lungimea frazelor, abateri (lung, scurt, fără dialog, fraze lungi).', { project, scope: z.enum(['draft', 'all']).default('draft') }, (dir, { scope }) => {
    const p = load(dir);
    return analyzePacing(p, loadDocs(dir, p).docs, { scope });
  });

  tool(
    'character_relations',
    'Harta relațiilor: personajele (din Cercetare/Personaje sau ghicite din text) și scenele în care apar împreună.',
    { project, scope: z.enum(['draft', 'all']).default('draft'), min_weight: z.number().int().min(1).default(1) },
    (dir, { scope, min_weight }) => {
      const p = load(dir);
      const r = buildRelations(p, loadDocs(dir, p).docs, { scope, minWeight: min_weight });
      return { characters: r.nodes, pairs: r.edges };
    },
  );

  // Research index per project, updated incrementally on every query (only changed texts are re-indexed).
  const indexes = new Map();
  tool(
    'research_search',
    'Caută după sens în tot proiectul (manuscris, cercetare, note; fără coș) și întoarce pasajele cele mai relevante, cu documentul lor.',
    { project, query: z.string().min(1), k: z.number().int().min(1).max(30).default(8), kinds: z.array(z.enum(['docs', 'research', 'notes'])).optional() },
    (dir, { query, k, kinds }) => {
      if (!indexes.has(dir)) indexes.set(dir, rag.createIndex());
      const index = indexes.get(dir);
      index.update(rag.collectSources(store, dir));
      return index.query(query, { k, kinds }).map(({ docId, kind, title, text: passage, score }) => ({ id: docId, kind, title, score, passage }));
    },
  );

  // ------------------------------------------------------------------ glossaries
  tool('glossary_list', 'Glosarul traducătorului: documentul „Glosar…” din Cercetare și termenii lui (termen — definiție).', { project }, (dir) => {
    const { node } = findGlossaryDoc(load(dir));
    return { document: node ? { id: node.id, title: node.title } : null, entries: node ? glossaryEntries(readDocSafe(dir, node.id)) : [] };
  });

  tool(
    'glossary_add',
    'Adaugă un termen (cu definiție opțională) în glosarul traducătorului: documentul din Cercetare al cărui titlu începe cu „Glosar”/„Glossary”, creat dacă lipsește. Fără dubluri.',
    { project, term: z.string().min(1).max(120), definition: z.string().optional() },
    (dir, { term, definition }) => {
      const t = term.trim().replace(/\s+/g, ' ');
      const { node } = findGlossaryDoc(load(dir));
      const line = glossaryEntryHtml(t, definition || '');
      if (node) {
        const html = readDocSafe(dir, node.id);
        if (glossaryHasTerm(html, t)) throw new Error(`„${t}” este deja în glosar.`);
        writeWithSnapshot(dir, node.id, html + line, 'Înainte de glosar (agent AI)');
        return { id: node.id, title: node.title, term: t };
      }
      const created = store.newNode('text', 'Glosar');
      store.writeDoc(dir, created.id, 'docs', line);
      mutate(dir, (pr) => {
        rootByKind(pr, 'research').children.push(created);
      });
      return { id: created.id, title: created.title, term: t, created: true };
    },
    W,
  );

  tool(
    'build_glossaries',
    'Glosarele cărții generate din text: termenii alogeni (sens românesc, definiție, trimiteri), glosarul de lectură și cuprinsul de tipar.',
    { project },
    async (dir) => {
      const g = await buildGlossaries(load(dir), (id) => readDocSafe(dir, id));
      return { alogen: { title: g.alogen.title, terms: g.alogen.terms }, reading: { title: g.reading.title, terms: g.reading.terms }, toc: { title: g.toc.title, entries: g.toc.entries } };
    },
  );

  tool(
    'lookup_url',
    `Linkurile de căutare pentru un cuvânt sau o frază: dicționare (dexonline, sinonime, Wiktionary, Cambridge, Merriam-Webster, Linguee, IATE), traducere (DeepL, Google Translate), cercetare (Wikipedia, Google Scholar, Google). kind: ${Object.keys(LOOKUPS).join(' | ')}; fără kind, toate cele potrivite.`,
    { text: z.string().min(1), kind: z.enum(Object.keys(LOOKUPS)).optional(), from: z.string().default('auto'), to: z.string().default('ro') },
    (_dir, { text: q, kind, from, to }) => {
      if (kind) {
        const url = lookupUrl(kind, q, { from, to });
        if (!url) throw new Error('Textul e prea lung pentru această căutare (dicționarele primesc un cuvânt sau o expresie scurtă).');
        return { kind, label: LOOKUPS[kind].label, url };
      }
      return lookupGroups(q, { from, to });
    },
    { global: true },
  );

  // ------------------------------------------------------------------ backups
  const backupSettings = () => {
    const s = settings();
    return { dir: s.backupDir || undefined, keep: Number(s.backupKeep) || 10, zip: s.backupZip !== false };
  };
  const backupDirArg = z.string().optional().describe('Folderul de backup (implicit cel din Setări sau „<Proiect>.backups” lângă proiect)');
  const backupDirOf = (dir, backup_dir) => (backup_dir ? outsideProjects(backup_dir, 'backup_dir') : backupSettings().dir || backup.defaultBackupDir(dir));

  tool('backup_now', 'Face acum un backup (zip sau copie de folder) al proiectului, rotit după numărul păstrat din Setări.', { project, backup_dir: backupDirArg, zip: z.boolean().optional() }, async (dir, { backup_dir, zip }) => {
    const s = backupSettings();
    const file = await backup.backupProject(dir, outsideProjects(backupDirOf(dir, backup_dir), 'backup_dir'), s.keep, { zip: zip ?? s.zip });
    return { file };
  }, W);

  tool('list_backups', 'Backup-urile proiectului (cele mai noi întâi): nume, mărime, zip sau folder.', { project, backup_dir: backupDirArg }, (dir, { backup_dir }) =>
    backup.listBackups(dir, backupDirOf(dir, backup_dir)).map(({ name, size, zipped }) => ({ name, size, zipped })),
  );

  tool(
    'restore_backup',
    'Restaurează un backup (nume din list_backups) ca proiect nou lângă original („<Nume> (restaurat …).scribner”); originalul rămâne neatins. Proiectul restaurat devine disponibil în această sesiune.',
    { project, name: z.string(), backup_dir: backupDirArg },
    async (dir, { name, backup_dir }) => {
      const hit = backup.listBackups(dir, backupDirOf(dir, backup_dir)).find((b) => b.name === name);
      if (!hit) throw new Error('Backup necunoscut.');
      const target = await backup.restoreBackup(hit.file, path.dirname(dir));
      store.loadProject(target, { readOnly: true });
      return { dir: addProject(target) };
    },
    W,
  );

  // ------------------------------------------------------------------ editorial (I-EDIT without AI)
  tool(
    'editorial_autofix',
    'Corecturi sigure, fără AI, pe un document sau pe toate documentele unui dosar: ghilimele „…”, spații duble, majusculă la început de paragraf. Snapshot la fiecare document modificat.',
    { project, id: z.string().describe('Document sau dosar') },
    (dir, { id }) => {
      const changed = [];
      for (const n of textDocs(load(dir), id)) {
        const html = readDocSafe(dir, n.id);
        // Author text (paragraphs the writer changed by hand) is never touched.
        const own = new Set(authorParagraphs(html, n.authorHashes).map((x) => x.text));
        const fixed = autofix(html, { skip: (p) => own.has(p.md) });
        if (fixed === html) continue;
        writeWithSnapshot(dir, n.id, fixed, 'Înainte de corecturile automate (agent AI)');
        changed.push(n.title);
      }
      return `${changed.length} documente corectate${changed.length ? `: ${changed.join(', ')}` : ''}.`;
    },
    W,
  );

  tool(
    'editorial_round',
    'I-EDIT: fără round, lista rundelor (R0…R11). Cu round, instrucțiunile rundei pentru documentul id (prompt de sistem al profilului editorial + promptul rundei cu textul și contextul capitolului). Aplici runda tu și scrii rezultatul cu write_document.',
    { project, id: z.string().optional(), round: z.string().optional() },
    (dir, { id, round }) => {
      if (!round) return ROUNDS.map(({ id: rid, title, protocols }) => ({ id: rid, title, protocols }));
      const r = ROUNDS.find((x) => x.id === round);
      if (!r) throw new Error(`Rundă necunoscută: ${round}. Disponibile: ${ROUNDS.map((x) => x.id).join(', ')}`);
      if (!id) throw new Error('id lipsește.');
      const p = load(dir);
      const n = textNodeOrThrow(dir, id);
      const html = store.readDoc(dir, id);
      const parent = findParent(p.tree, id);
      const chapterContext = flatten(parent ? parent.children || [] : [])
        .filter((x) => x.type === 'text' && x.id !== id)
        .map((x) => `## ${x.title}\n${store.htmlToText(readDocSafe(dir, x.id)).slice(0, 3000)}`)
        .join('\n\n')
        .slice(0, 40000);
      const canonDoc = findCanonDoc(p.tree);
      const canonNodes = canonDoc ? parseCanonIndex(readDocSafe(dir, canonDoc.id)).nodes : [];
      return {
        round: { id: r.id, title: r.title, protocols: r.protocols },
        system: systemPrompt(profileFor(p, settings())),
        prompt: roundPrompt(r, htmlToManuscript(html), roundContext(r, { chapterContext, canonNodes, title: n.title, html }), { authorText: authorParagraphs(html, n.authorHashes) }),
      };
    },
  );

  tool(
    'author_journal',
    'I-EDIT: jurnalul modificărilor făcute de autor de mână (editorial/MODIFICARI_AUTOR.jsonl): câte un rând pe bucată schimbată {doc, title, line, old, new, time, hashOld, hashNew}. Cu id, doar documentul acela. Paragrafele autorului nu se rescriu.',
    { project, id: z.string().optional(), limit: z.number().int().min(1).max(5000).optional() },
    (dir, { id, limit }) => store.readAuthorJournal(dir, { doc: id, limit: limit || 200 }),
  );

  return FULL_TOOL_NAMES;
}

// Splits HTML at character offset `pos` (a text position, outside any tag). Elements open at
// that point are closed at the end of the first part and re-opened (same attributes) at the
// start of the second, so a split inside a paragraph, a quote or a comment keeps both halves
// well formed. Empty elements left at the end of the first part are dropped.
const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'col', 'wbr', 'source']);
export function splitHtmlAt(html, pos) {
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
  let m;
  while ((m = re.exec(html)) && m.index < pos) {
    const name = m[2].toLowerCase();
    if (m[1]) {
      const i = stack.map((s) => s.name).lastIndexOf(name);
      if (i >= 0) stack.splice(i);
    } else if (!m[3] && !VOID.has(name)) stack.push({ name, open: m[0] });
  }
  let before = html.slice(0, pos) + stack.map((s) => `</${s.name}>`).reverse().join('');
  for (let prev; prev !== before; ) {
    prev = before;
    before = before.replace(/<([a-zA-Z][\w-]*)\b[^>]*>\s*<\/\1>$/, '');
  }
  const after = stack.map((s) => s.open).join('') + html.slice(pos);
  return { before, after };
}
