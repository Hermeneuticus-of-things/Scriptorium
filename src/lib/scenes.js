// Shared helper for v1.0 analysis views: flat list of manuscript scenes in binder order.
import { htmlToPlain } from './stats.js';

export function isDocNode(n) {
  return !!n && !n.root && n.type !== 'folder' && !(n.children && n.children.length);
}

/** Flat [{node, depth}] of documents under the first tree root (draft), or all non-trash roots. */
export function sceneNodes(project, { scope = 'draft' } = {}) {
  const out = [];
  const walk = (nodes, depth) => {
    for (const n of nodes || []) {
      if (n.root === 'trash') continue;
      if (isDocNode(n)) out.push({ node: n, depth });
      walk(n.children, depth + 1);
    }
  };
  const tree = project?.tree || [];
  walk(scope === 'all' ? tree : tree.slice(0, 1), 0);
  return out;
}

export function scenePlain(docs, id) {
  return htmlToPlain(docs?.[id] || '');
}
