// Auto-replacement and sentence capitalization helpers for the editor.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isWordChar = (c) => /[\p{L}\p{N}_]/u.test(c);

/** Applies [{from,to}] replacements; word-like edges require word boundaries (Unicode-aware). */
export function applyReplacements(text, list = []) {
  let out = String(text ?? '');
  for (const r of list || []) {
    if (!r || !r.from) continue;
    const pre = isWordChar(r.from[0]) ? '(?<![\\p{L}\\p{N}_])' : '';
    const post = isWordChar(r.from[r.from.length - 1]) ? '(?![\\p{L}\\p{N}_])' : '';
    const re = new RegExp(`${pre}${escapeRe(r.from)}${post}`, 'gu');
    out = out.replace(re, () => r.to ?? '');
  }
  return out;
}

/** Capitalizes the first letter of the text and after . ! ? … followed by whitespace. */
export function capitalizeSentences(text) {
  return String(text ?? '').replace(/(^|[.!?…]\s+)([„"«(]?)(\p{Ll})/gu, (_m, a, q, c) => a + q + c.toUpperCase());
}

/** Convenience: replacements then (optionally) capitalization. */
export function autoReplace(text, { replacements = [], capitalize = false } = {}) {
  const r = applyReplacements(text, replacements);
  return capitalize ? capitalizeSentences(r) : r;
}

/** Parses "from => to" lines (or "from\tto") into a list. */
export function parseReplacementLines(src) {
  return String(src || '')
    .split('\n')
    .map((l) => l.split(/\s*=>\s*|\t/))
    .filter((p) => p.length >= 2 && p[0].trim())
    .map(([from, ...rest]) => ({ from: from.trim(), to: rest.join(' ').trim() }));
}
