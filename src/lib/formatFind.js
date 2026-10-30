// Find by Formatting detectors over editor HTML strings (Scrivener 3 §11.6.7–11.6.10):
// character formats, links, images and preserved (verbatim) text. Parsing uses the same
// tag/text segment approach as search.js, so the detectors run in Node tests as well as
// in the renderer: FormatFind shows the hit count from here (editor.getHTML()) while
// navigation stays on the ProseMirror ranges from findFormatting.
// Preserved formatting (§11.6.10) has no dedicated mark in the schema — the inline
// <code> mark (and the codeBlock it serializes inside) is the verbatim text we have.

import { segments, decode, BLOCK_END } from './search.js';

// Context length for the before/after snippets, like findInHtml.
const CONTEXT = 40;

export const CHAR_FORMATS = ['bold', 'italic', 'underline', 'strike', 'superscript', 'subscript'];

// Tiptap mark → serialized tag. The extra tags are aliases accepted in imported HTML.
const CHAR_TAG = {
  bold: ['strong', 'b'],
  italic: ['em', 'i'],
  underline: ['u'],
  strike: ['s', 'del', 'strike'],
  superscript: ['sup'],
  subscript: ['sub'],
};
const TAG_FORMAT = new Map(Object.entries(CHAR_TAG).flatMap(([f, tags]) => tags.map((tg) => [tg, f])));

const tagName = (tag) => {
  const m = /^<\/?([a-zA-Z][a-zA-Z0-9-]*)/.exec(tag);
  return m ? m[1].toLowerCase() : '';
};
const isOpen = (tag) => !tag.startsWith('</');

/** One attribute value of a serialized open tag ("" when absent). */
function attr(tag, name) {
  const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? (m[2] ?? m[3] ?? m[4] ?? '') : '';
}

// Nearest text before/after segment i; block tags break adjacency, '…' marks truncation.
function around(segs, i, context = CONTEXT) {
  let before = '';
  for (let j = i - 1; j >= 0; j--) {
    const s = segs[j];
    if (s.tag) {
      if (BLOCK_END.test(s.s)) break;
      continue;
    }
    before = (s.s.length > context ? '…' : '') + s.s.slice(-context);
    break;
  }
  let after = '';
  for (let j = i + 1; j < segs.length; j++) {
    const s = segs[j];
    if (s.tag) {
      if (BLOCK_END.test(s.s)) break;
      continue;
    }
    after = s.s.slice(0, context) + (s.s.length > context ? '…' : '');
    break;
  }
  return { before, after };
}

// Text runs with their active character formats: [{ text, formats:Set, i }] (segment index).
function charRuns(html) {
  const runs = [];
  const open = [];
  const segs = segments(html);
  segs.forEach((seg, i) => {
    if (seg.tag) {
      const f = TAG_FORMAT.get(tagName(seg.s));
      if (!f) return;
      if (isOpen(seg.s)) open.push(f);
      else {
        const at = open.lastIndexOf(f);
        if (at >= 0) open.splice(at, 1);
      }
      return;
    }
    if (seg.s) runs.push({ text: seg.s, formats: new Set(open), i });
  });
  return { segs, runs };
}

/** §11.6.7 — runs carrying the wanted character format (format null/unknown = any of the six). */
export function hasCharFormat(html, { format = null } = {}) {
  const { runs } = charRuns(html);
  const hits = runs.filter((r) => (CHAR_FORMATS.includes(format) ? r.formats.has(format) : r.formats.size > 0));
  return { found: hits.length > 0, count: hits.length };
}

/** §11.6.7 — [{before, match, after}] for each run with the wanted format. */
export function charFormatOccurrences(html, { format = null, context = CONTEXT } = {}) {
  const { segs, runs } = charRuns(html);
  return runs
    .filter((r) => (CHAR_FORMATS.includes(format) ? r.formats.has(format) : r.formats.size > 0))
    .map((r) => ({ ...around(segs, r.i, context), match: r.text }));
}

// Links in document order: [{ href, text, i, endI }] (segment indexes of <a> and </a>).
function linkHits(html) {
  const hits = [];
  const segs = segments(html);
  let open = null;
  segs.forEach((seg, i) => {
    if (seg.tag) {
      if (tagName(seg.s) !== 'a') return;
      if (isOpen(seg.s)) {
        if (!open) open = { href: attr(seg.s, 'href'), text: '', i };
      } else if (open) {
        hits.push({ ...open, endI: i });
        open = null;
      }
      return;
    }
    if (open) open.text += seg.s;
  });
  if (open) hits.push({ ...open, endI: segs.length - 1 });
  return hits;
}

