// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { buildExtensions } from '../src/editor/extensions.js';
import { correctionEdits, applyCorrections } from '../src/lib/textRange.js';
import { replaceRangeText, applyTextEdits } from '../src/lib/serviceApply.js';

let ed;
afterEach(() => ed?.destroy());
const make = (html) => (ed = new Editor({ extensions: buildExtensions({ smartQuotes: false }), content: html }));
const rangeOf = (doc, needle) => {
  let r = null;
  doc.descendants((n, pos) => { if (!r && n.isText && n.text.includes(needle)) { const a = pos + n.text.indexOf(needle); r = { from: a, to: a + needle.length }; } });
  return r;
};

describe('in-app translation Replace / Insert keep formatting and range', () => {
  it('Replace keeps the bold of the selection', () => {
    make('<p>Un <strong>câine</strong> negru.</p>');
    const range = rangeOf(ed.state.doc, 'câine');
    expect(replaceRangeText(ed, range, 'dog')).toBe(true);
    expect(ed.getHTML()).toBe('<p>Un <strong>dog</strong> negru.</p>');
  });
  it('Insert after puts the text right after the range, with a space', () => {
    make('<p>Un <em>câine</em> negru.</p>');
    const range = rangeOf(ed.state.doc, 'câine');
    replaceRangeText(ed, range, '(dog)', true);
    expect(ed.state.doc.textContent).toBe('Un câine (dog) negru.');
  });
});

describe('grammar corrections touch only the corrected spans', () => {
  it('keeps the formatting around and inside the selection', () => {
    make('<p>Am <strong>vazut</strong> un <em>caine</em> mare.</p>');
    const source = 'Am vazut un caine mare.';
    const range = { from: 1, to: 1 + source.length };
    expect(ed.state.doc.textBetween(range.from, range.to, '\n\n')).toBe(source);
    const matches = [{ offset: 3, length: 5, replacements: ['văzut'] }, { offset: 12, length: 5, replacements: ['câine'] }];
    const edits = correctionEdits(source, matches, [0, 0]);
    expect(applyCorrections(source, matches, [0, 0])).toBe('Am văzut un câine mare.');
    expect(applyTextEdits(ed, range, source, edits)).toBe(true);
    expect(ed.getHTML()).toBe('<p>Am <strong>văzut</strong> un <em>câine</em> mare.</p>');
  });
  it('works across paragraphs (selection text joined with blank lines)', () => {
    make('<p>Prima frază gresita.</p><p>A <strong>doua</strong> fraza.</p>');
    const source = ed.state.doc.textBetween(1, ed.state.doc.content.size - 1, '\n\n');
    const range = { from: 1, to: ed.state.doc.content.size - 1 };
    const i = source.indexOf('gresita');
    const j = source.indexOf('fraza');
    const edits = correctionEdits(source, [{ offset: i, length: 7, replacements: ['greșită'] }, { offset: j, length: 5, replacements: ['frază'] }], [0, 0]);
    expect(applyTextEdits(ed, range, source, edits)).toBe(true);
    expect(ed.getHTML()).toBe('<p>Prima frază greșită.</p><p>A <strong>doua</strong> frază.</p>');
  });
  it('refuses when the text changed', () => {
    make('<p>abc</p>');
    expect(applyTextEdits(ed, { from: 1, to: 4 }, 'abd', [{ offset: 0, length: 1, text: 'x' }])).toBe(false);
    expect(ed.getHTML()).toBe('<p>abc</p>');
  });
});
