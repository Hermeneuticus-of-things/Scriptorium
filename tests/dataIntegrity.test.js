// Data-integrity hunt: merge fuzz, crash/ENOSPC during saves and backups, snapshot collisions.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'module';
import { mergeProject, mergeTree } from '../src/lib/projectMerge.js';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('../lib/store.cjs');
const backup = require('../lib/backup.cjs');
const bundle = require('../lib/bundle.cjs');

const tmp = (p = 'di-') => fs.mkdtempSync(path.join(os.tmpdir(), p));
afterEach(() => vi.restoreAllMocks());

// Seeded PRNG (mulberry32)
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const TITLES = ['Capitolul 1', 'שלום', 'été', '🦊🔥', 'CON', 'nul.txt', 'x'.repeat(300), '', 'a/b\\c:d'];
function randTree(r, depth = 0, ids = { n: 0 }) {
  const n = Math.floor(r() * (depth > 3 ? 1 : 4));
  return Array.from({ length: n }, () => {
    const node = { id: `n${ids.n++}`, title: TITLES[Math.floor(r() * TITLES.length)], type: r() < 0.4 ? 'folder' : 'text', label: 'Fără' };
    if (node.type === 'folder') node.children = randTree(r, depth + 1, ids);
    return node;
  });
}
const allNodes = (tree, out = []) => { for (const n of tree) { out.push(n); if (n.children) allNodes(n.children, out); } return out; };
function mutate(r, tree) {
  const t = structuredClone(tree);
  const nodes = allNodes(t);
  for (let i = 0; i < 3 && nodes.length; i++) {
    const n = nodes[Math.floor(r() * nodes.length)];
    const op = r();
    if (op < 0.5) n.title = `edit ${Math.floor(r() * 1000)}`;
    else if (op < 0.8) { // move to a random folder (or top) when no cycle
      const folders = allNodes(t).filter((f) => f.children && !allNodes([n]).includes(f));
      const detach = (list) => { const k = list.findIndex((x) => x === n); if (k >= 0) { list.splice(k, 1); return true; } return list.some((x) => x.children && detach(x.children)); };
      detach(t);
      const dest = folders.length && r() < 0.7 ? folders[Math.floor(r() * folders.length)].children : t;
      dest.splice(Math.floor(r() * (dest.length + 1)), 0, n);
    } else {
      const detach = (list) => { const k = list.findIndex((x) => x === n); if (k >= 0) { list.splice(k, 1); return true; } return list.some((x) => x.children && detach(x.children)); };
      detach(t);
    }
  }
  return t;
}

describe('projectMerge fuzz', () => {
  it('merge(base, a, a) == a, merge(base, a, base) == a, merge(base, base, b) == b, no duplicated ids', () => {
    for (let seed = 1; seed <= 400; seed++) {
      const r = rng(seed);
      const base = { format: 1, title: 'P', tree: randTree(r) };
      const a = { ...base, tree: mutate(r, base.tree) };
      const b = { ...base, tree: mutate(r, base.tree) };
      expect(mergeProject(base, a, a)).toEqual(a);
      expect(mergeProject(base, a, base)).toEqual(a);
      expect(mergeProject(base, base, b)).toEqual(b);
      const m = mergeProject(base, a, b);
      const ids = allNodes(m.tree).map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
      // every node edited (title changed) on either side survives
      for (const side of [a, b]) for (const n of allNodes(side.tree)) if (n.title.startsWith('edit ')) expect(ids).toContain(n.id);
    }
  });

  it('crossed moves at the top level (A into B here, B into A there) do not crash or lose nodes', () => {
    const base = [{ id: 'A', title: 'A', children: [] }, { id: 'B', title: 'B', children: [] }];
    const mine = [{ id: 'B', title: 'B', children: [{ id: 'A', title: 'A', children: [] }] }];
    const theirs = [{ id: 'A', title: 'A', children: [{ id: 'B', title: 'B', children: [] }] }];
    const out = mergeTree(base, mine, theirs);
    expect(allNodes(out).map((n) => n.id).sort()).toEqual(['A', 'B']);
  });
});

