// ADL §2 — bridge between the focus engine and the dialog system
// (docs/IONUT_APPLICATION_DESIGN_LANGUAGE: focus follows the active window and the object's
// level; intermediate surfaces — dialogs, inspectors, popovers — get real focus while active,
// then the core function gets it back). Pure module: the app supplies the document for the
// "click the topmost modal's backdrop" close action, so everything stays testable.

/** Surface id for a dialog opened through the app's `dialog` state: `dialog.<key>`. */
export const dialogSurfaceId = (key) => `dialog.${key}`;

/**
 * Registers a transient layer (modal dialog, popover) on the engine, pushes it above whatever
 * is active and returns the cleanup (pop + unregister). `close` is the layer's local close
 * action, reachable through engine.dispatch('close' | 'escape') — the innermost surface that
 * has the command handles it, then dispatch bubbles outward. If `close` finds nothing to close
 * (a gated dialog whose modal never mounted), `fallback` runs so the React state never desyncs
 * from the engine stack.
 */
export function registerDialogSurface(engine, id, { close, fallback, modal = true } = {}) {
  const closeAction = () => {
    if (close && close()) return true;
    if (fallback) {
      fallback();
      return true;
    }
    return false;
  };
  const unregister = engine.registerFocusableSurface({
    id,
    modal,
    commands: { close: closeAction, escape: closeAction },
  });
  engine.push(id);
  return () => {
    engine.pop(id);
    unregister();
  };
}

/**
 * The close action every modal layer shares: it clicks the backdrop of the topmost connected
 * modal — exactly what Esc did before the engine existed — so each dialog keeps its own onClose
 * (async refreshes, tab resets, state cleanups). `doc` is injectable for tests (vitest runs in
 * the node environment). Returns true when a modal was found and clicked.
 */
export function closeTopModal(doc = document) {
  const modals = [...doc.querySelectorAll('.modal-backdrop > .modal, .help-backdrop > .help-window')].filter(
    (m) => m.isConnected,
  );
  const backdrop = modals[modals.length - 1]?.parentElement;
  if (!backdrop) return false;
  if (typeof MouseEvent === 'function') {
    try {
      backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    } catch {
      /* hosts without a DOM event implementation: the click below is enough */
    }
  }
  backdrop.click();
  return true;
}

/**
 * The document-level Escape decision, engine-first (ADL §2): the engine routes 'escape' to the
 * innermost surface that has the command — one layer per press — and the event is consumed so
 * the old document-level handler (DialogA11y) does not close a second layer behind the engine's
 * back. When no surface handles it (only the core function on the stack) the engine declines
 * and the existing behavior stands untouched. The `defaultPrevented` / `cancelBubble` guards
 * keep self-managing Escapes working: fields that close themselves (shortcut capture, inline
 * rename, context menu) mark the event before it reaches this decision.
 */
export function escapeThroughEngine(engine, e) {
  if (e.key !== 'Escape' || e.defaultPrevented || e.cancelBubble) return false;
  const handled = engine.dispatch('escape');
  if (!handled) return false; // engine declines → existing behavior (DialogA11y, app default)
  e.preventDefault();
  e.stopPropagation();
  return true;
}
