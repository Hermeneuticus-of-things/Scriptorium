// A real `.scribner` folder opened in the browser (File System Access API), exposed as the same
// key/value interface the web app uses for IndexedDB. The files are the desktop app's own layout,
// so a folder kept in OneDrive / Dropbox / Google Drive is shared by the web and desktop versions.
//   p:<dir>               -> project.json
//   d:<dir>|docs|<id>     -> docs/<id>.html        d:<dir>|notes|<id> -> notes/<id>.html
//   s:<dir>|<id>          -> snapshots/<id>/*.json (list, newest first)
//   h:<dir>               -> history.json

const ID = /^[A-Za-z0-9-]+$/;

function parseKey(key) {
  let m;
  if ((m = /^p:(.+)$/.exec(key))) return { dir: m[1], kind: 'project' };
  if ((m = /^d:(.+?)\|(docs|notes)\|(.+)$/.exec(key))) return { dir: m[1], kind: 'doc', sub: m[2], id: m[3] };
  if ((m = /^s:(.+?)\|(.+)$/.exec(key))) return { dir: m[1], kind: 'snaps', id: m[2] };
  if ((m = /^h:(.+)$/.exec(key))) return { dir: m[1], kind: 'history' };
  return null;
}

async function subdir(root, name, create) {
  try {
    return await root.getDirectoryHandle(name, { create });
  } catch (e) {
    if (!create && (e.name === 'NotFoundError' || e.name === 'TypeMismatchError')) return null;
    throw e;
  }
}
async function readText(dirHandle, name) {
  if (!dirHandle) return undefined;
  try {
    const fh = await dirHandle.getFileHandle(name);
    return await (await fh.getFile()).text();
  } catch (e) {
    if (e.name === 'NotFoundError' || e.name === 'TypeMismatchError') return undefined;
    throw e;
  }
}
// createWritable writes to a temporary file and swaps it in on close: a crash never leaves half a file.
async function writeText(dirHandle, name, text) {
  const fh = await dirHandle.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(text);
  await w.close();
}
async function remove(dirHandle, name) {
  try {
    await dirHandle.removeEntry(name);
  } catch (e) {
    if (e.name !== 'NotFoundError') throw e;
  }
}
// project.json as written to a folder (the web watcher compares its own writes by content).
export const projectText = (v) => JSON.stringify(v, null, 2);
const snapName = (file) => (String(file).endsWith('.json') ? String(file) : `${file}.json`);

/** Storage for one project folder. */
export function createFolderStore(root) {
  const check = (id) => {
    if (!ID.test(id)) throw new Error(`Id invalid: ${id}`);
  };
  async function get(k) {
    switch (k.kind) {
      case 'project': {
        const t = await readText(root, 'project.json');
        return t === undefined ? undefined : JSON.parse(t);
      }
      case 'doc':
        check(k.id);
        return readText(await subdir(root, k.sub, false), `${k.id}.html`);
      case 'history': {
        const t = await readText(root, 'history.json');
        return t === undefined ? undefined : JSON.parse(t);
      }
      case 'snaps': {
        check(k.id);
        const snaps = await subdir(root, 'snapshots', false);
        const d = snaps && (await subdir(snaps, k.id, false));
        if (!d) return undefined;
        const out = [];
        for await (const [name, h] of d.entries()) {
          if (h.kind !== 'file' || !name.endsWith('.json')) continue;
          try {
            const { name: label, date, html } = JSON.parse(await (await h.getFile()).text());
            out.push({ file: name, name: label || 'Snapshot', date, html: html || '' });
          } catch {
            /* unreadable snapshot file: skipped, not deleted */
          }
        }
        return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
      }
      default:
        return undefined;
    }
  }
  async function put(k, v) {
    switch (k.kind) {
      case 'project':
        return writeText(root, 'project.json', projectText(v));
      case 'doc':
        check(k.id);
        return writeText(await subdir(root, k.sub, true), `${k.id}.html`, String(v ?? ''));
      case 'history':
        return writeText(root, 'history.json', JSON.stringify(v, null, 1));
      case 'snaps': {
        // The folder mirrors the list: new entries written, entries no longer listed removed.
        check(k.id);
        const d = await subdir(await subdir(root, 'snapshots', true), k.id, true);
        const want = new Map((v || []).map((s) => [snapName(s.file), s]));
        for await (const [name, h] of d.entries()) if (h.kind === 'file' && name.endsWith('.json') && !want.has(name)) await remove(d, name);
        for (const [name, s] of want) {
          const prev = await readText(d, name);
          const body = JSON.stringify({ name: s.name || 'Snapshot', date: s.date, html: s.html || '' });
          if (prev !== body) await writeText(d, name, body);
        }
        return undefined;
      }
      default:
        throw new Error('Cheie necunoscută');
    }
  }
  async function del(k) {
    if (k.kind === 'doc') return remove((await subdir(root, k.sub, false)) || root, `${k.id}.html`);
    if (k.kind === 'snaps') return put(k, []);
    return undefined; // never delete project.json / history.json of a user's folder from the web
  }
  // Change stamps ("<lastModified>:<size>") of project.json and of docs/<id>.html, notes/<id>.html,
  // for watching changes made elsewhere. The size catches a second write within the same timestamp
  // (FAT / SMB shares keep 2 s). Sync-client and OS files (desktop.ini, ~$…, .DS_Store, lock files,
  // conflict copies of project.json) are left out.
  async function stamps() {
    const out = {};
    const add = async (dirHandle, prefix) => {
      if (!dirHandle) return;
      for await (const [name, h] of dirHandle.entries()) {
        if (h.kind !== 'file') continue;
        if (prefix ? !(name.endsWith('.html') && ID.test(name.slice(0, -5))) : name !== 'project.json') continue;
        const f = await h.getFile();
        out[prefix + name] = `${f.lastModified}:${f.size}`;
      }
    };
    await add(root, '');
    await add(await subdir(root, 'docs', false), 'docs/');
    await add(await subdir(root, 'notes', false), 'notes/');
    return out;
  }
  // Raw text of a file given by its path in the folder ("project.json", "docs/<id>.html").
  async function text(rel) {
    const parts = String(rel).split('/');
    const name = parts.pop();
    let d = root;
    for (const p of parts) d = await subdir(d, p, false);
    return readText(d, name);
  }
  // File names in the folder itself or in one of its sub-folders ('' = the folder).
  async function names(sub) {
    const d = sub ? await subdir(root, sub, false) : root;
    const out = [];
    if (d) for await (const [name, h] of d.entries()) if (h.kind === 'file') out.push(name);
    return out;
  }
  // Keys of this folder's docs/notes ("d:<dir>|docs|<id>") or snapshot lists ("s:<dir>|<id>").
  async function keys(dir, kind) {
    const out = [];
    if (kind === 'd') {
      for (const sub of ['docs', 'notes']) {
        const d = await subdir(root, sub, false);
        if (!d) continue;
        for await (const [name, h] of d.entries()) {
          const id = name.replace(/\.html$/, '');
          if (h.kind === 'file' && id !== name && ID.test(id)) out.push(`d:${dir}|${sub}|${id}`);
        }
      }
    } else {
      const d = await subdir(root, 'snapshots', false);
      if (d) for await (const [name, h] of d.entries()) if (h.kind === 'directory' && ID.test(name)) out.push(`s:${dir}|${name}`);
    }
    return out.sort();
  }
  return { get, put, del, stamps, keys, text, names };
}

