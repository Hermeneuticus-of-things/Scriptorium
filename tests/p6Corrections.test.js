// @vitest-environment jsdom
// P6: corrections, editing options and in-document search, in detail.
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { buildExtensions } from '../src/editor/extensions.js';
import { correctionFor, simulateTyping, fixWord, isSentenceStart, parseCapExceptions, smartQuote, spellIgnoreRanges, grammarIssues } from '../src/editor/corrections.js';
import { autoPairFor, plainFormatFragment, resetFormattingHtml, strikeRange } from '../src/editor/editingOptions.js';
import { parseReplacements, serializeReplacements, mergeReplacements } from '../lib/autoReplace.js';
import { buildDocRegex, findRanges, foldText, rangesWithin, loadFindHistory, pushFindHistory, clearFindHistory } from '../src/editor/docSearch.js';
import { correctionOptions, editingCssVars, editingFrom, emTo, toEm, parseTabs, revisionRoundLabel, setEditingPrefs } from '../src/lib/editingPrefs.js';
import { newNode } from '../src/lib/text.js';

let ed;
afterEach(() => {
  ed?.destroy();
  ed = null;
  setEditingPrefs({});
});
const make = (content, corrections = {}) => {
  ed = new Editor({ extensions: buildExtensions({ corrections }), content });
  return ed;
};
const type = (editor, text) => {
  for (const ch of text) {
    const { from, to } = editor.state.selection;
    const handled = editor.view.someProp('handleTextInput', (f) => f(editor.view, from, to, ch));
    if (!handled) editor.view.dispatch(editor.state.tr.insertText(ch, from, to));
  }
};

describe('Corecturi: cuvinte', () => {
  it('DOuă MAjuscule, Caps Lock, zilele', () => {
    expect(fixWord('DOuă')).toBe('Două');
    expect(fixWord('MAjuscule')).toBe('Majuscule');
    expect(fixWord('NATO')).toBe('NATO');
    expect(fixWord('cUVÂNT')).toBe('Cuvânt');
    expect(fixWord('iPad')).toBe('iPad');
    expect(fixWord('monday')).toBe('Monday');
    expect(fixWord('monday', { dayLanguages: ['ro'] })).toBe('monday');
    expect(fixWord('montag', { dayLanguages: ['de-DE'] })).toBe('Montag');
  });
  it('se aplică la final de cuvânt, cu opțiunile pornite', () => {
    const o = { fixTwoCaps: true, fixCapsLock: true, capitalizeDays: true, dayLanguages: ['en'] };
    expect(simulateTyping('THe cAT on monday ', o)).toBe('The Cat on Monday ');
    expect(simulateTyping('THe ', {})).toBe('THe ');
    expect(simulateTyping('a2BCd ', o)).toBe('a2BCd ');
  });
  it('excepții la majuscula automată', () => {
    expect(isSentenceStart('Vine dr. ')).toBe(false);
    expect(isSentenceStart('Vine gen. ', ['gen'])).toBe(false);
    expect(isSentenceStart('Vine gen. ')).toBe(true);
    expect(isSentenceStart('Gata! ')).toBe(true);
    expect(parseCapExceptions('dr., gen.; Nr.')).toEqual(['dr', 'gen', 'nr']);
    expect(simulateTyping('vine gen. ion', { autoCapitalize: true, capExceptions: ['gen'] })).toBe('Vine gen. ion');
    expect(simulateTyping('vine. ion', { autoCapitalize: true })).toBe('Vine. Ion');
  });
});

describe('Ghilimele', () => {
  it('perechi alese', () => {
    expect(smartQuote('', '"', 'ro')).toBe('„');
    expect(smartQuote('„text', '"', 'ro')).toBe('”');
    expect(smartQuote('', '"', 'en')).toBe('“');
    expect(smartQuote(' ', '"', 'guillemets')).toBe('«');
    expect(smartQuote('x', '"', 'de')).toBe('“');
    expect(smartQuote('', "'", 'ro', 'de')).toBe('‚');
    expect(smartQuote('‚text', "'", 'ro', 'de')).toBe('‘');
    expect(smartQuote('don', "'", 'en', 'en')).toBe('’');
    expect(smartQuote('', "'", 'ro', 'straight')).toBe("'");
  });
  it('editorul folosește perechea aleasă', () => {
    const e = make('<p></p>', { editing: { quoteStyle: 'en' } });
    e.commands.focus('end');
    type(e, '"hi"');
    expect(e.getText()).toBe('“hi”');
  });
});

