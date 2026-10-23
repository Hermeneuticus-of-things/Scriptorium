# CHANGELOG — Scriptorium

## 2026-10-23 — v0.6.1 — .scriv round trip: favorite

### Cerința user
> Round trip .scriv: SectionType, \\Scrv_fn/\\uc, styleKind, favorite/stiluri/note de proiect/date comentarii/titluri bookmark, snapshot-uri și istoric la export.

### Rezultat
- Punctele 1, 2, 3, 5 și restul din 4 erau deja reparate în v0.6.0 (testele trec fără marcaje KNOWN).
- node.favorite lipsea complet: exportul scrie acum `<MetaData><Favorite>Yes</Favorite>`, importul îl citește. Test nou în tests/scrivRoundTrip.test.js.
- Fișiere: lib/scrivExport.cjs, lib/scrivImport.cjs, tests/scrivRoundTrip.test.js. vitest: 443/443.

## 2026-10-23 — v0.6.0 — Bug-uri reparate la cauză, AI cu orice furnizor, UI/UX ca Scrivener 3

### Cerința user
> "repare bug cu best practice root cause" · "ori ce cheie API, nu doar Anthropic" · "NotebookLM" · "UI și UX (Scrivener clone)"

### Rezultat
- Bug-uri reproduse cu test, apoi reparate la cauză: sincronizare folder (căi în afara folderului), import mixt, salvări din stare veche, scrieri pierdute la eroare, setări atomice, snapshot cu dată invalidă, MCP after_id, editor (redo/undo, cursor în split, $n, ghilimele românești, apostrof, regex pătratice, viteză pe documente lungi), AI (raționament în răspuns, răspunsuri goale/blocate/tăiate, cache pe model, propuneri peste editări noi, anulare și limită de timp).
- AI cu orice furnizor (Anthropic, OpenAI, Gemini, OpenRouter, Mistral, Groq, DeepSeek, xAI, Ollama, LM Studio, compatibil OpenAI), cheie criptată per furnizor; export pentru NotebookLM.
- UX ca Scrivener 3: săgeți și căutare din tastatură în binder, Delete în coș, documente noi în modul redenumire, undo/redo în binder, corkboard și outline din tastatură, scurtături fără Ctrl+Alt (AltGr).
- UI: contrast AA în luminos și întunecat, bara de unelte la 1024 px, ferestre care nu ies din ecran, stări de selecție ca în Scrivener.
- CI nou (teste, build, E2E Electron), `npm audit` 0 vulnerabilități.
- Teste: 386 trec; E2E Electron OK local și în CI.

## 2026-10-23 — v0.5.1 — CI reparat

### Cerința user
> "repare bug cu best practice root cause"

### Cauza
Fluxul „NodeJS with Webpack” rula `npx webpack`, dar Scribner se construiește cu Vite și nu are webpack: CI pica la fiecare push pe `main`. Fluxul SLSA semna două fișiere de exemplu („artifact1/2”), nu aplicația.

### Rezultat
- `.github/workflows/ci.yml` (în locul șablonului webpack): Node 22, `npm ci`, `npm test`, build Vite, build web, test cap-coadă în Electron cu `xvfb-run`.
- SLSA: construiește artefactele reale (Scribner pentru Windows, zip, și versiunea web), le semnează și le atașează la release; generator `v2.1.0`.
- Verificat: toți pașii CI rulați într-o clonă curată trec (312 teste, build, E2E OK).

## 2026-10-23 — v0.5.0 — Aspect Scrivener 3, profil generic, ferestre, web, Karma

### Cerința user
> "toate paginile să arate ca Scrivener 3" · "Karma este doar exemplu, programul este pentru orice fel de text" · profilul Karma „să se numească Română”

### Rezultat
- Temă „Clasic (ca Scrivener 3)” implicită pe toate paginile, cu variantă întunecată; iconițe SVG proprii (bara de unelte, binder, taburile Inspectorului), bara de titlu deasupra editorului; „Modern” rămâne în Setări → Aspect.
- Profil editorial implicit „Generic: orice text”; profilul cărții se numește „Română”; numele glosarelor și ale pachetului pentru editor urmează profilul.
- Setările din Opțiuni au efect (corecturi automate cu Ctrl+Z, invizibile, binder, autosave, redeschidere, vedere implicită).
- Ferestre multiple, versiune web/PWA cu IndexedDB și pachete de proiect, panou de cercetare local (BM25) cu răspuns Claude opțional.
- Liste de cuvinte în Setări, glosare și cuprins de tipar, index canonic în R1/R6, pachet pentru editor.
- Teste: 238 trec. Build trece. Verificat în Chromium (?demo).

