// @vitest-environment jsdom
// ADL §2 + §5, campania adl-campaign item 5 (T5): captură/restaurare REALĂ a editorului la
// push/pop pe motorul de focus (src/lib/focusEditorState.js). Când un strat translucid — meniu,
// dropdown, dialog, popover — se deschide peste editorul de documente, motorul salvează selecția
// (from/to) și scroll-ul din handle-ul real; la pop le restaurează exact, LIFO pe niveluri, cu
// fallback definit (cea mai apropiată poziție validă) când doc-ul s-a schimbat între timp.
import { describe, it, expect } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { createFocusEngine } from '../src/lib/focusEngine.js';
import { registerDialogSurface, dialogSurfaceId } from '../src/lib/focusDialogs.js';
import { menuSurfaceId, registerMenuSurface } from '../src/lib/focusMenus.js';
import {
  editorScrollEl,
  captureEditorState,
  restoreEditorState,
  focusEditorPlain,
  editorSurfaceRegistration,
} from '../src/lib/focusEditorState.js';

// Schema minimală prosemirror: starea e REALĂ (TextSelection.create, state.tr, doc.content.size),
// doar view-ul e fals — exact ce citesc capture/restore.
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*' },
    text: { inline: true },
  },
});

// Editor fals ca cel din Editor.jsx: instanță prosemirror reală ca state, view fals cu dom în
// .pane (panoul care defapt scrollează). `log` înregistrează ordinea focus → selecție → scroll.
function makeEditor({ text = 'un text oarecare pentru teste de focus', scrollTop = 120 } = {}) {
  const log = [];
  const pane = document.createElement('div');
  pane.className = 'pane';
  const dom = document.createElement('div');
  pane.appendChild(dom);
  let top = scrollTop;
  let focused = false;
  Object.defineProperty(pane, 'scrollTop', {
    get: () => top,
    set: (v) => { top = v; log.push('scroll'); },
  });
  const ed = {};
  ed.isDestroyed = false;
  ed._state = EditorState.create({ doc: schema.node('doc', null, [schema.node('paragraph', null, [schema.text(text)])]) });
  ed.view = {
    dom,
    hasFocus: () => focused,
    focus() { focused = true; log.push('focus'); },
    blur() { focused = false; log.push('blur'); },
    dispatch(tr) { ed._state = ed._state.apply(tr); log.push('selection'); },
  };
  ed.state = undefined;
  Object.defineProperty(ed, 'state', { get: () => ed._state });
  ed._log = log;
  ed._pane = pane;
  return ed;
}

// Mută selecția prin calea reală (tranzacție prosemirror), ca orice editare din aplicație.
function moveSelection(ed, from, to) {
  ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, from, to)));
}

describe('captureEditorState: instanța {from, to, scrollTop} din handle', () => {
  it('selecția și scroll-ul panoului merg în instantă', () => {
    const ed = makeEditor();
    moveSelection(ed, 5, 9);
    expect(captureEditorState(ed)).toEqual({ from: 5, to: 9, scrollTop: 120 });
  });

  it('handle-ul imperativ (cu .editor) e acceptat la fel ca editorul direct', () => {
    const ed = makeEditor();
    moveSelection(ed, 3, 4);
    expect(captureEditorState({ editor: ed })).toEqual(captureEditorState(ed));
  });

  it('editor lipsă sau distrus → null (restaurarea devine no-op, nu ațârnă)', () => {
    expect(captureEditorState(null)).toBe(null);
    expect(captureEditorState(undefined)).toBe(null);
    const ed = makeEditor();
    ed.isDestroyed = true;
    expect(captureEditorState(ed)).toBe(null);
  });

  it('fără container .pane → scrollTop null, selecția rămâne în instantă', () => {
    const ed = makeEditor();
    const orphan = document.createElement('div');
    ed.view.dom = orphan; // editorul nu stă într-un panou care scrollează
    moveSelection(ed, 2, 6);
    expect(captureEditorState(ed)).toEqual({ from: 2, to: 6, scrollTop: null });
  });
});

