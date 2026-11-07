# Gates: ADL T28 — ToC static cu `<$p>` (P1 #28) + filtre include/exclude în Compile (P1 #29)

OWNS: src/lib/toc.js, lib/pageEstimate.cjs, lib/compile.cjs, src/components/CompileDialog.jsx,
src/lib/i18n-ui.js, src/App.jsx, src/styles.css, tests/toc.test.js,
tests/compilePageNumbers.test.js, tests/compileFilters.test.js, tests/compileT28Dialog.test.js

Scope: paritate cu Scrivener 3.1.6 §22.1–22.2 (P1 #28) și §23.4.1 (P1 #29).
#28: „Copy Documents as ToC" (text, titlu + indentare pe structura binder, `<$p>` pe documentele
text), evaluarea `<$p>` din titluri la compile/print/preview cu numărul paginii pe care cade
documentul (ESTIMARE documentată — compilerul nu paginează; PDF-ul se paginează în Chromium,
DOCX în Word), numere de pagină estimate în cuprinsul generat la ieșiri paginate.
#29: filtru de vizualizare în lista de conținut din CompileDialog (doar text / text+foldere /
toate + filtru pe etichete), afișarea excluderii în cascadă (dosar „fără compile" → copii excluși
automat — conceptul există deja în buildDocument), compilerul respectă include/exclude per item
(doar testat). Fără schimbări de format de proiect (câmpuri noi doar adăugitive, implicite neutre:
`compile.contentFilter`, `compile.contentLabel`). Ledger-ul anterior (T26/T27, verificat complet)
rămâne în istoricul git (`git show 538a050:GATES.md`); aici doar campania T28, ca să nu existe
ID-uri dublate.

