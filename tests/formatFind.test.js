// Find by Formatting detectors (Scrivener 3 §11.6.7–11.6.10) — node environment: pure
// HTML-string parsing, no DOM. Navigation ranges come from findFormatting, tested here
// against a minimal ProseMirror schema and (with the real editor) in formatting.test.js.
import { describe, it, expect } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import {
  CHAR_FORMATS, hasCharFormat, charFormatOccurrences,
  hasLink, linkOccurrences, hasImage, imageOccurrences,
  hasPreserve, preserveOccurrences, hasFormatting, formattingOccurrences,
} from '../src/lib/formatFind.js';
import { findFormatting } from '../src/editor/formatting.js';
import { uiRo, uiEn } from '../src/lib/i18n-ui.js';

describe('character format (§11.6.7)', () => {
  const html = '<p>text <strong>b</strong> x <em>i</em> y</p>';
  it('detects runs and counts them', () => {
    expect(hasCharFormat('<p><strong>b</strong></p>')).toEqual({ found: true, count: 1 });
    expect(hasCharFormat(html, { format: 'bold' })).toEqual({ found: true, count: 1 });
    expect(hasCharFormat(html, { format: 'italic' })).toEqual({ found: true, count: 1 });
    expect(hasCharFormat(html, { format: 'strike' })).toEqual({ found: false, count: 0 });
    expect(hasCharFormat(html)).toEqual({ found: true, count: 2 });
  });
  it('reads the serialized tag of each of the six marks', () => {
    const all = '<p><strong>a</strong><em>b</em><u>c</u><s>d</s><sup>e</sup><sub>f</sub></p>';
    for (const f of CHAR_FORMATS) expect(hasCharFormat(all, { format: f }).count).toBe(1);
    expect(hasCharFormat(all)).toEqual({ found: true, count: 6 });
  });
  it('accepts aliases from imported HTML (b, i, del)', () => {
    const aliased = '<p><b>b</b> <i>i</i> <del>d</del></p>';
    expect(hasCharFormat(aliased, { format: 'bold' }).count).toBe(1);
    expect(hasCharFormat(aliased, { format: 'italic' }).count).toBe(1);
    expect(hasCharFormat(aliased, { format: 'strike' }).count).toBe(1);
  });
  it('counts one run for nested formats', () => {
    const nested = '<p><strong><em>x</em></strong></p>';
    expect(hasCharFormat(nested, { format: 'bold' }).count).toBe(1);
    expect(hasCharFormat(nested, { format: 'italic' }).count).toBe(1);
    expect(hasCharFormat(nested).count).toBe(1);
  });
  it('no formatting anywhere', () => {
    expect(hasCharFormat('<p>text simplu</p>')).toEqual({ found: false, count: 0 });
    expect(hasCharFormat('')).toEqual({ found: false, count: 0 });
  });
  it('snippets: run text with neighbors, entities decoded', () => {
    expect(charFormatOccurrences('<p>text <strong>bold aici</strong> coadă</p>')).toEqual([{ before: 'text ', match: 'bold aici', after: ' coadă' }]);
    expect(charFormatOccurrences('<p><strong>a &amp; b</strong></p>')[0].match).toBe('a & b');
  });
  it('snippets break at block boundaries', () => {
    expect(charFormatOccurrences('<p>unu</p><p><strong>doi</strong></p>')[0]).toEqual({ before: '', match: 'doi', after: '' });
  });
});

describe('links (§11.6.8)', () => {
  const html = '<p>vezi <a href="https://ex.ro/a">legătura</a> și <a href="docs/b.md">alta</a></p>';
  it('detects and counts links', () => {
    expect(hasLink(html)).toEqual({ found: true, count: 2 });
    expect(hasLink('<p>fără linkuri</p>')).toEqual({ found: false, count: 0 });
  });
  it('filters by URL or anchor text substring, case-insensitive', () => {
    expect(hasLink(html, { query: 'EX.RO' }).count).toBe(1);
    expect(hasLink(html, { query: 'legăt' }).count).toBe(1);
    expect(hasLink(html, { query: 'b.md' }).count).toBe(1);
    expect(hasLink(html, { query: 'zz' })).toEqual({ found: false, count: 0 });
  });
  it('snippets carry the href and the surrounding text', () => {
    expect(linkOccurrences(html)[0]).toEqual({ before: 'vezi ', match: 'legătura', after: ' și ', href: 'https://ex.ro/a' });
    expect(linkOccurrences(html, { query: 'b.md' })[0].href).toBe('docs/b.md');
  });
});

describe('images (§11.6.9)', () => {
  const html = '<p>înainte <img src="media/f.png" alt="fig"> după</p>';
  it('detects and counts images', () => {
    expect(hasImage(html)).toEqual({ found: true, count: 1 });
    expect(hasImage('<p>text</p>')).toEqual({ found: false, count: 0 });
    expect(hasImage('<p><img src="a.png"><img src="b.png"></p>')).toEqual({ found: true, count: 2 });
  });
  it('filters by src or alt substring, case-insensitive', () => {
    expect(hasImage(html, { query: 'F.PNG' }).count).toBe(1);
    expect(hasImage(html, { query: 'fig' }).count).toBe(1);
    expect(hasImage(html, { query: 'zzz' })).toEqual({ found: false, count: 0 });
  });
  it('snippets: src as match, neighbors around the tag', () => {
    expect(imageOccurrences(html)[0]).toEqual({ before: 'înainte ', match: 'media/f.png', after: ' după', src: 'media/f.png', alt: 'fig' });
  });
});

