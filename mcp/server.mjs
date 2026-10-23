#!/usr/bin/env node
// Scribner MCP server: lets AI agents (Claude Code, Claude Desktop, any MCP
// client) read and edit Scribner projects.
//
//   node mcp/server.mjs --project "D:\Carti\Karma.scribner" [--project …] [--read-only]
//
// Safety: only the projects passed on the command line are reachable; every write
// takes a snapshot first and is appended to <project>/agent-log.jsonl.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { findNode, findParent, flatten, insertNear, moveNode, moveToTrash, updateNode } from '../src/lib/tree.js';
import { buildRegex, findInHtml, replaceInHtml } from '../src/lib/search.js';
import { htmlToManuscript, lint, manuscriptToHtml, profileFor, reattach, summarize } from '../src/lib/editorial.js';
import { styleCss, stylesOf } from '../src/lib/styles.js';

const require = createRequire(import.meta.url);
const store = require('../lib/store.cjs');
const compile = require('../lib/compile.cjs');
const history = require('../lib/history.cjs');

// ---------------------------------------------------------------------------
// Arguments

const args = process.argv.slice(2);
const projects = [];
let readOnly = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--project' && args[i + 1]) projects.push(path.resolve(args[++i]));
  else if (args[i] === '--read-only') readOnly = true;
}
for (const p of (process.env.SCRIBNER_PROJECTS || '').split(path.delimiter).filter(Boolean)) projects.push(path.resolve(p));
if (!projects.length) {
  process.stderr.write('Folosire: scribner-mcp --project <cale către proiect.scribner> [--project …] [--read-only]\n');
  process.exit(2);
}
for (const p of projects) {
  if (!fs.existsSync(path.join(p, 'project.json'))) {
    process.stderr.write(`Nu e un proiect Scribner: ${p}\n`);
    process.exit(2);
  }
}

// ---------------------------------------------------------------------------
// Helpers

function projectDir(project) {
  if (!project) return projects[0];
  const hit = projects.find((p) => p === path.resolve(project) || path.basename(p).replace(/\.(scribner|scriptorium)$/i, '') === project);
  if (!hit) throw new Error(`Proiect necunoscut: ${project}. Disponibile: ${projects.map((p) => path.basename(p)).join(', ')}`);
  return hit;
}

const load = (dir) => store.loadProject(dir);
const save = (dir, project) => store.saveProject(dir, project);

function requireWritable() {
  if (readOnly) throw new Error('Serverul rulează în modul doar-citire (--read-only).');
}

function log(dir, tool, input, result) {
  const line = JSON.stringify({ date: new Date().toISOString(), tool, input, result }) + '\n';
  fs.appendFileSync(path.join(dir, 'agent-log.jsonl'), line);
}

function nodeOrThrow(project, id) {
  const n = findNode(project.tree, id);
  if (!n) throw new Error(`Element inexistent: ${id}`);
  return n;
}

function wordCount(dir, id) {
  return store.wordCount(store.readDoc(dir, id));
}

const text = (s) => ({ content: [{ type: 'text', text: typeof s === 'string' ? s : JSON.stringify(s, null, 2) }] });

function tool(name, description, shape, handler, { writes = false } = {}) {
  server.registerTool(name, { title: name, description, inputSchema: shape }, async (input) => {
    try {
      if (writes) requireWritable();
      const dir = projectDir(input.project);
      const result = await handler(dir, input);
      if (writes) log(dir, name, input, typeof result === 'string' ? result.slice(0, 200) : 'ok');
      return text(result);
    } catch (err) {
      return { content: [{ type: 'text', text: `Eroare: ${err.message}` }], isError: true };
    }
  });
}

const project = z.string().optional().describe('Numele sau calea proiectului (implicit primul proiect)');

// ---------------------------------------------------------------------------
// Server

const server = new McpServer({ name: 'scribner', version: '0.2.0' });

tool('project_info', 'Titlul, autorul, țintele, etichetele, statusurile, profilul editorial și numărul de cuvinte al proiectului.', { project }, (dir) => {
  const p = load(dir);
  const draft = flatten(p.tree[0].children).filter((n) => n.type === 'text' && n.includeInCompile !== false);
  return {
    dir,
    title: p.title,
    author: p.author,
    targets: p.targets,
    labels: p.labels,
    statuses: p.statuses,
    keywords: p.keywordDefs || [],
    customFields: p.customFields || [],
    editorialProfile: profileFor(p).name,
    draftWords: draft.reduce((s, n) => s + wordCount(dir, n.id), 0),
    readOnly,
  };
});

