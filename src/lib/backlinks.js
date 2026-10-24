// Document links and automatic back-links. A document link is an <a href="scribner://doc/ID">
// (Ctrl+L, [[Title]], the format bar, a pasted or dragged link). With the "add back-link"
// setting on, a new link from A to B adds A to B's document bookmarks (Inspector), never into
// B's text. "Links to this document" are computed from every document's text.
import { findNode, findParent, produce, updateNode } from './tree.js';

const LINK_RE = /scribner:\/\/doc\/([A-Za-z0-9_-]+)/g;

/** Ids of the documents an HTML text links to (unique, in order). */
export function docLinks(html) {
  const out = [];
  for (const m of String(html || '').matchAll(LINK_RE)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

/** Link targets present in `next` but not in `prev`. */
export function addedLinks(prev, next) {
  if (!String(next || '').includes('scribner://doc/')) return [];
  const before = new Set(docLinks(prev));
  return docLinks(next).filter((id) => !before.has(id));
}

/**
 * Adds a bookmark back to `sourceId` on every target of `targetIds` that exists, is not the
 * source and does not have it yet. Returns the same tree when nothing changes.
 */
export function addBacklinks(tree, sourceId, targetIds) {
  let out = tree;
  for (const id of targetIds || []) {
    if (!id || id === sourceId) continue;
    const node = findNode(out, id);
    if (!node || !findNode(out, sourceId)) continue;
    const bms = node.bookmarks || [];
    if (bms.some((b) => b.id === sourceId)) continue;
    out = updateNode(out, id, { bookmarks: [...bms, { id: sourceId }] });
  }
  return out;
}

/** Ids of the documents whose text links to `id`. */
export function incomingLinks(docs, id) {
  if (!id) return [];
  return Object.entries(docs || {})
    .filter(([src, html]) => src !== id && docLinks(html).includes(id))
    .map(([src]) => src);
}

/**
 * Places the document created from "[[New title]]": inside `folderId` when it exists, else right
 * after the current document in its folder (the Draft when the current one is unknown).
 */
export function insertLinkedDoc(tree, currentId, folderId, node) {
  return produce(tree, (t) => {
    const folder = folderId ? findNode(t, folderId) : null;
    if (folder) {
      folder.children = [...(folder.children || []), node];
      return;
    }
    const parent = currentId ? findParent(t, currentId) : null;
    if (parent) {
      const i = parent.children.findIndex((n) => n.id === currentId);
      parent.children.splice(i + 1, 0, node);
      return;
    }
    (t.find((n) => n.root === 'draft') || t[0]).children.push(node);
  });
}
