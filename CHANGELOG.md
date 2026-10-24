# CHANGELOG — Scriptorium

## 2026-10-24 — v0.8.0 — Carte gata de tipar și digital, imagini redimensionabile, servicii și conturi, Speechify, bug-uri Windows și meniuri

### Cerința user
> "să formateze cartea gata de tipar și digital, cu imagini în text și carte, titlu, subtitlu, caractere speciale" · "imaginile să se încadreze și să se redimensioneze în text, ca în grafică" · "cheile pe lângă AI, ex. DeepL, și alte servicii care au nevoie de user și parolă" · "https://speechify.com/" · "testează încrucișat, divergent și convergent, bug hunter deep" · "Windows: caută bug-uri reale"

### Rezultat
- **Carte gata de tipar și digital (Compile):** subtitlu de carte (Setări proiect) și subtitlu de capitol (Inspector) în toate formatele (HTML/PDF, DOCX cu stilul Word „Subtitle”, EPUB, ODT, RTF, Markdown); placeholder `<$subtitle>`; copertă ca primă pagină și în PDF/DOCX (pe lângă EPUB); tipar: despărțire în silabe, fără rânduri orfane/văduve, titlul nu rămâne singur la capăt de pagină, imaginile și tabelele nu se rup; limba ro-RO în DOCX; caractere speciale (ș ț „” «» — … ½ © € grecești, chirilice) verificate în toate formatele.
- **Imagini:** în editor au colțuri de tras (redimensionare cu proporții păstrate) și o bară pe imaginea selectată: stânga/dreapta cu text în jur, în rând, centrată, 25/50/75/100%, mărimea originală. În cartea finală lățimea aleasă (px sau % din coloană) și alinierea se păstrează; nicio imagine nu mai depășește pagina (bug: în DOCX/ODT lățimea maximă era fixă la 6 in, deci ieșea din pagină la formatul 5×8).
- **Servicii și conturi (filă nouă în Setări):** DeepL și Google Translate (traducere direct în program, cu dialog Înlocuiește / Inserează după / Copiază), LanguageTool (gramatică, gratuit fără cont sau Premium cu e-mail + cheie; corecturile se aleg una câte una), Speechify (citire cu voce tare cu vocile lor în bara „Citește”), Zotero; plus „Alte conturi” cu utilizator și parolă (parola se copiază și se șterge din clipboard după 30 s). Totul criptat de sistemul de operare, rămâne în procesul principal.
- **Bug-uri găsite prin testare încrucișată (93 de comenzi din meniu parcurse în demo + scenarii noi):** meniurile din bara de sus nu se închideau cu Escape și rămâneau deschise peste editor, așa că următorul clic nimerea o comandă în loc de text; acum Escape închide, săgețile navighează, comenzile rulează cu focusul înapoi în editor (fără conflict cu navigarea din bara de formatare). Mesajul „… lucrează” rămânea afișat după o eroare de serviciu.
- **Windows:** nume de fișiere/foldere sigure peste tot (CON, NUL, COM1, punct sau spațiu la final, lungime), salvare atomică cu reîncercare când antivirusul/OneDrive țin fișierul deschis (și pentru setări și cache-ul AI), „Salvează ca” cu copiere explicită (cpSync eșua pe Windows), traducerea română a wizardului Inno Setup inclusă, E2E cu aplicația reală rulat și pe Windows în CI.
- **PDF ca o carte tipărită:** antetul și subsolul sunt desenate de pagină (CSS page-margin boxes), deci urmează paginile oglindite (numărul pe marginea exterioară) și lipsesc pe copertă, pagina de titlu și cuprins (bug: înainte apăreau pe toate paginile, iar ruperea dublă lăsa pagini goale); paragraful cu imagine înconjurată de text nu mai e centrat (regula CSS `:only-child` ignora textul). Verificat pe un PDF real randat de Electron, 6×9 in, fonturi încorporate.
- Teste noi: printReady (12), services (10), windowsFs (18), browser: image-resize, services, menu-keyboard. Total 627 unitare + 2 sărite; E2E Electron și 21 de scenarii în browser trec.

## 2026-10-24 — v0.7.2 — MCP integral: agentul poate folosi tot programul

### Cerința user
> serverul MCP să permită oricărui client MCP să folosească programul integral (tot ce face aplicația fără ferestre)

