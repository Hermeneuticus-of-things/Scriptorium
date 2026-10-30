# Audit de paritate Scrivener 3 — capitolele 19, 21, 22

Data: 2026-10-30. Continuarea metodei din `PARITY-AUDIT-NEXT-CHAPTERS.md` (audit pe manualul
oficial inclus în instalare, Scrivener 3.1.6). Capitole acoperite: **19 Scriptwriting**
(PDF 410–428), **21 Using MultiMarkdown and Pandoc** (PDF 451–466), **22 Creating a Table of
Contents** (PDF 474–478).

Metoda și adâncimea: ca în documentul precedent — extragerea textului capitolului, scanare pe
arii de funcționalități, verificare în cod (`src/`, `lib/`, `electron/`) prin căutare țintită pe
identificatori (inclusiv sinonime EN/RO și chei i18n), confirmarea ariilor mari prin fișiere
concrete. Golurile sunt confirmate prin absența oricărui identificator relevant după 3–4 serii
de căutări.

## Rezumat pe capitole

| Capitol | Arii verificate | Stare |
|---|---|---|
| 19 Scriptwriting | mod script + 5 formate predefinite, elemente cu tranziții Tab/Enter, autocompletion personaje/titluri de scenă, FDX import/export, Fountain import/export/compile, compilare script (FDX/Fountain), șabloane de proiect „Scenariu” | **parțial** — lipsesc: Script Settings (formate personalizabile), selector de elemente în UI, mod per document, formate Interview/Transcript, import RTF/plain-text recunoscut |
| 21 MMD & Pandoc | markdown/MMD compile cu metadate, export Pandoc (YAML) / MMD, tabele & liste → markdown, note de subsol → `[^n]`, LaTeX compile, bibliografie `[@key]` + Zotero, import MD cu split pe titluri | **parțial** — lipsesc: binar pandoc/mmd + panou Processing, CriticMarkup, prefix/suffix pe stiluri, imagini cu handle-uri în compile folder, metadate din document în draft, snippet mode |
| 22 Table of Contents | cuprins generat la compile (HTML/PDF/EPUB nav/MD/DOCX), opțiune „Cuprins” în CompileDialog, „Cuprins de tipar” (buildPrintToc, propriu) | **parțial** — lipsește: ToC static cu `<$p>`/numere de pagină, „Copy Documents as ToC / Structured Link List” |

## Capitolul 19 — Scriptwriting (PDF 410–428)

