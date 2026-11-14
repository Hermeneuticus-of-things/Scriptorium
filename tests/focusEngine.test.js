// ADL §2 focus engine: stacks, registration, push/pop with exact restore, dispatch bubbling,
// Escape cascade order, surface destruction. (Ionuț Application Design Language, focus as engine logic.)
import { describe, it, expect } from 'vitest';
import { createFocusEngine } from '../src/lib/focusEngine.js';

describe('registration', () => {
  it('needs an id; idempotent re-register returns an unregister fn', () => {
    const e = createFocusEngine();
    expect(() => e.registerFocusableSurface({})).toThrow(/id/);
    const un = e.registerFocusableSurface({ id: 'editor.document.1' });
    expect(typeof un).toBe('function');
    un();
    expect(e.registry()).not.toContain('editor.document.1');
  });
});

describe('push/pop: exact restore of trigger state (caret, scroll, selection)', () => {
  it('captura stării apelantului și restaurarea la pop', async () => {
    const e = createFocusEngine();
    const restored = [];
    e.registerFocusableSurface({
      id: 'editor.document.abc',
      capture: () => ({ caret: 42, selection: [10, 20] }),
      restore: (s) => restored.push(s),
      commands: {},
    });
    e.registerFocusableSurface({ id: 'settings.app', commands: {} });
    e.push('editor.document.abc');
    e.push('settings.app', 'editor.document.abc');
    expect(e.top()).toBe('settings.app');
    expect(e.pop('settings.app')).toBe('editor.document.abc');
    expect(restored).toEqual([{ caret: 42, selection: [10, 20] }]);
    expect(e.top()).toBe('editor.document.abc');
  });

  it('pop la un id inexistent → null; focus nu rămâne pe nimic', () => {
    const e = createFocusEngine();
    e.registerFocusableSurface({ id: 'editor.document.1' });
    e.push('editor.document.1');
    expect(e.pop('settings.app')).toBe(null);
    expect(e.top()).toBe('editor.document.1');
  });
});

describe('dispatch: active surface first, then bubble outward', () => {
  it('surface-local command wins over the window-level one', () => {
    const e = createFocusEngine();
    let hits = [];
    e.registerFocusableSurface({ id: 'editor.document.1', commands: { 'find': () => hits.push('surface') } });
    e.registerFocusableSurface({ id: 'dialog.test', commands: {} });
    e.push('editor.document.1');
    e.push('dialog.test', 'editor.document.1');
    const handled = e.dispatch('find');
    expect(handled).toBe('editor.document.1'); // dialog unhandled → bubbles to the editor
    expect(hits).toEqual(['surface']);
  });
  it('necunoscut peste tot → null (apelantul aplică default-ul de fereastră)', () => {
    const e = createFocusEngine();
    e.registerFocusableSurface({ id: 'editor.document.1', commands: {} });
    e.push('editor.document.1');
    expect(e.dispatch('nu-exista')).toBe(null);
  });
});

describe('Escape cascade: innermost transient first, one per press, no-op in core', () => {
  it('dropdown → menu → popover → dialog, în ordine, câte unul per Escape', () => {
    const e = createFocusEngine();
    for (const id of ['editor.document.1', 'dialog.a', 'popover.b', 'menu.c', 'dropdown.d']) {
      e.registerFocusableSurface({ id });
    }
    e.push('editor.document.1');
    e.push('dialog.a');
    e.push('popover.b');
    e.push('menu.c');
    e.push('dropdown.d');
    expect(e.escape()).toBe('dropdown.d');
    expect(e.escape()).toBe('menu.c');
    expect(e.escape()).toBe('popover.b');
    expect(e.escape()).toBe('dialog.a');
    expect(e.escape()).toBe(null); // core function: Escape no-op
    expect(e.top()).toBe('editor.document.1');
  });
});

describe('onSurfaceDestroyed: parent close pops children, next object gets focus', () => {
  it('destroy pe părinte scoate și copiii', () => {
    const e = createFocusEngine();
    e.registerFocusableSurface({ id: 'editor.document.1' });
    e.registerFocusableSurface({ id: 'panel.irep' });
    e.push('editor.document.1');
    e.push('panel.irep', 'editor.document.1');
    e.onSurfaceDestroyed('editor.document.1');
    expect(e.stack()).toEqual([]);
    expect(e.top()).toBe(null);
  });
});

describe('switchFocus: sibling surfaces (F6 / click)', () => {
  it('suprafață deja deschisă → adusă pe top; nouă → push', () => {
    const e = createFocusEngine();
    e.registerFocusableSurface({ id: 'editor.document.1' });
    e.registerFocusableSurface({ id: 'panel.irep' });
    e.push('editor.document.1');
    e.push('panel.irep');
    expect(e.switchFocus('editor.document.1')).toBe('editor.document.1');
    expect(e.top()).toBe('editor.document.1');
    expect(e.switchFocus('panel.irep')).toBe('panel.irep');
    expect(e.top()).toBe('panel.irep');
  });
});