- [x] G1: Modulul pur src/lib/toc.js — buildTocText(nodes, {selection}) produce text ToC cu
  EVIDENCE: automatic-evidence=v1; definition-sha256=f61a84ac1627f3e99ed3d677f91cad1ab8261535d3ca1c70021c3a7c1e60f759; exit=0; EXPECT=matched; output-sha256=55fd9ebaac17f9d6929f5c9f38e701c223ca78d298e8e5875e80fce7cc241b79; output-bytes=4536; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t28; path=a68386b800d3/59 entries
  indentare tab pe adâncime: dosar selectat → întregul subarbore (dosarul primul, adâncime 0),
  document text selectat → doar el, documentele text primesc `<$p>` după tab, coșul e sărit,
  selecție multiplă acceptată; evalPagePlaceholders(title, pageNo) înlocuiește `<$p>` multiplu,
  cu prefixe/sufixe, iar `<$p:fmt>` doar prin fmtFn dat; format necunoscut → rămâne neschimbat.
  CHECK: npx vitest run tests/toc.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [x] G2: Comanda „copyAsToC" — înregistrată în App.jsx în grupul „document", dezactivată fără
  EVIDENCE: automatic-evidence=v1; definition-sha256=f8e3e12d10ce79aa2c384940914a8e9e79455dc47f55f39b506d22d51636d1fb; exit=0; EXPECT=matched; output-sha256=5a1c35f848e1ae88a08176728c7d7a49eab2ec3c7be88ab666172123d586ff37; output-bytes=8116; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t28; path=a68386b800d3/59 entries
  selecție, rulează prin navigator.clipboard.writeText cu textul produs de buildTocText;
  intrare în meniul Documente (documentMenu); etichete cmd.copyAsToC + ui.app.toc_copiat în
  AMBLE blocurile i18n (uiRo și uiEn); analiza statică a meniurilor (menuTiers) rămâne verde.
  CHECK: npx vitest run tests/toc.test.js tests/menuTiers.test.js tests/menuDedupe.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [x] G3: Evaluarea `<$p>` la compile (estimare documentată) — lib/pageEstimate.cjs calculează
  EVIDENCE: automatic-evidence=v1; definition-sha256=dfc36a919910b55d136e5061901374fd4cce22fe874d594ff3ae2e761ec9deb6; exit=0; EXPECT=matched; output-sha256=7624041c6be825a3d056548cd2fe089b05dc33e85f39ce527634588b804fbb31; output-bytes=4777; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t28; path=a68386b800d3/59 entries
  pagina de start estimată per secțiune din dimensiunile paginii, margini, font, spațiere și
  marcă de pagină nouă (estimateStartPages(items, opts)); lib/compile.cjs aplică după
  buildDocument: `<$p>` din titlurile secțiunilor (prefix+titlu+sufix) și din subtitluri se
  înlocuiește cu pagina estimată a secțiunii, iar `<$p>` din corpul text cu pagina proprie a
  documentului; corpul reîncepe de la 1 după front matter când page.frontRoman (același
  comportament ca scriitorii DOCX/PDF); blocurile „Preserve Formatting" nu se ating.
  Teste pe estimator + pe buildDocument.
  CHECK: npx vitest run tests/compilePageNumbers.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [x] G4: Cuprinsul generat la compile arată numere de pagină estimate la ieșiri paginate —
  EVIDENCE: automatic-evidence=v1; definition-sha256=dfc36a919910b55d136e5061901374fd4cce22fe874d594ff3ae2e761ec9deb6; exit=0; EXPECT=matched; output-sha256=d1fa951ab7ae53bf8609920a020ffd71d66b3a19adc205781235bc035c7786ea; output-bytes=4773; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t28; path=a68386b800d3/59 entries
  tocHtml primește estPage per intrare și pentru target pdf (paged) cu settings.pageNumbers
  !== false redenerează numărul; DOCX păstrează câmpurile PAGEREF reale (neschimbat); fără
  numere la HTML nepaginat/preview.
  CHECK: npx vitest run tests/compilePageNumbers.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [x] G5: Filtre în lista de conținut din CompileDialog — rând de filtrare deasupra tabelului:
  EVIDENCE: automatic-evidence=v1; definition-sha256=603e0b564c84aa71b84bfb5de77fa094ffcd95cd9bbb4b1dd5b34107e99c493f; exit=0; EXPECT=matched; output-sha256=b67f3a5fc0de8805e30c88c6d3775e6af6285385518b2740efa85ad20251c7de; output-bytes=2530; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t28; path=a68386b800d3/59 entries
  filtru pe tip (toate / doar text / text+foldere) și filtru pe etichete (lista proiectului,
  „(toate)"); setările se persistă în project.compile (contentFilter, contentLabel, implicite
  neutre); rândurile sub un dosar cu includeInCompile=false apar ca excluse (clasă cd-excluded,
  bifă dezactivată + title explicativ); i18n ro/en pentru toate cheile noi; teste jsdom pe
  componentă.
  CHECK: npx vitest run tests/compileT28Dialog.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [x] G6: Compilarea respectă include/exclude (teste pe compiler) — documentul cu
  EVIDENCE: automatic-evidence=v1; definition-sha256=f612c1ea9bb30acc6522634a2b8f2e3090e6d6437eca0e1198d16f3a7ecbabb5; exit=0; EXPECT=matched; output-sha256=841bedfc208f44780e123216450f01a12a48b49e25b8d8ead8ea238a9a61d158; output-bytes=2761; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t28; path=a68386b800d3/59 entries
  includeInCompile=false nu intră în output, dosarul exclus își exclude automat copiii,
  ordinea din binder e păstrată pentru cele rămase, filterInvert (exclude ce corespunde) și
  filtrele pe etichete/status rămân corecte; scope explicit (selection/folder) nu se filtrează,
  ca înainte.
  CHECK: npx vitest run tests/compileFilters.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [x] G7: Fără regresii — întreaga suită vitest verde (0 eșuate; cele 4 skip existente înainte
  EVIDENCE: automatic-evidence=v1; definition-sha256=cba03d8853adc9b7900c0bb0c4a115b35b1b6ebed0cfd806929591b7f9d29096; exit=0; EXPECT=matched; output-sha256=8d9752b7c6a8725972bdcfe3830f841408a3730be63ea09d318cee13d0298865; output-bytes=616219; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t28; path=a68386b800d3/59 entries
  de campanie rămân singurele pending).
  CHECK: npx vitest run --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":4,"numTodoTests":0,"snapshot":/

- [x] G8: Build-ul de producție trece.
  CHECK: npx vite build
  EXPECT: /built in/
  EVIDENCE: automatic-evidence=v1; definition-sha256=202b6423274a1e776d6ddcc8d133917c5c706a45d1cd69c285f24b4a854abbd3; exit=0; EXPECT=matched; output-sha256=31b98fe4b847c4ede2afb00e28ecbbed892c93c12fb13a70e9a595654c185464; output-bytes=868; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t28; path=a68386b800d3/59 entries

- [x] G9: E2E Electron (garda lecției #310) rămâne verde.
  CHECK: node -e "process.env.PLAYWRIGHT_PATH='C:/Users/Ionut/Documents/Scriptorium/node_modules/playwright/index.js'; require('./tests/e2e/electron.e2e.cjs');"
  EXPECT: /E2E OK/
  EVIDENCE: automatic-evidence=v1; definition-sha256=e82f851dcf926cad47bf29548d46338ae00eb5cd68890f78d9ff4637ca3af995; exit=0; EXPECT=matched; output-sha256=2660373cad83289c119456d1a48f6d37de3b0bf45e02aec9c566c7d9499a26b7; output-bytes=802; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t28; path=a68386b800d3/59 entries