/** §11.6.8 — links, optionally narrowed to those whose URL or anchor text contains query. */
export function hasLink(html, { query = null } = {}) {
  const q = (query || '').toLowerCase();
  const hits = linkHits(html).filter((l) => !q || l.href.toLowerCase().includes(q) || l.text.toLowerCase().includes(q));
  return { found: hits.length > 0, count: hits.length };
}

/** §11.6.8 — [{before, match, after, href}] with match = the anchor text. */
export function linkOccurrences(html, { query = null, context = CONTEXT } = {}) {
  const q = (query || '').toLowerCase();
  const segs = segments(html);
  return linkHits(html)
    .filter((l) => !q || l.href.toLowerCase().includes(q) || l.text.toLowerCase().includes(q))
    .map((l) => ({ before: around(segs, l.i, context).before, match: l.text, after: around(segs, l.endI, context).after, href: l.href }));
}

// Images in document order: [{ src, alt, i }].
function imgHits(html) {
  const hits = [];
  segments(html).forEach((seg, i) => {
    if (seg.tag && /^<img\b/i.test(seg.s)) hits.push({ src: attr(seg.s, 'src'), alt: attr(seg.s, 'alt'), i });
  });
  return hits;
}

/** §11.6.9 — images, optionally narrowed to those whose src or alt contains query. */
export function hasImage(html, { query = null } = {}) {
  const q = (query || '').toLowerCase();
  const hits = imgHits(html).filter((im) => !q || im.src.toLowerCase().includes(q) || im.alt.toLowerCase().includes(q));
  return { found: hits.length > 0, count: hits.length };
}

/** §11.6.9 — [{before, match, after, src, alt}] with match = src (fallback alt). */
export function imageOccurrences(html, { query = null, context = CONTEXT } = {}) {
  const q = (query || '').toLowerCase();
  const segs = segments(html);
  return imgHits(html)
    .filter((im) => !q || im.src.toLowerCase().includes(q) || im.alt.toLowerCase().includes(q))
    .map((im) => ({ ...around(segs, im.i, context), match: im.src || im.alt, src: im.src, alt: im.alt }));
}

// Text inside <code> (inline code mark; codeBlock serializes as <pre><code>): [{ text, i }].
function codeRuns(html) {
  const segs = segments(html);
  const runs = [];
  let depth = 0;
  segs.forEach((seg, i) => {
    if (seg.tag) {
      if (tagName(seg.s) === 'code') depth = Math.max(0, depth + (isOpen(seg.s) ? 1 : -1));
      return;
    }
    if (depth > 0 && seg.s) runs.push({ text: seg.s, i });
  });
  return { segs, runs };
}

/** §11.6.10 — preserved (verbatim) text: runs inside <code>. */
export function hasPreserve(html) {
  const { runs } = codeRuns(html);
  return { found: runs.length > 0, count: runs.length };
}

/** §11.6.10 — [{before, match, after}] for each preserved run. */
export function preserveOccurrences(html, { context = CONTEXT } = {}) {
  const { segs, runs } = codeRuns(html);
  return runs.map((r) => ({ ...around(segs, r.i, context), match: r.text }));
}

/** Dispatcher: {found, count} for the §11.6.7–11.6.10 kinds (unknown kind = not found). */
export function hasFormatting(html, kind, opts = {}) {
  if (kind === 'charFormat') return hasCharFormat(html, opts);
  if (kind === 'link') return hasLink(html, opts);
  if (kind === 'image') return hasImage(html, opts);
  if (kind === 'preserve') return hasPreserve(html);
  return { found: false, count: 0 };
}

/** Dispatcher: snippets for the §11.6.7–11.6.10 kinds. */
export function formattingOccurrences(html, kind, opts = {}) {
  if (kind === 'charFormat') return charFormatOccurrences(html, opts);
  if (kind === 'link') return linkOccurrences(html, opts);
  if (kind === 'image') return imageOccurrences(html, opts);
  if (kind === 'preserve') return preserveOccurrences(html, opts);
  return [];
}
