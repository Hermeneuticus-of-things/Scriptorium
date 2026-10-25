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
  // A partly bold/italic anchor is saved as several sibling spans with the same note:
  // the note follows only the last of them, so it compiles once.
  // data-linked marks it, so Compile can treat linked notes differently from inline ones.
  const SPAN = /<span([^>]*?)data-linked-footnote="([^"]*)"([^>]*)>([\s\S]*?)<\/span>/g;
  return String(html).replace(SPAN, (_m, _a, note, _b, anchor, offset, all) => {
    const rest = all.slice(offset + _m.length).replace(/^(?:<\/?(?:strong|em|b|i|u|s|sub|sup|mark|span)(?:\s[^>]*)?>)*?(?=<span[^>]*data-linked-footnote=)/, '');
    const next = /^<span[^>]*?data-linked-footnote="([^"]*)"/.exec(rest);
    return next && next[1] === note ? anchor : `${anchor}<span data-footnote="${note}" data-linked="1" class="footnote"></span>`;
  });
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

// Footnote/endnote number formats (Compile > Notes): 1,2,3 · i,ii,iii · a,b,c · *,†,‡,§…
const NOTE_FORMATS = ['arabic', 'roman', 'alpha', 'symbols'];
// Same sequences as Word's chicago / lowerLetter, so DOCX, PDF, HTML and EPUB number alike.
const NOTE_SYMBOLS = ['*', '†', '‡', '§'];
/** Label of note number n (1-based) in a format; symbols double after the fourth (**, ††…), letters after z (aa, bb…). */
function noteLabel(n, format = 'arabic') {
  n = Math.max(1, Math.floor(Number(n) || 1));
  if (format === 'roman') return toRoman(n).toLowerCase();
  if (format === 'alpha') {
    return String.fromCharCode(97 + ((n - 1) % 26)).repeat(Math.floor((n - 1) / 26) + 1);
  }
  if (format === 'symbols') return NOTE_SYMBOLS[(n - 1) % NOTE_SYMBOLS.length].repeat(Math.floor((n - 1) / NOTE_SYMBOLS.length) + 1);
  return String(n);
}
// Footnote accumulator for itemsHtml: number format and restart per chapter from the transforms.
function footnoteState(o) {
  const t = (o && o.transforms) || {};
  const format = NOTE_FORMATS.includes(t.noteNumbering) ? t.noteNumbering : 'arabic';
  const restart = Boolean(t.noteRestart);
  return { list: [], prefix: 'fn', format, restart, base: 0, labels: format !== 'arabic' || restart ? [] : null };
}
// Word w:numFmt for each format (Chicago = *, †, ‡, §).
const NOTE_DOCX_FMT = { arabic: 'decimal', roman: 'lowerRoman', alpha: 'lowerLetter', symbols: 'chicago' };

// Replaces footnote markers with numbered references and strips comment marks
// (keeping the commented text). Returns the new html and the collected notes.
// label(n) gives the shown mark of note n (ids keep the running number n).
function processNotes(html, startAt = 1, prefix = 'fn', label = String) {
  const notes = [];
  let out = (html || '').replace(/<span[^>]*data-footnote="[^"]*"[^>]*>[\s\S]*?<\/span>/g, (tag) => {
    const n = startAt + notes.length;
    notes.push(attr(tag, 'data-footnote'));
    return `<sup><a id="${prefix}ref${n}" href="#${prefix}${n}">${esc(label(n))}</a></sup>`;
  });
  out = out.replace(/<span[^>]*data-comment="[^"]*"[^>]*>([\s\S]*?)<\/span>/g, '$1');
  // Revision colors are an editing aid, not part of the book.
  out = out.replace(/<span[^>]*data-revision="[^"]*"[^>]*>([\s\S]*?)<\/span>/g, '$1');
  // Inline annotations and unrenderable images never reach the compiled book.
  out = out.replace(/<span[^>]*data-(?:annotation|unsupported-image)="[^"]*"[^>]*>[\s\S]*?<\/span>/g, '');
  return { html: out, notes };
}

