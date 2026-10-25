import { describe, expect, it } from 'vitest';
import { groupIntoFolder, sortChildren, docLink, findNode, findParent } from '../src/lib/tree.js';
import { addKeywordToDocs, keywordDropTargets, keywordTreeRows, listKeywords } from '../src/lib/collections.js';
import { labelColorIn, labelTint } from '../src/lib/settingsDefaults.js';

const tree = () => [
  { id: 'draft', root: 'draft', title: 'Manuscris', children: [
    { id: 'a', title: 'Beta', type: 'text' },
    { id: 'b', title: 'alfa', type: 'text' },
    { id: 'f', title: 'Dosar', type: 'folder', children: [{ id: 'c', title: 'Gama', type: 'text' }] },
    { id: 'd', title: 'Delta', type: 'text' },
  ] },
  { id: 'research', root: 'research', title: 'Cercetare', children: [] },
];

describe('groupIntoFolder', () => {
  it('puts the selection, in binder order, into a new folder at the first item', () => {
    const t = groupIntoFolder(tree(), ['d', 'b'], { id: 'g', title: 'Grup', type: 'folder' });
    expect(t[0].children.map((n) => n.id)).toEqual(['a', 'g', 'f']);
    expect(findNode(t, 'g').children.map((n) => n.id)).toEqual(['b', 'd']);
  });
  it('keeps children of a selected folder inside it and skips roots', () => {
    const t = groupIntoFolder(tree(), ['f', 'c', 'draft'], { id: 'g', title: 'G', type: 'folder' });
    expect(findNode(t, 'g').children.map((n) => n.id)).toEqual(['f']);
    expect(findParent(t, 'c').id).toBe('f');
  });
  it('returns the same tree when nothing can be grouped', () => {
    const t0 = tree();
    expect(groupIntoFolder(t0, ['draft'], { id: 'g' })).toBe(t0);
  });
});

describe('sortChildren', () => {
  it('sorts A–Z and Z–A with Romanian collation, case-insensitive', () => {
    expect(sortChildren(tree(), 'draft', 'title').find((n) => n.id === 'draft').children.map((n) => n.title)).toEqual(['alfa', 'Beta', 'Delta', 'Dosar']);
    expect(sortChildren(tree(), 'draft', 'title', true).find((n) => n.id === 'draft').children.map((n) => n.title)).toEqual(['Dosar', 'Delta', 'Beta', 'alfa']);
  });
});

describe('keyword drop', () => {
  it('targets the whole selection only when the drop target is part of it', () => {
    expect(keywordDropTargets('a', ['a', 'b'])).toEqual(['a', 'b']);
    expect(keywordDropTargets('c', ['a', 'b'])).toEqual(['c']);
    expect(keywordDropTargets('c', new Set())).toEqual(['c']);
  });
  it('adds the keyword once, skips roots and registers the definition', () => {
    const p = { tree: tree(), keywordDefs: [] };
    p.tree[0].children[0].keywords = ['Iarnă'];
    const out = addKeywordToDocs(p, ['a', 'b', 'draft'], 'Iarnă');
    expect(findNode(out.tree, 'a').keywords).toEqual(['Iarnă']);
    expect(findNode(out.tree, 'b').keywords).toEqual(['Iarnă']);
    expect(findNode(out.tree, 'draft').keywords).toBeUndefined();
    expect(out.keywordDefs.map((d) => d.name)).toEqual(['Iarnă']);
    expect(findNode(p.tree, 'b').keywords).toBeUndefined(); // input untouched
  });
});

describe('keywordTreeRows', () => {
  const p = { tree: [], keywordDefs: [{ name: 'Loc', parent: null }, { name: 'Oraș', parent: 'Loc' }, { name: 'Sat', parent: 'Loc' }, { name: 'Timp', parent: null }] };
  it('orders depth-first with depth and hasChildren', () => {
    const rows = keywordTreeRows(listKeywords(p));
    expect(rows.map((r) => `${r.depth}:${r.name}`)).toEqual(['0:Loc', '1:Oraș', '1:Sat', '0:Timp']);
    expect(rows[0].hasChildren).toBe(true);
  });
  it('hides children of collapsed keywords', () => {
    expect(keywordTreeRows(listKeywords(p), { Loc: true }).map((r) => r.name)).toEqual(['Loc', 'Timp']);
  });
});

describe('label colour settings', () => {
  it('fills missing keys with defaults', () => {
    expect(labelColorIn(null)).toEqual({ binder: false, cards: true, outliner: false, icons: true });
    expect(labelColorIn({ labelColorIn: { binder: true } })).toEqual({ binder: true, cards: true, outliner: false, icons: true });
  });
  it('makes a translucent tint from a hex colour', () => {
    expect(labelTint('#ff0000')).toBe('rgba(255, 0, 0, 0.18)');
    expect(labelTint('#0f0', 0.5)).toBe('rgba(0, 255, 0, 0.5)');
    expect(labelTint('red')).toBe('');
  });
  it('builds a document link', () => {
    expect(docLink('ab c')).toBe('scribner://doc/ab%20c');
  });
});
