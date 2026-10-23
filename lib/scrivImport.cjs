'use strict';
// Lossless import of a Scrivener project (<Name>.scriv folder) into Scribner.
//
// Scrivener 3: <Name>.scrivx + Files/Data/<UUID>/{content.rtf, notes.rtf, synopsis.txt,
//   content.comments, content.styles, content.<ext>, snapshots/}, Files/styles.xml,
//   Files/writing.history, Files/ProjectNotes/, Settings/compile.xml.
// Scrivener 1/2: <Name>.scrivx + Files/Docs/<ID>.rtf, <ID>_notes.rtf, <ID>_synopsis.txt,
//   <ID>.<ext>, Snapshots/<ID>.snapshots/.
//
// Everything that maps to a Scribner feature is converted; the complete original
// package is also copied into <project>/scrivener-original/ so nothing is ever lost.
const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const { rtfToHtml, rtfToText } = require('./rtf.cjs');
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
    isArray: (name) => ARRAY_TAGS.has(name),
  });
}

function readText(file) {
  if (!fs.existsSync(file)) return null;
  const buf = fs.readFileSync(file);
  const utf8 = buf.toString('utf8');
  // RTF is normally 7-bit with escapes; tolerate raw UTF-8 and fall back to latin1.
  return utf8.includes('\uFFFD') ? buf.toString('latin1') : utf8;
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
  const byId = {};
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
  const byId = {};
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
  const byId = {};
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
    id: t.ID,
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

function readStyleNames(scrivDir) {
  const file = path.join(scrivDir, 'Files', 'styles.xml');
  const names = {};
  if (!fs.existsSync(file)) return names;
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
    });
  } catch {
    /* style names are a nicety; headings still come from the RTF stylesheet */
  }
  return names;
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

function readProjectNotes(scrivDir, doc, styleNames) {
  const parts = [];
  const dir = path.join(scrivDir, 'Files', 'ProjectNotes');
  const titles = {};
  const collect = (node) => {
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (k === 'ProjectNote' || k === 'Note') for (const n of asArray(v)) titles[n.UUID || n.ID] = textOf(n.Title) || n.Title;
      else if (typeof v === 'object') collect(v);
    }
  };
  collect(doc.ProjectNotes);
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).sort()) {
      if (!/\.rtf$/i.test(f)) continue;
      const id = f.replace(/\.rtf$/i, '');
      const html = rtfToHtml(readText(path.join(dir, f)), { styleNames });
      parts.push(`<h2>${escape(titles[id] || 'Note de proiect')}</h2>${html}`);
    }
  }
  // Scrivener 2: Files/projectnotes.rtf
  const old = path.join(scrivDir, 'Files', 'projectnotes.rtf');
  if (fs.existsSync(old)) parts.push(`<h2>Note de proiect</h2>${rtfToHtml(readText(old), { styleNames })}`);
  return parts.join('');
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
  report.scrivenerVersion = fs.existsSync(versionFile) ? `format ${fs.readFileSync(versionFile, 'utf8').trim()}` : v3 ? 'Scrivener 3' : v2 ? 'Scrivener 1/2' : 'necunoscut';

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
  const styleNames = readStyleNames(scrivDir);

  // Pass 1: assign new ids so Scrivener Links / bookmarks / collections can be remapped.
  const idMap = {};
  const allItems = [];
  const index = (items) => {
    for (const item of asArray(items)) {
      const key = String(item.UUID || item.ID || '').toUpperCase();
      if (key) idMap[key] = ROOT_MAP[item.Type] || store.newId();
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
    report.footnotes += (html.match(/data-footnote=/g) || []).length;
    report.annotations += (html.match(/data-annotation=/g) || []).length;
    report.images += (html.match(/<img /g) || []).length + (html.match(/data-unsupported-image=/g) || []).length;
  };

  const convert = (item) => {
    const key = String(item.UUID || item.ID || '').toUpperCase();
    const rootKey = ROOT_MAP[item.Type];
    const children = asArray(item.Children && item.Children.BinderItem);
    const meta = item.MetaData || {};
    const isFolderType = item.Type === 'Folder' || Boolean(rootKey);
    const isText = item.Type === 'Text' || (!isFolderType && !meta.FileExtension && fs.existsSync(fileFor(key, 'content')));
    const isMedia = !isFolderType && !isText;

    const node = store.newNode(isFolderType ? 'folder' : isMedia ? 'file' : 'text', textOf(item.Title));
    node.id = idMap[key] || node.id;
    if (rootKey) node.root = rootKey;
    if (children.length) node.children = [];
    node.created = parseDate(item.Created);
    node.modified = parseDate(item.Modified);
    node.scrivener = { uuid: key, type: item.Type };

    if (meta.LabelID !== undefined && labelsById[meta.LabelID]) node.label = labelsById[meta.LabelID];
    if (meta.StatusID !== undefined && statusById[meta.StatusID]) node.status = statusById[meta.StatusID];
    if (meta.IncludeInCompile !== undefined) node.includeInCompile = String(meta.IncludeInCompile) !== 'No';
    if (meta.IconFileName) node.icon = textOf(meta.IconFileName);
    if (meta.SectionType !== undefined) node.sectionType = sectionTypesById[textOf(meta.SectionType)] || textOf(meta.SectionType);
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
    const bm = item.Bookmarks ? JSON.stringify(item.Bookmarks) : '';
    if (bm) {
      node.bookmarks = [...new Set((bm.match(UUID_RE) || []).map((u) => idMap[u.toUpperCase()]).filter(Boolean))].map((id) => ({ id }));
      for (const url of bm.match(/https?:\/\/[^"\\]+/g) || []) node.bookmarks.push({ url });
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
      const opts = { comments, linkFor, styleNames, readAttachment };

      const content = readText(fileFor(key, 'content'));
      if (content !== null) {
        const html = rtfToHtml(content, opts);
        countNotes(html);
        store.writeDoc(destDir, node.id, 'docs', html);
      } else if (node.type === 'text') {
        store.writeDoc(destDir, node.id, 'docs', '<p></p>');
      }

      const notes = readText(fileFor(key, 'notes'));
      if (notes !== null) store.writeDoc(destDir, node.id, 'notes', rtfToHtml(notes, { linkFor, styleNames, readAttachment }));

      const synopsis = readText(fileFor(key, 'synopsis'));
      if (synopsis) node.synopsis = synopsis.trim();

      // Media payload: content.<ext> (v3) or <ID>.<ext> (v2)
      const ext = textOf(meta.FileExtension);
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
    const json = JSON.stringify(pb);
    project.bookmarks = [...new Set((json.match(UUID_RE) || []).map((u) => idMap[u.toUpperCase()]).filter(Boolean))].map((id) => ({ id }));
    for (const url of json.match(/https?:\/\/[^"\\]+/g) || []) project.bookmarks.push({ url });
    report.bookmarks += project.bookmarks.length;
  }

  // Project notes
  const projectNotes = readProjectNotes(scrivDir, doc, styleNames);
  if (projectNotes) {
    store.writeDoc(destDir, 'project-notes', 'notes', projectNotes);
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
