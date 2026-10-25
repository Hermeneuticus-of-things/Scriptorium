// Editor panes (main + split): navigation history per pane, lock in place, binder routing, zoom.

export const HISTORY_MAX = 100;

/** Adds id after the current position (forward entries are dropped); same id twice = no change. */
export function pushHistory(h, id) {
  const cur = h && Array.isArray(h.stack) ? h : { stack: [], index: -1 };
  if (!id || cur.stack[cur.index] === id) return cur;
  const stack = [...cur.stack.slice(0, cur.index + 1), id].slice(-HISTORY_MAX);
  return { stack, index: stack.length - 1 };
}

/** Moves dir steps (−1 back, +1 forward), skipping ids that no longer exist. {h, id} or null. */
export function stepHistory(h, dir, exists = () => true) {
  if (!h) return null;
  for (let i = h.index + dir; i >= 0 && i < h.stack.length; i += dir) {
    if (exists(h.stack[i])) return { h: { ...h, index: i }, id: h.stack[i] };
  }
  return null;
}

/** Jumps to a given index of the history. */
export function jumpHistory(h, index) {
  if (!h || index < 0 || index >= h.stack.length) return null;
  return { h: { ...h, index }, id: h.stack[index] };
}

/** Recent documents for the dropdown: newest first, no repeats, with their history index. */
export function recentList(h, max = 15) {
  const out = [];
  const seen = new Set();
  for (let i = (h?.stack.length || 0) - 1; i >= 0 && out.length < max; i--) {
    const id = h.stack[i];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, index: i, current: i === h.index });
  }
  return out;
}

/**
 * Which pane a binder click opens in: the active pane unless it is locked in place, then the
 * other pane when it is open and free. null = both locked (nothing changes).
 */
export function routeSelection({ active = 'main', locks = {}, hasSplit = false }) {
  const other = active === 'main' ? 'split' : 'main';
  const usable = (p) => !locks[p] && (p === 'main' || hasSplit);
  if (usable(active)) return active;
  if (usable(other)) return other;
  return null;
}

/** Zoom of a pane: the split pane has its own (zoom2), falling back to the main one. */
export function paneZoom(view = {}, pane = 'main') {
  if (pane === 'split') return view.zoom2 || view.zoom || 100;
  return view.zoom || 100;
}

/** View with a pane's zoom changed (clamped 50–400). */
export function withPaneZoom(view = {}, pane, z) {
  const v = Math.min(400, Math.max(50, Math.round(z)));
  return pane === 'split' ? { ...view, zoom2: v } : { ...view, zoom: v };
}
