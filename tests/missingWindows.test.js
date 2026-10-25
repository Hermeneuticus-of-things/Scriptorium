import { describe, it, expect } from 'vitest';
import { pageViewGeometry, pageViewVars, SPECIAL_CHARS, charCode, normalizeCompletions, wordBefore, completeFromList, completionSuffix, toggleKeywordOn } from '../src/lib/missingWindows.js';
import { uiRo, uiEn } from '../src/lib/i18n-ui.js';

describe('page view from Page Setup', () => {
  it('defaults to A4 portrait with 2.5 cm margins', () => {
    expect(pageViewGeometry()).toEqual({ width: 21, height: 29.7, top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 });
  });
  it('applies size, landscape and margins', () => {
    const g = pageViewGeometry({ size: 'A5', orientation: 'landscape', margins: { top: 1, bottom: 2, left: 3, right: 4 } });
    expect(g).toEqual({ width: 21, height: 14.8, top: 1, right: 4, bottom: 2, left: 3 });
    expect(pageViewVars({ size: 'Letter' })['--ps-w']).toBe('21.59cm');
  });
  it('custom size and margins too large are scaled', () => {
    const g = pageViewGeometry({ size: 'custom', widthCm: 10, heightCm: 12, margins: { left: 8, right: 8 } });
    expect(g.width).toBe(10);
    expect(g.left + g.right).toBeCloseTo(8, 1);
  });
});

describe('special characters', () => {
  it('has categories with chars and names in both languages', () => {
    for (const c of SPECIAL_CHARS) {
      expect(c.chars.length).toBeGreaterThan(3);
      expect(uiRo[`ui.mw.sc_${c.id}`]).toBeTruthy();
      expect(uiEn[`ui.mw.sc_${c.id}`]).toBeTruthy();
    }
    expect(charCode('—')).toBe('U+2014');
  });
});

describe('auto-complete list', () => {
  it('normalizes, completes and builds the suffix', () => {
    expect(normalizeCompletions([' Anastasia ', 'anastasia', '', 'Bogdan'])).toEqual(['Anastasia', 'Bogdan']);
    expect(wordBefore('Și apoi Anas')).toBe('Anas');
    expect(wordBefore('end. ')).toBe('');
    expect(completeFromList(['Anastasia', 'Ana-Maria', 'Ana'], 'ana')).toEqual(['Ana-Maria', 'Anastasia']);
    expect(completionSuffix('Anastasia', 'Anas')).toBe('tasia');
  });
});

describe('keywords HUD', () => {
  const tree = [{ id: 'r', children: [{ id: 'a', keywords: ['x'] }, { id: 'b' }] }];
  it('adds to all when some lack it, removes when all have it', () => {
    const t1 = toggleKeywordOn(tree, ['a', 'b'], 'x');
    expect(t1[0].children.map((n) => n.keywords)).toEqual([['x'], ['x']]);
    const t2 = toggleKeywordOn(t1, ['a', 'b'], 'x');
    expect(t2[0].children.map((n) => n.keywords)).toEqual([[], []]);
    expect(tree[0].children[1].keywords).toBeUndefined();
  });
});