describe('preserved formatting (§11.6.10)', () => {
  it('counts inline code runs (the schema has no dedicated preserve mark)', () => {
    expect(hasPreserve('<p><code>x = 1</code></p>')).toEqual({ found: true, count: 1 });
    expect(hasPreserve('<p>text</p>')).toEqual({ found: false, count: 0 });
  });
  it('codeBlock content counts too (it serializes as pre>code)', () => {
    expect(hasPreserve('<pre><code>const a = 1;</code></pre>').count).toBe(1);
  });
  it('snippets', () => {
    expect(preserveOccurrences('<p>a <code>c</code> b</p>')[0]).toEqual({ before: 'a ', match: 'c', after: ' b' });
  });
});

describe('dispatchers', () => {
  it('route by kind and ignore unknown kinds', () => {
    expect(hasFormatting('<p><strong>x</strong></p>', 'charFormat', { format: 'bold' })).toEqual({ found: true, count: 1 });
    expect(hasFormatting('<a href="https://ex.ro/a">leg</a>', 'link')).toEqual({ found: true, count: 1 });
    expect(hasFormatting('<img src="media/f.png" alt="fig">', 'image')).toEqual({ found: true, count: 1 });
    expect(hasFormatting('<p><code>c</code></p>', 'preserve')).toEqual({ found: true, count: 1 });
    expect(hasFormatting('<p>x</p>', 'comment')).toEqual({ found: false, count: 0 });
    expect(formattingOccurrences('<p>x</p>', 'comment')).toEqual([]);
  });
});

describe('findFormatting ranges for the new kinds', () => {
  // Minimal schema with the editor's mark/node names, so the ranges behind FormatFind
  // navigation are testable in Node without a DOM (real editor: formatting.test.js).
  const schema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { group: 'block', content: 'inline*', marks: '_' },
      text: { group: 'inline' },
      image: { group: 'inline', inline: true, atom: true, attrs: { src: { default: null }, alt: { default: null } } },
      codeBlock: { group: 'block', content: 'text*', marks: '' },
    },
    marks: {
      bold: {}, italic: {}, underline: {}, strike: {}, superscript: {}, subscript: {},
      link: { attrs: { href: { default: null } } },
      code: {},
    },
  });
  const p = (...children) => schema.node('paragraph', null, children);
  const marks = (s, ...ms) => schema.text(s, ms);
  it('charFormat: value picks the mark, empty = any of the six', () => {
    const doc = schema.node('doc', null, [p(marks('a', schema.mark('bold')), marks('b'), marks('c', schema.mark('italic')))]);
    expect(findFormatting(doc, 'charFormat', 'bold')).toEqual([{ from: 1, to: 2 }]);
    expect(findFormatting(doc, 'charFormat', 'italic')).toEqual([{ from: 3, to: 4 }]);
    expect(findFormatting(doc, 'charFormat')).toEqual([{ from: 1, to: 2 }, { from: 3, to: 4 }]);
    expect(findFormatting(doc, 'charFormat', 'strike')).toEqual([]);
  });
  it('link: whole URL or anchor text contains the query', () => {
    const link = schema.mark('link', { href: 'https://ex.ro/a' });
    const doc = schema.node('doc', null, [p(marks('vezi '), marks('legătura', link), marks(' fin'))]);
    expect(findFormatting(doc, 'link')).toEqual([{ from: 6, to: 14 }]);
    expect(findFormatting(doc, 'link', 'ex.ro')).toEqual([{ from: 6, to: 14 }]);
    expect(findFormatting(doc, 'link', 'legăt')).toEqual([{ from: 6, to: 14 }]);
    expect(findFormatting(doc, 'link', 'zzz')).toEqual([]);
  });
  it('image: src or alt contains the query', () => {
    const doc = schema.node('doc', null, [p(marks('înainte '), schema.node('image', { src: 'media/f.png', alt: 'fig' }), marks(' după'))]);
    expect(findFormatting(doc, 'image')).toEqual([{ from: 9, to: 10 }]);
    expect(findFormatting(doc, 'image', 'f.png')).toEqual([{ from: 9, to: 10 }]);
    expect(findFormatting(doc, 'image', 'fig')).toEqual([{ from: 9, to: 10 }]);
    expect(findFormatting(doc, 'image', 'zzz')).toEqual([]);
  });
  it('preserve: code mark runs and codeBlock content', () => {
    const doc = schema.node('doc', null, [p(marks('a '), marks('c', schema.mark('code')), marks(' b')), schema.node('codeBlock', null, [marks('const a = 1;')])]);
    expect(findFormatting(doc, 'preserve')).toEqual([{ from: 3, to: 4 }, { from: 8, to: 20 }]);
  });
});

describe('i18n labels for the new modes', () => {
  const NEW = ['format_caracter', 'linkuri', 'imagini', 'text_preservat', 'orice_format', 'bold', 'italic', 'underline', 'strike', 'superscript', 'subscript', 'link_filtru', 'imagine_filtru'];
  it('exist in both uiRo and uiEn', () => {
    for (const k of NEW) {
      expect(uiRo[`ui.formatFind.${k}`]).toBeTruthy();
      expect(uiEn[`ui.formatFind.${k}`]).toBeTruthy();
    }
  });
});
