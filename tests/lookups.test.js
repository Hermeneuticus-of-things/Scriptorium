import { describe, it, expect } from 'vitest';
import { lookupUrl, lookupGroups, MAX_WORD } from '../src/lib/lookups.js';

describe('selection lookups', () => {
  it('DeepL keeps the whole phrase and escapes its field separators', () => {
    const url = lookupUrl('deepl', 'He said: yes/no | maybe', { from: 'en', to: 'ro' });
    expect(url.startsWith('https://www.deepl.com/translator#en/ro/')).toBe(true);
    expect(decodeURIComponent(url.split('/ro/')[1])).toBe('He said: yes\\/no \\| maybe');
  });
  it('dictionaries take a word or short phrase, translation a long one', () => {
    const long = 'cuvânt '.repeat(30);
    expect(long.trim().length).toBeGreaterThan(MAX_WORD);
    expect(lookupUrl('dictionary', long)).toBe('');
    expect(lookupUrl('deepl', long)).not.toBe('');
    const g = lookupGroups(long);
    expect(g.dict).toHaveLength(0);
    expect(g.translate.map((x) => x.kind)).toEqual(['deepl', 'googleTranslate']);
  });
  it('dexonline encodes diacritics; Linguee and IATE follow the language pair', () => {
    expect(lookupUrl('dictionary', 'casă')).toBe('https://dexonline.ro/definitie/cas%C4%83');
    expect(lookupUrl('linguee', 'bark', { from: 'auto', to: 'ro' })).toContain('/english-romanian/');
    expect(lookupUrl('linguee', 'Haus', { from: 'de', to: 'fr' })).toContain('/german-french/');
    expect(lookupUrl('iate', 'acquis', { from: 'auto', to: 'ro' })).toContain('sourceLanguage=en&targetLanguages=ro');
  });
  it('empty text and unknown kinds give no link', () => {
    expect(lookupUrl('deepl', '   ')).toBe('');
    expect(lookupUrl('nope', 'x')).toBe('');
  });
});
