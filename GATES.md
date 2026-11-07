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
Reporter JSON în CHECK-uri (fără coduri ANSI, numărători deterministe).

- [x] G1: Backend listă pe tot proiectul — store.listAllSnapshots(dir) returnează toate
  snapshot-urile grupate pe document (fără html, _backup și fișierele deteriorate excluse),
  demonstrat prin teste noi pe proiecte temporare.
  CHECK: npx vitest run tests/snapshotManager.test.js --reporter=json
  EXPECT: /"numTotalTests":11,"numPassedTests":11,"numFailedTests":0/
  EVIDENCE: automatic-evidence=v1; definition-sha256=89e1e15fe67187ae818d2307741784bded4910a155c093f9ee866129f9dd5e3d; exit=0; EXPECT=matched; output-sha256=75e3cc86cee80eb66a87f111793a54e40e34401d525a092c4381ed1044ec3c82; output-bytes=4428; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t26; path=a68386b800d3/59 entries

- [x] G2: Căutare pe tot proiectul — lib/snapshotSearch.cjs (+ oglinda ESM src/lib/snapshotSearch.js
  pentru mockApi/webApi) găsește după titlu, text și dată ISO, plain sau regex, regex invalid
  semnalat ca eroare, _backup niciodată; fără html în rezultate.
  CHECK: npx vitest run tests/snapshotManager.test.js --reporter=json
  EXPECT: /"numTotalTests":11,"numPassedTests":11,"numFailedTests":0/
  EVIDENCE: automatic-evidence=v1; definition-sha256=89e1e15fe67187ae818d2307741784bded4910a155c093f9ee866129f9dd5e3d; exit=0; EXPECT=matched; output-sha256=88a522fad2f1fac970b9437879150352e6a96503448a8a7168905bb9bb1b75cc; output-bytes=4415; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t26; path=a68386b800d3/59 entries

- [x] G3: Ștergere în masă — store.deleteSnapshots(dir, [{id,file}]) șterge exact perechile
  cerute, sare perechile invalide și fișierele lipsă, returnează numărul real; nu atinge
  docs/, notes/ sau project.json.
  CHECK: npx vitest run tests/snapshotManager.test.js --reporter=json
  EXPECT: /"numTotalTests":11,"numPassedTests":11,"numFailedTests":0/
  EVIDENCE: automatic-evidence=v1; definition-sha256=89e1e15fe67187ae818d2307741784bded4910a155c093f9ee866129f9dd5e3d; exit=0; EXPECT=matched; output-sha256=fbc8825f221e01630f2e06a89942b7b1bbbed8c835daacf536ba922039b877b2; output-bytes=4391; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t26; path=a68386b800d3/59 entries

- [x] G4: Handler-e IPC + preload + mockApi + webApi — snap:listAll, snap:search,
  snap:deleteMany, snap:export (dialog nativ de salvare, .html sau .txt după extensie)
  prezente în electron/main.cjs, electron/preload.cjs, src/lib/mockApi.js, src/lib/webApi.js;
  sintaxă validă în main.cjs și preload.cjs.
  CHECK: node --check electron/main.cjs && node --check electron/preload.cjs && node --check lib/snapshotSearch.cjs && node -e "const fs=require('fs');for(const f of ['electron/main.cjs','electron/preload.cjs']){const s=fs.readFileSync(f,'utf8');for(const ch of ['snap:listAll','snap:search','snap:deleteMany','snap:export'])if(!s.includes(ch))throw new Error(f+' lipsa '+ch)}for(const f of ['src/lib/mockApi.js','src/lib/webApi.js']){const s=fs.readFileSync(f,'utf8');for(const m of ['listAllSnapshots','searchSnapshots','deleteSnapshots','exportSnapshot'])if(!s.includes(m))throw new Error(f+' lipsa '+m)}console.log('T26 IPC ok')"
  EXPECT: T26 IPC ok
  EVIDENCE: automatic-evidence=v1; definition-sha256=65420cb74b2aa8af4492eebd97bf686f6d287733a24cf86254392af1ed29cca0; exit=0; EXPECT=matched; output-sha256=e57871dc8583c11213eac3d9b55fd9293fa33cd3a554e6c9956755afc050382c; output-bytes=11; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t26; path=a68386b800d3/59 entries

