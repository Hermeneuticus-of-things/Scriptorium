# Audit Scrivener 3 — DELTA macOS (Anexa A + Anexa E)

- **Sursa:** manual oficial Scrivener 3 **macOS** — Anexa A „Menus & Keyboard Shortcuts" (p. 707–777, extrase în `scriv-manual-txt/MAC-A-menus.txt`, 3485 linii) + Anexa E „Stock Window Layouts" (p. 875–882, `MAC-E-layouts.txt`, 279 linii).
- **Data:** 2026-11-21. Repo: `D:\OpenCode\scriptorium-git` (branch curent, doar acest fișier a fost scris).
- **Scop:** doar DELTA macOS față de Windows. Rândurile comune Win/Mac NU au fost re-verificate în cod (sunt acoperite de auditul de Anexa A Windows); au fost verificate în cod **numai** rândurile macOS-only și cele cu shortcut diferit.
- **Atenție (omisiune descoperită):** `docs/audit/scrivener3/scrivener-appendix-a-menus.md` (auditul Windows, 375 rânduri, invocat în misiune și în `missing_features.md`:14) **nu există în repo** — directorul conține doar `missing_features.md`. Coloana „echivalent Windows" de mai jos se bazează pe extrasele din manualul Windows (`A-menus.txt`, verificări punctuale: Quick Search Win = Ctrl+G la linia 757, Paste and Match Style Win = Ctrl+Shift+V la linia 451, Composition = F11 la 1480, Label Colors = F9 la 1340, Status Stamps = Alt+F9 la 1344, Keyword Colors = Shift+F9 la 1350) și pe convenția ⌘→Ctrl.
- **Stări folosite:** COMPLETE / PARTIAL / UNINTEGRATED / BROKEN / MISSING / NOT_APPLICABLE / UNVERIFIED / EQUIVALENT / SUPERIOR. Dovezile netratate ca UNVERIFIED au `fișier:linie`.

## Convenție meniuri

Pe macOS există 11 meniuri: **Scrivener, File, Edit, Insert, View, Navigate, Project, Documents, Format, Window, Help**. Meniul „Bookmarks" din misiune **nu există ca meniu separat pe Mac** — bookmark-urile sunt în Navigate ▸ (Go To/Open Quick Reference) și Project ▸ Show Project Bookmarks; vezi rândurile aferente. Pneuma are un meniu **Program** (echivalentul meniului Scrivener) + meniuri extra (Tools, AI) — vezi `src/lib/menuLayout.js:12-18`.

Notă de platformă importantă: Pneuma tratează identic Ctrl și ⌘ (`src/lib/commands.js:10` — `e.ctrlKey || e.metaKey` → 'Ctrl'), iar meniul nativ traduce `Ctrl` în `CmdOrCtrl` (`electron/main.cjs:981`). Deci toate shortcut-urile Pneuma „Ctrl+…" funcționează pe macOS ca ⌘+…, fără mapeări suplimentare.

---

## 1. Meniul Scrivener (A.2) — meniu macOS-only ca structură

