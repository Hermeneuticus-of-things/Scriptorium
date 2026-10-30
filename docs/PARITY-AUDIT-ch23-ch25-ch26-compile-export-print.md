# Audit de paritate Scrivener 3 — capitolele 23, 25, 26 (compile, export, print)

Data: 2026-10-30. Continuarea metodei din `PARITY-AUDIT-NEXT-CHAPTERS.md`. Capitole acoperite:
**23 Compiling the Draft** (PDF 479–519), **25 Exporting** (PDF 587–592), **26 Printing**
(PDF 593–600). Pentru cap. 23 s-au auditat doar ariile din afara Compile Format Designer
(caps. 24 — deja acoperit în auditul precedent): fluxul general de compile, formate,
compile groups/filtre, opțiuni de conținut, metadate, copertă, cuprins, salvarea setărilor.

Metoda: extragerea textului capitolului din PDF, enumerarea ariilor de funcționalități la
granularitate mare, apoi verificare în cod (`src/components/`, `src/lib/`, `lib/*.cjs`,
`electron/`) prin căutare țintită pe identificatori + sinonime + chei i18n
(`i18n.js`/`i18n-ui.js`) și confirmarea ariilor mari prin fișiere concrete. „Gol" = zero
identificatori relevanți după 3–4 căutări cu termeni diferiți (inclusiv în engleză).

## Rezumat pe capitole

| Capitol | Arii verificate | Stare |
|---|---|---|
| 23 Compile (flux general) | comandă + dialog compile (Ctrl+Shift+E), formate built-in/proiect/globale, scope (draft/dosar/selecție), front/back matter, filtre, tab-uri opțiuni (conținut, secțiuni, separatoare, înlocuiri, note, pagină, metadate), copertă, cuprins, previzualizare live, salvare setări, tipuri de fișier, scripturi, post-processing | **acoperit în mare**, minus: lista de conținut cu include per item, filtre exclude, opțiunile compile group, lock/legare front-back matter, opțiuni de conținut avansate, $@, post-processing, .scrformat |
| 25 Export | export fișiere individuale (multi-format, structură oglindită, sidecar notes/synopsis/meta), OPML, CSV metadate | **parțial** (nucleul există; opțiuni + formate lipsă) |
| 26 Printing | print selecție (Ctrl+P), print preview (PDF viewer), page setup per proiect, printarea draftului prin compile → Print | **parțial** (print document + preview + page setup acoperite; print settings pe tip vizualizare, fișe index, outline — gol) |

## Capitolul 23 — Compiling the Draft (PDF 479–519)

