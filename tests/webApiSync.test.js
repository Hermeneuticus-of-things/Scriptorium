// Web / PWA build (src/lib/webApi.js): quota errors, two tabs on one project,
// big bundles, special characters, snapshots, bundle round trip with the desktop.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createWebApi, createMemoryKv, bundleFileName, QUOTA_MESSAGE } from '../src/lib/webApi.js';
const require = createRequire(import.meta.url);
const store = require('../lib/store.cjs');
const bundle = require('../lib/bundle.cjs');

// In-process stand-in for BroadcastChannel: every tab's channel hears the others.
function bus() {
  const chans = [];
  return () => {
    const ch = {
      onmessage: null,
      postMessage: (data) => {
        for (const c of chans) if (c !== ch && c.onmessage) c.onmessage({ data: structuredClone(data) });
      },
    };
    chans.push(ch);
    return ch;
  };
}

function quotaKv(limitPuts) {
  const kv = createMemoryKv();
  let puts = 0;
  const boom = () => {
    const e = new Error('The quota has been exceeded.');
    e.name = 'QuotaExceededError';
    return e;
  };
  return {
    ...kv,
    put: async (k, v) => {
      if (++puts > limitPuts) throw boom();
      return kv.put(k, v);
    },
    putMany: async (entries) => {
      if (puts + entries.length > limitPuts) throw boom();
      puts += entries.length;
      return kv.putMany(entries);
    },
    update: undefined,
  };
}

describe('webApi: storage full', () => {
  it('a write that hits the quota fails with an actionable message', async () => {
    const api = createWebApi({ kv: quotaKv(3), channel: null });
    const { dir, project } = await api.newProject('Plin');
    const id = project.tree[0].children[0].id;
    await expect(api.writeDoc(dir, id, 'docs', '<p>x</p>')).rejects.toThrow(QUOTA_MESSAGE);
  });

  it('a bundle import that hits the quota leaves nothing behind', async () => {
    const kv = quotaKv(3);
    const api = createWebApi({ kv, channel: null });
    const docs = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`d${i}`, `<p>${i}</p>`]));
    const data = { format: 'scribner-bundle', version: 1, project: { title: 'Mare', tree: [] }, docs, notes: {}, snapshots: {} };
    await expect(api.importBundleData(data)).rejects.toThrow(QUOTA_MESSAGE);
    expect(await kv.keys('')).toEqual([]);
    expect((await api.getSettings()).recent).toEqual([]);
  });
});

describe('webApi: two tabs on the same project', () => {
  it('a tab is told when another tab edits; binder saves merge instead of overwriting', async () => {
    const kv = createMemoryKv();
    const ch = bus();
    const tabA = createWebApi({ kv, channel: ch() });
    const tabB = createWebApi({ kv, channel: ch() });
    const { dir, project } = await tabA.newProject('Comun');
    const pB = (await tabB.openProject(dir)).project;
    const seenByB = [];
    tabB.onProjectChanged((info) => seenByB.push(info));
    await tabB.watchProject(dir);

    const docId = project.tree[0].children[0].id;
    await tabA.writeDoc(dir, docId, 'docs', '<p>din A</p>');
    expect(seenByB.at(-1)).toMatchObject({ dir, files: [`docs/${docId}.html`] });

    // A adds a document, B (still on its old copy) renames the first one.
    const a = structuredClone(project);
    a.tree[0].children.push({ ...newText('Din A') });
    await tabA.saveProject(dir, a);
    expect(seenByB.at(-1).files).toEqual(['project.json']);
    const b = structuredClone(pB);
    b.tree[0].children[0].title = 'Redenumit în B';
    const seenByBSelf = seenByB.length;
    await tabB.saveProject(dir, b);
    const stored = (await tabB.reloadProject(dir)).project.tree[0].children;
    expect(stored.map((n) => n.title)).toEqual(['Redenumit în B', 'Din A']);
    // B is told to reload the merged version.
    expect(seenByB.slice(seenByBSelf).some((i) => i.merged)).toBe(true);
  });
});

const newText = (title) => ({ id: `id-${Math.random().toString(36).slice(2)}`, title, type: 'text', synopsis: '', label: 'Fără', status: 'Fără', includeInCompile: true, target: 0, keywords: [] });

