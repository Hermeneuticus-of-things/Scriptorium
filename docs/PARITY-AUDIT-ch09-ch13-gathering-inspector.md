# Audit de paritate Scrivener 3 — capitolele 9, 13

Data: 2026-10-30. Continuarea metodei din `PARITY-AUDIT-NEXT-CHAPTERS.md` (audit pe manualul
oficial inclus în instalare, extrase în `scrivener-manual-scratch/`). Capitole acoperite:
**9 Gathering Material** (PDF 161–175), **13 Inspector** (PDF 269–297). Referință: Scrivener 3.1.6.

Metoda și adâncimea: extragerea textului capitolului din PDF, enumerarea ariilor mari de
funcționalitate, apoi verificare în cod prin căutare țintită pe identificatori + sinonime +
chei i18n (`src/lib/i18n.js`, `i18n-ui.js`) + registrele de comenzi (`src/App.jsx`,
`src/lib/commands.js`). Ariile marcate „gol" au avut 3–4 căutări cu termeni diferiți (inclusiv
englezești) cu zero rezultate. Ariile din lista „implementat deja" au fost verificate doar
pentru adâncime, nu re-flagrate ca goale.

## Rezumat pe capitole

| Capitol | Arii verificate | Stare |
|---|---|---|
| 9 Gathering Material | import fișiere text+media (RTF/DOCX/ODT/TXT/MD/HTML/FDX/Fountain + PDF/imagini/audio/video), Import and Split (h1/h2/separator), import pagină web cu imagini offline, OPML, import proiect Scrivener (conversie completă), Scratchpad, Append Selection to Document, curățare formatare | **acoperit în mare** (cod), parțial la: split ierarhic + scene screenplay, Scratchpad pe disc, import Scrivener „în binderul curent"; gol: linked research (fișiere ca referințe), drag&drop din Explorer, screenplay text simplu, .mm/Scapple |
| 13 Inspector | 5 tab-uri (Detalii/Note/Note proiect/Comentarii/Snapshots), lock pe document, Floating Inspector în Composition, sinopsis text+imagine, note document rich-text, bookmark-uri document+proiect, metadate generale, custom metadata (4 tipuri), keywords cu culori, snapshots (create/redenumire/ștergere/comparare 2-snapshot/rollback), panou comentarii cu culori+salt | **acoperit în mare** (cod), parțial la: bookmarks fără preview în Inspector, subsoluri read-only în panou, fără scurtături per tab; gol: doar detaliile mici (crop imagine sinopsis, scurtături tab) |

## Capitolul 9 — Gathering Material (PDF 161–175)

