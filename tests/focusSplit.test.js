// @vitest-environment jsdom
// ADL §2 + §10 (T4): panoul de split editor este o suprafață pe motorul de focus —
// `editor.document.<id>:split` pushuit când panoul se deschide, pop + unregister pe fiecare cale
// de închidere (buton, comandă, Escape prin motor, unmount), focus real în editorul panoului când
// devine suprafața activă, comutare sibling cu vederea vizibilă (model inspector, fără push
// suplimentar). (Ionuț Application Design Language, campaign adl-campaign item 4.)
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createFocusEngine } from '../src/lib/focusEngine.js';
import { registerDialogSurface, escapeThroughEngine } from '../src/lib/focusDialogs.js';
import { VIEW_SURFACES, registerViewSurfaces, syncViewSurface } from '../src/lib/focusViews.js';
import { splitSurfaceId, registerSplitSurface } from '../src/lib/focusPanes.js';

// Funcția de bază, ca la mount-ul aplicației (contractul Escape al motorului: doar cu suprafața
// de bază pe stivă, Escape e no-op).
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

describe('registerSplitSurface: panoul de split este suprafața funcției de bază la nivel de document', () => {
  it('id `editor.document.<id>:split`; push la deschidere; cleanup = pop + unregister (fără scurgeri)', () => {
    const e = engineWithCore();
    expect(splitSurfaceId('doc1')).toBe('editor.document.doc1:split');
    const off = registerSplitSurface(e, 'doc1', { close: () => true });
    expect(e.top()).toBe('editor.document.doc1:split');
    expect(e.stack()).toEqual(['editor.document.core', 'editor.document.doc1:split']);
    off();
    expect(e.top()).toBe('editor.document.core');
    expect(e.registry()).toEqual(['editor.document.core']); // zero scurgeri de înregistrare
  });

  it('modal: false — panoul nu blochează restul ferestrei', () => {
    const e = engineWithCore();
    const off = registerSplitSurface(e, 'doc1', { close: () => true });
    // suprafața e accesibilă prin dispatch (ne-modale răspund comenzilor cât timp sunt active)
    expect(e.dispatch('close')).toBe('editor.document.doc1:split');
    off();
  });

  it('Escape prin motor închide panoul, vederea de dedesubt rămâne; la bază motorul declină', () => {
    const e = engineWithCore();
    registerViewSurfaces(e);
    syncViewSurface(e, VIEW_SURFACES.scrivenings);
    const closed = [];
    const off = registerSplitSurface(e, 'doc1', { close: () => { closed.push('split'); off(); } });
    expect(escapeThroughEngine(e, keyEvent())).toBe(true); // motorul decide: splitul primul
    expect(closed).toEqual(['split']);
    expect(e.top()).toBe(VIEW_SURFACES.scrivenings); // vederea a rămas pe stivă
    expect(escapeThroughEngine(e, keyEvent())).toBe(false); // doar funcția de bază: declină
    expect(e.top()).toBe(VIEW_SURFACES.scrivenings);
  });

  it('comanda `close` prin dispatch ajunge la acțiunea panoului doar când e suprafața activă', () => {
    const e = engineWithCore();
    const hits = [];
    const off = registerSplitSurface(e, 'doc1', { close: () => hits.push('split') });
    expect(e.dispatch('close')).toBe('editor.document.doc1:split');
    expect(hits).toEqual(['split']);
    // un dialog peste split: comanda close e a dialogului (innermost first), splitul nu răspunde
    const closeDialog = registerDialogSurface(e, 'dialog.compile', { close: () => { hits.push('dialog'); closeDialog(); } });
    e.dispatch('close');
    expect(hits).toEqual(['split', 'dialog']);
    expect(e.stack()).toEqual(['editor.document.core', 'editor.document.doc1:split']);
    closeDialog();
    off();
  });

  it('focus real pe editorul panoului când devine suprafața activă (push, apoi switchFocus)', () => {
    const e = engineWithCore();
    registerViewSurfaces(e);
    syncViewSurface(e, VIEW_SURFACES.scrivenings);
    const focused = [];
    const off = registerSplitSurface(e, 'doc1', { close: () => true, focus: () => focused.push('push') });
    expect(focused).toEqual(['push']); // push → nativeFocus → focus
    e.switchFocus(VIEW_SURFACES.scrivenings); // utilizatorul lucrează în panoul principal
    expect(focused).toEqual(['push']);
    e.switchFocus('editor.document.doc1:split'); // înapoi în split
    expect(focused).toEqual(['push', 'push']);
    off();
  });

  it('comutarea sibling (model inspector) nu dublează intrările pe stivă', () => {
    const e = engineWithCore();
    registerViewSurfaces(e);
    syncViewSurface(e, VIEW_SURFACES.scrivenings);
    const off = registerSplitSurface(e, 'doc1', { close: () => true });
    e.switchFocus(VIEW_SURFACES.scrivenings);
    expect(e.stack()).toEqual(['editor.document.core', 'editor.document.doc1:split', VIEW_SURFACES.scrivenings]);
    e.switchFocus('editor.document.doc1:split');
    expect(e.stack()).toEqual(['editor.document.core', VIEW_SURFACES.scrivenings, 'editor.document.doc1:split']);
    off();
    expect(e.stack()).toEqual(['editor.document.core', VIEW_SURFACES.scrivenings]);
    expect(e.registry()).not.toContain('editor.document.doc1:split'); // fără scurgeri
  });

  it('schimbarea documentului din split (doc1 → doc2): suprafața veche dispare, cea nouă e activă', () => {
    const e = engineWithCore();
    const off1 = registerSplitSurface(e, 'doc1', { close: () => true });
    off1(); // App: cleanup-ul efectului la schimbarea id-ului
    const off2 = registerSplitSurface(e, 'doc2', { close: () => true });
    expect(e.stack()).toEqual(['editor.document.core', 'editor.document.doc2:split']);
    expect(e.registry()).toEqual(['editor.document.core', 'editor.document.doc2:split']);
    off2();
    expect(e.registry()).toEqual(['editor.document.core']);
  });
});

