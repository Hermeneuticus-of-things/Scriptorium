// @vitest-environment jsdom
// ADL §2 + §10 (T8): MediaView / viewerul de imagini este o suprafață pe motorul de focus —
// `image.viewer.<assetId>` (assetId = media.file, id-ul stabil al resursei în proiect; sufixul
// `:split` pentru instanța din panoul split, ca `editor.document.<id>:split` la T4) pushuită când
// viewer-ul se deschide și popuită + deînregistrată pe fiecare cale de închidere (butonul de
// închidere al panoului split, Escape prin motor, închiderea/schimbarea documentului, unmount),
// focus real la activare, comutare sibling cu vederea de dedesubt (modelul inspector, T4/T7),
// comenzi locale zoomIn/zoomOut/close/escape pe suprafață; fără motor → comportament neatins.
// (Ionuț Application Design Language, item 8.)
import { describe, it, expect, afterEach, beforeAll, beforeEach } from 'vitest';
import fs from 'node:fs';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { createFocusEngine } from '../src/lib/focusEngine.js';
import { escapeThroughEngine } from '../src/lib/focusDialogs.js';
import { setDefaultFocusEngine, activeFocusEngine } from '../src/lib/focusMenus.js';
import { VIEW_SURFACES, registerViewSurfaces, syncViewSurface } from '../src/lib/focusViews.js';
import { imageViewSurfaceId, registerImageViewerSurface } from '../src/lib/focusMediaView.js';
import MediaView from '../src/components/MediaView.jsx';
import ImageViewer from '../src/components/ImageViewer.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Funcția de bază, ca la mount-ul aplicației (contractul Escape al motorului: doar cu suprafața
// de bază pe stivă, Escape e no-op).
function engineWithCore(core = {}) {
  const e = createFocusEngine();
  e.registerFocusableSurface({ id: 'editor.document.core', commands: {}, ...core });
  e.push('editor.document.core');
  return e;
}

// Vederea vizibilă dedesubt, ca la mount-ul aplicației (T7).
function withViewUnder(e) {
  registerViewSurfaces(e);
  syncViewSurface(e, VIEW_SURFACES.scrivenings);
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

// jsdom nu implementează geometria DOM: stub-uri goale pentru ResizeObserver/focus, ca mount-ul
// viewerului să fie testabil (ImageViewer are gajardă pentru ResizeObserver lipsă).
beforeAll(() => {
  for (const proto of [Element.prototype, Range.prototype]) {
    if (!proto.getClientRects) proto.getClientRects = () => [];
    if (!proto.getBoundingClientRect) proto.getBoundingClientRect = () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 });
  }
});

afterEach(() => {
  setDefaultFocusEngine(null);
});