function notesHtml(notes, startAt = 1, prefix = 'fn', labels = null, title = 'Note') {
  if (!notes.length) return '';
  const head = title ? `<h3>${escapeHtml(title)}</h3>` : '';
  if (labels) {
    return `<section class="notes">${head}<ol class="note-labels">${notes
      .map((t, i) => `<li id="${prefix}${startAt + i}"><span class="note-label">${esc(labels[i])}</span> ${escapeHtml(t)} <a href="#${prefix}ref${startAt + i}">↩</a></li>`)
      .join('')}</ol></section>`;
  }
  return `<section class="notes">${head}<ol start="${startAt}">${notes
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
  // Every accepted type has a readable header: without one the data is corrupt and embedding it
  // would show a broken picture in Word/LibreOffice (the caller keeps the alt text instead).
  let size = imageSize(data, ext);
  if (!size || !size.width || !size.height) return null;
  if (size.width > maxWidthPx) size = { width: maxWidthPx, height: Math.max(1, Math.round((size.height * maxWidthPx) / size.width)) };
  if (size.height > maxHeightPx) size = { width: Math.max(1, Math.round((size.width * maxHeightPx) / size.height)), height: Math.round(maxHeightPx) };
  return { mime, ext, data, alt, width: size.width, height: size.height };
}

// Characters that are not allowed in XML 1.0 (and break DOCX/ODT/EPUB/FDX consumers).
// eslint-disable-next-line no-control-regex
// Lone surrogates (half an emoji cut by a copy/paste or a truncated title) are invalid too.
const XML_INVALID = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const xmlSafe = (s) => String(s).replace(XML_INVALID, '');

// --- tiny HTML parser for TipTap output -> block list with inline runs ---
// styles: named style definitions ({id, type, bold, italic, align, …}).
// Blocks: {type: p|h1-3|li|blockquote|hr|table, runs, align, style, list, level, index, listId}
//   li: level = nesting depth (1 = top), index = number within its <ol>, listId = list instance
//   table: rows: [[{header, runs}]]
// Runs: {text, b, i, u, s, sup, sub, sc, caps, link} | {footnote} | {image} | {commentStart} | {commentEnd}
// Ruler attributes written by the editor (src/editor/formatting.js): data-* hold the exact cm values.
function rulerFormat(attrs) {
  const n = (k) => {
    const v = (new RegExp(`data-${k}="(-?\\d*\\.?\\d+)"`).exec(attrs) || [])[1];
    return v === undefined ? null : Number(v);
  };
  // Tab stops: "3,6.5c,8r,10d" → [{pos, type}] (legacy "3,6.5" = left stops).
  const TYPES = { l: 'left', c: 'center', r: 'right', d: 'decimal' };
  const tabs = ((/data-tabs="([^"]*)"/.exec(attrs) || [])[1] || '')
    .split(',')
    .map((x) => /^\s*(\d*\.?\d+)\s*([lcrd])?\s*$/i.exec(x))
    .filter((m) => m && Number(m[1]) > 0)
    .map((m) => ({ pos: Number(m[1]), type: TYPES[(m[2] || 'l').toLowerCase()] }));
  const out = { left: n('indent-left'), right: n('indent-right'), first: n('first-indent'), tabs: tabs.length ? tabs : null };
  return Object.values(out).some((v) => v !== null) ? out : null;
}

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
  // Preserve Formatting blocks (<div data-preserve-format>): their paragraphs are marked
  // `preserve` and keep their own font, size and indents in Compile.
  const divs = []; // stack of booleans: true = preserve-format div
  const preserving = () => divs.includes(true);
  const startBlock = (type, attrs = '') => {
    const align = (/text-align:\s*(left|center|right|justify)/.exec(attrs) || [])[1] || null;
    const style = byId[(/data-style="([^"]*)"/.exec(attrs) || [])[1]] || null;
    const top = lists[lists.length - 1];
    current = { type, runs: [], align: align || (style && style.align) || null, style, list: top ? top.tag : null };
    if (preserving()) current.preserve = true;
    const para = rulerFormat(attrs);
    if (para) current.para = para;
    if (type === 'li' && top) {
      current.level = lists.length;
      current.listId = top.id;
      if (top.tag === 'ol') {
        current.index = ++top.n;
        // <ol start="5">: the first number of the outermost list (DOCX numbering starts there)
        const outer = lists.find((l) => l.tag === 'ol');
        if (outer && outer.start > 1) current.listStart = outer.start;
      }
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
  // Quoted attribute values may hold a raw ">" (data-footnote="x > y", alt text): skip over them,
  // or the tag ends early, the note is lost and the rest of the attribute leaks into the text.
  const re = /<(\/?)([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const closing = m[1] === '/';
    const tag = m[2] && m[2].toLowerCase();
    if (tag === 'span') {
      if (closing) {
        const sp = spans.pop();
        if (sp && sp.comment && (current || cell)) target().runs.push({ commentEnd: true, commentText: sp.commentText });
        continue;
      }
      if (options.comments && /data-comment=/.test(m[3]) && !skipping()) {
        const text = xmlSafe(attr(`<span${m[3]}>`, 'data-comment') || '');
        const runs = target().runs;
        const last = runs[runs.length - 1];
        // The same comment split around a bold/italic word: continue it instead of a duplicate.
        if (last && last.commentEnd && last.commentText === text) runs.pop();
        else runs.push({ commentStart: text });
        spans.push({ skip: false, comment: true, commentText: text });
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
      const sp = { skip: false, style: byId[(/data-char-style="([^"]*)"/.exec(m[3]) || [])[1]] || null, caps: (/data-caps="(small|all)"/.exec(m[3]) || [])[1] || null };
      if (preserving()) {
        const font = (/font-family:\s*([^;"]+)/.exec(m[3]) || [])[1];
        const size = (/font-size:\s*(\d+(?:\.\d+)?)(pt|px)/.exec(m[3]) || []);
        if (font) sp.font = font.split(',')[0].trim().replace(/^['"]|['"]$/g, '').replace(/&quot;/g, '');
        if (size[1]) sp.sizePt = size[2] === 'px' ? Math.round(Number(size[1]) * 0.75 * 2) / 2 : Number(size[1]);
      }
      spans.push(sp);
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
      const font = spans.reduce((acc, sp) => sp.font || acc, null);
      const sizePt = spans.reduce((acc, sp) => sp.sizePt || acc, null);
      into.runs.push({
        ...(font ? { font } : {}),
        ...(sizePt ? { sizePt } : {}),
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
    if (tag === 'div') {
      if (closing) {
        if (divs.pop()) current = null;
      } else {
        const pf = /data-preserve-format/.test(m[3]);
        divs.push(pf);
        if (pf) current = null;
      }
      continue;
    }
    if (tag === 'a') {
      if (closing) links.pop();
      else {
        const href = attr(`<a${m[3]}>`, 'href');
        links.push(href && /^(https?:|mailto:|#)/i.test(href) ? xmlSafe(href) : null);
      }
      continue;
    }
    if (tag === 'img' && !closing) {
      const src = attr(`<img${m[3]}>`, 'src') || '';
      const alt = xmlSafe(attr(`<img${m[3]}>`, 'alt') || '');
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
      else {
        const start = Number((/start="(\d+)"/.exec(m[3]) || [])[1] || 1);
        lists.push({ tag, id: ++listNo, start, n: Math.max(0, start - 1) });
      }
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

// Every escaped string also drops XML-invalid characters: project title/author, link targets and
// other metadata reach document.xml, core.xml, content.opf and meta.xml through here.
const esc = (s) => escapeHtml(s == null ? '' : xmlSafe(s));
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');

// --- numbers and placeholders (lib/placeholders.cjs) -------------------------------------

const PH = require('./placeholders.cjs');
const L = require('./compileLayouts.cjs');
const { toRoman, romanianWords, formatNumber, replacePlaceholders } = PH;

// --- text-only transformations -------------------------------------------------

// Applies fn to every text node of the HTML (decoded), never to tags/attributes.
// Footnote text (data-footnote attribute) is transformed too, as it is text.
function mapText(html, fn) {
  const state = { last: '' };
  const divs = []; // Preserve Formatting blocks keep their text verbatim (no replacements, quotes, dashes)
  // A tag ends at the first ">" outside quoted values (alt="a > b" stays one tag).
  const parts = String(html || '').split(/(<(?:[^>"']|"[^"]*"|'[^']*')*>)/);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (i % 2 === 1) {
      if (/^<div\b/i.test(part)) divs.push(/data-preserve-format/.test(part));
      else if (/^<\/div>/i.test(part)) divs.pop();
      if (part.indexOf('data-footnote="') >= 0) {
        parts[i] = part.replace(/data-footnote="([^"]*)"/, (_, v) => `data-footnote="${escAttr(fn(decodeEntities(v), { last: '' }))}"`);
      }
      if (/^<(p|h\d|li|blockquote|br|div|td|th)\b/i.test(part)) state.last = '';
      continue;
    }
    const text = divs.includes(true) ? decodeEntities(part) : fn(decodeEntities(part), state);
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
        let re;
        try {
          re = new RegExp(src, `gu${r.caseSensitive ? '' : 'i'}`);
        } catch {
          re = new RegExp(src, `g${r.caseSensitive ? '' : 'i'}`); // \- and \_ are fine without the u flag
        }
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
function smartQuotes(text, prev = '', lang = 'ro') {
  let out = '';
  let before = prev;
  const [open, close] = isEnglish(lang) ? ['“', '”'] : ['„', '”'];
  for (const ch of text) {
    if (ch === '"') out += !before || /[\s([{\-–—„“«]/.test(before) ? open : close;
    else out += ch;
    before = ch;
  }
  return out;
}

function dashes(text) {
  return text.replace(/---/g, '—').replace(/--/g, '—');
}

// Markup-level transformations (before text transformations).
// Spans whose opening tag matches `attr`: 'drop' removes them with their text, 'unwrap' keeps the
// text. Nested spans (a coloured word inside a note) are matched to the right closing tag.
function spansWhere(html, attr, mode) {
  const re = /<span\b[^>]*>|<\/span>/g;
  let out = '';
  let last = 0;
  const stack = []; // per open span: { hit, start (index in out for drop) }
  let dropDepth = 0;
  let m;
  while ((m = re.exec(html))) {
    const text = html.slice(last, m.index);
    if (!dropDepth) out += text;
    last = re.lastIndex;
    if (m[0] !== '</span>') {
      const hit = attr.test(m[0]);
      stack.push(hit);
      if (dropDepth || (hit && mode === 'drop')) dropDepth++;
      else if (!hit) out += m[0];
    } else {
      const hit = stack.pop();
      if (dropDepth) dropDepth--;
      else if (!hit) out += m[0];
    }
  }
  if (!dropDepth) out += html.slice(last);
  return out;
}

function cleanMarkup(html, tr) {
  let out = String(html || '');
  // Inline annotations and unrenderable images never reach the compiled book.
  out = spansWhere(out, /data-(?:annotation|unsupported-image)="/, 'drop');
  out = spansWhere(out, /data-revision="/, 'unwrap');
  if (tr.linksToText) out = out.replace(/<a\b[^>]*href="scribner:\/\/[^"]*"[^>]*>([\s\S]*?)<\/a>/g, '$1');
  if (tr.removeHighlights) {
    out = out.replace(/<\/?mark\b[^>]*>/g, '');
    out = out.replace(/(style="[^"]*?)background(?:-color)?:\s*[^;"]+;?\s*/g, '$1');
  }
  if (tr.removeColors) out = out.replace(/(style="[^"]*?)(?<![-\w])color:\s*[^;"]+;?\s*/g, '$1');
  // Comments as footnotes or as bracketed text (Compile > Notes and comments).
  out = L.commentsTo(out, tr.comments);
  if (tr.comments !== 'export') out = spansWhere(out, /data-comment="/, 'unwrap');
  out = L.markupOptions(out, tr);
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
// depth: 1 = directly under the Draft; the project's per-level table (Project Settings > Section
// types: levels 1–4 × folder / document with subdocuments / text) wins over the "all levels" rule.
function resolveSectionType(project, node, format, depth = 0) {
  const manual = sectionTypeTitle(project, node.sectionType);
  if (manual) return manual;
  const role = structuralRole(node);
  const levels = project.sectionTypeLevels || {};
  const levelKey = { folder: 'folders', container: 'containers', file: 'files' }[role];
  const row = depth > 0 && Array.isArray(project.sectionTypeDepths) ? project.sectionTypeDepths[depth - 1] : null;
  const byDepth = row && typeof row[levelKey] === 'string' ? sectionTypeTitle(project, row[levelKey]) : null;
  if (byDepth) return byDepth;
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
  // Compile-window choices that refine the format's pages: roman front matter, flow (widows…).
  if (typeof merged.frontRoman === 'boolean' && format.page) format = { ...format, page: { ...format.page, frontRoman: merged.frontRoman } };
  const pick = (k) => (merged[k] === undefined || merged[k] === null ? format[k] : merged[k]);
  // Front/back matter chosen per output (e.g. a different front matter for PDF and EPUB):
  // {pdf: folderId, epub: '-'}; '-' means none for that output, missing means the general choice.
  const out = merged.output === 'print' ? 'pdf' : merged.output;
  const perOutput = (map, general) => {
    const v = map && out ? map[out] : undefined;
    if (v === '-') return null;
    return v || general || null;
  };
  return {
    ...merged,
    frontMatterId: perOutput(merged.frontMatterByOutput, merged.frontMatterId),
    backMatterId: perOutput(merged.backMatterByOutput, merged.backMatterId),
    tocSettings: F.tocSettings({ tocSettings: { ...(format.tocSettings || {}), ...(merged.tocSettings || {}) } }),
    flow: F.flowSettings({ flow: { ...(format.flow || {}), ...(merged.flow || {}) } }),
    format,
    titlePage: pick('titlePage'),
    toc: pick('toc'),
    transforms: { ...format.transforms, ...(options.transforms || {}) },
    // Compile > Styles: a style can be redefined or removed for the output only.
    styles: L.stylesForCompile(merged.allStyles || merged.styles || [], format.styleOverrides),
    allStyles: merged.allStyles || merged.styles || [],
    styleCss: [merged.styleCss || '', L.styleOverrideCss(merged.styles || [], format.styleOverrides)].filter(Boolean).join('\n'),
    // Project language (Project Settings > Properties): EPUB/HTML/Word language, number words, quotes.
    language: languageOf(project, merged),
    epub: epubMeta(project, { ...(pc.epub || {}), ...(options.epub || {}) }),
  };
}

function languageOf(project, o = {}) {
  return String((o.epub && o.epub.language) || (project && project.language) || 'ro').trim() || 'ro';
}

// E-book / document metadata: what the compile window says, else the project's publishing details
// (Project Settings > Properties: publisher, ISBN, rights, language).
function epubMeta(project, epub) {
  const p = project || {};
  const out = { ...epub };
  const fill = (k, v) => {
    if ((out[k] === undefined || out[k] === '') && v) out[k] = v;
  };
  fill('language', p.language);
  fill('publisher', p.publisher);
  fill('isbn', p.isbn);
  fill('rights', p.rights || (p.author ? `© ${new Date().getFullYear()} ${p.author}` : ''));
  fill('series', p.series);
  fill('seriesNumber', p.seriesNumber);
  return out;
}

const isEnglish = (lang) => /^en\b/i.test(String(lang || ''));
// Word language tag (ro → ro-RO, en → en-US, fr → fr-FR).
function wordLanguage(lang) {
  const l = String(lang || 'ro');
  if (/-/.test(l)) return l;
  return { ro: 'ro-RO', en: 'en-US', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', es: 'es-ES', hu: 'hu-HU' }[l.toLowerCase()] || l;
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
  const keywords = (o.keywords || []).filter(Boolean);
  const hasFilter = labels.length || statuses.length || inCollection || keywords.length;
  const matches = (n) =>
    (!labels.length || labels.includes(n.label || 'Fără')) &&
    (!statuses.length || statuses.includes(n.status || 'Fără')) &&
    (!inCollection || inCollection.has(n.id)) &&
    (!keywords.length || (n.keywords || []).some((k) => keywords.includes(k)));
  // filterInvert: compile what does NOT match ("exclude matching documents").
  const passes = (n) => !hasFilter || (o.filterInvert ? !matches(n) : matches(n));

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

  // Compile > Statistics: what the word-count placeholders count and how they round.
  const stats = L.statistics(format);
  const counted = stats.countFrontBack ? [...front, ...body, ...back] : body;
  const wc = counted.reduce((sum, s) => sum + store.wordCount(s.html) + (stats.includeTitles ? store.wordCount(esc(s.node.title || '')) : 0), 0);
  const cc = counted.reduce((sum, s) => sum + store.htmlToText(s.html).replace(/\s+/g, ' ').trim().length, 0);
  // Compile > Replacements: each one ticked on/off, applied to the text, the titles or both.
  const replacers = compileReplacements(L.replacementsFor(format.replacements, 'text'));
  const titleReplacers = compileReplacements(L.replacementsFor(format.replacements, 'titles'));
  const textOpt = L.textOptions(tr);
  const lang = o.language || 'ro';
  const notesMode = tr.notes || 'footnotes';
  // Linked notes (anchored to text) may go elsewhere than the inline ones.
  const linkedMode = ['footnotes', 'endnotes-chapter', 'endnotes-book'].includes(tr.linkedNotes) ? tr.linkedNotes : notesMode;
  const anyEnd = notesMode !== 'footnotes' || linkedMode !== 'footnotes';
  const chapterNotes = notesMode === 'endnotes-chapter' || linkedMode === 'endnotes-chapter';
  const noteFormat = NOTE_FORMATS.includes(tr.noteNumbering) ? tr.noteNumbering : 'arabic';
  const script = L.scriptSettings(format);
  const paged = ['pdf', 'print', 'docx', 'odt', 'rtf'].includes(o.output) || o.target === 'pdf';
  const now = o.now ? new Date(o.now) : new Date();
  const named = {}; // <$n#name> counters
  // <$include:Title>: the text of another binder document.
  const includeDoc = (title) => {
    let hit = null;
    store.walk(tree, (x) => {
      if (!hit && x.type !== 'file' && !x.root && String(x.title || '').trim().toLowerCase() === title.toLowerCase()) hit = x;
    });
    return hit ? store.htmlToText(readDoc(hit.id) || '').trim() : null;
  };
  const layoutClasses = new Map(); // section type -> {cls, lay}
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
    if (ctx.asIs) return t; // "Compile as-is": the text exactly as written
    if (replacers.length) t = applyReplacements(t, replacers);
    if (tr.dashes) t = dashes(t);
    if (tr.smartQuotes) t = smartQuotes(t, state.last, lang);
    if (textOpt) t = textOpt(t);
    return t;
  };
  // As-is documents keep their markup: only what never belongs in a book is removed.
  const asIsTr = { comments: tr.comments, notes: tr.notes, linksToText: tr.linksToText };
  const processHtml = (html, ctx, lay = L.layoutOf()) => {
    let out = cleanMarkup(resolveImagePlaceholders(html, project, o), ctx.asIs ? asIsTr : tr);
    if (!ctx.asIs) out = L.applyStyleOverrides(out, o.allStyles || [], format.styleOverrides);
    if (['md', 'mmd'].includes(o.output)) out = L.preserveAs(out, tr.preserveAs);
    out = mapText(out, textFn(ctx));
    if (!ctx.asIs && lay.formatting === 'override') out = L.stripFonts(out);
    if (!ctx.asIs) out = L.firstParagraph(out, lay);
    if (script.mode && paged) out = L.scriptContinuations(out, script);
    if (anyEnd) {
      out = out.replace(/<span[^>]*data-footnote="[^"]*"[^>]*>[\s\S]*?<\/span>/g, (tag) => {
        if ((/data-linked="1"/.test(tag) ? linkedMode : notesMode) === 'footnotes') return tag;
        const n = ++endNo;
        const a = ++endAnchor;
        const label = noteLabel(n, noteFormat);
        pending.push({ n, a, text: attr(tag, 'data-footnote') || '', label: noteFormat === 'arabic' ? undefined : label });
        return `<sup><a class="noteref" id="enref${a}" href="#en${a}">${esc(label)}</a></sup>`;
      });
    }
    return out;
  };

  if (o.titlePage) items.push({ kind: 'titlepage' });
  const tocCfg = o.tocSettings || F.tocSettings(format);
  if (o.toc) items.push({ kind: 'toc', entries: tocEntries, settings: tocCfg });

  const emit = (s) => {
    const n = s.node;
    const isBody = s.matter === 'body';
    const typeTitle = isBody ? resolveSectionType(project, n, format, s.depth + 1) : `@${s.matter}`;
    const lay = L.layoutOf(isBody ? layoutFor(format, typeTitle, n) : F.layout({ showTitle: false, pageBreakBefore: true, separatorBefore: 'none' }));
    const role = structuralRole(n);
    const asIs = n.compileAsIs === true;
    let num = null;
    // <$n> counts per numbering stream: layouts that share the same title prefix (e.g. „Capitol”
    // and „Capitol cu text”, both "Capitolul <$n>") continue one sequence, as in Scrivener.
    const prefixKey = String(lay.titlePrefix || '').replace(/<\$n(?::[^>]*)?>/g, '<$n>');
    const counterKey = /<\$n>/.test(prefixKey) ? `prefix:${prefixKey}` : `type:${typeTitle}`;
    if (isBody) num = counters[counterKey] = (counters[counterKey] || 0) + 1;
    const level = Math.min(s.depth + 1, 3);
    const ctx = { project, node: n, n: num, title: n.title || '', wc, cc, stats: { round: stats.round, lang }, counters: named, includeDoc, now, asIs };
    let title = '';
    if (lay.showTitle || lay.titlePrefix || lay.titleSuffix) {
      let own = lay.showTitle ? n.title || '' : '';
      if (own && titleReplacers.length && !asIs) own = applyReplacements(own, titleReplacers);
      title = replacePlaceholders(`${lay.titlePrefix || ''}${own}${lay.titleSuffix || ''}`, ctx).replace(/^\n+|\n+$/g, '');
    }
    // Per-document overrides: compilePageBreak (Contents list) true/false, then the document's own
    // "page break before" (Inspector), win over the layout.
    const layoutBreak = lay.pageBreakBefore === true || (lay.pageBreakBefore === 'level1' && level === 1) || lay.startRecto;
    const docBreak = typeof n.compilePageBreak === 'boolean' ? n.compilePageBreak : n.pageBreakBefore === true ? true : null;
    const pageBreak = (isBody && docBreak !== null ? docBreak : layoutBreak) || (!firstOfMatter && breakAfterPrev);
    if (pageBreak && chapterNotes) {
      flushNotes();
      endNo = 0;
    }
    // separator before this section
    let sectionBreak = null;
    if (!firstOfMatter && !pageBreak) {
      let sep = null;
      if (lay.separatorBefore === 'none') sep = null;
      else if (lay.separatorBefore === 'text') sep = { kind: 'text', text: lay.separatorText || (format.separators.sameType || {}).text || '* * *' };
      else if (lay.separatorBefore === 'page') sep = { kind: 'page' };
      else sep = L.separatorBetween(format, { type: prevType, role: prevRole }, { type: typeTitle, role });
      // A Word section break (new page / odd page) starts the section itself.
      if (sep && (sep.kind === 'section' || sep.kind === 'oddPage')) sectionBreak = sep.kind;
      else if (sep && sep.kind && sep.kind !== 'none' && !(sep.kind === 'text' && !sep.text) && !(sep.kind === 'decorative' && !sep.text && !sep.line)) items.push({ kind: 'separator', sep: { ...sep } });
    }
    if (lay.startRecto && isBody) sectionBreak = 'oddPage';
    // legacy: folders only contribute their text when it is not empty
    let html = lay.showText ? s.html : '';
    if (format.legacy && n.type === 'folder' && !store.htmlToText(html).trim()) html = '';
    const id = `sec-${++secNo}`;
    // Layout classes (title font/size/spacing, columns, indent…) for the HTML outputs.
    let layoutCls = '';
    if (isBody && layoutNeedsCss(lay)) {
      if (!layoutClasses.has(typeTitle)) layoutClasses.set(typeTitle, { cls: `lay-${layoutClasses.size + 1}`, lay });
      layoutCls = layoutClasses.get(typeTitle).cls;
    }
    const extras = isBody ? L.extrasHtml(n, lay, { readNotes: o.readNotes, labels: { label: project.labelTitle || 'Etichetă', status: project.statusTitle || 'Status', keywords: isEnglish(lang) ? 'Keywords' : 'Cuvinte-cheie' } }) : { before: '', after: '' };
    const body = html ? processHtml(html, ctx, lay) : '';
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
      sectionBreak: sectionBreak && !(firstOfMatter && items.length === 0) ? sectionBreak : null,
      pageBreakAfter: Boolean(lay.pageBreakAfter),
      layoutCls,
      titleFmt: titleFormat(lay),
      keepFonts: asIs || lay.formatting === 'editor',
      asIs,
      html: extras.before + body + extras.after,
    });
    if (isBody && title && level <= tocCfg.depth) tocEntries.push({ id, title: title.replace(/\n/g, ' '), level });
    prevType = typeTitle;
    prevRole = role;
    breakAfterPrev = Boolean(lay.pageBreakAfter);
    firstOfMatter = false;
  };
  let prevRole = null;
  let breakAfterPrev = false;

  for (const s of front) emit(s);
  firstOfMatter = true;
  prevType = null;
  breakAfterPrev = false;
  for (const s of body) emit(s);
  if (anyEnd) flushNotes();
  firstOfMatter = true;
  prevType = null;
  breakAfterPrev = false;
  for (const s of back) emit(s);
  if (anyEnd) flushNotes();
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
  return { options: { ...o, _resolved: true }, format, items, wc, cc, layouts: [...layoutClasses.values()], script };
}

// A layout needs its own CSS class only when it sets something beyond the defaults.
function layoutNeedsCss(lay) {
  return Boolean(
    lay.titleFont || Number(lay.titleSizePt) > 0 || typeof lay.titleBold === 'boolean' || lay.titleItalic ||
      (lay.titleSpaceBeforePt != null && lay.titleSpaceBeforePt !== '') || (lay.titleSpaceAfterPt != null && lay.titleSpaceAfterPt !== '') ||
      lay.prefixFont || Number(lay.prefixSizePt) > 0 || lay.prefixItalic || (lay.prefixCase && lay.prefixCase !== 'normal') || lay.prefixAlign ||
      Number(lay.columns) > 1 || (lay.indentIn != null && lay.indentIn !== '') || lay.formatting === 'override' || lay.pageBreakAfter,
  );
}

// Title formatting of a layout, as the block writers (DOCX) need it.
function titleFormat(lay) {
  const num = (v) => (v == null || v === '' ? null : Number(v));
  return {
    font: lay.titleFont || '',
    sizePt: Number(lay.titleSizePt) || 0,
    bold: typeof lay.titleBold === 'boolean' ? lay.titleBold : null,
    italic: Boolean(lay.titleItalic),
    before: num(lay.titleSpaceBeforePt),
    after: num(lay.titleSpaceAfterPt),
    prefixFont: lay.prefixFont || '',
    prefixSizePt: Number(lay.prefixSizePt) || 0,
    prefixAlign: lay.prefixAlign || '',
    prefixCase: lay.prefixCase || 'normal',
    prefixItalic: Boolean(lay.prefixItalic),
    columns: Number(lay.columns) || 1,
    indentIn: num(lay.indentIn),
  };
}

// Header/footer text with placeholders resolved; <$p> is kept for the writer.
// <$t>/<$title> in a header or footer is the title of the chapter the page belongs to.
const CHAPTER_PH = /<\$(t|title)(:[A-Za-z]+)?>/;
function usesChapterTitle(page) {
  return Boolean(page) && [page.header, page.footer].some((hf) => hf && [hf.left, hf.center, hf.right].some((x) => CHAPTER_PH.test(x || '')));
}

function headerFooterText(hf, project, wc, title = '') {
  const ctx = { project, wc, title };
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
// chapters: titles of the chapters, in order (named pages ch1, ch2, … carry their own header).
function runningCss(page, project, wc = 0, chapters = []) {
  const header = headerFooterText(page.header, project || {}, wc);
  const footer = headerFooterText(page.footer, project || {}, wc);
  const has = (x) => Boolean(x.left || x.center || x.right);
  if (!has(header) && !has(footer)) return '';
  const boxesFor = (h, f) => (side) => marginBoxes(h, 'top', page.mirrored, side) + marginBoxes(f, 'bottom', page.mirrored, side);
  const boxes = boxesFor(header, footer);
  const none = ['top', 'bottom'].flatMap((e) => ['left', 'center', 'right'].map((p) => `@${e}-${p}{content:none}`)).join('');
  let css = page.mirrored ? `\n@page :right{${boxes('right')}}\n@page :left{${boxes('left')}}` : `\n@page{${boxes('right')}}`;
  chapters.forEach((title, i) => {
    const b = boxesFor(headerFooterText(page.header, project || {}, wc, title), headerFooterText(page.footer, project || {}, wc, title));
    const name = `ch${i + 1}`;
    css += page.mirrored ? `\n@page ${name}:right{${b('right')}}\n@page ${name}:left{${b('left')}}` : `\n@page ${name}{${b('right')}}`;
    css += `\n.${name}{page:${name}}`;
  });
  css += `\n@page front{${none}}\n.front-page{page:front}`;
  if (page.differentFirstPage) css += `\n@page :first{${none}}`;
  return css;
}

// Front matter pages (named page "fm"): no running header; with page.frontRoman they are numbered
// i, ii, iii… on their own counter and do not advance the page counter, so the body starts at 1
// (CSS counter-reset on an element does not reach the page counter in Chromium).
function frontMatterCss(page) {
  const none = ['top', 'bottom'].flatMap((e) => ['left', 'center', 'right'].map((p) => `@${e}-${p}{content:none}`)).join('');
  if (!page.frontRoman) return `\n@page fm{${none}}\n.fm-page{page:fm}`;
  const roman = none.replace('@bottom-center{content:none}', '@bottom-center{content:counter(fmpage, lower-roman);font-size:8pt}');
  return `\n@page front{counter-increment:fmpage 1 page 0}\n.front-page{page:front}\n@page fm{counter-increment:fmpage 1 page 0;${roman}}\n.fm-page{page:fm}`;
}

// Fonts chosen for embedding ({family, data: base64, format}) as @font-face data URIs, so the PDF
// (Chromium embeds the glyphs it uses), HTML and EPUB show them without the font being installed.
const FONT_MIME = { truetype: 'font/ttf', opentype: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' };
function fontFormat(f) {
  const fmt = String(f.format || f.ext || '').toLowerCase().replace(/^\./, '');
  return { ttf: 'truetype', otf: 'opentype' }[fmt] || (FONT_MIME[fmt] ? fmt : 'truetype');
}
function fontB64(f) {
  return Buffer.isBuffer(f.data) ? f.data.toString('base64') : String(f.data || '').replace(/^data:[^,]*,/, '');
}
function fontFaceCss(fonts, urlOf = null) {
  return (Array.isArray(fonts) ? fonts : [])
    .filter((f) => f && f.family && f.data)
    .map((f, i) => {
      const fmt = fontFormat(f);
      const src = urlOf ? urlOf(f, i) : `data:${FONT_MIME[fmt]};base64,${fontB64(f)}`;
      return `@font-face{font-family:${cssString(f.family)};src:url(${cssString(src)}) format("${fmt}");font-weight:${f.weight || 'normal'};font-style:${f.style || 'normal'}}\n`;
    })
    .join('');
}

function pageCss(page, project, wc, chapters) {
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
  css += runningCss(page, project, wc, chapters);
  css += frontMatterCss(page);
  return css;
}

function headingHtml(s, withId) {
  const lines = caseText(s.title, s.titleCase).split('\n');
  const inner = lines.length > 1 ? `<span class="ch-prefix">${esc(lines[0])}</span><br>${lines.slice(1).map(esc).join('<br>')}` : esc(lines[0]);
  const cls = [s.titleAlign === 'left' ? 'al' : s.titleAlign === 'right' ? 'ar' : s.titleAlign === 'center' ? 'ac' : '', s.titleCase === 'smallcaps' ? 'sc' : '', s.layoutCls ? `h-${s.layoutCls}` : ''].filter(Boolean).join(' ');
  return `<h${s.level}${withId ? ` id="${s.id}"` : ''}${cls ? ` class="${cls}"` : ''}>${inner}</h${s.level}>`;
}

function endnotesHtml(notes, title = 'Note') {
  const labeled = notes.some((x) => x.label);
  return `<section class="notes endnotes">${title ? `<h3>${esc(title)}</h3>` : ''}<ol${labeled ? ' class="note-labels"' : ''}>${notes
    .map((x) => `<li value="${x.n}" id="en${x.a}">${labeled ? `<span class="note-label">${esc(x.label || String(x.n))}</span> ` : ''}${esc(x.text)} <a href="#enref${x.a}">↩</a></li>`)
    .join('')}</ol></section>`;
}

function tocHtml(entries, settings = F.DEFAULT_TOC) {
  const title = settings.title == null ? 'Cuprins' : settings.title;
  return `<nav class="toc">${title ? `<h2>${esc(title)}</h2>` : ''}<ol>${entries
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
      if (it.kind === 'toc') return it.entries.length ? (opt.paged ? `<div class="front-page">${tocHtml(it.entries, it.settings)}</div>` : tocHtml(it.entries, it.settings)) : '';
      if (it.kind === 'separator') {
        if (it.sep.kind === 'page') return '<div class="pb"></div>';
        if (it.sep.kind === 'space') return '<p class="sep space">&#160;</p>';
        if (it.sep.line) return `<p class="sep sep-line${it.sep.align ? ` a${it.sep.align[0]}` : ''}"><span></span></p>`;
        const al = it.sep.align === 'left' ? ' al' : it.sep.align === 'right' ? ' ar' : '';
        return `<p class="sep${it.sep.kind === 'decorative' ? ' deco' : ''}${al}">${esc(it.sep.text)}</p>`;
      }
      if (it.kind === 'notes') return endnotesHtml(it.notes, opt.notesTitle == null ? 'Note' : opt.notesTitle);
      // Front matter (dedication, copyright…) in paged output: its own pages, without running
      // header, counted apart (roman numerals) so the body starts at page 1.
      const fmPage = opt.paged && it.matter === 'front';
      let pb = (it.pageBreak || it.sectionBreak) && !fmPage ? `<div class="pb${it.sectionBreak === 'oddPage' ? ' recto' : ''}"></div>` : '';
      if (opt.chapters && it.matter === 'body' && it.title && (it.pageBreak || it.sectionBreak || !opt.chapters.length)) {
        // A new chapter page: the change of named page breaks the page itself (no extra .pb).
        opt.chapters.push(it.node.title || it.title.replace(/\n/g, ' '));
        pb = `${opt.chapters.length > 1 ? '</div>' : ''}<div class="ch${opt.chapters.length}${it.sectionBreak === 'oddPage' ? ' recto' : ''}">`;
      }
      const head = it.title ? headingHtml(it, opt.ids || it.anchor) + subtitleHtml(it) : it.anchor ? `<a id="${it.id}"></a>` : '';
      let html = it.html;
      if (fn) {
        // Restart per chapter: a body section that starts a new page starts the count again.
        if (fn.restart && it.matter === 'body' && it.pageBreak) fn.base = fn.list.length;
        const base = fn.base || 0;
        const fmt = fn.format || 'arabic';
        const label = (n) => noteLabel(n - base, fmt);
        const r = processNotes(html, fn.list.length + 1, fn.prefix || 'fn', label);
        if (fn.labels) r.notes.forEach((_, i) => fn.labels.push(label(fn.list.length + 1 + i)));
        fn.list.push(...r.notes);
        html = r.html;
      } else html = processNotes(html).html; // strips comments, keeps nothing else
      // A paragraph holding only an image (no text) is a figure: centered, no first-line indent.
      // CSS alone can't tell (":only-child" ignores text), so it is marked here.
      html = html.replace(/<p(\s[^>]*)?>\s*(<img\b[^>]*>)\s*<\/p>/g, (_m, at = '', im) => `<p${/class="/.test(at) ? at.replace('class="', 'class="fig ') : `${at} class="fig"`}>${im}</p>`);
      // Note references as [1] instead of a superscript (Compile > Notes: marker style).
      if (opt.noteMarker === 'bracket') html = html.replace(/<sup>(<a\b[^>]*>)([^<]*)<\/a><\/sup>/g, '$1[$2]</a>');
      // The section's layout class: columns, indent, page break after, editor fonts removed.
      if (it.layoutCls) html = `<div class="${it.layoutCls} sec-body">${html}</div>`;
      return fmPage ? `<div class="fm-page">${head}${html}</div>` : pb + head + html;
    })
    .join('\n') + (opt.chapters && opt.chapters.length ? '</div>' : '');
}

