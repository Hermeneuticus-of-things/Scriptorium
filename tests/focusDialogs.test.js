// ADL §2: focus engine × dialog system (src/lib/focusDialogs.js) — push/pop for representative
// dialogs, Escape cascade (sub-dialog first, then the dialog, then the core function), local
// close commands through engine.dispatch, the topmost-modal close action, engine-first Escape
// decision with guards for self-managing fields. (Ionuț Application Design Language.)
import { describe, it, expect } from 'vitest';
import { createFocusEngine } from '../src/lib/focusEngine.js';
import { dialogSurfaceId, registerDialogSurface, closeTopModal, escapeThroughEngine } from '../src/lib/focusDialogs.js';

// A core-function base like the app pushes at mount (the engine's Escape contract: with only
// the core surface on the stack, Escape is a no-op). Registration overrides replace the
// defaults — the engine's registration is idempotent, so the first one is the one that counts.
function engineWithCore(core = {}) {
  const e = createFocusEngine();
  e.registerFocusableSurface({ id: 'editor.document.core', capture: () => ({ caret: 7 }), restore: () => {}, ...core });
  e.push('editor.document.core');
  return e;
}

// Plain-object events (vitest runs in the node environment): the flags escapeThroughEngine reads.
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

describe('push/pop: 5 dialoguri reprezentative peste funcția de bază', () => {
  const rep = ['settings', 'compile', 'export', 'find', 'goto'];

  it('fiecare dialog se deschide ca suprafață dialog.<id> și se închide la cleanup', () => {
    for (const key of rep) {
      const e = engineWithCore();
      const close = registerDialogSurface(e, dialogSurfaceId(key), { close: () => true });
      expect(e.top()).toBe(`dialog.${key}`);
      expect(e.stack()).toEqual(['editor.document.core', `dialog.${key}`]);
      close();
      expect(e.top()).toBe('editor.document.core');
      expect(e.registry()).toEqual(['editor.document.core']); // no registration leaks
    }
  });

  it('stivă cu toate 5: ordinea push = ordinea deschiderii; pop în cascadă de sus în jos', () => {
    const e = engineWithCore();
    const cleanups = rep.map((key) => registerDialogSurface(e, dialogSurfaceId(key), { close: () => true }));
    expect(e.stack()).toEqual(['editor.document.core', ...rep.map((k) => `dialog.${k}`)]);
    for (let i = rep.length - 1; i >= 0; i--) {
      cleanups[i]();
      expect(e.top()).toBe(i === 0 ? 'editor.document.core' : `dialog.${rep[i - 1]}`);
    }
  });

  it('starea apelantului se captează la push și se restabilește la pop (exact)', () => {
    const restored = [];
    const e = engineWithCore({ capture: () => ({ caret: 42, scroll: 3 }), restore: (s) => restored.push(s) });
    const close = registerDialogSurface(e, dialogSurfaceId('settings'), { close: () => true });
    close();
    expect(restored).toEqual([{ caret: 42, scroll: 3 }]);
    expect(e.top()).toBe('editor.document.core');
  });

  it('înlocuirea settings → projectSettings: cleanup-ul celui vechi lasă stiva coerentă', () => {
    const e = engineWithCore();
    const closeSettings = registerDialogSurface(e, dialogSurfaceId('settings'), { close: () => true });
    expect(e.top()).toBe('dialog.settings');
    closeSettings(); // dialog state switched: settings unmounts (pop + unregister)…
    const closeProject = registerDialogSurface(e, dialogSurfaceId('projectSettings'), { close: () => true });
    expect(e.stack()).toEqual(['editor.document.core', 'dialog.projectSettings']);
    expect(e.registry()).toEqual(['editor.document.core', 'dialog.projectSettings']); // no stale ids
    closeProject();
    expect(e.stack()).toEqual(['editor.document.core']);
  });
});

describe('Escape cascade: sub-dialog → dialog → nimic (o strat per apăsare)', () => {
  it('compile + „Editare format”: prima apăsare închide doar sub-dialogul', () => {
    const e = engineWithCore();
    const closed = [];
    // In the app the close action flips React state and the effect cleanup pops the surface;
    // the test mirrors that: the close runs, then the cleanup takes the layer off the stack.
    const closeCompile = registerDialogSurface(e, dialogSurfaceId('compile'), {
      close: () => { closed.push('compile'); closeCompile(); },
    });
    const closeEditing = registerDialogSurface(e, 'dialog.compile.editing', {
      close: () => { closed.push('editing'); closeEditing(); },
    });
    expect(e.top()).toBe('dialog.compile.editing');

    const ev1 = keyEvent();
    expect(escapeThroughEngine(e, ev1)).toBe(true);
    expect(closed).toEqual(['editing']); // engine decided: innermost first
    expect(ev1.prevented).toBe(1); // consumed: the old document handler stays out
    expect(ev1.stopped).toBe(1);

    const ev2 = keyEvent();
    expect(escapeThroughEngine(e, ev2)).toBe(true);
    expect(closed).toEqual(['editing', 'compile']);

    const ev3 = keyEvent();
    expect(escapeThroughEngine(e, ev3)).toBe(false); // only the core left: engine declines
    expect(ev3.prevented).toBe(0); // old behavior stands untouched
    expect(closed).toEqual(['editing', 'compile']);
    expect(e.top()).toBe('editor.document.core');
  });

  it('settings + popover de serviciu deasupra: popoverul întâi, apoi dialogul', () => {
    const e = engineWithCore();
    const closed = [];
    const closeSettings = registerDialogSurface(e, dialogSurfaceId('settings'), {
      close: () => { closed.push('settings'); closeSettings(); },
    });
    const closeService = registerDialogSurface(e, 'popover.service', {
      close: () => { closed.push('service'); closeService(); },
    });
    expect(escapeThroughEngine(e, keyEvent())).toBe(true);
    expect(closed).toEqual(['service']);
    expect(escapeThroughEngine(e, keyEvent())).toBe(true);
    expect(closed).toEqual(['service', 'settings']);
    expect(e.top()).toBe('editor.document.core');
  });
});

