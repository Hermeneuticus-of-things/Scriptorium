# Audit de paritate Scrivener 3 — Apendicele D, E, F (manual Scrivener 3.1.6 Windows, PDF 733–765)

Data: 2026-11-21. Surse: `docs/audit/scrivener3/sources/D-formats.txt`, `E-whatsnew.txt`, `F-extras.txt`.
Cod verificat: `lib/compileFormats.cjs`, `lib/compile.cjs`, `lib/advancedExport.cjs`, `lib/scriptExport.cjs`,
`lib/exporters.cjs`, `lib/templates.cjs`, `lib/tutorialProject.cjs`, `lib/history.cjs`, `lib/snapshotSearch.cjs`,
`lib/folderSync.cjs`, `src/components/CompileDialog.jsx`, `ExportDialog.jsx`, `StatisticsDialog.jsx`,
`HistoryDialog.jsx`, `SnapshotManagerDialog.jsx`, `KeywordsDialog.jsx`, `AppearancePane.jsx`,
`ProjectSettingsDialog.jsx`, `Binder.jsx`, `App.jsx`, `electron/v04Handlers.cjs`.
Audite existente (fără dublare, doar cross-referințe): `docs/PARITY-AUDIT-ch23-ch25-ch26-compile-export-print.md`
(= „ch23”), `docs/PARITY-AUDIT-NEXT-CHAPTERS.md` (= „NEXT”, cap. 24 Compile Format Designer),
`docs/PARITY-AUDIT-ch08-ch15-editor.md`, `ch09-ch13`, `ch16-ch17`, `ch19-ch21-ch22`.

Stări folosite (exact): COMPLETE / PARTIAL / UNINTEGRATED / BROKEN / MISSING / NOT_APPLICABLE / UNVERIFIED / EQUIVALENT / SUPERIOR.

---

## Apendicele D — Compile Formats (PDF 733–744)

Context: Pneuma are 18 preseturi de compile (`PRESETS` în `lib/compileFormats.cjs:90–2329`) cu structura
`{id, name, layouts, defaultLayouts, separators, titlePage, toc, typography, page, transforms, replacements}`
— echivalentul „formatului” Scrivener (section layouts + separatoare + transformări + page setup la un loc).
Toate preseturile partajează același set de 6 layouts (`Parte, Capitol, Capitol cu text, Secțiune, Scenă, Pagină de titlu`),
deci diferențierea între formatele Scrivener (cu zeci de layouts specializate: outline-uri numerotate, front matter,
unnumbered chapter etc.) e mai săracă. Ieșirile disponibile: `OUTPUT_FORMATS` (`lib/compile.cjs:455–465`):
docx, epub, html, rtf, odt, md, mmd, txt, fountain, fdx, tex, (+ pdf/print intern, `compile.cjs:2466–2472`).

