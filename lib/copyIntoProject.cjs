'use strict';
// Copy To Project (T4, S3-A.DOC.21 / audit ch. 6–7): copie subarborele selectat în ALT proiect,
// cu id-uri noi și fișiere docs/notes copiate. Pur: clonarea structurii; scrierea fișierelor
// o face handler-ul IPC (lib store). Id-urile noi păstrează structura; legăturile [[wiki]]
// și referințele media rămân text — nu se remapează (comportament Scrivener: copie curată).

const crypto = require('crypto');

const newId = () => crypto.randomBytes(9).toString('hex');

/** Clonează un nod (cu copiii) cu id-uri proaspete; întoarce {node, pairs: [[vechi, nou]]}. */
function cloneNode(node) {
  const pairs = [];
  const walk = (n) => {
    const id = newId();
    pairs.push([n.id, id]);
    const copy = { ...n, id, children: undefined };
    if (Array.isArray(n.children) && n.children.length) {
      copy.children = n.children.map(walk);
    } else {
      delete copy.children;
    }
    return copy;
  };
  return { node: walk(node), pairs };
}

/**
 * Clonează selecția pentru proiectul țintă: top-level nodes (cu copiii), fără rădăcini și
 * fără elementele din Coș. `tree` e arborele SURSĂ. Întoarce { nodes, pairs } sau null când
 * nu e nimic de copiat.
 */
function selectionForCopy(tree, ids) {
  const wanted = new Set(ids || []);
  const nodes = [];
  const pairs = [];
  const walk = (list) => {
    for (const n of list || []) {
      if (n.root || wanted.has(n.id)) {
        if (wanted.has(n.id) && !n.root) {
          const c = cloneNode(n);
          nodes.push(c.node);
          pairs.push(...c.pairs);
        }
        if (!wanted.has(n.id)) walk(n.children);
      } else if (Array.isArray(n.children)) {
        walk(n.children);
      }
    }
  };
  walk(tree || []);
  return nodes.length ? { nodes, pairs } : null;
}

/** Așază nodurile copiate în arborele ȚINTĂ: în Draft (sau în primul root non-trash), la final. */
function insertIntoTree(targetTree, nodes) {
  const draft = targetTree.find((r) => r.root === 'draft');
  const host = draft && draft.type === 'folder' ? draft : targetTree.find((r) => r.root !== 'trash') || targetTree[0];
  if (!host) return targetTree;
  host.children = [...(host.children || []), ...nodes];
  return targetTree;
}

module.exports = { cloneNode, selectionForCopy, insertIntoTree, newId };
