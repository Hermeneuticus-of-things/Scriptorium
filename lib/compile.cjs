'use strict';
// "Compile": assembles the manuscript (Draft root, items with includeInCompile)
// into one document and exports it as HTML, DOCX or EPUB. PDF is rendered by
// Electron from the HTML produced here (see electron/main.cjs).
const JSZip = require('jszip');
const docx = require('docx');
const store = require('./store.cjs');
const { escapeHtml } = require('./rtf.cjs');

// Linked footnotes (<span data-linked-footnote="note">anchor</span>) compile as the anchor
// text followed by an ordinary inline footnote.
function linkedNotesInline(html) {
  return String(html).replace(/<span([^>]*?)data-linked-footnote="([^"]*)"([^>]*)>([\s\S]*?)<\/span>/g, (_m, _a, note, _b, anchor) => `${anchor}<span data-footnote="${note}" class="footnote"></span>`);
}

const DEFAULT_OPTIONS = {
  folderHeadings: true,
  documentTitles: false,
  separator: '* * *',
  fontFamily: 'Georgia',
  fontSizePt: 12,
};

// Returns [{level, title, html}] in binder order.
function collectSections(project, readDoc, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const draft = project.tree.find((n) => n.root === 'draft');
  const sections = [];
  let previousWasText = false;
  const visit = (nodes, depth) => {
    for (const n of nodes) {
      if (n.includeInCompile === false || n.type === 'file') continue;
      if (n.type === 'folder') {
        const html = linkedNotesInline(readDoc(n.id) || '');
        sections.push({
          kind: 'heading',
          level: Math.min(depth + 1, 3),
          title: opts.folderHeadings ? n.title : '',
          html: store.htmlToText(html).trim() ? html : '',
        });
        previousWasText = false;
        visit(n.children || [], depth + 1);
      } else {
        if (previousWasText && opts.separator) sections.push({ kind: 'separator', text: opts.separator });
        sections.push({
          kind: 'text',
          level: Math.min(depth + 1, 3),
          title: opts.documentTitles ? n.title : '',
          html: linkedNotesInline(readDoc(n.id) || ''),
        });
        previousWasText = true;
        // A text document can contain sub-documents (Scrivener "file group").
        if (n.children && n.children.length) visit(n.children, depth + 1);
      }
    }
  };
  visit(draft ? draft.children : [], 0);
  return sections;
}

function attr(tag, name) {
  const m = new RegExp(`${name}="([^"]*)"`).exec(tag);
  return m ? decodeEntities(m[1]) : null;
}

// Replaces footnote markers with numbered references and strips comment marks
// (keeping the commented text). Returns the new html and the collected notes.
function processNotes(html, startAt = 1, prefix = 'fn') {
  const notes = [];
  let out = (html || '').replace(/<span[^>]*data-footnote="[^"]*"[^>]*>[\s\S]*?<\/span>/g, (tag) => {
    const n = startAt + notes.length;
    notes.push(attr(tag, 'data-footnote'));
    return `<sup><a id="${prefix}ref${n}" href="#${prefix}${n}">${n}</a></sup>`;
  });
  out = out.replace(/<span[^>]*data-comment="[^"]*"[^>]*>([\s\S]*?)<\/span>/g, '$1');
  // Revision colors are an editing aid, not part of the book.
  out = out.replace(/<span[^>]*data-revision="[^"]*"[^>]*>([\s\S]*?)<\/span>/g, '$1');
  // Inline annotations and unrenderable images never reach the compiled book.
  out = out.replace(/<span[^>]*data-(?:annotation|unsupported-image)="[^"]*"[^>]*>[\s\S]*?<\/span>/g, '');
  return { html: out, notes };
}

function notesHtml(notes, startAt = 1, prefix = 'fn') {
  if (!notes.length) return '';
  return `<section class="notes"><h3>Note</h3><ol start="${startAt}">${notes
    .map((t, i) => `<li id="${prefix}${startAt + i}">${escapeHtml(t)} <a href="#${prefix}ref${startAt + i}">↩</a></li>`)
    .join('')}</ol></section>`;
}

// --- images embedded as data: URIs ------------------------------------------------------

const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif', 'image/bmp': 'bmp' };

// Pixel size from the file header (PNG, JPEG, GIF, BMP); null when unknown.
function imageSize(buf, ext) {
  try {
    if (ext === 'png' && buf.length >= 24) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (ext === 'gif' && buf.length >= 10) return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    if (ext === 'bmp' && buf.length >= 26) return { width: Math.abs(buf.readInt32LE(18)), height: Math.abs(buf.readInt32LE(22)) };
    if (ext === 'jpg') {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) return null;
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
        i += 2 + len;
      }
    }
  } catch {
    /* malformed header */
  }
  return null;
}

