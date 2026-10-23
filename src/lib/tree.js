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
    const sel = selectedId ? findNode(t, selectedId) : null;
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
    if (top) copy.title = `${n.title} (copie)`;
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

// Binder order of the given ids.
export function inOrder(tree, ids) {
  const set = new Set(ids);
  return flatten(tree).filter((n) => set.has(n.id));
}
