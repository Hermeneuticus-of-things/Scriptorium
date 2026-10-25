// "Nothing missed" coverage check: every reference label from the classic program's binary catalogue
// (scriv-strings.tsv: ctx, EN, RO) vs Scribner's own label set (its i18n files, RO+EN). Surfaces classic
// labels with no Scribner match, grouped by component — the candidate missing features to implement
// (in Scribner's OWN code). References are read 1:1; the implementation stays independent.
// Usage: node coverage.cjs <scriv-strings.tsv>
const fs = require('fs');
const path = require('path');

const norm = (s) => String(s || '')
  .replace(/&/g, '').replace(/\.\.\.|…/g, '').replace(/\(.*?\)/g, '')
  .replace(/%\d+|%L?\d+/g, '').toLowerCase()
  .replace(/[^a-z0-9ăâîșțäöü ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Scribner's own labels: all quoted string values in its i18n files (ro + en blocks).
function scribnerLabels() {
  const set = new Set();
  for (const f of ['src/lib/i18n-ui.js', 'src/lib/i18n.js']) {
    const txt = fs.readFileSync(f, 'utf8');
    for (const m of txt.matchAll(/:\s*'((?:[^'\\]|\\.)*)'/g)) set.add(norm(m[1].replace(/\\'/g, "'")));
    for (const m of txt.matchAll(/:\s*"((?:[^"\\]|\\.)*)"/g)) set.add(norm(m[1]));
  }
  set.delete('');
  return set;
}
const tok = (s) => new Set(s.split(' ').filter((w) => w.length > 3));
function covered(n, set, index) {
  if (!n) return true;
  if (set.has(n)) return true;
  // token overlap ≥ 0.6 against any Scribner label that shares a rare token
  const T = tok(n); if (!T.size) return set.has(n);
  let best = 0;
  for (const w of T) { const cand = index.get(w); if (!cand) continue; for (const c of cand) { let k = 0; for (const x of T) if (c.has(x)) k++; best = Math.max(best, k / Math.max(T.size, c.size)); } }
  return best >= 0.6;
}

const tsv = process.argv[2];
const scrib = scribnerLabels();
const index = new Map();
for (const lab of scrib) { for (const w of tok(lab)) { if (!index.has(w)) index.set(w, []); index.get(w).push(tok(lab)); } }

// Noise contexts: not UI features (country/locale lists, colour names, licensing/marketing/trial,
// error dialogs, internal strings, and the shortcut-scheme list which just mirrors the menu actions).
const SKIP = new Set(['SCRLocale', 'SCRColors', 'QObject', 'SCRShortcutScheme', 'SCRShortcut', 'SCRMessageBox',
  'SCRBuyDialog', 'SCRTrialManager', 'SCREsellerate', 'SCRNaNoWriMoWebManager', 'SCRProjectModel', 'STextTransform',
  'SCRSelectionMgr', 'SCRMobileSyncController', 'SCRProjectManager']);
const byCtx = new Map();
let total = 0, miss = 0;
for (const line of fs.readFileSync(tsv, 'utf8').split(/\r?\n/)) {
  if (!line) continue;
  const [ctx, en, ro] = line.split('\t');
  if (SKIP.has(ctx)) continue;
  const nEn = norm(en), nRo = norm(ro);
  // skip pure punctuation/format/very short/dynamic/HTML/paths
  if (nEn.length < 4 || /^[\d.\s]+$/.test(en) || /[<>%\\]|http|\.qm$|'%1'/.test(en)) continue;
  total++;
  // match on English (the program's own language) first, then Romanian as a fallback
  if (covered(nEn, scrib, index) || covered(nRo, scrib, index)) continue;
  miss++;
  if (!byCtx.has(ctx)) byCtx.set(ctx, []);
  byCtx.get(ctx).push(ro && ro.length > 1 ? ro : en);
}
const rows = [...byCtx.entries()].sort((a, b) => b[1].length - a[1].length);
console.error(`${miss}/${total} etichete fără corespondent evident în Scribner`);
for (const [ctx, labs] of rows) {
  console.log(`\n## ${ctx} (${labs.length})`);
  for (const l of [...new Set(labs)].slice(0, 14)) console.log('  - ' + l);
}