// data:image/...;base64 -> {mime, ext, data, width, height} (pixels, capped to maxWidthPx); null otherwise.
function imageInfo(src, alt = '', maxWidthPx = 576, maxHeightPx = Infinity) {
  const m = /^data:([\w/+.-]+);base64,([\s\S]*)$/i.exec(String(src || '').trim());
  if (!m) return null;
  const mime = m[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : m[1].toLowerCase();
  const ext = IMAGE_TYPES[mime];
  if (!ext) return null;
  const data = Buffer.from(m[2].replace(/\s+/g, ''), 'base64');
  if (!data.length) return null;
  let size = imageSize(data, ext) || { width: 300, height: 200 };
  if (!size.width || !size.height) size = { width: 300, height: 200 };
  if (size.width > maxWidthPx) size = { width: maxWidthPx, height: Math.max(1, Math.round((size.height * maxWidthPx) / size.width)) };
  if (size.height > maxHeightPx) size = { width: Math.max(1, Math.round((size.width * maxHeightPx) / size.height)), height: Math.round(maxHeightPx) };
  return { mime, ext, data, alt, width: size.width, height: size.height };
}

// Characters that are not allowed in XML 1.0 (and break DOCX/ODT/EPUB/FDX consumers).
// eslint-disable-next-line no-control-regex
const XML_INVALID = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;
const xmlSafe = (s) => String(s).replace(XML_INVALID, '');

// --- tiny HTML parser for TipTap output -> block list with inline runs ---
// styles: named style definitions ({id, type, bold, italic, align, …}).
// Blocks: {type: p|h1-3|li|blockquote|hr|table, runs, align, style, list, level, index, listId}
//   li: level = nesting depth (1 = top), index = number within its <ol>, listId = list instance
//   table: rows: [[{header, runs}]]
// Runs: {text, b, i, u, s, sup, sub, sc, caps, link} | {footnote} | {image} | {commentStart} | {commentEnd}
function parseBlocks(html, styles = [], options = {}) {
  const byId = Object.fromEntries(styles.map((s) => [s.id, s]));
  const blocks = [];
  let current = null;
  const marks = { b: 0, i: 0, u: 0, s: 0, sup: 0, sub: 0 };
  const spans = []; // stack of {skip, style}
  const lists = []; // stack of {tag: 'ol' | 'ul', id, n}
  const links = []; // stack of href | null
  let listNo = 0;
  let quote = 0; // blockquote nesting
  let table = null; // open table block
  let row = null;
  let cell = null;
  const startBlock = (type, attrs = '') => {
    const align = (/text-align:\s*(left|center|right|justify)/.exec(attrs) || [])[1] || null;
    const style = byId[(/data-style="([^"]*)"/.exec(attrs) || [])[1]] || null;
    const top = lists[lists.length - 1];
    current = { type, runs: [], align: align || (style && style.align) || null, style, list: top ? top.tag : null };
    if (type === 'li' && top) {
      current.level = lists.length;
      current.listId = top.id;
      if (top.tag === 'ol') current.index = ++top.n;
    }
    blocks.push(current);
  };
  // Inside a table cell every paragraph-like tag only adds a line break to the cell.
  const target = () => {
    if (cell) return cell;
    if (!current) startBlock('p');
    return current;
  };
  const charStyle = () => spans.reduce((acc, s) => (s.style ? { b: acc.b || s.style.bold, i: acc.i || s.style.italic } : acc), { b: false, i: false });
  const skipping = () => spans.some((s) => s.skip);
  const re = /<(\/?)([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const closing = m[1] === '/';
    const tag = m[2] && m[2].toLowerCase();
    if (tag === 'span') {
      if (closing) {
        const sp = spans.pop();
        if (sp && sp.comment && (current || cell)) target().runs.push({ commentEnd: true });
        continue;
      }
      if (options.comments && /data-comment=/.test(m[3]) && !skipping()) {
        target().runs.push({ commentStart: attr(`<span${m[3]}>`, 'data-comment') || '' });
        spans.push({ skip: false, comment: true });
        continue;
      }
      if (/data-footnote=/.test(m[3])) {
        if (!skipping()) target().runs.push({ footnote: xmlSafe(attr(`<span${m[3]}>`, 'data-footnote') || '') });
        spans.push({ skip: true });
        continue;
      }
      if (/data-(annotation|unsupported-image)=/.test(m[3])) {
        spans.push({ skip: true });
        continue;
      }
      spans.push({ skip: false, style: byId[(/data-char-style="([^"]*)"/.exec(m[3]) || [])[1]] || null, caps: (/data-caps="(small|all)"/.exec(m[3]) || [])[1] || null });
      continue;
    }
    if (skipping()) continue;
    if (m[4] !== undefined) {
      const text = xmlSafe(decodeEntities(m[4]));
      if (!text) continue;
      if (table && !cell) continue; // whitespace between table tags
      const into = target();
      const cs = charStyle();
      const ps = (!cell && current.style) || {};
      const caps = spans.reduce((acc, sp) => sp.caps || acc, null);
      const link = links.reduce((acc, l) => l || acc, null);
      into.runs.push({
        ...(caps === 'small' ? { sc: true } : caps === 'all' ? { caps: true } : {}),
        ...(link ? { link } : {}),
        text,
        b: marks.b > 0 || cs.b || Boolean(ps.bold) || Boolean(cell && cell.header),
        i: marks.i > 0 || cs.i || Boolean(ps.italic),
        u: marks.u > 0,
        s: marks.s > 0,
        sup: marks.sup > 0,
        sub: marks.sub > 0,
      });
      continue;
    }
    if (tag === 'table') {
      if (closing) {
        if (table) table = row = cell = null;
        current = null;
      } else if (!table) {
        table = { type: 'table', rows: [], runs: [] };
        blocks.push(table);
        current = null;
      }
      continue;
    }
    if (table && tag === 'tr') {
      if (!closing) {
        row = [];
        table.rows.push(row);
      } else row = null;
      cell = null;
      continue;
    }
    if (table && (tag === 'td' || tag === 'th')) {
      if (!closing) {
        if (!row) {
          row = [];
          table.rows.push(row);
        }
        cell = { header: tag === 'th', runs: [], colspan: Math.max(1, Number((/colspan="(\d+)"/.exec(m[3]) || [])[1]) || 1) };
        row.push(cell);
      } else cell = null;
      continue;
    }
    if (cell && ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'div'].includes(tag)) {
      if (!closing && cell.runs.length) cell.runs.push({ text: '\n' });
      continue;
    }
    if (tag === 'a') {
      if (closing) links.pop();
      else {
        const href = attr(`<a${m[3]}>`, 'href');
        links.push(href && /^(https?:|mailto:|#)/i.test(href) ? href : null);
      }
      continue;
    }
    if (tag === 'img' && !closing) {
      const src = attr(`<img${m[3]}>`, 'src') || '';
      const alt = attr(`<img${m[3]}>`, 'alt') || '';
      const box = options.imageBox || {};
      // Width chosen in the editor (px or % of the text column) is kept, never past the page.
      const tagSrc = `<img${m[3]}>`;
      const wAttr = String(attr(tagSrc, 'width') || '').trim();
      let maxW = box.width || 576;
      if (/^\d+(\.\d+)?%$/.test(wAttr)) maxW = Math.max(16, Math.round((maxW * parseFloat(wAttr)) / 100));
      else if (/^\d+$/.test(wAttr)) maxW = Math.min(maxW, Number(wAttr));
      const image = imageInfo(src, alt, maxW, box.height || Infinity);
      if (image && /^\d/.test(wAttr) && image.width < maxW) {
        // An explicit width also enlarges a small image (as in the editor).
        const k = maxW / image.width;
        const h = Math.round(image.height * k);
        if (!box.height || h <= box.height) Object.assign(image, { width: maxW, height: h });
      }
      const align = attr(tagSrc, 'data-align');
      if (image && (align === 'center' || align === 'left' || align === 'right')) {
        const blk = target();
        if (!blk.align) blk.align = align;
      }
      if (image) target().runs.push({ image });
      else if (alt) target().runs.push({ text: `[${alt}]`, b: false, i: false, u: false, s: false });
      continue;
    }
    if (tag === 'ol' || tag === 'ul') {
      if (closing) lists.pop();
      else lists.push({ tag, id: ++listNo, n: Math.max(0, Number((/start="(\d+)"/.exec(m[3]) || [])[1] || 1) - 1) });
      current = null;
    } else if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre'].includes(tag)) {
      // <li><p>…</p></li>: the <p> opens the block; avoid an empty extra block for <li>
      if (!closing) {
        if (tag === 'p' && current && current.type === 'li' && !current.runs.length) {
          const style = byId[(/data-style="([^"]*)"/.exec(m[3]) || [])[1]] || null;
          current.style = style;
          current.align = (/text-align:\s*(left|center|right|justify)/.exec(m[3]) || [])[1] || (style && style.align) || null;
        } else if (tag === 'p' && current && current.type === 'li' && lists.length) {
          // second paragraph of the same item: keep it in the item
          current.runs.push({ text: '\n' });
        } else startBlock(/^h[4-6]$/.test(tag) ? 'h3' : tag === 'pre' || (tag === 'p' && quote > 0) ? (quote > 0 ? 'blockquote' : 'p') : tag, m[3]);
        if (tag === 'blockquote') quote++;
      } else if (tag !== 'p' || !current || current.type !== 'li') current = null;
      if (tag === 'li' && closing) current = null;
      if (tag === 'blockquote' && closing) quote = Math.max(0, quote - 1);
    } else if (tag === 'hr' && !closing) {
      blocks.push({ type: 'hr', runs: [] });
      current = null;
    } else if (tag === 'strong' || tag === 'b') marks.b += closing ? -1 : 1;
    else if (tag === 'em' || tag === 'i') marks.i += closing ? -1 : 1;
    else if (tag === 'u') marks.u += closing ? -1 : 1;
    else if (tag === 's' || tag === 'strike' || tag === 'del') marks.s += closing ? -1 : 1;
    else if (tag === 'sup') marks.sup += closing ? -1 : 1;
    else if (tag === 'sub') marks.sub += closing ? -1 : 1;
    else if (tag === 'br' && (current || cell)) target().runs.push({ text: '\n', b: false, i: false, u: false, s: false });
  }
  return blocks.filter((b) => b.type === 'hr' || (b.type === 'table' ? b.rows.some((r) => r.length) : b.type !== 'blockquote' || b.runs.length));
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');
}


// ---------------------------------------------------------------------------
// Compile pipeline (Scrivener-3 style): formats, section types -> layouts,
// separators, front/back matter, placeholders, replacements, notes.
// ---------------------------------------------------------------------------

const F = require('./compileFormats.cjs');
const { blocksToRtf } = require('./rtfWriter.cjs');

const OUTPUT_FORMATS = {
  docx: { ext: 'docx', name: 'Word (.docx)' },
  pdf: { ext: 'pdf', name: 'PDF' },
  epub: { ext: 'epub', name: 'EPUB' },
  html: { ext: 'html', name: 'HTML' },
  rtf: { ext: 'rtf', name: 'RTF' },
  odt: { ext: 'odt', name: 'OpenDocument (.odt)' },
  md: { ext: 'md', name: 'Markdown' },
  mmd: { ext: 'mmd', name: 'MultiMarkdown' },
  txt: { ext: 'txt', name: 'Text simplu' },
  fountain: { ext: 'fountain', name: 'Fountain (scenariu)' },
  fdx: { ext: 'fdx', name: 'Final Draft (.fdx)' },
  tex: { ext: 'tex', name: 'LaTeX' },
};

const esc = (s) => escapeHtml(s == null ? '' : String(s));
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');

// --- numbers ---------------------------------------------------------------

function toRoman(n) {
  if (!(n > 0 && n < 4000)) return String(n);
  const t = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, r] of t) while (n >= v) { out += r; n -= v; }
  return out;
}

// Romanian cardinal numbers in the form used after a noun ("Capitolul unu",
// "Capitolul doi", "Partea doisprezece"): masculine/neutral counting forms,
// which is what Romanian books use for "Capitolul <n>" (the noun carries the
// article, the number stays in the counting form). Works up to 999 999.
const UNITS = ['zero', 'unu', 'doi', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă'];
const TEENS = ['zece', 'unsprezece', 'doisprezece', 'treisprezece', 'paisprezece', 'cincisprezece', 'șaisprezece', 'șaptesprezece', 'optsprezece', 'nouăsprezece'];
const TENS = ['', '', 'douăzeci', 'treizeci', 'patruzeci', 'cincizeci', 'șaizeci', 'șaptezeci', 'optzeci', 'nouăzeci'];

function below100(n) {
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  const t = TENS[Math.floor(n / 10)];
  return n % 10 ? `${t} și ${UNITS[n % 10]}` : t;
}
// "two/one" in front of a noun (sute, mii) uses the feminine forms "o", "două";
// from 20 upwards Romanian inserts "de" ("douăzeci de mii").
function countOf(n, one, many) {
  if (n === 1) return one;
  const w = n === 2 ? 'două' : n === 12 ? 'douăsprezece' : below1000(n);
  return n % 100 >= 20 || (n % 100 === 0 && n >= 100) ? `${w} de ${many}` : `${w} ${many}`;
}
function below1000(n) {
  if (n < 100) return below100(n);
  const h = Math.floor(n / 100);
  const head = countOf(h, 'o sută', 'sute');
  return n % 100 ? `${head} ${below100(n % 100)}` : head;
}
function romanianWords(n) {
  n = Math.floor(Number(n));
  if (!Number.isFinite(n) || n < 0 || n >= 1e6) return String(n);
  if (n < 1000) return below1000(n);
  const th = Math.floor(n / 1000);
  const head = countOf(th, 'o mie', 'mii');
  return n % 1000 ? `${head} ${below1000(n % 1000)}` : head;
}

function formatNumber(n, fmt) {
  if (!fmt) return String(n);
  if (fmt === 'roman' || fmt === 'R') return toRoman(n);
  if (fmt === 'lroman' || fmt === 'r') return toRoman(n).toLowerCase();
  if (fmt === 'words' || fmt === 'w') return romanianWords(n);
  if (fmt === 'Words' || fmt === 'W') {
    const w = romanianWords(n);
    return w.charAt(0).toUpperCase() + w.slice(1);
  }
  if (fmt === 'WORDS') return romanianWords(n).toUpperCase();
  return null;
}

// --- placeholders ------------------------------------------------------------

const PLACEHOLDER = /<\$([A-Za-z_]+)(?::([A-Za-z]+))?>/g;

function authorParts(project) {
  const full = String(project.author || '').trim();
  const parts = full.split(/\s+/).filter(Boolean);
  return {
    forename: project.authorFirst || (parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] || ''),
    surname: project.authorLast || (parts.length > 1 ? parts[parts.length - 1] : parts[0] || ''),
  };
}

function placeholderValue(name, fmt, ctx) {
  const p = ctx.project || {};
  switch (name) {
    case 'n':
      return ctx.n == null ? null : formatNumber(ctx.n, fmt);
    case 't':
    case 'title':
      return ctx.title == null ? null : ctx.title;
    case 'wc':
      return String(ctx.wc || 0);
    case 'projecttitle':
      return p.title || '';
    case 'abbr_title':
      return p.titleAbbreviation || p.title || '';
    case 'author':
      return p.author || '';
    case 'subtitle':
      return p.subtitle || '';
    case 'surname':
    case 'lastname':
      return authorParts(p).surname;
    case 'forename':
    case 'firstname':
      return authorParts(p).forename;
    case 'date':
      return (ctx.now || new Date()).toLocaleDateString('ro-RO');
    case 'year':
      return String((ctx.now || new Date()).getFullYear());
    default:
      return null; // unknown (and <$p> outside headers) stays as text
  }
}

function replacePlaceholders(text, ctx) {
  if (!text || text.indexOf('<$') < 0) return text;
  return text.replace(PLACEHOLDER, (all, name, fmt) => {
    const v = placeholderValue(name, fmt, ctx);
    return v == null ? all : v;
  });
}

// --- text-only transformations -------------------------------------------------

// Applies fn to every text node of the HTML (decoded), never to tags/attributes.
// Footnote text (data-footnote attribute) is transformed too, as it is text.
function mapText(html, fn) {
  const state = { last: '' };
  const parts = String(html || '').split(/(<[^>]*>)/);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (i % 2 === 1) {
      if (part.indexOf('data-footnote="') >= 0) {
        parts[i] = part.replace(/data-footnote="([^"]*)"/, (_, v) => `data-footnote="${escAttr(fn(decodeEntities(v), { last: '' }))}"`);
      }
      if (/^<(p|h\d|li|blockquote|br|div|td|th)\b/i.test(part)) state.last = '';
      continue;
    }
    const text = fn(decodeEntities(part), state);
    state.last = text.slice(-1);
    parts[i] = escapeHtml(text);
  }
  return parts.join('');
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Compiles the replacement list once. Invalid regexes are skipped.
function compileReplacements(list) {
  return (list || [])
    .filter((r) => r && r.find)
    .map((r) => {
      let src = r.regex ? r.find : escapeRegExp(r.find);
      if (r.wholeWord) src = `(?<![\\p{L}\\p{N}_])(?:${src})(?![\\p{L}\\p{N}_])`;
      try {
        const re = new RegExp(src, `gu${r.caseSensitive ? '' : 'i'}`);
        const rep = r.replace == null ? '' : String(r.replace);
        return (t) => t.replace(re, r.regex ? rep : () => rep);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function applyReplacements(text, list) {
  const fns = Array.isArray(list) && typeof list[0] === 'function' ? list : compileReplacements(list);
  return fns.reduce((t, f) => f(t), text);
}

// Straight quotes -> Romanian „…”; the opening/closing choice depends on the
// character before the quote.
function smartQuotes(text, prev = '') {
  let out = '';
  let before = prev;
  for (const ch of text) {
    if (ch === '"') out += !before || /[\s([{\-–—„«]/.test(before) ? '„' : '”';
    else out += ch;
    before = ch;
  }
  return out;
}

function dashes(text) {
  return text.replace(/---/g, '—').replace(/--/g, '—');
}

// Markup-level transformations (before text transformations).
function cleanMarkup(html, tr) {
  let out = String(html || '');
  // Inline annotations and unrenderable images never reach the compiled book.
  out = out.replace(/<span[^>]*data-(?:annotation|unsupported-image)="[^"]*"[^>]*>[\s\S]*?<\/span>/g, '');
  out = out.replace(/<span[^>]*data-revision="[^"]*"[^>]*>([\s\S]*?)<\/span>/g, '$1');
  if (tr.linksToText) out = out.replace(/<a\b[^>]*href="scribner:\/\/[^"]*"[^>]*>([\s\S]*?)<\/a>/g, '$1');
  if (tr.removeHighlights) {
    out = out.replace(/<\/?mark\b[^>]*>/g, '');
    out = out.replace(/(style="[^"]*?)background(?:-color)?:\s*[^;"]+;?\s*/g, '$1');
  }
  if (tr.removeColors) out = out.replace(/(style="[^"]*?)(?<![-\w])color:\s*[^;"]+;?\s*/g, '$1');
  if (tr.comments !== 'export') out = out.replace(/<span[^>]*data-comment="[^"]*"[^>]*>([\s\S]*?)<\/span>/g, '$1');
  out = out.replace(/\sstyle="\s*"/g, '');
  return out;
}

// --- section types ----------------------------------------------------------------

function sectionTypeTitle(project, idOrTitle) {
  if (!idOrTitle || typeof idOrTitle !== 'string') return null;
  const t = (project.sectionTypes || []).find((s) => s.id === idOrTitle || s.title === idOrTitle);
  return t ? t.title : idOrTitle;
}

function structuralRole(node) {
  if (node.type === 'folder') return 'folder';
  return node.children && node.children.length ? 'container' : 'file';
}

// Manual section type, else the project's per-level default, else the format's default
// for the structural role, else built-in (folder -> „Capitol”, text -> „Scenă”).
function resolveSectionType(project, node, format) {
  const manual = sectionTypeTitle(project, node.sectionType);
  if (manual) return manual;
  const role = structuralRole(node);
  const levels = project.sectionTypeLevels || {};
  const levelKey = { folder: 'folders', container: 'containers', file: 'files' }[role];
  const byLevel = sectionTypeTitle(project, typeof levels[levelKey] === 'string' ? levels[levelKey] : null);
  if (byLevel) return byLevel;
  const def = format && format.defaultLayouts && format.defaultLayouts[role];
  if (def) return def;
  return node.type === 'folder' ? 'Capitol' : 'Scenă';
}

function layoutFor(format, typeTitle, node) {
  const L = format.layouts || {};
  if (L[typeTitle]) return F.layout(L[typeTitle]);
  const role = structuralRole(node);
  const fallback = L[(format.defaultLayouts || {})[role]];
  if (fallback) return F.layout(fallback);
  return F.layout(node.type === 'folder' ? { pageBreakBefore: true } : { showTitle: false });
}

// --- options ---------------------------------------------------------------------------

// Merges project.compile (persisted settings) with call options and resolves the format.
function resolveOptions(project, options = {}) {
  const pc = (project && project.compile) || {};
  const merged = { ...DEFAULT_OPTIONS, ...pc, ...options };
  let format = options.format || null;
  if (!format && options.formatId) format = F.findFormat(project, options.formatId);
  if (!format && !('formatId' in options) && pc.formatId) format = F.findFormat(project, pc.formatId);
  format = format ? F.normalizeFormat(format) : F.legacyFormat(merged);
  const pick = (k) => (merged[k] === undefined || merged[k] === null ? format[k] : merged[k]);
  return {
    ...merged,
    format,
    titlePage: pick('titlePage'),
    toc: pick('toc'),
    transforms: { ...format.transforms, ...(options.transforms || {}) },
    styles: merged.styles || [],
    epub: { ...(pc.epub || {}), ...(options.epub || {}) },
  };
}

// --- collections / <$img> ---------------------------------------------------------------

// Compile Contents filter "collection": options.collectionIds (explicit ids) or options.collectionId
// (a manual collection of project.collections). Returns a Set of ids, or null for no filter.
function collectionFilter(project, o) {
  if (Array.isArray(o.collectionIds)) return new Set(o.collectionIds);
  if (!o.collectionId) return null;
  const c = ((project && project.collections) || []).find((x) => x.id === o.collectionId);
  return new Set((c && c.ids) || []);
}

// <$img:Name> (typed in the text, so usually stored as &lt;$img:Name&gt;) -> the image from the
// project's media whose binder title or original file name is Name. Sources, in order:
// options.images {name: dataUri}, options.readMedia(file) -> {data: Buffer, mime}, options.projectDir/media.
function findMediaNode(tree, name) {
  const want = String(name).trim().toLowerCase();
  const strip = (s) => String(s || '').replace(/\.[^.]+$/, '').toLowerCase();
  let hit = null;
  store.walk(tree || [], (n) => {
    if (hit || !n.media || !String(n.media.mime || '').startsWith('image/')) return;
    const t = String(n.title || '').toLowerCase();
    const f = String(n.media.name || '').toLowerCase();
    if (t === want || f === want || strip(f) === want) hit = n;
  });
  return hit;
}

function imageDataUri(name, project, o) {
  if (o.images && o.images[name]) return o.images[name];
  const node = findMediaNode(project.tree, name);
  if (!node) return null;
  try {
    let res = null;
    if (typeof o.readMedia === 'function') res = o.readMedia(node.media.file);
    else if (o.projectDir) res = store.readMedia(o.projectDir, node.media.file);
    if (!res) return null;
    return `data:${res.mime || node.media.mime};base64,${Buffer.from(res.data).toString('base64')}`;
  } catch {
    return null;
  }
}

function resolveImagePlaceholders(html, project, o = {}) {
  const src = String(html || '');
  if (src.indexOf('$img:') < 0) return src;
  return src.replace(/&lt;\$img:([^&<>]+?)&gt;|<\$img:([^<>]+?)>/g, (all, a, b) => {
    const name = decodeEntities(a !== undefined ? a : b).trim();
    const uri = imageDataUri(name, project, o);
    return uri ? `<img src="${uri}" alt="${escAttr(name)}">` : all;
  });
}

// --- document model -------------------------------------------------------------------

// Builds the ordered item list:
//   {kind:'titlepage'} {kind:'toc', entries} {kind:'section', ...} {kind:'separator', sep} {kind:'notes', notes}
function buildDocument(project, readDoc, options = {}) {
  const o = options.format && options.transforms && options._resolved ? options : resolveOptions(project, options);
  const { format, transforms: tr } = o;
  const tree = project.tree || [];
  const draft = tree.find((n) => n.root === 'draft') || tree[0];
  const labels = (o.labels || []).filter(Boolean);
  const statuses = (o.statuses || []).filter(Boolean);
  const inCollection = collectionFilter(project, o);
  const passes = (n) => (!labels.length || labels.includes(n.label || 'Fără')) && (!statuses.length || statuses.includes(n.status || 'Fără')) && (!inCollection || inCollection.has(n.id));

  // Pass 1: collect raw sections in order.
  const raw = [];
  const seen = new Set();
  const visit = (nodes, depth, explicit, matter) => {
    for (const n of nodes || []) {
      if (!n || seen.has(n.id)) continue;
      if (!explicit && n.includeInCompile === false) continue;
      if (n.type === 'file' || n.root === 'trash') continue;
      seen.add(n.id);
      if (n.root) {
        visit(n.children, depth, false, matter);
        continue;
      }
      if (matter !== 'body' || passes(n)) raw.push({ node: n, depth, matter, html: linkedNotesInline(readDoc(n.id) || '') });
      if (n.children && n.children.length && (explicit !== 'single')) visit(n.children, depth + 1, false, matter);
    }
  };
  const matterNodes = (id) => {
    const f = id ? store.findNode(tree, id) : null;
    return f ? f.children || [] : [];
  };
  const front = [];
  visit(matterNodes(o.frontMatterId), 0, false, 'front');
  front.push(...raw.splice(0));
  if (Array.isArray(o.ids) && o.ids.length) {
    for (const id of o.ids) {
      const n = store.findNode(tree, id);
      if (n) visit([n], 0, o.includeChildren === false ? 'single' : true, 'body');
    }
  } else if (o.rootId && o.rootId !== (draft && draft.id)) {
    const n = store.findNode(tree, o.rootId);
    if (n) visit([n], 0, true, 'body');
  } else visit(draft ? draft.children : [], 0, false, 'body');
  const body = raw.splice(0);
  visit(matterNodes(o.backMatterId), 0, false, 'back');
  const back = raw.splice(0);

  const wc = body.reduce((sum, s) => sum + store.wordCount(s.html), 0);
  const replacers = compileReplacements(format.replacements);
  const notesMode = tr.notes || 'footnotes';
  const counters = {};
  const items = [];
  const tocEntries = [];
  let pending = [];
  let endNo = 0;
  let endAnchor = 0;
  let prevType = null;
  let firstOfMatter = true;
  let secNo = 0;

  const flushNotes = () => {
    if (pending.length) items.push({ kind: 'notes', notes: pending });
    pending = [];
  };
  const textFn = (ctx) => (text, state) => {
    let t = replacePlaceholders(text, ctx);
    if (replacers.length) t = applyReplacements(t, replacers);
    if (tr.dashes) t = dashes(t);
    if (tr.smartQuotes) t = smartQuotes(t, state.last);
    return t;
  };
  const processHtml = (html, ctx) => {
    let out = mapText(cleanMarkup(resolveImagePlaceholders(html, project, o), tr), textFn(ctx));
    if (notesMode !== 'footnotes') {
      out = out.replace(/<span[^>]*data-footnote="[^"]*"[^>]*>[\s\S]*?<\/span>/g, (tag) => {
        const n = ++endNo;
        const a = ++endAnchor;
        pending.push({ n, a, text: attr(tag, 'data-footnote') || '' });
        return `<sup><a class="noteref" id="enref${a}" href="#en${a}">${n}</a></sup>`;
      });
    }
    return out;
  };

  if (o.titlePage) items.push({ kind: 'titlepage' });
  if (o.toc) items.push({ kind: 'toc', entries: tocEntries });

  const emit = (s) => {
    const n = s.node;
    const isBody = s.matter === 'body';
    const typeTitle = isBody ? resolveSectionType(project, n, format) : `@${s.matter}`;
    const lay = isBody ? layoutFor(format, typeTitle, n) : F.layout({ showTitle: false, pageBreakBefore: true, separatorBefore: 'none' });
    let num = null;
    // <$n> counts per numbering stream: layouts that share the same title prefix (e.g. „Capitol”
    // and „Capitol cu text”, both "Capitolul <$n>") continue one sequence, as in Scrivener.
    const prefixKey = String(lay.titlePrefix || '').replace(/<\$n(?::[^>]*)?>/g, '<$n>');
    const counterKey = /<\$n>/.test(prefixKey) ? `prefix:${prefixKey}` : `type:${typeTitle}`;
    if (isBody) num = counters[counterKey] = (counters[counterKey] || 0) + 1;
    const level = Math.min(s.depth + 1, 3);
    const ctx = { project, n: num, title: n.title || '', wc };
    let title = '';
    if (lay.showTitle || lay.titlePrefix || lay.titleSuffix) {
      title = replacePlaceholders(`${lay.titlePrefix || ''}${lay.showTitle ? n.title || '' : ''}${lay.titleSuffix || ''}`, ctx).replace(/^\n+|\n+$/g, '');
    }
    const pageBreak = lay.pageBreakBefore === true || (lay.pageBreakBefore === 'level1' && level === 1);
    if (pageBreak && notesMode === 'endnotes-chapter') {
      flushNotes();
      endNo = 0;
    }
    // separator before this section
    if (!firstOfMatter && !pageBreak) {
      let sep = null;
      if (lay.separatorBefore === 'none') sep = null;
      else if (lay.separatorBefore === 'text') sep = { kind: 'text', text: lay.separatorText || (format.separators.sameType || {}).text || '* * *' };
      else if (lay.separatorBefore === 'page') sep = { kind: 'page' };
      else sep = prevType === typeTitle ? format.separators.sameType : format.separators.differentType;
      if (sep && sep.kind && sep.kind !== 'none' && !(sep.kind === 'text' && !sep.text)) items.push({ kind: 'separator', sep: { ...sep } });
    }
    // legacy: folders only contribute their text when it is not empty
    let html = lay.showText ? s.html : '';
    if (format.legacy && n.type === 'folder' && !store.htmlToText(html).trim()) html = '';
    const id = `sec-${++secNo}`;
    items.push({
      kind: 'section',
      id,
      node: n,
      matter: s.matter,
      sectionType: typeTitle,
      number: num,
      level,
      title,
      // Chapter subtitle (Inspector "Subtitlu"): shown under the title whenever the title is.
      subtitle: title && lay.showTitle && n.subtitle ? replacePlaceholders(String(n.subtitle), ctx).trim() : '',
      titleCase: lay.titleCase || 'normal',
      titleAlign: lay.titleAlign || '',
      pageBreak: pageBreak && !(firstOfMatter && items.length === 0),
      html: html ? processHtml(html, ctx) : '',
    });
    if (isBody && title && level <= 2) tocEntries.push({ id, title: title.replace(/\n/g, ' '), level });
    prevType = typeTitle;
    firstOfMatter = false;
  };

  for (const s of front) emit(s);
  firstOfMatter = true;
  prevType = null;
  for (const s of body) emit(s);
  if (notesMode !== 'footnotes') flushNotes();
  firstOfMatter = true;
  prevType = null;
  for (const s of back) emit(s);
  if (notesMode !== 'footnotes') flushNotes();
  // Internal links (scribner://doc/ID) point to the compiled section of that document, or become
  // plain text when the target is not part of this compile.
  const sectionOf = new Map();
  for (const it of items) if (it.kind === 'section' && !sectionOf.has(it.node.id)) sectionOf.set(it.node.id, it.id);
  const linked = new Set();
  for (const it of items) {
    if (it.kind !== 'section' || it.html.indexOf('scribner://') < 0) continue;
    it.html = it.html.replace(/<a\b([^>]*?)href="scribner:\/\/([^"]*)"([^>]*)>([\s\S]*?)<\/a>/g, (_m, _a, target, _b, text) => {
      const docId = decodeURIComponent(String(target).replace(/^doc\//, '').split(/[?#]/)[0]);
      const sec = sectionOf.get(docId);
      if (!sec) return text;
      linked.add(sec);
      return `<a href="#${sec}">${text}</a>`;
    });
  }
  for (const it of items) if (it.kind === 'section' && linked.has(it.id)) it.anchor = true;
  return { options: { ...o, _resolved: true }, format, items, wc };
}

// Header/footer text with placeholders resolved; <$p> is kept for the writer.
function headerFooterText(hf, project, wc) {
  const ctx = { project, wc };
  const r = (s) => replacePlaceholders(s || '', ctx);
  return hf ? { left: r(hf.left), center: r(hf.center), right: r(hf.right) } : { left: '', center: '', right: '' };
}

function caseText(text, titleCase) {
  return titleCase === 'upper' ? text.toLocaleUpperCase('ro-RO') : text;
}

// --- HTML ----------------------------------------------------------------------------

function fontStack(name) {
  if (!name) return 'serif';
  const sans = /arial|helvetica|verdana|calibri|sans|segoe|inter|roboto/i.test(name);
  return `${/\s/.test(name) ? `"${name}"` : name},${sans ? 'sans-serif' : 'serif'}`;
}

// Running header/footer as CSS page-margin boxes (Chromium 131+): unlike printToPDF's header
// template they follow mirrored pages (outer edge) and can be switched off for the cover, the
// title page and the table of contents (named page "front") and for a different first page.
const cssString = (t) => `"${String(t).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
function marginContent(text) {
  const parts = String(text || '').split('<$p>');
  return parts.map((x, i) => (i ? `counter(page) ${cssString(x)}` : cssString(x))).join(' ');
}
function marginBoxes(hf, edge, mirrored, side) {
  if (!hf) return '';
  const left = side === 'left' && mirrored ? hf.right : hf.left;
  const right = side === 'left' && mirrored ? hf.left : hf.right;
  const font = 'font-size:8pt;';
  return [['left', left], ['center', hf.center], ['right', right]]
    .map(([pos, t]) => `@${edge}-${pos}{content:${t ? marginContent(t) : 'none'};${font}}`)
    .join('');
}
function runningCss(page, project) {
  const header = headerFooterText(page.header, project || {}, 0);
  const footer = headerFooterText(page.footer, project || {}, 0);
  const has = (x) => Boolean(x.left || x.center || x.right);
  if (!has(header) && !has(footer)) return '';
  const boxes = (side) => marginBoxes(header, 'top', page.mirrored, side) + marginBoxes(footer, 'bottom', page.mirrored, side);
  const none = ['top', 'bottom'].flatMap((e) => ['left', 'center', 'right'].map((p) => `@${e}-${p}{content:none}`)).join('');
  let css = page.mirrored ? `\n@page :right{${boxes('right')}}\n@page :left{${boxes('left')}}` : `\n@page{${boxes('right')}}`;
  css += `\n@page front{${none}}\n.front-page{page:front}`;
  if (page.differentFirstPage) css += `\n@page :first{${none}}`;
  return css;
}

function pageCss(page, project) {
  const dim = F.pageDimensions(page);
  if (!dim) return '';
  const m = page.margins || {};
  const inner = m.inner ?? 1;
  const outer = m.outer ?? 1;
  let css = `@page{size:${dim.widthIn}in ${dim.heightIn}in;margin:${m.top ?? 1}in ${outer}in ${m.bottom ?? 1}in ${inner}in}`;
  // An image never runs past the page: at most the text block height (minus a line for safety).
  const textH = Math.max(1, dim.heightIn - (m.top ?? 1) - (m.bottom ?? 1) - 0.3);
  css += `\nimg{max-height:${textH.toFixed(2)}in;object-fit:contain}\n.cover-page{height:${textH.toFixed(2)}in;display:flex;align-items:center;justify-content:center}.cover-page img{max-height:100%;max-width:100%}`;
  if (page.mirrored) css += `\n@page :left{margin-left:${outer}in;margin-right:${inner}in}\n@page :right{margin-left:${inner}in;margin-right:${outer}in}`;
  css += runningCss(page, project);
  return css;
}

function headingHtml(s, withId) {
  const lines = caseText(s.title, s.titleCase).split('\n');
  const inner = lines.length > 1 ? `<span class="ch-prefix">${esc(lines[0])}</span><br>${lines.slice(1).map(esc).join('<br>')}` : esc(lines[0]);
  const cls = [s.titleAlign === 'left' ? 'al' : s.titleAlign === 'right' ? 'ar' : s.titleAlign === 'center' ? 'ac' : '', s.titleCase === 'smallcaps' ? 'sc' : ''].filter(Boolean).join(' ');
  return `<h${s.level}${withId ? ` id="${s.id}"` : ''}${cls ? ` class="${cls}"` : ''}>${inner}</h${s.level}>`;
}

function endnotesHtml(notes) {
  return `<section class="notes endnotes"><h3>Note</h3><ol>${notes
    .map((x) => `<li value="${x.n}" id="en${x.a}">${esc(x.text)} <a href="#enref${x.a}">↩</a></li>`)
    .join('')}</ol></section>`;
}

function tocHtml(entries) {
  return `<nav class="toc"><h2>Cuprins</h2><ol>${entries
    .map((e) => `<li class="toc${e.level}"><a href="#${e.id}">${esc(e.title)}</a></li>`)
    .join('')}</ol></nav>`;
}

function titlePageHtml(project) {
  const subtitle = project.subtitle ? `<p class="book-subtitle">${esc(project.subtitle)}</p>` : '';
  const author = project.author ? `<p class="author">${esc(project.author)}</p>` : '';
  return `<h1 class="book">${esc(project.title)}</h1>${subtitle}${author}`;
}

function coverDataUri(o) {
  const c = o.coverImage;
  if (!c || !c.data) return '';
  const mime = (c.mime || 'image/jpeg').toLowerCase().replace('image/jpg', 'image/jpeg');
  const b64 = Buffer.isBuffer(c.data) ? c.data.toString('base64') : String(c.data).replace(/^data:[^,]*,/, '');
  return `data:${mime};base64,${b64}`;
}

function subtitleHtml(it) {
  if (!it.subtitle) return '';
  const cls = it.titleAlign === 'left' ? ' al' : it.titleAlign === 'right' ? ' ar' : '';
  return `<p class="subtitle${cls}">${esc(it.subtitle)}</p>`;
}

// Renders a run of items to HTML. notes: {list, prefix} accumulates footnotes.
function itemsHtml(items, project, opt = {}) {
  const fn = opt.footnotes;
  return items
    .map((it) => {
      // Front pages end with their own page break (break-after), so no extra .pb: two breaks at
      // the same place plus the change of named page would leave a blank page in the PDF.
      if (it.kind === 'titlepage') return `<div class="title-page front-page">${titlePageHtml(project)}</div>`;
      if (it.kind === 'toc') return it.entries.length ? (opt.paged ? `<div class="front-page">${tocHtml(it.entries)}</div>` : tocHtml(it.entries)) : '';
      if (it.kind === 'separator') {
        if (it.sep.kind === 'page') return '<div class="pb"></div>';
        if (it.sep.kind === 'space') return '<p class="sep space">&#160;</p>';
        return `<p class="sep">${esc(it.sep.text)}</p>`;
      }
      if (it.kind === 'notes') return endnotesHtml(it.notes);
      const pb = it.pageBreak ? '<div class="pb"></div>' : '';
      const head = it.title ? headingHtml(it, opt.ids || it.anchor) + subtitleHtml(it) : it.anchor ? `<a id="${it.id}"></a>` : '';
      let html = it.html;
      if (fn) {
        const r = processNotes(html, fn.list.length + 1, fn.prefix || 'fn');
        fn.list.push(...r.notes);
        html = r.html;
      } else html = processNotes(html).html; // strips comments, keeps nothing else
      // A paragraph holding only an image (no text) is a figure: centered, no first-line indent.
      // CSS alone can't tell (":only-child" ignores text), so it is marked here.
      html = html.replace(/<p(\s[^>]*)?>\s*(<img\b[^>]*>)\s*<\/p>/g, (_m, at = '', im) => `<p${/class="/.test(at) ? at.replace('class="', 'class="fig ') : `${at} class="fig"`}>${im}</p>`);
      return pb + head + html;
    })
    .join('\n');
}

function htmlCss(o, target, project) {
  const t = o.format.typography;
  const page = o.format.page;
  const paged = target === 'pdf';
  const indent = Number(t.firstLineIndentIn) || 0;
  const after = Number(t.paragraphSpacingPt) || 0;
  const hf = t.headingFont ? `h1,h2,h3,h4{font-family:${fontStack(t.headingFont)}}\n` : '';
  return `body{font-family:${fontStack(t.fontFamily)};font-size:${t.fontSizePt}pt;line-height:${t.lineSpacing || 1.5};${paged ? 'margin:0;' : 'max-width:40em;margin:2em auto;'}}
${hf}h1{text-align:center;margin-top:3em}
h1.book{page-break-before:avoid;font-size:2.2em;margin-top:${paged ? '30%' : '30vh'}}
.title-page{text-align:center}
.front-page{break-after:page;page-break-after:always}
.author{text-align:center;font-style:italic}
.book-subtitle{text-align:center;font-size:1.3em;font-style:italic;margin:.6em 0 2em;text-indent:0}
.subtitle{text-align:center;font-style:italic;font-size:1.1em;margin:-.4em 0 1.6em;text-indent:0}
h1,h2,h3,h4{break-after:avoid;page-break-after:avoid;break-inside:avoid}
h1+.subtitle,h2+.subtitle,h3+.subtitle{break-before:avoid;page-break-before:avoid}
p{orphans:2;widows:2;hyphens:auto;-webkit-hyphens:auto}
h1,h2,h3,h4,.sep,.subtitle,.book-subtitle,.author,.toc{hyphens:manual;-webkit-hyphens:manual}
img,figure,table,tr{break-inside:avoid;page-break-inside:avoid}
.fig{text-indent:0;text-align:center}
p{text-indent:${indent}in;margin:0 0 ${after}pt}${t.noIndentAfterHeading !== false ? ' h1+p,h2+p,h3+p,.subtitle+p,.sep+p,.pb+p,.toc+p{text-indent:0}' : ''}
.ac{text-align:center}.al{text-align:left}.ar{text-align:right}.sc{font-variant:small-caps}[data-caps="small"]{font-variant:small-caps}[data-caps="all"]{text-transform:uppercase}.ch-prefix{font-size:.8em;font-weight:normal}
.sep{text-align:center;margin:1em 0;text-indent:0}
.pb{break-before:page;page-break-before:always}
.toc ol{list-style:none;padding:0}.toc li{text-indent:0}.toc .toc2{margin-left:1.5em}
.notes{page-break-before:always;font-size:.9em}.notes li{text-indent:0}.endnotes{page-break-before:auto}
hr{border:none;page-break-after:always;margin:0}
img{max-width:100%;height:auto}
table{border-collapse:collapse;margin:1em auto}th,td{border:1px solid #888;padding:.2em .5em;vertical-align:top}th p,td p,li p{text-indent:0;margin:0}
${paged && page ? pageCss(page, project) : ''}
${o.styleCss || ''}`;
}

function compileHtml(project, readDoc, options = {}) {
  const doc = buildDocument(project, readDoc, options);
  const o = doc.options;
  const target = o.target || 'html';
  const fn = { list: [], prefix: 'fn' };
  const cover = target === 'pdf' ? coverDataUri(o) : '';
  const coverHtml = cover ? `<div class="cover-page front-page"><img src="${cover}" alt="${escAttr(project.title || '')}"></div>\n` : '';
  const body = coverHtml + itemsHtml(doc.items, project, { footnotes: fn, ids: Boolean(o.toc), paged: target === 'pdf' }) + notesHtml(fn.list);
  const title = esc(project.title);
  return `<!doctype html><html lang="${escAttr((o.epub && o.epub.language) || 'ro')}"><head><meta charset="utf-8"><title>${title}</title>
<style>
${htmlCss(o, target, project)}
</style></head><body>\n${body}</body></html>`;
}

function previewHtml(project, readDoc, options = {}) {
  const html = compileHtml(project, readDoc, { ...options, target: 'preview' });
  const extra = '<style>body{padding:0 1em}.pb{border-top:1px dashed #bbb;margin:2em 0}</style>';
  return html.replace('</head>', `${extra}</head>`);
}

// --- PDF (rendered by Electron's printToPDF from compileHtml(..., {target:'pdf'})) ---

function pdfOptions(options = {}, project = {}) {
  const o = resolveOptions(project, options);
  const page = o.format.page || F.legacyFormat().page;
  const dim = F.pageDimensions(page);
  const m = page.margins || {};
  // The running header/footer are CSS page-margin boxes in the HTML (runningCss): they follow
  // mirrored pages and are switched off on the cover, title page and contents.
  return {
    pageSize: { width: dim.widthIn, height: dim.heightIn },
    margins: { top: m.top ?? 1, bottom: m.bottom ?? 1, left: m.inner ?? 1, right: m.outer ?? 1 },
    printBackground: false,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
  };
}

// --- block model (DOCX / RTF / ODT / Markdown / text) ----------------------------------------

function titleRuns(s) {
  const lines = caseText(s.title, s.titleCase).split('\n');
  const runs = [];
  lines.forEach((l, i) => {
    if (i) runs.push({ text: '\n' });
    runs.push({ text: l, b: false, i: false, sc: s.titleCase === 'smallcaps' });
  });
  return runs;
}

// Text block of the page in pixels (96 dpi): images are scaled to fit it, never past the margins.
function imageBox(page) {
  const dim = page ? F.pageDimensions(page) : null;
  if (!dim) return { width: 576, height: 864 };
  const m = page.margins || {};
  const w = dim.widthIn - (m.inner ?? 1) - (m.outer ?? 1);
  const h = dim.heightIn - (m.top ?? 1) - (m.bottom ?? 1) - 0.3;
  return { width: Math.max(96, Math.floor(w * 96)), height: Math.max(96, Math.floor(h * 96)) };
}

function blocksFor(doc, project, opt = {}) {
  const o = doc.options;
  const box = imageBox(o.format.page);
  const noIndentAfter = o.format.typography.noIndentAfterHeading !== false;
  const out = [];
  let afterHeading = true;
  for (const it of doc.items) {
    if (it.kind === 'titlepage') {
      out.push({ type: 'title', align: 'center', runs: [{ text: project.title || '' }] });
      if (project.subtitle) out.push({ type: 'subtitle', book: true, align: 'center', noIndent: true, runs: [{ text: project.subtitle, i: true }] });
      if (project.author) out.push({ type: 'author', align: 'center', runs: [{ text: project.author, i: true }] });
      if (!o.format.legacy) out.push({ type: 'pagebreak' });
      afterHeading = true;
    } else if (it.kind === 'toc') {
      if (!it.entries.length) continue;
      out.push({ type: 'h1', align: 'center', runs: [{ text: 'Cuprins' }], toc: true });
      for (const e of it.entries) out.push({ type: 'toc', level: e.level, noIndent: true, runs: [{ text: e.title }] });
      out.push({ type: 'pagebreak' });
    } else if (it.kind === 'separator') {
      if (it.sep.kind === 'page') out.push({ type: 'pagebreak' });
      else if (it.sep.kind === 'space') out.push({ type: 'space', runs: [] });
      else out.push({ type: 'sep', align: 'center', runs: [{ text: it.sep.text }] });
      afterHeading = true;
    } else if (it.kind === 'notes') {
      out.push({ type: 'h3', runs: [{ text: 'Note' }] });
      // section: the endnote is the target of its reference link (en<anchor>)
      for (const x of it.notes) out.push({ type: 'note', n: x.n, noIndent: true, section: `en${x.a}`, runs: [{ text: `${x.n}. ` }, { text: x.text }] });
      afterHeading = true;
    } else {
      if (it.pageBreak) out.push({ type: 'pagebreak' });
      if (it.title) {
        out.push({ type: `h${it.level}`, align: it.titleAlign || (it.level === 1 && o.format.legacy ? 'center' : null), runs: titleRuns(it), section: it.id });
        if (it.subtitle) out.push({ type: 'subtitle', align: it.titleAlign || 'center', noIndent: true, runs: [{ text: it.subtitle, i: true }] });
        afterHeading = true;
      } else if (it.anchor) out.push({ type: 'anchor', section: it.id, runs: [] });
      if (it.pageBreak) afterHeading = true;
      let olIndex = 0;
      for (const b of parseBlocks(it.html, o.styles || [], { comments: opt.comments, imageBox: box })) {
        if (b.type === 'hr' || b.type.startsWith('h')) afterHeading = true;
        else {
          if (afterHeading && noIndentAfter) b.noIndent = true;
          afterHeading = false;
        }
        if (b.type === 'li' && b.list === 'ol' && b.index === undefined) b.index = ++olIndex;
        else if (b.type !== 'li') olIndex = 0;
        out.push(b);
      }
    }
  }
  // Fold explicit page breaks into the next block.
  const blocks = [];
  let brk = false;
  let anchor = null;
  for (const b of out) {
    if (b.type === 'pagebreak') {
      brk = blocks.length > 0;
      continue;
    }
    if (b.type === 'anchor') {
      anchor = b.section;
      continue;
    }
    if (brk) b.pageBreakBefore = true;
    if (anchor && !b.section) b.section = anchor;
    brk = false;
    anchor = null;
    blocks.push(b);
  }
  return blocks;
}

function plainRuns(runs) {
  return (runs || []).map((r) => (r.text !== undefined ? r.text : '')).join('');
}

// --- DOCX ----------------------------------------------------------------------------

// options.trackChanges: revision marks become Word tracked changes (w:ins / w:del) with
// options.trackAuthor (default project.author) and the current date.
async function compileDocx(project, readDoc, options = {}) {
  if (!options.trackChanges) return compileDocxPlain(project, readDoc, options);
  const tc = require('./trackChanges.cjs');
  const buf = await compileDocxPlain(project, (id) => tc.revisionsToSentinels(readDoc(id) || ''), options);
  return tc.applyDocxRevisions(buf, { author: options.trackAuthor || project.author || 'Scribner', date: options.trackDate || new Date() });
}

async function compileDocxPlain(project, readDoc, options = {}) {
  const doc = buildDocument(project, readDoc, options);
  const o = doc.options;
  const t = o.format.typography;
  const page = o.format.legacy ? null : o.format.page;
  const exportComments = o.transforms.comments === 'export';
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, FootnoteReferenceRun, PageBreak, LevelFormat, Header, Footer, Tab, TabStopType, PageNumber, CommentRangeStart, CommentRangeEnd, CommentReference, ImageRun, ExternalHyperlink, InternalHyperlink, Bookmark, Table, TableRow, TableCell, WidthType, BorderStyle } = docx;
  const footnotes = {};
  let nextFootnote = 1;
  const comments = [];
  const openComments = [];
  const H = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 };
  const ALIGN = { center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED, left: AlignmentType.LEFT };
  const headingFont = t.headingFont || undefined;
  // Word bookmark names: a letter first, then letters, digits and underscores.
  const bookmarkName = (id) => String(id).replace(/[^A-Za-z0-9_]/g, '_');
  const runFor = (r, extra = {}) => {
    if (r.text === '\n') return new TextRun({ break: 1 });
    if (r.image) {
      const im = r.image;
      return new ImageRun({ type: im.ext, data: im.data, transformation: { width: im.width, height: im.height }, altText: im.alt ? { name: im.alt, description: im.alt, title: im.alt } : undefined });
    }
    return new TextRun({ text: r.text, bold: r.b, italics: r.i, underline: r.u ? {} : undefined, strike: r.s, superScript: r.sup, subScript: r.sub, smallCaps: r.sc || undefined, allCaps: r.caps || undefined, style: r.link ? 'Hyperlink' : undefined, ...extra });
  };
  const runsFor = (runs, extra = {}) => {
    const out = [];
    let link = null; // {href, children}
    const flushLink = () => {
      if (!link) return;
      if (link.href.startsWith('#')) out.push(new InternalHyperlink({ anchor: bookmarkName(link.href.slice(1)), children: link.children }));
      else out.push(new ExternalHyperlink({ link: link.href, children: link.children }));
      link = null;
    };
    for (const r of runs) {
      if ((r.text !== undefined || r.image) && r.link) {
        if (link && link.href !== r.link) flushLink();
        if (!link) link = { href: r.link, children: [] };
        link.children.push(runFor(r, extra));
        continue;
      }
      flushLink();
      if (r.footnote !== undefined) {
        const id = nextFootnote++;
        footnotes[id] = { children: [new Paragraph({ children: [new TextRun(r.footnote)] })] };
        out.push(new FootnoteReferenceRun(id));
      } else if (r.commentStart !== undefined) {
        const id = comments.length;
        comments.push({ id, author: project.author || 'Scribner', date: new Date(), children: [new Paragraph({ children: [new TextRun(r.commentStart)] })] });
        openComments.push(id);
        out.push(new CommentRangeStart(id));
      } else if (r.commentEnd) {
        const id = openComments.pop();
        if (id !== undefined) out.push(new CommentRangeEnd(id), new TextRun({ children: [new CommentReference(id)] }));
      } else if (r.text !== undefined || r.image) out.push(runFor(r, extra));
    }
    flushLink();
    return out;
  };
  // Headings (and untitled link targets) carry a bookmark so internal links resolve.
  const withBookmark = (b, kids) => (b.section ? [new Bookmark({ id: bookmarkName(b.section), children: kids })] : kids);
  const firstLine = Math.round((Number(t.firstLineIndentIn) || 0) * 1440);
  const after = Math.round((Number(t.paragraphSpacingPt) || 0) * 20);
  const border = { style: BorderStyle.SINGLE, size: 4, color: '808080' };
  const tableFor = (b) => {
    const cols = Math.max(1, ...b.rows.map((r) => r.reduce((n, c) => n + c.colspan, 0)));
    const rows = b.rows
      .filter((r) => r.length)
      .map(
        (r, ri) =>
          new TableRow({
            tableHeader: ri === 0 && r.every((c) => c.header) ? true : undefined,
            children: r.map(
              (c) =>
                new TableCell({
                  columnSpan: c.colspan > 1 ? c.colspan : undefined,
                  width: { size: Math.round((5000 * c.colspan) / cols), type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: runsFor(c.runs) })],
                }),
            ),
          }),
      );
    return new Table({ rows, width: { size: 5000, type: WidthType.PERCENTAGE }, borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border } });
  };
  const children = [];
  const coverSrc = coverDataUri(o);
  if (coverSrc) {
    const box = imageBox(o.format.page);
    const im = imageInfo(coverSrc, project.title || '', box.width, box.height);
    if (im) children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [runFor({ image: im }), new PageBreak()] }));
  }
  for (const b of blocksFor(doc, project, { comments: exportComments })) {
    const pageBreakBefore = b.pageBreakBefore || undefined;
    if (b.type === 'table') {
      if (pageBreakBefore) children.push(new Paragraph({ pageBreakBefore: true, children: [] }));
      children.push(tableFor(b));
      // Word needs a paragraph between two consecutive tables, and after a final table before sectPr.
      children.push(new Paragraph({ children: [] }));
    } else if (b.type === 'title') {
      children.push(new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, pageBreakBefore, children: runsFor(b.runs, { font: headingFont }) }));
    } else if (b.type === 'author') {
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, pageBreakBefore, children: runsFor(b.runs) }));
    } else if (b.type === 'subtitle') {
      // Word's own "Subtitle" style for the book; chapter subtitles keep with the text that follows.
      children.push(new Paragraph({ ...(b.book ? { style: 'Subtitle' } : {}), alignment: ALIGN[b.align] || AlignmentType.CENTER, keepNext: true, pageBreakBefore, spacing: { after: 240 }, children: runsFor(b.runs, b.book ? { font: headingFont } : {}) }));
    } else if (b.type === 'hr') {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    } else if (/^h\d$/.test(b.type)) {
      children.push(new Paragraph({ heading: H[b.type[1]] || H[3], alignment: ALIGN[b.align], pageBreakBefore, children: withBookmark(b, runsFor(b.runs, { font: headingFont })) }));
    } else if (b.type === 'sep' || b.type === 'space') {
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, pageBreakBefore, children: runsFor(b.runs || []) }));
    } else if (b.type === 'toc') {
      children.push(new Paragraph({ indent: { left: (b.level - 1) * 400 }, pageBreakBefore, children: runsFor(b.runs) }));
    } else {
      const styleIndent = b.style && b.style.indent ? Math.round(b.style.indent * 567) : 0;
      const centered = b.align === 'center' || b.align === 'right';
      const lvl = Math.min(8, Math.max(0, (b.level || 1) - 1));
      children.push(
        new Paragraph({
          children: withBookmark(b, runsFor(b.runs)),
          alignment: ALIGN[b.align],
          pageBreakBefore,
          spacing: after ? { after } : undefined,
          indent:
            b.type === 'blockquote' || styleIndent
              ? { left: styleIndent || 567, right: styleIndent || 567 }
              : b.noIndent || centered || b.type === 'li' || !firstLine
                ? undefined
                : { firstLine },
          bullet: b.type === 'li' && b.list !== 'ol' ? { level: lvl } : undefined,
          numbering: b.type === 'li' && b.list === 'ol' ? { reference: 'ordered', level: lvl, instance: b.listId || 0 } : undefined,
        }),
      );
    }
  }
  const section = { children };
  if (page) {
    const dim = F.pageDimensions(page);
    const m = page.margins || {};
    const tw = (x, d = 1) => Math.round((x ?? d) * 1440);
    const textWidth = tw(dim.widthIn) - tw(m.inner) - tw(m.outer);
    section.properties = {
      page: {
        size: { width: tw(dim.widthIn), height: tw(dim.heightIn) },
        margin: { top: tw(m.top), bottom: tw(m.bottom), left: tw(m.inner), right: tw(m.outer), header: 708, footer: 708, gutter: 0 },
      },
      titlePage: Boolean(page.differentFirstPage),
    };
    const hfPara = (hf) => {
      const part = (s) => {
        const pieces = String(s || '').split('<$p>');
        const runs = [];
        pieces.forEach((p, i) => {
          if (i) runs.push(new TextRun({ children: [PageNumber.CURRENT], size: Math.max(16, t.fontSizePt * 2 - 4) }));
          if (p) runs.push(new TextRun({ text: p, size: Math.max(16, t.fontSizePt * 2 - 4) }));
        });
        return runs;
      };
      return new Paragraph({
        tabStops: [{ type: TabStopType.CENTER, position: Math.round(textWidth / 2) }, { type: TabStopType.RIGHT, position: textWidth }],
        children: [...part(hf.left), new TextRun({ children: [new Tab()] }), ...part(hf.center), new TextRun({ children: [new Tab()] }), ...part(hf.right)],
      });
    };
    const header = headerFooterText(page.header, project, doc.wc);
    const footer = headerFooterText(page.footer, project, doc.wc);
    const has = (x) => Boolean(x.left || x.center || x.right);
    if (has(header)) {
      section.headers = { default: new Header({ children: [hfPara(header)] }) };
      if (page.differentFirstPage) section.headers.first = new Header({ children: [new Paragraph({ children: [] })] });
    }
    if (has(footer)) {
      section.footers = { default: new Footer({ children: [hfPara(footer)] }) };
      if (page.differentFirstPage) section.footers.first = new Footer({ children: [new Paragraph({ children: [] })] });
    }
  }
  const d = new Document({
    numbering: {
      config: [
        {
          reference: 'ordered',
          levels: Array.from({ length: 9 }, (_, l) => ({
            level: l,
            format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN][l % 3],
            text: `%${l + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720 * (l + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    creator: project.author || 'Scribner',
    title: project.title,
    styles: {
      default: { document: { run: { font: t.fontFamily, size: Math.round(t.fontSizePt * 2), language: { value: (o.epub && o.epub.language) || 'ro-RO' } }, paragraph: { spacing: { line: Math.round(240 * (t.lineSpacing || 1.5)) } } } },
      paragraphStyles: [
        { id: 'Subtitle', name: 'Subtitle', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { italics: true, size: Math.round(t.fontSizePt * 2.6) }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 480 } } },
      ],
    },
    comments: comments.length ? { children: comments } : undefined,
    footnotes,
    sections: [section],
  });
  const buf = await Packer.toBuffer(d);
  if (!page || !page.mirrored) return buf;
  // docx has no option for mirrored margins: add <w:mirrorMargins/> to settings.xml.
  const zip = await JSZip.loadAsync(buf);
  const settings = zip.file('word/settings.xml');
  if (settings) {
    const xml = await settings.async('string');
    zip.file('word/settings.xml', insertSetting(xml, 'mirrorMargins'));
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// CT_Settings is an xsd:sequence: a child must be inserted before the first sibling that follows
// it in the schema (Word rejects out-of-order settings as corrupt).
const SETTINGS_ORDER = ['writeProtection', 'view', 'zoom', 'removePersonalInformation', 'removeDateAndTime', 'doNotDisplayPageBoundaries', 'displayBackgroundShape', 'printPostScriptOverText', 'printFractionalCharacterWidth', 'printFormsData', 'embedTrueTypeFonts', 'embedSystemFonts', 'saveSubsetFonts', 'saveFormsData', 'mirrorMargins', 'alignBordersAndEdges', 'bordersDoNotSurroundHeader', 'bordersDoNotSurroundFooter', 'gutterAtTop', 'hideSpellingErrors', 'hideGrammaticalErrors', 'activeWritingStyle', 'proofState', 'formsDesign', 'attachedTemplate', 'linkStyles', 'stylePaneFormatFilter', 'stylePaneSortMethod', 'documentType', 'mailMerge', 'revisionView', 'trackRevisions', 'doNotTrackMoves', 'doNotTrackFormatting', 'documentProtection', 'autoFormatOverride', 'styleLockTheme', 'styleLockQFSet', 'defaultTabStop'];
function insertSetting(xml, name) {
  if (new RegExp(`<w:${name}[\\s/>]`).test(xml)) return xml;
  // The settings that may precede `name` have no child elements, so the first tag not in that
  // list is where `name` belongs.
  const before = SETTINGS_ORDER.slice(0, SETTINGS_ORDER.indexOf(name));
  const re = /<w:([A-Za-z]+)[\s/>]/g;
  re.lastIndex = xml.indexOf('>', xml.indexOf('<w:settings')) + 1;
  let m;
  while ((m = re.exec(xml))) if (!before.includes(m[1])) return `${xml.slice(0, m.index)}<w:${name}/>${xml.slice(m.index)}`;
  return xml.replace('</w:settings>', `<w:${name}/></w:settings>`);
}

// --- EPUB ----------------------------------------------------------------------------

const IMAGE_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/webp': 'webp' };

async function compileEpub(project, readDoc, options = {}) {
  const doc = buildDocument(project, readDoc, options);
  const o = doc.options;
  const meta = { title: project.title, author: project.author || '', language: 'ro', ...Object.fromEntries(Object.entries(o.epub || {}).filter(([, v]) => v !== '' && v != null)) };
  // Split into chapters at sections that start on a new page.
  const chapters = [];
  let cur = null;
  let titlePage = false;
  for (const it of doc.items) {
    if (it.kind === 'titlepage') {
      titlePage = true;
      continue;
    }
    if (it.kind === 'toc') continue; // the EPUB nav is the table of contents
    if (it.kind === 'section' && (it.pageBreak || !cur)) {
      if (!cur || cur.items.some((x) => x.kind === 'section' && (x.title || x.html))) {
        cur = { title: '', items: [] };
        chapters.push(cur);
      }
      if (!cur.title) cur.title = it.title ? it.title.replace(/\n/g, ' ') : '';
      cur.items.push({ ...it, pageBreak: false });
      continue;
    }
    if (!cur) {
      cur = { title: '', items: [] };
      chapters.push(cur);
    }
    cur.items.push(it);
  }
  chapters.forEach((c, i) => {
    if (!c.title) c.title = i === 0 && !c.items.some((x) => x.title) ? project.title : `Capitolul ${i + 1}`;
  });

  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file(
    'META-INF/container.xml',
    '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  );
  const t = o.format.typography;
  const hf = t.headingFont ? `h1,h2,h3{font-family:${fontStack(t.headingFont)}}` : '';
  zip.file(
    'OEBPS/style.css',
    `body{font-family:serif;line-height:1.5}p{text-indent:1.5em;margin:0}h1,h2,h3{text-align:center}${hf}.al{text-align:left}.ar{text-align:right}.sc{font-variant:small-caps}[data-caps="small"]{font-variant:small-caps}[data-caps="all"]{text-transform:uppercase}.ch-prefix{font-size:.8em;font-weight:normal}h1+p,h2+p,h3+p,.sep+p{text-indent:0}.sep{text-align:center;text-indent:0;margin:1em 0}hr{border:none;margin:2em 0}.title-page{text-align:center;margin-top:30%}.author{font-style:italic}.book-subtitle{font-size:1.3em;font-style:italic;text-indent:0}.subtitle{text-align:center;font-style:italic;text-indent:0;margin:-.4em 0 1.6em}.subtitle+p{text-indent:0}p{orphans:2;widows:2;hyphens:auto;-webkit-hyphens:auto;-epub-hyphens:auto}h1,h2,h3{page-break-after:avoid;hyphens:manual}img{page-break-inside:avoid}.cover{text-align:center;margin:0;padding:0}.cover img{max-width:100%;max-height:100%}img{max-width:100%}.notes li{text-indent:0}table{border-collapse:collapse;margin:1em auto}th,td{border:1px solid #888;padding:.2em .5em;vertical-align:top}th p,td p,li p{text-indent:0;margin:0}\n${o.styleCss || ''}`,
  );
  const lang = escAttr(meta.language);
  const xhtml = (title, body, extra = '') =>
    `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}" xml:lang="${lang}"><head><title>${esc(title)}</title><link rel="stylesheet" href="style.css"/>${extra}</head><body>${body}</body></html>`;
  const manifest = [];
  const spine = [];
  // Images: data URIs are invalid in EPUB -> OEBPS/images/imgN.ext
  let imgNo = 0;
  const extractImages = (html) =>
    html.replace(/<img\b[^>]*>/gi, (tag) => {
      const m = /src="data:([\w/+.-]+);base64,([^"]*)"/i.exec(tag);
      if (!m) return tag;
      const [all, mime, b64] = m;
      const ext = IMAGE_EXT[mime.toLowerCase()];
      if (!ext) return tag;
      const data = Buffer.from(b64.replace(/\s+/g, ''), 'base64');
      // A broken/empty data URI would be a corrupt resource (epubcheck PKG-021): keep only the alt text.
      if (!data.length || !imageSize(data, IMAGE_TYPES[mime.toLowerCase()] || ext)) {
        const alt = attr(tag, 'alt');
        return alt ? `[${esc(alt)}]` : '';
      }
      const name = `images/img${++imgNo}.${ext}`;
      zip.file(`OEBPS/${name}`, data);
      manifest.push(`<item id="img${imgNo}" href="${name}" media-type="${mime.toLowerCase() === 'image/jpg' ? 'image/jpeg' : mime.toLowerCase()}"/>`);
      return tag.replace(all, `src="${name}"`);
    });

  if (o.coverImage && o.coverImage.data) {
    const mime = (o.coverImage.mime || 'image/jpeg').toLowerCase();
    const ext = IMAGE_EXT[mime] || 'jpg';
    const data = Buffer.isBuffer(o.coverImage.data) ? o.coverImage.data : Buffer.from(String(o.coverImage.data).replace(/^data:[^,]*,/, ''), 'base64');
    zip.file(`OEBPS/images/cover.${ext}`, data);
    manifest.push(`<item id="cover-image" href="images/cover.${ext}" media-type="${mime === 'image/jpg' ? 'image/jpeg' : mime}" properties="cover-image"/>`);
    zip.file('OEBPS/cover.xhtml', xhtml('Copertă', `<div class="cover"><img src="images/cover.${ext}" alt="${escAttr(meta.title)}"/></div>`));
    manifest.push('<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>');
    spine.push('<itemref idref="cover" linear="yes"/>');
  }
  if (titlePage) {
    zip.file('OEBPS/titlepage.xhtml', xhtml(meta.title, toXhtml(`<div class="title-page">${titlePageHtml({ ...project, title: meta.title, author: meta.author })}</div>`)));
    manifest.push('<item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>');
    spine.push('<itemref idref="titlepage"/>');
  }
  const bodies = chapters.map((c) => {
    const fn = { list: [], prefix: 'fn' };
    const body = itemsHtml(c.items, project, { footnotes: fn, ids: true }) + notesHtml(fn.list);
    return extractImages(body).replace(/<sup><a (?=(?:class="noteref" )?id="(?:fn|en)ref)/g, '<sup><a epub:type="noteref" ');
  });
  // Every id lives in one chapter file: links to an id in another file (book endnotes,
  // internal links between chapters) need that file name.
  // (Footnote ids repeat in every chapter, so an id in the same file always wins.)
  const fileOf = new Map();
  const idsOf = bodies.map((b, i) => {
    const ids = new Set([...b.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const id of ids) if (!fileOf.has(id)) fileOf.set(id, `ch${i + 1}.xhtml`);
    return ids;
  });
  bodies.forEach((b, idx) => {
    const own = `ch${idx + 1}.xhtml`;
    const body = b.replace(/href="#([^"]+)"/g, (all, id) => {
      const f = fileOf.get(id);
      return f && !idsOf[idx].has(id) ? `href="${f}#${id}"` : all;
    });
    zip.file(`OEBPS/${own}`, xhtml(chapters[idx].title, toXhtml(body)));
    manifest.push(`<item id="ch${idx + 1}" href="${own}" media-type="application/xhtml+xml"/>`);
    spine.push(`<itemref idref="ch${idx + 1}"/>`);
  });
  // Navigation document: the same entries as the compiled table of contents (parts, chapters),
  // nested by level; falls back to one entry per chapter file.
  const entries = doc.items.filter((it) => it.kind === 'section' && it.matter === 'body' && it.title && it.level <= 2 && fileOf.has(it.id));
  let navList;
  if (entries.length) {
    const top = [];
    for (const e of entries) {
      const li = { e, kids: [] };
      if (e.level > 1 && top.length && top[top.length - 1].e.level < e.level) top[top.length - 1].kids.push(li);
      else top.push(li);
    }
    const liXml = (x) => `<li><a href="${fileOf.get(x.e.id)}#${x.e.id}">${esc(x.e.title.replace(/\n/g, ' '))}</a>${x.kids.length ? `<ol>${x.kids.map(liXml).join('')}</ol>` : ''}</li>`;
    navList = top.map(liXml).join('');
  } else navList = chapters.map((c, i) => `<li><a href="ch${i + 1}.xhtml">${esc(c.title)}</a></li>`).join('');
  const nav = `<nav epub:type="toc" id="toc"><h1>Cuprins</h1><ol>${navList}</ol></nav>`;
  zip.file('OEBPS/nav.xhtml', xhtml('Cuprins', nav));
  const ident = meta.isbn ? `urn:isbn:${String(meta.isbn).replace(/[^0-9Xx]/g, '')}` : meta.identifier || `urn:uuid:${store.newId()}`;
  const subjects = (Array.isArray(meta.subjects) ? meta.subjects : String(meta.subjects || '').split(/[,;]/))
    .map((x) => String(x).trim())
    .filter(Boolean);
  const md = [
    `<dc:identifier id="uid">${esc(ident)}</dc:identifier>`,
    `<dc:title>${esc(meta.title)}</dc:title>`,
    `<dc:creator>${esc(meta.author)}</dc:creator>`,
    `<dc:language>${esc(meta.language)}</dc:language>`,
    meta.publisher ? `<dc:publisher>${esc(meta.publisher)}</dc:publisher>` : '',
    meta.description ? `<dc:description>${esc(meta.description)}</dc:description>` : '',
    meta.date ? `<dc:date>${esc(meta.date)}</dc:date>` : '',
    meta.rights ? `<dc:rights>${esc(meta.rights)}</dc:rights>` : '',
    ...subjects.map((s) => `<dc:subject>${esc(s)}</dc:subject>`),
    o.coverImage && o.coverImage.data ? '<meta name="cover" content="cover-image"/>' : '',
    `<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>`,
  ].join('');
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="${lang}"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/">${md}</metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/>${manifest.join('')}</manifest><spine>${spine.join('')}</spine></package>`,
  );
  return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' });
}

// XHTML requires self-closed void elements and no HTML-only entities.
function toXhtml(html) {
  return xmlSafe(html)
    .replace(/<(br|hr|img|col|wbr|source)\b([^>]*?)\s*\/?>/gi, '<$1$2/>')
    .replace(/&nbsp;/g, '&#160;');
}

// --- RTF ------------------------------------------------------------------------------

function writerOptions(doc, project) {
  const o = doc.options;
  const t = o.format.typography;
  const page = o.format.legacy ? null : o.format.page;
  const dim = F.pageDimensions(page);
  return {
    title: project.title,
    author: project.author,
    ...t,
    page: page
      ? { ...page, widthIn: dim.widthIn, heightIn: dim.heightIn, header: headerFooterText(page.header, project, doc.wc), footer: headerFooterText(page.footer, project, doc.wc) }
      : null,
  };
}

function compileRtf(project, readDoc, options = {}) {
  const doc = buildDocument(project, readDoc, options);
  return blocksToRtf(blocksFor(doc, project), writerOptions(doc, project));
}

// --- ODT ------------------------------------------------------------------------------

const xmlEsc = (s) => esc(s).replace(/"/g, '&quot;');

async function compileOdt(project, readDoc, options = {}) {
  const doc = buildDocument(project, readDoc, options);
  const w = writerOptions(doc, project);
  const blocks = blocksFor(doc, project);
  const textStyles = new Map();
  const tStyle = (r) => {
    const key = ['b', 'i', 'u', 's', 'sup', 'sub', 'sc', 'caps'].filter((k) => r[k]).join('-');
    if (!key) return null;
    if (!textStyles.has(key)) {
      const p = [];
      if (r.b) p.push('fo:font-weight="bold"');
      if (r.i) p.push('fo:font-style="italic"');
      if (r.u) p.push('style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"');
      if (r.s) p.push('style:text-line-through-style="solid"');
      if (r.sup) p.push('style:text-position="super 58%"');
      if (r.sub) p.push('style:text-position="sub 58%"');
      if (r.sc) p.push('fo:font-variant="small-caps"');
      if (r.caps) p.push('fo:text-transform="uppercase"');
      textStyles.set(key, { name: `T_${key}`, props: p.join(' ') });
    }
    return textStyles.get(key).name;
  };
  let noteNo = 0;
  const pictures = [];
  const imageXml = (im) => {
    const name = `Pictures/img${pictures.length + 1}.${im.ext}`;
    pictures.push({ name, data: im.data, mime: im.mime });
    const inch = (px) => `${(px / 96).toFixed(3)}in`;
    return `<draw:frame draw:name="Imagine${pictures.length}" text:anchor-type="as-char" svg:width="${inch(im.width)}" svg:height="${inch(im.height)}" draw:z-index="0"><draw:image xlink:href="${name}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>${im.alt ? `<svg:desc>${xmlEsc(im.alt)}</svg:desc>` : ''}</draw:frame>`;
  };
  const runsXml = (runs) => {
    let out = '';
    let link = null;
    let linkXml = '';
    const flush = () => {
      if (link !== null) out += `<text:a xlink:type="simple" xlink:href="${xmlEsc(link)}">${linkXml}</text:a>`;
      link = null;
      linkXml = '';
    };
    for (const r of runs || []) {
      const x = runXml(r);
      const href = (r.text !== undefined || r.image) && r.link ? r.link : null;
      if (href !== link) flush();
      if (href) {
        link = href;
        linkXml += x;
      } else out += x;
    }
    flush();
    return out;
  };
  const runXml = (r) => {
        if (r.image) return imageXml(r.image);
        if (r.footnote !== undefined) {
          const n = ++noteNo;
          return `<text:note text:id="ftn${n}" text:note-class="footnote"><text:note-citation>${n}</text:note-citation><text:note-body><text:p text:style-name="Footnote">${xmlEsc(r.footnote)}</text:p></text:note-body></text:note>`;
        }
        if (r.text === undefined) return '';
        if (r.text === '\n') return '<text:line-break/>';
        const txt = xmlEsc(r.text).replace(/\t/g, '<text:tab/>').replace(/ {2,}/g, (m) => ` <text:s text:c="${m.length - 1}"/>`);
        const st = tStyle(r);
        return st ? `<text:span text:style-name="${st}">${txt}</text:span>` : txt;
  };
  const bookmark = (b) => (b.section ? `<text:bookmark text:name="${xmlEsc(b.section)}"/>` : '');
  const pStyle = (b, base) => {
    const parts = [base];
    if (b.align && ['center', 'right', 'justify'].includes(b.align)) parts.push(b.align);
    if (b.noIndent && base === 'Text_body') parts.push('noindent');
    if (b.pageBreakBefore) parts.push('break');
    // "different first page": the first paragraph switches to the header-less First_Page master
    if (firstPage) parts.push('fp');
    firstPage = false;
    return parts.join('_');
  };
  let firstPage = Boolean(w.page && w.page.differentFirstPage);
  const pStyles = new Set();
  let bodyXml = '';
  // Open list levels: [{listId}] — items stay open until the next item at the same or lower level,
  // so a nested <text:list> lives inside its parent <text:list-item> (ODF 1.3 §5.3).
  const open = [];
  const closeTo = (depth) => {
    while (open.length > depth) {
      bodyXml += '</text:list-item></text:list>';
      open.pop();
    }
  };
  let tableNo = 0;
  for (const b of blocks) {
    if (b.type !== 'li') closeTo(0);
    if (b.type === 'hr') {
      bodyXml += '<text:p text:style-name="Text_body_break"/>';
      pStyles.add('Text_body_break');
      continue;
    }
    if (b.type === 'table') {
      const rows = b.rows.filter((r) => r.length);
      const cols = Math.max(1, ...rows.map((r) => r.reduce((n, c) => n + c.colspan, 0)));
      const st = b.pageBreakBefore ? ' table:style-name="Table_break"' : '';
      const rowXml = (r) =>
        `<table:table-row>${r
          .map((c) => {
            const span = c.colspan > 1 ? ` table:number-columns-spanned="${c.colspan}"` : '';
            const cover = c.colspan > 1 ? '<table:covered-table-cell/>'.repeat(c.colspan - 1) : '';
            return `<table:table-cell table:style-name="Cell" office:value-type="string"${span}><text:p text:style-name="Table_contents">${runsXml(c.runs)}</text:p></table:table-cell>${cover}`;
          })
          .join('')}${'<table:table-cell table:style-name="Cell"/>'.repeat(Math.max(0, cols - r.reduce((n, c) => n + c.colspan, 0)))}</table:table-row>`;
      const head = rows.length > 1 && rows[0].every((c) => c.header) ? `<table:table-header-rows>${rowXml(rows[0])}</table:table-header-rows>` : '';
      const restRows = head ? rows.slice(1) : rows;
      bodyXml += `<table:table table:name="Tabel${++tableNo}"${st}><table:table-column table:number-columns-repeated="${cols}"/>${head}${restRows.map(rowXml).join('')}</table:table>`;
      continue;
    }
    if (/^h\d$/.test(b.type) || b.type === 'title') {
      const lvl = b.type === 'title' ? 1 : Number(b.type[1]);
      const st = pStyle(b, b.type === 'title' ? 'Title' : `Heading_${lvl}`);
      pStyles.add(st);
      bodyXml += b.type === 'title' ? `<text:p text:style-name="${st}">${runsXml(b.runs)}</text:p>` : `<text:h text:style-name="${st}" text:outline-level="${lvl}">${bookmark(b)}${runsXml(b.runs)}</text:h>`;
      continue;
    }
    if (b.type === 'li') {
      const ls = b.list === 'ol' ? 'L_ol' : 'L_ul';
      const depth = Math.max(1, b.level || 1);
      // a different list at the top level starts a new list
      if (depth === 1 && open.length && open[0].listId !== b.listId) closeTo(0);
      if (open.length >= depth) {
        closeTo(depth);
        bodyXml += '</text:list-item>';
        open[depth - 1] = { listId: b.listId };
      }
      while (open.length < depth) {
        bodyXml += `<text:list text:style-name="${ls}">`;
        if (open.length < depth - 1) bodyXml += '<text:list-item>';
        open.push({ listId: b.listId });
      }
      bodyXml += `<text:list-item><text:p text:style-name="List_body">${bookmark(b)}${runsXml(b.runs)}</text:p>`;
      continue;
    }
    const base = b.type === 'blockquote' ? 'Quote' : b.type === 'sep' || b.type === 'author' || b.type === 'subtitle' ? 'Center' : 'Text_body';
    const st = pStyle(b, base);
    pStyles.add(st);
    bodyXml += `<text:p text:style-name="${st}">${bookmark(b)}${runsXml(b.runs)}</text:p>`;
  }
  closeTo(0);

  const t = w;
  const indent = `${Number(t.firstLineIndentIn) || 0}in`;
  const lh = `${Math.round((t.lineSpacing || 1.5) * 100)}%`;
  const autoP = [...pStyles]
    .filter((n) => n.includes('_') && /_(center|right|justify|noindent|break|fp)/.test(n))
    .map((n) => {
      const base = n.replace(/_(center|right|justify|noindent|break|fp)/g, '');
      const master = n.endsWith('_fp') ? ' style:master-page-name="First_Page"' : '';
      const props = [];
      const al = (/_(center|right|justify)/.exec(n) || [])[1];
      if (al) props.push(`fo:text-align="${al === 'right' ? 'end' : al}"`);
      if (n.includes('_noindent') || al === 'center' || al === 'right') props.push('fo:text-indent="0in"');
      if (n.includes('_break')) props.push('fo:break-before="page"');
      return `<style:style style:name="${n}" style:family="paragraph" style:parent-style-name="${base}"${master}><style:paragraph-properties ${props.join(' ')}/></style:style>`;
    })
    .join('');
  const tableStyles =
    '<style:style style:name="Cell" style:family="table-cell"><style:table-cell-properties fo:padding="0.04in" fo:border="0.5pt solid #808080"/></style:style>' +
    '<style:style style:name="Table_break" style:family="table"><style:table-properties table:align="margins" fo:break-before="page"/></style:style>';
  const levels = (kind) =>
    [1, 2, 3, 4, 5]
      .map((l) => {
        const props = `<style:list-level-properties text:list-level-position-and-space-mode="label-alignment"><style:list-level-label-alignment text:label-followed-by="listtab" fo:text-indent="-0.25in" fo:margin-left="${(0.5 * l).toFixed(2)}in"/></style:list-level-properties>`;
        return kind === 'ol'
          ? `<text:list-level-style-number text:level="${l}" style:num-format="${['1', 'a', 'i'][(l - 1) % 3]}" style:num-suffix=".">${props}</text:list-level-style-number>`
          : `<text:list-level-style-bullet text:level="${l}" text:bullet-char="${['•', '◦', '▪'][(l - 1) % 3]}">${props}</text:list-level-style-bullet>`;
      })
      .join('');
  const autoT = [...textStyles.values()].map((s) => `<style:style style:name="${s.name}" style:family="text"><style:text-properties ${s.props}/></style:style>`).join('');
  const NS =
    'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.3"';
  const content = `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS}><office:font-face-decls><style:font-face style:name="${xmlEsc(t.fontFamily)}" svg:font-family="'${xmlEsc(t.fontFamily)}'"/></office:font-face-decls><office:automatic-styles>${autoP}${autoT}${tableStyles}<text:list-style style:name="L_ul">${levels('ul')}</text:list-style><text:list-style style:name="L_ol">${levels('ol')}</text:list-style></office:automatic-styles><office:body><office:text>${bodyXml}</office:text></office:body></office:document-content>`;
  const pg = t.page;
  const mg = (pg && pg.margins) || {};
  const pageLayout = pg
    ? `<style:page-layout style:name="PL"${pg.mirrored ? ' style:page-usage="mirrored"' : ''}><style:page-layout-properties fo:page-width="${pg.widthIn}in" fo:page-height="${pg.heightIn}in" fo:margin-top="${mg.top ?? 1}in" fo:margin-bottom="${mg.bottom ?? 1}in" fo:margin-left="${mg.inner ?? 1}in" fo:margin-right="${mg.outer ?? 1}in"/></style:page-layout>`
    : '<style:page-layout style:name="PL"><style:page-layout-properties fo:page-width="8.27in" fo:page-height="11.69in" fo:margin-top="1in" fo:margin-bottom="1in" fo:margin-left="1in" fo:margin-right="1in"/></style:page-layout>';
  const hfXml = (tag, hf) => {
    if (!pg || !hf || !(hf.left || hf.center || hf.right)) return '';
    const part = (s) => xmlEsc(s || '').replace(/&lt;\$p&gt;/g, '<text:page-number text:select-page="current">1</text:page-number>');
    return `<style:${tag}><text:p text:style-name="Header_footer">${part(hf.left)}<text:tab/>${part(hf.center)}<text:tab/>${part(hf.right)}</text:p></style:${tag}>`;
  };
  const hdr = pg ? hfXml('header', pg.header) + hfXml('footer', pg.footer) : '';
  const ps = (name, props, text = '', parent = 'Standard', extra = '') =>
    `<style:style style:name="${name}" style:family="paragraph" style:parent-style-name="${parent}"${extra}><style:paragraph-properties ${props}/>${text ? `<style:text-properties ${text}/>` : ''}</style:style>`;
  const hfont = t.headingFont || t.fontFamily;
  const styles = `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NS}><office:font-face-decls><style:font-face style:name="${xmlEsc(t.fontFamily)}" svg:font-family="'${xmlEsc(t.fontFamily)}'"/><style:font-face style:name="${xmlEsc(hfont)}" svg:font-family="'${xmlEsc(hfont)}'"/></office:font-face-decls><office:styles><style:default-style style:family="paragraph"><style:text-properties style:font-name="${xmlEsc(t.fontFamily)}" fo:font-size="${t.fontSizePt}pt" fo:language="ro" fo:country="RO"/></style:default-style>${ps('Standard', `fo:line-height="${lh}"`)}${ps('Text_body', `fo:text-indent="${indent}" fo:margin-top="0in" fo:margin-bottom="${Number(t.paragraphSpacingPt) || 0}pt"`)}${ps('List_body', 'fo:margin-bottom="0in"')}${ps('Table_contents', 'fo:line-height="100%" fo:margin-bottom="0in"')}${ps('Quote', 'fo:margin-left="0.5in" fo:margin-right="0.5in"')}${ps('Center', 'fo:text-align="center" fo:margin-top="0.15in" fo:margin-bottom="0.15in"')}${ps('Footnote', 'fo:line-height="100%"', `fo:font-size="${Math.max(8, t.fontSizePt - 2)}pt"`)}${ps('Header_footer', 'fo:line-height="100%"', `fo:font-size="${Math.max(8, t.fontSizePt - 2)}pt"`)}${ps('Title', 'fo:text-align="center" fo:margin-top="2in" fo:margin-bottom="0.3in"', `style:font-name="${xmlEsc(hfont)}" fo:font-size="${t.fontSizePt + 12}pt" fo:font-weight="bold"`)}${[1, 2, 3]
    .map((l) => ps(`Heading_${l}`, `fo:margin-top="${l === 1 ? 0.6 : 0.3}in" fo:margin-bottom="0.2in" fo:keep-with-next="always"${l === 1 ? ' fo:text-align="center"' : ''}`, `style:font-name="${xmlEsc(hfont)}" fo:font-size="${t.fontSizePt + (l === 1 ? 6 : l === 2 ? 3 : 1)}pt" fo:font-weight="bold"`, 'Standard', ` style:default-outline-level="${l}"`))
    .join('')}</office:styles><office:automatic-styles>${pageLayout}</office:automatic-styles><office:master-styles><style:master-page style:name="Standard" style:page-layout-name="PL">${hdr}</style:master-page>${pg && pg.differentFirstPage ? '<style:master-page style:name="First_Page" style:page-layout-name="PL" style:next-style-name="Standard"/>' : ''}</office:master-styles></office:document-styles>`;
  const metaXml = `<?xml version="1.0" encoding="UTF-8"?><office:document-meta ${NS}><office:meta><dc:title>${xmlEsc(project.title)}</dc:title><meta:initial-creator>${xmlEsc(project.author || '')}</meta:initial-creator><dc:language>ro-RO</dc:language><meta:generator>Scribner</meta:generator></office:meta></office:document-meta>`;
  const zip = new JSZip();
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });
  zip.file('content.xml', content);
  zip.file('styles.xml', styles);
  zip.file('meta.xml', metaXml);
  zip.file(
    'META-INF/manifest.xml',
    `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>${pictures.map((p) => `<manifest:file-entry manifest:full-path="${p.name}" manifest:media-type="${p.mime}"/>`).join('')}</manifest:manifest>`,
  );
  for (const p of pictures) zip.file(p.name, p.data);
  return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/vnd.oasis.opendocument.text', compression: 'DEFLATE' });
}

// --- Markdown / MultiMarkdown / plain text ----------------------------------------------

function mdEscape(s) {
  // `<` would open raw HTML / autolinks and `&name;` would be read as an entity
  return String(s).replace(/([\\`*_[\]#<])/g, '\\$1').replace(/&(?=#?\w+;)/g, '\\&').replace(/^(\s*)([-+>]|\d+\.)(\s)/, '$1\\$2$3');
}

// Markdown destination: spaces and parentheses are escaped so the URL stays one token.
const mdUrl = (u) => String(u).replace(/[ ()<>]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

function mdRuns(runs, notes) {
  let out = '';
  let link = null;
  let inner = '';
  const flush = () => {
    // internal anchors (#sec-N) have no portable Markdown target: keep the text
    if (link !== null) out += link.startsWith('#') ? inner : `[${inner}](${mdUrl(link)})`;
    link = null;
    inner = '';
  };
  for (const r of runs || []) {
    const href = (r.text !== undefined || r.image) && r.link && r.text !== '\n' ? r.link : null;
    if (href !== link) flush();
    if (href) {
      link = href;
      inner += mdRuns([{ ...r, link: undefined }], notes);
      continue;
    }
    if (r.image) {
      out += `![${mdEscape(r.image.alt || '')}](data:${r.image.mime};base64,${Buffer.from(r.image.data).toString('base64')})`;
      continue;
    }
    if (r.footnote !== undefined) {
      notes.push(r.footnote);
      out += `[^${notes.length}]`;
      continue;
    }
    if (r.text === undefined) continue;
    if (r.text === '\n') {
      out += '  \n';
      continue;
    }
    let t = mdEscape(r.text);
    const lead = (/^\s*/.exec(t) || [''])[0];
    const trail = (/\s*$/.exec(t) || [''])[0];
    let core = t.trim();
    if (!core) {
      out += t;
      continue;
    }
    if (r.s) core = `~~${core}~~`;
    if (r.i) core = `*${core}*`;
    if (r.b) core = `**${core}**`;
    if (r.sup) core = `^${core}^`;
    out += lead + core + trail;
  }
  flush();
  return out;
}

// Pipe table (GFM / MultiMarkdown / Pandoc). The first row is the header row.
function mdTable(b, cellText) {
  const rows = b.rows.filter((r) => r.length).map((r) => r.flatMap((c) => [cellText(c.runs).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim(), ...Array(c.colspan - 1).fill('')]));
  if (!rows.length) return '';
  const cols = Math.max(...rows.map((r) => r.length));
  const line = (r) => `| ${Array.from({ length: cols }, (_, i) => r[i] || '').join(' | ')} |`;
  return [line(rows[0]), `|${' --- |'.repeat(cols)}`, ...rows.slice(1).map(line)].join('\n');
}

function compileMarkdown(project, readDoc, options = {}, multi = false) {
  const doc = buildDocument(project, readDoc, options);
  const blocks = blocksFor(doc, project);
  const notes = [];
  const parts = [];
  if (multi) {
    const meta = [`Title: ${project.title || ''}`];
    if (project.author) meta.push(`Author: ${project.author}`);
    meta.push(`Language: ${(doc.options.epub && doc.options.epub.language) || 'ro'}`);
    parts.push(meta.join('\n'));
  }
  for (const b of blocks) {
    const text = mdRuns(b.runs, notes);
    if (b.type === 'title') parts.push(`# ${text}`);
    else if (b.type === 'author' || b.type === 'subtitle') parts.push(`*${plainRuns(b.runs)}*`);
    else if (/^h\d$/.test(b.type)) parts.push(`${'#'.repeat(Number(b.type[1]) + (doc.items[0] && doc.items[0].kind === 'titlepage' ? 1 : 0))} ${text.replace(/ {2}\n/g, ': ')}`);
    else if (b.type === 'hr') parts.push('---');
    else if (b.type === 'sep') parts.push(multi ? `<p align="center">${esc(plainRuns(b.runs))}</p>` : mdEscape(plainRuns(b.runs)));
    else if (b.type === 'space') parts.push('&#160;');
    else if (b.type === 'li') {
      const depth = Math.max(1, b.level || 1);
      const item = `${'    '.repeat(depth - 1)}${b.list === 'ol' ? `${b.index || 1}.` : '-'} ${text.replace(/ {2}\n/g, `  \n${'    '.repeat(depth)}`)}`;
      const prev = parts[parts.length - 1];
      // a new top-level list (e.g. bullets followed by numbers) starts a separate block
      if (prev && prev.__list && !(depth === 1 && prev.__top !== b.listId)) {
        parts[parts.length - 1] = Object.assign(new String(`${prev}\n${item}`), { __list: true, __top: prev.__top });
      } else parts.push(Object.assign(new String(item), { __list: true, __top: depth === 1 ? b.listId : null }));
    } else if (b.type === 'table') parts.push(mdTable(b, (runs) => mdRuns(runs, notes))); else if (b.type === 'blockquote') parts.push(`> ${text}`);
    else if (b.type === 'toc') parts.push(`${'  '.repeat(b.level - 1)}- ${text}`);
    else if (text.trim()) parts.push(text);
  }
  let out = parts.map(String).join('\n\n');
  if (notes.length) out += `\n\n${notes.map((n, i) => `[^${i + 1}]: ${n}`).join('\n')}`;
  return `${out}\n`;
}

function compileText(project, readDoc, options = {}) {
  const doc = buildDocument(project, readDoc, options);
  const blocks = blocksFor(doc, project);
  const notes = [];
  const parts = [];
  for (const b of blocks) {
    if (b.type === 'hr') continue;
    const plain = (runs) =>
      (runs || [])
        .map((r) => {
          if (r.footnote !== undefined) {
            notes.push(r.footnote);
            return `[${notes.length}]`;
          }
          if (r.image) return `[${r.image.alt || 'imagine'}]`;
          return r.text || '';
        })
        .join('');
    if (b.type === 'table') {
      parts.push(b.rows.filter((r) => r.length).map((r) => r.map((c) => plain(c.runs).replace(/\s*\n\s*/g, ' ')).join('\t')).join('\n'));
      continue;
    }
    const text = plain(b.runs);
    if (b.type === 'li') parts.push(`${'  '.repeat(Math.max(1, b.level || 1) - 1)}${b.list === 'ol' ? `${b.index || 1}.` : '•'} ${text}`);
    else if (b.type === 'toc') parts.push(`${'  '.repeat(b.level - 1)}${text}`);
    else if (b.type === 'space') parts.push('');
    else if (text.trim()) parts.push(text);
  }
  let out = parts.join('\n\n');
  if (notes.length) out += `\n\n${'_'.repeat(10)}\n${notes.map((n, i) => `[${i + 1}] ${n}`).join('\n')}`;
  return `${out}\n`;
}

// --- scripts / LaTeX --------------------------------------------------------------------

function compiledSections(project, readDoc, options) {
  const doc = buildDocument(project, readDoc, options);
  return doc.items.filter((it) => it.kind === 'section').map((it) => ({ title: it.title.replace(/\n/g, ' '), level: it.level, html: it.html }));
}

// Script outputs: section titles become Fountain sections (# Title) / FDX General paragraphs.
function compileScript(project, readDoc, format, options = {}) {
  const se = require('./scriptExport.cjs');
  const html = compiledSections(project, readDoc, options)
    .map((s) => `${s.title ? `<p data-script="section">${esc(s.title)}</p>` : ''}${s.html}`)
    .join('');
  const meta = { title: project.title || '' };
  return format === 'fdx' ? se.htmlToFdx(html, meta) : se.htmlToFountain(html, meta);
}

function compileLatex(project, readDoc, options = {}) {
  const adv = require('./advancedExport.cjs');
  const meta = { title: project.title || '', author: project.author || '', date: new Date().toISOString().slice(0, 10), lang: project.lang || 'ro' };
  return adv.toLatex(compiledSections(project, readDoc, options), meta, { documentClass: options.documentClass || 'book', titles: true });
}

// --- one entry point -------------------------------------------------------------------

/**
 * Compiles to any output format. Returns Buffer (docx, epub, odt, pdf via renderPdf) or string.
 * For 'pdf' without opts.renderPdf / hooks.renderPdf, returns the print HTML (string).
 * hooks.renderPdf(html, pdfOptions) -> Promise<Buffer> is supplied by the Electron main process.
 */
async function compile(project, readDoc, format, opts = {}, hooks = {}) {
  switch (format) {
    case 'docx':
      return compileDocx(project, readDoc, opts);
    case 'epub':
      return compileEpub(project, readDoc, opts);
    case 'html':
      return compileHtml(project, readDoc, opts);
    case 'rtf':
      return compileRtf(project, readDoc, opts);
    case 'odt':
      return compileOdt(project, readDoc, opts);
    case 'md':
    case 'markdown':
      return compileMarkdown(project, readDoc, opts, false);
    case 'mmd':
    case 'multimarkdown':
      return compileMarkdown(project, readDoc, opts, true);
    case 'txt':
    case 'text':
      return compileText(project, readDoc, opts);
    case 'fountain':
    case 'fdx':
      return compileScript(project, readDoc, format, opts);
    case 'tex':
    case 'latex':
      return compileLatex(project, readDoc, opts);
    case 'print':
      return compileHtml(project, readDoc, { ...opts, target: 'pdf' });
    case 'pdf': {
      const html = compileHtml(project, readDoc, { ...opts, target: 'pdf' });
      const render = hooks.renderPdf || opts.renderPdf;
      return render ? render(html, pdfOptions(opts, project)) : html;
    }
    default:
      throw new Error(`Format necunoscut: ${format}`);
  }
}

module.exports = {
  linkedNotesInline,
  DEFAULT_OPTIONS,
  OUTPUT_FORMATS,
  PRESETS: F.PRESETS,
  collectSections,
  compileHtml,
  compileDocx,
  compileScript,
  compileLatex,
  resolveImagePlaceholders,
  collectionFilter,
  compileEpub,
  compileRtf,
  compileOdt,
  compileMarkdown,
  compileText,
  compile,
  previewHtml,
  pdfOptions,
  parseBlocks,
  processNotes,
  buildDocument,
  resolveOptions,
  resolveSectionType,
  replacePlaceholders,
  applyReplacements,
  mapText,
  smartQuotes,
  romanianWords,
  toRoman,
  formatNumber,
};