tool('list_binder', 'Arborele binderului: id, titlu, tip, etichetă, status, Include în Compile, număr de cuvinte, sinopsis.', { project, root_id: z.string().optional().describe('Doar sub acest dosar') }, (dir, { root_id }) => {
  const p = load(dir);
  const start = root_id ? [nodeOrThrow(p, root_id)] : p.tree;
  const map = (n, depth = 0) => ({
    id: n.id,
    title: n.title,
    type: n.root ? `root:${n.root}` : n.type,
    depth,
    label: n.label !== 'Fără' ? n.label : undefined,
    status: n.status !== 'Fără' ? n.status : undefined,
    includeInCompile: n.includeInCompile === false ? false : undefined,
    words: n.type === 'text' ? wordCount(dir, n.id) : undefined,
    synopsis: n.synopsis || undefined,
    keywords: n.keywords && n.keywords.length ? n.keywords : undefined,
    children: n.children ? n.children.map((c) => map(c, depth + 1)) : undefined,
  });
  return start.map((n) => map(n));
});

tool(
  'read_document',
  'Citește un document. format: "manuscript" (paragrafe, ***ALOGEN***, *ilustrații*, [^note]) | "html" | "text". Include sinopsisul, notele și metadatele.',
  { project, id: z.string(), format: z.enum(['manuscript', 'html', 'text']).default('manuscript') },
  (dir, { id, format }) => {
    const p = load(dir);
    const n = nodeOrThrow(p, id);
    const html = store.readDoc(dir, id);
    const body = format === 'html' ? html : format === 'text' ? store.htmlToText(html) : htmlToManuscript(html);
    return {
      id,
      title: n.title,
      path: pathOf(p, id),
      synopsis: n.synopsis || '',
      label: n.label,
      status: n.status,
      keywords: n.keywords || [],
      custom: n.custom || {},
      words: store.wordCount(html),
      notes: store.htmlToText(store.readDoc(dir, id, 'notes')).trim(),
      content: body,
    };
  },
);

function pathOf(p, id) {
  const parts = [];
  let cur = findNode(p.tree, id);
  while (cur) {
    parts.unshift(cur.title);
    cur = findParent(p.tree, cur.id);
  }
  return parts.join(' / ');
}

tool(
  'write_document',
  'Înlocuiește textul unui document. Face snapshot înainte. În format "manuscript" comentariile, adnotările și alinierea existente se păstrează.',
  { project, id: z.string(), content: z.string(), format: z.enum(['manuscript', 'html']).default('manuscript'), snapshot_name: z.string().optional() },
  (dir, { id, content, format, snapshot_name }) => {
    const p = load(dir);
    const n = nodeOrThrow(p, id);
    if (n.type !== 'text') throw new Error('Doar documentele text pot fi scrise.');
    const before = store.readDoc(dir, id);
    store.takeSnapshot(dir, id, snapshot_name || 'Înainte de modificarea unui agent AI');
    const html = format === 'html' ? content : reattach(before, manuscriptToHtml(content));
    store.writeDoc(dir, id, 'docs', html);
    return `Scris „${n.title}”: ${store.wordCount(html)} cuvinte (înainte ${store.wordCount(before)}). Snapshot salvat.`;
  },
  { writes: true },
);

tool(
  'create_document',
  'Creează un document sau dosar nou, după elementul after_id sau în interiorul dosarului parent_id.',
  {
    project,
    title: z.string(),
    type: z.enum(['text', 'folder']).default('text'),
    parent_id: z.string().optional(),
    after_id: z.string().optional(),
    content: z.string().optional().describe('Text în format manuscript'),
    synopsis: z.string().optional(),
  },
  (dir, { title, type, parent_id, after_id, content, synopsis }) => {
    const p = load(dir);
    const node = store.newNode(type, title);
    if (synopsis) node.synopsis = synopsis;
    const anchor = after_id || parent_id || p.tree[0].id;
    const anchorNode = nodeOrThrow(p, anchor);
    if (parent_id && !anchorNode.children) throw new Error('parent_id trebuie să fie un dosar.');
    p.tree = insertNear(p.tree, anchor, node);
    save(dir, p);
    if (type === 'text') store.writeDoc(dir, node.id, 'docs', content ? manuscriptToHtml(content) : '<p></p>');
    return { id: node.id, path: pathOf(p, node.id) };
  },
  { writes: true },
);

