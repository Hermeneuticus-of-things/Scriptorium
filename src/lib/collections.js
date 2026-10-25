// Collections (manual id lists or saved searches) and project keyword management.
// Pure: every function returns a new project object and never mutates its input.

import { flatten } from './tree.js';
import { searchProject } from './projectSearch.js';

const newId = () =>
  globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const uniq = (arr) => [...new Set(arr)];

function withCollection(project, collectionId, fn) {
  const next = structuredClone(project);
  const c = (next.collections || []).find((x) => x.id === collectionId);
  if (c) fn(c, next);
  return next;
}

export function createCollection(project, { title = 'Colecție nouă', color = '', type = 'manual', ids = [], search = null, id } = {}) {
  const next = structuredClone(project);
  const cid = id || newId();
  const col = { id: cid, title, color, type };
  if (type === 'search') col.search = structuredClone(search || { query: '', options: {} });
  else col.ids = uniq(ids);
  next.collections = [...(next.collections || []), col];
  return { project: next, id: cid };
}

export const renameCollection = (project, collectionId, title) =>
  withCollection(project, collectionId, (c) => {
    c.title = title;
  });

export const recolorCollection = (project, collectionId, color) =>
  withCollection(project, collectionId, (c) => {
    c.color = color || '';
  });

export function deleteCollection(project, collectionId) {
  const next = structuredClone(project);
  next.collections = (next.collections || []).filter((c) => c.id !== collectionId);
  return next;
}

export const addToCollection = (project, collectionId, ids) =>
  withCollection(project, collectionId, (c) => {
    if (c.type === 'search') return;
    c.ids = uniq([...(c.ids || []), ...ids]);
  });

export const removeFromCollection = (project, collectionId, ids) =>
  withCollection(project, collectionId, (c) => {
    const drop = new Set(ids);
    c.ids = (c.ids || []).filter((i) => !drop.has(i));
  });

export const moveInCollection = (project, collectionId, id, newIndex) =>
  withCollection(project, collectionId, (c) => {
    const ids = c.ids || [];
    const from = ids.indexOf(id);
    if (from < 0) return;
    ids.splice(from, 1);
    ids.splice(Math.max(0, Math.min(newIndex, ids.length)), 0, id);
  });

/** Moves a collection tab to another place (index in the list of collections). */
export function moveCollection(project, collectionId, newIndex) {
  const list = [...(project.collections || [])];
  const from = list.findIndex((c) => c.id === collectionId);
  if (from < 0) return project;
  const [c] = list.splice(from, 1);
  list.splice(Math.max(0, Math.min(newIndex, list.length)), 0, c);
  return { ...project, collections: list };
}

/** New criteria for a saved search (Edit search criteria). */
export const setCollectionSearch = (project, collectionId, criteria) =>
  withCollection(project, collectionId, (c) => {
    if (c.type !== 'search') return;
    const { query = '', ...options } = criteria || {};
    c.search = structuredClone({ query, options });
  });

// Criteria object for a search collection.
export const collectionCriteria = (collection) => ({
  ...(collection.search?.options || {}),
  query: collection.search?.query || '',
});

/** Ordered nodes of a collection (manual: stored order; search: binder order). */
export function collectionNodes(project, collection, docs = {}, notesById = {}) {
  if (!collection) return [];
  if (collection.type === 'search') {
    return searchProject(project, docs, notesById, collectionCriteria(collection)).map((r) => r.node);
  }
  const byId = new Map(flatten(project.tree || []).map((n) => [n.id, n]));
  return (collection.ids || []).map((id) => byId.get(id)).filter(Boolean);
}

// ---------- keywords ----------