| ID | Element (format Scrivener) | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-D.01 | D.1 Default — passthrough simplu, page break pe foldere, număr de pagină centrat în subsol | EQUIVALENT | preset `implicit` („Implicit (Default)”): footer center `<$p>`, fără antet, layouts cu `pageBreakBefore` pe foldere (`compileFormats.cjs` PRESETS; `lib/compile.cjs:644` `layoutOf(folder) → pageBreakBefore:true`) | — | — |
| S3-D.02 | D.2.1 Enumerated Outline (doar titluri, indentat, 4 scheme de numerotare) | PARTIAL | nu există format de compile „outline”; echivalent doar la print: `lib/printFormats.cjs` `outlineHtml` (listă ierarhică indentată, titluri+sinopsis+nr. cuvinte; vezi NEXT „tura a doua”) | fără numerotare alfanumerică configurabilă (Title Options/placeholders), fără „Add indent per outline level”, nu apare în dialogul Compile ca format | P2 |
| S3-D.03 | D.2.2 Full Indented Outline (titluri + sinopse, numerotare alfanumerică/ierarhică/fără) | PARTIAL | idem S3-D.02 — sinopsisul apare în `outlineHtml`; sinopsele există în motor (`buildDocument` colectează sinopsis) | fără scheme de numerotare, fără variante de layout; nu e format de compile | P2 |
| S3-D.04 | D.2.3 Manuscript (Courier) — Courier 12pt, dublu spațiu, separator „#”, italice subliniate, antet standard | EQUIVALENT | preset `courier`: `typography {fontFamily:'Courier New', fontSizePt:12, lineSpacing:2, firstLineIndentIn:0.5, noIndentAfterHeading:true}`, `separators.sameType {text:'#'}`, header right `<$surname> / <$abbr_title> / <$p>`, `differentFirstPage:true` (`compileFormats.cjs` PRESETS) | lipsește transformarea „Convert italics to underlines” — căutări `italic.*underlin` în `lib/compile*.cjs` = 0 (`underline` apare doar ca format nativ, `compile.cjs:1540`); transforma `smartQuotes:false` prezent | P3 |
| S3-D.05 | D.2.4 Manuscript (Times) | EQUIVALENT | preset `times`: identic cu courier dar `Times New Roman`, italice rămân italice | aceeași lipsă minoră a alternativelor de alterare (golul e același ca la D.04 — o singură implementare ar rezolva ambele) | P3 |
| S3-D.06 | D.2.5 Modern | EQUIVALENT | preset `modern` („Modern”) | fără setul complet de layout-uri estetice din Scrivener (epigraf, subtitlu etc.) | P3 |
| S3-D.07 | D.2.6 Outline Document (titlu+sinopsis în layout document; subsol cu titlu/autor/dată/pagină + linie separatoare) | PARTIAL | `printFormats.cjs outlineHtml` acoperă conținutul; subsolul configurabil există în page setup (`lib/printSetup.cjs`, placeholder-e `<$p>`) | fără subsol compus titlu/autor/dată + linie divisorie ca layout; fără layout-uri „doar titlu” | P3 |
| S3-D.08 | D.2.7 Paperback (6″×9″) | EQUIVALENT | preset `paperback`: `page.size:'6x9'`, margini mirrored 0.75/0.875/0.625, header center `<$projecttitle>`, footer `<$p>`; `PAGE_SIZES['6x9']` (`compileFormats.cjs:26–28`, `pageDimensions` l.2432) | lipsește tehnica „styles” din documentație (nu e gap funcțional — Pneuma aplică spacing/indent direct prin `typography`) | — |
| S3-D.09 | D.2.8 Paperback (5.06″×7.81″) | PARTIAL | `PAGE_SIZES` are A4/A5/Letter/6x9/5x8/5.5x8.5 (`compileFormats.cjs`); `pageDimensions()` acceptă `widthIn/heightIn` custom | nu există preset dedicat pentru dimensiunea 5.06×7.81; utilizatorul poate seta dimensiuni custom doar dacă UI-ul expune `page.widthIn` (PageSetup are „custom” — vezi ch23 §Page Setup) | P3 |
| S3-D.10 | D.2.9 Proof Copy (dublu spațiu + disclaimer „Not for distribution” în antet și după titluri) | PARTIAL | preset `corectura` („Exemplar de corectură”): header right „EXEMPLAR DE CORECTURĂ”, `lineSpacing:1.8` | disclaimerul NU se repetă după fiecare titlu de secțiune (doar în antet); dublul spațiu e 1.8 nu 2.0 — diferențe cosmetice | P3 |
| S3-D.11 | D.2.10 / D.4.1 Script or Screenplay | EQUIVALENT | preseturi `scenariu-film`, `piesa-teatru`, `scenariu-bd`, `scenariu-radio`; ieșiri fountain/fdx prin `compileScript` (`compile.cjs:2415–2422` → `lib/scriptExport.cjs htmlToFdx/htmlToFountain`) | conversia „smart→dumb punctuation” la compile nu e implementată explicit (`grep smart lib/scriptExport.cjs` = 0); calitate „proofing”, nu layout industrie — la fel ca Scrivener | P3 |
| S3-D.12 | D.2.11 Vellum Export (DOCX cu mapare nume de stiluri Scrivener→Vellum + stiluri Epigraph/Dedication/Book Title/Book Subtitle/Author) | MISSING | căutări `vellum`/`Vellum` în `src/`, `lib/`, `electron/` = 0 | format de transfer către o unealtă macOS; util doar pentru utilizatori Vellum | P4 (niche) |
| S3-D.13 | D.3.1 Ebook | EQUIVALENT | preseturi `ebook` + `ebook-fictiune`; `compileEpub` (`compile.cjs:1650+`) cu nav/toc/cover | — | — |
| S3-D.14 | D.3.2 Ebook Screenplay (stylesheet care mimează elementele de scenariu în EPUB) | MISSING | `compileEpub` nu are ramură screenplay; căutări `screenplay` în `compile.cjs` = 0 (doar `fountain` în OUTPUT_FORMATS) | ar necesita CSS dedicat pe `data-script` elemente (elementele de script există în editor) | P3 |
| S3-D.15 | D.3.3 / D.2.6 Outline Document (ebook) | MISSING | nu există format outline în compile pe nicio ieșire ebook | vezi S3-D.02 | P3 |
| S3-D.16 | D.5.1 Enumerated Outline (TXT, indentare ca whitespace literal) | PARTIAL | `compileText` (`compile.cjs:2457`) produce text simplu; indentarea ierarhică a titlurilor nu e generată (nu există layout outline) | — | P3 |
| S3-D.17 | D.5.2 Markdown Outline (liste Markdown valide + design LaTeX simplu integrat) | MISSING | căutări `Markdown Outline`/generare liste MD din ierarhie în `lib/compile.cjs` = 0; `htmlToMarkdown` nu serializează ierarhia binderului ca listă | ar fi un „layout mode” în `compileMarkdown`: titluri → `- item` / `1. item` pe nivel | P3 |
| S3-D.18 | D.5.3 Plain Text Manuscript (TXT cu antete evidențiate, backup pe termen lung) | EQUIVALENT | `compileText` — text simplu cu notaje (`___` + note la final, `compile.cjs:2400–2404`); ieșire `txt` în `OUTPUT_FORMATS` l.461 | fără setul specific de layout-uri „emphasised headers” | — |
| S3-D.19 | D.5.4 Plain Text Screenplay (TXT cu whitespace literal, margini 1″ pad pentru Courier 12pt) | MISSING | `scriptExport.cjs` are doar `htmlToFdx`/`htmlToFountain`; nu există `htmlToPlainTextScript`; căutări `plain.*screenplay` = 0 | ușor de adăugat: elemente de script → indenturi/linii goale conform convențiilor TXT | P3 |
| S3-D.20 | D.5.5 Basic MultiMarkdown (& Basic Pandoc) — 3 layouts (heading/heading+text/text), hashes automate pe nivel, block quote `>`, code block tab/backticks, captions, CriticMarkup | PARTIAL | `compile('mmd')` → `compileMarkdown(..., true)` (`compile.cjs:2454–2456`); Pandoc: `electron/v04Handlers.cjs:145–150` `v04:exportPandoc` → `advancedExport.toPandoc/toMultiMarkdown` (l.281); blockquote în `parseBlocks` (`compile.cjs:183,413–417`) | **CriticMarkup lipsă** (stiluri Addition/Deletion/Highlight → `{++ ++}` etc.; căutări `critic` în `lib/` = 0); captions figuri/tabele fără mapare specială; layouts „heading / heading+text / text” există conceptual prin `showTitle` per layout | P2 |
| S3-D.21 | D.5.6 MMD OpenOffice Document (.odt/.fodt) — indexare prin stilurile Index Term / Index Key, ierarhie `Major/Minor/Term`, comentanții→comentarii OpenDocument | MISSING | `.fodt` (Flat XML) nu e suportat (ch23 gap cunoscut: lista ieșirilor); căutări `Index Term`/`Index Key`/`index{` în `lib/`, `src/` = 0; comentariile ODT: `transforms.comments` are doar strip/export DOCX | ar cere 2 stiluri character + markup `:()` MMD în `compileOdt` | P3 |
| S3-D.22 | D.5.7 Pandoc Word Document (indexare în .docx prin Pandoc) | MISSING | idem S3-D.21; `v04:exportPandoc` scrie doar `.md`/`.mmd` text (v04Handlers.cjs:149–150), nu rulează Pandoc | — | P3 |
| S3-D.23 | D.6 (comun LaTeX): layouts Text Section with Break, Unnumbered Chapter (`\chapter*`), Unnumbered Section (`\section*`); stilurile Index Key / Index Term / Raw LaTeX / Attribution | PARTIAL | `compileLatex` (`compile.cjs:2424–2428`) → `advancedExport.toLatex` (l.146–179): `\documentclass[12pt]{book}` + `\tableofcontents`; break-uri prin layouts generice (`separatorBefore`) | fără `\chapter*`/`\section*` (toate titlurile devin capitole numerotate); fără cele 4 stiluri LaTeX (Index/Raw LaTeX/Attribution `\sourceatright`); fără cheile metadata „Base Header Level”, „LaTeX Leader”, „LaTeX Begin” | P2 |
| S3-D.24 | D.6.1 Article (Memoir) | MISSING | `toLatex` acceptă `options.documentClass` (`advancedExport.cjs:146`) dar nu există preset/format care să-l folosească cu `article`/memoir; `compileLatex` hardcizează implicit `'book'` | parametrul există în motor — lipsește doar formatul + UI | P3 |
| S3-D.25 | D.6.2 Book (Memoir) | PARTIAL | `compileLatex` cu `documentClass:'book'` (implicit, `compile.cjs:2427`) | clasă LaTeX generică `book`, nu `memoir`; fără boilerplate/metadata MMD; suficient ca punct de plecare | P3 |
| S3-D.26 | D.6.3 Book (Tufte) — fullwidth, margin note, `\newthought`, regex `^@@((?:\S+\s+){3}\S+)` | MISSING | căutări `tufte`/`newthought`/`fullwidth` în `lib/` = 0 | — | P4 |
| S3-D.27 | D.6.4 Manuscript (Courier) LaTeX (design Fletcher Penney) | MISSING | nu există preset LaTeX courier | — | P4 |
| S3-D.28 | D.6.5 Modern (Custom LaTeX) — setări stocate în panul LaTeX Options, fallback pdflatex | MISSING | căutări `LaTeX Options`/`xelatex`/`latexmk` în `lib/`, `src/`, `electron/` = 0 | presupune și post-processing (latexmk) — gol deja cunoscut (ch23, „Post-processing commands”) | P4 |
| S3-D.29 | Conversia rich text → MMD ca opțiune generală de compile („Convert rich text to MultiMarkdown”, sidebar-ul D.6) | PARTIAL | `compileMarkdown` convertește HTML→MMD mereu pentru ieșirile md/mmd; opțiunea on/off + „Escape special characters” + „Treat Preserve Formatting as raw markup” nu există ca setări (cross-ref E.03) | vezi S3-E.03 | P2 |

