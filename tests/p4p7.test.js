import { describe, it, expect } from 'vitest';
import { firstLineTitle, isUntitled, folderizeNewParents, viewForNode, viewForSelection, folderDoubleClickMode, dropHtml } from '../src/lib/behaviors.js';
import { searchProject, listOccurrences, replaceInFields, buildTerms, occurrenceKey, nodeKind } from '../src/lib/projectSearch.js';
import { formattedRuns, replaceInHtml, buildRegex } from '../src/lib/search.js';
import { DEFAULT_KEYS, assignShortcut, holdersOf, parseShortcutSet, serializeShortcutSet, conflicts } from '../src/lib/commands.js';
import { moveCollection, setCollectionSearch, collectionCriteria, createCollection } from '../src/lib/collections.js';
import { DEFAULT_SETTINGS, PANE_KEYS } from '../src/lib/settingsDefaults.js';
import { quickCriteria } from '../src/components/QuickSearch.jsx';
import { uiRo, uiEn } from '../src/lib/i18n-ui.js';
import windowPrefs from '../lib/windowPrefs.cjs';

const project = () => ({
  tree: [
    {
      id: 'draft', root: 'draft', title: 'Manuscris', children: [
        { id: 'a', type: 'text', title: 'Capitolul unu', synopsis: 'un leu', created: '2024-01-05T10:00:00Z', modified: '2024-03-01T10:00:00Z', custom: { POV: 'Ana', Loc: 'Cluj' } },
        { id: 'b', type: 'folder', title: 'Partea a doua', created: '2024-02-10T10:00:00Z', modified: '2024-02-11T10:00:00Z', children: [
          { id: 'c', type: 'text', title: 'Scena', created: '2024-02-12T10:00:00Z', custom: { POV: 'Ion', Loc: 'Ana' } },
        ] },
        { id: 'p', type: 'text', title: 'Părinte', children: [{ id: 'q', type: 'text', title: 'Copil' }] },
      ],
    },
    { id: 'research', root: 'research', title: 'Cercetare', children: [{ id: 'img', type: 'file', title: 'Hartă', file: 'h.png' }] },
    { id: 'trash', root: 'trash', title: 'Coș', children: [] },
  ],
  collections: [],
});
const docs = {
  a: '<p>Un leu și un <strong>leu bold</strong> și <em>alt leu</em>.</p>',
  c: '<p>Fără <span data-comment="1">leu comentat</span> aici, leu.</p>',
  q: '<p>Nimic.</p>',
};

describe('Options › Behaviors helpers', () => {
  it('takes the first line as title, cut on a word', () => {
    expect(firstLineTitle('<p></p><p>  Primul rând  aici </p><p>al doilea</p>')).toBe('Primul rând aici');
    expect(firstLineTitle(`<p>${'cuvânt '.repeat(20)}</p>`, 20)).toMatch(/…$/);
    expect(firstLineTitle('')).toBe('');
  });
  it('knows untitled titles', () => {
    expect(isUntitled('', [])).toBe(true);
    expect(isUntitled('Document nou', ['Document nou'])).toBe(true);
    expect(isUntitled('Capitol', ['Document nou'])).toBe(false);
  });
  it('turns documents that just got children into folders, only those', () => {
    const before = project().tree;
    const after = structuredClone(before);
    after[0].children[0].children = [{ id: 'z', type: 'text', title: 'nou' }];
    const out = folderizeNewParents(before, after);
    expect(out[0].children[0].type).toBe('folder');
    expect(out[0].children[2].type).toBe('text'); // already had children before
    expect(folderizeNewParents(before, before)).toBe(before);
  });
  it('chooses views for folders, parents and selections', () => {
    const s = { folderView: 'corkboard', parentDocView: 'outline', multiSelectView: 'scrivenings' };
    const t = project().tree;
    expect(viewForNode(t[0].children[1], s)).toBe('corkboard');
    expect(viewForNode(t[0].children[2], s)).toBe('outline');
    expect(viewForNode(t[0].children[0], s)).toBe(null);
    expect(viewForNode(t[0].children[1], { folderView: 'keep' })).toBe(null);
    expect(viewForSelection(1, s)).toBe(null);
    expect(viewForSelection(3, s)).toBe('editor');
    expect(viewForSelection(3, { multiSelectView: 'corkboard' })).toBe('corkboard');
    expect(folderDoubleClickMode(t[0].children[1], { folderDoubleClick: 'expand' })).toBe('expand');
    expect(folderDoubleClickMode(t[0].children[0], { folderDoubleClick: 'expand' })).toBe(null);
  });
  it('builds the HTML dropped from the binder', () => {
    const t = project().tree;
    const a = t[0].children[0];
    expect(dropHtml([a], 'link')).toBe('<a href="scribner://doc/a">Capitolul unu</a>');
    expect(dropHtml([a], 'text', { docs })).toBe(docs.a);
    const img = t[1].children[0];
    expect(dropHtml([img], 'image', { images: { img: 'data:image/png;base64,AA' } })).toContain('<img src="data:image/png;base64,AA"');
    expect(dropHtml([img], 'image')).toContain('href="scribner://doc/img"'); // no image data: a link
  });
});

