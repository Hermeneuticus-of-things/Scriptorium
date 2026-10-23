import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const JSZip = require('jszip');
const store = require('../lib/store.cjs');
const backup = require('../lib/backup.cjs');
const history = require('../lib/history.cjs');
const { splitHtml, markdownToHtml } = require('../lib/docxImport.cjs');
const compile = require('../lib/compile.cjs');

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scribner-v02-'));
});

describe('templates', () => {
  it('creates a novel with chapters, characters and excluded templates folder', () => {
    const dir = store.projectDirFor(tmp, 'Roman');
    const p = store.createProject(dir, 'Roman', 'novel');
    expect(p.tree[0].children.map((n) => n.title)).toEqual(['Capitolul 1', 'Capitolul 2', 'Capitolul 3']);
    const research = p.tree[1].children.map((n) => n.title);
    expect(research).toContain('Personaje');
    const tpl = p.tree[1].children.find((n) => n.title === 'Șabloane');
    expect(tpl.includeInCompile).toBe(false);
    const hero = p.tree[1].children[0].children[0];
    expect(hero.label).toBe('Personaj');
    expect(store.readDoc(dir, hero.id)).toContain('Ce vrea');
  });
});

describe('backup', () => {
  it('zips, rotates and restores', async () => {
    const dir = store.projectDirFor(tmp, 'Carte');
    const p = store.createProject(dir, 'Carte');
    const id = p.tree[0].children[0].id;
    store.writeDoc(dir, id, 'docs', '<p>text salvat</p>');
    const files = [];
    for (let i = 0; i < 4; i++) files.push(await backup.backupProject(dir, undefined, 3));
    const list = backup.listBackups(dir);
    expect(list).toHaveLength(3);
    expect(fs.existsSync(files[0])).toBe(false);
    const restored = await backup.restoreBackup(list[0].file, tmp);
    expect(store.readDoc(restored, id)).toBe('<p>text salvat</p>');
    expect(store.loadProject(restored).title).toBe('Carte');
  });
});

describe('history', () => {
  it('tracks net words per day and carries counts over days', () => {
    const dir = tmp;
    history.recordHistory(dir, { draft: 100, total: 120 }, new Date(2026, 9, 1, 9));
    history.recordHistory(dir, { draft: 600, total: 700 }, new Date(2026, 9, 1, 22));
    history.recordHistory(dir, { draft: 900, total: 1000 }, new Date(2026, 9, 2, 10));
    const rows = history.summarize(history.readHistory(dir));
    expect(rows).toEqual([
      { date: '2026-10-01', draft: 500, total: 580, draftWords: 600, imported: false },
      { date: '2026-10-02', draft: 300, total: 300, draftWords: 900, imported: false },
    ]);
  });
  it('merges days imported from Scrivener with measured days', () => {
    const dir = tmp;
    fs.writeFileSync(path.join(dir, 'history.json'), JSON.stringify({ days: { '2026-09-30': { draftWritten: 1200, totalWritten: 1300, imported: true } } }));
    history.recordHistory(dir, { draft: 5000, total: 6000 }, new Date(2026, 9, 1, 9));
    history.recordHistory(dir, { draft: 5400, total: 6400 }, new Date(2026, 9, 1, 20));
    const rows = history.summarize(history.readHistory(dir));
    expect(rows[0]).toEqual({ date: '2026-09-30', draft: 1200, total: 1300, draftWords: null, imported: true });
    expect(rows[1]).toEqual({ date: '2026-10-01', draft: 400, total: 400, draftWords: 5400, imported: false });
  });
});

describe('import split', () => {
  const html = '<p>intro</p><h1>Unu</h1><p>a</p><h2>Sub</h2><p>b</p><h1>Doi</h1><p>c</p>';
  it('splits on h1', () => {
    expect(splitHtml(html, 'h1', '#', 'Carte')).toEqual([
      { title: 'Carte', html: '<p>intro</p>' },
      { title: 'Unu', html: '<p>a</p><h2>Sub</h2><p>b</p>' },
      { title: 'Doi', html: '<p>c</p>' },
    ]);
  });
  it('splits on separator and converts markdown', () => {
    const md = markdownToHtml('# Titlu\nPrimul **bold**.\n\n#\nAl doilea *it*.');
    const parts = splitHtml(md, 'separator', '#', 'Fișier');
    expect(parts).toHaveLength(2);
    expect(parts[0].html).toContain('<strong>bold</strong>');
    expect(parts[1].html).toBe('<p>Al doilea <em>it</em>.</p>');
  });
});

describe('footnotes and comments in compile', () => {
  const project = {
    title: 'T',
    author: '',
    tree: [{ id: 'draft', root: 'draft', children: [{ id: 'a', type: 'text', includeInCompile: true, title: 'A' }] }],
  };
  const read = () =>
    '<p>Text <span data-comment="de verificat" class="comment">comentat</span> și notă<span data-footnote="Sursa: arhiva 1902." class="footnote"></span>.</p>';
  it('HTML: numbered note at the end, comment removed', () => {
    const html = compile.compileHtml(project, read);
    expect(html).toContain('Text comentat și notă<sup>');
    expect(html).toContain('Sursa: arhiva 1902.');
    expect(html).not.toContain('de verificat');
  });
  it('DOCX: real footnote', async () => {
    const zip = await JSZip.loadAsync(await compile.compileDocx(project, read));
    expect(await zip.file('word/footnotes.xml').async('string')).toContain('Sursa: arhiva 1902.');
    const doc = await zip.file('word/document.xml').async('string');
    expect(doc).toContain('footnoteReference');
    expect(doc).not.toContain('de verificat');
  });
  it('EPUB: notes per chapter', async () => {
    const zip = await JSZip.loadAsync(await compile.compileEpub(project, read));
    expect(await zip.file('OEBPS/ch1.xhtml').async('string')).toContain('Sursa: arhiva 1902.');
  });
});
