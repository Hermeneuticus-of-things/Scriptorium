// Toolbar registry (View → Customize Toolbar…, as in Scrivener 3).
// Every toolbar item names the command it runs (command ids of the registry in App.jsx /
// src/lib/commands.js), so menus and toolbars share one set of actions. Saved in
// settings.toolbars = { top: [ids], format: [ids], display, seen: { top: [ids], format: [ids] } }.

export const SEP = 'sep';
export const SPACE = 'space';
export const SPECIAL_ITEMS = [SEP, SPACE];

// Top toolbar. icon: name in components/Icons.jsx (or a text glyph); command: command id.
// kind: 'views' (Editor/Corkboard/Outline switch), 'title', 'aiMenu' (desktop: the AI menu).
// needs: 'ai' (only while AI is on), 'desktop' (only in the desktop app).
export const TOP_ITEMS = [
  { id: 'home', label: 'cmd.closeProject', glyph: '⌂', command: 'closeProject' },
  { id: 'back', label: 'cmd.back', icon: 'back', command: 'back' },
  { id: 'forward', label: 'cmd.forward', icon: 'forward', command: 'forward' },
  { id: 'title', label: 'ui.tb.title', kind: 'title' },
  { id: 'views', label: 'ui.tb.views', kind: 'views' },
  { id: 'binder', label: 'cmd.toggleBinder', icon: 'binder', command: 'toggleBinder', text: 'Binder' },
  { id: 'compile', label: 'cmd.compile', icon: 'compile', command: 'compile', text: 'Compile' },
  { id: 'inspector', label: 'cmd.toggleInspector', icon: 'inspector', command: 'toggleInspector', text: 'Inspector' },
  { id: 'composition', label: 'cmd.composition', icon: 'compose', command: 'composition', text: 'ui.tb.compose' },
  { id: 'splitEditor', label: 'cmd.splitEditor', icon: 'split', command: 'splitEditor', text: 'Split' },
  { id: 'findProject', label: 'cmd.findProject', icon: 'search', command: 'findProject' },
  { id: 'newText', label: 'cmd.newText', icon: 'add', command: 'newText' },
  { id: 'snapshot', label: 'cmd.snapshot', icon: 'snapshot', command: 'snapshot' },
  { id: 'bookmarks', label: 'cmd.bookmarks', icon: 'bookmark', command: 'bookmarks' },
  { id: 'projectNotes', label: 'cmd.projectNotes', icon: 'notes', command: 'projectNotes' },
  { id: 'targets', label: 'cmd.targets', glyph: '◎', command: 'targets' },
  { id: 'irep', label: 'cmd.irep', glyph: '✓', command: 'irep', text: 'I-REP' },
  { id: 'ai', label: 'cmd.ai', glyph: '✦', command: 'ai', needs: 'ai', text: 'AI' },
  { id: 'aiMenu', label: 'ui.tb.aiMenu', kind: 'aiMenu', needs: 'desktop' },
  { id: 'settings', label: 'cmd.settings', glyph: '⚙', command: 'settings' },
  { id: 'help', label: 'cmd.help', glyph: '?', command: 'help' },
];
// Decluttered default: navigation, title, view switch, Compile, Inspector (+ the AI menu on desktop).
export const TOP_DEFAULT = ['home', 'back', 'forward', 'title', SPACE, 'views', 'compile', 'inspector', 'aiMenu'];

