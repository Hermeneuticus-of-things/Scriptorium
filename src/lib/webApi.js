// Web / PWA implementation of window.api: projects live in the browser (IndexedDB).
// Covers the editing subset (projects, docs, notes, snapshots, history, settings) and
// sync with the desktop app through a single-file bundle (same shape as lib/bundle.cjs).
import { newNode } from './text.js';
import { mergeProject } from './projectMerge.js';
import { createRoutingKv, createFolderStore, folderSupported, isFolderDir } from './folderKv.js';

export const BUNDLE_FORMAT = 'scribner-bundle';
export const BUNDLE_VERSION = 1;
const DB_NAME = 'scribner';
const STORE = 'kv';

// ---- storage -------------------------------------------------------------------

// Minimal key/value over IndexedDB. Any object with the same async get/put/del/keys
// methods can be injected (tests use createMemoryKv).
export function createIdbKv(indexedDB = globalThis.indexedDB) {
  if (!indexedDB) throw new Error('Browserul nu are IndexedDB.');
  const dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const tx = async (mode, fn) => {
    const db = await dbp;
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req && req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  };
  return {
    get: (k) => tx('readonly', (s) => s.get(k)),
    put: (k, v) => tx('readwrite', (s) => s.put(v, k)).then(() => true),
    // Several writes in one transaction: all or nothing (bundle import).
    putMany: (entries) =>
      tx('readwrite', (s) => {
        for (const [k, v] of entries) s.put(v, k);
      }).then(() => true),
    // Read-modify-write in one transaction, so another tab can't write in between.
    update: async (k, fn) => {
      const db = await dbp;
      return new Promise((resolve, reject) => {
        const t = db.transaction(STORE, 'readwrite');
        const st = t.objectStore(STORE);
        let out;
        const req = st.get(k);
        req.onsuccess = () => {
          try {
            out = fn(req.result);
            st.put(out, k);
          } catch (err) {
            t.abort();
            reject(err);
          }
        };
        t.oncomplete = () => resolve(out);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      });
    },
    del: (k) => tx('readwrite', (s) => s.delete(k)).then(() => true),
    keys: async (prefix = '') => {
      const all = await tx('readonly', (s) => s.getAllKeys());
      return (all || []).filter((k) => typeof k === 'string' && k.startsWith(prefix));
    },
  };
}

export function createMemoryKv() {
  const m = new Map();
  return {
    get: async (k) => (m.has(k) ? structuredClone(m.get(k)) : undefined),
    put: async (k, v) => (m.set(k, structuredClone(v)), true),
    putMany: async (entries) => {
      for (const [k, v] of entries) m.set(k, structuredClone(v));
      return true;
    },
    update: async (k, fn) => {
      const out = fn(m.has(k) ? structuredClone(m.get(k)) : undefined);
      m.set(k, structuredClone(out));
      return structuredClone(out);
    },
    del: async (k) => m.delete(k),
    keys: async (prefix = '') => [...m.keys()].filter((k) => k.startsWith(prefix)),
  };
}

// ---- pure helpers --------------------------------------------------------------

const K = {
  settings: 'settings',
  project: (dir) => `p:${dir}`,
  doc: (dir, kind, id) => `d:${dir}|${kind === 'notes' ? 'notes' : 'docs'}|${id}`,
  docPrefix: (dir) => `d:${dir}|`,
  snaps: (dir, id) => `s:${dir}|${id}`,
  snapPrefix: (dir) => `s:${dir}|`,
  history: (dir) => `h:${dir}`,
};

export function newWebDir() {
  return `web:${crypto.randomUUID()}`;
}

export function blankProject(title) {
  const ch = newNode('text', 'Capitolul 1');
  return {
    project: {
      format: 1,
      title,
      author: '',
      created: new Date().toISOString(),
      targets: { draft: 80000, session: 1000 },
      labels: [
        { name: 'Fără', color: '' },
        { name: 'Idee', color: '#e8b04a' },
        { name: 'Personaj', color: '#5b9bd5' },
        { name: 'Loc', color: '#70ad47' },
      ],
      statuses: ['Fără', 'De făcut', 'Prima ciornă', 'Revizuit', 'Final'],
      tree: [
        { id: 'draft', title: 'Manuscris', type: 'folder', root: 'draft', children: [ch] },
        { id: 'research', title: 'Cercetare', type: 'folder', root: 'research', children: [] },
        { id: 'trash', title: 'Coș', type: 'folder', root: 'trash', children: [] },
      ],
    },
    docs: { [ch.id]: '<p></p>' },
  };
}