tool(
  'move_item',
  'Mută un element: position "before" | "after" | "inside" (în dosar) față de target_id.',
  { project, id: z.string(), target_id: z.string(), position: z.enum(['before', 'after', 'inside']) },
  (dir, { id, target_id, position }) => {
    const p = load(dir);
    nodeOrThrow(p, id);
    nodeOrThrow(p, target_id);
    const next = moveNode(p.tree, id, target_id, position);
    if (next === p.tree) throw new Error('Mutare imposibilă (rădăcină sau în propriul copil).');
    p.tree = next;
    save(dir, p);
    return `Mutat la: ${pathOf(p, id)}`;
  },
  { writes: true },
);

tool(
  'set_metadata',
  'Schimbă titlul, sinopsisul, eticheta, statusul, cuvintele cheie, Include în Compile, ținta sau metadatele personalizate.',
  {
    project,
    id: z.string(),
    title: z.string().optional(),
    synopsis: z.string().optional(),
    label: z.string().optional(),
    status: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    include_in_compile: z.boolean().optional(),
    target: z.number().int().min(0).optional(),
    custom: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
  },
  (dir, input) => {
    const p = load(dir);
    const n = nodeOrThrow(p, input.id);
    if (n.root) throw new Error('Rădăcinile nu au metadate editabile.');
    if (input.label && !p.labels.some((l) => l.name === input.label)) throw new Error(`Etichetă necunoscută. Disponibile: ${p.labels.map((l) => l.name).join(', ')}`);
    if (input.status && !p.statuses.includes(input.status)) throw new Error(`Status necunoscut. Disponibile: ${p.statuses.join(', ')}`);
    const patch = {};
    for (const [k, v] of [['title', input.title], ['synopsis', input.synopsis], ['label', input.label], ['status', input.status], ['keywords', input.keywords], ['includeInCompile', input.include_in_compile], ['target', input.target]]) {
      if (v !== undefined) patch[k] = v;
    }
    if (input.custom) patch.custom = { ...(n.custom || {}), ...input.custom };
    p.tree = updateNode(p.tree, input.id, patch);
    save(dir, p);
    return `Actualizat „${patch.title || n.title}”: ${Object.keys(patch).join(', ')}`;
  },
  { writes: true },
);

tool('trash_item', 'Mută un element în coș (recuperabil).', { project, id: z.string() }, (dir, { id }) => {
  const p = load(dir);
  const n = nodeOrThrow(p, id);
  if (n.root) throw new Error('Rădăcinile nu pot fi mutate în coș.');
  p.tree = moveToTrash(p.tree, id);
  save(dir, p);
  return `„${n.title}” mutat în coș.`;
}, { writes: true });

tool(
  'search',
  'Caută în textul tuturor documentelor (fără coș). Întoarce documentele și fragmentele găsite.',
  { project, query: z.string(), regex: z.boolean().default(false), case_sensitive: z.boolean().default(false), whole_word: z.boolean().default(false), limit: z.number().int().min(1).max(500).default(100) },
  (dir, { query, regex, case_sensitive, whole_word, limit }) => {
    const p = load(dir);
    const re = buildRegex({ query, regex, caseSensitive: case_sensitive, wholeWord: whole_word });
    if (!re) throw new Error('Expresie invalidă.');
    const trash = new Set(flatten(p.tree.find((n) => n.root === 'trash').children).map((n) => n.id));
    const out = [];
    for (const n of flatten(p.tree)) {
      if (n.root || n.type !== 'text' || trash.has(n.id)) continue;
      const hits = findInHtml(store.readDoc(dir, n.id), re);
      if (hits.length) out.push({ id: n.id, title: n.title, count: hits.length, snippets: hits.slice(0, 5).map((h) => `${h.before}[${h.match}]${h.after}`) });
      if (out.length >= limit) break;
    }
    return out;
  },
);

