import { t as tr } from './i18n.js';
// Pure helpers for the binder tree (array of nodes with optional children).

export function walk(nodes, fn, depth = 0, parent = null) {
  for (const n of nodes) {
    fn(n, depth, parent);
    if (n.children) walk(n.children, fn, depth + 1, n);
  }
}

export function findNode(tree, id) {
  let found = null;
  walk(tree, (n) => {
    if (n.id === id) found = n;
  });
  return found;
}

export function findParent(tree, id) {
  let found = null;
  walk(tree, (n, _d, parent) => {
    if (n.id === id) found = parent;
  });
  return found;
}

export function rootOf(tree, id) {
  for (const r of tree) {
    if (r.id === id || findNode(r.children || [], id)) return r;
  }
  return null;
}

export function isDescendant(tree, ancestorId, id) {
  const a = findNode(tree, ancestorId);
  return Boolean(a && a.children && findNode(a.children, id));
}

// Returns a deep-cloned tree with fn applied to the clone (immutable updates for React).
export function produce(tree, fn) {
  const copy = structuredClone(tree);
  fn(copy);
  return copy;
}

function detach(tree, id) {
  const parent = findParent(tree, id);
  const list = parent ? parent.children : tree;
  const idx = list.findIndex((n) => n.id === id);
  if (idx < 0) return null;
  return list.splice(idx, 1)[0];
}

// position: 'inside' (append to folder), 'before', 'after'
export function moveNode(tree, id, targetId, position) {
  if (id === targetId || isDescendant(tree, id, targetId)) return tree;
  const moving = findNode(tree, id);
  if (!moving || moving.root) return tree;
  return produce(tree, (t) => {
    const node = detach(t, id);
    const target = findNode(t, targetId);
    // A text document can hold sub-documents too (Scrivener "file group").
    if (position === 'inside' && (target.children || target.type === 'text')) {
      (target.children ||= []).push(node);
      return;
    }
    if (target.root) {
      target.children.unshift(node);
      return;
    }
    const parent = findParent(t, targetId);
    const list = parent ? parent.children : t;
    const idx = list.findIndex((n) => n.id === targetId);
    list.splice(position === 'after' ? idx + 1 : idx, 0, node);
  });
}

// Inserts node after the selected item (or inside it when it is a folder).
export function insertNear(tree, selectedId, node) {
  return produce(tree, (t) => {
    // Never into the Trash: "Empty Trash" would delete the new writing.
    const sel = selectedId && rootOf(t, selectedId)?.root !== 'trash' ? findNode(t, selectedId) : null;
    if (!sel) {
      t[0].children.push(node);
    } else if (sel.children) {
      sel.children.push(node);
    } else {
      const parent = findParent(t, selectedId);
      const list = parent ? parent.children : t;
      list.splice(list.findIndex((n) => n.id === selectedId) + 1, 0, node);
    }
  });
}

export function updateNode(tree, id, patch) {
  return produce(tree, (t) => Object.assign(findNode(t, id), patch));
}

// Trashing remembers where the item was (trashedFrom = {parentId, index}) so it can be restored.
export function moveToTrash(tree, id) {
  const trash = tree.find((n) => n.root === 'trash');
  const node = findNode(tree, id);
  if (!node || node.root || rootOf(tree, id)?.id === trash.id) return tree;
  const parent = findParent(tree, id);
  const list = parent ? parent.children : tree;
  const from = { parentId: parent ? parent.id : null, index: list.findIndex((n) => n.id === id) };
  const moved = moveNode(tree, id, trash.id, 'inside');
  return produce(moved, (t) => {
    findNode(t, id).trashedFrom = from;
  });
}

// Puts a trashed item back at its original place (or at the end of the Draft when
// the original parent is gone or itself in the trash).
export function restoreFromTrash(tree, id) {
  const trash = tree.find((n) => n.root === 'trash');
  const node = findNode(tree, id);
  if (!node || node.root || rootOf(tree, id)?.id !== trash.id) return tree;
  const from = node.trashedFrom || {};
  return produce(tree, (t) => {
    const moving = detach(t, id);
    delete moving.trashedFrom;
    let parent = from.parentId ? findNode(t, from.parentId) : null;
    if (!parent || rootOf(t, parent.id)?.id === trash.id || (!parent.children && parent.type !== 'text')) parent = t[0];
    parent.children ||= [];
    const idx = Number.isInteger(from.index) ? Math.max(0, Math.min(from.index, parent.children.length)) : parent.children.length;
    parent.children.splice(idx, 0, moving);
  });
}

// Restores several trashed items. An item whose ancestor is also selected travels with it
// (restoring it first would pull it out of its folder).
export function restoreManyFromTrash(tree, ids) {
  let t = tree;
  for (const id of ids) {
    if (ids.some((other) => other !== id && isDescendant(tree, other, id))) continue;
    t = restoreFromTrash(t, id);
  }
  return t;
}