describe('comenzi locale prin engine.dispatch: close pe stratul cel mai interior', () => {
  it('dispatch(„close”) atinge doar stratul de deasupra și returnează id-ul lui', () => {
    const e = engineWithCore();
    const closed = [];
    registerDialogSurface(e, dialogSurfaceId('compile'), { close: () => closed.push('compile') });
    registerDialogSurface(e, 'dialog.compile.editing', { close: () => closed.push('editing') });
    expect(e.dispatch('close')).toBe('dialog.compile.editing');
    expect(closed).toEqual(['editing']);
    // after the sub-dialog closed (cleanup), the command lands on the compile layer
    e.pop('dialog.compile.editing');
    expect(e.dispatch('close')).toBe('dialog.compile');
    expect(closed).toEqual(['editing', 'compile']);
  });

  it('fără nicio suprafață transientă → dispatch returnează null (apelantul rămâne la default)', () => {
    const e = engineWithCore();
    expect(e.dispatch('close')).toBe(null);
    expect(e.dispatch('escape')).toBe(null);
  });

  it('fallback-ul intră doar când close nu găsește nimic (dialog conditionat, fără modal montat)', () => {
    const e = engineWithCore();
    const fallbackHits = [];
    registerDialogSurface(e, dialogSurfaceId('mcp'), {
      close: () => false, // no topmost modal found
      fallback: () => fallbackHits.push('setDialog'),
    });
    expect(e.dispatch('close')).toBe('dialog.mcp');
    expect(fallbackHits).toEqual(['setDialog']);
  });
});

describe('closeTopModal: se apasă doar backdropul modalului cel mai de sus', () => {
  function fakeDoc(pairs) {
    // pairs: [{ connected, clicks }] — a modal whose parent is its backdrop
    const modals = pairs.map((p) => {
      const backdrop = { clicks: 0, click() { this.clicks += 1; }, dispatchEvent: () => {} };
      const modal = { isConnected: p.connected, parentElement: backdrop };
      return { backdrop, modal };
    });
    return {
      modals,
      querySelectorAll: () => modals.map((m) => m.modal),
    };
  }

  it('clic pe backdropul de sus; modalele detașate sunt ignorate', () => {
    const doc = fakeDoc([{ connected: true }, { connected: false }, { connected: true }]);
    expect(closeTopModal(doc)).toBe(true);
    expect(doc.modals[2].backdrop.clicks).toBe(1); // topmost connected
    expect(doc.modals[0].backdrop.clicks).toBe(0);
  });

  it('fără niciun modal → false (fallback-ul apelantului preia)', () => {
    expect(closeTopModal(fakeDoc([{ connected: false }]))).toBe(false);
    expect(closeTopModal(fakeDoc([]))).toBe(false);
  });
});

describe('decizia Escape: motorul răspunde înainte de comportamentul vechi, cu paze', () => {
  it('tastele care nu sunt Escape trec neatinse', () => {
    const e = engineWithCore();
    registerDialogSurface(e, dialogSurfaceId('find'), { close: () => true });
    expect(escapeThroughEngine(e, keyEvent({ key: 'Enter' }))).toBe(false);
  });

  it('câmpurile care se ocupă singure de Esc (preventDefault) nu declanșează motorul', () => {
    const e = engineWithCore();
    const closed = [];
    registerDialogSurface(e, dialogSurfaceId('shortcuts'), { close: () => closed.push('shortcuts') });
    // shortcut-capture input: preventDefault + stopPropagation before the engine sees it
    expect(escapeThroughEngine(e, keyEvent({ defaultPrevented: true }))).toBe(false);
    expect(closed).toEqual([]);
  });

  it('câmpurile care doar opresc propagarea (redenumire inline) nu declanșează motorul', () => {
    const e = engineWithCore();
    const closed = [];
    registerDialogSurface(e, dialogSurfaceId('keywords'), { close: () => closed.push('keywords') });
    expect(escapeThroughEngine(e, keyEvent({ cancelBubble: true }))).toBe(false);
    expect(closed).toEqual([]);
  });

  it('funcția de bază singură pe stivă → engine declină (Escape rămâne no-op în editor)', () => {
    const e = engineWithCore();
    const ev = keyEvent();
    expect(escapeThroughEngine(e, ev)).toBe(false);
    expect(ev.prevented).toBe(0);
  });
});
