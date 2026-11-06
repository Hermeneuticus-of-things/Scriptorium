// ADL §2 — focus engine (docs/IONUT_APPLICATION_DESIGN_LANGUAGE): focus as engine logic.
// One stack per window; the top entry is the single source of truth for input routing, command
// dispatch and visual emphasis. Pure module: the app supplies capture/restore + native focus
// per surface registration, so everything stays testable.

const TRANSIENT_ORDER = ['dropdown', 'menu', 'popover', 'dialog', 'surface']; // innermost Escape order

function kindOf(id) {
  return String(id || '').split('.')[0];
}

function transientRank(id) {
  const k = kindOf(id);
  const i = TRANSIENT_ORDER.indexOf(k);
  return i === -1 ? TRANSIENT_ORDER.length : i;
}

export function createFocusEngine({ windowId = 'window.main', syncNativeFocus = true } = {}) {
  const registry = new Map(); // id -> SurfaceRegistration
  const stacks = new Map(); // windowId -> FocusEntry[]
  if (!stacks.has(windowId)) stacks.set(windowId, []);
  const listeners = new Set(); // UI subscriptions (the active surface drives focus ≠ selection)

  const stack = () => stacks.get(windowId);
  const top = () => stack()[stack().length - 1] || null;
  const entryOf = (id) => stack().find((e) => e.surfaceId === id) || null;
  const reg = (id) => registry.get(id);
  // One signal after any stack change; a broken listener never breaks the engine itself.
  const notify = () => { for (const l of [...listeners]) { try { l(); } catch { /* keep going */ } } };
  const subscribe = (l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };

  function nativeFocus(id) {
    if (!syncNativeFocus) return;
    const r = reg(id);
    try {
      r?.focus?.();
    } catch {
      /* a surface without a native focus target stays logical-only */
    }
  }

  function registerFocusableSurface(registration) {
    if (!registration?.id) throw new Error('Surface registration needs an id.');
    if (registry.has(registration.id)) return () => unregister(registration.id); // idempotent
    registry.set(registration.id, {
      level: registration.level || kindOf(registration.id),
      modal: Boolean(registration.modal),
      commands: registration.commands || {},
      capture: registration.capture || (() => null),
      restore: registration.restore || (() => {}),
      focus: registration.focus || null,
      initialFocus: registration.initialFocus || null,
    });
    return () => unregister(registration.id);
  }

  function unregister(id) {
    registry.delete(id);
    const st = stack();
    const i = st.findIndex((e) => e.surfaceId === id);
    if (i >= 0) st.splice(i);
    notify();
  }

  /** A surface dies (document closed, dialog unmounted): pop it and its children, restore parent. */
  function onSurfaceDestroyed(id) {
    const st = stack();
    const i = st.findIndex((e) => e.surfaceId === id);
    if (i < 0) return null;
    const [gone] = st.splice(i);
    for (let j = st.length - 1; j >= i; j--) st.splice(j, 1); // children above it
    const t = top();
    if (t) nativeFocus(t.surfaceId);
    notify();
    return gone ? gone.surfaceId : null;
  }

  /** Open: capture where the caller was (caret/scroll/selection), push, activate. */
  function push(id, triggerId = null) {
    const r = reg(id);
    if (!r) throw new Error(`Suprafață neînregistrată: ${id}`);
    const st = stack();
    const prev = top();
    if (prev) prev.saved = { ...(prev.saved || {}), ...(r.capture ? {} : {}) }; // caller captures itself via its own registration
    if (prev) {
      const pr = reg(prev.surfaceId);
      if (pr) prev.saved = { ...prev.saved, ...pr.capture(prev) };
    }
    st.push({ surfaceId: id, level: r.level, triggerId, saved: {} });
    if (r.initialFocus) r.initialFocus();
    nativeFocus(id);
    notify();
    return id;
  }

  /** Close `id` (and anything above it): restore the trigger's surface and its saved state. */
  function pop(id) {
    const st = stack();
    const i = st.map((e) => e.surfaceId).lastIndexOf(id);
    if (i < 0) return null;
    for (let j = st.length - 1; j >= i; j--) st.splice(j, 1);
    const t = top();
    if (t) {
      const tr = reg(t.surfaceId);
      const saved = t.saved || {}; // captured when the closed surface was pushed over this one
      t.saved = {};
      if (tr) tr.restore(saved);
      nativeFocus(t.surfaceId);
      notify();
      return t.surfaceId;
    }
    return null;
  }

  /** Switch between already-open sibling surfaces (F6 / click), no push. */
  function switchFocus(id) {
    const st = stack();
    const i = st.findIndex((e) => e.surfaceId === id);
    if (i < 0) return push(id);
    if (i === st.length - 1) return id; // already top — no change, no notification
    const [e] = st.splice(i, 1);
    st.push(e);
    nativeFocus(id);
    notify();
    return id;
  }

  /** Command dispatch: active surface first, then bubble outward. Returns the surface that handled it. */
  function dispatch(cmd, args) {
    const st = stack();
    for (let i = st.length - 1; i >= 0; i--) {
      const sid = st[i].surfaceId; // captured before fn runs: a close command may pop its own surface
      const r = reg(sid);
      const fn = r && r.commands[cmd];
      if (fn) {
        fn(args);
        return sid;
      }
    }
    return null; // unhandled → the caller may apply a window/app-level default
  }

  /** Escape: close the innermost transient first, one per press; no-op in the core function. */
  function escape() {
    const st = stack();
    if (st.length <= 1) return null; // only the core surface left: Escape is a no-op at window level
    // Innermost transient first: the last surface pushed. One per press. Returns what it closed.
    const closed = st[st.length - 1].surfaceId;
    pop(closed);
    return closed;
  }

  return {
    windowId,
    subscribe, // (listener) => unsubscribe — fired once after every stack change
    registerFocusableSurface,
    unregister,
    onSurfaceDestroyed,
    push,
    pop,
    switchFocus,
    dispatch,
    escape,
    top: () => (top() ? top().surfaceId : null),
    stack: () => stack().map((e) => e.surfaceId),
    registry: () => [...registry.keys()],
    _stackRaw: stack,
  };
}

export default createFocusEngine;