describe('registerImageViewerSurface: viewerul de media este o suprafață a motorului', () => {
  it('id `image.viewer.<file>`; cu split → `image.viewer.<file>:split` (modelul `:split` al lui T4)', () => {
    expect(imageViewSurfaceId('m1.png')).toBe('image.viewer.m1.png');
    expect(imageViewSurfaceId('m1.png', { split: true })).toBe('image.viewer.m1.png:split');
  });

  it('push la deschidere; cleanup = pop + unregister (fără scurgeri de înregistrare)', () => {
    const e = withViewUnder(engineWithCore());
    const off = registerImageViewerSurface(e, 'm1.png', { close: () => true });
    expect(e.top()).toBe('image.viewer.m1.png');
    expect(e.stack()).toEqual(['editor.document.core', VIEW_SURFACES.scrivenings, 'image.viewer.m1.png']);
    off();
    expect(e.top()).toBe(VIEW_SURFACES.scrivenings); // vederea de dedesubt rămâne
    expect(e.registry()).not.toContain('image.viewer.m1.png'); // zero scurgeri
  });

  it('modal: false — viewerul nu blochează restul ferestrei', () => {
    const e = engineWithCore();
    const off = registerImageViewerSurface(e, 'm1.png', { close: () => true });
    expect(e.dispatch('close')).toBe('image.viewer.m1.png'); // răspunde comenzilor cât timp e activ
    off();
  });

  it('Escape prin motor închide viewerul, vederea de dedesubt rămâne; la bază motorul declină', () => {
    const e = withViewUnder(engineWithCore());
    const closed = [];
    const off = registerImageViewerSurface(e, 'm1.png', { close: () => { closed.push('viewer'); off(); } });
    expect(escapeThroughEngine(e, keyEvent())).toBe(true); // motorul decide: viewerul primul
    expect(closed).toEqual(['viewer']);
    expect(e.top()).toBe(VIEW_SURFACES.scrivenings);
    expect(escapeThroughEngine(e, keyEvent())).toBe(false); // doar funcția de bază: declină
  });

  it('fără close: suprafața nu are close/escape — Escape cade mai jos exact ca înainte', () => {
    const e = withViewUnder(engineWithCore());
    const off = registerImageViewerSurface(e, 'm1.png', {}); // panoul principal: închiderea e navigația
    expect(escapeThroughEngine(e, keyEvent())).toBe(false); // motorul declină
    expect(e.top()).toBe('image.viewer.m1.png'); // viewerul rămâne deschis
    off();
  });

  it('comenzile locale zoomIn/zoomOut ajung pe suprafață doar când există', () => {
    const e = engineWithCore();
    const steps = [];
    const off = registerImageViewerSurface(e, 'm1.png', {
      zoomIn: () => steps.push('in'),
      zoomOut: () => steps.push('out'),
    });
    expect(e.dispatch('zoomIn')).toBe('image.viewer.m1.png');
    expect(e.dispatch('zoomOut')).toBe('image.viewer.m1.png');
    expect(steps).toEqual(['in', 'out']);
    off();
    const e2 = engineWithCore();
    const off2 = registerImageViewerSurface(e2, 'm1.png', {}); // pdf/audio: fără zoom pe suprafață
    expect(e2.dispatch('zoomIn')).toBeNull(); // cade mai jos (comportament neatins)
    off2();
  });

  it('focus real pe viewer când devine suprafața activă (push, apoi switchFocus înapoi)', () => {
    const e = withViewUnder(engineWithCore());
    const focused = [];
    const off = registerImageViewerSurface(e, 'm1.png', { close: () => true, focus: () => focused.push('f') });
    expect(focused).toEqual(['f']); // push → nativeFocus → focus
    e.switchFocus(VIEW_SURFACES.scrivenings); // utilizatorul lucrează în vederea de dedesubt
    expect(focused).toEqual(['f']);
    e.switchFocus('image.viewer.m1.png'); // înapoi în viewer
    expect(focused).toEqual(['f', 'f']);
    off();
  });

  it('comutarea sibling (model inspector) nu dublează intrările pe stivă', () => {
    const e = withViewUnder(engineWithCore());
    const off = registerImageViewerSurface(e, 'm1.png', { close: () => true });
    e.switchFocus(VIEW_SURFACES.scrivenings);
    expect(e.stack()).toEqual(['editor.document.core', 'image.viewer.m1.png', VIEW_SURFACES.scrivenings]);
    e.switchFocus('image.viewer.m1.png');
    expect(e.stack()).toEqual(['editor.document.core', VIEW_SURFACES.scrivenings, 'image.viewer.m1.png']);
    off();
    expect(e.stack()).toEqual(['editor.document.core', VIEW_SURFACES.scrivenings]);
    expect(e.registry()).not.toContain('image.viewer.m1.png');
  });

  it('aceeași resursă deschisă și în split: două suprafețe, fără coliziune de id', () => {
    const e = withViewUnder(engineWithCore());
    const offMain = registerImageViewerSurface(e, 'm1.png', { close: () => true });
    const offSplit = registerImageViewerSurface(e, 'm1.png', { close: () => true, split: true });
    expect(e.stack()).toEqual(['editor.document.core', VIEW_SURFACES.scrivenings, 'image.viewer.m1.png', 'image.viewer.m1.png:split']);
    offSplit();
    expect(e.top()).toBe('image.viewer.m1.png'); // instanța principală rămâne
    offMain();
    expect(e.registry()).not.toContain('image.viewer.m1.png');
    expect(e.registry()).not.toContain('image.viewer.m1.png:split');
  });

  it('schimbarea documentului (m1 → m2): suprafața veche dispare, cea nouă e activă', () => {
    const e = engineWithCore();
    const off1 = registerImageViewerSurface(e, 'm1.png', { close: () => true });
    off1(); // App/MediaView: cleanup-ul efectului la schimbarea resursei
    const off2 = registerImageViewerSurface(e, 'm2.png', { close: () => true });
    expect(e.top()).toBe('image.viewer.m2.png');
    expect(e.registry()).not.toContain('image.viewer.m1.png');
    off2();
  });
});

