import { findNode, rootOf } from './tree.js';

// Project Settings > Folders > "Folder for imports" (project.importFolder, P2 2026-10-27).
// Returns the id of the chosen folder when it still exists, can hold children and is not in
// the Trash; otherwise null (unset, deleted, moved to Trash or turned into a plain document).
export function resolveImportFolder(tree, importFolder) {
  if (!importFolder || !Array.isArray(tree)) return null;
  const node = findNode(tree, importFolder);
  if (!node || !Array.isArray(node.children) || node.type === 'file') return null;
  if (rootOf(tree, importFolder)?.root === 'trash') return null;
  return node.id;
}

export function researchFolderId(tree) {
  return (Array.isArray(tree) && tree.find((n) => n.root === 'research')?.id) || null;
}

// Where an import lands: the project's import folder when valid, else `fallbackId`
// (Research for media/web-archive/transcripts, the binder selection for File > Import).
export function importDestination(project, tree = project?.tree, fallbackId = researchFolderId(tree)) {
  return resolveImportFolder(tree, project?.importFolder) || fallbackId || null;
}