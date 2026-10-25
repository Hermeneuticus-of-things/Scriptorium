// Advanced project search: multi-field matching (title, text, notes, synopsis,
// keywords, custom metadata) with any/all/exact operators and metadata filters.
// Pure: no React, no IPC. HTML fields go through ./search.js so markup is never
// matched; plain string fields are matched directly.

import { buildRegex, findInHtml, replaceInHtml, formattedRuns } from './search.js';

export const ALL_FIELDS = ['title', 'text', 'notes', 'synopsis', 'keywords', 'custom'];
const HTML_FIELDS = new Set(['text', 'notes']);
const MAX_SNIPPETS = 5;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Returns the list of regexes to test. operator 'all' -> one per word (each must
// match somewhere); 'any' -> one alternation; 'exact' or regex -> whole query.
export function buildTerms(criteria) {
  const { query, regex, caseSensitive, wholeWord } = criteria;
  const operator = criteria.operator || 'any';
  if (!query || !query.trim()) return [];
  const base = { caseSensitive, wholeWord };
  if (regex || operator === 'exact') {
    const re = buildRegex({ query: regex ? query : query.trim(), regex, ...base });
    return re ? [re] : null;
  }
  const words = [...new Set(query.trim().split(/\s+/))];
  if (operator === 'all') return words.map((w) => buildRegex({ query: w, regex: false, ...base }));
  return [buildRegex({ query: words.map(escapeRe).join('|'), regex: true, ...base })];
}

function findInPlain(text, re, context = 40) {
  const out = [];
  const s = String(text ?? '');
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(s))) {
    if (m[0] === '') {
      re.lastIndex = m.index + (s.codePointAt(m.index) > 0xffff ? 2 : 1); // a whole character (u flag)
      continue;
    }
    const start = Math.max(0, m.index - context);
    const end = m.index + m[0].length;
    out.push({
      before: (start > 0 ? '…' : '') + s.slice(start, m.index),
      match: m[0],
      after: s.slice(end, end + context) + (end + context < s.length ? '…' : ''),
    });
  }
  re.lastIndex = 0;
  return out;
}

function fieldValues(node, field, docs, notesById, criteria = {}) {
  // Find by formatting: the text field is only the formatted runs.
  if (field === 'text' && criteria.format) return formattedRuns(docs?.[node.id] || '', criteria.format);
  switch (field) {
    case 'title':
      return [node.title || ''];
    case 'synopsis':
      return [node.synopsis || ''];
    case 'text':
      return [docs?.[node.id] || ''];
    case 'notes':
      return [notesById?.[node.id] || ''];
    case 'keywords':
      return node.keywords || [];
    case 'custom':
      // One metadata field by name, or all of them.
      return (criteria.customField ? [node.custom?.[criteria.customField]] : Object.values(node.custom || {}))
        .filter((v) => v !== null && v !== undefined && v !== '')
        .map((v) => (Array.isArray(v) ? v.join(', ') : String(v)));
    default:
      return [];
  }
}

// Ids of nodes that are excluded from compile, directly or through an ancestor.
function compileExcluded(tree) {
  const out = new Set();
  const visit = (nodes, excluded) => {
    for (const n of nodes) {
      const ex = excluded || n.includeInCompile === false;
      if (ex) out.add(n.id);
      if (n.children) visit(n.children, ex);
    }
  };
  visit(tree, false);
  return out;
}

// Flat list of non-root nodes in binder order with their root kind.
function candidates(tree) {
  const out = [];
  const visit = (nodes, root) => {
    for (const n of nodes) {
      const r = n.root || root;
      if (!n.root) out.push({ node: n, root: r });
      if (n.children) visit(n.children, r);
    }
  };
  visit(tree, null);
  return out;
}

