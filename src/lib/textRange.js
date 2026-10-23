// Word / sentence ranges inside one paragraph's text, for right-click actions on unselected text.
const WORD = /[\p{L}\p{M}\p{N}'’-]/u;

/** [start, end) of the word around `offset`, or null when the offset is not on a word. */
export function wordAt(text, offset) {
  let s = offset;
  let e = offset;
  while (s > 0 && WORD.test(text[s - 1])) s -= 1;
  while (e < text.length && WORD.test(text[e])) e += 1;
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
