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
