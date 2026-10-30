import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const compile = require('../lib/compile.cjs');
const F = require('../lib/compileFormats.cjs');

import { listTemplates, cloneFromTemplate, templateTargetParent } from '../src/lib/documentTemplates.js';
import { findNode, flatten } from '../src/lib/tree.js';
import { uiRo, uiEn } from '../src/lib/i18n-ui.js';
import { dictionaries } from '../src/lib/i18n.js';

// Document Templates (Scrivener 3 §7.5): the templates folder holds child documents that
// act as templates; "New from Template" deep-clones one into a target container.

const seq = () => { let n = 0; return () => `n${++n}`; };

const baseTree = () => ([
  { id: 'draft', root: 'draft', title: 'Manuscris', children: [
    { id: 'ch1', type: 'folder', title: 'Capitolul 1', children: [
      { id: 's1', type: 'text', title: 'Scena 1' },
    ] },
  ] },
  { id: 'research', root: 'research', title: 'Cercetare', children: [
    { id: 'tplf', type: 'folder', title: 'Șabloane', children: [
      { id: 'tplChapter', type: 'folder', title: 'Șablon: Capitol', children: [
        { id: 'tplKid1', type: 'text', title: 'Scenă model' },
        { id: 'tplKid2', type: 'text', title: 'Notă model', label: 'Roșu' },
      ] },
      { id: 'tplScene', type: 'text', title: 'Șablon: Scenă', synopsis: 'Sinopsis model', keywords: ['a', 'b'], custom: { eticheta: 'x' } },
    ] },
  ] },
]);

describe('listTemplates', () => {
  it('returns the templates folder children in binder order', () => {
    expect(listTemplates({ tree: baseTree(), templateFolder: 'tplf' }).map((n) => n.id)).toEqual(['tplChapter', 'tplScene']);
  });
  it('is empty when the feature is off (no folder, cleared) or the folder is gone', () => {
    expect(listTemplates({ tree: baseTree() })).toEqual([]);
    expect(listTemplates({ tree: baseTree(), templateFolder: null })).toEqual([]);
    expect(listTemplates({ tree: baseTree(), templateFolder: 'stale-id' })).toEqual([]);
    expect(listTemplates({ tree: baseTree(), templateFolder: 'ch1' }).map((n) => n.id)).toEqual(['s1']);
  });
  it('is empty when the folder has no children', () => {
    const tree = baseTree();
    findNode(tree, 'tplf').children = [];
    expect(listTemplates({ tree, templateFolder: 'tplf' })).toEqual([]);
  });
});

