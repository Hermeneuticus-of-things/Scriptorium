import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const JSZip = require('jszip');
const store = require('../lib/store.cjs');
const templates = require('../lib/templates.cjs');
const backup = require('../lib/backup.cjs');
const folderSync = require('../lib/folderSync.cjs');
const tc = require('../lib/trackChanges.cjs');
const exporters = require('../lib/exporters.cjs');
const compile = require('../lib/compile.cjs');
const F = require('../lib/compileFormats.cjs');
const { localizeImages, imageExt } = require('../lib/importers.cjs');
const { fileToHtml } = require('../lib/docxImport.cjs');
const ps = require('../lib/printSetup.cjs');

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scribner-d-'));
});
afterEach(() => {
  F.setGlobalFormats([]);
});

const docsOf = (dir) => (id) => {
  try {
    return store.readDoc(dir, id);
  } catch {
    return '';
  }
};

describe('templates', () => {
  it('ships Scrivener-like templates with categories', () => {
    const ids = templates.listTemplates().map((t) => t.id);
    for (const id of ['shortStory', 'screenplay', 'stagePlay', 'essay', 'thesis', 'lectureNotes', 'recipes', 'poetry', 'novelFormatted']) expect(ids).toContain(id);
    const groups = templates.groupTemplates(templates.listTemplates()).map((g) => g.category);
    expect(groups[0]).toBe('Generale');
    expect(groups).toEqual(expect.arrayContaining(['Ficțiune', 'Non-ficțiune', 'Scenariu', 'Poezie']));
  });

  it('creates a screenplay with script elements and a manuscript-format short story', () => {
    const dir = store.projectDirFor(tmp, 'Film');
    const p = store.createProject(dir, 'Film', 'screenplay');
    const scene = p.tree[0].children[0].children[0];
    expect(store.readDoc(dir, scene.id)).toContain('data-script="scene-heading"');
    const dir2 = store.projectDirFor(tmp, 'Povestire');
    const p2 = store.createProject(dir2, 'Povestire', 'shortStory');
    expect(store.readDoc(dir2, p2.tree[0].children[0].id)).toContain('cuvinte');
    const p3 = store.createProject(store.projectDirFor(tmp, 'Teza'), 'Teza', 'thesis');
    expect(p3.tree[1].children.map((n) => n.title)).toContain('Front matter');
  });

  it('saves, lists, instantiates and deletes user templates', () => {
    const src = store.projectDirFor(tmp, 'Sursa');
    const p = store.createProject(src, 'Sursa', 'novel');
    store.takeSnapshot(src, p.tree[0].children[0].children[0].id, 'x');
    const tdir = path.join(tmp, 'templates');
    const info = templates.saveUserTemplate(src, tdir, { title: 'Roman polițist', category: 'Ficțiune', description: 'Cu indicii', icon: '🔍' });
    expect(info.id).toBe('user:roman-politist');
    expect(fs.existsSync(path.join(tdir, 'roman-politist', 'project', 'snapshots'))).toBe(false);
    const again = templates.saveUserTemplate(src, tdir, { title: 'Roman polițist' });
    expect(again.id).toBe('user:roman-politist-2');
    const list = templates.listTemplates(tdir);
    const mine = list.find((t) => t.id === info.id);
    expect(mine).toMatchObject({ name: 'Roman polițist', category: 'Ficțiune', description: 'Cu indicii', icon: '🔍', user: true });
    const dest = path.join(tmp, 'Nou.scribner');
    const created = templates.createFromUserTemplate(tdir, info.id, dest, 'Nou');
    expect(created.title).toBe('Nou');
    expect(store.loadProject(dest).tree[0].children).toHaveLength(3);
    expect(() => templates.createFromUserTemplate(tdir, info.id, dest, 'Nou')).toThrow();
    expect(() => templates.createFromUserTemplate(tdir, 'user:../x', dest, 'X')).toThrow();
    templates.deleteUserTemplate(tdir, info.id);
    expect(templates.listUserTemplates(tdir).map((t) => t.id)).toEqual(['user:roman-politist-2']);
    expect(() => templates.saveUserTemplate(src, tdir, { title: ' ' })).toThrow();
  }, 20000); // many synced (fsync) file writes: slow on a busy disk
});

