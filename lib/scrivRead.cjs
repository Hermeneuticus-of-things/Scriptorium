'use strict';
// Read-only look into a `.scriv` project folder, without importing it: the binder outline and the
// text of one item (plain text). For agents (MCP) that are asked about such a project directly.
const fs = require('fs');
const path = require('path');
const { parseScrivx } = require('./scrivImport.cjs');
const { rtfToHtml } = require('./rtf.cjs');
const store = require('./store.cjs');

const asArray = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const textOf = (x) => (x == null ? '' : typeof x === 'object' ? String(x['#text'] ?? '') : String(x));

function scrivxOf(dir) {
  const name = fs.readdirSync(dir).find((f) => /\.scrivx$/i.test(f));
  if (!name) throw new Error(`Nu e un proiect .scriv (lipsește fișierul .scrivx): ${dir}`);
  return parseScrivx(fs.readFileSync(path.join(dir, name), 'utf8'));
}

/** [{ id, title, type, depth }] in binder order. */
function scrivOutline(dir) {
  const doc = scrivxOf(dir);
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
function scrivRead(dir, id, kind = 'content') {
  const key = String(id || '').toUpperCase();
  if (!/^[0-9A-Z_-]{1,64}$/.test(key)) throw new Error(`Id invalid: ${id}`);
  const v3 = path.join(dir, 'Files', 'Data', key, kind === 'notes' ? 'notes.rtf' : 'content.rtf');
  const v2 = path.join(dir, 'Files', 'Docs', kind === 'notes' ? `${key}_notes.rtf` : `${key}.rtf`);
  const file = [v3, v2].find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!file) return '';
  return store.htmlToText(rtfToHtml(fs.readFileSync(file, 'latin1')));
}

module.exports = { scrivOutline, scrivRead };