| ID | Comandă | Shortcut Mac | Echivalent Windows | În Pneuma? | Prioritate |
|---|---|---|---|---|---|
| S3-MAC.APP.01 | About Scrivener | — | Help ▸ About | EQUIVALENT — `src/App.jsx:3542` (`help/about`, AboutDialog) | — |
| S3-MAC.APP.02 | Settings… | ⌘, | F12 (Options) | EQUIVALENT — `src/App.jsx:3550` (`app/settings`) | — |
| S3-MAC.APP.03 | Appearance ▸ (Dark/Light override) | — | — (tema e în Options) | EQUIVALENT — temă system/light/dark/sepia: `src/lib/i18n.js:152`, `src/App.jsx:778-779` (în Program settings, nu în meniu — diferență de plasare minoră) | P3 |
| S3-MAC.APP.04 | Keep Main Editors Light | ⇧⌥⌘L | — | MISSING — căutare „Keep Main Editors"/editors light fără rezultat în `src/` (documented-search) | P3 |
| S3-MAC.APP.05 | Theme ▸ (preset themes) | — | — | PARTIAL — `set.theme` cu 4 valori (`src/lib/i18n.js:152`), fără preset-uri instalabile/exportabile | P3 |
| S3-MAC.APP.06 | Reveal Support Folder in Finder | — | — | MISSING (Finder-specific; pe Win echivalente ar fi „deschide folderul de date") — documented-search fără rezultat | P3 |
| S3-MAC.APP.07 | Authorize Folder Access… (MAS) | — | — | NOT_APPLICABLE — sandbox Mac App Store, nu se aplică la Electron | — |
| S3-MAC.APP.08 | Enter/Deactivate Licence… | — | Help ▸ Licence | PARTIAL — informații de licență în `src/components/AboutDialog.jsx` / `src/lib/aboutInfo.js`, fără activare/dezactivare de token | P3 |
| S3-MAC.APP.09 | Check for Updates… | — | Help ▸ Check for Updates | EQUIVALENT — `src/App.jsx:3541` (`checkUpdates`) | — |
| S3-MAC.APP.10 | Services ▸ | — | — | NOT_APPLICABLE — servicii macOS system; Pneuma are echivalente funcționale în meniul Unelte (traduceri, dicționare: `src/App.jsx:3587-3599`) | — |
| S3-MAC.APP.11 | Quit Scrivener / Quit and Close-Keep Windows | ⌘Q / ⌥⌘Q | Ctrl+Q | EQUIVALENT — comportament nativ Electron (`electron/main.cjs:1691` păstrează fereastra pe darwin la închiderea ferestrelor) | — |

## 2. Meniul File (A.3)

Rânduri comune (New Project, Open, Save ⌘S, Save As ⇧⌘S, Import/Export/Sync/Back Up, Page Setup ⇧⌘P, Print ⌘P, Compile ⌥⌘E) — acoperite de auditul Windows. Delta:

| ID | Comandă | Shortcut Mac | Echivalent Windows | În Pneuma? | Prioritate |
|---|---|---|---|---|---|
| S3-MAC.FILE.01 | Recent Projects | — | același submeniu | EQUIVALENT — reaprinde ultimul proiect la start (`src/App.jsx:768`); listă completă de „recent" doar pe ecranul de start — PARTIAL pentru submeniul din meniu | P3 |
| S3-MAC.FILE.02 | Favorite Projects / Add-Remove from Favorites | — | — (nu există în Win A) | MISSING — `favorite` există doar per-document ( gotoItems favorites, `src/lib/menuLayout.js:92`), nu pe proiecte — documented-search | P3 |
| S3-MAC.FILE.03 | Show Project in Finder | — | Show in Explorer | EQUIVALENT funcțional prin `openMediaExternal`/dialoguri desktop; comandă dedicată MISSING (documented-search) | P3 |
| S3-MAC.FILE.04 | Find All Projects in Spotlight | — | — | NOT_APPLICABLE (Spotlight macOS) | — |
| S3-MAC.FILE.05 | Close Project ⇧⌘W / Close Project and Clear Interface Settings ⇧⌥⌘W / Close Window ⌘W | ⇧⌘W, ⌥⌘W, ⌘W | Ctrl+Shift+W etc. | PARTIAL — `closeProject` există (`src/App.jsx:3403`); „Clear Interface Settings" (reset display) MISSING — documented-search | P3 |
| S3-MAC.FILE.06 | Save and Rebuild Search Indexes | ⌥⌘S | — | MISSING — index de căutare dedicat fără rebuild manual (documented-search) | P3 |
| S3-MAC.FILE.07 | Import ▸ Web Page… (WebArchive) | — | același | EQUIVALENT — `importWeb` (`src/App.jsx:3390`) + `WebArchiveView.jsx:7` (redare web-archive) | — |
| S3-MAC.FILE.08 | Import ▸ Research Files as Aliases… | — | — | MISSING — alias-uri către fișiere externe (documented-search) | P2 |
| S3-MAC.FILE.09 | Import ▸ Plain Text Formatted Screenplay… | — | — | MISSING — `importFiles`+split există, conversia din scenariu text nu (documented-search) | P3 |
| S3-MAC.FILE.10 | Import ▸ Scrivener Project… / Import and Split… | — | același | PARTIAL — `importBundle`/`importFiles` (`src/App.jsx:3388,3522`), fără merge-import de proiect Scrivener | P3 |
| S3-MAC.FILE.11 | Export ▸ OPML… | — | același | MISSING ca export (import OPML există: `src/App.jsx:2628-2638`; export OPML nu — documented-search) | P2 |
| S3-MAC.FILE.12 | Export ▸ Outliner Contents as CSV… | — | același | MISSING — documented-search | P2 |
| S3-MAC.FILE.13 | Export ▸ Comments and Annotations… | — | același | PARTIAL — `stripNotationDoc/Project` (`src/App.jsx:3569-3570`) extrag notația, dar nu ca export de fișier separat | P3 |
| S3-MAC.FILE.14 | Export ▸ as Scrivener 2 Project… | — | — | NOT_APPLICABLE (format legacy Mac-only) | — |
| S3-MAC.FILE.15 | Sync ▸ with Mobile Devices / External Folder (Now) | — | același | EQUIVALENT — `syncOut`/`syncIn` (`src/App.jsx:3504-3505`); sync iOS NOT_APPLICABLE | — |
| S3-MAC.FILE.16 | Back Up ▸ To… / Now / All Projects Now | — | același | PARTIAL — `backupTo`/`backupNow` (`src/App.jsx:3401-3402`); „All Projects Now" MISSING (un singur proiect activ în fereastră; `newWindow` există totuși `src/App.jsx:3520`) | P3 |
| S3-MAC.FILE.17 | Save As Template… | — | același | EQUIVALENT — `saveTemplate` (`src/App.jsx:3530`) | — |
| S3-MAC.FILE.18 | Compile… | **⌥⌘E** | **F9 (Win)** | EQUIVALENT ca timestamps diferite — Pneuma `compile: 'Ctrl+Shift+E'` (`src/lib/commands.js:77`); pe Mac ⌥⌘E va lucra doar ca ⌃⇧E | P3 |

## 3. Meniul Edit (A.4)

| ID | Comandă | Shortcut Mac | Echivalent Windows | În Pneuma? | Prioritate |
|---|---|---|---|---|---|
| S3-MAC.EDIT.01 | Undo/Redo | ⌘Z / ⇧⌘Z | Ctrl+Z / Ctrl+Y | EQUIVALENT — editor TipTap + roluri native (`electron/main.cjs:970`) | — |
| S3-MAC.EDIT.02 | Paste and Match Style | **⇧⌥⌘V** | **Ctrl+Shift+V** (A-menus.txt:451) | EQUIVALENT — `src/lib/editorMenus.js:152` (`Ctrl+Shift+V`, rol `pasteAndMatchStyle`) | — |
| S3-MAC.EDIT.03 | Paste Plain Text as Screenplay | — | — | MISSING — documented-search | P3 |
| S3-MAC.EDIT.04 | Delete (Trash permanent / ⇧⌘⌫) | ⇧⌘⌫ | — | PARTIAL — `restoreTrash`/Trash există; ștergerea selectivă din Trash prin Edit ▸ Delete: UNVERIFIED | P3 |
| S3-MAC.EDIT.05 | Select ▸ Select Sentence with Spaces / Select All Style / Select Next in Same Style / Select Similar Formatting / Select Annotation-Footnote / Select Subgroups / Select 'Included' Subdocuments | — | parțial (Win are o parte) | PARTIAL — selectWord/Sentence/Paragraph (`src/App.jsx:3591-3593`), navigare stiluri (`selectStyleRange`… `src/App.jsx:3472-3475`); restul MISSING | P2 |
| S3-MAC.EDIT.06 | Select Current Text / with Subdocuments | **⌥⌘A** (ambele!) | Ctrl+Alt+A (una) | PARTIAL — coliziune de shortcut pe Mac (manualul o documentează); în Pneuma nu există comandă dedicată — documented-search | P3 |
| S3-MAC.EDIT.07 | Completions ▸ Complete / Complete Document Title / Add Selection to Auto-Complete List | ⌥Esc / ⌃Esc | — | PARTIAL — `autoComplete` + `autoCompleteList` (`src/App.jsx:3560,3559`); completare din titluri de documente MISSING | P3 |
| S3-MAC.EDIT.08 | Move ▸ Up/Down/Left/Right | **⌃⌘↑↓←→** | Ctrl+Shift+↑↓ (Win, doar sus/jos) | PARTIAL — mutare în binder există (drag + Move To dialog `src/App.jsx:3562`); tastele ⌃⌘→← (indent/nest) MISSING — documented-search | P2 |
| S3-MAC.EDIT.09 | Sort ▸ Ascending / Descending / Collection into Binder Order | — | — | MISSING — sortare de selecție din meniu (documented-search) | P2 |
| S3-MAC.EDIT.10 | Append Selection to Document ▸ / … Again | — | — | EQUIVALENT — `appendSelection` (`src/App.jsx:3565`) | — |
| S3-MAC.EDIT.11 | Add/Edit Link… / Link to Document… | **⌘K / ⌘L** | Ctrl+K / Ctrl+L | PARTIAL — `split`-ul Pneuma folosește Ctrl+K (`src/lib/commands.js:57`), link-uirea există în editor (editor handle), comenzi de meniu dedicate UNVERIFIED | P3 |
| S3-MAC.EDIT.12 | Quick Search | **⌃⌥G** | **Ctrl+G** (A-menus.txt:757) | EQUIVALENT — `quickSearch: 'Ctrl+O'` (`src/lib/commands.js:50`, decizie documentată: evită coliziunea cu findNext Ctrl+G) | — |
| S3-MAC.EDIT.13 | Search in Project / Find… / Filter… / Find Next-Prev / Use Selection for Find / Jump to Selection / Find by Formatting + Next/Prev Formatting | ⇧⌘F, ⌘F, ⌘G/⇧⌘G, ⌘E, ⌘J, ⌃⌥⌘F… | similare Ctrl+… | EQUIVALENT — `findProject/findDoc/findNext/findPrev/findUseSel/findFormat/advSearch/viewFilter` (`src/App.jsx:3404-3412`); „Jump to Selection" ⌘J MISSING (documented-search) | P3 |
| S3-MAC.EDIT.14 | Writing Tools ▸ (Apple Intelligence, macOS 15.1+) | — | — | NOT_APPLICABLE — Pneuma are propriul meniu AI (`src/lib/menuLayout.js:61-65`), SUPERIOR ca integrare | — |
| S3-MAC.EDIT.15 | Spelling and Grammar ▸ (Show ⌘:, Check Now ⌘;, While Typing ⌘\, Linguistic Focus…) | ⌘:, ⌘;, ⌘\ | — | PARTIAL — `checkSpelling` (`src/App.jsx:3629`), `linguisticFocus` (`src/App.jsx:3555`, `src/lib/menuLayout.js:49`); fereastra standard de spellcheck macOS NOT_APPLICABLE | P3 |
| S3-MAC.EDIT.16 | Substitutions ▸ (Smart Quotes/Dashes) | — | în Options (Win) | MISSING ca comenzi de meniu per-proiect — comportament configurabil parțial în setări (UNVERIFIED) | P3 |
| S3-MAC.EDIT.17 | Transformations ▸ (Make Upper/Lowercase, Capitalize, Small Caps, Quotes, Inline↔Inspector) | — | — | PARTIAL — conversii inline↔inspector COMPLETE (`src/App.jsx:3571-3574`); Upper/Lowercase în editor; faux Small Caps MISSING | P3 |
| S3-MAC.EDIT.18 | Speech ▸ (Start/Stop) | — | — | SUPERIOR — `readSel/readHere/readSentence/readParagraph/readAll/readBook/stopRead` (`src/App.jsx:3612-3618`) | — |
| S3-MAC.EDIT.19 | Text Tidying ▸ (Delete Struck-Through, Update Document Links, Renumber Paragraphs, Replace Multiple Spaces, Remove Empty Lines/Page Breaks, Strip Leading Tabs, **Zap Gremlins**) | — | — | PARTIAL — „Reparații simple" (`simpleRepairs`, `src/App.jsx:3525`) acoperă parțial; Zap Gremlins MISSING — documented-search | P2 |
| S3-MAC.EDIT.20 | Reference Tools ▸ Look Up in Dictionary and Thesaurus (⌃⌘D) / Search in… | ⌃⌘D | — | EQUIVALENT — `lookupDict/lookupSyn/lookupWiki/lookupGoogle` + 6 surse (`src/App.jsx:3587-3599`), SUPERIOR ca număr de surse | — |
| S3-MAC.EDIT.21 | Start Dictation… | fn fn | — | EQUIVALENT — `dictate: 'F9'` + `dictateHere/Stop` (`src/App.jsx:3396,3620-3622`) | — |
| S3-MAC.EDIT.22 | Emoji & Symbols | **⌃⌘Space** | — | EQUIVALENT — `specialChars` (`src/App.jsx:3558`) | — |

## 4. Meniul Insert (A.5)

| ID | Comandă | Shortcut Mac | Echivalent Windows | În Pneuma? | Prioritate |
|---|---|---|---|---|---|
| S3-MAC.INS.01 | Table / Image From File / Image Linked to File / Image Linked to Document | — | aceleași | PARTIAL — imagini și tabele în editor; imagine **legată** de fișier/document MISSING (documented-search) | P2 |
| S3-MAC.INS.02 | Comment **⇧⌘\*** / Inline Annotation ⇧⌘A / Footnote **⌃⌘8** / Inline Footnote **⌃⌥F** | vezi coloana | Ctrl+Shift+8/9… (Win diferă) | EQUIVALENT ca funcții (marcaje editor + conversii `src/App.jsx:3571-3574`); shortcut-uri Mac cu ⌃/⌥ nu sunt mapate 1:1 — vezi Matricea | P3 |
| S3-MAC.INS.03 | Bibliography/Citations… | ⌘Y | — | EQUIVALENT+ — `importZotero/importBib` + bibliografie în proiect (`src/App.jsx:3506-3511`), SUPERIOR (Zotero integrat) | — |
| S3-MAC.INS.04 | MathType Equation | — | Insert ▸ Equation… | EQUIVALENT — `equation` (`src/App.jsx:3420`), fără dependența MathType | — |
| S3-MAC.INS.05 | Break ▸ Line Break ⌥⌘Return / Page Break / Non-Breaking Space ⌥Space / Word Joiner | ⌥⌘Return, ⌥Space | — | PARTIAL — inserare de caractere speciale prin `specialChars`; comenzi dedicate MISSING — documented-search | P2 |
| S3-MAC.INS.06 | Horizontal Line ▸ (Centered/Page-Spanning/Signature) | — | — | MISSING — documented-search | P3 |
| S3-MAC.INS.07 | Auto-number / Draft Word & Character Count / Endnote Marker / Current Date & Time ⇧⌥⌘D / Media Time Stamp | ⇧⌥⌘D | — | PARTIAL — placeholder-uri suportate în compile și documentate în help (`helpPlaceholders` `src/App.jsx:3537`); inserare din meniu MISSING; Media Time Stamp MISSING | P2 |

## 5. Meniul View (A.6)

| ID | Comandă | Shortcut Mac | Echivalent Windows | În Pneuma? | Prioritate |
|---|---|---|---|---|---|
| S3-MAC.VIEW.01 | Document/Scrivenings ⌘1, Corkboard ⌘2, Outline ⌘3 | ⌘1/2/3 | Ctrl+1/2/3 | EQUIVALENT — `viewEditor/viewCorkboard/viewOutline` + `Ctrl+1/2/3` (`src/App.jsx:3413-3415`, `src/lib/commands.js:69-71`) | — |
| S3-MAC.VIEW.02 | Show/Hide Binder ⌥⌘B, Inspector ⌥⌘I | ⌥⌘B, ⌥⌘I | Ctrl+Shift+B/I | EQUIVALENT — `toggleBinder/toggleInspector: 'Ctrl+Shift+B/I'` (`src/lib/commands.js:74-75`, motiv AltGr documentat la :72-73) | — |
| S3-MAC.VIEW.03 | Show/Hide Collections | — | — | EQUIVALENT — taburi de colecții în binder (`searchResults` `src/App.jsx:3430`) | — |
| S3-MAC.VIEW.04 | Editor Layout ▸ No Split ⌘' / Split Horiz ⌥⌘= / Split Vert ⌘" / Swap / Copyholder Position / Close Copyholder ⌥⌘- | ⌘', ⌥⌘=, ⌘", ⌥⌘- | Ctrl+… diferite | PARTIAL — `splitEditor/splitHorizontal/swapPanes/copyholder/copyholderClose` (`src/App.jsx:3490-3492,3585-3586`); poziția copyholder-ului MISSING | P3 |
| S3-MAC.VIEW.05 | Text Editing ▸ Format Bar ⇧⌘R / Ruler ⌘R / Titles in Scrivenings / Invisibles / Markup / Page View ⇧⌥⌘P / Two Pages / Vertical Layout / Line Numbers / Footnote Numbers in Inspector / Typewriter Scrolling ⌃⌘T / Focus ▸ | ⌘R, ⇧⌘R, ⇧⌥⌘P, ⌃⌘T | multe diferite | PARTIAL — `toggleFormatBar/toggleRuler/scrivTitles/lineNumbers/pageViewSetup/pageFull` există (`src/App.jsx:3554,3476,3580,3418`); Invisibles/Markup/Two Pages/Vertical/Typewriter-pană la tastare/numere de note în inspector MISSING — documented-search | P2 |
| S3-MAC.VIEW.06 | PDF Display ▸ | — | — | NOT_APPLICABLE (fără viewer PDF nativ dedicat cu aceste opțiuni; media view simplu) | — |
| S3-MAC.VIEW.07 | Corkboard Options ▸ (Cards Across, Arrange by Label **⌃⌘\*** etc., Label Colors on Edges **⌃⌘P**, Status Stamps **⌃⌘S**, Keyword Colors **⌃⌘K**, Card Numbers, Ghosts, Freeform, Snap to Grid, Commit Freeform) | ⌃⌘P/S/K | **F9 / Alt+F9 / Shift+F9** (A-menus.txt:1340-1350) — shortcut-uri complet diferite | PARTIAL — corkboard cu freeform/commit există (`cork` în layout `src/lib/layouts.js:26`); opțiunile de meniu rând cu rând MISSING parțial — documented-search | P2 |
| S3-MAC.VIEW.08 | Outliner Options ▸ (Center Content, Fixed Row Height) + coloane | — | — | PARTIAL — coloane outliner persistente (`OUTLINER_COLUMNS_KEY` `src/lib/layouts.js:4`, `outlinerColumns` :25); Center/Fixed Row Height MISSING | P3 |
| S3-MAC.VIEW.09 | Use Label Colour In ▸ | — | — | MISSING — documented-search | P3 |
| S3-MAC.VIEW.10 | Zoom ▸ In/Out/percent/Fit | ⌘&gt;, ⌘&lt; | Ctrl+Plus/Minus | EQUIVALENT — `zoomIn/zoomOut/zoomReset` (`src/App.jsx:3416-3422`, `src/lib/commands.js:52-54`) | — |
| S3-MAC.VIEW.11 | Outline ▸ Expand All ⌘9 / Collapse All ⌘0 / Collapse to Level ⌃⌘0 / Subdocument Counts / **Hoist Binder** | ⌘9, ⌘0, ⌃⌘0 | Ctrl+9/0 similare | PARTIAL — `hoist/unhoist` COMPLETE (`src/App.jsx:3576-3577`); Expand/Collapse All MISSING ca taste/comenzi — documented-search | P2 |
| S3-MAC.VIEW.12 | Enter/Exit Full Screen ⌃⌘F | ⌃⌘F | F11 (Win) | EQUIVALENT — `fullScreen: 'Ctrl+Shift+F11'` (`src/lib/commands.js:86`) + rol nativ `togglefullscreen` (`electron/main.cjs:970`) | — |
| S3-MAC.VIEW.13 | Enter/Exit Composition Mode | ⌥⌘F | F11 (Win) | EQUIVALENT — `composition: 'F11'` (`src/lib/commands.js:51`, `src/App.jsx:3424`) | — |
| S3-MAC.VIEW.14 | Show/Hide Tab Bar / Toolbar / **Customize Touch Bar…** | — | — | PARTIAL — `customizeToolbar` (`src/App.jsx:3489`); Tab Bar și Touch Bar NOT_APPLICABLE (Electron fără tab-bar macOS nativ de proiecte) | — |

## 6. Meniul Navigate (A.7) — pe Windows e „Navigate" identic ca nume

| ID | Comandă | Shortcut Mac | Echivalent Windows | În Pneuma? | Prioritate |
|---|---|---|---|---|---|
| S3-MAC.NAV.01 | Reveal in Binder | ⌥⌘R | Ctrl+Shift+R? (Win folosește altă tastă) | EQUIVALENT — `revealBinder: 'Ctrl+Alt+R'` (`src/App.jsx:3575`, `src/lib/commands.js:87`) | — |
| S3-MAC.NAV.02 | Reveal Draft Folder | — | — | MISSING — documented-search (Draft-ul e redenumibil în Pneuma?) | P3 |
| S3-MAC.NAV.03 | Go To ▸ Previous/Next Document ⌥⌘↑↓, Enclosing Group ⌃⌘R, Selection ⌘4, Collection | ⌥⌘↑↓, ⌃⌘R, ⌘4 | Ctrl+Alt+↑↓ similare | PARTIAL — `prevDoc/nextDoc: 'Ctrl+Alt+↑/↓'` (`src/App.jsx:3434-3435`, `src/lib/commands.js:64-65`), `goto` cu submeniu binder complet (`src/lib/menuLayout.js:75-94` — SUPERIOR: favorites + 200 item-uri); Enclosing Group MISSING | P2 |
| S3-MAC.NAV.04 | Open ▸ Current ⌥⌘O / Other ⇧⌘O / Quick Reference / Copyholder / Quick Look / Compilable Subdocs / Flat List / External Editor ⌃⌘O | ⌥⌘O, ⇧⌘O, ⌃⌘O | similare | PARTIAL — `quickRef: 'Ctrl+Shift+R'` (`src/App.jsx:3428`, `src/lib/commands.js:78`), `copyholder` (`src/App.jsx:3490`), `openExternal` (`src/App.jsx:3566`); **Quick Look** MISSING (macOS-only, NOT_APPLICABLE pe Win), Flat-List/Compilable MISSING | P2 |
| S3-MAC.NAV.05 | Collections ▸ (Convert to Standard, Next/Prev) | — | — | PARTIAL — colecții + Search Results (`src/App.jsx:3430-3433`); convertirea căutării în colecție standard UNVERIFIED | P3 |
| S3-MAC.NAV.06 | Editor ▸ Lock in Place ⌥⌘L, Lock Inspector, Lock Group View Mode, Clear Document History | ⌥⌘L | — | PARTIAL — `lockInPlace` (`src/App.jsx:3419`); Lock Inspector / Lock Group View MISSING | P2 |
| S3-MAC.NAV.07 | History Forward/Backward ⌘]/⌘[ + Other Editor variants ⌥⌘]/[ | ⌘], ⌘[ | Ctrl+→/←? | EQUIVALENT — `back: 'Alt+←'`, `forward: 'Alt+→'` (`src/App.jsx:3436-3437`, `src/lib/commands.js:67-68`) | — |
| S3-MAC.NAV.08 | Media ▸ Play ⌘Return / Fast Forward ⇧⌥⌘] / Rewind ⇧⌥⌘[ / Rewind on Pause | ⌘Return | — | PARTIAL — media view cu transcriere (`transcribeMedia` `src/App.jsx:3395`); tastele de transport MISSING — documented-search | P2 |
| S3-MAC.NAV.09 | Move Focus To ▸ (Rotate ⌃Tab, Binder ⌃⌥⌘B, Editors ⌃⌥⌘E/R, Title ⌃⌥⌘T, Copyholder ⌃⌥⌘D) | ⌃Tab, ⌃⌥⌘… | F6 (Win are doar ciclarea) | PARTIAL — focus engine cu F6 (`src/lib/focusEngine.js:112`), fără tastele individuelle ⌃⌥⌘X | P2 |
| S3-MAC.NAV.10 | Inspect ▸ (Notes ⌃⌥⌘H, Bookmarks ⌃⌥⌘N, Metadata ⌃⌥⌘J, Snapshots ⌃⌥⌘M, Comments ⌃⌥⌘K, Synopsis ⌃⌥⌘I, Keywords ⌃⌥⌘L) | ⌃⌥⌘… | — | MISSING — focus pe taburi de inspector (documented-search; F6 parțial compensează) | P2 |
| S3-MAC.NAV.11 | Outline Groups ▸ Previous/Next Group ⌃⌥↑↓ | ⌃⌥↑↓ | — | MISSING — documented-search | P3 |
| S3-MAC.NAV.12 | Binder Selection Affects ▸ / Outliner-Corkboard Selection Affects ▸ / Clear All Navigation Options | — | — | MISSING — configurarea „ce deschide binder-ul" (documented-search) | P2 |

## 7. Meniul Project (A.8)

Rânduri comune (New Text ⌘N / New Folder ⌥⌘N / Project Settings ⌥⌘, / Targets ⇧⌘T / Statistics ⇧⌥⌘S / Writing History / Keywords ⇧⌘K): toate au echivalente verificate — `newText/newFolder/projectSettings/targets/stats/history/keywords` (`src/App.jsx:3438-3449`) cu shortcut-uri proprii (`src/lib/commands.js:45-46,81-82`). Delta:

| ID | Comandă | Shortcut Mac | Echivalent Windows | În Pneuma? | Prioritate |
|---|---|---|---|---|---|
| S3-MAC.PRJ.01 | New From Template ▸ | ⇧⌥⌘N | — | PARTIAL — șabloane de document există în proiect (tutorial, `src/App.jsx:3181`), submeniul MISSING — documented-search | P2 |
| S3-MAC.PRJ.02 | Show Project Bookmarks ⇧⌘B (+ „tear-off" în QR) | ⇧⌘B | — | EQUIVALENT — `bookmarks`/`bookmarkAdd` (`src/App.jsx:3500-3501`); tear-off NOT_APPLICABLE | — |
| S3-MAC.PRJ.03 | Empty Trash… | — | — | EQUIVALENT — trash cu restore (`restoreTrash` `src/App.jsx:3564`); empty din contextual UNVERIFIED | — |

## 8. Meniul Documents (A.9)

| ID | Comandă | Shortcut Mac | Echivalent Windows | În Pneuma? | Prioritate |
|---|---|---|---|---|---|
| S3-MAC.DOC.01 | Snapshots ▸ Take ⌘5 / Titled ⌃⌘5 / Show / Compare, Granularity, Next/Prev Change ⌃⌘]/[ / Roll Back / Delete / Manager | ⌘5, ⌃⌘5, ⌃⌘]/[ | Ctrl+5, Ctrl+Shift+5 | PARTIAL — `snapshot/snapshotTitled/snapshotSelection/snapshotManager` COMPLETE (`src/App.jsx:3455-3465`, taste `src/lib/commands.js:79-80`); comparare cu granularitate MISSING | P2 |
| S3-MAC.DOC.02 | Duplicate with Subdocuments & Unique Title ⌘D / without Subdocuments | ⌘D | Ctrl+D | EQUIVALENT — `duplicate: 'Ctrl+D'` (`src/App.jsx:3454`, `src/lib/commands.js:59`) | — |
| S3-MAC.DOC.03 | Split at Selection ⌥⌘K / with Selection as Title ⇧⌥⌘K | ⌥⌘K, ⇧⌥⌘K | Ctrl+K, Ctrl+Shift+K | EQUIVALENT — `split: 'Ctrl+K'`, `splitTitle: 'Ctrl+Shift+K'` (`src/App.jsx:3427,3451`, `src/lib/commands.js:57-58`) | — |
| S3-MAC.DOC.04 | Merge ⇧⌘M | ⇧⌘M | Ctrl+Shift+M | EQUIVALENT — `merge` (`src/App.jsx:3452`, `src/lib/commands.js:66`) | — |
| S3-MAC.DOC.05 | New Folder From Selection ⌥⌘G / Ungroup ⌥⌘U | ⌥⌘G, ⌥⌘U | — | PARTIAL — grupare prin dialog Move To / drag; comenzi + taste MISSING — documented-search | P2 |
| S3-MAC.DOC.06 | Move To ▸ / Move To „X" Again ⌥⌘T / Copy To ▸ / Copy To Project ▸ / Again ⇧⌥⌘C | ⌥⌘T, ⇧⌥⌘C | — | PARTIAL — `moveTo` dialog (`src/App.jsx:3562`); „Again", Copy To, Copy To Project MISSING (missing_features.md A/T4 confirmă Copy To Project) | P2 |
| S3-MAC.DOC.07 | Add to Collection ▸ | — | — | PARTIAL — colecții există; comanda de meniu UNVERIFIED | P3 |
| S3-MAC.DOC.08 | Add to/Remove from Project Bookmarks | — | — | EQUIVALENT — `bookmarkAdd` (`src/App.jsx:3501`) | — |
| S3-MAC.DOC.09 | Convert ▸ (Text to Default Formatting, Script Format, to File/Folder, Web-PDF to Text) | — | — | PARTIAL — `convertDefaultDraft/All` (`src/App.jsx:3478-3479`); File↔Folder și Web/PDF→Text MISSING | P2 |
| S3-MAC.DAC.10 | Auto-Fill ▸ (Set Selected Text as Title ⇧⌥⌘T, Clear Titles, Set Synopsis ⇧⌥⌘I, Send Synopsis to Text) | ⇧⌥⌘T/I | — | PARTIAL — `autoSynopsis` (`src/App.jsx:3567`); titlu din selecție MISSING ca tastă — documented-search | P2 |
| S3-MAC.DOC.11 | Change Alias Source / Replace Media File | — | — | MISSING — documented-search | P3 |
| S3-MAC.DOC.12 | Default Template for Subdocuments ▸ | — | — | MISSING — documented-search (T4) | P2 |
| S3-MAC.DOC.13 | Change Icon ▸ (+ Icon from Text, Manage Custom Icons, Text Based Icons) | — | — | MISSING — icoane de document (documented-search) | P3 |
| S3-MAC.DOC.14 | Move to Trash | **⌘⌫** | Delete (Win) | EQUIVALENT — trash prin contextual/tastă Delete (`restoreTrash` dovedește trash-ul `src/App.jsx:3564`) | — |

## 9. Meniul Format (A.10)

Rânduri comune font/paragraf/stiluri/liste/scriptwriting/revision — acoperite de auditul Windows. Delta Mac:

| ID | Comandă | Shortcut Mac | Echivalent Windows | În Pneuma? | Prioritate |
|---|---|---|---|---|---|
| S3-MAC.FMT.01 | Show Fonts ⌘T, Bold ⌘B, Italic ⌘I, Underline ⌘U, Strikethrough ⇧⌘_, Bigger ⌘+, Smaller ⌘- | ⌘T, ⌘B, ⌘I, ⌘U… | Ctrl+… identice | EQUIVALENT — format bar + editor TipTap; ⌘T pe Mac deschide font panel de sistem, pe Win Ctrl+T e tab nou — vezi Matricea | — |
| S3-MAC.FMT.02 | Copy Font ⌥⌘C / Paste Font ⌥⌘V / Copy Paragraph Attributes ⌃⌘C / Paste ⌃⌘V / Copy Formatting ⌃⌥⌘C / Paste Formatting ⌃⌥⌘V | ⌥⌘C/V, ⌃⌘C/V | — | MISSING — copiere/lipire formatare ca sertar dedicat (documented-search) | P2 |
| S3-MAC.FMT.03 | Align ⌘{ / ⌘| / ⇧⌥⌘\ / ⌘} ; Ligature ▸; Baseline ▸; Kerning ▸ | ⌘{, ⌘|, ⌘} | — | PARTIAL — aliniere în format bar/formatDocument (`src/App.jsx:3466-3467`); ligaturi/baseline/kerning MISSING | P3 |
| S3-MAC.FMT.04 | Style ▸ Show Styles Panel ⌃S, Show Styles Menu ⇧⌘Y, No Style ⌥⌘0, Import Styles… | ⌃S, ⇧⌘Y, ⌥⌘0 | — | PARTIAL — `styles/stylesPanel` + navigare stiluri (`src/App.jsx:3468-3475`, `src/lib/menuLayout.js:44`); Import Styles MISSING | P2 |
| S3-MAC.FMT.05 | Keep with Next / Can Split Across Pages / HTML Header Level / Writing Direction | — | — | MISSING — atribute de paragraf de layout print (documented-search) | P2 |
| S3-MAC.FMT.06 | Scriptwriting ▸ Script Mode ⌘8, Settings, Re-capitalize, Change Element, Show Elements Menu ⇧⌘Y | ⌘8, ⇧⌘Y | Ctrl+8 | EQUIVALENT+ — `scriptOff` + lista dinamică `script_*` (`src/App.jsx:3546-3547`, `src/lib/menuLayout.js:43-44`), export FDX/Fountain (`src/App.jsx:3548-3549`); Re-capitalize MISSING | P3 |
| S3-MAC.FMT.07 | Color… ⇧⌘C, Highlight ▸ ⇧⌘H | ⇧⌘C, ⇧⌘H | — | EQUIVALENT — culoare și evidențiere în format bar/editor; tastele nu sunt mapate la aceleași comenzi (⇧⌘H pe Mac ≠ helpFinder Pneuma — vezi Matricea) | P3 |
| S3-MAC.FMT.08 | Preserve Formatting / Make Formatting Default | — | — | EQUIVALENT — `preserveFormat` (`src/App.jsx:3477`); Make Formatting Default PARTIAL prin setări | P3 |

## 10. Meniul Window (A.11)

| ID | Comandă | Shortcut Mac | Echivalent Windows | În Pneuma? | Prioritate |
|---|---|---|---|---|---|
| S3-MAC.WIN.01 | Minimize ⌘M | ⌘M | — | EQUIVALENT — rol nativ `minimize` (`electron/main.cjs:970`) | — |
| S3-MAC.WIN.02 | Zoom ⌃⌘- / Zoom to Fit Screen ⌃⌘= | ⌃⌘-, ⌃⌘= | — | MISSING — zoom de fereastră (documented-search) | P3 |
| S3-MAC.WIN.03 | Tab-uri fereastră: Previous ⇧⌃Tab, Next, Move Tab, Merge All Windows | ⇧⌃Tab | — | NOT_APPLICABLE — tab-bar macOS; Pneuma are `newWindow` (`src/App.jsx:3520`) fără tab-uri/merge | — |
| S3-MAC.WIN.04 | Layouts ▸ + Manage Layouts… ⇧⌘) | **⇧⌘)** | — | EQUIVALENT — `saveLayout/manageLayouts` (`src/App.jsx:3552-3553`) + listă dinamică `layout:`i (`src/App.jsx:3630`); layouts stocate MISSING built-ins — vezi Anexa E | P2 |
| S3-MAC.WIN.05 | Float Window / Float Quick Reference Panels ⌃⌥⌘Q | ⌃⌥⌘Q | — | MISSING — floating window (documented-search) | P3 |
| S3-MAC.WIN.06 | Show Scratchpad ⇧⌘Return | ⇧⌘Return | — | EQUIVALENT — `scratchpad` (`src/App.jsx:3544`) | — |
| S3-MAC.WIN.07 | Bring All to Front | — | — | MISSING — documented-search | P3 |
| S3-MAC.WIN.08 | QR: Close All / Closed QR Panels (reopen) | — | — | PARTIAL — `quickRef` există; istoricul QR închise MISSING | P3 |

