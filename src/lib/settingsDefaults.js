// Detailed appearance and composition options (P5). '' = take the colour/font from the theme.
export const LOOK_DEFAULTS = {
  // Editor
  edBg: '', edText: '', edSel: '', edCaret: '',
  pageViewPaper: '', pageViewSurround: '',
  curLine: false, curLineColor: '', curLineOpacity: 35,
  typewriterPos: 50, // percent of the editor height where the typing line is kept
  linkInternal: '', linkExternal: '', keepFormatColor: '', searchHitColor: '',
  // Binder
  binderBg: '', binderText: '', binderAltRows: false, binderAltColor: '',
  binderLabelMode: 'dot', // 'dot' | 'row' | 'none'
  binderFont: '', binderContainerStyle: 'normal', // 'normal' | 'bold' | 'italic' | 'bolditalic'
  // Corkboard
  corkBg: 'default', corkBgColor: '', corkBgImage: '', cardColor: '', cardTitleColor: '', cardTitleFont: '', cardSynopsisFont: '',
  // Outliner
  outAltRows: false, outAltColor: '', outGridColor: '', outFolderColor: '', outTitleFont: '', outSynopsisFont: '',
  // Script elements (element id -> colour)
  scriptColors: {},
  // Inspector, scrivenings, annotations margin
  inspNotesFont: '', inspNotesBg: '', inspSynopsisFont: '',
  scrivTitleFont: '', scrivSepColor: '', scrivSepStyle: 'dashed',
  annotFont: '', annotSize: 0,
  // Toolbar
  toolbarIconSize: 'medium', uiDensity: 'normal',
  // Composition: colours
  compTextColor: '', compPageColor: '', compBarColor: '',
  // Composition: options
  compBarAutoHide: true, compBarDelay: 0, compZoom: 0, compPadY: 48, compPadX: 56,
  compInspOpacity: 100, compInspSynopsis: true, compInspMeta: true, compInspNotes: true,
  compTypewriter: false, compScrollbar: true, compHideCursor: false, compDisplay: -1,
};

/** Keys that make up a saved colour theme (everything visual, nothing behavioural). */
export const THEME_KEYS = [
  'theme', 'uiStyle', 'accentColor', 'commentColor', 'revisionColors', 'editorFont', 'fontSize', 'lineHeight', 'pageWidth', 'binderFontSize',
  'compBg', 'compFade', 'compPaper',
  ...Object.keys(LOOK_DEFAULTS).filter((k) => !/^comp(Bar(AutoHide|Delay)|Zoom|Pad|Insp|Typewriter|Scrollbar|HideCursor|Display)/.test(k) && k !== 'typewriterPos' && k !== 'curLine'),
];

/** Builds a theme file object from settings. */
export function themeFromSettings(name, settings) {
  const s = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  const values = {};
  for (const k of THEME_KEYS) if (s[k] !== undefined) values[k] = s[k];
  return { format: 'scribner-theme', version: 1, name: String(name || '').trim() || 'Temă', values };
}

/** Reads a theme object (from a file or the saved list); unknown keys are dropped. Throws on a bad file. */
export function parseTheme(obj) {
  const o = typeof obj === 'string' ? JSON.parse(obj) : obj;
  if (!o || typeof o !== 'object' || !o.values || typeof o.values !== 'object') throw new Error('bad theme');
  const values = {};
  for (const k of THEME_KEYS) if (k in o.values) values[k] = o.values[k];
  return { name: String(o.name || 'Temă').slice(0, 80), values };
}

const clampNum = (v, lo, hi, d) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== '' ? Math.min(hi, Math.max(lo, n)) : d;
};

/** Normalises the numeric P5 options typed in the dialog. */
export function normalizeLook(p) {
  const out = { ...p };
  out.curLineOpacity = clampNum(p.curLineOpacity, 5, 100, 35);
  out.typewriterPos = clampNum(p.typewriterPos, 10, 90, 50);
  out.annotSize = clampNum(p.annotSize, 0, 30, 0);
  out.compBarDelay = clampNum(p.compBarDelay, 0, 5000, 0);
  out.compZoom = Number(p.compZoom) ? clampNum(p.compZoom, 50, 300, 100) : 0;
  out.compPadY = clampNum(p.compPadY, 0, 300, 48);
  out.compPadX = clampNum(p.compPadX, 0, 300, 56);
  out.compInspOpacity = clampNum(p.compInspOpacity, 20, 100, 100);
  out.compDisplay = Math.trunc(clampNum(p.compDisplay, -1, 16, -1));
  return out;
}

