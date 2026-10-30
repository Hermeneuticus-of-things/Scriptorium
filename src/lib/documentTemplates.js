// Document templates (Scrivener 3 §7.5): a project field (`templateFolder`) points at a
// folder whose child documents act as templates. "New from Template" deep-clones one of
// them (children included, fresh ids, same title) into the target container.
// Pure helpers only — document contents (docs/notes) live outside the tree and are
// copied by the caller using the old->new id pairs returned by cloneFromTemplate.

import { findNode, findParent, duplicateNode, moveNode, updateNode } from './tree.js';

// Child documents of the templates folder, in binder order. Empty list when the feature
// is off (no folder set), the folder was deleted, or it has no children.
export function listTemplates(project) {
  const id = project?.templateFolder;
  if (!id) return [];
  const folder = findNode(project?.tree || [], id);
  return folder?.children ? [...folder.children] : [];
}

// Container a new item lands in: the selected folder itself, else the parent of the
// selection, else the first root (Draft). Roots count as containers.
export function templateTargetParent(tree, selectedId) {
  const node = selectedId ? findNode(tree, selectedId) : null;
  if (!node) return tree[0]?.id || null;
  if (node.children) return node.id;
  return findParent(tree, selectedId)?.id ?? tree[0]?.id ?? null;
}

// Deep-clones the template `templateId` into the container `targetParentId` (appended
// last). Returns { tree, newNode, pairs }:
//   tree    — new tree (immutable update), or the original when the clone is refused
//   newNode — the cloned top node (null when the template or target does not exist, or
//             a root was requested — roots cannot be templates)
//   pairs   — [[oldId, newId], …] pre-order, so the caller can copy document contents
// The clone keeps the template's title (no " (copie)" suffix) and all metadata; the top
// node is explicitly included in compile, so instances cloned into the Draft behave like
// ordinary documents (§7.5: the templates folder itself is what stays out of compile).
export function cloneFromTemplate(tree, templateId, targetParentId, { newId = () => crypto.randomUUID() } = {}) {
  const tpl = findNode(tree, templateId);
  const target = targetParentId ? findNode(tree, targetParentId) : null;
  if (!tpl || tpl.root || !target) return { tree, newNode: null, pairs: [] };
  // duplicateNode deep-clones with fresh ids and inserts the copy right after the
  // original, marked " (copie)"; moveNode then relocates it into the target container.
  const dup = duplicateNode(tree, templateId, { withChildren: true, newId });
  const titled = updateNode(dup.tree, dup.id, { title: tpl.title, includeInCompile: true });
  const next = moveNode(titled, dup.id, targetParentId, 'inside');
  return { tree: next, newNode: findNode(next, dup.id) || null, pairs: dup.pairs };
}