## 2026-10-23 — v0.4.0 — Roadmap 2.1–2.6, v0.4 și extra v1.0

### Cerința user
> "continua automat cu Roadmap pana la finalul proectului"

### Decizii
- Lucru în paralel pe agenți cu fișiere exclusive; integrarea în `App.jsx`, `main.cjs`, `preload.cjs` făcută centralizat.
- Meniu nativ construit din registrul de comenzi (acceleratoare afișate, neînregistrate); în browser aceleași comenzi apar ca meniuri în fereastră.
- KPF (Kindle) nu se poate produce cu unelte deschise: Kindle primește EPUB.
- Lucrările AI în bloc sunt blocate când AI e oprit; fișele vii se salvează în `project.livingSheets`.

### Rezultat
- 2.1/2.2: stiluri Para+Char, stil următor, scurtături pe stil; conversii note inline ↔ legate; Linguistic Focus (euristic RO/EN); Inspector plutitor; bookmarks de proiect; note de proiect pe file; recente fixate.
- 2.4: Compile complet (formate editabile, Section Layouts, separatoare, front/back matter, placeholders, înlocuiri, note de final, pagină, EPUB metadate + copertă, RTF/ODT/MD/MMD/TXT, previzualizare, selecție); notele legate compilate ca note de subsol.
- 2.5: import RTF/ODT/HTML/FDX/Fountain/OPML/pagină web/media; export documente, OPML, CSV; Save As; Print.
- 2.6: dialog scurtături, meniu nativ, Quick Reference, Opțiuni în 9 secțiuni, interfață RO/EN.
- v0.4: Script Mode (film, teatru, benzi desenate, radio) + export FDX/Fountain; generator de nume; Scratchpad; citire cu voce și dictare; export .scriv; sync cu folder extern; bibliografie Zotero; LaTeX/Pandoc/MultiMarkdown.
- v1.0: cronologie, hartă de relații, analiză de ritm; sinopsis AI în bloc, consistență cu fișe vii, revizie pe niveluri Maha→Nano.
- Teste: 205 trec. Build Vite trece. Verificat în Chromium (mock API).

### Neverificat
Electron real pe Windows (meniu nativ, PDF, dialoguri de fișiere, dictare), apeluri Claude reale.

## 2026-10-23 — v0.1.0 — Program de scris tip Scrivener + extensii

### Cerința user
> "vreau să-l faci un program asemănător [cu Scrivener] dar să mai adaug lucruri la el"
Alegeri: Electron + React; Baza Scrivener, Import .scriv, Export DOCX/PDF/EPUB, Asistent AI.

### Decizii
- Implementare proprie de la zero (clean-room), fără cod decompilat din Scrivener.
- Format proiect: folder `<Nume>.scriptorium/` cu `project.json` + `docs/*.html` + `notes/*.html` + `snapshots/`.
- Import `.scriv` (Scrivener 3): parsare `.scrivx` + RTF → HTML.
- AI: Anthropic SDK în procesul main, model `claude-opus-5-5`, cheie API din setări locale.
- Build portabil Windows: electron-builder target `portable`.

### Fișiere vizate
`electron/`, `lib/`, `src/`, `tests/`, `package.json`, `vite.config.js`

### Rezultat (v0.1.0)
- Aplicație completă: binder (drag & drop, căutare), editor TipTap, corkboard, outline, inspector (sinopsis, etichetă, status, țintă, note, snapshot-uri), mod compunere, teme (luminos/întunecat/sepia), ținte carte/sesiune/document.
- Import Scrivener 3 (`lib/scrivImport.cjs`, `lib/rtf.cjs`).
- Compile DOCX/EPUB/HTML (`lib/compile.cjs`) + PDF A5 prin Electron.
- Asistent AI (`lib/ai.cjs`): corectură, sinopsis, continuare, critică, consistență, întrebări.
- Teste: 11/11 vitest; UI verificat în Chromium (mod browser), fără erori în consolă.
- Neverificat aici: rularea efectivă în Electron (binarul nu se poate descărca în containerul cloud) și apelul real la API (fără cheie).

## 2026-10-23 — ROADMAP.md
Roadmap extins cu funcțiile Scrivener 3 (12 secțiuni, P1/P2/P3) și ordinea v0.2 / v0.3 / v1.0.

## 2026-10-23 — v0.2.0 — Roadmap v0.2 (scris zilnic)

### Cerința user
> "rămânem pe Electron + React, începe cu roadmap"

### Decizii
- Ordinea din ROADMAP.md, secțiunea v0.2.
- Comentarii și note de subsol ca mark-uri TipTap în HTML-ul documentului (`<span data-comment>` / `<span data-footnote>`), fără fișiere separate.
- Writing History în `history.json` din proiect (primul și ultimul număr de cuvinte pe zi).
- Backup = zip al folderului proiectului în `<proiect>.backups/` lângă proiect (sau folder ales), păstrează ultimele N.
- Import DOCX cu `mammoth`, diff snapshot cu `diff`, ghilimele românești cu `@tiptap/extension-typography`.

