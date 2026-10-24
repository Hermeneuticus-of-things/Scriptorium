import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import JSZip from 'jszip';
import { DEFAULT_STYLES, styleCss, stylesOf } from '../src/lib/styles.js';
import { projectWords } from '../src/editor/writing.js';
const require = createRequire(import.meta.url);
const compile = require('../lib/compile.cjs');

const project = (html) => ({
  title: 'T',
  author: '',
  tree: [{ id: 'draft', root: 'draft', children: [{ id: 'a', type: 'text', title: 'A', includeInCompile: true }] }],
  _html: html,
});
const read = (p) => () => p._html;

describe('named styles', () => {
  it('generates CSS for paragraph and character styles', () => {
    const css = styleCss(DEFAULT_STYLES, 'body');
    expect(css).toContain('body [data-style="citat-bloc"] { font-style: italic; margin-left: 2em; margin-right: 2em }');
    expect(css).toContain('body [data-char-style="ilustratie"] { font-style: italic }');
    expect(stylesOf({ styles: [] })).toBe(DEFAULT_STYLES);
  });
});

describe('compile v0.3', () => {
  const html =
    '<p data-style="citat-bloc">Citat</p><p>Text <span data-char-style="accent">tare</span> și x<sup>2</sup> <span data-revision="2" style="color: red" class="revision">revizuit</span>.</p>' +
    '<ol><li><p>unu</p></li><li><p>doi</p></li></ol><hr><p style="text-align: center">Centru</p>';

  it('HTML: style CSS included, revision colors removed', () => {
    const out = compile.compileHtml(project(html), read(project(html)), { styleCss: styleCss(DEFAULT_STYLES, 'body') });
    expect(out).toContain('body [data-style="citat-bloc"]');
    expect(out).toContain('revizuit');
    expect(out).not.toContain('data-revision');
    expect(out).toContain('hr{border:none;page-break-after:always');
  });

  it('DOCX parse: styles, superscript, ordered list, page break, alignment', () => {
    const blocks = compile.parseBlocks(html, DEFAULT_STYLES);
    expect(blocks[0].style.id).toBe('citat-bloc');
    expect(blocks[0].runs[0].i).toBe(true);
    const runs = blocks[1].runs;
    expect(runs.find((r) => r.text === 'tare').b).toBe(true);
    expect(runs.find((r) => r.text === '2').sup).toBe(true);
    expect(blocks.filter((b) => b.type === 'li').map((b) => [b.list, b.runs[0].text])).toEqual([['ol', 'unu'], ['ol', 'doi']]);
    expect(blocks.some((b) => b.type === 'hr')).toBe(true);
    expect(blocks[blocks.length - 1].align).toBe('center');
  });

  it('DOCX file: numbering, page break, superscript', async () => {
    const p = project(html);
    const buf = await compile.compileDocx(p, read(p), { styles: DEFAULT_STYLES });
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file('word/document.xml').async('string');
    expect(xml).toContain('w:numPr');
    expect(xml).toContain('w:br w:type="page"');
    expect(xml).toContain('w:vertAlign w:val="superscript"');
    expect(xml).toContain('w:jc w:val="center"');
  });
});

describe('auto-complete words', () => {
  it('collects research titles, keywords and repeated proper names', () => {
    const p = {
      tree: [
        { id: 'draft', root: 'draft', children: [{ id: 'x', title: 'X', keywords: ['vipāka'] }] },
        { id: 'research', root: 'research', children: [{ id: 'r', title: 'Personaj: Andrei Popescu' }] },
      ],
      keywordDefs: [{ name: 'drumuln' }],
    };
    const docs = { x: '<p>Ieri Mihaela a plecat. Azi Mihaela revine. Mâine Mihaela pleacă iar.</p>' };
    const w = projectWords(p, docs);
    expect(w).toEqual(expect.arrayContaining(['Andrei', 'Popescu', 'vipāka', 'drumuln', 'Mihaela']));
    expect(w).not.toContain('Personaj');
  });
});
