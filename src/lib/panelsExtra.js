// Pure helpers for the Inspector/Binder/Corkboard/Outline/Targets/History/Statistics
// panels (batch C). No DOM: everything works on strings so it runs in node tests.
import { tagText, POS_CLASSES } from './pos.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s) => String(s ?? '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? unesc(m[1]) : '';
};
const stripTags = (s) => unesc(String(s).replace(/<[^>]+>/g, ''));

// Locate every <span data-comment> element: [{start, openEnd, closeStart, end, open}].
function findCommentSpans(html) {
  const out = [];
  const re = /<span\b[^>]*\sdata-comment="[^"]*"[^>]*>/g;
  let m;
  while ((m = re.exec(html))) {
    const openEnd = m.index + m[0].length;
    const tagRe = /<\/?span\b[^>]*>/g;
    tagRe.lastIndex = openEnd;
    let depth = 1;
    let t;
    while (depth && (t = tagRe.exec(html))) depth += t[0][1] === '/' ? -1 : 1;
    if (depth) break;
    out.push({ start: m.index, openEnd, closeStart: t.index, end: t.index + t[0].length, open: m[0] });
    re.lastIndex = openEnd;
  }
  return out;
}

// A comment over mixed formatting is stored as sibling spans with the same attributes
// ("<span c>plain </span><strong><span c>bold</span></strong>"): those spans are one comment.
const SAME_ATTRS = ['data-comment', 'data-comment-color', 'data-comment-author', 'data-author', 'data-comment-date'];
const ONLY_FORMATTING = /^(?:<\/?(?:strong|b|em|i|u|s|sub|sup|mark|code|span)(?:\s[^>]*)?>)*$/;
function commentGroups(src) {
  const groups = [];
  for (const sp of findCommentSpans(src)) {
    const last = groups[groups.length - 1];
    const prev = last && last[last.length - 1];
    if (prev && sp.start >= prev.end && ONLY_FORMATTING.test(src.slice(prev.end, sp.start)) && SAME_ATTRS.every((a) => attr(prev.open, a) === attr(sp.open, a))) last.push(sp);
    else groups.push([sp]);
  }
  return groups;
}

/** Comments in a document: [{index, text, on, color, author, date}]. */
export function parseComments(html) {
  const src = String(html || '');
  return commentGroups(src).map((g, index) => {
    const s = g[0];
    return {
      index,
      text: attr(s.open, 'data-comment'),
      on: g.map((x) => stripTags(src.slice(x.openEnd, x.closeStart))).join(''),
      color: attr(s.open, 'data-comment-color'),
      // data-author: written by older versions (and the MCP server before 0.7.2); the editor reads both.
      author: attr(s.open, 'data-comment-author') || attr(s.open, 'data-author'),
      date: attr(s.open, 'data-comment-date'),
    };
  });
}

/**
 * Edit (patch = {text?, color?, author?, date?}) or delete (patch = null, keeps the
 * commented text) the comment number `index` (every span it is made of). Returns the new HTML.
 */
export function updateComment(html, index, patch) {
  let src = String(html || '');
  const group = commentGroups(src)[index];
  if (!group) return src;
  // Last span first: earlier offsets stay valid.
  for (const s of [...group].reverse()) src = updateSpan(src, s, patch);
  return src;
}

function updateSpan(src, s, patch) {
  if (patch === null) return src.slice(0, s.start) + src.slice(s.openEnd, s.closeStart) + src.slice(s.end);
  let open = s.open;
  const map = { text: 'data-comment', color: 'data-comment-color', author: 'data-comment-author', date: 'data-comment-date' };
  for (const [k, name] of Object.entries(map)) {
    if (!(k in patch)) continue;
    const v = patch[k];
    const re = new RegExp(`\\s${name}="[^"]*"`);
    if (v === '' || v == null) open = k === 'text' ? open.replace(re, ` ${name}=""`) : open.replace(re, '');
    else if (re.test(open)) open = open.replace(re, ` ${name}="${esc(v)}"`);
    else open = open.replace(/>$/, ` ${name}="${esc(v)}">`);
    if (k === 'text') open = /\stitle="/.test(open) ? open.replace(/\stitle="[^"]*"/, ` title="${esc(v)}"`) : open;
  }
  return src.slice(0, s.start) + open + src.slice(s.openEnd);
}

/**
 * Footnotes of a document in text order: inline markers (<span data-footnote="…">) and
 * linked footnotes (<span data-linked-footnote="…">anchor</span>).
 * [{index, kind: 'inline'|'linked', text, on, before}] (on = anchor text, before = text just before).
 */
export function parseFootnotes(html) {
  const src = String(html || '');
  const out = [];
  const re = /<span\b[^>]*\sdata-(linked-)?footnote="([^"]*)"[^>]*>([\s\S]*?)<\/span>/g;
  let m;
  while ((m = re.exec(src))) {
    const before = stripTags(src.slice(Math.max(0, m.index - 400), m.index)).replace(/\s+/g, ' ');
    out.push({ index: out.length, kind: m[1] ? 'linked' : 'inline', text: unesc(m[2]), on: stripTags(m[3]), before: before.slice(-60).trimStart() });
  }
  return out;
}

