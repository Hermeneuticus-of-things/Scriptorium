import { describe, it, expect } from 'vitest';
import { wordAt, sentenceAt } from '../src/lib/textRange.js';

const pick = (t, r) => (r ? t.slice(r[0], r[1]) : null);
describe('word and sentence under the cursor', () => {
  const t = 'Era o dimineață rece. „Unde mergi?” a întrebat-o Ilinca! Apoi tăcu…';
  it('finds the word with diacritics and hyphens', () => {
    expect(pick(t, wordAt(t, t.indexOf('dimineață') + 3))).toBe('dimineață');
    expect(pick(t, wordAt(t, t.indexOf('întrebat-o') + 2))).toBe('întrebat-o');
    expect(wordAt(t, t.indexOf('. „') + 1)).toBe(null);
  });
  it('finds the sentence, including closing quotes', () => {
    expect(pick(t, sentenceAt(t, 2))).toBe('Era o dimineață rece.');
    expect(pick(t, sentenceAt(t, t.indexOf('Unde')))).toBe('„Unde mergi?”');
    expect(pick(t, sentenceAt(t, t.indexOf('Ilinca')))).toBe('a întrebat-o Ilinca!');
    expect(pick(t, sentenceAt(t, t.length - 2))).toBe('Apoi tăcu…');
  });
});
