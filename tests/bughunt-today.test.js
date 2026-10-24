// Regressions found in the bug hunt over the features added on 2026-10-24.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createWebApi, createMemoryKv } from '../src/lib/webApi.js';
import { learnCorrection } from '../src/lib/learnCorrections.js';
import { correctionFor } from '../src/editor/corrections.js';
const require = createRequire(import.meta.url);
const ps = require('../lib/printSetup.cjs');

describe('page setup: margins never swallow the page', () => {
  it('margins wider than the paper are scaled down, leaving a text area', () => {
    const s = ps.normalizePageSetup({ size: 'A5', margins: { top: 10, bottom: 10, left: 10, right: 10 } });
    expect(s.margins.left + s.margins.right).toBeLessThan(14.8 - 1.9);
    expect(s.margins.top + s.margins.bottom).toBeLessThan(21 - 1.9);
    const l = ps.normalizePageSetup({ size: 'A4', orientation: 'landscape', margins: { top: 10, bottom: 10, left: 2, right: 2 } });
    expect(l.margins.top + l.margins.bottom).toBeLessThan(21 - 1.9);
    expect(ps.normalizePageSetup({ size: 'A4' }).margins.top).toBe(2.5);
  });
});

describe('learned corrections keep the case the writer chose', () => {
  it('a proper noun fixed by hand stays capitalized when typed in lower case', () => {
    const list = learnCorrection([], 'bucuresti', 'București');
    const c = correctionFor('in bucuresti', ' ', { replacements: list });
    expect(c.insert).toBe('București ');
    // Capitalized only because it started a sentence: still follows the case typed.
    const l2 = learnCorrection([], 'Teh', 'The');
    expect(correctionFor('so teh', ' ', { replacements: l2 }).insert).toBe('the ');
  });
});

// Minimal FileSystemDirectoryHandle over a real directory.
const nf = () => Object.assign(new Error('nf'), { name: 'NotFoundError' });
function dh(p) {
  return {
    kind: 'directory', name: path.basename(p), _path: p,
    async isSameEntry(o) { return Boolean(o && o._path === p); },
    async getDirectoryHandle(n, { create } = {}) { const q = path.join(p, n); if (!fs.existsSync(q)) { if (!create) throw nf(); fs.mkdirSync(q); } return dh(q); },
    async getFileHandle(n, { create } = {}) { const q = path.join(p, n); if (!fs.existsSync(q)) { if (!create) throw nf(); fs.writeFileSync(q, ''); } return fh(q); },
    async removeEntry(n) { const q = path.join(p, n); if (!fs.existsSync(q)) throw nf(); fs.rmSync(q, { recursive: true }); },
    async *entries() { for (const e of fs.readdirSync(p, { withFileTypes: true })) yield [e.name, e.isDirectory() ? dh(path.join(p, e.name)) : fh(path.join(p, e.name))]; },
  };
}
function fh(q) {
  return {
    kind: 'file', name: path.basename(q),
    async getFile() { const t = fs.readFileSync(q, 'utf8'); return { text: async () => t, lastModified: fs.statSync(q).mtimeMs }; },
    async createWritable() { let b = ''; return { write: async (t) => void (b += t), close: async () => fs.writeFileSync(q, b) }; },
  };
}

function kvWithHandles() {
  const kv = createMemoryKv();
  const raw = new Map();
  const h = (k) => k.startsWith('fh:');
  return { ...kv, get: (k) => (h(k) ? Promise.resolve(raw.get(k)) : kv.get(k)), put: (k, v) => (h(k) ? Promise.resolve(void raw.set(k, v)) : kv.put(k, v)), del: (k) => (h(k) ? Promise.resolve(void raw.delete(k)) : kv.del(k)) };
}

describe('web folder snapshots', () => {
  it('the snapshot returned by takeSnapshot can be renamed and deleted by its file id', async () => {
    const store = require('../lib/store.cjs');
    const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'scr-bh-')), 'C.scribner');
    store.createProject(dir, 'T');
    const api = createWebApi({ kv: kvWithHandles(), channel: null, pickDirectory: async () => dh(dir) });
    const { dir: webDir, project } = await api.openProject();
    const out = [];
    const walk = (ns) => ns.forEach((n) => (n.children?.length ? walk(n.children) : out.push(n)));
    walk(project.tree);
    const doc = out[0];
    const s = await api.takeSnapshot(webDir, doc.id, 'A');
    await api.renameSnapshot(webDir, doc.id, s.file, 'B');
    expect((await api.listSnapshots(webDir, doc.id)).map((x) => x.name)).toEqual(['B']);
    await api.deleteSnapshot(webDir, doc.id, s.file);
    expect(await api.listSnapshots(webDir, doc.id)).toEqual([]);
  });
});
