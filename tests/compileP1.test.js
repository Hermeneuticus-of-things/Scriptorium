// P1 Compile: formats and contents — presets, Contents list overrides (page break, section type),
// inverted / keyword / saved-search filters, front & back matter per output, configurable table of
// contents, roman front matter, widows/orphans, embedded fonts, RTF output, format files.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { exportFormatFile, importFormatFile, formatFileName } from '../src/lib/compileFormatFile.js';
const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const compile = require('../lib/compile.cjs');
const F = require('../lib/compileFormats.cjs');

function makeProject(extra = {}) {
  return {
    title: 'Drumul',
    author: 'Ion Popescu',
    sectionTypes: [
      { id: 'st1', title: 'Capitol' },
      { id: 'st2', title: 'Scenă' },
      { id: 'st4', title: 'Parte' },
    ],
    sectionTypeLevels: { folders: 'st1', containers: null, files: 'st2' },
    tree: [
      {
        id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
          { id: 'c1', type: 'folder', title: 'Plecarea', children: [
            { id: 's1', type: 'text', title: 'Gara', label: 'Idee', keywords: ['tren'] },
            { id: 's2', type: 'text', title: 'Trenul', label: 'Fără', keywords: ['noapte'] },
          ] },
          { id: 'c2', type: 'folder', title: 'Sosirea', children: [
            { id: 's3', type: 'text', title: 'Peronul', label: 'Idee', keywords: ['tren', 'final'] },
            { id: 's4', type: 'text', title: 'Casa', keywords: [] },
          ] },
        ],
      },
      {
        id: 'research', root: 'research', type: 'folder', title: 'Cercetare', children: [
          { id: 'fm', type: 'folder', title: 'Front', children: [{ id: 'ded', type: 'text', title: 'Dedicație' }] },
          { id: 'fm2', type: 'folder', title: 'FrontEbook', children: [{ id: 'ded2', type: 'text', title: 'Dedicație e-book' }] },
          { id: 'bm', type: 'folder', title: 'Back', children: [{ id: 'ack', type: 'text', title: 'Mulțumiri' }] },
        ],
      },
    ],
    ...extra,
  };
}
const DOCS = {
  s1: '<p>Textul gării.</p>',
  s2: '<p>Textul trenului.</p>',
  s3: '<p>Textul peronului.</p>',
  s4: '<p>Textul casei.</p>',
  ded: '<p>Pentru mama.</p>',
  ded2: '<p>Pentru cititorul digital.</p>',
  ack: '<p>Mulțumesc tuturor.</p>',
};
const read = (id) => DOCS[id] || '';
const fmt = (id, patch = {}) => ({ ...JSON.parse(JSON.stringify(F.PRESETS.find((p) => p.id === id))), ...patch });
const zipText = async (buf, name) => (await JSZip.loadAsync(buf)).file(name).async('string');
const docText = (xml) => xml.replace(/<w:tab\/>/g, '\t').replace(/<[^>]+>/g, '');

describe('predefined formats', () => {
  const NEW = ['roman-parti', 'nonfictiune', 'povestire', 'scenariu-film', 'piesa-teatru', 'scenariu-bd', 'scenariu-radio', 'poezie', 'ebook-fictiune', 'corectura'];
  it('ship the classic families: manuscripts, novel, non-fiction, story, scripts, poetry, e-book, proof', () => {
    const ids = F.PRESETS.map((p) => p.id);
    for (const id of ['manuscris', 'courier', 'times', 'paperback', ...NEW]) expect(ids).toContain(id);
    expect(fmt('courier').typography.fontFamily).toBe('Courier New');
    expect(fmt('times').typography.fontFamily).toBe('Times New Roman');
    for (const id of ['scenariu-film', 'piesa-teatru', 'scenariu-bd', 'scenariu-radio']) {
      const p = fmt(id);
      expect(p.script).toBeTruthy();
      expect(p.typography).toMatchObject({ fontFamily: 'Courier New', fontSizePt: 12, lineSpacing: 1 });
    }
    expect(fmt('scenariu-film').preferredOutput).toBe('fdx');
    expect(fmt('ebook-fictiune').preferredOutput).toBe('epub');
  });

  it('every preset compiles to DOCX, EPUB and HTML', async () => {
    for (const p of F.PRESETS) {
      const html = compile.compileHtml(makeProject(), read, { format: fmt(p.id) });
      expect(html, p.id).toContain('Textul gării.');
      const docx = await compile.compileDocx(makeProject(), read, { format: fmt(p.id) });
      expect(docText(await zipText(docx, 'word/document.xml')), p.id).toContain('Textul peronului.');
      const epub = await compile.compileEpub(makeProject(), read, { format: fmt(p.id) });
      expect(Object.keys((await JSZip.loadAsync(epub)).files).some((f) => /ch\d+\.xhtml$/.test(f)), p.id).toBe(true);
    }
  });

  it('novel with parts numbers parts in words and chapters in figures', () => {
    const p = makeProject();
    p.tree[0].children = [{ id: 'p1', type: 'folder', title: 'Începutul', sectionType: 'st4', children: p.tree[0].children }];
    const html = compile.compileHtml(p, read, { format: fmt('roman-parti') });
    expect(html).toMatch(/PARTEA UNU/);
    expect(html).toMatch(/<span class="ch-prefix">1<\/span><br>Plecarea/);
    expect(html).toMatch(/<span class="ch-prefix">2<\/span><br>Sosirea/);
  });

  it('stage play: acts and numbered scenes', () => {
    const html = compile.compileHtml(makeProject(), read, { format: fmt('piesa-teatru'), titlePage: false });
    expect(html).toMatch(/ACTUL UNU/);
    expect(html).toMatch(/SCENA 1<\/span><br>GARA/);
  });
});

