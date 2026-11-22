# Audit de paritate Scrivener 3 ↔ Pneuma Sofer — Anexa B (Options) + Anexa C (Project Settings)

- **Sursă:** manualul oficial Scrivener 3.1.6 Windows, Anexa B (Options, pag. 658–707) și Anexa C (Project Settings, pag. 708–731); extrase în `docs/audit/scrivener3/sources/B-options.txt` (2 288 linii) și `sources/C-projset.txt` (932 linii).
- **Versiune de referință:** Scrivener 3.1.6 (Windows).
- **Data auditului:** 2026-11-21.
- **Metodă:** inventar exhaustiv, setare cu setare (fără grupare), din textul integral al ambelor anexe; fiecare rând verificat în codul Pneuma (`src/components/SettingsDialog.jsx`, `src/components/AppearancePane.jsx`, `src/lib/settingsDefaults.js`, `src/components/ProjectSettingsDialog.jsx`, `src/components/DefaultFormatPane.jsx`, `src/lib/projectSettings.js`, `src/components/ShortcutsDialog.jsx`, `src/editor/corrections.js`, `src/editor/writing.js`, `lib/backup.cjs`, `lib/folderSync.cjs`, `electron/main.cjs`) prin citire de fișier și `grep -rniE` pe `src/`, `lib/`, `electron/`. Căutările negative sunt documentate în coloana Dovadă. Stările: COMPLETE / PARTIAL / UNINTEGRATED / BROKEN / MISSING / NOT_APPLICABLE / UNVERIFIED / EQUIVALENT / SUPERIOR.

Legenda dovodelor: SD = `src/lib/settingsDefaults.js`, StD = `src/components/SettingsDialog.jsx`, AP = `src/components/AppearancePane.jsx`, PSD = `src/components/ProjectSettingsDialog.jsx`, BK = `lib/backup.cjs`, FS = `lib/folderSync.cjs`, main = `electron/main.cjs`.

---

## B.1 Organizarea și gestionarea Options (B.1 + B.1.1)

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.MGMT.01 | Butonul „Defaults" (resetare din fabrică a tuturor opțiunilor) | PARTIAL | AP:123-134 (`resetAll` resetează doar culori/fonturi; `KEEP_ON_RESET` AP:21 păstrează tema/fonturile) | Nu resetează setările comportamentale (backup, corecții etc.) | Medie |
| S3-B.MGMT.02 | Load/Save Options from File (backup/sincronizare setări complète) | MISSING | grep -rniE "export.*settings\|save.*options" src/ lib/ electron/ → doar teme (`exportTheme` AP:100-103); nu există export/import de settings.json | Nu se pot transfera toate setările între calculatoare | Medie |
| S3-B.MGMT.03 | Save Theme Options to File (temă fără date personale) | EQUIVALENT | AP:100-103 `exportTheme` + `themeFromSettings`/`parseTheme` care filtrează doar cheile vizuale THEME_KEYS (SD:35-56) | Echivalent funcțional; Pneuma nu salvează niciodată date personale în temă | Mică |
| S3-B.MGMT.04 | Load/Save Theme from File (+ listă de teme salvate) | COMPLETE | AP:81-122 (`saveTheme`/`loadTheme`/`importTheme`), `savedThemes` SD:144; import acceptă `.scribnertheme` (AP:498) | — | — |

