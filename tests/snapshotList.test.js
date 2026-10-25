import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { sortSnapshots, toggleSort, selectSnapshot, changeStarts, stepChange, documentsWithSnapshots } from '../src/lib/snapshotList.js';

const require = createRequire(import.meta.url);

describe('store.snapshotCounts', () => {
  it('counts snapshots per document with the newest date, skipping backups', () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const store = require('../lib/store.cjs');
    const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'snapc-')), 'P.scribner');
    store.createProject(dir, 'P');
    const id = store.newId();
    store.writeDoc(dir, id, 'docs', '<p>a</p>');
    store.takeSnapshot(dir, id, 'one');
    const last = store.takeSnapshot(dir, id, 'two');
    fs.mkdirSync(path.join(dir, 'snapshots', '_backup'), { recursive: true });
    const c = store.snapshotCounts(dir);
    expect(Object.keys(c)).toEqual([id]);
    expect(c[id].count).toBe(2);
    expect(Date.parse(c[id].last)).toBe(Date.parse(last.date));
  });
});

const list = [
  { file: 'a', name: 'beta', date: '2026-01-02T00:00:00Z' },
  { file: 'b', name: 'Alfa', date: '2026-03-01T00:00:00Z' },
  { file: 'c', name: 'gama', date: '2026-02-01T00:00:00Z' },
];

describe('snapshot list', () => {
  it('sorts newest first by default, by title on request', () => {
    expect(sortSnapshots(list).map((s) => s.file)).toEqual(['b', 'c', 'a']);
    expect(sortSnapshots(list, 'date', 'asc').map((s) => s.file)).toEqual(['a', 'c', 'b']);
    expect(sortSnapshots(list, 'name', 'asc').map((s) => s.name)).toEqual(['Alfa', 'beta', 'gama']);
    expect(list[0].file).toBe('a'); // not mutated
  });
  it('header click toggles direction', () => {
    expect(toggleSort({ key: 'date', dir: 'desc' }, 'date')).toEqual({ key: 'date', dir: 'asc' });
    expect(toggleSort({ key: 'date', dir: 'desc' }, 'name')).toEqual({ key: 'name', dir: 'asc' });
  });
  it('ctrl+click keeps at most two', () => {
    expect(selectSnapshot(['a'], 'b', false)).toEqual(['b']);
    expect(selectSnapshot(['a'], 'b', true)).toEqual(['a', 'b']);
    expect(selectSnapshot(['a', 'b'], 'c', true)).toEqual(['b', 'c']);
    expect(selectSnapshot(['a', 'b'], 'a', true)).toEqual(['b']);
  });
  it('finds change starts and steps through them with wrap-around', () => {
    const parts = [{ value: 'x' }, { value: 'a', removed: true }, { value: 'b', added: true }, { value: 'y' }, { value: 'c', added: true }];
    expect(changeStarts(parts)).toEqual([1, 4]);
    expect(stepChange(2, -1, 1)).toBe(0);
    expect(stepChange(2, -1, -1)).toBe(1);
    expect(stepChange(2, 1, 1)).toBe(0);
    expect(stepChange(2, 0, -1)).toBe(1);
    expect(stepChange(0, -1, 1)).toBe(-1);
  });
  it('lists documents that have snapshots, newest first', () => {
    const tree = [{ id: 'r', title: 'Draft', children: [{ id: 'x', title: 'X' }, { id: 'y', title: 'Y' }, { id: 'z', title: 'Z' }] }];
    const counts = { x: { count: 2, last: '2026-01-01T00:00:00Z' }, z: { count: 1, last: '2026-05-01T00:00:00Z' } };
    expect(documentsWithSnapshots(tree, counts)).toEqual([
      { id: 'z', title: 'Z', count: 1, last: '2026-05-01T00:00:00Z' },
      { id: 'x', title: 'X', count: 2, last: '2026-01-01T00:00:00Z' },
    ]);
  });
});