describe('Project search: new criteria', () => {
  it('searches one metadata field by name', () => {
    const all = searchProject(project(), docs, {}, { query: 'Ana', fields: ['custom'] });
    expect(all.map((r) => r.node.id)).toEqual(['a', 'c']);
    const pov = searchProject(project(), docs, {}, { query: 'Ana', fields: ['custom'], customField: 'POV' });
    expect(pov.map((r) => r.node.id)).toEqual(['a']);
  });
  it('filters by document type and dates', () => {
    expect(nodeKind(project().tree[0].children[2])).toBe('parent');
    const folders = searchProject(project(), docs, {}, { query: '', types: ['folder'] });
    expect(folders.map((r) => r.node.id)).toEqual(['b']);
    const files = searchProject(project(), docs, {}, { query: '', types: ['file'] });
    expect(files.map((r) => r.node.id)).toEqual(['img']);
    const feb = searchProject(project(), docs, {}, { query: '', createdFrom: '2024-02-01', createdTo: '2024-02-28' });
    expect(feb.map((r) => r.node.id)).toEqual(['b', 'c']);
    const mod = searchProject(project(), docs, {}, { query: 'leu', modifiedFrom: '2024-03-01' });
    expect(mod.map((r) => r.node.id)).toEqual(['a']);
  });
  it('finds by formatting across the project', () => {
    expect(formattedRuns(docs.a, 'bold')).toEqual(['leu bold']);
    expect(formattedRuns(docs.a, 'italic')).toEqual(['alt leu']);
    expect(formattedRuns('<p><strong>a <strong>b</strong> c</strong> <b>d</b></p>', 'bold')).toEqual(['a b c', 'd']);
    expect(formattedRuns(docs.c, 'comment')).toEqual(['leu comentat']);
    const bold = searchProject(project(), docs, {}, { query: '', format: 'bold' });
    expect(bold.map((r) => r.node.id)).toEqual(['a']);
    expect(bold[0].snippets[0].match).toBe('leu bold');
    // With text: only matches inside the formatted runs count.
    const inComment = searchProject(project(), docs, {}, { query: 'leu', fields: ['text'], format: 'comment' });
    expect(inComment.map((r) => r.node.id)).toEqual(['c']);
    expect(inComment[0].fields.text).toBe(1);
  });
});

describe('Replace preview with exclusions', () => {
  it('lists every occurrence with its replacement', () => {
    const occ = listOccurrences(project(), docs, {}, { query: 'leu', fields: ['text', 'synopsis'] }, 'tigru');
    expect(occ.filter((o) => o.id === 'a' && o.field === 'text')).toHaveLength(3);
    expect(occ.find((o) => o.id === 'a' && o.field === 'synopsis').replaced).toBe('tigru');
    expect(occ.map((o) => o.key)).toContain(occurrenceKey('c', 0, 'text', 1));
  });
  it('leaves excluded occurrences as they are', () => {
    const re = buildTerms({ query: 'leu' })[0];
    const keep = (f, i) => !(f === 'text' && i === 1);
    const r = replaceInFields({ id: 'a', title: 'x' }, docs.a, '', re, 'tigru', ['text'], keep);
    expect(r.count).toBe(2);
    expect(r.docHtml).toBe('<p>Un tigru și un <strong>leu bold</strong> și <em>alt tigru</em>.</p>');
    const plain = replaceInFields({ id: 'a', title: 'leu leu' }, '', '', re, 'tigru', ['title'], (f, i) => i === 1);
    expect(plain.node.title).toBe('leu tigru');
    expect(replaceInHtml('<p>a a a</p>', buildRegex({ query: 'a' }), 'b', (i) => i !== 0).html).toBe('<p>a b b</p>');
  });
  it('preview built with exclusions keeps their keys stable', () => {
    const crit = { query: 'leu', fields: ['text'] };
    const excluded = new Set([occurrenceKey('a', 0, 'text', 0)]);
    const occ = listOccurrences(project(), docs, {}, crit, 'tigru', excluded);
    expect(occ.find((o) => o.key === occurrenceKey('a', 0, 'text', 0)).match).toBe('leu');
  });
});

