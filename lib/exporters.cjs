'use strict';
// Scrivener 3-style exporters: per-document export (DOCX/RTF/MD/TXT/HTML) mirroring the binder,
// OPML outline, metadata CSV and "Save As" (copy project folder).
const fs = require('fs');
const path = require('path');
const store = require('./store.cjs');
const { escapeHtml } = require('./rtf.cjs');
const { parseBlocks, compileDocx, compileOdt } = require('./compile.cjs');
const { blocksToRtf } = require('./rtfWriter.cjs');

// ---------------------------------------------------------------- names
const RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
function safeName(name, fallback = 'Fără titlu') {
  let s = String(name || '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
  if (!s) s = fallback;
  if (RESERVED.test(s.split('.')[0])) s = `_${s}`;
  return s.slice(0, 120).replace(/[. ]+$/, '') || fallback;
}

// ---------------------------------------------------------------- writers
// notes: collects footnote texts; references are [^n] with the definitions appended at the end
// (a bare [^text] with no definition is not a footnote for any Markdown processor).
function runsToMd(runs, notes = []) {
  return runs
    .map((r) => {
      if (r.footnote !== undefined) {
        notes.push(String(r.footnote).replace(/\s*\n\s*/g, ' '));
        return `[^${notes.length}]`;
      }
      if (r.image) return `![${(r.image.alt || '').replace(/[[\]]/g, '')}](data:${r.image.mime};base64,${Buffer.from(r.image.data).toString('base64')})`;
      if (r.text === undefined) return '';
      if (r.text === '\n') return '  \n';
      let t = r.text;
      if (!t.trim()) return t;
      if (r.b && r.i) t = `***${t}***`;
      else if (r.b) t = `**${t}**`;
      else if (r.i) t = `*${t}*`;
      return t;
    })
    .join('');
}

function htmlToMarkdown(html) {
  const notes = [];
  const body = parseBlocks(html || '')
    .map((b) => {
      if (b.type === 'hr') return '* * *';
      const t = runsToMd(b.runs, notes);
      if (/^h[1-6]$/.test(b.type)) return `${'#'.repeat(Number(b.type[1]))} ${t}`;
      if (b.type === 'blockquote') return `> ${t}`;
      if (b.type === 'li') return `${'    '.repeat(Math.max(1, b.level || 1) - 1)}${b.list === 'ol' ? `${b.index || 1}.` : '-'} ${t}`;
      if (b.type === 'table') {
        const rows = b.rows.filter((r) => r.length).map((r) => r.map((c) => runsToMd(c.runs, notes).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim()));
        if (!rows.length) return '';
        const cols = Math.max(...rows.map((r) => r.length));
        const line = (r) => `| ${Array.from({ length: cols }, (_, i) => r[i] || '').join(' | ')} |`;
        return [line(rows[0]), `|${' --- |'.repeat(cols)}`, ...rows.slice(1).map(line)].join('\n');
      }
      return t;
    })
    .join('\n\n')
    .replace(/^( *(?:- |\d+\. ).*)\n\n(?= *(?:- |\d+\. ))/gm, '$1\n');
  return notes.length ? `${body}\n\n${notes.map((n, i) => `[^${i + 1}]: ${n}`).join('\n')}` : body;
}

function plainRuns(runs) {
  return runs.map((r) => (r.footnote !== undefined ? `[${r.footnote}]` : r.image ? `[${r.image.alt || 'imagine'}]` : r.text || '')).join('');
}

function htmlToPlain(html) {
  return parseBlocks(html || '')
    .map((b) => {
      if (b.type === 'hr') return '* * *';
      if (b.type === 'table') return b.rows.map((r) => r.map((c) => plainRuns(c.runs).replace(/\s*\n\s*/g, ' ')).join('\t')).join('\n');
      if (b.type === 'li') return `${'  '.repeat(Math.max(1, b.level || 1) - 1)}${b.list === 'ol' ? `${b.index || 1}.` : '•'} ${plainRuns(b.runs)}`;
      return plainRuns(b.runs);
    })
    .join('\n\n');
}

// Same writer as Compile → RTF (lists, tables, images, links, footnotes), without page setup.
function htmlToRtf(html, title) {
  return blocksToRtf(parseBlocks(html || ''), { title: title || '', fontFamily: 'Times New Roman', fontSizePt: 12, lineSpacing: 1 });
}

function htmlPage(title, html) {
  return `<!doctype html>\n<html lang="ro"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>\n<h1>${escapeHtml(title)}</h1>\n${html || ''}\n</body></html>\n`;
}

async function renderDocument(format, node, html, opts = {}) {
  const fake = () => ({ title: node.title, author: opts.author || '', tree: [{ id: 'draft', root: 'draft', type: 'folder', children: [{ id: node.id, type: 'text', title: node.title }] }] });
  const plain = { documentTitles: false, folderHeadings: false, separator: '' };
  switch (format) {
    case 'docx':
      return compileDocx(fake(), () => html, { ...plain, trackChanges: Boolean(opts.trackChanges), trackAuthor: opts.author || undefined });
    case 'odt':
      return compileOdt(fake(), () => html, { ...plain, titlePage: false });
    case 'rtf':
      return htmlToRtf(html, node.title);
    case 'md':
      return `# ${node.title}\n\n${htmlToMarkdown(html)}\n`;
    case 'html':
      return htmlPage(node.title, html);
    default:
      return `${node.title}\n\n${htmlToPlain(html)}\n`;
  }
}

// ---------------------------------------------------------------- per-document export
const FORMATS = ['docx', 'odt', 'rtf', 'md', 'txt', 'html'];

function uniqueName(used, base, id) {
  let name = base;
  if (used.has(name.toLowerCase())) name = `${base} (${String(id).slice(0, 6)})`;
  let n = 2;
  while (used.has(name.toLowerCase())) name = `${base} (${String(id).slice(0, 6)}-${n++})`;
  used.add(name.toLowerCase());
  return name;
}

function metaFor(n) {
  return {
    id: n.id,
    title: n.title,
    label: n.label || '',
    status: n.status || '',
    keywords: n.keywords || [],
    custom: n.custom || {},
    includeInCompile: n.includeInCompile !== false,
    created: n.created || null,
    modified: n.modified || null,
  };
}

/**
 * Exports documents one file each, mirroring the binder structure.
 * dir: project folder (media files are copied from dir/media when set). readDoc(id) / readNotes(id) return HTML (or '').
 * ids: null/empty = whole project; otherwise the selected nodes (folders include their descendants).
 * Returns {files: [absolute paths], count}.
 */
async function exportDocuments(project, dir, readDoc, readNotes, ids, outDir, options = {}) {
  const opts = { format: 'docx', withNotes: false, withSynopsis: false, withMeta: false, trackChanges: false, author: project.author || '', ...options };
  if (!FORMATS.includes(opts.format)) throw new Error(`Format necunoscut: ${opts.format}`);
  const projectDir = dir;
  const wanted = ids && ids.length ? new Set(ids) : null;
  const files = [];
  let count = 0;
  const write = (file, data) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
    files.push(file);
  };
  const subtreeHas = (n) => !wanted || wanted.has(n.id) || (n.children || []).some(subtreeHas);
  const visit = async (nodes, dir, inside) => {
    const used = new Set();
    for (const n of nodes) {
      const included = inside || !wanted || wanted.has(n.id);
      if (!included && !subtreeHas(n)) continue;
      const base = uniqueName(used, safeName(n.title), n.id);
      const kids = n.children || [];
      if (n.type === 'file') {
        if (!included) continue;
        // Media: export the original file from the project's media folder.
        if (projectDir && n.media && fs.existsSync(path.join(projectDir, 'media', n.media.file))) {
          const ext = path.extname(n.media.name || n.media.file) || path.extname(n.media.file);
          write(path.join(dir, base + ext), fs.readFileSync(path.join(projectDir, 'media', n.media.file)));
          count++;
        }
      } else if (n.type === 'folder' || n.root) {
        const sub = path.join(dir, base);
        if (included) {
          const html = readDoc(n.id) || '';
          if (store.htmlToText(html).trim()) {
            write(path.join(sub, `${base}.${opts.format}`), await renderDocument(opts.format, n, html, opts));
            count++;
          }
          writeSidecars(sub, base, n);
        }
        if (kids.length) await visit(kids, sub, included);
        else if (included) fs.mkdirSync(sub, { recursive: true });
      } else {
        if (included) {
          write(path.join(dir, `${base}.${opts.format}`), await renderDocument(opts.format, n, readDoc(n.id) || '', opts));
          count++;
          writeSidecars(dir, base, n);
        }
        if (kids.length) await visit(kids, path.join(dir, base), included);
      }
    }
  };
  const writeSidecars = (dir, base, n) => {
    if (opts.withSynopsis && n.synopsis) write(path.join(dir, `${base}.synopsis.txt`), n.synopsis);
    if (opts.withNotes) {
      const notes = readNotes ? readNotes(n.id) : '';
      if (notes && store.htmlToText(notes).trim()) write(path.join(dir, `${base}.notes.md`), `${htmlToMarkdown(notes)}\n`);
    }
    if (opts.withMeta) write(path.join(dir, `${base}.meta.json`), JSON.stringify(metaFor(n), null, 2));
  };
  const roots = project.tree.filter((n) => n.root !== 'trash' || (wanted && subtreeHas(n)));
  await visit(roots, outDir, false);
  return { files, count };
}

