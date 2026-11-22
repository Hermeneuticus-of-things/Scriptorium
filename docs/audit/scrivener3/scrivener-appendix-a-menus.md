# Audit de paritate: Apendix A — Meniuri și comenzi rapide (Scrivener 3 vs Pneuma Sofer)

- **Sursă:** `docs/audit/scrivener3/sources/A-menus.txt` (manual oficial Scrivener 3 pentru Windows, versiunea **3.1.6**, paginile PDF 602–661; secțiunile A.1–A.11).
- **Data auditului:** 2026-11-21.
- **Metodă:** fiecare comandă din Apendix A a fost inventariată individual (fără grupare) și verificată în codul Pneuma Sofer: meniul aplicației (`src/lib/menuLayout.js` — `MENU_GROUPS`, `SUBMENUS`, `AI_ORDER`), registrul de comenzi (`src/App.jsx`, tupluri `['group','id',label,action,…]`, linii ~3376–3615, plus meniurile `documentMenu`/`navigateMenu`/`projectMenu` de la linia 3312 și `editorMenus` de la 3644), meniurile editorului (`src/lib/editorMenus.js`), meniul contextual al binder-ului (`src/lib/binderContextMenu.js`), scurtăturile (`src/lib/commands.js` — `DEFAULT_KEYS`, `shortcutFor`), meniul nativ (`electron/main.cjs` + `nativeMenuSpec` din menuLayout.js). Dovezile sunt `fișier:linie` sau grep. Nu s-a modificat niciun fișier din repo.
- **Stări folosite:** COMPLETE / PARTIAL / UNINTEGRATED / BROKEN / MISSING / NOT_APPLICABLE / UNVERIFIED / EQUIVALENT / SUPERIOR.
- **Convenții:** „S3" = Scrivener 3; „PS" = Pneuma Sofer. Coloana „Echivalent Pneuma" indică meniul/comanda/șoricutul din PS. Scurtăturile S3 sunt cele Windows, așa cum apar în textul sursei (unele sunt tipărite ambiguu în PDF — vezi secțiunea diferențelor de platformă).

---

## A.1 Custom Keyboard Shortcuts (secțiune)

| ID | Comandă (EN + RO) | Shortcut Scrivener | Stare | Echivalent Pneuma | Diferență | Prioritate |
|---|---|---|---|---|---|---|
| S3-A.CKB.01 | Keyboard options tab — personalizare scurtături (Options ▸ Keyboard) | — | COMPLETE | Program ▸ Scurtături… (`App.jsx:3537` `['app','shortcuts']`), conflict-check `commands.js:98` (`conflicts`), aplicare `shortcutFor` `commands.js:92` | PS are editor dedicat de scurtături cu detectare coliziuni; fără „Record button", dar cu normalizare combo (`normalizeCombo` `commands.js:27`) | — |

---

## A.2 File Menu (Fișier)

| ID | Comandă (EN + RO) | Shortcut Scrivener | Stare | Echivalent Pneuma | Diferență | Prioritate |
|---|---|---|---|---|---|---|
| S3-A.FILE.01 | New Project… (Proiect nou) | Ctrl+Shift+N | EQUIVALENT | Ecranul Home + `api.newProject` (folosit de `startTutorial`, `App.jsx:3525`) | nu există în meniul Fișier cât timp un proiect e deschis; doar din Home | P3 |
| S3-A.FILE.02 | Open… (Deschide) | Ctrl+O | EQUIVALENT | Ecranul Home (`components/Home.jsx`); atenție: Ctrl+O e Quick Search în PS (`commands.js:50`) | ușa e Home, nu meniul Fișier; Ctrl+O reutilizat altfel | P3 |
| S3-A.FILE.03 | Recent Projects (Proiecte recente) | — | EQUIVALENT | Home ▸ listă recente `components/Home.jsx:5-37` (`orderRecent`) | listă în Home, nu submeniu File | P3 |
| S3-A.FILE.04 | Favorite Projects (Proiecte favorite) | — | EQUIVALENT | Home ▸ „pin" (`settings.recentPinned`, `Home.jsx:28,37`) | pin în Home, nu submeniu | P3 |
| S3-A.FILE.05 | Add/Remove Project from Favorites (Adaugă/scoate din favorite) | — | EQUIVALENT | Home ▸ `togglePin` (`Home.jsx:37`) | — | P3 |
| S3-A.FILE.06 | Show Project in File Explorer (Arată proiectul în Explorer) | — | PARTIAL | meniul contextual binder ▸ „Arată în Explorer" (`binderContextMenu.js:149` `showInExplorer`) | lipsește din meniul Fișier; doar pe element, nu pe proiect | P3 |
| S3-A.FILE.07 | Show Application Support Folder (Dosarul de suport al aplicației) | — | MISSING | — | nu există nicio ușă către dosarul de setări/preset-uri | P3 |
| S3-A.FILE.08 | Close Project (Închide proiectul) | Alt+F4 | COMPLETE | Fișier ▸ Închide proiectul (`App.jsx:3394` `closeProject`) | — | P1 |
| S3-A.FILE.09 | Close Project and Clear Interface Settings (Închide + resetează setările de interfață) | Ctrl+Shift+F4 | MISSING | — | fără variantă de depanare care resetează layout-ul | P3 |
| S3-A.FILE.10 | Close All Projects (Închide toate proiectele) | Ctrl+F5 | MISSING | — | PS deschide un singur proiect pe fereastră (`api.newWindow` există, `App.jsx:3511`) | P3 |
| S3-A.FILE.11 | Save (Salvează) | Ctrl+S | COMPLETE | Fișier ▸ Salvează (`App.jsx:3376`, `commands.js:43`) + auto-save | — | P1 |
| S3-A.FILE.12 | Save As… (Salvează ca…) | Ctrl+Shift+S | COMPLETE | Fișier ▸ Salvează ca… (`App.jsx:3389`, `commands.js:82`) | — | P1 |
| S3-A.FILE.13 | Save and Rebuild Search Indexes (Salvează + reindexare) | Alt+Shift+S | PARTIAL | panoul Cercetare ▸ „Reindexează" (`i18n-ui.js:2026` `ui.researchPanel.reindexeaza`) | reindexarea există, dar legată de panoul de cercetare, nu de Salvare | P3 |
| S3-A.FILE.14 | Import ▸ Files… (Importă fișiere) | Ctrl+Shift+I | COMPLETE | Fișier ▸ Import ▸ Importă fișiere… (`App.jsx:3379`, `menuLayout.js:33`) | — | P1 |
| S3-A.FILE.15 | Import ▸ Web Page… (Importă pagină web) | Ctrl+Shift+W | COMPLETE | Fișier ▸ Import ▸ Importă pagină web… (`App.jsx:3381`) + „Arhivează web" (`documentMenu`, `App.jsx` ~3336 `archiveWebPage`) | S3 folosește MHT; PS arhivează prin API | P2 |
| S3-A.FILE.16 | Import ▸ Research Files as Shortcuts… (Fișiere ca scurtături) | — | MISSING | — | fără import ca legături către fișierele originale | P3 |
| S3-A.FILE.17 | Import ▸ Plain Text Formatted Screenplay… (Scenariu text simplu) | — | MISSING | — | există export Fountain/FDX (`App.jsx:3534-3535`), nu import scenariu text | P3 |
| S3-A.FILE.18 | Import ▸ Scrivener Project… (Importă proiect Scrivener) | — | PARTIAL | deschidere `.scriv/.scrivx` (`electron/main.cjs:9,1242` `importScriv`) | importul există ca deschidere/conversiune, nu ca „import în binderul proiectului curent" | P2 |
| S3-A.FILE.19 | Import ▸ Import and Split… (Importă și separă) | — | COMPLETE | dialog „importSplit" (`App.jsx:3379` `setDialog('importSplit')`) | — | P2 |
| S3-A.FILE.20 | Export ▸ Files… (Exportă fișiere) | Ctrl+Shift+X | COMPLETE | Fișier ▸ Export ▸ documente (`App.jsx:3388` + `components/ExportDialog.jsx:36-47`) | — | P1 |
| S3-A.FILE.21 | Export ▸ OPML File… (Exportă OPML) | — | COMPLETE | ExportDialog tab OPML (`ExportDialog.jsx:48`, `electron/ioHandlers.cjs:309`) | .mm/.txt outline nu sunt menționate | P2 |
| S3-A.FILE.22 | Export ▸ Outliner Contents as CSV… (Outliner ca CSV) | — | COMPLETE | ExportDialog ▸ „Metadatele… CSV" (`ExportDialog.jsx:52` `api.exportCsv`) | disponibil oricând, nu doar în vizualizarea Outliner | P2 |
| S3-A.FILE.23 | Export ▸ Comments and Annotations… (Exportă comentarii/adnotări) | — | MISSING | — | există conversii/eliminare notații, nu export dedicat | P3 |
| S3-A.FILE.24 | Export ▸ as Scrivener v1… (Salvează în format vechi) | — | NOT_APPLICABLE | Export ▸ pachet Scrivener (`App.jsx:3494` `exportScriv`, `electron/v04Handlers.cjs:2`) | formatul legacy v1/v2 nu are sens pentru PS; exportul în format Scrivener modern există | P3 |
| S3-A.FILE.25 | Sync ▸ with Mobile Devices (Sincronizare mobil) | Shift+F8 | NOT_APPLICABLE | — | PS nu are client iOS | P3 |
| S3-A.FILE.26 | Sync ▸ with External Folder… (dosar extern, configurare) | Shift+F7 | COMPLETE | Fișier ▸ Sincronizare ▸ Sincronizare externă — configurare (`App.jsx:3395` `syncOut`) | — | P2 |
| S3-A.FILE.27 | Sync ▸ with External Folder Now (sincronizează acum) | Shift+F6 | COMPLETE | Fișier ▸ Sincronizare ▸ Importă din dosarul sincronizat (`App.jsx:3396` `syncIn`) | — | P2 |
| S3-A.FILE.28 | Back Up ▸ Back Up To… (Copie de rezervă în…) | Ctrl+Shift+J | COMPLETE | Fișier ▸ Back Up To (`App.jsx:3393`) | — | P1 |
| S3-A.FILE.29 | Back Up ▸ Back Up Now (Copie de rezervă acum) | — | COMPLETE | Fișier ▸ Backup acum (`App.jsx:3392` `backupNow`) + dialog backups (`App.jsx:3391`) | — | P1 |
| S3-A.FILE.30 | Save As Template… (Salvează ca șablon) | — | COMPLETE | Fișier ▸ Salvează ca șablon (`App.jsx:3517`, plasat la nivelul Fișier conform `menuLayout.js:34`) | — | P2 |
| S3-A.FILE.31 | Page Setup… (Setări pagină) | Ctrl+Shift+P | COMPLETE | Fișier ▸ Setări pagină (`App.jsx:3518` `pageSetup`, dialog `components/PageSetupDialog.jsx`) | — | P2 |
| S3-A.FILE.32 | Print Settings… (Setări de imprimare per vizualizare) | Alt+F3 | MISSING | — | PS are Page Setup + Print Preview, nu setări separate pentru corkboard/outliner | P3 |
| S3-A.FILE.33 | Print Preview… (Previzualizare imprimare) | Alt+Shift+P | COMPLETE | Fișier ▸ Previzualizare (`App.jsx:3519` `printPreview`) | — | P2 |
| S3-A.FILE.34 | Print Current Document… (Imprimă) | Ctrl+P | COMPLETE | Fișier ▸ Imprimă (`App.jsx:3390`, `commands.js:84`) | — | P2 |
| S3-A.FILE.35 | Compile… (Compilează) | Ctrl+Shift+E | COMPLETE | Fișier ▸ Compilează (`App.jsx:3377`, `commands.js:76`) | — | P1 |
| S3-A.FILE.36 | Options… (Opțiuni program) | Ctrl+, | COMPLETE | Program ▸ Setări program (`App.jsx:3536` `['app','settings']`) | mutat în meniul „Program" (reorganizare pe tier-uri, `menuLayout.js:12-20`) | P1 |
| S3-A.FILE.37 | Exit (Ieșire) | Ctrl+Alt+F4 | PARTIAL | meniul nativ desktop suportă roluri (`menuLayout.js:174-175` `role`) | nu există comandă înregistrată `exit` în `commandList`; se bazează pe meniul nativ/Electron | P3 |