describe('Contents list: per-document page break and section type', () => {
  it('compilePageBreak true forces a new page, false removes the layout one', () => {
    const p = makeProject();
    p.tree[0].children[0].children[1].compilePageBreak = true; // s2
    p.tree[0].children[1].compilePageBreak = false; // c2 (chapter: page break by layout)
    const doc = compile.buildDocument(p, read, { format: fmt('manuscris'), titlePage: false });
    const sec = (id) => doc.items.find((it) => it.kind === 'section' && it.node.id === id);
    expect(sec('s2').pageBreak).toBe(true);
    expect(sec('c2').pageBreak).toBe(false);
    expect(sec('c1').pageBreak).toBe(false); // first section: no break before
    // no scene separator before a section that starts a page
    const i = doc.items.indexOf(sec('s2'));
    expect(doc.items[i - 1].kind).not.toBe('separator');
  });

  it('page break override reaches DOCX and HTML', async () => {
    const p = makeProject();
    p.tree[0].children[0].children[1].compilePageBreak = true;
    const html = compile.compileHtml(p, read, { format: fmt('manuscris'), titlePage: false });
    expect(html).toMatch(/<div class="pb"><\/div>(?:<h\d[^>]*>[^<]*<\/h\d>)?<p>Textul trenului/);
    const xml = await zipText(await compile.compileDocx(p, read, { format: fmt('manuscris'), titlePage: false }), 'word/document.xml');
    const para = xml.split('<w:p>').find((x) => x.includes('Textul trenului')) || xml.slice(xml.indexOf('Textul trenului') - 400, xml.indexOf('Textul trenului'));
    expect(xml.slice(Math.max(0, xml.indexOf('Textul trenului') - 600), xml.indexOf('Textul trenului'))).toMatch(/pageBreakBefore/);
    expect(para).toBeTruthy();
  });

  it('section type chosen on a row changes the layout used', () => {
    const p = makeProject();
    p.tree[0].children[0].children[0].sectionType = 'st1'; // s1 compiled as a chapter
    const html = compile.compileHtml(p, read, { format: fmt('manuscris'), titlePage: false });
    expect(html).toMatch(/Capitolul 2<\/span><br>Gara/);
  });
});

describe('filters', () => {
  const titles = (opts) => compile.buildDocument(makeProject(), read, { format: fmt('manuscris'), titlePage: false, ...opts }).items.filter((x) => x.kind === 'section').map((x) => x.node.id);
  it('keywords keep the documents with any chosen keyword', () => {
    expect(titles({ keywords: ['tren'] })).toEqual(['s1', 's3']);
  });
  it('inverted filter excludes what matches', () => {
    expect(titles({ keywords: ['tren'], filterInvert: true })).toEqual(['c1', 's2', 'c2', 's4']);
    expect(titles({ labels: ['Idee'], filterInvert: true })).toEqual(['c1', 's2', 'c2', 's4']);
  });
  it('inverted with no filter compiles everything', () => {
    expect(titles({ filterInvert: true })).toEqual(['c1', 's1', 's2', 'c2', 's3', 's4']);
  });
  it('a saved search arrives as explicit ids (collectionIds)', () => {
    expect(titles({ collectionIds: ['s3', 's4'] })).toEqual(['s3', 's4']);
  });
});

