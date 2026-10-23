// Compile output validity: every format is checked structurally the way a real consumer reads it
// (OOXML packages, ODF, EPUB 3, RTF, Markdown, Fountain, FDX, LaTeX), plus content checks
// (diacritics, real footnotes, TOC = headings, images, links). External validators (epubcheck,
// LibreOffice, pandoc, the OOXML schema validator) run when available and are skipped otherwise.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const { SaxesParser } = require('saxes');
const compile = require('../lib/compile.cjs');
const F = require('../lib/compileFormats.cjs');
const X = require('./fixtures/compileFixture.cjs');

// ------------------------------------------------------------------ helpers

// Strict XML 1.0 + namespaces: throws on malformed XML or unbound prefixes.
function parseXml(xml, name = 'xml') {
  const p = new SaxesParser({ xmlns: true, position: true });
  const errors = [];
  p.on('error', (e) => errors.push(e.message));
  p.write(xml).close();
  if (errors.length) throw new Error(`${name}: ${errors[0]}`);
  return true;
}
const allXmlValid = (files) => Object.entries(files).forEach(([n, x]) => parseXml(x, n));
const decodeXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&');
const norm = (s) => String(s).replace(/\s+/g, ' ').trim().toLocaleLowerCase('ro-RO');
const has = (cmd) => {
  try {
    execFileSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

async function unzip(buf) {
  const zip = await JSZip.loadAsync(buf);
  const out = {};
  for (const n of Object.keys(zip.files)) if (!zip.files[n].dir) out[n] = /\.(xml|rels|xhtml|opf|css|html)$|mimetype$/.test(n) ? await zip.file(n).async('string') : await zip.file(n).async('nodebuffer');
  return { zip, files: out };
}

// The first local file header: name, compression method and extra-field length.
function firstZipEntry(buf) {
  return { method: buf.readUInt16LE(8), name: buf.subarray(30, 30 + buf.readUInt16LE(26)).toString(), extra: buf.readUInt16LE(28) };
}

// RTF: balanced groups (escapes \{ \} \\ ignored), Unicode escapes decoded back to text.
function rtfBalanced(rtf) {
  let depth = 0;
  for (let i = 0; i < rtf.length; i++) {
    const c = rtf[i];
    if (c === '\\') i++;
    else if (c === '{') depth++;
    else if (c === '}' && --depth < 0) return false;
  }
  return depth === 0;
}
function rtfText(rtf) {
  return rtf
    .replace(/\{\\\*\\fldinst[^}]*\}/g, '')
    .replace(/\\pict[^}]*/g, '')
    .replace(/\\u(-?\d+)\?/g, (_, n) => String.fromCharCode(Number(n) < 0 ? Number(n) + 65536 : Number(n)))
    .replace(/\\(par|line|tab|cell)\b ?/g, ' ')
    .replace(/\\[a-z]+-?\d* ?/g, '')
    .replace(/\\([{}\\])/g, '$1')
    .replace(/[{}]/g, '');
}

// ------------------------------------------------------------------ fixtures

const out = {};
const alt = {}; // ebook preset: internal links kept, comments exported, endnotes at the end of the book
const docText = (xml) => decodeXml((xml.match(/<w:t(?: [^>]*)?>[^<]*<\/w:t>|<\/w:p>/g) || []).map((t) => (t === '</w:p>' ? '\n' : t.replace(/<[^>]+>/g, ''))).join(''));

beforeAll(async () => {
  for (const f of X.FORMATS) out[f] = await compile.compile(X.project(), X.read, f, X.options(F, 'manuscris'));
  const o = X.options(F, 'ebook');
  Object.assign(o.format.transforms, { linksToText: false, comments: 'export', notes: 'endnotes-book' });
  for (const f of ['html', 'epub', 'docx', 'odt', 'rtf']) alt[f] = await compile.compile(X.project(), X.read, f, { ...o, format: JSON.parse(JSON.stringify(o.format)) });
}, 30000);

// ------------------------------------------------------------------ parser

