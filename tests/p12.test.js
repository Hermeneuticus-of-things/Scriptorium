// P12: binder menu leftovers, printing per view, script formats, import / export options,
// sharing (sync, mobile, linked files) and project templates.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import {
  setCustomFormats, copyFormat, formatToFile, formatFromFile, getFormat, elementHint, SCRIPT_FORMAT_LIST, ALL_SCRIPT_ELEMENTS,
  normalizeCompletion, setCompletionLists, completeCharacter, completeSceneHeading, completeTransition, scriptStyleMap, paginateDialogue, nextOnTab, nextOnEnter, formatCss,
} from '../src/lib/scriptFormats.js';
import { searchTemplates } from '../src/components/Home.jsx';
import { withPrintDefaults } from '../src/components/PrintPreviewDialog.jsx';
import { sharingDefaults } from '../src/components/SharingPane.jsx';
import { createMockApi } from '../src/lib/mockApi.js';

const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const JSZip = require('jszip');
const templates = require('../lib/templates.cjs');
const ps = require('../lib/printSetup.cjs');
const importers = require('../lib/importers.cjs');
const { splitHtml } = require('../lib/docxImport.cjs');
const exporters = require('../lib/exporters.cjs');
const folderSync = require('../lib/folderSync.cjs');
const store = require('../lib/store.cjs');

let tmp;
beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p12-'));
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('project templates', () => {
  it('ships the equivalent set, each with a description', () => {
    const list = templates.listTemplates();
    const ids = list.map((t) => t.id);
    for (const id of ['novel', 'parts', 'shortStory', 'nonfictionNotes', 'essay', 'thesis', 'screenplay', 'stagePlay', 'comicScript', 'poetry', 'readingList']) expect(ids).toContain(id);
    for (const t of list) expect(t.description, t.id).toBeTruthy();
  });
  it('creates projects from the new templates', () => {
    for (const id of ['nonfictionNotes', 'comicScript', 'readingList']) {
      const dir = path.join(tmp, `tpl-${id}`);
      const p = store.createProject(dir, 'T', id);
      expect(p.tree[0].children.length).toBeGreaterThan(0);
    }
    const dir = path.join(tmp, 'tpl-comicScript');
    const draft = store.loadProject(dir).tree[0];
    const page = draft.children[0].children[0];
    expect(store.readDoc(dir, page.id)).toContain('data-script="panel"');
  });
  it('search matches name, category and description, ignoring diacritics', () => {
    const list = templates.listTemplates();
    expect(templates.searchTemplates(list, 'piesa').map((t) => t.id)).toContain('stagePlay');
    expect(templates.searchTemplates(list, 'note subsol').map((t) => t.id)).toEqual(['nonfictionNotes']);
    expect(searchTemplates(list, 'lectura').map((t) => t.id)).toContain('readingList');
    expect(searchTemplates(list, '').length).toBe(list.length);
  });
  it('the browser demo lists the same templates as the desktop app', async () => {
    const api = createMockApi();
    const mock = await api.listTemplates();
    expect(mock.map((t) => t.id)).toEqual(templates.listTemplates().map((t) => t.id));
  });
});

