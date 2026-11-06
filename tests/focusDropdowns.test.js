// @vitest-environment jsdom
// ADL §2 + §5 (docs/IONUT_APPLICATION_DESIGN_LANGUAGE): dropdown-urile FormatBar ca suprafețe
// pe motorul de focus — deschis = suprafața activă `dropdown.<fieldId>`, close (orice cale) =
// pop; Escape ajunge la motor și închide stratul cel mai interior (dropdownul), nu dialogul
// dedesubt; comenzile locale trec prin engine.dispatch. (Itemul 3 din campania ADL.)
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createFocusEngine } from '../src/lib/focusEngine.js';
import { dropdownSurfaceId, registerDropdownField, registerDropdownSurface } from '../src/lib/focusDropdowns.js';
import { registerDialogSurface, escapeThroughEngine } from '../src/lib/focusDialogs.js';
import { setLanguage, t } from '../src/lib/i18n.js';

// FormatBar citește starea editorului prin useEditorState: în test selectorul primește editorul
// fals direct, fără reactivitate — suficient pentru deschiderea dropdownurilor și comenzile lor.
vi.mock('@tiptap/react', () => ({
  useEditorState: ({ editor, selector }) => selector({ editor }),
}));

import FormatBar from '../src/components/FormatBar.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => setLanguage('ro'));

// Evenimente Escape ca obiecte simple (decizia din escapeThroughEngine citeste exact astea).
function keyEvent(over = {}) {
  const e = {
    key: 'Escape',
    defaultPrevented: false,
    cancelBubble: false,
    prevented: 0,
    stopped: 0,
    preventDefault() { this.defaultPrevented = true; this.prevented += 1; },
    stopPropagation() { this.cancelBubble = true; this.stopped += 1; },
    ...over,
  };
  return e;
}

// Nucleul funcției de bază, ca la montarea din App.jsx (Escape no-op când e singur pe stivă).
function engineWithCore() {
  const e = createFocusEngine();
  e.registerFocusableSurface({ id: 'editor.document.core', commands: {} });
  e.push('editor.document.core');
  return e;
}

const recorded = [];
function makeEditor(over = {}) {
  const chain = new Proxy({}, {
    get(_, prop) {
      if (prop === 'run') return () => { recorded.push('run'); return true; };
      return (...args) => { recorded.push(String(prop)); return chain; };
    },
  });
  return {
    state: {
      selection: { from: 0, to: 0, empty: true, $from: { parent: { attrs: {} } } },
      doc: { descendants: () => {}, textBetween: () => '' },
    },
    isActive: () => false,
    getAttributes: () => ({}),
    chain: () => chain,
    commands: { focus: () => recorded.push('focus-editor') },
    ...over,
  };
}

let root, el;
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

// Montare ca în aplicație: motorul ascultă Escape la rădăcina React (App.jsx → escapeThroughEngine).
async function mountBar(engineForBar) {
  el = document.createElement('div');
  document.body.appendChild(el);
  root = createRoot(el);
  el.addEventListener('keydown', (e) => escapeThroughEngine(engineForBar, e));
  const ed = makeEditor();
  await act(async () => root.render(React.createElement(FormatBar, { editor: ed, focusEngine: engineForBar, styles: [], view: {} })));
  await flush();
  return ed;
}

afterEach(() => {
  try { act(() => root.unmount()); } catch { /* not mounted */ }
  el?.remove();
  el = null; root = null;
  recorded.length = 0;
});

const trigger = (label) => [...el.querySelectorAll('button[aria-haspopup]')].find(
  (b) => b.getAttribute('aria-label')?.includes(label) || b.textContent.includes(label),
);
const popItems = () => [...el.querySelectorAll('.menu-pop [role="menuitem"]')];

