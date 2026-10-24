// @vitest-environment jsdom
// Bug: tabs (tab stops), double spaces and a leading space typed in the editor were lost the
// next time the document was loaded (document switch, split pane sync), because the saved HTML
// was parsed with ProseMirror's default whitespace collapsing.
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import { Editor } from '@tiptap/core';
import { buildExtensions } from '../src/editor/extensions.js';
import { PARSE_OPTIONS, htmlToDoc, replaceChangedRange } from '../src/editor/syncDoc.js';

let ed;
afterEach(() => ed?.destroy());
const SAVED = '<p data-tabs="2" style="tab-size: 2cm;">a\tb  c</p><p> lead</p><ul><li><p>x</p></li></ul><p>end</p>';

describe('saved HTML round-trips whitespace', () => {
  it('loading saved HTML keeps tabs, double and leading spaces', () => {
    ed = new Editor({ extensions: buildExtensions({}), content: SAVED, parseOptions: PARSE_OPTIONS });
    expect(ed.getHTML()).toBe(SAVED);
  });
  it('pretty-printed HTML gets no stray paragraphs', () => {
    ed = new Editor({ extensions: buildExtensions({}), content: '<p>a</p>\n<ul>\n <li><p>x</p></li>\n</ul>\n', parseOptions: PARSE_OPTIONS });
    expect(ed.getHTML()).toBe('<p>a</p><ul><li><p>x</p></li></ul>');
  });
  it('setHtml (split pane sync) keeps whitespace', () => {
    ed = new Editor({ extensions: buildExtensions({}), content: '<p>a</p>', parseOptions: PARSE_OPTIONS });
    const tr = ed.state.tr;
    replaceChangedRange(tr, htmlToDoc(SAVED, ed.schema));
    ed.view.dispatch(tr);
    expect(ed.getHTML()).toBe(SAVED);
  });
  it('the Editor component parses with PARSE_OPTIONS', () => {
    const src = fs.readFileSync('src/components/Editor.jsx', 'utf8');
    expect(src).toMatch(/parseOptions: PARSE_OPTIONS/);
    expect(src).toMatch(/htmlToDoc\(/);
  });
});