describe('restoreEditorState: restaurare exactă, în ordinea focus → selecție → scroll', () => {
  it('caretul, selecția și scroll-ul revin exact pe pozițiile capturate', () => {
    const ed = makeEditor();
    moveSelection(ed, 5, 9);
    const stare = captureEditorState(ed);
    // între timp: selecția s-a mutat, panoul s-a scrolat, focus-ul a plecat
    moveSelection(ed, 20, 22);
    ed._pane.scrollTop = 400;
    ed.view.blur();
    ed._log.length = 0;
    expect(restoreEditorState(ed, stare)).toBe(true);
    expect(ed.state.selection.from).toBe(5);
    expect(ed.state.selection.to).toBe(9);
    expect(ed._pane.scrollTop).toBe(120);
    expect(ed.view.hasFocus()).toBe(true);
    // focus ÎNTÂI (o view nefocalizată își sincronizează selecția veche din DOM la focus),
    // apoi selecția, apoi scroll — nimic nu mai scrollează peste ea
    expect(ed._log).toEqual(['focus', 'selection', 'scroll']);
  });

  it('editor lipsă, distrus sau stare lipsă → false, fără mutări', () => {
    const ed = makeEditor();
    expect(restoreEditorState(null, { from: 1, to: 2, scrollTop: 0 })).toBe(false);
    expect(restoreEditorState(ed, null)).toBe(false);
    expect(restoreEditorState(ed, undefined)).toBe(false);
    ed.isDestroyed = true;
    expect(restoreEditorState(ed, { from: 1, to: 2, scrollTop: 0 })).toBe(false);
  });

  it('stare fără nimic restaurabil → false, editorul neatins', () => {
    const ed = makeEditor();
    moveSelection(ed, 5, 9);
    ed._log.length = 0;
    expect(restoreEditorState(ed, {})).toBe(false);
    expect(ed._log).toEqual([]);
    expect(ed.state.selection.from).toBe(5);
  });
});

describe('doc schimbat între captură și restaurare: fallback definit în comentariu', () => {
  it('poziții ieșite din doc-ul nou → cea mai apropiată poziție validă (clamp), niciodată excepție', () => {
    const ed = makeEditor({ text: 'x'.repeat(60) });
    moveSelection(ed, 40, 50);
    const stare = captureEditorState(ed);
    // doc-ul s-a schimbat complet (ex. schimbare de document sau editare programatică masivă)
    ed._state = EditorState.create({ doc: schema.node('doc', null, [schema.node('paragraph', null, [schema.text('mic')])]) });
    ed._pane.scrollTop = 300;
    ed._log.length = 0;
    expect(() => restoreEditorState(ed, stare)).not.toThrow();
    const size = ed.state.doc.content.size;
    expect(ed.state.selection.from).toBe(size); // clamp la marginea validă
    expect(ed.state.selection.to).toBe(size);
    expect(ed._pane.scrollTop).toBe(120); // scroll-ul tot se restaurează
  });

  it('poziții încă valide după schimbare → restaurate exact (validul bate estimarea)', () => {
    const ed = makeEditor({ text: 'x'.repeat(60) });
    moveSelection(ed, 40, 50);
    const stare = captureEditorState(ed);
    // alt doc (alt obiect), dar suficient de mare: pozițiile rămân valide
    ed._state = EditorState.create({ doc: schema.node('doc', null, [schema.node('paragraph', null, [schema.text('y'.repeat(80))])]) });
    expect(restoreEditorState(ed, stare)).toBe(true);
    expect(ed.state.selection.from).toBe(40);
    expect(ed.state.selection.to).toBe(50);
  });
});

describe('focusEditorPlain: focus fără mișcarea selecției sau a scroll-ului', () => {
  it('doar focus; comenzile tiptap focus scrollează, asta nu', () => {
    const ed = makeEditor();
    moveSelection(ed, 5, 9);
    ed._log.length = 0;
    expect(focusEditorPlain(ed)).toBe(true);
    expect(ed._log).toEqual(['focus']);
    expect(ed.state.selection.from).toBe(5);
    expect(ed._pane.scrollTop).toBe(120);
    expect(focusEditorPlain(null)).toBe(false);
  });
});

describe('editorSurfaceRegistration: puntea spre motorul de focus', () => {
  it('capture/restore/focus legate la getHandle; commands trecute mai departe', () => {
    const ed = makeEditor();
    moveSelection(ed, 5, 9);
    const commands = { find: () => true };
    const reg = editorSurfaceRegistration(() => ({ editor: ed }), commands);
    expect(reg.commands).toBe(commands);
    const stare = reg.capture();
    ed._pane.scrollTop = 404;
    expect(reg.restore(stare)).toBe(true);
    expect(ed._pane.scrollTop).toBe(120);
    ed.view.blur(); // deja focusat de restore: focusEditorPlain nu repeta focus-ul
    ed._log.length = 0;
    reg.focus();
    expect(ed._log).toEqual(['focus']);
  });

  it('getHandle lipsă (panou închis) → captură null, restaurare no-op', () => {
    const reg = editorSurfaceRegistration(() => null);
    expect(reg.capture()).toBe(null);
    expect(reg.restore({ from: 1, to: 2, scrollTop: 0 })).toBe(false);
  });
});

