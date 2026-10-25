// Default application settings (merged under user settings) and CSS variable application.
export const DEFAULT_SETTINGS = {
  // General
  language: 'ro',
  reopenLastProject: true,
  autosaveSec: 2,
  autosaveEveryMin: 0, // also save every N minutes even while typing (0 = only after the pause)
  checkUpdates: false,
  startupAction: 'reopenLast', // 'reopenLast' | 'reopenAll' | 'templates'
  defaultProjectDir: '', // folder offered first for new projects
  bibliographyApp: '', // external reference manager opened by Insert Citation (F4)
  templatesRememberCategory: true, // the template chooser opens on the last category used
  showSelectionCount: true, // selected words in the editor footer
  windowWidth: 1400,
  windowHeight: 900,
  startMaximized: false,
  hiddenWarnings: [], // keys of warnings turned off with "Do not show again"
  // Appearance
  theme: 'system',
  editorFont: 'Georgia, serif',
  fontSize: 18,
  lineHeight: 1.6,
  pageWidth: 42,
  binderFontSize: 14,
  accentColor: '',
  // Colour of new comments ('' = the theme's comment colour) and of the five revision rounds.
  commentColor: '',
  revisionColors: ['#c62828', '#1565c0', '#2e7d32', '#6a1b9a', '#ef6c00'],
  // Behaviors
  binderEnter: 'edit', // 'edit' | 'newDoc'
  binderDoubleClick: 'rename', // 'rename' | 'openQuickRef'
  typewriter: false,
  folderDoubleClick: 'behaviour', // 'behaviour' (as above) | 'expand' | 'corkboard' | 'outline'
  folderView: 'keep', // view when a folder is selected: 'keep' | 'editor' | 'corkboard' | 'outline'
  parentDocView: 'keep', // the same for a document with sub-documents
  multiSelectView: 'scrivenings', // several items selected: 'scrivenings' | 'corkboard' | 'outline'
  autoFolderOnChildren: false, // a document that receives sub-documents becomes a folder
  binderDragToEditor: 'link', // dropping binder items in the text: 'link' | 'text' | 'image'
  internalLinksOpen: 'current', // 'current' | 'other' (the other pane of the split) | 'quickRef'
  bookmarksOpen: 'editor', // 'editor' | 'quickRef'
  confirmEmptyTrash: true,
  untitledFirstLine: false, // an untitled document takes its first line as title
  targetSound: false, // a short sound when a target is reached
  // Navigation
  splitOpenInOther: false, // split: what is chosen on the corkboard / outliner opens in the other pane
  syncBinderSelection: true, // selection on the corkboard / outliner is shown in the binder
  rememberCaret: true, // each document keeps its cursor position
  outlinerEnter: 'edit', // Enter in the outliner: 'edit' | 'newRow'
  outlinerTab: 'indent', // Tab in the outliner: 'indent' (move right) | 'none'
  quickRefOnTop: false, // Quick Reference panels float above dialogs
  restoreLayoutOnOpen: true, // views, widths and split come back when a project opens
  // Quick search in the toolbar
  quickSearch: { fields: [], operator: 'any', caseSensitive: false, wholeWord: false, includeTrash: false },

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
};

// Keys owned by the General, Behaviors and Navigation panes (src/components/*Pane.jsx).
export const PANE_KEYS = [
  'autosaveEveryMin', 'startupAction', 'defaultProjectDir', 'bibliographyApp', 'templatesRememberCategory', 'showSelectionCount',
  'windowWidth', 'windowHeight', 'startMaximized',
  'folderDoubleClick', 'folderView', 'parentDocView', 'multiSelectView', 'autoFolderOnChildren', 'binderDragToEditor',
  'internalLinksOpen', 'bookmarksOpen', 'confirmEmptyTrash', 'untitledFirstLine', 'targetSound',
  'splitOpenInOther', 'syncBinderSelection', 'rememberCaret', 'outlinerEnter', 'outlinerTab', 'quickRefOnTop', 'restoreLayoutOnOpen',
];

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
}
