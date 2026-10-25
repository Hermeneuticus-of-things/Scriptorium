// G4: import with split, OPML with notes, backup options, templates, extended name generator.
import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'module';
import { generateNames, pickByRarity, createRng, CULTURES } from '../src/lib/nameGenerator.js';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const { splitHtml } = require('../lib/docxImport.cjs');
const { webHtmlToText, importWebPage } = require('../lib/importers.cjs');
const exporters = require('../lib/exporters.cjs');
const backup = require('../lib/backup.cjs');
const templates = require('../lib/templates.cjs');

const tmps = [];
const tmp = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'g4-'));
  tmps.push(d);
  return d;
};
afterEach(() => {
  while (tmps.length) fs.rmSync(tmps.pop(), { recursive: true, force: true });
});

describe('import and split', () => {
  const html = '<p>Primul</p><p>text a</p><p>#</p><p>Al doilea</p><p>text b</p>';
  it('splits at the separator', () => {
    const parts = splitHtml(html, 'separator', '#', 'Carte');
    expect(parts.map((p) => p.title)).toEqual(['Carte', 'Carte 2']);
    expect(parts[1].html).toBe('<p>Al doilea</p><p>text b</p>');
  });
  it('first line becomes the title', () => {
    const parts = splitHtml(html, 'separator', '#', 'Carte', { firstLineTitle: true });
    expect(parts).toEqual([
      { title: 'Primul', html: '<p>text a</p>' },
      { title: 'Al doilea', html: '<p>text b</p>' },
    ]);
  });
  it('custom separator and no split', () => {
    expect(splitHtml('<p>a</p><p>***</p><p>b</p>', 'separator', '***', 'X')).toHaveLength(2);
    expect(splitHtml('<p>Titlu</p><p>x</p>', 'none', '#', 'X', { firstLineTitle: true })).toEqual([{ title: 'Titlu', html: '<p>x</p>' }]);
  });
});

describe('web page import', () => {
  const page = '<html><head><title>Pagina</title></head><body><article><h1>Capitol</h1><p>Un <b>text</b> &amp; altul.</p><img src="a.png"></article></body></html>';
  const fetch = async () => ({ ok: true, status: 200, url: 'https://ex.ro/a', text: async () => page });
  it('converts to plain text on request', async () => {
    const r = await importWebPage('https://ex.ro/a', { fetch, asText: true });
    expect(r.title).toBe('Pagina');
    expect(r.html).not.toMatch(/<img|<b>|<h1/);
    expect(r.html).toContain('Un text &amp; altul.');
  });
  it('webHtmlToText keeps paragraphs', () => {
    expect(webHtmlToText('<h2>A</h2><p>b<br>c</p>')).toBe('<p>A</p><p>b c</p>');
  });
});

describe('OPML export', () => {
  const project = { title: 'P', tree: [{ id: 'd', root: 'draft', title: 'Draft', children: [{ id: 'a', title: 'Scena', synopsis: 'Sin' }] }] };
  it('synopsis only by default', () => {
    const x = exporters.exportOpml(project);
    expect(x).toContain('_note="Sin"');
    expect(x).not.toContain('Textul');
  });
  it('includes text as _note when asked', () => {
    const x = exporters.exportOpml(project, { textOf: (n) => (n.id === 'a' ? 'Textul scenei' : '') });
    expect(x).toContain('_note="Sin&#10;&#10;Textul scenei"');
    expect(x).toMatch(/text="Draft"(?! _note)/);
  });
});

