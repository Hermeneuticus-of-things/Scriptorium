import { describe, it, expect } from 'vitest';
import {
  visibleRows, binderNav, typeAhead, rangeIds, keyMoveMany, selectionAfterRemoval,
  emptyHistory, historyPush, historyUndo, historyRedo, restoreStructure, moveNode, moveToTrash, findNode, insertNear,
} from '../src/lib/tree.js';
import { DEFAULT_KEYS, conflicts } from '../src/lib/commands.js';
import { cardNeighbour } from '../src/components/Corkboard.jsx';

const mk = () => [
  { id: 'D', root: 'draft', title: 'Manuscris', children: [
    { id: 'f1', type: 'folder', title: 'Capitol', children: [{ id: 'a', type: 'text', title: 'Alfa' }, { id: 'b', type: 'text', title: 'Beta' }] },
    { id: 'c', type: 'text', title: 'Ceva' },
    { id: 'd', type: 'text', title: 'Dor' },
  ] },
  { id: 'R', root: 'research', title: 'Cercetare', children: [] },
  { id: 'T', root: 'trash', title: 'Coș', children: [] },
];
const ids = (t) => {
  const out = [];
  const w = (ns) => ns.forEach((n) => { out.push(n.id); if (n.children) w(n.children); });
  w(t);
  return out.join(' ');
};

describe('binder keyboard navigation', () => {
  const tree = mk();
  const all = visibleRows(tree, () => true);
  const closed = visibleRows(tree, (n) => n.id !== 'f1');
  it('lists visible rows only', () => {
    expect(all.map((r) => r.id)).toEqual(['D', 'f1', 'a', 'b', 'c', 'd', 'R', 'T']);
    expect(closed.map((r) => r.id)).toEqual(['D', 'f1', 'c', 'd', 'R', 'T']);
    expect(all.find((r) => r.id === 'R').container).toBe(false);
  });
  it('up/down/home/end', () => {
    expect(binderNav(all, 'f1', 'ArrowDown').select).toBe('a');
    expect(binderNav(closed, 'f1', 'ArrowDown').select).toBe('c');
    expect(binderNav(all, 'a', 'ArrowUp').select).toBe('f1');
    expect(binderNav(all, 'D', 'ArrowUp').select).toBe(null);
    expect(binderNav(all, 'c', 'End').select).toBe('T');
    expect(binderNav(all, 'c', 'Home').select).toBe('D');
    expect(binderNav(all, 'missing', 'ArrowDown').select).toBe('D');
  });
  it('left collapses or goes to parent, right expands or enters', () => {
    expect(binderNav(all, 'f1', 'ArrowLeft')).toMatchObject({ collapse: 'f1', select: null });
    expect(binderNav(all, 'a', 'ArrowLeft').select).toBe('f1');
    expect(binderNav(closed, 'f1', 'ArrowRight')).toMatchObject({ expand: 'f1', select: null });
    expect(binderNav(all, 'f1', 'ArrowRight').select).toBe('a');
    expect(binderNav(all, 'c', 'ArrowRight')).toEqual({ select: null, expand: null, collapse: null });
  });
  it('type-ahead and ranges', () => {
    const title = (id) => findNode(tree, id).title;
    expect(typeAhead(all, title, 'D', 'c')).toBe('f1'); // "Capitol" after the current row
    expect(typeAhead(all, title, 'f1', 'c')).toBe('c'); // next match
    expect(typeAhead(all, title, 'f1', 'ce')).toBe('c'); // first match in row order
    expect(typeAhead(all, title, 'D', 'cos')).toBe('T'); // diacritics-insensitive
    expect(typeAhead(all, title, 'D', 'zz')).toBe(null);
    expect(rangeIds(closed, 'd', 'f1')).toEqual(['f1', 'c', 'd']);
  });
});

describe('binder structure moves', () => {
  it('moves a whole selection with Ctrl+arrows keeping its order', () => {
    const t = mk();
    expect(ids(keyMoveMany(t, ['c', 'd'], 'up'))).toBe('D c d f1 a b R T');
    expect(ids(keyMoveMany(t, ['f1', 'c'], 'down'))).toBe('D d f1 a b c R T');
    // blocked first item stops the block from reordering itself
    expect(ids(keyMoveMany(t, ['a', 'b'], 'up'))).toBe(ids(t));
    // children travel with a selected parent
    expect(ids(keyMoveMany(t, ['f1', 'a'], 'down'))).toBe('D c f1 a b d R T');
    expect(ids(keyMoveMany(t, ['c', 'd'], 'indent'))).toBe('D f1 a b c d R T');
  });
  it('outdent keeps order', () => {
    const t = keyMoveMany(mk(), ['a', 'b'], 'outdent');
    expect(findNode(t, 'f1').children).toEqual([]);
    expect(t[0].children.map((n) => n.id)).toEqual(['f1', 'a', 'b', 'c', 'd']);
  });
  it('picks the neighbour after removal', () => {
    const t = mk();
    expect(selectionAfterRemoval(t, ['c'])).toBe('d');
    expect(selectionAfterRemoval(t, ['c', 'd'])).toBe('f1');
    expect(selectionAfterRemoval(t, ['a', 'b'])).toBe('f1');
    expect(selectionAfterRemoval(t, [])).toBe(null);
  });
});

