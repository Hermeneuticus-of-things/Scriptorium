// Per-project folder-sync settings (Project Settings › Sync tab, P8 2026-10-31).
// The project keys syncAuto / syncFormat / syncNotesFormat / syncIncludeNotes override the
// program defaults in Settings › Sharing (settings.sharingSync); App.jsx withSyncDefaults and
// lib/folderSync.cjs read them. An empty / "inherit" value removes the key so the program
// default applies. syncFolder is chosen by the first sync out and is never written here.

export const SYNC_FORMATS = ['rtf', 'txt', 'md'];
export const SYNC_KEYS = ['syncAuto', 'syncFormat', 'syncNotesFormat', 'syncIncludeNotes'];

/** Dialog draft: '' means "as in Settings › Sharing". */
export function makeSyncDraft(project = {}) {
  return {
    auto: project.syncAuto === true,
    format: typeof project.syncFormat === 'string' ? project.syncFormat : '',
    notesFormat: typeof project.syncNotesFormat === 'string' ? project.syncNotesFormat : '',
    includeNotes: project.syncIncludeNotes === true ? 'yes' : project.syncIncludeNotes === false ? 'no' : '',
  };
}

/** Writes the draft onto a copy of the project; inherited / off values drop the key. */
export function applySyncDraft(project, draft) {
  const out = { ...project };
  for (const k of SYNC_KEYS) delete out[k];
  const s = draft || {};
  if (s.auto) out.syncAuto = true;
  if (s.format) out.syncFormat = s.format;
  if (s.notesFormat) out.syncNotesFormat = s.notesFormat;
  if (s.includeNotes === 'yes') out.syncIncludeNotes = true;
  else if (s.includeNotes === 'no') out.syncIncludeNotes = false;
  return out;
}

/** Format options for a select: the standard ones plus a stored value outside them (kept, not lost). */
export function syncFormatOptions(current) {
  return current && !SYNC_FORMATS.includes(current) ? [...SYNC_FORMATS, current] : SYNC_FORMATS;
}