// Cablarea în App (glue-ul de nivel componentă se verifică la sursă, ca în settingsDoors):
// efectul de înregistrare pe splitNode, închiderea prin setSplitId(null), armaria focusului la
// deschiderea manuală, comutarea panourilor și înlocuirea suprafeței agregate panel.quickref.
describe('cablarea în App.jsx: suprafață split + comutarea panourilor', () => {
  const app = () => fs.readFileSync('src/App.jsx', 'utf8');

  it('splitul se înregistrează pe motor cu close → setSplitId(null)', () => {
    const src = app();
    expect(src).toContain("registerSplitSurface(focusEngine, splitNode.id, {");
    expect(src).toContain('close: () => setSplitId(null)');
  });

  it('deschiderile utilizatorului armază focusul real în panou (openSplit), nu și restaurările', () => {
    const src = app();
    expect(src).toContain('const openSplit = (id) => {');
    expect(src).toContain('splitFocusArmed.current = true');
    expect(src).toMatch(/onClick=\{\(\) => openSplit\(splitId \? null/);
    expect(src).toContain("['view', 'splitEditor', tr('cmd.splitEditor'), () => openSplit(");
    expect(src).toContain('flush().then(() => openSplit(id))');
    expect(src).toContain('const openBeside = (mediaId) => {');
    expect(src).toMatch(/openBeside = \(mediaId\) => \{\s*\n\s*if \(splitId === mediaId\) return;\s*\n\s*openSplit\(mediaId\);/);
  });

  it('panoul în care lucrează utilizatorul devine suprafața activă (switch sibling, model inspector)', () => {
    const src = app();
    expect(src).toContain("t.closest('.workspace .pane.second') && sid");
    expect(src).toContain('eng.switchFocus(sid)');
    expect(src).toContain("startsWith('quickref.')"); // hand-back acoperă și panourile Quick Reference
  });

  it('suprafața agregată panel.quickref e înlocuită de suprafețe per-panou quickref.<id>', () => {
    expect(app()).not.toContain('panel.quickref');
  });
});
