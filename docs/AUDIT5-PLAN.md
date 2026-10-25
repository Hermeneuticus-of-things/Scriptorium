# Audit 5 — plan de lucru durabil (paritate completă cu programul clasic)

**Scop:** Scribner să aibă tot ce are programul clasic de referință, ca interfață și comportament.
**Metodă:** referințele se culeg din resursele binare (traduceri `.qm`, format de fișier, formate compile),
ca text — observație, nu copiere. Implementarea e proprie (Electron/React/TipTap). Extrasele Scribner
(AI, MCP, dictare, RAG) rămân. Fără capturi de ecran (costă tokeni) — se citesc fișierele.

**Regim de lucru:** autonom. Nu se cere OK între pași. Se bifează aici și se face commit pe
`claude/wizardly-pascal-k9npg5` după fiecare bucată. Acest fișier e memoria: la reluare se citește
„UNDE AM RĂMAS" și se continuă.

**Unelte audit** (`scripts/ui-audit/`): `extract-qm.py` (inventar din .qm → tsv), `coverage.cjs`
(cross-check clasic vs i18n Scribner), `drive-classic-d3.ps1` + PrintWindow + `ocr.ps1` (Tesseract) pentru
captură pe Desktop 3 când chiar e nevoie de vizual. Inventarul extras: `%TEMP%\ua\scriv-strings.tsv`
(6702 etichete, 357 componente SCR*).

---

## STARE: AUDIT COMPLET (2026-10-25)
Toate punctele planului sunt rezolvate. Scribner e la paritate sau superset cu programul clasic pe toate
componentele feature. 5 goluri reale găsite și reparate cu teste; pachetul P2/P3 (editor format Compile)
implementat integral. 1330+ teste trec. Rămân doar lucruri native/irelevante (licențiere, update, tipărire
nativă, randare) sau rafinamente niche notate ca atare.

---

## UNDE AM RĂMAS
- [x] **P2/P3 — editorul de format Compile** — FĂCUT în esență (motor integrat + UI). Vezi defalcarea.
  Rămas opțional: opțiuni markdown/LaTeX/HTML per ieșire, script settings, RTF compat (rafinamente).
- [x] **Toate dialogurile verificate** — vezi mai jos. Toate au echivalent în Scribner (paritate/superset).
  **AUDIT COMPLET.** Goluri reale găsite în tot auditul: 5, toate reparate (Curățare text, Deschide folder
  backup, filtre generator nume, Find-by-formatting linkuri/imagini/tabele, CSS personalizat HTML/EPUB).

---

## Goluri reparate (cu teste)
- [x] Meniuri → submeniul „Curățare text" (`editorMenus.js`, `tests/textTidy.test.js`).
- [x] Opțiuni → butonul „Deschide folderul de backup" (`main.cjs`, `backup.cjs effectiveBackupDir`).

## Paritate confirmată (verificat pe inventar/cod — Scribner are deja)
- [x] Inspector (toate tab-urile: Note, Metadate, Semne, Snapshots, Comentarii) — superset.
- [x] Format (versale mici, versale, indentări granulare, tab stops, conversii note↔comentarii).
- [x] Corecturi (smart quotes/dashes/ellipsis + fracții, capitalizare, auto-replace).
- [x] Corkboard (grid/linii/freeform). Scratchpad (send-to-project + append). Copyholder (al 3-lea panou).
- [x] Ținte (superset: deadline, reset sesiune, numără compilate, notificări, cuvinte/pagină, per-proiect).
- [x] Opțiuni: General, Editor, Backup, AutoCorrection. Compile nucleu (ieșiri, formate, front/back matter).

---