## 11. Meniul Help (A.12)

| ID | Comandă | Echivalent Windows | În Pneuma? | Prioritate |
|---|---|---|---|---|
| S3-MAC.HLP.01 | Scrivener Manual / Interactive Tutorial / Reset Tutorial / Video Tutorials | aceleași | EQUIVALENT/SUPERIOR — `help` + manual propriu + taburi shortcuts/placeholders/syntax (`src/App.jsx:3534-3538`), `tutorial` (`src/App.jsx:3539`), help **menu search** `helpFinder: 'Ctrl+Shift+H'` (`src/App.jsx:3533`, `src/lib/commands.js:76`) = echivalentul căutării din Help macOS | — |
| S3-MAC.HLP.02 | List of All Placeholders… | — | EQUIVALENT — `helpPlaceholders` (`src/App.jsx:3537`) | — |
| S3-MAC.HLP.03 | Support / Forums / Release Notes / Home / Newsletter / Purchase | — | PARTIAL — `reportIssue`/`checkUpdates`/`about` (`src/App.jsx:3540-3542`); linkuri web MISSING (irelevant pentru paritate) | P3 |

---

## 12. Anexa E — Stock Window Layouts (Mac-only appendix)

Sistem Pneuma: layouts salvate de utilizator — `src/lib/layouts.js` (captureLayout :10-29, export/import fișier :31-52, upsert :55-57), dialog `src/components/LayoutsDialog.jsx`, aplicare din meniu `src/App.jsx:3630`. **Nu există layout-uri preinstalate (stock/built-in)** — `missing_features.md`:25 plasează macOS delta aici; fiecare layout din Anexa E:

