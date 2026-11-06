// @vitest-environment jsdom
// ADL §2 + §10: in-app menus on the focus engine (src/lib/focusMenus.js × src/components/Menu.jsx)
// — `menu.<id>` pushed on open and popped on every close path, Escape cascade with a dialog
// underneath closes the menu alone (the engine decides), and a command chosen from a menu is
// dispatched active-surface-first before it falls back to the item's own action.
// (Ionuț Application Design Language, campaign adl-campaign item 2.)
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { createFocusEngine } from '../src/lib/focusEngine.js';
import { registerDialogSurface, dialogSurfaceId, escapeThroughEngine } from '../src/lib/focusDialogs.js';
import { menuSurfaceId, registerMenuSurface, runMenuItem, setDefaultFocusEngine, activeFocusEngine } from '../src/lib/focusMenus.js';
import Menu from '../src/components/Menu.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// A core-function base like the app pushes at mount (the engine's Escape contract: with only
// the core surface on the stack, Escape is a no-op). Registration overrides replace the
// defaults — the engine's registration is idempotent, so the first one is the one that counts.
function engineWithCore(core = {}) {
  const e = createFocusEngine();
  e.registerFocusableSurface({ id: 'editor.document.core', commands: {}, ...core });
  e.push('editor.document.core');
  return e;
}

// Plain-object events: exactly the flags escapeThroughEngine reads.
function keyEvent(over = {}) {
  return {
    key: 'Escape',
    defaultPrevented: false,
    cancelBubble: false,
    prevented: 0,
    stopped: 0,
    preventDefault() { this.defaultPrevented = true; this.prevented += 1; },
    stopPropagation() { this.cancelBubble = true; this.stopped += 1; },
    ...over,
  };
}

// The real Escape routing (App.jsx listens on #root): engine first, old handlers after it.
function routeEscapeThroughEngine(engine) {
  const onKey = (e) => { escapeThroughEngine(engine, e); };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}
const pressEscape = () => act(async () => {
  document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
});

describe('registerMenuSurface: meniul deschis este suprafața activă', () => {
  it('push la deschidere; cleanup = pop + unregister (fără scurgeri)', () => {
    const e = engineWithCore();
    const off = registerMenuSurface(e, 'file', { close: () => true });
    expect(e.top()).toBe('menu.file');
    expect(e.stack()).toEqual(['editor.document.core', 'menu.file']);
    off();
    expect(e.top()).toBe('editor.document.core');
    expect(e.registry()).toEqual(['editor.document.core']);
    expect(menuSurfaceId('file')).toBe('menu.file');
  });

  it('meniu peste dialog: Escape prin motor închide DOAR meniul, apoi dialogul', () => {
    const e = engineWithCore();
    const closed = [];
    const closeDialog = registerDialogSurface(e, dialogSurfaceId('compile'), {
      close: () => { closed.push('compile'); closeDialog(); },
    });
    // Mirror Menu.jsx: the close action flips state, the cleanup takes the layer off the stack.
    const closeMenu = registerMenuSurface(e, 'format', {
      close: () => { closed.push('menu'); closeMenu(); },
    });
    expect(e.top()).toBe('menu.format');
    expect(escapeThroughEngine(e, keyEvent())).toBe(true); // engine decided: menu first
    expect(closed).toEqual(['menu']);
    expect(e.top()).toBe('dialog.compile');
    expect(escapeThroughEngine(e, keyEvent())).toBe(true);
    expect(closed).toEqual(['menu', 'compile']);
    expect(escapeThroughEngine(e, keyEvent())).toBe(false); // only the core: engine declines
    expect(closed).toEqual(['menu', 'compile']);
    expect(e.top()).toBe('editor.document.core');
  });

  it('deschidere secvențială (meniu → închis → alt meniu): stiva rămâne coerentă', () => {
    const e = engineWithCore();
    const off1 = registerMenuSurface(e, 'view', { close: () => true });
    expect(e.top()).toBe('menu.view');
    off1();
    const off2 = registerMenuSurface(e, 'format', { close: () => true });
    expect(e.stack()).toEqual(['editor.document.core', 'menu.format']);
    off2();
    expect(e.stack()).toEqual(['editor.document.core']);
    expect(e.registry()).toEqual(['editor.document.core']);
  });

  it('id dublat (nu se întâmplă în aplicație): cleanup nu lasă stivă pe jumătate', () => {
    const e = engineWithCore();
    const off1 = registerMenuSurface(e, 'view', { close: () => true });
    const off2 = registerMenuSurface(e, 'view', { close: () => true });
    expect(e.stack()).toEqual(['editor.document.core', 'menu.view', 'menu.view']);
    off2(); // pop by lastIndexOf, then unregister — the engine removes the id entirely
    expect(e.stack()).toEqual(['editor.document.core']);
    off1(); // no-op: everything is already off the stack and out of the registry
    expect(e.stack()).toEqual(['editor.document.core']);
    expect(e.registry()).toEqual(['editor.document.core']);
  });
});

