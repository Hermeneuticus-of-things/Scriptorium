// Browser-safe ESM companion of lib/treeCore.cjs.
// The two entry points intentionally expose the same pure contract because Vite cannot
// import named exports from a CommonJS file. Keep changes to walk/findNode mirrored.
export function walk(nodes, fn, depth = 0, parent = null) {
  for (const n of nodes || []) {
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
