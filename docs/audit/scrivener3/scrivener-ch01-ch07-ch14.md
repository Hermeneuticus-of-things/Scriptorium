# Audit de paritate Scrivener 3 — capitolele 1–7 și 14 (Pneuma Sofer)

**Sursă:** manualul oficial Scrivener 3 pentru Windows, v3.1.6 — text extras în `docs/audit/scrivener3/sources/1-7.txt` (cap. 1–7, PDF pp. 6–115) și `sources/14-cloud.txt` (cap. 14 Cloud Integration and Sharing, PDF pp. 298–319).
**Repo verificat:** `D:\OpenCode\scriptorium-git` (Electron + React; `src/` renderer, `lib/` main-process, `electron/` IPC).
**Dată:** 2026-11-21.
**Metodă:** citirea manualului secțiune cu secțiune, identificarea fiecărei capacități funcționale, verificare în cod prin grep țintit pe identificatori + citire de fișiere. Capitolele 1–3 sunt în mare parte material de instalare/licențiere al produsului terț — marcate NOT_APPLICABLE, cu excepțiile aplicabile oricărei aplicații de scris (actualizări, MMD/Pandoc, backup, autosave), care au fost verificate. Dedup: ariile deja acoperite de `docs/PARITY-AUDIT-*.md` și `docs/SCRIVENER-SEARCH-EVIDENCE.md` sunt cross-referențiate, nu re-auditate.
**Stări folosite:** COMPLETE / PARTIAL / UNINTEGRATED / BROKEN / MISSING / NOT_APPLICABLE / UNVERIFIED / EQUIVALENT / SUPERIOR.

---

## Capitolul 1 — Philosophy (PDF 6)

| ID | Funcționalitate | Stare | Dovadă cod / căutare | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-01.1 | Concepte de bază (secțiuni, sinopsis, corkboard, cercetare în proiect, split editor, formate de export separate de text) | EQUIVALENT | fiecare concept e implementat: `src/components/Corkboard.jsx`, `Scrivenings.jsx`, `src/lib/toc.js`, `lib/compile.cjs` | — | P4 |

Capitolul este manifest filosofic; nu conține funcționalități separate de cele auditate în restul documentului.

## Capitolul 2 — About This Manual (PDF 6–10)

| ID | Funcționalitate | Stare | Dovadă cod / căutare | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-02.1 | Convenții manual, termeni, scurtături, etichete opțiuni | NOT_APPLICABLE | material documentar al produsului terț | — | P4 |
| S3-02.2 | Găsirea subiectelor în manual / index topic | EQUIVALENT | `src/help/helpSearch.js`, `src/help/manual.ro.js`, `manual.en.js`, `src/components/HelpWindow.jsx` — help intern căutabil | — | P4 |
| S3-02.3 | „Spot a Problem?" (raportare probleme) | EQUIVALENT | `src/components/ReportProblemDialog.jsx`, `src/lib/reportProblem.js` | — | P4 |

## Capitolul 3 — Installation & Upgrading (PDF 11–18)

| ID | Funcționalitate | Stare | Dovedă cod / căutare | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-03.1 | Instalare prin EXE / wizard | NOT_APPLICABLE | specific produsului terț (installer NSIS propriu: `installer/`, `install.ps1`) | — | P4 |
| S3-03.1.1 | Versiune trial 30 zile | NOT_APPLICABLE | model comercial Literature & Latte; Pneuma e gratuit/local | — | P4 |
| S3-03.1.2–3.1.4 | Cumpărare, upgrade cu discount, înregistrare licență | NOT_APPLICABLE | idem; grep `licence|serial|register` fără cod relevant | — | P4 |
| S3-03.1.5 | **Actualizări aplicație**: check automat zilnic, check manual, amânare, ignorare versiune, download + instalare | EQUIVALENT | `electron/updateHandlers.cjs:1-3` (check GitHub Releases la 10 s după start dacă >24 h, apoi la 24 h, și la focus ferestră; manual cu ETag), `src/components/UpdateDialog.jsx` | canal GitHub Releases în loc de server L&L; fără „ignore this version" | P3 |
| S3-03.1.6 | Instalare portabilă pe unitate detașabilă | NOT_APPLICABLE | specific packaging-ului terț; Electron instalat per-mașină | — | P4 |
| S3-03.2–3.2.4 | Rulare versiuni multiple, upgrade proiecte v1→v3, recovered files, export ca Scrivener v1 | NOT_APPLICABLE | istoric de format specific Scrivener; Pneuma importă `.scriv` orice versiune: `lib/scrivImport.cjs:2-11` (format 3 și 1/2, păstrarea originalului în `scrivener-original/`) | — | P4 |
| S3-03.3.1 | **Setare MultiMarkdown / Pandoc** în sistem | EQUIVALENT | MMD: `lib/compile.cjs:460` (`mmd: { ext: 'mmd', name: 'MultiMarkdown' }`), `lib/compile.cjs:2454-2455`; Pandoc: `lib/advancedExport.cjs`, `lib/compile.cjs`, `lib/bibliography.cjs` (grep `-li pandoc`) | fără detecția instalării externe + adăugarea automată a tipurilor la listă | P3 |
| S3-03.4 | Newsletter / „Keep Up to Date" | NOT_APPLICABLE | marketing terț | — | P4 |

## Capitolul 4 — Interface in Overview (PDF 19–39)