describe('Ortografie și gramatică', () => {
  it('cuvinte ignorate de corector', () => {
    const t = 'Vezi NATO, mp3 și https://exemplu.ro/a, scrie la ion@x.ro.';
    const r = spellIgnoreRanges(t).map((x) => t.slice(x.from, x.to));
    expect(r).toEqual(['NATO', 'mp3', 'https://exemplu.ro/a', 'ion@x.ro']);
    expect(spellIgnoreRanges(t, { ignoreUpper: false, ignoreDigits: false, ignoreUrls: true }).length).toBe(2);
  });
  it('probleme de gramatică', () => {
    const kinds = (t) => grammarIssues(t).map((x) => x.kind);
    expect(kinds('A fost fost bine.')).toEqual(['repeat']);
    expect(kinds('Unu  doi.')).toEqual(['spaces']);
    expect(kinds('Da , sigur.')).toEqual(['spaceBefore']);
    expect(kinds('Da,sigur.')).toEqual(['spaceAfter']);
    expect(kinds('Gata. apoi')).toEqual(['lowerStart']);
    expect(kinds('Vine dr. ion')).toEqual([]);
    expect(kinds('Are 1,5 kg.')).toEqual([]);
  });
  it('decorații și verificarea oprită', () => {
    const e = make('<p>Gata. apoi NATO</p>', { grammarCheck: true, ignoreUpper: true, spellCheck: false });
    expect(e.view.dom.getAttribute('spellcheck')).toBe('false');
    const html = e.view.dom.innerHTML;
    expect(html).toContain('grammar-issue');
    const e2 = new Editor({ extensions: buildExtensions({ corrections: { ignoreUpper: true } }), content: '<p>NATO e aici</p>' });
    expect(e2.view.dom.querySelector('[spellcheck="false"]')?.textContent).toBe('NATO');
    e2.destroy();
  });
});

describe('Lista de înlocuiri: import / export', () => {
  it('citește TAB, =>, CSV și JSON', () => {
    expect(parseReplacements('# comentariu\nteh\tthe\n(c) => ©\n"a,b","c"\n\n')).toEqual([
      { from: 'teh', to: 'the' },
      { from: '(c)', to: '©' },
      { from: 'a,b', to: 'c' },
    ]);
    expect(parseReplacements('[{"from":"x","to":"y"}]')).toEqual([{ from: 'x', to: 'y' }]);
    expect(parseReplacements('{"x":"y"}')).toEqual([{ from: 'x', to: 'y' }]);
  });
  it('dus-întors și combinare', () => {
    const list = [{ from: 'teh', to: 'the' }, { from: 'sî', to: 'și', learned: true }];
    expect(parseReplacements(serializeReplacements(list))).toEqual([{ from: 'teh', to: 'the' }, { from: 'sî', to: 'și' }]);
    const m = mergeReplacements(list, [{ from: 'teh', to: 'THE' }, { from: 'new', to: 'nou' }]);
    expect(m.added).toBe(1);
    expect(m.updated).toBe(1);
    expect(m.list.map((r) => r.to)).toEqual(['THE', 'și', 'nou']);
    expect(mergeReplacements(list, [{ from: 'a', to: 'b' }], 'replace').list).toEqual([{ from: 'a', to: 'b' }]);
  });
});

describe('Editare: opțiuni', () => {
  it('închide parantezele și ghilimelele', () => {
    expect(autoPairFor('', '', '(')).toEqual({ insert: '()', cursor: 1 });
    expect(autoPairFor('(a', ')', ')')).toEqual({ skip: true });
    expect(autoPairFor('', 'x', '(')).toBe(null);
    expect(autoPairFor('', '', '"', { double: 'ro' })).toEqual({ insert: '„”', cursor: 1 });
    expect(autoPairFor('„a', '”', '"', { double: 'ro' })).toEqual({ skip: true });
    expect(autoPairFor('', '', '"', { smart: false })).toEqual({ insert: '""', cursor: 1 });
    const e = make('<p></p>', { editing: { autoPairBrackets: true, autoPairQuotes: true } });
    e.commands.focus('end');
    type(e, '(da) "x"');
    expect(e.getText()).toBe('(da) „x”');
  });
  it('titlul documentelor noi', () => {
    setEditingPrefs({ defaultDocTitle: 'Scenă', defaultFolderTitle: 'Capitol' });
    expect(newNode('text').title).toBe('Scenă');
    expect(newNode('folder').title).toBe('Capitol');
    expect(newNode('text', 'X').title).toBe('X');
  });
  it('variabile CSS și unități', () => {
    const v = editingCssVars(editingFrom({ typewriterPos: 30, endSpace: 50, caretWidth: 3, caretBlink: false, paraAlign: 'justify' }));
    expect(v['--typewriter-pos']).toBe('30%');
    expect(v['--editor-end-space']).toBe('50vh');
    expect(v['--caret-width']).toBe('3px');
    expect(v['--caret-blink']).toBe('0s');
    expect(v['--para-align']).toBe('justify');
    expect(emTo(toEm(2.5, 'cm'), 'cm')).toBe(2.5);
    expect(emTo(1, 'pt')).toBe(12);
    expect(parseTabs('2, 1', 'in')).toEqual([6, 12]);
    const root = document.createElement('div');
    setEditingPrefs({ caretWidth: 3 }, root);
    expect(root.dataset.customCaret).toBe('on');
    expect(root.style.getPropertyValue('--caret-width')).toBe('3px');
  });
  it('opțiunile ajung la editor', () => {
    const o = correctionOptions({ fixTwoCaps: false, spellCheckLive: false, spellLanguages: ['ro'], quoteStyle: 'en', capExceptions: 'gen., dr.' });
    expect(o.fixTwoCaps).toBe(false);
    expect(o.spellCheck).toBe(false);
    expect(o.dayLanguages).toEqual(['ro', 'en']);
    expect(o.capExceptions).toEqual(['gen', 'dr']);
    expect(o.editing.quoteStyle).toBe('en');
  });
});

