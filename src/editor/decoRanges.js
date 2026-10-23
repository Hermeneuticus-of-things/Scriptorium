// Incremental decoration updates. Plugins that decorate text per text block (invisibles,
// linguistic focus) used to rebuild the whole document's set on every keystroke, which on a
// 50k-word document cost hundreds of ms per key. These helpers map the previous set through
// the transaction and rebuild only the text blocks the transaction touched.

/** Ranges in the new document touched by `tr`'s steps (empty ranges for deletions). */
export function changedRanges(tr) {
  const out = [];
  tr.mapping.maps.forEach((map, i) => {
    const rest = tr.mapping.slice(i + 1);
    map.forEach((_oldFrom, _oldTo, newFrom, newTo) => out.push([rest.map(newFrom, -1), rest.map(newTo, 1)]));
  });
  return out;
}

/** Text blocks of `doc` overlapping or adjacent to `ranges`, as [{node, pos}] without duplicates. */
export function touchedTextblocks(doc, ranges) {
  const seen = new Set();
  const out = [];
  const size = doc.content.size;
  for (const [a, b] of ranges) {
    const from = Math.max(0, Math.min(a, b) - 1);
    const to = Math.min(size, Math.max(a, b) + 1);
    doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isTextblock) return true;
      if (!seen.has(pos)) {
        seen.add(pos);
        out.push({ node, pos });
      }
      return false;
    });
  }
  return out;
}

/**
 * Maps `set` through `tr` and rebuilds the decorations of the touched text blocks with
 * `buildBlock(node, pos)` (which returns an array of decorations for that block).
 */
export function updateBlockDecorations(set, tr, buildBlock) {
  let next = set.map(tr.mapping, tr.doc);
  for (const { node, pos } of touchedTextblocks(tr.doc, changedRanges(tr))) {
    const old = next.find(pos, pos + node.nodeSize);
    if (old.length) next = next.remove(old);
    const decos = buildBlock(node, pos);
    if (decos.length) next = next.add(tr.doc, decos);
  }
  return next;
}