describe('backup', () => {
  const mkProject = () => {
    const root = tmp();
    const dir = path.join(root, 'Carte.scribner');
    fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'project.json'), '{}');
    return { root, dir };
  };
  it('throttles the backup on manual save to once a minute per project', () => {
    const due = backup.makeSaveThrottle(60000);
    expect(due('/p/a', 0)).toBe(true);
    expect(due('/p/a', 30000)).toBe(false);
    expect(due('/p/b', 30000)).toBe(true);
    expect(due('/p/a', 60000)).toBe(true);
    expect(due('/p/a', 61000)).toBe(false);
  });
  it('numbered names without the date, rotated to keep N', async () => {
    const { root, dir } = mkProject();
    const bdir = path.join(root, 'b');
    for (let i = 0; i < 4; i++) await backup.backupProject(dir, bdir, 3, { dateInName: false });
    expect(fs.readdirSync(bdir).sort()).toEqual(['Carte backup 0002.zip', 'Carte backup 0003.zip', 'Carte backup 0004.zip']);
    expect(backup.listBackups(dir, bdir)[0].name).toBe('Carte backup 0004.zip');
    const dated = await backup.backupProject(dir, bdir, 3, { zip: false });
    expect(path.basename(dated)).toMatch(/^Carte \d{4}-\d{2}-\d{2}_/);
    expect(fs.readdirSync(bdir)).toHaveLength(3);
    expect(fs.existsSync(dated)).toBe(true);
  });
  it('options from settings and the keep-5 migration', () => {
    expect(backup.backupOptions({})).toEqual({ zip: true, dateInName: true });
    expect(backup.backupOptions({ backupZip: false, backupDateName: false })).toEqual({ zip: false, dateInName: false });
    expect(backup.DEFAULT_KEEP).toBe(5);
    expect(backup.migrateBackupKeep({ recent: [] }, true)).toEqual({ recent: [], backupKeep: 10 });
    expect(backup.migrateBackupKeep({ recent: [] }, false)).toEqual({ recent: [], backupKeep: 5 });
    expect(backup.migrateBackupKeep({ backupKeep: 7 }, true)).toBe(null);
  });
});

describe('templates', () => {
  it('saves without content, exports and imports', () => {
    const root = tmp();
    const proj = path.join(root, 'P.scribner');
    fs.mkdirSync(path.join(proj, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(proj, 'project.json'), JSON.stringify({ title: 'P', tree: [] }));
    fs.writeFileSync(path.join(proj, 'docs', 'a.html'), '<p>secret</p>');
    const tdir = path.join(root, 'templates');
    const t = templates.saveUserTemplate(proj, tdir, { title: 'Roman scurt', category: 'Diverse', includeContent: false });
    expect(t.category).toBe('Diverse');
    expect(fs.readFileSync(path.join(tdir, 'roman-scurt', 'project', 'docs', 'a.html'), 'utf8')).toBe('<p></p>');
    const out = path.join(root, 'out');
    fs.mkdirSync(out);
    const exported = templates.exportUserTemplate(tdir, t.id, out);
    expect(fs.existsSync(path.join(exported, 'template.json'))).toBe(true);
    const imported = templates.importUserTemplate(exported, tdir);
    expect(imported.id).toBe('user:roman-scurt-2');
    expect(templates.listUserTemplates(tdir).map((x) => x.id)).toEqual(['user:roman-scurt', 'user:roman-scurt-2']);
    expect(() => templates.importUserTemplate(out, tdir)).toThrow();
  });
});

describe('name generator options', () => {
  it('separate origins for forenames and surnames', () => {
    const names = generateNames({ firstOrigins: ['fr'], lastOrigins: ['jp', 'hu'], count: 20, seed: 5 });
    expect(names.length).toBe(20);
    for (const n of names) {
      expect([...CULTURES.fr.m, ...CULTURES.fr.f]).toContain(n.first);
      expect(['jp', 'hu']).toContain(n.lastCulture);
    }
  });
  it('rarity follows the list order', () => {
    const list = Array.from({ length: 100 }, (_, i) => i);
    const avg = (k) => {
      const rng = createRng(1);
      let s = 0;
      for (let i = 0; i < 2000; i++) s += pickByRarity(rng, list, k);
      return s / 2000;
    };
    expect(avg(0)).toBeLessThan(25);
    expect(avg(1)).toBeGreaterThan(75);
    expect(Math.abs(avg(0.5) - 50)).toBeLessThan(5);
  });
  it('double surnames, matching initials, gender, count', () => {
    const d = generateNames({ firstOrigins: ['ro'], doubleLast: true, count: 5, seed: 2 });
    for (const n of d) expect(n.last).toMatch(/^[^-]+-[^-]+$/);
    const m = generateNames({ firstOrigins: ['ro', 'en'], matchInitials: true, gender: 'f', count: 6, seed: 9 });
    expect(m.length).toBe(6);
    for (const n of m) {
      expect(n.gender).toBe('f');
      expect(n.first[0]).toBe(n.last[0]);
    }
  });
});
