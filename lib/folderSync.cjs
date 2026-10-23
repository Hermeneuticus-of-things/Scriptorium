'use strict';
// Scrivener-style "Sync with external folder" (File > Sync > With External Folder).
//
// syncOut writes   <folder>/Draft/NNN Title.<ext>   (text items of the Manuscript)
//                  <folder>/Notes/NNN Title.<ext>   (other text items: Research etc., not Trash)
//                  <folder>/.scribner-sync.json     manifest { format, files: { id: {file, hash, docHash, mtime} } }
// syncIn compares the folder with the manifest:
//   - file hash changed, project doc unchanged  -> updates [{id, html}]
//   - both changed                              -> conflicts [{id, title, ours, theirs}] (caller snapshots, then writes)
//   - file in Draft/ or Notes/ not in manifest  -> newDocs [{title, html, folder:'draft'|'notes', file}]
//   - manifest file missing on disk             -> missing [id]
// Pure w.r.t. the project: everything goes through readDoc(id) / writeDoc(id, html) callbacks.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { htmlToRtf, htmlToMarkdown, htmlToPlain, safeName } = require('./exporters.cjs');
const { rtfToHtml, textToHtml } = require('./rtf.cjs');
const { markdownToHtml } = require('./importers.cjs');

const MANIFEST = '.scribner-sync.json';
const FORMATS = ['rtf', 'txt', 'md'];
const SUBDIRS = { draft: 'Draft', notes: 'Notes' };

const hash = (s) => crypto.createHash('sha1').update(String(s ?? '')).digest('hex');

function serialize(format, html, title) {
  if (format === 'rtf') return htmlToRtf(html, title);
  if (format === 'md') return htmlToMarkdown(html);
  return htmlToPlain(html);
}

function parseFile(file, content) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.rtf') return rtfToHtml(content);
  if (ext === '.md' || ext === '.markdown') return markdownToHtml(content);
  return textToHtml(content.replace(/\r\n/g, '\n').replace(/\n\n/g, '\n'));
}

function titleFromFile(file) {
  return path.basename(file).replace(/\.[^.]+$/, '').replace(/^\d+\s+/, '').trim() || 'Fără titlu';
}

function readManifest(folder) {
  try {
    return JSON.parse(fs.readFileSync(path.join(folder, MANIFEST), 'utf8'));
  } catch {
    return null;
  }
}

function collect(project) {
  const draft = [];
  const notes = [];
  const walk = (nodes, bucket) => {
    for (const n of nodes || []) {
      if (n.type === 'text') bucket.push(n);
      walk(n.children, bucket);
    }
  };
  for (const root of project.tree || []) {
    if (root.root === 'trash') continue;
    walk(root.children, root.root === 'draft' ? draft : notes);
  }
  return { draft, notes };
}

/**
 * Write the project's text documents to an external folder.
 * @returns manifest object (also written to <folder>/.scribner-sync.json)
 */
function syncOut(project, folder, readDoc, { format = 'rtf', includeNotes = true } = {}) {
  if (!FORMATS.includes(format)) throw new Error(`Format necunoscut: ${format}`);
  const { draft, notes } = collect(project);
  const old = readManifest(folder);
  const manifest = { format, project: project.title || '', date: new Date().toISOString(), files: {} };
  const sets = { draft, notes: includeNotes ? notes : [] };
  for (const [key, nodes] of Object.entries(sets)) {
    const sub = path.join(folder, SUBDIRS[key]);
    fs.mkdirSync(sub, { recursive: true });
    const width = Math.max(3, String(nodes.length).length);
    nodes.forEach((n, i) => {
      const html = readDoc(n.id) || '';
      const rel = `${SUBDIRS[key]}/${String(i + 1).padStart(width, '0')} ${safeName(n.title)}.${format}`;
      const data = serialize(format, html, n.title);
      fs.writeFileSync(path.join(folder, rel), data);
      manifest.files[n.id] = { file: rel, hash: hash(data), docHash: hash(html), mtime: fs.statSync(path.join(folder, rel)).mtimeMs };
    });
  }
  // Remove files we wrote earlier that are no longer part of the sync (renamed/reordered/deleted).
  if (old && old.files) {
    const keep = new Set(Object.values(manifest.files).map((f) => f.file));
    for (const f of Object.values(old.files)) {
      const abs = path.join(folder, f.file);
      if (!keep.has(f.file) && fs.existsSync(abs)) {
        let same = false;
        try {
          same = hash(fs.readFileSync(abs, 'utf8')) === f.hash;
        } catch {
          /* ignore */
        }
        if (same) fs.unlinkSync(abs); // only delete files nobody edited externally
      }
    }
  }
  fs.writeFileSync(path.join(folder, MANIFEST), JSON.stringify(manifest, null, 1));
  return manifest;
}

