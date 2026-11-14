// P1 #26 Snapshots Manager: listarea pe tot proiectul, căutarea (nume/text/dată, plain + regex),
// ștergerea în masă cu validare și gruparea pe document cu binder path. Proiecte temporare.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { documentGroups, selectMany } from '../src/lib/snapshotList.js';
import { parseQuery, toSearchText } from '../src/lib/snapshotSearch.js';

const require = createRequire(import.meta.url);
const store = require('../lib/store.cjs');
const search = require('../lib/snapshotSearch.cjs');

function tmpProject() {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'snapmgr-')), 'P.scribner');
  store.createProject(dir, 'P');
  return dir;
}

function makeSnap(dir, id, name, html, dateOverride) {
  const s = store.takeSnapshot(dir, id, name);
  if (html !== undefined) {
    const p = path.join(dir, 'snapshots', id, s.file);
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    fs.writeFileSync(p, JSON.stringify({ ...data, html }));
  }
  return s;
}

describe('store.listAllSnapshots (G1)', () => {
  it('lists every snapshot of every document, without html, newest file first', () => {
    const dir = tmpProject();
    const a = store.newId();
    const b = store.newId();
    store.writeDoc(dir, a, 'docs', '<p>a</p>');
    store.writeDoc(dir, b, 'docs', '<p>b</p>');
    makeSnap(dir, a, 'una', '<p>text una</p>');
    makeSnap(dir, a, 'doua', '<p>text doua</p>');
    makeSnap(dir, b, 'trei', undefined);
    const all = store.listAllSnapshots(dir);
    expect(all.map((g) => g.id).sort()).toEqual([a, b].sort());
    const ga = all.find((g) => g.id === a);
    expect(ga.snaps.map((s) => s.name).sort()).toEqual(['doua', 'una']);
    for (const g of all) for (const s of g.snaps) {
      expect(Object.keys(s).sort()).toEqual(['date', 'file', 'name']);
      expect(s.file).toMatch(/\.json$/);
      expect(s.date).toMatch(/^\d{4}-\d\d-\d\dT/);
    }
  });
  it('skips _backup and damaged files, and returns [] without a snapshots folder', () => {
    const dir = tmpProject();
    const a = store.newId();
    store.writeDoc(dir, a, 'docs', '<p>a</p>');
    makeSnap(dir, a, 'una', '<p>text</p>');
    fs.mkdirSync(path.join(dir, 'snapshots', '_backup'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'snapshots', '_backup', '2026-01-01T00-00-00-000Z.json'), JSON.stringify({ name: 'backup', date: 'x', html: 'caută-asta' }));
    fs.writeFileSync(path.join(dir, 'snapshots', a, '2026-01-02T00-00-00-000Z.json'), '{deteriorat');
    expect(store.listAllSnapshots(dir).map((g) => g.id)).toEqual([a]);
    expect(store.listAllSnapshots(dir)[0].snaps).toHaveLength(1);
    expect(store.listAllSnapshots(path.join(os.tmpdir(), 'snapmgr-nu-exista'))).toEqual([]);
  });
});

describe('store.deleteSnapshots (G3)', () => {
  it('deletes exactly the requested pairs and returns the real count', () => {
    const dir = tmpProject();
    const a = store.newId();
    store.writeDoc(dir, a, 'docs', '<p>a</p>');
    const s1 = makeSnap(dir, a, 'una', undefined);
    const s2 = makeSnap(dir, a, 'doua', undefined);
    const s3 = makeSnap(dir, a, 'trei', undefined);
    const b = store.newId();
    store.writeDoc(dir, b, 'docs', '<p>b</p>');
    const sb = makeSnap(dir, b, 'alt doc', undefined);
    const n = store.deleteSnapshots(dir, [
      { id: a, file: s1.file },
      { id: a, file: s2.file },
      { id: a, file: '2026-01-01T00-00-00-000Z.json' }, // missing: skipped
      { id: '../evil', file: s3.file }, // invalid id: skipped
      { id: a, file: 'sub/../../x.json' }, // invalid file: skipped
      { id: b, file: sb.file },
    ]);
    expect(n).toBe(3);
    const rest = store.listAllSnapshots(dir);
    expect(rest.find((g) => g.id === a).snaps.map((s) => s.name)).toEqual(['trei']);
    expect(rest.find((g) => g.id === b)).toBeUndefined();
    expect(store.readDoc(dir, a, 'docs')).toBe('<p>a</p>'); // docs untouched
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'project.json'), 'utf8')).title).toBe('P');
  });
});