| ID | Layout (Anexa E) | Ce face | În Pneuma? | Prioritate |
|---|---|---|---|---|
| S3-MAC.LAY.01 | Default (E.1) | reset fereastră: fără split, fără copyholder, binder+inspector deschise, navigare resetată | MISSING — nu există buton „resetează la Default"; `clearNav` nici atât (documented-search). Se poate aproxima manual | P2 |
| S3-MAC.LAY.02 | Three-Pane (Outline) (E.2) | binder→ambele split-uri, non-group în celălalt editor, outliner→other editor, Scrivenings în dreapta | MISSING — depinde de „Binder/Outliner Selection Affects" (S3-MAC.NAV.12), absent | P2 |
| S3-MAC.LAY.03 | Three-Pane (Corkboard) (E.3) | idem, cu corkboard 1 card/rând, size-to-fit | MISSING — idem + opțiunile corkboard absente | P2 |
| S3-MAC.LAY.04 | Editor Only (E.4) | fără sidebare, fără split/copyholder, Scrivenings | MISSING ca stock; capturabil manual de utilizator (`captureLayout` păstrează `hideBinder`, `showInspector`, `splitId` `src/lib/layouts.js:16-24`) → PARTIAL prin layouts salvate | P2 |
| S3-MAC.LAY.05 | Corkboard Only (E.5) | focus pe split-ul corkboard, selecție pe părinte | MISSING ca stock — idem | P2 |
| S3-MAC.LAY.06 | Centered Outline (E.6) | outliner curat, doar Titlu (+Sinopsis), Center Content | MISSING — Center Content absent (`src/lib/layouts.js:25` salvează doar coloanele) | P2 |
| S3-MAC.LAY.07 | Dual Navigation (E.7) | binder→stânga; dreapta outliner + copyholder auto-load | MISSING — depinde de selection-affects + copyholder auto-load | P2 |
| S3-MAC.LAY.08 | Refining/Hide Built-Ins (E.8–E.9) | meta-instrumente | NOT_APPLICABLE fără stock layouts | — |

