// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { foldText, quickSearchProject, quickSearchRows, quickNav, handoffCriteria } from '../src/lib/quickSearch.js';

const project = {
  tree: [
    { id: 'D', root: 'draft', title: 'Manuscris', children: [
      { id: 'a', type: 'text', title: 'Căutare în pădure', synopsis: 'Căutare de urme în noapte' },
      { id: 'b', type: 'text', title: 'Capitolul doi', synopsis: 'Căutare de aur' },
    ] },
    { id: 'R', root: 'research', title: 'Cercetare', children: [
      { id: 'c', type: 'text', title: 'Note' },
    ] },
    { id: 'T', root: 'trash', title: 'Coș', children: [
      { id: 'd', type: 'text', title: 'Șters căutare' },
    ] },
  ],
};
const docs = {
  a: '<p>Urmează o căutare lungă prin codri.</p>',
  b: '<p>Text fără subiect.</p>',
  c: '<p>Aici se discută căutarea comorii.</p>',
  d: '<p>coș căutare</p>',
};

describe('foldText', () => {
  it('folds case, diacritics and curly apostrophes', () => {
    expect(foldText('CăTARE')).toBe('catare');
    expect(foldText('Ștergé')).toBe('sterge');
    expect(foldText('l\u2019amintire')).toBe("l'amintire");
  });
});

describe('quickSearchProject', () => {
  it('groups results into titles, synopses and texts', () => {
    const r = quickSearchProject(project, docs, { query: 'căutare' });
    expect(r.titles.map((t) => t.node.id)).toEqual(['a']);
    expect(r.synopses.map((s) => s.node.id)).toEqual(['a', 'b']);
    expect(r.texts.map((t) => t.node.id)).toEqual(['a', 'c']);
  });

  it('prioritizes titles that begin with the phrase', () => {
    const r = quickSearchProject(project, docs, { query: 'cap' });
    expect(r.titles[0].node.id).toBe('b');
    expect(r.titles[0].beginsWith).toBe(true);
  });

  it('prefers the exact title over the begins-with one', () => {
    const r = quickSearchProject(project, docs, { query: 'note' });
    expect(r.titles[0].node.id).toBe('c');
  });

  it('is diacritics-insensitive', () => {
    const r = quickSearchProject(project, docs, { query: 'cautare' });
    expect(r.titles.map((t) => t.node.id)).toEqual(['a']);
  });

  it('excludes trash', () => {
    const r = quickSearchProject(project, docs, { query: 'căutare' });
    expect(r.titles.some((t) => t.node.id === 'd')).toBe(false);
    expect(r.texts.some((t) => t.node.id === 'd')).toBe(false);
  });

  it('builds a context snippet around the first text hit', () => {
    const r = quickSearchProject(project, docs, { query: 'comorii' });
    expect(r.texts[0].match).toBe('comorii');
    expect(r.texts[0].before).toContain('discută');
    expect(r.texts[0].after).toContain('.');
  });

  it('returns empty sections on empty query', () => {
    expect(quickSearchProject(project, docs, { query: '   ' })).toEqual({ titles: [], synopses: [], texts: [] });
  });

  it('respects the per-section limit', () => {
    const r = quickSearchProject(project, docs, { query: 'căutare', limit: 1 });
    expect(r.synopses).toHaveLength(1);
    expect(r.texts).toHaveLength(1);
  });

  it('does not match inside markup', () => {
    const p = { tree: [{ id: 'x', root: 'research', title: 'R', children: [{ id: 'm', type: 'text', title: 'M' }] }] };
    const r = quickSearchProject(p, { m: '<p style="color: pescar">plat</p>' }, { query: 'pescar' });
    expect(r.texts).toEqual([]);
  });
});

describe('handoffCriteria', () => {
  it('maps the phrase to an exact-phrase project search', () => {
    expect(handoffCriteria(' aur ')).toEqual({ query: 'aur', operator: 'exact' });
    expect(handoffCriteria('')).toEqual({});
  });
});

describe('quickSearchRows and quickNav', () => {
  const rows = quickSearchRows(quickSearchProject(project, docs, { query: 'căutare' }));
  it('orders sections titles → synopses → texts', () => {
    expect(rows.map((r) => r.section)).toEqual(['titles', 'synopses', 'synopses', 'texts', 'texts']);
  });
  it('navigates with wrapping and opens on Enter', () => {
    expect(quickNav(rows, rows[0].key, 'ArrowDown').select).toBe(rows[1].key);
    expect(quickNav(rows, rows[rows.length - 1].key, 'ArrowDown').select).toBe(rows[0].key);
    // moving up from the synopsis row of "a" lands on its titles row, not to the wrap-around end
    expect(quickNav(rows, rows[1].key, 'ArrowUp').select).toBe(rows[0].key);
    expect(quickNav(rows, null, 'Enter').open).toBe(rows[0].node.id);
    expect(quickNav(rows, rows[2].key, 'Enter').open).toBe('b');
  });
});
