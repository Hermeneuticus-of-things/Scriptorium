// Data / import / export bug hunt: each case reproduced a real defect before its fix.
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import { buildRegex, findInHtml, replaceInHtml } from '../src/lib/search.js';

const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const JSZip = require('jszip');
const { SaxesParser } = require('saxes');
const store = require('../lib/store.cjs');
const { safeName } = require('../lib/fsNames.cjs');
const { rtfToHtml } = require('../lib/rtf.cjs');
const { importScriv } = require('../lib/scrivImport.cjs');
const importers = require('../lib/importers.cjs');
const { splitHtml } = require('../lib/docxImport.cjs');
const compile = require('../lib/compile.cjs');
const F = require('../lib/compileFormats.cjs');
const X = require('./fixtures/compileFixture.cjs');
const backup = require('../lib/backup.cjs');
const exporters = require('../lib/exporters.cjs');

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-data-'));
});

function xmlErrors(xml) {
  const p = new SaxesParser({ xmlns: true });
  const errors = [];
  p.on('error', (e) => errors.push(e.message));
  p.write(xml).close();
  return errors;
}

describe('project search & replace: numeric character references', () => {
  it('finds and keeps &#8217; / &#x2019; instead of corrupting them to "&amp;#8217;"', () => {
    const { html, count } = replaceInHtml('<p>it&#8217;s x &#x2019;</p>', buildRegex({ query: 'x' }), 'y');
    expect(count).toBe(1);
    expect(html).toBe('<p>it’s y ’</p>');
    expect(findInHtml('<p>it&#8217;s</p>', buildRegex({ query: 'it’s' }))).toHaveLength(1);
  });
});

describe('RTF import', () => {
  it('decodes \\\'XX bytes in the document code page (\\ansicpg1250: Romanian ş ă ţ)', () => {
    expect(rtfToHtml("{\\rtf1\\ansi\\ansicpg1250 \\'baarpe \\'e3 \\'fe\\par}")).toBe('<p>şarpe ă ţ</p>');
    expect(rtfToHtml("{\\rtf1\\ansi\\ansicpg1252 \\'93q\\'94\\par}")).toBe('<p>“q”</p>');
  });
  it('a byte-order mark before {\\rtf does not turn the file into plain text', () => {
    expect(rtfToHtml('﻿{\\rtf1 a\\par}')).toBe('<p>a</p>');
    expect(rtfToHtml('ï»¿{\\rtf1 a\\par}')).toBe('<p>a</p>'); // read as latin1
  });
});

describe('Scrivener import', () => {
  it('decodes character references in .scrivx and strips a BOM from synopsis.txt', () => {
    const scriv = path.join(tmp, 'Test.scriv');
    const data = path.join(scriv, 'Files', 'Data');
    const U = (n) => `BBBBBBBB-0000-0000-0000-${String(n).padStart(12, '0')}`;
    fs.mkdirSync(path.join(data, U(2)), { recursive: true });
    fs.writeFileSync(path.join(data, U(2), 'synopsis.txt'), '﻿sinopsis');
    fs.writeFileSync(path.join(data, U(2), 'content.rtf'), '﻿{\\rtf1\\ansi text\\par}');
    fs.writeFileSync(
      path.join(scriv, 'Test.scrivx'),
      `<?xml version="1.0" encoding="UTF-8"?><ScrivenerProject Version="2.0"><Binder>
<BinderItem UUID="${U(1)}" Type="DraftFolder"><Title>Draft</Title><Children>
 <BinderItem UUID="${U(2)}" Type="Text"><Title>A &amp; B &#8217; &#x1F600;</Title></BinderItem>
</Children></BinderItem></Binder></ScrivenerProject>`,
    );
    const { dir } = importScriv(scriv, tmp, { keepOriginal: false });
    const node = store.loadProject(dir).tree[0].children[0];
    expect(node.title).toBe('A & B ’ 😀');
    expect(node.synopsis).toBe('sinopsis');
    expect(store.readDoc(dir, node.id)).toBe('<p>text</p>');
  });
});

describe('text importers', () => {
  it('UTF-8 BOM (Notepad) does not hide the first Markdown heading', async () => {
    const f = path.join(tmp, 'a.md');
    fs.writeFileSync(f, '﻿# Titlu\r\ntext');
    expect(await importers.fileToHtml(f)).toBe('<h1>Titlu</h1><p>text</p>');
  });
  it('reads UTF-16 ("Unicode") text files and old-Mac CR line ends', async () => {
    const f = path.join(tmp, 'a.txt');
    fs.writeFileSync(f, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('șir\r\nal doilea', 'utf16le')]));
    expect(await importers.fileToHtml(f)).toBe('<p>șir</p><p>al doilea</p>');
    fs.writeFileSync(f, 'unu\rdoi');
    expect(await importers.fileToHtml(f)).toBe('<p>unu</p><p>doi</p>');
  });
  it('Fountain title page is recognised after a BOM', async () => {
    const f = path.join(tmp, 'a.fountain');
    fs.writeFileSync(f, '﻿Title: X\nAuthor: Y\n\nINT. CASA - ZI\n');
    expect(await importers.fileToHtml(f)).toBe('<p data-style="scene-heading">INT. CASA - ZI</p>');
  });
  it('an out-of-range character reference does not abort an OPML import', () => {
    expect(importers.importOpml('<opml><body><outline text="a&#99999999;&#x41;"/></body></opml>')[0].title).toBe('a&#99999999;A');
  });
});

