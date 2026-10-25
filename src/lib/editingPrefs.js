// Editing preferences (Options → Editing and Options → Corrections) that are read live by
// code far from the settings dialog: new document titles, auto-complete, typewriter scrolling,
// revision round names, default zoom. setEditingPrefs(settings) is called whenever the
// settings change; it also writes the CSS variables used by the editor and the notes.
import { t } from './i18n.js';

export const EDITING_DEFAULTS = {
  // Editing / Options
  typewriterPos: 50, // % of the editor height where the current line stays
  highlightCurrentLine: false,
  caretWidth: 1, // px; 1 = the system caret
  caretBlink: true,
  caretBlinkMs: 1000,
  endSpace: 0, // extra scroll space after the end of the document, % of the editor height
  defaultZoom: 100,
  defaultDocTitle: '',
  defaultFolderTitle: '',
  autoPairBrackets: false,
  autoPairQuotes: false,
  acMinLetters: 3,
  acTitles: false,
  dragSelectWords: false,
  // Editing / Formatting
  paraAlign: '',
  paraIndentLeft: 0, // em
  paraIndentRight: 0, // em
  paraSpaceBefore: 0, // em
  paraTabs: '', // "2, 4.5" in the ruler unit
  notesFont: '',
  notesFontSize: 0,
  annotFont: '',
  annotFontSize: 0,
  pasteDefaultFormat: false,
  rulerUnits: 'cm',
  // Editing / Revisions
  revisionStrikeDeletions: false,
  revisionNames: ['', '', '', '', ''],
  // Corrections
  fixTwoCaps: true,
  fixCapsLock: true,
  capitalizeDays: true,
  capExceptions: 'dr., etc., nr., pag., vol.',
  spellCheckLive: true,
  grammarCheck: false,
  spellIgnoreUpper: true,
  spellIgnoreDigits: true,
  spellIgnoreUrls: true,
  quoteStyle: 'ro',
  singleQuoteStyle: 'ro',
};

let live = { ...EDITING_DEFAULTS };

/** Settings merged over the defaults for the keys above. */
export function editingFrom(settings) {
  const out = { ...EDITING_DEFAULTS };
  for (const k of Object.keys(EDITING_DEFAULTS)) if (settings && settings[k] !== undefined && settings[k] !== null) out[k] = settings[k];
  return out;
}

export function editingPrefs() {
  return live;
}

/** Units for the ruler and indents: size of one unit in em at 16px (1em = 16px = 12pt). */
export const UNITS = { cm: 96 / 2.54 / 16, in: 96 / 16, pt: 1 / 12 };
/** Converts a value in em to the unit (rounded to 2 decimals). */
export const emTo = (em, unit) => Math.round((Number(em) || 0) / (UNITS[unit] || UNITS.cm) * 100) / 100;
/** Converts a value in the unit to em. */
export const toEm = (v, unit) => Math.round((Number(v) || 0) * (UNITS[unit] || UNITS.cm) * 1000) / 1000;

/** Parses "2, 4.5" (in the ruler unit) into sorted tab stops in em. */
export function parseTabs(text, unit = 'cm') {
  return String(text ?? '')
    .split(/[,;\s]+/)
    .map((x) => Number(x.replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b)
    .map((n) => toEm(n, unit));
}

/** CSS variables for the editing preferences ('' removes a variable). */
export function editingCssVars(p) {
  const n = (v) => Number(v) || 0;
  const tabs = parseTabs(p.paraTabs, p.rulerUnits);
  return {
    '--typewriter-pos': `${Math.min(90, Math.max(10, n(p.typewriterPos) || 50))}%`,
    '--editor-end-space': n(p.endSpace) ? `${Math.min(100, n(p.endSpace))}vh` : '',
    '--caret-width': `${Math.min(8, Math.max(1, n(p.caretWidth) || 1))}px`,
    '--caret-blink': p.caretBlink === false ? '0s' : `${Math.max(300, n(p.caretBlinkMs) || 1000)}ms`,
    '--para-align': p.paraAlign || '',
    '--para-indent-left': n(p.paraIndentLeft) ? `${n(p.paraIndentLeft)}em` : '',
    '--para-indent-right': n(p.paraIndentRight) ? `${n(p.paraIndentRight)}em` : '',
    '--para-space-before': n(p.paraSpaceBefore) ? `${n(p.paraSpaceBefore)}em` : '',
    '--para-tab-size': tabs.length ? `${tabs[0]}em` : '',
    '--notes-font': p.notesFont || '',
    '--notes-font-size': n(p.notesFontSize) ? `${n(p.notesFontSize)}px` : '',
    '--annot-font': p.annotFont || '',
    '--annot-font-size': n(p.annotFontSize) ? `${n(p.annotFontSize)}px` : '',
  };
}

/** Called by the app with the current settings: updates the live prefs and the CSS variables. */
export function setEditingPrefs(settings, root = typeof document !== 'undefined' ? document.documentElement : null) {
  live = editingFrom(settings);
  if (!root) return live;
  for (const [k, v] of Object.entries(editingCssVars(live))) {
    if (v) root.style.setProperty(k, v);
    else root.style.removeProperty(k);
  }
  if (root.dataset) {
    root.dataset.customCaret = Number(live.caretWidth) > 1 || live.caretBlink === false ? 'on' : 'off';
    root.dataset.grammar = live.grammarCheck ? 'on' : 'off';
  }
  return live;
}

/** Label of revision round n (1–5): the user's name for it, or the generic one. */
export function revisionRoundLabel(n, names = live.revisionNames) {
  const name = String((names || [])[n - 1] || '').trim();
  return name ? t('ui.edit.revisionNamed', { n, name }) : t('ui.formatBar.revisionRound', { n });
}

/** Corrections options for the editor extensions, from the settings. */
export function correctionOptions(settings) {
  const p = editingFrom(settings);
  const dayLanguages = (settings?.spellLanguages || ['ro']).map(String);
  if (!dayLanguages.some((l) => /^en/i.test(l))) dayLanguages.push('en');
  return {
    fixTwoCaps: Boolean(p.fixTwoCaps),
    fixCapsLock: Boolean(p.fixCapsLock),
    capitalizeDays: Boolean(p.capitalizeDays),
    dayLanguages,
    capExceptions: String(p.capExceptions || '')
      .split(/[,;\n]+/)
      .map((x) => x.trim().replace(/\.+$/, '').toLocaleLowerCase())
      .filter(Boolean),
    spellCheck: p.spellCheckLive !== false,
    grammarCheck: Boolean(p.grammarCheck),
    ignoreUpper: Boolean(p.spellIgnoreUpper),
    ignoreDigits: Boolean(p.spellIgnoreDigits),
    ignoreUrls: Boolean(p.spellIgnoreUrls),
    editing: {
      quoteStyle: p.quoteStyle,
      singleQuoteStyle: p.singleQuoteStyle,
      autoPairBrackets: Boolean(p.autoPairBrackets),
      autoPairQuotes: Boolean(p.autoPairQuotes),
      dragSelectWords: Boolean(p.dragSelectWords),
      pasteDefaultFormat: Boolean(p.pasteDefaultFormat),
      revisionStrikeDeletions: Boolean(p.revisionStrikeDeletions),
      caret: Number(p.caretWidth) > 1 || p.caretBlink === false,
    },
  };
}
