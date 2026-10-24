// "Același proiect, oriunde": one .scribner folder in OneDrive / Dropbox / Google Drive / a NAS,
// opened by the desktop app (lib/store.cjs + lib/projectWatch.cjs) on one computer and by the web
// build (src/lib/webApi.js over the File System Access API) on another. The sync client is
// simulated by writing into the shared temp folder directly.
import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createWebApi, createMemoryKv } from '../src/lib/webApi.js';
import { findConflictCopies, pullExternalDocs } from '../src/lib/syncGuard.js';
const require = createRequire(import.meta.url);
const store = require('../lib/store.cjs');
const projectWatch = require('../lib/projectWatch.cjs');

// FileSystemDirectoryHandle over a real directory. `fsx.granularity` rounds lastModified like
// FAT / SMB shares (2 s); `fsx.fail` makes every access throw (NAS offline, permission revoked).
const fsx = { granularity: 1, fail: null };
const notFound = () => Object.assign(new Error('not found'), { name: 'NotFoundError' });
const guard = () => {
  if (fsx.fail) throw Object.assign(new Error(fsx.fail), { name: fsx.fail });
};
function dirHandle(p) {
  return {
    kind: 'directory',
    name: path.basename(p),
    _path: p,
    async isSameEntry(o) {
      return Boolean(o && o._path === p);
    },
    async getDirectoryHandle(name, { create } = {}) {
      guard();
      const q = path.join(p, name);
      if (!fs.existsSync(q)) {
        if (!create) throw notFound();
        fs.mkdirSync(q);
      }
      return dirHandle(q);
    },
    async getFileHandle(name, { create } = {}) {
      guard();
      const q = path.join(p, name);
      if (!fs.existsSync(q)) {
        if (!create) throw notFound();
        fs.writeFileSync(q, '');
      }
      return fileHandle(q);
    },
    async removeEntry(name) {
      guard();
      const q = path.join(p, name);
      if (!fs.existsSync(q)) throw notFound();
      fs.rmSync(q, { recursive: true });
    },
    async *entries() {
      guard();
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
      guard();
      const text = fs.readFileSync(q, 'utf8');
      const st = fs.statSync(q);
      return { text: async () => text, size: st.size, lastModified: Math.floor(st.mtimeMs / fsx.granularity) * fsx.granularity };
    },
    async createWritable() {
      guard();
      let buf = '';
      return { write: async (t) => void (buf += t), close: async () => fs.writeFileSync(q, buf) };
    },
  };
}
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
const apis = [];
function desktopProject(title = 'Carte comună') {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'scrib-hunt-')), 'Carte.scribner');
  tmp.push(path.dirname(dir));
  store.createProject(dir, title);
  return dir;
}
afterEach(async () => {
  for (const a of apis.splice(0)) await a.unwatchProject();
  for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  fsx.granularity = 1;
  fsx.fail = null;
});
const firstDoc = (project) => {
  const out = [];
  const walk = (ns) => ns.forEach((n) => (n.children?.length ? walk(n.children) : n.type === 'text' && out.push(n)));
  walk(project.tree);
  return out[0];
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function webSide(dir, watchMs = 30) {
  const api = createWebApi({ kv: baseKv(), channel: null, watchMs, pickDirectory: async () => dirHandle(dir) });
  apis.push(api);
  const opened = await api.openProject();
  const events = [];
  api.onProjectChanged((e) => events.push(e));
  await api.watchProject(opened.dir);
  return { api, events, webDir: opened.dir, project: opened.project };
}
const filesOf = (events) => events.flatMap((e) => e.files);

describe('web watcher on a synced folder', () => {
  it('an external write right after an own write of the same file is still reported', async () => {
    const dir = desktopProject();
    const { api, events, webDir, project } = await webSide(dir, 60);
    const doc = firstDoc(project);
    await api.writeDoc(webDir, doc.id, 'docs', '<p>din browser</p>');
    store.writeDoc(dir, doc.id, 'docs', '<p>de pe laptop, sosit prin OneDrive</p>'); // before the next tick
    await wait(200);
    expect(filesOf(events)).toContain(`docs/${doc.id}.html`);
  });

  it('own writes are not echoed back', async () => {
    const dir = desktopProject();
    const { api, events, webDir, project } = await webSide(dir);
    const doc = firstDoc(project);
    await api.writeDoc(webDir, doc.id, 'docs', '<p>doar eu</p>');
    project.title = 'Alt titlu';
    await api.saveProject(webDir, project);
    await wait(150);
    expect(events).toEqual([]);
  });

  it('FAT / SMB 2 s timestamps: a second change in the same 2 s is not missed', async () => {
    fsx.granularity = 1e9; // every write lands in the same timestamp bucket
    const dir = desktopProject();
    const { events, project } = await webSide(dir);
    const doc = firstDoc(project);
    store.writeDoc(dir, doc.id, 'docs', '<p>prima variantă</p>');
    await wait(120);
    expect(filesOf(events)).toContain(`docs/${doc.id}.html`);
  });

  it('a file deleted by the sync client (delete then recreate) is not reported until it is back', async () => {
    const dir = desktopProject();
    const { events, project } = await webSide(dir);
    const doc = firstDoc(project);
    const file = path.join(dir, 'docs', `${doc.id}.html`);
    const text = fs.readFileSync(file, 'utf8');
    fs.unlinkSync(file);
    await wait(120);
    expect(filesOf(events)).toEqual([]); // reporting it would blank the open document
    fs.writeFileSync(file, `${text}<p>nou</p>`);
    await wait(120);
    expect(filesOf(events)).toEqual([`docs/${doc.id}.html`]);
  });

  it('temp / lock / system files of sync clients and OSes are never reported', async () => {
    const dir = desktopProject();
    const { events } = await webSide(dir);
    for (const f of ['docs/desktop.ini', 'docs/Thumbs.db', 'docs/.DS_Store', 'docs/~$abc.html', 'docs/.~lock.abc.html#', 'docs/._abc.html', 'notes/.dropbox', 'project.json.lock', 'desktop.ini', 'project (conflicted copy 2026-10-24).json', '.~lock.project.json#']) {
      fs.writeFileSync(path.join(dir, f), 'x');
    }
    await wait(120);
    expect(filesOf(events)).toEqual([]);
  });

  it('NAS offline / permission lost: one notice, then one when the folder is back', async () => {
    const dir = desktopProject();
    const { events } = await webSide(dir);
    fsx.fail = 'NotAllowedError';
    await wait(200);
    expect(events.filter((e) => e.offline)).toHaveLength(1);
    fsx.fail = null;
    await wait(120);
    expect(events.filter((e) => e.online)).toHaveLength(1);
    expect(events.filter((e) => e.offline)).toHaveLength(1);
  });

  it('opening another project stops the old watcher', async () => {
    const a = desktopProject('A');
    const b = desktopProject('B');
    let pickDir = a;
    const api = createWebApi({ kv: baseKv(), channel: null, watchMs: 30, pickDirectory: async () => dirHandle(pickDir) });
    apis.push(api);
    const events = [];
    api.onProjectChanged((e) => events.push(e));
    const A = await api.openProject();
    await api.watchProject(A.dir);
    pickDir = b;
    const B = await api.openProject();
    await api.watchProject(B.dir);
    store.writeDoc(a, firstDoc(A.project).id, 'docs', '<p>în proiectul închis</p>');
    store.writeDoc(b, firstDoc(B.project).id, 'docs', '<p>în proiectul deschis</p>');
    await wait(150);
    expect(events.map((e) => e.dir)).toEqual([B.dir]);
  });
});

describe('binder merge base after a reload (both sides)', () => {
  it('web: undoing on the web a rename made on the desktop is kept, not reverted by a stale base', async () => {
    const dir = desktopProject();
    const { api, webDir, project } = await webSide(dir, 10000);
    const doc = firstDoc(project);
    store.updateProject(dir, (p) => {
      store.findNode(p.tree, doc.id).title = 'Nume de pe desktop';
    });
    const { project: reloaded } = await api.reloadProject(webDir); // the window adopts it
    store.findNode(reloaded.tree, doc.id).title = doc.title; // the writer puts the old name back
    await api.saveProject(webDir, reloaded);
    expect(store.findNode(store.loadProject(dir).tree, doc.id).title).toBe(doc.title);
  });

  it('desktop: project:reload resets the merge base (reloadWithBase)', () => {
    const dir = desktopProject();
    const bases = new Map();
    const first = projectWatch.reloadWithBase(dir, bases);
    const doc = firstDoc(first.project);
    store.updateProject(dir, (p) => {
      store.findNode(p.tree, doc.id).title = 'Din web';
    });
    const { project } = projectWatch.reloadWithBase(dir, bases);
    store.findNode(project.tree, doc.id).title = doc.title;
    const res = projectWatch.saveMerged(dir, project, bases.get(path.resolve(dir)));
    expect(store.findNode(res.project.tree, doc.id).title).toBe(doc.title);
  });

  it('different documents edited at the same time on both sides are both kept; binder changes merge both ways', async () => {
    const dir = desktopProject();
    const { api, webDir, project } = await webSide(dir, 10000);
    const doc = firstDoc(project);
    // desktop adds a document and writes its text
    const added = store.newNode('text', 'Scena de pe desktop');
    store.updateProject(dir, (p) => void p.tree[0].children.push(added));
    store.writeDoc(dir, added.id, 'docs', '<p>desktop</p>');
    // web, still on its old binder, renames another document and writes it
    await api.writeDoc(webDir, doc.id, 'docs', '<p>web</p>');
    const mine = structuredClone(project);
    store.findNode(mine.tree, doc.id).title = 'Redenumit în web';
    await api.saveProject(webDir, mine);
    const disk = store.loadProject(dir);
    expect(store.findNode(disk.tree, added.id)).toBeTruthy();
    expect(store.findNode(disk.tree, doc.id).title).toBe('Redenumit în web');
    expect(store.readDoc(dir, added.id)).toBe('<p>desktop</p>');
    expect(store.readDoc(dir, doc.id)).toBe('<p>web</p>');
  });
});

describe('project.json.lock in a synced folder', () => {
  it('a lock synced from a computer whose clock is ahead (mtime in the future) does not block saves forever', () => {
    const dir = desktopProject();
    const lock = path.join(dir, 'project.json.lock');
    fs.writeFileSync(lock, '999-otherpc');
    const future = new Date(Date.now() + 3600e3);
    fs.utimesSync(lock, future, future);
    expect(store.withProjectLock(dir, () => 'ok', { timeoutMs: 1500 })).toBe('ok');
  });

  it('a stale lock left on a NAS (old mtime) is taken over', () => {
    const dir = desktopProject();
    const lock = path.join(dir, 'project.json.lock');
    fs.writeFileSync(lock, '1-dead');
    const old = new Date(Date.now() - 3600e3);
    fs.utimesSync(lock, old, old);
    expect(store.withProjectLock(dir, () => 'ok', { timeoutMs: 1500 })).toBe('ok');
    expect(fs.existsSync(lock)).toBe(false);
  });
});

describe('cloud conflict copies', () => {
  const ids = new Set(['3f2a9c1e-1111-4222-8333-444455556666', 'draft']);
  it('recognises Dropbox / OneDrive / Google Drive / Syncthing / Nextcloud copies', () => {
    const found = findConflictCopies({
      root: ['project.json', 'project.json.lock', 'history.json', 'project (conflicted copy 2026-10-24).json', 'project-DESKTOP-ABC.json', "project (Ion's conflicted copy 2026-10-24).json", 'project (1).json', 'project.sync-conflict-20261024-101010-ABCDEFG.json', 'desktop.ini'],
      docs: ['3f2a9c1e-1111-4222-8333-444455556666.html', '3f2a9c1e-1111-4222-8333-444455556666-LAPTOP-ION.html', '3f2a9c1e-1111-4222-8333-444455556666 (conflicted copy 2026-10-24).html', 'desktop.ini', '~$abc.html'],
      notes: [],
      ids,
    });
    expect(found.sort()).toEqual(
      [
        'docs/3f2a9c1e-1111-4222-8333-444455556666 (conflicted copy 2026-10-24).html',
        'docs/3f2a9c1e-1111-4222-8333-444455556666-LAPTOP-ION.html',
        "project (Ion's conflicted copy 2026-10-24).json",
        'project (1).json',
        'project (conflicted copy 2026-10-24).json',
        'project-DESKTOP-ABC.json',
        'project.sync-conflict-20261024-101010-ABCDEFG.json',
      ].sort(),
    );
  });

  it('do not break loading on either side, and both sides list them for the user', async () => {
    const dir = desktopProject();
    const p = store.loadProject(dir);
    const doc = firstDoc(p);
    fs.writeFileSync(path.join(dir, 'project (conflicted copy 2026-10-24).json'), '{"broken":');
    fs.writeFileSync(path.join(dir, 'docs', `${doc.id}-DESKTOP-ABC.html`), '<p>cealaltă variantă</p>');
    fs.writeFileSync(path.join(dir, 'docs', 'desktop.ini'), '[.ShellClassInfo]');
    expect(store.loadProject(dir).title).toBe('Carte comună');
    expect(projectWatch.syncConflicts(dir).sort()).toEqual([`docs/${doc.id}-DESKTOP-ABC.html`, 'project (conflicted copy 2026-10-24).json'].sort());
    const { api, webDir } = await webSide(dir, 10000);
    expect((await api.syncConflicts(webDir)).sort()).toEqual([`docs/${doc.id}-DESKTOP-ABC.html`, 'project (conflicted copy 2026-10-24).json'].sort());
    // a conflict copy is not a document of the project in the web bundle export
    const bundle = await api.exportBundleData(webDir);
    expect(Object.keys(bundle.docs)).not.toContain(`${doc.id}-DESKTOP-ABC`);
  });
});

describe('same document edited on both sides (safety net)', () => {
  const label = 'Versiunea de pe celălalt calculator, 14:05';

  it('web: the external version of a document with unsaved local edits goes to a snapshot', async () => {
    const dir = desktopProject();
    const { api, webDir, project } = await webSide(dir, 10000);
    const doc = firstDoc(project);
    store.writeDoc(dir, doc.id, 'docs', '<p>scris pe desktop</p>');
    const res = await pullExternalDocs({ api, dir: webDir, ids: [doc.id], hasLocal: (id) => id === doc.id, label });
    expect(res.conflicts).toEqual([doc.id]);
    expect(res.updated).toEqual({});
    const snaps = await api.listSnapshots(webDir, doc.id);
    expect(snaps[0].name).toBe(label);
    expect(snaps[0].html).toBe('<p>scris pe desktop</p>');
    expect(store.listSnapshots(dir, doc.id)[0].html).toBe('<p>scris pe desktop</p>'); // visible on the desktop too
  });

  it('desktop: same safety net over the store (the main-process api)', async () => {
    const dir = desktopProject();
    const doc = firstDoc(store.loadProject(dir));
    const desktopApi = {
      readDoc: async (d, id, kind) => store.readDoc(d, id, kind === 'notes' ? 'notes' : 'docs'),
      takeSnapshot: async (d, id, name) => store.takeSnapshot(d, id, name),
    };
    store.writeDoc(dir, doc.id, 'docs', '<p>scris în browser</p>');
    const res = await pullExternalDocs({ api: desktopApi, dir, ids: [doc.id, 'abc'], hasLocal: (id) => id === doc.id, label });
    expect(res.conflicts).toEqual([doc.id]);
    expect(res.updated).toEqual({ abc: '' });
    expect(store.listSnapshots(dir, doc.id)[0]).toMatchObject({ name: label, html: '<p>scris în browser</p>' });
  });

  it('no local edits: the external version is loaded, no snapshot', async () => {
    const dir = desktopProject();
    const doc = firstDoc(store.loadProject(dir));
    const desktopApi = { readDoc: async (d, id) => store.readDoc(d, id), takeSnapshot: async () => { throw new Error('nu'); } };
    store.writeDoc(dir, doc.id, 'docs', '<p>nou</p>');
    const res = await pullExternalDocs({ api: desktopApi, dir, ids: [doc.id], hasLocal: () => false, label });
    expect(res).toEqual({ updated: { [doc.id]: '<p>nou</p>' }, conflicts: [] });
  });

  it('the snapshot of an identical text is skipped (both sides typed the same)', async () => {
    const dir = desktopProject();
    const doc = firstDoc(store.loadProject(dir));
    store.writeDoc(dir, doc.id, 'docs', '<p>la fel</p>');
    const desktopApi = { readDoc: async (d, id) => store.readDoc(d, id), takeSnapshot: async (d, id, n) => store.takeSnapshot(d, id, n) };
    const res = await pullExternalDocs({ api: desktopApi, dir, ids: [doc.id], hasLocal: () => true, localHtml: () => '<p>la fel</p>', label });
    expect(res.conflicts).toEqual([]);
    expect(store.listSnapshots(dir, doc.id)).toEqual([]);
  });
});

describe('sync-client files on the desktop side (bundle export, CLI)', () => {
  it('the desktop bundle export leaves out conflict copies of documents', () => {
    const dir = desktopProject();
    const doc = firstDoc(store.loadProject(dir));
    fs.writeFileSync(path.join(dir, 'docs', `${doc.id}-DESKTOP-ABC.html`), '<p>copie</p>');
    fs.writeFileSync(path.join(dir, 'docs', 'desktop.ini'), 'x');
    const data = require('../lib/bundle.cjs').exportBundle(dir);
    expect(Object.keys(data.docs)).toContain(doc.id);
    expect(Object.keys(data.docs)).not.toContain(`${doc.id}-DESKTOP-ABC`);
  });

  it('CLI info: "modified" ignores Thumbs.db / desktop.ini touched by the OS', async () => {
    const { spawnSync } = await import('child_process');
    const dir = desktopProject();
    const future = new Date('2030-01-01T00:00:00Z');
    for (const f of ['docs/Thumbs.db', 'docs/desktop.ini', 'notes/.DS_Store']) {
      fs.writeFileSync(path.join(dir, f), 'x');
      fs.utimesSync(path.join(dir, f), future, future);
    }
    const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'cli', 'scribner.cjs'), 'info', dir, '--json'], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    expect(JSON.parse(r.stdout).modified.startsWith('2030')).toBe(false);
  });
});