- [x] G5: UI — SnapshotManagerDialog rescris: căutare cu regex, grupuri document → snapshot-uri
  cu binder path, selecție Ctrl/Shift (multi-select), Delete = confirm + ștergere în masă,
  Exportă activ la exact 1 selectat, Compară deschide aceeași vedere de diff (SnapshotDiff).
  Teste jsdom pe componente.
  CHECK: npx vitest run tests/snapshotManagerDialog.test.js --reporter=json
  EXPECT: /"numTotalTests":15,"numPassedTests":15,"numFailedTests":0/
  EVIDENCE: automatic-evidence=v1; definition-sha256=97afaba0a5baf0c27a027c92720ae0de4a1a45118ecb0e4f704eaa828769b394; exit=0; EXPECT=matched; output-sha256=917c640e5e7fe794d907cca125054498b04cb6dc2d6c86c596b69b1201d17503; output-bytes=5988; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t26; path=a68386b800d3/59 entries

- [x] G6: Fără regresii la Inspector — SnapshotDiff extras din SnapshotsPane păstrează clasele
  .snap-preview.diff / .diff-level / .snap-next / .snap-count și navigarea ◀ ▶; testele
  existente de snapshot trec neschimbate.
  CHECK: npx vitest run tests/snapshotList.test.js tests/smallWindows.test.js --reporter=json
  EXPECT: /"numTotalTests":27,"numPassedTests":27,"numFailedTests":0/
  EVIDENCE: automatic-evidence=v1; definition-sha256=5fcf663b8cf14c4b00aace23c2d3b1d0c6fe337f519ffbc09732fe524e899829; exit=0; EXPECT=matched; output-sha256=04b91a0cc9a4ec32ca950d097faf2c4a7550bb00bd800c670f3dd31d511fc1ea; output-bytes=8467; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t26; path=a68386b800d3/59 entries

- [x] G7: i18n ro/en complet — fiecare cheie nouă ui.snap.* există în AMBLE blocuri (ro = uiRo,
  en = uiEn) din src/lib/i18n-ui.js.
  CHECK: node -e "const fs=require('fs');const s=fs.readFileSync('src/lib/i18n-ui.js','utf8');const ks=['ui.snap.search_hint','ui.snap.search_regex','ui.snap.search_regex_bad','ui.snap.search_no_hits','ui.snap.export','ui.snap.export_hint','ui.snap.exported','ui.snap.orphan_doc','ui.snap.manager_list','ui.snap.manager_results','ui.snap.search_hit_title','ui.snap.search_hit_text','ui.snap.search_hit_date'];const ro=s.indexOf('export const uiRo'),en=s.indexOf('export const uiEn');if(ro<0||en<0)throw new Error('blocuri ro/en negăsitate');const roB=s.slice(ro,en),enB=s.slice(en);for(const k of ks){if(!roB.includes('\"'+k+'\"'))throw new Error('ro lipsa '+k);if(!enB.includes('\"'+k+'\"'))throw new Error('en lipsa '+k)}console.log('T26 i18n ok')"
  EXPECT: T26 i18n ok
  EVIDENCE: automatic-evidence=v1; definition-sha256=9e33fdc31d50b4970ca8baed0a246be9446aba622ed9abb465d686d23270cbd3; exit=0; EXPECT=matched; output-sha256=84a3080428d3c2948243618559d9cd3f2bab7e2a88da601df22a67b637c4f7fe; output-bytes=12; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t26; path=a68386b800d3/59 entries

- [x] G8: Suita integrală verde (170+ fișiere, 0 eșuate).
  CHECK: npx vitest run --reporter=json
  EXPECT: /"numTotalTests":1820,"numPassedTests":1816,"numFailedTests":0/
  EVIDENCE: automatic-evidence=v1; definition-sha256=9edb0adcf37a023247f212e6cc3dcb21bc64311f59dda739451d1de28a718280; exit=0; EXPECT=matched; output-sha256=530ee4f71f27df3f3d18b87f98c4c1ebb4a5b17d8cee01a8c4757cea2be57ebc; output-bytes=585260; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t26; path=a68386b800d3/59 entries

- [x] G9: Build production OK.
  CHECK: npx vite build
  EXPECT: /built in/
  EVIDENCE: automatic-evidence=v1; definition-sha256=202b6423274a1e776d6ddcc8d133917c5c706a45d1cd69c285f24b4a854abbd3; exit=0; EXPECT=matched; output-sha256=df5348289ae61c9acbe7bbe3f8f673fb4326b886ba95534d4f89455a029b2eec; output-bytes=868; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t26; path=a68386b800d3/59 entries

