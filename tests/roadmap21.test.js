import { describe, it, expect } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { tagWord, tagText, guessLang } from '../src/lib/pos.js';
import { PAIRS, inlineToLinked, linkedToInline } from '../src/lib/noteConvert.js';
import { addNoteTab, moveNoteTab, projectNoteTabs, removeNoteTab, renameNoteTab, LEGACY_NOTES_ID } from '../src/lib/projectNotes.js';
import { duplicateShortcuts, eventShortcut, isParaStyle, nextStyleId, normalizeShortcut, styleCss, styleForShortcut } from '../src/lib/styles.js';

const atom = (attr) => ({ group: 'inline', inline: true, atom: true, attrs: { [attr]: { default: '' } }, toDOM: () => ['span'] });
const schema = new Schema({
  nodes: { doc: { content: 'paragraph+' }, paragraph: { content: 'inline*', toDOM: () => ['p', 0] }, text: { group: 'inline' }, annotation: atom('text'), footnote: atom('text') },
  marks: { comment: { attrs: { comment: { default: '' } } }, linkedFootnote: { attrs: { text: { default: '' } } } },
});
const para = (...c) => schema.node('paragraph', null, c);
const state = (doc) => EditorState.create({ schema, doc });
const t = (s, marks) => schema.text(s, marks);

describe('noteConvert', () => {
  it('inline footnote -> linked footnote on previous word and back', () => {
    const doc = schema.node('doc', null, [para(t('Un cuvânt'), schema.node('footnote', { text: 'nota' }), t(' final.'))]);
    const tr = inlineToLinked(state(doc), PAIRS.footnote);
    const out = tr.doc;
    expect(out.textContent).toBe('Un cuvânt final.');
    let marked = '';
    out.descendants((n) => {
      if (n.isText && n.marks.some((m) => m.type.name === 'linkedFootnote' && m.attrs.text === 'nota')) marked += n.text;
    });
    expect(marked).toBe('cuvânt');
    const back = linkedToInline(state(out), PAIRS.footnote).doc;
    expect(back.eq(doc)).toBe(true);
  });
  it('annotation at paragraph start anchors on the next word; comments convert back', () => {
    const doc = schema.node('doc', null, [para(schema.node('annotation', { text: 'idee' }), t('Prima frază.'))]);
    const out = inlineToLinked(state(doc), PAIRS.annotation).doc;
    expect(out.firstChild.firstChild.marks[0].attrs.comment).toBe('idee');
    expect(out.firstChild.firstChild.text).toBe('Prima');
    const back = linkedToInline(state(out), PAIRS.annotation).doc;
    expect(back.firstChild.child(1).type.name).toBe('annotation');
  });
  it('returns null when nothing to convert and respects selection', () => {
    const doc = schema.node('doc', null, [para(t('a'), schema.node('footnote', { text: 'x' })), para(t('b'), schema.node('footnote', { text: 'y' }))]);
    expect(linkedToInline(state(doc), PAIRS.footnote)).toBeNull();
    let st = state(doc);
    st = st.apply(st.tr.setSelection(TextSelection.create(st.doc, 1, 3)));
    const out = inlineToLinked(st, PAIRS.footnote).doc;
    let atoms = 0;
    out.descendants((n) => void (n.type.name === 'footnote' && atoms++));
    expect(atoms).toBe(1);
  });
});

describe('pos tagger', () => {
  it('tags Romanian closed classes and suffixes', () => {
    expect(tagWord('și')).toBe('conj');
    expect(tagWord('dar')).toBe('conj');
    expect(tagWord('lucrează')).toBe('verb');
    expect(tagWord('frumos')).toBe('adj');
    expect(tagWord('libertate')).toBe('noun');
    expect(tagWord('omenește')).toBe('adv');
    expect(tagWord('cânta', 'ro', 'a')).toBe('verb');
  });
  it('tags English', () => {
    expect(tagWord('quickly', 'en')).toBe('adv');
    expect(tagWord('and', 'en')).toBe('conj');
    expect(tagWord('walked', 'en')).toBe('verb');
    expect(tagWord('happiness', 'en')).toBe('noun');
    expect(tagWord('beautiful', 'en')).toBe('adj');
    expect(tagWord('run', 'en', 'to')).toBe('verb');
  });
  it('tagText gives offsets; guessLang', () => {
    const r = tagText('Ea scrie și citește.', 'ro');
    expect(r.map((w) => w.word)).toEqual(['Ea', 'scrie', 'și', 'citește']);
    expect(r[2]).toMatchObject({ from: 9, to: 11, tag: 'conj' });
    expect(guessLang('The cat and the dog were in the house.')).toBe('en');
    expect(guessLang('Pisica și câinele sunt în casă.')).toBe('ro');
  });
});

describe('project notes tabs', () => {
  it('falls back to the legacy tab and manages tabs', () => {
    expect(projectNoteTabs({})).toEqual([{ id: LEGACY_NOTES_ID, title: 'Note proiect' }]);
    const { tabs, tab } = addNoteTab(undefined, 'Cercetare', 1000);
    expect(tabs.map((x) => x.id)).toEqual([LEGACY_NOTES_ID, tab.id]);
    expect(addNoteTab(tabs, '', 1000).tab.id).not.toBe(tab.id);
    expect(renameNoteTab(tabs, tab.id, 'Surse')[1].title).toBe('Surse');
    expect(removeNoteTab(tabs, LEGACY_NOTES_ID)).toHaveLength(2);
    expect(removeNoteTab(tabs, tab.id)).toHaveLength(1);
    expect(moveNoteTab(tabs, tab.id, -1)[0].id).toBe(tab.id);
  });
});

describe('styles: kinds, next style, shortcuts', () => {
  const styles = [
    { id: 'titlu', name: 'Titlu', type: 'both', bold: true, align: 'center', next: 'corp', shortcut: 'alt+ctrl+1' },
    { id: 'corp', name: 'Corp', type: 'para' },
    { id: 'motto', name: 'Motto', type: 'para', next: 'none', shortcut: 'Ctrl+Alt+1' },
    { id: 'x', name: 'X', type: 'para', next: 'sters' },
  ];
  it('next style', () => {
    expect(nextStyleId(styles, 'titlu')).toBe('corp');
    expect(nextStyleId(styles, 'corp')).toBe('corp');
    expect(nextStyleId(styles, 'motto')).toBeNull();
    expect(nextStyleId(styles, 'x')).toBe('x');
    expect(nextStyleId(styles, null)).toBeNull();
  });
  it('Para+Char styles behave as paragraph styles in CSS', () => {
    expect(isParaStyle(styles[0])).toBe(true);
    expect(styleCss(styles, 'body')).toContain('body [data-style="titlu"] { font-weight: 700; text-align: center; text-indent: 0 }');
  });
  it('shortcuts', () => {
    expect(normalizeShortcut('alt+ctrl+1')).toBe('Ctrl+Alt+1');
    expect(normalizeShortcut('cmd+shift+k')).toBe('Ctrl+Shift+K');
    expect(normalizeShortcut('Shift+K')).toBe('');
    expect(eventShortcut({ ctrlKey: true, altKey: true, code: 'Digit1', key: '¡' })).toBe('Ctrl+Alt+1');
    expect(styleForShortcut(styles, 'Ctrl+Alt+1').id).toBe('titlu');
    expect(duplicateShortcuts(styles)).toEqual(['Ctrl+Alt+1']);
  });
});
