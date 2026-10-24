// Snapshot comparison at a chosen granularity: word, phrase, sentence or paragraph.
// Coarser levels mark whole units as changed, which reads better for heavy rewrites.
import { diffArrays, diffWords } from 'diff';

export const DIFF_LEVELS = ['word', 'phrase', 'sentence', 'paragraph'];

const SPLITTERS = {
  // a unit ends after punctuation (or a line end) plus the whitespace that follows it
  phrase: /(?<=[,;:.!?…—–]["”»’)]*\s+|\n+)/u,
  sentence: /(?<=[.!?…]["”»’)]*\s+|\n+)/u,
  paragraph: /(?<=\n+)/u,
};

export function tokenize(text, level) {
  const re = SPLITTERS[level];
  if (!re) throw new Error(`unknown diff level: ${level}`);
  return String(text || '').split(re).filter((s) => s !== '');
}

// Returns [{value, added?, removed?}] like the `diff` package, adjacent parts merged.
export function diffText(a, b, level = 'word') {
  if (level === 'word' || !SPLITTERS[level]) return diffWords(a || '', b || '');
  const parts = diffArrays(tokenize(a, level), tokenize(b, level));
  return parts.map((p) => ({ value: p.value.join(''), added: Boolean(p.added), removed: Boolean(p.removed) }));
}