- [x] G10: E2E Electron verde.
  CHECK: cmd /c "set PLAYWRIGHT_PATH=C:/Users/Ionut/Documents/Scriptorium/node_modules/playwright/index.js&& node tests/e2e/electron.e2e.cjs"
  EXPECT: /E2E OK/
  EVIDENCE: automatic-evidence=v1; definition-sha256=103a37575ec782d55570c4ead35f86f44270fba542dc781d488e0501d448f780; exit=0; EXPECT=matched; output-sha256=931ca8b1c967bdb4495312d96bb156cb8009ba0f4b553f8e82cf4ff34283471d; output-bytes=802; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t26; path=a68386b800d3/59 entries

- [x] G11: E2E browser manager nou — tests/e2e/browser/snapshots.cjs actualizat la DOM-ul nou
  și verde contra `npx vite preview --port 4183` (necesită preview pornit).
  CHECK: node tests/e2e/browser/snapshots.cjs
  EXPECT: /all passing/
  EVIDENCE: automatic-evidence=v1; definition-sha256=9c7151b7c41b673d29e1a72489d866b27adcd27c65195cdf78f00883c93bcfbe; exit=0; EXPECT=matched; output-sha256=cc1a5871e9af35df623dbd8015034bb295e152b4d9000964b13e8889094069a4; output-bytes=1148; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t26; path=a68386b800d3/59 entries

- [x] G12: Commit-uri mici pe feat/adl-t26, mesaje în română cu prefixul „P1 #26:", fără push.
  CHECK: git -C "C:/Users/Ionut/Documents/Scriptorium-wt-t26" log --oneline origin/main..HEAD
  EXPECT: /P1 #26/
  EVIDENCE: automatic-evidence=v1; definition-sha256=4f7fa5b01c4561d7b279aa4cd5fea16be5ce9916901bad7a923d84f52ae3abcb; exit=0; EXPECT=matched; output-sha256=5ee36052fab7f2617203bd98da190aa7fd9a5b20434788d0f304c5d65302c196; output-bytes=600; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t26; path=a68386b800d3/59 entries
# Gates: ADL T8 — MediaView / Image viewer → suprafață `image.viewer.<assetId>` pe motorul de focus

OWNS: src/lib/focusMediaView.js, src/components/MediaView.jsx, src/components/ImageViewer.jsx, src/App.jsx, tests/focusImageViewer.test.js, GATES.md

Scope: Când utilizatorul deschide o imagine/medie (MediaView în panoul principal sau în split),
viewer-ul devine suprafață activă pe motorul de focus — `image.viewer.<assetId>` (assetId =
`media.file`, sufixul `:split` pentru instanța din panoul split) — push la deschidere, pop +
unregister pe fiecare cale de închidere (butonul de închidere al panoului split, Escape prin
motor, închiderea/schimbarea documentului, unmount), focus real la activare (armat ca la T4,
fără furt la restaurarea proiectului), comutare sibling cu vederea de dedesubt (modelul
inspector din App.jsx, T4/T7), comenzi locale zoomIn/zoomOut/close/escape pe suprafață; fără
motor → comportament neatins. TDD, branch feat/adl-t8, fără push.

- [x] G1: Modulul pur `src/lib/focusMediaView.js` (id + înregistrare cu contractul panourilor T4) —
  EVIDENCE: automatic-evidence=v1; definition-sha256=c4c6b74a1550cdf9f68572e063a4e413273ea18c03f1553f5c0fe1b4d077a5d7; exit=0; EXPECT=matched; output-sha256=2573854d976e5ae1987ffa41489bfd4a3a47d1ce51e1b34c335f0ce6a84c836d; output-bytes=2404; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t8; path=a68386b800d3/59 entries
  testele sale trec (RED confirmat înainte de implementare: importul eșua).
  CHECK: node -e "process.env.NO_COLOR='1'; require('child_process').execSync('npx vitest run tests/focusImageViewer.test.js', {stdio: 'inherit'});"
  EXPECT: /Test Files\s+1 passed \(1\)/

