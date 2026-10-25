import { describe, it, expect } from 'vitest';
import { parseComments, updateComment, monthlyHistory, posDistribution, toPages, measure, targetCrossed, containerIds, cardHeight, dragIds, noteToDocument, iconTint } from '../src/lib/panelsExtra.js';

const HTML = '<p>A <span data-comment="unu" title="unu" class="comment">text <span style="color:red">roșu</span></span> și <span data-comment="doi &amp; trei" data-comment-color="#ff0" class="comment">altul</span>.</p>';

describe('comments', () => {
  it('parses comments with attributes and nested spans', () => {
    const c = parseComments(HTML);
    expect(c).toHaveLength(2);
    expect(c[0]).toMatchObject({ index: 0, text: 'unu', on: 'text roșu', color: '' });
    expect(c[1]).toMatchObject({ text: 'doi & trei', on: 'altul', color: '#ff0' });
  });
  it('edits text, colour, author', () => {
    const h = updateComment(HTML, 0, { text: 'nou "x"', color: '#f00', author: 'Ana', date: '2026-01-02' });
    const c = parseComments(h)[0];
    expect(c).toMatchObject({ text: 'nou "x"', color: '#f00', author: 'Ana', date: '2026-01-02', on: 'text roșu' });
    expect(h).toContain('title="nou &quot;x&quot;"');
    expect(parseComments(updateComment(h, 0, { color: '' }))[0].color).toBe('');
  });
  it('deletes a comment but keeps the text', () => {
    const h = updateComment(HTML, 0, null);
    expect(parseComments(h)).toHaveLength(1);
    expect(h).toContain('A text <span style="color:red">roșu</span> și');
    expect(updateComment(HTML, 9, null)).toBe(HTML);
  });
});

describe('history / stats / targets', () => {
  it('groups by month', () => {
    const m = monthlyHistory([{ date: '2026-01-02', draft: 10, total: 12, draftChars: 50 }, { date: '2026-01-05', draft: -2, total: 0 }, { date: '2026-02-01', draft: 5, total: 5 }]);
    expect(m).toEqual([{ month: '2026-01', draft: 8, total: 12, chars: 50, days: 1 }, { month: '2026-02', draft: 5, total: 5, chars: 0, days: 1 }]);
  });
  it('pos distribution sums to all words', () => {
    const d = posDistribution('Ea merge repede și cântă frumos.');
    expect(d.reduce((s, x) => s + x.count, 0)).toBe(6);
    expect(d.find((x) => x.tag === 'conj').count).toBe(1);
  });
  it('pages and measure', () => {
    expect(toPages(251)).toBe(2);
    expect(toPages(3600, 'Characters')).toBe(2);
    expect(measure({ words: 500, chars: 2600 }, 'Characters')).toBe(2600);
    expect(measure({ words: 500 }, 'Pages')).toBe(2);
    expect(measure({ words: 500 })).toBe(500);
  });
  it('target crossing', () => {
    expect(targetCrossed(90, 100, 100)).toBe(true);
    expect(targetCrossed(100, 120, 100)).toBe(false);
    expect(targetCrossed(0, 10, 0)).toBe(false);
  });
});

describe('binder / corkboard / scratchpad', () => {
  it('container ids', () => {
    expect(containerIds([{ id: 'a', children: [{ id: 'b' }, { id: 'c', children: [] }] }])).toEqual(['a', 'c']);
  });
  it('card height', () => {
    expect(cardHeight(250, '3:5')).toBe(150);
    expect(cardHeight(200, '1:1')).toBe(200);
    expect(cardHeight(200, 'x')).toBe(120);
  });
  it('drag ids', () => {
    expect(dragIds('a', new Set(['a', 'b']))).toEqual(['a', 'b']);
    expect(dragIds('c', new Set(['a', 'b']))).toEqual(['c']);
  });
  it('note to document', () => {
    expect(noteToDocument({ title: ' ', text: 'a<b\n\nc' })).toEqual({ title: 'Notă din ciorne', html: '<p>a&lt;b</p><p>c</p>' });
  });
  it('icon tint', () => {
    expect(iconTint('', '#f00', true)).toBe('#f00');
    expect(iconTint('#0f0', '#f00', true)).toBe('#0f0');
    expect(iconTint('', '#f00', false)).toBe(null);
  });
});

import { parseAnnotations, updateFootnote, parseFootnotes } from '../src/lib/panelsExtra.js';
describe('annotations in text order', () => {
  const h = '<p>Unu<span data-footnote="nota A" class="footnote"></span> <span data-comment="com" class="comment">doi</span> <span data-linked-footnote="nota B" class="linked-footnote">trei</span></p>';
  it('merges comments and footnotes by position', () => {
    const a = parseAnnotations(h);
    expect(a.map((x) => `${x.kind}:${x.text}`)).toEqual(['footnote:nota A', 'comment:com', 'footnote:nota B']);
    expect(a[2].index).toBe(1);
  });
  it('edits and deletes footnotes', () => {
    expect(parseFootnotes(updateFootnote(h, 1, { text: 'nouă "x"' }))[1].text).toBe('nouă "x"');
    const d = updateFootnote(h, 1, null);
    expect(d).toContain('trei');
    expect(parseFootnotes(d)).toHaveLength(1);
    expect(parseFootnotes(updateFootnote(h, 0, null))[0].text).toBe('nota B');
  });
});