describe('runMenuItem: comanda aleasă din meniu ajunge la suprafața activă', () => {
  it('stratul transient care deține comanda răspunde înaintea funcției de bază', () => {
    const handled = [];
    const e = engineWithCore({ commands: { exportFiles: () => handled.push('core') } });
    e.registerFocusableSurface({ id: 'dialog.compile', modal: true, commands: { exportFiles: () => handled.push('compile') } });
    e.push('dialog.compile');
    registerMenuSurface(e, 'file', { close: () => true }); // the menu is the active surface
    const fallback = () => handled.push('fallback');
    expect(runMenuItem(e, { id: 'exportFiles', label: 'Export', action: fallback })).toBe('dialog.compile');
    expect(handled).toEqual(['compile']); // active surface first, action untouched
    e.pop('dialog.compile');
    expect(runMenuItem(e, { id: 'exportFiles', action: fallback })).toBe('editor.document.core');
    expect(handled).toEqual(['compile', 'core']);
  });

  it('fără id sau fără deținător → acțiunea proprie, ca înainte', () => {
    const handled = [];
    const e = engineWithCore({ commands: { exportFiles: () => handled.push('core') } });
    const fallback = () => handled.push('fallback');
    expect(runMenuItem(e, { label: 'Fără id', action: fallback })).toBe(null);
    expect(handled).toEqual(['fallback']);
    expect(runMenuItem(e, { id: 'missing', action: fallback })).toBe(null);
    expect(handled).toEqual(['fallback', 'fallback']);
    expect(runMenuItem(null, { id: 'exportFiles', action: fallback })).toBe(null);
    expect(handled).toEqual(['fallback', 'fallback', 'fallback']);
  });
});