/** Fraction (0.1–0.9) of the visible height where typewriter scrolling keeps the caret. */
export function typewriterFraction(settings) {
  return clampNum(settings?.typewriterPos, 10, 90, 50) / 100;
}

// Default application settings (merged under user settings) and CSS variable application.
export const DEFAULT_SETTINGS = {
  // General
  language: 'ro',
  reopenLastProject: true,
  autosaveSec: 2,
  checkUpdates: false,
  // Appearance
  theme: 'system',
  editorFont: 'Georgia, serif',
  fontSize: 18,
  lineHeight: 1.6,
  pageWidth: 56,
  binderFontSize: 14,
  accentColor: '',
  // Colour of new comments ('' = the theme's comment colour) and of the five revision rounds.
  commentColor: '',
  revisionColors: ['#c62828', '#1565c0', '#2e7d32', '#6a1b9a', '#ef6c00'],
  // Behaviors
  binderEnter: 'edit', // 'edit' | 'newDoc'
  binderDoubleClick: 'rename', // 'rename' | 'openQuickRef'
  typewriter: false,
  // Composition
  compBg: '',
  compWidth: 40,
  compPaper: true,
  compFade: 100,
  compAlign: 'center',
  // Corrections
  smartQuotes: true,
  smartDashes: true,
  smartEllipsis: true,
  autoCapitalize: false,
  spellLanguages: ['ro'],
  autoReplacements: [],
  learnCorrections: true,
  // Editing
  paragraphIndent: 0,
  paragraphSpacing: 0.6,
  defaultView: 'editor',
  showInvisibles: false,
  autoBacklinks: false,
  // Backup
  backupOnClose: true,
  snapshotOnSave: false,
  backupEveryMin: 0,
  backupOnOpen: false,
  backupOnSave: false, // also on each manual save (Ctrl+S), at most once a minute
  backupZip: true,
  backupDateName: true, // date and time in the backup's file name
  backupKeep: 5, // new installs; settings saved before keep their value (lib/backup.cjs migrateBackupKeep)
  backupDir: '',
  // AI
  aiEnabled: true,
  // Where the label colour is shown (View > Use label colour in)
  labelColorIn: { binder: false, cards: true, outliner: false, icons: true },
  savedThemes: [],
  ...LOOK_DEFAULTS,
};

export const withDefaults = (settings) => ({ ...DEFAULT_SETTINGS, ...(settings || {}) });

/** settings.labelColorIn with every key filled in (a partial object keeps the other defaults). */
export const labelColorIn = (settings) => ({ ...DEFAULT_SETTINGS.labelColorIn, ...((settings && settings.labelColorIn) || {}) });

/** Light row tint from a label colour (#rgb / #rrggbb), readable on light and dark themes. */
export function labelTint(color, alpha = 0.18) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color || '').trim());
  if (!m) return '';
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Sets CSS custom properties on <html> from settings; empty values remove the variable. */
export function applySettingsCss(settings, root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!root) return;
  const s = withDefaults(settings);
  const vars = {
    '--editor-font': s.editorFont,
    '--editor-font-size': s.fontSize ? `${Number(s.fontSize)}px` : '',
    '--editor-line-height': s.lineHeight ? String(s.lineHeight) : '',
    '--editor-page-width': s.pageWidth ? `${Number(s.pageWidth)}em` : '',
    '--binder-font-size': s.binderFontSize ? `${Number(s.binderFontSize)}px` : '',
    '--para-indent': `${Number(s.paragraphIndent) || 0}em`,
    '--para-spacing': `${Number(s.paragraphSpacing) || 0}em`,
    '--accent': s.accentColor,
  };
  const revs = Array.isArray(s.revisionColors) ? s.revisionColors : DEFAULT_SETTINGS.revisionColors;
  for (let i = 0; i < 5; i += 1) vars[`--rev-${i + 1}`] = revs[i] || DEFAULT_SETTINGS.revisionColors[i];
  for (const [k, v] of Object.entries(vars)) {
    if (v) root.style.setProperty(k, v);
    else root.style.removeProperty(k);
  }
  if (root.dataset) root.dataset.invisibles = s.showInvisibles ? 'on' : 'off';
  applyLookCss(s, root);
}