| Arie | Stare | Dovezi cod — fișiere/funcții concrete |
|---|---|---|
| Mod script cu formate predefinite | parțial | `src/lib/scriptFormats.js` (`SCRIPT_FORMATS`: screenplay, stageplay, stageplay-uk, comic, radio/BBC — fiecare cu `elements`, `tab`, `enter`, `formatCss()`); meniu Format→Mod scenariu (`src/App.jsx` ~1910, chei `ui.scriptFormat.*` în `src/lib/i18n-ui.js`); `src/script.css` (font Courier Prime + stiluri pe `data-script`). **Lipsește:** formatele Interview, Transcript, BBC Taped Drama, Comic Book (2 variante); modul e global (`settings.scriptFormat`), nu per document (Ctrl+8); iconița de binder nu e tentată pentru documente script; fontul Courier Prime e referențiat dar nu e bundled (fallback Courier New) |
| Elemente de scenariu + tranziții Tab/Enter | parțial | `src/extensions/ScriptMode.js` (atribut `data-script` pe paragrafe, Tab/Shift-Tab `cycleScriptElement` → `nextOnTab()`, Enter → `nextOnEnter()`, transformare la majuscule pe input pentru elementele `upper`); tabele tab/enter hardcoded per format. **Lipsește:** editor de tabele Tab/Return („On return”, „Add colon before return”, „Insert text”, `<$mediaPlaybackTime>`) — §19.6.2 |
| Selector de elemente în UI (footer dropdown, Ctrl+\, Change Element To) | gol | Căutări: `setScriptElement` (expus în `src/components/Editor.jsx` useImperativeHandle dar **fără niciun apelant UI**), „script settings”, „elemente scenariu”, meniuri `src/components/Menu.jsx` (0 intrări script). Comutarea se poate face doar prin ciclarea cu Tab/Shift-Tab |
| Autocompletion pentru script | parțial | `ScriptMode.js`: `completeCharacterName`, `completeSceneHeading` (pe Tab); `scriptFormats.js`: `collectCharacters`, `collectSceneHeadings`, `completeSceneHeading` (prefixe INT./EXT. + titluri anterioare, extrase din documentul curent). **Lipsește:** liste de completare per element (tab Auto-Complete), „auto-add phrases to project list” cu scope pe element, „Go to next line”/comportament după completare; completarea generală de proiect există separat (`AutoComplete` în `src/editor/writing.js` + `project.autoComplete` în ProjectSettingsDialog) |
| Final Draft: import FDX | parțial | `lib/importers.cjs` `fdxToHtml()` (tipuri → `data-style`, bold/italic/underline păstrate); `electron/ioHandlers.cjs` `io:importText` (TEXT_EXTS include `.fdx`). **Lipsește:** script notes FDX (elemente `<Note>` ignorate), highlight-urile, import „Load from Final Draft” în settings |
| Final Draft: export document + compile FDX | acoperit (cod) | `lib/scriptExport.cjs` `htmlToFdx()` (note de subsol → script notes, bold/italic/underline); `electron/main.cjs` `script:export` (documentul curent → dialog salvare); `lib/compile.cjs` `compileScript()` + ținta `fdx` (întregul manuscris, titluri de secțiune → paragrafe General) — §19.2.3 ambele căi |
| Fountain: import/export/compile | parțial | `lib/importers.cjs` `fountainToHtml()` (scene headings INT/EXT/„.”, tranziții „>”, secțiuni `#`, sinopsis `=`, `@Personaj`, parenthetical, dialog, title page); `scriptExport.cjs` `htmlToFountain()` (secțiuni `#`, sinopsis `=`, `@`, „.”, escapare emphasis); țintă compile `fountain`. **Lipsește:** split pe slugline la import („Import and Split” creând un document per scenă, header→titlu, sinopsis→fișă), notele `[[ ]]` sunt aruncate, dual dialogue/lirice |
| Import scenarii din alte programe (RTF cu recunoaștere pe formatare, plain-text screenplay) | gol | Căutări: „screenplay” (doar help/scriptFormats), „paste as screenplay”, „plain.text formatted”, `rtf.cjs` (import RTF generic, fără mapare indent→element, fără „Use current font & paragraph settings”). Comenzile File▸Import▸Plain Text Formatted Screenplay și Edit▸Paste Plain Text as Screenplay nu există |
| Script Settings / formate proprii (§19.6–19.6.2) | gol | Căutări: „script settings”, „setări scenariu”, „elemente scenariu”, „format title”, „scriptElement” — 0 hits relevante. Formatele sunt hardcoded în `scriptFormats.js`; nu există panou cu listă de elemente editabilă, tab-uri Font/Paragraph/Tab-Return/Auto-Complete, nici meniul Manage (Reset/Use current font & paragraph/Load from FDX/Load-Save to file XML/Save for other projects) |
| Alte întrebuințări (Interview, Transcript + timestamp media) | gol | Căutări: „mediaPlaybackTime”, „timestamp” în `src/components/MediaView.jsx` — 0. `MediaView.jsx` nu are inserare de timestamp; formatele Interview/Transcript nu există |
| Tipărire/export scenariu prin compiler + șabloane „Scenariu” | acoperit (cod) | `lib/compile.cjs` ținte `fountain`/`fdx` (linie ~384, ~2073) + PDF/print standard; `lib/templates.cjs` șabloane `screenplay`/stage play (categoria `Scenariu`, `S()` helper cu `data-script`) |

## Capitolul 21 — MultiMarkdown și Pandoc (PDF 451–466)