describe('page setup: print parts', () => {
  it('normalizes scale, mirrored margins, header/footer font and distance, printer and views', () => {
    const s = ps.normalizePageSetup({ scale: 500, mirrorMargins: 1, hfFontFamily: 'Arial";}', hfFontSizePt: 2, headerDistanceCm: 1.2, printer: 'HP', copies: 3, views: { cards: { layout: '4x6', perPage: 99 }, outline: { columns: ['title', 'bogus', 'words'] } } });
    expect(s.scale).toBe(200);
    expect(s.hfFontFamily).toBe('Arial');
    expect(s.hfFontSizePt).toBe(6);
    expect(s.views.cards).toMatchObject({ layout: '4x6', perPage: 12, cutLines: true });
    expect(s.views.outline.columns).toEqual(['title', 'words']);
    expect(ps.toCompilePage(s).mirrored).toBe(true);
    expect(ps.pdfPrintOptions(s).scale).toBe(2);
    expect(ps.printOptions(s)).toMatchObject({ deviceName: 'HP', copies: 3, scaleFactor: 200 });
    const css = ps.printCss(s);
    expect(css).toContain('@top-center{font-family:"Arial"');
    expect(css).toContain('padding-top:1.2cm');
    expect(css).toContain('@page :left');
  });
  it('prints documents with synopsis, notes and metadata', () => {
    const project = { labels: [{ name: 'Idee', color: '#f00' }] };
    const html = ps.documentPrintHtml([{ node: { title: 'Scena', synopsis: 'Pe scurt', label: 'Idee', status: 'Gata' }, html: '<p>Text</p>', notes: '<p>Notă</p>' }], project, { synopsis: true, notes: true, metadata: true });
    expect(html).toContain('<h1 class="print-title">Scena</h1>');
    expect(html).toContain('Pe scurt');
    expect(html).toContain('Notă');
    expect(html).toContain('Idee');
  });
  it('prints corkboard cards per page or as real index cards with cut lines', () => {
    const nodes = [{ title: 'A', synopsis: 'x', label: 'L' }, { title: 'B', synopsis: 'y' }];
    const grid = ps.cardsPrintHtml(nodes, { labels: [{ name: 'L', color: '#0a0' }] }, { perPage: 6 });
    expect(grid).toContain('repeat(3,1fr)');
    expect(grid).toContain('border-top:6px solid #0a0');
    const real = ps.cardsPrintHtml(nodes, {}, { layout: '3x5' });
    expect(real).toContain('width:5in;height:3in');
    expect(real).toContain('dashed');
  });
  it('prints the outline with the chosen columns and the binder items in order', () => {
    const project = { tree: [{ id: 'd', root: 'draft', type: 'folder', children: [{ id: 'f', type: 'folder', title: 'Cap', children: [{ id: 'a', type: 'text', title: 'Sc', synopsis: 's1' }] }] }, { id: 'r', root: 'research', children: [] }] };
    const items = ps.printItems(project, null);
    expect(items.map((i) => [i.node.id, i.depth])).toEqual([['f', 0], ['a', 1]]);
    expect(ps.printItems(project, ['f']).map((i) => i.node.id)).toEqual(['f', 'a']);
    const html = ps.outlinePrintHtml(items.map((i) => ({ ...i, words: 5 })), project, { columns: ['title', 'words'] });
    expect(html).toContain('<th>Titlu</th><th>Cuvinte</th>');
    expect(html).toContain('padding-left:1.2em');
    expect(html).not.toContain('Sinopsis');
  });
  it('the preview dialog fills every print setting', () => {
    const s = withPrintDefaults({ scale: 80, views: { cards: { layout: '3x5' } } });
    expect(s.scale).toBe(80);
    expect(s.views.cards.layout).toBe('3x5');
    expect(s.views.document.titles).toBe(true);
  });
});

