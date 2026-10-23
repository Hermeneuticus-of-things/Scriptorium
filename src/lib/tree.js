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
    if (position === 'inside' && target.children) {
      target.children.push(node);
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

export function moveToTrash(tree, id) {
  const trash = tree.find((n) => n.root === 'trash');
  return moveNode(tree, id, trash.id, 'inside');
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

// Binder order of the given ids.
export function inOrder(tree, ids) {
  const set = new Set(ids);
  return flatten(tree).filter((n) => set.has(n.id));
}