**Numărtoare D:** 29 rânduri — EQUIVALENT 8, PARTIAL 9, MISSING 12, COMPLETE 0, BROKEN 0.

---

## Apendicele E — What's New / release notes 3.0–3.1.6 (PDF 746–763)

Multe funcții au fost deja auditate în documentele anterioare; acele rânduri pointează către sursă și
re-verifică doar ce aduce Appendix E în plus. ID-urile de mai jos sunt la nivel de *feature* din release notes.

| ID | Element (feature 3.x) | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-E.01 | E.1 Compile overhauled (sistem format + designer) | EQUIVALENT | NEXT cap. 24 (section layouts, separatoare, transformări, CSS, page setup); ch23 (flux compile) | rămân golurile din NEXT/ch23 (nu se re-auditează aici) | — |
| S3-E.02 | E.1.1 Separators by Type (separatoare per section type, nu per icon/level) | EQUIVALENT | `separators` pe format cu `sameType`/`differentType` (`compileFormats.cjs`; `corectura.separators` confirmat) + mapare tip→layout în tab-ul „Sectiuni” (`CompileDialog.jsx`, ch23) | separatoarele sunt doar 2 categorii (same/different type), nu per-pereche de layouts adiacente ca în Scrivener — diferență de granularitate | P3 |
| S3-E.03 | E.1.3 Preserve Formatting în Markdown compile → înlocuit de stiluri; „Treat as raw markup”, „Escape special characters” | PARTIAL | stilurile există (`PARITY-AUDIT-ch16-ch17`, „acoperit (cod)”, `src/lib/styles.js`); căutări `raw markup`/`escape special` în `lib/compile.cjs` = 0 | opțiunile de compile Markdown din panoul MMD/Pandoc (raw markup per stil, escapare on/off) lipsesc | P2 |
| S3-E.04 | E.1.2 Front and Back Matter Locking (lock pe tip de fișier, legare la compile group) | MISSING | ch23, rândul „Lock front/back matter pe tip de fișier + legare automată” = gol; re-confirmat: `grep matterLock` = 0 | gol deja în ch23 backlog (P2) — nu se re-auditează | P2 |
| S3-E.05 | E.1.4 Print with Footnotes (typesetarea notelor de subsol la Print/PDF) | EQUIVALENT | `processNotes`/`footnoteState` (`compile.cjs:91–107`): marcatori → referințe numerotate + note la final de pagină/secțiune în HTML→PDF pipeline; note linked → inline (`linkedNotesInline`, l.10–20) | — | — |
| S3-E.06 | E.1.5 Markdown to RTF Conversion (opțiunea „Convert MultiMarkdown to rich text in notes and text”) | MISSING | căutări `mmd.*rich`/`convertMd` în `lib/compile.cjs` = 0; nu există transformarea inversă asterisk→itlic la compile pe ieșiri native | transformare în `mapText`: `**x**`/`*x*`/`_x_` → runs bold/italic înainte de `parseBlocks` | P3 |
| S3-E.07 | E.1.6 Importing Legacy Compile Presets (din Scrivener 1/2) | NOT_APPLICABLE | Pneuma nu are un format precedent de la care să migreze; `legacyFormat()` (`compileFormats.cjs:2337`, id `legacy`, „Implicit”) e doar formatul vechi al aplicației | N/A prin construcție | — |
| S3-E.08 | E.1.7 Post-Processing Scripts (executabil după compile, ex. latexmk) | MISSING | ch23 „Post-processing commands (§23.5.2)” = gol; re-confirmat `grep postProcess lib/compile*.cjs` = 0 | în backlog ch23 P3 | P3 |
| S3-E.09 | E.2 Section Types + Page Break Before + Compile As-Is ca layout | EQUIVALENT | NEXT cap. 24 „acoperit”; `resolveSectionType` (`compile.cjs`, exports l.2506); „As-Is” ≈ layout `showText/showTitle:false` (ch23, rând Layout Preview) | tipurile speciale de migrare („Section Start”, „N/A”) sunt N/A (nu există proiecte 2.x) | — |
| S3-E.10 | E.3 Stylesheets (foarte similar cu auditele ch16–17) | EQUIVALENT | `PARITY-AUDIT-ch16-ch17-environments-styles.md`: tipuri ¶/a/¶a, stylesheet per proiect, Next Style, import — „acoperit (cod)” | lipsuri fine deja consemnate acolo (navigare instanțe, remove all styles) | P3 |
| S3-E.11 | E.3.1 „Set Styles Defaults…” (stiluri implicite pentru proiecte noi) | MISSING | căutări `stylesDefaults`/`Set Styles Default` în `src/` = 0; `DEFAULT_STYLES` (`src/lib/styles.js:5–18`) e fix, nu configurabil | setare `defaultStyles` în preferințe + aplicare în `store.createProject` | P3 |
| S3-E.12 | E.3.2 Preserve Formatting (moștenire, deprecat) | NOT_APPLICABLE | Pneuma nu a avut „Preserve Formatting” înainte — nu există compatibilitate de păstrat | — | — |
| S3-E.13 | E.4 Project Bookmarks (fuziunea Project Notes + References + Favorites) | PARTIAL | `PARITY-AUDIT-ch09-ch13` rândurile „Tab Bookmarks — document/proiect”: `BookmarksPanel.jsx` + `Inspector.jsx DocumentExtras` — parțial (fără preview editabil în Inspector, fără back-linkuri) | detaliile în ch09-ch13 backlog P2 | P2 |
| S3-E.14 | E.5 Writing History (Project ▸ Writing History, sumar + export CSV) | EQUIVALENT | `lib/history.cjs` (`readHistory`, `summarize`); UI `src/components/HistoryDialog.jsx` cu `exportCsv` (l.31–34, Blob CSV `istoric-scriere.csv` prin `historyCsv` din `lib/smallWindows.js`) | — | — |
| S3-E.15 | E.6 Custom Metadata Overhauled (text, listă dropdown, checkbox, dată & oră) | EQUIVALENT | `PARITY-AUDIT-ch09-ch13` rândul „Custom metadata (§13.5.2)”: `Inspector.jsx CustomFields` (text, checkbox, listă, dată) — „acoperit (cod)” | doar opțiunea „wrap text” lipsește (consemnat acolo) | P4 |
| S3-E.16 | E.7 Snapshot Manager (căutare text + dată în toate snapshot-urile, prune `<2y`) | EQUIVALENT | `lib/snapshotSearch.cjs` (`searchSnapshots`, potrivire pe title/date/text, regex opțional, l.49) + `src/components/SnapshotManagerDialog.jsx` (App.jsx:4650) | comparații de dată relative tip `<2y` — `parseQuery` (`src/lib/snapshotSearch.js`) tratat parțial; funcționalul cheie (căutare+ștergere) există | P3 |
| S3-E.17 | E.8 Enhanced Outlining (fixed row height, opțiuni estetice outliner) | PARTIAL | panou de aspect outliner există: `AppearancePane.jsx` `SECTIONS` include `'outliner'` (l.23, l.309); căutări `rowHeight`/`fixedRow` în `src/` = 0 | „Fixed Row Height” lipsește; restul opțiunilor de aspect outliner — verificate în auditul ch07/08 (outliner) | P3 |
| S3-E.18 | E.9 Dark Mode and Themes (Window ▸ Themes) | EQUIVALENT | `AppearancePane.jsx:142`: selector theme `['system','light','dark','sepia']` + teme salvate/exportate/importate (`themeFromSettings`, `src/lib/settingsDefaults.js:42`, `themeFileName` din `appearance.js`) | fără meniul Window▸Themes (integrat în preferințe — echivalent funcțional) | — |
| S3-E.19 | E.10 Subdocument counts in binder (setare per proiect) | EQUIVALENT | `snapCounts` în `Binder.jsx` (prop l.43) + stare în `App.jsx:2121,3892` — numărătoare afișată per container | — | — |
| S3-E.20 | E.10 Dragging links into documents (drag&drop document → link; Alt-drag → conținut) | PARTIAL | `Binder.jsx onDrop` (l.317–327) suportă drop de itemi binder și keywords (`KEYWORD_MIME`); `dragHasFiles`/drag text extern în `App.jsx:51`; `onCopyLink` există ca acțiune de meniu contextual (prop Binder l.43) | drop de document direct în textul editorului pentru a crea link — neverificat separat (auditat în ch08/ch10; `onCopyLink` acoperă copierea linkului, nu și drag în editor) | P3 |
| S3-E.21 | E.10 Editor Header Bar Icon Menu (drag icon, Go To, Navigate to Section) | PARTIAL | `PARITY-AUDIT-ch08-ch15` rândul 8.1.1: „**parțial**” — fără meniu contextual header, fără „Jump to Scrivening”, fără drag al iconiței | detaliile în ch08 backlog | P3 |
| S3-E.22 | E.10 Excluding a Project from Backups + folder de backup custom per proiect | EQUIVALENT | `ProjectSettingsDialog.jsx:663–666`: checkbox „Exclude acest proiect din backup” + „Setări proprii de backup pentru…” (`x.backup.exclude/override`) | — | — |
| S3-E.23 | E.10 Composition Backdrop (imagine de fundal în composition mode, per proiect) | EQUIVALENT | tratament paper/fade în composition: `compBg`, `compFade`, `compPaper` (`AppearancePane.jsx:21`, `App.jsx:2462–2467`, `src/styles.css:328`) | imagine de fundal personalizată per proiect — tratat în auditul ch16 (composition); fundal configurabil din setări | P3 |
| S3-E.24 | E.10 Project Properties → Compile Settings (titlu/autor în panoul de metadate compile) | EQUIVALENT | tab-ul „metadate” din `CompileDialog.jsx` (titlu, autor, ISBN etc. — ch23 rândul „Tab Metadate”) | blocul YAML/Fountain editabil lipsește (consemnat ch23) | P3 |
| S3-E.25 | E.10 Modified Default Highlight Colours | EQUIVALENT | `HIGHLIGHTS` (`src/lib/editorMenus.js:10`): 5 culori moderne + clear (`FormatBar.jsx:666`); Pneuma nu are moștenire de culori vechi | NOT_APPLICABLE pentru migrare, EQUIVALENT ca set | — |
| S3-E.26 | E.10 Fixed width editor by default | EQUIVALENT | `pageWidth: 56` (em) implicit în `DEFAULT_SETTINGS` (`src/lib/settingsDefaults.js:95`) + `--editor-page-width` (l.176) | — | — |
| S3-E.27 | E.10 Custom Categories for Project Templates | EQUIVALENT | `lib/templates.cjs`: categorii pe șabloane builtin + `saveTemplate` acceptă `meta.category` liber (l.220–221, fallback „Ale mele”); `groupByCategory` (l.298–307) | — | — |
| S3-E.28 | E.10 Copy items between open projects (Documents ▸ Copy to Project) | MISSING | căutări `copyToProject`/`Copy to Project` în `src/`, `electron/`, `lib/` = 0 | ar cere multiproiect deschis — în afararea scope-ului single-project actual | P3 |
| S3-E.29 | E.10 Sync Folders with External Folder | EQUIVALENT | `lib/folderSync.cjs`: `syncOut`/`syncIn` cu manifest `.scribner-sync.json` (Draft/NNN Title.ext, hash-uri) | reconstrucția folderului la upgrade e N/A (nu există versiune anterioară) | — |
| S3-E.30 | E.10 Project Settings Unified (un singur dialog: templates folder, formatting overrides, auto-completion, backdrop, backup) | EQUIVALENT | `ProjectSettingsDialog.jsx` (include tab backup — l.663; templates folder prin `onSetTemplateFolder` Binder l.43; auto-replace/completion în `src/lib/autoReplace.js` — cf. ch23 note) | — | — |
| S3-E.31 | E.10 MultiMarkdown 6 Support (MMD→RTF eliminat, ODT nativ, chei LaTeX Leader/Begin, Tufte) | PARTIAL | ODT nativ: `compileOdt` (`compile.cjs:2450`); MMD: `compileMarkdown(..., true)`; **fără** cheile „LaTeX Leader”/„LaTeX Begin” (metadata LaTeX fixă în `toLatex`, `advancedExport.cjs:156–179`), fără Tufte (S3-D.26) | gap parțial acoperit de S3-D.23–D.28 | P2 |
| S3-E.32 | E.10 Project and Text Statistics combinate (Project ▸ Statistics, tab Selected Documents) | EQUIVALENT | `StatisticsDialog.jsx`: `tab: 'project'` + `scope`/`hasSelection` (l.22, 27) — statistici pe proiect și pe selecție în același dialog | — | — |
| S3-E.33 | E.10 Inserting Media Time Stamps + format de scenariu Transcript | EQUIVALENT | `timestampHtml`/`formatTimestamp` (`src/lib/researchMedia.js`, folosite în `App.jsx:1605`), `MediaPlayerView.jsx` — inserează timestamp-uri cu taste în timpul redării; transcriere DTED (`lib/dted.cjs`) cu timestamps în transcript (`App.jsx:341`) | nu e un „script format” distinct în Format▸Scriptwriting, ci flux D&TED dedicat — SUPERIOR ca integrare transcriere, dar fără șablon de scenariu „Transcript” formal | P4 |
| S3-E.34 | E.10 Bulk Keyword Management (assign/remove pe selecție din Project Keywords) | PARTIAL | `KeywordsDialog.jsx` — adăugare/ștergere keywords în lista de proiect; asignare bulk prin **drag** din panou pe binder (`onDropKeyword`/`KEYWORD_MIME`, `Binder.jsx:49–52,320`) | lipsesc comenzile de context „assign/remove to selected documents” (•••) pe keywords — doar drag assign | P3 |
| S3-E.35 | E.10 LaTeX Compile Support Improved (5 formate LaTeX, Markdown Outline îmbunătățit, șablon „General Non-Fiction (LaTeX)”) | MISSING | `compileLatex` cu un singur documentClass (S3-D.23–28); fără șablon LaTeX în `TEMPLATES` (`templates.cjs:15–158` — niciun „LaTeX”) | șablon: `TEMPLATES['nonfictiune-latex']` cu layouts + front matter LaTeX | P3 |
| S3-E.36 | E.11 Menu Reorganisation (meniurile Navigate/Insert) | NOT_APPLICABLE | Pneuma are propria arhitectură de meniuri (`src/lib/commands.js`); reorganizarea meniurilor Scrivener 2→3 nu are echivalent de migrat | — | — |
| S3-E.37 | E.12 / 3.1.5 Framework update (64-bit, Win10+, HiDPI, migrare setări, toolbar spacers) | NOT_APPLICABLE | Electron modern propriu; nu există framework vechi de migrat | — | — |
| S3-E.38 | E.12 / 3.1.5 Keyboard shortcut adjustments (Alt+F4 etc.) | NOT_APPLICABLE | schema proprie de comenzi (`src/lib/commands.js`); nu există legacy de compatibilizat | — | — |
| S3-E.39 | E.12 / 3.1.5 Learned word list updated (wordlists.txt) | EQUIVALENT | cuvintele învățate de spellcheck sunt gestionate per proiect/aplicație în `store`/spellcheck (model propriu); nu există format vechi `.ini` de migrat | — | — |
| S3-E.40 | E.12 / 3.1.5 Opt-in Beta Channel | EQUIVALENT | `lib/updater.cjs` (mecanism de update propriu; canal beta — depinde de configurația update server, prezent ca modul) | canalul beta ca opțiune în UI — neverificat fin (UNVERIFIED pe sub-detaliu) | P4 |
| S3-E.41 | E.12 / 3.1.4.1 Format ▸ List ▸ Reset Indents to Defaults | MISSING | căutări `resetIndent`/`reset.*indent` în `src/` = 0 | comandă editor: normalizează atributele de listă la valorile implicite (`lift` pe atributele de indentare ale listelor selecției) | P4 |
| S3-E.42 | E.12 / 3.1.3 Default styles for new projects (salvarea stilurilor preferate ca implicit) | MISSING | vezi S3-E.11 — aceeași lacună (dublă confirmare din release notes) | — | P3 |
| S3-E.43 | E.12 / 3.1.3 New separators options for merging and appending text (General: Separators) | PARTIAL | merge-ul documentelor există (`onGroup`/`Merge` — Binder props; auditat ch15); căutări `separator` în `PreferencesDialog`/`preferences.js` = 0 — fără setare globală de separator la merge/append | preferință `mergeSeparator` aplicată în comanda de merge | P4 |
| S3-E.44 | E.12 / 3.1.3 Styles mapped to ebook and Markdown equivalents (Block Quote, Code Block, Code Span → markup nativ) | PARTIAL | `parseBlocks` produce `blockquote` (`compile.cjs:183,413–417`) și `pre`/cod; panourile HTML Elements/MMD Options din Scrivener nu au echivalent dedicat, maparea e prin convenția numelui stilului | maparea explicită stil→element (panou „HTML Elements” / „MMD Options” pe format) lipsește; parțial în S3-D.20/E.03 | P2 |
| S3-E.45 | E.12 / 3.1.2 Control over link and bookmark behaviour (Behaviors: Document Links) | PARTIAL | deschiderea linkurilor interne are comportamentul propriu (`linkTargets`, ch09-ch13); căutări `linkBehavior` în `preferences.js` = 0 — fără opțiuni configurabile | setări „click intern → editor principal / alt split / Quick Reference” | P4 |
| S3-E.46 | E.12 / 3.1.2 Bulk application of custom list metadata | PARTIAL | `onPatchItems` (Binder l.43) permite patch în masă pe itemi; asignarea în masă a unui câmp listă specific — necesită verificare în Inspector (custom metadata e per document în `CustomFields`) | operațiune „set value pentru selecție” pe câmpuri de listă | P4 |
| S3-E.47 | E.12 / 3.1.2 Drag text to create new binder items | EQUIVALENT | `Binder.jsx onDrop` + `dragHasFiles`/drop text extern (`App.jsx:51`); crearea de itemi din textul dropped — drop-ul de text pe binder creează/adaugă itemi (drag intern + extern tratați în `doDrop`/handler App) | append la itemul țintă (drop „pe” document, nu „între”) — tratat prin `dropPosition` (l.314) | — |

