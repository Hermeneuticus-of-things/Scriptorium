import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import JSZip from 'jszip';

const require = createRequire(import.meta.url);
const compile = require('../lib/compile.cjs');
const F = require('../lib/compileFormats.cjs');

// 1600x2400 PNG header (pixels are never decoded: only the size matters for layout).
function bigPng(w = 1600, h = 2400) {
  const b = Buffer.alloc(33);
  b.write('\x89PNG\r\n\x1a\n', 0, 'binary');
  b.writeUInt32BE(13, 8); b.write('IHDR', 12); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20);
  return `data:image/png;base64,${b.toString('base64')}`;
}
const SPECIAL = 'Șțâîă ŞŢ „citat” «guillemets» — … ½ © ™ € § ¶ † ‡ • ‰ Ελληνικά Русский ﬁ';
const project = {
  title: 'Drumul spre munte',
  subtitle: 'Roman în trei părți',
  author: 'Ilinca Matei',
  tree: [
    { id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
      // Chapters are folders: the default formats show folder titles, scene titles stay hidden.
      { id: 'c1', type: 'folder', title: 'Plecarea', subtitle: 'O dimineață de octombrie', includeInCompile: true, children: [
        { id: 's1', type: 'text', title: 'Gara', includeInCompile: true },
      ] },
      { id: 'c2', type: 'folder', title: 'Drumul', includeInCompile: true, children: [
        { id: 's2', type: 'text', title: 'Pădurea', includeInCompile: true },
      ] },
    ] },
    { id: 'research', root: 'research', type: 'folder', title: 'Cercetare', children: [] },
    { id: 'trash', root: 'trash', type: 'folder', title: 'Coș', children: [] },
  ],
};
const docs = {
  s1: `<p>${SPECIAL}</p><p><img src="${bigPng()}" alt="Harta"></p><p>După imagine.</p>`,
  s2: '<p>Al doilea capitol.</p>',
};
const read = (id) => docs[id] || '';
const paperback = () => {
  const f = F.builtinFormats ? F.builtinFormats().find((x) => /tipărit|paperback/i.test(x.name)) : null;
  return f || null;
};
const cover = { data: bigPng(1200, 1800).split(',')[1], mime: 'image/png' };