tool(
  'replace',
  'Caută și înlocuiește în documente (toate sau doar ids). Face snapshot la fiecare document modificat.',
  { project, query: z.string(), replacement: z.string(), regex: z.boolean().default(false), case_sensitive: z.boolean().default(false), whole_word: z.boolean().default(false), ids: z.array(z.string()).optional() },
  (dir, { query, replacement, regex, case_sensitive, whole_word, ids }) => {
    const p = load(dir);
    const re = buildRegex({ query, regex, caseSensitive: case_sensitive, wholeWord: whole_word });
    if (!re) throw new Error('Expresie invalidă.');
    const trash = new Set(flatten(p.tree.find((n) => n.root === 'trash').children).map((n) => n.id));
    const targets = ids ? ids.map((id) => nodeOrThrow(p, id)) : flatten(p.tree).filter((n) => !n.root && n.type === 'text' && !trash.has(n.id));
    let total = 0;
    const changed = [];
    for (const n of targets) {
      const { html, count } = replaceInHtml(store.readDoc(dir, n.id), re, replacement);
      if (!count) continue;
      store.takeSnapshot(dir, n.id, 'Înainte de înlocuirea unui agent AI');
      store.writeDoc(dir, n.id, 'docs', html);
      total += count;
      changed.push(`${n.title} (${count})`);
    }
    return `${total} înlocuiri în ${changed.length} documente: ${changed.join(', ')}`;
  },
  { writes: true },
);

tool('get_notes', 'Notele unui document, sau ale proiectului cu id "project".', { project, id: z.string() }, (dir, { id }) => {
  const docId = id === 'project' ? 'project-notes' : id;
  return htmlToManuscript(store.readDoc(dir, docId, 'notes'));
});

tool('set_notes', 'Înlocuiește notele unui document sau ale proiectului (id "project").', { project, id: z.string(), content: z.string() }, (dir, { id, content }) => {
  const docId = id === 'project' ? 'project-notes' : id;
  if (docId !== 'project-notes') nodeOrThrow(load(dir), docId);
  store.writeDoc(dir, docId, 'notes', manuscriptToHtml(content));
  return 'Note salvate.';
}, { writes: true });

tool(
  'add_comment',
  'Adaugă un comentariu pe prima apariție a fragmentului quote din document (comentariul nu ajunge în Compile).',
  { project, id: z.string(), quote: z.string(), comment: z.string() },
  (dir, { id, quote, comment }) => {
    const html = store.readDoc(dir, id);
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const target = esc(quote);
    const idx = html.indexOf(target);
    if (idx < 0) throw new Error('Fragmentul nu a fost găsit exact (în interiorul unui singur paragraf, fără formatare la mijloc).');
    store.takeSnapshot(dir, id, 'Înainte de comentariul unui agent AI');
    const span = `<span data-comment="${esc(comment).replace(/"/g, '&quot;')}" data-author="Agent AI" class="comment">${target}</span>`;
    store.writeDoc(dir, id, 'docs', html.slice(0, idx) + span + html.slice(idx + target.length));
    return 'Comentariu adăugat.';
  },
  { writes: true },
);

tool(
  'add_footnote',
  'Adaugă o notă de subsol imediat după fragmentul after_quote.',
  { project, id: z.string(), after_quote: z.string(), note: z.string() },
  (dir, { id, after_quote, note }) => {
    const html = store.readDoc(dir, id);
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const target = esc(after_quote);
    const idx = html.indexOf(target);
    if (idx < 0) throw new Error('Fragmentul nu a fost găsit exact.');
    store.takeSnapshot(dir, id, 'Înainte de nota unui agent AI');
    const end = idx + target.length;
    const fn = `<span data-footnote="${esc(note).replace(/"/g, '&quot;')}" class="footnote"></span>`;
    store.writeDoc(dir, id, 'docs', html.slice(0, end) + fn + html.slice(end));
    return 'Notă de subsol adăugată.';
  },
  { writes: true },
);