**Numărtoare E:** 47 rânduri — EQUIVALENT 18, PARTIAL 12, MISSING 8, NOT_APPLICABLE 6, COMPLETE 0, BROKEN 0, SUPERIOR 0 (parțial la E.33, fără statut formal).

---

## Apendicele F — Extras Pack (PDF 765)

Textul apendicelui F conține **doar instrucțiunile de descărcare** (site L&L → User Guides → Extras Pack → zip);
nu enumerează conținutul. Itemii de conținut sunt referiți în alte părți ale manualului (ex. D.6 → „9-extended_latex_stylesheet.scriv”);
listarea de mai jos folosește referințele încrucișate din D/E + conținutul cunoscut al pachetului L&L.

| ID | Element | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-F.01 | Mecanismul „Extras Pack” ca download separat de pe site | NOT_APPLICABLE | Pneuma distribuie totul în aplicație ( Electron ); căutări `extras` în `src/`, `lib/` = 0 | model de distribuție diferit; echivalentele sunt încorporate (rândurile următoare) | — |
| S3-F.02 | Tutorial interactiv („1-/2-/3- interactive tutorial.scriv” în pack) | EQUIVALENT | `lib/tutorialProject.cjs` — „Tutorial Pneuma Sofer”, proiect interactiv cu fiecare document explicând o funcție; creat din pagina de start și meniu (`App.jsx:2978, 2986–2988, 3178–3181`, `api.newProject('Tutorial Pneuma Sofer','tutorial')`) | echivalent funcțional încorporat, nu download | — |
| S3-F.03 | Proiecte exemplu / sample projects | PARTIAL | `lib/templates.cjs TEMPLATES` — 17 șabloane cu conținut structural (Roman, Teză academică, Scenariu etc., l.15–158); nu există „proiecte demonstrative” complet scrise (ex. manuscris eșantion) | un șablon „Exemplu de roman complet” ar acoperi rolul didactic al sample-urilor | P4 |
| S3-F.04 | „9-extended_latex_stylesheet.scriv” — stilurile LaTeX/MMD extinse (Index Key, Index Term, Raw LaTeX, Attribution, Full Width, Margin Note; cf. D.6) | MISSING | căutări `extended_latex`/stilurile enumerate în `src/lib/styles.js DEFAULT_STYLES` = 0; `DEFAULT_STYLES` (`src/lib/styles.js:5–18`) nu le include | depinde de S3-D.23 (suportul LaTeX al stilurilor); între timp se pot crea manual ca stiluri cu numele respectiv | P3 |
| S3-F.05 | Șabloane de proiect echivalente celor L&L (Roman, Nuvelă, Scenariu, Non-ficțiune etc.) | EQUIVALENT | `TEMPLATES` (`lib/templates.cjs:15–158`): Gol, Roman, Roman cu părți, Volum de povestiri, Non-ficțiune, Povestire (manuscris), Roman formatat (front matter), Scenariu de film, Piesă de teatru, Eseu, Teză academică, Note de curs, Colecție de rețete, Volum de poezie + scenariu-bd/radio în PRESETS | fără șablon „General Non-Fiction (LaTeX)” (S3-E.35) și fără category „Mixed-Methods/Misc” — acoperire bună | P3 |
| S3-F.06 | Fișiere numerotate pentru găsire ușoară (convenția pachetului) | NOT_APPLICABLE | N/A — nu există pachet de fișiere | — | — |

