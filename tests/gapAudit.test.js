// @vitest-environment jsdom
// Features added by the gap audit (docs/GAP-AUDIT.md).
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { buildExtensions } from '../src/editor/extensions.js';
import { findLinkTarget } from '../src/editor/writing.js';
import { diffText, tokenize, DIFF_LEVELS } from '../src/lib/snapshotDiff.js';
import { editorSelectionText, selectionStats } from '../src/lib/text.js';

let ed;
afterEach(() => ed?.destroy());

const typeText = (editor, text) => {
  for (const ch of text) {
    const { from, to } = editor.state.selection;
    const handled = editor.view.someProp('handleTextInput', (f) => f(editor.view, from, to, ch));
    if (!handled) editor.view.dispatch(editor.state.tr.insertText(ch, from, to));
  }
};

describe('snapshot compare levels', () => {
  const a = 'Ana are mere, dar Ion pleacă. Vine seara.\nAl doilea paragraf rămâne.';
  const b = 'Ana are pere, dar Ion pleacă. Vine seara.\nAl doilea paragraf rămâne.';
  it('offers word, phrase, sentence and paragraph', () => {
    expect(DIFF_LEVELS).toEqual(['word', 'phrase', 'sentence', 'paragraph']);
  });
  it('tokens rebuild the original text at every level', () => {
    for (const l of ['phrase', 'sentence', 'paragraph']) expect(tokenize(a, l).join('')).toBe(a);
  });
  const changed = (parts) => parts.filter((p) => p.removed).map((p) => p.value.trim());
  it('word level marks only the changed word', () => {
    expect(changed(diffText(a, b, 'word'))).toEqual(['mere']);
  });
  it('phrase level marks the clause up to the comma', () => {
    expect(changed(diffText(a, b, 'phrase'))).toEqual(['Ana are mere,']);
  });
  it('sentence level marks the whole sentence', () => {
    expect(changed(diffText(a, b, 'sentence'))).toEqual(['Ana are mere, dar Ion pleacă.']);
  });
  it('paragraph level marks the whole paragraph and keeps the unchanged one', () => {
    const parts = diffText(a, b, 'paragraph');
    expect(changed(parts)).toEqual(['Ana are mere, dar Ion pleacă. Vine seara.']);
    expect(parts.find((p) => !p.added && !p.removed).value).toBe('Al doilea paragraf rămâne.');
  });
  it('identical texts give one unchanged part', () => {
    expect(diffText(a, a, 'sentence')).toEqual([{ value: a, added: false, removed: false }]);
  });
});

describe('selection statistics', () => {
  it('counts words and characters without line breaks', () => {
    expect(selectionStats('Ana are\nmere.')).toEqual({ words: 3, chars: 12 });
    expect(selectionStats('')).toEqual({ words: 0, chars: 0 });
  });
  it('reads only selections inside an editor', () => {
    document.body.innerHTML = '<div class="ProseMirror"><p id="in">unu doi trei</p></div><p id="out">afară</p>';
    const sel = window.getSelection();
    const pick = (id) => { const r = document.createRange(); r.selectNodeContents(document.getElementById(id)); sel.removeAllRanges(); sel.addRange(r); };
    pick('in');
    expect(editorSelectionText(sel)).toBe('unu doi trei');
    pick('out');
    expect(editorSelectionText(sel)).toBe('');
    sel.removeAllRanges();
    expect(editorSelectionText(sel)).toBe('');
  });
});

describe('[[Title]] internal links', () => {
  const targets = [{ id: 'a', title: 'Capitolul 1' }, { id: 'b', title: 'Ștefan cel Mare' }, { id: 'c', title: 'Capitolul 2' }];
  it('matches exact titles ignoring case and diacritics', () => {
    expect(findLinkTarget(targets, 'capitolul 1').id).toBe('a');
    expect(findLinkTarget(targets, 'stefan cel mare').id).toBe('b');
  });
  it('accepts a unique prefix, rejects an ambiguous one or no match', () => {
    expect(findLinkTarget(targets, 'Ștefan').id).toBe('b');
    expect(findLinkTarget(targets, 'Capitolul')).toBeNull();
    expect(findLinkTarget(targets, 'Epilog')).toBeNull();
    expect(findLinkTarget(targets, '  ')).toBeNull();
  });
  it('typing [[Title]] in the editor creates an internal link', () => {
    ed = new Editor({ extensions: buildExtensions({ getLinkTargets: () => targets }), content: '<p>Vezi </p>' });
    ed.commands.focus('end');
    typeText(ed, '[[stefan cel mare]]');
    const html = ed.getHTML();
    expect(html).toContain('href="scribner://doc/b"');
    expect(html).toContain('>stefan cel mare</a>');
    expect(html).not.toContain('[[');
    typeText(ed, ' după');
    expect(ed.getHTML()).toMatch(/<\/a> după<\/p>/);
  });
  it('leaves the brackets when no document matches', () => {
    ed = new Editor({ extensions: buildExtensions({ getLinkTargets: () => targets }), content: '<p></p>' });
    ed.commands.focus('end');
    typeText(ed, '[[Nimic]]');
    expect(ed.getHTML()).toBe('<p>[[Nimic]]</p>');
  });
});