/**
 * OPML outline items ({title, synopsis, label, status, children} from lib/importers.cjs importOpml)
 * → binder nodes. Label and status names are kept only when the project defines them.
 * makeNode(type, title) creates a node (src/lib/text.js newNode or lib/store.cjs newNode).
 */
export function opmlToNodes(items, project, makeNode, fallbackTitle = 'Fără titlu') {
  const labels = new Set((project.labels || []).map((l) => l.name));
  const statuses = new Set(project.statuses || []);
  const build = (it) => {
    const kids = (it.children || []).map(build);
    const node = makeNode(kids.length ? 'folder' : 'text', it.title || fallbackTitle);
    if (it.synopsis) node.synopsis = it.synopsis;
    if (it.label && labels.has(it.label)) node.label = it.label;
    if (it.status && statuses.has(it.status)) node.status = it.status;
    if (kids.length) node.children = kids;
    return node;
  };
  return (items || []).map(build);
}

/**
 * Binder item for a file stored in the project's media/ folder (image, PDF, audio, video…):
 * type 'file' (what the Binder, Compile and the exporters treat as media), kept out of Compile.
 * makeNode(type, title) creates the base node.
 */
export function mediaNode(makeNode, { id, title, media }) {
  return { ...makeNode('text', title), id, type: 'file', media, includeInCompile: false };
}

/** Group daily history rows ({date:'YYYY-MM-DD', draft, total, draftChars?, totalChars?}) by month. */
export function monthlyHistory(rows) {
  const by = new Map();
  for (const r of rows || []) {
    const month = String(r.date).slice(0, 7);
    const m = by.get(month) || { month, draft: 0, total: 0, chars: 0, days: 0 };
    m.draft += Number(r.draft) || 0;
    m.total += Number(r.total) || 0;
    m.chars += Number(r.draftChars) || 0;
    if ((Number(r.draft) || 0) > 0) m.days += 1;
    by.set(month, m);
  }
  return [...by.values()].sort((a, b) => a.month.localeCompare(b.month));
}

const POS_LABELS = Object.fromEntries([...POS_CLASSES, ['other', 'Altele (prepoziții, articole, interjecții)']]);

/** Part-of-speech distribution of a text: [{tag, label, count, percent}] sorted by count. */
export function posDistribution(text, lang = 'ro') {
  const counts = {};
  const tags = tagText(text, lang);
  for (const t of tags) counts[t.tag] = (counts[t.tag] || 0) + 1;
  const total = tags.length || 1;
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, label: POS_LABELS[tag] || tag, count, percent: Math.round((count / total) * 1000) / 10 }))
    .sort((a, b) => b.count - a.count);
}

/** Pages for a word/character count (Scrivener-like defaults). */
export function toPages(count, unit = 'Words', perPage = unit === 'Characters' ? 1800 : 250) {
  return Math.ceil((Number(count) || 0) / Math.max(1, perPage));
}

/** Measure an amount in a target unit: {words, chars} -> number of Words | Characters | Pages. */
export function measure({ words = 0, chars = 0 } = {}, unit = 'Words', wordsPerPage = 250) {
  if (unit === 'Characters') return chars;
  if (unit === 'Pages') return toPages(words, 'Words', wordsPerPage);
  return words;
}

/** True when a count crosses the target between two measurements (for one-shot notifications). */
export function targetCrossed(prev, next, target) {
  return Boolean(target > 0 && prev < target && next >= target);
}

/** Ids of every node with children (for Expand all / Collapse all). */
export function containerIds(tree) {
  const out = [];
  const walk = (ns) => (ns || []).forEach((n) => {
    if (n.children) {
      out.push(n.id);
      walk(n.children);
    }
  });
  walk(tree);
  return out;
}

/** Corkboard card height from width and ratio ('3:5', '1:1', '4:3'…). */
export function cardHeight(width, ratio = '3:5') {
  const [h, w] = String(ratio).split(':').map(Number);
  if (!h || !w) return Math.round(width * 0.6);
  return Math.round((width * h) / w);
}

/** Drag ids: the whole selection when the dragged item is part of it, else just the item. */
export function dragIds(id, selectedIds) {
  const sel = selectedIds ? [...selectedIds] : [];
  return sel.length > 1 && sel.includes(id) ? sel : [id];
}

/** Turn a scratchpad note into a project document: {title, html}. */
export function noteToDocument(note) {
  const title = String(note?.title || '').trim() || 'Notă din ciorne';
  const paras = String(note?.text || '').split(/\n{2,}|\r?\n/).map((p) => p.trim()).filter(Boolean);
  const html = paras.length ? paras.map((p) => `<p>${esc(p)}</p>`).join('') : '<p></p>';
  return { title, html };
}

/** Mix a label colour into an icon tint (CSS colour) or null. */
export function iconTint(iconColor, labelColor, useLabel) {
  return iconColor || (useLabel && labelColor) || null;
}