// Moves several items (binder order kept) inside a container ("Move To").
export function moveManyInto(tree, ids, targetId) {
  const target = findNode(tree, targetId);
  if (!target || (!target.children && target.type !== 'text')) return tree;
  let t = tree;
  for (const n of inOrder(tree, ids)) {
    if (n.root || n.id === targetId || isDescendant(t, n.id, targetId)) continue;
    // skip items whose ancestor is also moved: they travel with it
    if (ids.some((other) => other !== n.id && isDescendant(t, other, n.id))) continue;
    t = moveNode(t, n.id, targetId, 'inside');
  }
  return t;
}

// Containers a selection can be moved into: [{id, title, depth}], excluding the
// selection itself, its descendants and the trash.
export function moveTargets(tree, excludeIds = []) {
  const out = [];
  const visit = (nodes, depth) => {
    for (const n of nodes) {
      if (n.root === 'trash' || excludeIds.includes(n.id)) continue;
      if (n.children) {
        out.push({ id: n.id, title: n.title, depth });
        visit(n.children, depth + 1);
      }
    }
  };
  visit(tree, 0);
  return out;
}

// Ids of the ancestors of a node (outermost first), for Reveal in Binder.
export function ancestorIds(tree, id) {
  const out = [];
  let p = findParent(tree, id);
  while (p) {
    out.unshift(p.id);
    p = findParent(tree, p.id);
  }
  return out;
}

// Ordered text documents for Scrivenings over an arbitrary list of ids: binder order,
// containers expanded into their text descendants, duplicates removed.
export function scriveningsList(tree, ids) {
  const out = [];
  const seen = new Set();
  const add = (n) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    if (n.type === 'text') out.push(n);
  };
  for (const n of inOrder(tree, ids)) {
    if (n.root === 'trash') continue;
    if (!n.root) add(n);
    if (n.children) flatten(n.children).forEach(add);
  }
  return out;
}

// Appends an HTML fragment to the end of a document's HTML.
export function appendHtml(targetHtml, html, { separator = false } = {}) {
  const base = (targetHtml || '').replace(/(<p><\/p>\s*)+$/, '');
  if (!html) return base;
  return `${base}${base && separator ? '<hr>' : ''}${html}`;
}

export function emptyTrash(tree) {
  return produce(tree, (t) => {
    t.find((n) => n.root === 'trash').children = [];
  });
}

export function flatten(nodes, out = []) {
  for (const n of nodes) {
    out.push(n);
    if (n.children) flatten(n.children, out);
  }
  return out;
}

// Keyboard moves: 'up' | 'down' (among siblings), 'indent' (into previous
// sibling folder), 'outdent' (after the parent folder).
export function keyMove(tree, id, dir) {
  const node = findNode(tree, id);
  if (!node || node.root) return tree;
  const parent = findParent(tree, id);
  const list = parent ? parent.children : tree;
  const idx = list.findIndex((n) => n.id === id);
  if (dir === 'up' && idx > 0) return moveNode(tree, id, list[idx - 1].id, 'before');
  if (dir === 'down' && idx < list.length - 1) return moveNode(tree, id, list[idx + 1].id, 'after');
  if (dir === 'indent' && idx > 0 && list[idx - 1].children) return moveNode(tree, id, list[idx - 1].id, 'inside');
  if (dir === 'outdent' && parent && !parent.root) return moveNode(tree, id, parent.id, 'after');
  return tree;
}

// Copies a node (and optionally its children) right after the original, with new
// ids and " (copie)" on the top title. Returns {tree, pairs: [[oldId, newId], …], id}.
export function duplicateNode(tree, id, { withChildren = true, newId = () => crypto.randomUUID() } = {}) {
  const original = findNode(tree, id);
  if (!original || original.root) return { tree, pairs: [], id: null };
  const pairs = [];
  const clone = (n, top) => {
    const copy = structuredClone({ ...n, children: undefined });
    copy.id = newId();
    pairs.push([n.id, copy.id]);
    if (top) copy.title = tr('ui.app.x_copie', { title: n.title });
    if (n.children) copy.children = withChildren ? n.children.map((c) => clone(c, false)) : [];
    if (!n.children) delete copy.children;
    return copy;
  };
  const copy = clone(original, true);
  const next = produce(tree, (t) => {
    const parent = findParent(t, id);
    const list = parent ? parent.children : t;
    list.splice(list.findIndex((n) => n.id === id) + 1, 0, copy);
  });
  return { tree: next, pairs, id: copy.id };
}