**Rezumat A.2 (37 comenzi):** COMPLETE 19, EQUIVALENT 5, PARTIAL 4, MISSING 7, NOT_APPLICABLE 2.

---

## A.3 Edit Menu (Editare)

| ID | Comandă (EN + RO) | Shortcut Scrivener | Stare | Echivalent Pneuma | Diferență | Prioritate |
|---|---|---|---|---|---|---|
| S3-A.EDIT.01 | Undo (Anulează) | Ctrl+Z | COMPLETE | Editare ▸ Anulează (`editorMenus.js:146`) | — | P1 |
| S3-A.EDIT.02 | Redo (Refă) | Ctrl+Y | COMPLETE | Editare ▸ Refă (`editorMenus.js:147`) | — | P1 |
| S3-A.EDIT.03 | Cut (Decupează) | Ctrl+X | COMPLETE | Editare ▸ Decupează (`editorMenus.js:149`, rol nativ `cut`) | — | P1 |
| S3-A.EDIT.04 | Copy (Copiază) | Ctrl+C | COMPLETE | Editare ▸ Copiază (`editorMenus.js:150`) | — | P1 |
| S3-A.EDIT.05 | Paste (Lipește) | Ctrl+V | COMPLETE | Editare ▸ Lipește (`editorMenus.js:151`) | — | P1 |
| S3-A.EDIT.06 | Copy Special ▸ Copy Document as External Link (legătură externă) | — | PARTIAL | meniul contextual binder ▸ „Copiază legătura" (`binderContextMenu.js:147` `copyLink`) | doar în contextual, nu în Copy Special | P3 |
| S3-A.EDIT.07 | Copy Special ▸ Copy Text of Documents (textul documentelor) | — | MISSING | — | textul selectiei multiple nu se copiază în bloc | P3 |
| S3-A.EDIT.08 | Copy Special ▸ Copy Documents as ToC (cuprins) | — | COMPLETE | Documente ▸ Copiază ca cuprins (`App.jsx:3444` `copyAsToC`, `lib/toc.js`) | — | P2 |
| S3-A.EDIT.09 | Copy Special ▸ Copy Documents as Structured Link List (listă de legături) | — | MISSING | — | fără variantă cu legături interne indentate | P3 |
| S3-A.EDIT.10 | Copy Special ▸ Copy without Comments and Footnotes (fără notații) | — | COMPLETE | Editare ▸ Copiază special ▸ fără note (`editorMenus.js:154` `copyNoNotes` + `withoutNotes` `editorMenus.js:37`) | — | P2 |
| S3-A.EDIT.11 | Copy Special ▸ Copy as Markdown | — | MISSING | — | export Markdown există (`exportMmd` `App.jsx:3505`), copiere Markdown nu | P3 |
| S3-A.EDIT.12 | Copy Special ▸ Copy as HTML | — | COMPLETE | Editare ▸ Copiază special ▸ HTML (`editorMenus.js:155` `copyHtml`) | — | P2 |
| S3-A.EDIT.13 | Copy Special ▸ Copy as HTML (Basic, `<p>`/`<span>`) | — | MISSING | — | o singură variantă HTML | P3 |
| S3-A.EDIT.14 | Paste and Match Style (Lipește fără formatare) | Ctrl+Shift+V | COMPLETE | Editare ▸ Lipește text simplu (`editorMenus.js:152` `pastePlain`, rol `pasteAndMatchStyle`) | — | P1 |
| S3-A.EDIT.15 | Delete (Șterge; Del, permanent din Trash) | Del / Shift+Del | COMPLETE | Delete pe selecție binder → mutare în coș (`App.jsx:1673` `moveToTrash`); Delete în coș = restaurare/eliminare prin contextual (`binderContextMenu.js:107-108`) | ștergerea permanentă selectivă din coș trece prin contextual | P1 |
| S3-A.EDIT.16 | Select All (Selectează tot) | Ctrl+A | COMPLETE | Editare ▸ Selectează tot (`editorMenus.js:158`) | — | P1 |
| S3-A.EDIT.17 | Select ▸ Select Word (Selectează cuvântul) | Ctrl+Shift+F5 | COMPLETE | Editare ▸ Selectare ▸ cuvânt (`App.jsx:3577`, `menuLayout.js:40`) | altă scurtătură | P2 |
| S3-A.EDIT.18 | Select ▸ Select Sentence (propoziția) | Ctrl+Shift+F6 | COMPLETE | Editare ▸ Selectare ▸ propoziție (`App.jsx:3578`) | — | P2 |
| S3-A.EDIT.19 | Select ▸ Select Paragraph (paragraful) | Ctrl+Shift+F7 | COMPLETE | Editare ▸ Selectare ▸ paragraf (`App.jsx:3579`) | — | P2 |
| S3-A.EDIT.20 | Select ▸ Select Style Range (intervalul de stil) | — | COMPLETE | Format ▸ Navigare stil ▸ Selectează intervalul (`App.jsx:3463`, `menuLayout.js:44` `menu.styleNav`) | — | P2 |
| S3-A.EDIT.21 | Select ▸ Select Next in Same Style (următorul în același stil) | — | COMPLETE | Format ▸ Navigare stil ▸ Următorul (`App.jsx:3464` `nextInSameStyle`) + „precedentul" în plus (`App.jsx:3465`) | PS adaugă și „ precedent" | SUPERIOR la nivel de pereche; stare înregistrată: COMPLETE | P2 |
| S3-A.EDIT.22 | Select ▸ Select Similar Formatting (formatare similară) | Ctrl+Shift+F8 | COMPLETE | Format ▸ Navigare stil ▸ Selectează tot cu stilul (`App.jsx:3466` `selectAllWithStyle`) | bazat pe stiluri, nu pe formatare directă arbitrară | P2 |
| S3-A.EDIT.23 | Select ▸ Select Annotation/Footnote (notația inline) | — | MISSING | — | — | P3 |
| S3-A.EDIT.24 | Select ▸ Select Subgroups (subgrupurile) | — | MISSING | — | — | P3 |
| S3-A.EDIT.25 | Select ▸ Select with Subdocuments (cu subdocumente) | — | MISSING | — | — | P2 |
| S3-A.EDIT.26 | Select ▸ Select 'Included' Subdocuments (doar cele compilate) | — | MISSING | — | — | P3 |
| S3-A.EDIT.27 | Deselect All (Deselectează) | — | MISSING | — | clic gol / Esc parțial, fără comandă | P3 |
| S3-A.EDIT.28 | Completions ▸ Complete (Completare automată) | Alt+= | COMPLETE | Editare ▸ Completare automată (`App.jsx:3546` `autoComplete`) + listă editabilă (`App.jsx:3545`) | — | P2 |
| S3-A.EDIT.29 | Completions ▸ Complete Document Title (titlu de document) | Alt+Shift+= | MISSING | — | fără completare din titlurile proiectului | P3 |
| S3-A.EDIT.30 | Completions ▸ Add Selection to Auto-Complete List | — | PARTIAL | Proiect ▸ Lista de completare (`App.jsx:3545` `autoCompleteList` — dialog cu adăugare) | se adaugă din dialog, nu din selecție direct | P3 |
| S3-A.EDIT.31 | Move ▸ Move Up (Mută în sus) | Ctrl+↑ | MISSING | — | mutare doar drag&drop / Move To | P3 |
| S3-A.EDIT.32 | Move ▸ Move Down (Mută în jos) | Ctrl+↓ | MISSING | — | — | P3 |
| S3-A.EDIT.33 | Move ▸ Move Left (Mută la stânga / scoate din grup) | Ctrl+← | MISSING | — | — | P3 |
| S3-A.EDIT.34 | Move ▸ Move Right (Mută la dreapta / imbrică) | Ctrl+→ | MISSING | — | — | P3 |
| S3-A.EDIT.35 | Sort ▸ Sort Ascending (Sortează A-Z) | — | COMPLETE | Documente ▸ Sortează conținutul A-Z (`App.jsx` documentMenu ~3334) + binder „Sortează copiii A-Z" (`binderContextMenu.js:153`) | — | P2 |
| S3-A.EDIT.36 | Sort ▸ Sort Descending (Sortează Z-A) | — | COMPLETE | Documente ▸ Z-A (`App.jsx` ~3335) + `binderContextMenu.js:153` | — | P2 |
| S3-A.EDIT.37 | Sort ▸ Collection into Binder Order (ordinea binderului) | — | MISSING | — | colecțiile PS nu au „sortare" ce întoarce ordinea binderului | P3 |
| S3-A.EDIT.38 | Append Selection to Document ▸ (Adaugă selecția la document) | — | COMPLETE | Editare ▸ Adaugă selecția la documentul… (`App.jsx:3551`, dialog `appendTo` `App.jsx:4881`) | fără secțiunea „Favorites" a țintelor | P2 |
| S3-A.EDIT.39 | Add/Edit Link… (Adaugă/editează legătură) | Ctrl+Shift+L | PARTIAL | Editor: bulă de legătură `setLink` (`components/Editor.jsx:228`) | doar în editor prin selectsie, fără comandă de meniu/șoricut dedicat | P2 |
| S3-A.EDIT.40 | Remove Link (Elimină legătura) | — | PARTIAL | Editor: `extendMarkRange('link')` + unlink (infrastructura din `Editor.jsx:228`) | fără element de meniu dedicat | P2 |
| S3-A.EDIT.41 | Link to Document ▸ (Legătură către document) | Ctrl+L | PARTIAL | binder ▸ „Copiază legătura" + insert link manual; wiki-links prin auto-complete (`App.jsx:3545`) | fără submeniu de alegere a documentului țintă | P2 |
| S3-A.EDIT.42 | Find ▸ Quick Search (Căutare rapidă) | Ctrl+G | COMPLETE | Editare ▸ Căutare rapidă (`App.jsx:3402`, `commands.js:50` — Ctrl+O) | scurtătură diferită | P1 |
| S3-A.EDIT.43 | Find ▸ Search in Project (Căutare în proiect) | Ctrl+Shift+F | COMPLETE | Editare ▸ Caută în proiect (`App.jsx:3399`, `commands.js:46`) | — | P1 |
| S3-A.EDIT.44 | Find ▸ Project Replace… (Înlocuire în proiect) | — | COMPLETE | dialog Căutare ▸ „Înlocuiește tot" (`components/FindDialog.jsx:36,94`; `App.jsx:2449` `replaceAllInProject`) | — | P1 |
| S3-A.EDIT.45 | Find ▸ Find… (Caută în document) | Ctrl+F | COMPLETE | Editare ▸ Caută în document (`App.jsx:3395`; `documentMenu` `App.jsx:3313` cu Ctrl+F) | — | P1 |
| S3-A.EDIT.46 | Find ▸ Filter… (Filtru corkboard/outliner) | Ctrl+F | COMPLETE | Editare ▸ Filtrază vizualizarea (`App.jsx:3403` `viewFilter`, `lib/viewFilter.js`) | — | P2 |
| S3-A.EDIT.47 | Find ▸ Find Next/Previous (Următorul/anteriorul) | F3 / Shift+F3 | COMPLETE | Editare ▸ Caută ▸ urm./prec. (`App.jsx:3396-3397`; Ctrl+G/Ctrl+Shift+G în `commands.js:62-63`) | — | P1 |
| S3-A.EDIT.48 | Find ▸ Use Selection for Find (Selecția ca termen) | Ctrl+E | COMPLETE | Editare ▸ Folosește selecția pentru căutare (`App.jsx:3398`) | — | P2 |
| S3-A.EDIT.49 | Find ▸ Jump to Selection (Sari la selecție) | Ctrl+J | PARTIAL | editor: `scrollIntoView` (`components/Editor.jsx:194,302,417`); Ctrl+J e Go To în PS (`commands.js:61`) | fără comandă de meniu dedicată | P3 |
| S3-A.EDIT.50 | Find ▸ Find by Formatting… (Caută după formatare) | Alt+Shift+F | COMPLETE | Editare ▸ Caută după formatare (`App.jsx:3400` `findFormat`, `components/FormatFind.jsx`) | — | P2 |
| S3-A.EDIT.51 | Find ▸ Find Next/Previous Formatting | Shift+G / Ctrl+Shift+G | MISSING | — | FormatFind nu are navigare între potriviri fără panou | P3 |
| S3-A.EDIT.52 | Spelling: (Verificare ortografică) | — | PARTIAL | Unelte ▸ Verifică ortografia (`App.jsx:3615` `checkSpelling`) + spellcheck nativ editor (`App.jsx:3707` comentariu) | fără fereastră dedicată de ortografie | P2 |
| S3-A.EDIT.53 | Transformations ▸ Make Uppercase (Majuscule) | — | COMPLETE | Editare ▸ Transformare ▸ MAJUSCULE (`editorMenus.js:163`) | — | P2 |
| S3-A.EDIT.54 | Transformations ▸ Make Lowercase (minuscule) | — | COMPLETE | `editorMenus.js:164` | — | P2 |
| S3-A.EDIT.55 | Transformations ▸ Capitalize (Titlu) | Ctrl+^ | COMPLETE | Editare ▸ Transformare ▸ Titlu (`editorMenus.js:165` `titleCase`) | fără șoricut | P2 |
| S3-A.EDIT.56 | Transformations ▸ Make Small Caps | — | MISSING | — | — | P3 |
| S3-A.EDIT.57 | Transformations ▸ Remove Small Caps | — | MISSING | — | — | P3 |
| S3-A.EDIT.58 | Transformations ▸ Quotes to Smart/Straight (Ghilimele) | Ctrl+Q / Ctrl+Shift+Q | PARTIAL | Editare ▸ Transformare ▸ ghilimele românești (`editorMenus.js:31,167` `curlyQuotes`) | doar spre „smart", nu și invers | P2 |
| S3-A.EDIT.59 | Transformations ▸ Inline↔Inspector (conversii notații) | — | COMPLETE | Format ▸ Conversii (`editorMenus.js:241-246`) + Documente ▸ conversii (`App.jsx:3557-3560`), `lib/noteConvert.js` | cele 4 conversii (adnotare↔comentariu, notă subsol inline↔legată) | P2 |
| S3-A.EDIT.60 | Speech ▸ Start/Stop Speech (Sinteză vocală) | — | SUPERIOR | Unelte ▸ Citire: selecție/propoziție/paragraf/document/carte + oprire (`App.jsx:3598-3604`), `lib/speech.js`, `lib/useReader.js` | granularitate mai mare decât S3 | P2 |
| S3-A.EDIT.61 | Speech ▸ Settings… (Setări voce) | — | COMPLETE | setări voce în `lib/speech.js` (`loadVoices`, `pickVoice`) prin setările programului | — | P3 |
| S3-A.EDIT.62 | Text Tidying ▸ Delete Struck-Through Text | — | MISSING | — | — | P3 |
| S3-A.EDIT.63 | Text Tidying ▸ Update Document Links to Use Target Titles | — | MISSING | — | — | P3 |
| S3-A.EDIT.64 | Text Tidying ▸ Replace Multiple Spaces with Single | Ctrl+Space | COMPLETE | Editare ▸ Curățenie text ▸ spații multiple (`editorMenus.js:171` `tidySpaces`) | fără șoricut | P2 |
| S3-A.EDIT.65 | Text Tidying ▸ Remove Empty Lines Between Paragraphs | — | COMPLETE | Editare ▸ Curățenie text ▸ linii goale (`editorMenus.js:172` `tidyBlankLines`) | — | P2 |
| S3-A.EDIT.66 | Text Tidying ▸ Strip Leading Tabs | — | COMPLETE | Editare ▸ Curățenie text ▸ taburi inițiale (`editorMenus.js:173` `tidyLeadingTabs`) | — | P2 |
| S3-A.EDIT.67 | Writing Tools ▸ Dictionary… (Dicționar) | — | COMPLETE | Unelte ▸ Dicționar (`App.jsx:3573` `lookupDict`, `lib/lookups.js`) | — | P2 |
| S3-A.EDIT.68 | Writing Tools ▸ Search/Look Up in… (Caută în…) | — | SUPERIOR | Unelte ▸ sinonime, Wikipedia, Google, Wikționar, Scholar (`App.jsx:3574-3576,3584-3585`) | mai multe surse predefinite | P2 |
| S3-A.EDIT.69 | Writing Tools ▸ Dialogue Focus… (Focus dialog) | — | COMPLETE | Vizualizare ▸ Focus pe replici (`App.jsx:3471`, `lib/dialogueFocus.js`) | plasat în View, nu Edit | P2 |
| S3-A.EDIT.70 | Writing Tools ▸ Name Generator… (Generator de nume) | — | COMPLETE | Unelte ▸ Generator de nume (`App.jsx:3529`, `lib/nameGenerator.js`) | — | P2 |
| S3-A.EDIT.71 | Character Map (Hartă de caractere) | Alt+Space | COMPLETE | Format ▸ Caractere speciale (`App.jsx:3544` `specialChars` — panou flotant) | — | P2 |

