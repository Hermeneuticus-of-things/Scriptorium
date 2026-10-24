// Web build on a real .scribner folder (src/lib/folderKv.js): the browser and the desktop app
// (lib/store.cjs) read and write the same files, as with a folder in OneDrive / Dropbox / a NAS.
import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createWebApi, createMemoryKv } from '../src/lib/webApi.js';
const require = createRequire(import.meta.url);
const store = require('../lib/store.cjs');

// FileSystemDirectoryHandle over a real directory (the subset folderKv.js uses).
const notFound = () => Object.assign(new Error('not found'), { name: 'NotFoundError' });
function dirHandle(p) {
  return {
    kind: 'directory',
    name: path.basename(p),
    _path: p,
    async isSameEntry(o) {
      return Boolean(o && o._path === p);
    },
    async getDirectoryHandle(name, { create } = {}) {
      const q = path.join(p, name);
      if (!fs.existsSync(q)) {
        if (!create) throw notFound();
        fs.mkdirSync(q);
      }
      return dirHandle(q);
    },
    async getFileHandle(name, { create } = {}) {
      const q = path.join(p, name);
      if (!fs.existsSync(q)) {
        if (!create) throw notFound();
        fs.writeFileSync(q, '');
      }
      return fileHandle(q);
    },
    async removeEntry(name) {
      const q = path.join(p, name);
      if (!fs.existsSync(q)) throw notFound();
      fs.rmSync(q, { recursive: true });
    },
    async *entries() {
      for (const e of fs.readdirSync(p, { withFileTypes: true })) {
        yield [e.name, e.isDirectory() ? dirHandle(path.join(p, e.name)) : fileHandle(path.join(p, e.name))];
      }
    },
  };
}
function fileHandle(q) {
  return {
    kind: 'file',
    name: path.basename(q),
    async getFile() {
      const text = fs.readFileSync(q, 'utf8');
      return { text: async () => text, lastModified: fs.statSync(q).mtimeMs };
    },
    async createWritable() {
      let buf = '';
      return { write: async (t) => void (buf += t), close: async () => fs.writeFileSync(q, buf) };
    },
  };
}
// IndexedDB stores handles as they are; the memory kv clones, so keep handles raw.
function baseKv() {
  const kv = createMemoryKv();
  const raw = new Map();
  return {
    ...kv,
    get: (k) => (k.startsWith('fh:') ? Promise.resolve(raw.get(k)) : kv.get(k)),
    put: (k, v) => (k.startsWith('fh:') ? Promise.resolve(void raw.set(k, v)) : kv.put(k, v)),
    del: (k) => (k.startsWith('fh:') ? Promise.resolve(void raw.delete(k)) : kv.del(k)),
  };
}

const tmp = [];
function desktopProject(title = 'Carte comună') {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'scrib-folder-')), 'Carte.scribner');
  tmp.push(path.dirname(dir));
  store.createProject(dir, title);
  return dir;
}
afterEach(() => {
  for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});
const firstDoc = (project) => {
  const out = [];
  const walk = (ns) => ns.forEach((n) => (n.children?.length ? walk(n.children) : out.push(n)));
  walk(project.tree);
  return out[0];
};

