// Named styles (Scrivener "Styles"): paragraph styles set data-style on a paragraph,
// character styles wrap text in span[data-char-style]. The look is plain data so
// the same definition drives the editor, the compiled HTML/EPUB and DOCX.

export const DEFAULT_STYLES = [
  { id: 'ilustratie', name: 'Ilustrație', type: 'char', italic: true },
  { id: 'accent', name: 'Accent', type: 'char', bold: true },
  { id: 'sanscrit', name: 'Termen sanscrit', type: 'char', italic: true },
  { id: 'citat-bloc', name: 'Citat bloc', type: 'para', italic: true, indent: 2 },
  { id: 'motto', name: 'Motto', type: 'para', italic: true, align: 'right', size: 90 },
  { id: 'scrisoare', name: 'Scrisoare', type: 'para', indent: 1.5, size: 95 },
  { id: 'centrat', name: 'Centrat', type: 'para', align: 'center' },
  { id: 'separator', name: 'Separator de scenă', type: 'para', align: 'center', spacing: 1 },
];

export function stylesOf(project) {
  return project && Array.isArray(project.styles) && project.styles.length ? project.styles : DEFAULT_STYLES;
}

function decl(st) {
  const d = [];
  if (st.bold) d.push('font-weight: 700');
  if (st.italic) d.push('font-style: italic');
  if (st.smallCaps) d.push('font-variant: small-caps');
  if (st.underline) d.push('text-decoration: underline');
  if (st.color) d.push(`color: ${st.color}`);
  if (st.size && st.size !== 100) d.push(`font-size: ${st.size}%`);
  if (st.type === 'para' || st.type === 'both') {
    if (st.align) d.push(`text-align: ${st.align}`);
    if (st.indent) d.push(`margin-left: ${st.indent}em`, `margin-right: ${st.indent}em`);
    if (st.spacing) d.push(`margin-top: ${st.spacing}em`, `margin-bottom: ${st.spacing}em`);
    if (st.align === 'center' || st.align === 'right') d.push('text-indent: 0');
  }
  return d.join('; ');
}

// CSS for the given scope selector (".prose" in the editor, "body" in compiled output).
export function styleCss(styles, scope = '.prose') {
  return styles
    .map((st) => {
      const sel = st.type === 'para' || st.type === 'both' ? `${scope} [data-style="${st.id}"]` : `${scope} [data-char-style="${st.id}"]`;
      return `${sel} { ${decl(st)} }`;
    })
    .join('\n');
}

// --- Style kinds, "Next style", keyboard shortcuts ------------------------
// type: 'para' (paragraph), 'char' (characters) or 'both' (Para+Char: applied to
// the whole paragraph, carrying both paragraph layout and character look).
// next: id of the style for the paragraph created by Enter at the end of a
// paragraph with this style; undefined/'' = keep the same style, 'none' = no style.
// shortcut: e.g. "Ctrl+Alt+1" (Ctrl means Ctrl or Cmd).

export const STYLE_KINDS = [
  ['para', 'Paragraf'],
  ['char', 'Caractere'],
  ['both', 'Paragraf + caractere'],
];

export const isParaStyle = (st) => Boolean(st) && (st.type === 'para' || st.type === 'both');
export const isCharStyle = (st) => Boolean(st) && st.type === 'char';

// Style id for the new paragraph after Enter; null = no style.
export function nextStyleId(styles, id) {
  if (!id) return null;
  const st = (styles || []).find((s) => s.id === id);
  if (!st || !st.next) return id;
  if (st.next === 'none') return null;
  return (styles || []).some((s) => s.id === st.next) ? st.next : id;
}

const MOD_ORDER = ['Ctrl', 'Alt', 'Shift'];
// Canonical "Ctrl+Alt+Shift+K" form; '' when the text is not a usable shortcut.
export function normalizeShortcut(text) {
  if (!text) return '';
  const parts = String(text).split('+').map((p) => p.trim()).filter(Boolean);
  const mods = new Set();
  let key = '';
  for (const p of parts) {
    const l = p.toLowerCase();
    if (['ctrl', 'control', 'cmd', 'meta', 'mod', 'command'].includes(l)) mods.add('Ctrl');
    else if (['alt', 'option', 'opt'].includes(l)) mods.add('Alt');
    else if (l === 'shift') mods.add('Shift');
    else key = p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1).toLowerCase();
  }
  if (!key || (!mods.has('Ctrl') && !mods.has('Alt'))) return '';
  return [...MOD_ORDER.filter((m) => mods.has(m)), key].join('+');
}

// Shortcut string for a keydown event (uses e.code so Alt+digit works on macOS).
export function eventShortcut(e) {
  const m = /^(?:Digit|Numpad)(\d)$/.exec(e.code || '') || /^Key([A-Z])$/.exec(e.code || '');
  const key = m ? m[1] : e.key;
  if (!key || ['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return '';
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  parts.push(key.length === 1 ? key.toUpperCase() : key);
  return normalizeShortcut(parts.join('+'));
}

export function styleForShortcut(styles, shortcut) {
  if (!shortcut) return null;
  return (styles || []).find((s) => s.shortcut && normalizeShortcut(s.shortcut) === shortcut) || null;
}

// --- Styles side panel helpers ------------------------------------------------

/** Unique id from a style name ("Citat lung" → "citat-lung", "-2" when taken). */
export function styleIdFor(name, taken = new Set()) {
  const base =
    String(name || '')
      .toLocaleLowerCase('ro')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'stil';
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  return id;
}

/** New style from the look of the selection: {bold, italic, underline, align, size}. */
export function styleFromLook(styles, name, type, look = {}) {
  const st = { id: styleIdFor(name, new Set((styles || []).map((s) => s.id))), name: String(name).trim(), type: type === 'char' ? 'char' : 'para' };
  for (const k of ['bold', 'italic', 'underline', 'smallCaps']) if (look[k]) st[k] = true;
  if (look.color) st.color = look.color;
  if (look.size && look.size !== 100) st.size = look.size;
  if (st.type === 'para' && look.align) st.align = look.align;
  return [...(styles || []), st];
}

export const renameStyle = (styles, id, name) => (styles || []).map((s) => (s.id === id && String(name).trim() ? { ...s, name: String(name).trim() } : s));
// Removed from the stylesheet; "next" links to it are cleared.
export const deleteStyle = (styles, id) => (styles || []).filter((s) => s.id !== id).map((s) => (s.next === id ? { ...s, next: undefined } : s));

// Shortcuts used by more than one style (shown as a warning in the dialog).
export function duplicateShortcuts(styles) {
  const seen = new Map();
  for (const s of styles || []) {
    const k = normalizeShortcut(s.shortcut);
    if (k) seen.set(k, (seen.get(k) || 0) + 1);
  }
  return [...seen].filter(([, n]) => n > 1).map(([k]) => k);
}
