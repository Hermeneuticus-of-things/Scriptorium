// @vitest-environment jsdom
// Regressions for bugs found by the browser pass (tests/e2e/browser/*.cjs).
import { describe, it, expect, afterEach } from 'vitest';
import { Editor, createDocument } from '@tiptap/core';
import { buildExtensions } from '../src/editor/extensions.js';
import { replaceChangedRange } from '../src/editor/syncDoc.js';
import { expandReplacement, findRanges, replaceRanges } from '../src/editor/docSearch.js';
import { invisiblesKey } from '../src/editor/invisibles.js';
import { linguisticDecorations, linguisticFocusKey } from '../src/extensions/LinguisticFocus.js';

let ed;
afterEach(() => ed?.destroy());
const make = (content, opts = {}) => (ed = new Editor({ extensions: buildExtensions({ corrections: {}, ...opts }), content }));
const decoKeys = (set, doc) => set.find(0, doc.content.size).map((d) => `${d.from}-${d.to}`).sort();

describe('split view sync keeps the caret (setHtml)', () => {
  it('replaces only the changed range so a caret before the edit stays put', () => {
    make('<p>Era o dimineață rece.</p><p>Nu știa.</p>');
    ed.commands.setTextSelection(5);
    const tr = ed.state.tr;
    expect(replaceChangedRange(tr, createDocument('<p>Era o dimineață rece.</p><p>Nu știa. SINCRON</p>', ed.schema))).toBe(true);
    ed.view.dispatch(tr);
    expect(ed.state.selection.from).toBe(5);
    expect(ed.getText()).toContain('Nu știa. SINCRON');
  });
  it('maps a caret after the edit and is a no-op for equal docs', () => {
    make('<p>aaa bbb</p><p>ccc</p>');
    const end = ed.state.doc.content.size - 1;
    ed.commands.setTextSelection(end);
    let tr = ed.state.tr;
    replaceChangedRange(tr, createDocument('<p>aaa XX bbb</p><p>ccc</p>', ed.schema));
    ed.view.dispatch(tr);
    expect(ed.state.selection.from).toBe(end + 3);
    tr = ed.state.tr;
    expect(replaceChangedRange(tr, createDocument(ed.getHTML(), ed.schema))).toBe(false);
  });
  it('handles repeated text where diff start/end overlap', () => {
    make('<p>aa</p>');
    const tr = ed.state.tr;
    replaceChangedRange(tr, createDocument('<p>aaa</p>', ed.schema));
    ed.view.dispatch(tr);
    expect(ed.getHTML()).toBe('<p>aaa</p>');
  });
});

describe('find bar replacement', () => {
  it('inserts "$5" literally in non-regex mode', () => {
    make('<p>Preț (a+b)? x</p>');
    const ranges = findRanges(ed.state.doc, /\(a\+b\)\?/gu);
    replaceRanges(ed, ranges, '$5');
    expect(ed.getText()).toBe('Preț $5 x');
  });
  it('expands groups only in regex mode; unknown groups stay literal', () => {
    const m = /(Preț) (\d)/u.exec('Preț 5');
    expect(expandReplacement('$2 $1', m, true)).toBe('5 Preț');
    expect(expandReplacement('$2 $1', m, false)).toBe('$2 $1');
    expect(expandReplacement('$9 $$ $&', m, true)).toBe('$9 $ Preț 5');
  });
});

describe('redo keys never fall back to undo', () => {
  it('Mod-Shift-z with lowercase "z" and an empty redo stack does not undo', () => {
    make('<p>abc</p>');
    ed.commands.insertContentAt(ed.state.doc.content.size - 1, ' def');
    const before = ed.getText();
    for (const ctrlKey of [true]) {
      const e = new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', keyCode: 90, shiftKey: true, ctrlKey, metaKey: false, bubbles: true, cancelable: true });
      ed.view.someProp('handleKeyDown', (f) => f(ed.view, e));
    }
    expect(ed.getText()).toBe(before);
  });
});

describe('incremental decorations match a full rebuild', () => {
  const edits = [
    (e) => e.commands.insertContentAt(3, 'xy z'),
    (e) => e.commands.insertContentAt(e.state.doc.content.size - 1, ' și casa mare'),
    (e) => e.chain().setTextSelection(4).splitBlock().run(),
    (e) => e.chain().setTextSelection({ from: 2, to: 12 }).deleteSelection().run(),
    (e) => e.chain().setTextSelection(1).joinBackward().run(),
    (e) => e.commands.insertContentAt(e.state.doc.content.size, '<p>Andrei merge acasă repede</p>'),
  ];
  it('invisibles', () => {
    make('<p>Era o dimineață rece</p><p>Nu știa încă</p><p>Andrei pleacă</p>', { showInvisibles: true });
    for (const edit of edits) {
      edit(ed);
      const inc = invisiblesKey.getState(ed.state).set;
      ed.commands.setInvisibles(false);
      ed.commands.setInvisibles(true);
      const full = invisiblesKey.getState(ed.state).set;
      expect(decoKeys(inc, ed.state.doc)).toEqual(decoKeys(full, ed.state.doc));
    }
  });
  it('linguistic focus', () => {
    make('<p>Era o dimineață rece</p><p>Nu știa încă</p><p>Andrei pleacă</p>');
    ed.commands.setLinguisticFocus('noun', 'ro');
    for (const edit of edits) {
      edit(ed);
      const inc = linguisticFocusKey.getState(ed.state);
      expect(decoKeys(inc, ed.state.doc)).toEqual(decoKeys(linguisticDecorations(ed.state.doc, 'noun', 'ro'), ed.state.doc));
    }
  });
});
