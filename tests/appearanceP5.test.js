// @vitest-environment jsdom
// P5: Options > Appearance in detail (colours, fonts, themes), current line, typewriter line, composition.
import { describe, it, expect, afterEach } from 'vitest';
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import fs from 'node:fs';
import { applySettingsCss, DEFAULT_SETTINGS, LOOK_DEFAULTS, THEME_KEYS, normalizeLook, parseTheme, themeFromSettings, typewriterFraction } from '../src/lib/settingsDefaults.js';
import { typewriterOffset, typewriterLine } from '../src/editor/writing.js';
import { globalLineHighlight } from '../src/editor/lineHighlight.js';
import { hideCursorWhileTyping, themeFileName } from '../src/lib/appearance.js';
import AppearancePane, { SECTIONS } from '../src/components/AppearancePane.jsx';
import { dictionaries } from '../src/lib/i18n.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('applySettingsCss: appearance variables', () => {
  it('sets colours and fonts only when chosen, and data attributes for modes', () => {
    const root = document.createElement('div');
    applySettingsCss({ edBg: '#101010', binderFont: 'Arial, sans-serif', curLine: true, curLineOpacity: 50, binderLabelMode: 'row', corkBg: 'wood', compBarAutoHide: false, compZoom: 150, scriptColors: { dialogue: '#ff0000' } }, root);
    expect(root.style.getPropertyValue('--ed-bg')).toBe('#101010');
    expect(root.style.getPropertyValue('--binder-font')).toBe('Arial, sans-serif');
    expect(root.style.getPropertyValue('--cur-line-opacity')).toBe('50%');
    expect(root.style.getPropertyValue('--script-dialogue')).toBe('#ff0000');
    expect(root.style.getPropertyValue('--comp-zoom')).toBe('1.5');
    expect(root.dataset.curLine).toBe('on');
    expect(root.dataset.binderLabels).toBe('row');
    expect(root.dataset.corkBg).toBe('wood');
    expect(root.dataset.compBar).toBe('pinned');
    expect(root.dataset.compZoom).toBe('own');
    // back to the theme: the variables are removed
    applySettingsCss({}, root);
    expect(root.style.getPropertyValue('--ed-bg')).toBe('');
    expect(root.style.getPropertyValue('--script-dialogue')).toBe('');
    expect(root.dataset.curLine).toBe('off');
    expect(root.dataset.compZoom).toBe('editor');
  });
  it('typewriter position goes to the data attribute and the page padding', () => {
    const root = document.createElement('div');
    applySettingsCss({ typewriterPos: 25 }, root);
    expect(root.dataset.typewriterPos).toBe('25');
    expect(root.style.getPropertyValue('--tw-bottom')).toBe('75vh');
    expect(typewriterLine(root)).toBe(0.25);
    applySettingsCss({ typewriterPos: 'x' }, root);
    expect(typewriterLine(root)).toBe(0.5);
  });
  it('all LOOK_DEFAULTS are part of DEFAULT_SETTINGS', () => {
    for (const k of Object.keys(LOOK_DEFAULTS)) expect(k in DEFAULT_SETTINGS).toBe(true);
  });
});

describe('normalizeLook', () => {
  it('clamps typed numbers and keeps 0 = editor zoom', () => {
    const n = normalizeLook({ curLineOpacity: '500', typewriterPos: '3', compZoom: '0', compPadY: '', compDisplay: '1', compInspOpacity: '5' });
    expect(n.curLineOpacity).toBe(100);
    expect(n.typewriterPos).toBe(10);
    expect(n.compZoom).toBe(0);
    expect(n.compPadY).toBe(48);
    expect(n.compDisplay).toBe(1);
    expect(n.compInspOpacity).toBe(20);
    expect(typewriterFraction({ typewriterPos: 70 })).toBe(0.7);
  });
});

describe('colour themes', () => {
  it('round-trip through a theme file keeps only visual keys', () => {
    const th = themeFromSettings('Noapte', { ...DEFAULT_SETTINGS, edBg: '#000000', cardColor: '#333333', autosaveSec: 9, aiEnabled: false });
    expect(th.format).toBe('scribner-theme');
    expect(th.values.edBg).toBe('#000000');
    expect('autosaveSec' in th.values).toBe(false);
    expect('compDisplay' in th.values).toBe(false);
    const back = parseTheme(JSON.stringify({ ...th, values: { ...th.values, evil: 1 } }));
    expect(back.name).toBe('Noapte');
    expect(back.values.cardColor).toBe('#333333');
    expect('evil' in back.values).toBe(false);
    expect(() => parseTheme('{"x":1}')).toThrow();
    expect(themeFileName('a/b:c')).toBe('a_b_c.scribnertheme');
    expect(THEME_KEYS).toContain('accentColor');
  });
});

