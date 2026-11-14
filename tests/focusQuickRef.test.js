// @vitest-environment jsdom
// ADL §2 + §10 (T4): panourile Quick Reference sunt suprafețe pe motorul de focus —
// `quickref.<docId>` pushuit la deschiderea panoului și popuit la închidere (buton, „Deschide",
// Escape prin motor, unmount); fiecare panou cu onClose-ul lui, un strat per apăsare; un Escape
// self-managed (defaultPrevented) nu ajunge niciodată la motor; click în panou îl face suprafața
// activă (comutare sibling, model inspector). (Ionuț Application Design Language, item 4.)
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { createFocusEngine } from '../src/lib/focusEngine.js';
import { escapeThroughEngine } from '../src/lib/focusDialogs.js';
import { setDefaultFocusEngine, activeFocusEngine } from '../src/lib/focusMenus.js';
import { quickRefSurfaceId, registerQuickRefSurface } from '../src/lib/focusPanes.js';
import QuickRef from '../src/components/QuickRef.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// jsdom nu implementează geometria DOM: focusul ProseMirror (scroll la selecție) cere
// Range.getClientRects — stub gol, ca focusul real din suprafață să fie testabil.
beforeAll(() => {
  for (const proto of [Element.prototype, Range.prototype]) {
    if (!proto.getClientRects) proto.getClientRects = () => [];
    if (!proto.getBoundingClientRect) proto.getBoundingClientRect = () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 });
  }
});

// Funcția de bază, ca la mount-ul aplicației (contractul Escape al motorului).
function engineWithCore(core = {}) {
  const e = createFocusEngine();
  e.registerFocusableSurface({ id: 'editor.document.core', commands: {}, ...core });
  e.push('editor.document.core');
  return e;
}

// Evenimente obiect-plain: exact steagurile citite de escapeThroughEngine.
function keyEvent(over = {}) {
  return {
    key: 'Escape',
    defaultPrevented: false,
    cancelBubble: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.cancelBubble = true; },
    ...over,
  };
}

// Rutarea reală Escape (App ascultă în #root): motorul întâi, handler-ele vechi după el.
function routeEscapeThroughEngine(engine) {
  const onKey = (e) => { escapeThroughEngine(engine, e); };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}
const pressEscape = () => act(async () => {
  document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
});

describe('registerQuickRefSurface: panoul Quick Reference este o suprafață a motorului', () => {
  it('id `quickref.<docId>`; push la deschidere; cleanup = pop + unregister (fără scurgeri)', () => {
    const e = engineWithCore();
    expect(quickRefSurfaceId('doc9')).toBe('quickref.doc9');
    const off = registerQuickRefSurface(e, 'doc9', { close: () => true });
    expect(e.top()).toBe('quickref.doc9');
    expect(e.stack()).toEqual(['editor.document.core', 'quickref.doc9']);
    off();
    expect(e.top()).toBe('editor.document.core');
    expect(e.registry()).toEqual(['editor.document.core']);
  });

  it('două panouri: Escape prin motor închide panoul din vârf întâi, un strat per apăsare', () => {
    const e = engineWithCore();
    const closed = [];
    const offA = registerQuickRefSurface(e, 'a', { close: () => { closed.push('a'); offA(); } });
    const offB = registerQuickRefSurface(e, 'b', { close: () => { closed.push('b'); offB(); } });
    expect(e.stack()).toEqual(['editor.document.core', 'quickref.a', 'quickref.b']);
    expect(escapeThroughEngine(e, keyEvent())).toBe(true);
    expect(closed).toEqual(['b']); // innermost first
    expect(e.top()).toBe('quickref.a'); // celălalt panou rămâne deschis
    expect(escapeThroughEngine(e, keyEvent())).toBe(true);
    expect(closed).toEqual(['b', 'a']);
    expect(e.top()).toBe('editor.document.core');
    expect(escapeThroughEngine(e, keyEvent())).toBe(false); // doar funcția de bază: declină
  });

  it('comanda close prin dispatch ajunge la panoul activ; Escape self-managed nu ajunge la motor', () => {
    const e = engineWithCore();
    const closed = [];
    const off = registerQuickRefSurface(e, 'a', { close: () => { closed.push('a'); off(); } });
    expect(e.dispatch('close')).toBe('quickref.a');
    expect(closed).toEqual(['a']);
    expect(e.top()).toBe('editor.document.core'); // cleanup-ul a scos stratul de pe stivă, ca în App
    // panou redeschis; un câmp self-managed (popup propriu, redenumire inline) marchează
    // evenimentul înainte de rutarea motorului: escapeThroughEngine îl ignoră, panoul rămâne
    const off2 = registerQuickRefSurface(e, 'a', { close: () => { closed.push('a2'); off2(); } });
    expect(escapeThroughEngine(e, keyEvent({ defaultPrevented: true }))).toBe(false);
    expect(closed).toEqual(['a']);
    expect(e.top()).toBe('quickref.a');
    off2();
  });
});