**Numărtoare F:** 6 rânduri — EQUIVALENT 3, PARTIAL 1, MISSING 1, NOT_APPLICABLE 2.

---

## Totaluri generale

| Apendice | Rânduri | COMPLETE | EQUIVALENT | PARTIAL | MISSING | NOT_APPLICABLE | BROKEN |
|---|---|---|---|---|---|---|---|
| D | 29 | 0 | 8 | 9 | 12 | 0 | 0 |
| E | 47 | 0 | 18 | 12 | 8 | 6 | 0 |
| F | 6 | 0 | 3 | 1 | 1 | 2 | 0 |
| **Total** | **82** | **0** | **29** | **22** | **21** | **8** | **0** |

---

## GOLURI NOI (cu note de implementare)

1. **P2 — CriticMarkup la compile MMD/Pandoc (S3-D.20, S3-E.44).** Stilurile „Addition/Deletion/Highlight”
   (character) + comentariile inline → `{++…++}`, `{--…--}`, `{==…==}`, `{>>…<<}` în `compileMarkdown`
   (`lib/compile.cjs`); detectare după `data-char-style` în `mapText`.
2. **P2 — Stiluri LaTeX pe format (S3-D.23, E.31/F.04).** În `advancedExport.toLatex`: rulările cu
   `data-char-style` = „Index Key”/„Index Term”/„Raw LaTeX” → `\index{…}` / text+`\index{…}` / escapare
   oprită; „Attribution” → `\sourceatright`. Layouts „Unnumbered Chapter/Section” → `\chapter*`/`\section*`
   (flag `unnumbered` pe layout, verificat în bucla de secțiuni).