| Arie | Stare | Dovezi cod — fișiere/funcții concrete |
|---|---|---|
| Compile → Markdown / Plain MMD (fișier `.md`/`.mmd`) | acoperit (cod) | `lib/compile.cjs` `compileMarkdown(project, readDoc, opts, multi)` — ținte `md`/`mmd`; metadate MMD Title/Author/Language când `multi`; `mdRuns`, `mdTable`, `mdEscape`; `lib/compileFormats.cjs`; în plus `lib/advancedExport.cjs` `toMultiMarkdown()` + comenzi `exportMmd` (`App.jsx` ~1884, `electron/v04Handlers.cjs` `v04:exportPandoc` flavor `mmd`) |
| Export Pandoc-flavored Markdown (YAML) | acoperit (cod) | `lib/advancedExport.cjs` `toPandoc()` (YAML: title/author/date/lang + `bibliography`/`csl`), comanda `exportPandoc` (`App.jsx` ~1883); și `compileMarkdown` pentru `.md` |
| Pandoc/MMD ca binar extern (DOCX/DocBook/ePub/LaTeX/ODT prin motoare; detecție instalare; căi unelte) | gol | Căutări: „pandoc” (doar nume de exporteri proprii), „pandocPath/mmdPath/externalTools” — 0. DOCX/EPUB/ODT sunt scriși nativ (`compileDocx`, `compileEpub`, `compileOdt`); nu există secțiunea „Setting up MultiMarkdown or Pandoc” (§3.3.1) cu căi/detecție |
| Import fișiere Markdown + Import and Split | acoperit (cod) / parțial | `lib/importers.cjs` (TEXT_EXTS: `.md`, `.markdown`); split: `lib/docxImport.cjs` `splitHtml()` (moduri h1/h2/separator) + `src/components/ImportDialog.jsx` + `io:importText`. **Lipsește:** extragerea blocului de metadate MMD/YAML în fișier separat la split (§21.4.1) |
| Imagini → sintaxă markdown | parțial | `compile.cjs` `mdRuns` (r.image → `![alt](data:mime;base64,…)`), `advancedExport.cjs` `blocksToMd`; redimensionare `ScaledImage` în editor. **Lipsește:** exportul imaginii ca fișier în „compile folder” cu handle = numele fișierului, cross-referencing MMD `[text](#handle)`, lista de figuri la final, caption-uri prin ghilimele paranteze/stil „Caption” (§21.4.2) |
| Liste și tabele → markdown | parțial | Liste: `compile.cjs` `b.type === 'li'` (bullets `-`/enumerare `1.`, adâncime, multi-paragraf prin line breaks); tabele: `mdTable()` (pipe, primul rând = header, colspan → celule goale). **Lipsește:** opțiunea tip comutator „Convert tables and lists…” (e necondiționat), sintaxa MMD pentru celule fuzionate, caption de tabel pe stil |
| Note de subsol → markdown | parțial | `compile.cjs`/`advancedExport.cjs`: markere `[^n]` + listă la final. **Lipsește:** convențiile duble `[^fn1]` inline vs `[^cf1]` legate (editorul are ambele tipuri — `Footnote` node + `LinkedFootnote` mark — dar compile le topește într-un singur flux) |
| Linkuri & cross-referencing → markdown | parțial | `compile.cjs` `mdRuns`: linkuri externe → `[text](url)` cu `mdUrl()`; opțiunea `linksToText` în `CompileDialog.jsx` („Legăturile interne devin text simplu”). **Lipsește:** cross-referencing MMD/Pandoc pentru linkuri interne către documente din draft (ancorele `#sec-N` rămân text), serializarea titlurilor duplicate |
| Adnotări/comentarii → CriticMarkup | gol | Căutări: „criticmarkup”, `{--`, `{++` — 0. Comentariile se exportă doar ca comentarii Word (`compileDocxPlain`, `CommentRangeStart/End`); în markdown sunt aruncate |
| Stiluri → markup propriu (prefix/suffix, fenced div, liste de definiții, panou „MultiMarkdown and Pandoc Options”) | gol | `src/lib/styles.js` (definiții fără prefix/suffix), `lib/compileFormats.cjs` (0 hits prefix/suffix), `lib/compile.cjs` (`parseBlocks(html, styles)` folosește doar look-ul). Căutări „prefix/suffix” în formate — doar `titlePrefix` pentru numerotare |
| Preserve formatting / raw markup / escapare | parțial | `mdEscape()` aplicat necondiționat (echivalentul „Escape special characters: on”, fără comutator); textul „preservat” (marcaj inline `code`, §11.6.10 — `src/editor/formatting.js`) nu ajunge ca span/bloc de cod în markdown. **Lipsește:** „Treat Preserve Formatting as raw markup”, stiluri „Code Block/Span” funcționale |
| Compile folder cu fișiere-suport (grafice, .tex, reutilizare) | gol | Compile-ul salvează un singur fișier prin dialog (`saveText`/`showSaveDialog` în `electron/main.cjs`, `v04Handlers.cjs`); imaginile sunt inline base64. Căutări „compile folder”, mkdir dedicat — 0 |
| LaTeX (boilerplate, document class, preamble personalizat) | parțial | `lib/compile.cjs` `compileLatex()` + țintă `tex`/`latex`; `lib/advancedExport.cjs` `toLatex()` — document .tex complet, autoconținut (`documentclass[12pt]{book}` parametrizabil prin `options.documentClass`, pachete utf8/fontenc/babel/hyperref). **Lipsește:** panou „LaTeX Options” (alegere class, „Custom” cu preamble/footer scrise în format), gestionarea fișierelor .tex-suport în compile folder |
| Metadate MMD & Pandoc (3 surse; document „Metadata” în draft; snippet mode) | parțial | Sursa de proiect: `compileMarkdown(multi)` (Title/Author/Language din proiect) + `toPandoc`/`toMultiMarkdown` (meta + bibliography/csl). **Lipsește:** document „Metadata” ca prim element al grupului de compile (§21.7, inclus variantele „Meta-data”), panou de metadate per format de compile, snippet mode (eliminarea Title/Author pentru document „fără antet”) |
| Post-processing / panou Processing | gol | Căutări: „postprocess/post-process/procesare” — 0. Nu există hooks de rulare script/binar după compile |
| Citări & bibliografie | parțial (echivalent propriu) | `lib/bibliography.cjs`: import Zotero BibTeX/BibLaTeX/CSL-JSON, descoperire citări `[@key]` (+[@key, p. 4]), liste de referințe APA 7/Chicago/MLA 9; `zotero.cjs`; cheile `bibliography`/`csl` în YAML-ul Pandoc. **Lipsește:** procesarea citărilor prin Pandoc la compile (natural dacă binarul lipsește); fluxul e cel propriu al aplicației |

