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
}
