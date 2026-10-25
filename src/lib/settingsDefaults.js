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
  backupKeep: 10,
  backupDir: '',
  // AI
  aiEnabled: true,
  // Where the label colour is shown (View > Use label colour in)
  labelColorIn: { binder: false, cards: true, outliner: false, icons: true },
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
  for (const [k, v] of Object.entries(vars)) {
    if (v) root.style.setProperty(k, v);
    else root.style.removeProperty(k);
  }
  if (root.dataset) root.dataset.invisibles = s.showInvisibles ? 'on' : 'off';
}