describe('parseBlocks: the shared block model', () => {
  it('keeps nested list levels, per-list numbering, tables, images and links', () => {
    const b = compile.parseBlocks(X.DOCS.s1 + X.DOCS.s2 + X.DOCS.s3);
    const li = b.filter((x) => x.type === 'li');
    expect(li.map((x) => `${x.level}${x.list}${x.index || ''}`)).toEqual(['1ul', '2ul', '2ul', '1ul', '1ol1', '1ol2', '2ol1', '1ol3']);
    const t = b.find((x) => x.type === 'table');
    expect(t.rows.map((r) => r.map((c) => c.runs.map((x) => x.text).join('')))).toEqual([['Oraș', 'Populație'], ['Iași', '290.000'], ['Brașov', '250.000']]);
    expect(t.rows[0].every((c) => c.header)).toBe(true);
    const runs = b.flatMap((x) => x.runs);
    expect(runs.find((r) => r.link && r.text === 'site-ul extern').link).toBe('https://example.com/a?b=1&c=2');
    const img = runs.find((r) => r.image).image;
    expect(img).toMatchObject({ mime: 'image/png', ext: 'png', width: 2, height: 2, alt: 'punct roșu' });
  });
  it('drops characters that are invalid in XML', () => {
    const b = compile.parseBlocks('<p>a\u0007b\u000Bc<span data-footnote="x\u0001y"></span></p>');
    expect(b[0].runs[0].text).toBe('abc');
    expect(b[0].runs[1].footnote).toBe('xy');
  });
});

describe('numbering streams', () => {
  it('<$n> continues across layouts that share a title prefix (Capitol / Capitol cu text)', () => {
    expect(out.html).toContain('Capitolul 1</span><br>Plecarea');
    expect(out.html).toContain('Capitolul 2</span><br>Sosirea');
  });
});

// ------------------------------------------------------------------ DOCX

async function checkDocx(buf) {
  const { files } = await unzip(buf);
  allXmlValid(Object.fromEntries(Object.entries(files).filter(([n]) => /\.(xml|rels)$/.test(n))));
  // [Content_Types].xml covers every part
  const ct = files['[Content_Types].xml'];
  const defaults = [...ct.matchAll(/<Default [^>]*Extension="([^"]+)"/g)].map((m) => m[1].toLowerCase());
  const overrides = [...ct.matchAll(/<Override [^>]*PartName="\/([^"]+)"/g)].map((m) => m[1]);
  for (const n of Object.keys(files)) if (n !== '[Content_Types].xml') expect(overrides.includes(n) || defaults.includes(n.split('.').pop().toLowerCase()), `content type for ${n}`).toBe(true);
  // every internal relationship target exists
  for (const [n, xml] of Object.entries(files).filter(([k]) => k.endsWith('.rels'))) {
    const base = n.replace(/_rels\/[^/]*\.rels$/, '');
    for (const m of xml.matchAll(/<Relationship ([^>]*)\/>/g)) {
      if (/TargetMode="External"/.test(m[1])) continue;
      const target = /Target="([^"]+)"/.exec(m[1])[1];
      const full = path.posix.normalize(target.startsWith('/') ? target.slice(1) : base + target);
      expect(files[full], `${n} -> ${full}`).toBeTruthy();
    }
  }
  // settings.xml children in schema order
  const settings = files['word/settings.xml'];
  const order = ['zoom', 'displayBackgroundShape', 'mirrorMargins', 'defaultTabStop', 'evenAndOddHeaders', 'compat'];
  const pos = order.map((n) => settings.indexOf(`<w:${n}`)).filter((i) => i >= 0);
  expect(pos).toEqual([...pos].sort((a, b) => a - b));
  // internal hyperlinks point at bookmarks
  const doc = files['word/document.xml'];
  const marks = new Set([...doc.matchAll(/<w:bookmarkStart [^>]*w:name="([^"]+)"/g)].map((m) => m[1]));
  for (const m of doc.matchAll(/<w:hyperlink [^>]*w:anchor="([^"]+)"/g)) expect(marks.has(m[1]), `bookmark ${m[1]}`).toBe(true);
  for (const m of doc.matchAll(/<w:bookmarkStart [^>]*w:name="([^"]+)"/g)) expect(m[1]).toMatch(/^[A-Za-z][A-Za-z0-9_]*$/);
  return { files, doc, text: docText(doc) };
}