// Cablarea în App (glue-ul de nivel componentă se verifică la sursă, ca în focusSplit):
// instanța din split cu pane="split" + onClose → setSplitId(null), hand-back T4 acoperă
// image.viewer.*, armarea focusului real la deschidere (fără furt la restaurarea proiectului).
describe('cablarea în App.jsx: suprafață media + hand-back sibling + focus armat', () => {
  const app = () => fs.readFileSync('src/App.jsx', 'utf8');

  it('instanța MediaView din split primește pane="split", onClose → setSplitId(null) și ref-ul de armare', () => {
    const src = app();
    expect(src).toContain('pane="split"');
    expect(src).toContain('onClose={() => setSplitId(null)}');
    expect(src).toContain('focusArmed={mediaFocusArmed}');
    expect(src).toContain('key={`split-media-${splitNode.id}`}'); // instanța din split, cu cheie proprie
  });

  it('hand-back-ul sibling din App acoperă suprafețele image.viewer.* (click în afară → vederea vizibilă)', () => {
    const src = app();
    expect(src).toContain("startsWith('image.viewer.')");
    expect(src).toContain("startsWith('quickref.')"); // vechiul hand-back rămâne
  });

  it('focusul real e armat la deschidere de utilizator (go pe un media file, openBeside), nu la restaurare', () => {
    const src = app();
    expect(src).toContain('const mediaFocusArmed = useRef(false);');
    expect(src).toMatch(/const go = async \(id, \{ push = true \} = \{\}\) => \{[\s\S]*?mediaFocusArmed\.current = true/);
    expect(src).toMatch(/const openBeside = \(mediaId\) => \{\s*\n\s*if \(splitId === mediaId\) return;\s*\n\s*openSplit\(mediaId\);\s*\n\s*mediaFocusArmed\.current = true;/);
  });
});

// MediaView montat: înregistrarea propriu-zisă pe motorul implicit (modelul QuickRef, T4).
describe('MediaView montat: suprafață la mount, pop la unmount, fără motor = neatins', () => {
  const api = { readMedia: async () => 'data:image/png;base64,AA' };
  const node = { id: 'n1', title: 'Imagine', type: 'file', media: { file: 'm1.png', mime: 'image/png', name: 'm1.png', zoom: 100 } };
  const noop = () => {};
  let host;
  let root = null;
  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    host = document.getElementById('host');
  });
  afterEach(() => {
    // Cleanup garantat chiar dacă o asserție întrerupe testul: fără root-uri rămase montate.
    act(() => { root && root.unmount(); });
    root = null;
    setDefaultFocusEngine(null);
  });

  function mountMedia(props = {}) {
    act(() => {
      root = createRoot(host);
      root.render(React.createElement(MediaView, { api, dir: 'd', node, onError: noop, onPatch: noop, ...props }));
    });
    return host;
  }

  it('push la montare (`image.viewer.m1.png`), pop + unregister la unmount (fără scurgeri)', () => {
    const e = withViewUnder(engineWithCore());
    setDefaultFocusEngine(e);
    mountMedia();
    expect(e.top()).toBe('image.viewer.m1.png');
    expect(e.registry()).toContain('image.viewer.m1.png');
    act(() => root.unmount());
    root = null;
    expect(e.top()).toBe(VIEW_SURFACES.scrivenings);
    expect(e.registry()).not.toContain('image.viewer.m1.png');
  });

  it('instanța din split: id cu sufixul :split; Escape prin motor ajunge la onClose (panoul se închide)', async () => {
    const e = withViewUnder(engineWithCore());
    setDefaultFocusEngine(e);
    const closed = [];
    mountMedia({ pane: 'split', onClose: () => closed.push('split') });
    expect(e.top()).toBe('image.viewer.m1.png:split');
    const offRoute = routeEscapeThroughEngine(e);
    try {
      await pressEscape(); // await: act-ul async nu trebuie să plutească în testele următoare
      expect(closed).toEqual(['split']); // o apăsare închide doar viewerul (App: onClose → unmount)
      expect(e.registry()).toContain('image.viewer.m1.png:split'); // scoaterea propriu-zisă e la unmount
    } finally {
      offRoute();
    }
    act(() => root.unmount());
    root = null;
    expect(e.top()).toBe(VIEW_SURFACES.scrivenings); // dedesubt rămâne
    expect(e.registry()).not.toContain('image.viewer.m1.png:split'); // zero scurgeri
  });

  it('panoul principal (fără onClose): Escape nu mai e consumat de viewer — cade mai jos ca înainte', () => {
    const e = withViewUnder(engineWithCore());
    setDefaultFocusEngine(e);
    mountMedia();
    const offRoute = routeEscapeThroughEngine(e);
    try {
      const ev = keyEvent();
      expect(escapeThroughEngine(e, ev)).toBe(false);
      expect(ev.defaultPrevented).toBe(false); // comportamentul vechi neatins
      expect(e.top()).toBe('image.viewer.m1.png'); // viewerul rămâne deschis (închiderea e navigația)
    } finally {
      offRoute();
    }
  });

  it('click în viewer îl face suprafața activă (switchFocus sibling); clickul în afara viewerului nu e interceptat de componentă (hand-back e App-level, T4)', () => {
    const e = withViewUnder(engineWithCore());
    setDefaultFocusEngine(e);
    mountMedia();
    e.switchFocus(VIEW_SURFACES.scrivenings); // utilizatorul a lucrat în vederea de dedesubt
    expect(e.top()).toBe(VIEW_SURFACES.scrivenings);
    act(() => {
      host.querySelector('.media-view').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(e.top()).toBe('image.viewer.m1.png'); // click în viewer → suprafața activă
    expect(e.stack()).toEqual(['editor.document.core', VIEW_SURFACES.scrivenings, 'image.viewer.m1.png']); // fără dublare
    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    // componenta nu реакionează la clickuri în afara ei; hand-back-ul la vederea vizibilă e
    // făcut de handler-ul App-level (T4), verificat la sursă în describe-ul „cablarea în App.jsx"
    expect(e.top()).toBe('image.viewer.m1.png');
    e.switchFocus(VIEW_SURFACES.scrivenings); // hand-back App-level, modelul T4
    expect(e.top()).toBe(VIEW_SURFACES.scrivenings);
  });

  it('fără motor: nicio înregistrare, randare neatinsă', () => {
    setDefaultFocusEngine(null); // explicit nimic
    const e = engineWithCore(); // alt motor, ca să vedem că nu e atins
    mountMedia();
    expect(e.registry()).toEqual(['editor.document.core']);
    expect(host.querySelector('.media-view')).toBeTruthy();
    expect(e.stack()).toEqual(['editor.document.core']);
  });

  it('media fără fișier (node.media lipsă): nicio suprafață', () => {
    const e = withViewUnder(engineWithCore());
    setDefaultFocusEngine(e);
    act(() => {
      root = createRoot(host);
      root.render(React.createElement(MediaView, { api, dir: 'd', node: { id: 'n2', title: 'Gol' }, onError: noop, onPatch: noop }));
    });
    expect(e.registry()).not.toContain('image.viewer.undefined');
    expect(e.top()).toBe(VIEW_SURFACES.scrivenings);
  });
});

// ImageViewer: comenzile locale de zoom ale suprafeței (handle imperativ, apelat din MediaView).
describe('ImageViewer: handle zoomIn/zoomOut pentru comenzile suprafeței', () => {
  it('zoomIn/zoomOut fac pasul următor și patchuiesc media.zoom', () => {
    const patches = [];
    let ref = null;
    const host2 = document.createElement('div');
    document.body.appendChild(host2);
    let root;
    act(() => {
      root = createRoot(host2);
      root.render(React.createElement(ImageViewer, {
        ref: (r) => { ref = r; },
        url: 'data:image/png;base64,AA',
        title: 't',
        media: { zoom: 100 },
        onPatch: (p) => patches.push(p),
      }));
    });
    act(() => ref.zoomIn());
    act(() => ref.zoomOut());
    expect(patches).toEqual([{ zoom: 110 }, { zoom: 100 }]);
    act(() => root.unmount());
    host2.remove();
  });
});