describe('script formats', () => {
  it('format editor: a custom format copied from a built-in one works in the registry', () => {
    const f = copyFormat('screenplay', 'Scenariul meu');
    f.elements.push({ id: 'insert', label: 'Insert', upper: true, indentLeft: 10, spaceBefore: 1, bold: true });
    const [clean] = setCustomFormats([{ ...f, tab: { ...f.tab, insert: 'action' }, enter: { ...f.enter, insert: 'action' } }]);
    expect(clean.id).toBe('custom-scenariul-meu');
    expect(getFormat(clean.id).label).toBe('Scenariul meu');
    expect(SCRIPT_FORMAT_LIST.some((x) => x.id === clean.id)).toBe(true);
    expect(ALL_SCRIPT_ELEMENTS).toContain('insert');
    expect(nextOnTab(clean.id, 'insert')).toBe('action');
    expect(nextOnEnter(clean.id, 'character')).toBe('dialogue');
    expect(formatCss(clean.id)).toContain('.script-custom-scenariul-meu p[data-script="insert"]');
    expect(formatCss(clean.id)).toMatch(/insert"\] \{[^}]*margin-left: 10%[^}]*font-weight: bold[^}]*text-transform: uppercase/);
    setCustomFormats([]);
    expect(SCRIPT_FORMAT_LIST.some((x) => x.id === clean.id)).toBe(false);
  });
  it('saves and loads a format file', () => {
    const f = copyFormat('comic', 'BD');
    const back = formatFromFile(formatToFile(f));
    expect(back.label).toBe('BD');
    expect(back.elements.map((e) => e.id)).toEqual(f.elements.map((e) => e.id));
    expect(() => formatFromFile('{"x":1}')).toThrow();
    expect(() => formatFromFile('nu')).toThrow();
    expect(JSON.parse(formatToFile(getFormat('radio'))).format.elements.length).toBe(6);
  });
  it('footer hint: element, Tab and Enter', () => {
    expect(elementHint('screenplay', 'character')).toMatchObject({ label: 'Personaj', tab: 'Tranziție', enter: 'Dialog' });
    expect(elementHint('screenplay', null).element).toBe('action');
  });
  it('editable completion lists feed character, place and transition completion', () => {
    expect(normalizeCompletion({ characters: 'ana\n\nANA\nmihai' }).characters).toEqual(['ANA', 'MIHAI']);
    setCompletionLists({ characters: ['IOANA'], places: ['GARĂ'], transitions: ['CUT TO:'] });
    expect(completeCharacter([], 'io')).toEqual(['IOANA']);
    expect(completeSceneHeading([], 'INT. G')).toContain('INT. GARĂ - ');
    expect(completeTransition('cu')).toEqual(['CUT TO:']);
    setCompletionLists({});
    expect(completeCharacter([], 'io')).toEqual([]);
  });
  it('compile side: element styles and automatic (MORE) / (CONT\'D)', () => {
    const map = scriptStyleMap('screenplay');
    expect(map['scene-heading']).toMatchObject({ style: 'Scene Heading', upper: true });
    const blocks = [{ el: 'action', text: 'a' }, { el: 'character', text: 'ANA' }, { el: 'dialogue', text: 'x' }, { el: 'dialogue', text: 'y' }];
    const out = paginateDialogue(blocks, 3);
    expect(out.map((b) => b.el)).toEqual(['action', 'character', 'dialogue', 'more', 'page-break', 'character', 'dialogue']);
    expect(out[5].text).toBe("ANA (CONT'D)");
    expect(paginateDialogue([{ el: 'action', text: 'a' }, { el: 'action', text: 'b' }], 1).map((b) => b.el)).toEqual(['action', 'page-break', 'action']);
  });
});

describe('import', () => {
  it('converts to the default formatting, keeping alignment and own attributes', () => {
    const html = '<p style="font-family: Arial; text-align: center; font-size: 14pt" class="x"><font face="Times"><span style="color:red">Ok</span></font><span data-footnote="n" class="footnote"></span></p>';
    const out = importers.toDefaultFormatting(html);
    expect(out).toContain('<p style="text-align: center">');
    expect(out).not.toMatch(/Arial|font|color/);
    expect(out).toContain('data-footnote="n"');
  });
  it('Word footnotes become inline or linked notes', () => {
    const html = '<p>Un cuvânt<sup><a href="#footnote-1" id="footnote-ref-1">[1]</a></sup> aici.</p><ol><li id="footnote-1"><p>Nota "unu" <a href="#footnote-ref-1">↑</a></p></li></ol>';
    const inline = importers.docxFootnotes(html, 'inline');
    expect(inline).toBe('<p>Un cuvânt<span data-footnote="Nota &quot;unu&quot;" class="footnote"></span> aici.</p>');
    const linked = importers.docxFootnotes(html, 'linked');
    expect(linked).toContain('<p>Un <span data-linked-footnote="Nota &quot;unu&quot;">cuvânt</span> aici.</p>');
    expect(importers.docxFootnotes('<p>x</p>')).toBe('<p>x</p>');
  });
  it('imports EPUB chapters in reading order', async () => {
    const zip = new JSZip();
    zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>');
    zip.file('OEBPS/content.opf', '<package><manifest><item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="c2.xhtml" media-type="application/xhtml+xml"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/></manifest><spine><itemref idref="c2"/><itemref idref="c1"/></spine></package>');
    zip.file('OEBPS/toc.ncx', '<ncx><navMap><navPoint><navLabel><text>Început</text></navLabel><content src="c2.xhtml"/></navPoint></navMap></ncx>');
    zip.file('OEBPS/c1.xhtml', '<html><body><h2>Doi</h2><p>Al doilea.</p></body></html>');
    zip.file('OEBPS/c2.xhtml', '<html><body><p>Primul.</p></body></html>');
    const file = path.join(tmp, 'carte.epub');
    fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer' }));
    const html = await importers.fileToHtml(file);
    expect(html).toBe('<h1>Început</h1><p>Primul.</p><h1>Doi</h1><p>Al doilea.</p>');
    expect(splitHtml(html, 'h1', '#', 'carte').map((p) => p.title)).toEqual(['Început', 'Doi']);
  });
  it('imports a whole folder with its structure', async () => {
    const root = path.join(tmp, 'Roman');
    fs.mkdirSync(path.join(root, 'Cap 2'), { recursive: true });
    fs.writeFileSync(path.join(root, 'Cap 1.txt'), 'Unu');
    fs.writeFileSync(path.join(root, 'Cap 2', 'Scena.md'), '# T\n\nDoi');
    fs.writeFileSync(path.join(root, 'Cap 2', 'poza.png'), 'png');
    fs.writeFileSync(path.join(root, '.ascuns.txt'), 'x');
    const tree = await importers.importFolder(root);
    expect(tree.title).toBe('Roman');
    expect(tree.children.map((c) => c.title)).toEqual(['Cap 1', 'Cap 2']);
    expect(tree.children[0].html).toBe('<p>Unu</p>');
    expect(tree.children[1].children.map((c) => [c.title, Boolean(c.mediaFile)])).toEqual([['poza', true], ['Scena', false]]);
  });
  it('OPML notes go into the synopsis or the text', () => {
    const xml = '<opml><body><outline text="A" _note="Para 1&#10;&#10;Para 2"/></body></opml>';
    expect(importers.importOpml(xml)[0]).toMatchObject({ synopsis: 'Para 1\n\nPara 2' });
    const t = importers.importOpml(xml, { noteTo: 'text' })[0];
    expect(t.synopsis).toBe('');
    expect(t.html).toBe('<p>Para 1</p><p>Para 2</p>');
  });
  it('split at a separator keeps the separator line as the new title', () => {
    const html = '<p># Capitolul unu</p><p>a</p><p># Capitolul doi</p><p>b</p>';
    expect(splitHtml(html, 'separator', '#', 'F', { separatorTitle: true }).map((p) => p.title)).toEqual(['Capitolul unu', 'Capitolul doi']);
    expect(splitHtml('<p>x</p><p>#</p><p>y</p>', 'separator', '#', 'F').map((p) => p.title)).toEqual(['F', 'F 2']);
  });
  it('lists media formats and accepts EPUB / XHTML as text', () => {
    expect(importers.TEXT_EXTS).toEqual(expect.arrayContaining(['.epub', '.xhtml', '.html']));
    expect(importers.MEDIA_EXTS).toEqual(expect.arrayContaining(['pdf', 'png', 'mp3', 'mhtml']));
  });
});

describe('export', () => {
  const project = () => ({
    title: 'P',
    customFields: ['POV'],
    tree: [{ id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [{ id: 'a1', type: 'text', title: 'Unu', synopsis: 'S', custom: { POV: 'Ana' } }] }],
  });
  it('footnotes and comments as text', () => {
    expect(exporters.notesAsText('<p>X<span data-footnote="n &amp; m" class="footnote"></span> <span data-comment="c">y</span></p>')).toBe('<p>X [n &amp; m] y [Comentariu: c]</p>');
  });
  it('metadata CSV with chosen columns, custom fields included', () => {
    const csv = exporters.exportMetadataCsv(project(), { a1: 7 }, { columns: ['title', 'words', 'custom:POV', 'synopsis', 'bogus'] });
    const lines = csv.replace(/^﻿/, '').trim().split(/\r\n/);
    expect(lines[0]).toBe('title,words,POV,synopsis');
    expect(lines[2]).toBe('Unu,7,Ana,S');
    expect(exporters.exportMetadataCsv(project()).split('\r\n')[0]).toContain('POV');
  });
  it('snapshots as separate files and notes in their own format', async () => {
    const dir = path.join(tmp, 'exp.scribner');
    store.createProject(dir, 'E', 'blank');
    store.writeDoc(dir, 'a1', 'docs', '<p>Acum</p>');
    store.writeDoc(dir, 'a1', 'notes', '<p>Notă</p>');
    store.takeSnapshot(dir, 'a1', 'Prima');
    const out = path.join(tmp, 'exp-out');
    const read = (kind) => (id) => {
      try {
        return store.readDoc(dir, id, kind);
      } catch {
        return '';
      }
    };
    const r = await exporters.exportDocuments(project(), dir, read('docs'), read('notes'), null, out, { format: 'txt', withNotes: true, notesFormat: 'rtf', withSnapshots: true });
    const rel = r.files.map((f) => path.relative(out, f).split(path.sep).join('/')).sort();
    expect(rel).toContain('Manuscris/Unu.txt');
    expect(rel).toContain('Manuscris/Unu.notes.rtf');
    const snap = rel.find((f) => f.startsWith('Manuscris/Unu snapshots/'));
    expect(snap).toMatch(/Prima\.txt$/);
    expect(fs.readFileSync(path.join(out, snap), 'utf8')).toContain('Acum');
  });
});

describe('sharing: sync, mobile, defaults', () => {
  const proj = {
    title: 'S',
    collections: [{ id: 'c1', title: 'De revăzut', ids: ['b'] }],
    tree: [
      { id: 'd', root: 'draft', children: [{ id: 'a', type: 'text', title: 'Alfa' }, { id: 'b', type: 'text', title: 'Beta' }] },
      { id: 'r', root: 'research', children: [{ id: 'n', type: 'text', title: 'Notă' }] },
    ],
  };
  const read = (id) => `<p>${id}</p>`;
  it('without number prefix, only a collection, research optional', () => {
    const folder = path.join(tmp, 'sync1');
    const m = folderSync.syncOut(proj, folder, read, { format: 'txt', prefixNumbers: false, collection: 'c1', includeNotes: false });
    expect(Object.values(m.files).map((f) => f.file)).toEqual(['Draft/Beta.txt']);
    const m2 = folderSync.syncOut(proj, path.join(tmp, 'sync2'), read, { format: 'md', notesFormat: 'txt' });
    expect(Object.values(m2.files).map((f) => f.file).sort()).toEqual(['Draft/001 Alfa.md', 'Draft/002 Beta.md', 'Notes/001 Notă.txt']);
    expect(folderSync.syncOptions({ syncPrefixNumbers: false, syncCollection: 'c1' })).toMatchObject({ prefixNumbers: false, collection: 'c1' });
  });
  it('periodic check reports external changes without writing', () => {
    const folder = path.join(tmp, 'sync3');
    folderSync.syncOut(proj, folder, read, { format: 'txt' });
    expect(folderSync.syncStatus(proj, folder, read)).toEqual({ changed: 0, conflicts: 0, newFiles: 0, missing: 0 });
    fs.writeFileSync(path.join(folder, 'Draft', '001 Alfa.txt'), 'altceva');
    fs.writeFileSync(path.join(folder, 'Draft', 'Nou.txt'), 'nou');
    const before = fs.readFileSync(path.join(folder, folderSync.MANIFEST), 'utf8');
    expect(folderSync.syncStatus(proj, folder, read)).toMatchObject({ changed: 1, newFiles: 1 });
    expect(fs.readFileSync(path.join(folder, folderSync.MANIFEST), 'utf8')).toBe(before);
    expect(folderSync.syncStatus(proj, path.join(tmp, 'nicicand'), read)).toBe(null);
  });
  it('Options > Sharing defaults keep earlier settings', () => {
    const d = sharingDefaults({ sharingSync: { format: 'md' }, sharingImport: { webAs: 'pdf' } });
    expect(d.sync).toMatchObject({ format: 'md', prefixNumbers: true, checkEveryMin: 0 });
    expect(d.import).toMatchObject({ webAs: 'pdf', footnotes: 'inline', opmlNoteTo: 'synopsis' });
    expect(d.export).toMatchObject({ notesAs: 'word', notesFormat: 'md' });
    expect(d.mobile.folder).toBe('');
  });
  it('the new IPC handlers are wired in preload', () => {
    const preload = fs.readFileSync(path.resolve('electron/preload.cjs'), 'utf8');
    for (const k of ['listPrinters', 'importFolder', 'checkLinkedFiles', 'syncStatus', 'mobileSync']) expect(preload).toContain(`  ${k}: `);
    const io = fs.readFileSync(path.resolve('electron/ioHandlers.cjs'), 'utf8');
    for (const k of ['io:listPrinters', 'io:importFolder', 'io:checkLinkedFiles']) expect(io).toContain(`'${k}'`);
    const v04 = fs.readFileSync(path.resolve('electron/v04Handlers.cjs'), 'utf8');
    for (const k of ['v04:syncStatus', 'v04:mobileSync']) expect(v04).toContain(`'${k}'`);
  });
});