describe('front and back matter', () => {
  it('back matter comes after the body in HTML, DOCX and EPUB', async () => {
    const o = { format: fmt('manuscris'), titlePage: false, frontMatterId: 'fm', backMatterId: 'bm' };
    const html = compile.compileHtml(makeProject(), read, o);
    expect(html.indexOf('Pentru mama.')).toBeLessThan(html.indexOf('Textul gării.'));
    expect(html.indexOf('Mulțumesc tuturor.')).toBeGreaterThan(html.indexOf('Textul casei.'));
    const xml = docText(await zipText(await compile.compileDocx(makeProject(), read, o), 'word/document.xml'));
    expect(xml.indexOf('Mulțumesc tuturor.')).toBeGreaterThan(xml.indexOf('Textul casei.'));
    const z = await JSZip.loadAsync(await compile.compileEpub(makeProject(), read, o));
    const chapters = Object.keys(z.files).filter((f) => /ch\d+\.xhtml$/.test(f)).sort((a, b) => Number(a.match(/\d+/)) - Number(b.match(/\d+/)));
    expect(await z.file(chapters[chapters.length - 1]).async('string')).toContain('Mulțumesc tuturor.');
  });

  it('front matter chosen per output: PDF one folder, EPUB another, HTML none', async () => {
    const o = { format: fmt('manuscris'), titlePage: false, frontMatterId: 'fm', frontMatterByOutput: { epub: 'fm2', html: '-' } };
    const pdfHtml = await compile.compile(makeProject(), read, 'pdf', o);
    expect(pdfHtml).toContain('Pentru mama.');
    expect(pdfHtml).not.toContain('cititorul digital');
    const html = await compile.compile(makeProject(), read, 'html', o);
    expect(html).not.toContain('Pentru mama.');
    const z = await JSZip.loadAsync(await compile.compile(makeProject(), read, 'epub', o));
    const all = (await Promise.all(Object.keys(z.files).filter((f) => f.endsWith('.xhtml')).map((f) => z.file(f).async('string')))).join('');
    expect(all).toContain('Pentru cititorul digital.');
    expect(all).not.toContain('Pentru mama.');
    const docx = docText(await zipText(await compile.compile(makeProject(), read, 'docx', o), 'word/document.xml'));
    expect(docx).toContain('Pentru mama.');
  });

  it('back matter per output', async () => {
    const o = { format: fmt('manuscris'), titlePage: false, backMatterId: 'bm', backMatterByOutput: { md: '-' } };
    expect(await compile.compile(makeProject(), read, 'md', o)).not.toContain('Mulțumesc');
    expect(await compile.compile(makeProject(), read, 'txt', o)).toContain('Mulțumesc');
  });
});

describe('table of contents settings', () => {
  it('title and depth in HTML', () => {
    const p = makeProject();
    const html = compile.compileHtml(p, read, { format: fmt('manuscris', { layouts: { ...fmt('manuscris').layouts, 'Scenă': F.layout({ showTitle: true }) } }), toc: true, titlePage: false, tocSettings: { title: 'Sumar', depth: 1 } });
    expect(html).toContain('<nav class="toc"><h2>Sumar</h2>');
    const nav = html.slice(html.indexOf('<nav class="toc">'), html.indexOf('</nav>'));
    expect(nav).toContain('Plecarea');
    expect(nav).not.toContain('Gara');
    const deep = compile.compileHtml(p, read, { format: fmt('manuscris', { layouts: { ...fmt('manuscris').layouts, 'Scenă': F.layout({ showTitle: true }) } }), toc: true, titlePage: false, tocSettings: { depth: 2 } });
    expect(deep.slice(deep.indexOf('<nav class="toc">'), deep.indexOf('</nav>'))).toContain('Gara');
  });

  it('DOCX: entries with dot leader, PAGEREF to the chapter bookmark, fields updated on open', async () => {
    const xmlOf = async (ts) => {
      const z = await JSZip.loadAsync(await compile.compileDocx(makeProject(), read, { format: fmt('manuscris'), toc: true, titlePage: false, tocSettings: ts }));
      return { doc: await z.file('word/document.xml').async('string'), settings: await z.file('word/settings.xml').async('string') };
    };
    const { doc, settings } = await xmlOf({ title: 'Cuprinsul cărții' });
    expect(docText(doc)).toContain('Cuprinsul cărții');
    expect(doc).toMatch(/<w:tab w:val="right" w:pos="\d+" w:leader="dot"\/>/);
    expect(doc).toMatch(/PAGEREF sec_1/);
    expect(doc).toMatch(/<w:bookmarkStart[^>]*w:name="sec_1"/);
    expect(settings).toMatch(/<w:updateFields w:val="true"\/>|<w:updateFields\/>/);
    const plain = await xmlOf({ pageNumbers: false });
    expect(plain.doc).not.toMatch(/PAGEREF/);
    expect(plain.settings).not.toMatch(/updateFields/);
    const noLead = await xmlOf({ leaders: false });
    expect(noLead.doc).toMatch(/w:leader="none"/);
  });

  it('EPUB navigation uses the title and depth, nested by level', async () => {
    const f = fmt('manuscris', { layouts: { ...fmt('manuscris').layouts, 'Scenă': F.layout({ showTitle: true }) } });
    const z = await JSZip.loadAsync(await compile.compileEpub(makeProject(), read, { format: f, toc: true, tocSettings: { title: 'Sumar', depth: 2 } }));
    const nav = await z.file('OEBPS/nav.xhtml').async('string');
    expect(nav).toContain('<h1>Sumar</h1>');
    expect(nav).toMatch(/Plecarea<\/a><ol><li><a [^>]*>Gara<\/a><\/li><li><a [^>]*>Trenul/);
    const z1 = await JSZip.loadAsync(await compile.compileEpub(makeProject(), read, { format: f, toc: true, tocSettings: { depth: 1 } }));
    expect(await z1.file('OEBPS/nav.xhtml').async('string')).not.toContain('Gara');
  });
});