describe('book ready for print and digital', () => {
  it('HTML/PDF: book subtitle, chapter subtitle, cover page, special characters, print typography', () => {
    const html = compile.compileHtml(project, read, { titlePage: true, target: 'pdf', coverImage: cover });
    expect(html).toContain('<p class="book-subtitle">Roman în trei părți</p>');
    expect(html).toMatch(/Plecarea<\/h\d><p class="subtitle">O dimineață de octombrie<\/p>/);
    expect(html).toContain('class="cover-page"');
    expect(html).toContain(SPECIAL);
    expect(html).toMatch(/orphans:2;widows:2;hyphens:auto/);
    expect(html).toMatch(/break-after:avoid/);
    expect(html).toMatch(/img\{max-height:[\d.]+in/);
    expect(html).toContain('<html lang="ro">');
  });
  it('a chapter without a subtitle gets none; a hidden title hides its subtitle', () => {
    const html = compile.compileHtml(project, read, {});
    expect((html.match(/class="subtitle"/g) || []).length).toBe(1);
  });
  it('DOCX: Subtitle style for the book, chapter subtitle kept with next, cover first, images scaled to the page', async () => {
    const pb = paperback();
    const buf = await compile.compileDocx(project, read, { titlePage: true, coverImage: cover, ...(pb ? { format: pb } : {}) });
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file('word/document.xml').async('string');
    expect(xml).toContain('Roman în trei părți');
    expect(xml).toMatch(/w:pStyle w:val="Subtitle"/);
    const styles = await zip.file("word/styles.xml").async("string");
    expect(styles).toContain(`w:styleId="Subtitle"`);
    expect(styles).toMatch(/w:lang w:val="ro-RO"/);
    expect(xml).toContain('O dimineață de octombrie');
    expect(xml).toContain('Șțâîă');
    expect(xml).toContain('Ελληνικά');
    // every drawing fits the text block of the page
    const pg = (pb && pb.page) || F.legacyFormat().page;
    const dim = F.pageDimensions(pg);
    const m = pg.margins || {};
    const maxW = (dim.widthIn - (m.inner ?? 1) - (m.outer ?? 1)) * 914400;
    const maxH = (dim.heightIn - (m.top ?? 1) - (m.bottom ?? 1)) * 914400;
    const ext = [...xml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"/g)].map((x) => [Number(x[1]), Number(x[2])]);
    expect(ext.length).toBe(2); // cover + image in text
    for (const [cx, cy] of ext) {
      expect(cx).toBeLessThanOrEqual(maxW + 1);
      expect(cy).toBeLessThanOrEqual(maxH + 1);
    }
    expect(xml.indexOf('<wp:extent')).toBeLessThan(xml.indexOf('Drumul spre munte'));
  });
  it('EPUB: subtitles, cover, special characters, hyphenation CSS', async () => {
    const buf = await compile.compileEpub(project, read, { titlePage: true, coverImage: cover });
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files);
    expect(names.some((n) => /cover\.(png|jpe?g)$/.test(n))).toBe(true);
    const all = (await Promise.all(names.filter((n) => /\.(xhtml|css)$/.test(n)).map((n) => zip.file(n).async('string')))).join('\n');
    expect(all).toContain('Roman în trei părți');
    expect(all).toContain('O dimineață de octombrie');
    expect(all).toContain('Șțâîă');
    expect(all).toMatch(/hyphens:auto/);
  });
  it('ODT, RTF, Markdown keep the subtitles and special characters', async () => {
    const odt = await JSZip.loadAsync(await compile.compileOdt(project, read, { titlePage: true }));
    const content = await odt.file('content.xml').async('string');
    expect(content).toContain('O dimineață de octombrie');
    expect(content).toContain('Roman în trei părți');
    expect(content).toContain('Ελληνικά');
    const rtf = compile.compileRtf(project, read, { titlePage: true });
    expect(rtf).toContain('\\keepn');
    expect(rtf).toMatch(/\\u536\?/); // Ș as a unicode escape
    const md = compile.compile ? await compile.compile(project, read, 'md', { titlePage: true }) : '';
    if (md) expect(String(md)).toContain('*O dimineață de octombrie*');
  });
  it('the <$subtitle> placeholder resolves to the book subtitle', () => {
    const html = compile.compileHtml({ ...project, tree: [{ ...project.tree[0], children: [{ id: 'x', type: 'text', title: 'X', includeInCompile: true }] }, project.tree[1], project.tree[2]] }, () => '<p>Subtitlu: &lt;$subtitle&gt;</p>', {});
    expect(html).toContain('Subtitlu: Roman în trei părți');
  });
});

describe('images keep the size and place chosen in the editor', () => {
  const doc = (img) => () => `<p>${img}</p>`;
  const p1 = { title: 'T', tree: [{ id: 'draft', root: 'draft', type: 'folder', title: 'M', children: [{ id: 'a', type: 'text', title: 'A', includeInCompile: true }] }] };
  const extents = async (html) => {
    const zip = await JSZip.loadAsync(await compile.compileDocx(p1, doc(html), {}));
    const xml = await zip.file('word/document.xml').async('string');
    return { xml, ext: [...xml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"/g)].map((x) => [Number(x[1]) / 9525, Number(x[2]) / 9525]) };
  };
  it('50% of the text column, centered paragraph', async () => {
    const col = (await extents(`<img src="${bigPng(100, 50)}" width="5000">`)).ext[0][0]; // the text column
    const { xml, ext } = await extents(`<img src="${bigPng()}" width="50%" data-align="center">`);
    expect(Math.abs(ext[0][0] - col / 2)).toBeLessThan(1.5);
    expect(Math.abs(ext[0][1] - (col / 2) * 1.5)).toBeLessThan(2);
    expect(xml).toMatch(/<w:jc w:val="center"\/>[\s\S]*<wp:extent/);
  });
  it('pixel width is kept and a small image is enlarged to it', async () => {
    const { ext } = await extents(`<img src="${bigPng(100, 50)}" width="300">`);
    expect(ext[0].map(Math.round)).toEqual([300, 150]);
  });
  it('a width wider than the page is capped at the text column', async () => {
    const { ext } = await extents(`<img src="${bigPng(100, 50)}" width="2000">`);
    const pg = F.legacyFormat().page;
    const dim = F.pageDimensions(pg);
    const m = pg.margins || {};
    expect(Math.round(ext[0][0])).toBe(Math.floor((dim.widthIn - (m.inner ?? 1) - (m.outer ?? 1)) * 96));
  });
});