describe('backup', () => {
  it('unzipped backups rotate, list and restore', async () => {
    const dir = store.projectDirFor(tmp, 'Carte');
    store.createProject(dir, 'Carte', 'novel');
    const bdir = path.join(tmp, 'b');
    for (let i = 0; i < 3; i++) await backup.backupProject(dir, bdir, 2, { zip: false });
    await backup.backupProject(dir, bdir, 2);
    const list = backup.listBackups(dir, bdir);
    expect(list).toHaveLength(2);
    expect(list[0].zipped).toBe(true);
    expect(list[1].zipped).toBe(false);
    expect(list[1].size).toBeGreaterThan(0);
    const restored = await backup.restoreBackup(list[1].file, tmp);
    expect(store.loadProject(restored).title).toBe('Carte');
  });

  it('backs up on open only when enabled', async () => {
    const dir = store.projectDirFor(tmp, 'Carte');
    store.createProject(dir, 'Carte', 'blank');
    const bdir = path.join(tmp, 'b');
    expect(await backup.backupOnOpen(dir, { backupDir: bdir })).toBeNull();
    const file = await backup.backupOnOpen(dir, { backupOnOpen: true, backupDir: bdir, backupZip: false });
    expect(fs.statSync(file).isDirectory()).toBe(true);
    expect(await backup.backupOnOpen(path.join(tmp, 'nu-exista'), { backupOnOpen: true, backupDir: bdir })).toBeNull();
  });
});

describe('folder sync formats', () => {
  const project = {
    title: 'S',
    tree: [
      { id: 'draft', root: 'draft', type: 'folder', children: [{ id: 'a', type: 'text', title: 'Scena' }] },
      { id: 'research', root: 'research', type: 'folder', children: [{ id: 'n', type: 'text', title: 'Notă' }] },
      { id: 'trash', root: 'trash', type: 'folder', children: [] },
    ],
  };
  const docs = { a: '<p data-script="scene-heading">INT. CASĂ - ZI</p><p data-script="action">Ana intră.</p>', n: '<p>O notă</p>' };

  it('writes Fountain drafts and Markdown notes, then reads external Fountain edits', () => {
    const folder = path.join(tmp, 'sync');
    const m = folderSync.syncOut(project, folder, (id) => docs[id], { format: 'rtf', draftFormat: 'fountain', notesFormat: 'md' });
    expect(m.formats).toEqual({ draft: 'fountain', notes: 'md' });
    const draftFile = path.join(folder, m.files.a.file);
    expect(draftFile.endsWith('.fountain')).toBe(true);
    expect(fs.readFileSync(draftFile, 'utf8')).toContain('INT. CASĂ - ZI');
    expect(m.files.n.file.endsWith('.md')).toBe(true);
    fs.writeFileSync(draftFile, 'INT. CASĂ - NOAPTE\n\nAna pleacă.\n');
    const res = folderSync.syncIn(project, folder, (id) => docs[id]);
    expect(res.updates[0].html).toContain('data-style="scene-heading"');
    expect(res.updates[0].html).toContain('Ana pleacă.');
  });

  it('writes FDX and picks up new .fdx files', () => {
    const folder = path.join(tmp, 'sync');
    folderSync.syncOut(project, folder, (id) => docs[id], { format: 'fdx', includeNotes: false });
    const files = fs.readdirSync(path.join(folder, 'Draft'));
    expect(fs.readFileSync(path.join(folder, 'Draft', files[0]), 'utf8')).toContain('<Paragraph Type="Scene Heading">');
    fs.writeFileSync(path.join(folder, 'Draft', '002 Nou.fdx'), '<FinalDraft><Content><Paragraph Type="Action"><Text>Nou</Text></Paragraph></Content></FinalDraft>');
    const res = folderSync.syncIn(project, folder, (id) => docs[id]);
    expect(res.newDocs[0]).toMatchObject({ title: 'Nou', folder: 'draft' });
    expect(() => folderSync.syncOut(project, folder, () => '', { notesFormat: 'pdf' })).toThrow();
  });

  it('reads sync options and auto-sync actions from the project', () => {
    expect(folderSync.syncOptions({ syncFormat: 'md', syncDraftFormat: 'fountain' })).toEqual({ format: 'md', draftFormat: 'fountain', notesFormat: 'md', includeNotes: true });
    expect(folderSync.syncOptions({ syncFormat: 'x' }).format).toBe('rtf');
    expect(folderSync.autoSyncAction({ syncFolder: '/x' }, 'open')).toBeNull();
    expect(folderSync.autoSyncAction({ syncFolder: '/x', syncAuto: true }, 'open')).toBe('in');
    expect(folderSync.autoSyncAction({ syncFolder: '/x', syncAuto: true }, 'close')).toBe('out');
  });
});

