// @vitest-environment jsdom
// ADL §2 T7: Corkboard / Outliner / Scrivenings as engine surfaces — switchFocus on view change,
// exactly one active view on the stack (row commands can never bubble to a hidden board),
// focus ≠ selection (the selection stays visible-inactive while another surface owns the focus,
// never cleared on blur), and the row-Delete door that refuses while the user types in the editor.
// (Ionuț Application Design Language, docs/IONUT_APPLICATION_DESIGN_LANGUAGE.md §2.)
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { createFocusEngine } from '../src/lib/focusEngine.js';
import { registerDialogSurface } from '../src/lib/focusDialogs.js';
import { VIEW_SURFACES, surfaceForView, registerViewSurfaces, syncViewSurface, dispatchRowDelete } from '../src/lib/focusViews.js';
import Corkboard from '../src/components/Corkboard.jsx';
import Outliner from '../src/components/Outliner.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// A core-function base like the app pushes at mount (see tests/focusDialogs.test.js).
function engineWithCore() {
  const e = createFocusEngine();
  e.registerFocusableSurface({ id: 'editor.document.core', capture: () => ({ caret: 7 }), restore: () => {} });
  e.push('editor.document.core');
  return e;
}

let root; let host;
afterEach(() => { act(() => root && root.unmount()); host?.remove(); root = null; host = null; });

async function render(el) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root.render(el); });
  return host;
}

describe('surface ids: app views map onto engine surfaces', () => {
  it('Ctrl+1/2/3 views → view.scrivenings / view.corkboard / view.outliner', () => {
    expect(surfaceForView('editor')).toBe('view.scrivenings');
    expect(surfaceForView('corkboard')).toBe('view.corkboard');
    expect(surfaceForView('outline')).toBe('view.outliner');
    expect(surfaceForView('timeline')).toBe('view.scrivenings'); // whole-book views live in the core pane
  });
});

describe('switch view: exactly one active view surface, selection untouched', () => {
  it('sync replaces the old view surface (no duplicates, core stays at the bottom)', () => {
    const e = engineWithCore();
    const un = registerViewSurfaces(e);
    syncViewSurface(e, VIEW_SURFACES.corkboard);
    expect(e.stack()).toEqual(['editor.document.core', 'view.corkboard']);
    syncViewSurface(e, VIEW_SURFACES.outliner);
    expect(e.stack()).toEqual(['editor.document.core', 'view.outliner']);
    syncViewSurface(e, VIEW_SURFACES.scrivenings);
    expect(e.stack()).toEqual(['editor.document.core', 'view.scrivenings']);
    syncViewSurface(e, VIEW_SURFACES.scrivenings); // same view again → no-op
    expect(e.stack()).toEqual(['editor.document.core', 'view.scrivenings']);
    un();
    expect(e.registry()).toEqual(['editor.document.core']);
  });

  it('a dialog over the board never unmounts the view surface: selection survives blur, active on return', () => {
    const e = engineWithCore();
    const un = registerViewSurfaces(e);
    syncViewSurface(e, VIEW_SURFACES.corkboard);
    const closeDialog = registerDialogSurface(e, 'dialog.settings', { close: () => true });
    // Settings owns the focus; the board (and with it the selection) stays mounted below it.
    expect(e.stack()).toEqual(['editor.document.core', 'view.corkboard', 'dialog.settings']);
    closeDialog();
    expect(e.top()).toBe('view.corkboard'); // restored active on return
    un();
  });

  it('a transient over the view refuses the switch; closing it re-syncs (what the app effect does)', () => {
    const e = engineWithCore();
    const un = registerViewSurfaces(e);
    syncViewSurface(e, VIEW_SURFACES.scrivenings);
    e.registerFocusableSurface({ id: 'panel.quickref' });
    e.push('panel.quickref');
    expect(syncViewSurface(e, VIEW_SURFACES.corkboard)).toBe(null); // quick-ref owns the top
    expect(e.stack()).toEqual(['editor.document.core', 'view.scrivenings', 'panel.quickref']);
    e.pop('panel.quickref');
    syncViewSurface(e, VIEW_SURFACES.corkboard); // heals on close
    expect(e.stack()).toEqual(['editor.document.core', 'view.corkboard']);
    un();
  });
});

describe('switchFocus on surfaces: the inspector is a sibling, not a replacement', () => {
  it('pushes once when focus enters it, hands back to the view when focus leaves', () => {
    const e = engineWithCore();
    const un = registerViewSurfaces(e);
    e.registerFocusableSurface({ id: 'panel.inspector' });
    syncViewSurface(e, VIEW_SURFACES.scrivenings);
    e.switchFocus('panel.inspector'); // focusin inside .inspector
    expect(e.stack()).toEqual(['editor.document.core', 'view.scrivenings', 'panel.inspector']);
    e.switchFocus('panel.inspector'); // again — no duplicate
    expect(e.stack()).toEqual(['editor.document.core', 'view.scrivenings', 'panel.inspector']);
    e.switchFocus(VIEW_SURFACES.scrivenings); // focusin back in the view
    expect(e.top()).toBe('view.scrivenings');
    expect(e.stack()).toEqual(['editor.document.core', 'panel.inspector', 'view.scrivenings']);
    un();
  });
});

