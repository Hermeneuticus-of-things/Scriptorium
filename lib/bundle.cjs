'use strict';
// Portable project bundle: one JSON file carrying project.json, every doc/note and
// the snapshots. Used to sync a project between the desktop app and the web/PWA build
// (src/lib/webApi.js reads and writes the same shape).
//   { format: 'scribner-bundle', version: 1, exported, project, docs: {id: html},
//     notes: {id: html}, snapshots: {id: [{name, date, html}]} }
// Media files are not carried (the web build has no media store).
const fs = require('fs');
const path = require('path');
const store = require('./store.cjs');

const BUNDLE_FORMAT = 'scribner-bundle';
const BUNDLE_VERSION = 1;

function listIds(dir, kind) {
  const d = path.join(dir, kind);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => /^[A-Za-z0-9-]+\.html$/.test(f)).map((f) => f.slice(0, -5));
}

function exportBundle(dir) {
  const project = store.loadProject(dir);
  const docs = {};
  const notes = {};
  const snapshots = {};
  // Conflict copies a sync client left next to a document ("<id>-PC.html") are not documents.
  const conflicts = new Set(require('./projectWatch.cjs').syncConflicts(dir));
  for (const id of listIds(dir, 'docs')) if (!conflicts.has(`docs/${id}.html`)) docs[id] = store.readDoc(dir, id, 'docs');
  for (const id of listIds(dir, 'notes')) if (!conflicts.has(`notes/${id}.html`)) notes[id] = store.readDoc(dir, id, 'notes');
  const snapRoot = path.join(dir, 'snapshots');
  if (fs.existsSync(snapRoot)) {
    for (const id of fs.readdirSync(snapRoot)) {
      if (!/^[A-Za-z0-9-]+$/.test(id)) continue;
      const list = store.listSnapshots(dir, id).map(({ name, date, html }) => ({ name, date, html }));
      if (list.length) snapshots[id] = list;
    }
  }
  return { format: BUNDLE_FORMAT, version: BUNDLE_VERSION, exported: new Date().toISOString(), project, docs, notes, snapshots };
}

function validateBundle(bundle) {
  if (!bundle || bundle.format !== BUNDLE_FORMAT) throw new Error('Fișierul nu este un pachet de proiect Scribner.');
  if (bundle.version > BUNDLE_VERSION) throw new Error('Pachetul a fost creat cu o versiune mai nouă de Scribner.');
  if (!bundle.project || !Array.isArray(bundle.project.tree)) throw new Error('Pachet incomplet: lipsește arborele proiectului.');
  // Ids become file names: validate them all before anything is written (no half-imported project).
  for (const kind of ['docs', 'notes', 'snapshots']) {
    for (const id of Object.keys(bundle[kind] || {})) {
      if (!/^[A-Za-z0-9-]+$/.test(id)) throw new Error(`Pachet invalid: id ${id}`);
    }
  }
  return bundle;
}

// Writes the bundle as a new project folder under parentDir; returns { dir, project }.
function importBundle(bundle, parentDir) {
  validateBundle(bundle);
  const project = bundle.project;
  const dir = store.projectDirFor(parentDir, project.title || 'Proiect');
  if (fs.existsSync(path.join(dir, 'project.json'))) throw new Error(`Există deja un proiect în ${dir}`);
  store.saveProject(dir, project);
  for (const [id, html] of Object.entries(bundle.docs || {})) store.writeDoc(dir, id, 'docs', String(html));
  for (const [id, html] of Object.entries(bundle.notes || {})) store.writeDoc(dir, id, 'notes', String(html));
  for (const [id, list] of Object.entries(bundle.snapshots || {})) {
    for (const s of list || []) store.addSnapshot(dir, id, s);
  }
  return { dir, project: store.loadProject(dir) };
}

module.exports = { BUNDLE_FORMAT, BUNDLE_VERSION, exportBundle, importBundle, validateBundle };
