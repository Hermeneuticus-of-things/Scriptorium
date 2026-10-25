// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { buildExtensions } from '../src/editor/extensions.js';
import { latexToMathML, latexFromAlt } from '../src/lib/latexMath.js';
import { jumpHistory, paneZoom, pushHistory, recentList, routeSelection, stepHistory, withPaneZoom } from '../src/lib/panes.js';
import { lineTops } from '../src/lib/lineNumbers.js';
import { deleteStyle, renameStyle, styleFromLook, styleIdFor } from '../src/lib/styles.js';
import { SUBMENUS } from '../src/lib/menuLayout.js';
import { uiRo, uiEn } from '../src/lib/i18n-ui.js';

let ed;
afterEach(() => ed?.destroy());
const make = (html) => (ed = new Editor({ extensions: buildExtensions({ smartQuotes: false }), content: html }));

describe('equations: LaTeX → MathML', () => {
  it('fractions, roots, scripts', () => {
    const m = latexToMathML('\\frac{a+1}{b}');
    expect(m).toContain('<mfrac><mrow><mi>a</mi><mo>+</mo><mn>1</mn></mrow><mi>b</mi></mfrac>');
    expect(latexToMathML('\\sqrt{x}')).toContain('<msqrt><mi>x</mi></msqrt>');
    expect(latexToMathML('\\sqrt[3]{x}')).toContain('<mroot><mi>x</mi><mn>3</mn></mroot>');
    expect(latexToMathML('x^2')).toContain('<msup><mi>x</mi><mn>2</mn></msup>');
    expect(latexToMathML('x_i^2')).toContain('<msubsup><mi>x</mi><mi>i</mi><mn>2</mn></msubsup>');
  });
  it('big operators take limits under/over; integrals as sub/sup', () => {
    expect(latexToMathML('\\sum_{i=1}^{n} i')).toContain('<munderover><mo largeop="true">∑</mo>');
    expect(latexToMathML('\\int_0^1 f')).toContain('<msubsup><mo largeop="true">∫</mo><mn>0</mn><mn>1</mn></msubsup>');
    expect(latexToMathML('\\lim_{x \\to 0}')).toContain('<munder><mi>lim</mi>');
  });
  it('greek, relations, text, matrices, fences', () => {
    const m = latexToMathML('\\alpha \\leq \\Omega \\text{ dacă } x');
    expect(m).toContain('<mi>α</mi>');
    expect(m).toContain('<mo>≤</mo>');
    expect(m).toContain('<mi mathvariant="normal">Ω</mi>');
    expect(m).toContain('<mtext> dacă </mtext>');
    const mat = latexToMathML('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}');
    expect(mat).toContain('<mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable>');
    expect(mat).toContain('<mo fence="true">(</mo>');
    expect(latexToMathML('\\left( x \\right)')).toContain('<mo fence="true" stretchy="true">(</mo>');
  });
  it('escapes markup and keeps the source as annotation; display mode', () => {
    const m = latexToMathML('a<b', { display: true });
    expect(m).toContain('<mo>&lt;</mo>');
    expect(m).toContain('display="block"');
    expect(m).toContain('<annotation encoding="application/x-tex">a&lt;b</annotation>');
    expect(latexToMathML('\\unknown')).toContain('\\unknown');
  });
  it('the LaTeX is read back from the image alt text', () => {
    expect(latexFromAlt('$x^2$')).toBe('x^2');
    expect(latexFromAlt('poză')).toBeNull();
  });
});

