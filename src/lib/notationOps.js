// Pure HTML operations on notation (Scrivener 3 §18.4.1 strip, §18.4.5 convert),
// for document-wide and project-wide passes (the editor-level counterpart is
// src/lib/noteConvert.js, which works on a ProseMirror state instead).
//
// Markup model, shared with the editor extensions (src/editor/extensions.js) and
// Compile (lib/compile.cjs):
//   inline annotation  <span data-annotation="note" class="annotation">…</span>  (atom, note in the attribute)
//   comment            <span data-comment="note" class="comment">anchor</span>   (mark over the anchored text)
//   inline footnote    <span data-footnote="note" class="footnote"></span>       (atom, note in the attribute)
//   linked footnote    <span data-linked-footnote="note" class="linked-footnote">anchor</span>
//   revision           <span data-revision="N">text</span>                       (mark over the revised text)
//
// Strip reuses Compile's exact segment regexes (processNotes/cleanMarkup), so a
// stripped document compiles the same as one compiled with the marks removed.
// Because those are lazy `[\s\S]*?</span>` matches, a mark whose anchored text
// itself contains nested <span>s (styles inside a comment) is cut at the first
// closing tag — the same limitation Compile already lives with, and the editor
// re-normalizes the stray tag on the next load. Atom kinds (annotation, footnote)
// are stripped before the unwrapped kinds (revision, comment, linked footnote),
// since atoms can sit inside marked ranges.

// Atom patterns capture the note (needed by convertNotation; harmless for strip).
const ATOM_RES = {
  annotations: /<span[^>]*data-annotation="([^"]*)"[^>]*>[\s\S]*?<\/span>/g,
  footnotes: /<span[^>]*data-footnote="([^"]*)"[^>]*>[\s\S]*?<\/span>/g,
};

// Mark patterns capture (note, anchored text) for convertNotation; revisions only unwrap.
const UNWRAP_RES = {
  revisions: /<span[^>]*data-revision="[^"]*"[^>]*>([\s\S]*?)<\/span>/g,
  comments: /<span[^>]*data-comment="([^"]*)"[^>]*>([\s\S]*?)<\/span>/g,
  linkedFootnotes: /<span[^>]*data-linked-footnote="([^"]*)"[^>]*>([\s\S]*?)<\/span>/g,
};

/**
 * Removes notation markup while keeping the surrounding (and, for marks, the
 * anchored) text. `revisions` defaults to false: revision colouring is a drafting
 * aid the §18.4.1 command only removes when explicitly asked to.
 */
export function stripNotation(html, opts = {}) {
  const o = { annotations: true, comments: true, footnotes: true, revisions: false, ...opts };
  let out = String(html || '');
  const counts = { annotations: 0, comments: 0, footnotes: 0, linkedFootnotes: 0, revisions: 0 };
  // Atoms first (they carry no body text, and can be nested inside the marks below).
  if (o.annotations) out = out.replace(ATOM_RES.annotations, () => (counts.annotations++, ''));
  if (o.footnotes) {
    out = out.replace(ATOM_RES.footnotes, () => (counts.footnotes++, ''));
    out = out.replace(UNWRAP_RES.linkedFootnotes, (_m, _note, anchor) => (counts.linkedFootnotes++, anchor));
  }
  // Unwraps: revisions before the note marks, since a revision span can sit inside them.
  if (o.revisions) out = out.replace(UNWRAP_RES.revisions, (_m, text) => (counts.revisions++, text));
  if (o.comments) out = out.replace(UNWRAP_RES.comments, (_m, _note, text) => (counts.comments++, text));
  return { html: out, counts };
}

// --- conversion (§18.4.5) ---------------------------------------------------------------