/** Union of keywordDefs and every node.keywords, with usage counts. */
export function listKeywords(project) {
  const map = new Map();
  for (const d of project.keywordDefs || []) map.set(d.name, { name: d.name, color: d.color || '', parent: d.parent ?? null, count: 0, defined: true });
  for (const n of flatten(project.tree || [])) {
    for (const k of n.keywords || []) {
      if (!map.has(k)) map.set(k, { name: k, color: '', parent: null, count: 0, defined: false });
      map.get(k).count++;
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ro'));
}

function mapNodes(nodes, fn) {
  for (const n of nodes) {
    fn(n);
    if (n.children) mapNodes(n.children, fn);
  }
}

function ensureDef(project, name) {
  project.keywordDefs = project.keywordDefs || [];
  let d = project.keywordDefs.find((x) => x.name === name);
  if (!d) {
    d = { name, color: '', parent: null };
    project.keywordDefs.push(d);
  }
  return d;
}

export function addKeyword(project, name, { color = '', parent = null } = {}) {
  const next = structuredClone(project);
  const n = String(name || '').trim();
  if (!n) return next;
  const d = ensureDef(next, n);
  if (color) d.color = color;
  if (parent && parent !== n) d.parent = parent;
  return next;
}

/** Renames a keyword everywhere (defs, parents, node keywords deduped). Merges into `next` if it exists. */
export function renameKeyword(project, old, nextName) {
  const target = String(nextName || '').trim();
  const out = structuredClone(project);
  if (!target || target === old) return out;
  mapNodes(out.tree || [], (n) => {
    if (n.keywords?.includes(old)) n.keywords = uniq(n.keywords.map((k) => (k === old ? target : k)));
  });
  const defs = out.keywordDefs || [];
  const oldDef = defs.find((d) => d.name === old);
  const existing = defs.find((d) => d.name === target);
  if (oldDef && existing) {
    if (!existing.color) existing.color = oldDef.color;
    if (!existing.parent && oldDef.parent !== target) existing.parent = oldDef.parent;
    out.keywordDefs = defs.filter((d) => d !== oldDef);
  } else if (oldDef) {
    oldDef.name = target;
  }
  for (const d of out.keywordDefs || []) {
    if (d.parent === old) d.parent = target;
    if (d.parent === d.name) d.parent = null;
  }
  // A merge may close a loop (A→C, C→B, then A renamed to B): the keyword that would be its own
  // ancestor loses its parent.
  const all = out.keywordDefs || [];
  for (const d of all) {
    const seen = new Set([d.name]);
    for (let cur = d.parent; cur; cur = all.find((x) => x.name === cur)?.parent || null) {
      if (seen.has(cur)) {
        d.parent = null;
        break;
      }
      seen.add(cur);
    }
  }
  return out;
}

export function deleteKeyword(project, name) {
  const out = structuredClone(project);
  mapNodes(out.tree || [], (n) => {
    if (n.keywords?.includes(name)) n.keywords = n.keywords.filter((k) => k !== name);
  });
  out.keywordDefs = (out.keywordDefs || []).filter((d) => d.name !== name);
  for (const d of out.keywordDefs) if (d.parent === name) d.parent = null;
  return out;
}

export function setKeywordColor(project, name, color) {
  const out = structuredClone(project);
  ensureDef(out, name).color = color || '';
  return out;
}

/** Sets parent (null clears). Refuses self-parenting and cycles. */
export function setKeywordParent(project, name, parent) {
  const out = structuredClone(project);
  const p = parent || null;
  if (p) {
    const defs = out.keywordDefs || [];
    let cur = p;
    const seen = new Set();
    while (cur && !seen.has(cur)) {
      if (cur === name) return out;
      seen.add(cur);
      cur = defs.find((d) => d.name === cur)?.parent || null;
    }
  }
  ensureDef(out, name).parent = p;
  return out;
}

/** Documents a keyword dropped on `targetId` goes to: the whole selection when the target is part of it. */
export function keywordDropTargets(targetId, selectedIds = []) {
  const sel = [...selectedIds];
  return sel.includes(targetId) ? sel : [targetId];
}

/** Adds keyword `name` to the documents `ids` (no duplicates; roots skipped); returns a new project. */
export function addKeywordToDocs(project, ids, name) {
  const k = String(name || '').trim();
  const out = structuredClone(project);
  if (!k) return out;
  const want = new Set(ids);
  mapNodes(out.tree || [], (n) => {
    if (!want.has(n.id) || n.root) return;
    if (!(n.keywords || []).includes(k)) n.keywords = [...(n.keywords || []), k];
  });
  ensureDef(out, k);
  return out;
}

/** Keyword tree rows in display order: [{...kw, depth, hasChildren}]; children of collapsed names are hidden. */
export function keywordTreeRows(keywords, collapsed = {}) {
  const names = new Set(keywords.map((k) => k.name));
  const byParent = new Map();
  for (const k of keywords) {
    const p = k.parent && names.has(k.parent) ? k.parent : null;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p).push(k);
  }
  const out = [];
  const seen = new Set();
  const visit = (p, depth, hidden) => {
    for (const k of byParent.get(p) || []) {
      if (seen.has(k.name)) continue;
      seen.add(k.name);
      const hasChildren = (byParent.get(k.name) || []).length > 0;
      if (!hidden) out.push({ ...k, depth, hasChildren });
      visit(k.name, depth + 1, hidden || Boolean(collapsed[k.name]));
    }
  };
  visit(null, 0, false);
  for (const k of keywords) if (!seen.has(k.name)) out.push({ ...k, depth: 0, hasChildren: false });
  return out;
}

export const KEYWORD_MIME = 'text/x-scribner-keyword';