## B.2 General

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.GEN.01 | Reopen projects that were open on quit | COMPLETE | `reopenLastProject` SD:87; StD:371 | — | — |
| S3-B.GEN.02 | Automatically recover files inside project folder (fișiere de conflict) | PARTIAL | `lib/projectWatch.cjs:144-190` (three-way merge cu `base` + `store.backupFile`); `src/components/ConflictDialog.jsx` | Merge-ul la salvare există; lipsește scanarea/recuperarea fișierelor „conflicted copy" din cloud din dosarul proiectului | Medie |
| S3-B.GEN.03 | Show template chooser when there are no projects open | PARTIAL | `src/components/Home.jsx` (chooser de proiecte noi la start) | Fereastra există permanent; comutatorul on/off lipsește | Mică |
| S3-B.GEN.04 | Automatically check for updates | COMPLETE | `autoUpdateCheck` StD:53,372; `onCheckUpdates` StD:373; `electron/updateHandlers.cjs` | — | — |
| S3-B.GEN.05 | Frecvența verificării de update (dropdown) | MISSING | StD:372 — doar bifa on/off | — | Mică |
| S3-B.GEN.06 | Check for beta updates | NOT_APPLICABLE | Canal beta exclusiv Literature & Latte (grep „beta" în electron/ → 0). Echivalentul cel mai apropiat: `dtedAutoUpdate` (actualizări motor D&TED, StD:857) | Legat de infrastructura de release a Scrivener | — |
| S3-B.GEN.07 | Auto-save after n second(s) of inactivity | COMPLETE | `autosaveSec` SD:88 (implicit 2 s); StD:375-377 (1–120 s) | — | — |
| S3-B.GEN.08 | Take snapshots of changed text documents on manual save | PARTIAL | `snapshotOnSave` SD:131; StD:486; consumul exact (doar la Ctrl+S, nu la auto-save) neverificat în acest audit | Numele „Untitled (Save)" și diferențierea manual/automat neconfirmate | Medie |
| S3-B.GEN.09 | Author Information (nume autor global) | COMPLETE | `authorName` StD:101,318,381-383 (placeholder = `project?.author`) | Un singur câmp liber (Scrivener are mai multe câmpuri folosite în placeholder-e `<$author>`) | Mică |
| S3-B.GEN.10 | Interface Language | COMPLETE | `language` SD:86; StD:895-904; `LANGUAGES` în `src/lib/i18n.js` | — | — |
| S3-B.GEN.11 | Scratch Pad: Notes location (dosar pe disc) | COMPLETE | `scratchFolder` StD:108,386-401; `electron/smallWindowHandlers.cjs` (scratchChooseFolder/scratchWriteFolder, `src/components/Scratchpad.jsx:78`) | — | — |
| S3-B.GEN.12 | Scratch Pad: Default format (+ extensie custom pt. plain text) | MISSING | `Scratchpad.jsx:21-30` — notele sunt html fix, fără alegere de format | — | Mică |
| S3-B.GEN.13 | Shared Templates: shared templates folder pe disc | MISSING | grep -rniE "shared template" src/ lib/ electron/ → 0 hits (`lib/templates.cjs` = șabloane de proiect, altceva) | Șabloanele de document sunt doar per-proiect (PSD:579-588) | Medie |
| S3-B.GEN.14 | Citations: Bibliography Manager (alegere program extern) | MISSING | grep -rniE "citation\|biblio" → `lib/bibliography.cjs`, `src/lib/bibMerge.js` (bibliografie internă, nu legătură cu program extern Insert ▸ Bibliography) | Echivalent parțial: bibliografia internă din Pneuma | Mică |
| S3-B.GEN.15 | Separators: tabel separatoare (Single Return / Empty Line / Custom) pt. Merge, Append Selection, Scratchpad | PARTIAL | grep „separator" → `BatchADialogs.jsx`, `Scratchpad.jsx`, `Editor.jsx` (separatoare folosite în fluxuri); nu există tabel de setări cu 3 stiluri + custom | Comportament codat, neconfigurabil | Medie |
| S3-B.GEN.16 | Automatic Quit after inactivity (+ minute) | MISSING | grep -rniE "autoQuit\|idle.*quit\|inactivity" src/ lib/ electron/ → doar `src/lib/i18n.js` (text UI fără legătură) | — | Mică |
| S3-B.GEN.17 | Warnings: Show internal error alerts (mod depanare) | MISSING | grep -rniE "resetAllWarnings\|error alerts" → 0; există `src/components/ErrorBoundary.jsx` (echivalent parțial, fără fereastră de debug) | — | Mică |
| S3-B.GEN.18 | Warnings: Reset All Warnings | MISSING | grep → 0 hits; nu există sistem de avertismente re-afișabile | — | Mică |

## B.3 Editing

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.EDI.01 | Default Text Zoom | MISSING | grep "zoom" → zoom runtime în `Editor.jsx`/`CompositionBar.jsx`; nu există setare globală de zoom implicit | — | Medie |
| S3-B.EDI.02 | Ruler Units (cm/inch/picas/points) | MISSING | grep -rniE "rulerUnits" → 0; `src/components/Ruler.jsx` există fără unități măsurabile | Rigla e în em | Mică |
| S3-B.EDI.03 | Use the Insert key to control overtype mode | MISSING | grep -rniE "overtype" src/ lib/ → 0 hits | — | Mică |
| S3-B.EDI.04 | Insert date time using custom format | MISSING | grep -rniE "dateFormat\|datestamp" src/ lib/ → 0 hits (doar `placeholders.cjs` în lib) | — | Mică |
| S3-B.EDI.05 | Use font hinting | NOT_APPLICABLE | Redarea fonturilor e delegată motorului Chromium/Electron; nu există control de hinting | N/A tehnologic în Electron | — |
| S3-B.EDI.06 | Terminate footnotes before punctuation | MISSING | grep -rniE "footnote.*punctuation\|fnBefore" → 0 hits | — | Mică |
| S3-B.EDI.07 | Open comments in inspector if possible | MISSING | grep → 0 hits (Inspector.jsx fără acest comutator) | — | Mică |
| S3-B.EDI.08 | Use block insertion point (lățime cursor) | MISSING | `edCaret` SD:4 = doar culoarea cursorului, nu lățimea | — | Mică |
| S3-B.EDI.09 | Main text style for new documents (font + paragraaf global) | COMPLETE | `editorFont/fontSize/lineHeight/pageWidth` SD:92-95 + `paragraphIndent/paragraphSpacing` SD:123-125; StD:456-467, AP:152-173; aplicate prin `--editor-*`/`--para-*` SD:172-190 | Mock editor cu previzualizare lipsește (se dau valori numerice) | — |
| S3-B.EDI.10 | „Use Formatting in Current Editor" (buton) | MISSING | grep -rniE "use current" → doar `compWidth` (AP) și ProjectSettings; nu pt. formatare globală | — | Mică |
| S3-B.EDI.11 | Notes font (note de document) | COMPLETE | `inspNotesFont` SD:21; AP:454 | — | — |
| S3-B.EDI.12 | Inspector comments font | EQUIVALENT | `annotFont`/`annotSize` SD:23; AP:474-481 (font + măsură pt. adnotări) | Acoperă și adnotările inline (în Scrivener acestea urmează textul) | — |
| S3-B.EDI.13 | Different inline footnotes font (global) | PARTIAL | `footnoteFont/footnoteSize` există doar per-proiect (`DefaultFormatPane.jsx:78`); cheie globală absentă din SD | Vezi S3-C.FMT.28 | Mică |
| S3-B.EDI.14 | Use inline footnotes font for inspector footnotes too | MISSING | grep → 0 hits | — | Mică |
| S3-B.EDI.15 | Set Styles Defaults… (foaia de stiluri implicită pt. proiecte noi) | MISSING | `StylesDialog.jsx`/`StylesPanel.jsx` există; fără buton „default pentru proiecte noi" (grep "styles default" → 0) | — | Medie |
| S3-B.EDI.16 | Revisions: culorile celor 5 niveluri | COMPLETE | `revisionColors` SD:100; AP:194-205 (5 selectoare) | — | — |
| S3-B.EDI.17 | Revisions: Load Default Revision Colors | COMPLETE | butonul „Implicit" AP:203 (`DEFAULT_SETTINGS.revisionColors`) | — | — |
| S3-B.EDI.18 | Revisions: Use revision colors in notes | MISSING | grep -rniE "revision.*notes" → 0 hits | — | Mică |
| S3-B.EDI.19 | Revisions: Treat text with same text color as revision | MISSING | grep → 0 hits | — | Mică |

## B.4 Behaviors

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.BEH.01 | Open composition mode on… (monitor desemnat) | COMPLETE | `compDisplay` SD:31; AP:409-419 (dropdown monitoare via `api.listDisplays`) | — | — |
| S3-B.BEH.02 | Hide main window in composition mode | NOT_APPLICABLE | Compoziția Pneuma e overlay în aceeași fereastră (`--comp-*` SD:108-112), nu ecran separat; echivalent: `compFade` (fundal translucid) | Legat de modelul de fereastră al Scrivener | — |
| S3-B.BEH.03 | Escape key closes composition screen | COMPLETE | `src/App.jsx:2797` (`e.key === 'Escape' && composition`) | Fără comutator (în Scrivener se poate dezactiva) | Mică |
| S3-B.BEH.04 | Document links and bookmarks create back-link bookmarks | COMPLETE | `autoBacklinks` SD:128; StD:478; `src/lib/backlinks.js` | Global (în Scrivener tot global) | — |
| S3-B.BEH.05 | Image links create back-link bookmarks | MISSING | grep -rniE "image.*backlink" → 0 hits | — | Mică |
| S3-B.BEH.06 | Open clicked document links in… (Current/Other Editor/QR/Copyholder) | MISSING | grep -rniE "openLinksIn\|linksOpenIn" src/components → 0 | — | Medie |
| S3-B.BEH.07 | Open new document links in… (+ „(Do not open)") | MISSING | grep → 0 (crearea legăturilor noi există: `onMissingLink` Editor.jsx:150, dar deschiderea nu e configurabilă) | — | Medie |
| S3-B.BEH.08 | Open Inspector bookmarks in… | MISSING | grep în `Inspector.jsx`/`BookmarksPanel.jsx` → 0 | — | Mică |
| S3-B.BEH.09 | Double-clicking on the corkboard background (părinte / card nou / nimic) | MISSING | `Corkboard.jsx:84-100` — doar dbl-click pe card (deschide); fundalul fără acțiune configurabilă | — | Medie |
| S3-B.BEH.10 | Always creates a new card in freeform mode | MISSING | grep "freeform" în Corkboard.jsx → 0 | Freeform corkboard absent | Mare |
| S3-B.BEH.11 | Always creates a new card when arranged by label | MISSING | grep "arrange.*label" → 0 | Modul „aranjare după etichetă" absent | Mare |
| S3-B.BEH.12 | Alt-dragging creates duplicates | MISSING | grep -rniE "alt.*duplicate" src/components → 0 (doar manual.ro/en) | — | Medie |
| S3-B.BEH.13 | Allow drop-ons in corkboard (card ca copil prin drop) | MISSING | grep "dropOn" → doar CollectionsBar.jsx (altceva) | — | Medie |
| S3-B.BEH.14 | Treat all documents with subdocuments as folders | MISSING | grep -rniE "treatContainers\|as folders" → 0 | — | Medie |
| S3-B.BEH.15 | Include enclosing folder text in scrivenings mode | MISSING | grep în `Scrivenings.jsx`/SD → 0 | — | Medie |
| S3-B.BEH.16 | Show folder text when selected from search results | MISSING | grep → 0 | — | Mică |
| S3-B.BEH.17 | Automatically load web pages in bookmarks preview | MISSING | grep "bookmarks preview" → 0 | — | Mică |
| S3-B.BEH.18 | Allow limited navigation in web pages | MISSING | grep → 0 (`WebArchiveView.jsx` există fără această setare) | — | Mică |
| S3-B.BEH.19 | Playback: Rewind when paused by… (secunde) | MISSING | grep -rniE "rewind" src/ → 0 hits | — | Mică |
| S3-B.BEH.20 | Playback: Media time stamp format | MISSING | grep în `MediaPlayerView.jsx` → marcaje existente fixe; `dtedTimestamps` (StD:96) e dictare, altceva | — | Mică |
| S3-B.BEH.21 | Return key: Ends editing synopsis in corkboard and outliner | MISSING | `Corkboard.jsx:93` — comportament fix (Enter editează), fără comutator | — | Mică |
| S3-B.BEH.22 | Return key: Creates new item in list, outline and corkboard views | PARTIAL | `binderEnter` ('edit'|'newDoc') SD:102; StD:409-415 — doar pt. binder | Lipsesc outliner/corkboard/liste de cuvinte-cheie | Medie |
| S3-B.BEH.23 | Snapshots: Play shutter sound | MISSING | grep -rniE "shutter" → 0 hits | — | Mică |
| S3-B.BEH.24 | Snapshots: Show notification | MISSING | grep "snapshotNotif" → 0 | — | Mică |

## B.5 Appearance

### B.5.1 General Interface

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.APP.01 | Show full project path in the title bar | MISSING | grep "title bar\|project path" în App.jsx → 0 | — | Mică |
| S3-B.APP.02 | Keep Project Bookmarks window on top | MISSING | grep „on top" → doar `scratchOnTop` (StD:107) | Echivalent parțial: scratchpad on-top | Mică |
| S3-B.APP.03 | Toolbar height and icon size | EQUIVALENT | `toolbarIconSize` (small/medium/large) + `uiDensity` SD:25; AP:175-189 | Înălțimea nu e separată de mărimea pictogramelor | — |
| S3-B.APP.04 | Collections background darkness (slider) | MISSING | grep „collections.*dark" → 0 | — | Mică |
| S3-B.APP.05 | Menus & Window Font | MISSING | grep „menus.*font" → 0; fontul UI nu e configurabil (doar `binderFont`) | — | Mică |

### B.5.2 Binder

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.APP.06 | Show current editor document indicator | MISSING | grep „document indicator" în Binder.jsx → 0 | — | Medie |
| S3-B.APP.07 | Binder Row spacing | MISSING | SD nu are cheie de spațiere binder (doar `binderFontSize`) | — | Mică |
| S3-B.APP.08 | Binder and Outliner extra indent (-5..5 px) | MISSING | grep „extra indent" → 0 | — | Mică |
| S3-B.APP.09 | Binder font | COMPLETE | `binderFont` SD:12; AP:246 + `binderFontSize` AP:248 | — | — |
| S3-B.APP.10 | Use bold font for… (containere bold) | EQUIVALENT | `binderContainerStyle` ('normal'|'bold'|'italic'|'bolditalic') SD:12; AP:266-270 | Pneuma oferă 4 stiluri în loc de 2 bifăi | — |
| S3-B.APP.11 | Culori tab-uri Binder & Search Results (unificate) | PARTIAL | `binderBg`/`binderText` SD:10; AP:253-254 — fundal/text binder; culoarea separată a tab-urilor de colecții/căutare lipsește | — | Mică |

### B.5.3 Composition Mode (culori, Tabelul B.1)

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.APP.12 | Highlight current line (în compoziție) | PARTIAL | `curLine` e global (SD:6; AP:224), nu separat pe modul compoziție | — | Mică |
| S3-B.APP.13 | Editor (paper) background | COMPLETE | `compPageColor` SD:27; AP:370 | — | — |
| S3-B.APP.14 | Text override colour (+ bifa de activare) | COMPLETE | `compTextColor` SD:27; AP:369 | — | — |
| S3-B.APP.15 | Scrivenings Titles Text/Background (în compoziție) | MISSING | grep „scriv.*title.*bg" → 0 | — | Mică |
| S3-B.APP.16 | Screen Background (culoare + imagine) | COMPLETE | `compBg`/`compBgImage`/`compBgImageFit` SD:106-112; AP:328-363 | — | — |
| S3-B.APP.17 | Synopsis Background (inspector flotant) | MISSING | grep „synopsis bg" → 0 | — | Mică |
| S3-B.APP.18 | Notes Background (în compoziție) | PARTIAL | `inspNotesBg` SD:21 e global, nu suprascris în compoziție | — | Mică |
| S3-B.APP.19 | Comments Area background | MISSING | grep „comments area" → 0 | — | Mică |
| S3-B.APP.20 | Text Selection colour (în compoziție) | PARTIAL | `edSel` SD:4 global | — | Mică |
| S3-B.APP.21 | Current Line Highlight colour (în compoziție) | PARTIAL | `curLineColor` SD:6 global | — | Mică |

### B.5.4 Corkboard

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.APP.22 | Display images as photographs | MISSING | grep în Corkboard.jsx → 0 | — | Medie |
| S3-B.APP.23 | Freeform grid size | MISSING | grep „freeform" → 0 | Freeform absent (S3-B.BEH.10) | Mare |
| S3-B.APP.24 | Draw shadows around cards | MISSING | grep „shadows" în Corkboard.jsx → 0 | — | Mică |
| S3-B.APP.25 | Status stamp opacity | MISSING | grep „stamp" → 0 | Ștampilele de status pe carduri nu există | Medie |
| S3-B.APP.26 | Label tint opacity | PARTIAL | `labelTint(color, alpha=0.18)` SD:159-166 — alpha fix, fără slider | Doar pt. binder label mode 'row' | Mică |
| S3-B.APP.27 | Shadows intensity slider | MISSING | grep → 0 | — | Mică |
| S3-B.APP.28 | Status stamps font | MISSING | grep „stamp" → 0 | — | Mică |
| S3-B.APP.29 | Fundal corkboard (culoare / textură clasică / imagine proprie; 3 moduri) | COMPLETE | `corkBg` {default,cork,wood,linen,color,image} + `corkBgColor`/`corkBgImage` SD:14; AP:275-298 | Pneuma: 2 texturi în plus; fără imagine de fundal separată pt. modul label (nu există) | — |
| S3-B.APP.30 | Status stamp colour | MISSING | grep → 0 | — | Mică |

### B.5.5 Index Cards

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.APP.31 | Options index cards (cele 3 setări din panou) | MISSING | PSD/AP nu au panou de opțiuni pt. carduri | Manualul nu le numește explicit (colțuri etc.) | Mică |
| S3-B.APP.32 | Index cards title font | COMPLETE | `cardTitleFont` SD:14; AP:304 | — | — |
| S3-B.APP.33 | Index cards text (synopsis) font | COMPLETE | `cardSynopsisFont` SD:14; AP:305 | — | — |
| S3-B.APP.34 | Index Card Background colour | COMPLETE | `cardColor` SD:14; AP:300 | — | — |

### B.5.6 Inspector & Notes

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.APP.35 | Notes Background | COMPLETE | `inspNotesBg` SD:21; AP:457 | — | — |
| S3-B.APP.36 | Bookmarks Preview background | MISSING | grep → 0 | — | Mică |
| S3-B.APP.37 | Comments Area background (inspector) | MISSING | grep → 0 | — | Mică |

### B.5.7 Main Editor

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.APP.38 | Highlight current line | COMPLETE | `curLine`/`curLineColor`/`curLineOpacity` SD:6; AP:223-231 | — | — |
| S3-B.APP.39 | Default editor width (+ Use Current) | EQUIVALENT | `pageWidth` în em SD:95; AP:171-173; `--editor-page-width` SD:176 | În em, nu px; fără buton „Use Current" | — |
| S3-B.APP.40 | Use fixed width editor (on/off) | EQUIVALENT | Comportament permanent: coloană de lățime fixă `--editor-page-width` (SD:172-190) | Fără comutator (întotdeauna fix) | — |
| S3-B.APP.41 | Center the editor when using a fixed width | EQUIVALENT | Text centrat implicit în editor; `compAlign` (left/center/right) există pt. compoziție SD:110 | Fără comutator în editorul principal | — |
| S3-B.APP.42 | Scrollbars next to text when using fixed width | MISSING | grep „scrollbar" → doar `compScrollbar` (compoziție) | — | Mică |
| S3-B.APP.43 | Left/Right editor margin | MISSING | SD nu are chei de margini editor (doar `pageWidth`) | — | Medie |
| S3-B.APP.44 | Top/Bottom editor margin | MISSING | idem | Padding vertical fix în CSS | Medie |
| S3-B.APP.45 | Editor background (paper) colour/texture | COMPLETE | `edBg` SD:4; AP:211 | Fără variantă „texture image" pt. editor | — |
| S3-B.APP.46 | Text colour override | COMPLETE | `edText` SD:4; AP:212 | — | — |
| S3-B.APP.47 | Fixed Width Background colour | MISSING | grep „fixed width bg" → 0 | — | Mică |
| S3-B.APP.48 | Media Background colour | MISSING | grep „media bg" → 0 | — | Mică |

### B.5.8 Outliner

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.APP.49 | Outliner has horizontal grid lines | PARTIAL | `outGridColor` SD:16; AP:314 — culoarea există; comutatoarele separate orizontal/vertical lipsesc | — | Mică |
| S3-B.APP.50 | Grid lines only when using fixed row heights | MISSING | grep „fixed row" în Outliner.jsx → 0 | — | Mică |
| S3-B.APP.51 | Outliner has vertical grid lines | MISSING | idem S3-B.APP.49 | — | Mică |
| S3-B.APP.52 | Outliner uses alternating row colors | COMPLETE | `outAltRows`/`outAltColor` SD:16; AP:311-313 | — | — |
| S3-B.APP.53 | Outliner Row spacing (cu/fără sinopsis) | MISSING | grep „row spacing" în Outliner.jsx → 0 | — | Mică |
| S3-B.APP.54 | Fonts: Titles / Synopses / Other | PARTIAL | `outTitleFont`/`outSynopsisFont` SD:16; AP:318-319 — fontul „Other" (celelalte coloane) lipsește | — | Mică |
| S3-B.APP.55 | Use bold font… when synopses hidden/shown | MISSING | grep „bold.*synopsis" → 0 | — | Mică |
| S3-B.APP.56 | Colors: Folder Titles | COMPLETE | `outFolderColor` SD:16; AP:315 | — | — |
| S3-B.APP.57 | Colors: Grid | COMPLETE | `outGridColor` AP:314 | — | — |
| S3-B.APP.58 | Colors: Group Titles | MISSING | grep „group titles" → 0 | — | Mică |
| S3-B.APP.59 | Colors: Synopses | MISSING | grep „synopsis color" → 0 | — | Mică |
| S3-B.APP.60 | Colors: Background (outliner) | MISSING | SD nu are `outBg` (doar `outAltColor` pt. rânduri alternative) | — | Mică |

### B.5.9 Page View

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.APP.61 | Center pages | MISSING | grep „page view" în App.jsx → modul există (`pageViewPaper`/`pageViewSurround` SD:5); opțiunile lipsesc | — | Mică |
| S3-B.APP.62 | Show margin guides | MISSING | grep „margin guide" → 0 | — | Mică |
| S3-B.APP.63 | Spacing between pages | MISSING | grep → 0 | — | Mică |
| S3-B.APP.64 | Base page view size on print/compile settings | MISSING | grep „page.*size.*print" → 0 (`PageSetupDialog.jsx` există, neconectat la page view) | — | Mică |
| S3-B.APP.65 | Page View Background colour | COMPLETE | `pageViewSurround` SD:5; AP:216 (+ `pageViewPaper` pt. hârtie) | — | — |

### B.5.10 Quick Reference

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.APP.66 | QR: Highlight current line | MISSING | `src/components/QuickRef.jsx` — fără `curLine` (grep → 0) | — | Mică |
| S3-B.APP.67 | QR: Page Background colour | MISSING | grep în QuickRef.jsx → 0 | — | Mică |
| S3-B.APP.68 | QR: Notes Background colour | MISSING | idem | — | Mică |

### B.5.11 Scrivenings

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.APP.69 | Scrivenings Separator (Corner/Dashed/Divider/Bookish) | EQUIVALENT | `scrivSepStyle` {dashed,solid,dotted,double,none} SD:22; AP:466-469 | Lipsesc stilurile Corner, Divider și Bookish | Medie |
| S3-B.APP.70 | Separator colour | COMPLETE | `scrivSepColor` SD:22; AP:464 | — | — |
| S3-B.APP.71 | Scrivenings titles font | COMPLETE | `scrivTitleFont` SD:22; AP:462 | — | — |
| S3-B.APP.72 | Use title background color | MISSING | grep „title background" → 0 | — | Medie |
| S3-B.APP.73 | Do not show separators above titles | MISSING | grep → 0 | — | Mică |
| S3-B.APP.74 | Reduce font size per level by… | MISSING | grep „per level" în Scrivenings.jsx → 0 | — | Mică |
| S3-B.APP.75 | Minimum font size (titluri) | MISSING | grep → 0 | — | Mică |
| S3-B.APP.76 | Scrivening Titles Text colour | MISSING | grep „scriv.*color" → doar `scrivSepColor` | — | Mică |
| S3-B.APP.77 | Scrivening Titles Background colour | MISSING | idem | — | Mică |

### B.5.12 Target Progress Bars

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.APP.78 | Smooth transition between colours | MISSING | `StatusBar.jsx:28` — bară simplă `<progress>`; fără tranziții/configurare | — | Mică |
| S3-B.APP.79 | Show progress bars in „Targets and Search" toolbar item | MISSING | grep în QuickSearch.jsx/Toolbar → 0 | — | Mică |
| S3-B.APP.80 | Start/Midway/End/Overflow colours | MISSING | grep „progress.*color" → 0 | — | Mică |

### B.5.13 Textual Marks

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.APP.81 | Underline links | MISSING | grep „underline.*link" → 0 (linkurile au stil din temă, `--link-internal/external`) | — | Mică |
| S3-B.APP.82 | „Hide Markup" hides… (opțiuni per tip de marcare) | MISSING | grep „hide markup" → 0 | — | Mică |
| S3-B.APP.83 | Invisible Characters colour | PARTIAL | `showInvisibles` SD:126 (toggle în StD:476) există; culoare separată a caracterelor invizibile lipsă | — | Mică |
| S3-B.APP.84 | Footnotes Background colour | MISSING | grep → 0 | — | Mică |
| S3-B.APP.85 | Inspector|Inline Footnotes Text colour | MISSING | grep → 0 | — | Mică |
| S3-B.APP.86 | Links colour | SUPERIOR | `linkInternal` + `linkExternal` separate SD:8; AP:217-218 | Scrivener are o singură culoare pt. toate linkurile | — |
| S3-B.APP.87 | Search Results Highlights colour | COMPLETE | `searchHitColor` SD:8; AP:220 | — | — |
| S3-B.APP.88 | Search Results Underline colour | MISSING | grep → 0 | — | Mică |
| S3-B.APP.89 | Find Results Highlight / Alternate / Text | MISSING | grep „find.*highlight" → 0 | — | Mică |
| S3-B.APP.90 | Spell Check Underline colour | MISSING | grep → 0 (sublinierea vine din Electron spellcheck, neconfigurabilă) | — | Mică |
| S3-B.APP.91 | Preserve Formatting colour | COMPLETE | `keepFormatColor` SD:8; AP:219 | — | — |
| S3-B.APP.92 | Decorate comment and footnote anchors as links | MISSING | grep „anchors as links" → 0 | — | Mică |

## B.6 Corrections (+ B.6.1 Auto-Completion)

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.COR.01 | Check spelling as you type | PARTIAL | Motorul Electron e activ mereu când `spellLanguages` e setat (main:267-270 `applySpellLanguages`, reaplicat la schimbare main:593); comutator on/off absent | Fără bifa separată de tip „check spelling as you type" | Mică |
| S3-B.COR.02 | Correct spelling errors as you type | PARTIAL | `learnCorrections` + învățare din corecturi (`src/editor/corrections.js:144` onLearn; SD:122); nu corectază automat greșeli general | Doar înlocuiri învățate | Mică |
| S3-B.COR.03 | Ignore words with numbers | MISSING | grep -rniE "words? with numbers\|ignoreNumbers" → 0 hits | — | Mică |
| S3-B.COR.04 | Underline style (dots / wavy line) | MISSING | grep „underline style" → 0 | Dictat de Chromium | Mică |
| S3-B.COR.05 | Dictionary selection | SUPERIOR | `spellLanguages` = listă multi-limbă simultană SD:120; StD:432-434; main:267-270 | Scrivener: un singur dicționar activ | — |
| S3-B.COR.06 | Download dictionaries (buton) | NOT_APPLICABLE | Dicționarele vin cu Electron (`ses.availableSpellCheckerLanguages`, main:270); nu există server de descărcare | Echivalent: instalare motor D&TED/whisper (StD:781-838) | — |
| S3-B.COR.07 | View Personal Word List | COMPLETE | `PersonalDictionary` StD:1043-1068 (adăugare/ștergere/filtrare); `spell:listWords` `electron/preload.cjs:188` | — | — |
| S3-B.COR.08 | Fix capitalization of sentences | SUPERIOR | `autoCapitalize` + `isSentenceStart` cu excepții românești (etc/nr/dl/dna/ex/pag/vol/cap/art) — `src/editor/corrections.js:41-53`; StD:430 | Liste de excepții lingvistice, nu doar „." + spațiu | — |
| S3-B.COR.09 | Capitalize „i" | NOT_APPLICABLE | Specific limbii engleze; în română „i" nu se majusculizează. Echivalent: `autoCapitalize` (corecteză majuscula la început de propoziție) | — | — |
| S3-B.COR.10 | Symbol and text substitution (Enable + Edit Substitutions…) | COMPLETE | `autoReplacements` [{from,to,learned}] SD:121; editor complet în StD:441-453; aplicate în `corrections.js:25-33` | — | — |
| S3-B.COR.11 | Use smart quotes in new projects | COMPLETE | `smartQuotes` SD:115; StD:426; `Editor.jsx:45` | — | — |
| S3-B.COR.12 | Use smart dashes and ellipses | COMPLETE | `smartDashes`/`smartEllipsis` SD:116-117; StD:427-428; `corrections.js:21-23` | — | — |
| S3-B.COR.13 | (extra Pneuma) Smart fractions 1/2→½ | SUPERIOR | `smartFractions` + `FRACTIONS` (19 fracții) SD:118; `corrections.js:11-19`; StD:429 | Nu există în Scrivener | — |
| S3-B.COR.14 | Disable smart quote/dashes/ellipses in script mode | MISSING | grep în `corrections.js`/`writing.js` → nu există ramură „script mode" pt. punctuație | — | Mică |
| S3-B.COR.15 | Automatically detect web addresses | MISSING | grep -rniE "autolink\|detect.*address" src/editor → 0 | — | Medie |
| S3-B.COR.16 | Automatically detect [[document links]] | SUPERIOR | `wikiLink` — `src/editor/writing.js:361-417` + ofertă de creare document nou (`onMissingLink` `Editor.jsx:150`) | Pneuma oferă UI de creare a documentului lipsă | — |
| S3-B.COR.17 | Auto-Completion: Suggest completions as you type | COMPLETE | extensia `autoComplete` `writing.js:278`; lista per-proiect PSD:610-618; StD notează declanșarea cu litere + Enter/Tab | — | — |
| S3-B.COR.18 | Auto-Completion: In script mode only | MISSING | grep „script.*only" în writing.js → 0; completarea e mereu activă | Scope-ul General/All lipsește (vezi S3-C.AC.30) | Mică |

## B.7 Keyboard

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.KEY.01 | Modificarea scurtăturilor (înregistrare + detectare conflicte) | COMPLETE | `ShortcutsDialog.jsx:6-73` (înregistrare la tastare, `conflicts` evidențiază roșu, grupuri pe meniuri) | — | — |
| S3-B.KEY.02 | Filter search bar (căutare comenzi) | MISSING | `ShortcutsDialog.jsx` — fără câmp de filtrare | — | Mică |
| S3-B.KEY.03 | Reset per scurtătură | COMPLETE | `ShortcutsDialog.jsx:55-59` (buton „Implicit" / Backspace șterge) | — | — |
| S3-B.KEY.04 | Reset all to defaults | COMPLETE | `ShortcutsDialog.jsx:74` | — | — |
| S3-B.KEY.05 | Secvențe „chord" (taste successive, virgulă) | MISSING | `keyFromEvent` capturează o singură combinație (ShortcutsDialog.jsx:41-48) | — | Mică |
| S3-B.KEY.06 | Import/Export shortcut presets (To File) | MISSING | grep „import.*shortcut" → 0 | Presetările stau în settings.json (nestocate separat) | Mică |
| S3-B.KEY.07 | Export „For Printing" (fișier uman lizibil) | MISSING | grep → 0 | — | Mică |

## B.8 Sharing (Import / Export / Sync / Conversion)

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.SHR.01 | Import: comments as inline annotations | MISSING | `lib/docxImport.cjs` există; opțiunea absentă din `ImportDialog.jsx` (grep „annotations" → 0) | — | Medie |
| S3-B.SHR.02 | Import: footnotes/endnotes as inline footnotes | MISSING | grep în ImportDialog.jsx → 0 | — | Medie |
| S3-B.SHR.03 | Import: ignore stylesheet information | MISSING | grep „ignore.*style" → 0 | — | Mică |
| S3-B.SHR.04 | Import: update styles in pasted text to match destination | MISSING | grep „pasted.*style" → 0 | — | Medie |
| S3-B.SHR.05 | Import: Encoding for plain text | MISSING | UTF-8 fix în importers/exporters (grep „encoding" → `lib/exporters.cjs` etc., fără setare) | — | Mică |
| S3-B.SHR.06 | Import: Invalid character handling | MISSING | grep „invalid char" → 0 | — | Mică |
| S3-B.SHR.07 | Import: Convert HTML files to MHT/Text | MISSING | import HTML există (`lib/loadHtml.cjs`, `importers.cjs`); opțiunea de alegere MHT/Text absentă | — | Medie |
| S3-B.SHR.08 | OPML: Import notes into… (synopsis/text/notes) | MISSING | OPML apare în `ExportDialog.jsx` (export); import OPML cu opțiuni neidentificat (grep „opml" în ImportDialog → 0) | — | Medie |
| S3-B.SHR.09 | OPML: Create folder to hold imported items | MISSING | grep → 0 | — | Mică |
| S3-B.SHR.10 | Scapple: first lines of notes as titles only | NOT_APPLICABLE | Scapple e aplicație Literature & Latte, inexistentă în ecosistemul Pneuma (grep „scapple" → 0). Cel mai apropiat echivalent: import OPML (outline extern) | — | — |
| S3-B.SHR.11 | Export: underscores→underlines în Markdown | MISSING | grep „underscore" în compile/export → 0 | — | Mică |
| S3-B.SHR.12 | Export: Include image file names for Nisus Writer | NOT_APPLICABLE | Nisus Writer Pro e procesor de text macOS terț. Echivalent: export RTF propriu (`lib/exporters.cjs`, `lib/rtfWriter.cjs`) | — | — |
| S3-B.SHR.13 | Export: Do not include stylesheet information | MISSING | grep „stylesheet" în compile → 0 | — | Mică |
| S3-B.SHR.14 | Export: Write HTML clipboard data | PARTIAL | `Editor.jsx` conține clipboard HTML (grep „clipboard.*html" → Editor.jsx); fără comutator global în Setări | — | Mică |
| S3-B.SHR.15 | Export: MultiMarkdown export language | MISSING | grep „multimarkdown\|quotesLang" → 0 (Markdown export există în compile) | — | Mică |
| S3-B.SHR.16 | Export: JPEG images compression slider | MISSING | `lib/compile.cjs:1251,1932` — JPEG înglobat fără control de calitate | — | Mică |
| S3-B.SHR.17 | Mobile Sync: „Synced Documents" collection | NOT_APPLICABLE | Scrivener for iOS nu are echivalent; Pneuma sincronizează prin foldere cloud externe. Echivalent: `lib/folderSync.cjs` + colecții (`CollectionsBar.jsx`) | — | — |
| S3-B.SHR.18 | Mobile Sync: auto-show collection after sync | NOT_APPLICABLE | idem S3-B.SHR.17 | — | — |
| S3-B.SHR.19 | Mobile Sync: Take snapshots of updated documents | NOT_APPLICABLE | idem; echivalent parțial: snapshote la salvare (`snapshotOnSave` SD:131) | — | — |
| S3-B.SHR.20 | External Folder Sync (bază: format, formate Draft/Notes separate, sync on open/close, include notes) | SUPERIOR | `lib/folderSync.cjs` (manifest `.scribner-sync.json`, Draft/Notes, formate rtf/txt/md/fdx/fountain — FS:27-31); setări globale StD:731-755 (`sharingSync`) + override per-proiect (`src/lib/projectSync.js`, PSD:682-718) | Pneuma: formate de scenariu în plus + override per proiect; Scrivener nu are fdx/fountain în sync | — |
| S3-B.SHR.21 | Ext. sync: auto-show „Updated Documents" collection | MISSING | grep „Updated Documents" → 0 | — | Mică |
| S3-B.SHR.22 | Ext. sync: remove stylesheet information when syncing | MISSING | grep în folderSync.cjs → 0 | — | Mică |
| S3-B.SHR.23 | Ext. sync: (( )) și {{ }} → note inline în plain text | MISSING | grep „(( ))\|{{ }}" în folderSync.cjs → 0 | — | Medie |
| S3-B.SHR.24 | Conversion: Import Converters (Aspose/Scrivener) | NOT_APPLICABLE | Motoarele de conversie sunt biblioteci proprietare Literature & Latte. Echivalente: `lib/docxImport.cjs`, `lib/loadHtml.cjs`, `lib/pdfText.cjs` | — | — |
| S3-B.SHR.25 | Conversion: Export Converters (+ RTF Based .doc) | NOT_APPLICABLE | idem. Echivalente: `lib/exporters.cjs`, `lib/compile.cjs` (docx/odt/epub/pdf) | — | — |

## B.9 Backup

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-B.BKP.01 | Turn on automatic backups (comutator master) | PARTIAL | Nu există comutator global de oprire; `backupOnClose` implicit true SD:130 + StD:483 | Opreștele per-caz (open/close/save/interval) există, master nu | Mică |
| S3-B.BKP.02 | Back up on project open | COMPLETE | `backupOnOpen` SD:133; StD:484; BK:226-232 (`backupOnOpen`) | — | — |
| S3-B.BKP.03 | Back up on project close | COMPLETE | `backupOnClose` SD:130; StD:483; BK (folosit în `resolveBackupSettings`) | — | — |
| S3-B.BKP.04 | Back up with each manual save | COMPLETE | `backupOnSave` (max o dată/minut) SD:134; StD:485 | — | — |
| S3-B.BKP.05 | Back up before syncing with mobile devices | NOT_APPLICABLE | Scrivener iOS absent; folder sync-ul Pneuma rulează la open/close cu backupOnOpen/Close existente | — | — |
| S3-B.BKP.06 | Compress automatic backups as zip | COMPLETE | `backupZip` SD:135; StD:487; BK:241 (`backupOptions`) | — | — |
| S3-B.BKP.07 | Use date in backup file names | COMPLETE | `backupDateName` SD:136; StD:486; BK:241 | — | — |
| S3-B.BKP.08 | Only keep n most recent backups / keep all | COMPLETE | `backupKeep` SD:137 (implicit 5); StD:493-497; BK:176 (`keep` invalid nu dezactivează) | „Keep all" ca valoare specială nu e expus în UI (max 100) | Mică |
| S3-B.BKP.09 | Backup location (+ Choose / Open backup folder) | COMPLETE | `backupDir` SD:138; StD:499-507 (`api.chooseBackupDir`, `api.openBackupFolder`); BK:307 `effectiveBackupDir` | — | — |
| S3-B.BKP.10 | (extra Pneuma) Backup every n minutes | SUPERIOR | `backupEveryMin` SD:132; StD:490-492; BK `intervalDue` | Nu există în Scrivener (doar open/close/save) | — |

---

## Anexa C — Project Settings

## C.1 Copierea setărilor între proiecte

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-C.CPY.01 | Partajarea panourilor între proiecte (drag & drop: Label/Status/Metadata/Auto-Complete) | EQUIVALENT | `MetaTransfer` — export/import `.meta.json` cu etichete, statusuri, metadate, tipuri de secțiune (PSD:25-58; `exportMetaSettings`/`importMetaSettings` `src/lib/projectSettings.js:429-465`) | Prin fișier, nu drag&drop între două proiecte deschise | Mică |

## C.2 Section Types

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-C.ST.01 | Section Types Tab: listă tipuri (adăugare/redenumire/ștergere) | COMPLETE | PSD:494-524 (`addSectionType`, edit inline, ștergere cu confirmare) | — | — |
| S3-C.ST.02 | Ordinea tipurilor în meniuri (săgeți) | COMPLETE | `Reorder` PSD:500 (`move('sectionTypes')`) | Butoane în loc de drag | — |
| S3-C.ST.03 | Ștergerea unui tip → fallback la atribuirea automată | COMPLETE | PSD:506-514 (la ștergere, `sectionTypeLevels`/`sectionTypeDepths` cu valoarea tipului → null) | — | — |
| S3-C.ST.04 | Default Types by Structure (rows folders/file groups/files + Add Level + niveluri) | EQUIVALENT | `sectionTypeLevels` (restul nivelurilor) + `sectionTypeDepths` 1..SECTION_DEPTHS pe 3 categorii (folders/containers/files) — PSD:528-571; tabel `src/lib/projectSettings.js` `SECTION_DEPTHS` | Pneuma: tabel fix de adâncimi pe 3 coloane, fără buton „Add Level" dinamic; include categoria „containers" separat | Mică |
| S3-C.ST.05 | Transferring Section Types (Export/Import .scrtypes, înlocuiește tot) | EQUIVALENT | Includ în `MetaTransfer` `.meta.json` (PSD:25-58); importul înlocuiește secțiunile respective | Nu există fișier dedicat doar tipurilor de secțiune | Mică |

## C.3 Label List & Status List

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-C.LS.01 | Label list: adăugare/ștergere/redenumire + culoare | COMPLETE | `renderSimpleList('labels', true)` PSD:361-379 (color picker + „fără culoare") | — | — |
| S3-C.LS.02 | Label: Custom Title (redenumirea câmpului peste tot) | COMPLETE | `labelTitle` PSD:363-366 | — | — |
| S3-C.LS.03 | Status list: adăugare/ștergere/redenumire | COMPLETE | PSD:382-400 | — | — |
| S3-C.LS.04 | Status: Custom Title | COMPLETE | `statusTitle` PSD:384-387 | — | — |
| S3-C.LS.05 | Implicit (Make Default) pt. eticheta documentelor noi | COMPLETE | `defaultLabel` PSD:371-376 | — | — |
| S3-C.LS.06 | Implicit pt. statusul documentelor noi | COMPLETE | `defaultStatus` PSD:392-397 | — | — |
| S3-C.LS.07 | Fallback-ul „No Label/No Status": reținut, redenumibil, fără culoare | COMPLETE | NONE pinned primul și fără culoare (`projectSettings.js:145,209`; PSD:221,226-227 `disabled={i===0}`) | — | — |
| S3-C.LS.08 | Reordonarea intrărilor (drag & drop în listă) | EQUIVALENT | Butoane ↑↓ cu primul element fixat (PSD:230, `Reorder` pinFirst) | Butoane, nu drag | — |

## C.4 Custom Metadata

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-C.CM.01 | Lista de câmpuri: adăugare/redenumire/ștergere/reordonare | COMPLETE | PSD:403-491 (`addField`, edit title, `move('customFields')`, ștergere cu confirmare) | — | — |
| S3-C.CM.02 | Tipuri de câmp: Text / Checkbox / List / Date | COMPLETE | `FIELD_TYPES = ['text','number','checkbox','list','date']` `projectSettings.js:19`; PSD:413-423 | — | — |
| S3-C.CM.03 | (extra) Tipul Number + aliniere coloană | SUPERIOR | 'number' + `align` left/center/right PSD:443-446; `projectSettings.js:19` | Scrivener nu are câmp numeric | — |
| S3-C.CM.04 | Text Fields: Wrap text | COMPLETE | `wraps` PSD:449-452 („text pe mai multe rânduri") | — | — |
| S3-C.CM.05 | Text Fields: Use Colored Text (+ culoare) | MISSING | grep -rniE "colored.*field\|fieldColor" src/ → 0 hits | — | Mică |
| S3-C.CM.06 | Checkbox Fields: Tick by default (inclusiv retroactiv pt. never-set) | COMPLETE | `default` checkbox PSD:428-430 (nepus = din setare; pus explicit = fixat) | — | — |
| S3-C.CM.07 | List Fields: opțiuni (adăugare/ștergere/redenumire/reordonare) | COMPLETE | PSD:454-471 (`f.options`, Reorder, ✕) | — | — |
| S3-C.CM.08 | List Fields: titlul intrării „None" (editabil, poate fi gol) | MISSING | grep „none.*title" în projectSettings.js → 0 | — | Mică |
| S3-C.CM.09 | Date Fields: Format (dropdown formate standard) | MISSING | PSD:438 — `input type="date"` nativ, fără alegere de format | — | Mică |
| S3-C.CM.10 | Date Fields: Custom Format (tokens + cheat sheet „?") | MISSING | grep „custom format" → 0 | — | Mică |
| S3-C.CM.11 | Date Fields: Ignore time zone changes | MISSING | grep „time zone\|timezone" în projectSettings.js → 0 | — | Mică |

## C.5 Formatting

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-C.FMT.01 | Use footnote marker (marcator custom în loc de highlight) + Make Default | PARTIAL | Note inline există în editor (`src/editor/extensions.js`, `Editor.jsx` — hits „footnote marker"); setarea de marcator custom lipsește (grep -rniE "fnMarker\|footnoteMarker" src/ lib/ → 0) | — | Medie |
| S3-C.FMT.02 | Main Text Formatting per proiect (override + bifa „use different default formatting") | COMPLETE | `defaultFormatting.useGlobal` PSD:80,606-608,175; `DefaultFormatPane.jsx:78+` (rigla cu indente, font, spațiere) | — | — |
| S3-C.FMT.03 | Butonul „Use Current" (import formatarea din editor) | MISSING | grep „useCurrent" în PSD/DefaultFormatPane → 0 | — | Medie |
| S3-C.FMT.04 | Different inline footnote font (per proiect) | COMPLETE | `footnoteFont`/`footnoteSize` în `DefaultFormatPane.jsx:78` (docstring valorii) + FontPick în același fișier | — | — |

## C.6 Auto-Complete List

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-C.AC.01 | Lista de auto-completare per proiect (adăugare/ștergere/editare) | COMPLETE | PSD:610-618 (textarea, un termen/rând) + dedup la salvare PSD:176; consum: `writing.js:278` | Editare F2/dubluclic nu există (textarea) | — |
| S3-C.AC.02 | Auto-Completion Scope (coloana Scope: General / All (Text & Scripts)) | MISSING | grep -rniE "scope" în PSD/projectSettings.js → 0 (sincronizat cu S3-B.COR.18) | Scope-ul de scriptwriting lipsește | Mare |

## C.7 Special Folders

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-C.SF.01 | Templates Folder (designare dosar de șabloane de documente; „No Templates Folder") | COMPLETE | `templateFolder` PSD:576-588 (dropdown dosare, „(niciunul)") | — | — |
| S3-C.SF.02 | Default New Bookmarks Folder („Ask Every Time" sau dosar) | MISSING | grep „bookmark.*folder" în PSD → 0. Echivalente parțiale: `importFolder` (dosar pt. importuri) și `inboxFolder` (dosar pt. notele din scratchpad) PSD:589-602 | — | Medie |

## C.8 Background Images

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-C.BGI.01 | Composition Mode Backdrop (fără / de pe disc / din resursele proiectului) | PARTIAL | `compBgImage` + `compBgImageFit` (cover/contain/tile/center) — global în Setări (StD:229-249; AP:346-363), nu per-proiect; sursa „imagine din proiect" lipsește | Stocat în settings.json, nu în project.json | Medie |
| S3-C.BGI.02 | Freeform Corkboard Mode Background (per proiect) | MISSING | grep în PSD/project.json → 0; `corkBg` e global (SD:14) | Freeform corkboard absent | Mare |

## C.9 Backup (per proiect)

| ID | Setare | Stare | Dovadă | Diferență | Prioritate |
|---|---|---|---|---|---|
| S3-C.BKP.01 | Exclude from automatic backups (backup manual rămâne) | COMPLETE | `backup.exclude` PSD:660-664; BK:272-281 (`exclude` câștigă asupra `override`; backup manual permis) | — | — |
| S3-C.BKP.02 | Use custom backup folder for this project (+ Open backup folder) | MISSING | BK:275 — „The rest (folder, zip, names, on open, on save) stays the program's"; `backupDir` e doar global (StD:499-507) | — | Medie |
| S3-C.BKP.03 | (extra) Override per proiect: onClose / everyMin / keep | SUPERIOR | `backup.override` PSD:665-678; BK:282-285 (`backupOnClose/backupEveryMin/backupKeep` suprascrise) | Scrivener nu are interval de backup deloc, nici per proiect | — |

---

## Numărători pe taburi și stări

| Tab / Panou | Rânduri | COMPLETE | EQUIVALENT | SUPERIOR | PARTIAL | MISSING | NOT_APPLICABLE |
|---|---|---|---|---|---|---|---|
| B.1 Gestionare Options | 4 | 1 | 1 | 0 | 1 | 1 | 0 |
| B.2 General | 18 | 6 | 0 | 0 | 4 | 7 | 1 |
| B.3 Editing | 19 | 4 | 1 | 0 | 1 | 12 | 1 |
| B.4 Behaviors | 24 | 3 | 0 | 0 | 1 | 19 | 1 |
| B.5 Appearance | 92 | 17 | 6 | 1 | 9 | 59 | 0 |
| B.6 Corrections + Auto-Completion | 18 | 5 | 0 | 4 | 2 | 5 | 2 |
| B.7 Keyboard | 7 | 3 | 0 | 0 | 0 | 4 | 0 |
| B.8 Sharing | 25 | 0 | 0 | 1 | 1 | 16 | 7 |
| B.9 Backup | 10 | 7 | 0 | 1 | 1 | 0 | 1 |
| **Total Anexa B** | **217** | **46** | **8** | **7** | **20** | **123** | **13** |
| C.1 Copiere setări | 1 | 0 | 1 | 0 | 0 | 0 | 0 |
| C.2 Section Types | 5 | 3 | 2 | 0 | 0 | 0 | 0 |
| C.3 Label & Status | 8 | 7 | 1 | 0 | 0 | 0 | 0 |
| C.4 Custom Metadata | 11 | 5 | 0 | 1 | 0 | 5 | 0 |
| C.5 Formatting | 4 | 2 | 0 | 0 | 1 | 1 | 0 |
| C.6 Auto-Complete | 2 | 1 | 0 | 0 | 0 | 1 | 0 |
| C.7 Special Folders | 2 | 1 | 0 | 0 | 0 | 1 | 0 |
| C.8 Background Images | 2 | 0 | 0 | 0 | 1 | 1 | 0 |
| C.9 Backup per proiect | 3 | 1 | 0 | 1 | 0 | 1 | 0 |
| **Total Anexa C** | **38** | **20** | **4** | **2** | **2** | **10** | **0** |
| **TOTAL** | **255** | **66** | **12** | **9** | **22** | **133** | **13** |

(BROKEN: 0, UNINTEGRATED: 0, UNVERIFIED: 0 — nicio setare cu dovezi de acest tip nu a fost identificată în acest audit.)

Notă: rândurile „extra" Pneuma (smart fractions S3-B.COR.13, backup every n min S3-B.BKP.10, dicționare multi-limbă S3-B.COR.05, [[wiki links]] S3-B.COR.16, folder sync cu fdx/fountain S3-B.SHR.20, number metadata S3-C.CM.03, override backup per proiect S3-C.BKP.03) sunt marcate SUPERIOR fiindcă depășesc funcționalitatea Scrivener pentru același panou; SUPERIOR pentru depășiri punctuale ale unor setări Scrivener existente este S3-B.APP.86 (linkuri intern/extern separate).

---

## GOLURI NOI (MISSING/PARTIAL, cu notă de implementare)

Zonele cele mai afectate: **B.5 Appearance** (59 MISSING din 92) și **B.4 Behaviors** (19 MISSING din 24). Liste prioritizate:

### Prioritate mare
1. **S3-B.BEH.10/.11, S3-B.APP.23, S3-C.BGI.02 — freeform corkboard + arrange-by-label** ( Scrivener B.4.3/B.5.4/C.8): panică freeform în `Corkboard.jsx` (poziții libere ale cardelor, snap-to-grid, fundal per proiect). Fără ele cad și sync-urile din B.5.4.
2. **S3-C.AC.02 + S3-B.COR.18 — scope-ul auto-completării** (General/All/script elements): extensia `autoComplete` (`writing.js:278`) trebuie să țină un `{term, scope}` per intrare (PSD:610) și să filtreze după elementul de script curent.
3. **S3-B.BEH.06/.07/.08 — comportamentul deschiderii linkurilor** (Current/Other Editor/QuickRef/Copyholder + „Do not open"): adăugați o cheie `linkOpenIn` în `settingsDefaults.js` și un `select` în panoul Behaviors (StD:407); QuickRef.jsx există deja ca țintă.
4. **S3-B.BEH.09/.12/.13 — corkboard: acțiune dbl-click fundal, Alt-drag duplicate, drop-on ca copil**: opțiuni în panoul Behaviors + handlere în Corkboard.jsx / tree.js (moveItem există).
5. **S3-B.BEH.14/.15/.16 — tratamentul containerelor** („treat subdocuments as folders", textul folderului în Scrivenings, folder text din căutare): flag `containersAsFolders` în project.json + ramură în `Scrivenings.jsx`.

### Prioritate medie (eșantion; vezi tabele pt. lista completă)
- **S3-B.GEN.13 — shared templates folder pe disc**: cheie `sharedTemplatesDir` + scanare în `lib/templates.cjs`, integrată în meniul Add (PSD are deja templateFolder per proiect).
- **S3-B.GEN.15 — tabelul de separatoare** (Merge/Append/Scratchpad × Single Return/Empty Line/Custom): cheie `separators` în settingsDefaults.js; consum în `BatchADialogs.jsx` (merge) și `Scratchpad.jsx`.
- **S3-B.EDI.01/.09 — default text zoom + „Use Current" pt. formatarea implicită**: stocați zoom-ul editorului la închidere; buton „folosește formatarea curentă" în StD editing → `DefaultFormatPane` invers.
- **S3-B.APP.43/.44 — margini editor L/R și T/B**: variabile CSS `--ed-pad-x/y` în `applyLookCss` + câmpuri numerice în AP editor.
- **S3-B.APP.69/.72/.74 — Scrivenings: stiluri Corner/Divider/Bookish, fundal titlu, reducere font pe nivel**: extensii ale `scrivSepStyle` și `--scriv-title-*` existente.
- **S3-B.SHR.01/.02/.04 — opțiuni de import RTF/DOCX** (comentarii/notex inline, strip stiluri, update stiluri la paste): expuneți-le în `ImportDialog.jsx` pe baza `lib/docxImport.cjs`.
- **S3-B.SHR.23 — (( )) {{ }} în sync plain text**: pereche de regex în `lib/folderSync.cjs` la serializare/parse.
- **S3-C.BKP.02 — dosar de backup per proiect**: extindeți `resolveBackupSettings` (BK:270-285) cu `b.dir` + un „Choose…" în PSD backup.
- **S3-C.FMT.01 — marcator custom pt. note de subsol**: cheie `footnoteMarker` în project.json consumată de `extensions.js`.
- **S3-B.GEN.02 — recuperare fișiere de conflict**: scanare la deschidere a dosarului proiectului pt. fișiere „conflicted copy"/duplicate și import prin ConflictDialog (projectWatch.cjs are deja merge-ul).

### Prioritate mică
Restul rândurilor MISSING din tabele (notificări, sunete, culoare underline spell-check, export shortcuts, centre pages, etc.) — vezi coloana Prioritate din fiecare tabel.

---

## OMISIUNI DESCOPERITE (setări niciodată menționate în docs/PARITY-AUDIT-*.md)

Verificare: `grep -rilE "<termen>" docs/PARITY-AUDIT-*.md` — auditurile anterioare (ch. 8–13, 15–26) acoperă doar: snapshot-e, typewriter, section types (ch. 23), fonturi, dicționar (ch. 08), etichete (ch. 10), metadate, separatori (compile), composition (ch. 16). Următoarele setări din Anexa B/C **nu apar nicăieri** în PARITY-AUDIT-*.md și nici în docs/audit/scrivener3/README.md ca elemente inventariate:

1. **Întreg panoul Backup (B.9)** — `backupOnOpen/backupOnSave/backupZip/backupDateName/backupKeep/backupDir/backupEveryMin` (niciun hit „backup" în PARITY-AUDIT-*).
2. **Întreg panoul Corrections (B.6)** — smart quotes/dashes/ellipsis, autoReplacements, personal dictionary, autoCapitalize (niciun hit „smart"/„revision").
3. **Culorile de revizie (B.3.3)** — `revisionColors` (0 hits „revision").
4. **Editorul de scurtături (B.7)** — ShortcutsDialog (0 hits „scurtatur").
5. **Temelor vizuale (B.1.1)** — save/load/export/import temă, `savedThemes` (0 hits „theme").
6. **Scratchpad + dosarul de note (B.2.5)** — `scratchFolder` (menționat doar tangențial în ch. 9/10, nu ca setare).
7. **Separatoarele de text (B.2.8)** — setările de separator pentru Merge/Append/Scratchpad (nu apar ca setări, doar ca aspect de compile).
8. **Sync cu folder extern ca setare (B.8.3)** — `sharingSync` (format/nota/on-open/on-close) + override per proiect (PSD:682-718) — folderSync.cjs nu e menționat în auditurile anterioare.
9. **Label/Status custom title + valori implicite (C.3)** — `labelTitle`/`statusTitle`/`defaultLabel`/`defaultStatus`.
10. **Auto-complete per proiect (C.6)** — lista `autoComplete` din project.json (0 hits).
11. **Aspectul binder/outliner/corkboard (B.5.2/.4/.8)** — `binderFont`, `outAltRows`, `corkBg`, grilă outliner, rânduri alternative (0 hits).
12. **Backup per proiect (C.9)** — `backup.exclude`/`override` (0 hits „backup" în PARITY).
13. **Special folders (C.7)** — `templateFolder`/`importFolder`/`inboxFolder` ca setări de proiect.
14. **Language & author (B.2.3/.4)** — `language`, `authorName` ca setări de program.

Toate cele 14 puncte de mai sus sunt acum inventariate în tabelele acestui document, cu ID-uri stabile S3-B.*/S3-C.*.
