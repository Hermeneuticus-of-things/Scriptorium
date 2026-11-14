// Search over snapshots (titles, ISO dates and text) — pure, no DOM, no fs.
// Mirrored in lib/snapshotSearch.cjs for the main process (fs walk + IPC snap:search);
// the two must behave identically (both are covered by tests/snapshotManager.test.js).

// HTML → searchable text: tags out, block ends become newlines, entities decoded, trailing
// newline kept so plain queries can also match across line starts.
export function toSearchText(html) {
  return String(html || '')
    .replace(/<\/(p|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

// Query → matcher. Plain: case-insensitive substring (no regex magic). Regex: 'i' flag.
// An empty query matches nothing. Returns {test} or {test (always false), error}.
export function parseQuery(query, regexMode) {
  const q = String(query || '').trim();
  if (!q) return { test: () => false };
  if (!regexMode) {
    const needle = q.toLowerCase();
    return { test: (s) => String(s || '').toLowerCase().includes(needle) };
  }
  try {
    const re = new RegExp(q, 'i');
    return { test: (s) => re.test(String(s || '')) };
  } catch (e) {
    return { test: () => false, error: `Regex invalid: ${e.message}` };
  }
}

// Matches one snapshot {name, date, html} — returns where[] ('title' | 'date' | 'text'), [] = no match.
export function matchSnapshot(snap, matcher) {
  const where = [];
  if (matcher.test(snap.name)) where.push('title');
  if (matcher.test(snap.date)) where.push('date');
  if (matcher.test(toSearchText(snap.html))) where.push('text');
  return where;
}
