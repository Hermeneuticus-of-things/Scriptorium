// ADL §2 + §10 — bridge between the focus engine and the editor's secondary panes (T4):
// the split editor pane (`editor.document.<id>:split`) and the floating Quick Reference panels
// (`quickref.<id>`). (docs/IONUT_APPLICATION_DESIGN_LANGUAGE.md §2: focus follows the active
// window and the object's level — a second pane or a reference panel the user works in is an
// active surface in its own right, ranked with the core editor, not a modal; Escape through the
// engine closes the innermost pane first, one press per layer.) Pure module: the app supplies
// the close action and the focus target, so everything stays testable.

/** Surface id of the split editor pane showing document `id`: `editor.document.<id>:split`. */
export const splitSurfaceId = (id) => `editor.document.${id}:split`;

/** Surface id of a Quick Reference panel open for document `id`: `quickref.<id>`. */
export const quickRefSurfaceId = (id) => `quickref.${id}`;

/**
 * Registers one pane surface (modal: false — a pane never blocks the rest of the window), pushes
 * it above whatever was active and returns the cleanup (pop + unregister — zero registration
 * leaks on every close path: button, command, Escape through the engine, unmount). `close` is the
 * pane's local close action (App state for the split, the panel's onClose for Quick Reference),
 * reachable through engine.dispatch('close' | 'escape') — the innermost surface that has the
 * command handles it, one layer per press. `focus` is the real focus target (the pane's editor),
 * called by the engine whenever the surface becomes active (push, switchFocus), like a menu's
 * focusItem.
 */
function registerPaneSurface(engine, id, { close, focus } = {}) {
  const closeAction = () => {
    if (!close) return false;
    close();
    return true;
  };
  const unregister = engine.registerFocusableSurface({
    id,
    modal: false,
    commands: { close: closeAction, escape: closeAction },
    focus: focus || null,
  });
  engine.push(id);
  return () => {
    engine.pop(id);
    unregister();
  };
}

/** The split editor pane for document `docId` (App opens/closes it through `splitId`). */
export function registerSplitSurface(engine, docId, opts = {}) {
  return registerPaneSurface(engine, splitSurfaceId(docId), opts);
}

/** One Quick Reference panel for document `docId` (one panel per document — App dedupes). */
export function registerQuickRefSurface(engine, docId, opts = {}) {
  return registerPaneSurface(engine, quickRefSurfaceId(docId), opts);
}