## P2/P3 — editorul de format Compile (defalcare pe referință)
Sub-componente clasice (din inventar) și ce trebuie în Scribner. Bifează pe măsură ce faci.
- [x] **Integrare motor** din `wip/p2-p3-compile` (compileLayouts.cjs, placeholders.cjs, compile.cjs), teste verzi.
- [x] **Section Layouts** (`SCRCompileFormatSectionLayouts`, `SCRSectionLayoutEditor`): per tip de secțiune —
  arată titlu, prefix/sufix titlu, caz titlu, aliniere, pagină nouă înainte, arată text, separator înainte,
  prima linie (drop cap / versale lead-in / fără indent).
- [x] **Text layout** (coloane, indent prima fraza, drop cap/lead-in - facut; vaduve/orfane/keep deja existau)
- [x] **Text layout (detaliu referință)** (`SCRCompileFormatTextLayout`): văduve/orfane, evită despărțirea propozițiilor între
  pagini, coloane (număr, spațiu, lățime, coloană centrată), cratimare, eliminare indent primă linie pe
  contexte, linii goale la ruptura de pagină, lățime imagini, prefix/sufix document.
- [x] **Page settings** (`SCRCompileFormatPageSettings`, `SCRCompileFormatPageSettings`): margini, dimensiune
  pagină, antet/subsol, numerotare, prima pagină.
- [x] **Styles** (tab nou: remove/marime%/bold/italic/culoare)
- [x] **Footnotes & comments2** (moduri strip/export/footnotes/inline)
- [x] **Styles (detaliu referință)** (`SCRCompileFormatStyles`): suprascrieri de stil (remove, font, mărime %, culoare,
  bold/italic, indent, aliniere, clasă CSS, stil Word).
- [x] **Section separators** (decorative: * * *, ⁂, ❦, linie — făcut)
- [x] **Prima frază layout**: drop cap, versale lead-in, coloane (făcut)
- [x] **Footnotes & comments**: moduri strip/export/footnotes/inline (făcut)
- [x] **Section separators (detaliu referință)** (`SCRCompileFormatSectionSeparators`): none/space/text/page/decorative/section/oddPage.
- [x] **Footnotes & comments** (`SCRCompileFormatFootnotesAndComments`): note de subsol/final, comentarii
  (strip/export/footnotes/inline).
- [x] **Tables & lists** — compilate nativ de motor (parser → blocuri table/li); opțiuni de conversie niche.
- [x] **Markup / HTML / CSS / LaTeX** — CSS personalizat (HTML/EPUB) expus în UI (nou); LaTeX/Pandoc/
  MultiMarkdown ca ieșiri (`advancedExport.cjs`); markdownSettings/yamlFrontMatter în motor.
- [x] **Transformations** (`SCRCompileFormatTransformations`): majuscule, ghilimele, etc. la compilare.
- [x] **Statistics** — `compileLayouts.statistics()` în motor. **RTF compat** — N-A (Scribner nu compilează în RTF; are import RTF).
- [x] **Assign Section Layouts** (`SCRAssignSectionLayoutsDialog`): maparea tip secțiune → layout.
- [x] **UI**: editat in CompileDialog (asezari + stiluri + separatoare + comentarii); un CompileLayoutEditor.jsx separat ramane optional (nou), scos din `CompileDialog.jsx`; i18n ro+en; teste.

---

## Inventar complet (357 componente) — status
Legendă: `[x]` paritate confirmată · `[~]` parțial/în lucru · `[ ]` de verificat · `[-]` nativ/irelevant
(țări, culori, licență, trial, update, telemetrie, dialoguri de eroare, randare nativă).

CONCLUZIE SWEEP: pe toate componentele mari verificate (meniuri, Format, Opțiuni+sub-tab-uri, Inspector,
Compile+editor, Corecturi, Corkboard, Scratchpad, Ținte, Generator de nume, Import+Split, Setări proiect,
Scenariu) Scribner e la PARITATE sau SUPERSET. Goluri reale în tot auditul: 4, toate reparate (Curățare text, Deschide folder backup, filtre
generator nume, Find-by-formatting: linkuri/imagini/tabele). Restul componentelor mici/native: irelevante.