## Capitolul 22 — Crearea unui cuprins (PDF 474–478)

| Arie | Stare | Dovezi cod — fișiere/funcții concrete |
|---|---|---|
| Cuprins generat la compile | parțial | `lib/compile.cjs`: opțiunea `toc` (`opts.toc`, checkbox „Cuprins” în `src/components/CompileDialog.jsx` ~493), `kind:'toc'` cu `tocEntries` (titluri, nivel ≤ 2), `tocHtml()` (nav cu linkuri) pentru HTML/PDF, nav EPUB `epub:type="toc"` (EPUB 3), listă markdown (`b.type === 'toc'`), intrări în DOCX. **Lipsește:** numere de pagină lângă intrări (inclusiv în PDF), opțiuni (adâncime, titlu personalizat — e fix „Cuprins”), ierarhie „folder-style” EPUB |
| „Copy Documents as ToC” (listă statică cu titluri legate + `<$p>`) | gol | Căutări: „as ToC”, „Copy Special” (există în `src/components/FormatBar.jsx` doar text/markdown/html/clean), „structured link” — 0. Nu există comanda care produce lista lipită în draft |
| „Copy Documents as Structured Link List” | gol | Aceleași căutări — 0 |
| Placeholder `<$p>` în corpul documentului → număr de pagină la compile | gol (în corp) | `<$p>` există doar în antet/subsol (`lib/compileFormats.cjs` linii 172/301/531…, `src/lib/i18n-ui.js` „ui.compileDialog.antet_si_subsol…”); nu e evaluat în textul documentelor la compile |
| Actualizarea titlurilor din ToC la numele compilate | gol | Legat de rândul anterior: fără listă ToC în draft nu există re-scrierea titlurilor conform prefixelor/sufixelor din layout (prefixele există: `lay.titlePrefix` în `compile.cjs` ~807) |
| Cuprins propriu „Cuprins de tipar” (echivalent Pneuma) | parțial | `src/lib/glossary.js` `buildPrintToc()` + `buildGlossaries()` (intrări numerotate 1, 1.1…, opțional sub-intrări din heading-uri h1–h3), comandă „Generează glosare și cuprins de tipar” (`cmd.glossaries`) — document static în Cercetare, fără numere de pagină și fără linkuri |

