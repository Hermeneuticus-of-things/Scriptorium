'use strict';
// Lossless import of a Scrivener project (<Name>.scriv folder) into Scribner.
//
// `.scriv` format 3: <Name>.scrivx + Files/Data/<UUID>/{content.rtf, notes.rtf, synopsis.txt,
//   content.comments, content.styles, content.<ext>, snapshots/}, Files/styles.xml,
//   Files/writing.history, Files/ProjectNotes/, Settings/compile.xml.
// formatul `.scriv` 1/2: <Name>.scrivx + Files/Docs/<ID>.rtf, <ID>_notes.rtf, <ID>_synopsis.txt,
//   <ID>.<ext>, Snapshots/<ID>.snapshots/.
//
// Everything that maps to a Scribner feature is converted; the complete original
// package is also copied into <project>/scrivener-original/ so nothing is ever lost.
const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const { rtfToHtml, rtfToText, styleKind, slugStyle } = require('./rtf.cjs');
const store = require('./store.cjs');

const ROOT_MAP = { DraftFolder: 'draft', ResearchFolder: 'research', TrashFolder: 'trash' };
const UUID_RE = /[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/gi;

const ARRAY_TAGS = new Set([
  'BinderItem', 'Label', 'Status', 'Keyword', 'KeywordID', 'MetaDataItem', 'MetaDataField', 'Option',
  'Collection', 'UUID', 'Bookmark', 'SectionType', 'Snapshot', 'Day', 'Comment', 'Style', 'ProjectNote', 'Note',
]);

function asArray(x) {
  if (x === undefined || x === null) return [];
  return Array.isArray(x) ? x : [x];
}

function textOf(x) {
  if (x === undefined || x === null) return '';
  if (typeof x === 'object') return String(x['#text'] ?? '');
  return String(x);
}

function parser() {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: '#text',
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    cdataPropName: '#cdata',
    // Character references (&#8217; &#x1F600; &#xD;) are plain XML; without this they stay literal in titles.
    htmlEntities: true,
    isArray: (name) => ARRAY_TAGS.has(name),
  });
}

function readText(file) {
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  const buf = fs.readFileSync(file);
  const utf8 = buf.toString('utf8');
  // RTF is normally 7-bit with escapes; tolerate raw UTF-8 and fall back to latin1.
  // A UTF-8 BOM (synopsis.txt saved by a Windows editor) would stick to the text, and in front of
  // "{\\rtf" it makes the RTF look like plain text.
  return utf8.includes('\uFFFD') ? buf.toString('latin1') : utf8.replace(/^\uFEFF/, '');
}

function rgbToHex(rgb) {
  const parts = String(rgb || '').trim().split(/\s+/).map(Number);
  if (parts.length < 3 || parts.some((p) => Number.isNaN(p))) return '';
  return '#' + parts.slice(0, 3).map((p) => Math.round(Math.max(0, Math.min(1, p)) * 255).toString(16).padStart(2, '0')).join('');
}

