// Search over ALL snapshots of the project (Snapshots Manager, IPC snap:search):
// titles, ISO dates and text, plain or regex. The renderer gets matches without html —
// light results, no bulk transfer. The pure helpers mirror src/lib/snapshotSearch.js
// (no DOM/fs there); both sides are covered by tests/snapshotManager.test.js.
const fs = require('fs');
const path = require('path');

// HTML → searchable text: same rules as the renderer mirror, so results never differ.
function toSearchText(html) {
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

// Query → matcher. Plain: case-insensitive substring. Regex: 'i' flag. Empty matches nothing.
function parseQuery(query, regexMode) {
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

function matchSnapshot(snap, matcher) {
  const where = [];
  if (matcher.test(snap.name)) where.push('title');
  if (matcher.test(snap.date)) where.push('date');
  if (matcher.test(toSearchText(snap.html))) where.push('text');
  return where;
}

// Walks snapshots/ of the whole project: [{id, file, name, date, where}] for every match.
// Damaged files are skipped (one unreadable snapshot never hides the others), _backup never
// matches ("_" is not a valid document id, same rule as snapshotCounts).
function searchSnapshots(dir, query, { regex = false } = {}) {
  const root = path.join(dir, 'snapshots');
  const matcher = parseQuery(query, regex);
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const id of fs.readdirSync(root)) {
    if (!/^[A-Za-z0-9-]+$/.test(id)) continue;
    const snapDir = path.join(root, id);
    let files;
    try {
      files = fs.readdirSync(snapDir).filter((f) => f.endsWith('.json')).sort().reverse();
    } catch {
      continue;
    }
    for (const f of files) {
      let data;
      try {
        data = JSON.parse(fs.readFileSync(path.join(snapDir, f), 'utf8'));
      } catch {
        continue;
      }
      const snap = { name: data.name, date: data.date, html: data.html };
      const where = matchSnapshot(snap, matcher);
      if (where.length) out.push({ id, file: f, name: data.name, date: data.date, where });
    }
  }
  return out;
}

module.exports = { toSearchText, parseQuery, matchSnapshot, searchSnapshots };
