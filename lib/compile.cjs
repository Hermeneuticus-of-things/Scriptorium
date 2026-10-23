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

// --- tiny HTML parser for TipTap output -> block list with inline runs ---
// styles: named style definitions ({id, type, bold, italic, align, …}).
function parseBlocks(html, styles = [], options = {}) {
  const byId = Object.fromEntries(styles.map((s) => [s.id, s]));
  const blocks = [];
  let current = null;
  const marks = { b: 0, i: 0, u: 0, s: 0, sup: 0, sub: 0 };
  const spans = []; // stack of {skip, style}
  const lists = []; // stack of 'ol' | 'ul'
  let quote = 0; // blockquote nesting
  const startBlock = (type, attrs = '') => {
    const align = (/text-align:\s*(left|center|right|justify)/.exec(attrs) || [])[1] || null;
    const style = byId[(/data-style="([^"]*)"/.exec(attrs) || [])[1]] || null;
    current = { type, runs: [], align: align || (style && style.align) || null, style, list: lists[lists.length - 1] || null };
    blocks.push(current);
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
        if (sp && sp.comment && current) current.runs.push({ commentEnd: true });
        continue;
      }
      if (options.comments && /data-comment=/.test(m[3]) && !skipping()) {
        if (!current) startBlock('p');
        current.runs.push({ commentStart: attr(`<span${m[3]}>`, 'data-comment') || '' });
        spans.push({ skip: false, comment: true });
        continue;
      }
      if (/data-footnote=/.test(m[3])) {
        if (!skipping()) {
          if (!current) startBlock('p');
          current.runs.push({ footnote: attr(`<span${m[3]}>`, 'data-footnote') || '' });
        }
        spans.push({ skip: true });
        continue;
      }
      if (/data-(annotation|unsupported-image)=/.test(m[3])) {
        spans.push({ skip: true });
        continue;
      }
      spans.push({ skip: false, style: byId[(/data-char-style="([^"]*)"/.exec(m[3]) || [])[1]] || null });
      continue;
    }
    if (skipping()) continue;
    if (m[4] !== undefined) {
      const text = decodeEntities(m[4]);
      if (!text) continue;
      if (!current) startBlock('p');
      const cs = charStyle();
      const ps = current.style || {};
      current.runs.push({
        text,
        b: marks.b > 0 || cs.b || Boolean(ps.bold),
        i: marks.i > 0 || cs.i || Boolean(ps.italic),
        u: marks.u > 0,
        s: marks.s > 0,
        sup: marks.sup > 0,
        sub: marks.sub > 0,
      });
      continue;
    }
    if (tag === 'ol' || tag === 'ul') {
      if (closing) lists.pop();
      else lists.push(tag);
    } else if (['p', 'h1', 'h2', 'h3', 'h4', 'li', 'blockquote', 'pre'].includes(tag)) {
      // <li><p>…</p></li>: the <p> opens the block; avoid an empty extra block for <li>
      if (!closing) {
        if (tag === 'p' && current && current.type === 'li' && !current.runs.length) {
          const style = byId[(/data-style="([^"]*)"/.exec(m[3]) || [])[1]] || null;
          current.style = style;
          current.align = (/text-align:\s*(left|center|right|justify)/.exec(m[3]) || [])[1] || (style && style.align) || null;
        } else startBlock(tag === 'h4' ? 'h3' : tag === 'pre' || (tag === 'p' && quote > 0) ? (quote > 0 ? 'blockquote' : 'p') : tag, m[3]);
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
    else if (tag === 's' || tag === 'strike') marks.s += closing ? -1 : 1;
    else if (tag === 'sup') marks.sup += closing ? -1 : 1;
    else if (tag === 'sub') marks.sub += closing ? -1 : 1;
    else if (tag === 'br' && current) current.runs.push({ text: '\n', b: false, i: false, u: false, s: false });
  }
  return blocks.filter((b) => b.type === 'hr' || b.type !== 'blockquote' || b.runs.length);
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
  const passes = (n) => (!labels.length || labels.includes(n.label || 'Fără')) && (!statuses.length || statuses.includes(n.status || 'Fără'));

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
    let out = mapText(cleanMarkup(html, tr), textFn(ctx));
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
    if (isBody) num = counters[typeTitle] = (counters[typeTitle] || 0) + 1;
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

function pageCss(page) {
  const dim = F.pageDimensions(page);
  if (!dim) return '';
  const m = page.margins || {};
  const inner = m.inner ?? 1;
  const outer = m.outer ?? 1;
  let css = `@page{size:${dim.widthIn}in ${dim.heightIn}in;margin:${m.top ?? 1}in ${outer}in ${m.bottom ?? 1}in ${inner}in}`;
  if (page.mirrored) css += `\n@page :left{margin-left:${outer}in;margin-right:${inner}in}\n@page :right{margin-left:${inner}in;margin-right:${outer}in}`;
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
  const author = project.author ? `<p class="author">${esc(project.author)}</p>` : '';
  return `<h1 class="book">${esc(project.title)}</h1>${author}`;
}

// Renders a run of items to HTML. notes: {list, prefix} accumulates footnotes.
function itemsHtml(items, project, opt = {}) {
  const fn = opt.footnotes;
  return items
    .map((it) => {
      if (it.kind === 'titlepage') return `<div class="title-page">${titlePageHtml(project)}</div>${opt.paged ? '<div class="pb"></div>' : ''}`;
      if (it.kind === 'toc') return it.entries.length ? tocHtml(it.entries) : '';
      if (it.kind === 'separator') {
        if (it.sep.kind === 'page') return '<div class="pb"></div>';
        if (it.sep.kind === 'space') return '<p class="sep space">&#160;</p>';
        return `<p class="sep">${esc(it.sep.text)}</p>`;
      }
      if (it.kind === 'notes') return endnotesHtml(it.notes);
      const pb = it.pageBreak ? '<div class="pb"></div>' : '';
      const head = it.title ? headingHtml(it, opt.ids) : '';
      let html = it.html;
      if (fn) {
        const r = processNotes(html, fn.list.length + 1, fn.prefix || 'fn');
        fn.list.push(...r.notes);
        html = r.html;
      } else html = processNotes(html).html; // strips comments, keeps nothing else
      return pb + head + html;
    })
    .join('\n');
}

function htmlCss(o, target) {
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
.author{text-align:center;font-style:italic}
p{text-indent:${indent}in;margin:0 0 ${after}pt}${t.noIndentAfterHeading !== false ? ' h1+p,h2+p,h3+p,.sep+p,.pb+p,.toc+p{text-indent:0}' : ''}
.ac{text-align:center}.al{text-align:left}.ar{text-align:right}.sc{font-variant:small-caps}.ch-prefix{font-size:.8em;font-weight:normal}
.sep{text-align:center;margin:1em 0;text-indent:0}
.pb{break-before:page;page-break-before:always}
.toc ol{list-style:none;padding:0}.toc li{text-indent:0}.toc .toc2{margin-left:1.5em}
.notes{page-break-before:always;font-size:.9em}.notes li{text-indent:0}.endnotes{page-break-before:auto}
hr{border:none;page-break-after:always;margin:0}
img{max-width:100%}
${paged && page ? pageCss(page) : ''}
${o.styleCss || ''}`;
}

function compileHtml(project, readDoc, options = {}) {
  const doc = buildDocument(project, readDoc, options);
  const o = doc.options;
  const target = o.target || 'html';
  const fn = { list: [], prefix: 'fn' };
  const body = itemsHtml(doc.items, project, { footnotes: fn, ids: Boolean(o.toc), paged: target === 'pdf' }) + notesHtml(fn.list);
  const title = esc(project.title);
  return `<!doctype html><html lang="${escAttr((o.epub && o.epub.language) || 'ro')}"><head><meta charset="utf-8"><title>${title}</title>
<style>
${htmlCss(o, target)}
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
  const hf = (x) => headerFooterText(x, project, 0);
  const header = hf(page.header);
  const footer = hf(page.footer);
  const has = (x) => Boolean(x.left || x.center || x.right);
  const font = fontStack(o.format.typography.fontFamily).replace(/"/g, "'");
  const tpl = (x) => {
    const part = (s) => esc(s).replace(/&lt;\$p&gt;/g, '<span class="pageNumber"></span>');
    return `<div style="font-family:${font};font-size:8pt;width:100%;margin:0 ${m.outer ?? 1}in 0 ${m.inner ?? 1}in;display:flex;justify-content:space-between"><span>${part(x.left)}</span><span>${part(x.center)}</span><span>${part(x.right)}</span></div>`;
  };
  const showHF = has(header) || has(footer);
  return {
    pageSize: { width: dim.widthIn, height: dim.heightIn },
    margins: { top: m.top ?? 1, bottom: m.bottom ?? 1, left: m.inner ?? 1, right: m.outer ?? 1 },
    printBackground: false,
    preferCSSPageSize: true,
    displayHeaderFooter: showHF,
    headerTemplate: showHF ? tpl(header) : '<span></span>',
    footerTemplate: showHF ? tpl(footer) : '<span></span>',
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

function blocksFor(doc, project, opt = {}) {
  const o = doc.options;
  const noIndentAfter = o.format.typography.noIndentAfterHeading !== false;
  const out = [];
  let afterHeading = true;
  for (const it of doc.items) {
    if (it.kind === 'titlepage') {
      out.push({ type: 'title', align: 'center', runs: [{ text: project.title || '' }] });
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
      for (const x of it.notes) out.push({ type: 'note', n: x.n, noIndent: true, runs: [{ text: `${x.n}. ` }, { text: x.text }] });
      afterHeading = true;
    } else {
      if (it.pageBreak) out.push({ type: 'pagebreak' });
      if (it.title) {
        out.push({ type: `h${it.level}`, align: it.titleAlign || (it.level === 1 && o.format.legacy ? 'center' : null), runs: titleRuns(it), section: it.id });
        afterHeading = true;
      }
      if (it.pageBreak) afterHeading = true;
      let olIndex = 0;
      for (const b of parseBlocks(it.html, o.styles || [], { comments: opt.comments })) {
        if (b.type === 'hr' || b.type.startsWith('h')) afterHeading = true;
        else {
          if (afterHeading && noIndentAfter) b.noIndent = true;
          afterHeading = false;
        }
        if (b.type === 'li' && b.list === 'ol') b.index = ++olIndex;
        else if (b.type !== 'li') olIndex = 0;
        out.push(b);
      }
    }
  }
  // Fold explicit page breaks into the next block.
  const blocks = [];
  let brk = false;
  for (const b of out) {
    if (b.type === 'pagebreak') {
      brk = blocks.length > 0;
      continue;
    }
    if (brk) b.pageBreakBefore = true;
    brk = false;
    blocks.push(b);
  }
  return blocks;
}

function plainRuns(runs) {
  return (runs || []).map((r) => (r.text !== undefined ? r.text : '')).join('');
}

// --- DOCX ----------------------------------------------------------------------------

async function compileDocx(project, readDoc, options = {}) {
  const doc = buildDocument(project, readDoc, options);
  const o = doc.options;
  const t = o.format.typography;
  const page = o.format.legacy ? null : o.format.page;
  const exportComments = o.transforms.comments === 'export';
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, FootnoteReferenceRun, PageBreak, LevelFormat, Header, Footer, Tab, TabStopType, PageNumber, CommentRangeStart, CommentRangeEnd, CommentReference } = docx;
  const footnotes = {};
  let nextFootnote = 1;
  const comments = [];
  const openComments = [];
  const H = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 };
  const ALIGN = { center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED, left: AlignmentType.LEFT };
  const headingFont = t.headingFont || undefined;
  const runsFor = (runs, extra = {}) => {
    const out = [];
    for (const r of runs) {
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
      } else if (r.text === '\n') out.push(new TextRun({ break: 1 }));
      else if (r.text !== undefined) {
        out.push(new TextRun({ text: r.text, bold: r.b, italics: r.i, underline: r.u ? {} : undefined, strike: r.s, superScript: r.sup, subScript: r.sub, smallCaps: r.sc || undefined, ...extra }));
      }
    }
    return out;
  };
  const firstLine = Math.round((Number(t.firstLineIndentIn) || 0) * 1440);
  const after = Math.round((Number(t.paragraphSpacingPt) || 0) * 20);
  const children = [];
  for (const b of blocksFor(doc, project, { comments: exportComments })) {
    const pageBreakBefore = b.pageBreakBefore || undefined;
    if (b.type === 'title') {
      children.push(new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, pageBreakBefore, children: runsFor(b.runs, { font: headingFont }) }));
    } else if (b.type === 'author') {
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, pageBreakBefore, children: runsFor(b.runs) }));
    } else if (b.type === 'hr') {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    } else if (/^h\d$/.test(b.type)) {
      children.push(new Paragraph({ heading: H[b.type[1]] || H[3], alignment: ALIGN[b.align], pageBreakBefore, children: runsFor(b.runs, { font: headingFont }) }));
    } else if (b.type === 'sep' || b.type === 'space') {
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, pageBreakBefore, children: runsFor(b.runs || []) }));
    } else if (b.type === 'toc') {
      children.push(new Paragraph({ indent: { left: (b.level - 1) * 400 }, pageBreakBefore, children: runsFor(b.runs) }));
    } else {
      const styleIndent = b.style && b.style.indent ? Math.round(b.style.indent * 567) : 0;
      const centered = b.align === 'center' || b.align === 'right';
      children.push(
        new Paragraph({
          children: runsFor(b.runs),
          alignment: ALIGN[b.align],
          pageBreakBefore,
          spacing: after ? { after } : undefined,
          indent:
            b.type === 'blockquote' || styleIndent
              ? { left: styleIndent || 567, right: styleIndent || 567 }
              : b.noIndent || centered || b.type === 'li' || !firstLine
                ? undefined
                : { firstLine },
          bullet: b.type === 'li' && b.list !== 'ol' ? { level: 0 } : undefined,
          numbering: b.type === 'li' && b.list === 'ol' ? { reference: 'ordered', level: 0 } : undefined,
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
      config: [{ reference: 'ordered', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START }] }],
    },
    creator: project.author || 'Scribner',
    title: project.title,
    styles: {
      default: { document: { run: { font: t.fontFamily, size: Math.round(t.fontSizePt * 2) }, paragraph: { spacing: { line: Math.round(240 * (t.lineSpacing || 1.5)) } } } },
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
    zip.file('word/settings.xml', xml.replace(/<w:settings([^>]*)>/, '<w:settings$1><w:mirrorMargins/>'));
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
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
    `body{font-family:serif;line-height:1.5}p{text-indent:1.5em;margin:0}h1,h2,h3{text-align:center}${hf}.al{text-align:left}.ar{text-align:right}.sc{font-variant:small-caps}.ch-prefix{font-size:.8em;font-weight:normal}h1+p,h2+p,h3+p,.sep+p{text-indent:0}.sep{text-align:center;text-indent:0;margin:1em 0}hr{border:none;margin:2em 0}.title-page{text-align:center;margin-top:30%}.author{font-style:italic}.cover{text-align:center;margin:0;padding:0}.cover img{max-width:100%;max-height:100%}img{max-width:100%}.notes li{text-indent:0}\n${o.styleCss || ''}`,
  );
  const lang = escAttr(meta.language);
  const xhtml = (title, body, extra = '') =>
    `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}" xml:lang="${lang}"><head><title>${esc(title)}</title><link rel="stylesheet" href="style.css"/>${extra}</head><body>${body}</body></html>`;
  const manifest = [];
  const spine = [];
  // Images: data URIs are invalid in EPUB -> OEBPS/images/imgN.ext
  let imgNo = 0;
  const extractImages = (html) =>
    html.replace(/src="data:([\w/+.-]+);base64,([^"]+)"/g, (all, mime, b64) => {
      const ext = IMAGE_EXT[mime.toLowerCase()];
      if (!ext) return all;
      const name = `images/img${++imgNo}.${ext}`;
      zip.file(`OEBPS/${name}`, Buffer.from(b64, 'base64'));
      manifest.push(`<item id="img${imgNo}" href="${name}" media-type="${mime.toLowerCase() === 'image/jpg' ? 'image/jpeg' : mime.toLowerCase()}"/>`);
      return `src="${name}"`;
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
  chapters.forEach((c, idx) => {
    const fn = { list: [], prefix: 'fn' };
    let body = itemsHtml(c.items, project, { footnotes: fn, ids: false }) + notesHtml(fn.list);
    body = extractImages(body);
    zip.file(`OEBPS/ch${idx + 1}.xhtml`, xhtml(c.title, toXhtml(body)));
    manifest.push(`<item id="ch${idx + 1}" href="ch${idx + 1}.xhtml" media-type="application/xhtml+xml"/>`);
    spine.push(`<itemref idref="ch${idx + 1}"/>`);
  });
  const nav = `<nav epub:type="toc"><h1>Cuprins</h1><ol>${chapters
    .map((c, i) => `<li><a href="ch${i + 1}.xhtml">${esc(c.title)}</a></li>`)
    .join('')}</ol></nav>`;
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
  return html
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
    const key = ['b', 'i', 'u', 's', 'sup', 'sub', 'sc'].filter((k) => r[k]).join('-');
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
      textStyles.set(key, { name: `T_${key}`, props: p.join(' ') });
    }
    return textStyles.get(key).name;
  };
  let noteNo = 0;
  const runsXml = (runs) =>
    (runs || [])
      .map((r) => {
        if (r.footnote !== undefined) {
          const n = ++noteNo;
          return `<text:note text:id="ftn${n}" text:note-class="footnote"><text:note-citation>${n}</text:note-citation><text:note-body><text:p text:style-name="Footnote">${xmlEsc(r.footnote)}</text:p></text:note-body></text:note>`;
        }
        if (r.text === undefined) return '';
        if (r.text === '\n') return '<text:line-break/>';
        const txt = xmlEsc(r.text).replace(/\t/g, '<text:tab/>').replace(/ {2,}/g, (m) => ` <text:s text:c="${m.length - 1}"/>`);
        const st = tStyle(r);
        return st ? `<text:span text:style-name="${st}">${txt}</text:span>` : txt;
      })
      .join('');
  const pStyle = (b, base) => {
    const parts = [base];
    if (b.align && ['center', 'right', 'justify'].includes(b.align)) parts.push(b.align);
    if (b.noIndent && base === 'Text_body') parts.push('noindent');
    if (b.pageBreakBefore) parts.push('break');
    return parts.join('_');
  };
  const pStyles = new Set();
  let bodyXml = '';
  let openList = null;
  const closeList = () => {
    if (openList) bodyXml += '</text:list>';
    openList = null;
  };
  for (const b of blocks) {
    if (b.type !== 'li') closeList();
    if (b.type === 'hr') {
      bodyXml += '<text:p text:style-name="Text_body_break"/>';
      pStyles.add('Text_body_break');
      continue;
    }
    if (/^h\d$/.test(b.type) || b.type === 'title') {
      const lvl = b.type === 'title' ? 1 : Number(b.type[1]);
      const st = pStyle(b, b.type === 'title' ? 'Title' : `Heading_${lvl}`);
      pStyles.add(st);
      bodyXml += b.type === 'title' ? `<text:p text:style-name="${st}">${runsXml(b.runs)}</text:p>` : `<text:h text:style-name="${st}" text:outline-level="${lvl}">${runsXml(b.runs)}</text:h>`;
      continue;
    }
    if (b.type === 'li') {
      const ls = b.list === 'ol' ? 'L_ol' : 'L_ul';
      if (openList !== ls) {
        closeList();
        bodyXml += `<text:list text:style-name="${ls}">`;
        openList = ls;
      }
      bodyXml += `<text:list-item><text:p text:style-name="List_body">${runsXml(b.runs)}</text:p></text:list-item>`;
      continue;
    }
    const base = b.type === 'blockquote' ? 'Quote' : b.type === 'sep' || b.type === 'author' ? 'Center' : 'Text_body';
    const st = pStyle(b, base);
    pStyles.add(st);
    bodyXml += `<text:p text:style-name="${st}">${runsXml(b.runs)}</text:p>`;
  }
  closeList();

  const t = w;
  const indent = `${Number(t.firstLineIndentIn) || 0}in`;
  const lh = `${Math.round((t.lineSpacing || 1.5) * 100)}%`;
  const autoP = [...pStyles]
    .filter((n) => n.includes('_') && /_(center|right|justify|noindent|break)/.test(n))
    .map((n) => {
      const base = n.replace(/_(center|right|justify|noindent|break)/g, '');
      const props = [];
      const al = (/_(center|right|justify)/.exec(n) || [])[1];
      if (al) props.push(`fo:text-align="${al === 'right' ? 'end' : al}"`);
      if (n.includes('_noindent') || al === 'center' || al === 'right') props.push('fo:text-indent="0in"');
      if (n.includes('_break')) props.push('fo:break-before="page"');
      return `<style:style style:name="${n}" style:family="paragraph" style:parent-style-name="${base}"><style:paragraph-properties ${props.join(' ')}/></style:style>`;
    })
    .join('');
  const autoT = [...textStyles.values()].map((s) => `<style:style style:name="${s.name}" style:family="text"><style:text-properties ${s.props}/></style:style>`).join('');
  const NS =
    'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.3"';
  const content = `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS}><office:font-face-decls><style:font-face style:name="${xmlEsc(t.fontFamily)}" svg:font-family="'${xmlEsc(t.fontFamily)}'"/></office:font-face-decls><office:automatic-styles>${autoP}${autoT}<text:list-style style:name="L_ul"><text:list-level-style-bullet text:level="1" text:bullet-char="•"><style:list-level-properties text:list-level-position-and-space-mode="label-alignment"><style:list-level-label-alignment text:label-followed-by="listtab" fo:text-indent="-0.25in" fo:margin-left="0.5in"/></style:list-level-properties></text:list-level-style-bullet></text:list-style><text:list-style style:name="L_ol"><text:list-level-style-number text:level="1" style:num-format="1" style:num-suffix="."><style:list-level-properties text:list-level-position-and-space-mode="label-alignment"><style:list-level-label-alignment text:label-followed-by="listtab" fo:text-indent="-0.25in" fo:margin-left="0.5in"/></style:list-level-properties></text:list-level-style-number></text:list-style></office:automatic-styles><office:body><office:text>${bodyXml}</office:text></office:body></office:document-content>`;
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
  const styles = `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NS}><office:font-face-decls><style:font-face style:name="${xmlEsc(t.fontFamily)}" svg:font-family="'${xmlEsc(t.fontFamily)}'"/><style:font-face style:name="${xmlEsc(hfont)}" svg:font-family="'${xmlEsc(hfont)}'"/></office:font-face-decls><office:styles><style:default-style style:family="paragraph"><style:text-properties style:font-name="${xmlEsc(t.fontFamily)}" fo:font-size="${t.fontSizePt}pt" fo:language="ro" fo:country="RO"/></style:default-style>${ps('Standard', `fo:line-height="${lh}"`)}${ps('Text_body', `fo:text-indent="${indent}" fo:margin-top="0in" fo:margin-bottom="${Number(t.paragraphSpacingPt) || 0}pt"`)}${ps('List_body', 'fo:margin-bottom="0in"')}${ps('Quote', 'fo:margin-left="0.5in" fo:margin-right="0.5in"')}${ps('Center', 'fo:text-align="center" fo:margin-top="0.15in" fo:margin-bottom="0.15in"')}${ps('Footnote', 'fo:line-height="100%"', `fo:font-size="${Math.max(8, t.fontSizePt - 2)}pt"`)}${ps('Header_footer', 'fo:line-height="100%"', `fo:font-size="${Math.max(8, t.fontSizePt - 2)}pt"`)}${ps('Title', 'fo:text-align="center" fo:margin-top="2in" fo:margin-bottom="0.3in"', `style:font-name="${xmlEsc(hfont)}" fo:font-size="${t.fontSizePt + 12}pt" fo:font-weight="bold"`)}${[1, 2, 3]
    .map((l) => ps(`Heading_${l}`, `fo:margin-top="${l === 1 ? 0.6 : 0.3}in" fo:margin-bottom="0.2in" fo:keep-with-next="always"${l === 1 ? ' fo:text-align="center"' : ''}`, `style:font-name="${xmlEsc(hfont)}" fo:font-size="${t.fontSizePt + (l === 1 ? 6 : l === 2 ? 3 : 1)}pt" fo:font-weight="bold"`, 'Standard', ` style:default-outline-level="${l}"`))
    .join('')}</office:styles><office:automatic-styles>${pageLayout}</office:automatic-styles><office:master-styles><style:master-page style:name="Standard" style:page-layout-name="PL">${hdr}</style:master-page></office:master-styles></office:document-styles>`;
  const metaXml = `<?xml version="1.0" encoding="UTF-8"?><office:document-meta ${NS}><office:meta><dc:title>${xmlEsc(project.title)}</dc:title><meta:initial-creator>${xmlEsc(project.author || '')}</meta:initial-creator><dc:language>ro-RO</dc:language><meta:generator>Scribner</meta:generator></office:meta></office:document-meta>`;
  const zip = new JSZip();
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });
  zip.file('content.xml', content);
  zip.file('styles.xml', styles);
  zip.file('meta.xml', metaXml);
  zip.file(
    'META-INF/manifest.xml',
    '<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/></manifest:manifest>',
  );
  return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/vnd.oasis.opendocument.text', compression: 'DEFLATE' });
}

