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
  if (k.length === 1) k = k.toUpperCase();
  parts.push(k);
  return parts.join('+');
}

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
    else key = p.length === 1 ? p.toUpperCase() : p;
  }
  return [...['Ctrl', 'Alt', 'Shift'].filter((m) => mods.has(m)), key].filter(Boolean).join('+');
}

export const DEFAULT_KEYS = {
  save: 'Ctrl+S',
  newText: 'Ctrl+N',
  newFolder: 'Ctrl+Shift+N',
  findProject: 'Ctrl+Shift+F',
  composition: 'F11',
  split: 'Ctrl+K',
  splitTitle: 'Ctrl+Shift+K',
  duplicate: 'Ctrl+D',
  goto: 'Ctrl+G',
  prevDoc: 'Ctrl+Alt+↑',
  nextDoc: 'Ctrl+Alt+↓',
  merge: 'Ctrl+Shift+M',
  back: 'Alt+←',
  forward: 'Alt+→',
  viewEditor: 'Ctrl+1',
  viewCorkboard: 'Ctrl+2',
  viewOutline: 'Ctrl+3',
  toggleInspector: 'Ctrl+Alt+I',
  toggleBinder: 'Ctrl+Alt+B',
  compile: 'Ctrl+Shift+E',
  quickRef: 'Ctrl+Shift+R',
  snapshot: 'Ctrl+5',
  stats: 'Ctrl+Shift+I',
  saveAs: 'Ctrl+Shift+S',
  help: 'F1',
  print: 'Ctrl+P',
  fullScreen: 'Ctrl+Shift+F11',
  revealBinder: 'Ctrl+Alt+R',
};

// Effective shortcut for a command; an empty string in settings disables it.
export function shortcutFor(id, settings) {
  const custom = settings && settings.shortcuts ? settings.shortcuts[id] : undefined;
  return custom !== undefined ? custom : DEFAULT_KEYS[id] || '';
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