- [x] G2: MediaView montat + cablarea în App (înregistrare/pop/unmount, Escape → onClose pe split,
  EVIDENCE: automatic-evidence=v1; definition-sha256=4b77fb2972c3e2d7b132d063aeb5faa74780369ba76971bf15b820dfda0945b0; exit=0; EXPECT=matched; output-sha256=8a14309baa9fec51d42200c180696d02987495931d6bcb2cb074646b9b2852b2; output-bytes=2404; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t8; path=a68386b800d3/59 entries
  switchFocus sibling, „fără motor" neatins, pane="split" + onClose + focusArmed la sursă).
  CHECK: node -e "process.env.NO_COLOR='1'; require('child_process').execSync('npx vitest run tests/focusImageViewer.test.js', {stdio: 'inherit'});"
  EXPECT: /Tests\s+20 passed/

- [x] G3: Suprafața media nu regresează panourile T4/T7 și restul punților de focus.
  CHECK: node -e "process.env.NO_COLOR='1'; require('child_process').execSync('npx vitest run tests/focusSplit.test.js tests/focusQuickRef.test.js tests/focusViews.test.js tests/focusMenus.test.js tests/focusDialogs.test.js', {stdio: 'inherit'});"
  EXPECT: /Test Files\s+5 passed \(5\)/
  EVIDENCE: automatic-evidence=v1; definition-sha256=db5f0f0af6853a52406be7c17c0deb94112aff7de90e452dda4d49a2972c065d; exit=0; EXPECT=matched; output-sha256=659b076e0bf0ca027efb2df3fe62c0eb2d092d5462d878dabf8595e3178c5b1e; output-bytes=648; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t8; path=a68386b800d3/59 entries

- [x] G4: Suita completă rămâne verde (baseline aba7442: 169 fișiere / 1790 trecute | 4 skip; după
  EVIDENCE: automatic-evidence=v1; definition-sha256=70683df3dddb9c97bbb0aa8612ff4d31596b9e3a5679148e9e7334b59cff5795; exit=0; EXPECT=matched; output-sha256=09c4f77cffc00bf275f45d0bfbbddd7d18186d2cee8092c60d76b78c4846b82a; output-bytes=31390; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t8; path=a68386b800d3/59 entries
  T8 aștept 170 / 1810 | 4 skip — +1 fișier, +20 teste, 0 regresii).
  CHECK: node -e "process.env.NO_COLOR='1'; require('child_process').execSync('npx vitest run', {stdio: 'inherit'});"
  EXPECT: /Tests\s+1810 passed \| 4 skipped/

- [x] G5: Build de producție reușit.
  CHECK: npx vite build
  EXPECT: built in
  EVIDENCE: automatic-evidence=v1; definition-sha256=eb7927ff401164e9130a88dab7901297d5f77cb289dcb3369ac86d4469033452; exit=0; EXPECT=matched; output-sha256=2e17638bb44a84bf460b1e45b24188a7961716ccefcf970e377d988029708bf7; output-bytes=868; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t8; path=a68386b800d3/59 entries

- [x] G6: E2E Electron integral (inclusiv crearea proiectului — garda #310 a lui T4).
  CHECK: node -e "process.env.PLAYWRIGHT_PATH='C:/Users/Ionut/Documents/Scriptorium/node_modules/playwright/index.js'; require('./tests/e2e/electron.e2e.cjs');"
  EXPECT: E2E OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=c4ae94e4fac418756b110a149529c92699b10598184db80696ef66ba435cc3d8; exit=0; EXPECT=matched; output-sha256=e6a28d622d811d24bece1ca7da17b6c02609ae0fa37328c198f39b7fc3b330d2; output-bytes=802; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t8; path=a68386b800d3/59 entries

Note (evidență măsurată manual, din rulările din această sesiune):
- G1/G2: 1 fișier, 20 teste — 9 modul, 3 cablare App, 7 componentă montată, 1 handle ImageViewer.
- G3: 5 fișiere / 60 teste trecute.
- G4: după T8 — 170 passed (170), 1810 passed | 4 skipped (1814).
- G5: „✓ built in 3.49s"; warning-ul de chunk size e preexistent.
- G6: „E2E OK", errors: [] — proiect nou, meniu nativ complet, compile DOCX/PDF/EPUB, export +
  re-import .scriv, print preview, typing kept on close: true; rulat de două ori (înainte și după
  rafinarea hand-back-ului App pentru .media-view), ambele verzi.
- Lecția T4 respectată: singurul hook nou din App (mediaFocusArmed, useRef) stă lângă
  splitFocusArmed, deasupra returnărilor !settings/!project; E2E crearea-proiect trece (G6).