/**
 * Key/value store that sends keys of folder projects (dir "fs:…") to their folder and everything
 * else to `base` (IndexedDB). `folders` maps dir -> directory handle.
 */
export function createRoutingKv(base, folders) {
  const route = (key) => {
    const k = typeof key === 'string' ? parseKey(key) : null;
    const root = k && folders.get(k.dir);
    return root ? { k, store: createFolderStore(root) } : null;
  };
  return {
    async get(key) {
      const r = route(key);
      return r ? r.store.get(r.k) : base.get(key);
    },
    async put(key, v) {
      const r = route(key);
      if (!r) return base.put(key, v);
      await r.store.put(r.k, v);
      return true;
    },
    async putMany(entries) {
      const local = entries.filter(([k]) => !route(k));
      if (local.length) await (base.putMany ? base.putMany(local) : Promise.all(local.map(([k, v]) => base.put(k, v))));
      for (const [k, v] of entries) if (route(k)) await this.put(k, v);
      return true;
    },
    async update(key, fn) {
      const r = route(key);
      if (!r) return base.update ? base.update(key, fn) : base.put(key, fn(await base.get(key))).then(() => undefined);
      const out = fn(await r.store.get(r.k));
      await r.store.put(r.k, out);
      return out;
    },
    async del(key) {
      const r = route(key);
      if (!r) return base.del(key);
      await r.store.del(r.k);
      return true;
    },
    async keys(prefix) {
      const m = /^([ds]):(.+)\|$/.exec(prefix || '');
      const root = m && folders.get(m[2]);
      return root ? createFolderStore(root).keys(m[2], m[1]) : base.keys(prefix);
    },
  };
}

// Team files (src/lib/team.js) in <folder>/team/: { name: text } and one write (append for logs).
const TEAM_FILE = /^(log|presence)-[A-Za-z0-9-]{1,64}\.(jsonl|json)$/;
export async function folderTeamFiles(root) {
  const d = await subdir(root, 'team', false);
  const out = {};
  if (d) for await (const [name, h] of d.entries()) if (h.kind === 'file' && TEAM_FILE.test(name)) out[name] = await (await h.getFile()).text();
  return out;
}
export async function folderTeamWrite(root, name, text, append = false) {
  if (!TEAM_FILE.test(String(name))) throw new Error(`Fișier de echipă invalid: ${name}`);
  const d = await subdir(root, 'team', true);
  const prev = append ? (await readText(d, name)) || '' : '';
  await writeText(d, name, prev + String(text));
}

export const isFolderDir = (dir) => typeof dir === 'string' && dir.startsWith('fs:');
export const folderSupported = () => typeof globalThis.showDirectoryPicker === 'function';