describe('Editare: formatare', () => {
  it('textul lipit pierde formatarea directă', () => {
    const e = make('<p style="text-align: center"><span style="font-family: Arial; font-size: 20px">x</span> <strong>b</strong></p>');
    const frag = plainFormatFragment(e.state.doc.content);
    const p = frag.firstChild;
    expect(p.attrs.textAlign ?? null).toBe(null);
    const marks = [];
    p.forEach((n) => marks.push(...n.marks.map((m) => m.type.name)));
    expect(marks).toContain('bold');
    expect(marks).not.toContain('textStyle');
  });
  it('conversia la formatarea implicită', () => {
    const out = resetFormattingHtml('<p style="text-align: center; text-indent: 2em">a <span style="font-family: Arial">b</span> <span data-comment="1" style="color: red">c</span> <strong>d</strong></p>');
    expect(out).toBe('<p>a b <span data-comment="1">c</span> <strong>d</strong></p>');
  });
});

describe('Editare: revizii', () => {
  it('ștergerea în modul revizie lasă textul tăiat', () => {
    const e = make('<p>unu doi</p>');
    e.commands.setRevisionLevel(2);
    const tr = strikeRange(e.state, 1, 4, 2);
    e.view.dispatch(tr);
    expect(e.getHTML()).toContain('<s data-revision-del="2" class="revision-del">unu</s>');
    expect(e.getText()).toBe('unu doi');
    // Accepting the revisions removes the struck text.
    e.commands.removeRevisions();
    expect(e.getText()).toBe(' doi');
  });
  it('textul scris în aceeași rundă se șterge de-a binelea', () => {
    const e = make('<p>a</p>');
    e.commands.setRevisionLevel(1);
    e.commands.focus('end');
    e.commands.insertContent('xyz');
    const end = e.state.selection.from;
    e.view.dispatch(strikeRange(e.state, end - 3, end, 1));
    expect(e.getText()).toBe('a');
  });
  it('Backspace cu opțiunea pornită', () => {
    const e = make('<p>abc</p>', { editing: { revisionStrikeDeletions: true } });
    e.commands.setRevisionLevel(3);
    e.commands.setTextSelection(4);
    const ev = new KeyboardEvent('keydown', { key: 'Backspace' });
    e.view.someProp('handleKeyDown', (f) => f(e.view, ev));
    expect(e.getHTML()).toContain('data-revision-del="3"');
    expect(e.getText()).toBe('abc');
    expect(e.state.selection.from).toBe(3);
  });
  it('numele rundelor', () => {
    setEditingPrefs({ revisionNames: ['Editor', '', '', '', ''] });
    expect(revisionRoundLabel(1)).toContain('Editor');
    expect(revisionRoundLabel(2)).not.toContain('Editor');
  });
});

describe('Căutare în document', () => {
  it('conține / începe cu / cuvânt întreg', () => {
    const t = 'casa acasă casă';
    const hits = (mode) => [...t.matchAll(buildDocRegex({ query: 'cas', mode }))].map((m) => m.index);
    expect(hits('contains')).toEqual([0, 6, 11]);
    expect(hits('starts')).toEqual([0, 11]);
    expect([...t.matchAll(buildDocRegex({ query: 'casa', mode: 'word' }))].length).toBe(1);
    expect(buildDocRegex({ query: '' })).toBe(null);
    expect(buildDocRegex({ query: '(a+)+', regex: true })).toBe(null);
  });
  it('ignoră diacriticele', () => {
    expect(foldText('ștăți')).toBe('statı'.replace('ı', 'i'));
    const e = make('<p>Ștefan și stefan</p>');
    const re = buildDocRegex({ query: 'ștefan', ignoreDiacritics: true });
    expect(findRanges(e.state.doc, re, { fold: true }).length).toBe(2);
    expect(findRanges(e.state.doc, buildDocRegex({ query: 'ștefan' })).length).toBe(1);
  });
  it('doar în selecție', () => {
    const e = make('<p>ab ab ab</p>');
    const all = findRanges(e.state.doc, buildDocRegex({ query: 'ab' }));
    expect(rangesWithin(all, { from: 3, to: 9 }).length).toBe(2);
    expect(rangesWithin(all, null).length).toBe(3);
  });
  it('istoricul căutărilor', () => {
    const store = new Map();
    const s = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
    pushFindHistory('a', s);
    pushFindHistory('b', s);
    expect(pushFindHistory('a', s)).toEqual(['a', 'b']);
    expect(loadFindHistory(s)).toEqual(['a', 'b']);
    for (let i = 0; i < 30; i++) pushFindHistory(`q${i}`, s);
    expect(loadFindHistory(s).length).toBe(20);
    expect(clearFindHistory(s)).toEqual([]);
    expect(loadFindHistory(s)).toEqual([]);
  });
});
