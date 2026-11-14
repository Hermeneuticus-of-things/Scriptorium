// ADL §2 + §10 — bridge between the focus engine and the in-app menus
// (docs/IONUT_APPLICATION_DESIGN_LANGUAGE: while you work in a menu, the menu is the active
// surface — `menu.<id>` is pushed above whatever was active and popped on every close path, so
// Escape reaches the menu first and whatever sits underneath stays open; a command chosen from
// a menu is dispatched active-surface-first before it falls back to the item's own action).
// Pure module: Menu.jsx supplies the close action (React state), tests supply the engine.

/** Surface id for an open in-app menu: `menu.<id>`. */
export const menuSurfaceId = (id) => `menu.${id}`;

// The app's one engine per window (App.jsx registers it at mount). Menus deep in the tree
// (FormatBar) reach it without prop threading; an explicit engine prop still wins (tests,
// future multi-window hosts).
let defaultEngine = null;
export function setDefaultFocusEngine(engine) {
  defaultEngine = engine || null;
}
export function activeFocusEngine() {
  return defaultEngine;
}

/**
 * Registers a transient menu layer on the engine, pushes it above whatever is active and returns
 * the cleanup (pop + unregister). `close` is the menu's local close action (flips React state;
 * the layer leaves the stack through the caller's cleanup when the state settles). The engine
 * routes 'escape' to the innermost surface that has the command — one press closes the menu
 * alone; a dialog underneath closes on the next press. TRANSIENT_ORDER in the engine puts
 * 'menu' inside 'popover'/'dialog', so the cascade order is menu first.
 */
export function registerMenuSurface(engine, id, { close } = {}) {
  const closeAction = () => {
    if (close && close()) return true;
    return false;
  };
  const unregister = engine.registerFocusableSurface({
    id: menuSurfaceId(id),
    modal: false,
    commands: { close: closeAction, escape: closeAction },
  });
  engine.push(menuSurfaceId(id));
  return () => {
    engine.pop(menuSurfaceId(id));
    unregister();
  };
}

/**
 * Runs a menu item through the engine (ADL §2 + §10): dispatch walks the stack from the active
 * surface outward, so a transient layer that owns the command handles it before the core
 * function does; the item's own action runs only when no surface on the stack handles the id
 * (items without an id, or commands that exist only as the item's action). Returns the surface
 * that handled the command, or null when the fallback action ran.
 */
export function runMenuItem(engine, item) {
  if (!item || item.hidden || item.disabled) return null;
  if (engine && item?.id) {
    const via = engine.dispatch(item.commandId || item.id, item.payload);
    if (via) return via;
  }
  if (engine?.mayBubble && !engine.mayBubble(item.commandId || item.id)) return null;
  if (item && typeof item.action === 'function') item.action();
  return null;
}

/**
 * ADL T6 — comanda din meniul NATIV (IPC `menu:command`: electron/main.cjs → preload
 * (`onMenuCommand`) → receptorul din App.jsx): exact modelul runMenuItem — dispatch ÎNTÂI prin
 * motorul de focus, cu bubbling din suprafața translucidă activă spre exterior (un dialog
 * self-managed poate consuma comanda înaintea nucleului); abia când niciun strat nu o consumă
 * (dispatch → null) cade în fallback-ul istoric din App.jsx (commandList → menuActions).
 * Comenzi fără id sau fără motor (comanda a sosit înainte de montarea/înregistrarea motorului)
 * → fallback direct, comportament identic cu cel de dinainte. Returnează suprafața care a
 * consumat comanda, sau null când a rulat fallback-ul.
 */
export function runNativeMenuItem(engine, id, fallback) {
  if (engine && id) {
    const via = engine.dispatch(id);
    if (via) return via;
  }
  if (engine?.mayBubble && !engine.mayBubble(id)) return null;
  if (typeof fallback === 'function') fallback();
  return null;
}

// ADL §2 "menus list the active surface's commands first" — ordering decision (campaign
// adl-campaign item 2, T2): the in-app menu bar keeps its fixed APPLICATION/PROJECT/WORKFLOW
// order (src/lib/menuLayout.js). Dynamic reordering of Fișier/Format entries per active surface
// was evaluated and declined, because:
//   1. The menu bar is reachable only while the core surface is active — every dialog opens a
//      modal backdrop over it, so in-app menus always open over the editor: "the active
//      surface's commands" are already the entries these menus lead with.
//   2. The tier layout is a tested invariant (menuTiers: tiers never mixed, every command in a
//      known menu) shared with the native desktop menu through nativeMenuSpec — the Electron
//      app menu cannot reorder per surface, so in-app reordering would diverge the two bars.
//   3. Rebuilding the layout per focus change would make the menu bar jump while the user
//      works — the opposite of the quiet, stable layout §10 asks for.
// What ships instead of reordering: dispatch (runMenuItem above — the active surface's commands
// answer before anything else) and registration (registerMenuSurface — the menu itself becomes
// the active surface while open, per §10).
