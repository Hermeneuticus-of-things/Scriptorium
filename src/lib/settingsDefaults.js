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
  backupKeep: 10,
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
  const revs = Array.isArray(s.revisionColors) ? s.revisionColors : DEFAULT_SETTINGS.revisionColors;
  for (let i = 0; i < 5; i += 1) vars[`--rev-${i + 1}`] = revs[i] || DEFAULT_SETTINGS.revisionColors[i];
  for (const [k, v] of Object.entries(vars)) {
    if (v) root.style.setProperty(k, v);
    else root.style.removeProperty(k);
  }
  if (root.dataset) root.dataset.invisibles = s.showInvisibles ? 'on' : 'off';
}