describe('track changes', () => {
  const tracked = async () => {
    const project = { title: 'T', author: 'Ana', tree: [{ id: 'draft', root: 'draft', type: 'folder', children: [{ id: 'd', type: 'text', title: 'D' }] }] };
    const html = '<p>Început <span data-revision="2" style="color: red">adăugat</span> mijloc <span data-revision="1"><s>șters</s></span> final.</p>';
    return compile.compileDocx(project, () => html, { trackChanges: true, trackDate: '2026-01-02T03:04:05Z', titlePage: false });
  };

  it('exports revision spans as w:ins / w:del with author and date', async () => {
    const xml = await (await JSZip.loadAsync(await tracked())).file('word/document.xml').async('string');
    expect(xml).toMatch(/<w:ins w:id="\d+" w:author="Ana" w:date="2026-01-02T03:04:05Z"><w:r>(<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t xml:space="preserve">adăugat<\/w:t>/);
    expect(xml).toMatch(/<w:del [^>]*w:author="Ana"[^>]*><w:r>(<w:rPr>[\s\S]*?<\/w:rPr>)?<w:delText xml:space="preserve">șters<\/w:delText>/);
    expect(xml).not.toMatch(/[-]/);
  });

  it('imports w:ins / w:del as revision marks (round trip through a .docx file)', async () => {
    const file = path.join(tmp, 'r.docx');
    fs.writeFileSync(file, await tracked());
    const html = await fileToHtml(file);
    expect(html).toContain('<span data-revision="1">adăugat</span>');
    expect(html).toContain('<span data-revision="1"><s>șters</s></span>');
    expect(html).toContain('Început');
    const plain = await fileToHtml(file, { trackChanges: false });
    expect(plain).not.toContain('șters');
  });

  it('helpers keep tags balanced and strip unknown sentinels', () => {
    const h = tc.sentinelsToRevisionHtml(`<p>a${tc.INS_START}b<strong>c</strong>${tc.INS_END}d</p>`, 3);
    expect(h).toBe('<p>a<span data-revision="3">b</span><strong><span data-revision="3">c</span></strong>d</p>');
    expect(tc.revisionsToSentinels('<p><span data-revision="1">x</span></p>')).toBe(`<p>${tc.INS_START}x${tc.INS_END}</p>`);
    expect(tc.hasTrackedChanges('<w:p><w:ins w:id="1"><w:r/></w:ins></w:p>')).toBe(true);
    expect(tc.stripSentinels(`a${tc.DEL_START}b`)).toBe('ab');
  });

  it('per-document DOCX export can carry track changes; ODT export works', async () => {
    const project = { title: 'P', author: 'Ion', tree: [{ id: 'draft', root: 'draft', type: 'folder', title: 'M', children: [{ id: 'd', type: 'text', title: 'Doc' }] }] };
    const out = path.join(tmp, 'out');
    const read = () => '<p>Text <span data-revision="1">nou</span></p>';
    const r = await exporters.exportDocuments(project, null, read, null, null, out, { format: 'docx', trackChanges: true });
    const xml = await (await JSZip.loadAsync(fs.readFileSync(r.files[0]))).file('word/document.xml').async('string');
    expect(xml).toContain('w:author="Ion"');
    const r2 = await exporters.exportDocuments(project, null, read, null, null, path.join(tmp, 'odt'), { format: 'odt' });
    const odt = r2.files.find((f) => f.endsWith('Doc.odt'));
    expect(odt).toBeTruthy();
    const content = await (await JSZip.loadAsync(fs.readFileSync(odt))).file('content.xml').async('string');
    expect(content).toContain('Text');
    expect(content).toContain('nou');
  });
});

describe('compile: new outputs, global formats, collections, <$img>', () => {
  const project = {
    title: 'Film',
    author: 'Ana Pop',
    collections: [{ id: 'c1', title: 'Alese', ids: ['s2'] }],
    tree: [
      { id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
        { id: 's1', type: 'text', title: 'Scena 1' },
        { id: 's2', type: 'text', title: 'Scena 2' },
      ] },
      { id: 'research', root: 'research', type: 'folder', title: 'Cercetare', children: [
        { id: 'm1', type: 'file', title: 'Harta', media: { file: 'm1.png', mime: 'image/png', name: 'harta.png' } },
      ] },
    ],
  };
  const docs = {
    s1: '<p data-script="scene-heading">INT. CASĂ - ZI</p><p data-script="action">Ana intră.</p>',
    s2: '<p data-script="character">ANA</p><p data-script="dialogue">Bună.</p><p>&lt;$img:Harta&gt;</p>',
  };
  const read = (id) => docs[id] || '';

  it('compiles to Fountain, FDX, LaTeX and print HTML', async () => {
    expect(compile.OUTPUT_FORMATS.fountain.ext).toBe('fountain');
    const fountain = await compile.compile(project, read, 'fountain', {});
    expect(fountain).toContain('Title: Film');
    expect(fountain).toContain('INT. CASĂ - ZI');
    expect(fountain).toContain('ANA');
    const fdx = await compile.compile(project, read, 'fdx', {});
    expect(fdx).toContain('<Paragraph Type="Dialogue"><Text>Bună.</Text></Paragraph>');
    const tex = await compile.compile(project, read, 'tex', {});
    expect(tex).toContain('\\documentclass');
    expect(tex).toContain('Ana intră.');
    const print = await compile.compile(project, read, 'print', {});
    expect(print).toContain('<html');
  });

  it('filters by collection', () => {
    const doc = compile.buildDocument(project, read, { collectionId: 'c1', titlePage: false });
    expect(doc.items.filter((i) => i.kind === 'section').map((i) => i.node.id)).toEqual(['s2']);
    const doc2 = compile.buildDocument(project, read, { collectionIds: ['s1'], titlePage: false });
    expect(doc2.items.filter((i) => i.kind === 'section').map((i) => i.node.id)).toEqual(['s1']);
    expect(compile.collectionFilter(project, {})).toBeNull();
  });

  it('replaces <$img:Name> with the media image', () => {
    const png = Buffer.from('89504e47', 'hex');
    const html = compile.compileHtml(project, read, { readMedia: (file) => (file === 'm1.png' ? { data: png, mime: 'image/png' } : null) });
    expect(html).toContain(`<img src="data:image/png;base64,${png.toString('base64')}" alt="Harta">`);
    const dir = store.projectDirFor(tmp, 'P');
    store.createProject(dir, 'P');
    store.writeMedia(dir, 'm1', 'png', png);
    expect(compile.resolveImagePlaceholders('<p><$img:harta.png></p>', project, { projectDir: dir })).toContain('data:image/png;base64,');
    expect(compile.resolveImagePlaceholders('<p>&lt;$img:Lipsă&gt;</p>', project, { projectDir: dir })).toBe('<p>&lt;$img:Lipsă&gt;</p>');
  });

  it('adds Default and Times/Courier presets and global formats', () => {
    const ids = F.PRESETS.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['implicit', 'times', 'courier']));
    expect(F.findFormat(null, 'courier').typography.fontFamily).toBe('Courier New');
    const g = F.setGlobalFormats([{ id: 'g1', name: 'Al meu', builtin: true, basedOn: 'manuscris' }, { id: 'manuscris' }, null]);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ id: 'g1', global: true });
    expect(g[0].builtin).toBeUndefined();
    expect(F.allFormats({ compile: { formats: [{ id: 'p1', name: 'Proiect' }] } }).map((f) => f.id).slice(-2)).toEqual(['g1', 'p1']);
    const o = compile.resolveOptions({ tree: [] }, { formatId: 'g1' });
    expect(o.format.id).toBe('g1');
  });
});

