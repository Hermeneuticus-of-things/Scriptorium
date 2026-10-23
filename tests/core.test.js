import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const JSZip = require('jszip');
const { rtfToHtml } = require('../lib/rtf.cjs');
const store = require('../lib/store.cjs');
const { importScriv } = require('../lib/scrivImport.cjs');
const compile = require('../lib/compile.cjs');

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scribner-'));
});

describe('rtfToHtml', () => {
  it('converts paragraphs, formatting and Romanian diacritics', () => {
    const rtf = String.raw`{\rtf1\ansi\ansicpg1252{\fonttbl\f0 Georgia;}{\colortbl;\red0\green0\blue0;}
\f0 Prima \b bold\b0  \i ital\i0  frază.\par
Ap\u259?r\u259? \u351?i \'93ghilimele\'94\par
{\*\expandedcolortbl;;}Ultimul}`;
    expect(rtfToHtml(rtf)).toBe(
      '<p>Prima <strong>bold</strong> <em>ital</em> frază.</p><p>Apără şi “ghilimele”</p><p>Ultimul</p>',
    );
  });
  it('escapes HTML and treats plain text as paragraphs', () => {
    expect(rtfToHtml('a < b\nc')).toBe('<p>a &lt; b</p><p>c</p>');
  });
});

describe('store', () => {
  it('creates, saves, snapshots and counts words', () => {
    const dir = store.projectDirFor(tmp, 'Cartea mea');
    const project = store.createProject(dir, 'Cartea mea');
    const id = project.tree[0].children[0].id;
    store.writeDoc(dir, id, 'docs', '<p>Unu doi trei.</p><p>Patru — cinci</p>');
    expect(store.wordCount(store.readDoc(dir, id))).toBe(5);
    store.takeSnapshot(dir, id, 'v1');
    store.writeDoc(dir, id, 'docs', '<p>nou</p>');
    const snaps = store.listSnapshots(dir, id);
    expect(snaps).toHaveLength(1);
    expect(snaps[0].html).toContain('Unu doi trei');
    expect(store.loadProject(dir).title).toBe('Cartea mea');
    expect(() => store.readDoc(dir, '../x')).toThrow();
  });
});

function makeScriv(parent) {
  const scriv = path.join(parent, 'Karma Book.scriv');
  const data = path.join(scriv, 'Files', 'Data');
  const put = (uuid, file, content) => {
    fs.mkdirSync(path.join(data, uuid), { recursive: true });
    fs.writeFileSync(path.join(data, uuid, file), content);
  };
  fs.mkdirSync(scriv, { recursive: true });
  fs.writeFileSync(
    path.join(scriv, 'Karma Book.scrivx'),
    `<?xml version="1.0" encoding="UTF-8"?>
<ScrivenerProject Version="2.0">
 <Binder>
  <BinderItem UUID="D1" Type="DraftFolder"><Title>Manuscript</Title><Children>
    <BinderItem UUID="C1" Type="Folder"><Title>Capitolul 1</Title><MetaData><IncludeInCompile>Yes</IncludeInCompile></MetaData><Children>
      <BinderItem UUID="S1" Type="Text"><Title>Scena 1</Title><MetaData><LabelID>1</LabelID><StatusID>2</StatusID><IncludeInCompile>Yes</IncludeInCompile></MetaData></BinderItem>
      <BinderItem UUID="S2" Type="Text"><Title>Scena 2</Title><MetaData><IncludeInCompile>No</IncludeInCompile></MetaData></BinderItem>
    </Children></BinderItem>
  </Children></BinderItem>
  <BinderItem UUID="R1" Type="ResearchFolder"><Title>Research</Title><Children>
    <BinderItem UUID="N1" Type="Text"><Title>Personaje</Title></BinderItem>
  </Children></BinderItem>
  <BinderItem UUID="T1" Type="TrashFolder"><Title>Trash</Title></BinderItem>
 </Binder>
 <LabelSettings><Labels><Label ID="-1">No Label</Label><Label ID="1" Color="0.1 0.5 0.9">Flashback</Label></Labels></LabelSettings>
 <StatusSettings><StatusItems><Status ID="-1">No Status</Status><Status ID="2">Revised Draft</Status></StatusItems></StatusSettings>
</ScrivenerProject>`,
  );
  put('S1', 'content.rtf', String.raw`{\rtf1\ansi Karma \b este\b0  lege.\par A doua fraz\u259?.}`);
  put('S1', 'synopsis.txt', 'Eroul află adevărul.');
  put('S1', 'notes.rtf', String.raw`{\rtf1\ansi Verifică data.}`);
  put('S2', 'content.rtf', String.raw`{\rtf1\ansi Scenă exclusă.}`);
  put('N1', 'content.rtf', String.raw`{\rtf1\ansi Ana, 30 ani.}`);
  return scriv;
}

