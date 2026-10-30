import { describe, it, expect } from 'vitest';
import { searchProject, replaceInFields, replaceSnapshotHtml, buildTerms } from '../src/lib/projectSearch.js';
import { buildRegex } from '../src/lib/search.js';

const project = {
  tree: [
    {
      id: 'draft', root: 'draft', title: 'Manuscris', children: [
        { id: 'a', type: 'text', title: 'Pădurea întunecată', synopsis: 'Ana intră în pădure', label: 'Scenă', status: 'Ciornă', keywords: ['noapte', 'Ana'], custom: { Loc: 'Brașov' }, includeInCompile: true },
        { id: 'b', type: 'text', title: 'Orașul', synopsis: '', label: 'Capitol', status: 'Final', keywords: ['zi'], custom: {}, includeInCompile: true },
        {
          id: 'f', type: 'folder', title: 'Exclus', includeInCompile: false, keywords: [], children: [
            { id: 'c', type: 'text', title: 'Copil exclus', synopsis: 'pădure', keywords: ['noapte'], includeInCompile: true },
          ],
        },
      ],
    },
    { id: 'research', root: 'research', title: 'Cercetare', children: [{ id: 'r', type: 'text', title: 'Note despre pădure', keywords: [] }] },
    { id: 'trash', root: 'trash', title: 'Coș', children: [{ id: 't', type: 'text', title: 'Pădure ștearsă', keywords: [] }] },
  ],
};
const docs = {
  a: '<p>Ana merse prin <em>pădure</em>. Era ȘTIUTĂ noaptea.</p>',
  b: '<p>Orașul era plin de lume și de zgomot.</p>',
  c: '<p>nimic</p>',
  r: '<p>Ana citește</p>',
  t: '<p>pădure</p>',
};
const notes = { b: '<p>Ana trece pe aici</p>' };
const ids = (res) => res.map((r) => r.node.id);

describe('searchProject', () => {
  it('matches diacritics case-insensitively in text and title, binder order, trash excluded', () => {
    const res = searchProject(project, docs, notes, { query: 'PĂDURE' });
    expect(ids(res)).toEqual(['a', 'c', 'r']);
    const a = res[0];
    expect(a.fields.text).toBe(1);
    expect(a.fields.synopsis).toBe(1);
    expect(a.snippets[0]).toMatchObject({ match: expect.stringMatching(/pădure/i) });
    expect(searchProject(project, docs, notes, { query: 'știută' })[0].node.id).toBe('a');
  });

  it('caseSensitive and wholeWord', () => {
    expect(ids(searchProject(project, docs, notes, { query: 'pădure', caseSensitive: true }))).toEqual(['a', 'c', 'r']);
    expect(ids(searchProject(project, docs, notes, { query: 'Pădure', caseSensitive: true }))).toEqual(['a']);
    expect(ids(searchProject(project, docs, notes, { query: 'pădur', wholeWord: true }))).toEqual([]);
  });

  it('includeTrash', () => {
    expect(ids(searchProject(project, docs, notes, { query: 'pădure', includeTrash: true }))).toContain('t');
  });

  it('operators any / all / exact', () => {
    expect(ids(searchProject(project, docs, notes, { query: 'zgomot noaptea', operator: 'any' }))).toEqual(['a', 'b']);
    expect(ids(searchProject(project, docs, notes, { query: 'Ana noaptea', operator: 'all' }))).toEqual(['a']);
    expect(ids(searchProject(project, docs, notes, { query: 'merse prin', operator: 'exact' }))).toEqual(['a']);
    expect(ids(searchProject(project, docs, notes, { query: 'prin merse', operator: 'exact' }))).toEqual([]);
  });

  it('field filters, notes and metadata', () => {
    expect(ids(searchProject(project, docs, notes, { query: 'Ana', fields: ['notes'] }))).toEqual(['b']);
    expect(ids(searchProject(project, docs, notes, { query: 'Ana', fields: ['keywords'] }))).toEqual(['a']);
    expect(ids(searchProject(project, docs, notes, { query: 'brașov', fields: ['custom'] }))).toEqual(['a']);
    expect(ids(searchProject(project, docs, notes, { query: 'pădure', fields: ['title'] }))).toEqual(['a', 'r']);
    expect(ids(searchProject(project, docs, {}, { query: 'Ana', fields: ['notes'] }))).toEqual([]);
  });

  it('label / status / keyword filters, scope and onlyCompile', () => {
    expect(ids(searchProject(project, docs, notes, { query: 'e', labels: ['Capitol'] }))).toEqual(['b']);
    expect(ids(searchProject(project, docs, notes, { query: 'e', statuses: ['Ciornă'] }))).toEqual(['a']);
    expect(ids(searchProject(project, docs, notes, { query: '', keywords: ['noapte'] }))).toEqual(['a', 'c']);
    expect(ids(searchProject(project, docs, notes, { query: '', keywords: ['noapte', 'Ana'] }))).toEqual(['a']);
    expect(ids(searchProject(project, docs, notes, { query: 'pădure', scope: 'research' }))).toEqual(['r']);
    expect(ids(searchProject(project, docs, notes, { query: 'pădure', onlyCompile: true }))).toEqual(['a']);
  });

  it('regex mode, invalid regex and empty query', () => {
    expect(ids(searchProject(project, docs, notes, { query: 'p.dure', regex: true, fields: ['text'] }))).toEqual(['a']);
    expect(searchProject(project, docs, notes, { query: '(', regex: true })).toEqual([]);
    expect(searchProject(project, docs, notes, { query: '' })).toEqual([]);
    expect(buildTerms({ query: 'a b', operator: 'all' })).toHaveLength(2);
  });

  it('limits snippets to 5', () => {
    const d = { ...docs, a: '<p>' + 'x '.repeat(9) + '</p>' };
    const r = searchProject(project, d, notes, { query: 'x', fields: ['text'] });
    expect(r[0].fields.text).toBe(9);
    expect(r[0].snippets).toHaveLength(5);
  });
});

