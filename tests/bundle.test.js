import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createWebApi, createMemoryKv, parseBundle, recordDay, summarizeHistory } from '../src/lib/webApi.js';
const require = createRequire(import.meta.url);
const store = require('../lib/store.cjs');
const bundle = require('../lib/bundle.cjs');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pneuma-bundle-'));

describe('project bundle (desktop)', () => {
  it('round-trips docs, notes and snapshots', () => {
    const dir = path.join(tmp(), 'Carte.scribner');
    const project = store.createProject(dir, 'Carte');
    const node = store.newNode('text', 'Scena');
    project.tree[0].children.push(node);
    store.saveProject(dir, project);
    store.writeDoc(dir, node.id, 'docs', '<p>Text ă</p>');
    store.writeDoc(dir, node.id, 'notes', '<p>Notă</p>');
    store.takeSnapshot(dir, node.id, 'v1');
    const data = JSON.parse(JSON.stringify(bundle.exportBundle(dir)));
    expect(data.format).toBe('scribner-bundle');
    const out = bundle.importBundle(data, tmp());
    expect(out.project.title).toBe('Carte');
    expect(store.readDoc(out.dir, node.id, 'docs')).toBe('<p>Text ă</p>');
    expect(store.readDoc(out.dir, node.id, 'notes')).toBe('<p>Notă</p>');
    expect(store.listSnapshots(out.dir, node.id)[0].name).toBe('v1');
  });

  it('rejects foreign files', () => {
    expect(() => bundle.validateBundle({ foo: 1 })).toThrow(/pachet/);
  });
});

describe('webApi', () => {
  it('creates, edits, snapshots and lists projects', async () => {
    const api = createWebApi({ kv: createMemoryKv() });
    const { dir, project } = await api.newProject('Roman');
    expect(dir.startsWith('web:')).toBe(true);
    const id = project.tree[0].children[0].id;
    await api.writeDoc(dir, id, 'docs', '<p>Salut</p>');
    await api.writeDoc(dir, id, 'notes', '<p>n</p>');
    expect(await api.readDoc(dir, id, 'docs')).toBe('<p>Salut</p>');
    await api.takeSnapshot(dir, id, 'prima');
    expect((await api.listSnapshots(dir, id))[0].html).toBe('<p>Salut</p>');
    expect((await api.getSettings()).recent[0].dir).toBe(dir);
    const reopened = await api.openProject(dir);
    expect(reopened.project.title).toBe('Roman');
    await api.recordHistory(dir, { draft: 10, total: 12 });
    expect((await api.getHistory(dir)).length).toBe(1);
  });

  it('bundle round-trip web -> desktop -> web', async () => {
    const api = createWebApi({ kv: createMemoryKv() });
    const { dir, project } = await api.newProject('Sync');
    const id = project.tree[0].children[0].id;
    await api.writeDoc(dir, id, 'docs', '<p>Din browser</p>');
    await api.takeSnapshot(dir, id, 's');
    const data = JSON.parse(JSON.stringify(await api.exportBundleData(dir)));
    const desk = bundle.importBundle(data, tmp());
    expect(store.readDoc(desk.dir, id)).toBe('<p>Din browser</p>');
    const back = parseBundle(JSON.stringify(bundle.exportBundle(desk.dir)));
    const api2 = createWebApi({ kv: createMemoryKv() });
    const res = await api2.importBundleData(back);
    expect(await api2.readDoc(res.dir, id, 'docs')).toBe('<p>Din browser</p>');
    expect((await api2.listSnapshots(res.dir, id))[0].name).toBe('s');
  });

  it('history helpers keep the first start of the day', () => {
    const d = new Date('2026-01-02T10:00:00Z');
    let h = recordDay({}, { draft: 100, total: 120 }, d);
    h = recordDay(h, { draft: 150, total: 170 }, d);
    expect(summarizeHistory(h)).toEqual([{ date: '2026-01-02', draft: 50, total: 50, draftWords: 150 }]);
    expect(() => parseBundle('nu')).toThrow();
  });
});
