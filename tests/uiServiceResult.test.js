import { describe, it, expect } from 'vitest';
import { applyCorrections } from '../src/lib/textRange.js';

const m = (offset, length, ...replacements) => ({ offset, length, replacements });

describe('applyCorrections (LanguageTool dialog)', () => {
  it('applies non-overlapping matches by offset', () => {
    expect(applyCorrections('a ,b ,c', [m(1, 2, ','), m(4, 2, ',')], [0, 0])).toBe('a,b,c');
  });
  it('skips a match overlapping one already applied instead of garbling text', () => {
    // "teh teh" : whole-phrase match [0,7) and word match [4,7)
    const out = applyCorrections('teh teh x', [m(0, 7, 'the'), m(4, 3, 'the')], [0, 0]);
    expect(out).toBe('teh the x');
  });
  it('honours empty replacements and "leave"', () => {
    expect(applyCorrections('a  b', [m(1, 1, '')], [0])).toBe('a b');
    expect(applyCorrections('a  b', [m(1, 1, '')], [-1])).toBe('a  b');
  });
  it('keeps UTF-16 offsets after an emoji', () => {
    const s = '😀 ,x';
    expect(applyCorrections(s, [m(2, 2, ',')], [0])).toBe('😀,x');
  });
  it('ignores out-of-range matches', () => {
    expect(applyCorrections('ab', [m(5, 2, 'z')], [0])).toBe('ab');
  });
});