// Text <-> folder (Scrivener "Convert to Folder / Convert to File"). Text keeps its
// sub-documents either way; an empty children list is dropped from a text.
export function convertNode(tree, id, type) {
  return produce(tree, (t) => {
    const n = findNode(t, id);
    if (!n || n.root || n.type === 'file') return;
    n.type = type;
    if (type === 'folder') n.children ||= [];
    else if (n.children && !n.children.length) delete n.children;
  });
}

// Sorts the children of a container: by 'title' (Romanian collation), 'created', 'modified'.
export function sortChildren(tree, id, by = 'title', descending = false) {
  return produce(tree, (t) => {
    const n = findNode(t, id);
    if (!n || !n.children) return;
    const key = (x) => (by === 'title' ? x.title || '' : x[by] || '');
    n.children.sort((a, b) => {
      const r = by === 'title' ? key(a).localeCompare(key(b), 'ro', { numeric: true }) : String(key(a)).localeCompare(String(key(b)));
      return descending ? -r : r;
    });
  });
}

// Previous / next document in binder order (skipping roots), for Navigate menu.
export function siblingInOrder(tree, id, dir) {
  const order = flatten(tree).filter((n) => !n.root);
  const i = order.findIndex((n) => n.id === id);
  if (i < 0) return null;
  const next = order[i + dir];
  return next ? next.id : null;
}

// Drag of several items: binder order, children of a selected folder travel with it,
// a drop on the Trash goes through moveToTrash (so Restore knows where they came from).
export function dropMany(tree, ids, targetId, pos) {
  const set = new Set(ids);
  const hasSelectedAncestor = (id) => {
    for (let p = findParent(tree, id); p; p = findParent(tree, p.id)) if (set.has(p.id)) return true;
    return false;
  };
  const top = inOrder(tree, ids).map((n) => n.id).filter((id) => !hasSelectedAncestor(id));
  let t = tree;
  if (rootOf(tree, targetId)?.root === 'trash') {
    top.forEach((id) => (t = moveToTrash(t, id)));
    return t;
  }
  (pos === 'after' ? [...top].reverse() : top).forEach((id) => (t = moveNode(t, id, targetId, pos)));
  return t;
}

// Binder order of the given ids.
export function inOrder(tree, ids) {
  const set = new Set(ids);
  return flatten(tree).filter((n) => set.has(n.id));
}

// --- Binder keyboard / selection helpers (pure) ---

// Rows the binder currently shows, in order: [{id, depth, parentId, container, open}].
// isOpen(node) says whether a container's children are visible; isVisible filters rows.
export function visibleRows(nodes, isOpen, isVisible = () => true, depth = 0, parentId = null, out = []) {
  for (const n of nodes) {
    if (!isVisible(n)) continue;
    const container = Boolean(n.children && n.children.length);
    const open = container && isOpen(n);
    out.push({ id: n.id, depth, parentId, container, open });
    if (open) visibleRows(n.children, isOpen, isVisible, depth + 1, n.id, out);
  }
  return out;
}

// Arrow-key navigation over visible rows (Windows tree-view conventions, as in Scrivener):
// ↑/↓ previous/next row, Home/End first/last, ← collapses an open container or goes to the
// parent, → expands a closed container or goes to its first child.
// Returns {select: id|null, expand: id|null, collapse: id|null}.
export function binderNav(rows, id, key) {
  const out = { select: null, expand: null, collapse: null };
  if (!rows.length) return out;
  const i = rows.findIndex((r) => r.id === id);
  if (i < 0) return { ...out, select: rows[0].id };
  const r = rows[i];
  if (key === 'ArrowUp') out.select = rows[Math.max(0, i - 1)].id;
  else if (key === 'ArrowDown') out.select = rows[Math.min(rows.length - 1, i + 1)].id;
  else if (key === 'Home') out.select = rows[0].id;
  else if (key === 'End') out.select = rows[rows.length - 1].id;
  else if (key === 'ArrowLeft') {
    if (r.container && r.open) out.collapse = r.id;
    else if (r.parentId) out.select = r.parentId;
  } else if (key === 'ArrowRight') {
    if (r.container && !r.open) out.expand = r.id;
    else if (r.container && rows[i + 1]) out.select = rows[i + 1].id;
  }
  if (out.select === id) out.select = null;
  return out;
}

// Type-ahead in the binder: next visible row (after the current one, wrapping) whose
// title starts with prefix (case/diacritics-insensitive).
export function typeAhead(rows, titleOf, currentId, prefix) {
  const norm = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const p = norm(prefix);
  if (!p || !rows.length) return null;
  const start = Math.max(0, rows.findIndex((r) => r.id === currentId));
  // a one-letter prefix moves on to the next match; a longer one may stay on the current row
  const offset = p.length === 1 ? 1 : 0;
  for (let k = 0; k < rows.length; k++) {
    const r = rows[(start + offset + k) % rows.length];
    if (norm(titleOf(r.id)).startsWith(p)) return r.id;
  }
  return null;
}

