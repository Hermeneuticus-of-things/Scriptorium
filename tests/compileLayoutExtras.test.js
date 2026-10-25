import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const L = require('../lib/compileLayouts.cjs');

// P2/P3 — the first-paragraph typography and columns the Compile layout editor now exposes.
describe('compile layout extras', () => {
  it('drop cap wraps the first letter', () => {
    const out = L.firstParagraph('<p>Hello world</p>', { dropCap: true });
    expect(out).toContain('<span data-dropcap="1">H</span>');
    expect(out).toContain('ello world');
  });
  it('lead-in small caps wraps the first N words', () => {
    const out = L.firstParagraph('<p>Hello world foo bar</p>', { firstWordsSmallCaps: 2 });
    expect(out).toContain('<span data-caps="small">Hello world</span>');
    expect(out).toContain(' foo bar');
  });
  it('no change when no first-paragraph option is set', () => {
    expect(L.firstParagraph('<p>plain</p>', {})).toBe('<p>plain</p>');
  });
  it('first-paragraph indent sets data-first', () => {
    expect(L.firstParagraph('<p>text</p>', { firstIndent: 'none' })).toBe('<p data-first="none">text</p>');
    expect(L.firstParagraph('<p>text</p>', { firstIndent: 'indent' })).toBe('<p data-first="indent">text</p>');
  });
  it('columns emit a multi-column rule in the layout CSS', () => {
    const css = L.layoutCss([{ cls: 'lay1', lay: { columns: 2 } }]);
    expect(css).toMatch(/\.lay1\{[^}]*column-count:2/);
    expect(L.layoutCss([{ cls: 'lay1', lay: { columns: 1 } }])).not.toMatch(/column-count/);
  });
  it('comments compile mode: footnotes vs inline vs kept', () => {
    const html = 'a<span data-comment="o notă">cuvânt</span>b';
    expect(L.commentsTo(html, 'footnotes')).toContain('cuvânt<span data-footnote="o notă"');
    expect(L.commentsTo(html, 'inline')).toContain('cuvânt [o notă]');
    expect(L.commentsTo(html, 'strip')).toBe(html); // strip/export handled elsewhere, unchanged here
  });
  it('style overrides emit CSS; remove drops the rule', () => {
    const styles = [{ id: 's1', name: 'Citat', type: 'para' }];
    const css = L.styleOverrideCss(styles, { s1: { sizePct: 120, bold: true, color: '#333333' } });
    expect(css).toMatch(/\[data-style="s1"\]\{[^}]*font-size:120%/);
    expect(css).toMatch(/font-weight:700/);
    expect(L.styleOverrideCss(styles, { s1: { remove: true, sizePct: 120 } })).toBe('');
  });
  it('decorative separator maps the chosen symbol to its glyph', () => {
    expect(L.normalizeSep({ kind: 'decorative', symbol: 'asterism' })).toMatchObject({ kind: 'decorative', text: '⁂' });
    expect(L.normalizeSep({ kind: 'decorative', symbol: 'stars' })).toMatchObject({ text: '* * *' });
    expect(L.normalizeSep({ kind: 'decorative', symbol: 'line' })).toMatchObject({ line: true, text: '' });
  });
});
