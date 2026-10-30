<<<<<<< ours
// Window > Layouts: what a layout keeps, export/import as a file, and a schematic thumbnail.

export const LAYOUT_FILE_KIND = 'pneuma-layout';
export const OUTLINER_COLUMNS_KEY = 'pneuma-outline-columns';

/**
 * Builds a layout from the window state. `state` holds: view, showInspector, showAi, showEditorial,
 * hideBinder, widths, editorView, splitId, copyholder, outlinerColumns, cork ({folderId, ...board}).
 */
export function captureLayout(name, state) {
  const s = state || {};
  return {
    name: String(name || '').trim() || 'Layout',
    view: s.view || 'editor',
    showInspector: s.showInspector !== false,
    showAi: Boolean(s.showAi),
    showEditorial: Boolean(s.showEditorial),
    hideBinder: Boolean(s.hideBinder),
    widths: s.widths ? { ...s.widths } : undefined,
    editorView: s.editorView ? { ...s.editorView } : undefined,
    split: Boolean(s.splitId),
    splitId: s.splitId || null,
    splitHorizontal: Boolean(s.editorView?.splitHorizontal),
    copyholder: s.copyholder || null,
    outlinerColumns: Array.isArray(s.outlinerColumns) ? [...s.outlinerColumns] : undefined,
    cork: s.cork && s.cork.folderId ? { ...s.cork } : undefined,
    saved: new Date().toISOString(),
  };
}

export function layoutToFile(layout) {
  return JSON.stringify({ kind: LAYOUT_FILE_KIND, version: 1, layout }, null, 2);
}

/** Parses an exported layout; throws on anything else. */
export function layoutFromFile(text) {
  let data;
  try {
    data = JSON.parse(String(text || ''));
  } catch {
    throw new Error('not a layout file');
  }
  const l = data && data.kind === LAYOUT_FILE_KIND ? data.layout : null;
  if (!l || typeof l !== 'object' || typeof l.name !== 'string') throw new Error('not a layout file');
  const VIEWS = ['editor', 'corkboard', 'outline', 'scrivenings', 'timeline', 'relations'];
  return {
    ...l,
    name: l.name.slice(0, 80) || 'Layout',
    view: typeof l.view === 'string' && (VIEWS.includes(l.view) || /^[a-z-]+$/.test(l.view)) ? l.view : 'editor',
    outlinerColumns: Array.isArray(l.outlinerColumns) ? l.outlinerColumns.filter((c) => typeof c === 'string') : undefined,
  };
}

/** Adds or replaces (same name) a layout in a list. */
export function upsertLayout(list, layout) {
  return [...(list || []).filter((l) => l.name !== layout.name), layout];
}

/**
 * Schematic thumbnail: rectangles (x, y, w, h in a 100×60 box) for binder, main view,
 * split pane, inspector and side panels. `kind` names the area for colouring.
 */
export function layoutThumbnail(layout) {
  const l = layout || {};
  const W = 100;
  const H = 60;
  const binderW = l.hideBinder ? 0 : Math.max(12, Math.min(30, Math.round(((l.widths?.binder || 260) / 1400) * W)));
  const sideOn = l.showInspector !== false || l.showAi || l.showEditorial;
  const sideW = sideOn ? Math.max(14, Math.min(30, Math.round(((l.widths?.side || 320) / 1400) * W))) : 0;
  const rects = [];
  if (binderW) rects.push({ kind: 'binder', x: 0, y: 0, w: binderW, h: H });
  const mx = binderW;
  const mw = W - binderW - sideW;
  const split = l.split || l.copyholder;
  if (split && (l.view || 'editor') === 'editor') {
    if (l.splitHorizontal || l.editorView?.splitHorizontal) {
      rects.push({ kind: 'editor', x: mx, y: 0, w: mw, h: H / 2 }, { kind: 'split', x: mx, y: H / 2, w: mw, h: H / 2 });
    } else {
      rects.push({ kind: 'editor', x: mx, y: 0, w: mw / 2, h: H }, { kind: 'split', x: mx + mw / 2, y: 0, w: mw / 2, h: H });
    }
  } else rects.push({ kind: l.view === 'corkboard' ? 'corkboard' : l.view === 'outline' || l.view === 'outliner' ? 'outliner' : 'editor', x: mx, y: 0, w: mw, h: H });
  if (sideW) rects.push({ kind: l.showAi ? 'ai' : l.showEditorial ? 'editorial' : 'inspector', x: W - sideW, y: 0, w: sideW, h: H });
  return rects;
=======
// Saved window layouts (Scrivener 3 §12.3): pure helpers for the layout list stored at
// application level in settings.layouts as [{ name, payload }]. The payload captures only
// window arrangement — never the selected document (that is project content, not layout).
// Accepted payload: { view, widths, showInspector, showBinder, splitId, composition }.

export const LAYOUT_KEYS = ['view', 'widths', 'showInspector', 'showBinder', 'splitId', 'composition'];

// Sanitizes one raw payload (also accepts the legacy flat shape with `hideBinder`) into the
// full six-key payload, so applying a layout always sets every captured value.
export function normalizePayload(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const widths = raw.widths && typeof raw.widths === 'object'
    && Number.isFinite(+raw.widths.binder) && Number.isFinite(+raw.widths.side)
    ? { binder: +raw.widths.binder, side: +raw.widths.side } : undefined;
  // A layout must carry at least a view or usable pane widths; anything else is junk.
  if (!(typeof raw.view === 'string' && raw.view) && !widths) return null;
  return {
    view: typeof raw.view === 'string' && raw.view ? raw.view : 'editor',
    ...(widths ? { widths } : {}),
    showInspector: raw.showInspector !== false,
    // `hideBinder` comes from layouts saved before showBinder (inverted) was introduced.
    showBinder: raw.showBinder !== false && raw.hideBinder !== true,
    splitId: typeof raw.splitId === 'string' && raw.splitId ? raw.splitId : null,
    composition: Boolean(raw.composition),
  };
}

// First free name of the shape „base" / „base 2" / „base 3" …
export function nextLayoutName(list, base = 'Layout') {
  const names = new Set((Array.isArray(list) ? list : []).map((l) => l && l.name));
  if (!names.has(base)) return base;
  let n = 2;
  while (names.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}

// Coerces anything stored/read into a valid [{ name, payload }] list: junk entries are
// dropped, empty names get generated ones, duplicates collapse to the first occurrence.
export function normalizeLayouts(list) {
  const out = [];
  for (const entry of Array.isArray(list) ? list : []) {
    if (!entry || typeof entry !== 'object') continue;
    const payload = normalizePayload(entry.payload && typeof entry.payload === 'object' && !Array.isArray(entry.payload) ? entry.payload : entry);
    if (!payload) continue;
    const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : nextLayoutName(out);
    if (out.some((l) => l.name === name)) continue;
    out.push({ name, payload });
  }
  return out;
}

// Stable tokens for the tiny per-layout summary shown in the dialog; the dialog maps them
// to ui.layouts.sum.* strings. Only deviations from the default arrangement are listed.
export function summaryOf(payload) {
  const p = payload || {};
  const parts = [p.view || 'editor'];
  if (p.showBinder === false) parts.push('binderOff');
  if (p.showInspector === false) parts.push('inspectorOff');
  if (p.splitId) parts.push('split');
  if (p.composition) parts.push('composition');
  return parts;
>>>>>>> theirs
}