describe('focus ≠ selection driver: engine.subscribe makes the active surface reactive', () => {
  it('fires once per real stack change with the current top', () => {
    const e = engineWithCore();
    const seen = [];
    const off = e.subscribe(() => seen.push(e.top()));
    e.registerFocusableSurface({ id: 'view.corkboard' });
    e.push('view.corkboard');
    e.switchFocus('editor.document.core');
    e.switchFocus('editor.document.core'); // already top — no change, no notification
    off();
    e.push('view.corkboard');
    expect(seen).toEqual(['view.corkboard', 'editor.document.core']);
  });
});

describe('row Delete door: never reaches the rows while the user types in the editor', () => {
  it('refused on the scrivenings surface (typing), delivered only on the active board/outliner', () => {
    const e = engineWithCore();
    let trashed = 0;
    const un = registerViewSurfaces(e, { onDeleteRow: () => { trashed += 1; } });
    syncViewSurface(e, VIEW_SURFACES.scrivenings); // Ctrl+1: the user edits text
    expect(dispatchRowDelete(e)).toBe(null);
    expect(trashed).toBe(0);
    syncViewSurface(e, VIEW_SURFACES.corkboard); // Ctrl+2: back on the board
    expect(dispatchRowDelete(e)).toBe('view.corkboard');
    expect(trashed).toBe(1);
    syncViewSurface(e, VIEW_SURFACES.outliner);
    expect(dispatchRowDelete(e)).toBe('view.outliner');
    expect(trashed).toBe(2);
    un();
  });

  it('refused while a dialog or quick-ref owns the focus, even over the board', () => {
    const e = engineWithCore();
    let trashed = 0;
    const un = registerViewSurfaces(e, { onDeleteRow: () => { trashed += 1; } });
    syncViewSurface(e, VIEW_SURFACES.corkboard);
    const closeDialog = registerDialogSurface(e, 'dialog.settings', { close: () => true });
    expect(dispatchRowDelete(e)).toBe(null);
    closeDialog();
    e.registerFocusableSurface({ id: 'panel.quickref' });
    e.push('panel.quickref');
    expect(dispatchRowDelete(e)).toBe(null);
    expect(trashed).toBe(0);
    un();
  });

  it('unregistered surface names can never receive the command (unknown → null)', () => {
    const e = engineWithCore();
    expect(dispatchRowDelete(e)).toBe(null); // bare core, no views at all
  });
});

describe('Corkboard renders focus ≠ selection on the selected card', () => {
  const project = { labels: [], keywordDefs: [] };
  const folder = { id: 'f', title: 'Capitol', children: [{ id: 'a', type: 'text', title: 'Alfa', synopsis: '' }, { id: 'b', type: 'text', title: 'Beta', synopsis: '' }] };
  const base = { project, folder, onOpen: () => {}, onPatch: () => {}, onAdd: () => null, onMove: () => {}, onReorder: () => {}, readMedia: null };

  it('selected stays aria-selected and only the inactive colour flips with surfaceActive', async () => {
    await render(React.createElement(Corkboard, { ...base, surfaceActive: true }));
    let card = host.querySelector('[data-card-id="a"]');
    await act(async () => { card.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    card = host.querySelector('[data-card-id="a"]');
    expect(card.className).toContain('selected');
    expect(card.className).not.toContain('inactive');
    expect(card.getAttribute('aria-selected')).toBe('true');
    // Settings opens: the surface is no longer active — same card, inactive colour, selection kept.
    await act(async () => { root.render(React.createElement(Corkboard, { ...base, surfaceActive: false })); });
    card = host.querySelector('[data-card-id="a"]');
    expect(card.className).toContain('selected');
    expect(card.className).toContain('inactive');
    expect(card.getAttribute('aria-selected')).toBe('true');
    // Back from settings: active colour again, still selected (never cleared on blur).
    await act(async () => { root.render(React.createElement(Corkboard, { ...base, surfaceActive: true })); });
    card = host.querySelector('[data-card-id="a"]');
    expect(card.className).toContain('selected');
    expect(card.className).not.toContain('inactive');
    expect(card.getAttribute('aria-selected')).toBe('true');
  });
});

describe('Outliner renders focus ≠ selection on the selected row', () => {
  const project = { labels: [], statuses: [], customFields: [] };
  const rootTree = { id: 'd', title: 'Manuscris', children: [{ id: 'a', type: 'text', title: 'Alfa' }] };
  const base = { project, root: rootTree, counts: {}, onOpen: () => {}, onPatch: () => {}, onMove: () => {} };

  it('selected keeps aria-selected; the inactive class follows surfaceActive', async () => {
    await render(React.createElement(Outliner, { ...base, surfaceActive: true }));
    let row = host.querySelector('tr[data-row-id="a"]');
    await act(async () => { row.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    row = host.querySelector('tr[data-row-id="a"]');
    expect(row.className).toContain('selected');
    expect(row.className).not.toContain('inactive');
    expect(row.getAttribute('aria-selected')).toBe('true');
    await act(async () => { root.render(React.createElement(Outliner, { ...base, surfaceActive: false })); });
    row = host.querySelector('tr[data-row-id="a"]');
    expect(row.className).toContain('selected');
    expect(row.className).toContain('inactive');
    expect(row.getAttribute('aria-selected')).toBe('true');
    await act(async () => { root.render(React.createElement(Outliner, { ...base, surfaceActive: true })); });
    row = host.querySelector('tr[data-row-id="a"]');
    expect(row.className).not.toContain('inactive');
  });
});