**Rezumat A.3 (71 comenzi):** COMPLETE 41, SUPERIOR 2, PARTIAL 8, MISSING 20.

---

## A.4 Insert Menu (Inserare)

| ID | Comandă (EN + RO) | Shortcut Scrivener | Stare | Echivalent Pneuma | Diferență | Prioritate |
|---|---|---|---|---|---|---|
| S3-A.INS.01 | Table (Tabel) | — | COMPLETE | Inserare ▸ Tabel (`editorMenus.js:200`, 3×3) | S3 inserează 3×2 + paletă flotantă | P2 |
| S3-A.INS.02 | Image From File… (Imagine din fișier) | Shift+I (textul sursei; probabil Ctrl+Shift+I) | COMPLETE | Inserare ▸ Imagine (`editorMenus.js:184` `insertImage`) | — | P1 |
| S3-A.INS.03 | Image Linked to File… (Imagine legată la fișier) | — | MISSING | — | — | P3 |
| S3-A.INS.04 | Image Linked to Document ▸ (Imagine legată la document) | — | MISSING | — | — | P3 |
| S3-A.INS.05 | Comment (Comentariu) | Shift+F2 | COMPLETE | Inserare ▸ Comentariu (`editorMenus.js:179`, `Editor.jsx:497` `addComment`) | fără șoricut implicit | P1 |
| S3-A.INS.06 | Inline Annotation (Adnotare inline) | Alt+Shift+F2 | COMPLETE | Inserare ▸ Adnotare (`editorMenus.js:181` `addAnnotation`) | — | P1 |
| S3-A.INS.07 | Footnote (Notă de subsol legată) | Shift+F5 | COMPLETE | Inserare ▸ Notă de subsol (`editorMenus.js:180` `addLinkedFootnote`) | — | P1 |
| S3-A.INS.08 | Inline Footnote (Notă de subsol inline) | Alt+Shift+F5 | COMPLETE | Inserare ▸ Notă inline (`editorMenus.js:182` `addInlineFootnote`) | — | P1 |
| S3-A.INS.09 | Bibliography/Citations… (Bibliografie/citări) | Alt+Y | PARTIAL | Import Zotero/BibTeX (`App.jsx:3497,3502`, `lib/bibMerge.js`) | PS importă bibliografia, nu lansează un manager extern de citări la cursor | P3 |
| S3-A.INS.10 | MathML Equation… (Ecuație) | — | SUPERIOR | Inserare ▸ Ecuație (`App.jsx:3411`; `components/EquationDialog.jsx` — LaTeX→MathML→PNG/SVG) | S3 cere MathML brut; PS acceptă LaTeX cu previzualizare | P2 |
| S3-A.INS.11 | Break ▸ Line Break (Ruptură de rând) | Alt+Enter | MISSING | — | editorul acceptă Shift+Enter nativ, dar fără comandă de meniu | P3 |
| S3-A.INS.12 | Break ▸ Page Break (Ruptură de pagină) | Alt+Enter (dupl. în sursă; real: Ctrl+Enter) | COMPLETE | Inserare ▸ Ruptură de pagină (`editorMenus.js:199` `setPageBreak`, Ctrl+Enter) | — | P2 |
| S3-A.INS.13 | Break ▸ Non-Breaking Space (Spațiu inseparabil) | Alt+Space | COMPLETE | Inserare ▸ Caractere ▸ spațiu inseparabil (`editorMenus.js:189` `nbsp`) | — | P2 |
| S3-A.INS.14 | Break ▸ Word Joiner | — | MISSING | — | — | P3 |
| S3-A.INS.15 | Horizontal Line ▸ Centered Line (Linie centrată) | — | MISSING | — | — | P3 |
| S3-A.INS.16 | Horizontal Line ▸ Page-Spanning Line | — | MISSING | — | — | P3 |
| S3-A.INS.17 | Horizontal Line ▸ Signature Line (Linie de semnătură) | — | MISSING | — | — | P3 |
| S3-A.INS.18 | Auto-number ▸ (Numerotare automată) | — | COMPLETE | Inserare ▸ Parametru ▸ `<$n>` (`editorMenus.js:186` `PLACEHOLDERS`) | submeniu de formate lipsă (doar `<$n>`, nu `<$sn>` etc.) | P2 |
| S3-A.INS.19 | Draft Word Count ▸ (Număr de cuvinte) | — | COMPLETE | Inserare ▸ Parametru ▸ `<$wc>` (`editorMenus.js:23`) | fără variante de rotunjire | P3 |
| S3-A.INS.20 | Draft Character Count ▸ (Număr de caractere) | — | MISSING | — | fără placeholder `<$cc>` | P3 |
| S3-A.INS.21 | Endnote Marker (Marcator note de final) | — | MISSING | — | — | P3 |
| S3-A.INS.22 | Current Date & Time (Data și ora curentă) | Alt+Shift+D | COMPLETE | Inserare ▸ Data/ora (`editorMenus.js:185` — 5 formate) | — | P2 |
| S3-A.INS.23 | Media Time Stamp (Marcator temporal media) | — | COMPLETE | inserare din vizualizarea media (`components/MediaPlayerView.jsx:40` `stamp()`; `lib/researchMedia.js:60` `timestampHtml`) | buton în player, nu în meniul Inserare | P2 |

**Rezumat A.4 (23 comenzi):** COMPLETE 12, SUPERIOR 1, PARTIAL 1, MISSING 9.

---

## A.5 View Menu (Vizualizare)

