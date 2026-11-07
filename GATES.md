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

- [ ] G1: Modulul pur src/lib/toc.js — buildTocText(nodes, {selection}) produce text ToC cu
  indentare tab pe adâncime: dosar selectat → întregul subarbore (dosarul primul, adâncime 0),
  document text selectat → doar el, documentele text primesc `<$p>` după tab, coșul e sărit,
  selecție multiplă acceptată; evalPagePlaceholders(title, pageNo) înlocuiește `<$p>` multiplu,
  cu prefixe/sufixe, iar `<$p:fmt>` doar prin fmtFn dat; format necunoscut → rămâne neschimbat.
  CHECK: npx vitest run tests/toc.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [ ] G2: Comanda „copyAsToC" — înregistrată în App.jsx în grupul „document", dezactivată fără
  selecție, rulează prin navigator.clipboard.writeText cu textul produs de buildTocText;
  intrare în meniul Documente (documentMenu); etichete cmd.copyAsToC + ui.app.toc_copiat în
  AMBLE blocurile i18n (uiRo și uiEn); analiza statică a meniurilor (menuTiers) rămâne verde.
  CHECK: npx vitest run tests/toc.test.js tests/menuTiers.test.js tests/menuDedupe.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [ ] G3: Evaluarea `<$p>` la compile (estimare documentată) — lib/pageEstimate.cjs calculează
  pagina de start estimată per secțiune din dimensiunile paginii, margini, font, spațiere și
  marcă de pagină nouă (estimateStartPages(items, opts)); lib/compile.cjs aplică după
  buildDocument: `<$p>` din titlurile secțiunilor (prefix+titlu+sufix) și din subtitluri se
  înlocuiește cu pagina estimată a secțiunii, iar `<$p>` din corpul text cu pagina proprie a
  documentului; corpul reîncepe de la 1 după front matter când page.frontRoman (același
  comportament ca scriitorii DOCX/PDF); blocurile „Preserve Formatting" nu se ating.
  Teste pe estimator + pe buildDocument.
  CHECK: npx vitest run tests/compilePageNumbers.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [ ] G4: Cuprinsul generat la compile arată numere de pagină estimate la ieșiri paginate —
  tocHtml primește estPage per intrare și pentru target pdf (paged) cu settings.pageNumbers
  !== false redenerează numărul; DOCX păstrează câmpurile PAGEREF reale (neschimbat); fără
  numere la HTML nepaginat/preview.
  CHECK: npx vitest run tests/compilePageNumbers.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [ ] G5: Filtre în lista de conținut din CompileDialog — rând de filtrare deasupra tabelului:
  filtru pe tip (toate / doar text / text+foldere) și filtru pe etichete (lista proiectului,
  „(toate)"); setările se persistă în project.compile (contentFilter, contentLabel, implicite
  neutre); rândurile sub un dosar cu includeInCompile=false apar ca excluse (clasă cd-excluded,
  bifă dezactivată + title explicativ); i18n ro/en pentru toate cheile noi; teste jsdom pe
  componentă.
  CHECK: npx vitest run tests/compileT28Dialog.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [ ] G6: Compilarea respectă include/exclude (teste pe compiler) — documentul cu
  includeInCompile=false nu intră în output, dosarul exclus își exclude automat copiii,
  ordinea din binder e păstrată pentru cele rămase, filterInvert (exclude ce corespunde) și
  filtrele pe etichete/status rămân corecte; scope explicit (selection/folder) nu se filtrează,
  ca înainte.
  CHECK: npx vitest run tests/compileFilters.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [ ] G7: Fără regresii — întreaga suită vitest verde.
  CHECK: npx vitest run --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [ ] G8: Build-ul de producție trece.
  CHECK: npx vite build
  EXPECT: /built in/

- [ ] G9: E2E Electron (garda lecției #310) rămâne verde.
  CHECK: node -e "process.env.PLAYWRIGHT_PATH='C:/Users/Ionut/Documents/Scriptorium/node_modules/playwright/index.js'; require('./tests/e2e/electron.e2e.cjs');"
  EXPECT: /E2E OK/
