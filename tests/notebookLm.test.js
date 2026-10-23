import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const nlm = require('../lib/notebookLm.cjs');

const project = {
  title: 'Cartea mea',
  author: 'Ana',
  tree: [
    {
      id: 'draft', root: 'draft', type: 'folder', children: [
        { id: 'c1', type: 'folder', title: 'Capitolul 1', synopsis: 'Începutul.', label: 'Idee', status: 'Revizuit', keywords: ['mare'], children: [
          { id: 's1', type: 'text', title: 'Scena 1', synopsis: 'Ana ajunge.' },
        ] },
        { id: 'c2', type: 'text', title: 'Capitolul 2' },
      ],
    },
    { id: 'research', root: 'research', type: 'folder', children: [{ id: 'r1', type: 'text', title: 'Istoria orașului' }] },
    { id: 'trash', root: 'trash', type: 'folder', children: [{ id: 't1', type: 'text', title: 'Șters' }] },
  ],
};
const docs = {
  'docs/s1': '<p>Ana <em>coboară</em> din tren.</p>',
  'docs/c2': '<p>A doua zi.</p>',
  'notes/s1': '<p>Verifică data.</p>',
  'docs/r1': '<p>Orașul a fost fondat în 1400.</p>',
  'docs/t1': '<p>Nu trebuie exportat.</p>',
};
const readDoc = (id, kind) => docs[`${kind}/${id}`] || '';
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'nlm-'));

describe('notebookLm export', () => {
  it('writes index, one file per chapter, research and notes', () => {
    const out = nlm.exportNotebookLm({ project, readDoc, outDir: tmp() });
    expect(path.basename(out.dir)).toBe('NotebookLM - Cartea mea');
    expect(out.files).toEqual(['00 - Cuprins.md', '01 - Capitolul 1.md', '02 - Capitolul 2.md', 'Cercetare - Istoria orașului.md', 'Note proiect.md']);
    const read = (f) => fs.readFileSync(path.join(out.dir, f), 'utf8');
    expect(read('00 - Cuprins.md')).toContain('- **Capitolul 1** — Începutul.');
    expect(read('00 - Cuprins.md')).toContain('  - **Scena 1** — Ana ajunge.');
    const c1 = read('01 - Capitolul 1.md');
    expect(c1).toContain('# Capitolul 1');
    expect(c1).toContain('## Scena 1');
    expect(c1).toContain('Ana *coboară* din tren.');
    expect(c1).toContain('Etichetă: Idee · Stare: Revizuit · Cuvinte-cheie: mare');
    expect(c1).toContain('> Sinopsis: Ana ajunge.');
    expect(c1).not.toContain('Verifică data');
    expect(read('Note proiect.md')).toContain('## Capitolul 1 / Scena 1');
    expect(fs.readdirSync(out.dir).join()).not.toContain('Șters');
    // re-export replaces old files
    fs.writeFileSync(path.join(out.dir, 'vechi.md'), 'x');
    const again = nlm.exportNotebookLm({ project, readDoc, outDir: path.dirname(out.dir) });
    expect(fs.readdirSync(again.dir)).not.toContain('vechi.md');
  });
  it('options turn off notes, synopses, metadata and research', () => {
    const out = nlm.exportNotebookLm({ project, readDoc, outDir: tmp(), includeNotes: false, includeSynopsis: false, includeMetadata: false, includeResearch: false });
    expect(out.files).toEqual(['00 - Cuprins.md', '01 - Capitolul 1.md', '02 - Capitolul 2.md']);
    const c1 = fs.readFileSync(path.join(out.dir, '01 - Capitolul 1.md'), 'utf8');
    expect(c1).not.toContain('Sinopsis');
    expect(c1).not.toContain('Etichetă');
  });
  it('splits files above the word limit', () => {
    const big = { ...project, tree: [{ id: 'draft', root: 'draft', children: [{ id: 'b', type: 'text', title: 'Lung' }] }] };
    const para = Array.from({ length: 30 }, () => 'cuvânt').join(' ');
    const read = (id, kind) => (kind === 'docs' && id === 'b' ? Array.from({ length: 10 }, () => `<p>${para}</p>`).join('') : '');
    const out = nlm.exportNotebookLm({ project: big, readDoc: read, outDir: tmp(), maxWords: 100 });
    const parts = out.files.filter((f) => f.includes('Lung'));
    expect(parts.length).toBeGreaterThan(2);
    expect(parts[0]).toMatch(/partea 1 din/);
    for (const f of parts) expect(nlm.countWords(fs.readFileSync(path.join(out.dir, f), 'utf8'))).toBeLessThanOrEqual(100);
  });
  it('respects the 50-source limit by merging consecutive chapters', () => {
    const many = { title: 'Mare', tree: [{ id: 'draft', root: 'draft', children: Array.from({ length: 80 }, (_, i) => ({ id: `d${i}`, type: 'text', title: `Cap ${i + 1}` })) }] };
    const read = (id, kind) => (kind === 'docs' ? `<p>Text ${id}</p>` : '');
    const out = nlm.exportNotebookLm({ project: many, readDoc: read, outDir: tmp() });
    expect(out.files.length).toBeLessThanOrEqual(50);
    expect(out.warnings[0]).toMatch(/unite/);
    const all = out.files.map((f) => fs.readFileSync(path.join(out.dir, f), 'utf8')).join('\n');
    expect(all).toContain('Text d0');
    expect(all).toContain('Text d79');
  });
  it('notebookUrl accepts only NotebookLM links', () => {
    expect(nlm.notebookUrl('')).toBe('https://notebooklm.google.com/');
    expect(nlm.notebookUrl('https://notebooklm.google.com/notebook/abc')).toBe('https://notebooklm.google.com/notebook/abc');
    expect(nlm.notebookUrl('javascript:alert(1)')).toBe('https://notebooklm.google.com/');
    expect(nlm.notebookUrl('https://evil.com/notebooklm.google.com')).toBe('https://notebooklm.google.com/');
  });
});
