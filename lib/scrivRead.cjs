'use strict';
// Read-only look into a `.scriv` project folder, without importing it: the binder outline and the
// text of one item (plain text). For agents (MCP) that are asked about such a project directly.
const fs = require('fs');
const path = require('path');
const { parseScrivx, scrivProject } = require('./scrivImport.cjs');
const { rtfToHtml } = require('./rtf.cjs');
const store = require('./store.cjs');

const asArray = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const textOf = (x) => (x == null ? '' : typeof x === 'object' ? String(x['#text'] ?? '') : String(x));

function scrivxOf(p) {
  let pr;
  try {
    pr = scrivProject(p);
  } catch {
    throw new Error(`Nu e un proiect .scriv (lipsește fișierul .scrivx): ${p}`);
  }
  return parseScrivx(fs.readFileSync(pr.scrivx, 'utf8'));
}
// The .scriv folder for a folder or a .scrivx path.
const dirOf = (p) => scrivProject(p).dir;

/** [{ id, title, type, depth }] in binder order. */
function scrivOutline(p) {
  const doc = scrivxOf(p);
  const out = [];
  const walk = (items, depth) => {
    for (const it of asArray(items)) {
      const id = String(it.UUID || it.ID || '');
      out.push({ id, title: textOf(it.Title) || '(fără titlu)', type: it.Type, depth });
      walk(it.Children && it.Children.BinderItem, depth + 1);
    }
  };
  walk(doc.Binder && doc.Binder.BinderItem, 0);
  return out;
}

/** Plain text of one binder item (its main text, or its notes with kind 'notes'). */
function scrivRead(p, id, kind = 'content') {
  const dir = dirOf(p);
  const key = String(id || '').toUpperCase();
  if (!/^[0-9A-Z_-]{1,64}$/.test(key)) throw new Error(`Id invalid: ${id}`);
  const v3 = path.join(dir, 'Files', 'Data', key, kind === 'notes' ? 'notes.rtf' : 'content.rtf');
  const v2 = path.join(dir, 'Files', 'Docs', kind === 'notes' ? `${key}_notes.rtf` : `${key}.rtf`);
  const file = [v3, v2].find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!file) return '';
  return store.htmlToText(rtfToHtml(fs.readFileSync(file, 'latin1')));
}

/** Items whose text (or title) contains the words, with a short excerpt around the first hit. */
function scrivSearch(p, query, { limit = 50 } = {}) {
  const q = String(query || '').trim().toLocaleLowerCase('ro');
  if (!q) return [];
  const out = [];
  for (const item of scrivOutline(p)) {
    if (out.length >= limit) break;
    const text = scrivRead(p, item.id);
    const hay = text.toLocaleLowerCase('ro');
    const at = hay.indexOf(q);
    if (at < 0 && !item.title.toLocaleLowerCase('ro').includes(q)) continue;
    const from = Math.max(0, at - 60);
    out.push({ ...item, excerpt: at < 0 ? '' : `${from ? '…' : ''}${text.slice(from, at + q.length + 60)}${at + q.length + 60 < text.length ? '…' : ''}` });
  }
  return out;
}

module.exports = { scrivOutline, scrivRead, scrivSearch };