| ID | Funcționalitate | Stare | Dovadă cod / căutare | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-04.1 | Fereastra proiect cu 5 zone: toolbar, binder, format bar, editor (split), inspector; redimensionare panouri | COMPLETE | `src/lib/toolbars.js:15,40`; `src/components/Binder.jsx`; `src/components/FormatBar.jsx`; `src/components/Inspector.jsx`; split + widths în `src/App.jsx:1149` (`saveUi(dir, { selectedId, view, widths, showInspector, splitId, copyholder, paneLocks })`) | — | P4 |
| S3-04.1.1 | **Customizare toolbar**: adăugare/ștergere/reordonare/ascundere butoane | COMPLETE | `src/components/ToolbarCustomizeDialog.jsx` + `src/lib/toolbars.js` (`TOP_ITEMS`, `FORMAT_ITEMS`, `TOP_DEFAULT`, `SEP`/`SPACE`) | — | P4 |
| S3-04.1.1a | Setul implicit de butoane: View, Search, Add, Trash, Quick Ref, Quick Search, View Mode (Ctrl1/2/3), Compile, Bookmarks, Compose, Inspector | COMPLETE | `src/lib/toolbars.js:40` (`TOP_DEFAULT = ['home','back','forward','title',SPACE,'views','voice','compile','inspector']`); `src/components/QuickRef.jsx`; `src/components/QuickSearch.jsx`; `src/components/CompileDialog.jsx`; `src/components/BookmarksPanel.jsx` | set implicit diferit, dar customizabil complet | P4 |
| S3-04.1.2 | Navigare stânga→dreapta (binder→editor→inspector) și conceptele Active/selection/focus | EQUIVALENT | `src/lib/focusEngine.js`, `src/lib/commandApplicability.js`, `src/lib/focusPanes.js`; comentarii explicite în `src/App.jsx:415-433` despre focus/inactive selection | — | P4 |
| S3-04.1.3 | **Binder**: listă master, 3 dosare speciale (Draft/Research/Trash), tab-uri colecții, rezultate de căutare în sidebar | COMPLETE | `src/components/Binder.jsx`; `src/components/CollectionsBar.jsx`; `src/lib/tree.js:17` (`rootOf`), `:101` (`moveToTrash`); `src/lib/projectSearch.js` + `FilterBar.jsx` | — | P4 |
| S3-04.1.4 | **Editor**: header bar, footer bar, split în 2 panouri, format bar, **copyholders** (pin document lângă split) | COMPLETE | `src/components/EditorFooter.jsx`; `src/components/FormatBar.jsx`; split: `splitId` în `src/App.jsx:1149`; copyholder: `src/App.jsx:646-648` (stare `{id, editable}` + scroll per document) | — | P4 |
| S3-04.1.5 | **Inspector** cu tab-uri + câmpuri Label/Status jos | EQUIVALENT | `src/components/Inspector.jsx:190-196` — taburi `notes / bookmarks / meta / snapshots / annot` + label/status | 5 tab-uri vs Scrivener; sinopsis+note într-un singur tab | P4 |
| S3-04.1.6 | **Composition mode** (ascunde tot, Esc de ieșire, bara jos) | COMPLETE | `src/App.jsx:730-735` (stare `composition`, `compDisplay`, ascundere cursor), `:2797` (Esc), `src/components/CompositionBar.jsx` | — | P4 |
| S3-04.1.7 | **Salvarea aranjamentelor de fereastră** (layouts) | COMPLETE | `src/lib/layouts.js:10-63` (`captureLayout`, `layoutToFile/FromFile`, `upsertLayout`, thumbnail); `src/components/LayoutsDialog.jsx`; `saveUi` per proiect `src/App.jsx:1149` | cross-ref: golul „Saved Layouts" P2 din `PARITY-AUDIT-NEXT-CHAPTERS.md` este închis | P4 |
| S3-04.2 | Cele 3 view mode-uri de grup: Corkboard / Outliner / Scrivenings | COMPLETE | `src/components/Corkboard.jsx`, `Outliner.jsx`, `Scrivenings.jsx` | — | P4 |
| S3-04.2.1 | View mode selectat automat la grup; preferința rămâne; **per split** | PARTIAL | view global per proiect (`view` în `src/App.jsx:1149`), nu preferință separată per split | lipsesc preferințele de view pe fiecare split | P3 |
| S3-04.2.2 | Fișiere și foldere pot avea ambele text și copii (file groups) | COMPLETE | `src/lib/tree.js:268-279` (`convertNode` — „Scrivener Convert to Folder / Convert to File"), `insertInside`; corkboard pe orice container (`folder?.cork` în Corkboard.jsx:177) | — | P4 |
| S3-04.2.3 | Buton segmentat „Group Mode" în toolbar (on/off prin re-click) | COMPLETE | `src/lib/toolbars.js:40` (`'views'`) | — | P4 |
| S3-04.2.4 | **Corkboard**: carduri titlu+sinopsis, drag = reordonare text, freeform, arrange by label (rails), corkboard-uri stacked, opțiuni carduri (dimensiune/raport/coloane) | COMPLETE | `src/components/Corkboard.jsx:146` („grid, lines (arrange by label/status/keyword) and freeform"), `:152-153` (`folder.cork = {mode,size,by,ratio,spacing,columns,pins}`), `:266` (freeform cu `node.corkPos` + „Fixează ordinea"), `:158-160` (`corkboard-stack` pentru mai multe foldere) | fără textură de fundal „cork" clasică (opțiune estetică) | P3 |
| S3-04.2.5 | **Outliner**: coloane adăugabile/scuturbile, toggle sinopsis, sortare | COMPLETE | `src/components/Outliner.jsx:38-75` (coloane persistate în localStorage), `:245`, `:375` (showSynopsis) | — | P4 |
| S3-04.2.6 | **Scrivenings**: editare text multi-document live, separatoare, titluri | COMPLETE | `src/components/Scrivenings.jsx:8-15` („Each section is a full editor: same autocorrections, styles…"; `showTitles`, `showSeparators`) | — | P4 |
| S3-04.2.6a | Navigare în sesiunea Scrivenings prin cuprins (buton header) | MISSING | grep `navigate.*scrivenings|cuprins.*scrivenings|sectionList` în `src/components/Scrivenings.jsx`, `EditorFooter.jsx`, `App.jsx` → fără rezultate | de adăugat dropdown cu secțiunile sesiunii în header bar | P3 |
| S3-04.3 | **Limbă interfață** (System Language, schimbare din opțiuni + restart) | COMPLETE | `src/lib/i18n.js:481` (`setLanguage`), `src/App.jsx:273` (`settings.language`), notă de restart în `src/lib/i18n-ui.js:184` | doar ro/en (Scrivener are ~10 locale) | P3 |

## Capitolul 5 — All About Projects (PDF 41–64)

| ID | Funcționalitate | Stare | Dovadă cod / căutare | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-05.1 | Proiect = folder pe disc, format deschis, self-contained | COMPLETE | format `.scribner` folder (menționat în `src/lib/i18n-ui.js:1755` — „Proiectul .scribner… rămâne în folderul lui"); `lib/backup.cjs` operează pe folderul proiectului | — | P4 |
| S3-05.1.1 | **Fereastră New Project** cu șabloane pe categorii, „Getting Started", Blank, Open recent/existent | COMPLETE | `src/components/Home.jsx`; `lib/templates.cjs` („Project templates: initial binder structure for a new project") | — | P4 |
| S3-05.1.2 | **Autosave** după inactivitate (interval configurabil) + Save manual | COMPLETE | `src/App.jsx:1013` (`setTimeout(flush, Math.max(0.2, settings.autosaveSec || SAVE_DELAY/1000)*1000)` — autosave debounced pe inactivitate, interval configurabil) | — | P4 |
| S3-05.1.2a | Indicator „nesalvat" (asterisc la titlul ferestrei) | MISSING | grep `document.title|setTitle` în `src/` → doar `src/main.jsx:54` (Scratchpad), fără marcator dirty | asterisc/suferință UI pentru modificări nedescărcate pe disc | P3 |
| S3-05.1.2b | **Save As** (copie separată a proiectului, comută pe noua copie) | COMPLETE | `lib/exporters.cjs:291-313` („Save As" — `copyProjectDir` recursiv) | — | P4 |
| S3-05.1.3 | **Proiecte recente** + re-deschidere la start + Open | COMPLETE | `src/components/Home.jsx:5-39` (recent, pin, clear); `src/lib/settingsDefaults.js:87` (`reopenLastProject: true`); `src/App.jsx:765` | — | P4 |
| S3-05.1.4 | **Proiecte favorite** (pin, scoatere automată dacă dispar) | EQUIVALENT | `src/components/Home.jsx:28-37` (`settings.recentPinned`, `togglePin`) — pin în ecranul Home, nu în meniul File | — | P4 |
| S3-05.1.5 | Mutarea/ștergerea proiectelor cu instrumentele OS | NOT_APPLICABLE | gestionare la nivel de sistem de fișiere; proiectul e un folder obișnuit | — | P4 |
| S3-05.1.6 | **Upgrade format proiect** cu backup complet prealabil + prompt | MISSING | grep `migrate\|FORMAT_VERSION\|formatVersion` în `lib/*.cjs` + `src/App.jsx` → doar `migrateKeys` (`lib/aiKeys.cjs:10`, irelevant pentru formatul de proiect); nu există versiune de format migrată la deschidere | de adăugat `formatVersion` în project.json + migrări + backup înainte de upgrade | P3 |
| S3-05.2.1 | **Backup automat**: la închidere, zip compresie, rotație keep-N, director configurabil | COMPLETE | `lib/backup.cjs:77-105` (`backupProject(projectDir, backupDir, keep=10, {zip})` cu `rotate` și `JSZip`); `src/lib/settingsDefaults.js:130-139` (`backupOnClose: true`, `backupKeep: 5`, `backupDir`, `backupToDir`); UI în `SettingsDialog.jsx:82-91,483-496` | — | P4 |
| S3-05.2.2 | **Backup manual**: Back Up To (locație + zip) și Back Up Now | COMPLETE | `src/components/BackupDialog.jsx` (`api.backupNow`, `flush()` înainte de backup); `backupToDir` în setări | — | P4 |
| S3-05.2.3 | **Restaurare din backup** (listă, restaurare în copie separată) | COMPLETE | `src/components/BackupDialog.jsx:24-31` (`restore()` → `api.restoreBackup(dir, file)` cu confirmare „creează o copie separată") | — | P4 |
| S3-05.2.4 | **Backup per proiect / excluderea proiectelor mari** (C.9) | EQUIVALENT | `src/components/ProjectSettingsDialog.jsx:78-82,660` — tab „backup" per proiect: `{override, onClose, everyMin, keep, exclude}` | peste Scrivener: backup și pe interval de minute (`everyMin`) | P4 |
| S3-05.3.1 | Lucru cross-platform / share prin zip / cloud | EQUIVALENT | backup-uri zip transferabile (`lib/backup.cjs`); proiectul trăiește într-un folder cloud (`src/lib/i18n-ui.js:1755`) | — | P4 |
| S3-05.3.2 | **Split & merge proiecte**: drag între proiecte deschise, Save As fork, `File ▸ Import ▸ Scrivener Project…` | PARTIAL | merge: `lib/scrivImport.cjs:2-11` (import lossless `.scriv`, ambele formate) + `src/lib/projectMerge.js:82-188` (three-way merge al binderului); split: Save As + ștergere manuală; grep `copy to project\|copyToProject` → fără rezultate: **lipsesc drag&drop între proiecte deschise și Copy To Project** | P2 |
| S3-05.4.1 | Șabloane built-in cu document de ajutor + PDF exemplu | COMPLETE | `lib/templates.cjs` (structuri de start pe categorii) | fără PDF-uri exemplu în Research | P4 |
| S3-05.4.2 | „Convertirea" unui proiect la alt șablon | NOT_APPLICABLE | recomandare de workflow în manual; elementele se transferă prin styles (`PARITY-AUDIT-ch16-ch17`), compile formats (`ch23`), import `.scriv` | — | P4 |
| S3-05.4.3 | **Save As Template**: titlu, categorie (inclusiv custom), iconiță, includere stiluri | COMPLETE | `src/components/SaveTemplateDialog.jsx:10-52` (`title`, `category`, `description`, `icon` preset, `includeContent`) → `api.saveAsTemplate` | fără editor de imagine pentru iconiță („Save Icon…") | P4 |
| S3-05.4.3a | **Placeholder-e de șablon** (`<$template_*>`: nume, adresă, email, projectName…) | PARTIAL | `src/lib/projectSettings.js:333-345` `resolveTemplatePlaceholders` — doar `date/time/year/n/title/author`; grep `template_firstName\|template_projectName` → fără rezultate | lipsesc câmpurile din „Author Information" (firstName/street/city/email…) și `<$template_projectName>` distinct | P3 |
| S3-05.4.4 | Revizuire șabloane (Edit Template Info, re-salvare cu overwrite) | PARTIAL | `SaveTemplateDialog.jsx` există; grep `overwrite` în fluxul de șablon → neconfirmat pentru re-salvarea peste un șablon existent | de confirmat/adaugat suprascrierea la același titlu | P3 |
| S3-05.4.5 | Gestionare șabloane: import/export fișier, setare implicită, reveal, ștergere | PARTIAL | `src/components/Home.jsx` listează șabloanele + `lib/templates.cjs`; grep `importTemplate\|exportTemplate` → fără rezultate pentru import/export de fișiere de șablon | de adăugat import/export/delete/reveal în Home | P3 |
| S3-05.5 | **Panoul Project Settings** (C.2–C.9: section types, labels/status, custom metadata, formatting, auto-complete, special folders, background images, backup) | COMPLETE | `src/components/ProjectSettingsDialog.jsx` cu tab-uri (inclusiv `:71` „backup", `:687-705` sync); `src/lib/projectSettings.js` (sectionTypes:118-169, customIcons:174,271-273,485-486) | detaliile pe appendice C se vor audita separat (sursa `C-projset.txt` există) | P4 |

## Capitolul 6 — The Binder & its Outline (PDF 66–86)

| ID | Funcționalitate | Stare | Dovadă cod / căutare | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-06.1 | Schiță ierarhică: prăbușire/expandare, parents/children, siblings | COMPLETE | `src/lib/tree.js` (arbore complet); `src/components/Binder.jsx:181` (`visibleRows` cu `collapsed`) | — | P4 |
| S3-06.2 | **Cele 3 dosare rădăcină**: nemișcate, redatabile; Draft primește doar text/foldere; Research; Trash cu Empty Trash + restore | COMPLETE | `src/lib/tree.js:101-218` (`moveToTrash`, `restoreFromTrash`, `restoreManyFromTrash`, `emptyTrash`); `src/lib/binderContextMenu.js:157` („golește coșul"); restaurare din coș în i18n-ui:3869 | — | P4 |
| S3-06.2a | „Reveal Draft Folder" | UNVERIFIED | grep `revealDraft` → fără rezultate directe; navigarea la root e posibilă prin GoTo/Binder | de confirmat comandă dedicată | P4 |
| S3-06.3.1 | **Adăugare itemi**: buton Add (multifuncțional), footer bar, meniu contextual, Ctrl+N / Alt+Shift+N / Enter, reguli de nesting (fișier sub folder, frate lângă fișier) | COMPLETE | `src/components/Binder.jsx:417-418` („+ Doc", „dosar" în footer bar); `src/lib/binderContextMenu.js`; `src/App.jsx:1544` (la add text se aplică `defaultTemplateFor`); `src/lib/tree.js:69-95` (`insertNear`, `insertInside`) | — | P4 |
| S3-06.3.1a | Redenumire (dublu-clic, F2, Enter confirmă, Esc anulează) | COMPLETE | `src/components/Binder.jsx:419` (buton cu title „redenumește F2/dublu clic"), `:225` (`editing === node.id`) | — | P4 |
| S3-06.3.2 | **Selecție**: săgeți + Shift (interval), Ctrl (toggle), navigare containere Ctrl+Shift+↑/↓, type-ahead | COMPLETE | `src/components/Binder.jsx:193-199` (`select(id, {ctrl, shift, alt})` + `rangeIds`); `src/lib/tree.js:368` (`typeAhead`) | — | P4 |
| S3-06.3.3 | **Reveal in Binder** (Shift+R: deschide strămoșii, scroll) + evidențiere secundară a documentului editat | PARTIAL | `src/App.jsx:1748` (`revealInBinder`), `src/components/Binder.jsx:104` („Reveal in Binder: open every ancestor… scroll into view"); grep `secondary\|currentDoc\|indicator` în Binder.jsx → fără rezultate: **lipsește indicatorul pasiv al doc curent** | P3 |
| S3-06.3.4 | **Mutare/copiere**: drag&drop cu nivel indent + auto-scroll + expand la hover, Alt-drag duplicare, Ctrl+↑↓←→, Move To (listă toți itemii), Duplicate with Subdocuments, mutare multiplă | COMPLETE | `src/components/Binder.jsx:283` (clase `drop-${hint}`, `drop-copy` pentru copiere cu Alt); `src/lib/tree.js:230` (`keyMove`), `:246` (`duplicateNode` cu `withChildren`), `:304` (`dropMany`); `src/lib/binderContextMenu.js:100` (`moveTo` cu toți containerii) | fără „Move to 'X' again" (repetă ultima mutare) | P3 |
| S3-06.3.4a | **Copiere fișiere între proiecte** (drag între bindere + „Copy To Project"), cu metadata păstrată | MISSING | grep `copy to project\|copyToProject\|between projects` în `src/`+`lib/` → fără rezultate; nu se pot deschide 2 proiecte în aceeași fereastră pentru drag | de adăugat „Copy To Project" către un proiect recent (export parțial + import) | P2 |
| S3-06.3.5 | **Expand/Collapse**: clic săgeți, ←/→, Alt-clic recursiv, Expand All / Collapse All | COMPLETE | `src/components/Binder.jsx:421-422` (butoanele `expandAll`/`collapseAll` cu `setAllCollapsed`) | fără „Collapse all to current level" | P4 |
| S3-06.3.5a | **Hoisting** (izolarea unui subarbore în binder, cu bară proprie + unhoist) | COMPLETE | `src/App.jsx:704` (`hoistId`), `:1755-1757` (`hoistSelection`), `:3026-3028` (binder arată doar folderul hoistat), `.hoist-bar` în `src/styles.css:585` | — | P4 |
| S3-06.3.5b | **Separatori de binder** („Show as Binder Separator") | COMPLETE | `node.separator` randat ca riglă: `src/components/Binder.jsx:256-260,283` | — | P4 |
| S3-06.4 | **Selecții multiple**: comportament diferențiat (corkboard stacked pentru containere / listă plată pentru mixt; scrivenings doar textele selectate; salvarea selecției ca colecție) | EQUIVALENT | `selectedIds` multi + `rangeIds` (`Binder.jsx:283`); corkboard stacked pentru containere (`Corkboard.jsx:158-160`); `scriveningsList` (`src/lib/tree.js:191`); colecții: `src/lib/collections.js` + `CollectionsBar.jsx` | — | P4 |

## Capitolul 7 — All About Files and Folders (PDF 88–110)

| ID | Funcționalitate | Stare | Dovadă cod / căutare | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-07.1 | **Iconițe binder informative**: badge „are sinopsis", „are text", „are subdocumente", „are snapshots" (dog-ear) | PARTIAL | iconițe pe tip + custom în `src/components/Binder.jsx` + `Icons.jsx`; grep `badge\|dog-ear\|hasSynopsis` în Binder → fără rezultate: stările de conținut nu se văd în iconiță | badge-uri informative pe iconițe | P3 |
| S3-07.2 | **Titluri**: editare din binder/header/inspector; **Set Selected Text as Title**; **Clear Titles**; fallback adaptiv titlu←sinopsis←text | PARTIAL | F2/dublu-clic (`Binder.jsx:419,225`); echivalent „Set Synopsis from Main Text" există: `src/lib/i18n-ui.js:572-574` („Sinopsis din text… primele fraze ale documentului", în Inspector); grep `as Title\|titleFromSelection\|clearTitles\|Set Title` → fără rezultate: **lipsesc Set Selected Text as Title și Clear Titles**; fallback adaptiv absent: `Binder.jsx:183-188` (`titleOf` întoarce doar `n.title`, altfel „Fără titlu" — `i18n-ui.js:1288`) | P2 |
| S3-07.3 | **Folders are Files are Folders**: folder cu text, Convert to File/Folder, file groups, corkboard pe fișier | COMPLETE | `src/lib/tree.js:268-279` (`convertNode(tree, id, type)` — „Text <-> folder (Scrivener ‹Convert to Folder / Convert to File›)"); corkboard pe orice container: `Corkboard.jsx:177` (`folder?.cork`) | — | P4 |
| S3-07.4 | **Iconițe custom**: aplicare din meniu, iconițe recente, reset, emoji/text ca iconiță, culoare | COMPLETE | `src/lib/projectSettings.js:485-486` (`customIconOf` cu `CUSTOM_ICON_PREFIX`), `:271-273` (management + `deleteCustomIcon`), `:174` (clone); `src/components/Inspector.jsx:703-720` (selector iconițe: custom + emoji prin test `\p{Extended_Pictographic}`, + `iconColor`) | cross-ref: „Custom icons" din `PARITY-AUDIT-NEXT-CHAPTERS.md` (fals negativ corectat) | P4 |
| S3-07.5 | **Document Templates**: folder de șabloane desemnat, badge „T", New from Template (clonă completă, copii incluși), ordinea = meniul, Ctrl+Shift+N pentru primul | COMPLETE | `src/lib/documentTemplates.js:1-30` („Scrivener 3 §7.5": `listTemplates`, `templateTargetParent`, `cloneFromTemplate` cu id-uri noi + perechi pentru copierea docs/notes); `src/App.jsx:1544` | cross-ref: golul P2 „Document Templates" din `PARITY-AUDIT-NEXT-CHAPTERS.md` — închis | P4 |
| S3-07.5.2 | **Default subdocument template** pe folder (+cascadă, reset la „Text") | COMPLETE | `src/lib/projectSettings.js:371` (`defaultTemplateFor(project, parent)`), aplicat la crearea de text nou: `src/App.jsx:1544` | — | P4 |
| S3-07.5.3 | **Shared templates on disk** (folder global pentru toate proiectele) | MISSING | grep `sharedTemplate\|shared template` în `src/` + `lib/` → fără rezultate | folder configurabil + listare în meniul „New from Template" sub cele din proiect | P3 |
| S3-07.5.4 | Copierea șabloanelor între proiecte (drag între bindere) | MISSING | fără drag între proiecte deschise (vezi S3-06.3.4a) | export/import de itemi de șablon | P3 |
| S3-07.6 | **Section Types**: definire listă + asignare structure-based pe niveluri (folder/container/file × adâncime) | COMPLETE | `src/lib/projectSettings.js:118-169`: CRUD section types, `sectionTypeLevels: {folders, containers, files}`, `sectionTypeDepths[]` per nivel; `node.sectionType` pentru asignare | — | P4 |
| S3-07.6.2 | Aplicare manuală: inspector, coloană outliner, meniu contextual pe selecție multiplă | COMPLETE | coloana outliner: `src/components/Outliner.jsx:15` (`{id: 'sectionType', label: t('ui.inspector.tip_sectiune')}`); `node.sectionType` editabil; `src/lib/binderContextMenu.js` conține section type | — | P4 |
| S3-07.6.2a | **Default Subdocument Type per folder** (override local, afișat „Structure-Based (from ‹X›)") | MISSING | `projectSettings.js` are doar niveluri globale (`sectionTypeLevels`); grep `sectionTypeFor\|fromParent` în `src/lib/projectSettings.js`, `Outliner.jsx`, `Inspector.jsx` → fără rezultate | `node.sectionTypeDefault` + rezolvarea efectivă cu sursă | P3 |
| S3-07.6.3 | Combinare section types + document templates (șablonul duce tipul secțiunii) | COMPLETE | `nodeFromTemplate` copiază `sectionType`/`label`/`status`/`keywords`/`fromTemplate`: `src/lib/projectSettings.js:357-362` | — | P4 |

## Capitolul 14 — Cloud Integration and Sharing (PDF 298–319)

| ID | Funcționalitate | Stare | Dovadă cod / căutare | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-14.1 | **Proiect într-un folder cloud** + reguli de siguranță (nu deschide de două ori, așteaptă sincronizarea) | SUPERIOR | proiectul trăiește în folderul lui (`i18n-ui.js:1755`); Pneuma **supraveghează** modificările externe și îmbină: `lib/projectWatch.cjs:11,147,186,217` (watcher cu debounce, lock `project.json` partajat cu MCP, `saveMerged`, `reloadWithBase`, `syncConflicts`); `src/lib/syncGuard.js:29-64` (`findConflictCopies`, `incomplete`, `pullExternalDocs` cu merge) — Scrivener doar reîncarcă la deschidere/activare | — | P4 |
| S3-14.1a | Avertisment „proiect deja deschis" / colaborare pe folder partajat | EQUIVALENT | `src/lib/team.js:7-16` — presence `<machine>.json` + lock-uri per document (`PRESENCE_STALE_MS` 2 min, `LOCK_STALE_MS` 30 min), log `log-*.jsonl`; `src/components/TeamDialog.jsx` | model presence în loc de lock de fișier unic | P4 |
| S3-14.2 | **Scrivener for iOS**: sync Dropbox integrat, detectarea modificărilor mobile, colecția „Synced Documents", folderul „Conflicts" | NOT_APPLICABLE | nu există aplicație companion iOS; grep `dropbox\|iOS\|mobile sync` în `lib/` → doar textul UI despre foldere cloud. Echivalent parțial acoperit de merge-ul extern (S3-14.1) și `ConflictDialog.jsx` | — | P4 |
| S3-14.3 | **Synchronised folders** (folder extern de text pentru colaborare/editare externă) | EQUIVALENT | `lib/folderSync.cjs:87-132` (`syncOut`/`syncIn` cu manifest și hash), `:199-217` (`syncOptions`, `autoSyncAction` open/close); UI: `src/components/ProjectSettingsDialog.jsx:687-705` + `src/lib/projectSync.js` (`makeSyncDraft`, `applySyncDraft`, `syncFormatOptions`); rulare automată la open/close: `src/App.jsx:1257-1292` | — | P4 |
| S3-14.3.1 | Opțiuni setup: sync Draft / alte text / **doar colecția**; prefix numeric; snapshot-uri înainte de update; formate TXT/RTF/FDX/Fountain | PARTIAL | formate: `folderSync.cjs:22` — `FORMATS = ['rtf','txt','md','fdx','fountain']` (FDX + Fountain prezente, plus md); snapshot-uri la conflicte: `folderSync.cjs:9,129,183` („caller snapshots, then writes"); prefix numeric **fără toggle** — mereu pornit (`:101`, `padStart`); grep `syncCollection\|syncOnlyCollection` → fără rezultate: **lipsește filtrul pe colecție**; `SUBDIRS = {draft, notes}` (`:23`): **lipsește subfolderul „Trashed Files"** | P2 |
| S3-14.3.2 | Usage: export fișiere per item, fișiere noi în Draft/Notes importate, redenumiri → titluri binder, câștig pe data modificării, conflicte cu snapshot | COMPLETE | `syncIn` (`folderSync.cjs:132`) creează itemi noi; `markSynced:184`; manifest + hash SHA1 (`:24`); conflicte detectate și semnalate apelantului (`:9,129`) | — | P4 |
| S3-14.3.2a | Colecția **„Updated Documents"** (ce s-a schimbat la ultima sincronizare) | MISSING | grep `Updated Documents\|Synced Documents\|Documente sincronizate` în `src/`+`lib/` → doar mesaje toast (`i18n-ui.js:1331-1332`), fără colecție creată | creare colecție automată la sync | P3 |
| S3-14.3.2b | Dezactivare sincronizare (Clear) + invalidare la mutarea folderului | EQUIVALENT | `ProjectSettingsDialog.jsx:687` afișează `project.syncFolder`; `syncOptions`/`autoSyncAction` (`folderSync.cjs:199-217`) inactivează când `syncFolder` lipsește | buton dedicat „Clear" de confirmat | P4 |
| S3-14.3.3 | Limitări documentate (doar conținut text, fără metadata; conflicte rezolvate prin snapshot-uri) | EQUIVALENT | `serialize(html→rtf/md/txt)` (`folderSync.cjs:16,27`) — doar textul principal; snapshot-uri la ambele sensuri („Pre-Sync"-echivalent) prin apelant | — | P4 |
| S3-14.3.4 | Setări globale Sharing:Sync (B.8.3) — sync on open/close, import comentarii/notițe | PARTIAL | `settings.sharingSync.syncOnClose/syncOnOpen` (`src/App.jsx:1257-1292`); opțiunile de import comentarii/notițe din RTF extern: neatins (grep `importComments` fără rezultate) | P3 |

---

## GOLURI NOI

Toate gap-urile MISSING/PARTIAL de mai sus, cu notă de implementare (deduplicate față de backlog-urile din `PARITY-AUDIT-*.md` — „Saved Layouts", „Document Templates", „Custom icons" erau deja acolo și sunt acum închise):

| # | Gol | ID | Prioritate | Notă de implementare |
|---|---|---|---|---|
| 1 | **Copiere itemi între proiecte** (drag între bindere + „Copy To Project", cu metadata) | S3-06.3.4a, S3-05.3.2, S3-07.5.4 | **P2** | export subtree → JSON/zip în `lib/exporters.cjs` + import în `lib/scrivImport.cjs` (refolosind clonarea cu id-uri noi din `documentTemplates.js`); comandă „Copiază în proiectul…" cu listă de proiecte recente |
| 2 | **Filtrul folder-sync pe colecție** („Sync only documents in collection") + subfolder „Trashed Files" + toggle prefix numeric | S3-14.3.1 | **P2** | `project.syncCollection` filtrat în `collect()` (`lib/folderSync.cjs:65`); al treilea `SUBDIRS.trash`; fanion `syncPrefixNumbers` în `syncOut` |
| 3 | **Naming adaptiv** (fallback titlu ← sinopsis ← text, în binder/outliner/quick ref) | S3-07.2 | **P2** | funcție pură `displayTitle(node, docHtml)` în `src/lib/tree.js` + randare gri-italic în `Binder.jsx`/`Outliner.jsx`/`QuickSearch.jsx` |
| 4 | **Set Selected Text as Title** + **Clear Titles** (Documents ▸ Auto-Fill) | S3-07.2 | P2 | comenzi în `src/lib/commands.js`: selecția editorului → `node.title`; iterație flatten(tree) → șterge title |
| 5 | Indicator „nesalvat" în titlul ferestrei | S3-05.1.2a | P3 | stare `dirty` (există deja flush/queue în App.jsx:1013) → `document.title = name + ' *'` |
| 6 | **Upgrade format proiect** cu backup prealabil | S3-05.1.6 | P3 | `formatVersion` în project.json + hook de migrare la open în `lib/io` + `backupProject` înainte (lib/backup.cjs există) |
| 7 | Navigare prin cuprins în sesiunea Scrivenings | S3-04.2.6a | P3 | dropdown în header bar cu `sections`-ul deja trimis la `Scrivenings.jsx` + scroll la `registerRef` |
| 8 | Evidențiere secundară în binder a documentului editat | S3-06.3.3 | P3 | clasă CSS pe rândul cu `activeId.current` (există deja `onFocusSection` → App.jsx:4080) |
| 9 | Badge-uri pe iconițele binder (are sinopsis/text/snapshot) | S3-07.1 | P3 | în `Binder.jsx`: `n.synopsis`, `docs[n.id]`, `snapshots` există deja ca date |
| 10 | Placeholder-e de șablon `<$template_*>` din Author Information | S3-05.4.3a | P3 | extinde `resolveTemplatePlaceholders` (`projectSettings.js:333`) cu set de câmpuri author + projectName |
| 11 | **Shared templates on disk** | S3-07.5.3 | P3 | setare `sharedTemplatesDir` + listare în meniul New from Template sub `listTemplates()` |
| 12 | **Default Subdocument Type per folder** (section type) | S3-07.6.2a | P3 | `node.sectionTypeDefault` + `effectiveSectionType(project, node)` cu sursă („de la ‹X›") |
| 13 | Colecția automată „Updated Documents" la folder-sync | S3-14.3.2a | P3 | în apelantul `syncIn` (App/main): colecție în `project.collections` cu id-urile `r.updated` |
| 14 | Preferința view mode per split | S3-04.2.1 | P3 | mută `view` din stare globală în structura per-panou ( deja există `paneLocks` per split în saveUi) |
| 15 | Import/export fișiere de șablon de proiect + overwrite la re-salvare | S3-05.4.4/5.4.5 | P3 | în Home.jsx + `api.saveAsTemplate` cu match pe titlu |
| 16 | „Move to ‹X› again" (repetă ultima mutare) | S3-06.3.4 | P4 | memorare ultima țintă `moveTo` în `binderContextMenu.js:100` |
| 17 | „Collapse all to current level" | S3-06.3.5 | P4 | variantă a `setAllCollapsed` cu prag de adâncime |
| 18 | Setări import RTF comentarii/notițe pentru folder-sync | S3-14.3.4 | P3 | opțiuni în `projectSync.js` aplicate la `syncIn` |

## OMISIUNI DESCOPERITE

Capabilități din capitolele 1–7/14 **neacoperite de auditurile existente** (`PARITY-AUDIT-NEXT-CHAPTERS.md`, `PARITY-AUDIT-ch08…ch26`, `SCRIVENER-SEARCH-EVIDENCE.md`):

1. **Naming adaptiv** (§7.2) — niciun audit nu-l menționează; backlog-ul existent are doar „Titles" implicit.
2. **Set Selected Text as Title / Clear Titles** (§7.2) — absent din toate backlog-urile.
3. **Badge-urile informative ale iconițelor binder** (§7.1) — necunoscut în audituri.
4. **Default Subdocument Type per folder pentru section types** (§7.6.2) — auditul ch24 acoperă section types/layouts, dar nu override-ul per folder.
5. **Shared templates on disk** (§7.5.3) — golul P2 „Document Templates" din `PARITY-AUDIT-NEXT-CHAPTERS.md` a fost închis fără partea de shared templates.
6. **Copierea itemilor între proiecte / Copy To Project** (§6.3.4) — auditul ch10 acoperă importul, nu transferul selectiv între proiecte deschise.
7. **Upgrade format proiect + backup pre-upgrade + recovered files** (§5.1.6, §3.2.3) — netratat (Pneuma nu are versiuni de format).
8. **Indicatorul „nesalvat" din titlul ferestrei** (§5.1.2) — netratat.
9. **Placeholder-ele `<$template_*>`** (§5.4.3) — netratate.
10. **Evidențierea secundară binder + Reveal Draft Folder** (§6.3.3, §6.2.1) — parțial netratate.
11. **„Updated Documents" collection + filtrul pe colecție + „Trashed Files" al folder-sync** (§14.3.1–2) — folder sync nu apare deloc în auditurile existente (doar trecut cu vederea ca „echivalent Dropbox").
12. **Corkboard: lipsa texturii „cork" clasice / preferința view per split / navigarea Scrivenings** (§4.2.4, §4.2.1, §4.2.6) — auditul ch08+15 nu le listează ca goluri.

## Rezumat

### Numărătoare pe stări

| Stare | Total |
|---|---|
| COMPLETE | 34 |
| EQUIVALENT | 14 |
| SUPERIOR | 1 |
| PARTIAL | 14 |
| MISSING | 7 |
| NOT_APPLICABLE | 10 |
| UNVERIFIED | 1 |

### Numărătoare pe capitole (rânduri de tabel)

| Capitol | COMPLETE/EQ/SUP | PARTIAL | MISSING | N/A/UNV |
|---|---|---|---|---|
| 1–2 | 3 | 0 | 0 | 1 |
| 3 | 2 | 0 | 0 | 5 |
| 4 | 14 | 2 | 1 | 0 |
| 5 | 12 | 5 | 1 | 1 |
| 6 | 9 | 2 | 2 | 1 |
| 7 | 7 | 2 | 3 | 0 |
| 14 | 6 | 3 | 1 | 0 |

### Goluri P1+

Niciun gol P0/P1. Golurile **P2** (4):

1. **S3-06.3.4a / S3-05.3.2 / S3-07.5.4** — copierea itemilor între proiecte (drag între bindere, „Copy To Project"); implica și split-ul de proiecte și copierea șabloanelor.
2. **S3-14.3.1** — folder sync: filtru pe colecție, subfolder „Trashed Files", toggle prefix numeric.
3. **S3-07.2** — naming adaptiv (fallback titlu←sinopsis←text) în binder/outliner/quick search.
4. **S3-07.2** — comenzile „Set Selected Text as Title" și „Clear Titles" (Auto-Fill).

Restul golurilor sunt P3/P4 (vezi „GOLURI NOI").