describe('focusDropdowns (modul): suprafața `dropdown.<id>` pe stivă', () => {
  it('dropdownSurfaceId: `dropdown.<fieldId>`', () => {
    expect(dropdownSurfaceId('table')).toBe('dropdown.table');
    expect(dropdownSurfaceId('block')).toBe('dropdown.block');
  });

  it('registerDropdownSurface: push peste nucleu; cleanup = pop + unregister (fără scurgeri)', () => {
    const e = engineWithCore();
    const close = registerDropdownSurface(e, 'dropdown.table', { close: () => true });
    expect(e.stack()).toEqual(['editor.document.core', 'dropdown.table']);
    expect(e.top()).toBe('dropdown.table'); // dropdownul e suprafața activă
    close();
    expect(e.top()).toBe('editor.document.core'); // editorul rămâne dedesubt
    expect(e.registry()).toEqual(['editor.document.core']);
  });

  it('open duplicat → o singură suprafață pe stivă (idempotent)', () => {
    const e = engineWithCore();
    const c1 = registerDropdownSurface(e, 'dropdown.font', { close: () => true });
    const c2 = registerDropdownSurface(e, 'dropdown.font', { close: () => true });
    expect(e.stack()).toEqual(['editor.document.core', 'dropdown.font']);
    c2(); // orice cleanup scoate suprafața și o dezînregistrează
    expect(e.top()).toBe('editor.document.core');
    expect(e.registry()).not.toContain('dropdown.font');
    c1(); // al doilea cleanup pe suprafață deja scoasă: fără crăpare, stiva rămâne curată
    expect(e.top()).toBe('editor.document.core');
    expect(e.registry()).toEqual(['editor.document.core']);
  });

  it('registerDropdownField: înregistrare stabilă, open/shut repetate (select nativ)', () => {
    const e = engineWithCore();
    let closed = 0;
    const field = registerDropdownField(e, 'dropdown.size', { close: () => { closed += 1; return true; } });
    expect(e.registry()).toContain('dropdown.size');
    expect(e.top()).toBe('editor.document.core'); // înregistrat ≠ deschis
    field.open();
    field.open(); // open-intent repetat (al doilea click): o singură suprafață
    expect(e.stack()).toEqual(['editor.document.core', 'dropdown.size']);
    expect(e.dispatch('close')).toBe('dropdown.size'); // comanda locală, pe stratul lui
    expect(closed).toBe(1);
    expect(e.top()).toBe('dropdown.size'); // proprietarul UI decide când se închide (apoi pop)
    field.shut();
    expect(e.top()).toBe('editor.document.core');
    field.unregister();
    expect(e.registry()).not.toContain('dropdown.size');
  });

  it('cascade Escape: dropdown peste dialog → prima apăsare închide doar dropdownul', () => {
    const e = engineWithCore();
    const closed = [];
    const closeCompile = registerDialogSurface(e, 'dialog.compile', {
      close: () => { closed.push('compile'); closeCompile(); },
    });
    const closeTable = registerDropdownSurface(e, 'dropdown.table', {
      close: () => { closed.push('table'); closeTable(); },
    });
    expect(e.stack()).toEqual(['editor.document.core', 'dialog.compile', 'dropdown.table']);
    expect(escapeThroughEngine(e, keyEvent())).toBe(true);
    expect(closed).toEqual(['table']); // stratul cel mai interior; dialogul dedesubt netrecut
    expect(e.top()).toBe('dialog.compile');
    expect(escapeThroughEngine(e, keyEvent())).toBe(true);
    expect(closed).toEqual(['table', 'compile']);
    expect(e.top()).toBe('editor.document.core');
    expect(escapeThroughEngine(e, keyEvent())).toBe(false); // doar nucleul → motorul declină
  });

  it('dispatch(„escape”) ajunge la comanda dropdownului și pop-uiește prin cleanup', () => {
    const e = engineWithCore();
    const closed = [];
    const close = registerDropdownSurface(e, 'dropdown.view', { close: () => { closed.push('view'); close(); } });
    expect(e.dispatch('escape')).toBe('dropdown.view');
    expect(closed).toEqual(['view']);
    expect(e.top()).toBe('editor.document.core');
    expect(e.dispatch('escape')).toBe(null); // fără suprafețe translucide → apelantul rămâne la default
  });
});