| ID | Comandă (EN + RO) | Shortcut Scrivener | Stare | Echivalent Pneuma | Diferență | Prioritate |
|---|---|---|---|---|---|---|
| S3-A.VIEW.01 | Document/Scrivenings (Document/Scrivenings) | Ctrl+1 | COMPLETE | Vizualizare ▸ Editor (`App.jsx:3404`, `commands.js:69`) + sesiuni Scrivenings (`scrivSelection` `App.jsx:3564`) | — | P1 |
| S3-A.VIEW.02 | Corkboard (Tablă de annonce) | Ctrl+2 | COMPLETE | Vizualizare ▸ Corkboard (`App.jsx:3405`, `commands.js:70`) | — | P1 |
| S3-A.VIEW.03 | Outline (Schiță) | Ctrl+3 | COMPLETE | Vizualizare ▸ Outline (`App.jsx:3406`, `commands.js:71`) | — | P1 |
| S3-A.VIEW.04 | Binder (Binder) | Alt+Shift+B | COMPLETE | Vizualizare ▸ Binder (`App.jsx:3417`, Ctrl+Shift+B în `commands.js:75`) | scurtătură diferită (evită AltGr) | P1 |
| S3-A.VIEW.05 | Collections (Colecții) | Alt+Shift+C | PARTIAL | bara de colecții (`components/CollectionsBar.jsx`), fără comandă de meniu de comutare | fără toggle din meniu | P3 |
| S3-A.VIEW.06 | Inspector | Alt+Shift+I | COMPLETE | Vizualizare ▸ Inspector (`App.jsx:3416`, Ctrl+Shift+I în `commands.js:74`) | — | P1 |
| S3-A.VIEW.07 | Editor Layout ▸ Header & Footer View (bare antet/subsol) | Shift+H / Shift+F | COMPLETE | Vizualizare ▸ Aspect text ▸ bară antet / bară subsol (`editorMenus.js:260-261`) | — | P2 |
| S3-A.VIEW.08 | Editor Layout ▸ No Split (fără divizare) | Ctrl+' | COMPLETE | Vizualizare ▸ Divizează editor (toggle) (`App.jsx:3483` `splitEditor`) + „Închide panoul 2" (`App.jsx:3482`) | — | P1 |
| S3-A.VIEW.09 | Editor Layout ▸ Split Horizontally | Ctrl++ | COMPLETE | Vizualizare ▸ Split orizontal (`App.jsx:3571` `splitHorizontal`) | — | P1 |
| S3-A.VIEW.10 | Editor Layout ▸ Split Vertically | Ctrl+" | MISSING | — | o singură orientare a divizării | P3 |
| S3-A.VIEW.11 | Editor Layout ▸ Swap Editors (Schimbă editoarele) | — | COMPLETE | Vizualizare ▸ Schimbă panourile (`App.jsx:3572` `swapPanes`) | — | P2 |
| S3-A.VIEW.12 | Text Editing ▸ Format Bar (bara de formatare) | Alt+Shift+F | COMPLETE | Vizualizare ▸ Aspect text ▸ bară formatare (`App.jsx:3568` / `editorMenus.js:251`) | — | P2 |
| S3-A.VIEW.13 | Text Editing ▸ Ruler (Rigla) | Alt+Shift+R | COMPLETE | Format ▸ Rigla (`App.jsx:3467`, `editorMenus.js:252`; Ctrl+Alt+Shift+R în `commands.js:88`) | — | P2 |
| S3-A.VIEW.14 | Text Editing ▸ Show Titles in Scrivenings (titluri în Scrivenings) | — | COMPLETE | Vizualizare ▸ Scrivenings ▸ Arată titlurile (`App.jsx:3566`, `menuLayout.js:52`) | — | P2 |
| S3-A.VIEW.15 | Text Editing ▸ Only Show Scrivenings Titles for Folders | — | MISSING | — | există separat „separatoare" (`App.jsx:3567`), nu filtrul pe dosare | P3 |
| S3-A.VIEW.16 | Text Editing ▸ Invisibles (Caractere invizibile) | Alt+Shift+V | COMPLETE | Vizualizare ▸ Caractere invizibile (`editorMenus.js:259` `showInvisibles`) | — | P2 |
| S3-A.VIEW.17 | Text Editing ▸ Markup (Ascunde marcajele) | Alt+Shift+H | PARTIAL | Vizualizare ▸ Aspect text ▸ ascunde comentariile/reviziile (`App.jsx:3569-3570` `toggleComments`, `toggleRevisions`) | fără un singur comutator „markup" | P3 |
| S3-A.VIEW.18 | Text Editing ▸ Page View (Vizualizare pagină) | Alt+Shift+P | COMPLETE | Vizualizare ▸ Pagină ▸ pregătire pagină (`App.jsx:3540` `pageViewSetup`, `menuLayout.js:50`) | — | P2 |
| S3-A.VIEW.19 | Text Editing ▸ Show Line Numbers (Numărători de rânduri) | Alt+Shift+E | COMPLETE | Vizualizare ▸ Numere de rând (`App.jsx:3409`, `components/LineNumbers.jsx`) | — | P2 |
| S3-A.VIEW.20 | Text Editing ▸ Only Count Every Fifth Line (la 5 rânduri) | Alt+Shift+W | MISSING | — | — | P3 |
| S3-A.VIEW.21 | Text Editing ▸ Typewriter Scrolling | Ctrl+T | COMPLETE | Vizualizare ▸ Derulare mașină de scris (`editorMenus.js:258` `settings.typewriter`) | — | P2 |
| S3-A.VIEW.22 | PDF Display ▸ Automatically Resize | — | COMPLETE | PdfViewer ▸ zoom „width" implicit (`components/PdfViewer.jsx:9,21`) | în componentă, nu în meniu | P3 |
| S3-A.VIEW.23 | PDF Display ▸ Actual Size | — | PARTIAL | PdfViewer ▸ zoom numeric (`PdfViewer.jsx:9-24`) | fără opțiune dedicată 100% | P3 |
| S3-A.VIEW.24 | PDF Display ▸ Size to Fit | — | PARTIAL | idem S3-A.VIEW.22-23 | — | P3 |
| S3-A.VIEW.25 | PDF Display ▸ Single/Facing Pages | — | MISSING | — | — | P3 |
| S3-A.VIEW.26 | PDF Display ▸ Horizontal Pages | — | MISSING | — | — | P3 |
| S3-A.VIEW.27 | PDF Display ▸ Continuous / Page Breaks | — | MISSING | — | derulare continuă implicit | P3 |
| S3-A.VIEW.28 | Corkboard ▸ Cards Across ▸ (Cărți pe rând) | — | MISSING | — | — | P3 |
| S3-A.VIEW.29 | Corkboard ▸ Arrange by Label (Aranjare pe etichete) | — | MISSING | — | corkboard PS are tint/pin pe etichetă (`components/Corkboard.jsx:51,86-87`), nu șine | P3 |
| S3-A.VIEW.30 | Corkboard ▸ Arrange by Label Layout ▸ | — | MISSING | — | — | P3 |
| S3-A.VIEW.31 | Corkboard ▸ Label Colors Along Edges | F9 | PARTIAL | card-pin/tint cu culoarea etichetei (`Corkboard.jsx:86-87`); F9 e dictere în PS (`commands.js:55`) | fără bandă pe margine, fără toggle în meniu | P3 |
| S3-A.VIEW.32 | Corkboard ▸ Status Stamps | Alt+F9 | MISSING | — | — | P3 |
| S3-A.VIEW.33 | Corkboard ▸ Keyword Colors | Shift+F9 | MISSING | — | — | P3 |
| S3-A.VIEW.34 | Corkboard ▸ Show Card Numbers | — | MISSING | — | — | P3 |
| S3-A.VIEW.35 | Corkboard ▸ Number Per Section | — | MISSING | — | — | P3 |
| S3-A.VIEW.36 | Corkboard ▸ Show Blank Cards as Ghosts | — | MISSING | — | — | P3 |
| S3-A.VIEW.37 | Corkboard ▸ Freeform (Formă liberă) | — | MISSING | — | — | P3 |
| S3-A.VIEW.38 | Corkboard ▸ Snap to Grid | — | MISSING | — | — | P3 |
| S3-A.VIEW.39 | Corkboard ▸ Commit Freeform Order | — | MISSING | — | — | P3 |
| S3-A.VIEW.40 | Outliner Options ▸ (coloane) | — | EQUIVALENT | selector de coloane în Outliner (`components/Outliner.jsx:38,61,245`, localStorage) | buton › în componentă, nu meniul View | P3 |
| S3-A.VIEW.41 | Outliner Options ▸ Use Fixed Row Height | — | MISSING | — | — | P3 |
| S3-A.VIEW.42 | Use Label Colour In ▸ …(binder/carduri/outliner/pictograme) | — | COMPLETE | Vizualizare ▸ Culoarea etichetei în: binder/cards/outliner/icons (`editorMenus.js:262-265`); fundal în binder inclus | — | P2 |
| S3-A.VIEW.43 | Zoom ▸ Zoom In | Ctrl+= | COMPLETE | Vizualizare ▸ Zoom ▸ + (`App.jsx:3407`, `commands.js:52`) | — | P1 |
| S3-A.VIEW.44 | Zoom ▸ Zoom Out | Ctrl+- | COMPLETE | Vizualizare ▸ Zoom ▸ − (`App.jsx:3408`, `commands.js:53`) | — | P1 |
| S3-A.VIEW.45 | Zoom ▸ procentaje prestabiliți | — | COMPLETE | Zoom ▸ presetări (`editorMenus.js:278` `zoomPresetItems` + `menuLayout.js:51`) | — | P2 |
| S3-A.VIEW.46 | Zoom ▸ Fit Width (potrivește lățimea) | — | COMPLETE | PdfViewer zoom „width" (`PdfViewer.jsx:9`); text: `pageFull` (`App.jsx:3414`) | — | P3 |
| S3-A.VIEW.47 | Zoom ▸ Fit Page | — | MISSING | — | — | P3 |
| S3-A.VIEW.48 | Zoom ▸ Other… (alt procent) | — | MISSING | — | fără câmp de procent custom | P3 |
| S3-A.VIEW.49 | Outline ▸ Expand All (Extinde tot) | Alt+] | PARTIAL | binder contextual ▸ „Extinde tot" (`binderContextMenu.js:154` `setAllCollapsed(false)`) | doar în meniul contextual, fără șoricut global | P2 |
| S3-A.VIEW.50 | Outline ▸ Collapse All (Restrânge tot) | Alt+[ | PARTIAL | binder contextual ▸ „Restrânge tot" (`binderContextMenu.js:154`) | idem | P2 |
| S3-A.VIEW.51 | Outline ▸ Collapse All to Current Level | Alt+- | MISSING | — | — | P3 |
| S3-A.VIEW.52 | Outline ▸ Show Subdocument Counts in Binder | — | MISSING | — | — | P3 |
| S3-A.VIEW.53 | Outline ▸ Hoist Binder (Izolează binderul) | Alt+\ | COMPLETE | Navigate ▸ Hoist/unhoist (`App.jsx:3562-3563`) | — | P2 |
| S3-A.VIEW.54 | Enter/Exit Composition Mode (Mod compoziție) | F11 | COMPLETE | Vizualizare ▸ Mod compoziție (`App.jsx:3415`, F11 în `commands.js:54`) + `CompositionBar.jsx` | — | P1 |
| S3-A.VIEW.55 | Toolbar (Bara de unelte) | Alt+Shift+A | MISSING | — | fără toggle bară unelte | P3 |
| S3-A.VIEW.56 | Customize Toolbar… (Personalizează bara) | — | COMPLETE | Program ▸ Personalizează bara de unelte (`App.jsx:3480` `customizeToolbar`, `lib/toolbars.js`) | — | P2 |

**Rezumat A.5 (56 comenzi):** COMPLETE 25, EQUIVALENT 1, PARTIAL 7, MISSING 23.

---

## A.6 Navigate Menu (Navigare)

| ID | Comandă (EN + RO) | Shortcut Scrivener | Stare | Echivalent Pneuma | Diferență | Prioritate |
|---|---|---|---|---|---|---|
| S3-A.NAV.01 | Reveal in Binder (Dezvăluie în binder) | Shift+R | COMPLETE | Navigare ▸ Dezvăluie în binder (`App.jsx:3561` `revealBinder`, Ctrl+Alt+R în `commands.js:86`) + contextual (`binderContextMenu.js`) | — | P2 |
| S3-A.NAV.02 | Reveal Draft Folder (Dosarul Cercetare/Manuscris) | Ctrl+Shift+R | MISSING | Ctrl+Shift+R e Quick Reference în PS (`commands.js:77`) | fără comandă de salt la dosarul-rădăcină manuscris | P3 |
| S3-A.NAV.03 | Go To ▸ Previous Document (Documentul anterior) | Alt+Shift+↑ | COMPLETE | Navigare ▸ Document anterior (`App.jsx:3425`, Ctrl+Alt+↑ în `commands.js:64`) | — | P1 |
| S3-A.NAV.04 | Go To ▸ Next Document (Documentul următor) | Alt+Shift+↓ | COMPLETE | Navigare ▸ Document următor (`App.jsx:3426`, `commands.js:65`) | — | P1 |
| S3-A.NAV.05 | Go To ▸ Enclosing Group (Grupul părinte) | Ctrl+R | COMPLETE | Navigare ▸ „Dosarul părinte" (`App.jsx` navigateMenu ~3342) | fără șoricut Ctrl+R | P2 |
| S3-A.NAV.06 | Go To ▸ Selection (Seleția — conținutul) | Shift+E | PARTIAL | dublu-click/desChidere în editor încarcă conținutul; fără comandă separată ce ignoră regulile de navigare | — | P3 |
| S3-A.NAV.07 | Go To ▸ (submeniu cu binder + bookmark-uri) | — | COMPLETE | Navigare ▸ Du-te la… (`App.jsx:3420` goto + `gotoItems` `menuLayout.js:75-93`, favorite primele) | fără secțiune de bookmark-uri de proiect în submeniu | P1 |
| S3-A.NAV.08 | Open Quick Reference ▸ (Deschide în Quick Reference) | — | COMPLETE | Navigare ▸ Quick Reference (`App.jsx:3419` `quickRef`) + contextual binder (`binderContextMenu.js:143`) | fără listă de bookmark-uri | P2 |
| S3-A.NAV.09 | Collections ▸ Convert to Standard Collection (conglează rezultatele) | — | PARTIAL | colecțiile și căutările salvate există (`lib/collections.js`, `CollectionsBar.jsx`); conversia unei colecții de căutare în standard nu apare ca comandă | — | P2 |
| S3-A.NAV.10 | Collections ▸ Next Collection | Ctrl+} | MISSING | — | — | P3 |
| S3-A.NAV.11 | Collections ▸ Previous Collection | Ctrl+{ | MISSING | — | — | P3 |
| S3-A.NAV.12 | Open ▸ In Current Editor | Alt+Shift+O | PARTIAL | click binder încarcă în editorul curent; „Du-te la" (`App.jsx:3420`) | fără comandă explicită de meniu | P2 |
| S3-A.NAV.13 | Open ▸ in Other Editor | Ctrl+Shift+O | PARTIAL | binder contextual ▸ „Deschide în panoul 2" (`binderContextMenu.js:144` `select(id, {alt:true})`) + `splitEditor` | fără șoricut global | P2 |
| S3-A.NAV.14 | Open ▸ as Quick Reference | — | COMPLETE | `App.jsx:3419` + contextual binder | — | P2 |
| S3-A.NAV.15 | Open ▸ in Copyholder | — | COMPLETE | Vizualizare ▸ Copyholder (`App.jsx:3481` `openCopyholder`) | — | P2 |
| S3-A.NAV.16 | Open ▸ With Compilable Subdocuments | — | MISSING | — | — | P3 |
| S3-A.NAV.17 | Open ▸ With All Subdocuments as Flat List ▸ | — | PARTIAL | sesiune Scrivenings pe selecție multiplă (`App.jsx:3564` `scrivSelection`) aproximează; lipsesc corkboard-ul plat și varianta „other editor" | — | P3 |
| S3-A.NAV.18 | Open ▸ in External Editor | — | COMPLETE | Documente ▸ Deschide extern (`App.jsx:3552` `openExternal`) | — | P2 |
| S3-A.NAV.19 | Editor ▸ Lock in Place (Blochează editorul) | Alt+Shift+L | COMPLETE | Vizualizare ▸ Blochează panoul (`App.jsx:3410` `lockInPlace`) | — | P2 |
| S3-A.NAV.20 | Editor ▸ Lock Inspector to Editor | — | MISSING | — | inspector flotant există (`App.jsx:3484`), fără lock pe split | P3 |
| S3-A.NAV.21 | Editor ▸ Lock Group View Mode | — | MISSING | — | — | P3 |
| S3-A.NAV.22 | Editor ▸ Scroll to Previous Page | Alt+F4 (probabil tipărit greșit în sursă) | MISSING | — | — | P3 |
| S3-A.NAV.23 | Editor ▸ Scroll to Next Page | Alt+F6 | MISSING | — | — | P3 |
| S3-A.NAV.24 | Editor ▸ Forward in Document History (Înainte în istoric) | Ctrl+] | COMPLETE | Navigare ▸ Înainte (`App.jsx:3428`, Alt+→ în `commands.js:68`) | — | P1 |
| S3-A.NAV.25 | Editor ▸ Backward in Document History (Înapoi în istoric) | Ctrl+[ | COMPLETE | Navigare ▸ Înapoi (`App.jsx:3427`, Alt+← în `commands.js:67`) | — | P1 |
| S3-A.NAV.26 | Editor ▸ Other Editor ▸ Forward in History | Alt+} | MISSING | — | — | P3 |
| S3-A.NAV.27 | Editor ▸ Other Editor ▸ Backward in History | Alt+{ | MISSING | — | — | P3 |
| S3-A.NAV.28 | Editor ▸ Other Editor ▸ Scroll Up | Alt+↑ | MISSING | — | — | P3 |
| S3-A.NAV.29 | Editor ▸ Other Editor ▸ Scroll Down | Alt+↓ | MISSING | — | — | P3 |
| S3-A.NAV.30 | Editor ▸ Other Editor ▸ Previous Page | Alt+Shift+← | MISSING | — | — | P3 |
| S3-A.NAV.31 | Editor ▸ Other Editor ▸ Next Page | Alt+Shift+→ | MISSING | — | — | P3 |
| S3-A.NAV.32 | Editor ▸ Clear Document History | — | MISSING | — | — | P3 |
| S3-A.NAV.33 | Media ▸ Play Media File | Ctrl+Enter | COMPLETE | player media play/pause (`components/MediaPlayerView.jsx:37-38`) | fără comandă de meniu globală | P2 |
| S3-A.NAV.34 | Media ▸ Fast Forward (+2 s) | Alt+] | COMPLETE | seek ± secunde în player (`MediaPlayerView.jsx:32` `currentTime + d`) | pas configurabil, fără meniu | P3 |
| S3-A.NAV.35 | Media ▸ Rewind (−2 s) | Alt+[ | COMPLETE | idem (`MediaPlayerView.jsx:32`) | — | P3 |
| S3-A.NAV.36 | Move Focus To ▸ Rotate through main views | Alt+E | MISSING | — | PS are `lib/focusEngine.js` pentru focus, fără comandă de rotire | P3 |
| S3-A.NAV.37 | Move Focus To ▸ Binder | Shift+B (sursă; probabil Ctrl+Shift+B) | MISSING | — | Ctrl+Shift+B e toggle vizibilitate binder (`commands.js:75`) | P3 |
| S3-A.NAV.38 | Move Focus To ▸ Left/Bottom Editor | [ | MISSING | — | — | P3 |
| S3-A.NAV.39 | Move Focus To ▸ Right/Top Editor | ] | MISSING | — | — | P3 |
| S3-A.NAV.40 | Move Focus To ▸ Header Bar Title (redenumire din tastatură) | Shift+N | MISSING | — | F2 în contextual (`binderContextMenu.js:80`) | P3 |
| S3-A.NAV.41 | Move Focus To ▸ Copyholder | Alt+Shift+D | MISSING | — | — | P3 |
| S3-A.NAV.42 | Inspect ▸ Notes | Alt+U | MISSING | — | fără comenzi de focus pe taburile inspectorului | P3 |
| S3-A.NAV.43 | Inspect ▸ Bookmarks | Alt+N | MISSING | — | — | P3 |
| S3-A.NAV.44 | Inspect ▸ Metadata | Alt+J | MISSING | — | — | P3 |
| S3-A.NAV.45 | Inspect ▸ Snapshots | Alt+Shift+M | MISSING | — | — | P3 |
| S3-A.NAV.46 | Inspect ▸ Comments and Footnotes | Alt+O | MISSING | — | — | P3 |
| S3-A.NAV.47 | Inspect ▸ Synopsis | Alt+I | MISSING | — | — | P3 |
| S3-A.NAV.48 | Inspect ▸ Keywords | Alt+L | MISSING | — | — | P3 |
| S3-A.NAV.49 | Outline Groups ▸ Previous Group | Ctrl+Shift+↑ | MISSING | — | — | P3 |
| S3-A.NAV.50 | Outline Groups ▸ Next Group | Ctrl+Shift+↓ | MISSING | — | — | P3 |
| S3-A.NAV.51 | Binder Selection Affects ▸ Current Editor | — | NOT_APPLICABLE | — | PS țintește panoul activ; opțiunile S3 pentru split-uri multiple nu au corespondent proiectat | P3 |
| S3-A.NAV.52 | Binder Selection Affects ▸ Other Editor | — | NOT_APPLICABLE | — | parțial acoperit de contextual „Deschide în panoul 2" (`binderContextMenu.js:144`) | P3 |
| S3-A.NAV.53 | Binder Selection Affects ▸ Top/Left Editor Only | — | NOT_APPLICABLE | — | — | P3 |
| S3-A.NAV.54 | Binder Selection Affects ▸ Bottom/Right Editor Only | — | NOT_APPLICABLE | — | — | P3 |
| S3-A.NAV.55 | Binder Selection Affects ▸ Both Editors | — | NOT_APPLICABLE | — | — | P3 |
| S3-A.NAV.56 | Binder Selection Affects ▸ None | — | NOT_APPLICABLE | — | — | P3 |
| S3-A.NAV.57 | Binder Selection Affects ▸ Open Non-Group Items in Other | — | NOT_APPLICABLE | — | — | P3 |
| S3-A.NAV.58 | Outliner/Corkboard Selection Affects ▸ None | — | NOT_APPLICABLE | — | fără deschidere automată în celălalt split | P3 |
| S3-A.NAV.59 | Outliner/Corkboard Selection Affects ▸ Other Editor | — | NOT_APPLICABLE | — | — | P3 |
| S3-A.NAV.60 | Outliner/Corkboard Selection Affects ▸ Copyholder | — | NOT_APPLICABLE | — | — | P3 |
| S3-A.NAV.61 | Clear All Navigation Options | — | MISSING | — | — | P3 |

**Rezumat A.6 (61 comenzi):** COMPLETE 15, PARTIAL 5, MISSING 31, NOT_APPLICABLE 10.

---

## A.7 Project Menu (Proiect)

| ID | Comandă (EN + RO) | Shortcut Scrivener | Stare | Echivalent Pneuma | Diferență | Prioritate |
|---|---|---|---|---|---|---|
| S3-A.PROJ.01 | New Text (Document text nou) | Ctrl+N | COMPLETE | Proiect ▸ Text nou (`App.jsx:3429`, `commands.js:44`) + contextual binder (`binderContextMenu.js:49`) | — | P1 |
| S3-A.PROJ.02 | New Folder (Dosar nou) | Alt+Shift+N | COMPLETE | Proiect ▸ Dosar nou (`App.jsx:3430`, Ctrl+Shift+N în `commands.js:45`) | — | P1 |
| S3-A.PROJ.03 | New From Template ▸ (Din șablon) | Ctrl+Shift+N | COMPLETE | contextual binder ▸ grup șabloane (`binderContextMenu.js:59`) + Documente ▸ „Nou din șablon" (`App.jsx` documentMenu ~3337) + dosar de șabloane (`setTemplateFolder`, `binderContextMenu.js:120`) | fără șoricut propriu | P2 |
| S3-A.PROJ.04 | Project Settings… (Setări proiect) | Alt+, | COMPLETE | Proiect ▸ Setări proiect (`App.jsx:3431`, `components/ProjectSettingsDialog.jsx`) | — | P1 |
| S3-A.PROJ.05 | Project Targets (Ținte proiect) | Ctrl+Shift+T | COMPLETE | Proiect ▸ Ținte (`App.jsx:3432`, Ctrl+Shift+T în `commands.js:81`) | — | P1 |
| S3-A.PROJ.06 | Statistics… (Statistici) | Ctrl+Shift+S | COMPLETE | Proiect ▸ Statistici (`App.jsx:3433`, `components/StatisticsDialog.jsx`) | Ctrl+Shift+S e Save As în PS (`commands.js:82`) | P1 |
| S3-A.PROJ.07 | Writing History… (Istoric de scriere) | — | COMPLETE | Proiect ▸ Istoric (`App.jsx:3436`, `components/HistoryDialog.jsx`, istoric zilnic + export) | — | P2 |
| S3-A.PROJ.08 | Project Keywords (Cuvinte-cheie proiect) | Shift+K | COMPLETE | Proiect ▸ Cuvinte-cheie (`App.jsx:3435`, `components/KeywordsDialog.jsx`) + HUD (`App.jsx:3542` `keywordsHud`) | — | P2 |
| S3-A.PROJ.09 | Project Bookmarks (Semne de carte proiect) | Ctrl+Shift+B | COMPLETE | Proiect ▸ Semne de carte (`App.jsx:3491`) + adăugare (`App.jsx:3492`) | fără șoricut Ctrl+Shift+B | P2 |
| S3-A.PROJ.10 | Empty Trash… (Golește coșul) | — | COMPLETE | contextual pe Coș ▸ „Golește coșul" (`binderContextMenu.js:157`) + flux `emptyTrash` (`App.jsx:3955`) | fără intrare în meniul Proiect | P1 |

**Rezumat A.7 (10 comenzi):** COMPLETE 10.

---

## A.8 Documents Menu (Documente)

| ID | Comandă (EN + RO) | Shortcut Scrivener | Stare | Echivalent Pneuma | Diferență | Prioritate |
|---|---|---|---|---|---|---|
| S3-A.DOC.01 | Snapshots ▸ Take Snapshots (Fă fotografii) | Ctrl+5 | COMPLETE | Documente ▸ Fotografii ▸ (`App.jsx:3446`, Ctrl+5 în `commands.js:78`; `menuLayout.js:38`) | — | P1 |
| S3-A.DOC.02 | Snapshots ▸ Take Titled Snapshots (cu titlu) | Ctrl+Shift+5 | COMPLETE | `snapshotTitled` (`App.jsx:3450`, `commands.js:79`) | — | P1 |
| S3-A.DOC.03 | Snapshots ▸ Show Snapshots (Arată fotografiile) | — | PARTIAL | tabul Fotografii din inspector (`components/Inspector.jsx`) + `toggleInspector`; fără comandă directă „arătă tabul" | — | P3 |
| S3-A.DOC.04 | Snapshots ▸ Show Changes ▸ Compare (Compară) | — | COMPLETE | diff-ul fotografiilor în inspector (`lib/snapshotDiff.js`) + Manager (`App.jsx:3456` `snapshotManager`, `components/BatchADialogs.jsx`) | — | P2 |
| S3-A.DOC.05 | Snapshots ▸ Show Changes ▸ Comparison Granularity (paragraf/clauză/cuvânt) | — | MISSING | — | diff-ul PS e la nivel de text, fără granularitate selectabilă | P3 |
| S3-A.DOC.06 | Snapshots ▸ Show Changes ▸ Next Change | Ctrl+] | MISSING | — | fără navigare între diferențe | P3 |
| S3-A.DOC.07 | Snapshots ▸ Show Changes ▸ Previous Change | Ctrl+[ | MISSING | — | — | P3 |
| S3-A.DOC.08 | Snapshots ▸ Roll Back (Restaurează) | — | COMPLETE | restaurare din lista de fotografii a inspectorului (`snapshotList.js` / `Inspector.jsx`) | fără intrare de meniu separată | P1 |
| S3-A.DOC.09 | Snapshots ▸ Delete (Șterge fotografia) | Del | COMPLETE | ștergere în inspector (lista de fotografii) + manager (`App.jsx:3456`) | — | P2 |
| S3-A.DOC.10 | Snapshots ▸ Show Snapshots Manager | — | SUPERIOR | Documente ▸ Fotografii ▸ Manager (`App.jsx:3456` `snapshotManager`, `lib/snapshotList.js`, `snapshotSearch.js`) | manager central cu căutare | P2 |
| S3-A.DOC.11 | Duplicate ▸ with Subdocuments and Unique Title | Ctrl+D | COMPLETE | grup „Duplică" cu/ fără copii (`App.jsx:3637-3639`, `commands.js:59`; `binderContextMenu.js:83-87`) | — | P1 |
| S3-A.DOC.12 | Duplicate ▸ without Subdocuments | Ctrl+Shift+D | COMPLETE | `duplicate` cu `includeChildren:false` (`App.jsx:3639`, `binderContextMenu.js:85`) | fără șoricut separat | P2 |
| S3-A.DOC.13 | Split ▸ at Selection (Separă la selecție) | Ctrl+Shift+K | COMPLETE | Documente ▸ Separă (`App.jsx:3418` `split`, Ctrl+K în `commands.js:57`) | — | P1 |
| S3-A.DOC.14 | Split ▸ with Selection as Title (cu titlul din selecție) | Alt+Shift+K | COMPLETE | `splitTitle` (`App.jsx:3442`, Ctrl+Shift+K în `commands.js:58`) | — | P1 |
| S3-A.DOC.15 | Merge (Unește) | Ctrl+Shift+M | COMPLETE | Documente ▸ Unește (`App.jsx:3443`, `commands.js:66`) | — | P1 |
| S3-A.DOC.16 | New Folder From Selection (Grupează în dosar nou) | Alt+Shift+G | PARTIAL | binder contextual ▸ „Grupează" (`binderContextMenu.js:140`, Ctrl+Alt+G) | fără intrare în meniul Documente | P2 |
| S3-A.DOC.17 | Ungroup (Degrupează) | Alt+Shift+U | MISSING | — | — | P2 |
| S3-A.DOC.18 | Move To ▸ (Mută în…) | — | COMPLETE | Documente ▸ Mută în… (`App.jsx:3548` `moveTo`, `PickNodeDialog` `App.jsx:4871`) + contextual binder (`binderContextMenu.js:100`) | fără secțiune „Favorites" | P1 |
| S3-A.DOC.19 | Move To "X" Again (Mută din nou) | — | MISSING | — | — | P3 |
| S3-A.DOC.20 | Copy To ▸ (Copiază în…) | — | MISSING | — | doar mutare; copierea există ca funcție internă (`copyItems`, `App.jsx:3445`) fără ușă de meniu | P2 |
| S3-A.DOC.21 | Copy To Project ▸ (Copiază în alt proiect) | — | MISSING | — | — | P3 |
| S3-A.DOC.22 | Add to Collection ▸ (Adaugă la colecția…) | — | COMPLETE | contextual binder ▸ colecții (`binderContextMenu.js:126-129`, inclusiv „Colecție nouă") | fără intrare în meniul Documente | P2 |
| S3-A.DOC.23 | Add to/Remove from Project Bookmarks | — | COMPLETE | Proiect ▸ Adaugă la semne de carte (`App.jsx:3492` `bookmarkAdd`) | fără „remove" din aceeași comandă | P2 |
| S3-A.DOC.24 | Convert ▸ Text to Default Formatting… | Ctrl+0 | COMPLETE | Format ▸ Conversie formatare document/manuscris (`App.jsx:3469-3470` `convertDefaultDraft/All`) | — | P2 |
| S3-A.DOC.25 | Convert ▸ Script Format… (conversie format de scenariu) | — | PARTIAL | formate de scenariu în Proiect/Setări (`lib/scriptFormats.js`, `script_<format>` în `menuLayout.js:44`); fără comandă de conversie între formate | — | P3 |
| S3-A.DOC.26 | Convert ▸ to File/Folder (în dosar/document) | — | COMPLETE | Documente ▸ „Convertește în dosar/document text" (`App.jsx` documentMenu ~3330-3331) + contextual (`binderContextMenu.js:137-138`) | — | P2 |
| S3-A.DOC.27 | Convert ▸ Web and PDF files to Text | — | MISSING | — | — | P3 |
| S3-A.DOC.28 | Auto-Fill ▸ Set Selected Text as Title (titlu din selecție) | Alt+Shift+T | MISSING | — | redenumire F2 există (`binderContextMenu.js:80`) | P3 |
| S3-A.DOC.29 | Auto-Fill ▸ Clear Titles (Șterge titlurile) | — | MISSING | — | — | P3 |
| S3-A.DOC.30 | Auto-Fill ▸ Set Synopsis from Main Text/Selection | Alt+Shift+I | COMPLETE | Documente ▸ Sinopsis automat (`App.jsx:3553` `autoSynopsis`, `lib/scenes.js`) | fără varianta „din selecție" ca intrare separată | P2 |
| S3-A.DOC.31 | Auto-Fill ▸ Send Synopsis to Main Text | — | MISSING | — | — | P3 |
| S3-A.DOC.32 | Change Shortcut Source… (schimbă sursa scurtăturii) | — | MISSING | — | PS nu are research-file shortcuts deloc (vezi FILE.16) | P3 |
| S3-A.DOC.33 | Replace Media File… (Înlocuiește fișierul media) | — | MISSING | — | — | P3 |
| S3-A.DOC.34 | Default Template for Subdocuments ▸ | — | MISSING | — | există doar dosarul de șabloane (`binderContextMenu.js:120`) | P3 |
| S3-A.DOC.35 | Change Icon ▸ (Schimbă pictograma) | — | COMPLETE | contextual binder ▸ „Schimbă pictograma" (`binderContextMenu.js:118`) | fără intrare în meniul Documente | P2 |
| S3-A.DOC.36 | Change Icon ▸ Reset Icon to Default | — | COMPLETE | „Pictograma implicită" (`binderContextMenu.js:118`) | — | P3 |
| S3-A.DOC.37 | Change Icon ▸ Icon from Text… | — | MISSING | — | — | P3 |
| S3-A.DOC.38 | Change Icon ▸ Manage Custom Icons… | — | MISSING | — | — | P3 |
| S3-A.DOC.39 | Change Icon ▸ Text Based Icons ▸ | — | MISSING | — | — | P3 |
| S3-A.DOC.40 | Move to Trash (Mută în coș) | Ctrl+Del | PARTIAL | Delete/Del pe selecție → coș (`App.jsx:1673` `moveToTrash`) + contextual (`binderContextMenu.js:107`, Del) | fără intrare în meniul Documente și fără Ctrl+Del | P1 |

**Rezumat A.8 (40 comenzi):** COMPLETE 18, SUPERIOR 1, PARTIAL 4, MISSING 17.

---

## A.9 Format Menu (Format)

| ID | Comandă (EN + RO) | Shortcut Scrivener | Stare | Echivalent Pneuma | Diferență | Prioritate |
|---|---|---|---|---|---|---|
| S3-A.FMT.01 | Font ▸ Show Fonts (Alege fontul) | Ctrl+T | PARTIAL | selector de font în bara de formatare (`components/FormatBar.jsx`); Ctrl+T e typewriter (`editorMenus.js:258`) | fără paletă de fonturi din meniu | P2 |
| S3-A.FMT.02 | Font ▸ Bold (Aldin) | Ctrl+B | COMPLETE | Format ▸ Font ▸ Aldin (`editorMenus.js:207`) | — | P1 |
| S3-A.FMT.03 | Font ▸ Italic (Cursiv) | Ctrl+I | COMPLETE | `editorMenus.js:208` | — | P1 |
| S3-A.FMT.04 | Font ▸ Underline (Subliniat) | Ctrl+U | COMPLETE | `editorMenus.js:209` | — | P1 |
| S3-A.FMT.05 | Font ▸ Strikethrough (Tăiat) | Ctrl+/ | COMPLETE | `editorMenus.js:210` `toggleStrike` | fără șoricut | P2 |
| S3-A.FMT.06 | Font ▸ Bigger (Mai mare) | Ctrl+> | COMPLETE | Format ▸ Font ▸ mărește (`editorMenus.js:212` `stepSize`) | — | P2 |
| S3-A.FMT.07 | Font ▸ Smaller (Mai mic) | Ctrl+< | COMPLETE | `editorMenus.js:213` | — | P2 |
| S3-A.FMT.08 | Font ▸ Baseline ▸ Superscript/Subscript | Alt+> / Alt+< | MISSING | — | doar în FormatFind ca criteriu de căutare (`i18n-ui.js:1712-1713`) | P2 |
| S3-A.FMT.09 | Font ▸ Copy Font (Copiază fontul) | Alt+C | PARTIAL | Format ▸ Copiază formatarea (caracter+paragraf) Ctrl+Alt+C (`editorMenus.js:248`) | fără copiere separată a atributelor de caracter | P3 |
| S3-A.FMT.10 | Font ▸ Paste Font | Alt+V | PARTIAL | Format ▸ Lipește formatarea Ctrl+Alt+V (`editorMenus.js:249`) | idem | P3 |
| S3-A.FMT.11 | Paragraph ▸ Align Left (Aliniere la stânga) | { | COMPLETE | Format ▸ Paragraf ▸ stânga (`editorMenus.js:221`) | fără șoricut | P2 |
| S3-A.FMT.12 | Paragraph ▸ Center (Centrat) | \| | COMPLETE | `editorMenus.js:222` | — | P2 |
| S3-A.FMT.13 | Paragraph ▸ Justify (Justificat) | Alt+\| | COMPLETE | `editorMenus.js:224` | — | P2 |
| S3-A.FMT.14 | Paragraph ▸ Align Right (La dreapta) | } | COMPLETE | `editorMenus.js:223` | — | P2 |
| S3-A.FMT.15 | Paragraph ▸ Tabs and Indents… (taburi și indentare) | — | MISSING | — | există rigla (`toggleRuler` `App.jsx:3467`), nu panoul numeric | P3 |
| S3-A.FMT.16 | Paragraph ▸ Increase/Decrease Indents ▸ (indent/first line/hanging/right) | — | MISSING | — | indentare doar prin riglă/liste | P3 |
| S3-A.FMT.17 | Paragraph ▸ Remove All Tab Stops | — | MISSING | — | — | P3 |
| S3-A.FMT.18 | Paragraph ▸ Line and Paragraph Spacing… | — | COMPLETE | buton de spațiere în bara de formatare (`editorMenus.js` comentariu linia 225; `FormatBar.jsx`) | în bară, nu în meniu | P2 |
| S3-A.FMT.19 | Paragraph ▸ Writing Direction (LTR/RTL) | — | MISSING | — | — | P3 |
| S3-A.FMT.20 | Paragraph ▸ Keep with Next (Ține cu următorul) | — | MISSING | — | — | P3 |
| S3-A.FMT.21 | Paragraph ▸ HTML Header Level | — | MISSING | — | — | P3 |
| S3-A.FMT.22 | Paragraph ▸ Copy Paragraph Attributes | Ctrl+Shift+C | PARTIAL | Format ▸ Copiază formatarea (include paragraful, `editorMenus.js:248`) | combinat cu caracterul; Ctrl+Shift+C e culoare în S3 — conflict de sens | P3 |
| S3-A.FMT.23 | Paragraph ▸ Paste Paragraph Attributes | Ctrl+Shift+V | PARTIAL | `editorMenus.js:249` (Ctrl+Alt+V) | idem | P3 |
| S3-A.FMT.24 | Style ▸ New Style From Selection… | — | COMPLETE | dialog Stiluri (`App.jsx:3459` `styles`, `lib/styles.js`) — creare stil din selecție | — | P2 |
| S3-A.FMT.25 | Style ▸ Redefine Style From Selection ▸ | — | COMPLETE | gestionare/redefinire în dialogul Stiluri (`App.jsx:3459`) + panou (`App.jsx:3412`) | fără submeniu direct | P2 |
| S3-A.FMT.26 | Style ▸ Delete Style ▸ | — | COMPLETE | dialogul Stiluri (`App.jsx:3459`) | idem | P2 |
| S3-A.FMT.27 | Style ▸ Styles Panel (Panoul de stiluri) | Alt+S | COMPLETE | Format ▸ Panoul de stiluri (`App.jsx:3412` `stylesPanel`, `menuLayout.js:44`) | — | P2 |
| S3-A.FMT.28 | Style ▸ Show Styles Menu (Meniul de stiluri) | Ctrl+\ | MISSING | — | fără popup de aplicare rapidă a stilurilor la cursor | P3 |
| S3-A.FMT.29 | Style ▸ Set Default Formatting… | — | PARTIAL | Format ▸ formatare implicită (`components/DefaultFormatPane.jsx`, `formatDocument` `App.jsx:3457`) | ușa e panoul de formatare, nu direct stiluri | P2 |
| S3-A.FMT.30 | Style ▸ Import Styles… | — | MISSING | — | — | P3 |
| S3-A.FMT.31 | Style ▸ No Style (Fără stil) | Alt+Shift+0 | COMPLETE | Format ▸ Stil ▸ „fără stil de paragraf" (`editorMenus.js:232`) | fără variantă explicită pentru stiluri de caracter | P2 |
| S3-A.FMT.32 | Style ▸ (lista de stiluri din proiect) | — | COMPLETE | Format ▸ Stil ▸ lista ¶/a (`editorMenus.js:229-230`), cu șoricuturi per stil | — | P1 |
| S3-A.FMT.33 | Table ▸ Table… + comenzi tabel | — | PARTIAL | Inserare ▸ Tabel (`editorMenus.js:200`); manipulare prin meniul contextual al tabelului în editor (TipTap) | fără submeniu Format ▸ Tabel | P2 |
| S3-A.FMT.34 | Lists ▸ (liste; Reset/Next/Previous List Style) | > / < | PARTIAL | liste bullet/numerotate în bara de formatare (`FormatBar.jsx:357-358`) | fără comutator de stil de listă la tastatură | P3 |
| S3-A.FMT.35 | Scriptwriting ▸ Script Mode | Ctrl+8 | COMPLETE | Format ▸ Mod scenariu (`App.jsx:3532` `scriptOff` + `script_<format>`, `menuLayout.js:44`) | fără șoricut fix (formatele sunt dinamice) | P2 |
| S3-A.FMT.36 | Scriptwriting ▸ Script Settings… | — | COMPLETE | setări de scenariu în Setări proiect (`lib/scriptFormats.js`, `SCRIPT_ELEMENTS` în `settingsDefaults.js:6`) | — | P2 |
| S3-A.FMT.37 | Scriptwriting ▸ Re-capitalize Script | — | MISSING | — | — | P3 |
| S3-A.FMT.38 | Scriptwriting ▸ Change Element To | — | MISSING | — | — | P3 |
| S3-A.FMT.39 | Scriptwriting ▸ Show Script Elements Menu | Ctrl+\ | MISSING | — | — | P3 |
| S3-A.FMT.40 | Color… (Culoarea textului) | Ctrl+Shift+C | COMPLETE | Format ▸ Culoare text ▸ paletă (`editorMenus.js:216-219`) | — | P2 |
| S3-A.FMT.41 | Highlight ▸ Highlight Text (Evidențiere) | Ctrl+Shift+H | COMPLETE | Format ▸ Evidențiere (`editorMenus.js:215` `toggleHighlight`, culori predefinite) | un singur click pentru ultima culoare e în bara de formatare | P2 |
| S3-A.FMT.42 | Highlight ▸ Remove Color (Scoate culoarea/evidențierea) | — | PARTIAL | „Automat" scoate culoarea textului (`editorMenus.js:217` `unsetColor`); evidențierea se scoate prin toggle | fără „remove highlight" explicit | P3 |
| S3-A.FMT.43 | Highlight ▸ Show Colors… | — | COMPLETE | paleta de culori din `textColor` (`editorMenus.js:216-219`) | — | P3 |
| S3-A.FMT.44 | Revision Mode ▸ nivelurile 1–5 | — | COMPLETE | Format ▸ Mod revizie ▸ rundele 1–5 + oprit (`editorMenus.js:235-238`) | — | P2 |
| S3-A.FMT.45 | Revision Mode ▸ Mark Revised (marchează selecția) | — | MISSING | — | colorarea se face prin tastare în modul revizie | P3 |
| S3-A.FMT.46 | Revision Mode ▸ Remove Current Revision Color | — | MISSING | — | — | P3 |
| S3-A.FMT.47 | Revision Mode ▸ Remove (All) Revisions | — | COMPLETE | „Acceptă reviziile" (`editorMenus.js:239` `removeRevisions`) | fără variantă „doar selecția"/„doar nivelul curent" | P2 |
| S3-A.FMT.48 | Copy Formatting (Copiază formatarea) | Alt+Shift+C | COMPLETE | Format ▸ Copiază formatarea, Ctrl+Alt+C (`editorMenus.js:248`) | — | P2 |
| S3-A.FMT.49 | Paste Formatting (Lipește formatarea) | Alt+Shift+V | COMPLETE | Format ▸ Lipește formatarea, Ctrl+Alt+V (`editorMenus.js:249`) | — | P2 |
| S3-A.FMT.50 | Preserve Formatting (Păstrează formatarea) | Alt+/ | COMPLETE | Format ▸ Păstrează formatarea (`App.jsx:3468` `togglePreserveFormat`) | — | P2 |
| S3-A.FMT.51 | Make Formatting Default (Formatarea devine implicită) | — | PARTIAL | panoul de formatare implicită (`DefaultFormatPane.jsx`) setează implicit, dar din selecție direct nu | fără comandă instant din selecție | P2 |

**Rezumat A.9 (51 comenzi):** COMPLETE 27, PARTIAL 10, MISSING 14.

---

## A.10 Window Menu (Fereastră)

| ID | Comandă (EN + RO) | Shortcut Scrivener | Stare | Echivalent Pneuma | Diferență | Prioritate |
|---|---|---|---|---|---|---|
| S3-A.WIN.01 | Minimize (Minimizează) | — | COMPLETE | Fereastră ▸ Minimizează (rol nativ, `editorMenus.js:269`) | — | P2 |
| S3-A.WIN.02 | Maximize (Maximizează) | — | COMPLETE | Fereastră ▸ Maximizează (`editorMenus.js:270` `toggleMaximize`) + Ecran complet (`App.jsx:3547`) | — | P2 |
| S3-A.WIN.03 | Layouts ▸ (aspecte salvate) | — | COMPLETE | Fereastră ▸ Aspecte: salvare + gestionare (`App.jsx:3538-3539`, `components/LayoutsDialog.jsx`, `lib/layouts.js`) | fără Ctrl+) | P2 |
| S3-A.WIN.04 | Layouts ▸ Manage Layouts… | Ctrl+) | COMPLETE | `manageLayouts` (`App.jsx:3539`) | — | P2 |
| S3-A.WIN.05 | Themes ▸ (Teme) | — | PARTIAL | teme în Aspect (`components/AppearancePane.jsx:3-6`, `themeFromSettings`/`parseTheme`) — salvate/încărcate/exportate în setări | fără submeniu rapid în Fereastră | P3 |
| S3-A.WIN.06 | Float Window (Fereastră plutitoare) | — | MISSING | — | — | P3 |
| S3-A.WIN.07 | Float Quick Reference Panels | Shift+Q | MISSING | — | — | P3 |
| S3-A.WIN.08 | Scratchpad (Ciorne) | Alt+Shift+Enter | COMPLETE | Unelte ▸ Ciorne (Scratchpad) (`App.jsx:3530`) | în meniul Unelte, nu Fereastră | P2 |
| S3-A.WIN.09 | Bring All to Front (Toate în față) | — | NOT_APPLICABLE | — | gestionare nativă de ferestre Electron | P3 |
| S3-A.WIN.10 | lista ferestrelor deschise | — | PARTIAL | ferestre suplimentare (`api.newWindow` `App.jsx:3511`, `lib/smallWindows.js`, `components/MissingWindows.jsx`), fără listă în meniu | — | P3 |