const FONT_KEYS = { binderFont: '--binder-font', cardTitleFont: '--card-title-font', cardSynopsisFont: '--card-synopsis-font', outTitleFont: '--out-title-font', outSynopsisFont: '--out-synopsis-font', inspNotesFont: '--insp-notes-font', inspSynopsisFont: '--insp-synopsis-font', scrivTitleFont: '--scriv-title-font', annotFont: '--annot-font' };
const COLOR_KEYS = {
  edBg: '--ed-bg', edText: '--ed-text', edSel: '--ed-sel', edCaret: '--ed-caret', pageViewPaper: '--pv-paper', pageViewSurround: '--pv-surround',
  curLineColor: '--cur-line-color', linkInternal: '--link-internal', linkExternal: '--link-external', keepFormatColor: '--keep-format-color', searchHitColor: '--search-hit-color',
  binderBg: '--binder-bg', binderText: '--binder-text', binderAltColor: '--binder-alt', corkBgColor: '--cork-bg-color', cardColor: '--card-color', cardTitleColor: '--card-title-color',
  outAltColor: '--out-alt', outGridColor: '--out-grid', outFolderColor: '--out-folder', inspNotesBg: '--insp-notes-bg', scrivSepColor: '--scriv-sep-color',
  compTextColor: '--comp-text', compPageColor: '--comp-page', compBarColor: '--comp-bar-bg',
};
/** Script element ids that can be coloured in the editor. */
export const SCRIPT_ELEMENTS = ['scene-heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition', 'shot', 'general'];

/** P5: appearance colours, fonts and composition options as CSS variables / data attributes on <html>. */
export function applyLookCss(settings, root) {
  if (!root?.style) return;
  const s = { ...LOOK_DEFAULTS, ...(settings || {}) };
  const vars = {};
  for (const [k, v] of Object.entries(COLOR_KEYS)) vars[v] = s[k] || '';
  for (const [k, v] of Object.entries(FONT_KEYS)) vars[v] = s[k] || '';
  vars['--cur-line-opacity'] = `${clampNum(s.curLineOpacity, 5, 100, 35)}%`;
  const tw = clampNum(s.typewriterPos, 10, 90, 50);
  vars['--tw-top'] = `${Math.max(tw, 30)}vh`;
  vars['--tw-bottom'] = `${Math.max(100 - tw, 50)}vh`;
  vars['--annot-size'] = Number(s.annotSize) ? `${Number(s.annotSize)}px` : '';
  vars['--cork-bg-image'] = s.corkBg === 'image' && s.corkBgImage ? `url("${s.corkBgImage}")` : '';
  vars['--comp-bar-delay'] = `${clampNum(s.compBarDelay, 0, 5000, 0)}ms`;
  vars['--comp-zoom'] = Number(s.compZoom) ? String(clampNum(s.compZoom, 50, 300, 100) / 100) : '';
  vars['--comp-pad-y'] = `${clampNum(s.compPadY, 0, 300, 48)}px`;
  vars['--comp-pad-x'] = `${clampNum(s.compPadX, 0, 300, 56)}px`;
  vars['--comp-insp-opacity'] = String(clampNum(s.compInspOpacity, 20, 100, 100) / 100);
  vars['--scriv-sep-style'] = ['dashed', 'solid', 'dotted', 'double', 'none'].includes(s.scrivSepStyle) ? s.scrivSepStyle : 'dashed';
  const sc = s.scriptColors && typeof s.scriptColors === 'object' ? s.scriptColors : {};
  for (const el of SCRIPT_ELEMENTS) vars[`--script-${el}`] = sc[el] || '';
  for (const [k, v] of Object.entries(vars)) {
    if (v) root.style.setProperty(k, v);
    else root.style.removeProperty(k);
  }
  const d = root.dataset;
  if (!d) return;
  d.curLine = s.curLine ? 'on' : 'off';
  d.typewriterPos = String(clampNum(s.typewriterPos, 10, 90, 50));
  d.binderLabels = ['dot', 'row', 'none'].includes(s.binderLabelMode) ? s.binderLabelMode : 'dot';
  d.binderAlt = s.binderAltRows ? 'on' : 'off';
  d.binderContainers = s.binderContainerStyle || 'normal';
  d.corkBg = s.corkBg || 'default';
  d.outAlt = s.outAltRows ? 'on' : 'off';
  d.toolbarIcons = s.toolbarIconSize || 'medium';
  d.density = s.uiDensity || 'normal';
  d.compBar = s.compBarAutoHide === false ? 'pinned' : 'auto';
  d.compZoom = Number(s.compZoom) ? 'own' : 'editor';
  d.compScrollbar = s.compScrollbar === false ? 'off' : 'on';
  d.compHideCursor = s.compHideCursor ? 'on' : 'off';
  d.compInsp = [s.compInspSynopsis !== false ? 's' : '', s.compInspMeta !== false ? 'm' : '', s.compInspNotes !== false ? 'n' : ''].join('') || 'none';
}