describe('cloneFromTemplate', () => {
  it('deep-clones a folder template with children, new ids everywhere, same title', () => {
    const tree = baseTree();
    const { tree: next, newNode, pairs } = cloneFromTemplate(tree, 'tplChapter', 'draft');
    expect(newNode).toBeTruthy();
    expect(newNode.title).toBe('Șablon: Capitol');
    expect(newNode.title).not.toContain('(copie)');
    expect(newNode.children.map((c) => c.title)).toEqual(['Scenă model', 'Notă model']);
    expect(newNode.children.map((c) => c.id)).not.toEqual(['tplKid1', 'tplKid2']);
    // placed inside the target container (appended last)
    const draft = findNode(next, 'draft');
    expect(draft.children.map((n) => n.id)).toEqual(['ch1', newNode.id]);
    // every cloned node got a fresh id, mapped old -> new in pairs (pre-order)
    expect(pairs.map(([o]) => o)).toEqual(['tplChapter', 'tplKid1', 'tplKid2']);
    expect(pairs.map(([, n]) => n)).toEqual([newNode.id, ...newNode.children.map((c) => c.id)]);
    // no duplicate ids in the whole tree
    const ids = flatten(next).map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('leaves the original template untouched (immutable update)', () => {
    const tree = baseTree();
    const snapshot = JSON.stringify(tree);
    const { tree: next } = cloneFromTemplate(tree, 'tplChapter', 'draft');
    expect(JSON.stringify(tree)).toBe(snapshot); // the input tree object was not mutated
    const tpl = findNode(next, 'tplChapter');
    expect(tpl.children.map((c) => c.id)).toEqual(['tplKid1', 'tplKid2']); // still the template's own children
    expect(findNode(next, 'tplf').children.map((n) => n.id)).toEqual(['tplChapter', 'tplScene']);
  });
  it('copies metadata and marks the instance included in compile', () => {
    const { newNode } = cloneFromTemplate(baseTree(), 'tplScene', 'draft');
    expect(newNode.synopsis).toBe('Sinopsis model');
    expect(newNode.keywords).toEqual(['a', 'b']);
    expect(newNode.custom).toEqual({ eticheta: 'x' });
    expect(newNode.includeInCompile).toBe(true);
    expect(newNode.type).toBe('text');
  });
  it('clones into a text document too (Scrivener file group)', () => {
    const { tree: next, newNode } = cloneFromTemplate(baseTree(), 'tplScene', 's1');
    expect(findNode(next, 's1').children.map((n) => n.id)).toEqual([newNode.id]);
  });
  it('accepts an injected id generator (deterministic ids)', () => {
    const nid = seq();
    const { newNode, pairs } = cloneFromTemplate(baseTree(), 'tplScene', 'draft', { newId: nid });
    expect(newNode.id).toBe('n1');
    expect(pairs).toEqual([['tplScene', 'n1']]);
  });
  it('refuses roots, unknown templates and unknown targets (tree unchanged)', () => {
    const tree = baseTree();
    expect(cloneFromTemplate(tree, 'draft', 'draft')).toEqual({ tree, newNode: null, pairs: [] });
    expect(cloneFromTemplate(tree, 'nope', 'draft')).toEqual({ tree, newNode: null, pairs: [] });
    expect(cloneFromTemplate(tree, 'tplScene', 'nope')).toEqual({ tree, newNode: null, pairs: [] });
    expect(cloneFromTemplate(tree, 'tplScene', null)).toEqual({ tree, newNode: null, pairs: [] });
  });
});

describe('templateTargetParent', () => {
  const tree = baseTree();
  it('is the selected folder itself', () => {
    expect(templateTargetParent(tree, 'ch1')).toBe('ch1');
    expect(templateTargetParent(tree, 'draft')).toBe('draft'); // roots count as containers
  });
  it('is the selection\'s parent for a text document', () => {
    expect(templateTargetParent(tree, 's1')).toBe('ch1');
    expect(templateTargetParent(tree, 'tplScene')).toBe('tplf');
  });
  it('falls back to the first root for an empty or unknown selection', () => {
    expect(templateTargetParent(tree, null)).toBe('draft');
    expect(templateTargetParent(tree, 'nope')).toBe('draft');
  });
});

describe('compile safety (§7.5.1: the templates folder never compiles)', () => {
  const tree = () => ([
    { id: 'draft', root: 'draft', title: 'Manuscris', children: [
      { id: 'tplInDraft', type: 'folder', title: 'Șabloane în Draft', children: [
        { id: 'tplDoc', type: 'text', title: 'Șablon în Draft' },
      ] },
      { id: 'ch1', type: 'folder', title: 'Capitolul 1', children: [
        { id: 's1', type: 'text', title: 'Scena 1' },
      ] },
    ] },
  ]);
  const read = (id) => (id === 'tplDoc' ? '<p>CONTINUT-SABLON</p>' : id === 's1' ? '<p>Text normal</p>' : '');

  it('collectSections skips the templates folder even nested in the Draft', () => {
    const sections = compile.collectSections({ tree: tree(), templateFolder: 'tplInDraft' }, read);
    const all = JSON.stringify(sections);
    expect(all).not.toContain('CONTINUT-SABLON');
    expect(all).not.toContain('Șabloane în Draft');
    expect(all).toContain('Text normal');
  });
  it('collectSections includes it again when no templates folder is set (regression guard)', () => {
    const sections = compile.collectSections({ tree: tree(), templateFolder: null }, read);
    expect(JSON.stringify(sections)).toContain('CONTINUT-SABLON');
  });
  it('the document-model walker (buildDocument via compileHtml) skips it too', () => {
    const fmt = () => JSON.parse(JSON.stringify(F.PRESETS[0]));
    const html = compile.compileHtml({ tree: tree(), templateFolder: 'tplInDraft' }, read, { format: fmt() });
    expect(html).not.toContain('CONTINUT-SABLON');
    expect(html).toContain('Text normal');
    const htmlAll = compile.compileHtml({ tree: tree(), templateFolder: null }, read, { format: fmt() });
    expect(htmlAll).toContain('CONTINUT-SABLON');
  });
});

describe('i18n (ro + en)', () => {
  it('has the Document Templates strings in both languages', () => {
    expect(uiRo['ui.documentTemplates.niciun_sablon']).toBeTruthy();
    expect(uiEn['ui.documentTemplates.niciun_sablon']).toBeTruthy();
    expect(dictionaries.ro['cmd.newFromTemplate']).toBe('Document nou din șablon');
    expect(dictionaries.en['cmd.newFromTemplate']).toBe('New from Template');
  });
});