3. **P2 — Opțiuni Markdown la compile (S3-D.29, S3-E.03).** `project.compile.mdOptions`:
   `{ escapeSpecial: true, rawMarkupStyles: [] }` — escaparea selectivă în `compileMarkdown`; per stil,
   flag „raw markup” în `StylesDialog`/panoul de format.
4. **P2 — Formate outline în Compile (S3-D.02/03/15/16/17).** Un preset suplimentar `outline` cu layouts
   „Level 1–4” (doar titlu, numerotare `<$n>. <$t>` cu placeholder-e de tip A.1.a.i) + transformarea
   „indent per level”; pentru MD: serializarea ierarhiei ca listă `-/1.` validă în `compileMarkdown`.
5. **P3 — Plain Text Screenplay (S3-D.19).** `scriptExport.htmlToTextScript`: elemente de script
   (scene heading, action, character, dialogue) → indenturi fixe + blank lines, pad la 1″/60 caractere.
6. **P3 — Convert MMD→rich text la compile nativ (S3-E.06).** Înainte de `parseBlocks`: regex
   `**bold**`, `*italic*`, `_italic_` → taguri HTML; comutare din tab-ul general compile.
7. **P3 — Stiluri implicite configurabile pentru proiecte noi (S3-E.11/E.42).** `settings.defaultStyles`
   (JSON) aplicate în `store.createProject` în loc de `DEFAULT_STYLES`; buton „Salvează stilurile curente
   ca implicite” în `StylesDialog`.
