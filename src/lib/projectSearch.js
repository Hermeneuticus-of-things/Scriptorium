// Advanced project search: multi-field matching (title, text, notes, synopsis,
// keywords, custom metadata) with any/all/exact operators and metadata filters.
// Pure: no React, no IPC. HTML fields go through ./search.js so markup is never
// matched; plain string fields are matched directly.

import { buildRegex, findInHtml, replaceInHtml } from './search.js';

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

function fieldValues(node, field, docs, notesById) {
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
      return Object.values(node.custom || {})
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
  return true;
}

const hasFilter = (c) => Boolean(c.labels?.length || c.statuses?.length || c.keywords?.length);

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
      results.push({ node, fields: counts, snippets: [] });
      continue;
    }
    const snippets = [];
    const perTerm = terms.map(() => 0);
    for (const field of fields) {
      for (const value of fieldValues(node, field, docs, notesById)) {
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

function replacePlain(text, re, replacement) {
  let count = 0;
  const groups = new RegExp(`${re.source}|`, re.flags).exec('').length - 1;
  re.lastIndex = 0;
  const out = String(text ?? '').replace(re, (...args) => {
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
export function replaceInFields(node, docHtml, notesHtml, re, replacement, fields = ['title', 'synopsis', 'text', 'notes']) {
  const next = { ...node };
  let count = 0;
  let doc = docHtml;
  let notes = notesHtml;
  if (!re) return { node: next, docHtml: doc, notesHtml: notes, count };
  for (const f of ['title', 'synopsis']) {
    if (!fields.includes(f) || !node[f]) continue;
    const r = replacePlain(node[f], re, replacement);
    next[f] = r.text;
    count += r.count;
  }
  if (fields.includes('text') && doc) {
    const r = replaceInHtml(doc, re, replacement);
    doc = r.html;
    count += r.count;
  }
  if (fields.includes('notes') && notes) {
    const r = replaceInHtml(notes, re, replacement);
    notes = r.html;
    count += r.count;
  }
  re.lastIndex = 0;
  return { node: next, docHtml: doc, notesHtml: notes, count };
}
