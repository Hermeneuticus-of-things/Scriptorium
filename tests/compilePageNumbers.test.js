// P1 #28 — estimated page numbers at compile: the estimate itself (lib/pageEstimate.cjs),
// the `<$p>` field resolved in section titles / subtitles / body text for paged outputs,
// and the page numbers of the generated ToC (paged HTML/PDF only).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const compile = require('../lib/compile.cjs');
const PE = require('../lib/pageEstimate.cjs');
const F = require('../lib/compileFormats.cjs');

const fmt = (id) => F.PRESETS.find((p) => p.id === id);
// st1 = „Capitol" (manuscris preset: showTitle, pageBreakBefore) — titles are rendered.
const makeProject = (children, extra = {}) => ({
  title: 'Drumul',
  author: 'Ion Popescu',
  sectionTypes: [
    { id: 'st1', title: 'Capitol' },
    { id: 'st2', title: 'Scenă' },
  ],
  sectionTypeLevels: { folders: 'st1', containers: null, files: 'st2' },
  tree: [
    {
      id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
        { id: 'c1', type: 'folder', title: 'Plecarea', children },
      ],
    },
  ],
  ...extra,
});
const DOCS = {
  s1: `<p>${'Trenul întârzia. '.repeat(40)}</p>`,
  s2: '<p>Text scurt.</p>',
  s3: '<p>Alt text scurt.</p>',
};
const read = (id) => DOCS[id] || '';
const sectionOf = (doc, nodeId) => doc.items.find((x) => x.kind === 'section' && x.node.id === nodeId);

describe('pageEstimate.estimateStartPages — the documented estimate', () => {
  it('a page break starts the next page; front matter counts on its own stream', () => {
    const items = [
      { kind: 'titlepage' },
      { kind: 'toc', entries: [{ id: 'b', title: 'Doi', level: 1 }], settings: { title: 'Cuprins' } },
      { kind: 'section', id: 'a', matter: 'body', pageBreak: true, title: 'Unu', html: '<p>Text.</p>' },
      { kind: 'section', id: 'b', matter: 'body', pageBreak: true, title: 'Doi', html: '<p>Text.</p>' },
    ];
    const est = PE.estimateStartPages(items, { fontSizePt: 12, lineSpacing: 1.5 });
    // title page = 1, contents = 2 → without frontRoman the body continues on page 3
    expect(est.startPage.get('a')).toBe(3);
    expect(est.startPage.get('b')).toBe(4);
    // with page.frontRoman the body restarts at 1 (as the DOCX/PDF writers do)
    const est2 = PE.estimateStartPages(items, { fontSizePt: 12, lineSpacing: 1.5, frontRoman: true });
    expect(est2.startPage.get('a')).toBe(1);
    expect(est2.startPage.get('b')).toBe(2);
  });

  it('long text wraps onto several pages; the next section continues after it', () => {
    // ~90 chars/line, ~36 lines/page at 12pt/1.5 → one page holds ~3200 chars
    const long = `<p>${'cuvânt '.repeat(500)}</p>`; // 3500 chars ≈ 39 lines
    const items = [
      { kind: 'section', id: 'a', matter: 'body', title: 'Unu', html: long },
      { kind: 'section', id: 'b', matter: 'body', title: 'Doi', html: '<p>Scurt.</p>' },
    ];
    const est = PE.estimateStartPages(items, { fontSizePt: 12, lineSpacing: 1.5 });
    expect(est.startPage.get('a')).toBe(1);
    expect(est.startPage.get('b')).toBeGreaterThan(1);
  });

  it('hr in the text forces a page break after it', () => {
    const est = PE.estimateStartPages(
      [
        { kind: 'section', id: 'a', matter: 'body', title: 'Unu', html: '<p>Unu.</p><hr><p>Doi.</p>' },
        { kind: 'section', id: 'b', matter: 'body', pageBreak: true, title: 'Trei', html: '<p>Trei.</p>' },
      ],
      { fontSizePt: 12, lineSpacing: 1.5 },
    );
    expect(est.startPage.get('a')).toBe(1);
    // the hr ends page 1 inside section a; section b's explicit break then lands on page 3
    expect(est.startPage.get('b')).toBe(3);
  });
});

