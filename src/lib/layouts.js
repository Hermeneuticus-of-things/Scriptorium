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
}
