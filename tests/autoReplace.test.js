import { describe, it, expect } from 'vitest';
import { applyReplacements, capitalizeSentences, autoReplace, parseReplacementLines } from '../src/lib/autoReplace.js';

describe('autoReplace', () => {
  it('replaces whole words only (Unicode)', () => {
    const list = [{ from: 'si', to: 'și' }, { from: '(c)', to: '©' }];
    expect(applyReplacements('si apoi sigur, (c) si', list)).toBe('și apoi sigur, © și');
    expect(applyReplacements('ăsi si', [{ from: 'si', to: 'și' }])).toBe('ăsi și');
  });
  it('escapes regex chars and ignores empty', () => {
    expect(applyReplacements('a.b a+b', [{ from: 'a+b', to: 'X' }, { from: '', to: 'Y' }])).toBe('a.b X');
  });
  it('capitalizes sentence starts', () => {
    expect(capitalizeSentences('ana are mere. ion nu! oare? „da”… ștefan')).toBe('Ana are mere. Ion nu! Oare? „Da”… Ștefan');
    expect(capitalizeSentences('vezi 3.5 kg')).toBe('Vezi 3.5 kg');
  });
  it('combines and parses lines', () => {
    expect(autoReplace('teh end. ok', { replacements: [{ from: 'teh', to: 'the' }], capitalize: true })).toBe('The end. Ok');
    expect(parseReplacementLines('teh => the\n\nbad\n(c)\t©')).toEqual([{ from: 'teh', to: 'the' }, { from: '(c)', to: '©' }]);
  });
});