describe('replaceInFields', () => {
  it('replaces in title, synopsis, text and notes without mutating', () => {
    const node = project.tree[0].children[0];
    const re = buildRegex({ query: 'pădure' });
    const r = replaceInFields(node, docs.a, '<p>notă: Pădure</p>', re, 'codru');
    expect(r.node.title).toBe('codrua întunecată');
    expect(r.node.synopsis).toBe('Ana intră în codru');
    expect(r.docHtml).toContain('<em>codru</em>');
    expect(r.notesHtml).toContain('codru');
    expect(r.count).toBe(4);
    expect(node.title).toBe('Pădurea întunecată');
  });
  it('respects field list and groups', () => {
    const node = { id: 'x', title: 'Ion Pop', synopsis: 'Ion Pop' };
    const re = buildRegex({ query: '(\\w+) (\\w+)', regex: true });
    const r = replaceInFields(node, '', '', re, '$2 $1', ['synopsis']);
    expect(r.node).toMatchObject({ title: 'Ion Pop', synopsis: 'Pop Ion' });
    expect(r.count).toBe(1);
  });

  it('replaces in custom metadata: single values, array items, numbers untouched, no mutation', () => {
    const node = { id: 'm', title: 'Tabără', custom: { Loc: 'Brașov', Tags: ['a', 'b'], An: 2026 } };
    const re = buildRegex({ query: 'a' });
    const r = replaceInFields(node, '', '', re, 'X', ['custom']);
    expect(r.node.custom).toEqual({ Loc: 'BrXșov', Tags: ['X', 'b'], An: 2026 });
    expect(r.node.title).toBe('Tabără'); // not selected: untouched
    expect(node.custom).toEqual({ Loc: 'Brașov', Tags: ['a', 'b'], An: 2026 }); // input node not mutated
    expect(node.custom.Tags).toEqual(['a', 'b']); // the array was copied, not replaced in place
    expect(r.count).toBe(2);
    expect(r.docHtml).toBe('');
  });

  it('replaces every string item inside custom arrays', () => {
    const node = { id: 'm', custom: { Tags: ['ana', 'bana'] } };
    const re = buildRegex({ query: 'a' });
    const r = replaceInFields(node, '', '', re, 'o', ['custom']);
    expect(r.node.custom.Tags).toEqual(['ono', 'bono']);
    expect(r.count).toBe(4);
    expect(node.custom.Tags).toEqual(['ana', 'bana']);
  });
});

