// @vitest-environment jsdom
// Learned corrections: a misspelled word fixed by hand becomes an auto-replacement.
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { isTypoFix, learnCorrection, matchCase, editDistance, MAX_LEARNED } from '../src/lib/learnCorrections.js';
import { correctionFor, simulateTyping, Corrections } from '../src/editor/corrections.js';

describe('isTypoFix', () => {
  it('acceptă greșeli de tastare și diacritice lipsă', () => {
    expect(isTypoFix('fata', 'față')).toBe(true);
    expect(isTypoFix('stiinta', 'știința')).toBe(true);
    expect(isTypoFix('teh', 'the')).toBe(true); // literele inversate
    expect(isTypoFix('recieve', 'receive')).toBe(true);
    expect(isTypoFix('propozitie', 'propoziție')).toBe(true);
    expect(isTypoFix('ortografe', 'ortografie')).toBe(true);
  });
  it('refuză cuvinte diferite, doar majuscule, expresii, cuvinte de o literă', () => {
    expect(isTypoFix('casa', 'masa')).toBe(true); // aproape: decide corectorul ortografic (App)
    expect(isTypoFix('pisică', 'câine')).toBe(false);
    expect(isTypoFix('Ion', 'ion')).toBe(false);
    expect(isTypoFix('a', 'o')).toBe(false);
    expect(isTypoFix('de la', 'dela')).toBe(false);
    expect(isTypoFix('abc123', 'abc124')).toBe(false);
    expect(isTypoFix('frumos', 'frumoasele')).toBe(false);
  });
  it('editDistance numără inversările ca o singură greșeală', () => {
    expect(editDistance('teh', 'the')).toBe(1);
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(editDistance('abcdef', 'uvwxyz', 2)).toBe(3);
  });
});

describe('learnCorrection', () => {
  it('adaugă, actualizează și nu dublează', () => {
    let l = learnCorrection([], 'Fata', 'Față');
    expect(l).toEqual([{ from: 'fata', to: 'față', learned: true }]);
    expect(learnCorrection(l, 'fata', 'față')).toBeNull();
    l = learnCorrection(l, 'fata', 'fâța');
    expect(l).toEqual([{ from: 'fata', to: 'fâța', learned: true }]);
  });
  it('o corectură inversă o scoate pe cea veche; înlocuirile scrise de mână au prioritate', () => {
    const l = learnCorrection([{ from: 'fata', to: 'față', learned: true }], 'față', 'fata');
    expect(l).toEqual([{ from: 'față', to: 'fata', learned: true }]);
    expect(learnCorrection([{ from: 'Fata', to: 'FATA' }], 'fata', 'față')).toBeNull();
  });
  it('lista are o limită; înlocuirile proprii nu se pierd', () => {
    let l = [{ from: 'xx', to: 'yy' }];
    for (let i = 0; i < MAX_LEARNED; i++) l.push({ from: `w${i}`, to: `v${i}`, learned: true });
    l = learnCorrection(l, 'fata', 'față');
    expect(l.filter((r) => r.learned)).toHaveLength(MAX_LEARNED);
    expect(l[0]).toEqual({ from: 'xx', to: 'yy' });
    expect(l.some((r) => r.from === 'w0')).toBe(false);
    expect(l.at(-1).from).toBe('fata');
  });
});

describe('aplicarea la scriere', () => {
  const learned = [{ from: 'fata', to: 'față', learned: true }];
  it('păstrează majusculele scrise', () => {
    expect(simulateTyping('fata mea. Fata. FATA ', { replacements: learned })).toBe('față mea. Față. FAȚĂ ');
    expect(matchCase('Teh', 'the')).toBe('The');
  });
  it('nu atinge cuvinte mai lungi și nici înlocuirile proprii exacte', () => {
    expect(simulateTyping('fatada ', { replacements: learned })).toBe('fatada ');
    expect(correctionFor('Fata', ' ', { replacements: [{ from: 'fata', to: 'X' }] })).toBeNull();
  });
});

describe('editorul învață corectura de mână', () => {
  // Destroy every editor: ProseMirror's DOM observer timer must not fire after jsdom is torn down.
  const editors = [];
  afterEach(() => {
    for (const e of editors.splice(0)) e.destroy();
  });
  function setup() {
    const seen = [];
    const list = [];
    const editor = new Editor({
      extensions: [StarterKit, Corrections.configure({ getReplacements: () => list, onLearn: (a, b) => seen.push([a, b]) })],
      content: '<p>O fata frumoasa.</p>',
    });
    editors.push(editor);
    return { editor, seen, list };
  }
  const typeText = (editor, s) => {
    for (const ch of s) {
      const { from, to } = editor.state.selection;
      const view = editor.view;
      const handled = view.someProp('handleTextInput', (f) => f(view, from, to, ch));
      if (!handled) view.dispatch(view.state.tr.insertText(ch, from, to));
    }
  };
  it('selectezi cuvântul, scrii altul, apoi spațiu: onLearn(vechi, nou)', () => {
    const { editor, seen } = setup();
    editor.commands.setTextSelection({ from: 3, to: 7 }); // "fata"
    typeText(editor, 'față');
    expect(seen).toEqual([]);
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    expect(seen).toEqual([['fata', 'față']]);
    expect(editor.getText()).toBe('O față frumoasa.');
  });
  it('selecție care nu e un cuvânt întreg: nimic', () => {
    const { editor, seen } = setup();
    editor.commands.setTextSelection({ from: 3, to: 6 }); // "fat"
    typeText(editor, 'mas');
    editor.commands.setTextSelection(1);
    expect(seen).toEqual([]);
  });
  it('după învățare, cuvântul se corectează singur la scriere', () => {
    const { editor, list } = setup();
    list.push({ from: 'frumoasa', to: 'frumoasă', learned: true });
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    typeText(editor, ' Frumoasa ');
    expect(editor.getText()).toBe('O fata frumoasa. Frumoasă ');
  });
});

describe('cuvinte alogene', () => {
  it('termenii cu litere străine (IAST, é) nu se învață niciodată', async () => {
    const { isForeignWord } = await import('../src/lib/learnCorrections.js');
    expect(isForeignWord('Ātman')).toBe(true);
    expect(isForeignWord('saṃsāra')).toBe(true);
    expect(isForeignWord('ṛṣi')).toBe(true);
    expect(isForeignWord('café')).toBe(true);
    expect(isForeignWord('știință')).toBe(false);
    expect(isTypoFix('Atman', 'Ātman')).toBe(false);
    expect(isTypoFix('Ātmanul', 'Ātman')).toBe(false);
    expect(isTypoFix('samsara', 'saṃsāra')).toBe(false);
    expect(learnCorrection([], 'Atman', 'Ātman')).toBeNull();
    expect(isTypoFix('stiinta', 'știința')).toBe(true);
  });
});