describe('Menu.jsx pe motor: push/pop pe toate căile de închidere', () => {
  let host;
  let root;
  afterEach(() => {
    act(() => root && root.unmount());
    host?.remove();
    host = null;
    root = null;
    setDefaultFocusEngine(null);
  });

  async function renderMenu({ label = 'Fișier', menu = {}, onAction = () => {}, onPlain = () => {} } = {}) {
    host = document.createElement('div');
    host.id = 'root'; // Menu checks the event host exactly like App.jsx does
    document.body.appendChild(host);
    root = createRoot(host);
    const items = menu.items || [
      { id: 'exportFiles', label: 'Export', action: onAction },
      { label: 'Fără comandă', action: onPlain },
    ];
    await act(async () => { root.render(React.createElement(Menu, { label, ...menu, items })); });
    return host;
  }
  const menuButton = (el) => el.querySelector('button');
  const pop = (el) => el.querySelector('.menu-pop');

  it('deschidere → menu.file activ; selecția itemului: dispatch la registry + pop', async () => {
    const handled = [];
    const e = engineWithCore({ commands: { exportFiles: () => handled.push('core') } });
    await renderMenu({ menu: { engine: e, surfaceId: 'file' }, onAction: () => handled.push('item-action') });
    await act(async () => { menuButton(host).click(); });
    expect(e.top()).toBe('menu.file');
    expect(pop(host)).toBeTruthy();
    const item = host.querySelector('.menu-pop > [role="menuitem"]');
    await act(async () => { item.click(); });
    expect(handled).toEqual(['core']); // dispatch reached the core registry, not the item action
    expect(pop(host)).toBe(null); // the menu closed on selection…
    expect(e.top()).toBe('editor.document.core'); // …and its layer left the stack
    expect(e.registry()).toEqual(['editor.document.core']); // no registration leaks
  });

  it('Escape cu dialog dedesubt: motorul închide doar meniul, dialogul rămâne deschis', async () => {
    const closed = [];
    const e = engineWithCore();
    const closeDialog = registerDialogSurface(e, dialogSurfaceId('settings'), {
      close: () => { closed.push('settings'); closeDialog(); },
    });
    await renderMenu({ menu: { engine: e, surfaceId: 'file' } });
    await act(async () => { menuButton(host).click(); });
    expect(e.stack()).toEqual(['editor.document.core', 'dialog.settings', 'menu.file']);
    const offRoute = routeEscapeThroughEngine(e);
    try {
      await act(async () => { menuButton(host).focus(); }); // focus inside #root, like a real click
      await pressEscape();
      expect(closed).toEqual([]); // the dialog underneath is untouched
      expect(e.top()).toBe('dialog.settings'); // only the menu left the stack
      expect(pop(host)).toBe(null);
      await pressEscape();
      expect(closed).toEqual(['settings']); // the next press closes the dialog
      expect(e.top()).toBe('editor.document.core');
    } finally {
      offRoute();
    }
  });

  it('click în afară → pop; stiva revine la suprafața de dedesubt', async () => {
    const e = engineWithCore();
    await renderMenu({ menu: { engine: e, surfaceId: 'file' } });
    await act(async () => { menuButton(host).click(); });
    expect(e.top()).toBe('menu.file');
    await act(async () => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(e.top()).toBe('editor.document.core');
    expect(pop(host)).toBe(null);
  });

  it('Esc pe un submeniu deschis: doar submeniul se închide, meniul rămâne suprafața activă', async () => {
    const e = engineWithCore();
    await renderMenu({
      menu: {
        engine: e,
        surfaceId: 'file',
        items: [{ label: 'Importă', submenu: [{ label: 'Fișiere', action: () => {} }] }, { id: 'exportFiles', label: 'Export', action: () => {} }],
      },
    });
    await act(async () => { menuButton(host).click(); });
    const subItem = host.querySelector('.menu-subwrap > [role="menuitem"]');
    await act(async () => { subItem.click(); });
    expect(host.querySelector('.menu-sub')).toBeTruthy();
    const offRoute = routeEscapeThroughEngine(e);
    try {
      await pressEscape(); // focus is inside the submenu: self-managed, the engine never sees it
      expect(host.querySelector('.menu-sub')).toBe(null);
      expect(e.top()).toBe('menu.file');
      await pressEscape(); // now the menu itself, through the engine
      expect(e.top()).toBe('editor.document.core');
    } finally {
      offRoute();
    }
  });

  it('motorul implicit (fără prop engine): meniurile din FormatBar găsesc motorul aplicației', async () => {
    const e = engineWithCore();
    setDefaultFocusEngine(e);
    expect(activeFocusEngine()).toBe(e);
    await renderMenu({ label: 'Inserare', menu: {} });
    await act(async () => { menuButton(host).click(); });
    expect(e.top()).toBe('menu.inserare'); // id derived from the label
    await act(async () => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(e.top()).toBe('editor.document.core');
  });
});
