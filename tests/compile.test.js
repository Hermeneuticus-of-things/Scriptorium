import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const compile = require('../lib/compile.cjs');
const F = require('../lib/compileFormats.cjs');
const { blocksToRtf, rtfEscape } = require('../lib/rtfWriter.cjs');

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function makeProject(extra = {}) {
  return {
    title: 'Drumul',
    author: 'Ion Popescu',
    titleAbbreviation: 'DRUM',
    sectionTypes: [
      { id: 'st1', title: 'Capitol' },
      { id: 'st2', title: 'Scenă' },
      { id: 'st3', title: 'Pagină de titlu' },
    ],
    sectionTypeLevels: { folders: 'st1', containers: null, files: 'st2' },
    tree: [
      {
        id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
          { id: 'c1', type: 'folder', title: 'Plecarea', includeInCompile: true, children: [
            { id: 's1', type: 'text', title: 'Gara', includeInCompile: true, label: 'Idee', status: 'Final' },
            { id: 's2', type: 'text', title: 'Trenul', includeInCompile: true, label: 'Fără', status: 'Prima ciornă' },
          ] },
          { id: 'c2', type: 'folder', title: 'Sosirea', includeInCompile: true, children: [
            { id: 's3', type: 'text', title: 'Peronul', includeInCompile: true, label: 'Idee', status: 'Final' },
            { id: 'sx', type: 'text', title: 'Exclus', includeInCompile: false },
          ] },
        ],
      },
      {
        id: 'research', root: 'research', type: 'folder', title: 'Cercetare', children: [
          { id: 'fm', type: 'folder', title: 'Front', children: [{ id: 'ded', type: 'text', title: 'Dedicație' }] },
          { id: 'bm', type: 'folder', title: 'Back', children: [{ id: 'ack', type: 'text', title: 'Mulțumiri' }] },
          { id: 'img', type: 'file', title: 'Copertă', media: { file: 'img.png', mime: 'image/png' } },
        ],
      },
    ],
    ...extra,
  };
}

const DOCS = {
  c1: '',
  c2: '',
  s1: '<p>Era "noapte" -- iar trenul <span data-comment="verifică" class="comment">întârzia</span>.<span data-footnote="Gara de Nord." class="footnote"></span></p><p>Capitolul &lt;$n:roman&gt; are &lt;$wc&gt; cuvinte; &lt;$necunoscut&gt;.</p>',
  s2: '<p>Pisica <a href="scribner://doc/s1">vedea</a> o pisică.<span data-annotation="de rescris"></span></p>',
  s3: `<p>Sfârșit <img src="data:image/png;base64,${PNG}"> aici.<span data-footnote="Notă doi." class="footnote"></span></p>`,
  sx: '<p>Text exclus</p>',
  ded: '<p>Pentru mama.</p>',
  ack: '<p>Mulțumesc tuturor.</p>',
};
const read = (id) => DOCS[id] || '';
const fmt = (id, patch = {}) => ({ ...JSON.parse(JSON.stringify(F.PRESETS.find((p) => p.id === id))), ...patch });

describe('compile formats', () => {
  it('ships the Romanian presets', () => {
    expect(F.PRESETS.map((p) => p.name)).toEqual(['Manuscris standard', 'Carte tipărită (paperback)', 'E-book', 'Modern', 'Citire PDF A5', 'Implicit (Default)', 'Times New Roman (dublu spațiat)', 'Courier (manuscris clasic)', 'Roman cu părți numerotate', 'Non-ficțiune', 'Povestire', 'Scenariu de film', 'Piesă de teatru', 'Scenariu de bandă desenată', 'Scenariu radio', 'Poezie', 'E-book ficțiune', 'Exemplar de corectură']);
    const ms = F.PRESETS[0];
    expect(ms.typography).toMatchObject({ fontFamily: 'Times New Roman', fontSizePt: 12, lineSpacing: 2 });
    expect(ms.separators.sameType.text).toBe('#');
    expect(ms.page.header.right).toContain('<$p>');
    const pb = F.PRESETS[1];
    expect(pb.page).toMatchObject({ size: '6x9', mirrored: true });
    expect(pb.typography.fontFamily).toBe('Garamond');
    expect(F.PRESETS[2].page).toBeNull();
  });
  it('duplicates and normalizes custom formats', () => {
    const copy = F.duplicateFormat(F.PRESETS[1], 'Al meu');
    expect(copy.builtin).toBeUndefined();
    expect(copy.basedOn).toBe('paperback');
    const n = F.normalizeFormat({ id: 'x', name: 'X', basedOn: 'ebook', typography: { fontSizePt: 14 } });
    expect(n.typography.fontFamily).toBe('Georgia');
    expect(n.typography.fontSizePt).toBe(14);
    const p = makeProject({ compile: { formats: [copy] } });
    expect(F.findFormat(p, copy.id).name).toBe('Al meu');
  });
});

