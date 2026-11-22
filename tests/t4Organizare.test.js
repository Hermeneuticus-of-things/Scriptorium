import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { createRequire } from 'module';
// T4 — organizare (docs/audit/scrivener3, goluri ch. 5–7): Copy To Project, adaptive naming,
// filtre folder-sync (Trashed Files + prefix numeric).
const require = createRequire(import.meta.url);
const { selectionForCopy, insertIntoTree, cloneNode } = require('../lib/copyIntoProject.cjs');
const folderSync = require('../lib/folderSync.cjs');
import { displayTitle, findNode } from '../src/lib/treeCore.js';
import { makeSyncDraft, applySyncDraft, SYNC_KEYS } from '../src/lib/projectSync.js';
import { helpSearch } from '../src/lib/help/search.js';
import { ARTICLES } from '../src/lib/help/articles.js';
const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const n = (id, type = 'text', children) => ({ id, type, title: id, ...(children ? { children } : {}) });

describe('copyIntoProject — clonarea selecției (S3-A.DOC.21)', () => {
  const TREE = () => [
    { id: 'draft', root: 'draft', type: 'folder', children: [n('a'), n('b'), { ...n('f', 'folder', [n('a1'), n('a2')]) }] },
    { id: 'trash', root: 'trash', type: 'folder', children: [n('t')] },
  ];
  it('clonează selecția cu id-uri noi și păstrează structura', () => {
    const { nodes, pairs } = selectionForCopy(TREE(), ['f']);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].children.map((c) => c.title)).toEqual(['a1', 'a2']);
    expect(pairs.some(([o, nn]) => o === 'a1' && nn && nn !== 'a1')).toBe(true);
    expect(nodes[0].id).not.toBe('f');
  });
  it('extrage elementele selectate din adâncime, fără părinte', () => {
    const { nodes } = selectionForCopy(TREE(), ['a1']);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).not.toBe('a1');
  });
  it('rădăcinile și Coșul nu se copiază', () => {
    expect(selectionForCopy(TREE(), ['draft'])).toBeNull();
    expect(selectionForCopy(TREE(), ['trash'])).toBeNull();
    expect(selectionForCopy(TREE(), ['t']).nodes).toHaveLength(1); // element din Coș, la cerere
  });
  it('insertIntoTree pune nodurile în Draft', () => {
    const target = [{ id: 'draft', root: 'draft', type: 'folder', children: [] }];
    const out = insertIntoTree(target, [n('x'), n('y')]);
    expect(out[0].children.map((c) => c.id)).toEqual(['x', 'y']);
  });
  it('selecția vidă → null (nu scrie nimic)', () => {
    expect(selectionForCopy(TREE(), [])).toBeNull();
    expect(selectionForCopy(TREE(), ['draft', 'trash'])).toBeNull();
  });
});

describe('adaptive naming (S3-O.04) — displayTitle', () => {
  it('titlul scris câștigă întotdeauna', () => {
    expect(displayTitle({ title: 'Titlu', synopsis: 'Sinopsis', children: [] }, '<p>Text</p>')).toBe('Titlu');
  });
  it('fără titlu → primul rând de sinopsis', () => {
    expect(displayTitle({ title: '', synopsis: 'Primul rând\nAl doilea', children: [] }, '')).toBe('Primul rând');
  });
  it('fără titlu nici sinopsis → primele cuvinte din text (fără taguri)', () => {
    expect(displayTitle({ title: '', synopsis: '', children: [] }, '<h1>Capitol</h1><p>Prima frază.</p>')).toContain('Capitol');
  });
  it('nimic deloc → șir gol (Binder își arată placeholderul)', () => {
    expect(displayTitle({ title: '', synopsis: '', children: [] }, '')).toBe('');
  });
});

