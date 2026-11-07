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
