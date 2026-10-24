// Safety nets for a project folder shared through OneDrive / Dropbox / Google Drive / a NAS by the
// desktop app and the web build. Pure (the api is passed in): used by src/App.jsx, by the web api
// (src/lib/webApi.js) and by the Electron main process (lib/projectWatch.cjs).

// Copies made by sync clients when both computers changed a file before syncing:
//   Dropbox      "project (conflicted copy 2026-10-24).json", "project (Ion's conflicted copy …).json"
//   OneDrive     "project-DESKTOP-ABC.json", "<id>-LAPTOP-ION.html"
//   Google Drive "project (1).json"
//   Syncthing    "project.sync-conflict-20261024-101010-ABCDEFG.json"
//   Nextcloud    "project (conflicted copy 2026-10-24 101010).json"
// They are never loaded (the app reads only project.json and docs/<id>.html); they are listed so
// the writer can compare them and delete them.
const PROJECT_COPY = /^project.+\.json$/i;

function docCopies(names, sub, ids) {
  const out = [];
  for (const name of names || []) {
    const m = /^(.+)\.html$/i.exec(name);
    if (!m || ids.has(m[1])) continue;
    const stem = m[1];
    // A known id followed by a separator: the copy of that document.
    const id = stem.length > 36 && ids.has(stem.slice(0, 36)) ? stem.slice(0, 36) : [...ids].find((x) => stem.startsWith(x) && /^[\s(._-]/.test(stem.slice(x.length)));
    if (id) out.push(`${sub}/${name}`);
  }
  return out;
}

/** Relative paths of conflict copies, from the names in the project folder, docs/ and notes/. */
export function findConflictCopies({ root = [], docs = [], notes = [], ids = new Set() } = {}) {
  const known = ids instanceof Set ? ids : new Set(ids);
  return [...root.filter((n) => n !== 'project.json' && PROJECT_COPY.test(n)), ...docCopies(docs, 'docs', known), ...docCopies(notes, 'notes', known)];
}

/** Every node id of a project tree. */
export function treeIds(tree) {
  const ids = new Set();
  const walk = (list) => {
    for (const n of list || []) {
      ids.add(n.id);
      walk(n.children);
    }
  };
  walk(tree);
  return ids;
}

/**
 * Documents changed on the other computer. A document with local edits not yet saved here keeps
 * the local text (it is saved next, as usual), and the other computer's version is kept as a
 * snapshot named `label` instead of being lost; the caller tells the writer. `localHtml(id)` (when
 * given) skips the snapshot if both sides hold the same text.
 * Returns { updated: { id: html } to show, conflicts: [ids saved as snapshots] }.
 */
export async function pullExternalDocs({ api, dir, ids, hasLocal = () => false, localHtml, label }) {
  const updated = {};
  const conflicts = [];
  for (const id of ids) {
    if (!hasLocal(id)) {
      updated[id] = await api.readDoc(dir, id, 'docs');
      continue;
    }
    const theirs = await api.readDoc(dir, id, 'docs');
    if (localHtml && localHtml(id) === theirs) continue;
    // takeSnapshot stores what is on disk now: the version that just arrived.
    await api.takeSnapshot(dir, id, label);
    conflicts.push(id);
  }
  return { updated, conflicts };
}