describe('importScriv', () => {
  it('imports binder, text, notes, synopsis, labels and status', () => {
    const scriv = makeScriv(tmp);
    const { dir, project, stats } = importScriv(scriv, tmp);
    expect(stats.documents).toBe(3);
    const draft = project.tree[0];
    expect(draft.title).toBe('Manuscript');
    const ch = draft.children[0];
    expect(ch.title).toBe('Capitolul 1');
    const [s1, s2] = ch.children;
    expect(s1.synopsis).toBe('Eroul află adevărul.');
    expect(s1.label).toBe('Flashback');
    expect(s1.status).toBe('Revised Draft');
    expect(s2.includeInCompile).toBe(false);
    expect(store.readDoc(dir, s1.id)).toBe('<p>Karma <strong>este</strong> lege.</p><p>A doua frază.</p>');
    expect(store.readDoc(dir, s1.id, 'notes')).toContain('Verifică data');
    expect(project.tree[1].children[0].title).toBe('Personaje');
    expect(project.labels.find((l) => l.name === 'Flashback').color).toBe('#1a80e6');
    expect(store.loadProject(dir).tree[0].children[0].children).toHaveLength(2);
  });
});

describe('compile', () => {
  function setup() {
    const { dir, project } = importScriv(makeScriv(tmp), tmp);
    return { project, read: (id) => store.readDoc(dir, id) };
  }
  it('builds HTML with chapter headings and excludes items not in compile', () => {
    const { project, read } = setup();
    const html = compile.compileHtml(project, read);
    expect(html).toContain('<h1>Capitolul 1</h1>');
    expect(html).toContain('Karma <strong>este</strong> lege.');
    expect(html).not.toContain('Scenă exclusă');
  });
  it('builds a valid DOCX', async () => {
    const { project, read } = setup();
    const buf = await compile.compileDocx(project, read);
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file('word/document.xml').async('string');
    expect(xml).toContain('Capitolul 1');
    expect(xml).toContain('lege.');
    expect(xml).not.toContain('Scenă exclusă');
  });
  it('builds an EPUB with mimetype first and a nav', async () => {
    const { project, read } = setup();
    const buf = await compile.compileEpub(project, read);
    expect(buf.subarray(30, 38).toString()).toBe('mimetype');
    const zip = await JSZip.loadAsync(buf);
    expect(await zip.file('mimetype').async('string')).toBe('application/epub+zip');
    expect(await zip.file('OEBPS/nav.xhtml').async('string')).toContain('Capitolul 1');
    expect(await zip.file('OEBPS/ch1.xhtml').async('string')).toContain('Karma');
  });
  it('parses inline marks for DOCX', () => {
    const blocks = compile.parseBlocks('<p>a <strong>b <em>c</em></strong> &amp; d</p><h2>T</h2>');
    expect(blocks[0].runs.map((r) => [r.text, r.b, r.i])).toEqual([
      ['a ', false, false],
      ['b ', true, false],
      ['c', true, true],
      [' & d', false, false],
    ]);
    expect(blocks[1].type).toBe('h2');
  });
});