function parseDate(s) {
  if (!s) return null;
  // Scrivener: "2023-04-05 10:11:12 +0300"
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\s*([+-]\d{2})(\d{2}))?/.exec(String(s));
  if (!m) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(`${m[1]}T${m[2]}${m[3] ? `${m[3]}:${m[4]}` : 'Z'}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function findScrivx(scrivDir) {
  const f = fs.readdirSync(scrivDir).find((n) => n.toLowerCase().endsWith('.scrivx'));
  if (!f) throw new Error('Nu am găsit fișierul .scrivx în proiectul Scrivener.');
  return path.join(scrivDir, f);
}

function parseScrivx(xml) {
  return parser().parse(xml).ScrivenerProject;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (e.isFile()) fs.copyFileSync(s, d);
  }
}

// --- project-level settings ---------------------------------------------------

function readLabels(doc, project, report) {
  const byId = Object.create(null);
  const ls = doc.LabelSettings || {};
  if (ls.Title) project.labelTitle = textOf(ls.Title);
  for (const l of asArray(ls.Labels && ls.Labels.Label)) {
    const name = textOf(l).trim();
    if (!name) continue;
    byId[l.ID] = name;
    const color = l.Color ? rgbToHex(l.Color) : '';
    const existing = project.labels.find((x) => x.name === name);
    if (existing) existing.color = existing.color || color;
    else project.labels.push({ name, color });
    report.labels++;
  }
  return byId;
}

function readStatuses(doc, project, report) {
  const byId = Object.create(null);
  const ss = doc.StatusSettings || {};
  if (ss.Title) project.statusTitle = textOf(ss.Title);
  for (const s of asArray(ss.StatusItems && ss.StatusItems.Status)) {
    const name = textOf(s).trim();
    if (!name) continue;
    byId[s.ID] = name;
    if (!project.statuses.includes(name)) project.statuses.push(name);
    report.statuses++;
  }
  return byId;
}

function readKeywords(doc, project, report) {
  const byId = Object.create(null);
  project.keywordDefs = project.keywordDefs || [];
  const walk = (list, parent) => {
    for (const k of asArray(list)) {
      const title = textOf(k.Title ?? k).trim();
      if (!title) continue;
      byId[k.ID] = title;
      project.keywordDefs.push({ name: title, color: rgbToHex(k.Color), parent: parent || null });
      report.keywords++;
      if (k.Children && k.Children.Keyword) walk(k.Children.Keyword, title);
    }
  };
  walk(doc.Keywords && doc.Keywords.Keyword);
  return byId;
}

function readCustomFields(doc, project, report) {
  const fields = [];
  const settings = doc.CustomMetaDataSettings || {};
  for (const f of asArray(settings.MetaDataField)) {
    const field = {
      id: f.ID,
      title: textOf(f.Title) || f.ID,
      type: (f.Type || 'Text').toLowerCase(),
      options: asArray(f.ListOptions && f.ListOptions.Option).map((o) => ({ id: o.ID, title: textOf(o) })),
      default: textOf(f.Default),
      align: f.Align || '',
      wraps: f.Wraps === 'Yes',
    };
    fields.push(field);
    report.customFields++;
  }
  project.customFields = fields;
  return Object.fromEntries(fields.map((f) => [f.id, f]));
}

function readSectionTypes(doc, project) {
  const st = doc.SectionTypes || {};
  const defs = asArray(st.SectionTypeDefinitions?.SectionType || st.TypeDefinitions?.SectionType || st.SectionType).map((t) => ({
    id: String(t.ID || '').toUpperCase(),
    title: textOf(t.Title ?? t),
  }));
  project.sectionTypes = defs;
  const level = st.LevelTypes || st.DefaultTypes || null;
  project.sectionTypeLevels = level ? JSON.parse(JSON.stringify(level)) : null;
  return Object.fromEntries(defs.map((d) => [d.id, d.title]));
}

function readTargets(doc, project) {
  const t = doc.ProjectTargets || {};
  const num = (x) => Number(textOf(x)) || 0;
  if (t.DraftTarget !== undefined) project.targets.draft = num(t.DraftTarget);
  if (t.SessionTarget !== undefined) project.targets.session = num(t.SessionTarget);
  if (t.Deadline) project.targets.deadline = parseDate(textOf(t.Deadline)) || textOf(t.Deadline);
  const typeOf = (x) => (x && typeof x === 'object' && x.Type) || null;
  project.targets.draftType = typeOf(t.DraftTarget) || 'Words';
  project.targets.sessionType = typeOf(t.SessionTarget) || 'Words';
  project.targets.scrivener = JSON.parse(JSON.stringify(t));
}

const STYLE_ALIGN = { left: '', natural: '', center: 'center', centered: 'center', right: 'right', justified: 'justify', justify: 'justify' };
const yes = (v) => /^(yes|true|1)$/i.test(String(textOf(v)).trim());

// Files/styles.xml: <Style ID Name Type="Paragraph|Character|ParagraphAndCharacter" Index>
// with optional formatting children. Returns { names: {index|ID: name}, defs: [Scribner style] }.
function readStyles(scrivDir) {
  const file = path.join(scrivDir, 'Files', 'styles.xml');
  const names = {};
  const defs = [];
  if (!fs.existsSync(file)) return { names, defs };
  try {
    const xml = parser().parse(fs.readFileSync(file, 'utf8'));
    const styles = [];
    const collect = (node) => {
      if (!node || typeof node !== 'object') return;
      for (const [k, v] of Object.entries(node)) {
        if (k === 'Style') for (const s of asArray(v)) styles.push(s);
        else if (typeof v === 'object') collect(v);
      }
    };
    collect(xml);
    styles.forEach((s, idx) => {
      const name = s.Name || textOf(s.Title) || textOf(s.StyleName);
      if (!name) return;
      names[idx] = name;
      if (s.ID !== undefined) names[s.ID] = name;
      if (s.Index !== undefined) names[s.Index] = name;
      const t = String(s.Type || '').toLowerCase();
      const def = { name, type: t === 'character' ? 'char' : t === 'paragraphandcharacter' ? 'both' : 'para' };
      if (yes(s.Bold)) def.bold = true;
      if (yes(s.Italic)) def.italic = true;
      if (yes(s.Underline)) def.underline = true;
      if (yes(s.SmallCaps)) def.smallCaps = true;
      const align = STYLE_ALIGN[String(textOf(s.Alignment)).trim().toLowerCase()];
      if (align) def.align = align;
      const color = s.Color ? rgbToHex(textOf(s.Color)) : '';
      if (color) def.color = color;
      defs.push(def);
    });
  } catch {
    /* style definitions are a nicety; text and RTF stylesheet names still import */
  }
  return { names, defs };
}

// Scrivener named styles -> project.styles (Scribner model, src/lib/styles.js). Structural
// styles (Heading N, Block Quote, Code Block) map to native blocks and are not listed.
function styleRegistry(project, defs) {
  project.styles = Array.isArray(project.styles) ? project.styles : [];
  const byName = new Map(project.styles.map((s) => [String(s.name).toLowerCase(), s]));
  const add = (def, kind) => {
    const key = String(def.name).toLowerCase();
    if (byName.has(key)) return byName.get(key);
    const base = slugStyle(def.name);
    let id = base;
    for (let n = 2; project.styles.some((s) => s.id === id); n++) id = `${base}-${n}`;
    const st = { id, ...def, type: def.type || (kind === 'char' ? 'char' : 'para') };
    project.styles.push(st);
    byName.set(key, st);
    return st;
  };
  for (const d of defs) if (!styleKind(d.name)) add(d);
  return (name, kind) => add({ name: String(name).trim() }, kind).id;
}

function readComments(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  const xml = parser().parse(fs.readFileSync(file, 'utf8'));
  for (const c of asArray(xml.Comments && xml.Comments.Comment)) {
    const body = c['#cdata'] ?? textOf(c);
    out[String(c.ID).toUpperCase()] = {
      text: body && String(body).startsWith('{\\rtf') ? rtfToText(String(body)) : String(body || '').trim(),
      footnote: String(c.Footnote) === 'Yes',
      author: c.Author || '',
      color: rgbToHex(c.Color),
      date: parseDate(c.Date),
    };
  }
  return out;
}

function readSnapshots(dirs, convert) {
  const out = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const titles = {};
    const index = path.join(dir, 'index.xml');
    if (fs.existsSync(index)) {
      try {
        const xml = parser().parse(fs.readFileSync(index, 'utf8'));
        const collect = (node) => {
          if (!node || typeof node !== 'object') return;
          for (const [k, v] of Object.entries(node)) {
            if (k === 'Snapshot') {
              for (const s of asArray(v)) {
                const file = textOf(s.File) || s.File || s.Filename;
                titles[file] = { name: textOf(s.Title) || s.Title, date: parseDate(s.Date || textOf(s.Date)) };
              }
            } else if (typeof v === 'object') collect(v);
          }
        };
        collect(xml);
      } catch {
        /* ignore malformed index; files still import */
      }
    }
    for (const f of fs.readdirSync(dir).sort()) {
      if (!/\.rtfd?$/i.test(f)) continue;
      const full = path.join(dir, f);
      const rtfFile = fs.statSync(full).isDirectory() ? path.join(full, 'TXT.rtf') : full;
      const rtf = readText(rtfFile);
      if (rtf === null) continue;
      const meta = titles[f] || {};
      const fromName = parseDate(f.replace(/\.rtfd?$/i, '').replace(/_/g, ' ').replace(/(\d{2})-(\d{2})-(\d{2})(?= |$)/, '$1:$2:$3'));
      out.push({ name: meta.name || 'Snapshot Scrivener', date: meta.date || fromName || fs.statSync(full).mtime.toISOString(), html: convert(rtf) });
    }
  }
  return out;
}

function readWritingHistory(scrivDir) {
  const file = path.join(scrivDir, 'Files', 'writing.history');
  if (!fs.existsSync(file)) return null;
  const xml = parser().parse(fs.readFileSync(file, 'utf8'));
  const days = {};
  const collect = (node) => {
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (k === 'Day') {
        for (const d of asArray(v)) {
          const date = (textOf(d) || d.Date || '').slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
          const dwc = Number(d.dwc) || 0;
          const owc = Number(d.owc) || 0;
          days[date] = {
            draftWritten: dwc,
            totalWritten: dwc + owc,
            draftChars: Number(d.dcc) || 0,
            otherChars: Number(d.occ) || 0,
            sessionTarget: Number(d.s) || 0,
            imported: true,
          };
        }
      } else if (typeof v === 'object') collect(v);
    }
  };
  collect(xml);
  return { days };
}

// Project notes: one tab per Files/ProjectNotes/<UUID>.rtf. Order and titles come from the
// .scrivx <ProjectNotes> entries (document order); files not listed there follow by file name.
// Returns [{ title, html }].
function readProjectNotes(scrivDir, doc, rtfOpts) {
  const tabs = [];
  const dir = path.join(scrivDir, 'Files', 'ProjectNotes');
  const listed = [];
  const collect = (node) => {
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (k === 'ProjectNote' || k === 'Note') for (const n of asArray(v)) listed.push({ key: String(n.UUID || n.ID || '').toUpperCase(), title: textOf(n.Title) || (typeof n.Title === 'string' ? n.Title : '') });
      else if (typeof v === 'object') collect(v);
    }
  };
  collect(doc.ProjectNotes);
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter((f) => /\.rtf$/i.test(f)).sort();
    const byKey = new Map(files.map((f) => [f.replace(/\.rtf$/i, '').toUpperCase(), f]));
    const order = [...listed.filter((l) => byKey.has(l.key)), ...files.map((f) => ({ key: f.replace(/\.rtf$/i, '').toUpperCase() })).filter((f) => !listed.some((l) => l.key === f.key))];
    for (const { key, title } of order) {
      const f = byKey.get(key);
      if (!f) continue;
      byKey.delete(key);
      tabs.push({ title: title || 'Note de proiect', html: rtfToHtml(readText(path.join(dir, f)), rtfOpts) });
    }
  }
  // Scrivener 2: Files/projectnotes.rtf
  const old = path.join(scrivDir, 'Files', 'projectnotes.rtf');
  if (fs.existsSync(old)) tabs.push({ title: 'Note de proiect', html: rtfToHtml(readText(old), rtfOpts) });
  return tabs;
}

// <Bookmarks>/<ProjectBookmarks>: <Bookmark Type="Internal" UUID Title/> or
// <Bookmark Type="External" URL Title/>, in the user's order. Deleted targets are dropped.
function readBookmarks(container, idMap) {
  const list = asArray(container && container.Bookmark);
  const out = [];
  const seen = new Set();
  if (!list.length && container) {
    // unknown layout: fall back to any UUIDs / URLs found, in document order
    const json = JSON.stringify(container);
    for (const m of json.matchAll(new RegExp(`${UUID_RE.source}|https?:\\/\\/[^"\\\\]+`, 'gi'))) list.push(/^https?:/i.test(m[0]) ? { URL: m[0] } : { UUID: m[0] });
  }
  for (const b of list) {
    const first = (v) => textOf(asArray(v)[0]).trim(); // UUID is an array tag in the parser
    const title = first(b.Title ?? b.Name);
    const url = first(b.URL ?? b.Url ?? b.Path);
    const uuid = first(b.UUID ?? b.ID).toUpperCase();
    let entry = null;
    if (uuid && idMap[uuid]) entry = { id: idMap[uuid] };
    else if (!uuid && url) entry = { url };
    if (!entry) continue;
    const key = entry.id ? `id:${entry.id}` : `url:${entry.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (title) entry.title = title;
    out.push(entry);
  }
  return out;
}

function escape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- main ---------------------------------------------------------------------

function importScriv(scrivDir, destParent, { keepOriginal = true } = {}) {
  const scrivx = findScrivx(scrivDir);
  const doc = parseScrivx(fs.readFileSync(scrivx, 'utf8'));
  if (!doc || !doc.Binder) throw new Error('Fișierul .scrivx nu conține un binder valid.');
  const title = path.basename(scrivDir).replace(/\.scriv$/i, '');
  const destDir = store.projectDirFor(destParent, title);
  if (fs.existsSync(path.join(destDir, 'project.json'))) throw new Error(`Există deja ${destDir}`);

  const report = {
    scrivenerVersion: '',
    documents: 0, folders: 0, media: 0, labels: 0, statuses: 0, keywords: 0, customFields: 0,
    comments: 0, footnotes: 0, annotations: 0, snapshots: 0, images: 0, links: 0, collections: 0,
    bookmarks: 0, historyDays: 0, projectNotes: false, originalCopy: '', warnings: [],
  };

  const v3 = fs.existsSync(path.join(scrivDir, 'Files', 'Data'));
  const v2 = fs.existsSync(path.join(scrivDir, 'Files', 'Docs'));
  const versionFile = path.join(scrivDir, 'Files', 'version.txt');
  report.scrivenerVersion = fs.existsSync(versionFile) ? `format ${fs.readFileSync(versionFile, 'utf8').trim()}` : v3 ? 'format 3' : v2 ? 'formatul `.scriv` 1/2' : 'necunoscut';

  const project = store.defaultProject(textOf(doc.ProjectProperties?.ProjectTitle) || title);
  project.author = textOf(doc.ProjectProperties?.FullName) || doc.Author || '';
  project.authorFirst = textOf(doc.ProjectProperties?.FirstName) || '';
  project.authorLast = textOf(doc.ProjectProperties?.LastName) || '';
  project.titleAbbreviation = textOf(doc.ProjectProperties?.AbbreviatedTitle) || '';
  project.scrivener = { identifier: doc.Identifier || '', version: doc.Version || '', creator: doc.Creator || '', modified: doc.Modified || '' };

  const labelsById = readLabels(doc, project, report);
  const statusById = readStatuses(doc, project, report);
  const keywordsById = readKeywords(doc, project, report);
  const fieldsById = readCustomFields(doc, project, report);
  const sectionTypesById = readSectionTypes(doc, project);
  readTargets(doc, project);
  const { names: styleNames, defs: styleDefs } = readStyles(scrivDir);
  const styleId = styleRegistry(project, styleDefs);

  // Pass 1: assign new ids so Scrivener Links / bookmarks / collections can be remapped.
  const idMap = {};
  const allItems = [];
  const keyOf = new Map(); // item -> checked key ('' when invalid): the only key used as a path
  const idOf = new Map(); // item -> new id (a repeated UUID gets its own id)
  const index = (items) => {
    for (const item of asArray(items)) {
      let key = String(item.UUID || item.ID || '').toUpperCase();
    // The key becomes a path: a crafted .scrivx must not reach files outside the project.
    if (key && !/^[0-9A-Z_-]{1,64}$/.test(key)) {
      report.warnings.push(`Element cu identificator invalid ignorat: ${key.slice(0, 40)}`);
      key = '';
    }
      if (key && idMap[key] && !ROOT_MAP[item.Type]) {
        report.warnings.push(`Identificator repetat în .scrivx: ${key.slice(0, 40)}; elementul a primit un id nou.`);
        idOf.set(item, store.newId());
      } else if (key) idMap[key] = ROOT_MAP[item.Type] || store.newId();
      keyOf.set(item, key);
      allItems.push(item);
      index(item.Children && item.Children.BinderItem);
    }
  };
  index(doc.Binder.BinderItem);
  const linkFor = (uuid) => {
    const id = idMap[String(uuid).toUpperCase()];
    if (!id) return null;
    report.links++;
    return `scribner://doc/${id}`;
  };

  store.saveProject(destDir, project);

  const itemDir = (key) =>
    v3 ? path.join(scrivDir, 'Files', 'Data', key) : path.join(scrivDir, 'Files', 'Docs');
  const fileFor = (key, kind) => {
    if (v3) return path.join(itemDir(key), { content: 'content.rtf', notes: 'notes.rtf', synopsis: 'synopsis.txt', comments: 'content.comments' }[kind]);
    return path.join(itemDir(key), { content: `${key}.rtf`, notes: `${key}_notes.rtf`, synopsis: `${key}_synopsis.txt`, comments: `${key}.comments` }[kind]);
  };

  const countNotes = (html) => {
    report.comments += (html.match(/data-comment=/g) || []).length;
    report.footnotes += (html.match(/data-footnote=/g) || []).length + (html.match(/data-linked-footnote=/g) || []).length;
    report.annotations += (html.match(/data-annotation=/g) || []).length;
    report.images += (html.match(/<img /g) || []).length + (html.match(/data-unsupported-image=/g) || []).length;
  };

  const convert = (item) => {
    const key = keyOf.get(item) || '';
    const rootKey = ROOT_MAP[item.Type];
    const children = asArray(item.Children && item.Children.BinderItem);
    const meta = item.MetaData || {};
    const isFolderType = item.Type === 'Folder' || Boolean(rootKey);
    const isText = item.Type === 'Text' || (!isFolderType && !meta.FileExtension && Boolean(key) && fs.existsSync(fileFor(key, 'content')));
    const isMedia = !isFolderType && !isText;

    const node = store.newNode(isFolderType ? 'folder' : isMedia ? 'file' : 'text', textOf(item.Title));
    node.id = idOf.get(item) || idMap[key] || node.id;
    if (rootKey) node.root = rootKey;
    if (children.length) node.children = [];
    node.created = parseDate(item.Created);
    node.modified = parseDate(item.Modified);
    node.scrivener = { uuid: key, type: item.Type };

    if (meta.LabelID !== undefined && labelsById[meta.LabelID]) node.label = labelsById[meta.LabelID];
    if (meta.StatusID !== undefined && statusById[meta.StatusID]) node.status = statusById[meta.StatusID];
    if (meta.IncludeInCompile !== undefined) node.includeInCompile = String(meta.IncludeInCompile) !== 'No';
    if (meta.IconFileName) node.icon = textOf(meta.IconFileName);
    // <MetaData><SectionType>UUID</SectionType>: 'SectionType' is an array tag (it is also the
    // definition element under <SectionTypes>), so the per-item value is the first entry.
    const stRef = textOf(asArray(meta.SectionType)[0]).trim();
    if (stRef) node.sectionType = sectionTypesById[stRef.toUpperCase()] || stRef;
    for (const k of ['Separator', 'ScriptMode', 'ShowSynopsisImage', 'Locked']) if (meta[k] !== undefined) node[k.charAt(0).toLowerCase() + k.slice(1)] = String(textOf(meta[k])) === 'Yes';

    // Keywords: <Keywords><KeywordID>n</KeywordID></Keywords> on the item
    const kwIds = asArray(item.Keywords && (item.Keywords.KeywordID || item.Keywords.Keyword)).map((k) => textOf(k.ID ?? k));
    node.keywords = kwIds.map((id) => keywordsById[id]).filter(Boolean);

    // Custom metadata values
    const custom = {};
    for (const mdi of asArray(meta.CustomMetaData && meta.CustomMetaData.MetaDataItem)) {
      const fid = textOf(mdi.FieldID);
      const field = fieldsById[fid];
      let value = textOf(mdi.Value);
      if (field && field.type === 'list') value = (field.options.find((o) => o.id === value) || {}).title || value;
      if (field && field.type === 'checkbox') value = value === 'Yes';
      custom[field ? field.title : fid] = value;
    }
    if (Object.keys(custom).length) node.custom = custom;

    // Per-document target (location varies by version)
    const target = item.TextSettings?.Target ?? meta.Target ?? item.Target;
    if (target !== undefined) {
      node.target = Number(textOf(target)) || 0;
      node.targetType = (typeof target === 'object' && target.Type) || 'Words';
    }

    // Bookmarks on the item (internal links or URLs)
    if (item.Bookmarks) {
      node.bookmarks = readBookmarks(item.Bookmarks, idMap);
      report.bookmarks += node.bookmarks.length;
    }

    // Anything else in MetaData/TextSettings/CorkboardAndOutliner is kept verbatim.
    const extra = {};
    for (const k of ['TextSettings', 'CorkboardAndOutliner', 'MediaSettings']) if (item[k]) extra[k] = item[k];
    const knownMeta = new Set(['LabelID', 'StatusID', 'IncludeInCompile', 'IconFileName', 'SectionType', 'CustomMetaData', 'FileExtension', 'Separator', 'ScriptMode', 'ShowSynopsisImage', 'Locked', 'Target']);
    const otherMeta = Object.fromEntries(Object.entries(meta).filter(([k]) => !knownMeta.has(k)));
    if (Object.keys(otherMeta).length) extra.MetaData = otherMeta;
    if (Object.keys(extra).length) node.scrivener.extra = JSON.parse(JSON.stringify(extra));

    if (key && !rootKey) {
      const dataDir = itemDir(key);
      const readAttachment = (name) => {
        const f = path.join(dataDir, path.basename(name));
        return fs.existsSync(f) ? fs.readFileSync(f) : null;
      };
      const comments = readComments(fileFor(key, 'comments'));
      const opts = { comments, linkFor, styleNames, styleId, readAttachment };

      const content = readText(fileFor(key, 'content'));
      if (content !== null) {
        const html = rtfToHtml(content, opts);
        countNotes(html);
        store.writeDoc(destDir, node.id, 'docs', html);
      } else if (node.type === 'text') {
        store.writeDoc(destDir, node.id, 'docs', '<p></p>');
      }

      const notes = readText(fileFor(key, 'notes'));
      if (notes !== null) store.writeDoc(destDir, node.id, 'notes', rtfToHtml(notes, { linkFor, styleNames, styleId, readAttachment }));

      const synopsis = readText(fileFor(key, 'synopsis'));
      if (synopsis) node.synopsis = synopsis.trim();

      // Media payload: content.<ext> (v3) or <ID>.<ext> (v2)
      const rawExt = textOf(meta.FileExtension);
      const ext = /^[A-Za-z0-9]{1,10}$/.test(rawExt || '') ? rawExt : '';
      let mediaFile = null;
      if (v3) {
        const candidates = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter((f) => /^content\./i.test(f) && !/\.(rtf|comments|styles)$/i.test(f)) : [];
        const pick = ext ? candidates.find((f) => f.toLowerCase() === `content.${ext.toLowerCase()}`) : candidates[0];
        if (pick) mediaFile = path.join(dataDir, pick);
      } else if (ext) {
        const f = path.join(dataDir, `${key}.${ext}`);
        if (fs.existsSync(f)) mediaFile = f;
      }
      if (mediaFile) {
        const stat = fs.statSync(mediaFile);
        const e = path.extname(mediaFile).slice(1) || ext || 'bin';
        const data = stat.isDirectory() ? null : fs.readFileSync(mediaFile);
        if (data) {
          const stored = store.writeMedia(destDir, node.id, e, data);
          node.media = { file: stored, mime: store.mimeFor(stored), name: `${node.title || 'fișier'}.${e}` };
          if (node.type !== 'file' && node.type !== 'folder') node.type = 'file';
          if (node.showSynopsisImage || /^image\//.test(node.media.mime)) node.synopsisImage = stored;
          report.media++;
        } else {
          report.warnings.push(`„${node.title}”: conținut de tip pachet (${path.basename(mediaFile)}) păstrat doar în copia originală.`);
        }
      } else if (isMedia && ext) {
        report.warnings.push(`„${node.title}”: fișierul content.${ext} lipsește din proiectul Scrivener.`);
      }

      const snapDirs = v3
        ? [path.join(dataDir, 'snapshots'), path.join(scrivDir, 'Snapshots', `${key}.snapshots`)]
        : [path.join(scrivDir, 'Snapshots', `${key}.snapshots`)];
      for (const snap of readSnapshots(snapDirs, (rtf) => rtfToHtml(rtf, opts))) {
        store.addSnapshot(destDir, node.id, snap);
        report.snapshots++;
      }
    }

    // Adaptive title: synopsis or first line, as Scrivener shows it.
    if (!node.title || node.title === 'Document nou' || node.title === 'Dosar nou') {
      const first = (node.synopsis || store.htmlToText(store.readDoc(destDir, node.id)) || '').trim().split('\n')[0];
      node.title = textOf(item.Title) || (first ? first.slice(0, 60) : 'Fără titlu');
    }

    if (children.length) node.children = children.map(convert);
    if (node.type === 'folder') report.folders++;
    else if (node.type === 'text') report.documents++;
    return node;
  };

  const research = project.tree.find((n) => n.root === 'research');
  for (const item of asArray(doc.Binder.BinderItem)) {
    const rootKey = ROOT_MAP[item.Type];
    const converted = convert(item);
    if (rootKey) {
      const root = project.tree.find((n) => n.root === rootKey);
      root.title = converted.title || root.title;
      root.children.push(...(converted.children || []));
    } else {
      research.children.push(converted);
    }
  }

  // Template sheets folder
  const tplUuid = String(textOf(doc.ProjectSettings?.TemplateFolderUUID) || textOf(doc.TemplateFolder) || '').toUpperCase();
  if (tplUuid && idMap[tplUuid]) project.templateFolder = idMap[tplUuid];

  // Collections
  project.collections = [];
  for (const c of asArray(doc.Collections && doc.Collections.Collection)) {
    const type = c.Type || 'Arbitrary';
    if (type === 'Binder') continue;
    const ids = [...new Set((JSON.stringify(c.BinderUUIDs || c.UUIDs || c.Items || '').match(UUID_RE) || []).map((u) => idMap[u.toUpperCase()]).filter(Boolean))];
    project.collections.push({ id: store.newId(), title: textOf(c.Title) || 'Colecție', color: rgbToHex(c.Color), type: type === 'RecentSearch' || type === 'Search' ? 'search' : 'manual', ids, search: c.SearchSettings ? JSON.parse(JSON.stringify(c.SearchSettings)) : null });
    report.collections++;
  }

  // Project bookmarks
  const pb = doc.ProjectBookmarks || doc.Bookmarks;
  if (pb) {
    project.bookmarks = readBookmarks(pb, idMap);
    report.bookmarks += project.bookmarks.length;
  }

  // Project notes
  const noteTabs = readProjectNotes(scrivDir, doc, { linkFor, styleNames, styleId });
  if (noteTabs.length) {
    // project.projectNotes = [{id, title}], text in notes/<id>.html; the first tab keeps the legacy id.
    project.projectNotes = noteTabs.map((t, i) => {
      const id = i === 0 ? 'project-notes' : `pn-${i + 1}`;
      store.writeDoc(destDir, id, 'notes', t.html || '<p></p>');
      return { id, title: t.title };
    });
    report.projectNotes = true;
  }

  // Writing history
  const history = readWritingHistory(scrivDir);
  if (history && Object.keys(history.days).length) {
    fs.writeFileSync(path.join(destDir, 'history.json'), JSON.stringify(history, null, 1));
    report.historyDays = Object.keys(history.days).length;
  }

  // Compile settings and any other project-level XML are kept for reference.
  const compileXml = path.join(scrivDir, 'Settings', 'compile.xml');
  if (fs.existsSync(compileXml)) project.scrivener.compileSettings = 'scrivener-original/Settings/compile.xml';
  const knownRoot = new Set(['Binder', 'LabelSettings', 'StatusSettings', 'Keywords', 'CustomMetaDataSettings', 'SectionTypes', 'ProjectTargets', 'Collections', 'ProjectBookmarks', 'ProjectNotes', 'ProjectProperties', 'Identifier', 'Version', 'Creator', 'Device', 'Author', 'Modified', 'ModID', 'Bookmarks']);
  const otherRoot = Object.fromEntries(Object.entries(doc).filter(([k]) => !knownRoot.has(k)));
  if (Object.keys(otherRoot).length) project.scrivener.otherSettings = JSON.parse(JSON.stringify(otherRoot));

  if (keepOriginal) {
    const dest = path.join(destDir, 'scrivener-original');
    copyDir(scrivDir, dest);
    report.originalCopy = dest;
  }

  project.importReport = { date: new Date().toISOString(), source: path.basename(scrivDir), ...report };
  store.saveProject(destDir, project);
  return { dir: destDir, project, stats: report };
}

module.exports = { importScriv, parseScrivx };
