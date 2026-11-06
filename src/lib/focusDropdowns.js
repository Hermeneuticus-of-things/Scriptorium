// ADL §2 + §5 — bridge between the focus engine and dropdown surfaces
// (docs/IONUT_APPLICATION_DESIGN_LANGUAGE: an open dropdown is the active surface — focus
// follows the object's level — so open pushes `dropdown.<fieldId>` on the stack, every close
// path pops it, and the engine's Escape cascade closes the innermost layer first: a dropdown
// under a dialog closes alone, the dialog underneath stays untouched). Pure module: the app
// supplies the close/focus actions, so everything stays testable.

/** Surface id for a dropdown field: `dropdown.<fieldId>` (e.g. dropdown.table, dropdown.font). */
export const dropdownSurfaceId = (fieldId) => `dropdown.${fieldId}`;

/**
 * A stable dropdown field (native `<select>` inputs whose popup state lives outside the DOM):
 * register once, then `open()` on the popup's open intent (mousedown / Enter), `shut()` when
 * the field loses the popup (blur, pick). The close command is reachable through
 * engine.dispatch('close' | 'escape') while the field sits on the stack.
 */
export function registerDropdownField(engine, id, { close, commands = {} } = {}) {
  const closeAction = () => (close ? close() : false);
  const unregister = engine.registerFocusableSurface({
    id,
    modal: false,
    commands: { close: closeAction, escape: closeAction, ...commands },
  });
  const open = () => {
    if (!engine.stack().includes(id)) engine.push(id); // already open: one surface, not two
  };
  const shut = () => {
    engine.pop(id);
  };
  return { open, shut, unregister };
}

/**
 * A component dropdown (menu / popover with React-owned open state): open = register + push,
 * close (any path: item chosen, outside click, engine Escape) = pop + unregister through the
 * returned cleanup. The effect that owns the dropdown's open state calls this when it opens
 * and the cleanup when it closes, so the engine stack can never drift from the rendered UI.
 */
export function registerDropdownSurface(engine, id, opts = {}) {
  const field = registerDropdownField(engine, id, opts);
  field.open();
  return () => {
    field.shut();
    field.unregister();
  };
}
