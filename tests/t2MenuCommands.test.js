import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { createRequire } from 'module';
// T2 (docs/audit/scrivener3, Anexa A — GOLURI NOI P1/P2): comenzile lipsă din meniuri.
const require = createRequire(import.meta.url);
const { groupIntoFolder, ungroupFolder, moveToTrash, restoreFromTrash, findNode } = require('../src/lib/tree.js');
const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const n = (id, type = 'text', children) => ({ id, type, title: id, ...(children ? { children } : {}) });
const TREE = () => [
  { ...n('draft', 'folder', [n('a'), n('b'), n('c')]), root: 'draft' },
  { ...n('trash', 'folder', []), root: 'trash' },
];

describe('tree.js — ungroupFolder (S3-A.DOC.17)', () => {
  it('inversează groupIntoFolder: copiii urcă la poziția dosarului', () => {
    let t = TREE();
    t = groupIntoFolder(t, ['a', 'b'], n('g', 'folder'));
    expect(findNode(t, 'g').children.map((c) => c.id)).toEqual(['a', 'b']);
    expect(findNode(t, 'draft').children.map((c) => c.id)).toEqual(['g', 'c']);
    t = ungroupFolder(t, 'g');
    expect(findNode(t, 'draft').children.map((c) => c.id)).toEqual(['a', 'b', 'c']);
    expect(findNode(t, 'g')).toBeFalsy();
  });
  it('refuză rădăcinile, textele și dosarele goale (fără efect)', () => {
    const t = TREE();
    expect(ungroupFolder(t, 'draft')).toBe(t);
    expect(ungroupFolder(t, 'a')).toBe(t);
    const g = groupIntoFolder(t, ['a'], n('g', 'folder'));
    expect(ungroupFolder(g, 'c')).toBe(g);
  });
  it('round-trip cu gunoi: trash → restore rămâne intact', () => {
    let t = TREE();
    t = moveToTrash(t, 'a');
    expect(findNode(t, 'trash').children.map((c) => c.id)).toEqual(['a']);
    t = restoreFromTrash(t, 'a');
    expect(findNode(t, 'draft').children.map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('T2 — comenzile nou înregistrate în App', () => {
  it('tuples: moveToTrash, ungroup, groupDocuments, copyTo, setSelTextAsTitle, clearTitle, selectWithSubdocs, copyTextOfDocs, revealDraft, expandAll, collapseAll', () => {
    const app = src('src/App.jsx');
    for (const id of ['moveToTrash', 'ungroup', 'groupDocuments', 'copyTo', 'setSelTextAsTitle', 'clearTitle', 'selectWithSubdocs', 'copyTextOfDocs', 'revealDraft', 'expandAll', 'collapseAll']) {
      expect(app, id).toContain(`'${id}'`);
    }
  });
  it('copyTo are dialog propriu peste PickNodeDialog, cu copyItems', () => {
    const app = src('src/App.jsx');
    expect(app).toContain("dialog === 'copyTo'");
    expect(app).toContain('copyItems(selectionList(), id, \'inside\')');
  });
  it('expand/collapse all ajung în Binder prin eveniment, refolosind setAllCollapsed', () => {
    expect(src('src/components/Binder.jsx')).toContain('pneuma:binder-set-all-collapsed');
    expect(src('src/App.jsx')).toContain('pneuma:binder-set-all-collapsed');
  });
  it('editorMenus: ghilimele drepte, word joiner, linie orizontală, legături (EDIT.58, INS.14–15, EDIT.39–41)', () => {
    const em = src('src/lib/editorMenus.js');
    for (const k of ['straightQuotes', 'wordJoiner', 'horizontalLine', 'removeLink', 'openLinkEditor']) {
      expect(em, k).toContain(`L('${k}')`);
    }
  });
  it('selectWithSubdocs intră în submeniul Edit ▸ Select', () => {
    expect(src('src/lib/menuLayout.js')).toContain("'selectParagraph', 'selectWithSubdocs'");
  });
  it('etichetele RO/EN există pentru toate comenzile noi', () => {
    const i = src('src/lib/i18n.js');
    for (const c of ['moveToTrash', 'ungroup', 'groupDocuments', 'copyTo', 'setSelTextAsTitle', 'clearTitle', 'selectWithSubdocs', 'copyTextOfDocs', 'revealDraft', 'expandAll', 'collapseAll']) {
      expect(i.match(new RegExp(`'cmd\\.${c}':`, 'g'))?.length, c).toBe(2);
    }
  });
});
