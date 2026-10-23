// Web / PWA implementation of window.api: projects live in the browser (IndexedDB).
// Covers the editing subset (projects, docs, notes, snapshots, history, settings) and
// sync with the desktop app through a single-file bundle (same shape as lib/bundle.cjs).
import { newNode } from './text.js';

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

export function createWebApi({ kv = createIdbKv() } = {}) {
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
      snapshots[id] = ((await kv.get(k)) || []).map(({ name, date, html }) => ({ name, date, html }));
    }
    return { format: BUNDLE_FORMAT, version: BUNDLE_VERSION, exported: new Date().toISOString(), project, docs, notes, snapshots };
  }

  async function importBundleData(bundle) {
    validateBundle(bundle);
    const dir = newWebDir();
    const project = structuredClone(bundle.project);
    await kv.put(K.project(dir), project);
    for (const [id, html] of Object.entries(bundle.docs || {})) await kv.put(K.doc(dir, 'docs', id), String(html));
    for (const [id, html] of Object.entries(bundle.notes || {})) await kv.put(K.doc(dir, 'notes', id), String(html));
    for (const [id, list] of Object.entries(bundle.snapshots || {})) {
      await kv.put(K.snaps(dir, id), (list || []).map((s, i) => ({ file: `${Date.parse(s.date) || Date.now()}-${i}`, ...s })));
    }
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
      await remember(dir, project.title);
      return { dir, project };
    },
    async openProject(dir) {
      if (!dir) {
        // No folder dialog in the browser: "open" means importing a bundle file.
        return this.importBundle();
      }
      const project = await need(dir);
      await remember(dir, project.title);
      return { dir, project };
    },
    async saveProject(dir, project) {
      await kv.put(K.project(dir), project);
      return true;
    },
    async deleteProject(dir) {
      for (const k of [...(await kv.keys(K.docPrefix(dir))), ...(await kv.keys(K.snapPrefix(dir)))]) await kv.del(k);
      await kv.del(K.project(dir));
      await kv.del(K.history(dir));
      const s = await settings();
      await putSettings({ recent: (s.recent || []).filter((r) => r.dir !== dir) });
      return true;
    },
    async readDoc(dir, id, kind) {
      return (await kv.get(K.doc(dir, kind, id))) || '';
    },
    async writeDoc(dir, id, kind, html) {
      await kv.put(K.doc(dir, kind, id), html);
      return true;
    },
    async takeSnapshot(dir, id, name) {
      const date = new Date().toISOString();
      const s = { file: String(Date.now()), name: name || 'Snapshot', date, html: (await kv.get(K.doc(dir, 'docs', id))) || '' };
      const list = (await kv.get(K.snaps(dir, id))) || [];
      await kv.put(K.snaps(dir, id), [s, ...list]);
      return s;
    },
    async listSnapshots(dir, id) {
      return (await kv.get(K.snaps(dir, id))) || [];
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
      return download(`${data.project.title || 'Proiect'}.scribner.json`, JSON.stringify(data));
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