Concluzie Anexa E: sistemul de layouts Pneuma e sănătos (salvare, export/import JSON, thumbnail schematic `src/lib/layouts.js:63-84` — SUPERIOR ca portabilitate față de Mac), dar **cele 7 layout-uri stock nu există**; 3 din ele sunt blocate de lipsa „Selection Affects" (S3-MAC.NAV.12).

---

## 13. MATRICEA DIFERENȚELOR Win/macOS pentru Pneuma

Pneuma e Electron cross-platform; ce contează cu adevărat:

### 13.1 Maparea modificatorilor — deja rezolvată

- `keyFromEvent` (`src/lib/commands.js:8-21`) normalizează ⌘ (meta) și Ctrl la „Ctrl" ⇒ orice shortcut Pneuma „Ctrl+X" pe macOS = ⌘X. Corect.
- Meniul nativ traduce acceleratoarele cu `CmdOrCtrl` (`electron/main.cjs:981`) și folosește roluri native (`cut/copy/paste/pasteAndMatchStyle/minimize/togglefullscreen`, `electron/main.cjs:970`, `src/lib/editorMenus.js:152`). Corect.
- `normalizeCombo` (`src/lib/commands.js:34`) acceptă „cmd"/„option" ca input de utilizator. Corect.

### 13.2 Coliziuni cu combinațiile de sistem macOS (⌘ rezervate)