**Rezumat A.10 (10 comenzi):** COMPLETE 5, PARTIAL 2, MISSING 2, NOT_APPLICABLE 1.

---

## A.11 Help Menu (Ajutor)

| ID | Comandă (EN + RO) | Shortcut Scrivener | Stare | Echivalent Pneuma | Diferență | Prioritate |
|---|---|---|---|---|---|---|
| S3-A.HELP.01 | Scrivener Manual (Manual) | F1 | COMPLETE | Ajutor ▸ Manualul Pneuma Sofer (`App.jsx:3520`, F1 în `commands.js:83`) + ajutor contextual (`App.jsx:3521`) | — | P1 |
| S3-A.HELP.02 | Interactive Tutorial… (Tutorial interactiv) | — | COMPLETE | Ajutor ▸ Tutorial interactiv (`App.jsx:3525` `startTutorial`) | — | P2 |
| S3-A.HELP.03 | Video Tutorials (Tutoriale video) | — | MISSING | — | fără legături către tutoriale video proprii | P3 |
| S3-A.HELP.04 | List of All Placeholders… (Lista parametrilor) | — | COMPLETE | Ajutor ▸ tab Placeholders (`App.jsx:3523` `helpPlaceholders`) + inserare `editorMenus.js:186` | — | P2 |
| S3-A.HELP.05 | Support (Suport) | — | EQUIVALENT | Ajutor ▸ Raportează o problemă (`App.jsx:3526`, `lib/reportProblem.js`) | suport intern în loc de pagină web L&L | P3 |
| S3-A.HELP.06 | User Forums (Forum) | — | NOT_APPLICABLE | — | specific Literature & Latte | P3 |
| S3-A.HELP.07 | Release Notes (Note de versiune) | — | NOT_APPLICABLE | — | PS ține istoric în repo (`docs/RELEASE-1.1.0-VERIFICATION.md`), fără meniu | P3 |
| S3-A.HELP.08 | Literature & Latte Home | — | NOT_APPLICABLE | — | site vendor | P3 |
| S3-A.HELP.09 | Scrivener Home | — | NOT_APPLICABLE | — | — | P3 |
| S3-A.HELP.10 | Keep Up to Date… (newsletter) | — | NOT_APPLICABLE | — | — | P3 |
| S3-A.HELP.11 | Enter/Deactivate Licence… (Licență) | — | NOT_APPLICABLE | — | PS nu are licență comercială | P3 |
| S3-A.HELP.12 | Purchase Scrivener… (Cumpără) | — | NOT_APPLICABLE | — | — | P3 |
| S3-A.HELP.13 | Check for Updates… (Verifică actualizări) | — | COMPLETE | Ajutor ▸ Verifică actualizări (`App.jsx:3527`, `electron/updateHandlers.cjs`) | — | P2 |
| S3-A.HELP.14 | About Scrivener (Despre) | — | COMPLETE | Ajutor ▸ Despre (`App.jsx:3528`, `components/AboutDialog.jsx`) | — | P2 |
| S3-A.HELP.15 | Help search bar (căutare în meniuri, Shift+F1) | Shift+F1 | MISSING | — | fără căutare de comenzi în meniul Ajutor; există tab „Scurtături" (`App.jsx:3522`) | P3 |

