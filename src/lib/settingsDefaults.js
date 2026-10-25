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
  pageWidth: 42,
  binderFontSize: 14,
  accentColor: '',
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
  backupEveryMin: 0,
  backupOnOpen: false,
  backupOnSave: false, // also on each manual save (Ctrl+S), at most once a minute
  backupZip: true,
  backupDateName: true, // date and time in the backup's file name
  backupKeep: 5, // new installs; settings saved before keep their value (lib/backup.cjs migrateBackupKeep)
  backupDir: '',
  // AI
  aiEnabled: true,
};

export const withDefaults = (settings) => ({ ...DEFAULT_SETTINGS, ...(settings || {}) });

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
  for (const [k, v] of Object.entries(vars)) {
    if (v) root.style.setProperty(k, v);
    else root.style.removeProperty(k);
  }
  if (root.dataset) root.dataset.invisibles = s.showInvisibles ? 'on' : 'off';
}
