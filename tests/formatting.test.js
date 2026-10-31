// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { buildExtensions } from '../src/editor/extensions.js';
import { findFormatting, listBookmarks, paragraphCss, parseTabStops, sentenceBounds, wordBounds } from '../src/editor/formatting.js';
import { fadeOpacity } from '../src/editor/lineHighlight.js';
import { correctionFor, simulateTyping } from '../src/editor/corrections.js';
import { tagWord, POS_CLASSES } from '../src/lib/pos.js';
import { collectSceneHeadings, completeSceneHeading, getFormat, SCRIPT_FORMATS } from '../src/lib/scriptFormats.js';

let ed;
const make = (html) => (ed = new Editor({ extensions: buildExtensions({ smartQuotes: false }), content: html }));
const roundTrip = (html) => {
  const out = make(html).getHTML();
  const again = make(out).getHTML();
  expect(again).toBe(out);
  return out;
};
afterEach(() => ed?.destroy());

describe('formatting round-trips', () => {
  it('keeps paragraph spacing, indents, tab stops and direction', () => {
    const out = roundTrip('<p style="line-height: 1.5; margin-top: 6pt; margin-bottom: 12pt; text-indent: 1cm; margin-left: 2cm; margin-right: 0.5cm" data-tabs="4,2" dir="rtl">x</p>');
    const a = ed.state.doc.firstChild.attrs;
    expect(a).toMatchObject({ lineHeight: 1.5, spaceBefore: 6, spaceAfter: 12, firstIndent: 1, indentLeft: 2, indentRight: 0.5, tabStops: '2,4', dir: 'rtl' });
    expect(out).toContain('dir="rtl"');
  });
  it('ignores margins in other units', () => {
    make('<p style="margin-left: 30px; line-height: 20px">x</p>');
    expect(ed.state.doc.firstChild.attrs.indentLeft).toBe(null);
    expect(ed.state.doc.firstChild.attrs.lineHeight).toBe(null);
  });
  it('keeps font family/size, caps, bookmarks', () => {
    const out = roundTrip('<p><span style="font-family: Georgia; font-size: 14pt">a</span> <span data-caps="small">b</span> <span data-caps="all">c</span> <span data-bookmark="Start">d</span></p>');
    expect(out).toContain('font-family: Georgia');
    expect(out).toContain('font-size: 14pt');
    expect(out).toContain('data-caps="small"');
    expect(out).toContain('data-caps="all"');
    expect(listBookmarks(ed.state.doc)).toEqual([{ name: 'Start', from: 7, to: 8 }]);
  });
  it('comment colour, author and date', () => {
    const out = roundTrip('<p><span data-comment="c" data-comment-color="#ff0000" data-comment-author="Ana" data-comment-date="2026-10-23T10:00:00Z">x</span> <span data-comment="d" data-color="#00ff00" data-author="Ion">y</span></p>');
    expect(out).toContain('data-comment-color="#ff0000"');
    expect(out).toContain('data-comment-author="Ana"');
    expect(out).toContain('data-comment-date="2026-10-23T10:00:00Z"');
    expect(out).toContain('--comment-color: #ff0000');
    expect(out).toContain('data-comment-author="Ion"');
    expect(out).toContain('data-comment-color="#00ff00"');
  });
  it('page break differs from horizontal rule', () => {
    const out = roundTrip('<hr><hr data-page-break="true"><p>x</p>');
    expect(ed.state.doc.child(0).type.name).toBe('horizontalRule');
    expect(ed.state.doc.child(1).type.name).toBe('pageBreak');
    expect(out).toContain('<hr data-page-break="true" class="page-break">');
  });
  it('image width and alignment, ordered list type', () => {
    const out = roundTrip('<p><img src="data:image/png;base64,AA==" width="50%" data-align="center"></p><ol type="a"><li><p>x</p></li></ol>');
    expect(out).toContain('width="50%"');
    expect(out).toContain('data-align="center"');
    expect(out).toContain('type="a"');
  });
});