describe('snapshot search (G2)', () => {
  const html = '<p>Primul &amp; unic123</p><p>Al doilea rând</p>';
  it('extracts searchable text from html (tags out, entities decoded)', () => {
    expect(toSearchText(html)).toContain('unic123');
    expect(toSearchText(html)).toContain('Primul & unic123');
    expect(toSearchText(html)).not.toMatch(/<p>/);
    expect(toSearchText('<p>a<br>b</p>')).toBe('a\nb\n');
  });
  it('parses plain and regex queries; invalid regex is an error, not a crash', () => {
    expect(parseQuery('UNIC', false).test('unic123')).toBe(true);
    expect(parseQuery('l.c', false).test('lxc')).toBe(false); // plain: no regex magic
    expect(parseQuery('l.c', true).test('lxc')).toBe(true);
    expect(parseQuery('v[ae]riant', true).test('Varianta 1')).toBe(true);
    expect(parseQuery('[q', true).error).toMatch(/[Rr]egex/);
    expect(parseQuery('', false).test('orice')).toBe(false); // empty query matches nothing
  });
  it('searchSnapshots finds by name, text and ISO date; reports where it matched', () => {
    const dir = tmpProject();
    const a = store.newId();
    store.writeDoc(dir, a, 'docs', '<p>a</p>');
    makeSnap(dir, a, 'Prima variantă', html);
    makeSnap(dir, a, 'Snapshot', '<p>altceva de tot</p>');
    const hits = (q, rx) => search.searchSnapshots(dir, q, { regex: !!rx });
    const byFile = (list) => Object.fromEntries(list.map((h) => [h.name, h.where]));
    expect(byFile(hits('unic123'))).toEqual({ 'Prima variantă': ['text'] });
    expect(byFile(hits('variant'))).toEqual({ 'Prima variantă': ['title'] });
    expect(byFile(hits('2026'))['Prima variantă']).toEqual(['date']);
    expect(byFile(hits('altceva')).Snapshot).toEqual(['text']);
    const rx = hits('u.ic1[0-9]{2}', true);
    expect(rx[0].name).toBe('Prima variantă');
    expect(rx[0].where).toContain('text');
    for (const h of hits('unic123')) expect(h.html).toBeUndefined();
  });
  it('never matches snapshots/_backup and skips damaged files', () => {
    const dir = tmpProject();
    const a = store.newId();
    store.writeDoc(dir, a, 'docs', '<p>a</p>');
    fs.mkdirSync(path.join(dir, 'snapshots', a), { recursive: true });
    fs.mkdirSync(path.join(dir, 'snapshots', '_backup'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'snapshots', '_backup', '2026-01-01T00-00-00-000Z.json'), JSON.stringify({ name: 'b', date: new Date().toISOString(), html: '<p>unic123</p>' }));
    fs.writeFileSync(path.join(dir, 'snapshots', a, '2026-01-02T00-00-00-000Z.json'), '{rele');
    expect(search.searchSnapshots(dir, 'unic123')).toEqual([]);
  });
  it('the ESM mirror (src/lib/snapshotSearch.js) behaves identically on the same fixtures', () => {
    const m = parseQuery('UNIC', false);
    expect(m.test('unic123')).toBe(true);
    expect(toSearchText('<p>a<br>b</p>')).toBe('a\nb\n');
    const bad = parseQuery('[q', true);
    expect(bad.error).toMatch(/[Rr]egex/);
    expect(bad.test('x')).toBe(false);
  });
});

