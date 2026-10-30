// Filter bar for the Corkboard & Outliner views (Scrivener 3 §11.4, p. 229–233):
// narrows the current container's items to a flat list of matches in binder order.
// Pure: no React, no DOM (html goes through ./search.js). Matching is case- and
// diacritics-insensitive — the same NFD fold as typeAhead in ./tree.js.

import { buildRegex, htmlToPlain } from './search.js';
import { compileExcluded } from './projectSearch.js';

const fold = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Flat candidates in binder order; a top-level `.root` node (Manuscris / Cercetare /
// Coș) is a scope, not an item, and is never listed — same rule as projectSearch.
function candidates(nodes, rootKind, out) {
  for (const n of nodes || []) {
    const root = n.root || rootKind;
    if (!n.root) out.push({ n, root });
    if (n.children) candidates(n.children, root, out);
  }
  return out;
}

// Everything an item can be found by: title and synopsis by default (the visible
// fields of corkboard cards and outline rows); document text and notes only with
// the "Include Text and Notes in Search" option.
function haystacks(n, o) {
  const out = [n.title || '', n.synopsis || ''];
  if (o.includeTextNotes) {
    if (o.docs && o.docs[n.id]) out.push(htmlToPlain(o.docs[n.id]));
    if (o.notesById && o.notesById[n.id]) out.push(htmlToPlain(o.notesById[n.id]));
  }
  return out;
}

// A global regex advances lastIndex on .test; a stateless copy keeps calls
// independent. The text is also tested folded, so `caut` still finds „căut”.
function tester(re) {
  const r = new RegExp(re.source, re.flags.replace('g', ''));
  return (s) => r.test(s) || r.test(fold(s));
}

/**
 * Filters a container's subtree to a flat list of matches (Scrivener 3 §11.4).
 * @param {Array} nodes candidate nodes — a container's children or a whole tree;
 *   compile exclusion is inherited within these nodes only, so exclusions on
 *   ancestors above them are not seen.
 * @param {Object} o criteria
 * @param {string} [o.query] matched against title and synopsis (plus document
 *   text and notes with includeTextNotes), case- and diacritics-insensitively
 * @param {boolean} [o.regex] interpret the query as a regular expression; an
 *   invalid pattern matches nothing
 * @param {boolean} [o.includeTextNotes] also search document text and notes
 * @param {Object} [o.docs] {id: html}
 * @param {Object} [o.notesById] {id: html}
 * @param {string} [o.draftScope] 'any' | 'draft' | 'nondraft'
 * @param {string} [o.compileScope] 'all' | 'included' | 'excluded'
 * @param {Object} [o.meta] {mode: 'any'|'include'|'exclude', field: 'label'|'status', value}
 * @param {string} [o.rootKind] root kind ('draft'|'research'|'trash') for nodes
 *   without their own `.root`; without it, nodes of unknown root fail a
 *   draft/nondraft scope
 * @returns {Array|null} the matching nodes in binder order, or null when nothing
 *   is active — empty/whitespace query with draftScope 'any', compileScope 'all'
 *   and no metadata criterion — in which case the caller must render the view
 *   unfiltered. An active filter with no matches returns [].
 */
export function filterContainer(nodes, o = {}) {
  const meta = o.meta || {};
  const metaActive =
    (meta.mode === 'include' || meta.mode === 'exclude') &&
    (meta.field === 'label' || meta.field === 'status') &&
    Boolean(meta.value);
  const query = typeof o.query === 'string' ? o.query : '';
  const draftActive = o.draftScope === 'draft' || o.draftScope === 'nondraft';
  const compileActive = o.compileScope === 'included' || o.compileScope === 'excluded';
  if (!query.trim() && !draftActive && !compileActive && !metaActive) return null;

  const re = o.regex ? buildRegex({ query, regex: true, caseSensitive: false, wholeWord: false }) : null;
  if (o.regex && !re) return []; // invalid user regex matches nothing
  const match = re ? tester(re) : null;
  const q = fold(query);
  const excluded = compileActive ? compileExcluded(nodes) : null;

  const out = [];
  for (const { n, root } of candidates(nodes, o.rootKind || null, [])) {
    if (o.draftScope === 'draft' && root !== 'draft') continue;
    if (o.draftScope === 'nondraft' && (!root || root === 'draft')) continue;
    if (compileActive) {
      const included = !excluded.has(n.id);
      if (o.compileScope === 'included' && !included) continue;
      if (o.compileScope === 'excluded' && included) continue;
    }
    if (metaActive) {
      const hit = (meta.field === 'label' ? n.label : n.status) === meta.value;
      if (meta.mode === 'include' ? !hit : hit) continue;
    }
    if (query.trim()) {
      const hay = haystacks(n, o);
      const hit = match ? hay.some(match) : hay.some((h) => fold(h).includes(q));
      if (!hit) continue;
    }
    out.push(n);
  }
  return out;
}