describe('folderSync — Trashed Files + prefix numeric (S3-B.SHR, T4c)', () => {
  const proj = () => ({
    title: 'T',
    tree: [
      { id: 'draft', root: 'draft', type: 'folder', children: [n('a', 'text', undefined)] },
      { id: 'trash', root: 'trash', type: 'folder', children: [n('t1')] },
    ],
  });
  const tmp = () => fs.mkdtempSync('pneuma-sync-');
  it('implicit: documentele din Coș rămân în afara sincronizării', () => {
    const d = tmp();
    const m = folderSync.syncOut(proj(), d, () => '<p>x</p>');
    expect(Object.keys(m.files)).toEqual(['a']);
    expect(fs.existsSync(d + '/Draft')).toBe(true);
    expect(fs.existsSync(d + '/Trashed Files')).toBe(false);
  });
  it('includeTrashed: Coșul ajunge în subdosarul „Trashed Files"', () => {
    const d = tmp();
    const m = folderSync.syncOut(proj(), d, () => '<p>x</p>', { includeTrashed: true });
    expect(Object.keys(m.files).sort()).toEqual(['a', 't1']);
    expect(fs.existsSync(d + '/Trashed Files')).toBe(true);
    expect(m.files.t1.file.startsWith('Trashed Files/')).toBe(true);
  });
  it('numericPrefix=false: nume simplu, fără prefix', () => {
    const d = tmp();
    const m = folderSync.syncOut(proj(), d, () => '<p>x</p>', { numericPrefix: false });
    expect(m.files.a.file).toBe('Draft/a.rtf'); // formatul implicit al syncOptions e rtf
    fs.rmSync(d, { recursive: true, force: true });
  });
  it('syncOptions expune noile opțiuni', () => {
    expect(folderSync.syncOptions({ syncIncludeTrashed: true, syncNumericPrefix: false })).toMatchObject({ includeTrashed: true, numericPrefix: false });
    expect(folderSync.syncOptions({})).toMatchObject({ includeTrashed: false, numericPrefix: true });
  });
  it('filtrul pe colecție: doar documentele din colecția aleasă intră în Draft', () => {
    const p2 = {
      title: 'T',
      collections: [{ id: 'col1', title: 'Col', ids: ['a'] }],
      syncCollectionId: 'col1',
      tree: [
        { id: 'draft', root: 'draft', type: 'folder', children: [n('a'), n('b')] },
      ],
    };
    const d = tmp();
    const m = folderSync.syncOut(p2, d, () => '<p>x</p>');
    expect(Object.keys(m.files)).toEqual(['a']);
    expect(m.files.a.file).toContain('Draft/');
    fs.rmSync(d, { recursive: true, force: true });
  });
  it('fără colecție setată: tot Draft-ul', () => {
    const p2 = { title: 'T', collections: [], tree: [{ id: 'draft', root: 'draft', type: 'folder', children: [n('a'), n('b')] }] };
    const d = tmp();
    const m = folderSync.syncOut(p2, d, () => '<p>x</p>');
    expect(Object.keys(m.files).sort()).toEqual(['a', 'b']);
    fs.rmSync(d, { recursive: true, force: true });
  });
  it('draft/apply sync: cele șase chei', () => {
    expect(SYNC_KEYS).toContain('syncIncludeTrashed');
    expect(SYNC_KEYS).toContain('syncNumericPrefix');
    const p = { syncIncludeTrashed: true, syncNumericPrefix: false };
    expect(applySyncDraft({}, makeSyncDraft(p)).syncIncludeTrashed).toBe(true);
    expect(applySyncDraft({}, makeSyncDraft(p)).syncNumericPrefix).toBe(false);
    expect(makeSyncDraft({}).numericPrefix).toBe(true);
  });
});

describe('T4 — cablaj în aplicație', () => {
  it('handlerul project:copyInto + garda de țintă (deschis/recent/dialog)', () => {
    const m = src('electron/main.cjs');
    expect(m).toContain("handle('project:copyInto'");
    expect(m).toContain('openedDirs.has(target)');
    expect(m).toContain("require('../lib/copyIntoProject.cjs')");
    const pre = src('electron/preload.cjs');
    expect(pre).toContain("call('project:copyInto'");
    expect(pre).toContain("call('project:pickDir'");
  });
  it('comanda copyToProject + dialogul cu liste de recente + Browse', () => {
    const app = src('src/App.jsx');
    expect(app).toContain("'copyToProject'");
    expect(app).toContain('<CopyToProjectDialog');
    expect(src('src/components/CopyToProjectDialog.jsx')).toContain('pickProjectDir');
  });
  it('Binder primește docTextFor și folosește displayTitle', () => {
    expect(src('src/App.jsx')).toContain('docTextFor={(id) => docs[id]');
    expect(src('src/components/Binder.jsx')).toContain('displayTitle(n, docTextFor ? docTextFor(id) : \'\')');
  });
  it('documentația Help conține articolul pentru Copy To Project', () => {
    // HELP-001: documentația descrie funcții reale — articolul e căutabil
    const r = helpSearch('copiez în alt proiect', ARTICLES);
    expect(r.results.length).toBeGreaterThan(0);
  });
});