// Format bar groups (ids used by components/FormatBar.jsx).
export const FORMAT_ITEMS = [
  { id: 'block', label: 'ui.fb.block' },
  { id: 'font', label: 'ui.fb.font' },
  { id: 'bui', label: 'ui.fb.bui' },
  { id: 'textfx', label: 'ui.fb.textfx' },
  { id: 'color', label: 'ui.fb.color' },
  { id: 'highlight', label: 'ui.fb.highlight' },
  { id: 'align', label: 'ui.fb.align' },
  { id: 'lists', label: 'ui.fb.lists' },
  { id: 'dialogue', label: 'ui.fb.dialogue' },
  { id: 'notes', label: 'ui.fb.notes' },
  { id: 'internalLink', label: 'ui.fb.internalLink' },
  { id: 'insert', label: 'ui.fb.insert' },
  { id: 'paragraph', label: 'ui.fb.paragraph' },
  { id: 'bookmarks', label: 'ui.fb.bookmarks' },
  { id: 'image', label: 'ui.fb.image' },
  { id: 'table', label: 'ui.fb.table' },
  { id: 'chars', label: 'ui.fb.chars' },
  { id: 'transform', label: 'ui.fb.transform' },
  { id: 'style', label: 'ui.fb.style' },
  { id: 'revision', label: 'ui.fb.revision' },
  { id: 'view', label: 'ui.fb.view' },
  { id: 'copySpecial', label: 'ui.fb.copySpecial' },
  { id: 'undo', label: 'ui.fb.undo' },
];
// Everything stays in the format bar by default; what does not fit goes into the » overflow.
export const FORMAT_DEFAULT = FORMAT_ITEMS.map((i) => i.id);

export const DISPLAY_MODES = ['iconText', 'icon', 'text'];
export const BARS = {
  top: { items: TOP_ITEMS, defaults: TOP_DEFAULT },
  format: { items: FORMAT_ITEMS, defaults: FORMAT_DEFAULT },
};

/**
 * Normalizes a saved item list: unknown ids and duplicates are dropped (separators and spaces
 * may repeat), and defaults added in a newer version (not in `seen`) are appended.
 * Without a saved list the defaults are used.
 */
export function normalizeList(saved, defaults, known, seen) {
  if (!Array.isArray(saved)) return [...defaults];
  const ok = new Set(known);
  const out = [];
  for (const id of saved) {
    if (typeof id !== 'string') continue;
    if (SPECIAL_ITEMS.includes(id)) {
      out.push(id);
      continue;
    }
    if (ok.has(id) && !out.includes(id)) out.push(id);
  }
  const seenSet = new Set(Array.isArray(seen) ? seen : saved);
  for (const id of defaults) if (!SPECIAL_ITEMS.includes(id) && !seenSet.has(id) && !out.includes(id)) out.push(id);
  // no separator/space at the edges or doubled
  return out.filter((id, i) => !(id === SEP && (i === 0 || i === out.length - 1 || out[i - 1] === SEP)));
}

/** Effective toolbars from settings.toolbars. */
export function toolbarPrefs(saved) {
  const t = saved && typeof saved === 'object' ? saved : {};
  const res = { display: DISPLAY_MODES.includes(t.display) ? t.display : 'iconText' };
  for (const [bar, { items, defaults }] of Object.entries(BARS)) {
    res[bar] = normalizeList(t[bar], defaults, items.map((i) => i.id), t.seen && t.seen[bar]);
  }
  return res;
}

/** Value saved in settings for the given lists. */
export function toolbarSettings({ top, format, display }) {
  return { top, format, display, seen: { top: TOP_ITEMS.map((i) => i.id), format: FORMAT_ITEMS.map((i) => i.id) } };
}

/** Whether a top item can show now. */
export function topItemAvailable(item, { aiEnabled, desktop }) {
  if (item.needs === 'ai') return aiEnabled;
  if (item.needs === 'desktop') return desktop;
  return true;
}

// Live format-bar layout for FormatBar (which has no access to settings): App publishes it here.
let formatLayout = FORMAT_DEFAULT;
const listeners = new Set();
export const getFormatLayout = () => formatLayout;
export function setFormatLayout(list) {
  if (JSON.stringify(list) === JSON.stringify(formatLayout)) return;
  formatLayout = list;
  listeners.forEach((fn) => fn(list));
}
export const onFormatLayout = (fn) => (listeners.add(fn), () => listeners.delete(fn));