describe('buildDocument — `<$p>` resolved at compile (paged outputs)', () => {
  it('the title of each section shows its estimated page, the body text its own page', () => {
    const p = makeProject([
      { id: 's1', type: 'text', title: 'Gara <$p>', sectionType: 'st1' },
      { id: 's2', type: 'text', title: 'Trenul', sectionType: 'st1' },
    ]);
    const DOCS2 = {
      s1: '<p>Gara, pagina &lt;$p&gt; aici.</p>',
      s2: '<p>Trenul, pagina &lt;$p&gt; aici.</p>',
    };
    const doc = compile.buildDocument(p, (id) => DOCS2[id] || '', { format: fmt('manuscris'), titlePage: false, output: 'pdf' });
    const sec1 = sectionOf(doc, 's1');
    const sec2 = sectionOf(doc, 's2');
    expect(sec1.title).not.toContain('<$p>');
    expect(sec1.title).toContain(String(sec1.estPage));
    expect(sec1.html).toContain(`Gara, pagina ${sec1.estPage} aici.`);
    expect(sec2.html).toContain(`Trenul, pagina ${sec2.estPage} aici.`);
    // every pageBreakBefore section starts its own page
    expect(sec2.estPage).toBe(sec1.estPage + 1);
  });

  it('<$p:R> resolves through the compile number formats; an unknown format stays as typed', () => {
    const p = makeProject([
      { id: 's1', type: 'text', title: 'Capitol <$p:R> / <$p:x>', sectionType: 'st1' },
    ]);
    const doc = compile.buildDocument(p, read, { format: fmt('manuscris'), titlePage: false, output: 'pdf' });
    const sec = sectionOf(doc, 's1');
    expect(sec.title).not.toContain('<$p>');
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][sec.estPage - 1] || String(sec.estPage);
    expect(sec.title).toContain(roman);
    expect(sec.title).toContain('<$p:x>'); // unknown format kept, like every placeholder
  });

  it('the subtitle follows the same rule as the title', () => {
    const p = makeProject([
      { id: 's1', type: 'text', title: 'Gara', subtitle: 'pag. <$p>', sectionType: 'st1' },
    ]);
    const doc = compile.buildDocument(p, read, { format: fmt('manuscris'), titlePage: false, output: 'pdf' });
    const sec = sectionOf(doc, 's1');
    expect(sec.subtitle).toBe(`pag. ${sec.estPage}`);
  });

  it('blocks marked Preserve Formatting keep their text verbatim, `<$p>` included', () => {
    const p = makeProject([
      { id: 's1', type: 'text', title: 'Gara', sectionType: 'st1' },
    ]);
    const DOCS2 = { s1: '<p>Normal &lt;$p&gt; aici.</p><div data-preserve-format="1"><p>Verbatim &lt;$p&gt;</p></div>' };
    const doc = compile.buildDocument(p, (id) => DOCS2[id] || '', { format: fmt('manuscris'), titlePage: false, output: 'pdf' });
    const sec = sectionOf(doc, 's1');
    expect(sec.html).toContain(`Normal ${sec.estPage} aici.`);
    expect(sec.html).toContain('Verbatim &lt;$p&gt;');
  });

  it('non-paged outputs (md) keep `<$p>` as typed', () => {
    const p = makeProject([
      { id: 's1', type: 'text', title: 'Gara <$p>', sectionType: 'st1' },
    ]);
    const DOCS2 = { s1: '<p>Pagina &lt;$p&gt;.</p>' };
    const doc = compile.buildDocument(p, (id) => DOCS2[id] || '', { format: fmt('manuscris'), titlePage: false, output: 'md' });
    const sec = sectionOf(doc, 's1');
    expect(sec.title).toContain('<$p>');
    expect(sec.html).toContain('Pagina &lt;$p&gt;.');
  });
});

describe('the generated ToC carries estimated page numbers (paged outputs only)', () => {
  const tocProject = () => makeProject([
    { id: 's1', type: 'text', title: 'Gara', sectionType: 'st1' },
  ]);
  it('pdf: toc-pg spans with numbers; plain html: none', () => {
    const pdf = compile.compileHtml(tocProject(), read, { format: fmt('manuscris'), titlePage: true, toc: true, output: 'pdf', target: 'pdf' });
    expect(pdf).toMatch(/toc-pg">\d+</);
    const html = compile.compileHtml(tocProject(), read, { format: fmt('manuscris'), titlePage: true, toc: true, output: 'html', target: 'html' });
    expect(html).not.toMatch(/toc-pg">/);
    expect(html).toContain('Plecarea'); // the toc still lists the entries
  });
  it('the docx ToC block is built from the same entries with real PAGEREF fields (unchanged)', async () => {
    const JSZip = require('jszip');
    const buf = await compile.compileDocx(tocProject(), read, { format: fmt('manuscris'), titlePage: true, toc: true, output: 'docx' });
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file('word/document.xml').async('string');
    expect(xml).toContain('PAGEREF');
    expect(xml).not.toContain('<$p>');
  });
});
