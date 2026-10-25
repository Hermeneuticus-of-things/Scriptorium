// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { buildExtensions } from '../src/editor/extensions.js';
import { pushHistory, routeSelection, sumCounts, titleMenuEntries } from '../src/lib/panes.js';
import { convertToPlainText, removeAllComments, removeAllFootnotes } from '../src/lib/textOps.js';
import { editorMenus } from '../src/lib/editorMenus.js';
import { uiRo, uiEn } from '../src/lib/i18n-ui.js';

let ed;
afterEach(() => ed?.destroy());
const make = (html) => (ed = new Editor({ extensions: buildExtensions({ smartQuotes: false }), content: html }));

describe('header bar: routing, title menu, totals', () => {
  it('linked panes send the pick to the other pane', () => {
    expect(routeSelection({ active: 'main', hasSplit: true, linked: true })).toBe('split');
    expect(routeSelection({ active: 'split', hasSplit: true, linked: true })).toBe('main');
    expect(routeSelection({ active: 'main', hasSplit: false, linked: true })).toBe('main');
    // the other pane locked: back to the active one
    expect(routeSelection({ active: 'main', hasSplit: true, linked: true, locks: { split: true } })).toBe('main');
    expect(routeSelection({ active: 'main', hasSplit: true })).toBe('main');
  });
  it('title menu: recent (newest first, gone ones dropped) and same-folder documents', () => {
    let h = pushHistory(null, 'a');
    h = pushHistory(h, 'b');
    h = pushHistory(h, 'gone');
    h = pushHistory(h, 'c');
    const titles = { a: 'A', b: 'B', c: 'C' };
    const { recent, near } = titleMenuEntries({ history: h, siblings: [{ id: 'c', title: 'C' }, { id: 'd', title: 'D' }], currentId: 'c', titleOf: (id) => titles[id] ?? null });
    expect(recent.map((x) => x.title)).toEqual(['C', 'B', 'A']);
    expect(recent[0].current).toBe(true);
    expect(near).toEqual([{ id: 'c', title: 'C', current: true }, { id: 'd', title: 'D', current: false }]);
  });
  it('Scrivenings totals', () => {
    expect(sumCounts(['a', 'b', 'x'], { a: 10, b: 5 }, (id) => ({ a: 50, b: 20 })[id] || 0)).toEqual({ words: 15, chars: 70 });
  });
});

describe('Format › Text', () => {
  it('removes all comments and annotations, keeping the text', () => {
    make('<p>Un <span data-comment="nota">text</span> aici<span data-annotation="x">x</span>.</p>');
    expect(removeAllComments(ed)).toBeGreaterThan(0);
    expect(ed.getHTML()).not.toContain('data-comment');
    expect(ed.getHTML()).not.toContain('data-annotation');
    expect(ed.getText()).toContain('Un text aici');
  });
  it('removes footnotes (markers and linked)', () => {
    make('<p>A<span data-footnote="n1"></span> și <span data-linked-footnote="n2">ancoră</span>.</p>');
    expect(removeAllFootnotes(ed)).toBe(2);
    const h = ed.getHTML();
    expect(h).not.toContain('data-footnote');
    expect(h).not.toContain('data-linked-footnote');
    expect(ed.getText()).toContain('ancoră');
  });
  it('converts the document to plain paragraphs', () => {
    make('<h1>Titlu</h1><ul><li><p><strong>unu</strong></p></li></ul><p style="text-align: center"><em>doi</em></p>');
    expect(convertToPlainText(ed)).toBe(true);
    expect(ed.getHTML()).toBe('<p>Titlu</p><p>unu</p><p>doi</p>');
  });
  it('converts only the blocks touched by the selection', () => {
    make('<h1>Titlu</h1><p><strong>doi</strong></p>');
    const pos = ed.state.doc.content.size - 2;
    ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, pos - 1, pos)));
    convertToPlainText(ed);
    expect(ed.getHTML()).toBe('<h1>Titlu</h1><p>doi</p>');
  });
  it('the Format menu has the Text submenu', () => {
    const view = {};
    const m = editorMenus({ t: (k) => k, handle: () => null, view, setView: () => {}, run: () => {} });
    const text = m.format.find((x) => x.label === 'ui.p8.textMenu');
    expect(text).toBeTruthy();
    const labels = text.submenu.filter((x) => x !== '-').map((x) => x.label);
    expect(labels).toEqual(expect.arrayContaining(['ui.p8.removeComments', 'ui.p8.removeFootnotes', 'ui.p8.toPlainText', 'ui.p8.hyphenate']));
    expect(labels.filter((l) => l.startsWith('ui.p8.insertPlaceholder: <$')).length).toBeGreaterThan(3);
    expect(text.submenu.some((x) => x.submenu)).toBe(false);
  });
});

describe('format bar: character spacing and list numbering', () => {
  it('letter spacing round-trips and can be removed', () => {
    make('<p>abc</p>');
    ed.commands.selectAll();
    ed.commands.setLetterSpacing('0.1em');
    expect(ed.getHTML()).toContain('letter-spacing: 0.1em');
    ed.commands.setContent(ed.getHTML());
    expect(ed.getHTML()).toContain('letter-spacing: 0.1em');
    ed.commands.selectAll();
    ed.commands.unsetLetterSpacing();
    expect(ed.getHTML()).not.toContain('letter-spacing');
    ed.commands.setLetterSpacing('evil;color:red');
    expect(ed.getHTML()).not.toContain('evil');
  });
  it('list formats: a) and 1.1', () => {
    make('<p>unu</p>');
    ed.commands.setOrderedListFormat('paren', 'a');
    let h = ed.getHTML();
    expect(h).toContain('data-list-format="paren"');
    expect(h).toContain('type="a"');
    ed.commands.setContent(h);
    expect(ed.getHTML()).toContain('data-list-format="paren"');
    ed.commands.setTextSelection(3);
    ed.commands.setOrderedListFormat('legal');
    h = ed.getHTML();
    expect(h).toContain('data-list-format="legal"');
    expect(h).not.toContain('type="a"');
    ed.commands.setOrderedListFormat('dot', 'I');
    h = ed.getHTML();
    expect(h).not.toContain('data-list-format');
    expect(h).toContain('type="I"');
  });
});

describe('P8 strings', () => {
  it('every ui.p8 key exists in both languages', () => {
    const ro = Object.keys(uiRo).filter((k) => k.startsWith('ui.p8.'));
    const en = Object.keys(uiEn).filter((k) => k.startsWith('ui.p8.'));
    expect(ro.length).toBeGreaterThan(30);
    expect(new Set(ro)).toEqual(new Set(en));
  });
});