### Rezultat
- `mcp/fullTools.mjs`: 57 de unelte noi (77 în total), toate prin aceleași gărzi (`--read-only`, snapshot/backup înainte, lock pe project.json, id-uri validate, ieșiri doar la căi date de client și niciodată în proiect, `agent-log.jsonl`): proiecte și șabloane, import (fișiere text/OPML/media, pagini web, bibliografie, `.scriv`, pachet), export (documente, OPML/CSV, `.scriv`, NotebookLM, PENTRU EDITOR, pachet, Salvează ca), Compile în toate formatele (fără PDF; `print` = HTML de tipar) cu format, colecție, dosar sau documente, note pe taburi, cuvinte cheie, etichete, statusuri, metadate, tipuri de secțiune, ținte, colecții, semne de carte, comentarii, note de subsol, duplicare/împărțire/unire/transformare, coș, comparare și gestiune snapshot-uri, statistici, cronologie, ritm, relații, cercetare în proiect, glosar, linkuri de dicționare/traducere, backup, I-EDIT fără AI.
- Bug-uri la cauză: importul OPML pierdea eticheta și statusul (căuta `.id` pe nume); fișierele media importate (Import fișiere, imaginile paginilor web) primeau tipul `media` în loc de `file` și erau tratate ca text de binder/Compile; exportul NotebookLM nu includea notele proiectului (căuta `project.notes`); comentariile adăugate prin MCP aveau `data-author` (Inspectorul citește `data-comment-author`).
- Logica mutată în biblioteci partajate de aplicație și MCP: `opmlToNodes`, `mediaNode`, `parseFootnotes` (panelsExtra), glosarul traducătorului (glossary.js), `collectSources` (rag.cjs).
- Teste: `tests/mcpFull.test.js` (43): câte o probă pe unealtă, refuz `--read-only` pentru fiecare unealtă nouă de scriere, lista completă de unelte și o gardă care pică pentru orice funcție nouă din `preload.cjs` fără unealtă MCP sau motiv „doar GUI”.

## 2026-10-24 — v0.7.1 — Installer Windows cu wizard (Inno Setup)

### Cerința user
> "programul să aibă wizard de instalare, adică .exe" · "Inno Setup cu wizard"

### Rezultat
- `installer/scribner.iss`: wizard Inno Setup 6 în română și engleză (licență, folder, grup în Start, scurtătură pe Desktop, pornire la final); instalare per utilizator fără drepturi de admin sau pentru toți utilizatorii; dezinstalarea păstrează proiectele și setările.
- `npm run dist:win` împachetează aplicația și varianta portabilă; `npm run dist:win:setup` face `Scribner-Setup-<versiune>.exe`.
- Workflow `Windows` pe GitHub (windows-latest): teste, pachet, installer; artefactele se descarcă din Actions, iar un tag `v*` publică automat un Release cu ambele `.exe`.

## 2026-10-24 — v0.7.1 — Clic dreapta: „În proiect” (căutare, cercetare, glosar)

### Cerința user
> "trimitere ... la AI pentru cercetare ... sau căutare în baza de date ... pe cuvânt sau pe frază"

### Rezultat
- Meniul contextual are „În proiect”: caută selecția în tot proiectul, caută în cercetarea proiectului, răspuns AI din cercetarea proiectului, adaugă în glosar (documentul „Glosar…” din Cercetare, creat dacă lipsește, fără dubluri).
- Bug la cauză: butoanele panoului de cercetare primeau evenimentul click ca text de căutare când funcția accepta un argument; acum doar un șir e interogare, iar „Reîncearcă” păstrează interogarea.
- Test în browser extins (context-actions): 13 verificări.

## 2026-10-23 — v0.7.0 — Clic dreapta pe cuvânt sau frază: traducere, dicționare, cercetare, AI, NotebookLM

### Cerința user
> "la edit text ... trimitere la DeepL și la dicționare online și trimitere la AI pentru cercetare, corecții sau căutare în NotebookLM, pe cuvânt sau pe frază" · "README pentru un om obișnuit, fără Scrivener" · "repare bug cu root cause"

### Rezultat
- Clic dreapta în editor: fără selecție se selectează cuvântul de sub cursor; meniul are Traduce (DeepL, Google Translate), Dicționare (dexonline, sinonime, Wiktionary, Cambridge, Merriam-Webster, Linguee, IATE), Cercetare pe web (Wikipedia, Google Scholar, Google), Asistent AI (Cercetare, Explică termenul, Corectează, Traduce), Întreabă NotebookLM și Extinde selecția la frază/paragraf. Același meniu în versiunea web.
- AI: acțiuni noi research / define / translate; limba de traducere din Setări → Traducere și dicționare.
- Bug-uri la cauză: variabila locală `tr` din CompileDialog ascundea funcția de traducere și bloca fereastra Compile (test de gardă nou pentru toate fișierele); cronologia tăia titlul ultimei scene; câmpurile personalizate din demo fără nume; selecția programatică pierdută când editorul nu avea focus.
- Compile validat cu consumatori reali (Word schema, LibreOffice, epubcheck, pandoc): tabele, imagini, liste imbricate, linkuri, note de final, numerotarea capitolelor.
- MCP și editări externe: --read-only nu mai scrie, lock pe project.json, îmbinare în trei căi, ferestre multiple fără proiecte blocate, web cu mai multe taburi.
- README nou, pe limba unui om obișnuit, cu 8 capturi prezentate din proiectul demo îmbogățit.
- Teste: 546 unitare, E2E Electron și browser trec.

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
