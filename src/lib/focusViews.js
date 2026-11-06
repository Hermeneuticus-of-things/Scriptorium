// ADL §2 — bridge between the focus engine and the main-window view surfaces (T7).
// (docs/IONUT_APPLICATION_DESIGN_LANGUAGE.md: focus follows the active window and the object's
// level; Corkboard, Outliner and Scrivenings are surfaces of the same rank, and a selection is
// NOT the same thing as focus — it stays visible in the inactive colour while another surface
// owns the focus, and it is never cleared on blur.)
// Pure module: the app supplies the row-delete action, so everything stays testable.

/** The three main views as engine surface ids (Ctrl+1 / Ctrl+2 / Ctrl+3, Scrivener-like). */
export const VIEW_SURFACES = {
  scrivenings: 'view.scrivenings',
  corkboard: 'view.corkboard',
  outliner: 'view.outliner',
};

/** App view state ('editor' | 'corkboard' | 'outline') → engine surface id. */
export function surfaceForView(view) {
  if (view === 'corkboard') return VIEW_SURFACES.corkboard;
  if (view === 'outline') return VIEW_SURFACES.outliner;
  return VIEW_SURFACES.scrivenings; // 'editor' and the whole-book views sit in the core pane
}

/** View surfaces that own rows with a trash-able selection (the editor pane does not). */
const ROW_OWNERS = [VIEW_SURFACES.corkboard, VIEW_SURFACES.outliner];

/**
 * Registers the three view surfaces once. `onDeleteRow` is the row-level delete action (the same
 * move-to-trash the binder's Delete performs); it is exposed as the surfaces' `delete` command so
 * any engine-mediated caller can reach it — and `dispatchRowDelete` below is the only door.
 */
export function registerViewSurfaces(engine, { onDeleteRow } = {}) {
  const unregisterFns = [
    engine.registerFocusableSurface({ id: VIEW_SURFACES.scrivenings, commands: {} }),
    engine.registerFocusableSurface({ id: VIEW_SURFACES.corkboard, commands: onDeleteRow ? { delete: onDeleteRow } : {} }),
    engine.registerFocusableSurface({ id: VIEW_SURFACES.outliner, commands: onDeleteRow ? { delete: onDeleteRow } : {} }),
  ];
  return () => unregisterFns.forEach((un) => un());
}

/**
 * Hands the active surface to the view the user just switched to (Ctrl+1/2/3). Exactly ONE view
 * surface is ever on the stack — the visible one — so a row command can never bubble outward to
 * a hidden board (ADL §2 "Don't": route Delete to a selected row while the user types in the
 * editor). The old view surface is popped and the new one pushed; a transient pushed over the
 * view (dialog, quick-ref) is never lifted or dropped — the caller re-syncs when it closes.
 * Returns the active surface id, or null when the switch was refused (a transient owns the top).
 */
export function syncViewSurface(engine, nextId) {
  const st = engine.stack();
  if (st[st.length - 1] === nextId) return nextId; // already active
  const i = st.findIndex((id) => String(id).startsWith('view.'));
  if (i < 0) {
    if (st.length > 1) return null; // a transient pushed straight over the core: don't jump over it
    return engine.push(nextId); // first view surface, right above the core function
  }
  if (i !== st.length - 1) return null; // a transient sits above the old view: keep it in charge
  engine.pop(st[i]); // the old view closes with its DOM; the core is restored, then covered again
  return engine.push(nextId);
}

/**
 * The row-level Delete door (ADL §2 "Don't: route Delete to a selected row while user types in
 * the editor"). The command reaches the selected rows only while a row-owning view surface IS
 * the active surface — the user is working on the board/outliner. While the user types in the
 * editor (`view.scrivenings` active), works in the inspector or a dialog/quick-ref owns the
 * focus, this returns null and the key belongs to the text; the selection itself is untouched
 * (it is never cleared on blur). Returns the surface that handled it, or null.
 */
export function dispatchRowDelete(engine, args) {
  if (!ROW_OWNERS.includes(engine.top())) return null;
  const handled = engine.dispatch('delete', args);
  return ROW_OWNERS.includes(handled) ? handled : null;
}