describe('documentGroups + selectMany (G5 helpers)', () => {
  const tree = [
    { id: 'root', title: 'Cartea', children: [
      { id: 'cap', title: 'Capitolul 1', children: [
        { id: 's1', title: 'Scena 1' },
        { id: 's2', title: 'Scena 2' },
      ] },
      { id: 'solo', title: 'Prolog' },
    ] },
  ];
  it('groups documents in binder order with the full binder path', () => {
    const byId = { s2: [{ file: 'b.json', name: 'B', date: 'x' }], solo: [{ file: 'a.json', name: 'A', date: 'x' }], ghost: [{ file: 'g.json', name: 'G', date: 'x' }] };
    const groups = documentGroups(tree, byId);
    expect(groups.map((g) => g.id)).toEqual(['s2', 'solo', 'ghost']); // binder order, orphan last
    expect(groups[0].title).toBe('Scena 2');
    expect(groups[0].path).toBe('Cartea › Capitolul 1');
    expect(groups[1].path).toBe('Cartea');
    expect(groups[2].title).toBe(null); // snapshot-urile unui document șters rămân vizibile
    expect(groups[2].path).toBe('');
  });
  it('selectMany: plain click, ctrl toggle and shift range', () => {
    const rows = ['r1', 'r2', 'r3', 'r4'];
    expect(selectMany(['r2'], 'r2', 'r3', 'single', rows)).toEqual({ selected: ['r3'], anchor: 'r3' });
    expect(selectMany(['r1', 'r2'], 'r2', 'r3', 'toggle', rows)).toEqual({ selected: ['r1', 'r2', 'r3'], anchor: 'r3' });
    expect(selectMany(['r4'], 'r2', 'r1', 'toggle', rows)).toEqual({ selected: ['r4', 'r1'], anchor: 'r1' });
    expect(selectMany(['r1'], 'r2', 'r4', 'range', rows)).toEqual({ selected: ['r2', 'r3', 'r4'], anchor: 'r2' });
    expect(selectMany(['r1'], null, 'r3', 'range', rows)).toEqual({ selected: ['r3'], anchor: 'r3' });
    expect(selectMany(['r2'], 'r9', 'r3', 'range', rows)).toEqual({ selected: ['r3'], anchor: 'r3' });
  });
});

describe('mockApi project-wide snapshot methods', () => {
  it('lists, searches and mass-deletes in memory like the desktop', async () => {
    const { createMockApi } = await import('../src/lib/mockApi.js');
    const api = createMockApi();
    const p = await api.newProject('T');
    const dir = p.dir;
    const doc = p.project.tree[0].children[0];
    await api.writeDoc(dir, doc.id, 'docs', '<p>text cu măsline</p>');
    await api.takeSnapshot(dir, doc.id, 'Prima');
    await api.writeDoc(dir, doc.id, 'docs', '<p>text cu nuci</p>');
    const second = await api.takeSnapshot(dir, doc.id, 'A doua');
    const all = await api.listAllSnapshots(dir);
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(doc.id);
    expect(all[0].snaps).toHaveLength(2);
    const hits = await api.searchSnapshots(dir, 'măsline');
    const listed = await api.listSnapshots(dir, doc.id);
    expect(hits.map((h) => h.file)).toEqual([listed.find((s) => s.name === 'Prima').file]);
    expect(hits[0].where).toEqual(['text']);
    expect(await api.deleteSnapshots(dir, [{ id: doc.id, file: second.file }, { id: doc.id, file: 'lipsa.json' }])).toBe(1);
    expect((await api.listSnapshots(dir, doc.id)).map((s) => s.name)).toEqual(['Prima']);
    const exported = await api.exportSnapshot(dir, doc.id, (await api.listSnapshots(dir, doc.id))[0].file, 'Scena');
    expect(String(exported)).toContain('Scena');
  });
});
