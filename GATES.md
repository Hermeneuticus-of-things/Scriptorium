# Gates: ADL T27 — Selectarea și navigarea după stil (Scrivener §17.4.1, P1 #27)

OWNS: src/lib/styleNavigation.js, tests/styleNavigation.test.js, src/components/Editor.jsx, src/components/FormatBar.jsx, src/components/StylesPanel.jsx, src/App.jsx, src/lib/menuLayout.js, src/lib/i18n.js, GATES.md

Scope: În editor, la cursor pe un paragraf cu stil identificabil (styleName numit sau heading
fără stil → „heading:<nivel>”), patru comenzi noi în registry: `selectStyleRange` (intervalul
contiguu de paragrafe cu același stil), `nextInSameStyle` / `prevInSameStyle` (următorul /
precedentul cu același stil, ciclic), `selectAllWithStyle` (de la primul la ultimul cu stilul
dat — decizie de paritate documentată, ca în Scrivener). Logica pură în `src/lib/styleNavigation.js`
(testabilă fără editor), expusă prin handle-ul Editor-ului, meniul Format (submenu „Navigare
după stil”), meniul „Stil” din FormatBar și butoane ⮃⮁ + „selectează tot” în panoul de stiluri;
disabled când cursorul nu e pe un paragraf cu stil identificabil; i18n ro/en. TDD, branch
feat/adl-t27, fără push.

- [x] G1: Modulul pur `src/lib/styleNavigation.js` (paraStyleId, textblocks, styleRangeAt,
  EVIDENCE: automatic-evidence=v1; definition-sha256=074abbe241b10f72a4ae2e778555a76c57aa7769c59f6d5b40c96a0d6b778757; exit=0; EXPECT=matched; output-sha256=4bfb0328dc4cd504218d9550cc6ecbd38c2bd76df10cda1dec39d40dfd5003f6; output-bytes=278; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t27; path=a68386b800d3/59 entries
  nextStyleBlock, prevStyleBlock, allStyleRange, hasIdentifiableStyle) — testele sale trec
  (RED confirmat înainte de implementare: importul eșua).
  CHECK: node -e "process.env.NO_COLOR='1'; require('child_process').execSync('npx vitest run tests/styleNavigation.test.js', {stdio: 'inherit'});"
  EXPECT: /Test Files\s+1 passed \(1\)/

- [x] G2: Cablarea: comenzi în registry-ul din App (grupa format, disabled din starea de stil
  EVIDENCE: automatic-evidence=v1; definition-sha256=a55cad62cbd051a7470e0fbf0622df4e72f63305f48d2a9591631da1c934d5ab; exit=0; EXPECT=matched; output-sha256=65f054e22780733fd77c010e70b69da5338fa16d6cef877dc3798b83d99924e1; output-bytes=318; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t27; path=a68386b800d3/59 entries
  la cursor), handle Editor (4 metode care citesc starea la momentul apelului), submenu
  „menu.styleNav” în menuLayout, intrări în FormatBar și StylesPanel, i18n ro/en complet.
  CHECK: node -e "process.env.NO_COLOR='1'; require('child_process').execSync('npx vitest run tests/styleNavigation.test.js tests/i18n.test.js', {stdio: 'inherit'});"
  EXPECT: /Tests\s+30 passed/

- [x] G3: Nicio regresie pe registre, meniuri, editor și stiluri (zonele atinse).
  CHECK: node -e "process.env.NO_COLOR='1'; require('child_process').execSync('npx vitest run tests/commands.test.js tests/menuTiers.test.js tests/menuDedupe.test.js tests/g5classic.test.js', {stdio: 'inherit'});"
  EXPECT: /Test Files\s+4 passed \(4\)/
  EVIDENCE: automatic-evidence=v1; definition-sha256=5a188cc89d57fc6522a2feab9dba781b1b7f184fe67796b06e82949969d5d8ea; exit=0; EXPECT=matched; output-sha256=4903569205fba8e63f46bf4d85112b28569aa45e7cc833011ac5c6f2d4618850; output-bytes=405; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t27; path=a68386b800d3/59 entries

- [x] G4: Suita completă rămâne verde (baseline măsurat: 170 fișiere / 1810 trecute | 4 skip;
  EVIDENCE: automatic-evidence=v1; definition-sha256=118714a421f479f4b00c84dfcb2332e4c375a82c280fb53857f9a7c3f9aa4e7d; exit=0; EXPECT=matched; output-sha256=3a1b41e3800ef05660a87cb12e86cb72b2e64b535875cc90f26f0cec73ccab5d; output-bytes=31328; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t27; path=a68386b800d3/59 entries
  după T27: 171 fișiere / 1835 trecute | 4 skip — +1 fișier, +25 teste, 0 regresii).
  CHECK: node -e "process.env.NO_COLOR='1'; require('child_process').execSync('npx vitest run', {stdio: 'inherit'});"
  EXPECT: /Tests\s+1835 passed/

- [x] G5: Build de producție reușit.
  CHECK: npx vite build
  EXPECT: built in
  EVIDENCE: automatic-evidence=v1; definition-sha256=eb7927ff401164e9130a88dab7901297d5f77cb289dcb3369ac86d4469033452; exit=0; EXPECT=matched; output-sha256=6322374d1c2608615b25729dd574584957dbc695f5f96f291a0428cec59df9c6; output-bytes=868; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t27; path=a68386b800d3/59 entries

- [x] G6: E2E Electron integral (garda lecției #310 — hook-ul nou din App rămâne deasupra
  EVIDENCE: automatic-evidence=v1; definition-sha256=c4ae94e4fac418756b110a149529c92699b10598184db80696ef66ba435cc3d8; exit=0; EXPECT=matched; output-sha256=3fddaea48a7213f634d6dd7b49e23d0073ae2ed4c37ba3eb563878d97bd5fdda; output-bytes=802; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t27; path=a68386b800d3/59 entries
  returnărilor timpurii).
  CHECK: node -e "process.env.PLAYWRIGHT_PATH='C:/Users/Ionut/Documents/Scriptorium/node_modules/playwright/index.js'; require('./tests/e2e/electron.e2e.cjs');"
  EXPECT: E2E OK