// ---------------------------------------------------------------- OPML
const xmlAttr = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#10;');

function exportOpml(project) {
  const lines = [];
  const visit = (nodes, depth) => {
    for (const n of nodes) {
      if (n.root === 'trash') continue;
      const pad = '  '.repeat(depth + 2);
      let a = `text="${xmlAttr(n.title)}"`;
      if (n.synopsis) a += ` _note="${xmlAttr(n.synopsis)}"`;
      if (n.label && n.label !== 'Fără') a += ` _label="${xmlAttr(n.label)}"`;
      if (n.status && n.status !== 'Fără') a += ` _status="${xmlAttr(n.status)}"`;
      const kids = n.children || [];
      if (kids.length) {
        lines.push(`${pad}<outline ${a}>`);
        visit(kids, depth + 1);
        lines.push(`${pad}</outline>`);
      } else lines.push(`${pad}<outline ${a}/>`);
    }
  };
  visit(project.tree, 0);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head>\n    <title>${xmlAttr(project.title)}</title>\n    <dateCreated>${new Date().toUTCString()}</dateCreated>\n  </head>\n  <body>\n${lines.join('\n')}\n  </body>\n</opml>\n`;
}

// ---------------------------------------------------------------- CSV
function csvCell(v) {
  const s = Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportMetadataCsv(project, wordCounts = {}) {
  const customKeys = [];
  const defs = project.customFields || project.customMetadata || [];
  for (const d of defs) {
    const k = typeof d === 'string' ? d : d.id || d.name;
    if (k && !customKeys.includes(k)) customKeys.push(k);
  }
  store.walk(project.tree, (n) => {
    for (const k of Object.keys(n.custom || {})) if (!customKeys.includes(k)) customKeys.push(k);
  });
  const header = ['id', 'title', 'path', 'type', 'label', 'status', 'keywords', 'section_type', 'include_in_compile', 'words', 'created', 'modified', ...customKeys];
  const rows = [header.map(csvCell).join(',')];
  const visit = (nodes, trail) => {
    for (const n of nodes) {
      const p = [...trail, n.title];
      rows.push(
        [
          n.id, n.title, p.join(' / '), n.type || (n.root ? 'folder' : 'text'), n.label || '', n.status || '', n.keywords || [],
          n.sectionType || '', n.includeInCompile === false ? 'false' : 'true', wordCounts[n.id] != null ? wordCounts[n.id] : '',
          n.created || '', n.modified || '', ...customKeys.map((k) => (n.custom || {})[k]),
        ]
          .map(csvCell)
          .join(','),
      );
      if (n.children) visit(n.children, p);
    }
  };
  visit(project.tree, []);
  return `﻿${rows.join('\r\n')}\r\n`;
}

// ---------------------------------------------------------------- Save As
// Explicit recursive copy: fs.cpSync left the destination without project.json on the
// Windows CI runner (non-ASCII destination, short temp path), so each file is copied and
// checked. Lock and temp files of a save in progress are not part of the project.
const SKIP_COPY = /(^project\.json\.lock$|\.tmp$)/;
function copyProjectDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_COPY.test(e.name)) continue;
    const from = path.join(src, e.name);
    const to = path.join(dest, e.name);
    if (e.isDirectory()) copyProjectDir(from, to);
    else if (e.isFile()) fs.copyFileSync(from, to);
  }
}

function saveProjectAs(srcDir, destParent, newTitle) {
  const title = String(newTitle || '').trim();
  if (!title) throw new Error('Titlul nou lipsește.');
  const dest = path.join(destParent, `${safeName(title)}.scribner`);
  if (fs.existsSync(dest)) throw new Error(`Există deja: ${dest}`);
  if (path.resolve(dest).startsWith(path.resolve(srcDir) + path.sep)) throw new Error('Destinația nu poate fi în interiorul proiectului.');
  copyProjectDir(srcDir, dest);
  const file = path.join(dest, 'project.json');
  if (!fs.existsSync(file)) throw new Error(`Copia proiectului e incompletă: lipsește ${file}`);
  const project = JSON.parse(fs.readFileSync(file, 'utf8'));
  project.title = title;
  fs.writeFileSync(file, JSON.stringify(project, null, 2));
  return { dir: dest, project };
}

module.exports = {
  FORMATS,
  safeName,
  htmlToMarkdown,
  htmlToPlain,
  htmlToRtf,
  exportDocuments,
  exportOpml,
  exportMetadataCsv,
  saveProjectAs,
};