// motorul ADL: suprafața `editor.document.core` cu registration reală — capture la push-ul
// ORICĂRUI strat translucid peste editor, restore la pop (exact contractul T5).
function engineWithRealEditor(ed) {
  const e = createFocusEngine();
  e.registerFocusableSurface({ id: 'editor.document.core', ...editorSurfaceRegistration(() => ({ editor: ed })) });
  e.push('editor.document.core');
  return e;
}

describe('push/pop pe motor: captură și restaurare reală din editor handle', () => {
  it('dialog peste editor: la pop, caret+selecție+scroll+focus revin exact', () => {
    const ed = makeEditor();
    moveSelection(ed, 5, 9);
    const e = engineWithRealEditor(ed);
    const closeDialog = registerDialogSurface(e, dialogSurfaceId('settings'), { close: () => true });
    // între timp: selecția s-a mutat, panoul s-a scrolat, focus-ul a plecat la dialog
    moveSelection(ed, 30, 30);
    ed._pane.scrollTop = 400;
    ed.view.blur();
    ed._log.length = 0;
    closeDialog();
    expect(e.top()).toBe('editor.document.core');
    expect(ed.state.selection.from).toBe(5);
    expect(ed.state.selection.to).toBe(9);
    expect(ed._pane.scrollTop).toBe(120);
    expect(ed.view.hasFocus()).toBe(true);
    expect(ed._log).toEqual(['focus', 'selection', 'scroll']);
  });

  it('cascadă 2 straturi: fiecare nivel își păstrează captura proprie (LIFO)', () => {
    const ed = makeEditor();
    moveSelection(ed, 5, 9);
    const e = engineWithRealEditor(ed);
    // dialogul cu captură PROPRIE (alt nivel al stivei, altă stare decât a editorului)
    const dialogSaved = [];
    e.registerFocusableSurface({
      id: dialogSurfaceId('settings'),
      capture: () => ({ tag: 'dialog-capture' }),
      restore: (s) => dialogSaved.push(s),
    });
    const closeDialog = registerDialogSurface(e, dialogSurfaceId('settings'), { close: () => true });
    moveSelection(ed, 30, 30); // editare în timpul dialogului
    const closeMenu = registerMenuSurface(e, 'format', { close: () => true });
    expect(e.stack()).toEqual(['editor.document.core', 'dialog.settings', 'menu.format']);
    moveSelection(ed, 40, 40); // încă una în timpul meniului
    closeMenu();
    // pop-ul meniului restaurează nivelul DIALOGULUI, nu al editorului: captura proprie
    expect(dialogSaved).toEqual([{ tag: 'dialog-capture' }]);
    expect(ed.state.selection.from).toBe(40); // editorul încă neatins
    closeDialog();
    // pop-ul dialogului dezvelește editorul: captura dinaintea AMBELOR straturi (LIFO)
    expect(ed.state.selection.from).toBe(5);
    expect(ed.state.selection.to).toBe(9);
    expect(ed._pane.scrollTop).toBe(120);
    expect(ed.view.hasFocus()).toBe(true);
  });

  it('Escape prin motor (dropdown peste editor): același restore', () => {
    const ed = makeEditor();
    moveSelection(ed, 5, 9);
    const e = engineWithRealEditor(ed);
    e.registerFocusableSurface({ id: 'dropdown.font', commands: {} });
    e.push('dropdown.font');
    moveSelection(ed, 30, 30);
    ed._pane.scrollTop = 400;
    expect(e.escape()).toBe('dropdown.font');
    expect(ed.state.selection.from).toBe(5);
    expect(ed._pane.scrollTop).toBe(120);
  });

  it('fără registration cu captură (ca înainte de T5) → nimic nu se restaurează', () => {
    const ed = makeEditor();
    moveSelection(ed, 5, 9);
    const e = createFocusEngine();
    e.registerFocusableSurface({ id: 'editor.document.core' }); // fără capture/restore
    e.push('editor.document.core');
    const closeDialog = registerDialogSurface(e, dialogSurfaceId('x'), { close: () => true });
    moveSelection(ed, 30, 30);
    ed._pane.scrollTop = 400;
    closeDialog();
    expect(ed.state.selection.from).toBe(30); // neatins: motorul nu are de unde ști
    expect(ed._pane.scrollTop).toBe(400);
  });
});