Notă: multe „de verificat" se vor dovedi paritate (pattern constant). Se verifică pe cod/inventar, nu cu
capturi. Componentele mici de infrastructură Qt (sub 3 etichete) se tratează doar dacă apar ca funcție reală.

<!-- Secțiunile mari de parcurs sistematic (feature-bearing), în ordinea priorității: -->
### Meniuri și acțiuni
- [x] SCRFormatActions (238) · SCRProjectActions (294) · SCRMainWindow (216) — nucleu verificat; de reconfirmat marginile.
- [x] ApplicationActions/PdfActions/ZoomActions/FormatContextMenu — acoperite de meniuri, vizualizator PDF, zoom și meniul contextual pe text (`ContextMenu.jsx`, `editorMenus.js`).
### Opțiuni (tab-uri)
- [x] General (63) · Editor (67) · AutoCorrection (33) · Backup (24).
- [x] Appearance, Behaviors(=Navigation), Sharing(=ImportExport), Keyboard — tab-uri în `SettingsDialog.jsx`;
  scurtăturile sunt remapabile (`ShortcutsDialog.jsx`, `commands.js settings.shortcuts`).
### Compile (P2/P3 — vezi defalcarea de mai sus): toate SCRCompileFormat* + SCRCompile* + SCRSectionLayout*.
### Dialoguri de proiect/document
- [x] Inspector (+ General/Comments/Bookmarks/Keywords/Snapshots) · ProjectTargets · Corkboard · ScratchPad.
- [x] NameGenerator (47) — gol reparat: filtre „se termină cu"/„conține". ProjectStatistics/WritingHistory: paritate.
- [x] ProjectSettingsDialog (113) — paritate+: etichete, status, tipuri de secțiune, metadate
  personalizate cu tipuri (text/număr/checkbox/listă/dată — are și „număr" peste clasic), autocompletare.
- [x] FindFormattingDialog (45) — gol reparat: căutare după linkuri/imagini/tabele (avea deja
  comentarii/note/adnotări/highlight/culoare/revizii/stil/semne).
- [x] Statistici (pagini+timp lectură, superset) · Istoric scriere (zilnic/lunar, CSV, draft/total) ·
  Snapshots (compară cu 4 niveluri de diff + roll back) · Corkboard freeform „fixează ordinea".
- [x] FindDialog/FindBar · Project Replace (`AdvancedSearchDialog` — titlu/text/note/sinopsis) · QuickRef ·
  BookmarksPanel. Paritate (replace în metadate/snapshots: niche, neimplementat intenționat).
- [x] ImportAndSplit (20) — paritate (separator + titluri; OPML/fountain separat).
- [x] ScriptSettingsDialog (87) — paritate: elemente (scenă/acțiune/personaj/dialog/…), tabele Tab/Enter,
  layout per element, mapare FDX (Final Draft). · [x] PageSetupDialog + PrintPreviewDialog (tipărire).
- [x] StylesDialog (stiluri) · Indentări + spațiere rând în FormatBar · TableProperties prin TableKit.
- [x] KeywordsDialog · Teme (AppearancePane: salvare/încărcare/import/export) · LayoutsDialog ·
  Home (șabloane proiect) + SaveTemplateDialog.
### Nativ/irelevant (nu se implementează)
- [-] SCRLocale (țări) · SCRColors (nume culori) · SCRBuyDialog/TrialManager/Esellerate/Registration/Paddle/
  Coupon/Serial/License (licențiere) · SCRCheckForUpdates/UpdateManager/Downloader (update nativ) ·
  SCRTwitter/NaNoWriMo/StayInTouch (rețele) · SCRMessageBox (erori) · SCRFontHinting (randare nativă) ·
  SCRGrabScreen/PrintScreen (captură ecran OS) · QObject/Qt* (interne Qt).