Pneuma nu mapеază direct shortcut-uri ⌘ din Scrivener Mac, dar pe macOS tastele „Ctrl+X" Pneuma devin ⌘X și pot colisiona cu standardele de sistem Electron/meniu:

| Combo Pneuma (devine ⌘ pe Mac) | Rezervat sistem/Electron | Risc | Recomandare |
|---|---|---|---|
| Ctrl+N / Ctrl+S / Ctrl+P / Ctrl+Z etc. | ⌘N/⌘S/⌘P — în Electron sunt, de regulă, ale aplicației | OK — Pneuma le și folosește așa | — |
| **Ctrl+O (quickSearch)** `commands.js:50` | ⌘O = deschide fișier/proiect la nivel de aplicație (meniul nativ File ▸ Open) | MEDIU — pe Mac ⌘O e așteptat să deschidă proiect | Mutare pe ⌘⇧O/Ctrl+Shift+O sau blocarea acceleratorului în meniul nativ (deja `registerAccelerator: false` `main.cjs:981` reduce riscul) |
| Ctrl+H / Ctrl+M / Ctrl+W | ascund/minimizează/închide fereastră (⌘H/⌘M/⌘W sistem) | MARE dacă ar fi mapate — momentan Pneuma **nu** le folosește (bine) | de păstrat evitarea |
| Ctrl+K (split) | ⌘K = link pe Mac (Scrivener însuși) | MIC — Pneuma rezolvă prin design propriu | acceptabil (documentat `commands.js:56-57`) |
| Ctrl+Shift+H (helpFinder) `commands.js:76` | ⌘⇧H pe Mac = Scrivener Highlight; sistem nu-l revendică | OK | — |
| Ctrl+Alt+… (prevDoc/nextDoc/stats/revealBinder/toggleRuler) `commands.js:64-65,81,87-89` | ⌥ e „Option"; pe Mac ⌥+literă produce caractere speciale, dar `keyFromEvent` compensează cu `e.code` (`commands.js:15-17`) | MIC — tratat | de păstrat mecanismul `phys` la orice nou shortcut cu Alt |
| Shift+Escape, Ctrl+Space | sistem (Spotlight e ⌘Space, nu Ctrl+Space) | OK | — |