describe('pages: roman front matter, widows/orphans', () => {
  it('DOCX front section numbered i, ii…; body restarts at 1 in arabic', async () => {
    const f = fmt('paperback');
    f.page.frontRoman = true;
    const xml = await zipText(await compile.compileDocx(makeProject(), read, { format: f, frontMatterId: 'fm' }), 'word/document.xml');
    const sects = xml.match(/<w:sectPr>[\s\S]*?<\/w:sectPr>/g);
    expect(sects.length).toBeGreaterThanOrEqual(2);
    expect(sects[0]).toMatch(/<w:pgNumType w:start="1" w:fmt="lowerRoman"\/>/);
    expect(sects[1]).toMatch(/<w:pgNumType w:start="1" w:fmt="decimal"\/>/);
    // the dedication (front matter) is in the first section
    // (a section's properties sit in its last paragraph)
    const firstSectionEnd = xml.indexOf('</w:p>', xml.indexOf('<w:sectPr>'));
    expect(xml.indexOf('Pentru mama.')).toBeLessThan(firstSectionEnd);
    expect(xml.indexOf('Textul gării.')).toBeGreaterThan(firstSectionEnd);
  });

  it('compile option frontRoman works without a header (own footer with the roman number)', async () => {
    const f = fmt('ebook-fictiune', { page: { ...fmt('manuscris').page, header: {}, footer: {} } });
    const z = await JSZip.loadAsync(await compile.compileDocx(makeProject(), read, { format: f, frontRoman: true }));
    const xml = await z.file('word/document.xml').async('string');
    expect(xml).toMatch(/w:fmt="lowerRoman"/);
    const footers = Object.keys(z.files).filter((n) => /word\/footer\d+\.xml/.test(n));
    expect(footers.length).toBeGreaterThan(0);
  });

  it('PDF: front matter pages on their own counter with roman numerals', async () => {
    const f = fmt('paperback');
    f.page.frontRoman = true;
    const html = await compile.compile(makeProject(), read, 'pdf', { format: f, frontMatterId: 'fm' });
    expect(html).toMatch(/<div class="fm-page">[\s\S]*Pentru mama\.[\s\S]*?<\/div>/);
    expect(html).toContain('@page fm{counter-increment:fmpage 1 page 0;');
    expect(html).toContain('counter(fmpage, lower-roman)');
    expect(html).toContain('@page front{counter-increment:fmpage 1 page 0}');
    const plain = await compile.compile(makeProject(), read, 'pdf', { format: fmt('paperback'), frontMatterId: 'fm' });
    expect(plain).not.toContain('lower-roman');
    expect(plain).toContain('.fm-page{page:fm}');
  });

  it('widows, orphans and keep-with-next reach CSS and Word', async () => {
    const html = compile.compileHtml(makeProject(), read, { format: fmt('manuscris'), flow: { widows: 3, orphans: 4 } });
    expect(html).toContain('p{orphans:4;widows:3;');
    const styles = await zipText(await compile.compileDocx(makeProject(), read, { format: fmt('manuscris') }), 'word/styles.xml');
    expect(styles).toMatch(/<w:pPrDefault><w:pPr><w:widowControl\/>/);
    const doc = await zipText(await compile.compileDocx(makeProject(), read, { format: fmt('manuscris') }), 'word/document.xml');
    expect(doc).toMatch(/<w:pStyle w:val="Heading1"\/><w:keepNext\/>/);
    const loose = compile.compileHtml(makeProject(), read, { format: fmt('manuscris'), flow: { keepWithNext: false } });
    expect(loose).not.toContain('h1,h2,h3,h4{break-after:avoid');
  });
});

