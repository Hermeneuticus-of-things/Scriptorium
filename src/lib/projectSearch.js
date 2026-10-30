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
// match somewhere); 'any' -> one alternation; 'exact' or regex -> whole query;
// 'startsWith'/'endsWith' (Scrivener §11.2.1) -> the query anchored at a word edge.
// Plain any/all path (no special syntax) — kept for callers that want the raw terms;
// searchProject itself goes through parseQuery, which adds quotes/exclusions/wildcard.
export function buildTerms(criteria) {
  const { query, regex, caseSensitive, wholeWord } = criteria;
  const operator = criteria.operator || 'any';
  if (!query || !query.trim()) return [];
  const base = { caseSensitive, wholeWord };
  if (regex || operator === 'exact') {
    const re = buildRegex({ query: regex ? query : query.trim(), regex, ...base });
    return re ? [re] : null;
  }
  if (operator === 'startsWith' || operator === 'endsWith') {
    const src = escapeRe(query.trim());
    const anchored = operator === 'startsWith' ? `(?<![\\p{L}\\p{N}_])(?:${src})` : `(?:${src})(?![\\p{L}\\p{N}_])`;
    try {
      return [new RegExp(anchored, `g${caseSensitive ? '' : 'i'}u`)];
    } catch {
      return null;
    }
  }
  const words = [...new Set(query.trim().split(/\s+/))];
  if (operator === 'all') return words.map((w) => buildRegex({ query: w, regex: false, ...base }));
  return [buildRegex({ query: words.map(escapeRe).join('|'), regex: true, ...base })];
}

// --- Special search terms (Scrivener §11.1.3), active for the any/all operators ---
// `Bob "black car"`  -> word AND exact phrase (quoted tokens count as words)
// `Lydia -Dovahkiin` -> hyphen excludes; works on phrases too: `Lydia -"Needs Proofing"`
// `*`                -> universal wildcard: everything (combinable with filters)
// `mdate:`/`cdate:`  -> date conditions, AND-ed with the rest (Table 11.1):
//    YYYY | YYYY-MM | YYYY-MM-DD (or /), #d/#m/#y relative, optional > (from) / < (before).
const TOKEN_RE = /-?"[^"]*"|\S+/g;

function wordTerm(w, criteria) {
  const re = buildRegex({ query: w, regex: false, caseSensitive: criteria.caseSensitive, wholeWord: criteria.wholeWord });
  return re || null;
}

