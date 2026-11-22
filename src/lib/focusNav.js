// Navigarea din tastatură între panouri (T1 din docs/audit/scrivener3/implementation_plan.md,
// Anexa A — Navigate ▸ Move Focus To: 31 goluri). Pur: starea panourilor e dată de aplicație,
// modulul alege doar ținta și ordinea. F6/Shift+F6 ciclare; Ctrl+Shift+1..4 ținte directe.

// Ordinea ciclului = ordinea vizuală stânga→dreapta: binder → editor (→ split) → inspector → AI.
export const FOCUS_TARGETS = [
  { id: 'binder', combo: 'Ctrl+Shift+2' },
  { id: 'editor', combo: 'Ctrl+Shift+1' },
  { id: 'split', combo: null },
  { id: 'inspector', combo: 'Ctrl+Shift+3' },
  { id: 'ai', combo: 'Ctrl+Shift+4' },
];

// Țintele vizibile pentru starea dată: {hideBinder, splitOpen, showInspector, showAi}.
export function visibleTargets(state = {}) {
  return FOCUS_TARGETS.filter((t) => {
    if (t.id === 'binder') return !state.hideBinder;
    if (t.id === 'split') return Boolean(state.splitOpen);
    if (t.id === 'inspector') return Boolean(state.showInspector);
    if (t.id === 'ai') return Boolean(state.showAi);
    return true; // editorul e mereu prezent
  }).map((t) => t.id);
}

// Următoarea țintă în ciclu (dir: 1 înainte, -1 înapoi); dacă ținta curentă nu mai e vizibilă,
// ciclul pornește de la început. O singură țintă vizibilă → rămâne pe ea.
export function nextTarget(current, state = {}, dir = 1) {
  const vis = visibleTargets(state);
  if (!vis.length) return 'editor';
  const i = vis.indexOf(current);
  if (i === -1) return dir >= 0 ? vis[0] : vis[vis.length - 1];
  return vis[(i + (dir >= 0 ? 1 : vis.length - 1)) % vis.length];
}

// Focus real pe containerul țintei (data-focus-pane, tabIndex -1); deschide panoul dacă e închis
// prin callbackul `open` al țintei. Editorul primește focusul editorului TipTap, nu doar containerul.
export function applyFocus(target, { root = document, focusEditor, open = () => {} } = {}) {
  open(target);
  if (target === 'editor' && focusEditor) {
    focusEditor();
    return true;
  }
  const el = root.querySelector(`[data-focus-pane="${target}"]`);
  if (el) {
    el.focus({ preventScroll: false });
    return true;
  }
  return false;
}