// Ids in [anchor..id] over the visible rows (Shift+click / Shift+arrow range).
export function rangeIds(rows, anchorId, id) {
  const a = rows.findIndex((r) => r.id === anchorId);
  const b = rows.findIndex((r) => r.id === id);
  if (a < 0 || b < 0) return [id];
  const [x, y] = a < b ? [a, b] : [b, a];
  return rows.slice(x, y + 1).map((r) => r.id);
}

// Keyboard move of a whole selection (Ctrl+arrows). Items whose ancestor is also selected
// travel with it. Moving up processes top-down, moving down bottom-up, so the block keeps
// its order; a blocked item (already first/last) stops the items behind it from jumping it.
export function keyMoveMany(tree, ids, dir) {
  let list = inOrder(tree, ids).filter((n) => !n.root && !ids.some((o) => o !== n.id && isDescendant(tree, o, n.id))).map((n) => n.id);
  if (dir === 'down' || dir === 'outdent') list = list.reverse();
  let t = tree;
  const moved = new Set();
  for (const id of list) {
    const parent = findParent(t, id);
    const sibs = parent ? parent.children : t;
    const idx = sibs.findIndex((n) => n.id === id);
    const neighbour = dir === 'up' || dir === 'indent' ? sibs[idx - 1] : sibs[idx + 1];
    // don't jump over a selected neighbour that could not move
    if ((dir === 'up' || dir === 'down') && neighbour && ids.includes(neighbour.id) && !moved.has(neighbour.id)) continue;
    const next = keyMove(t, id, dir);
    if (next !== t) moved.add(id);
    t = next;
  }
  return t;
}

// Which row to select after the given ids leave their place (trash / move): the next
// sibling of the last one, else the previous sibling of the first, else the parent.
export function selectionAfterRemoval(tree, ids) {
  // Only the top-most removed items count: a child of a removed folder goes with it.
  const all = new Set(ids);
  const inside = (id) => {
    for (let p = findParent(tree, id); p; p = findParent(tree, p.id)) if (all.has(p.id)) return true;
    return false;
  };
  const order = inOrder(tree, ids).filter((n) => !inside(n.id));
  if (!order.length) return null;
  const set = new Set(ids);
  const last = order[order.length - 1];
  const parent = findParent(tree, last.id);
  const sibs = parent ? parent.children : tree;
  const after = sibs.slice(sibs.findIndex((n) => n.id === last.id) + 1).find((n) => !set.has(n.id));
  if (after) return after.id;
  const first = order[0];
  const p1 = findParent(tree, first.id);
  const s1 = p1 ? p1.children : tree;
  const before = s1.slice(0, s1.findIndex((n) => n.id === first.id)).reverse().find((n) => !set.has(n.id));
  if (before) return before.id;
  return p1 ? p1.id : null;
}

// Signature of a tree's membership (which ids exist), independent of order and metadata.
export function idSignature(tree) {
  return flatten(tree).map((n) => n.id).sort().join(',');
}

// Rebuilds the structure (order and nesting) of `shape` using the node data of `current`
// where a node still exists, so undoing a move does not also undo later metadata edits.
export function restoreStructure(shape, current) {
  const byId = new Map(flatten(current).map((n) => [n.id, n]));
  const build = (nodes) =>
    nodes.map((n) => {
      const live = byId.get(n.id) || n;
      const { children: _c, ...data } = live;
      const copy = structuredClone(data);
      if (n.children) copy.children = build(n.children);
      return copy;
    });
  return build(shape);
}

// Bounded undo/redo history of binder structure: {past: [{before, after}], future: [...]}.
// Undo is refused (null) when the tree's membership changed since the recorded step
// (e.g. a split or Empty Trash happened in between), so nothing is silently lost.
export const emptyHistory = () => ({ past: [], future: [] });
export function historyPush(h, before, after, limit = 50) {
  if (before === after) return h;
  return { past: [...h.past, { before, after }].slice(-limit), future: [] };
}
export function historyUndo(h, current) {
  const step = h.past[h.past.length - 1];
  if (!step || idSignature(step.after) !== idSignature(current)) return null;
  return { tree: restoreStructure(step.before, current), history: { past: h.past.slice(0, -1), future: [step, ...h.future] } };
}
export function historyRedo(h, current) {
  const step = h.future[0];
  if (!step || idSignature(step.before) !== idSignature(current)) return null;
  return { tree: restoreStructure(step.after, current), history: { past: [...h.past, step], future: h.future.slice(1) } };
}
