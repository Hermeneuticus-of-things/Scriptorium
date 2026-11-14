// ADL §2 + §10 — bridge between the focus engine and the media viewer (T8): MediaView — the
// pane surface that shows a research file (image, PDF, audio, video, web copy) in the editor
// pane or in the split pane — is an active surface in its own right, ranked with the core
// editor, not a modal (docs/IONUT_APPLICATION_DESIGN_LANGUAGE.md §2: focus follows the active
// window and the object's level). Pure module: the app supplies the close action and the focus
// target, so everything stays testable.
//
// Surface id: `image.viewer.<assetId>`, where <assetId> is the STABLE id of the resource —
// `media.file`, the project-generated file stored under media/ (store id + extension). Chosen
// over `media.name` (user-facing, renameable, can duplicate) and over the binder node id (the
// item, not the asset — the same file can be referenced by more than one item). The same asset
// can be open in BOTH panes at once („deschide alături" keeps it in the main pane too), so the
// split instance gets the `:split` suffix — same scheme as the T4 split editor
// (`editor.document.<id>:split`).

/** Surface id of the media viewer showing asset `assetId` (media.file): `image.viewer.<assetId>`. */
export const imageViewSurfaceId = (assetId, { split = false } = {}) =>
  `image.viewer.${assetId}${split ? ':split' : ''}`;

/**
 * Registers one media-viewer surface (modal: false — the viewer never blocks the rest of the
 * window), pushes it above whatever was active and returns the cleanup (pop + unregister —
 * zero registration leaks on every close path: the split pane's close button, a close command,
 * Escape through the engine, the document closing, unmount). `close` is the viewer's local
 * close action (only the split instance has one — the main pane closes a media document by
 * navigating away); it is reachable through engine.dispatch('close' | 'escape') and absent
 * entirely when not provided, so Escape falls through exactly as before. `zoomIn`/`zoomOut`
 * are the viewer's local zoom commands (the image viewer's steps), exposed only when the kind
 * of media has zoom. `focus` is the real focus target (the viewer's root), called by the
 * engine whenever the surface becomes active (push, switchFocus), like a menu's focusItem.
 */
export function registerImageViewerSurface(engine, assetId, opts = {}) {
  const { close, focus, zoomIn, zoomOut, split } = opts;
  const commands = {};
  if (close) {
    const closeAction = () => {
      close();
      return true;
    };
    commands.close = closeAction;
    commands.escape = closeAction;
  }
  if (zoomIn) commands.zoomIn = () => { zoomIn(); return true; };
  if (zoomOut) commands.zoomOut = () => { zoomOut(); return true; };
  const id = imageViewSurfaceId(assetId, { split: Boolean(split) });
  const unregister = engine.registerFocusableSurface({
    id,
    modal: false,
    commands,
    focus: focus || null,
  });
  engine.push(id);
  return () => {
    engine.pop(id);
    unregister();
  };
}
