// Style navigation (Scrivener 3 §17.4.1 — P1 #27): Select Style Range, Next/Previous in
// Same Style, Select All with Style. The pure module works on a ProseMirror doc + caret
// position, so it is tested here in Node with a minimal schema (real editor: Editor.jsx
// handle + App registry); the wiring describe reads the sources, like focusSplit/i18n do.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import {
  paraStyleId, styleRangeAt, nextStyleBlock, prevStyleBlock, allStyleRange, hasIdentifiableStyle,
} from '../src/lib/styleNavigation.js';
import { SUBMENUS } from '../src/lib/menuLayout.js';
import { dictionaries } from '../src/lib/i18n.js';

// Minimal schema with the editor's block names: styleName on paragraph/heading (data-style),
// heading.level for the bare "Heading 1/2/3" identity, blockquote for nested textblocks.
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*', attrs: { styleName: { default: null } } },
    heading: { group: 'block', content: 'inline*', attrs: { level: { default: 1 }, styleName: { default: null } } },
    blockquote: { group: 'block', content: 'block+' },
    text: { group: 'inline' },
  },
});
const doc = (...blocks) => schema.node('doc', null, blocks);
const p = (text, style = null) => schema.node('paragraph', style ? { styleName: style } : null, text ? [schema.text(text)] : []);
const h = (text, level = 1, style = null) => schema.node('heading', style ? { level, styleName: style } : { level }, text ? [schema.text(text)] : []);
const quote = (...blocks) => schema.node('blockquote', null, blocks);

// Content start of the block reached by the index path (0 = first top-level child).
const posIn = (d, ...path) => {
  let node = d;
  let pos = 0;
  for (const i of path) {
    let off = 0;
    node.forEach((c, o, idx) => { if (idx === i) off = o; });
    pos += off;
    node = node.child(i);
  }
  return pos + 1;
};

describe('paraStyleId — ce e un „stil identificabil”', () => {
  it('numele de stil de pe paragraf (data-style)', () => {
    expect(paraStyleId(p('x', 'citat-bloc'))).toBe('citat-bloc');
  });
  it('heading fără stil numit = nivelul lui (Heading 1/2/3)', () => {
    expect(paraStyleId(h('Titlu', 2))).toBe('heading:2');
  });
  it('heading cu stil numit câștigă peste nivel', () => {
    expect(paraStyleId(h('Titlu', 1, 'motto'))).toBe('motto');
  });
  it('paragraf simplu fără stil = null', () => {
    expect(paraStyleId(p('x'))).toBeNull();
  });
});

describe('styleRangeAt — Select Style Range', () => {
  const d = doc(p('unu', 'a'), p('doi', 'a'), p('trei', 'a'), p('patru', 'b'), p('cinci', 'a'));
  it('acoperă rularea contiguă în jurul cursorului (sus + jos până la schimbarea stilului)', () => {
    expect(styleRangeAt(d, posIn(d, 1))).toEqual({ from: posIn(d, 0), to: posIn(d, 2) + 4 });
  });
  it('pe primul/ultimul bloc al rulării se limitează la ea', () => {
    expect(styleRangeAt(d, posIn(d, 0))).toEqual({ from: posIn(d, 0), to: posIn(d, 2) + 4 });
    expect(styleRangeAt(d, posIn(d, 2))).toEqual({ from: posIn(d, 0), to: posIn(d, 2) + 4 });
  });
  it('rularea se rupe la schimbarea de stil și la paragraful fără stil', () => {
    expect(styleRangeAt(d, posIn(d, 3))).toEqual({ from: posIn(d, 3), to: posIn(d, 3) + 5 });
    expect(styleRangeAt(d, posIn(d, 4))).toEqual({ from: posIn(d, 4), to: posIn(d, 4) + 5 });
  });
  it('headings fără stil numit formează rulări pe nivel', () => {
    const hd = doc(h('A', 1), h('B', 2), h('C', 1));
    expect(styleRangeAt(hd, posIn(hd, 0))).toEqual({ from: posIn(hd, 0), to: posIn(hd, 0) + 1 });
    expect(styleRangeAt(hd, posIn(hd, 2))).toEqual({ from: posIn(hd, 2), to: posIn(hd, 2) + 1 });
  });
  it('cursor pe paragraf fără stil → null', () => {
    const pd = doc(p('x'), p('y', 'a'));
    expect(styleRangeAt(pd, posIn(pd, 0))).toBeNull();
  });
  it('funcționează și când poziția e la marginea de început a documentului (pos 0)', () => {
    expect(styleRangeAt(d, 0)).toEqual({ from: posIn(d, 0), to: posIn(d, 2) + 4 });
  });
  it('paragrafele din blockquote aderă la rularea vecină (adiacență în ordinea documentului)', () => {
    const qd = doc(p('afara1', 'a'), quote(p('inauntru', 'a')), p('afara2', 'a'));
    expect(styleRangeAt(qd, posIn(qd, 1, 0))).toEqual({ from: posIn(qd, 0), to: posIn(qd, 2) + 6 });
  });
  it('rularea pornită din paragraful gol cu stil acoperă blocurile vecine', () => {
    const gd = doc(p('unu', 'a'), p('', 'a'), p('trei', 'a'));
    expect(styleRangeAt(gd, posIn(gd, 1))).toEqual({ from: posIn(gd, 0), to: posIn(gd, 2) + 4 });
  });
});

