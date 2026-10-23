'use strict';
// Scribner project format: a folder "<Name>.scribner" containing
//   project.json            binder tree + metadata
//   docs/<id>.html          main text of each item
//   notes/<id>.html         per-item notes
//   snapshots/<id>/<ts>.json  {name, date, html}
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FORMAT = 1;

function newId() {
  return crypto.randomUUID();
}

function defaultProject(title) {
  return {
    format: FORMAT,
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
      { id: 'draft', title: 'Manuscris', type: 'folder', root: 'draft', children: [] },
      { id: 'research', title: 'Cercetare', type: 'folder', root: 'research', children: [] },
      { id: 'trash', title: 'Coș', type: 'folder', root: 'trash', children: [] },
    ],
  };
}

function newNode(type, title) {
  const node = {
    id: newId(),
    title: title || (type === 'folder' ? 'Dosar nou' : 'Document nou'),
    type,
    synopsis: '',
    label: 'Fără',
    status: 'Fără',
    includeInCompile: true,
    target: 0,
    keywords: [],
  };
  if (type === 'folder') node.children = [];
  return node;
}

function ensureDirs(dir) {
  for (const sub of ['docs', 'notes', 'snapshots', 'media']) {
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
  }
}

function projectDirFor(parent, title) {
  const safe = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'Proiect';
  return path.join(parent, `${safe}.scribner`);
}

function createProject(dir, title, templateId = 'blank') {
  if (fs.existsSync(path.join(dir, 'project.json'))) {
    throw new Error(`Există deja un proiect în ${dir}`);
  }
  const { TEMPLATES } = require('./templates.cjs');
  const tpl = TEMPLATES[templateId] || TEMPLATES.blank;
  ensureDirs(dir);
  const project = defaultProject(title);
  const build = (spec) => {
    const node = newNode(spec.type, spec.title);
    if (spec.label) node.label = spec.label;
    if (spec.template) node.includeInCompile = false;
    if (spec.type === 'folder') node.children = spec.children.map(build);
    if (spec.html) writeDoc(dir, node.id, 'docs', spec.html);
    return node;
  };
  project.tree[0].children = tpl.draft.map(build);
  project.tree[1].children = tpl.research.map(build);
  saveProject(dir, project);
  return project;
}

function loadProject(dir) {
  const file = path.join(dir, 'project.json');
  const project = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (project.format > FORMAT) {
    throw new Error('Proiectul a fost creat cu o versiune mai nouă de Scribner.');
  }
  ensureDirs(dir);
  return project;
}

function writeAtomic(file, data) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

function saveProject(dir, project) {
  ensureDirs(dir);
  writeAtomic(path.join(dir, 'project.json'), JSON.stringify(project, null, 2));
}

function checkId(id) {
  if (!/^[A-Za-z0-9-]+$/.test(id)) throw new Error(`Id invalid: ${id}`);
}

function readDoc(dir, id, kind = 'docs') {
  checkId(id);
  const file = path.join(dir, kind, `${id}.html`);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function writeDoc(dir, id, kind, html) {
  checkId(id);
  fs.mkdirSync(path.join(dir, kind), { recursive: true });
  writeAtomic(path.join(dir, kind, `${id}.html`), html);
}

function takeSnapshot(dir, id, name) {
  checkId(id);
  const html = readDoc(dir, id);
  const date = new Date().toISOString();
  const snapDir = path.join(dir, 'snapshots', id);
  fs.mkdirSync(snapDir, { recursive: true });
  const file = path.join(snapDir, `${date.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify({ name: name || 'Snapshot', date, html }));
  return { file: path.basename(file), name: name || 'Snapshot', date };
}

// Adds a snapshot with a given name/date (used by import).
function addSnapshot(dir, id, { name, date, html }) {
  checkId(id);
  const snapDir = path.join(dir, 'snapshots', id);
  fs.mkdirSync(snapDir, { recursive: true });
  const iso = new Date(date || Date.now()).toISOString();
  let file = path.join(snapDir, `${iso.replace(/[:.]/g, '-')}.json`);
  for (let n = 2; fs.existsSync(file); n++) file = path.join(snapDir, `${iso.replace(/[:.]/g, '-')}-${n}.json`);
  fs.writeFileSync(file, JSON.stringify({ name: name || 'Snapshot', date: iso, html }));
}

const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff', heic: 'image/heic', pdf: 'application/pdf',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', aac: 'audio/aac',
  mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/mp4', webm: 'video/webm',
  html: 'text/html', htm: 'text/html', webarchive: 'application/x-webarchive', txt: 'text/plain',
};

function mimeFor(name) {
  return MIME[String(name).split('.').pop().toLowerCase()] || 'application/octet-stream';
}

// Media files (images, PDF, audio, video) attached to binder items: media/<id>.<ext>
function writeMedia(dir, id, ext, data) {
  checkId(id);
  const safeExt = String(ext).replace(/[^A-Za-z0-9]/g, '').toLowerCase() || 'bin';
  const file = `${id}.${safeExt}`;
  fs.mkdirSync(path.join(dir, 'media'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'media', file), data);
  return file;
}

function readMedia(dir, file) {
  if (!/^[A-Za-z0-9-]+\.[a-z0-9]+$/.test(file)) throw new Error(`Fișier media invalid: ${file}`);
  const data = fs.readFileSync(path.join(dir, 'media', file));
  return { data, mime: mimeFor(file) };
}

function listSnapshots(dir, id) {
  checkId(id);
  const snapDir = path.join(dir, 'snapshots', id);
  if (!fs.existsSync(snapDir)) return [];
  return fs
    .readdirSync(snapDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse()
    .map((f) => {
      const { name, date, html } = JSON.parse(fs.readFileSync(path.join(snapDir, f), 'utf8'));
      return { file: f, name, date, html };
    });
}

function walk(nodes, fn, depth = 0, parent = null) {
  for (const n of nodes) {
    fn(n, depth, parent);
    if (n.children) walk(n.children, fn, depth + 1, n);
  }
}

function findNode(tree, id) {
  let found = null;
  walk(tree, (n) => {
    if (n.id === id) found = n;
  });
  return found;
}

function htmlToText(html) {
  return (html || '')
    .replace(/<\/(p|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function wordCount(html) {
  const words = htmlToText(html).match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return words ? words.length : 0;
}

module.exports = {
  FORMAT,
  newId,
  newNode,
  defaultProject,
  projectDirFor,
  createProject,
  loadProject,
  saveProject,
  readDoc,
  writeDoc,
  takeSnapshot,
  addSnapshot,
  listSnapshots,
  writeMedia,
  readMedia,
  mimeFor,
  walk,
  findNode,
  htmlToText,
  wordCount,
};