describe('section types and layouts', () => {
  it('resolves manual type, level defaults and built-ins', () => {
    const p = makeProject();
    const f = F.normalizeFormat(F.PRESETS[0]);
    expect(compile.resolveSectionType(p, { type: 'text', sectionType: 'st3' }, f)).toBe('Pagină de titlu');
    expect(compile.resolveSectionType(p, { type: 'text', sectionType: 'Capitol' }, f)).toBe('Capitol');
    expect(compile.resolveSectionType(p, { type: 'folder' }, f)).toBe('Capitol');
    expect(compile.resolveSectionType(p, { type: 'text' }, f)).toBe('Scenă');
    const bare = { tree: [] };
    expect(compile.resolveSectionType(bare, { type: 'folder' }, null)).toBe('Capitol');
    expect(compile.resolveSectionType(bare, { type: 'text', children: [{}] }, null)).toBe('Scenă');
  });
  it('applies layouts: chapter prefix with number words, hidden scene titles, page breaks', () => {
    const html = compile.compileHtml(makeProject(), read, { format: fmt('paperback') });
    expect(html).toContain('<span class="ch-prefix">Capitolul unu</span><br>Plecarea');
    expect(html).toContain('Capitolul doi</span><br>Sosirea');
    expect(html).not.toContain('>Gara<');
    expect((html.match(/class="pb"/g) || []).length).toBeGreaterThanOrEqual(2);
  });
  it('title case upper', () => {
    const f = fmt('manuscris');
    f.layouts.Capitol = { ...f.layouts.Capitol, titleCase: 'upper', titlePrefix: '' };
    const html = compile.compileHtml(makeProject(), read, { format: f });
    expect(html).toContain('>PLECAREA</h1>');
  });
});