export function passesFilters(node, root, criteria, excludedFromCompile) {
  const scope = criteria.scope || 'all';
  if (root === 'trash' && !criteria.includeTrash) return false;
  if (scope !== 'all' && root !== scope && !(root === 'trash' && criteria.includeTrash)) return false;
  if (criteria.onlyCompile && (root !== 'draft' || excludedFromCompile.has(node.id))) return false;
  if (criteria.labels?.length && !criteria.labels.includes(node.label)) return false;
  if (criteria.statuses?.length && !criteria.statuses.includes(node.status)) return false;
  if (criteria.keywords?.length) {
    const own = new Set(node.keywords || []);
    if (!criteria.keywords.every((k) => own.has(k))) return false;
  }
  if (criteria.types?.length && !criteria.types.includes(nodeKind(node))) return false;
  if (!inDateRange(node.created, criteria.createdFrom, criteria.createdTo)) return false;
  if (!inDateRange(node.modified, criteria.modifiedFrom, criteria.modifiedTo)) return false;
  return true;
}

/** 'folder' | 'parent' (text with sub-documents) | 'text' | 'file' */
export function nodeKind(node) {
  if (node.type === 'folder') return 'folder';
  if (node.type === 'file') return 'file';
  return node.children && node.children.length ? 'parent' : 'text';
}