describe('web page images offline', () => {
  it('downloads images once into media and embeds them', async () => {
    const saved = [];
    const res = await localizeImages('<p><img src="https://x.ro/a/poza.png?v=1" alt="a"><img src="https://x.ro/a/poza.png?v=1"><img src="https://x.ro/rau.png"></p>', {
      fetchImage: async (url) => (url.includes('rau') ? null : { data: Buffer.from('img'), mime: 'image/png' }),
      saveMedia: ({ ext, name }) => {
        saved.push(name);
        return { id: `id${saved.length}`, title: 'poza', file: `id${saved.length}.${ext}`, mime: 'image/png', name };
      },
    });
    expect(saved).toEqual(['poza.png']);
    expect(res.media).toHaveLength(1);
    expect(res.html.match(/data:image\/png;base64,aW1n/g)).toHaveLength(2);
    expect(res.html).toContain('data-media="id1.png"');
    expect(res.html).toContain('src="https://x.ro/rau.png"');
    expect(imageExt('image/jpeg')).toBe('jpg');
    expect(imageExt('', 'https://a/b.GIF')).toBe('gif');
    expect(imageExt('text/html', 'https://a/b')).toBeNull();
  });
});

describe('page setup', () => {
  it('normalizes and builds print CSS / options', () => {
    const s = ps.normalizePageSetup({ size: 'Letter', orientation: 'landscape', margins: { top: 50, left: 'x' }, fontFamily: 'Times New Roman";}' });
    expect(s.margins).toEqual({ top: 10, bottom: 2.5, left: 2.5, right: 2.5 });
    expect(s.fontFamily).toBe('Times New Roman');
    expect(ps.printCss(s)).toContain('@page{size:11in 8.5in;margin:3.937in 0.984in 0.984in 0.984in}');
    expect(ps.pdfPrintOptions(s)).toMatchObject({ pageSize: { width: 11, height: 8.5 }, landscape: false });
    expect(ps.printOptions({ size: 'A4' }).pageSize).toEqual({ width: 210000, height: 297000 });
    expect(ps.printPage('<p>x</p>', 'T<i>')).toContain('<title>Ti></title>');
    expect(ps.normalizePageSetup({ size: 'B9' }).size).toBe('A4');
  });
});