describe('separators', () => {
  it('same type gets the scene separator, different type none, page break chapters none', () => {
    const html = compile.compileHtml(makeProject(), read, { format: fmt('manuscris') });
    expect((html.match(/<p class="sep">#<\/p>/g) || []).length).toBe(1);
    const f = fmt('manuscris', { separators: { sameType: { kind: 'text', text: '~' }, differentType: { kind: 'page' } } });
    f.layouts.Capitol = { ...f.layouts.Capitol, pageBreakBefore: false };
    const out = compile.compileHtml(makeProject(), read, { format: f });
    expect(out).toContain('<p class="sep">~</p>');
    // chapter -> scene (different types) => page break separator
    expect((out.match(/class="pb"/g) || []).length).toBeGreaterThanOrEqual(3);
  });
});

describe('placeholders', () => {
  it('numbers, roman, words and project data; unknown left as text', () => {
    const ctx = { project: makeProject(), n: 4, title: 'T', wc: 12 };
    expect(compile.replacePlaceholders('<$n> <$n:roman> <$n:words> <$n:Words>', ctx)).toBe('4 IV patru Patru');
    expect(compile.replacePlaceholders('<$projecttitle>/<$abbr_title>/<$author>/<$surname>/<$forename>/<$t>/<$wc>', ctx)).toBe('Drumul/DRUM/Ion Popescu/Popescu/Ion/T/12');
    expect(compile.replacePlaceholders('<$year>', ctx)).toBe(String(new Date().getFullYear()));
    expect(compile.replacePlaceholders('<$xyz> <$p>', ctx)).toBe('<$xyz> <$p>');
  });
  it('Romanian number words up to 100 and beyond', () => {
    const w = compile.romanianWords;
    expect([1, 2, 10, 11, 12, 14, 16, 19, 20, 21, 22, 45, 99, 100].map(w)).toEqual([
      'unu', 'doi', 'zece', 'unsprezece', 'doisprezece', 'paisprezece', 'șaisprezece', 'nouăsprezece',
      'douăzeci', 'douăzeci și unu', 'douăzeci și doi', 'patruzeci și cinci', 'nouăzeci și nouă', 'o sută',
    ]);
    expect(w(200)).toBe('două sute');
    expect(w(2000)).toBe('două mii');
    expect(compile.toRoman(1999)).toBe('MCMXCIX');
  });
  it('replaced inside compiled text', () => {
    const html = compile.compileHtml(makeProject(), read, { format: fmt('manuscris') });
    expect(html).toMatch(/Capitolul I are \d+ cuvinte/);
    expect(html).toContain('&lt;$necunoscut&gt;');
  });
});

describe('replacements and transformations', () => {
  it('only touch text, not markup', () => {
    const html = '<p class="pisica" data-x="pisica">Pisica și pisicuța</p>';
    const out = compile.mapText(html, (t) => compile.applyReplacements(t, [{ find: 'pisica', replace: 'câinele', wholeWord: true }]));
    expect(out).toBe('<p class="pisica" data-x="pisica">câinele și pisicuța</p>');
    const cs = compile.mapText(html, (t) => compile.applyReplacements(t, [{ find: 'pisica', replace: 'X', caseSensitive: true }]));
    expect(cs).toContain('>Pisica și pisicuța<');
    const re = compile.mapText('<p>a1 b22</p>', (t) => compile.applyReplacements(t, [{ find: '(\\d+)', replace: '#$1', regex: true }]));
    expect(re).toBe('<p>a#1 b#22</p>');
  });
  it('smart quotes, dashes, links to text, comments stripped, annotations removed', () => {
    const f = fmt('manuscris');
    f.transforms = { ...f.transforms, smartQuotes: true, dashes: true };
    f.replacements = [{ find: 'pisică', replace: 'vulpe', wholeWord: true }];
    const html = compile.compileHtml(makeProject(), read, { format: f });
    expect(html).toContain('Era „noapte” — iar');
    expect(html).toContain('Pisica vedea o vulpe.');
    expect(html).not.toContain('scribner://');
    expect(html).not.toContain('verifică');
    expect(html).not.toContain('de rescris');
  });
});

describe('notes', () => {
  it('footnotes (default) vs endnotes per chapter', () => {
    const foot = compile.compileHtml(makeProject(), read, { format: fmt('manuscris') });
    expect((foot.match(/class="notes"/g) || []).length).toBe(1);
    const f = fmt('manuscris');
    f.transforms = { ...f.transforms, notes: 'endnotes-chapter' };
    const end = compile.compileHtml(makeProject(), read, { format: f });
    expect((end.match(/class="notes endnotes"/g) || []).length).toBe(2);
    expect(end).toContain('Gara de Nord.');
    f.transforms.notes = 'endnotes-book';
    const book = compile.compileHtml(makeProject(), read, { format: f });
    expect((book.match(/class="notes endnotes"/g) || []).length).toBe(1);
    expect(book).toContain('<li value="2"');
  });
  it('DOCX: footnotes native, comments exported when asked', async () => {
    const f = fmt('manuscris');
    f.transforms = { ...f.transforms, comments: 'export' };
    const zip = await JSZip.loadAsync(await compile.compileDocx(makeProject(), read, { format: f }));
    expect(await zip.file('word/footnotes.xml').async('string')).toContain('Gara de Nord.');
    expect(await zip.file('word/comments.xml').async('string')).toContain('verifică');
    const docXml = await zip.file('word/document.xml').async('string');
    expect(docXml).toContain('commentRangeStart');
    expect(docXml).toContain('w:pgSz');
    const header = Object.keys(zip.files).find((n) => /word\/header\d*\.xml/.test(n));
    expect(await zip.file(header).async('string')).toContain('PAGE');
  });
  it('DOCX mirrored margins', async () => {
    const zip = await JSZip.loadAsync(await compile.compileDocx(makeProject(), read, { format: fmt('paperback') }));
    expect(await zip.file('word/settings.xml').async('string')).toContain('w:mirrorMargins');
    expect(await zip.file('word/document.xml').async('string')).toContain('w:w="8640"');
  });
});

describe('contents', () => {
  it('compiles a subtree', () => {
    const html = compile.compileHtml(makeProject(), read, { format: fmt('manuscris'), rootId: 'c2' });
    expect(html).toContain('Sfârșit');
    expect(html).not.toContain('Era');
    expect(html).not.toContain('Text exclus');
  });
  it('compiles an id list (explicit ids ignore the include flag)', () => {
    const html = compile.compileHtml(makeProject(), read, { format: fmt('manuscris'), ids: ['sx', 's1'] });
    expect(html).toContain('Text exclus');
    expect(html.indexOf('Text exclus')).toBeLessThan(html.indexOf('Era'));
    expect(html).not.toContain('Pisica');
  });
  it('filters by label and status', () => {
    const html = compile.compileHtml(makeProject(), read, { format: fmt('manuscris'), labels: ['Idee'], statuses: ['Final'] });
    expect(html).toContain('Era');
    expect(html).toContain('Sfârșit');
    expect(html).not.toContain('Pisica');
  });
  it('front and back matter, title page and TOC', () => {
    const html = compile.compileHtml(makeProject(), read, { format: fmt('manuscris'), frontMatterId: 'fm', backMatterId: 'bm', toc: true });
    const iDed = html.indexOf('Pentru mama.');
    expect(iDed).toBeGreaterThan(-1);
    expect(iDed).toBeLessThan(html.indexOf('Era'));
    expect(html.indexOf('Mulțumesc tuturor.')).toBeGreaterThan(html.indexOf('Sfârșit'));
    expect(html).toContain('<h1 class="book">Drumul</h1>');
    expect(html).toContain('<nav class="toc"><h2>Cuprins</h2>');
    expect(html).toContain('href="#sec-');
    const noTitle = compile.compileHtml(makeProject(), read, { format: fmt('manuscris'), titlePage: false });
    expect(noTitle).not.toContain('class="book"');
  });
  it('DOCX TOC as a static list', async () => {
    const zip = await JSZip.loadAsync(await compile.compileDocx(makeProject(), read, { format: fmt('paperback') }));
    const xml = await zip.file('word/document.xml').async('string');
    expect(xml).toContain('Cuprins');
    expect(xml.indexOf('Cuprins')).toBeLessThan(xml.indexOf('Era'));
  });
});

describe('EPUB', () => {
  it('extracts images, adds cover and metadata', async () => {
    const buf = await compile.compileEpub(makeProject(), read, {
      format: fmt('ebook'),
      epub: { language: 'ro', publisher: 'Editura X', isbn: '978-973-0-00000-1', description: 'Un roman.', subjects: ['ficțiune', 'drum'] },
      coverImage: { data: PNG, mime: 'image/png' },
    });
    const zip = await JSZip.loadAsync(buf);
    const opf = await zip.file('OEBPS/content.opf').async('string');
    expect(opf).toContain('<dc:publisher>Editura X</dc:publisher>');
    expect(opf).toContain('urn:isbn:9789730000001');
    expect(opf).toContain('<dc:subject>ficțiune</dc:subject>');
    expect(opf).toContain('<dc:description>Un roman.</dc:description>');
    expect(opf).toContain('properties="cover-image"');
    expect(opf).toContain('href="images/img1.png"');
    expect(zip.file('OEBPS/images/img1.png')).toBeTruthy();
    expect(zip.file('OEBPS/images/cover.png')).toBeTruthy();
    const all = await Promise.all(Object.keys(zip.files).filter((n) => n.endsWith('.xhtml')).map((n) => zip.file(n).async('string')));
    expect(all.join('')).not.toContain('data:image');
    expect(all.join('')).toContain('<img src="images/img1.png"/>');
    expect(await zip.file('OEBPS/nav.xhtml').async('string')).toContain('Plecarea');
  });
});

describe('other outputs', () => {
  it('RTF', async () => {
    const rtf = await compile.compile(makeProject(), read, 'rtf', { format: fmt('manuscris') });
    expect(rtf.startsWith('{\\rtf1')).toBe(true);
    expect(rtf).toContain('{\\footnote');
    expect(rtf).toContain('\\page');
    expect(rtf).toContain('Sf\\u226?r\\u537?it');
    expect(rtfEscape('ă{')).toBe('\\u259?\\{');
    expect(blocksToRtf([{ type: 'p', runs: [{ text: 'x', b: true }] }])).toContain('{\\b x}');
  });
  it('ODT: mimetype first, content.xml with paragraphs', async () => {
    const buf = await compile.compile(makeProject(), read, 'odt', { format: fmt('manuscris') });
    expect(buf.subarray(30, 38).toString()).toBe('mimetype');
    const zip = await JSZip.loadAsync(buf);
    expect(await zip.file('mimetype').async('string')).toBe('application/vnd.oasis.opendocument.text');
    const content = await zip.file('content.xml').async('string');
    expect(content).toContain('<text:p');
    expect(content).toContain('Era');
    expect(content).toContain('text:note-class="footnote"');
    expect(await zip.file('META-INF/manifest.xml').async('string')).toContain('content.xml');
    expect(await zip.file('styles.xml').async('string')).toContain('fo:page-width="8.27in"');
  });
  it('Markdown and MultiMarkdown', async () => {
    const p = makeProject();
    const docs = { ...DOCS, s2: '<p><strong>Tare</strong> și <em>moale</em></p><blockquote><p>Citat</p></blockquote><ul><li><p>a</p></li><li><p>b</p></li></ul>' };
    const md = await compile.compile(p, (id) => docs[id] || '', 'md', { format: fmt('manuscris') });
    expect(md).toContain('**Tare** și *moale*');
    expect(md).toContain('> Citat');
    expect(md).toContain('- a\n- b');
    expect(md).toContain('[^1]: Gara de Nord.');
    expect(md).toMatch(/^## Capitolul 1/m);
    const mmd = await compile.compile(p, (id) => docs[id] || '', 'mmd', { format: fmt('manuscris') });
    expect(mmd.startsWith('Title: Drumul\nAuthor: Ion Popescu')).toBe(true);
  });
  it('plain text', async () => {
    const txt = await compile.compile(makeProject(), read, 'txt', { format: fmt('manuscris') });
    expect(txt).toContain('\n\nEra "noapte" -- iar trenul întârzia.[1]\n\n');
    expect(txt).toContain('[1] Gara de Nord.');
    expect(txt).not.toContain('<p');
  });
  it('compile dispatches html/pdf and rejects unknown formats', async () => {
    expect(await compile.compile(makeProject(), read, 'html', {})).toContain('<!doctype html>');
    const pdf = await compile.compile(makeProject(), read, 'pdf', { format: fmt('pdf-a5') }, { renderPdf: async (html, o) => ({ html, o }) });
    expect(pdf.html).toContain('@page{size:5.83in 8.27in');
    // header/footer are CSS page-margin boxes in the HTML (mirrorable, off on front pages)
    expect(pdf.o.displayHeaderFooter).toBe(false);
    expect(pdf.html).toMatch(/@(top|bottom)-(left|center|right)\{content:"/);
    await expect(compile.compile(makeProject(), read, 'xyz', {})).rejects.toThrow('Format necunoscut');
  });
  it('previewHtml', () => {
    expect(compile.previewHtml(makeProject(), read, { format: fmt('manuscris') })).toContain('Era');
  });
});

describe('pdfOptions and print CSS', () => {
  it('page sizes in inches, margins, header/footer templates', () => {
    const o = compile.pdfOptions({ format: fmt('paperback') }, makeProject());
    expect(o.pageSize).toEqual({ width: 6, height: 9 });
    expect(o.margins).toEqual({ top: 0.75, bottom: 0.75, left: 0.875, right: 0.625 });
    expect(o.displayHeaderFooter).toBe(false);
    const html = compile.compileHtml(makeProject(), read, { target: 'pdf', format: fmt('paperback') });
    expect(html).toMatch(/counter\(page\)/);
    expect(html).toContain('Drumul');
    const a4 = compile.pdfOptions({ format: fmt('manuscris') }, makeProject());
    expect(a4.pageSize).toEqual({ width: 8.27, height: 11.69 });
    expect(compile.compileHtml(makeProject(), read, { target: 'pdf', format: fmt('manuscris') })).toContain('"Popescu / DRUM / " counter(page)');
  });
  it('mirrored margins via @page :left/:right only for pdf target', () => {
    const css = compile.compileHtml(makeProject(), read, { format: fmt('paperback'), target: 'pdf' });
    expect(css).toContain('@page{size:6in 9in');
    expect(css).toContain('@page :left{margin-left:0.625in;margin-right:0.875in}');
    expect(css).toContain('@page :right{margin-left:0.875in;margin-right:0.625in}');
    expect(compile.compileHtml(makeProject(), read, { format: fmt('paperback') })).not.toContain('@page');
  });
  it('uses project.compile settings when no options are given', () => {
    const p = makeProject({ compile: { formatId: 'manuscris', titlePage: false } });
    const html = compile.compileHtml(p, read);
    expect(html).toContain('Capitolul 1');
    expect(html).not.toContain('class="book"');
  });
});

describe('linked footnotes', () => {
  it('compile as anchor text plus an inline footnote', () => {
    const { linkedNotesInline } = require('../lib/compile.cjs');
    expect(linkedNotesInline('<p>a <span data-linked-footnote="N" class="linked-footnote">b</span></p>')).toBe('<p>a b<span data-footnote="N" class="footnote"></span></p>');
  });
});
