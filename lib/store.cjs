'use strict';
const { safeName } = require('./fsNames.cjs');
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
  return path.join(parent, `${safeName(title, 'Proiect')}.scribner`);
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

function parseProject(raw) {
  const project = JSON.parse(raw);
  if (project.format > FORMAT) {
    throw new Error('Proiectul a fost creat cu o versiune mai nouă de Scribner.');
  }
  return project;
}

// { readOnly: true } never touches the disk (no missing sub-folders created).
function loadProject(dir, { readOnly = false } = {}) {
  const project = parseProject(fs.readFileSync(path.join(dir, 'project.json'), 'utf8'));
  if (!readOnly) ensureDirs(dir);
  return project;
}

const serializeProject = (project) => JSON.stringify(project, null, 2);

// Cross-process lock around read-modify-write of project.json (the app window and
// the MCP server both write it). project.json.lock is created exclusively; a lock
// older than staleMs is considered abandoned (crashed writer) and taken over.
// The lock file holds a token (pid + random). A stale lock (crashed writer) is taken over by
// renaming it to a private name first: only one process can win that rename. If what was renamed
// turns out to be someone else's fresh lock (it was replaced between our check and the rename), it
// is put back with link() (fails instead of overwriting) and we keep waiting. On release only our
// own lock is deleted, never one another process took over meanwhile.
function withProjectLock(dir, fn, { timeoutMs = 5000, staleMs = 10000 } = {}) {
  const lock = path.join(dir, 'project.json.lock');
  const token = `${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  const readLock = (f) => {
    try {
      return fs.readFileSync(f, 'utf8');
    } catch {
      return null;
    }
  };
  const start = Date.now();
  for (;;) {
    try {
      fs.writeFileSync(lock, token, { flag: 'wx' });
      break;
    } catch (err) {
      // Windows answers EPERM/EACCES/EBUSY (not EEXIST) while another process is deleting or
      // reading the lock file: that is "busy, try again", not a failure.
      if (RENAME_RETRY.has(err.code)) {
        if (Date.now() - start > timeoutMs) throw new Error('Proiectul este ocupat de alt proces (project.json.lock). Încearcă din nou.');
        sleepSync(10);
        continue;
      }
      if (err.code !== 'EEXIST') throw err;
      let stale = false;
      let seen = null;
      try {
        seen = readLock(lock);
        // A lock dated in the future comes from another computer whose clock is ahead (the sync
        // client keeps the original time): it can never be a live local lock, and waiting for it
        // to age would block every save for as long as the clocks differ.
        const age = Date.now() - fs.statSync(lock).mtimeMs;
        stale = age > staleMs || age < -staleMs;
      } catch {
        continue; // released meanwhile
      }
      if (stale) {
        const mine = `${lock}.stale-${token}`;
        try {
          fs.renameSync(lock, mine);
        } catch {
          continue; // another process took it over first
        }
        const got = readLock(mine);
        if (got !== null && got !== seen) {
          // A fresh lock replaced the stale one before our rename: give it back untouched.
          try {
            fs.linkSync(mine, lock);
          } catch {
            /* its owner already released it, or a new lock exists */
          }
        }
        try {
          fs.unlinkSync(mine);
        } catch {
          /* gone */
        }
        continue;
      }
      if (Date.now() - start > timeoutMs) throw new Error('Proiectul este ocupat de alt proces (project.json.lock). Încearcă din nou.');
      sleepSync(20);
    }
  }
  try {
    return fn();
  } finally {
    if (readLock(lock) === token) {
      try {
        fs.unlinkSync(lock);
      } catch {
        /* already gone */
      }
    }
  }
}

// Read-modify-write of project.json under the lock: fn(project) mutates or returns
// the new project; returning false aborts without writing. Returns the saved project.
function updateProject(dir, fn, { before } = {}) {
  return withProjectLock(dir, () => {
    const raw = fs.readFileSync(path.join(dir, 'project.json'), 'utf8');
    const project = parseProject(raw);
    const res = fn(project);
    if (res === false) return project;
    const next = res && typeof res === 'object' ? res : project;
    if (before) before(raw);
    saveProject(dir, next);
    return next;
  });
}

// Raw copy of a file about to be overwritten (project.json, notes), kept in
// snapshots/_backup/ (never confused with document snapshots: "_" is not a valid id).
function backupFile(dir, label, content, keep = 100) {
  const bdir = path.join(dir, 'snapshots', '_backup');
  fs.mkdirSync(bdir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let file = path.join(bdir, `${stamp}-${label}`);
  for (let n = 2; fs.existsSync(file); n++) file = path.join(bdir, `${stamp}-${n}-${label}`);
  fs.writeFileSync(file, content);
  const all = fs.readdirSync(bdir).sort();
  for (const f of all.slice(0, Math.max(0, all.length - keep))) fs.unlinkSync(path.join(bdir, f));
  return path.basename(file);
}

// On Windows a rename over a file that another process has open (antivirus, search indexer,
// OneDrive/Dropbox, an editor) fails for a moment with EPERM / EACCES / EBUSY. Retry briefly.
const RENAME_RETRY = new Set(['EPERM', 'EACCES', 'EBUSY']);
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
function renameWithRetry(from, to, { tries = 12, rename = fs.renameSync } = {}) {
  for (let i = 1; ; i++) {
    try {
      return rename(from, to);
    } catch (e) {
      if (!RENAME_RETRY.has(e.code) || i >= tries) throw e;
      sleepSync(Math.min(25 * i, 150));
    }
  }
}

function writeAtomic(file, data, opts) {
  // Unique temp name: two processes saving the same file never share a temp file.
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  try {
    // A failed write (ENOSPC, EIO) may leave a partial temp file: removed below.
    // fsync before rename: after a power cut the rename must not survive without the data.
    fs.writeFileSync(tmp, data);
    const fd = fs.openSync(tmp, 'r+');
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    renameWithRetry(tmp, file, opts);
    try {
      const dfd = fs.openSync(path.dirname(file), 'r');
      try { fs.fsyncSync(dfd); } finally { fs.closeSync(dfd); }
    } catch { /* Windows: directories cannot be synced */ }
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* already gone */ }
    throw e;
  }
}

function saveProject(dir, project) {
  ensureDirs(dir);
  writeAtomic(path.join(dir, 'project.json'), serializeProject(project));
}

/** Throws a clear message when `dir` holds no project (moved, deleted, disconnected drive). */
function checkProjectDir(dir, lang = 'ro') {
  if (fs.existsSync(path.join(dir, 'project.json'))) return;
  throw new Error(lang === 'en'
    ? `The project no longer exists at ${dir} (moved, deleted or on a disconnected drive).`
    : `Proiectul nu mai există la ${dir} (mutat, șters sau pe un disc deconectat).`);
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
  // Same millisecond (fast double click, clock set back): never overwrite an existing snapshot.
  let file = path.join(snapDir, `${date.replace(/[:.]/g, '-')}.json`);
  for (let n = 2; fs.existsSync(file); n++) file = path.join(snapDir, `${date.replace(/[:.]/g, '-')}-${n}.json`);
  fs.writeFileSync(file, JSON.stringify({ name: name || 'Snapshot', date, html }), { flag: 'wx' });
  return { file: path.basename(file), name: name || 'Snapshot', date };
}

// Adds a snapshot with a given name/date (used by import).
function addSnapshot(dir, id, { name, date, html }) {
  checkId(id);
  const snapDir = path.join(dir, 'snapshots', id);
  fs.mkdirSync(snapDir, { recursive: true });
  // An imported snapshot with an unreadable date keeps its text, dated now, instead of aborting the import.
  const when = new Date(date || Date.now());
  const iso = (Number.isNaN(when.getTime()) ? new Date() : when).toISOString();
  let file = path.join(snapDir, `${iso.replace(/[:.]/g, '-')}.json`);
  for (let n = 2; fs.existsSync(file); n++) file = path.join(snapDir, `${iso.replace(/[:.]/g, '-')}-${n}.json`);
  fs.writeFileSync(file, JSON.stringify({ name: name || 'Snapshot', date: iso, html }));
}

// I-EDIT journal of the author's own changes: <project>/editorial/MODIFICARI_AUTOR.jsonl, one JSON
// row per changed chunk {doc, title, line, old, new, time, hashOld, hashNew}. Append-only.
const AUTHOR_JOURNAL = path.join('editorial', 'MODIFICARI_AUTOR.jsonl');
const JOURNAL_TEXT_MAX = 20000;

function cleanJournalRow(r) {
  if (!r || typeof r !== 'object') throw new Error('Rând de jurnal invalid.');
  const doc = String(r.doc || '');
  checkId(doc);
  const str = (v) => String(v ?? '').slice(0, JOURNAL_TEXT_MAX);
  const line = Number(r.line);
  return {
    doc,
    title: str(r.title).slice(0, 500),
    line: Number.isFinite(line) && line > 0 ? Math.floor(line) : 0,
    old: str(r.old),
    new: str(r.new),
    time: str(r.time || new Date().toISOString()).slice(0, 40),
    hashOld: str(r.hashOld).slice(0, 40),
    hashNew: str(r.hashNew).slice(0, 40),
  };
}

function appendAuthorJournal(dir, rows) {
  const list = (Array.isArray(rows) ? rows : [rows]).map(cleanJournalRow).filter((r) => r.old !== r.new);
  if (!list.length) return 0;
  const file = path.join(dir, AUTHOR_JOURNAL);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, list.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  return list.length;
}

// Rows of the journal (newest last); a damaged line is skipped, never fatal.
function readAuthorJournal(dir, { doc, limit = 500 } = {}) {
  const file = path.join(dir, AUTHOR_JOURNAL);
  if (!fs.existsSync(file)) return [];
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (!doc || r.doc === doc) out.push(r);
    } catch {
      // skip a partial line (crash while appending)
    }
  }
  return limit > 0 ? out.slice(-limit) : out;
}

const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  bmp: 'image/bmp', avif: 'image/avif', tif: 'image/tiff', tiff: 'image/tiff', heic: 'image/heic', pdf: 'application/pdf',
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
  // Only known media types keep their extension: "Open in External Editor" must never run a .bat/.exe.
  const clean = String(ext).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  const safeExt = MIME[clean] ? clean : 'bin';
  const file = `${id}.${safeExt}`;
  fs.mkdirSync(path.join(dir, 'media'), { recursive: true });
  writeAtomic(path.join(dir, 'media', file), data);
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
      // One damaged file (a crash while it was written, a sync conflict) must not hide every
      // other snapshot of the document, nor break the bundle export that lists them.
      try {
        const { name, date, html } = JSON.parse(fs.readFileSync(path.join(snapDir, f), 'utf8'));
        return { file: f, name, date, html };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
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
  checkProjectDir,
  FORMAT,
  newId,
  newNode,
  defaultProject,
  projectDirFor,
  renameWithRetry,
  createProject,
  loadProject,
  parseProject,
  serializeProject,
  saveProject,
  withProjectLock,
  updateProject,
  backupFile,
  writeAtomic,
  readDoc,
  writeDoc,
  takeSnapshot,
  addSnapshot,
  listSnapshots,
  appendAuthorJournal,
  readAuthorJournal,
  AUTHOR_JOURNAL,
  writeMedia,
  readMedia,
  mimeFor,
  walk,
  findNode,
  htmlToText,
  wordCount,
};