describe('import split', () => {
  it('keeps nested lists and other top-level blocks whole', () => {
    const parts = splitHtml('<h1>A</h1><ul><li>a<ul><li>b</li></ul></li><li>c</li></ul><hr><p>z</p>', 'h1');
    expect(parts).toEqual([{ title: 'A', html: '<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul><hr><p>z</p>' }]);
  });
  it('decodes entities in titles taken from headings', () => {
    expect(splitHtml('<h1>Cap &lt;1&gt; &quot;x&quot; &#39;y&#39;</h1><p>t</p>', 'h1')[0].title).toBe('Cap <1> "x" \'y\'');
  });
});

describe('file names', () => {
  it('truncation never leaves half an emoji (lone surrogate)', () => {
    const s = safeName(`${'a'.repeat(119)}😀b`);
    expect(s).toBe('a'.repeat(119));
    expect(/[\uD800-\uDFFF]/.test(s)).toBe(false);
  });
  it('per-document export treats NFC and NFD spellings as the same file name', async () => {
    const project = { title: 'P', tree: [{ id: 'draft', root: 'draft', type: 'folder', title: 'M', children: [
      { id: 'aaaaaa1', type: 'text', title: 'Café' },
      { id: 'bbbbbb2', type: 'text', title: 'Café'.normalize('NFD') },
    ] }] };
    const out = path.join(tmp, 'out');
    const { files } = await exporters.exportDocuments(project, null, () => '<p>x</p>', () => '', null, out, { format: 'txt' });
    const names = files.map((f) => path.basename(f).normalize('NFC').toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('compile', () => {
  it('a raw ">" inside a footnote / comment attribute does not break DOCX/ODT/RTF parsing', () => {
    const b = compile.parseBlocks('<p>a<span data-footnote="x > y" class="footnote"></span> b <span data-comment="c > d" class="comment">w</span></p>');
    expect(b[0].runs.find((r) => r.footnote !== undefined).footnote).toBe('x > y');
    expect(b[0].runs.filter((r) => r.text).map((r) => r.text).join('')).toBe('a b w');
  });
  it('control characters in project title/author and links still give valid DOCX XML', async () => {
    const p = X.project({ title: 'Titlu\u0001X', author: 'Autor\u000BY' });
    const read = (id) => (id === 's1' ? '<p><a href="https://x.ro/?a=\u0001">l</a><span data-comment="c\u0001" class="comment">w</span><img src="lipsă.png" alt="alt\u0002"></p>' : X.read(id));
    const o = X.options(F, 'ebook');
    o.format.transforms.comments = 'export';
    const zip = await JSZip.loadAsync(await compile.compile(p, read, 'docx', o));
    for (const n of Object.keys(zip.files).filter((k) => /\.(xml|rels)$/.test(k))) {
      expect(xmlErrors(await zip.file(n).async('string')), n).toEqual([]);
    }
  });
  it('EPUB/ODT stay well-formed when alt text contains ">" or the metadata a control character', async () => {
    const p = X.project({ title: 'T\u0001', author: 'A\u0002' });
    const read = (id) => (id === 's1' ? '<p><img src="x.png" alt="a > b &quot;c&quot;"> text</p>' : X.read(id));
    for (const f of ['epub', 'odt']) {
      const zip = await JSZip.loadAsync(await compile.compile(p, read, f, X.options(F, 'ebook')));
      for (const n of Object.keys(zip.files).filter((k) => /\.(xml|xhtml|opf)$/.test(k))) {
        expect(xmlErrors(await zip.file(n).async('string')), `${f} ${n}`).toEqual([]);
      }
    }
  });
});

describe('store & backups', () => {
  it('one damaged snapshot file does not hide the others', () => {
    const dir = path.join(tmp, 'P.scribner');
    store.createProject(dir, 'P');
    const id = store.newId();
    store.writeDoc(dir, id, 'docs', '<p>a</p>');
    store.takeSnapshot(dir, id, 'bun');
    fs.writeFileSync(path.join(dir, 'snapshots', id, '0000-trunchiat.json'), '{"name":"x","ht');
    expect(store.listSnapshots(dir, id).map((s) => s.name)).toEqual(['bun']);
  });
  it('backups do not carry project.json.lock (a restored lock blocks saving)', async () => {
    const dir = path.join(tmp, 'P.scribner');
    store.createProject(dir, 'P');
    fs.writeFileSync(path.join(dir, 'project.json.lock'), 'x');
    const zipFile = await backup.backupProject(dir, path.join(tmp, 'b'));
    const restored = await backup.restoreBackup(zipFile, tmp);
    expect(fs.existsSync(path.join(restored, 'project.json'))).toBe(true);
    expect(fs.existsSync(path.join(restored, 'project.json.lock'))).toBe(false);
    const folder = await backup.backupProject(dir, path.join(tmp, 'c'), 10, { zip: false });
    expect(fs.existsSync(path.join(folder, 'P.scribner', 'project.json.lock'))).toBe(false);
  });
});