| Arie | Stare | Dovezi cod — fișiere/funcții concrete |
|---|---|---|
| Comandă File ▸ Compile… (Ctrl+Shift+E) | acoperit (cod) | `src/lib/commands.js` (`compile: 'Ctrl+Shift+E'`), `src/App.jsx` (`commandList` „compile", butoane din toolbar + meniul Project) |
| Ecran overview: sidebar formate + tab-uri opțiuni | acoperit (cod) | `src/components/CompileDialog.jsx` (tab-uri: conținut, secțiuni, separatoare, înlocuiri, note, pagină, metadate); fără coloana de „layout preview tiles" — vezi rândul următor |
| Layout Preview (tiles per section layout, font chooser global, Assign Section Layouts, layout „As-Is", Show Unused Section Types) | parțial | previzualizare există, dar integrală (HTML), nu pe tiles: `CompileDialog.showPreview()` → `api.previewCompiled` → `lib/compile.cjs` `previewHtml()`; atribuirea layout-urilor se face în tab-ul „Sectiuni" (`defaultLayouts` per rol + tabelă tip×layout), nu prin dialog dedicat; „As-Is" ≈ layout cu `showText:false/showTitle:false` |
| Formate: Scrivener / My Formats / Project Formats + Default | acoperit (cod) | `lib/compileFormats.cjs` (`PRESETS` — 8 formate builtin, `allFormats`, `findFormat`, `sanitizeGlobalFormats`), globale în `userData/compile-formats.json` (`electron/ioHandlers.cjs` `io:listGlobalFormats`/`io:saveGlobalFormats`), de proiect în `project.compile.formats`; builtin read-only, duplicare/rename/ștergere (`CompileDialog.duplicate/rename/remove`, `duplicateFormat`) |
| Import/export formate (.scrformat) + import preseturi legacy | gol | căutări `scrformat`, `importFormats`, `exportFormat`, `legacy preset` = 0 rezultate (importul preseturilor Scrivener 1 e oricum N/A pentru Pneuma) |
| Compile group: Draft / subgrup / Current Selection / Search Results & Collections | parțial | `CompileDialog` `scope: 'draft' | 'folder' | 'selection'` + `lib/compile.cjs` `buildDocument()` (`o.ids`, `o.rootId`, `includeChildren`); „Search Results & Collections" ca sursă de grup lipsește (există doar filtrul pe colecție) |
| Opțiuni compile group: Treat as complete manuscript / Include text of containing group / Include subdocuments | parțial | numerotarea se calculează pe subsetul compilat (counterii pornesc oricum de la 1 — comportamentul „complete manuscript" e implicit, reversul lipsește); textul dosarului e mereu inclus la compilarea unui dosar (`visit([n], 0, true, 'body')`); `o.includeChildren` există în motor dar nu are comutator în UI |
| Lista de conținut (Include checkbox per item, Title, Section type inline, Alt-click bulk) | parțial | echivalent per-document în Inspector: `src/components/Inspector.jsx` (`includeInCompile` l.229, `sectionType` l.492); tabela agregată din dialog + bulk toggle — lipsesc |
| Filtrare (Include/Exclude, Label/Status/Collection/Current Selection/custom metadata, moduri Included/Excluded/All) | parțial | `lib/compile.cjs` `buildDocument()`: `labels`, `statuses`, `collectionFilter()` (`o.collectionId`/`o.collectionIds`) — doar direcția include; fără exclude, fără custom metadata, fără cele 3 moduri pentru `includeInCompile` |
| Front & Back Matter (dosare dedicate, transpunere sus/jos) | acoperit (cod) | `CompileDialog` `frontMatterId`/`backMatterId`; `lib/compile.cjs` `visit(..., 'front'/'back')` + secțiune DOCX front fără antet cu repornirea paginării (comentariu de la l.1447); PDF/HTML: `.front-page` |
| Lock front/back matter pe tip de fișier + legare automată la compile group (subfoldere cu nume pereche) | gol | căutări `matterLock`, `lock` pe compile = 0; `project.compile` nu stochează setări per output |
| Tab Metadate (title, author, ebook fields, YAML/Fountain block) | parțial | `CompileDialog` tab „metadate" (titlu, autor, limbă, editură, ISBN, identificator, descriere, subiecte, copertă) → `compileEpub` `meta` (compile.cjs ~l.1528); placeholders `<$projecttitle>`, `<$abbr_title>`, `<$author>`, `<$forename>`, `<$surname>`, `<$date>`, `<$year>` (`placeholderValue`, l.466–497); lipsesc: blocul YAML/Fountain editabil (`compileMarkdown` scrie fix Title/Author/Language), contributors+roluri, abbreviated title în UI |
| Tab General Options (remove comments/annotations, strikethrough, whitespace, backlinks, imagini, Markdown options, ebook options) | parțial | `lib/compile.cjs` `cleanMarkup()` (l.577): `removeHighlights`, `removeColors`, `linksToText` (doar legături interne `scribner://`); `transforms.notes` (footnotes/endnotes capitol/carte), `transforms.comments` (strip/export DOCX); lipsesc: delete struck-through text, remove trailing whitespace, insert links back to Scrivener + unique identifiers, remove all hyperlinks, scale images to fit, opțiunile Markdown/ebook (resample imagini, pop-up footnotes, save source files, book begins after front matter) |
| Tab Project Replacements (§23.4.4) | acoperit (cod) | `CompileDialog` tabelă proiect (`ui.projectReplacements.*` în `src/lib/i18n-ui.js` l.112–121): activ/inactiv, regex, whole word, majuscule, reordonare ↑↓; `project.replacements` aplicate înaintea celor pe format — `lib/compile.cjs` l.759–762 + `compileReplacements()` l.537; lipsește doar wildcard-ul `$@` |
| Tab Cover (§23.4.5) | acoperit (cod) | `coverId` (pdf/docx/epub) + `coverImage` → PDF `.cover-page`, DOCX primă pagină, EPUB `cover.xhtml` + `properties="cover-image"` (compile.cjs l.1597–1605 — echivalentul „Add HTML cover page", mereu activ) |
| Tab Table of Contents (§23.4.6) | parțial | `lib/compile.cjs`: `tocEntries` + `tocHtml()` (l.976) pentru HTML/PDF, `nav epub:type="toc"` pentru EPUB (l.1650), DOCX `type:'toc'`; fără opțiunile manualului (depth, flat, bold top-level, center, titlu personalizat — „Cuprins" fix, landmarks) |
| KindleGen / Mobi | parțial (decizie documentată) | `lib/advancedExport.cjs` `KINDLE_EPUB_NOTE`: .kpf/.mobi proprietare nu pot fi scrise; KDP primește EPUB — decizie documentată, nu gap de implementare |
| Tipuri de fișier suportate (§23.5) | parțial | `compile()` (l.2096): docx, epub, html, rtf, odt, md, mmd, txt, fountain, fdx, tex, pdf (printToPDF), print; lipsesc: .doc legacy, .xps, FlatXML .fodt, DocBook .xml, PDF prin pdflatex/xelatex |
| Export scripts (Fountain/FDX) (§23.5.1) | acoperit (cod) | `lib/scriptExport.cjs` (`htmlToFdx`, `htmlToFountain`), comenzi `exportFdx`/`exportFountain` (App.jsx) + `compile('fountain'/'fdx')` → `compileScript` |
| Post-processing commands (§23.5.2) | gol | căutări `postProcess`, `post-process`, `postprocesare`, `processing pane` = 0 în `lib/compile*.cjs` |
| Compilare & salvare setări (§23.6) | acoperit (cod) | `CompileDialog.run()` → `persist()` (salvează în `project.compile` înainte de compile), buton „Salvează setările", previzualizare; buton Reset (Alt în Scrivener) lipsește — detaliu minor |

## Capitolul 25 — Exporting (PDF 587–592)

| Arie | Stare | Dovezi cod — fișiere/funcții concrete |
|---|---|---|
| Export fișiere individuale (File ▸ Export ▸ Files…, structură binder oglindită, media ca fișiere originale, textul dosarelor în fișier separat) | parțial | `src/components/ExportDialog.jsx` (scope selecție/dosar/tot proiectul) + `lib/exporters.cjs` `exportDocuments()` (foldere → subfoldere, media copiată din `media/`, textul dosarului scris în subfolder); formate disponibile: docx, odt, rtf, md, txt, html (`FORMATS`, l.104) — lipsesc PDF, DOC, XPS, FDX, Fountain, MMD |
| Sidecar: Notes și Metadata („(Title)Notes", „(Title)MetaData.txt") | parțial | `exporters.cjs` `writeSidecars()`: `.notes.md`, `.synopsis.txt`, `.meta.json` (created/modified/label/status/keywords/includeInCompile prin `metaFor()`) — conținut echivalent, convenție de numire diferită (per document, nu per binder title) |
| Opțiuni export: Do not export subdocuments / Number exported files / Remove comments and annotations / Convert rich text to MMD | gol | `exportDocuments()` include întotdeauna descendenții; fără prefix de ordine între frați, fără strip comments/annotations, fără .mmd; căutări `subdocuments`/`numbered` în i18n = 0 chei relevante |
| OPML / MindMap (File ▸ Export ▸ OPML or MindMap File…, selecție sau întreg binderul, opțiuni note: Titles Only / +Synopses / +Text / +Notes) | parțial | `lib/exporters.cjs` `exportOpml()` (OPML 2.0, titluri + `_note` sinopsis + `_label`/`_status`, trash exclus) + `exportOpml` handler (`electron/ioHandlers.cjs`) și import (`importOpml`); export doar pe întreg binderul, fără cele 4 moduri de note, fără mindmap Freemind, fără plaintext outline |
| Export metadate la spreadsheet (CSV/TSV/semicolon, encoding, doar coloanele vizibile) | parțial | `lib/exporters.cjs` `exportMetadataCsv()` (header: id/title/path/type/label/status/keywords/section_type/include_in_compile/words/created/modified + custom metadata, BOM UTF-8); doar CSV cu virgulă, doar tot proiectul, fără TSV/semicolon, fără encoding, fără selecția coloanelor |

## Capitolul 26 — Printing (PDF 593–600)

| Arie | Stare | Dovezi cod — fișiere/funcții concrete |
|---|---|---|
| Print document/selecție (File ▸ Print…, Ctrl+P) | acoperit (cod) | `src/App.jsx` `printCurrent()` → `api.printDocuments(dir, project, { ids: selectionList() })` → `io:printDocuments` (`electron/ioHandlers.cjs`, dialog de printare de sistem); fallback `io:printDocument`; fără comportament diferit pe corkboard/scrivenings/outliner |
| Print Settings — Text Document tab (page numbers/filename în antet, conținut, remove annotations, print using font) | gol | nu există dialog „Print Settings"; `src/components/PageSetupDialog.jsx` acoperă doar hârtie/margini/antet-subsol/font; căutări `printSettings`, `print using font` = 0 |
| Printare fișe index + Index Card Print Settings (titluri, bold, culoare etichetă, numerotare, keywords, cutting guides, decorate keywords, font) | gol | căutări `printCards`, `indexCard print`, `cutting`, `card numbers` în context print = 0; printarea din corkboard trece prin pipeline-ul de documente text |
| Printare outline + opțiuni (titluri+numere, sinopse, label/status, keywords, custom metadata, word/char counts, indent by level, font) | gol | căutări `printOutline`, `outline print` = 0; din outliner se printează documentele selectate ca text |
| Print Preview (File ▸ Print Preview…, zoom, navigare pagini, orientare, Save PDF → dialog de printare) | parțial | `src/components/PrintPreviewDialog.jsx` (PDF viewer: zoom page-fit/width/%, navigare pagină, page count, Save PDF via `io:savePrintPdf`, Print via `io:printDocuments`) + varianta compilată în fereastră separată (`io:printPreview` `options.compiled`); fără comutator de orientare în preview (vine din Page Setup) și fără vizualizări multi-pagină (book/4-up) |
| Page Setup (File ▸ Page Setup…, per proiect) | acoperit (cod) | `src/components/PageSetupDialog.jsx` + `lib/printSetup.cjs` (hârtie A4/A5/Letter/Legal/6x9/custom, orientare, margini, antet/subsol cu placeholder-e `<$p>`, prima pagină diferită, font; `project.pageSetup` + default `userData/page-setup.json`; pipeline comun cu Compile PDF prin `compile.pageCss`) |
| Printarea Draftului prin Compile (Compile for: Print) | acoperit (cod) | `CompileDialog` `output='print'` → `api.printPreview(..., {compiled:true})` → `io:printPreview` generează PDF-ul compilat în fereastră cu viewer Chromium și buton Print → dialogul Windows (inclusiv PDF writer) |

## Goluri noi identificate (backlog, prioritizat)

| Prioritate | Gol | Manual §/pag | Notă de implementare |
|---|---|---|---|
| P1 | **Lista de conținut în Compile + filtre include/exclude** — tabelă cu itemii grupului compilat (Include checkbox, titlu, tip de secțiune schimbabil inline), bulk toggle, filtre cu direcție include/exclude pe label/status/colecție și moduri Included/Excluded/All | §23.4.1, p. 488–491 | tabelă în tab-ul „continut" din `CompileDialog.jsx` (tree + `store.wordCount`); extinde `passes()` din `buildDocument()` (`lib/compile.cjs` l.716) cu `exclude` + `mode`; checkbox-urile există deja în Inspector, se mută în listă |
| P1 | **Print Settings: fișe index + outline** — dialog cu tab-uri pentru printarea corkboard-ului ca fișe (titluri, culoare etichetă, numerotare, keywords, cutting guides) și a outline-ului ca listă indentată (sinopse, label/status, keywords, word/char counts, indent by level) | §26.1.1–26.3, p. 590–592 | generator HTML nou (carduri din sinopse cu CSS grid per pagină; listă indentată din `project.tree`/outliner) + dialog mic cu opțiunile; se folosește pipeline-ul existent `printSetup.printPage()` → `io:printDocuments` |
| P2 | **Opțiuni de conținut la compile** — Delete struck-through text, Remove trailing whitespace, Remove all hyperlinks, Scale images to fit page width, Insert links back to Scrivener / unique identifiers | §23.4.3, p. 499–501 | extinde `cleanMarkup()` + `buildDocument()` din `lib/compile.cjs`: `<s>/<del>` → șters, regex whitespace-final, `<a>` → text, `img` cu `max-width` (parțial deja prin CSS), inserare `scribner://doc/<id>` ca link/identificator la începutul fiecărei secțiuni |
| P2 | **Opțiuni compile group & front/back matter** — Treat as complete manuscript, Include text of containing group, Include subdocuments (selecție), lock front/back matter pe tip de fișier, legare automată grup↔subfolder cu nume pereche | §23.4.1, p. 487, 492–494 | `project.compile.matterLocks = { output: { frontMatterId, backMatterId } }` + 3 checkbox-uri în tab-ul „continut"; motorul are deja `includeChildren`; pentru counteri, parametru care scade offset-ul poziției în draft |
| P2 | **Extinderea Export Files** — formate PDF/Fountain/FDX/MMD în dropdown + opțiunile „Do not export subdocuments", „Number exported files", „Remove comments and annotations" | §25.1–25.2, p. 583–584 | `exporters.cjs` `exportDocuments()`: reutilizare `compile.compile` (pdf/fountain/fdx/mmd există deja în motor); opțiunile sunt filtre simple în `visit()` + prefix `NN_` la numire |
| P3 | **Partajare formate de compile + post-processing** — export/import fișier de format (echivalent .scrformat) și comenzi post-processing per format (pipeline după generare) | §23.2.5 p. 480; §23.5.2 p. 513 | serializarea unui format din `project.compile.formats`/globale în `.json` + dialog import (sanitize deja există: `sanitizeGlobalFormats`); post-processing = câmp `postprocess` pe format rulat cu `child_process.exec` în `compile:export` |
| P3 | **Opțiuni fine ToC ebook, OPML și CSV** — ToC: titlu personalizat, flat, bold top-level, depth; OPML: cele 4 moduri de note, mindmap Freemind, plaintext outline, export selecție; CSV: separator (csv/tsv/semi), encoding, doar coloanele vizibile, export selecție | §23.4.6 p. 508–509; §25.3–25.4 p. 585–587 | patch-uri mici: parametri în `tocHtml()`/`compileEpub()`; opțiuni în `exportOpml()`/`exportMetadataCsv()` + dropdown-uri în `ExportDialog.jsx` |

## Note

- Golurile din cap. 23 legate de Compile Format Designer (section types/layouts, separatoare,
  transformări de bază, CSS, page setup, antet/subsol, front/back matter, copertă, Kindle,
  Pandoc/MMD/LaTeX, înlocuiri pe format) sunt tratate în `PARITY-AUDIT-NEXT-CHAPTERS.md` —
  aici doar s-a confirmat adâncimea lor prin `lib/compile.cjs` / `lib/compileFormats.cjs`.
- Între timp, golul P2 din auditul precedent („Project-level Replacements", §23.4.4) a fost
  implementat: `project.replacements` + tabelă în `CompileDialog.jsx` + aplicare în
  `lib/compile.cjs` înaintea înlocuirilor pe format. Rămâne deschis doar wildcard-ul `$@`.
- Înlocuiri de proiect în editor (auto-replace la tastare) sunt în `src/lib/autoReplace.js` —
  funcție separată de cele de compile.