describe('embedded fonts', () => {
  const FONT = { family: 'Literata', ext: 'ttf', name: 'Literata.ttf', data: Buffer.from('FAKE-TTF-DATA').toString('base64') };
  it('HTML/PDF carry an @font-face data URI', async () => {
    const html = await compile.compile(makeProject(), read, 'pdf', { format: fmt('manuscris'), fonts: [FONT] });
    expect(html).toContain('@font-face{font-family:"Literata";src:url("data:font/ttf;base64,');
    expect(html).toContain('format("truetype")');
  });
  it('EPUB stores the font file, lists it in the manifest and uses it when it is the format font', async () => {
    const f = fmt('ebook', { typography: { ...fmt('ebook').typography, fontFamily: 'Literata' } });
    const z = await JSZip.loadAsync(await compile.compileEpub(makeProject(), read, { format: f, fonts: [FONT] }));
    expect(await z.file('OEBPS/fonts/font1.ttf').async('string')).toBe('FAKE-TTF-DATA');
    expect(await z.file('OEBPS/content.opf').async('string')).toContain('<item id="font1" href="fonts/font1.ttf" media-type="font/ttf"/>');
    const css = await z.file('OEBPS/style.css').async('string');
    expect(css).toContain('url("fonts/font1.ttf")');
    expect(css).toContain('body{font-family:Literata,serif');
  });
  it('DOCX embeds the font (word/fonts, embedTrueTypeFonts)', async () => {
    const z = await JSZip.loadAsync(await compile.compileDocx(makeProject(), read, { format: fmt('manuscris'), fonts: [FONT] }));
    expect(z.file('word/fonts/font1.odttf')).toBeTruthy();
    expect(await z.file('word/settings.xml').async('string')).toMatch(/embedTrueTypeFonts/);
    expect(await z.file('word/fontTable.xml').async('string')).toContain('Literata');
  });
});

describe('RTF as a compile output', () => {
  it('compiles the manuscript with titles, text and back matter', async () => {
    const rtf = await compile.compile(makeProject(), read, 'rtf', { format: fmt('manuscris'), backMatterId: 'bm' });
    expect(rtf.startsWith('{\\rtf1')).toBe(true);
    expect(rtf).toContain('Textul g\\u');
    expect(rtf).toMatch(/Plecarea/);
    expect(rtf).toMatch(/Mul\\u/);
    expect(compile.OUTPUT_FORMATS.rtf.ext).toBe('rtf');
  });
});

describe('compile format as a file', () => {
  it('exports and imports back as a new editable format with a unique name', () => {
    const src = fmt('paperback');
    const text = exportFormatFile(src);
    const parsed = JSON.parse(text);
    expect(parsed.kind).toBe('pneuma-compile-format');
    expect(parsed.format.builtin).toBeUndefined();
    const f = importFormatFile(text, ['Carte tipărită (paperback)'], () => 'custom-x');
    expect(f.id).toBe('custom-x');
    expect(f.name).toBe('Carte tipărită (paperback) (2)');
    expect(f.basedOn).toBe('paperback');
    expect(f.builtin).toBeUndefined();
    expect(f.layouts.Capitol).toEqual(src.layouts.Capitol);
    // it is a usable format
    expect(compile.compileHtml(makeProject(), read, { format: f })).toContain('Textul casei.');
    expect(formatFileName({ name: 'A/B: c' })).toBe('A B  c.scribcompile');
  });
  it('rejects files that are not formats', () => {
    expect(() => importFormatFile('nu e json')).toThrow('invalid-json');
    expect(() => importFormatFile('{"a":1}')).toThrow('not-a-format');
    expect(() => importFormatFile('[1,2]')).toThrow('not-a-format');
  });
});