describe('webApi: snapshots and names', () => {
  it('two snapshots in the same millisecond get distinct ids; delete / rename work', async () => {
    const api = createWebApi({ kv: createMemoryKv(), channel: null });
    const { dir, project } = await api.newProject('S');
    const id = project.tree[0].children[0].id;
    const now = Date.now;
    Date.now = () => 1700000000000;
    try {
      await api.takeSnapshot(dir, id, 'unu');
      await api.takeSnapshot(dir, id, 'doi');
    } finally {
      Date.now = now;
    }
    const list = await api.listSnapshots(dir, id);
    expect(new Set(list.map((s) => s.file)).size).toBe(2);
    await api.renameSnapshot(dir, id, list[0].file, 'nou');
    await api.deleteSnapshot(dir, id, list[1].file);
    expect((await api.listSnapshots(dir, id)).map((s) => s.name)).toEqual(['nou']);
  });

  it('bundle file names survive special characters', () => {
    expect(bundleFileName('Carte: „Ăla”/vol. 2?')).toBe('Carte_ „Ăla”_vol. 2_.scribner.json');
    expect(bundleFileName('')).toBe('Proiect.scribner.json');
    expect(bundleFileName('...')).toBe('Proiect.scribner.json');
  });
});

describe('webApi ↔ desktop bundle round trip', () => {
  it('keeps unicode titles, notes, project notes, trash and snapshot order', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'webrt-'));
    const dir = path.join(tmp, 'R.scribner');
    const p = store.createProject(dir, 'Roman „Ţ” 🌸 / 2');
    const n = store.newNode('text', 'Scenă — „1”');
    p.tree[0].children = [n];
    const t = store.newNode('text', 'Aruncat');
    p.tree[2].children = [t];
    store.saveProject(dir, p);
    store.writeDoc(dir, n.id, 'docs', '<p>ăîșț 🌸 &amp; &lt;b&gt;</p>');
    store.writeDoc(dir, t.id, 'docs', '<p>coș</p>');
    store.writeDoc(dir, 'project-notes', 'notes', '<p>plan</p>');
    store.addSnapshot(dir, n.id, { name: 'vechi', date: '2026-01-01T00:00:00Z', html: '<p>v1</p>' });
    store.addSnapshot(dir, n.id, { name: 'nou', date: '2026-02-01T00:00:00Z', html: '<p>v2</p>' });

    const api = createWebApi({ kv: createMemoryKv(), channel: null });
    const web = await api.importBundleData(JSON.parse(JSON.stringify(bundle.exportBundle(dir))));
    expect(web.project.title).toBe('Roman „Ţ” 🌸 / 2');
    expect(await api.readDoc(web.dir, n.id, 'docs')).toBe('<p>ăîșț 🌸 &amp; &lt;b&gt;</p>');
    expect(await api.readDoc(web.dir, 'project-notes', 'notes')).toBe('<p>plan</p>');
    expect((await api.listSnapshots(web.dir, n.id)).map((s) => s.name)).toEqual(['nou', 'vechi']);

    const back = bundle.importBundle(JSON.parse(JSON.stringify(await api.exportBundleData(web.dir))), fs.mkdtempSync(path.join(os.tmpdir(), 'webrt2-')));
    expect(path.basename(back.dir)).toBe('Roman „Ţ” 🌸 _ 2.scribner');
    expect(back.project.tree[2].children[0].id).toBe(t.id);
    expect(store.readDoc(back.dir, t.id)).toBe('<p>coș</p>');
    expect(store.listSnapshots(back.dir, n.id).map((s) => s.name)).toEqual(['nou', 'vechi']);
  });

  it('imports a big project in one go', async () => {
    const api = createWebApi({ kv: createMemoryKv(), channel: null });
    const docs = {};
    const tree = [{ id: 'draft', title: 'Manuscris', type: 'folder', root: 'draft', children: [] }, { id: 'trash', title: 'Coș', type: 'folder', root: 'trash', children: [] }];
    for (let i = 0; i < 2000; i++) {
      const id = `doc-${i}`;
      tree[0].children.push({ id, title: `Capitol ${i}`, type: 'text' });
      docs[id] = `<p>${'cuvânt '.repeat(500)}</p>`;
    }
    const res = await api.importBundleData({ format: 'scribner-bundle', version: 1, project: { title: 'Mare', tree }, docs, notes: {}, snapshots: {} });
    expect((await api.exportBundleData(res.dir)).docs['doc-1999']).toBe(docs['doc-1999']);
  });
});