describe('nextStyleBlock / prevStyleBlock — Next/Previous in Same Style', () => {
  const d = doc(p('unu', 'a'), p('doi', 'b'), p('trei', 'a'), p('patru', 'a'));
  it('sare peste stilurile diferite, cursor la începutul paragrafului țintă', () => {
    expect(nextStyleBlock(d, posIn(d, 0))).toEqual({ from: posIn(d, 2), to: posIn(d, 2) });
    expect(prevStyleBlock(d, posIn(d, 2))).toEqual({ from: posIn(d, 0), to: posIn(d, 0) });
  });
  it('la capete ciclu: ultimul → primul, primul → ultimul', () => {
    expect(nextStyleBlock(d, posIn(d, 3))).toEqual({ from: posIn(d, 0), to: posIn(d, 0) });
    expect(prevStyleBlock(d, posIn(d, 0))).toEqual({ from: posIn(d, 3), to: posIn(d, 3) });
  });
  it('singura instanță → null (nu are unde să sară)', () => {
    const sd = doc(p('x', 'b'), p('y', 'a'), p('z', 'b'));
    expect(nextStyleBlock(sd, posIn(sd, 1))).toBeNull();
    expect(prevStyleBlock(sd, posIn(sd, 1))).toBeNull();
  });
  it('cursor pe stil neidentificabil → null', () => {
    const pd = doc(p('x'), p('y', 'a'));
    expect(nextStyleBlock(pd, posIn(pd, 0))).toBeNull();
    expect(prevStyleBlock(pd, posIn(pd, 0))).toBeNull();
  });
});

describe('allStyleRange — Select All with Style (primul → ultimul, ca în Scrivener)', () => {
  const d = doc(p('unu', 'a'), p('doi', 'b'), p('trei', 'a'), p('patru', 'c'), p('cinci', 'a'));
  it('intervalul de la primul la ultimul cu stilul dat, cu număr de instanțe', () => {
    expect(allStyleRange(d, posIn(d, 0))).toEqual({ from: posIn(d, 0), to: posIn(d, 4) + 5, count: 3 });
    expect(allStyleRange(d, posIn(d, 2)).count).toBe(3);
    expect(allStyleRange(d, posIn(d, 3))).toEqual({ from: posIn(d, 3), to: posIn(d, 3) + 5, count: 1 });
  });
  it('paragraful gol cu stil intră în interval', () => {
    const gd = doc(p('unu', 'a'), p('', 'a'), p('trei', 'a'));
    expect(allStyleRange(gd, posIn(gd, 1))).toEqual({ from: posIn(gd, 0), to: posIn(gd, 2) + 4, count: 3 });
  });
  it('cursor pe paragraf fără stil → null', () => {
    const pd = doc(p('x'));
    expect(allStyleRange(pd, posIn(pd, 0))).toBeNull();
  });
});

describe('hasIdentifiableStyle — poarta disabled a comenzilor', () => {
  it('true pe paragraf cu stil numit și pe heading fără stil; false pe paragraf simplu', () => {
    const d = doc(p('x', 'motto'), h('T', 3), p('y'));
    expect(hasIdentifiableStyle(d, posIn(d, 0))).toBe(true);
    expect(hasIdentifiableStyle(d, posIn(d, 1))).toBe(true);
    expect(hasIdentifiableStyle(d, posIn(d, 2))).toBe(false);
  });
  it('paragraful gol cu stil rămâne stil identificabil', () => {
    const d = doc(p('', 'a'));
    expect(hasIdentifiableStyle(d, posIn(d, 0))).toBe(true);
  });
});

describe('registry + UI wiring', () => {
  const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  it('comenzile există în grupul format, disabled din starea de stil la cursor', () => {
    for (const id of ['selectStyleRange', 'nextInSameStyle', 'prevInSameStyle', 'selectAllWithStyle']) {
      expect(app).toContain(`'format', '${id}'`);
    }
    expect(app).toContain('onSelectionStyle={setStylePara}');
  });
  it('submenu-ul Format „Navigare după stil” le grupează în ordine', () => {
    const def = SUBMENUS.format.find(([k]) => k === 'menu.styleNav');
    expect(def && def[1]).toEqual(['selectStyleRange', 'nextInSameStyle', 'prevInSameStyle', 'selectAllWithStyle']);
  });
  it('handle-ul Editor-ului expune cele patru metode', () => {
    const ed = fs.readFileSync(new URL('../src/components/Editor.jsx', import.meta.url), 'utf8');
    for (const m of ['selectStyleRange', 'nextInSameStyle', 'prevInSameStyle', 'selectAllWithStyle']) expect(ed).toContain(`${m}:`);
  });
  it('i18n acoperă cmd.* și meniul în ro și en', () => {
    for (const k of ['cmd.selectStyleRange', 'cmd.nextInSameStyle', 'cmd.prevInSameStyle', 'cmd.selectAllWithStyle', 'menu.styleNav']) {
      expect(dictionaries.ro[k]).toBeTruthy();
      expect(dictionaries.en[k]).toBeTruthy();
    }
  });
});
