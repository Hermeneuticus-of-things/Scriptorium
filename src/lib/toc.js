// Static table of contents (Scrivener 3 §22.1–22.2, P1 #28). Pure module, no DOM.
//
// Two helpers:
//   buildTocText(tree, {ids})      — the binder selection as a static ToC text: one line per
//                                    document, tab-indented by binder depth ("Copy Documents as
//                                    ToC"). A selected folder copies its whole subtree (the folder
//                                    first, depth 0); a selected text document copies itself alone.
//                                    Text documents get a tab and the `<$p>` page placeholder after
//                                    the title, so the list pasted into the Draft fills its page
//                                    numbers at compile (evalPagePlaceholders / compile pipeline).
//   evalPagePlaceholders(s, page)  — replaces the `<$p>` page field in a title (or any text) with
//                                    the page number. `<$p:fmt>` resolves only through fmtFn
//                                    (compile passes its number formats); an unknown format stays
//                                    as typed, like every placeholder in lib/placeholders.cjs.
//
// Skipped: trash-rooted nodes, media attachments (they have no page), and nodes not found in the
// tree. Empty titles become "—".

const PAGE_FIELD = /<\$p(?::([^<>]+))?>/g;

/** Title of one line of the copied ToC. */
function lineTitle(n) {
  return String(n.title || '').trim() || '—';
}

/** Collects {node, depth} entries for the selected ids (order and nesting as in the binder). */
function tocRoots(tree, ids = []) {
  const trashNodes = new Set();
  const walk = (nodes, inTrash) => {
    for (const n of nodes || []) {
      if (!n) continue;
      const t = inTrash || n.root === 'trash';
      if (t) trashNodes.add(n);
      walk(n.children, t);
    }
  };
  walk(tree, false);
  const roots = [];
  const add = (n, depth) => {
    if (!n || trashNodes.has(n) || n.media) return;
    roots.push({ node: n, depth });
    for (const c of n.children || []) add(c, depth + 1);
  };
  for (const id of ids) {
    const n = findIn(tree, id);
    if (!n || trashNodes.has(n) || n.media) continue; // trash / media: no page in the output
    if (n.type === 'folder') add(n, 0); // folder → the whole subtree
    else roots.push({ node: n, depth: 0 }); // document → itself alone
  }
  return roots;
}

function findIn(nodes, id) {
  for (const n of nodes || []) {
    if (n.id === id) return n;
    const hit = findIn(n.children, id);
    if (hit) return hit;
  }
  return null;
}

/**
 * The selection as a static ToC text, tab-indented by binder depth.
 * tree: the project tree; ids: selected node ids (binder node or folder — a folder brings its
 * whole subtree). pagePlaceholder=false leaves the titles bare (no `<$p>`).
 */
export function buildTocText(tree, { ids = [], pagePlaceholder = true, indent = '\t' } = {}) {
  const roots = tocRoots(tree, ids);
  const lines = [];
  for (const { node, depth } of roots) {
    const isText = node.type === 'text'; // 'file' nodes are media attachments — no page of their own
    const page = pagePlaceholder && isText ? '<$p>' : '';
    lines.push(`${indent.repeat(depth)}${lineTitle(node)}${page ? `${indent}${page}` : ''}`);
  }
  return lines.join('\n');
}

/**
 * Replaces `<$p>` (and `<$p:fmt>`) with the page number. fmtFn(page, fmt) returns the formatted
 * number or null/undefined to keep the placeholder as typed (compile passes its formatNumber so
 * `<$p:R>` becomes roman; without fmtFn only the bare `<$p>` is replaced).
 */
export function evalPagePlaceholders(text, page, fmtFn = null) {
  if (!text || typeof text !== 'string' || text.indexOf('<$p') < 0) return text;
  return text.replace(PAGE_FIELD, (all, fmt) => {
    if (!fmt) return String(page);
    if (typeof fmtFn !== 'function') return all;
    const v = fmtFn(Number(page), fmt);
    return v == null ? all : String(v);
  });
}
