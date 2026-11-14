'use strict';
// Parcurgerea unică a arborelui Binder pentru ambele straturi: main (store.cjs) și renderer
// (src/lib/tree.js re-exportă pentru API-ul ESM existent). Înainte: două clone identice —
// risc de drift la orice schimbare de contract a arborelui.
function walk(nodes, fn, depth = 0, parent = null) {
  for (const n of nodes || []) {
    fn(n, depth, parent);
    if (n.children) walk(n.children, fn, depth + 1, n);
  }
}

function findNode(tree, id) {
  let found = null;
  walk(tree, (n) => {
    if (n.id === id) found = n;
  });
  return found;
}

module.exports = { walk, findNode };