describe('caps and history characters', () => {
  it('maps data-caps to small caps / all caps', async () => {
    const b = compile.parseBlocks('<p><span data-caps="small">a</span><span data-caps="all">b</span></p>');
    expect(b[0].runs[0].sc).toBe(true);
    expect(b[0].runs[1].caps).toBe(true);
    const project = { title: 'T', tree: [{ id: 'draft', root: 'draft', type: 'folder', children: [{ id: 'd', type: 'text', title: 'D' }] }] };
    const html = compile.compileHtml(project, () => '<p>x</p>', {});
    expect(html).toContain('[data-caps="all"]{text-transform:uppercase}');
    const xml = await (await JSZip.loadAsync(await compile.compileDocx(project, () => '<p><span data-caps="all">b</span><span data-caps="small">c</span></p>', {}))).file('word/document.xml').async('string');
    expect(xml).toContain('<w:caps/>');
    expect(xml).toContain('<w:smallCaps/>');
  });

  it('records characters per day, backward compatible', () => {
    const history = require('../lib/history.cjs');
    const d1 = new Date(2026, 0, 1, 10);
    history.recordHistory(tmp, { draft: 10, total: 20 }, d1);
    history.recordHistory(tmp, { draft: 12, total: 22, draftChars: 60, totalChars: 120 }, d1);
    history.recordHistory(tmp, { draft: 15, total: 25, draftChars: 80, totalChars: 150 }, d1);
    const s = history.summarize(history.readHistory(tmp));
    expect(s[0]).toMatchObject({ draft: 5, total: 5, draftChars: 20, totalChars: 30 });
    history.recordHistory(tmp, { draft: 16, total: 26 }, new Date(2026, 0, 2, 10));
    expect(history.summarize(history.readHistory(tmp))[1].draftChars).toBeUndefined();
  });
});
