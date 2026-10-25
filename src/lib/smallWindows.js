// Pure helpers for the small windows (P11): writing history, statistics tables, scratchpad notes,
// session totals across projects, composition-bar progress.

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\n');

// ---------------------------------------------------------------- writing history

/** Days between `from` and `to` (YYYY-MM-DD, both inclusive, either may be empty). */
export function filterHistoryRange(rows, from, to) {
  return (rows || []).filter((r) => (!from || r.date >= from) && (!to || r.date <= to));
}

/** Totals for a list of history rows: net, added, deleted, days written, streak (to the last row). */
export function historyTotals(rows) {
  const list = rows || [];
  const net = list.reduce((s, r) => s + (r.draft || 0), 0);
  const added = list.reduce((s, r) => s + (r.draftAdded ?? Math.max(0, r.draft || 0)), 0);
  const deleted = list.reduce((s, r) => s + (r.draftDeleted ?? Math.max(0, -(r.draft || 0))), 0);
  const days = list.filter((r) => (r.draftAdded ?? r.draft) > 0).length;
  let streak = 0;
  for (let i = list.length - 1; i >= 0 && (list[i].draftAdded ?? list[i].draft) > 0; i--) streak++;
  return { net, added, deleted, days, streak, average: days ? Math.round(added / days) : 0 };
}

export function historyCsv(rows) {
  return toCsv([
    ['date', 'manuscript_net', 'manuscript_added', 'manuscript_deleted', 'project_net', 'manuscript_words_end_of_day', 'manuscript_chars'],
    ...(rows || []).map((r) => [r.date, r.draft, r.draftAdded ?? '', r.draftDeleted ?? '', r.total, r.draftWords ?? '', r.draftChars ?? '']),
  ]);
}

// ---------------------------------------------------------------- statistics

/** Sorts word-frequency rows by 'word' | 'count' | 'percent'. */
export function sortFrequency(rows, key = 'count', dir = 'desc') {
  const k = dir === 'asc' ? 1 : -1;
  return [...(rows || [])].sort((a, b) => {
    const c = key === 'word' ? a.word.localeCompare(b.word) : (a[key] || 0) - (b[key] || 0);
    return c ? c * k : a.word.localeCompare(b.word);
  });
}

export const frequencyCsv = (rows) => toCsv([['word', 'count', 'percent'], ...(rows || []).map((r) => [r.word, r.count, Number(r.percent || 0).toFixed(2)])]);

/** Quick text statistics for a piece of plain text (the selection). */
export function quickTextStats(text, wordsPerPage = 250) {
  const s = String(text || '');
  const words = (s.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) || []).length;
  const sentences = s.trim() ? (s.match(/[^.!?…]+(?:[.!?…]+|$)/g) || []).filter((x) => /[\p{L}\p{N}]/u.test(x)).length : 0;
  const paragraphs = s.split(/\n\s*\n|\n/).filter((p) => p.trim()).length;
  return {
    words,
    chars: s.length,
    charsNoSpaces: s.replace(/\s/g, '').length,
    sentences,
    paragraphs,
    pages: Math.round((words / Math.max(1, wordsPerPage)) * 10) / 10,
    readingMinutes: Math.ceil(words / 230),
    averageSentence: sentences ? Math.round((words / sentences) * 10) / 10 : 0,
  };
}

// ---------------------------------------------------------------- scratchpad

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Notes saved before formatted text had `text` only: give them `html`. */
export function noteHtml(note) {
  if (!note) return '';
  if (typeof note.html === 'string') return note.html;
  const t = String(note.text || '');
  return t ? t.split(/\n/).map((l) => `<p>${escapeHtml(l) || '<br>'}</p>`).join('') : '';
}

/** File name (no extension) for a note saved in the scratchpad folder. */
export function noteFileName(title, id) {
  const base = String(title || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return base && !/^\.+$/.test(base) ? base : String(id || 'nota');
}

/** Note from an imported file: .html keeps its markup, .md/.txt become paragraphs. */
export function noteFromFile(name, content) {
  const title = String(name || '').replace(/\.[^.]+$/, '') || 'Notă';
  const isHtml = /\.html?$/i.test(name || '');
  let html;
  if (isHtml) {
    const m = String(content).match(/<body[^>]*>([\s\S]*)<\/body>/i);
    html = (m ? m[1] : String(content)).trim();
  } else html = noteHtml({ text: String(content || '').replace(/\r\n?/g, '\n') });
  return { id: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, title, html, updated: Date.now() };
}

export function noteToFileHtml(note) {
  return `<!doctype html>\n<html><head><meta charset="utf-8"><title>${escapeHtml(note.title || '')}</title></head><body>\n${noteHtml(note)}\n</body></html>\n`;
}

// ---------------------------------------------------------------- session across open projects

const SESSION_PREFIX = 'scribner-session-live:';
export const SESSION_FRESH_MS = 90_000;

/** This window's session count, shared with the other windows through localStorage. */
export function publishSession(storage, dir, value, now = Date.now()) {
  try {
    storage.setItem(SESSION_PREFIX + dir, JSON.stringify({ value, at: now }));
  } catch { /* storage off */ }
}
export function unpublishSession(storage, dir) {
  try { storage.removeItem(SESSION_PREFIX + dir); } catch { /* ignore */ }
}
/** Sum of the session counts of the projects open in other windows (fresh entries only) plus `own`. */
export function combinedSession(storage, dir, own, now = Date.now()) {
  let sum = own || 0;
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (!k || !k.startsWith(SESSION_PREFIX) || k === SESSION_PREFIX + dir) continue;
      const e = JSON.parse(storage.getItem(k) || 'null');
      if (e && now - e.at < SESSION_FRESH_MS && Number.isFinite(e.value)) sum += e.value;
    }
  } catch { /* storage off */ }
  return sum;
}

/** Session delta from the session start: negative only when the author allows it. */
export function sessionDelta(now, start, allowNegative) {
  const d = (now || 0) - (start || 0);
  return allowNegative ? d : Math.max(0, d);
}

/** Percent (0..100) for a progress bar; 0 when there is no target. */
export function progressPct(value, target) {
  const t = Number(target) || 0;
  return t > 0 ? Math.max(0, Math.min(100, Math.round(((Number(value) || 0) / t) * 100))) : 0;
}