// YYYY | YYYY-MM | YYYY-MM-DD(/) | Nd/Nm/Ny, with optional > / < prefix.
// Returns {field, from, to} or null when the value is not a date.
function parseDateToken(field, value) {
  const m = /^(>|<)?(.+)$/.exec(value);
  if (!m) return null;
  const [, op, raw] = m;
  const DAY = 86400000;
  const y = String(new Date().getFullYear());
  const mk = (from, to) => ({ field, from: from ? from.getTime() : null, to: to ? to.getTime() : null });
  let mm;
  if ((mm = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(raw))) {
    const d = new Date(Number(mm[1]), Number(mm[2]) - 1, Number(mm[3]));
    if (isNaN(d)) return null;
    if (op === '>') return mk(d, null);
    if (op === '<') return mk(null, d);
    return mk(d, new Date(d.getTime() + DAY));
  }
  if ((mm = /^(\d{4})[-/](\d{1,2})$/.exec(raw))) {
    const d = new Date(Number(mm[1]), Number(mm[2]) - 1, 1);
    if (isNaN(d)) return null;
    if (op === '>') return mk(d, null);
    if (op === '<') return mk(null, d);
    return mk(d, new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }
  if ((mm = /^(\d{4})$/.exec(raw))) {
    const d = new Date(Number(mm[1]), 0, 1);
    if (op === '>') return mk(d, null);
    if (op === '<') return mk(null, d);
    return mk(d, new Date(Number(mm[1]) + 1, 0, 1));
  }
  if ((mm = /^(\d+)([dmy])$/i.exec(raw))) {
    const n = Number(mm[1]);
    const d = new Date();
    if (mm[2].toLowerCase() === 'd') d.setDate(d.getDate() - n);
    else if (mm[2].toLowerCase() === 'm') d.setMonth(d.getMonth() - n);
    else d.setFullYear(d.getFullYear() - n);
    if (op === '<') return mk(null, d); // "<2y" = older than two years
    return mk(d, null); // relative values are open-ended by default
  }
  return null;
}

/**
 * Parses the query into matching structure for any/all: required regexes (OR in
 * 'any', AND in 'all'), excluded regexes (must not match), the universal wildcard,
 * and date conditions (all must pass). null on an invalid user regex.
 */
export function parseQuery(criteria) {
  const { query, regex } = criteria;
  const operator = criteria.operator || 'any';
  if (regex || operator === 'exact' || operator === 'startsWith' || operator === 'endsWith') {
    const terms = buildTerms(criteria);
    if (terms === null) return null;
    return { required: terms, excluded: [], wildcard: false, dates: [] };
  }
  if (!query || !query.trim()) return { required: [], excluded: [], wildcard: false, dates: [] };
  const out = { required: [], excluded: [], wildcard: false, dates: [] };
  const seen = new Set();
  for (const tok of String(query).match(TOKEN_RE) || []) {
    let t = tok;
    let neg = false;
    if (t.startsWith('-')) {
      neg = true;
      t = t.slice(1);
    }
    let quoted = false;
    if (t.length > 1 && t.startsWith('"') && t.endsWith('"')) {
      quoted = true;
      t = t.slice(1, -1);
    }
    if (!t) continue;
    const dm = /^(m|c)date:(.+)$/i.exec(t);
    if (dm) {
      const cond = parseDateToken(dm[1].toLowerCase() === 'm' ? 'modified' : 'created', dm[2]);
      if (!cond) continue; // not a real date value: ignore the token, like Scrivener's grey modes
      out.dates.push(cond);
      continue;
    }
    if (!quoted && t === '*') {
      if (!neg) out.wildcard = true;
      continue;
    }
    const re = quoted
      ? buildRegex({ query: t, regex: false, caseSensitive: criteria.caseSensitive, wholeWord: false })
      : wordTerm(t, criteria);
    if (!re) continue;
    (neg ? out.excluded : out.required).push(re);
  }
  return out;
}

function findInPlain(text, re, context = 40) {
  const out = [];
  const s = String(text ?? '');
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(s))) {
    if (m[0] === '') {
      re.lastIndex++;
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
export function compileExcluded(tree) {
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
 * @returns {{node, fields: Object<string, number>, snippets: Array}[]} in binder
 * order, or sorted by criteria.sort ('title' with Romanian collation, 'created';
 * criteria.sortDesc flips either). criteria.invert (Scrivener §11.1.2) returns the
 * nodes that do NOT match the criteria; trash stays hidden unless includeTrash.
 * Empty query + at least one label/status/keyword filter -> every node passing the filters.
 */
export function searchProject(project, docs, notesById, criteria = {}) {
  const parsed = parseQuery(criteria);
  if (parsed === null) return []; // invalid regex
  const fields = criteria.fields?.length ? criteria.fields : ALL_FIELDS;
  const emptyQuery =
    !parsed.required.length && !parsed.excluded.length && !parsed.dates.length && !parsed.wildcard;
  if (emptyQuery && !hasFilter(criteria) && !criteria.invert) return [];
  const operator = criteria.regex ? 'exact' : criteria.operator || 'any';
  const excluded = compileExcluded(project.tree || []);
  const results = [];

  for (const { node, root } of candidates(project.tree || [])) {
    if (root === 'trash' && !criteria.includeTrash) continue;
    const pass = passesFilters(node, root, criteria, excluded);
    if (criteria.invert) {
      // Inverted results list the filter-passing nodes the criteria do NOT match
      // (filters still apply normally); an empty query matches nothing, so its
      // complement is every node passing the filters. No snippets are carried.
      if (!pass) continue;
      if (!emptyQuery && matchParsed(node, fields, parsed, operator, docs, notesById)) continue;
      results.push({ node, fields: Object.fromEntries(ALL_FIELDS.map((f) => [f, 0])), snippets: [] });
      continue;
    }
    if (!pass) continue;
    const counts = Object.fromEntries(ALL_FIELDS.map((f) => [f, 0]));
    if (emptyQuery || (parsed.wildcard && !parsed.required.length)) {
      results.push({ node, fields: counts, snippets: [] });
      continue;
    }
    const { ok, counts: hitCounts, snippets } = matchParsed(node, fields, parsed, operator, docs, notesById, true);
    if (ok) results.push({ node, fields: hitCounts, snippets });
  }
  if (criteria.sort === 'title' || criteria.sort === 'created') {
    const dir = criteria.sortDesc ? -1 : 1;
    const key = (r) => String(criteria.sort === 'title' ? r.node.title || '' : r.node.created || '');
    const locale = criteria.sort === 'title' ? 'ro' : undefined;
    results.sort((x, y) => key(x).localeCompare(key(y), locale) * dir);
  }
  return results;
}

// Criteria matching shared by the direct and inverted paths: date conditions
// (all must pass), excluded terms (none may match), then the required terms
// (any/all). With collect, returns per-field counts and snippets from the
// required terms; without, just the boolean decision.
function matchParsed(node, fields, parsed, operator, docs, notesById, collect = false) {
  for (const cond of parsed.dates) {
    if (!dateOk(node, cond)) return collect ? { ok: false, counts: {}, snippets: [] } : false;
  }
  const values = new Map();
  const valuesOf = (field) => {
    if (!values.has(field)) values.set(field, fieldValues(node, field, docs, notesById));
    return values.get(field);
  };
  for (const re of parsed.excluded) {
    for (const field of fields) {
      for (const value of valuesOf(field)) {
        const hits = HTML_FIELDS.has(field) ? findInHtml(value, re) : findInPlain(value, re);
        if (hits.length) return collect ? { ok: false, counts: {}, snippets: [] } : false;
      }
    }
  }
  if (!parsed.required.length) return collect ? { ok: true, counts: {}, snippets: [] } : true;
  const counts = Object.fromEntries(ALL_FIELDS.map((f) => [f, 0]));
  const snippets = [];
  const perTerm = parsed.required.map(() => 0);
  for (const field of fields) {
    for (const value of valuesOf(field)) {
      parsed.required.forEach((re, i) => {
        const hits = HTML_FIELDS.has(field) ? findInHtml(value, re) : findInPlain(value, re);
        re.lastIndex = 0;
        if (!hits.length) return;
        counts[field] += hits.length;
        perTerm[i] += hits.length;
        if (collect) for (const h of hits) if (snippets.length < MAX_SNIPPETS) snippets.push({ field, ...h });
      });
    }
  }
  const ok = operator === 'all' ? perTerm.every((c) => c > 0) : perTerm.some((c) => c > 0);
  return collect ? { ok, counts, snippets } : ok;
}

// A missing modified date falls back to created; a node with neither fails the condition.
function dateOk(node, cond) {
  const raw = node?.[cond.field] ?? (cond.field === 'modified' ? node?.created : undefined);
  if (!raw) return false;
  const d = new Date(raw).getTime();
  if (isNaN(d)) return false;
  if (cond.from !== null && d < cond.from) return false;
  if (cond.to !== null && d >= cond.to) return false;
  return true;
}

function replacePlain(text, re, replacement) {
  let count = 0;
  re.lastIndex = 0;
  const out = String(text ?? '').replace(re, (...args) => {
    count++;
    return replacement.replace(/\$(\d)/g, (_, d) => (typeof args[Number(d)] === 'string' ? args[Number(d)] : ''));
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