### Fișiere vizate
`lib/backup.cjs`, `lib/history.cjs`, `lib/templates.cjs`, `lib/docxImport.cjs`, `lib/compile.cjs`, `lib/store.cjs`, `electron/*`, `src/**`, `tests/*`

### Rezultat (v0.2.0)
- Funcțiile v0.2 (binder multi-selecție, Scrivenings, split editor, comentarii, note de subsol, ghilimele „”, Split/Merge, Find & Replace în proiect, Writing History, backup, import DOCX/TXT/MD, șabloane, panouri redimensionabile).
- Import Scrivener fără pierderi: `lib/rtf.cjs` rescris (aliniere, culori, highlight, super/subscript, liste, tabele, imagini, comentarii și note legate/inline, adnotări, Scrivener Links, stiluri), `lib/scrivImport.cjs` rescris (keywords, metadate personalizate, section types, ținte, colecții, bookmarks, snapshot-uri, writing.history, note de proiect, media, Scrivener 1/2, copie completă în `scrivener-original/`), raport de import, vizualizare media, metadate în Inspector.
- I-REP / I-EDIT după `karma-book-engine`: `src/lib/editorial.js` (reguli R0–R11, ALOGEN, DOOM III, bucle micro/mezzo/macro, reattach), `src/components/EditorialPanel.jsx`, profil editorial în Setări.
- `FEATURES-SCRIVENER3.md` (inventar complet) și `ROADMAP.md` extins.
- Teste: 44/44. UI verificat în Chromium cu simulator de AI.

## 2026-10-23 — v0.2.1 — Roadmap 1.4

### Cerința user
> "să da 1.4"

### Decizii
- Paste and Match Style (Ctrl+Shift+V): text simplu, paragrafe păstrate.
- Ctrl+F: bară de căutare în document cu următor/anterior, înlocuire una/toate, aceleași opțiuni ca în proiect.
- Split: Ctrl+K la cursor, Ctrl+Shift+K cu selecția ca titlu (ca în Scrivener).
- Duplicare document/dosar (Ctrl+D), cu sau fără copii, cu note.
- Spelling: limbi ro + en-US în Electron, meniu contextual cu sugestii și „Adaugă în dicționar”.

### Fișiere vizate
`src/components/Editor.jsx`, `src/components/FindBar.jsx`, `src/App.jsx`, `src/lib/tree.js`, `electron/main.cjs`, `tests/*`

### Rezultat (v0.2.1)
- Ctrl+F în document (`src/components/FindBar.jsx`, `src/editor/docSearch.js`), Paste and Match Style, Split cu selecția ca titlu (Ctrl+Shift+K), duplicare (Ctrl+D, `duplicateNode` în `src/lib/tree.js`), spelling ro/en-US cu meniu contextual (`electron/main.cjs`).
- Teste: 48/48; funcțiile verificate în Chromium.

## 2026-10-23 — v0.2.2 — Redenumire în „Scribner”

### Cerința user
> "programul să se numească Scribner"

### Rezultat
- Numele vizibil, pachetul (`scribner`, appId `ro.scribner.app`), serverul MCP (`scribner`, `bin: scribner-mcp`), formatul proiectului (`<Nume>.scribner`), linkurile interne (`scribner://doc/…`), datele portabile (`Scribner-data`).
- Compatibilitate: proiectele `.scriptorium` se deschid, se salvează în backup și se restaurează la fel; linkurile `scriptorium://` vechi rămân valide.
- Repo-ul GitHub rămâne `Scriptorium` până la redenumirea lui din setările GitHub.

## 2026-10-23 — v0.3.0 (în lucru) — Roadmap v0.3, secțiunile 2.1–2.3

### Cerința user
> "da cu tot roadmap-ul până la final, nu mă mai întreba"; "Scribner să poată fi folosit și cu AI și fără AI, să nu fie dependent de AI"

### Rezultat
- 2.1: bara de format completă, stiluri cu dialog, Revision Mode, focus, Page View, zoom, auto-complete, Copy Special, transformări, setări de compunere.
- 2.2: setările proiectului, statistici, ținte cu termen limită, colecții, cuvinte cheie, căutare avansată, documente-container, șabloane, media, navigare, bookmark-uri.
- 2.3: Corkboard grilă / linii / liber, Outline complet.
- AI opțional: comutator „Funcții AI”; fără AI nu se pierde nicio funcție de scris.
- Teste: 102/102.