Regula proiectului „fără Ctrl+Alt pe Windows (AltGr)" (`src/lib/commands.js:47-49, 72-73`) **nu intră în conflict** cu macOS: ⌃⌥-urile Scrivener Mac nu sunt reproduse, iar câte există la Pneuma trec prin normalizarea fizică.

### 13.3 Diferențe de denumire meniuri

| macOS Scrivener | Pneuma | Notă |
|---|---|---|
| Scrivener (meniu aplicație) | Program (`menuLayout.js:13`) | plasare diferită pentru Settings/About — acceptabil, documentat în `menuLayout.js:6-11` |
| Navigate | Navigate | 1:1 |
| — | Tools, AI | în plus (SUPERIOR) |
| Edit ▸ Reference Tools/Writing Tools | Unelte ▸ lookup/translate/AI | altă casă, același conținut + mai mult |

### 13.4 Funcționalități Mac-only care nu au sens în Electron

Services, Touch Bar, Quick Look, Spotlight, Tab Bar/Merge All Windows, Apple Intelligence (Writing Tools), Authorize Folder Access (MAS), MathType, export Scrivener 2, fn-fn Dictation — **NOT_APPLICABLE**; Pneuma le acoperă funcțional prin propriile unelte (dicționar/translate/AI citire/transcriere DTED), la unele SUPERIOR.

