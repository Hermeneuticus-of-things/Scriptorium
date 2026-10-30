import { describe, it, expect } from 'vitest';
import { filterContainer } from '../src/lib/viewFilter.js';

const tree = [
  {
    id: 'draft', root: 'draft', title: 'Manuscris', children: [
      {
        id: 'ch1', type: 'folder', title: 'Capitolul Întâi', synopsis: 'Începutul căutărilor', label: 'Roșu', status: 'Ciornă', includeInCompile: true, children: [
          { id: 's1', type: 'text', title: 'Scena A', synopsis: 'Ana intră în cameră' },
          { id: 's2', type: 'text', title: 'Scena B', synopsis: 'Dan pleacă', includeInCompile: false },
        ],
      },
      { id: 'ch2', type: 'text', title: 'Epilog', synopsis: 'Final', label: 'Albastru', status: 'Revizuit' },
    ],
  },
  { id: 'research', root: 'research', title: 'Cercetare', children: [{ id: 'r1', type: 'text', title: 'Note istorice', synopsis: 'Documente vechi' }] },
  { id: 'trash', root: 'trash', title: 'Coș', children: [{ id: 't1', type: 'text', title: 'Scena aruncată' }] },
];
const docs = { s1: '<p>Zapada cade peste <b>vârfuri</b>.</p>', r1: '<p>Zmeură și mică</p>' };
const notesById = { s1: '<p>Notă: revizuiește deschiderea</p>' };
const ids = (res) => res.map((n) => n.id);

describe('filterContainer', () => {
  it('returns null (no filtering) on empty query without meta/compile/draft criteria', () => {
    expect(filterContainer(tree, {})).toBe(null);
    expect(filterContainer(tree, { query: '   ' })).toBe(null);
    expect(filterContainer(tree, { query: '', draftScope: 'any', compileScope: 'all' })).toBe(null);
    expect(filterContainer(tree, { query: '', meta: { mode: 'any', field: 'label', value: 'Roșu' } })).toBe(null);
  });

  it('matches title and synopsis into a flat list in binder order; roots are never listed', () => {
    expect(ids(filterContainer(tree, { query: 'scen' }))).toEqual(['s1', 's2', 't1']);
    expect(ids(filterContainer(tree, { query: 'epilog' }))).toEqual(['ch2']);
    expect(ids(filterContainer(tree, { query: 'manuscris' }))).toEqual([]);
  });

  it('is case- and diacritics-insensitive (the typeAhead fold)', () => {
    expect(ids(filterContainer(tree, { query: 'SCENĂ' }))).toEqual(['s1', 's2', 't1']);
    expect(ids(filterContainer(tree, { query: 'cautarilor' }))).toEqual(['ch1']);
    expect(ids(filterContainer(tree, { query: 'INTAI' }))).toEqual(['ch1']);
  });

  it('includeTextNotes searches document text and notes', () => {
    expect(ids(filterContainer(tree, { query: 'zapada' }))).toEqual([]);
    expect(ids(filterContainer(tree, { query: 'vârfuri', includeTextNotes: true, docs }))).toEqual(['s1']);
    expect(ids(filterContainer(tree, { query: 'zapada', includeTextNotes: true, docs }))).toEqual(['s1']);
    expect(ids(filterContainer(tree, { query: 'revizuieste', includeTextNotes: true, docs, notesById }))).toEqual(['s1']);
  });

  it('regex mode, including the folded fallback and invalid patterns', () => {
    expect(ids(filterContainer(tree, { query: 'sc[ae]na', regex: true }))).toEqual(['s1', 's2', 't1']);
    expect(ids(filterContainer(tree, { query: '^Ana', regex: true }))).toEqual(['s1']);
    expect(ids(filterContainer(tree, { query: '^inceputul', regex: true }))).toEqual(['ch1']);
    expect(ids(filterContainer(tree, { query: 'vârfuri|zmeură', regex: true, includeTextNotes: true, docs }))).toEqual(['s1', 'r1']);
    expect(ids(filterContainer(tree, { query: '([', regex: true }))).toEqual([]);
  });

  it('draft scope: items anywhere / draft items only / non-draft items only', () => {
    expect(filterContainer(tree, { draftScope: 'any' })).toBe(null);
    expect(ids(filterContainer(tree, { draftScope: 'draft' }))).toEqual(['ch1', 's1', 's2', 'ch2']);
    expect(ids(filterContainer(tree, { draftScope: 'nondraft' }))).toEqual(['r1', 't1']);
    expect(ids(filterContainer(tree, { query: 'scen', draftScope: 'draft' }))).toEqual(['s1', 's2']);
  });

  it('compile scope: included / excluded, inherited inside the candidates', () => {
    expect(ids(filterContainer(tree, { compileScope: 'excluded' }))).toEqual(['s2']);
    expect(ids(filterContainer(tree, { compileScope: 'included' }))).toEqual(['ch1', 's1', 'ch2', 'r1', 't1']);
    const tree2 = [{
      id: 'd', root: 'draft', title: 'M', children: [
        { id: 'f', title: 'Dosar exclus', includeInCompile: false, children: [{ id: 'x', title: 'Copil' }] },
        { id: 'y', title: 'Afară' },
      ],
    }];
    expect(ids(filterContainer(tree2, { compileScope: 'excluded' }))).toEqual(['f', 'x']);
  });

  it('metadata: include / exclude by label and status, composable with the query', () => {
    expect(ids(filterContainer(tree, { meta: { mode: 'include', field: 'label', value: 'Roșu' } }))).toEqual(['ch1']);
    expect(ids(filterContainer(tree, { meta: { mode: 'exclude', field: 'label', value: 'Roșu' } }))).toEqual(['s1', 's2', 'ch2', 'r1', 't1']);
    expect(ids(filterContainer(tree, { meta: { mode: 'include', field: 'status', value: 'Revizuit' } }))).toEqual(['ch2']);
    expect(filterContainer(tree, { meta: { mode: 'include', field: 'label', value: '' } })).toBe(null);
    expect(ids(filterContainer(tree, { query: 'epilog', meta: { mode: 'include', field: 'label', value: 'Roșu' } }))).toEqual([]);
  });

  it('rootKind scopes container children without their own .root', () => {
    const kids = tree[0].children;
    expect(ids(filterContainer(kids, { draftScope: 'draft', rootKind: 'draft' }))).toEqual(['ch1', 's1', 's2', 'ch2']);
    expect(ids(filterContainer(kids, { draftScope: 'nondraft', rootKind: 'draft' }))).toEqual([]);
    expect(ids(filterContainer(kids, { draftScope: 'draft' }))).toEqual([]);
  });

  it('flattens a container subtree and keeps an empty result an array', () => {
    expect(ids(filterContainer(tree[0].children, { query: 'ana' }))).toEqual(['s1']);
    expect(ids(filterContainer(tree[0].children, { query: 'capitol' }))).toEqual(['ch1']);
    expect(filterContainer(tree[0].children, { query: 'inexistent' })).toEqual([]);
  });
});