tool(
  'lint',
  'I-REP: verifică un document sau toate documentele dintr-un dosar după profilul editorial (DOOM III, binar, ALOGEN, LLM, redundanță micro/mezzo/macro). Întoarce problemele cu rundă și gravitate.',
  { project, id: z.string().describe('Document sau dosar'), severity: z.enum(['GRAVE', 'MEDIU', 'MINOR']).optional().describe('Doar această gravitate') },
  (dir, { id, severity }) => {
    const p = load(dir);
    const n = nodeOrThrow(p, id);
    const profile = profileFor(p);
    const docs = (n.type === 'text' ? [n] : flatten(n.children || [])).filter((x) => x.type === 'text');
    const parent = n.type === 'text' ? findParent(p.tree, id) : n;
    const chapter = flatten(parent ? parent.children || [] : []).filter((x) => x.type === 'text').map((x) => ({ id: x.id, title: x.title, html: store.readDoc(dir, x.id) }));
    return docs.map((d) => {
      const issues = lint(store.readDoc(dir, d.id), { profile, otherDocs: chapter.filter((c) => c.id !== d.id) }).filter((i) => !severity || i.severity === severity);
      return { id: d.id, title: d.title, summary: summarize(issues), issues: issues.map(({ round, severity: s, message, excerpt }) => ({ round, severity: s, message, excerpt })) };
    });
  },
);

tool('list_snapshots', 'Snapshot-urile unui document (nume, dată).', { project, id: z.string() }, (dir, { id }) =>
  store.listSnapshots(dir, id).map(({ file, name, date }) => ({ file, name, date })),
);

tool('take_snapshot', 'Salvează un snapshot al documentului.', { project, id: z.string(), name: z.string().optional() }, (dir, { id, name }) => {
  nodeOrThrow(load(dir), id);
  return store.takeSnapshot(dir, id, name || 'Snapshot agent AI');
}, { writes: true });

tool('restore_snapshot', 'Restaurează un snapshot (textul curent e salvat întâi ca snapshot).', { project, id: z.string(), file: z.string() }, (dir, { id, file }) => {
  const snap = store.listSnapshots(dir, id).find((s) => s.file === file);
  if (!snap) throw new Error('Snapshot inexistent.');
  store.takeSnapshot(dir, id, 'Automat înainte de restaurare (agent AI)');
  store.writeDoc(dir, id, 'docs', snap.html);
  return `Restaurat „${snap.name}”.`;
}, { writes: true });

tool(
  'compile',
  'Compilează manuscrisul (Manuscris, cu Include în Compile) în docx | epub | html, într-un fișier lângă proiect sau la output_path.',
  { project, format: z.enum(['docx', 'epub', 'html']), output_path: z.string().optional() },
  async (dir, { format, output_path }) => {
    const p = load(dir);
    const read = (id) => store.readDoc(dir, id);
    const styles = stylesOf(p);
    const opts = { styles, styleCss: styleCss(styles, 'body') };
    const data = format === 'docx' ? await compile.compileDocx(p, read, opts) : format === 'epub' ? await compile.compileEpub(p, read, opts) : compile.compileHtml(p, read, opts);
    const out = output_path ? path.resolve(output_path) : path.join(path.dirname(dir), `${p.title.replace(/[<>:"/\\|?*]/g, '_')}.${format}`);
    fs.writeFileSync(out, data);
    return `Compilat: ${out}`;
  },
  { writes: true },
);

tool('writing_history', 'Istoricul scrisului pe zile (cuvinte în manuscris și în tot proiectul).', { project }, (dir) => history.summarize(history.readHistory(dir)));

// Resources: the binder and each document as manuscript text.
server.registerResource('binder', 'scribner://binder', { title: 'Binder', description: 'Structura proiectului principal', mimeType: 'application/json' }, async (uri) => {
  const p = load(projects[0]);
  const slim = (n) => ({ id: n.id, title: n.title, type: n.root ? `root:${n.root}` : n.type, children: n.children ? n.children.map(slim) : undefined });
  return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(p.tree.map(slim), null, 2) }] };
});

server.registerResource(
  'document',
  new ResourceTemplate('scribner://doc/{id}', {
    list: async () => {
      const p = load(projects[0]);
      return { resources: flatten(p.tree).filter((n) => n.type === 'text').map((n) => ({ uri: `scribner://doc/${n.id}`, name: n.title, mimeType: 'text/markdown' })) };
    },
  }),
  { title: 'Document', description: 'Textul unui document în format manuscript', mimeType: 'text/markdown' },
  async (uri, { id }) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: htmlToManuscript(store.readDoc(projects[0], id)) }] }),
);

await server.connect(new StdioServerTransport());
process.stderr.write(`Scribner MCP pornit: ${projects.map((p) => path.basename(p)).join(', ')}${readOnly ? ' (doar citire)' : ''}\n`);
