// Generic deterministic diff of two captured scenes (any window/dialog/panel), classic vs Scribner.
// Flattens both trees (flatten.cjs), matches elements by role + normalized name (+ aliases.json),
// and reports: missing (in classic, absent in Scribner), extra (only in Scribner), shortcut/state/value
// differences, and order of same-role siblings. Output feeds the per-scene judgment agents.
// Usage: node element-diff.cjs <classicDir> <scribnerDir> [--json]
//   dirs hold scene*.json / tab*.json / insp*.json / ctx-*.json from one scene; all are merged.
const fs = require('fs');
const path = require('path');
const { flatten } = require('./flatten.cjs');

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const ALIASES = fs.existsSync(path.join(__dirname, 'aliases.json')) ? read(path.join(__dirname, 'aliases.json')) : {};
const norm = (s) => String(s || '').toLowerCase().replace(/\.\.\.|…/g, '').replace(/\(.*?\)/g, '').replace(/[^a-z0-9ăâîșț ]+/g, ' ').replace(/\s+/g, ' ').trim();
const CHROME = /^(file|edit|insert|view|navigate|project|documents|format|window|help|tools|ai|fișier|editare|vizualizare)$/;

function elements(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'menus.json');
  const seen = new Map();
  for (const f of files) {
    let tree;
    try { tree = read(path.join(dir, f)); } catch { continue; }
    for (const ln of flatten(tree)) {
      // flatten returns "  role | name | key | off | checked | = value"
      const parts = ln.trim().split(' | ');
      const role = parts[0];
      const name = parts[1] || '';
      if (!name || role === 'Separator') continue;
      const n = norm(name);
      if (!n || CHROME.test(n)) continue; // the shared menu bar is compared by menu-diff, not here
      const key = (parts.find((p) => /ctrl|alt|shift|win|f\d/i.test(p)) || '').toLowerCase().replace(/\s*\+\s*/g, '+');
      const k = `${role}::${n}`;
      if (!seen.has(k)) seen.set(k, { role, name, n, key, off: parts.includes('off'), checked: parts.includes('checked'), value: (parts.find((p) => p.startsWith('= ')) || '').slice(2) });
    }
  }
  return [...seen.values()];
}
const tok = (s) => new Set(s.split(' ').filter((w) => w.length > 2));
function overlap(a, b) { const A = tok(a), B = tok(b); if (!A.size || !B.size) return 0; let k = 0; for (const w of A) if (B.has(w)) k++; return k / Math.max(A.size, B.size); }
function match(r, items) {
  const alias = ALIASES[r.n];
  if (alias === null) return { skip: true };
  const want = alias ? norm(alias) : r.n;
  let best = items.find((i) => i.n === want && i.role === r.role) || items.find((i) => i.n === want);
  if (best) return best;
  let score = 0; for (const i of items) { const s = overlap(want, i.n); if (s > score) { best = i; score = s; } }
  return score >= 0.78 ? best : null;
}
function diff(classicDir, scribnerDir) {
  const R = elements(classicDir), N = elements(scribnerDir);
  const rows = [];
  const used = new Set();
  for (const r of R) {
    const m = match(r, N);
    if (m && m.skip) continue;
    if (!m) { rows.push({ kind: 'lipsă', el: `${r.role} "${r.name}"`, detail: r.key ? `scurtătură ${r.key}` : '' }); continue; }
    used.add(`${m.role}::${m.n}`);
    if (r.key && m.key && r.key !== m.key) rows.push({ kind: 'scurtătură', el: `${r.role} "${r.name}"`, detail: `${r.key} ≠ ${m.key}` });
    if (r.key && !m.key) rows.push({ kind: 'scurtătură', el: `${r.role} "${r.name}"`, detail: `${r.key} ≠ (fără)` });
    if (r.off !== m.off) rows.push({ kind: 'stare', el: `${r.role} "${r.name}"`, detail: `${r.off ? 'inactiv' : 'activ'} ≠ ${m.off ? 'inactiv' : 'activ'}` });
    if (r.checked !== m.checked) rows.push({ kind: 'bifă', el: `${r.role} "${r.name}"`, detail: `${r.checked ? 'bifat' : 'nebifat'} ≠ ${m.checked ? 'bifat' : 'nebifat'}` });
    if (r.value && m.value && norm(r.value) !== norm(m.value)) rows.push({ kind: 'valoare', el: `${r.role} "${r.name}"`, detail: `${r.value} ≠ ${m.value}` });
  }
  return { rows, classicCount: R.length, scribnerCount: N.length, matched: used.size };
}
module.exports = { diff, elements };
if (require.main === module) {
  const r = diff(process.argv[2], process.argv[3]);
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else { for (const x of r.rows) console.log(`${x.kind}\t${x.el}\t${x.detail}`); console.error(`${r.rows.length} diferențe; clasic ${r.classicCount}, scribner ${r.scribnerCount}, potrivite ${r.matched}`); }
}
