// File > Page Setup → CSS / printToPDF options (Print and Print Preview share compile.pageCss).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ps = require('../lib/printSetup.cjs');
const compile = require('../lib/compile.cjs');

describe('page setup mapping', () => {
  it('maps paper sizes and orientation to inches', () => {
    expect(ps.paperInches({ size: 'A4' })).toEqual({ widthIn: 8.268, heightIn: 11.693 });
    expect(ps.paperInches({ size: 'A5', orientation: 'landscape' })).toEqual({ widthIn: 8.268, heightIn: 5.827 });
    expect(ps.paperInches({ size: 'Letter' })).toEqual({ widthIn: 8.5, heightIn: 11 });
    expect(ps.paperInches({ size: '6x9' })).toEqual({ widthIn: 6, heightIn: 9 });
    expect(ps.paperInches({ size: 'custom', widthCm: 12.7, heightCm: 20.32 })).toEqual({ widthIn: 5, heightIn: 8 });
    expect(ps.paperInches({ size: 'custom', widthCm: 25.4, heightCm: 12.7, orientation: 'portrait' })).toEqual({ widthIn: 5, heightIn: 10 });
  });

  it('normalizes header/footer, custom size and first page', () => {
    const s = ps.normalizePageSetup({ size: 'custom', widthCm: 1, heightCm: 'x', header: { left: 'a\nb' }, differentFirstPage: 1 });
    expect(s.widthCm).toBe(5);
    expect(s.heightCm).toBe(29.7);
    expect(s.header).toEqual({ left: 'a b', center: '', right: '' });
    expect(s.footer.center).toBe('<$p>');
    expect(s.differentFirstPage).toBe(true);
    expect(ps.normalizePageSetup(null).size).toBe('A4');
  });

  it('builds the Compile page and reuses compile.pageCss', () => {
    const setup = { size: '6x9', margins: { top: 2.54, bottom: 1.27, left: 2.54, right: 1.27 }, header: { right: '<$projecttitle>' }, footer: { center: 'p. <$p>' }, differentFirstPage: true };
    const page = ps.toCompilePage(setup);
    expect(page).toMatchObject({ size: 'custom', widthIn: 6, heightIn: 9, margins: { top: 1, bottom: 0.5, inner: 1, outer: 0.5 }, differentFirstPage: true });
    const project = { title: 'Carte "Mea"' };
    const css = ps.printCss(setup, project);
    expect(css).toContain(compile.pageCss(page, project, 0, []));
    expect(css).toContain('@page{size:6in 9in;margin:1in 0.5in 0.5in 1in}');
    expect(css).toContain('@top-right{content:"Carte \\"Mea\\""');
    expect(css).toContain('@bottom-center{content:"p. " counter(page) ""');
    expect(css).toContain('@page :first{');
    expect(css).toContain('font-size:12pt');
  });

  it('gives printToPDF and print options with the same page', () => {
    const o = ps.pdfPrintOptions({ size: 'Letter', orientation: 'landscape', margins: { top: 2.54, bottom: 2.54, left: 5.08, right: 2.54 } });
    expect(o).toEqual({ pageSize: { width: 11, height: 8.5 }, landscape: false, printBackground: false, preferCSSPageSize: true, displayHeaderFooter: false, margins: { top: 1, bottom: 1, left: 2, right: 1 }, scale: 1 });
    expect(ps.printOptions({ size: '6x9' }).pageSize).toEqual({ width: 152400, height: 228600 });
  });

  it('inserts its CSS after the compiled styles', () => {
    const project = { title: 'T', tree: [{ id: 'draft', root: 'draft', type: 'folder', children: [{ id: 'd', type: 'text', title: 'D' }] }] };
    const html = compile.compileHtml(project, () => '<p>x</p>', { target: 'pdf' });
    const out = ps.applyToHtml(html, { size: 'A5' }, project);
    const i = out.lastIndexOf('@page{size:5.827in 8.268in');
    expect(i).toBeGreaterThan(out.indexOf('<style'));
    expect(i).toBeLessThan(out.indexOf('</head>'));
  });

  it('reads page count and size from a PDF', () => {
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type /Pages /Count 2>>endobj\n2 0 obj<</Type /Page /MediaBox [0 0 432 648]>>endobj\n3 0 obj<</Type/Page/MediaBox [0 0 432 648]>>endobj\n');
    expect(ps.pdfPageCount(pdf)).toBe(2);
    expect(ps.pdfPageSize(pdf)).toEqual({ width: 432, height: 648 });
    expect(ps.pdfPageSize(Buffer.from('x'))).toBe(null);
  });
});