describe('QuickRef.jsx pe motor: push/pop pe toate căile, comutare sibling', () => {
  let host;
  let root;
  afterEach(() => {
    act(() => root && root.unmount());
    host?.remove();
    host = null;
    root = null;
    setDefaultFocusEngine(null);
  });

  const node = (id) => ({ id, title: `Document ${id}` });
  const base = { html: '<p>text</p>', x: 10, y: 10, readOnly: false, smartQuotes: true, onChange: () => {}, onMove: () => {} };

  async function renderPanel(over = {}) {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => { root.render(React.createElement(QuickRef, { node: node('a'), onClose: () => {}, onOpen: () => {}, ...base, ...over })); });
    return host.querySelector('.quickref');
  }

  it('mount → quickref.<id> pe stivă; unmount → pop + unregister, zero scurgeri', async () => {
    const e = engineWithCore();
    await renderPanel({ engine: e, node: node('doc3') });
    expect(e.top()).toBe('quickref.doc3');
    expect(e.stack()).toEqual(['editor.document.core', 'quickref.doc3']);
    await act(async () => { root.unmount(); });
    root = null;
    expect(e.stack()).toEqual(['editor.document.core']);
    expect(e.registry()).toEqual(['editor.document.core']);
  });

  it('Escape prin motor → onClose (panoul se închide în starea App), eveniment consumat', async () => {
    const e = engineWithCore();
    const closed = [];
    await renderPanel({ engine: e, node: node('doc3'), onClose: () => closed.push('panel') });
    const offRoute = routeEscapeThroughEngine(e);
    try {
      await pressEscape();
      expect(closed).toEqual(['panel']);
    } finally {
      offRoute();
    }
  });

  it('Escape self-managed (câmpul își marchează evenimentul): panoul rămâne deschis', async () => {
    const e = engineWithCore();
    const closed = [];
    await renderPanel({ engine: e, node: node('doc3'), onClose: () => closed.push('panel') });
    // câmpul self-managed (popup propriu, redenumire inline) marchează evenimentul înainte de
    // rutarea motorului: escapeThroughEngine îl ignoră, panoul nu se închide pe furiș
    act(() => { escapeThroughEngine(e, keyEvent({ defaultPrevented: true })); });
    expect(closed).toEqual([]);
    expect(e.top()).toBe('quickref.doc3');
  });

  it('click în panou → devine suprafața activă (switch sibling), fără dublare pe stivă', async () => {
    const e = engineWithCore();
    await renderPanel({ engine: e, node: node('doc3') });
    // utilizatorul scrie în funcția de bază: comutareaSibling întoarce focusul la vedere
    e.switchFocus('editor.document.core');
    expect(e.top()).toBe('editor.document.core');
    const panel = host.querySelector('.quickref');
    await act(async () => { panel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(e.top()).toBe('quickref.doc3');
    expect(e.stack()).toEqual(['editor.document.core', 'quickref.doc3']); // fără dublare
  });

  it('fără motor (engine=null, fără motor implicit): panoul funcționează ca înainte', async () => {
    const closed = [];
    const panel = await renderPanel({ engine: null, node: node('doc3'), onClose: () => closed.push('x') });
    expect(panel).toBeTruthy();
    await act(async () => { panel.querySelector('.quickref-head button[aria-label]').click(); });
    expect(closed).toEqual(['x']);
  });

  it('motorul implicit al aplicației (fără prop engine) e folosit, ca la Menu.jsx', async () => {
    const e = engineWithCore();
    setDefaultFocusEngine(e);
    expect(activeFocusEngine()).toBe(e);
    await renderPanel({ node: node('doc3') });
    expect(e.top()).toBe('quickref.doc3');
  });
});