describe('replaceSnapshotHtml (Scrivener §11.3)', () => {
  it('replaces the archived html like the document text, markup intact', () => {
    const re = buildRegex({ query: 'pădure' });
    const r = replaceSnapshotHtml('<p>Ana în <em>pădure</em>.</p>', re, 'codru');
    expect(r.html).toBe('<p>Ana în <em>codru</em>.</p>');
    expect(r.count).toBe(1);
  });
  it('no-op without a regex', () => {
    expect(replaceSnapshotHtml('<p>Ana</p>', null, 'x')).toEqual({ html: '<p>Ana</p>', count: 0 });
  });
});

describe('startsWith / endsWith operators (Scrivener §11.2.1)', () => {
  it('matches only at a word edge', () => {
    // a word that BEGINS with „pădur" (Pădurea, pădure) matches; nothing begins with „dure",
    // while „pădure" (word-final) ends with it.
    expect(ids(searchProject(project, docs, notes, { query: 'pădur', operator: 'startsWith' }))).toEqual(['a', 'c', 'r']);
    expect(ids(searchProject(project, docs, notes, { query: 'dure', operator: 'startsWith' }))).toEqual([]);
    expect(ids(searchProject(project, docs, notes, { query: 'dure', operator: 'endsWith' }))).toEqual(['a', 'c', 'r']);
    expect(ids(searchProject(project, docs, notes, { query: 'păd', operator: 'startsWith' }))).toEqual(['a', 'c', 'r']);
  });
  it('is case-insensitive by default and respects caseSensitive', () => {
    expect(ids(searchProject(project, docs, notes, { query: 'PĂD', operator: 'startsWith' }))).toEqual(['a', 'c', 'r']);
    expect(ids(searchProject(project, docs, notes, { query: 'PĂD', operator: 'startsWith', caseSensitive: true }))).toEqual([]);
  });
  it('honours wholeWord-style exclusions: interior matches are ignored', () => {
    expect(ids(searchProject(project, docs, notes, { query: 'ădur', operator: 'startsWith' }))).toEqual([]);
  });
});

describe('invert results (Scrivener §11.1.2)', () => {
  it('returns the nodes that do NOT match, trash still hidden', () => {
    // folder „f" is an item too and does not match, so it is listed inverted
    const res = searchProject(project, docs, notes, { query: 'pădure', invert: true });
    expect(ids(res)).toEqual(['b', 'f']);
  });
  it('uses the same operator for the decision', () => {
    const res = searchProject(project, docs, notes, { query: 'păd', operator: 'startsWith', invert: true });
    expect(ids(res)).toEqual(['b', 'f']);
  });
  it('with empty query returns everything (filter-driven lists)', () => {
    const res = searchProject(project, docs, notes, { query: '', invert: true });
    expect(ids(res)).toEqual(['a', 'b', 'f', 'c', 'r']);
  });
  it('combines with filters: onlyCompile keeps compile-included nodes only', () => {
    // c inherits its folder's compile exclusion, so it fails the filter too
    const res = searchProject(project, docs, notes, { query: '', onlyCompile: true, invert: true });
    expect(ids(res)).toEqual(['a', 'b']);
  });
});

describe('sorting results (Scrivener §11.1.1)', () => {
  const titled = {
    tree: [
      { id: 'draft', root: 'draft', title: 'Manuscris', children: [
        { id: 'z', type: 'text', title: 'zar', synopsis: ' comun ', created: '2026-01-03T10:00:00Z' },
        { id: 'ă', type: 'text', title: 'ază', synopsis: ' comun ', created: '2026-01-01T10:00:00Z' },
        { id: 'a', type: 'text', title: 'aan', synopsis: ' comun ', created: '2026-01-02T10:00:00Z' },
      ] },
    ],
  };
  const emptyDocs = { z: '', 'ă': '', a: '' };
  it('binder order is the default', () => {
    expect(ids(searchProject(titled, emptyDocs, {}, { query: 'comun' }))).toEqual(['z', 'ă', 'a']);
  });
  it('sorts by title with Romanian collation, ascending and descending', () => {
    expect(ids(searchProject(titled, emptyDocs, {}, { query: 'comun', sort: 'title' }))).toEqual(['a', 'ă', 'z']);
    expect(ids(searchProject(titled, emptyDocs, {}, { query: 'comun', sort: 'title', sortDesc: true }))).toEqual(['z', 'ă', 'a']);
  });
  it('sorts by created date, oldest first and newest first', () => {
    expect(ids(searchProject(titled, emptyDocs, {}, { query: 'comun', sort: 'created' }))).toEqual(['ă', 'a', 'z']);
    expect(ids(searchProject(titled, emptyDocs, {}, { query: 'comun', sort: 'created', sortDesc: true }))).toEqual(['z', 'a', 'ă']);
  });
});

