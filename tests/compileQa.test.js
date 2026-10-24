// QA regressions for Compile / Export (print and digital).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const { SaxesParser } = require('saxes');
const compile = require('../lib/compile.cjs');
const F = require('../lib/compileFormats.cjs');

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==';
const project = {
  title: 'Carte',
  author: 'Ana Pop',
  tree: [{ id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [{ id: 's1', type: 'text', title: 'Unu', includeInCompile: true }] }],
};
const ebook = () => ({ format: JSON.parse(JSON.stringify(F.PRESETS.find((p) => p.id === 'ebook'))) });

function wellFormed(xml) {
  const p = new SaxesParser({ xmlns: true });
  p.on('error', (e) => {
    throw e;
  });
  p.write(xml).close();
}

async function epubFiles(html) {
  const buf = await compile.compile(project, () => html, 'epub', ebook());
  const zip = await JSZip.loadAsync(buf);
  return zip;
}

describe('EPUB robustness', () => {
  it('strips XML-invalid control characters from chapter XHTML', async () => {
    const zip = await epubFiles('<p>Text\u0001 cu\u0007 control\u000b.</p>');
    for (const name of Object.keys(zip.files).filter((n) => n.endsWith('.xhtml'))) {
      const xml = await zip.file(name).async('string');
      expect(() => wellFormed(xml)).not.toThrow();
    }
    const all = (await Promise.all(Object.keys(zip.files).filter((n) => n.endsWith('.xhtml')).map((n) => zip.file(n).async('string')))).join('');
    expect(all).toContain('Text cu control.');
  });

  it('does not package broken or empty data-URI images (keeps the alt text)', async () => {
    const zip = await epubFiles(`<p><img src="data:image/png;base64,!!!broken" alt="stricat"></p><p><img src="data:image/png;base64,${PNG}" alt="bun"></p>`);
    const imgs = Object.keys(zip.files).filter((n) => /images\/img\d+/.test(n));
    expect(imgs.length).toBe(1);
    const opf = await zip.file('OEBPS/content.opf').async('string');
    expect((opf.match(/id="img\d+"/g) || []).length).toBe(1);
    const all = (await Promise.all(Object.keys(zip.files).filter((n) => n.endsWith('.xhtml')).map((n) => zip.file(n).async('string')))).join('');
    expect(all).toContain('stricat');
    expect(all).not.toMatch(/src="data:/);
  });
});

describe('EPUB keeps image types it cannot size', () => {
  it('packages an SVG data-URI image', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>').toString('base64');
    const zip = await epubFiles(`<p><img src="data:image/svg+xml;base64,${svg}" alt="v"></p>`);
    expect(Object.keys(zip.files).some((n) => /images\/img1\.svg$/.test(n))).toBe(true);
  });
});

describe('EPUB image width', () => {
  it('turns a percentage width (invalid in XHTML) into CSS width', async () => {
    const zip = await epubFiles(`<p><img src="data:image/png;base64,${PNG}" width="40%" data-align="left" style="float: left; margin: 0 1em 0.5em 0" alt="a"></p>`);
    const all = (await Promise.all(Object.keys(zip.files).filter((n) => n.endsWith('.xhtml')).map((n) => zip.file(n).async('string')))).join('');
    const img = /<img\b[^>]*src="images\/[^>]*>/.exec(all)[0];
    expect(img).not.toMatch(/width="[^"]*%"/);
    expect(img).toMatch(/style="[^"]*width:\s*40%/);
    expect(img).toMatch(/float: left/);
  });
});

describe('broken data-URI images in block formats', () => {
  it('a corrupt image is not embedded; its alt text is kept (DOCX)', async () => {
    const buf = await compile.compile(project, () => '<p><img src="data:image/png;base64,!!!broken" alt="stricat"></p>', 'docx', { format: JSON.parse(JSON.stringify(F.PRESETS.find((p) => p.id === 'manuscris'))) });
    const zip = await JSZip.loadAsync(buf);
    expect(Object.keys(zip.files).filter((n) => /^word\/media\/.+/.test(n))).toEqual([]);
    expect(await zip.file('word/document.xml').async('string')).toContain('[stricat]');
  });
  it('parseBlocks drops an image whose header is unreadable', () => {
    const blocks = compile.parseBlocks('<p><img src="data:image/png;base64,AAAA" alt="x"></p>');
    expect(blocks[0].runs.some((r) => r.image)).toBe(false);
  });
});

describe('LaTeX subtitles', () => {
  it('keeps the book subtitle and chapter subtitles', async () => {
    const p = JSON.parse(JSON.stringify(project));
    p.subtitle = 'Roman & „altceva”';
    p.tree[0].children = [{ id: 'c1', type: 'folder', title: 'Plecarea', subtitle: 'O dimineață', includeInCompile: true, children: [{ id: 's1', type: 'text', title: 'Gara', includeInCompile: true }] }];
    const tex = await compile.compile(p, () => '<p>Text.</p>', 'tex', { format: JSON.parse(JSON.stringify(F.PRESETS.find((x) => x.id === 'manuscris'))) });
    expect(tex).toMatch(/\\title\{Carte\\\\[^}]*Roman \\& „altceva”/);
    expect(tex).toMatch(/Plecarea\}\s*\n[^\n]*O dimineață/);
  });
});

describe('DOCX line spacing rule', () => {
  it('default paragraph spacing states lineRule="auto" (LibreOffice reads a missing rule as exact and clips inline images)', async () => {
    const buf = await compile.compile(project, () => `<p><img src="data:image/png;base64,${PNG}" alt="a"></p>`, 'docx', { format: JSON.parse(JSON.stringify(F.PRESETS.find((p) => p.id === 'paperback'))) });
    const styles = await (await JSZip.loadAsync(buf)).file('word/styles.xml').async('string');
    const sp = /<w:pPrDefault><w:pPr><w:spacing [^>]*>/.exec(styles)[0];
    expect(sp).toMatch(/w:line="\d+"/);
    expect(sp).toMatch(/w:lineRule="auto"/);
  });
});
