// Learned corrections: when the writer replaces a misspelled word by hand (or picks a spelling
// suggestion), the pair goes into the auto-replacements so the same typo is fixed while typing
// next time. Entries carry `learned: true`; they match case-insensitively and keep the case of
// what was typed (see correctionFor in src/editor/corrections.js).

export const MAX_LEARNED = 2000;
const WORD = /^[\p{L}][\p{L}\p{M}'’-]*$/u;

const fold = (w) => w.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Optimal string alignment distance (Damerau-Levenshtein with adjacent swaps), stops past `max`.
export function editDistance(a, b, max = Infinity) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

/**
 * True when replacing `from` by `to` looks like fixing a typo, not changing the word:
 * two single words, different beyond letter case, and close (missing diacritics, a swapped,
 * missing or extra letter; about one edit per four letters).
 */
export function isTypoFix(from, to) {
  const a = String(from || '').trim();
  const b = String(to || '').trim();
  if (a.length < 2 || b.length < 2 || !WORD.test(a) || !WORD.test(b)) return false;
  if (a.toLowerCase() === b.toLowerCase()) return false;
  if (fold(a) === fold(b)) return true; // diacritics only: "fata" → "față"
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  const max = Math.max(1, Math.floor(Math.max(la.length, lb.length) / 4));
  return editDistance(la, lb, max) <= max;
}

/**
 * New auto-replacement list with from → to learned. Keys are lower case; an entry for the same
 * word is updated, and an entry that would undo this one (to → from) is dropped.
 * Returns null when nothing changes.
 */
export function learnCorrection(list, from, to) {
  if (!isTypoFix(from, to)) return null;
  const f = from.trim().toLowerCase();
  const t = to.trim().toLowerCase();
  const cur = Array.isArray(list) ? list : [];
  // A replacement the writer typed in Settings for this word wins over learning.
  if (cur.some((r) => r && !r.learned && r.from && r.from.toLowerCase() === f)) return null;
  if (cur.some((r) => r && r.learned && r.from === f && r.to === t)) return null;
  const rest = cur.filter((r) => !(r && r.learned && (r.from === f || (r.from === t && r.to === f))));
  const out = [...rest, { from: f, to: t, learned: true }];
  // Oldest learned entries go first when the list is full; typed ones are never dropped.
  let extra = out.filter((r) => r.learned).length - MAX_LEARNED;
  return extra > 0 ? out.filter((r) => !(r.learned && extra-- > 0)) : out;
}

/** "teh" typed as "Teh" or "TEH" → "The" / "THE". */
export function matchCase(typed, to) {
  if (typed.length > 1 && typed === typed.toLocaleUpperCase() && typed !== typed.toLocaleLowerCase()) return to.toLocaleUpperCase();
  if (typed[0] && typed[0] === typed[0].toLocaleUpperCase() && typed[0] !== typed[0].toLocaleLowerCase()) return to[0].toLocaleUpperCase() + to.slice(1);
  return to;
}