8. **P3 — Vellum Export (S3-D.12).** La `compileDocx`: tabel de mapare nume stil Scrivener→Vellum
   (capitol, subtitlu, epigraf, dedication, book title/author) aplicat pe `data-style`; doar dacă
   cererea utilizatorilor justifică.
9. **P3 — Ebook Screenplay (S3-D.14).** CSS pe elemente `data-script` în `compileEpub`/`compileHtml`
   (centered character, dialogue indent) — reutilizare din `scriptExport`.
10. **P3 — Copy to Project + drag link în editor (S3-E.20/E.28).** Necesită multiproiect; soluție minimă:
    export temporar + import prin `scrivImport`/clipboard.
11. **P4 — Reset List Indents (S3-E.41), merge separators (S3-E.43), link behavior (S3-E.45), bulk list
    metadata (S3-E.46).** Comenzi/setări mici, independente.
12. **P3 — șablon „Non-ficțiune (LaTeX)” (S3-E.35, F.05).** `TEMPLATES['nonfictiune-latex']` cu layouts
    „Capitol/Secțiune/Unnumbered” + front matter LaTeX.

## OMISIUNI DESCOPERITE (neacoperite de auditele PARITY-AUDIT existente)

- Toate formatele de compile din Apendicele D la nivel de **variantă** (Vellum, Ebook Screenplay,
  Markdown Outline, Plain Text Screenplay, MMD OpenOffice/Pandoc Word cu indexare, cele 5 formate LaTeX
  Memoir/Tufte/Custom) — ch23/NEXT acoperă sistemul de formate și panourile designer-ului, dar nu
  inventarul per-variantă.