describe('formatting commands', () => {
  it('select word / sentence / paragraph', () => {
    make('<p>Prima frază. A doua frază aici.</p>');
    ed.commands.setTextSelection(18);
    ed.commands.selectWord();
    expect(ed.state.doc.textBetween(ed.state.selection.from, ed.state.selection.to)).toBe('doua');
    ed.commands.selectSentence();
    expect(ed.state.doc.textBetween(ed.state.selection.from, ed.state.selection.to)).toBe('A doua frază aici.');
    ed.commands.selectParagraph();
    expect(ed.state.selection.to - ed.state.selection.from).toBe(31);
  });
  it('copy / paste formatting', () => {
    make('<p style="line-height: 2"><strong>bold</strong></p><p>plain</p>');
    ed.commands.setTextSelection({ from: 1, to: 5 });
    ed.commands.copyFormat();
    ed.commands.setTextSelection({ from: 7, to: 12 });
    ed.commands.pasteFormat();
    expect(ed.getHTML()).toContain('<p style="line-height: 2;" data-line-height="2"><strong>plain</strong></p>');
  });
  it('applies default formatting', () => {
    make('<p style="line-height: 3; margin-left: 2cm; text-align: center"><span style="font-family: Arial; color: #ff0000">x</span></p>');
    ed.commands.applyDefaultFormatting({ firstIndent: 1 });
    const out = ed.getHTML();
    expect(out).not.toContain('line-height');
    expect(out).not.toContain('Arial');
    expect(out).not.toContain('center');
    expect(out).toContain('text-indent: 1cm');
    expect(out).toContain('color');
  });
  it('bookmarks: set, jump, remove; RTL toggle', () => {
    make('<p>unu doi trei</p>');
    ed.commands.setTextSelection(6);
    ed.commands.setBookmark('B');
    expect(listBookmarks(ed.state.doc)).toEqual([{ name: 'B', from: 5, to: 8 }]);
    ed.commands.setTextSelection(1);
    ed.commands.goToBookmark('B');
    expect(ed.state.selection.from).toBe(5);
    ed.commands.removeBookmark('B');
    expect(listBookmarks(ed.state.doc)).toEqual([]);
    ed.commands.toggleRtl();
    expect(ed.getHTML()).toContain('dir="rtl"');
  });
  it('find by formatting', () => {
    make('<p><span data-comment="c">a</span> <mark data-color="#fff176" style="background-color: #fff176">b</mark> <span data-footnote="n"></span></p><p data-style="motto">m</p>');
    expect(findFormatting(ed.state.doc, 'comment')).toEqual([{ from: 1, to: 2 }]);
    expect(findFormatting(ed.state.doc, 'highlight', '#FFF176')).toHaveLength(1);
    expect(findFormatting(ed.state.doc, 'highlight', '#000')).toHaveLength(0);
    expect(findFormatting(ed.state.doc, 'footnote')).toHaveLength(1);
    expect(findFormatting(ed.state.doc, 'style', 'motto')).toHaveLength(1);
  });
  it('find by formatting: links, images, tables', () => {
    make('<p><a href="http://x.ro">lnk</a></p><p><img src="data:image/png;base64,AA=="></p><table><tbody><tr><td><p>c</p></td></tr></tbody></table>');
    expect(findFormatting(ed.state.doc, 'link').length).toBeGreaterThan(0);
    expect(findFormatting(ed.state.doc, 'image')).toHaveLength(1);
    expect(findFormatting(ed.state.doc, 'table')).toHaveLength(1);
  });
  it('find by formatting: character formats, links, images, preserved text', () => {
    make('<p>vezi <a href="https://ex.ro/a">leg</a>, <strong>b</strong>, <u>s</u>, <code>c</code> și <img src="media/f.png" alt="fig"></p>');
    const hit = (kind, value) => findFormatting(ed.state.doc, kind, value);
    expect(hit('charFormat', 'bold')).toHaveLength(1);
    expect(ed.state.doc.textBetween(hit('charFormat', 'bold')[0].from, hit('charFormat', 'bold')[0].to)).toBe('b');
    expect(hit('charFormat', 'underline')).toHaveLength(1);
    expect(hit('charFormat', 'strike')).toHaveLength(0);
    expect(hit('charFormat')).toHaveLength(2);
    expect(hit('link')).toHaveLength(1);
    expect(ed.state.doc.textBetween(hit('link')[0].from, hit('link')[0].to)).toBe('leg');
    expect(hit('link', 'ex.ro')).toHaveLength(1);
    expect(hit('link', 'leg')).toHaveLength(1);
    expect(hit('link', 'zzz')).toHaveLength(0);
    expect(hit('image')).toHaveLength(1);
    expect(hit('image', 'f.png')).toHaveLength(1);
    expect(hit('image', 'fig')).toHaveLength(1);
    expect(hit('image', 'zzz')).toHaveLength(0);
    expect(hit('preserve')).toHaveLength(1);
    expect(ed.state.doc.textBetween(hit('preserve')[0].from, hit('preserve')[0].to)).toBe('c');
  });
});

describe('pure helpers', () => {
  it('bounds, tabs, css, fade', () => {
    expect(wordBounds('ab cd', 4)).toEqual([3, 5]);
    expect(sentenceBounds('Unu. Doi trei!', 7)).toEqual([5, 14]);
    expect(parseTabStops('3, 1,1,x')).toEqual([{ pos: 1, type: 'left' }, { pos: 3, type: 'left' }]);
    expect(paragraphCss({ indentLeft: 1, spaceBefore: 0 })).toBe('margin-top: 0pt; margin-left: 1cm');
    expect(fadeOpacity('x')).toBe(0.28);
    expect(fadeOpacity(5)).toBe(1);
  });
  it('smart fractions only when enabled', () => {
    expect(simulateTyping('1/2 ', { smartFractions: true })).toBe('½ ');
    expect(simulateTyping('1/2 ', {})).toBe('1/2 ');
    expect(simulateTyping('11/22 ', { smartFractions: true })).toBe('11/22 ');
    expect(correctionFor('3/4', '0', { smartFractions: true })).toBe(null);
  });
  it('pronouns in linguistic focus', () => {
    expect(POS_CLASSES.map((c) => c[0])).toContain('pron');
    expect(tagWord('noi')).toBe('pron');
    expect(tagWord('they', 'en')).toBe('pron');
  });
  it('UK stage play and scene heading completion', () => {
    expect(SCRIPT_FORMATS['stageplay-uk']).toBeTruthy();
    expect(getFormat('stageplay-uk').elements.find((e) => e.id === 'character').css.textAlign).toBeUndefined();
    const hs = collectSceneHeadings('<p data-script="scene-heading">INT. CASA - ZI</p><p data-script="action">x</p>');
    expect(hs).toEqual(['INT. CASA - ZI']);
    expect(completeSceneHeading(hs, 'e')).toEqual(['EXT. ', 'EXT./INT. ']);
    expect(completeSceneHeading(hs, 'INT. C')).toEqual(['INT. CASA - ZI', 'INT. CASA - ']);
  });
});