describe('pane history, lock in place, zoom', () => {
  it('push / back / forward / jump / recent list', () => {
    let h = pushHistory(null, 'a');
    h = pushHistory(h, 'b');
    h = pushHistory(h, 'b');
    h = pushHistory(h, 'c');
    expect(h).toEqual({ stack: ['a', 'b', 'c'], index: 2 });
    const back = stepHistory(h, -1);
    expect(back.id).toBe('b');
    const skip = stepHistory(h, -1, (id) => id !== 'b');
    expect(skip.id).toBe('a');
    expect(stepHistory({ stack: ['a'], index: 0 }, 1)).toBeNull();
    const h2 = pushHistory(back.h, 'd');
    expect(h2.stack).toEqual(['a', 'b', 'd']);
    expect(jumpHistory(h2, 0).id).toBe('a');
    expect(recentList({ stack: ['a', 'b', 'a', 'c'], index: 3 }).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
  it('binder selection goes to the active pane unless it is locked', () => {
    expect(routeSelection({ active: 'main', locks: {}, hasSplit: true })).toBe('main');
    expect(routeSelection({ active: 'split', locks: {}, hasSplit: true })).toBe('split');
    expect(routeSelection({ active: 'split', locks: { split: true }, hasSplit: true })).toBe('main');
    expect(routeSelection({ active: 'main', locks: { main: true }, hasSplit: true })).toBe('split');
    expect(routeSelection({ active: 'main', locks: { main: true }, hasSplit: false })).toBeNull();
    expect(routeSelection({ active: 'main', locks: { main: true, split: true }, hasSplit: true })).toBeNull();
  });
  it('each pane has its own zoom', () => {
    let v = withPaneZoom({ zoom: 100 }, 'split', 150);
    expect(paneZoom(v, 'split')).toBe(150);
    expect(paneZoom(v, 'main')).toBe(100);
    v = withPaneZoom(v, 'main', 999);
    expect(v.zoom).toBe(400);
    expect(paneZoom({ zoom: 125 }, 'split')).toBe(125);
  });
});

describe('line numbers', () => {
  it('one number per visual line, continuous; paragraphs mode', () => {
    const blocks = [
      { top: 100, height: 40, tops: [100, 100.5, 120] },
      { top: 150, height: 20, tops: [] },
      { top: 180, height: 0, tops: [] },
    ];
    expect(lineTops(blocks, 50)).toEqual([{ n: 1, top: 50 }, { n: 2, top: 70 }, { n: 3, top: 100 }]);
    expect(lineTops(blocks, 50, 'paragraphs')).toEqual([{ n: 1, top: 50 }, { n: 2, top: 100 }]);
  });
});

describe('styles panel helpers', () => {
  it('new style from the selection, rename, delete', () => {
    expect(styleIdFor('Citat lung', new Set(['citat-lung']))).toBe('citat-lung-2');
    let s = styleFromLook([{ id: 'a', name: 'A', type: 'para', next: 'x' }], 'Țară mică', 'char', { bold: true, italic: false, align: 'center' });
    expect(s[1]).toEqual({ id: 'tara-mica', name: 'Țară mică', type: 'char', bold: true });
    s = styleFromLook(s, 'X', 'para', { align: 'center', italic: true });
    expect(s[2]).toMatchObject({ id: 'x', type: 'para', align: 'center', italic: true });
    s = renameStyle(s, 'x', 'Centrat nou');
    expect(s[2].name).toBe('Centrat nou');
    s = deleteStyle(s, 'x');
    expect(s.map((x) => x.id)).toEqual(['a', 'tara-mica']);
    expect(s[0].next).toBeUndefined();
  });
  it('Format › Styles is a submenu with the panel', () => {
    expect(SUBMENUS.format.some(([k, ids]) => k === 'menu.styles' && ids.includes('stylesPanel'))).toBe(true);
  });
});

describe('format painter', () => {
  it('copies character + paragraph format and pastes onto the word under the cursor', () => {
    make('<p style="text-indent: 1cm"><strong><em>sursa</em></strong></p><p>un cuvant aici</p>');
    ed.commands.setTextSelection({ from: 2, to: 4 });
    ed.commands.copyFormat();
    // cursor inside "cuvant" (no selection)
    const pos = ed.state.doc.child(0).nodeSize + 1 + 5;
    ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, pos)));
    ed.commands.pasteFormat();
    const html = ed.getHTML();
    expect(html).toMatch(/<p style="text-indent: 1cm;?"[^>]*>un <strong><em>cuvant<\/em><\/strong> aici<\/p>/);
  });
});

describe('i18n', () => {
  it('every G5 string exists in ro and en', () => {
    const ro = Object.keys(uiRo).filter((k) => k.startsWith('ui.g5.'));
    const en = Object.keys(uiEn).filter((k) => k.startsWith('ui.g5.'));
    expect(ro.length).toBeGreaterThan(10);
    expect(new Set(en)).toEqual(new Set(ro));
  });
});