| Arie | Stare | Dovezi cod |
|---|---|---|
| Import fișiere (text + media, §9.1.1) | acoperit (cod) | `lib/importers.cjs` (`fileToHtml`: rtf/odt/html/fdx/fountain; docx/txt/md prin `lib/docxImport.cjs` cu mammoth + tracked changes; `lib/rtf.cjs`), `electron/ioHandlers.cjs` (`io:importFiles`, `MEDIA_EXTS` cu pdf/png/jpg/mp3/mp4…), text → documente, media → `media/` + Research; vizualizare în `src/components/MediaView.jsx` (PDF/imagini/audio/video), „Deschide în editor extern" (`cmd.openExternal`, `media:openExternal`) |
| Import and Split (§9.1.6) | parțial | `lib/docxImport.cjs` `splitHtml` (mode `h1`/`h2`/`separator`), `src/components/BatchADialogs.jsx` (`ImportSplitDialog`) + `src/components/ImportDialog.jsx`, `io:importFiles(dir, mode, separator)`; titlul = textul titlului de sectiune („remove first lines" implicit). **Lipsește:** nesting pe adâncime >2 (structură ierarhică în binder), bloc MMD/YAML ca prim document, selector de elemente pentru .fdx, split Fountain pe scene cu sinopsis |
| Import pagină web (§9.1.2) | acoperit (cod) | `lib/importers.cjs` `importWebPage` + `webPageToHtml` + `localizeImages`/`makeImageFetcher` (descarcă imaginile în `media/` → copie offline), `io:importWebPage`, comanda `cmd.importWeb`; rezultatul e text editabil direct (nu necesită „Convert Web to Text") |
| Screenplay text simplu (§9.1.3) | gol | căutări `plain.?text.?screenplay`, `slug.?line`, `movie.?magic` → 0; `fountainToHtml` acoperă doar Fountain; FDX e acoperit (`fdxToHtml`, stiluri → `data-style` compatibile cu `src/lib/scriptFormats.js`) |
| OPML (§9.1.4) | acoperit (cod) | `lib/importers.cjs` `importOpml` (ierarhie + `_note`→sinopsis + `_label`/`_status`), `io:importOpml`, `cmd.importOpml`, `src/App.jsx` `importOpmlOutline`; fără setări de import (notes → câmp la alegere) — adâncime mai mică decât manualul. **.mm (FreeMind) — gol** (`freemind`, `mindmap` → 0) |
| Proiect Scrivener (§9.1.5) | parțial | `lib/scrivImport.cjs` (691 linii): parsează .scriv 3.x și 1/2.x — tree, text, notes, synopsis, snapshots, comments, bookmarks, labels, statuses, keywords, customFields, sectionTypes, targets, styles; fluxul actual = „deschide ca proiect nou" (`import:scriv` în `electron/main.cjs:763`, buton în `src/components/Home.jsx`). **Lipsește:** importul ÎN binderul curent ca folder la rădăcină |
| Scapple (§9.1.7) | gol | `scapple` în src/lib/electron/docs/FEATURES → 0 (nichelat, ecosistem L&L) |
| Linked research — fișiere ca referințe (§9.2) | gol | căutări `shortcut`, `alias`, `externalPath`, `linked.?file`, `.lnk`, `research.?files.?as` → 0 relevante; toate fișierele se copiază în proiect; `Documents ▸ Change Shortcut Target` inexistent |
| Scratchpad (§9.3) | parțial | `src/components/Scratchpad.jsx` (listă note + editor + „Trimite în proiect" → document nou în folderul inbox configurabil `project.inboxFolder`, `src/components/ProjectSettingsDialog.jsx:382`), note persistate în `settings.scratchpad`, comandă Unelte (App.jsx:1908). **Lipsește:** varianta „Append Text To", sincronizarea bidirecțională cu folder de pe disc (§9.3.2), scurtătura universală |
| Text Appending Tools (§9.4) | acoperit (cod) | `src/App.jsx:818` `appendSelectionTo` + dialog `appendTo` (PickNodeDialog, doar documente text), `cmd.appendSelection` (i18n.js:135); varianta „New…" (document nou din selecție) lipsește; drag cu Alt din binder în editor lipsește (`Editor.jsx` fără onDrop) |
| Curățarea itemilor importați (§9.5) | acoperit (cod) | `src/components/FormatBar.jsx:515` (`applyDefaultFormatting` pe selecție/tot documentul) + strip/convert notații deja implementate (`src/lib/notationOps.js`, `cmd.stripNotationDoc/Project`) |
| Drag&drop import din File Explorer (§9.1) | gol | `dataTransfer.files` → 0 în src/; drag-ul din Binder e doar intern (reordonare) |

## Capitolul 13 — Inspector (PDF 269–297)

| Arie | Stare | Dovezi cod |
|---|---|---|
| Panou inspector: toggle + persistare (§13.1) | acoperit (cod) | `src/components/Inspector.jsx`, `showInspector` (App.jsx:183), `toggleInspector: Ctrl+Shift+I` (`src/lib/commands.js:66`), persistat în `saveUi/loadUi` (App.jsx:465) |
| Lock inspector pe document (§13.1.1) | acoperit (cod) | `Inspector.jsx:103–166` (lockbar + `lockMemory` care supraviețuiește remount-ului, clasă `inspector-locked`, callback `onLockChange`); doar din lockbar, nu și din meniul contextual al split-ului |
| Inspector plutitor în Composition Mode (§13.2.2) | acoperit (cod) | `src/components/FloatingInspector.jsx` (sinopsis, label, status, note — subset corect; fără snapshots, conform manualului) |
| Scurtături per tab (Alt+U/N/J/L/Shift+M/O/I, §13.2.2) | gol | căutări în `commands.js`/`i18n.js` după `Alt+U/N/J/L/O`, `inspectorTab` → 0; doar toggle-ul de panou e scurtătură |
| Tab Notes: sinopsis (§13.3.1) | acoperit (cod) | `Inspector.jsx` tab `meta`: textarea sinopsis + `SynopsisImagePicker` (imagine sinopsis `node.synopsisImage`, comutator „pe card" `showSynopsisImage`, eliminare imagine) + auto-fill din text (`cmd.autoSynopsis`, `src/lib/textTools.js` `autoSynopsis`) + afișare culori card; **lipsește:** crop/scale/align pe imagine, „Trimite sinopsisul în textul principal", comutator imagine/text cu scurtătură |
| Tab Notes: note de document (§13.3.2) | acoperit (cod) | tab `notes` cu editor tiptap complet (`Notes` + `buildExtensions` — imagini, liste, stiluri), încărcare/salvare per document (`NotesLoader`, `readDoc/writeDoc 'notes'`) |
| Tab Bookmarks — document (§13.4) | parțial | `Inspector.jsx` `DocumentExtras`: bookmark-uri interne (dropdown `linkTargets`, deschidere în editor) + externe (URL), ștergere. **Lipsește:** zona de preview sub listă (portal editabil), redenumirea (F2 / redenumire item), editarea URL-ului extern, bookmark la fișier extern, chevron pentru foldere bookmark-uite, deschidere în Quick Reference/alt editor |
| Tab Bookmarks — proiect (§13.4) | parțial | `src/components/BookmarksPanel.jsx` (listă + preview read-only + „Adaugă documentul curent" + deschidere), dialog `bookmarks` (App.jsx:2476), `cmd.bookmarks`/`cmd.bookmarkAdd`; preview-ul nu e portal editabil; rețeaua de back-linkuri (§10.1.1) lipsește |
| Tab Metadata — general (§13.5.1) | acoperit (cod) | `MetaTable` (Creat/Modificat), checkbox `includeInCompile`, selector `sectionType` („după nivel" implicit), label/status (în tab-ul Detalii, nu bară jos), țintă document |
| Custom metadata (§13.5.2) | acoperit (cod) | `Inspector.jsx` `CustomFields` (text, checkbox, listă cu „(nimic)", dată), definire în Project Settings (`src/lib/projectSettings.js` — rename/delete/dedup câmpuri, `src/components/ProjectSettingsDialog.jsx`); opțiunea „wrap text" lipsește |
| Keywords (§13.5.3) | acoperit (cod) | `Inspector.jsx` `Keywords` (chips + input + datalist din toate keywords, ștergere), panoul de proiect `src/components/KeywordsDialog.jsx` + `src/lib/collections.js` (`setKeywordColor`, `setKeywordParent` — grupuri), culori pe carduri (`Corkboard.jsx:103`); drag-reorder și drag din panou lipsesc |
| Snapshots (§13.6) | acoperit (cod) | `Inspector.jsx` tab `snapshots`: creare cu titlu, redenumire, ștergere, preview read-only, comparare cu textul curent + **comparare între două snapshots** (exclusivitatea din manual), rollback cu snapshot automat înainte; backend `lib/store.cjs` (`takeSnapshot`:265, `listSnapshots`:368, `updateSnapshotHtml`:393) + `electron/main.cjs` `snap:*`; **lipsește:** navigare next/prev printre schimbări, granularitate paragraf/clauză/cuvânt (doar `diffWords`), sortare pe coloane, Snapshots Manager (bulk multi-document) |
| Comments & Footnotes (§13.7) | parțial | `Inspector.jsx` tab `annot` + `CommentItem`: listă comentarii cu text citat, autor/dată, culori (5 swatch-uri), salt la text (`onJumpToComment`, App.jsx:2349), editare (double-click), ștergere; subsolurile listate read-only. **Lipsește:** editarea subsolurilor din panou (există în editor la dublu-click, `Editor.jsx:149`), adăugare comentariu/subsol din panou, expand/collapse note, multi-select, „Convert to Default Formatting"; conversia comentariu↔subsol există ca comenzi de document (`src/lib/noteConvert.js`, `FormatBar.jsx`, `cmd.convertAnnotToComment` etc.), nu din panou |

## Goluri noi identificate (backlog, prioritizat)

Niciun gol P1: nucleul ambelor capitole (import, split, web, OPML, Inspector cu toate tab-urile
majore, snapshots, comentarii) e deja implementat. Golurile rămase sunt de tip „util dar
nichelat" sau de adâncime.

| Prioritate | Gol | Manual §/pag (PDF) | Notă de implementare |
|---|---|---|---|
| P2 | **Linked research — fișiere externe ca referințe** (binder item care trimite la fișierul de pe disc, fără copiere; reparare țintă) | §9.2, PDF 170–172 | `node.external = { file, name }` în project.json; randare în Binder cu insignă de link; deschidere via `openMediaExternal` deja existent; „Change Shortcut Target" = dialog de re-selectare a căii |
| P2 | **Import and Split: adâncime ierarhică + split pe scene** (h3+ imbricate în binder; Fountain/FDX split pe scene cu sinopsis din descrieri) | §9.1.6, PDF 166–169 | extinde `splitHtml` din `lib/docxImport.cjs` să returneze structură imbricată pe nivel de titlu; `fountainToHtml` grupat pe `scene-heading` → lista de documente; reutilizează `importOpml`-style tree building |
| P2 | **Panou Bookmarks în Inspector cu preview** (listă dedicată + zonă de previzualizare a itemului intern, editare URL extern, redenumire) | §13.4, PDF 279–283 | mută bookmark-urile din `DocumentExtras` într-un tab propriu; reutilizează `BookmarksPanel` (preview `readDoc` există deja); edit URL = prompt + patch pe `node.bookmarks` |
| P3 | **Import prin drag&drop din File Explorer în binder** (fișiere + foldere recursive) | §9.1, PDF 162 | în preload: `webUtils.getPathForFile` pe evenimentul drop; în Binder `onDrop` → reutilizează fluxul `io:importFiles` (text → document, restul → media) |
| P3 | **Import proiect Scrivener în binderul curent** (folder la rădăcină, cu text/sinopsis/notes/snapshots) | §9.1.5, PDF 166 | `lib/scrivImport.cjs` parsează deja tot; adaugă mod „into current": importă în sub-folder cu prefix de titlu, cu mapare id-uri noi |
| P3 | **Scratchpad legat la folder de pe disc** (afișează fișiere din folderul configurat, editări externe vizibile; „Trimite → adaugă la document") | §9.3, PDF 172–173 | observator pe folder (reutilizează `lib/projectWatch.cjs`); „Append Text To" = reutilizează `appendSelectionTo` cu html-ul notei |
| P3 | **Scurtături de tastatură pentru tab-urile Inspectorului** (reveal + focus; a doua apăsare = focus în panou) | §13.2.2, PDF 273 (Table 13.1) | intrări noi în `commands.js` (registry configurabil deja în Settings) care setează `showInspector` + tab-ul activ în Inspector |

Arii „gol" confirmate prin căutări fără rezultat, dar deliberately NEprioritate (nichelat,
ecosistem L&L sau sub-arii mici): Scapple (§9.1.7), .mm/FreeMind (§9.1.4), screenplay text
simplu (§9.1.3), MHT arhivare web (§9.1.2 — importul web există, doar arhivarea MHT lipsește),
crop/align pe imaginea de sinopsis (§13.3.1), fallback-ul inspectorului la project bookmarks
pentru colecții/selecții multiple (§13.1).

## Notă de metodă

Extragere text din PDF-ul manualului oficial (cap. 9 și 13), enumerarea ariilor mari,
verificare prin căutare țintită pe identificatori + sinonime + chei i18n + registre de comenzi,
cu confirmare prin fișiere concrete pentru ariile mari. Nu e diferență linie cu linie; „gol"
înseamnă 3–4 căutări cu termeni diferiți (RO + EN) cu zero rezultate relevante.