// Dates compared by day (YYYY-MM-DD); a bound on a node without the date excludes it.
function inDateRange(value, from, to) {
  if (!from && !to) return true;
  const day = value ? String(value).slice(0, 10) : '';
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

const hasFilter = (c) => Boolean(c.labels?.length || c.statuses?.length || c.keywords?.length || c.types?.length || c.createdFrom || c.createdTo || c.modifiedFrom || c.modifiedTo || c.format);

/**
 * Searches the whole project.
 * @returns {{node, fields: Object<string, number>, snippets: Array}[]} in binder order.
 * Empty query + at least one label/status/keyword filter -> every node passing the filters.
 */
export function searchProject(project, docs, notesById, criteria = {}) {
  const fields = criteria.fields?.length ? criteria.fields : ALL_FIELDS;
  const terms = buildTerms(criteria);
  if (terms === null || (terms && terms.some((t) => !t))) return []; // invalid regex
  const emptyQuery = terms.length === 0;
  if (emptyQuery && !hasFilter(criteria)) return [];
  const operator = criteria.regex ? 'exact' : criteria.operator || 'any';
  const excluded = compileExcluded(project.tree || []);
  const results = [];

  for (const { node, root } of candidates(project.tree || [])) {
    if (!passesFilters(node, root, criteria, excluded)) continue;
    const counts = Object.fromEntries(ALL_FIELDS.map((f) => [f, 0]));
    if (emptyQuery) {
      if (criteria.format) {
        const runs = formattedRuns(docs?.[node.id] || '', criteria.format);
        if (!runs.length) continue;
        counts.text = runs.length;
        results.push({ node, fields: counts, snippets: runs.slice(0, MAX_SNIPPETS).map((r) => ({ field: 'text', before: '', match: r, after: '' })) });
        continue;
      }
      results.push({ node, fields: counts, snippets: [] });
      continue;
    }
    const snippets = [];
    const perTerm = terms.map(() => 0);
    for (const field of fields) {
      for (const value of fieldValues(node, field, docs, notesById, criteria)) {
        terms.forEach((re, i) => {
          const hits = HTML_FIELDS.has(field) ? findInHtml(value, re) : findInPlain(value, re);
          re.lastIndex = 0;
          if (!hits.length) return;
          counts[field] += hits.length;
          perTerm[i] += hits.length;
          for (const h of hits) if (snippets.length < MAX_SNIPPETS) snippets.push({ field, ...h });
        });
      }
    }
    const ok = operator === 'all' ? perTerm.every((c) => c > 0) : perTerm.some((c) => c > 0);
    if (ok) results.push({ node, fields: counts, snippets });
  }
  return results;
}

function replacePlain(text, re, replacement, keep = null) {
  let count = 0;
  let seen = 0;
  const groups = new RegExp(`${re.source}|`, re.flags).exec('').length - 1;
  re.lastIndex = 0;
  const out = String(text ?? '').replace(re, (...args) => {
    if (keep && !keep(seen++)) return args[0];
    count++;
    // Same $ rules as the text replace (src/lib/search.js): $$, $&, $N only up to the group count.
    return replacement.replace(/\$(\$|&|\d)/g, (tok, k) => {
      if (k === '$') return '$';
      if (k === '&') return args[0];
      const n = Number(k);
      return n >= 1 && n <= groups ? args[n] ?? '' : tok;
    });
  });
  re.lastIndex = 0;
  return { text: out, count };
}

/**
 * Replaces re in the selected fields of one document.
 * fields default: ['title', 'synopsis', 'text', 'notes'].
 * @returns {{node, docHtml, notesHtml, count}} node is a shallow copy (never mutated).
 */
export function replaceInFields(node, docHtml, notesHtml, re, replacement, fields = ['title', 'synopsis', 'text', 'notes'], keep = null) {
  const keepIn = (f) => (keep ? (i) => keep(f, i) : null);
  const next = { ...node };
  let count = 0;
  let doc = docHtml;
  let notes = notesHtml;
  if (!re) return { node: next, docHtml: doc, notesHtml: notes, count };
  for (const f of ['title', 'synopsis']) {
    if (!fields.includes(f) || !node[f]) continue;
    const r = replacePlain(node[f], re, replacement, keepIn(f));
    next[f] = r.text;
    count += r.count;
  }
  if (fields.includes('text') && doc) {
    const r = replaceInHtml(doc, re, replacement, keepIn('text'));
    doc = r.html;
    count += r.count;
  }
  if (fields.includes('notes') && notes) {
    const r = replaceInHtml(notes, re, replacement, keepIn('notes'));
    notes = r.html;
    count += r.count;
  }
  re.lastIndex = 0;
  return { node: next, docHtml: doc, notesHtml: notes, count };
}

export const REPLACEABLE_FIELDS = ['title', 'synopsis', 'text', 'notes'];
export const occurrenceKey = (id, term, field, index) => `${id}|${term}|${field}|${index}`;

/**
 * Every occurrence a project replace would change, for the preview with exclusions.
 * excluded: Set of occurrenceKey()s left as they are (also skipped while building the list).
 * @returns {{key, id, title, field, before, match, after, replaced}[]}
 */
export function listOccurrences(project, docs, notesById, criteria, replacement, excluded = new Set()) {
  const terms = buildTerms(criteria);
  if (!terms || !terms.length || terms.some((t) => !t)) return [];
  const fields = (criteria.fields?.length ? criteria.fields : REPLACEABLE_FIELDS).filter((f) => REPLACEABLE_FIELDS.includes(f));
  const out = [];
  for (const { node } of searchProject(project, docs, notesById, criteria)) {
    let cur = { node, doc: docs?.[node.id] || '', notes: notesById?.[node.id] || '' };
    terms.forEach((re, ti) => {
      for (const f of fields) {
        const value = f === 'text' ? cur.doc : f === 'notes' ? cur.notes : cur.node[f] || '';
        const hits = f === 'text' || f === 'notes' ? findInHtml(value, re) : findInPlain(value, re);
        re.lastIndex = 0;
        hits.forEach((h, i) => {
          const one = new RegExp(re.source, re.flags.replace('g', ''));
          const replaced = h.match.replace(one, replacement);
          out.push({ key: occurrenceKey(node.id, ti, f, i), id: node.id, title: node.title, field: f, ...h, replaced });
        });
      }
      const r = replaceInFields(cur.node, cur.doc, cur.notes, re, replacement, fields, (f, i) => !excluded.has(occurrenceKey(node.id, ti, f, i)));
      cur = { node: r.node, doc: r.docHtml, notes: r.notesHtml };
    });
  }
  return out;
}