describe('binder undo history', () => {
  it('undoes and redoes a move, keeping later metadata edits', () => {
    const t0 = mk();
    const t1 = moveNode(t0, 'd', 'f1', 'inside');
    let h = historyPush(emptyHistory(), t0, t1);
    const edited = structuredClone(t1);
    findNode(edited, 'd').synopsis = 'nou';
    const u = historyUndo(h, edited);
    expect(ids(u.tree)).toBe(ids(t0));
    expect(findNode(u.tree, 'd').synopsis).toBe('nou');
    h = u.history;
    const r = historyRedo(h, u.tree);
    expect(ids(r.tree)).toBe(ids(t1));
    expect(historyRedo(r.history, r.tree)).toBe(null);
  });
  it('undoes trash and add', () => {
    const t0 = mk();
    const t1 = moveToTrash(t0, 'c');
    expect(ids(historyUndo(historyPush(emptyHistory(), t0, t1), t1).tree)).toBe(ids(t0));
    const t2 = insertNear(t0, 'c', { id: 'n', type: 'text', title: 'Nou' });
    expect(ids(historyUndo(historyPush(emptyHistory(), t0, t2), t2).tree)).toBe(ids(t0));
  });
  it('refuses to undo when membership changed in between (split, empty trash)', () => {
    const t0 = mk();
    const t1 = moveNode(t0, 'd', 'f1', 'inside');
    const h = historyPush(emptyHistory(), t0, t1);
    const split = insertNear(t1, 'a', { id: 'x', type: 'text', title: 'x' });
    expect(historyUndo(h, split)).toBe(null);
    expect(historyPush(h, t1, t1)).toBe(h);
  });
  it('restoreStructure does not mutate inputs', () => {
    const a = mk();
    const b = moveNode(a, 'c', 'f1', 'inside');
    const snap = JSON.stringify(b);
    restoreStructure(a, b);
    expect(JSON.stringify(b)).toBe(snap);
  });
  it('bounds the history', () => {
    let h = emptyHistory();
    for (let i = 0; i < 60; i++) h = historyPush(h, [{ id: String(i) }], [{ id: String(i + 1) }]);
    expect(h.past.length).toBe(50);
  });
});

describe('corkboard keyboard', () => {
  const R = (id, left, top) => ({ id, r: { left, top, width: 100, height: 60 } });
  const rects = [R('a', 0, 0), R('b', 120, 0), R('c', 240, 0), R('d', 0, 100), R('e', 120, 100)];
  it('moves in reading order and by visual rows', () => {
    expect(cardNeighbour(rects, 'c', 'ArrowRight')).toBe('d');
    expect(cardNeighbour(rects, 'd', 'ArrowLeft')).toBe('c');
    expect(cardNeighbour(rects, 'b', 'ArrowDown')).toBe('e');
    expect(cardNeighbour(rects, 'c', 'ArrowDown')).toBe('e');
    expect(cardNeighbour(rects, 'e', 'ArrowUp')).toBe('b');
    expect(cardNeighbour(rects, 'a', 'ArrowUp')).toBe(null);
    expect(cardNeighbour(rects, 'b', 'End')).toBe('e');
  });
});

describe('default shortcuts (Windows)', () => {
  it('match Scrivener for the common commands and do not conflict', () => {
    expect(DEFAULT_KEYS).toMatchObject({
      newText: 'Ctrl+N', newFolder: 'Ctrl+Shift+N', split: 'Ctrl+K', splitTitle: 'Ctrl+Shift+K',
      viewEditor: 'Ctrl+1', viewCorkboard: 'Ctrl+2', viewOutline: 'Ctrl+3', findProject: 'Ctrl+Shift+F',
      compile: 'Ctrl+Shift+E', snapshot: 'Ctrl+5', toggleInspector: 'Ctrl+Shift+I', toggleBinder: 'Ctrl+Shift+B',
      composition: 'F11', duplicate: 'Ctrl+D', targets: 'Ctrl+Shift+T',
    });
    expect(conflicts(Object.keys(DEFAULT_KEYS), {}).size).toBe(0);
    // no default uses Ctrl+Alt+<letter> for show/hide panels (AltGr on European layouts)
    expect(DEFAULT_KEYS.toggleInspector.startsWith('Ctrl+Alt')).toBe(false);
  });
});