function htmlCss(o, target, project) {
  const t = o.format.typography;
  const page = o.format.page;
  const paged = target === 'pdf';
  const indent = Number(t.firstLineIndentIn) || 0;
  const after = Number(t.paragraphSpacingPt) || 0;
  const hf = t.headingFont ? `h1,h2,h3,h4{font-family:${fontStack(t.headingFont)}}\n` : '';
  return `${fontFaceCss(o.fonts)}body{font-family:${fontStack(t.fontFamily)};font-size:${t.fontSizePt}pt;line-height:${t.lineSpacing || 1.5};${paged ? 'margin:0;' : 'max-width:40em;margin:2em auto;'}}
${hf}h1{text-align:center;margin-top:3em}
h1.book{page-break-before:avoid;font-size:2.2em;margin-top:${paged ? '30%' : '30vh'}}
.title-page{text-align:center}
.front-page{break-after:page;page-break-after:always}
.author{text-align:center;font-style:italic}
.book-subtitle{text-align:center;font-size:1.3em;font-style:italic;margin:.6em 0 2em;text-indent:0}
.subtitle{text-align:center;font-style:italic;font-size:1.1em;margin:-.4em 0 1.6em;text-indent:0}
${(o.flow || F.DEFAULT_FLOW).keepWithNext ? 'h1,h2,h3,h4{break-after:avoid;page-break-after:avoid;break-inside:avoid}' : ''}
h1+.subtitle,h2+.subtitle,h3+.subtitle{break-before:avoid;page-break-before:avoid}
p{orphans:${(o.flow || F.DEFAULT_FLOW).orphans};widows:${(o.flow || F.DEFAULT_FLOW).widows};hyphens:auto;-webkit-hyphens:auto}
h1,h2,h3,h4,.sep,.subtitle,.book-subtitle,.author,.toc{hyphens:manual;-webkit-hyphens:manual}
img,figure,table,tr{break-inside:avoid;page-break-inside:avoid}
.fig{text-indent:0;text-align:center}
p{text-indent:${indent}in;margin:0 0 ${after}pt}${t.noIndentAfterHeading !== false ? ' h1+p,h2+p,h3+p,.subtitle+p,.sep+p,.pb+p,.toc+p{text-indent:0}' : ''}
.ac{text-align:center}.al{text-align:left}.ar{text-align:right}.sc{font-variant:small-caps}[data-caps="small"]{font-variant:small-caps}[data-caps="all"]{text-transform:uppercase}.ch-prefix{font-size:.8em;font-weight:normal}
.sep{text-align:center;margin:1em 0;text-indent:0}
.pb{break-before:page;page-break-before:always}
.fm-page{break-after:page;page-break-after:always}
.toc ol{list-style:none;padding:0}.toc li{text-indent:0}.toc .toc2{margin-left:1.5em}.toc .toc3{margin-left:3em}
.notes{page-break-before:always;font-size:.9em}.notes li{text-indent:0}.endnotes{page-break-before:auto}.note-labels{list-style:none;padding-left:0}
div[data-preserve-format] p{text-indent:0;margin:0;hyphens:manual;-webkit-hyphens:manual}
hr{border:none;page-break-after:always;margin:0}
img{max-width:100%;height:auto}
table{border-collapse:collapse;margin:1em auto}th,td{border:1px solid #888;padding:.2em .5em;vertical-align:top}th p,td p,li p{text-indent:0;margin:0}
${paged && page ? pageCss(page, project, o._wc || 0, o._chapters || []) : ''}
${o.styleCss || ''}`;
}

