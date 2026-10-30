# Audit de paritate Scrivener 3 — capitolele 16, 17

Data: 2026-10-30. Continuarea metodei din `PARITY-AUDIT-NEXT-CHAPTERS.md` (audit pe manualul
oficial inclus în instalare). Capitole acoperite: **16 Writing Environments** (PDF 363–370),
**17 Styles and Stylesheets** (PDF 371–388). Referință: Scrivener 3.1.6.

## Rezumat pe capitole

| Capitol | Arii verificate | Stare |
|---|---|---|
| 16 Writing Environments | Composition Mode (intrare/ieșire, fundal, fade, backdrop image, inspector plutitor, tinte vizibile), Page View (pagini virtuale, față-verso), Typewriter Scrolling | **acoperit parțial** — fără control strip și fără monitoare multiple |
| 17 Styles and Stylesheets | tipuri stil (¶/a/¶a), stylesheet per proiect + stiluri stock, aplicare (Format Bar, scurtături per stil, No Style), creare/redefinire/ștergere, Next Style, import din alt proiect (3 moduri de conflict), stiluri în compile, import stiluri RTF | **acoperit (cod)** — fără selectare/navigare după stil și fără „remove all styles" |

## Capitolul 16 — Writing Environments (PDF 363–370)

| Arie | Stare | Dovezi cod |
|---|---|---|
| 16.1.1 Intrare/ieșire Composition Mode (View▸Enter, F11/Esc) | **acoperit (cod)** | `src/App.jsx` (`composition` state, comanda `cmd.composition` în meniul View, buton toolbar „Compunere" L2054, Escape L1440, buton `exit-composition` L2461); CSS `.app.composition` în `src/styles.css:107-111,326-328`. F11 ca scurtătură dedicată lipsește (doar Esc) |
| 16.1.2 Încărcarea mai multor documente / Scrivenings în compoziție | **acoperit (cod)** | compoziția se aplică view-ului activ (`setView('editor')` + Scrivenings deja implementat); `src/components/Scrivenings.jsx` |
| 16.1.3 Control Strip (text scale propriu, paper position/width/height, Go To, Styles, Keywords, statistici, fade-uri) | **parțial** | Nu există control strip. Căutări „controlStrip", „paperWidth", „paperPos", „compTextScale", „paperHeight" → 0. Există în schimb: lățime hârtie (`compWidth` → `--comp-width`), fade fundal (`compFade` → `--comp-fade`, `src/styles.css:328`), tratament paper (`compPaper`), tinte document+sesiune (`compShowTargets`, `src/App.jsx:2462-2467`). Lipsește: text scale propriu compoziției (zoom-ul e partajat cu editorul, iar StatusBar e ascuns în compoziție), paper position, paper height, Go To/Styles/Keywords accesibile (barele sunt ascunse) |
| 16.1.4 Floating Inspector Panel | **parțial** | `src/components/FloatingInspector.jsx`: panou draggable cu sinopsis, note, etichetă, status. Lipsește dropdown-ul cu panouri din manual (Keywords, Bookmarks, Project Bookmarks, Custom Metadata, Comments & Footnotes, Picture) — panourile există în aplicație (`KeywordsDialog`, `BookmarksPanel`, Inspector) dar nu sunt cuplate în inspectorul plutitor |
| 16.1.5 Monitoare multiple („Open composition mode on…", „Hide main window") | **gol** | Căutări „display", „monitor", „secondaryDisplay", „hideMainWindow", „openCompositionOn" în `src/` + `electron/` → 0 |
| 16.1.6 Customizare aspect (culoare fundal, imagine backdrop, fade, text) | **acoperit (cod)** | `src/components/SettingsDialog.jsx:303-344` (culoare, lățime, fade, tratament paper, imagine de fundal cu fit cover/contain/tile/center), `src/lib/settingsDefaults.js:20-24`, `src/App.jsx:2025-2037` (`--comp-bg`, `--comp-width`, `--comp-fade`, `--comp-bg-image`) |
| 16.2 Page View (pagini virtuale) | **parțial** | `src/components/FormatBar.jsx:483-484` (Page View A5/A4/Letter + „Pagini față-verso"), `src/components/Editor.jsx:374` (`page-view page-a5`, `facing`), `src/styles.css:323` (`.page-view` 148mm). Lipsește: dimensiunile din File▸Page Setup nu alimentează page view (marginile sunt hardcodate; `PageSetupDialog` scrie `project.pageSetup` folosit doar la print) și „Base page view size on…" (compile vs. page setup) |
| 16.3 Typewriter Scrolling | **parțial** | `src/components/Editor.jsx:88-93` (`scrollIntoView({block:'center'})` la schimbarea selecției), setare globală `typewriter` (`src/lib/settingsDefaults.js:19`, `src/components/SettingsDialog.jsx:361`), aplicată în editor și Scrivenings. Lipsește: comanda View▸Text Editing▸Typewriter Scrolling (toggle fără trecere prin Setări), independența per split/per compoziție, suport în panourile Quick Reference (`src/components/QuickRef.jsx` — 0 hits) |

## Capitolul 17 — Styles and Stylesheets (PDF 371–388)

| Arie | Stare | Dovezi cod |
|---|---|---|
| 17.2.1 Tipuri de stiluri: paragraf / caracter / paragraf+caracter (¶, a, ¶a) | **acoperit (cod)** | `src/lib/styles.js` (`STYLE_KINDS`, `isParaStyle`, `isCharStyle`, tipul `both`), `src/editor/writing.js` (`ParagraphStyle` cu `data-style`, `CharStyle` mark cu `data-char-style`), `src/components/FormatBar.jsx:456-457` (iconografie ¶/¶a/a) |
| 17.2 Stylesheet per proiect + set stock în proiecte noi | **acoperit (cod)** | `project.styles` + `DEFAULT_STYLES` (`src/lib/styles.js:5-18`, fallback `stylesOf`); stilurile se salvează în proiect (`src/App.jsx:2722-2732`) și călătoresc prin șabloane de proiect |
| 17.2.2 Font family/size opțional în definiție | **parțial** | font family nu e niciodată stocat (echivalentul „Include font family" = mereu dezactivat), size-ul e relativ (%) și mereu stocat; nu există checkbox-urile „Include font family/size" din New Style panel |
| 17.2.3 Panoul stilurilor (aplicare, context, prev/next instanță, +, •••, Remove) | **acoperit (cod)**, variantă dialog | `src/components/StylesDialog.jsx` (listă cu tipuri, stil nou, redefinire, ștergere, scurtături, import, preview live); aplicarea rapidă din Format Bar „Stil" (`FormatBar.jsx:455-463`, grup cu prioritate 0 = mereu vizibil). Lipsește: butoanele ⮃⮁ de navigare pe instanțe și „Select All Text with Style" (vezi goluri) |
| 17.3.1 Aplicarea stilurilor (Format Bar, meniu, scurtături per stil, No Style) | **acoperit (cod)** | `FormatBar.jsx` meniul „Stil" cu toate stilurile + scurtături afișate + „Fără stil de paragraf/caractere"; scurtături per stil aplicate din tastatură (`src/editor/writing.js:75-92`, plugin `styleShortcuts` + `styleForShortcut`/`normalizeShortcut` în `styles.js`); comanda Format „Stiluri…" (`cmd.styles`, `src/App.jsx:1858`) |
| 17.3.2 Crearea de stiluri noi (New Style From Selection, Next Style) | **acoperit (cod)** | `StylesDialog.jsx` (`add()` + `redefine()` din aspectul selecției curente `currentLook()`), câmpuri: nume, tip, scurtătură cu avertizare duplicate, bold/italic/smallCaps/underline, size, culoare, aliniere, indent; Next Style cu opțiunile „Același stil"/„Fără stil"/alt stil („This Style" inclus), comportament Enter în `writing.js:51-74` + `nextStyleId` |
| 17.3.2 Highlight box (casetă colorată în jurul stilului) | **gol** | Căutări „highlightBox", „highlight box", „drawHighlight", „caseta", „evidențiaza_cadru" → 0 |
| 17.3.3 Redefinirea unui stil | **acoperit (cod)** | `StylesDialog.jsx` `redefine()` — preia formatarea selecției curente; salvare în proiect. Redefinire și din selecție cu tip schimbat („paragraf+caractere") |
| 17.3.4 Ștergerea unui stil | **acoperit (cod)** | `StylesDialog.jsx` `remove()` cu confirmare (textul păstrează formatarea, ca în manual) |
| 17.3.5 Eliminarea stilurilor din text (No Style, „Remove all styles") | **parțial** | No Style pe paragraf/caractere există (`FormatBar.jsx:459-460` → `setParagraphStyle(null)`/`setCharStyle(null)`). Lipsește opțiunea „Remove all styles" din Documents▸Convert▸Text to Default Formatting: `resetToDefault` (`src/editor/formatting.js:275-299`) resetează atributele de paragraf și font, dar NU scoate `styleName`/`data-char-style` |
| 17.4.1 Selectarea și căutarea după stil (Select Style Range, Select Next in Same Style, Select All Text with Style, Find by Formatting cu stil) | **gol** | Căutări „selectStyleRange", „sameStyle", „selectAllText", „cu_stilul", „nextInstance", „jumpToStyle" → 0. Find by Formatting implementat (`src/lib/formatFind.js`) NU are criteriul „stil" (doar bold/italic/subliniat/…, linkuri, imagini, verbatim) |
| 17.4.2 Copy/paste între proiecte cu potrivire pe nume | **parțial** | La nivel de clipboard nu există remapare pe nume (0 căutări relevante); în schimb la import de proiect .scriv stilurile se potrivesc și se înregistrează după nume: `styleRegistry` (`lib/scrivImport.cjs:241-256`) |
| 17.4.3 Stiluri pentru markup — stil → prefix/suffix la compile | **parțial** | Stilurile curg în compile: `lib/compile.cjs` (`parseBlocks` citește `data-style`/`data-char-style`, `o.styles`, `styleCss` în HTML/EPUB/DOCX, `CompileDialog.jsx:253-263`). Lipsește panoul „Styles" din Compile Format (§24.4): prefix/suffix/enclosure per stil (exemplul „HTML Comment") |
| 17.4.5 Import din alte procesoare de text (potrivire pe nume) | **parțial** | RTF: stiluri numite păstrate după nume, inclusiv marcaje Scrivener `$Scr_Cs/Ps` (`lib/rtf.cjs`: `namedStyleId`, `\cs`/`\s` stylesheets, L88-135, 659-700); DOCX: 0 hits `pStyle` în `lib/docxImport.cjs` (stilurile numite nu se mapează); ODT: doar b/i/u/s direct (`lib/importers.cjs:78-98`) |
| 17.5 Import stylesheet din alt proiect (Keep/Replace/Add, numerotare) | **acoperit (cod)** | `StylesDialog.jsx` `importFrom()` + IPC `styles:readFromProject` (`electron/main.cjs:678`, `electron/preload.cjs:27`): file chooser spre folderul proiectului, cele 3 moduri de conflict (păstrează/înlocuiește/adaugă cu sufix „importat" = numerotarea din manual) |
| 17.5 Stylesheet implicit global pentru proiecte noi („Set Styles Defaults…") | **parțial** | echivalent funcțional de bază: `stylesOf()` cade pe `DEFAULT_STYLES` pentru orice proiect fără stiluri proprii; lipsesc UI-ul „Set Styles Defaults…" și posibilitatea de a alege alt stylesheet default |

## Goluri noi identificate (backlog, prioritizat)

| Prioritate | Gol | Manual §/pag | Notă de implementare |
|---|---|---|---|
| P1 | **Selectare și navigare după stil** — Select Style Range, Select Next in Same Style, Select All Text with Paragraph/Character Style, butoanele ⮃⮁ din panoul de stiluri | §17.4.1, p. 379–380 (§17.2.3, §17.5) | nucleu de workflow: parcurgerea nodurilor ProseMirror după `attrs.styleName` / mark-ul `charStyle` (`src/editor/writing.js`), `TextSelection.create` pe intervalele găsite; „Select All with Style" e și premisa migrării stilurilor din §17.5; butoanele prev/next intră în footer-ul `StylesDialog.jsx` |
| P2 | **Control strip pentru modul compoziție** — text scale propriu, paper position/width/height, Go To și ieșire, fără a părăsi modul | §16.1.3, p. 361 | bară auto-ascunsă la marginea de jos a `.app.composition` (reveals la hover); zoom separat `compZoom` (nu `editorView.zoom`); slidere legate de `--comp-width`/noile variabile; Go To reutilizează `GoToDialog` |
| P2 | **„Remove all styles"** — eliminarea tuturor stilurilor din documentele selectate, ca opțiune a convertirii la formatarea implicită | §17.3.5, p. 378 | extinde `resetToDefault` din `src/editor/formatting.js` să curețe și `styleName` + mark-ul `charStyle` (opțional un comutator „Include toate stilurile"); intră în meniul Document▸Convert |
| P3 | **Monitoare multiple pentru compoziție** — „Open composition mode on…" + „Hide main window in composition mode" | §16.1.5, p. 363 | Electron: `screen.getAllDisplays()` în `electron/main.cjs`, setare în `settingsDefaults.js`; fereastră secundară saurepoziționare BrowserWindow |
| P3 | **Import stiluri numite din DOCX/ODT** — potrivire pe nume la import, ca la RTF | §17.4.5, p. 382 | `lib/docxImport.cjs` citește deja styles.xml pentru definiții — mapează `w:pStyle`/`w:rStyle` prin `styleRegistry`-like pe nume; ODT: `style:style` cu `style:parent-style-name` din `lib/importers.cjs` |

Notă asupra stării „parțial" care nu intră în goluri de arie: page view nu-și ia dimensiunile
din page setup (§16.2.1 — util doar împreună cu o viitoare legătură print/compile), typewriter
lipsește din Quick Reference (§16.3), inspectorul plutitor are 4 din 8 panouri (§16.1.4),
highlight box per stil (§17.3.2) și panoul Styles din compile (§24.4, aparține capitolelor de
compile) rămân de acoperit odată cu ariile lor mamă.

## Notă de metodă

Extragerea textului celor două capitole din PDF-ul manualului oficial (Scrivener 3.1.6),
enumerarea ariilor la granularitate mare, apoi verificare în cod prin căutare țintită pe
identificatori și sinonime (RO + EN), inclusiv chei i18n și definiții de comenzi/meniu.
Ariile „acoperit" sunt confirmate prin fișiere și funcții concrete; cele „gol" au minimum
3–4 căutări eșuate pe termeni diferiți. Stilurile, Find by Formatting, layouts și celelalte
arii marcate ca implementate în auditul precedent au fost verificate doar ca adâncime.