export function validateBundle(bundle) {
  if (!bundle || bundle.format !== BUNDLE_FORMAT) throw new Error('Fișierul nu este un pachet de proiect Scribner.');
  if (bundle.version > BUNDLE_VERSION) throw new Error('Pachetul a fost creat cu o versiune mai nouă de Scribner.');
  if (!bundle.project || !Array.isArray(bundle.project.tree)) throw new Error('Pachet incomplet: lipsește arborele proiectului.');
  return bundle;
}

export function parseBundle(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Pachetul nu este JSON valid.');
  }
  return validateBundle(data);
}

// Daily word history, same summary shape as lib/history.cjs summarize().
export function recordDay(hist, counts, date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  const h = { ...(hist || {}) };
  const d = h[day] ? { ...h[day] } : { draftStart: counts.draft, totalStart: counts.total };
  d.draftEnd = counts.draft;
  d.totalEnd = counts.total;
  h[day] = d;
  return h;
}

export function summarizeHistory(hist) {
  return Object.entries(hist || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, draft: d.draftEnd - d.draftStart, total: d.totalEnd - d.totalStart, draftWords: d.draftEnd }));
}

// Browser storage full (IndexedDB quota): a message the writer can act on.
export const QUOTA_MESSAGE = 'Spațiul de stocare al browserului este plin. Exportă proiectul ca pachet (.json), apoi șterge proiecte sau snapshot-uri vechi.';
export function isQuotaError(err) {
  const name = err && (err.name || (err.inner && err.inner.name));
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || /quota/i.test(String(err && err.message));
}
function friendly(err) {
  if (!isQuotaError(err)) return err;
  const e = new Error(QUOTA_MESSAGE);
  e.code = 'QUOTA';
  e.cause = err;
  return e;
}
function guardKv(kv) {
  const wrap = (fn) => (fn ? async (...a) => {
    try {
      return await fn(...a);
    } catch (err) {
      throw friendly(err);
    }
  } : undefined);
  return { ...kv, put: wrap(kv.put), putMany: wrap(kv.putMany), update: wrap(kv.update), del: wrap(kv.del) };
}

// File name for a bundle download: titles may hold / \ : * ? " < > | or be empty.
export function bundleFileName(title) {
  const safe = String(title || '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/^[.\s]+|[.\s]+$/g, '').slice(0, 120);
  return `${safe || 'Proiect'}.scribner.json`;
}

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function download(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return name;
}

function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
    input.click();
  });
}

const DEFAULT_SETTINGS = { recent: [], theme: 'system', fontSize: 18, typewriter: false, smartQuotes: true, aiEnabled: false, hasApiKey: false };

// ---- api -----------------------------------------------------------------------

// channel: BroadcastChannel-like ({ postMessage, onmessage / addEventListener }) shared
// by the tabs of this browser; a tab that edits a project tells the others, which
// reload (same 'project:changed' shape as the desktop watcher).
function defaultChannel() {
  try {
    return typeof BroadcastChannel === 'function' ? new BroadcastChannel('scribner-projects') : null;
  } catch {
    return null;
  }
}

// Folder projects ("fs:…"): a real .scribner folder on disk, opened with the File System Access API
// (Chrome / Edge on desktop). The folder can live in OneDrive, Dropbox, Google Drive or on a NAS share:
// the desktop app opens the same folder, and the polling watcher below picks up its changes.
const WATCH_MS = 3000;

