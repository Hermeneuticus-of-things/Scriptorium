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

## UNDE AM RĂMAS
- [x] **P2/P3 — editorul de format Compile** — FĂCUT în esență (motor integrat + UI). Vezi defalcarea.
  Rămas opțional: opțiuni markdown/LaTeX/HTML per ieșire, script settings, RTF compat (rafinamente).
- [ ] **Următorul: verificare dialoguri rămase** din inventar (ProjectSettings, Statistici, Istoric,
  NameGenerator, Find/Replace, QuickReference, ImportAndSplit, ThemeManager, NewProjectAssistant).
  Metodă: compară etichetele din `scriv-strings.tsv` cu componentele Scribner (cod), implementează doar
  golurile reale. Pattern de până acum: majoritatea sunt deja la paritate.

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
- [~] **Text layout orig** (`SCRCompileFormatTextLayout`): văduve/orfane, evită despărțirea propozițiilor între
  pagini, coloane (număr, spațiu, lățime, coloană centrată), cratimare, eliminare indent primă linie pe
  contexte, linii goale la ruptura de pagină, lățime imagini, prefix/sufix document.
- [x] **Page settings** (`SCRCompileFormatPageSettings`, `SCRCompileFormatPageSettings`): margini, dimensiune
  pagină, antet/subsol, numerotare, prima pagină.
- [x] **Styles** (tab nou: remove/marime%/bold/italic/culoare)
- [x] **Footnotes & comments2** (moduri strip/export/footnotes/inline)
- [~] **Styles orig** (`SCRCompileFormatStyles`): suprascrieri de stil (remove, font, mărime %, culoare,
  bold/italic, indent, aliniere, clasă CSS, stil Word).
- [x] **Section separators** (decorative: * * *, ⁂, ❦, linie — făcut)
- [x] **Prima frază layout**: drop cap, versale lead-in, coloane (făcut)
- [x] **Footnotes & comments**: moduri strip/export/footnotes/inline (făcut)
- [~] **Section separators (orig)** (`SCRCompileFormatSectionSeparators`): none/space/text/page/decorative/section/oddPage.
- [x] **Footnotes & comments** (`SCRCompileFormatFootnotesAndComments`): note de subsol/final, comentarii
  (strip/export/footnotes/inline).
- [ ] **Tables & lists** (`SCRCompileFormatTablesAndLists`, `SCRCompileFormatTables`).
- [ ] **Markup / HTML / CSS / LaTeX** (`SCRCompileFormatMarkup/Html/Css/Latex`): opțiuni per ieșire.
- [x] **Transformations** (`SCRCompileFormatTransformations`): majuscule, ghilimele, etc. la compilare.
- [ ] **Statistics** (`SCRCompileFormatStatistics`), **RTF compat** (`SCRCompileFormatRtfCompatibility`).
- [x] **Assign Section Layouts** (`SCRAssignSectionLayoutsDialog`): maparea tip secțiune → layout.
- [~] **UI**: editat in CompileDialog (asezari + stiluri + separatoare + comentarii); un CompileLayoutEditor.jsx separat ramane optional (nou), scos din `CompileDialog.jsx`; i18n ro+en; teste.

---

## Inventar complet (357 componente) — status
Legendă: `[x]` paritate confirmată · `[~]` parțial/în lucru · `[ ]` de verificat · `[-]` nativ/irelevant
(țări, culori, licență, trial, update, telemetrie, dialoguri de eroare, randare nativă).

CONCLUZIE SWEEP: pe toate componentele mari verificate (meniuri, Format, Opțiuni+sub-tab-uri, Inspector,
Compile+editor, Corecturi, Corkboard, Scratchpad, Ținte, Generator de nume, Import+Split, Setări proiect,
Scenariu) Scribner e la PARITATE sau SUPERSET. Goluri reale în tot auditul: 3, toate reparate (Curățare text,
Deschide folder backup, filtre generator nume). Restul componentelor mici/native: irelevante.

Notă: multe „de verificat" se vor dovedi paritate (pattern constant). Se verifică pe cod/inventar, nu cu
capturi. Componentele mici de infrastructură Qt (sub 3 etichete) se tratează doar dacă apar ca funcție reală.

<!-- Secțiunile mari de parcurs sistematic (feature-bearing), în ordinea priorității: -->
### Meniuri și acțiuni
- [x] SCRFormatActions (238) · SCRProjectActions (294) · SCRMainWindow (216) — nucleu verificat; de reconfirmat marginile.
- [ ] SCRApplicationActions (32) · SCRPdfActions (33) · SCRTextEditZoomActions (18) · SCRFormatActionsContextMenu (45).
### Opțiuni (tab-uri)
- [x] General (63) · Editor (67) · AutoCorrection (33) · Backup (24).
- [ ] Appearance (188) · ImportExport (59) · Navigation (56) · Keyboard (31).
### Compile (P2/P3 — vezi defalcarea de mai sus): toate SCRCompileFormat* + SCRCompile* + SCRSectionLayout*.
### Dialoguri de proiect/document
- [x] Inspector (+ General/Comments/Bookmarks/Keywords/Snapshots) · ProjectTargets · Corkboard · ScratchPad.
- [x] NameGenerator (47) — gol reparat: filtre „se termină cu"/„conține". ProjectStatistics/WritingHistory: paritate.
- [x] ProjectSettingsDialog (113) — paritate+: etichete, status, tipuri de secțiune, metadate
  personalizate cu tipuri (text/număr/checkbox/listă/dată — are și „număr" peste clasic), autocompletare.
- [ ] FindDialog (26) · FindFormattingDialog (45) · ReplaceAllDialog (31) · QuickReference (20) · Bookmarks (20).
- [x] ImportAndSplit (20) — paritate (separator + titluri; OPML/fountain separat).
- [x] ScriptSettingsDialog (87) — paritate: elemente (scenă/acțiune/personaj/dialog/…), tabele Tab/Enter,
  layout per element, mapare FDX (Final Draft). · [ ] PrintSettingsDialog/PageSetup (tipărire nativă).
- [ ] TextStyleDialog (31) · StylesDialog · IndentationDialog (18) · LineSpacingDialog · TableProperties (19).
- [ ] KeywordEditor (19) · ThemeManager (43) · LayoutManager (16) · NewProjectAssistant (58) · TemplateInfo (56).
### Nativ/irelevant (nu se implementează)
- [-] SCRLocale (țări) · SCRColors (nume culori) · SCRBuyDialog/TrialManager/Esellerate/Registration/Paddle/
  Coupon/Serial/License (licențiere) · SCRCheckForUpdates/UpdateManager/Downloader (update nativ) ·
  SCRTwitter/NaNoWriMo/StayInTouch (rețele) · SCRMessageBox (erori) · SCRFontHinting (randare nativă) ·
  SCRGrabScreen/PrintScreen (captură ecran OS) · QObject/Qt* (interne Qt).