describe('DOCX', () => {
  it('is a consistent OOXML package', async () => {
    const { files, doc, text } = await checkDocx(out.docx);
    for (const s of X.EXPECTED) expect(text).toContain(s);
    // real footnotes (not text): 3 references, 3 notes
    expect((doc.match(/<w:footnoteReference /g) || []).length).toBe(3);
    const notes = docText(files['word/footnotes.xml']);
    for (const s of ['Gara de Nord, București.', 'Notă cu „ghilimele” și &.', 'Notă trei.']) expect(notes).toContain(s);
    // nested lists: level-2 items, a restarted numbered list, a table with a header row
    expect(doc).toMatch(/<w:ilvl w:val="1"\/>/);
    expect(doc).toContain('<w:tbl>');
    expect(doc).toContain('<w:tblHeader');
    // both images embedded, external link kept
    expect(Object.keys(files).filter((n) => n.startsWith('word/media/')).length).toBeGreaterThanOrEqual(1);
    expect((doc.match(/<pic:pic /g) || []).length).toBe(2);
    expect(files['word/_rels/document.xml.rels']).toContain('Target="https://example.com/a?b=1&amp;c=2" TargetMode="External"');
  });
  it('TOC entries are the chapter headings', async () => {
    const { doc } = await checkDocx(out.docx);
    const paras = doc.split('</w:p>').map((p) => decodeXml((p.match(/<w:t(?: [^>]*)?>[^<]*<\/w:t>/g) || []).map((t) => t.replace(/<[^>]+>/g, '')).join(' ')));
    const i = paras.findIndex((p) => p.trim() === 'Cuprins');
    const toc = paras.slice(i + 1, i + 4).map(norm);
    const headings = doc.split('</w:p>').filter((p) => /<w:pStyle w:val="Heading[12]"\/>/.test(p)).map((p) => norm(decodeXml((p.match(/<w:t(?: [^>]*)?>[^<]*<\/w:t>/g) || []).map((t) => t.replace(/<[^>]+>/g, '')).join(' '))));
    expect(toc).toEqual(['partea unu începuturi', 'capitolul 1 plecarea', 'capitolul 2 sosirea']);
    for (const t of toc) expect(headings).toContain(t);
  });
  it('mirrored margins keep settings.xml valid; internal links and comments', async () => {
    await checkDocx(await compile.compileDocx(X.project(), X.read, X.options(F, 'paperback')));
    const { doc, files } = await checkDocx(alt.docx);
    expect(doc).toMatch(/<w:hyperlink [^>]*w:anchor="sec_\d+"/);
    expect(files['word/comments.xml']).toContain('verifică ora');
  });
  it.skipIf(!fs.existsSync(process.env.OOXML_VALIDATE || '/mnt/skills/public/docx/scripts/office/validate.py') || !has('python3'))('passes the OOXML schema validator', () => {
    const script = process.env.OOXML_VALIDATE || '/mnt/skills/public/docx/scripts/office/validate.py';
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docxv-'));
    for (const [n, b] of [['a.docx', out.docx], ['b.docx', alt.docx]]) {
      fs.writeFileSync(path.join(dir, n), b);
      const res = execFileSync('python3', [script, path.join(dir, n)], { cwd: path.dirname(script), encoding: 'utf8' });
      expect(res).toContain('PASSED');
    }
  }, 60000);
});

// ------------------------------------------------------------------ ODT