function compileHtml(project, readDoc, options = {}) {
  const doc = buildDocument(project, readDoc, options);
  const o = doc.options;
  const target = o.target || 'html';
  const fn = footnoteState(o);
  const cover = target === 'pdf' ? coverDataUri(o) : '';
  const coverHtml = cover ? `<div class="cover-page front-page"><img src="${cover}" alt="${escAttr(project.title || '')}"></div>\n` : '';
  // PDF with the chapter title in the running header: each chapter is its own named page.
  const chapters = target === 'pdf' && usesChapterTitle(o.format.page) ? [] : null;
  const body = coverHtml + itemsHtml(doc.items, project, { footnotes: fn, ids: Boolean(o.toc), paged: target === 'pdf', chapters }) + notesHtml(fn.list, 1, 'fn', fn.labels);
  const title = esc(project.title);
  return `<!doctype html><html lang="${escAttr((o.epub && o.epub.language) || 'ro')}"><head><meta charset="utf-8"><title>${title}</title>
<style>
${htmlCss({ ...o, _wc: doc.wc, _chapters: chapters || [] }, target, project)}
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
      // front: true marks the front matter (title page, contents): DOCX puts it in its own section
      // without running header/footer, like the PDF.
      out.push({ type: 'title', front: true, align: 'center', runs: [{ text: project.title || '' }] });
      if (project.subtitle) out.push({ type: 'subtitle', front: true, book: true, align: 'center', noIndent: true, runs: [{ text: project.subtitle, i: true }] });
      if (project.author) out.push({ type: 'author', front: true, align: 'center', runs: [{ text: project.author, i: true }] });
      if (!o.format.legacy) out.push({ type: 'pagebreak' });
      afterHeading = true;
    } else if (it.kind === 'toc') {
      if (!it.entries.length) continue;
      const ts = it.settings || F.DEFAULT_TOC;
      if (ts.title) out.push({ type: 'h1', front: true, align: 'center', runs: [{ text: ts.title }], toc: true });
      for (const e of it.entries) out.push({ type: 'toc', front: true, level: e.level, noIndent: true, target: e.id, leaders: ts.leaders, pageNumbers: ts.pageNumbers, runs: [{ text: e.title }] });
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
      const startLen = out.length;
      if (it.pageBreak) out.push({ type: 'pagebreak' });
      if (it.title) {
        out.push({ type: `h${it.level}`, align: it.titleAlign || (it.level === 1 && o.format.legacy ? 'center' : null), runs: titleRuns(it), section: it.id, chapter: it.matter === 'body' && it.pageBreak ? it.node.title || '' : undefined });
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
      // Front matter (dedication, copyright…) belongs to the front section: no running
      // header, roman page numbers when the format asks for them.
      if (it.matter === 'front') for (const b of out.slice(startLen)) b.front = true;
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
// The docx library writes strings as given: a control character typed or pasted into the
// project title/author (title page, core.xml, comment author) would make the package unreadable.
function xmlSafeMeta(project) {
  const out = { ...project };
  for (const k of ['title', 'subtitle', 'author', 'titleAbbreviation']) if (typeof out[k] === 'string') out[k] = xmlSafe(out[k]);
  return out;
}

async function compileDocx(project, readDoc, options = {}) {
  project = xmlSafeMeta(project);
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
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, FootnoteReferenceRun, PageBreak, LevelFormat, Header, Footer, Tab, TabStopType, PageNumber, CommentRangeStart, CommentRangeEnd, CommentReference, ImageRun, ExternalHyperlink, InternalHyperlink, Bookmark, Table, TableRow, TableCell, WidthType, BorderStyle, PageReference, LeaderType, NumberFormat } = docx;
  const flow = o.flow || F.DEFAULT_FLOW;
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
    // Tab characters (ruler tab stops) become real Word tabs.
    const text = r.text.includes('\t') ? { children: r.text.split('\t').flatMap((x, i) => (i ? [new Tab(), x] : [x])).filter((x) => x !== '') } : { text: r.text };
    return new TextRun({ ...text, bold: r.b, italics: r.i, underline: r.u ? {} : undefined, strike: r.s, superScript: r.sup, subScript: r.sub, smallCaps: r.sc || undefined, allCaps: r.caps || undefined, style: r.link ? 'Hyperlink' : undefined, ...(r.font ? { font: r.font } : {}), ...(r.sizePt ? { size: Math.round(r.sizePt * 2) } : {}), ...extra });
  };
  // Paragraph indents / tab stops set on the ruler (cm → twips) override the compile defaults.
  const rulerDocx = (p, firstLine = 0) => {
    if (!p) return {};
    const tw = (cm) => Math.round(cm * 567);
    const out = {};
    if (p.left !== null || p.right !== null || p.first !== null) {
      const first = p.first !== null ? tw(p.first) : firstLine;
      out.indent = { ...(p.left !== null ? { left: tw(p.left) } : {}), ...(p.right !== null ? { right: tw(p.right) } : {}), ...(first < 0 ? { hanging: -first } : first ? { firstLine: first } : {}) };
    }
    if (p.tabs) out.tabStops = p.tabs.map((t) => ({ type: { center: TabStopType.CENTER, right: TabStopType.RIGHT, decimal: TabStopType.DECIMAL }[t.type] || TabStopType.LEFT, position: tw(t.pos) }));
    return out;
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
  // With a running header/footer, the cover, title page and contents go in a first section without
  // them; the body section starts on a new page with page number 1.
  const pg0 = o.format.page;
  const hasHF = Boolean(pg0) && [headerFooterText(pg0.header, project, 0), headerFooterText(pg0.footer, project, 0)].some((x) => x.left || x.center || x.right);
  let frontEnd = coverSrc ? children.length : 0;
  let inFront = true;
  // <$t> in the header: every chapter becomes a section with its own header text.
  // Footnote numbering restarting per chapter needs one section per chapter too (w:numRestart).
  const fnState = footnoteState(o);
  const restartNotes = fnState.restart && (o.transforms.notes || 'footnotes') === 'footnotes';
  const byChapter = (hasHF && usesChapterTitle(pg0)) || restartNotes;
  const chapterStarts = [];
  const allBlocks = blocksFor(doc, project, { comments: exportComments });
  for (const b of allBlocks) {
    if (byChapter && !b.front && b.chapter !== undefined) {
      chapterStarts.push({ at: children.length, title: b.chapter });
      b.pageBreakBefore = false; // the section break starts the new page
    }
    if (!b.front && inFront) {
      inFront = false;
      frontEnd = children.length;
      // the section break already starts a new page
      if ((hasHF || restartNotes) && frontEnd > 0) b.pageBreakBefore = false;
    }
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
      children.push(new Paragraph({ heading: H[b.type[1]] || H[3], alignment: ALIGN[b.align], pageBreakBefore, keepNext: flow.keepWithNext || undefined, ...rulerDocx(b.para), children: withBookmark(b, runsFor(b.runs, { font: headingFont })) }));
    } else if (b.type === 'sep' || b.type === 'space') {
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, pageBreakBefore, children: runsFor(b.runs || []) }));
    } else if (b.type === 'toc') {
      // Entry, then a right tab (with dot leader) and the page of the chapter's bookmark (PAGEREF,
      // computed by Word / LibreOffice when the document opens: updateFields).
      const dimT = F.pageDimensions(page) || { widthIn: 8.27 };
      const mT = (page && page.margins) || {};
      const tocTab = Math.round((dimT.widthIn - (mT.inner ?? 1) - (mT.outer ?? 1)) * 1440);
      const pageNo = b.pageNumbers !== false && b.target;
      children.push(
        new Paragraph({
          indent: { left: (b.level - 1) * 400 },
          pageBreakBefore,
          tabStops: pageNo ? [{ type: TabStopType.RIGHT, position: tocTab, leader: b.leaders === false ? LeaderType.NONE : LeaderType.DOT }] : undefined,
          children: pageNo
            ? [new InternalHyperlink({ anchor: bookmarkName(b.target), children: runsFor(b.runs) }), new TextRun({ children: [new Tab()] }), new PageReference(bookmarkName(b.target))]
            : runsFor(b.runs),
        }),
      );
    } else {
      const styleIndent = b.style && b.style.indent ? Math.round(b.style.indent * 567) : 0;
      const centered = b.align === 'center' || b.align === 'right';
      const lvl = Math.min(8, Math.max(0, (b.level || 1) - 1));
      if (b.preserve) {
        // Preserve Formatting: no compile indent or spacing; only the block's own ruler indents.
        children.push(new Paragraph({ children: withBookmark(b, runsFor(b.runs)), alignment: ALIGN[b.align], pageBreakBefore, spacing: { after: 0 }, ...rulerDocx(b.para, 0) }));
        continue;
      }
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
          ...rulerDocx(b.para, b.noIndent || centered || b.type === 'li' ? 0 : firstLine),
          bullet: b.type === 'li' && b.list !== 'ol' ? { level: lvl } : undefined,
          numbering: b.type === 'li' && b.list === 'ol' ? { reference: b.listStart > 1 ? `ordered-${b.listStart}` : 'ordered', level: lvl, instance: b.listId || 0 } : undefined,
        }),
      );
    }
  }
  const section = { children };
  let hfFor = null;
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
    const has = (x) => Boolean(x.left || x.center || x.right);
    // Header/footer of a section; `chapter` fills <$t>/<$title> (the chapter title).
    hfFor = (chapter = '') => {
      const header = headerFooterText(page.header, project, doc.wc, chapter);
      const footer = headerFooterText(page.footer, project, doc.wc, chapter);
      const out = {};
      if (has(header)) {
        out.headers = { default: new Header({ children: [hfPara(header)] }) };
        if (page.differentFirstPage) out.headers.first = new Header({ children: [new Paragraph({ children: [] })] });
      }
      if (has(footer)) {
        out.footers = { default: new Footer({ children: [hfPara(footer)] }) };
        if (page.differentFirstPage) out.footers.first = new Footer({ children: [new Paragraph({ children: [] })] });
      }
      return out;
    };
    Object.assign(section, hfFor(''));
  }
  // Front matter (cover, title page, contents) without header; then the body, restarting at page 1,
  // in one section — or one section per chapter when the header shows the chapter title.
  function docxSections() {
    const withHF = hasHF && section.properties && hfFor && (section.headers || section.footers);
    const notePr = fnState.format !== 'arabic' || restartNotes ? { numberFormat: { type: NOTE_DOCX_FMT[fnState.format] }, ...(restartNotes ? { restart: 'eachSect' } : {}) } : null;
    const withNotes = (sec) => (notePr ? { ...sec, properties: { ...(sec.properties || {}), footnoteProperties: notePr } } : sec);
    // Front matter numbered with lower-case roman numerals (i, ii, …) in its own section.
    const romanFront = Boolean(page && page.frontRoman) && frontEnd > 0 && frontEnd < children.length;
    if (!withHF && !restartNotes && !romanFront) return [withNotes(section)];
    const hf = (title) => (withHF ? hfFor(title) : {});
    const props = section.properties || {};
    const out = [];
    const front = frontEnd > 0 && frontEnd < children.length;
    if (front && romanFront) {
      const romanFooter = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: Math.max(16, t.fontSizePt * 2 - 4) })] })] });
      out.push(withNotes({ footers: { default: romanFooter }, properties: { ...props, titlePage: false, page: { ...(props.page || {}), pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN } } }, children: children.slice(0, frontEnd) }));
    } else if (front) out.push(withNotes({ properties: { ...props, titlePage: false }, children: children.slice(0, frontEnd) }));
    const bodyStart = front ? frontEnd : 0;
    const starts = byChapter ? chapterStarts.filter((c) => c.at >= bodyStart) : [];
    const cuts = [{ at: bodyStart, title: '' }, ...starts.filter((c) => c.at > bodyStart)];
    if (starts.length && starts[0].at === bodyStart) cuts[0].title = starts[0].title;
    cuts.forEach((c, i) => {
      const end = i + 1 < cuts.length ? cuts[i + 1].at : children.length;
      if (end <= c.at) return;
      const pageProps = i === 0 && front && (withHF || romanFront) ? { ...props.page, pageNumbers: romanFront ? { start: 1, formatType: NumberFormat.DECIMAL } : { start: 1 } } : props.page;
      out.push(withNotes({ ...hf(c.title), properties: { ...props, ...(pageProps ? { page: pageProps } : {}) }, children: children.slice(c.at, end) }));
    });
    return out.length ? out : [withNotes(section)];
  }
  // One numbering definition per first number in use (<ol start="5"> keeps its 5).
  const orderedLevels = (start = 1) =>
    Array.from({ length: 9 }, (_, l) => ({
      level: l,
      format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN][l % 3],
      text: `%${l + 1}.`,
      start: l === 0 ? start : 1,
      alignment: AlignmentType.START,
      style: { paragraph: { indent: { left: 720 * (l + 1), hanging: 360 } } },
    }));
  const starts = [...new Set(allBlocks.filter((b) => b.listStart > 1).map((b) => b.listStart))];
  const d = new Document({
    numbering: {
      config: [{ reference: 'ordered', levels: orderedLevels() }, ...starts.map((n) => ({ reference: `ordered-${n}`, levels: orderedLevels(n) }))],
    },
    creator: project.author || 'Scribner',
    title: project.title,
    styles: {
      default: { document: { run: { font: t.fontFamily, size: Math.round(t.fontSizePt * 2), language: { value: (o.epub && o.epub.language) || 'ro-RO' } }, paragraph: { widowControl: flow.widows > 1 || flow.orphans > 1, spacing: { line: Math.round(240 * (t.lineSpacing || 1.5)), lineRule: 'auto' } } } },
      paragraphStyles: [
        { id: 'Subtitle', name: 'Subtitle', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { italics: true, size: Math.round(t.fontSizePt * 2.6) }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 480 } } },
      ],
    },
    comments: comments.length ? { children: comments } : undefined,
    // Table of contents with page numbers: PAGEREF fields are filled in when the document opens.
    // Embedded TrueType/OpenType fonts (word/fonts/*.odttf).
    fonts: (o.fonts || []).filter((f) => f && f.family && f.data && ['truetype', 'opentype'].includes(fontFormat(f))).map((f) => ({ name: f.family, data: Buffer.from(fontB64(f), 'base64') })),
    features: allBlocks.some((b) => b.type === 'toc' && b.pageNumbers !== false && b.target) ? { updateFields: true } : undefined,
    footnotes,
    sections: docxSections(),
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
  // Embedded fonts: OEBPS/fonts/fontN.ext + @font-face; the body uses the format's font only when
  // it is embedded (otherwise the reader's own serif font, as e-books usually do).
  const fonts = (o.fonts || []).filter((f) => f && f.family && f.data);
  const fontManifest = [];
  const fontCss = fontFaceCss(fonts, (f, i) => {
    const fmt = fontFormat(f);
    const ext = { truetype: 'ttf', opentype: 'otf', woff: 'woff', woff2: 'woff2' }[fmt];
    const name = `fonts/font${i + 1}.${ext}`;
    zip.file(`OEBPS/${name}`, Buffer.from(fontB64(f), 'base64'));
    fontManifest.push(`<item id="font${i + 1}" href="${name}" media-type="${FONT_MIME[fmt]}"/>`);
    return name;
  });
  const bodyFont = fonts.some((f) => f.family === t.fontFamily) ? fontStack(t.fontFamily) : 'serif';
  zip.file(
    'OEBPS/style.css',
    `${fontCss}body{font-family:${bodyFont};line-height:1.5}p{text-indent:1.5em;margin:0}h1,h2,h3{text-align:center}${hf}.al{text-align:left}.ar{text-align:right}.sc{font-variant:small-caps}[data-caps="small"]{font-variant:small-caps}[data-caps="all"]{text-transform:uppercase}.ch-prefix{font-size:.8em;font-weight:normal}h1+p,h2+p,h3+p,.sep+p{text-indent:0}.sep{text-align:center;text-indent:0;margin:1em 0}hr{border:none;margin:2em 0}.title-page{text-align:center;margin-top:30%}.author{font-style:italic}.book-subtitle{font-size:1.3em;font-style:italic;text-indent:0}.subtitle{text-align:center;font-style:italic;text-indent:0;margin:-.4em 0 1.6em}.subtitle+p{text-indent:0}p{orphans:2;widows:2;hyphens:auto;-webkit-hyphens:auto;-epub-hyphens:auto}h1,h2,h3{page-break-after:avoid;hyphens:manual}img{page-break-inside:avoid}.cover{text-align:center;margin:0;padding:0}.cover img{max-width:100%;max-height:100%}img{max-width:100%}.notes li{text-indent:0}table{border-collapse:collapse;margin:1em auto}th,td{border:1px solid #888;padding:.2em .5em;vertical-align:top}th p,td p,li p{text-indent:0;margin:0}\n${o.styleCss || ''}`,
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
      const sniff = IMAGE_TYPES[mime.toLowerCase()];
      if (!data.length || (sniff && !imageSize(data, sniff))) {
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
    const fn = footnoteState(o);
    const body = itemsHtml(c.items, project, { footnotes: fn, ids: true }) + notesHtml(fn.list, 1, 'fn', fn.labels);
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
  const navDepth = (o.tocSettings && o.tocSettings.depth) || 2;
  const entries = doc.items.filter((it) => it.kind === 'section' && it.matter === 'body' && it.title && it.level <= navDepth && fileOf.has(it.id));
  let navList;
  if (entries.length) {
    const top = [];
    const stack = [];
    for (const e of entries) {
      const li = { e, kids: [] };
      while (stack.length && stack[stack.length - 1].e.level >= e.level) stack.pop();
      (stack.length ? stack[stack.length - 1].kids : top).push(li);
      stack.push(li);
    }
    const liXml = (x) => `<li><a href="${fileOf.get(x.e.id)}#${x.e.id}">${esc(x.e.title.replace(/\n/g, ' '))}</a>${x.kids.length ? `<ol>${x.kids.map(liXml).join('')}</ol>` : ''}</li>`;
    navList = top.map(liXml).join('');
  } else navList = chapters.map((c, i) => `<li><a href="ch${i + 1}.xhtml">${esc(c.title)}</a></li>`).join('');
  const tocTitle = (o.tocSettings && o.tocSettings.title) || 'Cuprins';
  const nav = `<nav epub:type="toc" id="toc"><h1>${esc(tocTitle)}</h1><ol>${navList}</ol></nav>`;
  zip.file('OEBPS/nav.xhtml', xhtml(tocTitle, nav));
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
    `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="${lang}"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/">${md}</metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/>${fontManifest.join('')}${manifest.join('')}</manifest><spine>${spine.join('')}</spine></package>`,
  );
  return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip', compression: 'DEFLATE' });
}

// XHTML requires self-closed void elements and no HTML-only entities.
// XHTML (EPUB) allows only an integer width attribute: a percentage becomes CSS width.
function percentWidthToCss(html) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const w = /\swidth="\s*(\d+(?:\.\d+)?)%\s*"/i.exec(tag);
    if (!w) return tag;
    let t = tag.replace(w[0], '');
    const css = `width:${w[1]}%;height:auto`;
    t = /\sstyle="/i.test(t) ? t.replace(/\sstyle="([^"]*)"/i, (_m, st) => ` style="${st.replace(/;?\s*$/, '')};${css}"`) : t.replace(/^<img\b/i, `<img style="${css}"`);
    return t;
  });
}