// --- Markdown / MultiMarkdown / plain text ----------------------------------------------

function mdEscape(s) {
  return String(s).replace(/([\\`*_[\]#])/g, '\\$1').replace(/^(\s*)([-+>]|\d+\.)(\s)/, '$1\\$2$3');
}

function mdRuns(runs, notes) {
  let out = '';
  for (const r of runs || []) {
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
  return out;
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
    else if (b.type === 'author') parts.push(`*${plainRuns(b.runs)}*`);
    else if (/^h\d$/.test(b.type)) parts.push(`${'#'.repeat(Number(b.type[1]) + (doc.items[0] && doc.items[0].kind === 'titlepage' ? 1 : 0))} ${text.replace(/ {2}\n/g, ': ')}`);
    else if (b.type === 'hr') parts.push('---');
    else if (b.type === 'sep') parts.push(multi ? `<p align="center">${esc(plainRuns(b.runs))}</p>` : mdEscape(plainRuns(b.runs)));
    else if (b.type === 'space') parts.push('&#160;');
    else if (b.type === 'li') {
      const item = `${b.list === 'ol' ? `${b.index || 1}.` : '-'} ${text}`;
      const prev = parts[parts.length - 1];
      if (prev && prev.__list) {
        parts[parts.length - 1] = Object.assign(new String(`${prev}\n${item}`), { __list: true });
      } else parts.push(Object.assign(new String(item), { __list: true }));
    } else if (b.type === 'blockquote') parts.push(`> ${text}`);
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
    const text = (b.runs || [])
      .map((r) => {
        if (r.footnote !== undefined) {
          notes.push(r.footnote);
          return `[${notes.length}]`;
        }
        return r.text || '';
      })
      .join('');
    if (b.type === 'li') parts.push(`${b.list === 'ol' ? `${b.index || 1}.` : '•'} ${text}`);
    else if (b.type === 'toc') parts.push(`${'  '.repeat(b.level - 1)}${text}`);
    else if (b.type === 'space') parts.push('');
    else if (text.trim()) parts.push(text);
  }
  let out = parts.join('\n\n');
  if (notes.length) out += `\n\n${'_'.repeat(10)}\n${notes.map((n, i) => `[${i + 1}] ${n}`).join('\n')}`;
  return `${out}\n`;
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