### 13.5 Recomandări (ordonate)

1. **P2 — Selection Affects + Clear Navigation Options** (S3-MAC.NAV.12): deblochează 3 stock layouts; singura lacună structurală mare a deltei.
2. **P2 — Stock layouts**: livra cele 7 layout-uri din Anexa E ca layouts preinstalate în `settings.layouts` (infrastructura există deja: `App.jsx:3630`).
3. **P2 — Copy/Paste Formatting** (S3-MAC.FMT.02): sertar de formatare la nivel de editor.
4. **P2 — comenzi Edit mărunte**: Sort, Move ⌃⌘→←, Text Tidying/Zap Gremlins, Select Similar/Subdocuments.
5. **P3 — quickSearch pe ⌘O**: de evaluat mutarea pe Ctrl+Shift+O pentru conformitate Mac.
6. **P3 — alternate pentru ⌘T (Show Fonts)**: pe Mac ⌘T ar trebui să deschidă font panel; Pneuma nu-l folosește — OK.

---

## 14. Contoare

- Rânduri inventar Mac delta: **120** (APP 11, FILE 18, EDIT 22, INS 7, VIEW 14, NAV 12, PRJ 3, DOC 14, FMT 8, WIN 8, HLP 3) + **8** layouts (Anexa E) = **128**.
- Stări: EQUIVALENT/SUPERIOR ~48 · PARTIAL ~38 · MISSING ~34 · NOT_APPLICABLE ~12 · UNVERIFIED 4 (S3-MAC.EDIT.04, PRJ.03-empty, NAV.05, DOC.07) · BROKEN/UNINTEGRATED 0.
- Verificare în cod: numai rândurile MAC-only și cu diferență de shortcut (toate cu `fișier:linie` sau documented-search); rândurile comune trimit la auditul Windows — care lipsește (vezi omisiune).

## 15. GOLURI NOI (descoperite de acest audit, nu în `missing_features.md`)

1. **S3-MAC.NAV.12** — „Binder/Outliner Selection Affects ▸" + „Clear All Navigation Options": nici măcar menționate în categoriile A–Q; blochează 3 stock layouts.
2. **S3-MAC.LAY.01–07** — lipsa layout-urilor stock din Anexa E (`missing_features.md` amintește doar generic „3.x rămase, Anexa E").
3. **S3-MAC.EDIT.09/19** — Sort din meniu și Zap Gremlins / Text Tidying complet.
4. **S3-MAC.EDIT.13** — Jump to Selection (⌘J).
5. **S3-MAC.NAV.10** — tastele Inspect ⌃⌥⌘X (focus pe taburi de inspector).
6. **S3-MAC.FILE.11–12** — export OPML (există doar importul, `App.jsx:2628`) și export CSV al outliner-ului.

## 16. OMISIUNI DESCOPERITE

1. **`docs/audit/scrivener3/scrivener-appendix-a-menus.md` nu există** în repo, deși `missing_features.md`:14 îl citează („375 rânduri") ca sursă a categoriilor B/D. Idem `scrivener-appendix-b-c-settings.md` (:17) și `scrivener-appendix-d-e-f.md` (:28). Sau sunt în alt branch, sau referințele sunt anticipative — de rectificat la T8.
2. Sursele MAC-A/MAC-E nu erau la calea din misiune (`docs/audit/scrivener3/sources/`), ci în workspace-ul agentului (`scriv-manual-txt/`); dacă auditul se reia, de copiat la locația canonică.
3. Meniul „Bookmarks" menționat în misiune nu există ca meniu pe Mac — intrările sunt în Navigate/Project (tratate la S3-MAC.NAV.03–04, S3-MAC.PRJ.02).