describe('special search terms (Scrivener §11.1.3)', () => {
  it('mixes quoted phrases with All Words', () => {
    expect(ids(searchProject(project, docs, notes, { query: 'Ana "în pădure"', operator: 'all' }))).toEqual(['a']);
    expect(ids(searchProject(project, docs, notes, { query: 'Ana "în pădure"', operator: 'any' }))).toEqual(['a', 'b', 'r']);
  });
  it('excludes words with a hyphen, in both operators', () => {
    expect(ids(searchProject(project, docs, notes, { query: 'Ana -Dovahkiin', operator: 'any' }))).toEqual(['a', 'b', 'r']);
    expect(ids(searchProject(project, docs, notes, { query: 'pădure -Ana', operator: 'all' }))).toEqual(['c']);
    expect(ids(searchProject(project, docs, notes, { query: 'pădure -"în pădure"', operator: 'all' }))).toEqual(['c', 'r']);
  });
  it('universal wildcard returns everything (combinable with filters)', () => {
    expect(ids(searchProject(project, docs, notes, { query: '*' }))).toEqual(['a', 'b', 'f', 'c', 'r']);
    expect(ids(searchProject(project, docs, notes, { query: '*', labels: ['Scenă'] }))).toEqual(['a']);
  });
  it('literal asterisk inside a word stays a literal', () => {
    expect(ids(searchProject(project, docs, notes, { query: 'pă*re' }))).toEqual([]);
  });
});

describe('date search syntax mdate:/cdate: (Scrivener §11.1.3, Table 11.1)', () => {
  const dated = {
    tree: [
      { id: 'draft', root: 'draft', title: 'Manuscris', children: [
        { id: 'd1', type: 'text', title: 'Vechi', created: '2017-03-05T10:00:00Z', modified: '2017-04-01T10:00:00Z' },
        { id: 'd2', type: 'text', title: 'Recent', created: '2026-01-15T10:00:00Z', modified: '2026-10-29T10:00:00Z' },
        { id: 'd3', type: 'text', title: 'Fără date' },
      ] },
    ],
  };
  const noDocs = { d1: '', d2: '', d3: '' };
  it('bare values: year, month and exact day', () => {
    expect(ids(searchProject(dated, noDocs, {}, { query: 'cdate:2017' }))).toEqual(['d1']);
    expect(ids(searchProject(dated, noDocs, {}, { query: 'cdate:2017-03' }))).toEqual(['d1']);
    expect(ids(searchProject(dated, noDocs, {}, { query: 'cdate:2017-03-05' }))).toEqual(['d1']);
    expect(ids(searchProject(dated, noDocs, {}, { query: 'cdate:2017-03-06' }))).toEqual([]);
  });
  it('before and after', () => {
    expect(ids(searchProject(dated, noDocs, {}, { query: 'cdate:<2018' }))).toEqual(['d1']);
    expect(ids(searchProject(dated, noDocs, {}, { query: 'cdate:>2020' }))).toEqual(['d2']);
    expect(ids(searchProject(dated, noDocs, {}, { query: 'mdate:>2026-10-01' }))).toEqual(['d2']);
  });
  it('relative values: 7d, <1y', () => {
    expect(ids(searchProject(dated, noDocs, {}, { query: 'mdate:7d' }))).toEqual(['d2']);
    expect(ids(searchProject(dated, noDocs, {}, { query: 'mdate:<1y' }))).toEqual(['d1']);
  });
  it('date conditions AND with each other and with the text terms', () => {
    expect(ids(searchProject(dated, noDocs, {}, { query: 'cdate:>2020 cdate:<2027' }))).toEqual(['d2']);
    expect(ids(searchProject(dated, noDocs, {}, { query: 'Recent mdate:>2026-10-01' }))).toEqual(['d2']);
    expect(ids(searchProject(dated, noDocs, {}, { query: 'Recent mdate:<2020' }))).toEqual([]);
    expect(ids(searchProject(project, docs, notes, { query: 'pădure cdate:>2020' }))).toEqual([]);
  });
  it('nodes without dates never satisfy a date condition', () => {
    expect(ids(searchProject(dated, noDocs, {}, { query: 'cdate:>2000' }))).toEqual(['d1', 'd2']);
  });
});