/**
 * Detect external edits. If `writeDoc` is given, non-conflicting updates are applied immediately
 * and the manifest is refreshed for them; conflicts are never applied (caller snapshots first,
 * then calls resolveConflict).
 */
function syncIn(project, folder, readDoc, writeDoc = null) {
  const manifest = readManifest(folder);
  if (!manifest) throw new Error('Folderul nu a fost sincronizat încă (lipsește .scribner-sync.json).');
  const titles = {};
  const walk = (nodes) => (nodes || []).forEach((n) => ((titles[n.id] = n.title), walk(n.children)));
  walk(project.tree);

  const updates = [];
  const conflicts = [];
  const missing = [];
  const known = new Set();
  for (const [id, entry] of Object.entries(manifest.files || {})) {
    known.add(entry.file);
    const abs = path.join(folder, entry.file);
    if (!fs.existsSync(abs)) {
      missing.push(id);
      continue;
    }
    const data = fs.readFileSync(abs, 'utf8');
    if (hash(data) === entry.hash) continue;
    const theirs = parseFile(abs, data);
    const ours = (titles[id] !== undefined && readDoc(id)) || '';
    if (titles[id] !== undefined && hash(ours) !== entry.docHash) {
      conflicts.push({ id, title: titles[id], ours, theirs, file: entry.file });
    } else {
      updates.push({ id, title: titles[id] ?? titleFromFile(abs), html: theirs, file: entry.file });
      if (writeDoc && titles[id] !== undefined) {
        writeDoc(id, theirs);
        entry.hash = hash(data);
        entry.docHash = hash(theirs);
        entry.mtime = fs.statSync(abs).mtimeMs;
      }
    }
  }

  const newDocs = [];
  for (const [key, sub] of Object.entries(SUBDIRS)) {
    const dir = path.join(folder, sub);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).sort()) {
      const rel = `${sub}/${f}`;
      if (f.startsWith('.') || known.has(rel) || !/\.(rtf|txt|md|markdown)$/i.test(f)) continue;
      const abs = path.join(dir, f);
      newDocs.push({ title: titleFromFile(f), html: parseFile(abs, fs.readFileSync(abs, 'utf8')), folder: key, file: rel });
    }
  }
  if (writeDoc) fs.writeFileSync(path.join(folder, MANIFEST), JSON.stringify(manifest, null, 1));
  return { updates, conflicts, newDocs, missing };
}

/** After the caller decided (and snapshotted), record the chosen html for `id` as in-sync. */
function markSynced(folder, id, html, { file } = {}) {
  const manifest = readManifest(folder);
  if (!manifest) return;
  const entry = manifest.files[id] || (file ? (manifest.files[id] = { file }) : null);
  if (!entry) return;
  const abs = path.join(folder, entry.file);
  if (fs.existsSync(abs)) {
    entry.hash = hash(fs.readFileSync(abs, 'utf8'));
    entry.mtime = fs.statSync(abs).mtimeMs;
  }
  entry.docHash = hash(html);
  fs.writeFileSync(path.join(folder, MANIFEST), JSON.stringify(manifest, null, 1));
}

module.exports = { syncOut, syncIn, markSynced, readManifest, MANIFEST, FORMATS, hash };