## Goluri noi identificate (backlog, prioritizat)

| Prioritate | Gol | Manual §/pag | Notă de implementare |
|---|---|---|---|
| P1 | **ToC static cu numere de pagină** — „Copy Documents as ToC” (listă lipită în draft: titlu legat + `<$p>`), evaluarea `<$p>` în corpul documentelor la compile (în PDF/print și DOCX) și actualizarea titlurilor legate la numele compilate | §22.1–22.2, PDF 475–477 (p. 470–472) | bazele există: generarea ToC la compile (`compile.cjs` kind:'toc'), linkurile interne (`sec-N`), `<$p>` deja evaluat în antet/subsol; se adaugă parse+replace pe blocuri de tip ToC la HTML paginat/DOCX și o comandă de copiere „ca ToC” (din selecția în Outliner/Binder) |
| P2 | **Script Settings: formate de scenariu personalizabile** — listă elemente editabilă (adăugare/redenumire/ordonare), tab-uri Font/Paragraph/Tab-Return/Auto-Complete pe element, Manage (reset, salvare/încărcare format, salvare globală) | §19.6, §19.6.1–19.6.2, PDF 420–427 (p. 415–421) | `scriptFormats.js` devine schemă de date serializabilă în proiect (formatul curent deja e `settings.scriptFormat`); CSS-ul pe elemente se generează deja din dată (`formatCss()`); tabelele tab/enter trec în format; FDX „Load from file” poate popula schema din `fdxToHtml` |
| P2 | **Selector de elemente script în UI** — dropdown în bara de format / meniu contextual (echivalent Ctrl+\ și „Change Element To”), cu scurtături pe cifre | §19.1, PDF 412–413 | comanda există deja: `setScriptElement` expus în `Editor.jsx` (useImperativeHandle) dar fără apelant; se adaugă dropdown în `FormatBar.jsx` (vizibil doar când scriptFormat activ) + intrări în `ContextMenu.jsx` |
| P3 | **Post-processing + motoare externe** — panou „Processing” per format de compile (rulare pandoc/mmd/script cu cale configurabilă), opțional detecția binarelor instalate | §21.3, §21.5.2, PDF 455, 467–468 (p. 450, 462–463) | `compile.cjs` returnează deja text/Buffer; se execută child_process cu comanda configurată după salvarea fișierului; deschide DocBook/mediawiki etc. fără scriere nativă |
| P3 | **Stiluri → markup markdown** — prefix/suffix pe stil (caracter și paragraf) aplicate la compile pentru md/mmd + CriticMarkup pentru adnotări/comentarii (`{--…--}`, `{++…++}`, `~~`) | §21.4.6–21.4.7, PDF 463–465 (p. 458–460) | `styles.js` câștigă câmpuri `mdPrefix/mdSuffix` (+per-paragraph); aplicate în `mdRuns`/`compileMarkdown`; comentariile deja au start/end în `parseBlocks` (r.commentStart/End) — se mapează pe sintaxa CriticMarkup |
| P3 | **Import & split pe scene pentru FDX/Fountain + note FDX** — un document per slugline, header→titlu, sinopsis→fișă; notele FDX devin comentarii | §19.2.2, §19.5, PDF 416, 420 (p. 411, 414–415) | `splitHtml()` are mecanismul; se adaugă un mod „slugline” (split pe `data-style="scene-heading"` în HTML-ul produs de `fdxToHtml`/`fountainToHtml`); `fdxToHtml` citește `<Note>` → `data-comment` |

## Notă de metodă

Extrasele text ale capitolului (fișiere `ch19.txt`, `ch21.txt`, `ch22.txt` din `scrivener-manual-scratch`)
au fost citite integral; ariile mari au fost verificate prin căutări țintite pe identificatori și
sinonime EN/RO (`grep` pe `src/`, `lib/`, `electron/`, inclusiv `i18n.js`/`i18n-ui.js`, `Menu.jsx`,
`commands.js`), fiecare „gol” confirmat cu minimum 3–4 serii de termeni diferiți. Nu e o diferență
linie culinie; ariile „acoperit” au implementare reală confirmată prin fișiere, cele „parțial” au
lipsurile enumerate explicit.