describe('Keyboard: sets, search by shortcut, replace in one step', () => {
  const ids = Object.keys(DEFAULT_KEYS);
  it('has no default key collisions (F4 = Insert Citation included)', () => {
    expect(DEFAULT_KEYS.insertCitation).toBe('F4');
    expect(conflicts(ids, {}).size).toBe(0);
    expect(DEFAULT_KEYS.goto).toBe('Ctrl+J');
  });
  it('finds the command holding a shortcut and moves it in one step', () => {
    expect(holdersOf(ids, 'ctrl+s', {})).toEqual(['save']);
    const next = assignShortcut({}, ids, 'compile', 'Ctrl+S');
    expect(next.compile).toBe('Ctrl+S');
    expect(next.save).toBe('');
    expect(conflicts(ids, { shortcuts: next }).size).toBe(0);
  });
  it('saves and loads a set file', () => {
    const text = serializeShortcutSet({ save: 'Ctrl+Shift+S', unknown: 'F2', merge: '' });
    expect(parseShortcutSet(text, ids)).toEqual({ save: 'Ctrl+Shift+S', merge: '' });
    expect(() => parseShortcutSet('{"x":1}', ids)).toThrow();
  });
});

describe('Collections: order, saved-search criteria', () => {
  it('moves tabs and edits search criteria', () => {
    let p = project();
    p = createCollection(p, { title: 'A', ids: [] }).project;
    p = createCollection(p, { title: 'B', type: 'search', search: { query: 'leu', options: {} } }).project;
    p = createCollection(p, { title: 'C' }).project;
    const [a, b, c] = p.collections;
    const moved = moveCollection(p, c.id, 0);
    expect(moved.collections.map((x) => x.title)).toEqual(['C', 'A', 'B']);
    const edited = setCollectionSearch(p, b.id, { query: 'tigru', fields: ['title'], types: ['folder'] });
    expect(collectionCriteria(edited.collections[1])).toEqual({ query: 'tigru', fields: ['title'], types: ['folder'] });
    expect(setCollectionSearch(p, a.id, { query: 'x' }).collections[0].search).toBeUndefined();
  });
});

describe('Settings and quick search', () => {
  it('has a default for every pane key and strings in both languages', () => {
    for (const k of PANE_KEYS) expect(DEFAULT_SETTINGS).toHaveProperty(k);
    for (const k of Object.keys(uiRo).filter((x) => x.startsWith('ui.p4.') || x.startsWith('ui.p7.'))) expect(uiEn[k]).toBeTruthy();
    expect(uiRo['set.tab.navigation']).toBe('Navigare');
  });
  it('turns quick-search options into criteria', () => {
    expect(quickCriteria('a.b', { operator: 'regex' })).toMatchObject({ regex: true, operator: 'exact' });
    expect(quickCriteria('x', {}).fields).not.toContain('notes');
    expect(quickCriteria('x', { fields: ['notes'] }).fields).toEqual(['notes']);
  });
  it('reads window size and the projects to reopen', () => {
    expect(windowPrefs.windowSize({})).toEqual({ width: 1400, height: 900, maximized: false });
    expect(windowPrefs.windowSize({ windowWidth: '100', windowHeight: 'x', startMaximized: true })).toEqual({ width: 900, height: 900, maximized: true });
    expect(windowPrefs.startupDirs({ startupAction: 'reopenAll', openAtClose: ['/a', '/a', '/b'] })).toEqual(['/a', '/b']);
    expect(windowPrefs.startupDirs({ startupAction: 'reopenLast', openAtClose: ['/a'] })).toEqual([]);
  });
});