describe('store crash / disk-full safety', () => {
  it('ENOSPC while writing the temp file leaves the old project.json and no stray .tmp', () => {
    const dir = path.join(tmp(), 'P.scribner');
    const p = store.createProject(dir, 'P');
    const before = fs.readFileSync(path.join(dir, 'project.json'), 'utf8');
    const real = fs.writeFileSync;
    vi.spyOn(fs, 'writeFileSync').mockImplementation((f, d, o) => {
      if (String(f).endsWith('.tmp')) {
        real(f, String(d).slice(0, 10)); // partial write, then disk full
        throw Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' });
      }
      return real(f, d, o);
    });
    expect(() => store.saveProject(dir, { ...p, title: 'Nou' })).toThrow(/ENOSPC/);
    vi.restoreAllMocks();
    expect(fs.readFileSync(path.join(dir, 'project.json'), 'utf8')).toBe(before);
    expect(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });

  it('two snapshots taken in the same millisecond (or with the clock going back) are both kept', () => {
    const dir = path.join(tmp(), 'P.scribner');
    store.createProject(dir, 'P');
    const node = store.newNode('text', 'D');
    store.writeDoc(dir, node.id, 'docs', '<p>v1</p>');
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-01-01T00:00:00.000Z');
    store.takeSnapshot(dir, node.id, 'one');
    store.writeDoc(dir, node.id, 'docs', '<p>v2</p>');
    store.takeSnapshot(dir, node.id, 'two');
    vi.restoreAllMocks();
    const snaps = store.listSnapshots(dir, node.id);
    expect(snaps.map((s) => s.name).sort()).toEqual(['one', 'two']);
  });

  it('ENOSPC while writing a backup zip leaves no truncated backup that rotation would count', async () => {
    const root = tmp();
    const dir = path.join(root, 'P.scribner');
    store.createProject(dir, 'P');
    const dest = path.join(root, 'bk');
    await backup.backupProject(dir, dest, 2);
    const real = fs.writeFileSync;
    vi.spyOn(fs, 'writeFileSync').mockImplementation((f, d, o) => {
      if (String(f).includes(`${path.sep}bk${path.sep}`)) {
        real(f, Buffer.from(d).subarray(0, 5));
        throw Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' });
      }
      return real(f, d, o);
    });
    await expect(backup.backupProject(dir, dest, 2)).rejects.toThrow(/ENOSPC/);
    vi.restoreAllMocks();
    const list = backup.listBackups(dir, dest);
    expect(list).toHaveLength(1);
    const restored = await backup.restoreBackup(list[0].file, root);
    expect(store.loadProject(restored, { readOnly: true }).title).toBe('P');
  });

  it('a bundle with an invalid doc id fails before creating a half-written project', () => {
    const parent = tmp();
    const b = { format: 'scribner-bundle', version: 1, project: { format: 1, title: 'Half', tree: [] }, docs: { ok: '<p>x</p>', '../evil': '<p>y</p>' } };
    expect(() => bundle.importBundle(b, parent)).toThrow();
    expect(fs.readdirSync(parent)).toEqual([]);
  });

  it('a project from a newer format is refused by load and by updateProject without rewriting it', () => {
    const dir = path.join(tmp(), 'P.scribner');
    store.createProject(dir, 'P');
    const raw = JSON.stringify({ format: 99, title: 'Future', tree: [] });
    fs.writeFileSync(path.join(dir, 'project.json'), raw);
    expect(() => store.loadProject(dir)).toThrow();
    expect(() => store.updateProject(dir, (p) => { p.title = 'x'; })).toThrow();
    expect(fs.readFileSync(path.join(dir, 'project.json'), 'utf8')).toBe(raw);
    expect(fs.existsSync(path.join(dir, 'project.json.lock'))).toBe(false);
  });

  it('restoreBackup of an empty or non-zip file fails cleanly', async () => {
    const root = tmp();
    const f = path.join(root, 'P 2026-01-01_00-00-00-000.zip');
    fs.writeFileSync(f, 'not a zip');
    await expect(backup.restoreBackup(f, root)).rejects.toThrow();
    const JSZip = require('jszip');
    fs.writeFileSync(f, await new JSZip().generateAsync({ type: 'nodebuffer' }));
    await expect(backup.restoreBackup(f, root)).rejects.toThrow(/invalid/i);
  });
});

describe('folder backup interrupted', () => {
  it('a copy failing midway leaves no partial folder backup', async () => {
    const root = tmp();
    const dir = path.join(root, 'P.scribner');
    store.createProject(dir, 'P');
    store.writeDoc(dir, 'abc', 'docs', '<p>x</p>');
    const dest = path.join(root, 'bk');
    const real = fs.copyFileSync;
    let n = 0;
    vi.spyOn(fs, 'copyFileSync').mockImplementation((a, b) => {
      if (++n === 2) throw Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' });
      return real(a, b);
    });
    await expect(backup.backupProject(dir, dest, 5, { zip: false })).rejects.toThrow(/ENOSPC/);
    vi.restoreAllMocks();
    expect(fs.readdirSync(dest)).toEqual([]);
  });
});