function toXhtml(html) {
  return percentWidthToCss(xmlSafe(html))
    // quoted values may contain ">" (alt text): the void tag ends at the first ">" outside quotes
    .replace(/<(br|hr|img|col|wbr|source)\b((?:[^>"']|"[^"]*"|'[^']*')*?)\s*\/?>/gi, '<$1$2/>')
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
    noteFormat: footnoteState(o).format,
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
          const lab = noteLabel(n, w.noteFormat);
          return `<text:note text:id="ftn${n}" text:note-class="footnote"><text:note-citation${w.noteFormat && w.noteFormat !== 'arabic' ? ` text:label="${xmlEsc(lab)}"` : ''}>${xmlEsc(lab)}</text:note-citation><text:note-body><text:p text:style-name="Footnote">${xmlEsc(r.footnote)}</text:p></text:note-body></text:note>`;
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
      if (!String(r.footnote).trim()) continue; // an empty note gives no marker
      notes.push(mdEscape(String(r.footnote).replace(/\s*\n\s*/g, ' ')));
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
  return doc.items.filter((it) => it.kind === 'section').map((it) => ({ title: it.title.replace(/\n/g, ' '), subtitle: it.subtitle || '', level: it.level, html: it.html }));
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
  const meta = { title: project.title || '', subtitle: project.subtitle || '', author: project.author || '', date: require('./history.cjs').dayKey(), lang: project.lang || 'ro' };
  return adv.toLatex(compiledSections(project, readDoc, options), meta, { documentClass: options.documentClass || 'book', titles: true });
}

// --- one entry point -------------------------------------------------------------------

/**
 * Compiles to any output format. Returns Buffer (docx, epub, odt, pdf via renderPdf) or string.
 * For 'pdf' without opts.renderPdf / hooks.renderPdf, returns the print HTML (string).
 * hooks.renderPdf(html, pdfOptions) -> Promise<Buffer> is supplied by the Electron main process.
 */
async function compile(project, readDoc, format, opts = {}, hooks = {}) {
  // The output decides which per-output front/back matter applies.
  opts = { ...opts, output: format === 'print' ? 'pdf' : format === 'markdown' ? 'md' : format };
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
  noteLabel,
  NOTE_FORMATS,
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
  pageCss,
  runningCss,
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
