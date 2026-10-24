'use strict';
// Main-process logic for external changes and window ownership, kept free of
// Electron so it can be tested in Node (tests/projectSync.test.js).
//
// createChangeTracker: decides which fs.watch events reach the window as
//   'project:changed'. Self-writes are recognised by content hash (not by a time
//   window, which also swallowed real external edits arriving within 2 s of an
//   app save), only project files are reported (temp / swap / sync-client files
//   are ignored; a rename-based save shows up as an event on the final name),
//   missing files are not reported (a sync client deleting and recreating a file
//   must not blank the open document), and bursts are debounced with a max wait.
//
// createClaimRegistry: one project per window, one window per project.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RELEVANT = /^(project\.json|(docs|notes)\/[A-Za-z0-9-]+\.html)$/;
const hash = (data) => crypto.createHash('sha1').update(data).digest('hex');

function relevant(rel) {
  return RELEVANT.test(String(rel || '').replace(/\\/g, '/'));
}

function createChangeTracker({
  dir,
  onFlush,
  readFile = (f) => fs.readFileSync(f),
  now = Date.now,
  debounceMs = 400,
  maxWaitMs = 2000,
  legacyWindowMs = 2000,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  const selfHashes = new Map(); // abs file -> hash of the content the app wrote
  const selfTimes = new Map(); // abs file -> time (writers that don't pass content)
  const pending = new Set();
  let firstAt = 0;
  let timer = null;

  function flush() {
    clearTimer(timer);
    timer = null;
    if (!pending.size) return;
    const files = [...pending];
    pending.clear();
    firstAt = 0;
    onFlush(files);
  }

  function noteWrite(file, content) {
    const abs = path.resolve(file);
    if (content === undefined) selfTimes.set(abs, now());
    else selfHashes.set(abs, hash(content));
  }

  // Returns true when the event was queued for the window.
  function handle(relRaw) {
    if (!relRaw) return false;
    const rel = String(relRaw).replace(/\\/g, '/');
    if (!RELEVANT.test(rel)) return false;
    const abs = path.resolve(dir, rel);
    let data;
    try {
      data = readFile(abs);
    } catch {
      return false; // deleted or mid-rename: the recreate event will follow
    }
    if (selfHashes.get(abs) === hash(data)) return false;
    const t = selfTimes.get(abs);
    if (t && now() - t < legacyWindowMs) return false;
    pending.add(rel);
    if (!firstAt) firstAt = now();
    clearTimer(timer);
    if (now() - firstAt >= maxWaitMs) flush();
    else timer = setTimer(flush, debounceMs);
    return true;
  }

  return { handle, noteWrite, flush, pending };
}

function createClaimRegistry({ isAlive = () => true } = {}) {
  const owners = new Map(); // owner id (webContents id) -> resolved dir
  const key = (dir) => path.resolve(dir);
  function ownerOf(dir) {
    const k = key(dir);
    for (const [id, d] of owners) {
      if (d !== k) continue;
      if (isAlive(id)) return id;
      owners.delete(id);
    }
    return null;
  }
  return {
    ownerOf,
    // { ok: true } or { ok: false, owner } when another live window holds it.
    claim(id, dir) {
      const other = ownerOf(dir);
      if (other !== null && other !== id) return { ok: false, owner: other };
      owners.set(id, key(dir));
      return { ok: true };
    },
    release(id) {
      const had = owners.get(id) || null;
      owners.delete(id);
      return had;
    },
    dirOf: (id) => owners.get(id) || null,
  };
}

// project:save with a three-way merge: `base` is the raw project.json the window
// started from. If the disk changed since (MCP agent, sync client), the window's
// changes are merged onto the disk version instead of overwriting it. Runs under
// the project.json lock shared with the MCP server.
function saveMerged(dir, mine, base, { noteWrite } = {}) {
  const store = require('./store.cjs');
  const { mergeProject } = require('../src/lib/projectMerge.js');
  return store.withProjectLock(dir, () => {
    const file = path.join(dir, 'project.json');
    let disk = null;
    try {
      disk = fs.readFileSync(file, 'utf8');
    } catch {
      /* first save */
    }
    let project = mine;
    let merged = false;
    if (base && disk && disk !== base) {
      try {
        project = mergeProject(JSON.parse(base), mine, JSON.parse(disk));
        merged = true;
      } catch (e) {
        // Unreadable disk version: the window's copy wins, but the other one is kept as a backup.
        try { store.backupFile(dir, 'project.json', disk); } catch { /* best effort */ }
        console.error('[scribner] merge failed, disk copy backed up:', e && e.message);
        project = mine;
      }
    }
    const raw = store.serializeProject(project);
    if (noteWrite) noteWrite(file, raw);
    fs.mkdirSync(dir, { recursive: true });
    store.writeAtomic(file, raw);
    return { raw, project, merged };
  });
}

// project:reload: the window adopts what is on disk now, so that version becomes its merge base.
// Keeping the base of the first open made a later save treat the window's undo of an outside change
// (a title put back) as "unchanged here" and silently re-apply the outside change.
function reloadWithBase(dir, bases) {
  const store = require('./store.cjs');
  const raw = fs.readFileSync(path.join(dir, 'project.json'), 'utf8');
  const project = store.parseProject(raw);
  bases.set(path.resolve(dir), raw);
  return { dir, project };
}

// Conflict copies left by sync clients (project-PC.json, "<id> (conflicted copy …).html"…):
// relative paths, for a notice to the writer (src/lib/syncGuard.js findConflictCopies).
function syncConflicts(dir) {
  const store = require('./store.cjs');
  const { findConflictCopies, treeIds } = require('../src/lib/syncGuard.js');
  const names = (sub) => {
    try {
      return fs.readdirSync(sub ? path.join(dir, sub) : dir);
    } catch {
      return [];
    }
  };
  let ids = new Set();
  try {
    ids = treeIds(store.loadProject(dir, { readOnly: true }).tree);
  } catch {
    /* unreadable project.json: only project copies are listed */
  }
  return findConflictCopies({ root: names(''), docs: names('docs'), notes: names('notes'), ids });
}

module.exports = { createChangeTracker, createClaimRegistry, relevant, saveMerged, reloadWithBase, syncConflicts };
