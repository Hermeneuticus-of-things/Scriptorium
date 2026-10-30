// Quick Search (Scrivener 3 §11.5): a jump-list search that finds documents by
// typed phrase. Exact-phrase matching, case- and diacritics-insensitive, with
// results grouped in three sections: titles (exact or begins-with first),
// synopses, then text with context around the first hit. Trash is excluded.
// Pure: no React, no IPC. Plain strings everywhere; document HTML goes through
// htmlToText so markup is never matched.

import { flatten } from './tree.js';
import { htmlToText } from './text.js';

// Case-, diacritics- and apostrophe-insensitive fold, same rules as binder typeAhead.
export function foldText(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc]/g, "'");
}

// Criteria handed to the full project search when the user clicks through
// ("Full Project Search"): the typed phrase becomes an exact-phrase query.
export function handoffCriteria(query) {
  const q = String(query || '').trim();
  return q ? { query: q, operator: 'exact' } : {};
}

export function quickSearchProject(project, docs, criteria = {}) {
  const q = foldText(criteria.query);
  const limit = criteria.limit ?? 8;
  const empty = { titles: [], synopses: [], texts: [] };
  if (!q || !project) return empty;
  const trash = (project.tree || []).find((n) => n.root === 'trash');
  const trashIds = new Set(flatten(trash?.children || []).map((n) => n.id));

  const titles = [];
  const synopses = [];
  const texts = [];
  for (const node of flatten(project.tree || [])) {
    if (node.root || trashIds.has(node.id)) continue;
    const ft = foldText(node.title);
    if (ft.includes(q)) titles.push({ node, beginsWith: ft.startsWith(q) });
    if (foldText(node.synopsis).includes(q)) synopses.push({ node });
    const plain = htmlToText(docs?.[node.id] || '');
    if (plain) {
      const at = foldText(plain).indexOf(q);
      if (at !== -1) {
        const start = Math.max(0, at - 30);
        const end = at + q.length + 40;
        texts.push({
          node,
          before: (start > 0 ? '…' : '') + plain.slice(start, at),
          match: plain.slice(at, at + q.length),
          after: plain.slice(at + q.length, end) + (end < plain.length ? '…' : ''),
        });
      }
    }
  }
  // Manual: titles are "prioritised by titles that match ... or that begin with
  // the typed in text" — begins-with wins, then shorter titles, then binder order.
  titles.sort((a, b) => Number(b.beginsWith) - Number(a.beginsWith) || a.node.title.length - b.node.title.length);
  return {
    titles: titles.slice(0, limit),
    synopses: synopses.slice(0, limit),
    texts: texts.slice(0, limit),
  };
}

// Flat result list for keyboard navigation, in display order (titles, synopses,
// texts). Rows get a unique key: the same document may appear in several sections.
export function quickSearchRows(results) {
  return [
    ...results.titles.map((r) => ({ ...r, section: 'titles', key: `titles:${r.node.id}` })),
    ...results.synopses.map((r) => ({ ...r, section: 'synopses', key: `synopses:${r.node.id}` })),
    ...results.texts.map((r) => ({ ...r, section: 'texts', key: `texts:${r.node.id}` })),
  ];
}

// Keyboard navigation over the flat row list: wraps at both ends; Enter uses the
// current selection, or the first row when nothing is selected yet.
export function quickNav(rows, selectedKey, key) {
  if (!rows.length) return { select: null, open: null };
  const at = Math.max(0, rows.findIndex((r) => r.key === selectedKey));
  if (key === 'ArrowDown') return { select: rows[(at + 1) % rows.length].key, open: null };
  if (key === 'ArrowUp') return { select: rows[(at + rows.length - 1) % rows.length].key, open: null };
  if (key === 'Enter') {
    const row = rows.find((r) => r.key === selectedKey) || rows[0];
    return { select: row.key, open: row.node.id };
  }
  return { select: selectedKey, open: null };
}
