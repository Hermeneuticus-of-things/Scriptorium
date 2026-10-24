// Word / sentence ranges inside one paragraph's text, for right-click actions on unselected text.
const WORD = /[\p{L}\p{M}\p{N}'’-]/u;

// Whether the UTF-16 unit at i belongs to a word; both halves of a surrogate pair answer for the
// whole character (letters outside the BMP).
function isWordUnit(text, i) {
  const c = text.charCodeAt(i);
  let cp = text.codePointAt(i);
  if (c >= 0xdc00 && c <= 0xdfff && i > 0) {
    const h = text.charCodeAt(i - 1);
    if (h >= 0xd800 && h <= 0xdbff) cp = text.codePointAt(i - 1);
  }
  return WORD.test(String.fromCodePoint(cp));
}

/** [start, end) of the word around `offset`, or null when the offset is not on a word. */
export function wordAt(text, offset) {
  let s = offset;
  let e = offset;
  while (s > 0 && isWordUnit(text, s - 1)) s -= 1;
  while (e < text.length && isWordUnit(text, e)) e += 1;
  // A run of two or more hyphens / apostrophes ("cuvânt--altul") is a dash, not part of a word:
  // keep the piece around the offset (the one on the left when the offset is inside the dash).
  const sep = /['’-]{2,}/g;
  const word = text.slice(s, e);
  let m;
  let from = s;
  while ((m = sep.exec(word))) {
    const a = s + m.index;
    const b = a + m[0].length;
    if (b <= offset) from = b;
    else {
      e = a;
      break;
    }
  }
  s = from;
  // Trim leading/trailing apostrophes and hyphens ("'casă'" -> "casă").
  while (s < e && /['’-]/.test(text[s])) s += 1;
  while (e > s && /['’-]/.test(text[e - 1])) e -= 1;
  return e > s ? [s, e] : null;
}

/** [start, end) of the sentence around `offset`, without surrounding spaces. */
export function sentenceAt(text, offset) {
  const end = /[.!?…]+["”»)]*(\s|$)/g;
  let s = 0;
  let m;
  while ((m = end.exec(text))) {
    const stop = m.index + m[0].length;
    if (stop > offset) return trim(text, s, m.index + m[0].trimEnd().length);
    s = stop;
  }
  return trim(text, s, text.length);
}

function trim(text, s, e) {
  while (s < e && /\s/.test(text[s])) s += 1;
  while (e > s && /\s/.test(text[e - 1])) e -= 1;
  return e > s ? [s, e] : null;
}

/**
 * The edits ({ offset, length, text }, from the end of the text backwards) for the chosen replacement of
 * each grammar match. `chosen[i]` is the index of the replacement for matches[i] (-1 = leave). A match
 * that overlaps one already taken (or falls outside the text) is skipped, so overlapping suggestions can
 * never duplicate or garble text.
 */
export function correctionEdits(source, matches, chosen) {
  const edits = [];
  let limit = source.length; // start of the leftmost range taken so far
  matches
    .map((m, i) => ({ m, r: chosen[i] }))
    .filter((x) => x.r >= 0 && x.m.replacements[x.r] !== undefined)
    .sort((a, b) => b.m.offset - a.m.offset || b.m.length - a.m.length)
    .forEach(({ m, r }) => {
      const end = m.offset + m.length;
      if (m.offset < 0 || end > limit) return;
      edits.push({ offset: m.offset, length: m.length, text: m.replacements[r] });
      limit = m.offset;
    });
  return edits;
}

/** `source` with the chosen grammar replacements applied (see correctionEdits). */
export function applyCorrections(source, matches, chosen) {
  return correctionEdits(source, matches, chosen).reduce((out, e) => out.slice(0, e.offset) + e.text + out.slice(e.offset + e.length), source);
}
