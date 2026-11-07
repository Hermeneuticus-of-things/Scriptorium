# Gates: P1 #26 — Snapshots Manager pe tot proiectul (feat/adl-t26)

OWNS: lib/store.cjs, lib/snapshotSearch.cjs, electron/main.cjs, electron/preload.cjs,
src/lib/mockApi.js, src/lib/webApi.js, src/lib/snapshotSearch.js, src/lib/snapshotList.js,
src/components/SnapshotManagerDialog.jsx, src/components/SnapshotDiff.jsx, src/components/SnapshotsPane.jsx,
src/lib/i18n-ui.js, src/App.jsx, src/styles.css, tests/snapshotManager.test.js,
tests/snapshotManagerDialog.test.js, tests/e2e/browser/snapshots.cjs, tests/e2e/browser/scratchpad-small-windows.cjs

Scope: paritate cu Scrivener 3.1.6 §15.8.4 — Snapshots Manager pe tot proiectul: listă grupată
pe document (arbore document → snapshot-uri, cu binder path), căutare nume/text/dată cu regex,
ștergere în masă (Ctrl/Shift) cu confirmare, export .html/.txt prin dialog nativ, comparare
reutilizată din Inspector. Fără schimbarea formatului de proiect (doar citire/ștergere în snapshots/).

- [ ] G1: Backend listă pe tot proiectul — store.listAllSnapshots(dir) returnează toate
  snapshot-urile grupate pe document (fără html, _backup și fișierele deteriorate excluse),
  demonstrat prin teste noi pe proiecte temporare.
  CHECK: npx vitest run tests/snapshotManager.test.js
  EXPECT: /Test Files\s+1 passed/

- [ ] G2: Căutare pe tot proiectul — lib/snapshotSearch.cjs (+ oglinda ESM src/lib/snapshotSearch.js
  pentru mockApi/webApi) găsește după titlu, text și dată ISO, plain sau regex, regex invalid
  semnalat ca eroare, _backup niciodată; fără html în rezultate.
  CHECK: npx vitest run tests/snapshotManager.test.js
  EXPECT: /Test Files\s+1 passed/

- [ ] G3: Ștergere în masă — store.deleteSnapshots(dir, [{id,file}]) șterge exact perechile
  cerute, sare perechile invalide și fișierele lipsă, returnează numărul real; nu atinge
  docs/, notes/ sau project.json.
  CHECK: npx vitest run tests/snapshotManager.test.js
  EXPECT: /Test Files\s+1 passed/

- [ ] G4: Handler-e IPC + preload + mockApi + webApi — snap:listAll, snap:search,
  snap:deleteMany, snap:export (dialog nativ de salvare, .html sau .txt după extensie)
  prezente în electron/main.cjs, electron/preload.cjs, src/lib/mockApi.js, src/lib/webApi.js;
  sintaxă validă în main.cjs și preload.cjs.
  CHECK: node --check electron/main.cjs && node --check electron/preload.cjs && node --check lib/snapshotSearch.cjs && node -e "const fs=require('fs');for(const f of ['electron/main.cjs','electron/preload.cjs','src/lib/mockApi.js','src/lib/webApi.js']){const s=fs.readFileSync(f,'utf8');for(const ch of ['snap:listAll','snap:search','snap:deleteMany','snap:export'])if(!s.includes(ch))throw new Error(f+' lipsa '+ch)}console.log('T26 IPC ok')"
  EXPECT: T26 IPC ok

- [ ] G5: UI — SnapshotManagerDialog rescris: căutare cu regex, grupuri document → snapshot-uri
  cu binder path, selecție Ctrl/Shift (multi-select), Delete = confirm + ștergere în masă,
  Exportă activ la exact 1 selectat, Compară deschide aceeași vedere de diff (SnapshotDiff).
  Teste jsdom pe componente.
  CHECK: npx vitest run tests/snapshotManagerDialog.test.js
  EXPECT: /Test Files\s+1 passed/

- [ ] G6: Fără regresii la Inspector — SnapshotDiff extras din SnapshotsPane păstrează clasele
  .snap-preview.diff / .diff-level / .snap-next / .snap-count și navigarea ◀ ▶; testele
  existente de snapshot trec neschimbate.
  CHECK: npx vitest run tests/snapshotList.test.js tests/smallWindows.test.js tests/inspector.test.js tests/p11.test.js 2>nul; npx vitest run tests/snapshotList.test.js tests/smallWindows.test.js
  EXPECT: /Test Files\s+\d+ passed/

- [ ] G7: i18n ro/en complet — fiecare cheie nouă ui.snap.* există în AMBLE blocuri (ro + en)
  din src/lib/i18n-ui.js.
  CHECK: node -e "const fs=require('fs');const s=fs.readFileSync('src/lib/i18n-ui.js','utf8');const ks=['ui.snap.search_hint','ui.snap.search_regex','ui.snap.search_regex_bad','ui.snap.search_no_hits','ui.snap.export','ui.snap.export_hint','ui.snap.exported','ui.snap.orphan_doc','ui.snap.manager_list','ui.snap.manager_results','ui.snap.search_hit_title','ui.snap.search_hit_text','ui.snap.search_hit_date'];const ro=s.indexOf('const RO_UI'),en=s.indexOf('const EN_UI');if(ro<0||en<0)throw new Error('blocuri ro/en negăsitate');const roB=s.slice(ro,en),enB=s.slice(en);for(const k of ks){if(!roB.includes('\"'+k+'\"'))throw new Error('ro lipsa '+k);if(!enB.includes('\"'+k+'\"'))throw new Error('en lipsa '+k)}console.log('T26 i18n ok')"
  EXPECT: T26 i18n ok

- [ ] G8: Suita integrală verde (170+ fișiere, 0 eșuate).
  CHECK: npx vitest run
  EXPECT: /Test Files\s+\d+ passed \(\d+\)/

- [ ] G9: Build production OK.
  CHECK: npx vite build
  EXPECT: /built in/

- [ ] G10: E2E Electron verde.
  CHECK: cmd /c "set PLAYWRIGHT_PATH=C:/Users/Ionut/Documents/Scriptorium/node_modules/playwright/index.js&& node tests/e2e/electron.e2e.cjs"
  EXPECT: /all passing/

- [ ] G11: E2E browser manager nou — tests/e2e/browser/snapshots.cjs actualizat la DOM-ul nou
  și verde contra `npx vite preview --port 4183` (necesită preview pornit; rulat manual).
  CHECK: node tests/e2e/browser/snapshots.cjs
  EXPECT: /all passing/

- [ ] G12: Commit-uri mici pe feat/adl-t26, mesaje în română cu prefixul „P1 #26:", fără push.
  CHECK: git -C "C:/Users/Ionut/Documents/Scriptorium-wt-t26" log --oneline origin/main..HEAD
  EXPECT: /P1 #26/