describe('web: proiect într-un folder .scribner (sincronizare cu desktopul)', () => {
  it('deschide folderul creat de desktop și scrie fișiere pe care desktopul le citește', async () => {
    const dir = desktopProject();
    const api = createWebApi({ kv: baseKv(), channel: null, pickDirectory: async () => dirHandle(dir) });
    const { dir: webDir, project } = await api.openProject();
    expect(webDir.startsWith('fs:')).toBe(true);
    expect(project.title).toBe('Carte comună');
    const doc = firstDoc(project);
    await api.writeDoc(webDir, doc.id, 'docs', '<p>Scris în browser: ăîșțâ „ghilimele” — 😀</p>');
    expect(store.readDoc(dir, doc.id, 'docs')).toContain('ăîșțâ „ghilimele” — 😀');
    project.title = 'Titlu nou din web';
    await api.saveProject(webDir, project);
    expect((store.loadProject(dir).project || store.loadProject(dir)).title).toBe('Titlu nou din web');
  });

  it('citește ce scrie desktopul (documente, instantanee) și exportă pachetul complet', async () => {
    const dir = desktopProject();
    const api = createWebApi({ kv: baseKv(), channel: null, pickDirectory: async () => dirHandle(dir) });
    const { dir: webDir, project } = await api.openProject();
    const doc = firstDoc(project);
    store.writeDoc(dir, doc.id, 'docs', '<p>De pe laptop</p>');
    store.addSnapshot(dir, doc.id, { name: 'Varianta 1', date: '2026-01-01T10:00:00.000Z', html: '<p>v1</p>' });
    expect(await api.readDoc(webDir, doc.id, 'docs')).toBe('<p>De pe laptop</p>');
    const snaps = await api.listSnapshots(webDir, doc.id);
    expect(snaps.map((s) => s.name)).toEqual(['Varianta 1']);
    const bundle = await api.exportBundleData(webDir);
    expect(bundle.docs[doc.id]).toBe('<p>De pe laptop</p>');
    expect(bundle.snapshots[doc.id][0].html).toBe('<p>v1</p>');
  });

  it('instantaneele web apar pe desktop; ștergerea unuia șterge fișierul', async () => {
    const dir = desktopProject();
    const api = createWebApi({ kv: baseKv(), channel: null, pickDirectory: async () => dirHandle(dir) });
    const { dir: webDir, project } = await api.openProject();
    const doc = firstDoc(project);
    await api.writeDoc(webDir, doc.id, 'docs', '<p>a</p>');
    await api.takeSnapshot(webDir, doc.id, 'Din web');
    const list = store.listSnapshots(dir, doc.id);
    {
      expect(list.map((s) => s.name)).toContain('Din web');
      await api.deleteSnapshot(webDir, doc.id, (await api.listSnapshots(webDir, doc.id))[0].file);
      expect(store.listSnapshots(dir, doc.id)).toEqual([]);
    }
  });

  it('același folder deschis de două ori păstrează aceeași intrare; „șterge” doar uită folderul', async () => {
    const dir = desktopProject();
    const api = createWebApi({ kv: baseKv(), channel: null, pickDirectory: async () => dirHandle(dir) });
    const a = await api.openProject();
    const b = await api.openProject();
    expect(b.dir).toBe(a.dir);
    expect((await api.getSettings()).recent.filter((r) => r.dir === a.dir)).toHaveLength(1);
    await api.deleteProject(a.dir);
    expect(fs.existsSync(path.join(dir, 'project.json'))).toBe(true);
    expect(fs.readdirSync(path.join(dir, 'docs')).length).toBeGreaterThan(0);
    expect((await api.getSettings()).recent.some((r) => r.dir === a.dir)).toBe(false);
  });

  it('un folder fără project.json e refuzat; anularea dialogului nu e eroare', async () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'scrib-empty-'));
    tmp.push(empty);
    const api = createWebApi({ kv: baseKv(), channel: null, pickDirectory: async () => dirHandle(empty) });
    await expect(api.openProject()).rejects.toThrow(/project\.json/);
    const cancel = createWebApi({ kv: baseKv(), channel: null, pickDirectory: async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }); } });
    expect(await cancel.openProject()).toBeNull();
  });

  it('id-uri cu ../ nu ies din folder', async () => {
    const dir = desktopProject();
    const api = createWebApi({ kv: baseKv(), channel: null, pickDirectory: async () => dirHandle(dir) });
    const { dir: webDir } = await api.openProject();
    await expect(api.writeDoc(webDir, '../evil', 'docs', 'x')).rejects.toThrow();
    expect(fs.existsSync(path.join(path.dirname(dir), 'evil.html'))).toBe(false);
  });

  it('watcher: schimbările făcute de desktop sunt anunțate, cele proprii nu', async () => {
    const dir = desktopProject();
    const api = createWebApi({ kv: baseKv(), channel: null, watchMs: 40, pickDirectory: async () => dirHandle(dir) });
    const { dir: webDir, project } = await api.openProject();
    const doc = firstDoc(project);
    const seen = [];
    api.onProjectChanged((e) => seen.push(e));
    await api.watchProject(webDir);
    await api.writeDoc(webDir, doc.id, 'docs', '<p>propriu</p>');
    await new Promise((r) => setTimeout(r, 150));
    expect(seen, JSON.stringify(seen)).toEqual([]);
    const f = path.join(dir, 'docs', `${doc.id}.html`);
    fs.writeFileSync(f, '<p>de pe desktop</p>');
    const t = Date.now() / 1000 + 5;
    fs.utimesSync(f, t, t);
    await new Promise((r) => setTimeout(r, 150));
    await api.unwatchProject();
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]).toMatchObject({ dir: webDir, external: true });
    expect(seen[0].files).toContain(`docs/${doc.id}.html`);
  });
});
