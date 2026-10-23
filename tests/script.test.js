import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { SCRIPT_FORMAT_LIST, nextOnTab, nextOnEnter, isUppercase, formatCss, collectCharacters, completeCharacter } from '../src/lib/scriptFormats.js';
import { generateNames, createRng, CULTURES } from '../src/lib/nameGenerator.js';
import { chunkText, pickVoice } from '../src/lib/speech.js';
const require = createRequire(import.meta.url);
const { htmlToFdx, htmlToFountain, parseScriptHtml } = require('../lib/scriptExport.cjs');
const { fdxToHtml, fountainToHtml } = require('../lib/importers.cjs');

describe('scriptFormats', () => {
  it('transition tables reference only defined elements', () => {
    for (const f of SCRIPT_FORMAT_LIST) {
      const ids = new Set(f.elements.map((e) => e.id));
      expect(ids.has(f.defaultElement)).toBe(true);
      for (const [k, v] of [...Object.entries(f.tab), ...Object.entries(f.enter)]) {
        expect(ids.has(k), `${f.id}:${k}`).toBe(true);
        expect(ids.has(v), `${f.id}:${v}`).toBe(true);
      }
    }
  });
  it('screenplay Tab / Enter', () => {
    expect(nextOnTab('screenplay', 'action')).toBe('character');
    expect(nextOnTab('screenplay', 'dialogue')).toBe('parenthetical');
    expect(nextOnTab('screenplay', 'character', true)).toBe('action');
    expect(nextOnEnter('screenplay', 'scene-heading')).toBe('action');
    expect(nextOnEnter('screenplay', 'character')).toBe('dialogue');
    expect(nextOnEnter('screenplay', 'dialogue')).toBe('character');
    expect(nextOnEnter('screenplay', 'dialogue', true)).toBe('action');
    expect(nextOnTab('screenplay', 'unknown')).toBe('action');
  });
  it('uppercase + css', () => {
    expect(isUppercase('screenplay', 'character')).toBe(true);
    expect(isUppercase('screenplay', 'dialogue')).toBe(false);
    expect(formatCss('radio')).toContain('.script-radio p[data-script="sound"]');
  });
  it('character autocomplete', () => {
    const names = collectCharacters('<p data-script="character">ANA</p><p data-script="dialogue">x</p><p data-style="character">ANDREI (V.O.)</p><p data-script="character">ana</p>');
    expect(names).toEqual(['ANA', 'ANDREI']);
    expect(completeCharacter(names, 'and')).toEqual(['ANDREI']);
    expect(completeCharacter(names, '')).toEqual([]);
  });
});

const SAMPLE =
  '<p data-script="scene-heading">INT. CASA - ZI</p>' +
  '<p data-script="action">Ana intră. Lumina e <em>slabă</em>.</p>' +
  '<p data-script="character">ANA</p>' +
  '<p data-script="parenthetical">(încet)</p>' +
  '<p data-script="dialogue">E cineva &amp; acasă?</p>' +
  '<p data-script="transition">CUT TO:</p>';

describe('scriptExport', () => {
  it('parses runs and elements', () => {
    const p = parseScriptHtml(SAMPLE);
    expect(p.map((x) => x.element)).toEqual(['scene-heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition']);
    expect(p[1].runs.find((r) => r.italic).text).toBe('slabă');
    expect(p[4].runs[0].text).toBe('E cineva & acasă?');
  });
  it('FDX round-trip through fdxToHtml', () => {
    const fdx = htmlToFdx(SAMPLE, { title: 'Test' });
    expect(fdx).toContain('<Paragraph Type="Scene Heading"><Text>INT. CASA - ZI</Text></Paragraph>');
    expect(fdx).toContain('<Text Style="Italic">slabă</Text>');
    const back = parseScriptHtml(fdxToHtml(fdx));
    expect(back.map((x) => x.element)).toEqual(['scene-heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition']);
    expect(back[4].runs.map((r) => r.text).join('')).toBe('E cineva & acasă?');
  });
  it('Fountain round-trip through fountainToHtml', () => {
    const ftn = htmlToFountain(SAMPLE, { title: 'Test' });
    expect(ftn).toMatch(/^Title: Test\n\nINT\. CASA - ZI\n/);
    expect(ftn).toContain('ANA\n(încet)\nE cineva & acasă?');
    const back = parseScriptHtml(fountainToHtml(ftn));
    expect(back.map((x) => x.element)).toEqual(['scene-heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition']);
    expect(back[1].runs.find((r) => r.italic).text).toBe('slabă');
  });
  it('forces action/character in Fountain when ambiguous', () => {
    const f = htmlToFountain('<p data-script="action">BUM!</p><p data-script="character">McGregor</p><p data-script="dialogue">Da.</p>');
    expect(f).toContain('!BUM!');
    expect(f).toContain('@McGregor');
    const back = parseScriptHtml(fountainToHtml(f));
    expect(back.map((x) => x.element)).toEqual(['action', 'character', 'dialogue']);
  });
});

describe('nameGenerator', () => {
  it('is deterministic with a seed', () => {
    const a = generateNames({ culture: 'ro', count: 10, seed: 42 });
    const b = generateNames({ culture: 'ro', count: 10, seed: 42 });
    expect(a).toEqual(b);
    expect(a).toHaveLength(10);
    expect(new Set(a.map((n) => n.full)).size).toBe(10);
    expect(generateNames({ culture: 'ro', count: 10, seed: 43 })).not.toEqual(a);
    expect(createRng('x')()).toBe(createRng('x')());
  });
  it('respects gender, culture, alliteration', () => {
    const f = generateNames({ culture: 'en', gender: 'f', count: 8, seed: 1 });
    expect(f.every((n) => n.gender === 'f' && CULTURES.en.f.includes(n.first))).toBe(true);
    const al = generateNames({ culture: 'ro', count: 5, alliteration: true, seed: 7 });
    expect(al.length).toBeGreaterThan(0);
    expect(al.every((n) => n.first.normalize('NFD')[0] === n.last.normalize('NFD')[0])).toBe(true);
    const ru = generateNames({ culture: 'ru', gender: 'f', count: 5, seed: 3, lastOnly: true });
    expect(ru.every((n) => /a$/.test(n.last))).toBe(true);
  });
});

describe('speech helpers', () => {
  it('chunks text and picks voices', () => {
    expect(chunkText('Unu. Doi! Trei?', 6)).toEqual(['Unu.', 'Doi!', 'Trei?']);
    const v = [{ name: 'A', lang: 'en-US', default: true }, { name: 'B', lang: 'ro_RO'.replace('_', '-') }];
    expect(pickVoice(v, 'ro-RO').name).toBe('B');
    expect(pickVoice([{ name: 'A', lang: 'en-US', default: true }], 'ro-RO').name).toBe('A');
  });
});