export function createWebApi({ kv: baseKv = createIdbKv(), channel = defaultChannel(), pickDirectory, watchMs = WATCH_MS } = {}) {
  const canPick = () => Boolean(pickDirectory) || folderSupported();
  const pick = pickDirectory || (() => globalThis.showDirectoryPicker({ mode: 'readwrite' }));
  const folders = new Map(); // dir -> FileSystemDirectoryHandle
  const rawKv = createRoutingKv(baseKv, folders);
  const kv = guardKv(rawKv);
  const watchers = new Map(); // dir -> { timer, stamps, own }
  // Own writes are not reported back as outside changes: the next change seen on that file is ours.
  const touched = (dir, file) => {
    const w = watchers.get(dir);
    if (w) w.own.set(file, Date.now() + 2 * watchMs + 1000);
  };
  // Handle of a folder project, from memory or from IndexedDB (handles survive reloads; the
  // browser asks the user again for permission once per session).
  async function folderHandle(dir) {
    if (folders.has(dir)) return folders.get(dir);
    const h = await baseKv.get(`fh:${dir}`);
    if (!h) throw new Error('Folderul proiectului nu mai e cunoscut în acest browser. Deschide-l din nou.');
    if (h.queryPermission && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      if (!h.requestPermission || (await h.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('Fără acces la folderul proiectului.');
    }
    folders.set(dir, h);
    return h;
  }
  async function openFolder() {
    let h;
    try {
      h = await pick();
    } catch (e) {
      if (e && e.name === 'AbortError') return null;
      throw e;
    }
    const project = await createFolderStore(h).get({ kind: 'project' });
    if (!project) throw new Error('Folderul ales nu e un proiect Scribner (lipsește project.json).');
    // Same folder opened again -> same dir (no duplicate entries in "recent").
    let dir = null;
    for (const r of (await settings()).recent || []) {
      if (!isFolderDir(r.dir)) continue;
      const old = folders.get(r.dir) || (await baseKv.get(`fh:${r.dir}`));
      if (old && old.isSameEntry && (await old.isSameEntry(h).catch(() => false))) dir = r.dir;
    }
    dir = dir || `fs:${String(h.name || 'proiect').replace(/[|:]/g, '_').slice(0, 60)}-${Date.now().toString(36)}`;
    folders.set(dir, h);
    await baseKv.put(`fh:${dir}`, h);
    bases.set(dir, structuredClone(project));
    await remember(dir, project.title);
    return { dir, project };
  }
  const tabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const listeners = new Set();
  const emit = (info) => {
    for (const fn of [...listeners]) {
      try {
        fn(info);
      } catch {
        /* a listener's error is its own */
      }
    }
  };
  if (channel) {
    const onMsg = (ev) => {
      const m = ev && ev.data;
      if (!m || m.type !== 'changed' || m.from === tabId) return;
      emit({ dir: m.dir, files: m.files, external: true });
    };
    if (channel.addEventListener) channel.addEventListener('message', onMsg);
    else channel.onmessage = onMsg;
  }
  const announce = (dir, files) => {
    try {
      channel?.postMessage({ type: 'changed', from: tabId, dir, files });
    } catch {
      /* closed channel */
    }
  };
  // Merge base per project (the version this tab last loaded or wrote): see saveProject.
  const bases = new Map();
  const settings = async () => ({ ...DEFAULT_SETTINGS, ...((await kv.get(K.settings)) || {}) });
  const putSettings = async (patch) => kv.put(K.settings, { ...(await settings()), ...patch });
  const remember = async (dir, title) => {
    const s = await settings();
    await putSettings({ recent: [{ dir, title }, ...(s.recent || []).filter((r) => r.dir !== dir)].slice(0, 20) });
  };
  const need = async (dir) => {
    const p = await kv.get(K.project(dir));
    if (!p) throw new Error('Proiectul nu există în acest browser.');
    return p;
  };

  async function exportBundleData(dir) {
    const project = await need(dir);
    const docs = {};
    const notes = {};
    const snapshots = {};
    for (const k of await kv.keys(K.docPrefix(dir))) {
      const [, kind, id] = k.slice(2).split('|');
      (kind === 'notes' ? notes : docs)[id] = await kv.get(k);
    }
    for (const k of await kv.keys(K.snapPrefix(dir))) {
      const id = k.slice(K.snapPrefix(dir).length);
      const list = ((await kv.get(k)) || []).map(({ name, date, html }) => ({ name, date, html }));
      if (list.length) snapshots[id] = list;
    }
    return { format: BUNDLE_FORMAT, version: BUNDLE_VERSION, exported: new Date().toISOString(), project, docs, notes, snapshots };
  }

  async function importBundleData(bundle) {
    validateBundle(bundle);
    const dir = newWebDir();
    const project = structuredClone(bundle.project);
    const entries = [];
    for (const [id, html] of Object.entries(bundle.docs || {})) entries.push([K.doc(dir, 'docs', id), String(html)]);
    for (const [id, html] of Object.entries(bundle.notes || {})) entries.push([K.doc(dir, 'notes', id), String(html)]);
    for (const [id, list] of Object.entries(bundle.snapshots || {})) {
      // Bundles carry no file ids: give each snapshot a unique one (index), never the incoming `file`.
      entries.push([K.snaps(dir, id), (Array.isArray(list) ? list : []).map((s, i) => ({ name: s.name || 'Snapshot', date: s.date, html: String(s.html || ''), file: `${Date.parse(s.date) || Date.now()}-${i}` }))]);
    }
    // project.json last: a failed (quota) import never leaves a half project that opens.
    entries.push([K.project(dir), project]);
    try {
      if (kv.putMany) await kv.putMany(entries);
      else for (const [k, v] of entries) await kv.put(k, v);
    } catch (err) {
      for (const [k] of entries) await rawKv.del(k).catch(() => {});
      throw err;
    }
    bases.set(dir, structuredClone(project));
    await remember(dir, project.title);
    return { dir, project };
  }

  return {
    isWeb: true,
    async getSettings() {
      return settings();
    },
    async setSettings(patch) {
      const { apiKey, ...rest } = patch || {};
      await putSettings(rest);
      return true;
    },
    async listTemplates() {
      return [{ id: 'blank', name: 'Gol' }];
    },
    async newProject(title) {
      const dir = newWebDir();
      const { project, docs } = blankProject(title || 'Proiect nou');
      await kv.put(K.project(dir), project);
      for (const [id, html] of Object.entries(docs)) await kv.put(K.doc(dir, 'docs', id), html);
      bases.set(dir, structuredClone(project));
      await remember(dir, project.title);
      return { dir, project };
    },
    async openProject(dir) {
      if (!dir) {
        // Chrome / Edge: a real .scribner folder. Other browsers: import a bundle file.
        return canPick() ? openFolder() : this.importBundle();
      }
      if (isFolderDir(dir)) await folderHandle(dir);
      const project = await need(dir);
      if (!bases.has(dir)) bases.set(dir, structuredClone(project));
      await remember(dir, project.title);
      return { dir, project };
    },
    // Re-read after another tab changed the project (merge base unchanged).
    async reloadProject(dir) {
      if (isFolderDir(dir)) await folderHandle(dir);
      return { dir, project: await need(dir) };
    },
    // Folder projects: poll the files' modification times (no change events for folders in
    // browsers); changes made by the desktop app or a sync client are reported like a desktop watcher.
    async watchProject(dir) {
      for (const [d, w] of watchers) {
        clearInterval(w.timer);
        watchers.delete(d);
      }
      if (!isFolderDir(dir) || !folders.has(dir)) return true;
      const store = createFolderStore(folders.get(dir));
      const w = { stamps: await store.stamps().catch(() => ({})), own: new Map(), busy: false };
      w.timer = setInterval(async () => {
        if (w.busy) return;
        w.busy = true;
        try {
          const now = await store.stamps();
          const t = Date.now();
          for (const [f, until] of w.own) if (until < t) w.own.delete(f);
          const changed = [...new Set([...Object.keys(now), ...Object.keys(w.stamps)])].filter((f) => now[f] !== w.stamps[f]);
          const files = changed.filter((f) => !w.own.delete(f));
          w.stamps = now;
          if (files.length) emit({ dir, files, external: true });
        } catch {
          /* folder briefly unavailable (sync client, NAS offline): try again next tick */
        } finally {
          w.busy = false;
        }
      }, watchMs);
      watchers.set(dir, w);
      return true;
    },
    async unwatchProject() {
      for (const [d, w] of watchers) {
        clearInterval(w.timer);
        watchers.delete(d);
      }
      return true;
    },
    onProjectChanged(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    // Another tab may have saved since this tab loaded: three-way merge against the
    // stored version instead of overwriting it (same rules as the desktop app).
    async saveProject(dir, project) {
      const base = bases.get(dir);
      let merged = false;
      const apply = (stored) => {
        if (base && stored && !sameJson(stored, base)) {
          merged = true;
          return mergeProject(base, project, stored);
        }
        return project;
      };
      let out;
      if (kv.update) out = await kv.update(K.project(dir), apply);
      else {
        out = apply(await kv.get(K.project(dir)));
        await kv.put(K.project(dir), out);
      }
      touched(dir, 'project.json');
      if (!merged) bases.set(dir, structuredClone(project));
      else emit({ dir, files: ['project.json'], merged: true });
      announce(dir, ['project.json']);
      return true;
    },
    async deleteProject(dir) {
      if (isFolderDir(dir)) {
        // A folder on the user's disk is only forgotten here, never deleted.
        await baseKv.del(`fh:${dir}`);
        folders.delete(dir);
        bases.delete(dir);
        const s = await settings();
        await putSettings({ recent: (s.recent || []).filter((r) => r.dir !== dir) });
        return true;
      }
      for (const k of [...(await kv.keys(K.docPrefix(dir))), ...(await kv.keys(K.snapPrefix(dir)))]) await kv.del(k);
      await kv.del(K.project(dir));
      await kv.del(K.history(dir));
      if (isFolderDir(dir)) await baseKv.del(`fh:${dir}`);
      folders.delete(dir);
      bases.delete(dir);
      const s = await settings();
      await putSettings({ recent: (s.recent || []).filter((r) => r.dir !== dir) });
      return true;
    },
    async readDoc(dir, id, kind) {
      return (await kv.get(K.doc(dir, kind, id))) || '';
    },
    async writeDoc(dir, id, kind, html) {
      await kv.put(K.doc(dir, kind, id), html);
      touched(dir, `${kind === 'notes' ? 'notes' : 'docs'}/${id}.html`);
      announce(dir, [`${kind === 'notes' ? 'notes' : 'docs'}/${id}.html`]);
      return true;
    },
    async takeSnapshot(dir, id, name) {
      const date = new Date().toISOString();
      const html = (await kv.get(K.doc(dir, 'docs', id))) || '';
      let s;
      const add = (list) => {
        const prev = Array.isArray(list) ? list : [];
        // Unique file id even for two snapshots in the same millisecond.
        let file = String(Date.now());
        for (let n = 2; prev.some((x) => x.file === file); n++) file = `${Date.now()}-${n}`;
        s = { file, name: name || 'Snapshot', date, html };
        return [s, ...prev];
      };
      if (kv.update) await kv.update(K.snaps(dir, id), add);
      else await kv.put(K.snaps(dir, id), add(await kv.get(K.snaps(dir, id))));
      return s;
    },
    async listSnapshots(dir, id) {
      return (await kv.get(K.snaps(dir, id))) || [];
    },
    async deleteSnapshot(dir, id, file) {
      const list = (await kv.get(K.snaps(dir, id))) || [];
      await kv.put(K.snaps(dir, id), list.filter((x) => x.file !== file));
      return true;
    },
    async renameSnapshot(dir, id, file, name) {
      const list = (await kv.get(K.snaps(dir, id))) || [];
      await kv.put(K.snaps(dir, id), list.map((x) => (x.file === file ? { ...x, name: String(name || 'Snapshot') } : x)));
      return true;
    },
    async recordHistory(dir, counts) {
      await kv.put(K.history(dir), recordDay(await kv.get(K.history(dir)), counts));
      return true;
    },
    async getHistory(dir) {
      return summarizeHistory(await kv.get(K.history(dir)));
    },
    exportBundleData,
    importBundleData,
    async exportBundle(dir) {
      const data = await exportBundleData(dir);
      return download(bundleFileName(data.project.title), JSON.stringify(data));
    },
    async importBundle() {
      const file = await pickFile('.json,application/json');
      if (!file) return null;
      return importBundleData(parseBundle(await file.text()));
    },
    async importFile() {
      throw new Error('Importul de fișiere funcționează doar în aplicația desktop.');
    },
    async importScriv() {
      throw new Error('Importul .scriv funcționează doar în aplicația desktop. Exportă de acolo un pachet .json.');
    },
    async exportCompiled() {
      throw new Error('Compilarea funcționează în aplicația desktop. Exportă proiectul ca pachet și deschide-l acolo.');
    },
    async runAi() {
      throw new Error('Asistentul AI funcționează doar în aplicația desktop.');
    },
  };
}
