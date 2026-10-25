// Compares two menus.json captures (reference program vs Scribner, both in English) item by item:
// missing items, items in another menu, shortcut differences, enabled/checked differences.
// Matching is deterministic: normalized label, then aliases.json, then token overlap ≥ 0.75.
// Usage: node scripts/ui-audit/menu-diff.cjs <ref/menus.json> <scribner/menus.json> [--md]
const fs = require('fs');
const path = require('path');

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const ALIASES = fs.existsSync(path.join(__dirname, 'aliases.json')) ? read(path.join(__dirname, 'aliases.json')) : {};

const norm = (s) => String(s || '').toLowerCase().replace(/\.\.\.|…/g, '').replace(/\(.*?\)/g, '').replace(/[^a-z0-9ăâîșț ]+/g, ' ').replace(/\s+/g, ' ').trim();
// OCR reads "Ctrl O" or "Ctrl + p" for "Ctrl+O"; both sides end up as "ctrl+o"
const normKey = (k) => String(k || '').replace(/\s*\+\s*/g, '+').trim().replace(/\s+/g, '+').toLowerCase().replace(/\+l$/, '+i');

function flat(menu, trail = [], out = []) {
  for (const it of menu.children || []) {
    if (it.role === 'Separator') { out.push({ sep: true, trail }); continue; }
    const p = [...trail, it.name];
    out.push({ name: it.name, n: norm(it.name), path: p, top: p[0], key: normKey(it.key), enabled: it.enabled !== false, checked: it.toggle === 'On', sub: Boolean(it.children && it.children.length) || it.submenu });
    if (it.children) flat(it, p, out);
  }
  return out;
}
const tokens = (s) => new Set(s.split(' ').filter((w) => w.length > 2));
function overlap(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let k = 0; for (const w of A) if (B.has(w)) k++;
  return k / Math.max(A.size, B.size);
}
function match(ref, items) {
  const alias = ALIASES[ref.path.join(' > ')] ?? ALIASES[ref.n];
  if (alias === null) return { skip: true };
  const want = alias ? [norm(alias)] : [ref.n];
  const exact = items.filter((i) => want.includes(i.n));
  if (exact.length) return exact.find((i) => norm(i.top) === norm(ref.top)) || exact[0];
  let best = null, score = 0;
  for (const i of items) { const s = overlap(ref.n, i.n); if (s > score) { best = i; score = s; } }
  return score >= 0.75 ? best : null;
}

function diff(refMenu, newMenu) {
  const R = flat(refMenu).filter((x) => !x.sep), N = flat(newMenu).filter((x) => !x.sep);
  const rows = [];
  for (const r of R) {
    const m = match(r, N);
    if (m && m.skip) continue;
    const where = r.path.join(' > ');
    if (!m) { rows.push({ kind: 'lipsă', where, detail: r.key ? `scurtătură ${r.key}` : '' }); continue; }
    if (norm(m.top) !== norm(r.top)) rows.push({ kind: 'alt meniu', where, detail: `e în ${m.path.join(' > ')}` });
    if (r.key && r.key !== m.key) rows.push({ kind: 'scurtătură', where, detail: `${r.key} ≠ ${m.key || '(fără)'}` });
    if (r.enabled !== m.enabled) rows.push({ kind: 'stare', where, detail: `${r.enabled ? 'activ' : 'inactiv'} ≠ ${m.enabled ? 'activ' : 'inactiv'}` });
    if (r.checked !== m.checked) rows.push({ kind: 'bifă', where, detail: `${r.checked ? 'bifat' : 'nebifat'} ≠ ${m.checked ? 'bifat' : 'nebifat'}` });
  }
  // order of top-level menus
  const ro = (refMenu.children || []).map((m) => norm(m.name)), no = (newMenu.children || []).map((m) => norm(m.name));
  if (ro.join('|') !== no.filter((x) => ro.includes(x)).join('|')) rows.unshift({ kind: 'ordine', where: 'bara de meniu', detail: `${(newMenu.children || []).map((m) => m.name).join(', ')}` });
  return rows;
}
module.exports = { diff, norm, normKey, flat };
if (require.main === module) {
  const rows = diff(read(process.argv[2]), read(process.argv[3]));
  if (process.argv.includes('--md')) for (const r of rows) console.log(`- [ ] **${r.kind}** — ${r.where}${r.detail ? `: ${r.detail}` : ''}`);
  else console.log(rows.map((r) => `${r.kind}\t${r.where}\t${r.detail}`).join('\n'));
  console.error(`${rows.length} diferențe`);
}
