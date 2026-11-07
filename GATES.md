# Gates: ADL T30 — Print Settings: fișe index + outline (P1 #30)

OWNS: lib/printFormats.cjs, lib/printSetup.cjs, electron/ioHandlers.cjs,
src/components/PageSetupDialog.jsx, src/components/PrintPreviewDialog.jsx,
src/lib/i18n-ui.js, tests/printFormats.test.js, tests/pageSetup.test.js,
tests/pageSetupDialogT30.test.js

Scope: paritate cu Scrivener 3 §26.1.1–26.3 (P1 #30, docs/PARITY-AUDIT-NEXT-CHAPTERS.md):
Page Setup (print) poate imprima documentele ca **fișe index** (grilă de carduri — titlu sus,
corp = synopsis/fallback text, culoarea etichetei, cutting guides, 2 coloane × N rânduri per
pagină, corpul trunchiat la ce încap) și ca **outline** (listă ierarhică indentată pe structura
binder: titlu bold + synopsis + număr de cuvinte). Formatul ales („manuscris | fișe index |
schiță”) e un dropdown în Page Setup, persistat în pageSetup (project.pageSetup +
userData/page-setup.json — aceeași normalizare; format de proiect NEATINS structural, cheie
aditivă). HTML-ul celor două formate e generat de modulul pur `lib/printFormats.cjs` (CSS
inline, document complet), apoi trece prin același pipeline printSetup.applyToHtml (page box,
antet/subsol) ca manuscrisul — preview și print cad la fix. Ledger-ul anterior (T28, verificat
complet) rămâne în istoricul git (`git show HEAD:GATES.md`); aici doar campania T30, ca să nu
existe ID-uri dublate.

- [x] G1: Modulul pur lib/printFormats.cjs — indexCardsHtml + outlineHtml + formatHtml(dispatch):
  EVIDENCE: exit=0; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t30; path=a68386b800d3/59 entries; EXPECT=matched; output-sha256=035ba0ad17b4dbb7d46784fae353911ef1993d31e10e5bc9edbca23aea98294b; output-bytes=4553
  din tree + readDoc + opțiuni produce document HTML COMPLET (doctype…</html>) cu CSS inline;
  fișe: text docs din Draft (folderele se expandează la descendenții text), card = titlu +
  corp (synopsis, fallback = începutul textului), culoarea etichetei ca bordură superioară,
  grilă de 2 coloane cu carduri break-inside:avoid și înălțime fixă (overflow hidden =
  trunchiere), cutting guides (borduriă întreruptă), opțiuni cardWidthCm/cardHeightCm/cutLines;
  outline: ierarhie binder cu indentare pe adâncime, titlu bold, synopsis dedesubt, număr de
  cuvinte per document (opțional counts); ids filtrează (folderele se expandează la fișe;
  la outline păstrează strămoșii ca context); formatHtml cu setup.format necunoscut/„manuscris”
  → null; escapeHtml pe toate texte.
  CHECK: npx vitest run tests/printFormats.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [x] G2: pageSetup.format + dimensiuni card în normalizare — format: 'manuscript'|'indexCards'|
  EVIDENCE: exit=0; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t30; path=a68386b800d3/59 entries; EXPECT=matched; output-sha256=5a133dbcfffe935fcc73ae20d270b1b909f8431a7bb1506f13272731400fbac8; output-bytes=3154
  'outline' (implicit 'manuscript', valoare invalidă → 'manuscript'), cardWidthCm/cardHeightCm
  clamp 5..30 (default 10/15); DEFAULT_PAGE_SETUP actualizat și în PageSetupDialog.jsx;
  persistența existentă (api.setPageSetup → userData/page-setup.json + onSave →
  project.pageSetup) nu se schimbă structural — doar chei aditive.
  CHECK: npx vitest run tests/pageSetup.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [x] G3: Pipeline-ul print folosește formatul — printHtml din electron/ioHandlers.cjs ramifică
  EVIDENCE: exit=0; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t30; path=a68386b800d3/59 entries; EXPECT=matched; output-sha256=92476c160c3e3edcde8b8f2dbca7c99ec158d198bade17fd9cfd097077e694cc; output-bytes=7213
  după setup.format: indexCards/outline → formatHtml + printSetup.applyToHtml (același page box,
  antet/subsol, opțiuni printToPDF/print), manuscris → comportamentul vechi neatins; preview
  (io:printPreview) și print (io:printDocuments) cad pe aceeași funcție.
  CHECK: npx vitest run tests/printFormats.test.js tests/pageSetup.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [x] G4: Selectorul în Page Setup + preview — dropdown „Format” (data-testid="print-format")
  EVIDENCE: exit=0; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t30; path=a68386b800d3/59 entries; EXPECT=matched; output-sha256=5ae48878685250a33cbac75107b0e3b5c95ed9ffc8e7ff75177c5dcd39e9ab0b; output-bytes=3762
  cu Manuscris | Fișe index | Schiță (outline), dimensiunile cardului vizibile doar la Fișe
  index, salvat prin fluxul existent (api.setPageSetup + onSave); PrintPreviewDialog arată
  eticheta formatului din setup-ul primit; i18n ro/en pentru toate cheile noi (paritatea cheilor
  e garantată de tests/i18n.test.js); fără butoane primary noi.
  CHECK: npx vitest run tests/pageSetupDialogT30.test.js tests/i18n.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [x] G5: Fără regresii — întreaga suită vitest verde (0 eșuate; cele 4 skip existente înainte
  EVIDENCE: exit=0; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t30; path=a68386b800d3/59 entries; EXPECT=matched; output-sha256=cde6e80ff645af04f245874eded011e50022d8648d16819719e48b2318a4dc80; output-bytes=622895
  de campanie rămân singurele pending).
  CHECK: npx vitest run --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":4,"numTodoTests":0/

- [x] G6: Build-ul de producție trece.
  EVIDENCE: exit=0; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t30; path=a68386b800d3/59 entries; EXPECT=matched; output-sha256=5166d76cfde51d537b0d9cb97cd322781cff4443264b2c184e7825dd0a40222d; output-bytes=868
  CHECK: npx vite build
  EXPECT: /built in/

- [x] G7: E2E Electron (garda lecției #310) rămâne verde.
  EVIDENCE: exit=0; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t30; path=a68386b800d3/59 entries; EXPECT=matched; output-sha256=0544b191d28a9f885511e4ae2ee435c6ea1bd6a6d07a612402a3fd7899c8c4f5; output-bytes=802
  CHECK: node -e "process.env.PLAYWRIGHT_PATH='C:/Users/Ionut/Documents/Scriptorium/node_modules/playwright/index.js'; require('./tests/e2e/electron.e2e.cjs');"
  EXPECT: /E2E OK/