describe('componentă: dropdown-urile FormatBar deschise = suprafețe active pe motor', () => {
  it('Tabel: open → top = menu.dropdown.table; Escape (event, prin root) → pop + editorul rămâne dedesubt', async () => {
    const engine = engineWithCore();
    await mountBar(engine);
    const btn = trigger(t('ui.formatBar.menuTable'));
    expect(btn).toBeTruthy();
    await act(async () => btn.click());
    // Dropdown-urile FormatBar sunt componente Menu → convenția T2: suprafața `menu.<id>` (ADL §2/§10).
    expect(engine.top()).toBe('menu.dropdown.table');
    expect(engine.stack()).toEqual(['editor.document.core', 'menu.dropdown.table']);
    expect(el.querySelector('.menu-pop')).toBeTruthy();

    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => popItems()[0].dispatchEvent(ev));
    expect(ev.defaultPrevented).toBe(true); // motorul a consumat evenimentul (DialogA11y rămâne afară)
    expect(el.querySelector('.menu-pop')).toBeFalsy();
    expect(engine.top()).toBe('editor.document.core');
    expect(engine.registry()).not.toContain('menu.dropdown.table'); // fără scurgeri de înregistrare
  });

  it('dropdown deschis peste dialog: Escape închide doar dropdownul, dialogul dedesubt rămâne', async () => {
    const engine = engineWithCore();
    const closedDialogs = [];
    const closeDialog = registerDialogSurface(engine, 'dialog.compile', {
      close: () => { closedDialogs.push('compile'); return true; },
    });
    await mountBar(engine);
    const btn = trigger(t('ui.formatBar.menuTable'));
    await act(async () => btn.click());
    expect(engine.stack()).toEqual(['editor.document.core', 'dialog.compile', 'menu.dropdown.table']);

    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    // jsdom nu mută focusul la click (browserul real da): îl punem explicit pe item, ca la
    // navigarea cu tastatura — altfel close() nu poate restaura focusul pe butonul meniului.
    popItems()[0].focus();
    await act(async () => popItems()[0].dispatchEvent(ev));
    expect(closedDialogs).toEqual([]); // dialogul dedesubt NU s-a închis
    expect(engine.top()).toBe('dialog.compile');
    expect(engine.registry()).toContain('dialog.compile');

    // a doua apăsare ajunge la comanda dialogului (self-managed ca în aplicație — focusul
    // restaurat pe butonul meniului, înăuntrul root-ului, merge prin router spre motor)
    const ev2 = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => document.activeElement.dispatchEvent(ev2));
    expect(closedDialogs).toEqual(['compile']);
    closeDialog(); // ca cleanup-ul din app: starea s-a schimbat, stratul părăsește stiva
    expect(engine.top()).toBe('editor.document.core');
  });

  it('comandă locală: itemul din meniu rulează comanda editorului și pop-uiește suprafața', async () => {
    const engine = engineWithCore();
    await mountBar(engine);
    const btn = trigger(t('ui.formatBar.menuTable'));
    await act(async () => btn.click());
    const insertBtn = popItems().find((b) => !b.disabled && b.textContent.includes(t('ui.formatBar.tableInsert')));
    expect(insertBtn).toBeTruthy();
    await act(async () => insertBtn.click());
    expect(recorded).toContain('insertTable'); // comanda a ajuns la editor prin lanț
    expect(recorded).toContain('run');
    expect(el.querySelector('.menu-pop')).toBeFalsy(); // meniul s-a închis
    expect(engine.top()).toBe('editor.document.core'); // suprafața a părăsit stiva
    expect(engine.registry()).not.toContain('menu.dropdown.table');
  });

  it('select-ul nativ „block”: mousedown → dropdown.block pe stivă; close prin motor → înapoi în editor', async () => {
    const engine = engineWithCore();
    await mountBar(engine);
    const sel = el.querySelector('select.block-select');
    expect(sel).toBeTruthy();
    sel.focus();
    await act(async () => sel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
    expect(engine.top()).toBe('dropdown.block');
    let handled;
    await act(async () => { handled = engine.dispatch('close'); }); // comanda locală pe stratul câmpului
    expect(handled).toBe('dropdown.block');
    expect(recorded).toContain('focus-editor'); // focusul se întoarce în suprafața de scris
    await flush();
    expect(engine.top()).toBe('editor.document.core');
    sel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); // redeschis
    await flush();
    expect(engine.top()).toBe('dropdown.block');
    sel.focus(); // browserul real focus-ează la mousedown; jsdom nu — o facem explicit pentru blur
    await act(async () => sel.blur()); // pierderea câmpului: pop, fără comandă
    await flush();
    expect(engine.top()).toBe('editor.document.core');
  });

  it('pop-ul de culoare: open → dropdown.color; Escape prin motor → pop + focus pe trigger', async () => {
    const engine = engineWithCore();
    await mountBar(engine);
    const btn = trigger(t('ui.fb.color'));
    expect(btn).toBeTruthy();
    await act(async () => btn.click());
    expect(engine.top()).toBe('dropdown.color');
    let handled;
    await act(async () => { handled = engine.dispatch('escape'); });
    expect(handled).toBe('dropdown.color');
    await flush();
    expect(el.querySelector('.menu-pop')).toBeFalsy();
    expect(engine.top()).toBe('editor.document.core');
    expect(document.activeElement).toBe(btn); // focusul se întoarce pe trigger
  });

  it('fără motor: meniul se deschide și se închide ca înainte (comportament neatins)', async () => {
    await mountBar(null);
    const btn = trigger(t('ui.formatBar.menuTable'));
    await act(async () => btn.click());
    expect(el.querySelector('.menu-pop')).toBeTruthy();
    await act(async () => btn.click());
    expect(el.querySelector('.menu-pop')).toBeFalsy();
    expect(document.querySelectorAll('.menu-pop').length).toBe(0);
  });
});
