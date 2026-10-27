import { describe, it, expect } from 'vitest';
import { resolveImportFolder, researchFolderId, importDestination } from '../src/lib/importFolder.js';
import { insertNear } from '../src/lib/tree.js';

const tree = () => [
  { id: 'draft', root: 'draft', title: 'Manuscris', children: [{ id: 'ch1', title: 'Cap 1', children: [] }, { id: 'd1', type: 'text', title: 'Doc' }] },
  { id: 'research', root: 'research', title: 'Cercetare', children: [{ id: 'src', type: 'folder', title: 'Surse', children: [] }] },
  { id: 'trash', root: 'trash', title: 'Cos', children: [{ id: 'old', type: 'folder', title: 'Vechi', children: [] }] },
];

describe('P2 importFolder', () => {
  it('uses the chosen folder when it exists', () => {
    expect(resolveImportFolder(tree(), 'src')).toBe('src');
    expect(importDestination({ importFolder: 'src', tree: tree() })).toBe('src');
    expect(importDestination({ importFolder: 'ch1', tree: tree() }, tree(), 'd1')).toBe('ch1');
  });
  it('falls back to Research (Cercetare) when unset', () => {
    expect(researchFolderId(tree())).toBe('research');
    expect(importDestination({ importFolder: null, tree: tree() })).toBe('research');
    expect(importDestination({ tree: tree() })).toBe('research');
  });
  it('falls back safely for a missing, trashed or non-folder target', () => {
    for (const bad of ['gone', 'old', 'trash', 'd1', '', undefined, 42]) {
      expect(importDestination({ importFolder: bad, tree: tree() })).toBe('research');
    }
    expect(importDestination({ importFolder: 'gone', tree: tree() }, tree(), 'd1')).toBe('d1');
  });
  it('never throws on odd input', () => {
    expect(importDestination(null)).toBe(null);
    expect(importDestination({ importFolder: 'src' }, undefined, undefined)).toBe(null);
    expect(resolveImportFolder(null, 'src')).toBe(null);
  });
  it('a renamed folder still resolves (id-based)', () => {
    const t = tree();
    t[1].children[0].title = 'Surse noi';
    expect(importDestination({ importFolder: 'src', tree: t })).toBe('src');
  });
  it('insertNear puts the import inside the resolved folder', () => {
    const t = tree();
    const out = insertNear(t, importDestination({ importFolder: 'src', tree: t }), { id: 'n1', title: 'Nou' });
    expect(out[1].children[0].children.map((n) => n.id)).toEqual(['n1']);
  });
});