// Word runs: letters/digits plus the Romanian apostrophes, as in noteConvert.js.
const WORD_BEFORE = /([\p{L}\p{N}’'-]+)[\s\p{P}]*$/u;
const WORD_AFTER = /^[\s\p{P}]*([\p{L}\p{N}’'-]+)/u;
// The editor converter anchors only on a word of the same paragraph; in HTML a
// block boundary is where that search stops.
const BLOCK_END_RE = /<\/(?:p|h[1-6]|li|blockquote|div)\s*>\s*$/i;
const BLOCK_START_RE = /^\s*<(?:p|h[1-6]|li|blockquote|div)\b/i;

// Last plain-text word before position `end`, or null (tag boundary, entity
// fragment, none). Returns the word and the offset of its first character.
function wordBefore(html, end) {
  const prefix = html.slice(0, end);
  if (BLOCK_END_RE.test(prefix)) return null;
  const cut = prefix.lastIndexOf('>') + 1; // 0 when there is no tag: the prefix is plain text
  const tail = prefix.slice(cut);
  const m = WORD_BEFORE.exec(tail);
  if (!m) return null;
  const start = cut + m.index;
  // An entity run (&amp;, &#8217;) must never be wrapped: an '&' still open
  // (no ';' since) means the word chars are part of it.
  const before = tail.slice(0, m.index);
  if (before.lastIndexOf('&') > before.lastIndexOf(';')) return null;
  return { start, word: m[1] };
}

// First plain-text word after position `start` (same block), or null.
function wordAfter(html, start) {
  const suffix = html.slice(start);
  if (BLOCK_START_RE.test(suffix)) return null;
  const t = (/^([^<]*)/.exec(suffix) || ['', ''])[1];
  const m = WORD_AFTER.exec(t);
  if (!m) return null;
  const from = start + m.index + (m[0].length - m[1].length); // skip the leading punct run
  if (t.slice(0, from - start).includes('&')) return null; // skip was cut inside an entity
  return { from, to: from + m[1].length, word: m[1] };
}

// Conversions the data model actually supports: the two inline atoms swap with
// their mark counterpart (annotation<->comment, footnote<->linked footnote) —
// all four live inside the document HTML, so both directions are real swaps.
// Cross-kind conversions (annotation->footnote) would change the note's kind,
// not just its shape, and are deliberately not offered.
const ATOMS = {
  'inline-annotation': { re: ATOM_RES.annotations, atom: (note) => `<span data-annotation="${note}" class="annotation">${note}</span>` },
  'inline-footnote': { re: ATOM_RES.footnotes, atom: (note) => `<span data-footnote="${note}" class="footnote"></span>` },
};
const MARKS = {
  comment: { re: UNWRAP_RES.comments, mark: (note) => `<span data-comment="${note}" class="comment">` },
  'linked-footnote': { re: UNWRAP_RES.linkedFootnotes, mark: (note) => `<span data-linked-footnote="${note}" class="linked-footnote">` },
};
export const CONVERSIONS = [
  ['inline-annotation', 'comment'],
  ['comment', 'inline-annotation'],
  ['inline-footnote', 'linked-footnote'],
  ['linked-footnote', 'inline-footnote'],
];

// Atom -> mark: the note becomes the mark's attribute over the word before the
// atom (or, when none in the same block, the word after) — the same anchoring
// rule as noteConvert.js inlineToLinked. Matches are re-anchored from the end so
// earlier offsets stay valid.
function atomsToMarks(html, spec) {
  let out = html;
  let count = 0;
  for (const { 0: m, 1: note, index } of [...out.matchAll(spec.re)].reverse()) {
    const before = wordBefore(out, index);
    if (before) {
      out = out.slice(0, before.start) + spec.mark(note) + before.word + '</span>' + out.slice(before.start + before.word.length, index) + out.slice(index + m.length);
    } else {
      const after = wordAfter(out, index + m.length);
      if (!after) continue; // nowhere to anchor: the atom is left untouched
      out = out.slice(0, index) + out.slice(index + m.length, after.from) + spec.mark(note) + after.word + '</span>' + out.slice(after.to);
    }
    count++;
  }
  return { html: out, count };
}

// Mark -> atom: the anchored text stays in the body; the atom with the note is
// inserted right after the range (noteConvert.js linkedToInline).
function marksToAtoms(html, spec) {
  let count = 0;
  const out = html.replace(spec.re, (_m, note, anchor) => {
    count++;
    return anchor + spec.atom(note);
  });
  return { html: out, count };
}

/**
 * Converts every notation of kind `from` into kind `to`. Supported pairs
 * (CONVERSIONS): inline-annotation<->comment, inline-footnote<->linked-footnote.
 * Returns { html, count } — count 0 leaves the html unchanged.
 */
export function convertNotation(html, from, to) {
  if (!CONVERSIONS.some(([a, b]) => a === from && b === to)) throw new Error(`Unsupported notation conversion: ${from} -> ${to}`);
  const src = String(html || '');
  const atom = ATOMS[from]; // inline -> linked
  if (atom) return atomsToMarks(src, { re: atom.re, mark: MARKS[to].mark });
  const mark = MARKS[from]; // linked -> inline
  return marksToAtoms(src, { re: mark.re, atom: ATOMS[to].atom });
}