describe('typewriter scrolling offset', () => {
  it('puts the caret line at the chosen fraction of the visible height', () => {
    const geo = { caretTop: 700, caretBottom: 720, boxTop: 100, boxHeight: 800, scrollTop: 1000 };
    expect(typewriterOffset(geo, 0.5)).toBe(1000 + 610 - 400);
    expect(typewriterOffset(geo, 0.25)).toBe(1000 + 610 - 200);
    expect(typewriterOffset({ ...geo, scrollTop: 0, caretTop: 110, caretBottom: 130 }, 0.5)).toBe(0);
  });
});

describe('current line highlight switch and hidden mouse pointer', () => {
  it('reads the global switch from <html>', () => {
    const root = document.createElement('div');
    root.dataset.curLine = 'on';
    expect(globalLineHighlight(root)).toBe(true);
    root.dataset.curLine = 'off';
    expect(globalLineHighlight(root)).toBe(false);
  });
  it('typing hides the pointer, moving the mouse shows it', () => {
    const root = document.documentElement;
    const off = hideCursorWhileTyping(root);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(root.classList.contains('typing-hide-cursor')).toBe(true);
    window.dispatchEvent(new MouseEvent('mousemove'));
    expect(root.classList.contains('typing-hide-cursor')).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
    off();
    expect(root.classList.contains('typing-hide-cursor')).toBe(false);
  });
});

describe('AppearancePane', () => {
  let root, el, state;
  afterEach(() => { act(() => root.unmount()); el.remove(); });
  function Host() {
    const [s, setS] = useState({ ...DEFAULT_SETTINGS, uiStyle: 'classic' });
    const [comp, setComp] = useState({ bg: '', width: 40, fade: 100, paper: true, bgImage: '', bgImageFit: 'cover', showTargets: false });
    state = s;
    const set = (k) => (e) => setS((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));
    return React.createElement(AppearancePane, { s, setS, set, comp, setComp, pickBgImage: () => {}, api: {}, onError: () => {} });
  }
  const mount = () => {
    el = document.createElement('div');
    document.body.append(el);
    root = createRoot(el);
    act(() => root.render(React.createElement(Host)));
  };
  const section = (k) => act(() => el.querySelector(`[data-look-section=${k}]`).click());

  it('has a button for every section and shows its options', () => {
    mount();
    expect(el.querySelectorAll('.look-sections button').length).toBe(SECTIONS.length);
    for (const k of SECTIONS) {
      section(k);
      expect(el.querySelector('.look-section').dataset.section).toBe(k);
      expect(el.querySelector('.look-section').children.length).toBeGreaterThan(0);
    }
  });
  it('per-colour Default clears the colour', () => {
    mount();
    section('editor');
    const input = el.querySelector('.look-color input[type=color]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    act(() => { setter.call(input, '#123456'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(state.edBg).toBe('#123456');
    act(() => el.querySelector('.look-color button').click());
    expect(state.edBg).toBe('');
  });
  it('saves a named theme into the list and loads it back', () => {
    mount();
    const name = el.querySelector('.look-themes input');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    act(() => { setter.call(name, 'Mea'); name.dispatchEvent(new Event('input', { bubbles: true })); });
    act(() => [...el.querySelectorAll('.look-themes button')][0].click());
    expect(state.savedThemes.map((x) => x.name)).toEqual(['Mea']);
  });
});

describe('P5 strings', () => {
  it('every ui.look key used by the pane exists in ro and en', () => {
    const src = fs.readFileSync('src/components/AppearancePane.jsx', 'utf8');
    const used = [...src.matchAll(/'(ui\.look\.[a-z_]+)'/g)].map((m) => m[1]);
    for (const k of used) {
      expect(dictionaries.ro[k], k).toBeTruthy();
      expect(dictionaries.en[k], k).toBeTruthy();
    }
    for (const k of SECTIONS) expect(dictionaries.en[`ui.look.sec_${k}`]).toBeTruthy();
  });
});
