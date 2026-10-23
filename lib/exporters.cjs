'use strict';
// Scrivener 3-style exporters: per-document export (DOCX/RTF/MD/TXT/HTML) mirroring the binder,
// OPML outline, metadata CSV and "Save As" (copy project folder).
const fs = require('fs');
const path = require('path');
const store = require('./store.cjs');
const { escapeHtml } = require('./rtf.cjs');
const { parseBlocks, compileDocx } = require('./compile.cjs');

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
function runsToMd(runs) {
  return runs
    .map((r) => {
      if (r.footnote !== undefined) return `[^${r.footnote.replace(/[\]\n]/g, ' ')}]`;
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
  return parseBlocks(html || '')
    .map((b) => {
      if (b.type === 'hr') return '* * *';
      const t = runsToMd(b.runs);
      if (/^h[1-6]$/.test(b.type)) return `${'#'.repeat(Number(b.type[1]))} ${t}`;
      if (b.type === 'blockquote') return `> ${t}`;
      if (b.type === 'li') return b.list === 'ol' ? `1. ${t}` : `- ${t}`;
      return t;
    })
    .join('\n\n');
}

function htmlToPlain(html) {
  return parseBlocks(html || '')
    .map((b) => (b.type === 'hr' ? '* * *' : b.runs.map((r) => (r.footnote !== undefined ? `[${r.footnote}]` : r.text)).join('')))
    .join('\n\n');
}

function rtfEscape(s) {
  let out = '';
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    if (ch === '\\' || ch === '{' || ch === '}') out += `\\${ch}`;
    else if (ch === '\n') out += '\\line ';
    else if (ch === '\t') out += '\\tab ';
    else if (c < 128) out += ch;
    else if (c < 0x10000) out += `\\u${c > 32767 ? c - 65536 : c}?`;
    else {
      const hi = Math.floor((c - 0x10000) / 0x400) + 0xd800;
      const lo = ((c - 0x10000) % 0x400) + 0xdc00;
      out += `\\u${hi - 65536}?\\u${lo - 65536}?`;
    }
  }
  return out;
}

function htmlToRtf(html, title) {
  const SIZES = { h1: 36, h2: 30, h3: 26 };
  const ALIGN = { center: '\\qc', right: '\\qr', justify: '\\qj' };
  const paras = parseBlocks(html || '').map((b) => {
    if (b.type === 'hr') return '\\pard\\qc * * *\\par';
    const runs = b.runs
      .map((r) => {
        if (r.footnote !== undefined) return `{\\super\\chftn}{\\footnote\\pard\\plain{\\super\\chftn} ${rtfEscape(r.footnote)}}`;
        const on = `${r.b ? '\\b' : ''}${r.i ? '\\i' : ''}${r.u ? '\\ul' : ''}${r.s ? '\\strike' : ''}${r.sup ? '\\super' : ''}${r.sub ? '\\sub' : ''}`;
        return on ? `{${on} ${rtfEscape(r.text)}}` : rtfEscape(r.text);
      })
      .join('');
    const size = SIZES[b.type];
    const pre = `\\pard${ALIGN[b.align] || ''}${b.type === 'blockquote' ? '\\li720\\ri720' : ''}${b.type === 'li' ? '\\li360' : ''}`;
    const bullet = b.type === 'li' ? (b.list === 'ol' ? '# ' : '\\bullet  ') : '';
    return size ? `${pre}{\\b\\fs${size} ${runs}}\\par` : `${pre} ${bullet}${runs}\\par`;
  });
  return `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0 Times New Roman;}}{\\info{\\title ${rtfEscape(title || '')}}}\\f0\\fs24\n${paras.join('\n')}\n}`;
}

function htmlPage(title, html) {
  return `<!doctype html>\n<html lang="ro"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>\n<h1>${escapeHtml(title)}</h1>\n${html || ''}\n</body></html>\n`;
}

async function renderDocument(format, node, html) {
  switch (format) {
    case 'docx': {
      const fake = { title: node.title, author: '', tree: [{ id: 'draft', root: 'draft', type: 'folder', children: [{ id: node.id, type: 'text', title: node.title }] }] };
      return compileDocx(fake, () => html, { documentTitles: false, folderHeadings: false, separator: '' });
    }
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
const FORMATS = ['docx', 'rtf', 'md', 'txt', 'html'];

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
  const opts = { format: 'docx', withNotes: false, withSynopsis: false, withMeta: false, ...options };
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
            write(path.join(sub, `${base}.${opts.format}`), await renderDocument(opts.format, n, html));
            count++;
          }
          writeSidecars(sub, base, n);
        }
        if (kids.length) await visit(kids, sub, included);
        else if (included) fs.mkdirSync(sub, { recursive: true });
      } else {
        if (included) {
          write(path.join(dir, `${base}.${opts.format}`), await renderDocument(opts.format, n, readDoc(n.id) || ''));
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
function saveProjectAs(srcDir, destParent, newTitle) {
  const title = String(newTitle || '').trim();
  if (!title) throw new Error('Titlul nou lipsește.');
  const dest = path.join(destParent, `${safeName(title)}.scribner`);
  if (fs.existsSync(dest)) throw new Error(`Există deja: ${dest}`);
  if (path.resolve(dest).startsWith(path.resolve(srcDir) + path.sep)) throw new Error('Destinația nu poate fi în interiorul proiectului.');
  fs.cpSync(srcDir, dest, { recursive: true });
  const file = path.join(dest, 'project.json');
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
