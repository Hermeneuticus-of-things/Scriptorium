import { describe, it, expect } from 'vitest';
import { moveToTrash, restoreManyFromTrash, findNode, findParent } from '../src/lib/tree.js';

const tree = () => [
  { id: 'draft', root: 'draft', type: 'folder', children: [
    { id: 'A', type: 'folder', children: [{ id: 'B', type: 'text' }, { id: 'C', type: 'text' }] },
    { id: 'D', type: 'text' },
  ] },
  { id: 'research', root: 'research', type: 'folder', children: [] },
  { id: 'trash', root: 'trash', type: 'folder', children: [] },
];

describe('restoring a selection that holds a trashed folder and its own child', () => {
  it('keeps the child inside its folder whatever the selection order', () => {
    const t = moveToTrash(tree(), 'A');
    const r = restoreManyFromTrash(t, ['B', 'A']);
    expect(findParent(r, 'B').id).toBe('A');
    expect(findParent(r, 'A').id).toBe('draft');
    expect(findNode(r, 'trash').children).toEqual([]);
  });
  it('restores separately trashed items to their places', () => {
    let t = moveToTrash(tree(), 'C');
    t = moveToTrash(t, 'D');
    const r = restoreManyFromTrash(t, ['D', 'C']);
    expect(findParent(r, 'C').id).toBe('A');
    expect(findNode(r, 'draft').children.map((n) => n.id)).toEqual(['A', 'D']);
  });
  it('returns the same tree when nothing is in the trash', () => {
    const t = tree();
    expect(restoreManyFromTrash(t, ['D'])).toBe(t);
  });
});
