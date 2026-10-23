import { describe, it, expect } from 'vitest';
import { moveToTrash, restoreFromTrash, moveManyInto, moveTargets, ancestorIds, scriveningsList, appendHtml, findNode, findParent } from '../src/lib/tree.js';
import { autoSynopsis, lookupUrl } from '../src/lib/textTools.js';

const make = () => [
  { id: 'draft', root: 'draft', type: 'folder', children: [
    { id: 'f', type: 'folder', children: [{ id: 'a', type: 'text' }, { id: 'b', type: 'text' }] },
    { id: 'c', type: 'text' },
    { id: 'g', type: 'folder', children: [] },
  ] },
  { id: 'research', root: 'research', type: 'folder', children: [] },
  { id: 'trash', root: 'trash', type: 'folder', children: [] },
];
const ids = (t, id) => findNode(t, id).children.map((n) => n.id);

describe('trash and restore', () => {
  it('remembers the original place and restores there', () => {
    let t = moveToTrash(make(), 'b');
    expect(findParent(t, 'b').id).toBe('trash');
    expect(findNode(t, 'b').trashedFrom).toEqual({ parentId: 'f', index: 1 });
    t = moveToTrash(t, 'a');
    t = restoreFromTrash(t, 'b');
    expect(ids(t, 'f')).toEqual(['b']);
    t = restoreFromTrash(t, 'a');
    expect(ids(t, 'f')).toEqual(['a', 'b']);
    expect(findNode(t, 'a').trashedFrom).toBeUndefined();
  });
  it('falls back to the Draft when the parent is gone and ignores items outside the trash', () => {
    let t = moveToTrash(make(), 'a');
    t = moveToTrash(t, 'f');
    t = restoreFromTrash(t, 'a');
    expect(findParent(t, 'a').id).toBe('draft');
    expect(restoreFromTrash(t, 'c')).toBe(t);
  });
});

describe('move to', () => {
  it('moves several items into a folder in binder order, skipping invalid ones', () => {
    const t = moveManyInto(make(), ['c', 'a', 'f'], 'g');
    expect(ids(t, 'g')).toEqual(['f', 'c']);
    expect(ids(t, 'f')).toEqual(['a', 'b']);
  });
  it('lists folder targets without the selection or the trash', () => {
    expect(moveTargets(make(), ['f']).map((x) => x.id)).toEqual(['draft', 'g', 'research']);
  });
  it('ancestor ids', () => {
    expect(ancestorIds(make(), 'a')).toEqual(['draft', 'f']);
  });
});

describe('scrivenings list and append', () => {
  it('expands containers in binder order without duplicates', () => {
    expect(scriveningsList(make(), ['c', 'f', 'a']).map((n) => n.id)).toEqual(['a', 'b', 'c']);
    expect(scriveningsList(make(), ['draft']).map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });
  it('appends HTML at the end, dropping trailing empty paragraphs', () => {
    expect(appendHtml('<p>x</p><p></p>', '<p>y</p>')).toBe('<p>x</p><p>y</p>');
    expect(appendHtml('<p>x</p>', '<p>y</p>', { separator: true })).toBe('<p>x</p><hr><p>y</p>');
    expect(appendHtml('', '<p>y</p>', { separator: true })).toBe('<p>y</p>');
  });
});

describe('text tools', () => {
  it('auto-synopsis takes the first sentences', () => {
    expect(autoSynopsis('Prima frază. A doua frază! A treia?')).toBe('Prima frază. A doua frază!');
    expect(autoSynopsis('Una.', { maxSentences: 3 })).toBe('Una.');
    expect(autoSynopsis('')).toBe('');
    expect(autoSynopsis('a '.repeat(400)).length).toBeLessThanOrEqual(281);
  });
  it('lookup urls', () => {
    expect(lookupUrl('dictionary', 'casă')).toBe('https://dexonline.ro/definitie/cas%C4%83');
    expect(lookupUrl('synonyms', 'x')).toContain('/sinonime');
    expect(lookupUrl('nope', 'x')).toBe('');
  });
});
