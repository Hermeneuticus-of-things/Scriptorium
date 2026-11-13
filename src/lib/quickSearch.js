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

// Length-preserving fold (one code point in → one code point out): match positions in the
// folded string are valid positions in the original. foldText() cannot be used for text
// search — NFD decomposition + mark stripping changes string length, so offsets drift
// (context slices landed off-target on diacritic-heavy text).
const FOLD_MAP = new Map();
function fold1to1(s) {
  let out = '';
  for (const ch of String(s || '')) {
    let f = FOLD_MAP.get(ch);
    if (f === undefined) {
      const d = ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
      f = [...d].length === 1 ? d : ch; // one code point out, or the character unchanged
      FOLD_MAP.set(ch, f);
    }
    out += f;
  }
  return out;
}

// Criteria handed to the full project search when the user clicks through
// ("Full Project Search"): the typed phrase becomes an exact-phrase query.
export function handoffCriteria(query) {
  const q = String(query || '').trim();
  return q ? { query: q, operator: 'exact' } : {};
}

// Plain-text cache keyed by document id, invalidated by content: on a big book the
// search runs on every keystroke, and re-parsing the whole book's HTML per keystroke
// (2358 DOM parses on Karma) stalls the renderer. Only changed documents are re-parsed.
// The folded (case/diacritics-insensitive) form is cached too — folding a whole book
// per keystroke costs as much as parsing it.
const plainCache = new Map(); // id -> { src, plain, folded }
const PLAIN_CACHE_MAX = 20000;
function plainOf(id, html, toText) {
  const cached = plainCache.get(id);
  if (cached && cached.src === html) return cached;
  const plain = toText(html || '');
  const folded = fold1to1(plain);
  if (plainCache.size >= PLAIN_CACHE_MAX) plainCache.clear();
  const entry = { src: html, plain, folded };
  plainCache.set(id, entry);
  return entry;
}

// Per-tree index: flattened nodes + folded title/synopsis per node, invalidated by the
// tree reference (any binder edit makes a new tree) and by title/synopsis content. Without
// it every keystroke re-flattens the whole book and re-folds 2393 titles + synopses.
const metaCache = new WeakMap(); // tree -> { flat, trashIds, meta: Map(id -> {t, s, tf, sf}) }
function treeIndex(tree) {
  let idx = metaCache.get(tree);
  if (!idx) {
    const trash = (tree || []).find((n) => n.root === 'trash');
    idx = {
      flat: flatten(tree || []),
      trashIds: new Set(flatten(trash?.children || []).map((n) => n.id)),
      meta: new Map(),
    };
    metaCache.set(tree, idx);
  }
  return idx;
}
function metaOf(idx, node, fold) {
  let m = idx.meta.get(node.id);
  if (!m || m.t !== node.title || m.s !== node.synopsis) {
    m = { t: node.title, s: node.synopsis, tf: fold(node.title), sf: fold(node.synopsis) };
    idx.meta.set(node.id, m);
  }
  return m;
}

export function quickSearchProject(project, docs, criteria = {}) {
  const q = foldText(criteria.query);
  const limit = criteria.limit ?? 8;
  const empty = { titles: [], synopses: [], texts: [] };
  if (!q || !project) return empty;
  const toText = criteria.htmlToText || htmlToText;
  const fold = criteria.foldText || foldText;
  const idx = treeIndex(project.tree);
  const { flat, trashIds } = idx;

  const titles = [];
  const synopses = [];
  const texts = [];
  for (const node of flat) {
    if (node.root || trashIds.has(node.id)) continue;
    const m = metaOf(idx, node, fold);
    if (m.tf.includes(q)) titles.push({ node, beginsWith: m.tf.startsWith(q) });
    if (m.sf.includes(q)) synopses.push({ node });
    const cached = plainOf(node.id, docs?.[node.id], toText);
    if (cached && cached.plain) {
      const at = cached.folded.indexOf(q);
      if (at !== -1) {
        const start = Math.max(0, at - 30);
        const end = at + q.length + 40;
        texts.push({
          node,
          before: (start > 0 ? '…' : '') + cached.plain.slice(start, at),
          match: cached.plain.slice(at, at + q.length),
          after: cached.plain.slice(at + q.length, end) + (end < cached.plain.length ? '…' : ''),
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

// Opening mode for a result (manual §11.5, p. 235): Shift-click / Shift-Enter
// opens the document in a Quick Reference panel, Alt-click / Alt-Enter opens it
// in the other editor split; no modifier opens it normally. Shift wins when
// both are held. Pure: reads only the event's modifier flags.
export function quickOpenMode(e) {
  if (e?.shiftKey) return 'quickRef';
  if (e?.altKey) return 'split';
  return 'normal';
}

// Phrase revealed in the editor after a normal open: only text hits carry one,
// and it is the exact matched text (not the folded query) so the editor's
// case-sensitive find selects what the snippet shows.
export function quickRevealPhrase(row, mode) {
  return mode === 'normal' && row?.section === 'texts' ? row.match || null : null;
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
