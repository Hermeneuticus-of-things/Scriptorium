// Command registry helpers: keyboard combos and default shortcuts.
// Shortcuts are user-configurable (settings.shortcuts: {commandId: 'Ctrl+Shift+K'}).

const NAMED = { ' ': 'Space', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc' };

// Normalized combo for a keyboard event, e.g. "Ctrl+Shift+K", "Ctrl+Alt+↓", "F11".
export function keyFromEvent(e) {
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return '';
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  let k = NAMED[e.key] || e.key;
  // Option/Alt (macOS) and Shift change the character (Option+R = "®", Shift+5 = "%"): use the
  // physical letter/digit (only then, so AZERTY/Dvorak letters still win) so Ctrl+Alt+R and Ctrl+Shift+5 match the shortcut table.
  const phys = (e.altKey || e.shiftKey) && !/^[a-z0-9]$/i.test(k) && /^(?:Key([A-Z])|Digit(\d))$/.exec(e.code || '');
  if (phys) k = phys[1] || phys[2];
  if (k.length === 1) k = k.toUpperCase();
  parts.push(k);
  return parts.join('+');
}

// Typed key names → the spelling keyFromEvent produces.
const NAMED_INPUT = { up: '↑', down: '↓', left: '←', right: '→', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', esc: 'Esc', escape: 'Esc', space: 'Space' };

// Normalizes user input like "ctrl + shift + k" to "Ctrl+Shift+K".
export function normalizeCombo(s) {
  if (!s) return '';
  const raw = String(s).split('+').map((p) => p.trim()).filter(Boolean);
  const mods = new Set();
  let key = '';
  for (const p of raw) {
    const l = p.toLowerCase();
    if (l === 'ctrl' || l === 'cmd' || l === 'control') mods.add('Ctrl');
    else if (l === 'alt' || l === 'option') mods.add('Alt');
    else if (l === 'shift') mods.add('Shift');
    else key = p.length === 1 ? p.toUpperCase() : NAMED_INPUT[l] || (/^f\d{1,2}$/.test(l) ? p.toUpperCase() : p);
  }
  return [...['Ctrl', 'Alt', 'Shift'].filter((m) => mods.has(m)), key].filter(Boolean).join('+');
}

export const DEFAULT_KEYS = {
  save: 'Ctrl+S',
  newText: 'Ctrl+N',
  newFolder: 'Ctrl+Shift+N',
  findProject: 'Ctrl+Shift+F',
  composition: 'F11',
  zoomIn: 'Ctrl+=',
  zoomOut: 'Ctrl+-',
  zoomReset: 'Ctrl+0',
  dictate: 'F9',
  speech: 'F8',
  split: 'Ctrl+K',
  splitTitle: 'Ctrl+Shift+K',
  duplicate: 'Ctrl+D',
  // Edit › Find › Find Next / Previous take Ctrl+G; the Go To dialog is Ctrl+J (Ctrl+Alt+G groups in the binder).
  goto: 'Ctrl+J',
  findNext: 'Ctrl+G',
  findPrev: 'Ctrl+Shift+G',
  prevDoc: 'Ctrl+Alt+↑',
  nextDoc: 'Ctrl+Alt+↓',
  merge: 'Ctrl+Shift+M',
  back: 'Alt+←',
  forward: 'Alt+→',
  viewEditor: 'Ctrl+1',
  viewCorkboard: 'Ctrl+2',
  viewOutline: 'Ctrl+3',
  // View > Inspector / Binder. Ctrl+Shift avoids Ctrl+Alt (= AltGr on
  // Romanian and other European layouts, used to type characters).
  toggleInspector: 'Ctrl+Shift+I',
  toggleBinder: 'Ctrl+Shift+B',
  compile: 'Ctrl+Shift+E',
  quickRef: 'Ctrl+Shift+R',
  snapshot: 'Ctrl+5',
  snapshotTitled: 'Ctrl+Shift+5',
  stats: 'Ctrl+Alt+Shift+I',
  targets: 'Ctrl+Shift+T',
  saveAs: 'Ctrl+Shift+S',
  help: 'F1',
  print: 'Ctrl+P',
  fullScreen: 'Ctrl+Shift+F11',
  revealBinder: 'Ctrl+Alt+R',
  // Scrivener's Format > Show Ruler is Ctrl+Shift+R, already Quick Reference here.
  toggleRuler: 'Ctrl+Alt+Shift+R',
  // Insert Citation opens the reference manager chosen in Options › General.
  insertCitation: 'F4',
};

// Effective shortcut for a command; an empty string in settings disables it.
export function shortcutFor(id, settings) {
  const custom = settings && settings.shortcuts ? settings.shortcuts[id] : undefined;
  return custom !== undefined ? custom : DEFAULT_KEYS[id] || '';
}

// Shortcut sets saved to / loaded from a file (Options › Keyboard).
export const SHORTCUT_SET_FORMAT = 'scribner-shortcuts';
export function serializeShortcutSet(map) {
  return JSON.stringify({ format: SHORTCUT_SET_FORMAT, version: 1, shortcuts: map || {} }, null, 2);
}
/** Map read from a set file; unknown commands are dropped, combos normalized. Throws on another format. */
export function parseShortcutSet(text, knownIds = null) {
  const data = JSON.parse(String(text || ''));
  const src = data && data.format === SHORTCUT_SET_FORMAT ? data.shortcuts : null;
  if (!src || typeof src !== 'object') throw new Error('format');
  const out = {};
  for (const [id, combo] of Object.entries(src)) {
    if (knownIds && !knownIds.includes(id)) continue;
    if (typeof combo === 'string') out[id] = combo ? normalizeCombo(combo) : '';
  }
  return out;
}

/** Ids of the commands that use a combination now. */
export function holdersOf(ids, combo, settings) {
  const k = normalizeCombo(combo);
  return k ? ids.filter((id) => shortcutFor(id, settings) === k) : [];
}

/** Gives combo to id and takes it away from every other command in one step. */
export function assignShortcut(map, ids, id, combo) {
  const next = { ...(map || {}), [id]: combo };
  for (const other of holdersOf(ids, combo, { shortcuts: next })) if (other !== id) next[other] = '';
  return next;
}

// Commands whose shortcut collides with another one.
export function conflicts(ids, settings) {
  const seen = new Map();
  const out = new Set();
  for (const id of ids) {
    const k = shortcutFor(id, settings);
    if (!k) continue;
    if (seen.has(k)) {
      out.add(id);
      out.add(seen.get(k));
    } else seen.set(k, id);
  }
  return out;
}