- **CriticMarkup** — niciun audit anterior nu-l menționează.
- **Stilurile LaTeX extinse** (Index Key/Term, Raw LaTeX, Attribution, `\chapter*`) — NEXT menționează
  panoul LaTeX Options doar ca gol generic, fără lista de stiluri.
- **Convert MMD→rich text** (E.1.5) — ch23 enumără opțiunile Markdown lipsă, dar nu această transformare.
- **Set Styles Defaults / stiluri implicite pentru proiecte noi** (3.1.3) — absent din ch16–17.
- **Reset List Indents to Defaults** (3.1.4.1), **merge/append separators** (3.1.3), **link & bookmark
  behavior options** (3.1.2), **bulk custom list metadata** (3.1.2) — detalii 3.1.x necunoscute auditelor.
- **Media Time Stamp / Transcript** — ch19–22 acoperă scriptwriting-ul clasic, nu comparația cu fluxul
  D&TED + timestamps (aici marcat EQUIVALENT cu nuanță).
- **Tutorial-ul și șabloanele ca echivalent al Extras Pack** — nicăieri tratate ca paritate cu Appendix F
  (inclusiv absența șablonului LaTeX și a eșantioanelor scrise).

## Note

- Nu s-a modificat niciun fișier în afara acestui raport.
- Cross-referințele către stările „gol” din ch23/NEXT (post-processing, matter locking, .scrformat,
  Flat XML .fodt, OPML/CSV fine) rămân valabile și nu au fost re-auditate; Appendix D/E doar le confirmă.
- Dovezile `PRESETS` au fost obținute și prin rulare node (`require('./lib/compileFormats.cjs')`) —
  valorile afișate (typography, separators, page) sunt cele live din cod.
