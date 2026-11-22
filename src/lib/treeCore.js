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

// Adaptive naming (T4, S3-O.04, aplicația de referință §6.3.1): un document fără titlu se arată după
// sinopsis (primul rând) sau după primele cuvinte din text — doar pentru AFIȘARE; titlul
// stocat rămâne gol până îl scrie autorul.
export function displayTitle(node, docText) {
  const t = String((node && node.title) || '').trim();
  if (t) return t;
  const syn = String((node && node.synopsis) || '').trim();
  if (syn) return syn.split('\n')[0].slice(0, 80);
  const text = String(docText || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text) return text.slice(0, 80);
  return '';
}
