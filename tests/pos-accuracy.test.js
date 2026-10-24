import { describe, it, expect } from 'vitest';
import { tagText, tagWord } from '../src/lib/pos.js';
import { GOLD_RO, GOLD_EN, HELDOUT_RO, HELDOUT_EN, goldAccuracy, parseGold } from './fixtures/posGold.js';

// Measured when the tagger was rewritten (old suffix-only tagger -> current):
//   gold RO 73.8% -> 99.0%, gold EN 89.3% -> 100%   (rules were tuned on these)
//   held-out RO 71.8% -> 87.2%, held-out EN 83.1% -> 95.5%   (never tuned on)
// Thresholds leave a little room so small lexicon edits do not break the build.
describe('linguistic focus tagger accuracy', () => {
  it('gold sets are large enough', () => {
    expect(parseGold(GOLD_RO).tags.length).toBeGreaterThanOrEqual(150);
    expect(parseGold(GOLD_EN).tags.length).toBeGreaterThanOrEqual(150);
  });
  it('Romanian gold set', () => {
    expect(goldAccuracy(GOLD_RO, 'ro', tagText).acc).toBeGreaterThanOrEqual(0.95);
  });
  it('English gold set', () => {
    expect(goldAccuracy(GOLD_EN, 'en', tagText).acc).toBeGreaterThanOrEqual(0.95);
  });
  it('held-out passages (not used for tuning)', () => {
    expect(goldAccuracy(HELDOUT_RO, 'ro', tagText).acc).toBeGreaterThanOrEqual(0.84);
    expect(goldAccuracy(HELDOUT_EN, 'en', tagText).acc).toBeGreaterThanOrEqual(0.9);
  });
});

describe('linguistic focus context rules', () => {
  const tags = (text, lang = 'ro') => tagText(text, lang).map((w) => w.tag);
  it('Romanian: auxiliary + participle, copula + adjective, verb + adverb', () => {
    expect(tags('Ea a plecat repede')).toEqual(['pron', 'verb', 'verb', 'adv']);
    expect(tags('Casa părea pustie')).toEqual(['noun', 'verb', 'adj']);
    expect(tags('El lucra grăbit')).toEqual(['pron', 'verb', 'adv']);
    expect(tags('obrazul zbârcit')).toEqual(['noun', 'adj']);
  });
  it('Romanian: article "o" vs clitic "o"', () => {
    expect(tags('Văzu o umbră')).toEqual(['verb', 'other', 'noun']);
    expect(tags('Băiatul o îmbrățișă')).toEqual(['noun', 'pron', 'verb']);
  });
  it('Romanian: subjunctive and morphology', () => {
    expect(tags('să strige')).toEqual(['other', 'verb']);
    expect(tagWord('coborâse')).toBe('verb');
    expect(tagWord('stătea')).toBe('verb');
    expect(tagWord('tăcerea')).toBe('noun');
    expect(tagWord('închipuire')).toBe('noun');
    expect(tagWord('frumoasă')).toBe('adj');
  });
  it('English: modal across adverbs, copula, determiners', () => {
    expect(tags('She could not remember', 'en')).toEqual(['pron', 'verb', 'adv', 'verb']);
    expect(tags('The door was open', 'en')).toEqual(['other', 'noun', 'verb', 'adj']);
    expect(tags('the careful handwriting', 'en')).toEqual(['other', 'adj', 'noun']);
    expect(tags('a light appeared', 'en')).toEqual(['other', 'noun', 'verb']);
  });
});