async function checkOdt(buf) {
  expect(firstZipEntry(buf)).toEqual({ method: 0, name: 'mimetype', extra: 0 });
  const { files } = await unzip(buf);
  expect(files.mimetype).toBe('application/vnd.oasis.opendocument.text');
  allXmlValid(Object.fromEntries(Object.entries(files).filter(([n]) => n.endsWith('.xml'))));
  const manifest = files['META-INF/manifest.xml'];
  const listed = [...manifest.matchAll(/manifest:full-path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== '/');
  for (const p of listed) expect(files[p], `manifest entry ${p}`).toBeTruthy();
  for (const n of Object.keys(files)) if (n !== 'mimetype' && n !== 'META-INF/manifest.xml') expect(listed, `in manifest: ${n}`).toContain(n);
  return files;
}

describe('ODT', () => {
  it('mimetype first and stored, manifest complete, content well-formed', async () => {
    const files = await checkOdt(out.odt);
    const c = files['content.xml'];
    const text = decodeXml(c.replace(/<text:note-citation>[^<]*<\/text:note-citation>/g, '').replace(/<[^>]+>/g, ' '));
    for (const s of X.EXPECTED) expect(text).toContain(s);
    expect((c.match(/text:note-class="footnote"/g) || []).length).toBe(3);
    // nested list lives inside the parent item; table with header row; images in Pictures/
    expect(c).toMatch(/<text:list-item><text:p[^>]*>Mere<\/text:p><text:list /);
    expect(c).toContain('<table:table-header-rows>');
    for (const m of c.matchAll(/xlink:href="(Pictures\/[^"]+)"/g)) expect(files[m[1]]).toBeTruthy();
    expect((c.match(/<draw:image /g) || []).length).toBe(2);
    expect(c).toContain('xlink:href="https://example.com/a?b=1&amp;c=2"');
    // different first page: the first paragraph switches to the header-less master page
    expect(files['styles.xml']).toContain('style:name="First_Page"');
    expect(c).toMatch(/style:master-page-name="First_Page"/);
  });
  it('internal links resolve to bookmarks', async () => {
    const c = (await checkOdt(alt.odt))['content.xml'];
    const marks = new Set([...c.matchAll(/<text:bookmark text:name="([^"]+)"/g)].map((m) => m[1]));
    const links = [...c.matchAll(/xlink:href="#([^"]+)"/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) expect(marks.has(l)).toBe(true);
  });
});

// ------------------------------------------------------------------ EPUB

async function checkEpub(buf) {
  expect(firstZipEntry(buf)).toEqual({ method: 0, name: 'mimetype', extra: 0 });
  const { files } = await unzip(buf);
  expect(files.mimetype).toBe('application/epub+zip');
  parseXml(files['META-INF/container.xml'], 'container.xml');
  const opfPath = /full-path="([^"]+)"/.exec(files['META-INF/container.xml'])[1];
  const opf = files[opfPath];
  parseXml(opf, opfPath);
  const dir = path.posix.dirname(opfPath);
  const items = [...opf.matchAll(/<item ([^>]*)\/>/g)].map((m) => ({ id: /id="([^"]+)"/.exec(m[1])[1], href: /href="([^"]+)"/.exec(m[1])[1], type: /media-type="([^"]+)"/.exec(m[1])[1], props: (/properties="([^"]+)"/.exec(m[1]) || [])[1] || '' }));
  const ids = new Set(items.map((i) => i.id));
  for (const i of items) expect(files[`${dir}/${i.href}`], `manifest ${i.href}`).toBeTruthy();
  for (const n of Object.keys(files)) if (n.startsWith(`${dir}/`) && n !== opfPath) expect(items.map((i) => `${dir}/${i.href}`), `manifested: ${n}`).toContain(n);
  for (const m of opf.matchAll(/<itemref idref="([^"]+)"/g)) expect(ids.has(m[1])).toBe(true);
  expect(items.filter((i) => i.props.includes('nav')).length).toBe(1);
  expect(opf).toMatch(/<meta property="dcterms:modified">\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ<\/meta>/);
  // XHTML well-formed; every relative link and image resolves (file and fragment)
  const xhtml = Object.fromEntries(Object.entries(files).filter(([n]) => n.endsWith('.xhtml')));
  allXmlValid(xhtml);
  const idsIn = Object.fromEntries(Object.entries(xhtml).map(([n, x]) => [n, new Set([...x.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
  for (const [n, x] of Object.entries(xhtml)) {
    for (const m of x.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const ref = m[1];
      if (/^[a-z]+:/i.test(ref) || ref.endsWith('.css')) continue;
      const [file, frag] = ref.split('#');
      const target = file ? path.posix.join(path.posix.dirname(n), file) : n;
      expect(files[target], `${n}: ${ref}`).toBeTruthy();
      if (frag) expect(idsIn[target] && idsIn[target].has(frag), `${n}: #${frag} in ${target}`).toBe(true);
    }
  }
  return { files, xhtml, dir };
}

describe('EPUB', () => {
  it('passes the structural EPUB 3 checks with text, notes, images and a nav that matches the TOC', async () => {
    const { files, xhtml, dir } = await checkEpub(out.epub);
    const all = Object.values(xhtml).join('\n');
    const text = decodeXml(all.replace(/<[^>]+>/g, ' '));
    for (const s of X.EXPECTED) expect(text).toContain(s);
    expect((all.match(/epub:type="noteref"/g) || []).length).toBe(3);
    expect((all.match(/<img src="images\//g) || []).length).toBe(2);
    expect(all).toContain('<table>');
    const nav = files[`${dir}/nav.xhtml`];
    const navTitles = [...nav.matchAll(/<a href="[^"]+">([^<]+)<\/a>/g)].map((m) => norm(decodeXml(m[1])));
    expect(navTitles).toEqual(['partea unu începuturi', 'capitolul 1 plecarea', 'capitolul 2 sosirea']);
  });
  it('book endnotes and internal links across chapter files resolve', async () => {
    const { xhtml } = await checkEpub(alt.epub);
    const all = Object.values(xhtml).join('\n');
    expect(all).toMatch(/href="ch\d+\.xhtml#en1"/);
    expect(all).toMatch(/href="(ch\d+\.xhtml)?#sec-\d+">gara</);
  });
  const jar = process.env.EPUBCHECK_JAR;
  it.skipIf(!(has('epubcheck') || (jar && fs.existsSync(jar) && has('java'))))('passes epubcheck', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'epubv-'));
    for (const [n, b] of [['a.epub', out.epub], ['b.epub', alt.epub]]) {
      const f = path.join(dir, n);
      fs.writeFileSync(f, b);
      const res = jar ? execFileSync('java', ['-jar', jar, f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) : execFileSync('epubcheck', [f], { encoding: 'utf8' });
      expect(res).toContain('No errors or warnings detected');
    }
  }, 120000);
});

// ------------------------------------------------------------------ RTF

describe('RTF', () => {
  it('balanced groups, font/colour tables, Unicode with \\uc1, real footnotes, tables, pictures, links', () => {
    for (const rtf of [out.rtf, alt.rtf]) {
      expect(rtf.startsWith('{\\rtf1\\ansi')).toBe(true);
      expect(rtfBalanced(rtf)).toBe(true);
      expect(rtf).toMatch(/\\uc1\{\\fonttbl\{\\f0[^}]*;\}\{\\f1[^}]*;\}\}\{\\colortbl;[^}]*;\}/);
      // nothing above ASCII is written raw
      expect(/[^\x00-\x7f]/.test(rtf)).toBe(false);
    }
    const text = rtfText(out.rtf);
    for (const s of X.EXPECTED) expect(text).toContain(s);
    expect((out.rtf.match(/\{\\footnote/g) || []).length).toBe(3);
    expect((out.rtf.match(/\\row\b/g) || []).length).toBe(3);
    expect(out.rtf).toContain('\\trhdr');
    expect((out.rtf.match(/\{\\pict\\pngblip/g) || []).length).toBe(2);
    expect(out.rtf).toContain('HYPERLINK "https://example.com/a?b=1&c=2"');
    // nested list item indented one level deeper
    expect(out.rtf).toMatch(/\\li1440[^\n]*Ionatan/);
    const bm = new Set([...alt.rtf.matchAll(/\\bkmkstart ([A-Za-z0-9_]+)\}/g)].map((m) => m[1]));
    const links = [...alt.rtf.matchAll(/HYPERLINK \\\\l "([^"]+)"/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) expect(bm.has(l)).toBe(true);
  });
});

// ------------------------------------------------------------------ HTML / PDF HTML

describe('HTML and print HTML', () => {
  it('anchors resolve, images inline, notes linked both ways', () => {
    for (const html of [out.html, out.pdf, alt.html]) {
      const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
      for (const m of html.matchAll(/href="#([^"]+)"/g)) expect(ids.has(m[1]), `#${m[1]}`).toBe(true);
      expect(html).not.toContain('scribner://');
      expect((html.match(/<img src="data:image\/png;base64,/g) || []).length).toBe(2);
      const text = decodeXml(html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' '));
      for (const s of X.EXPECTED) expect(text).toContain(s);
    }
    expect(out.pdf).toContain('@page{size:8.27in 11.69in');
    expect(alt.html).toMatch(/<a href="#sec-\d+">gara<\/a>/);
  });
});

// ------------------------------------------------------------------ Markdown / text

describe('Markdown, MultiMarkdown, text', () => {
  it('footnote references have definitions, nested lists indent, tables are pipe tables', () => {
    for (const md of [out.md, out.mmd]) {
      const refs = new Set([...md.matchAll(/\[\^(\d+)\](?!:)/g)].map((m) => m[1]));
      const defs = new Set([...md.matchAll(/^\[\^(\d+)\]:/gm)].map((m) => m[1]));
      expect([...refs].sort()).toEqual([...defs].sort());
      expect(refs.size).toBe(3);
      expect(md).toContain('- Mere\n    - Ionatan\n    - Golden\n- Pere');
      expect(md).toContain('1. Primul\n2. Al doilea\n    1. Sub-unu\n3. Al treilea');
      expect(md).toMatch(/\| \*\*Oraș\*\* \| \*\*Populație\*\* \|\n\| --- \| --- \|\n\| Iași \| 290\.000 \|/);
      expect(md).toContain('[site-ul extern](https://example.com/a?b=1&c=2)');
      expect(md).toContain('\\<unghiuri>');
      expect((md.match(/!\[[^\]]*\]\(data:image\/png;base64,/g) || []).length).toBe(2);
      for (const s of X.EXPECTED) expect(md).toContain(s);
    }
    expect(out.mmd.startsWith('Title: ')).toBe(true);
    for (const s of X.EXPECTED) expect(out.txt).toContain(s);
    expect(out.txt).toContain('  • Ionatan');
    expect(out.txt).toContain('Oraș\tPopulație');
    expect(out.txt).toContain('[punct roșu]');
    expect(out.txt).toMatch(/\[3\] Notă trei\./);
  });
  it.skipIf(!has('pandoc'))('pandoc reads Markdown and MultiMarkdown back with all text, notes and the table', () => {
    for (const [src, from] of [[out.md, 'gfm'], [out.mmd, 'markdown_mmd'], [out.md, 'markdown']]) {
      const plain = execFileSync('pandoc', ['-f', from, '-t', 'plain'], { input: src, encoding: 'utf8' });
      for (const s of [...X.EXPECTED, '<unghiuri>', 'Gara de Nord, București.', 'Notă trei.']) expect(plain, `${from}: ${s}`).toContain(s);
      expect(plain).not.toContain('[^');
    }
  });
});

// ------------------------------------------------------------------ scripts

describe('Fountain and Final Draft', () => {
  it('Fountain: title page, sections, notes, escaped action', () => {
    const f = out.fountain;
    expect(f.startsWith('Title: ')).toBe(true);
    expect(f).toMatch(/^# Capitolul 1 Plecarea$/m);
    expect(f).toContain('[[Gara de Nord, București.]]');
    expect(f).toContain('\\_x\\_');
    // action lines never start with an unescaped Fountain marker
    for (const line of f.split('\n').slice(2)) if (line && !/^(# |Title:)/.test(line)) expect(line).not.toMatch(/^([=~>.@^]|\[\[|\/\*)/);
    for (const s of X.EXPECTED) expect(f).toContain(s);
  });
  it('FDX: well-formed XML with known paragraph types', () => {
    parseXml(out.fdx, 'fdx');
    expect(out.fdx).toMatch(/<FinalDraft DocumentType="Script"/);
    for (const m of out.fdx.matchAll(/<Paragraph Type="([^"]+)"/g)) expect(['Scene Heading', 'Action', 'Character', 'Parenthetical', 'Dialogue', 'Transition', 'Shot', 'General', 'Title']).toContain(m[1]);
    const text = decodeXml(out.fdx.replace(/<[^>]+>/g, ''));
    for (const s of X.EXPECTED) expect(text).toContain(s);
  });
});

// ------------------------------------------------------------------ LaTeX

describe('LaTeX', () => {
  it('balanced braces and environments, Romanian letters handled under pdfLaTeX, notes, tables, links', () => {
    const tex = out.tex;
    const body = tex.replace(/\\[{}]/g, '');
    expect((body.match(/\{/g) || []).length).toBe((body.match(/\}/g) || []).length);
    const stack = [];
    for (const m of tex.matchAll(/\\(begin|end)\{([^}]+)\}/g)) {
      if (m[1] === 'begin') stack.push(m[2]);
      else expect(stack.pop()).toBe(m[2]);
    }
    expect(stack).toEqual([]);
    expect(tex).toContain('\\newunicodechar{ș}');
    expect(tex).toContain('\\usepackage{fontspec}');
    expect((tex.match(/\\footnote\{/g) || []).length).toBe(3);
    expect(tex).toContain('\\begin{tabular}{|l|l|}');
    expect(tex).toContain('\\href{https://example.com/a?b=1&c=2}{site-ul extern}');
    expect(tex).toMatch(/\\begin\{itemize\}\n {2}\\item Mere\n {2}\\begin\{itemize\}\n {4}\\item Ionatan/);
    // no unescaped specials in text (outside commands)
    expect(tex).toContain('\\{acolade\\} \\textbackslash{} backslash \\$ 100\\% \\#1 \\_x\\_');
  });
  it.skipIf(!has('pandoc'))('pandoc parses the LaTeX with all text', () => {
    const plain = execFileSync('pandoc', ['-f', 'latex', '-t', 'plain'], { input: out.tex, encoding: 'utf8' });
    for (const s of X.EXPECTED) expect(plain).toContain(s);
  });
  it.skipIf(!has('pdflatex'))('compiles with pdflatex', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'texv-'));
    fs.writeFileSync(path.join(dir, 'b.tex'), out.tex);
    execFileSync('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', 'b.tex'], { cwd: dir, stdio: 'ignore' });
    expect(fs.existsSync(path.join(dir, 'b.pdf'))).toBe(true);
  }, 120000);
});

// ------------------------------------------------------------------ LibreOffice round trip

describe.skipIf(!has('soffice') || !has('pdftotext'))('LibreOffice opens DOCX / ODT / RTF', () => {
  it('converts each to PDF with all text, diacritics and footnotes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lo-'));
    for (const f of ['docx', 'odt', 'rtf']) fs.writeFileSync(path.join(dir, `book-${f}.${f}`), out[f]);
    execFileSync('soffice', [`-env:UserInstallation=file://${dir}/profile`, '--headless', '--convert-to', 'pdf', '--outdir', dir, ...['docx', 'odt', 'rtf'].map((f) => path.join(dir, `book-${f}.${f}`))], { stdio: 'ignore', timeout: 170000 });
    for (const f of ['docx', 'odt', 'rtf']) {
      const pdf = path.join(dir, `book-${f}.pdf`);
      expect(fs.existsSync(pdf), f).toBe(true);
      const text = execFileSync('pdftotext', [pdf, '-'], { encoding: 'utf8' });
      for (const s of [...X.EXPECTED, 'Gara de Nord, București.', 'Notă cu „ghilimele” și &.', 'Capitolul 2']) expect(norm(text), `${f}: ${s}`).toContain(norm(s));
    }
  }, 180000);
});
