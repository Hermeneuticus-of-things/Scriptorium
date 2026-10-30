import { describe, it, expect } from 'vitest';
import {
  createCollection, renameCollection, recolorCollection, deleteCollection, addToCollection, removeFromCollection,
  moveInCollection, collectionNodes, listKeywords, addKeyword, renameKeyword, deleteKeyword, setKeywordColor, setKeywordParent,
  ensureSearchResults, setLastSearch, SEARCH_RESULTS_ID,
} from '../src/lib/collections.js';

const base = () => ({
  tree: [
    {
      id: 'draft', root: 'draft', title: 'Manuscris', children: [
        { id: 'a', title: 'Unu', keywords: ['noapte', 'Ana'] },
        { id: 'b', title: 'Doi', keywords: ['zi'] },
        { id: 'c', title: 'Trei', keywords: ['noapte', 'zi'] },
      ],
    },
    { id: 'trash', root: 'trash', title: 'Coș', children: [] },
  ],
  collections: [],
  keywordDefs: [{ name: 'noapte', color: '#000000', parent: null }, { name: 'lună', color: '', parent: 'noapte' }],
});
const docs = { a: '<p>lună plină</p>', b: '<p>soare</p>', c: '<p>Lună</p>' };

describe('collections', () => {
  it('create / rename / recolor / delete without mutating', () => {
    const p = base();
    const { project, id } = createCollection(p, { title: 'Ana', ids: ['b', 'a', 'b'], id: 'k1' });
    expect(id).toBe('k1');
    expect(p.collections).toEqual([]);
    expect(project.collections[0]).toMatchObject({ title: 'Ana', type: 'manual', ids: ['b', 'a'] });
    const r = recolorCollection(renameCollection(project, id, 'Nou'), id, '#ff0000');
    expect(r.collections[0]).toMatchObject({ title: 'Nou', color: '#ff0000' });
    expect(project.collections[0].title).toBe('Ana');
    expect(deleteCollection(r, id).collections).toEqual([]);
  });

  it('add (dedupe, order) / remove / move', () => {
    let { project } = createCollection(base(), { ids: ['a'], id: 'k' });
    project = addToCollection(project, 'k', ['c', 'a', 'b']);
    expect(project.collections[0].ids).toEqual(['a', 'c', 'b']);
    expect(moveInCollection(project, 'k', 'a', 2).collections[0].ids).toEqual(['c', 'b', 'a']);
    expect(moveInCollection(project, 'k', 'b', 0).collections[0].ids).toEqual(['b', 'a', 'c']);
    expect(removeFromCollection(project, 'k', ['c']).collections[0].ids).toEqual(['a', 'b']);
  });

  it('collectionNodes manual skips missing; search returns binder order', () => {
    const { project } = createCollection(base(), { ids: ['c', 'zz', 'a'], id: 'm' });
    expect(collectionNodes(project, project.collections[0], docs).map((n) => n.id)).toEqual(['c', 'a']);
    const s = createCollection(project, { type: 'search', id: 's', search: { query: 'lună', options: { fields: ['text'] } } }).project;
    const col = s.collections.find((c) => c.id === 's');
    expect(col.ids).toBeUndefined();
    expect(collectionNodes(s, col, docs).map((n) => n.id)).toEqual(['a', 'c']);
  });
});

describe('keywords', () => {
  it('listKeywords unions defs and node keywords with counts', () => {
    const list = listKeywords(base());
    expect(list.map((k) => [k.name, k.count])).toEqual([['Ana', 1], ['lună', 0], ['noapte', 2], ['zi', 2]]);
  });
  it('renameKeyword propagates, dedupes and updates parents', () => {
    const p = base();
    const r = renameKeyword(p, 'noapte', 'întuneric');
    expect(r.tree[0].children[0].keywords).toEqual(['întuneric', 'Ana']);
    expect(r.keywordDefs.find((d) => d.name === 'lună').parent).toBe('întuneric');
    expect(r.keywordDefs.find((d) => d.name === 'întuneric').color).toBe('#000000');
    expect(p.tree[0].children[0].keywords).toEqual(['noapte', 'Ana']);
    const m = renameKeyword(p, 'zi', 'noapte');
    expect(m.tree[0].children[2].keywords).toEqual(['noapte']);
    expect(m.keywordDefs.filter((d) => d.name === 'noapte')).toHaveLength(1);
  });
  it('deleteKeyword removes from nodes, defs and parents', () => {
    const r = deleteKeyword(base(), 'noapte');
    expect(r.tree[0].children[0].keywords).toEqual(['Ana']);
    expect(r.keywordDefs.map((d) => d.name)).toEqual(['lună']);
    expect(r.keywordDefs[0].parent).toBeNull();
  });
  it('color, add, parent with cycle protection', () => {
    let p = setKeywordColor(base(), 'zi', '#ffcc00');
    expect(p.keywordDefs.find((d) => d.name === 'zi')).toMatchObject({ color: '#ffcc00', parent: null });
    p = addKeyword(p, '  soare ');
    expect(p.keywordDefs.some((d) => d.name === 'soare')).toBe(true);
    expect(setKeywordParent(p, 'noapte', 'lună').keywordDefs.find((d) => d.name === 'noapte').parent).toBeNull();
    expect(setKeywordParent(p, 'zi', 'soare').keywordDefs.find((d) => d.name === 'zi').parent).toBe('soare');
  });
});

describe('system "Search Results" collection (Scrivener §11.1.1)', () => {
  it('is created once with a fixed id and never duplicated', () => {
    const p1 = ensureSearchResults({});
    expect(p1.collections).toHaveLength(1);
    expect(p1.collections[0]).toMatchObject({ id: SEARCH_RESULTS_ID, type: 'search' });
    expect(ensureSearchResults(p1)).toBe(p1);
  });
  it('setLastSearch stores query + options and survives as data', () => {
    const p = setLastSearch({}, { query: 'aur', operator: 'all', fields: ['text'] });
    const c = p.collections.find((x) => x.id === SEARCH_RESULTS_ID);
    expect(c.search).toEqual({ query: 'aur', options: { operator: 'all', fields: ['text'] } });
  });
  it('an empty query never wipes the stored search', () => {
    const p1 = setLastSearch({}, { query: 'aur' });
    const p2 = setLastSearch(p1, { query: '   ' });
    expect(p2.collections.find((x) => x.id === SEARCH_RESULTS_ID).search.query).toBe('aur');
  });
  it('cannot be deleted or renamed; other collections still can', () => {
    const p1 = setLastSearch({}, { query: 'aur' });
    expect(deleteCollection(p1, SEARCH_RESULTS_ID)).toBe(p1);
    expect(renameCollection(p1, SEARCH_RESULTS_ID, 'altceva')).toBe(p1);
    const { project: p2 } = createCollection(p1, { id: 'k1', title: 'Personaje', type: 'manual', ids: ['a'] });
    const p3 = deleteCollection(p2, 'k1');
    expect(p3.collections.map((c) => c.id)).toEqual([SEARCH_RESULTS_ID]);
  });
  it('collectionNodes runs the stored search', () => {
    const project = {
      tree: [{ id: 'draft', root: 'draft', title: 'M', children: [
        { id: 'a', type: 'text', title: 'Aur în vale' },
        { id: 'b', type: 'text', title: 'Fier' },
      ] }],
    };
    const p = setLastSearch(project, { query: 'aur' });
    const c = p.collections.find((x) => x.id === SEARCH_RESULTS_ID);
    expect(collectionNodes(p, c, {}, {}).map((n) => n.id)).toEqual(['a']);
  });
});