**Rezumat A.11 (15 comenzi):** COMPLETE 5, EQUIVALENT 1, MISSING 2, NOT_APPLICABLE 7.

---

## Meniuri contextuale menționate în Apendix A

Appendix A face trimitere la meniuri contextuale pentru: binder (de mai multe ori), tabele (Format ▸ Table), header bar. Toate căile binder s-au verificat mai sus; meniul contextual al binderului PS (`src/lib/binderContextMenu.js:35-158`) acoperă: adăugare, redenumire, duplicare, mutare, coș/restaurare, etichete/status/include în compilare/favorit/pictogramă/tip de secțiune/dosar șabloane, colecții, conversie file↔folder, grupare, Quick Reference, panoul 2, copiere legătură, snapshot, Explorer, sortare/copii, extindere/restrângere, golire coș. Meniul contextual al tabelului există prin TipTap în editor (vezi S3-A.FMT.33 — PARTIAL). Meniul contextual al header bar-ului (Reveal in Binder, Go To) nu are echivalent dedicat — MISSING (punte parțială prin butoții header-ului, `components/EditorHeader`/panes).

---

## Diferențe de platformă (macOS) menționate în sursă

- **Meniul „Scrivener"** (Table A.1, rândul 1) există **doar pe macOS** — setările/aplicația/quit. În PS, corespondentul este meniul **Program** (`menuLayout.js:13` tier `application`), pe ambele platforme.
- **Export „as Scrivener v1"**: manualul notează că pe macOS formatul vechi cere Scrivener ≥ 2.7 (pe Windows ≥ 1.9.5) — irelevant pentru PS.
- Sursa amintește că lista de invizibili (Table A.2) nu reprezintă „Word-Joiner" pe nicio platformă.
- Scurtături tipărite ambiguu în PDF-ul Windows (probabil artefacte de conversie): `ShiftI` (FILE/INS.02 — probabil Ctrl+Shift+I), `AltEnter` dublat pentru Line Break și Page Break (real: Ctrl+Enter pentru page break), `AltF4` pentru „Scroll to Previous Page" (NAV.22 — probabil un F altfel), `AltE`/`ShiftB`/`AltU` etc. la Navigate (probabil forme cu Ctrl). Am înregistrat fiecare așa cum apare în text.
- Trash (Windows: „Recycle Bin") = „Coș" în PS (`root === 'trash'`, `binderContextMenu.js:22`).

---

## GOLURI NOI (comenzi MISSING/PARTIAL cu nota de implementare)

Comenzile de mai jos necesită intervenție; se indică fișierul de atins (în ordinea priorității):

**P1**
1. **DOC.40 Move to Trash ca comandă de meniu** — adăugați tuplu `['document','moveToTrash', …]` în `src/App.jsx` (~3548, lângă `moveTo`) folosind `moveToTrash` din `src/lib/tree.js` (deja folosit la `App.jsx:1673`); legați Del/Ctrl+Del.
2. **DOC.20 Copy To ▸** — dialog `PickNodeDialog` similar cu `moveTo` (`App.jsx:4871`), apelând `copyItems` (există, `App.jsx:3445`).
3. **DOC.17 Ungroup** — funcție inversă lui `groupDocuments` în `src/App.jsx` / `src/lib/tree.js` + intrare în `documentMenu` și contextual.

**P2**
4. **EDIT.39–41 Link menu commands** — adăugați „Adaugă/editează legătură", „Elimină legătura", „Legătură către document…" în `src/lib/editorMenus.js` (insert/edit menu), reutilizând `setLink`/`extendMarkRange('link')` din `components/Editor.jsx:228`.
5. **EDIT.25 Select with Subdocuments** — helper de selecție în `src/components/Binder.jsx` + comandă în `edit` select submenu (`src/lib/editorMenus.js` / `menuLayout.js:40`).
6. **EDIT.51 Find Next/Previous Formatting** — extend `src/components/FormatFind.jsx` cu acțiuni next/prev legate la `App.jsx:3400`.
7. **EDIT.58 Quotes → straight** — adăugați transformarea inversă lângă `curlyQuotes` în `src/lib/editorMenus.js:31`.
8. **EDIT.07 Copy Text of Documents** — acțiune pe selecție multiplă binder în `src/App.jsx` (text concatenat cu `htmlToText` din `src/lib/text.js`).
9. **FMT.08 Superscript/subscript** — extensii TipTap sau `setFontSize`+baseline marks în `src/components/Editor.jsx` + intrări în `src/lib/editorMenus.js`.
10. **FMT.20 Keep with next / FMT.19 RTL** — atribute de paragraf în schema editorului + `paragraphAlignment.js`/`styles.js`.
11. **NAV.02 Reveal Draft Folder** — comandă în `navigateMenu` (`App.jsx:3337`) care selectează rădăcina `draft`.
12. **VIEW.49/50 Expand/Collapse All ca meniu+șoricut** — expuneți `setAllCollapsed` (deja folosit în `binderContextMenu.js:154`) ca comenzi în `view`/`nav`.
13. **FILE.32 Print Settings per vizualizare / FILE.23 Export comentarii** — dialog nou în `src/components/` + handler IPC în `electron/ioHandlers.cjs`.
14. **DOC.16 New Folder From Selection în meniul Documente** — expuneți `cb.group` (din `binderContextMenu.js:140`) ca tuplu în `App.jsx`.
15. **FMT.28 Show Styles Menu / FMT.37–39 comenzi scenariu** — popupuri reutilizând lista de stiluri din `editorMenus.js:229-230` și `lib/scriptFormats.js`.
16. **VIEW.10 Split Vertical** — orientare în `editorView` (`src/lib/panes.js`) dacă layout-ul suportă.
17. **INS.14 Word Joiner, INS.15–17 linii orizontale, INS.20 character count, INS.21 endnote marker** — intrări noi în `src/lib/editorMenus.js` (insert) și `PLACEHOLDERS` (`editorMenus.js:18-26`); compile: `src/lib/` compile placeholders.

**P3** — restul intrărilor MISSING din tabele (comențiile de focus Navigate, opțiuni corkboard avansate, PDF display, small caps, Move ▸ la tastatură etc.): punct de intrare uniform — tupluri noi în `src/App.jsx` `commandList` + `SUBMENUS` în `src/lib/menuLayout.js`.

---

## OMISIUNI DESCOPERITE (comenzi never mentionate în auditurile PARITY existente)

Verificare `grep -il` pe `docs/PARITY-AUDIT-*.md` — următoarele elemente de meniu Scrivener nu apar în niciunul din documentele `PARITY-AUDIT-ch08-ch15-editor.md`, `PARITY-AUDIT-ch09-ch13-gathering-inspector.md`, `PARITY-AUDIT-ch16-ch17-environments-styles.md`, `PARITY-AUDIT-ch19-ch21-ch22-scripting-markdown-toc.md`, `PARITY-AUDIT-ch23-ch25-ch26-compile-export-print.md`, `PARITY-AUDIT-NEXT-CHAPTERS.md`:

- **Ungroup / Degrupează** (S3-A.DOC.17) — nicăieri.
- **Word Joiner** (S3-A.INS.14).
- **Horizontal Line: Centered / Page-Spanning / Signature** (S3-A.INS.15–17).
- **Small Caps (+ Remove)** (S3-A.EDIT.56–57).
- **Status Stamps, Keyword Colors, Card Numbers, Ghost cards, Snap to Grid, Commit Freeform** (S3-A.VIEW.32–39) — auditul ch08-ch15 menționează doar „freeform" și „arrange by label" ca noțiuni.
- **Writing History** (S3-A.PROJ.07) — deși implementat COMPLETE în PS, nu e menționat.
- **Name Generator** (S3-A.EDIT.70) și **Character Map** (S3-A.EDIT.71) — implementate, dar nemenționate.
- **Smart quotes transform** (S3-A.EDIT.58) — nemenționat ca atare.
- **Keep with Next** (S3-A.FMT.20) și **Writing Direction** (S3-A.FMT.19).
- **Licence/Purchase/Forums/Newsletter** (S3-A.HELP.06–12) — marcate NOT_APPLICABLE, dar nici măcar ca excludere explicită.
- **Close Project and Clear Interface Settings** (S3-A.FILE.09), **Close All Projects** (S3-A.FILE.10), **Show Application Support Folder** (S3-A.FILE.07).
- **Research Files as Shortcuts + Change Shortcut Source** (S3-A.FILE.16 / S3-A.DOC.32) — modelul de „shortcut-uri la fișiere" lipsește complet din ambele părți.
- **Select Subgroups / Select with Subdocuments / Select 'Included' Subdocuments / Deselect All** (S3-A.EDIT.24–27).
- **Move ▸ Up/Down/Left/Right la tastatură** (S3-A.EDIT.31–34).
- **Copy To Project** (S3-A.DOC.21), **Replace Media File** (S3-A.DOC.33), **Icon from Text / Manage Custom Icons / Text Based Icons** (S3-A.DOC.37–39).
- **Baseline superscript/subscript ca formatare** (S3-A.FMT.08) — apare doar ca criteriu în FormatFind.
- **Only Count Every Fifth Line** (S3-A.VIEW.20), **Collapse All to Current Level** (S3-A.VIEW.51), **Show Subdocument Counts in Binder** (S3-A.VIEW.52).
- **Toate comenzile de navigare cu tastatura din Navigate ▸ Move Focus To / Inspect / Other Editor / Outline Groups / Binder Selection Affects** (S3-A.NAV.26–50, .51–.60) — capitolul 12 nu are audit separat încă (vezi `PARITY-AUDIT-NEXT-CHAPTERS.md`).
- **Float Window / Float Quick Reference Panels** (S3-A.WIN.06–07).
- **Help menu search (Shift+F1)** (S3-A.HELP.15).

---

## Sumar centralizator

### Pe meniuri (total comenzi auditate)

| Meniu S3 | Comenzi | COMPLETE | EQUIVALENT | SUPERIOR | PARTIAL | MISSING | NOT_APPLICABLE | UNVERIFIED/BROKEN/UNINTEGRATED |
|---|---|---|---|---|---|---|---|---|
| A.1 Scurtături | 1 | 1 | — | — | — | — | — | — |
| A.2 File | 37 | 19 | 5 | — | 4 | 7 | 2 | — |
| A.3 Edit | 71 | 41 | — | 2 | 8 | 20 | — | — |
| A.4 Insert | 23 | 12 | — | 1 | 1 | 9 | — | — |
| A.5 View | 56 | 25 | 1 | — | 7 | 23 | — | — |
| A.6 Navigate | 61 | 15 | — | — | 5 | 31 | 10 | — |
| A.7 Project | 10 | 10 | — | — | — | — | — | — |
| A.8 Documents | 40 | 18 | — | 1 | 4 | 17 | — | — |
| A.9 Format | 51 | 27 | — | — | 10 | 14 | — | — |
| A.10 Window | 10 | 5 | — | — | 2 | 2 | 1 | — |
| A.11 Help | 15 | 5 | 1 | — | — | 2 | 7 | — |
| **Total** | **375** | **178** | **7** | **4** | **41** | **125** | **20** | **0** |

### Pe stări (total)

- **COMPLETE:** 178 (47,5%)
- **EQUIVALENT:** 7 (1,9%)
- **SUPERIOR:** 4 (1,1%)
- **PARTIAL:** 41 (10,9%)
- **MISSING:** 125 (33,3%)
- **NOT_APPLICABLE:** 20 (5,3%)
- **UNVERIFIED / BROKEN / UNINTEGRATED:** 0

### Observații

1. **Nucleul de scriere** (salvare, editare de bază, găsire/înlocuire, snapshot-uri, split/merge, compilare, ținte, statistici, stiluri, revizii, scenarii) este acoperit COMPLETE — lipsurile se concentrează în: navigarea cu tastatura (A.6), opțiunile corkboard avansate (A.5) și comenzile periferice de gestionare a documentelor (A.8).
2. **Reorganizarea meniurilor PS** (tier-uri Program/Proiect/Workflow, `menuLayout.js:6-20`) mută multe uși față de S3 (Options→Program, Scratchpad→Unelte, Dialogue Focus→Vizualizare); starea EQUIVALENT/PARTIAL reflectă acest lucru, nu absența funcției.
3. **Scurtăturile** diferă frecvent intenționat (evitarea Ctrl+Alt = AltGr pe tastaturile românești; `commands.js:47-49,72-73`) — vezi Quick Search Ctrl+O, Inspector Ctrl+Shift+I, typewriter în setări.
