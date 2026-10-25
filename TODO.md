# TODO — Scriptorium

## Session 2026-10-23
### Request: program tip Scrivener + extensii
- [x] Scaffold Electron + Vite + React
- [x] Format proiect + store (lib/store.cjs)
- [x] Binder, editor, corkboard, inspector (sinopsis, note, etichete, status, snapshot-uri, țintă cuvinte)
- [x] Import .scriv (RTF → HTML)
- [x] Export DOCX / EPUB / PDF (Compile)
- [x] Asistent AI (Claude)
- [x] Teste vitest + verificare UI în browser
- [~] Commit + push: PROJECTS/ este în .gitignore; livrat ca zip, aștept decizia user pentru repo
Rezumat: v0.1.0 construită și testată (vitest + Chromium). De verificat pe Windows: `npm start` și `npm run dist:win`.

## Session 2026-10-23 (2)
### Request: roadmap v0.2
- [ ] Backup automat (închidere + interval, păstrează N)
- [ ] Writing History + dialog
- [ ] Note de proiect
- [ ] Keywords
- [ ] Găsește și înlocuiește în proiect (regex, cuvinte întregi, majuscule, snapshot înainte)
- [ ] Ghilimele „” românești, — , …
- [ ] Comparare snapshot (diff)
- [ ] Corkboard drag & drop
- [ ] Panouri redimensionabile + starea proiectului memorată
- [ ] Navigare înapoi/înainte
- [ ] Split editor
- [ ] Scrivenings
- [ ] Split / Merge documente
- [ ] Comentarii + note de subsol (editor, inspector, compile)
- [ ] Import DOCX/TXT/MD cu împărțire
- [ ] Șabloane de proiect
- [ ] Teste + verificare UI

## Session 2026-10-23 (3)
### Request: roadmap pas cu pas
- [x] 1.1 Import Scrivener fără pierderi (+ media, raport, metadate, istoric)
- [~] 1.2 I-REP / I-EDIT (lipsește test cu Claude real, editare liste cuvinte)
- [ ] 1.3 Server MCP pentru agenți AI
- [ ] 1.4 Paste and Match Style, Ctrl+F, Split with title, Duplicare, spelling ro
- [~] Salvare cod: repo GitHub privat hermeneuticus-of-things/Scriptorium

## Session 2026-10-23 (4)
### Request: roadmap 1.4
- [x] Paste and Match Style
- [x] Ctrl+F în document
- [x] Split with Selection as Title
- [x] Duplicare
- [x] Spelling ro + meniu contextual (netestat pe Windows)

## Session 2026-10-23 (roadmap automat)
### Request: continuă automat roadmap-ul până la final
- [x] 2.1/2.2 goluri editor și proiect
- [x] 2.4 Compile complet
- [x] 2.5 import/export, Save As, Print
- [x] 2.6 meniu, scurtături, Quick Reference, Opțiuni, RO/EN
- [x] v0.4 Script Mode, sync folder, export .scriv, bibliografie, LaTeX/Pandoc, unelte de scris
- [x] v1.0 cronologie, relații, ritm, AI în bloc
- [x] Corecturi automate, comportament binder, autosave
- [x] Mai multe ferestre de proiect, panou NotebookLM/RAG, PWA
- [x] 1.2: listă cuvinte interzise în Setări, glosare automate, index canonic
- [x] Aspect clasic pe toate paginile
- [x] Profil generic implicit; profilul cărții = „Română”
- [ ] Verificare pe Windows în Electron real; proiect real mare; Claude real

### Request: clic dreapta pe cuvânt/frază → DeepL, dicționare, AI, NotebookLM; README nou
- [x] Meniu contextual (Electron nativ + web) cu traducere, dicționare, cercetare web, AI, NotebookLM, extindere selecție
- [x] Acțiuni AI research / define / translate + limba în Setări
- [x] Bug-uri: `tr` ascuns în CompileDialog, cronologie tăiată, câmpuri demo, selecție fără focus
- [x] README pentru cititori obișnuiți + 8 capturi prezentate
- [~] Re-audit interfață engleză / accesibilitate (agent în lucru)

### Request: installer cu wizard (.exe), Inno Setup
- [x] Inno Setup 6: installer/scribner.iss (română + engleză, licență, folder, Start, Desktop, pornire la final), build/icon.ico
- [x] Workflow Windows: pachet + portabil + Scribner-Setup.exe ca artefact; Release automat la tag v*
- [ ] Verificat installerul pe un Windows real

## Session 2026-10-24 (MCP integral)
### Request: serverul MCP acoperă tot ce face aplicația fără GUI
- [x] Unelte noi în mcp/server.mjs (proiect/șabloane, import, export, note pe taburi, cuvinte cheie, etichete/statusuri/câmpuri/tipuri de secțiune, ținte, colecții, comentarii, note de subsol, documente, coș, snapshot-uri, statistici, cronologie, cercetare, glosar, căutări web, backup, I-EDIT fără AI)
- [x] tests/mcpFull.test.js (o probă pe unealtă + refuz --read-only + lista completă de nume)
- [x] README + ajutor (Conexiune MCP)
Rezumat: 77 de unelte MCP (57 noi), 4 bug-uri reparate la cauză, 43 de teste noi.

### Request: carte gata de tipar/digital, imagini, servicii și conturi, Speechify, bug hunting
- [x] Subtitlu carte + capitol în toate formatele, copertă PDF/DOCX, tipografie de tipar, caractere speciale
- [x] Imagini redimensionabile în editor (colțuri + bară), lățime/aliniere păstrate în Compile, încadrate în pagină
- [x] Setări → Servicii și conturi: DeepL, Google, LanguageTool, Speechify, Zotero, alte conturi (criptat)
- [x] Bug meniuri (Escape, focus), bug Windows (nume rezervate, fișiere blocate, Salvează ca, wizard RO)
- [ ] Verificat cu chei reale DeepL / Google / LanguageTool Premium / Speechify (codul urmează documentația lor; testat cu răspunsuri simulate)
- [x] Zotero: importul bibliografiei direct din cont

### Request: bug hunter deep (încrucișat, divergent, convergent)
- [x] Editor, date, Compile, interfață: 25+ bug-uri reparate la cauză, fiecare cu test
- [x] DOCX: pagina de titlu și cuprinsul într-o secțiune fără antet; corpul de la pagina 1 (verificat în LibreOffice)
- [x] Antet/subsol: <$t> (titlul capitolului) în PDF și Word, <$wc> real în PDF
- [x] Ctrl+Y / Ctrl+Shift+Z readuce corectura automată anulată cu Ctrl+Z
- [ ] Verificat cu LanguageTool real: poziții după emoji
- [x] Release v0.8.2 cu installer și varianta portabilă
- [x] installer/build-windows.cmd: installerul cu wizard construit local cu dublu clic

## Session 2026-10-24 (v0.8.3)
### Request: roadmap: sync web ↔ desktop prin folder (cloud / NAS) + test AI cu model real
- [x] folderKv.js + rutare în webApi (fs:), permisiune, watcher, ștergere = uitare
- [x] Home web: deschidere folder + import pachet separat
- [x] Teste pe folder real cu store.cjs de cealaltă parte (7)
- [x] Preset NVIDIA NIM + scripts/ai-smoke.cjs (cheia doar din mediu)
- [ ] Test model real: blocat de rețeaua mediului cloud; de rulat local `NVIDIA_API_KEY=… node scripts/ai-smoke.cjs nvidia`
Rezumat: web și desktop lucrează pe același folder; sincronizarea o face clientul de cloud sau NAS-ul.

### Request: roadmap pentru tot app + restul în Ajutor
- [x] Riglă vizuală + tab-uri (DOCX exact)
- [x] Page Setup + Print Preview
- [x] Imagini offline în paginile web importate
- [x] Linguistic Focus precis (gold + held-out)
- [x] Ajutor: capitol „Ce faci tu”
- [ ] Ce cere autorul: vezi ROADMAP secțiunea 8 și Ajutor → „Ce faci tu”
Rezumat: tot ce se putea face fără resurse de la autor e închis.

### Request: corecturile manuale învățate automat
- [x] Învățare din rescriere și din sugestiile corectorului, cu verificare ortografică
- [x] Potrivire fără majuscule, cu păstrarea lor; opțiune în Setări; ajutor
Rezumat: greșelile corectate o dată se corectează singure.

### Request: interfață aerisită (după ce termină I-REP/I-EDIT, care lucrează în App.jsx)
- [x] Meniu „AI” unic: Asistent AI, I-REP / I-EDIT, cercetare cu AI, acțiuni AI pe selecție, NotebookLM, setări AI, Conectează la Claude (MCP); ascuns cu AI oprit (I-REP rămâne)
- [x] Bara de sus fără aglomerare: butoanele rare mutate în meniuri derulante; grupare pe Fișier / Editare / Vizualizare / Proiect / Document / Unelte / AI / Ajutor, ca în Scrivener
- [x] FormatBar: comenzile rare în meniuri derulante; ce nu încape trece în „Mai mult ▾”
- [x] Verificat la 900 px și 1366 px, temă luminoasă și întunecată; scurtăturile neschimbate
- [x] Personalizează bara de instrumente — v0.8.4

### Request: roadmap lucru în echipă (server / NAS / cloud, cine ce a modificat și când)
- [x] Scris în README („Ce urmează”) și în ROADMAP.md secțiunea 9
- [x] Implementare etapa 1, folder comun (v0.8.8); etapa 2, server, în listă mai jos

## Session 2026-10-24 (echipă)
### Request: ROADMAP §9 — lucru în echipă
- [x] identitate, jurnal, prezență, blocare, îmbinare pe paragrafe, agent MCP, team_activity
- [x] teste unitare + browser, README + imagine, ajutor RO/EN, ROADMAP, CHANGELOG
- [ ] etapa 2: server Scribner în timp real (CRDT), cursori, roluri, mod sugestie, coadă offline, dialog variante alături

## Următoarele (detalii în ROADMAP.md §10)
- [ ] server Scribner în timp real (CRDT, WebSocket, HTTPS, conturi)
- [ ] cursorii celorlalți, colorați
- [x] dialog de conflict cu variantele alături (v0.9.2, `src/components/ConflictDialog.jsx`, `resolveMerge`)
- [ ] rămase din bug hunt v0.9.3: Outline la 1024 px (Inspector strâns automat); termeni: Binder/Corkboard/Outline/Compile/Layout/bookmark în română unitară; categoriile de șabloane ca id-uri traduse; fragmente de propoziție lipite în JSX → chei întregi
- [x] din bug hunt v0.9.3: Corkboard un singur Tab, caractere în cache, `restoreBackup` limită, sanitizer unic (v0.9.4)
- [ ] din căutarea pe date (v0.9.4): celule unite (colspan) și imagini SVG/GIF cu mărime la `.scriv`; `<ol start>` la `.scriv` (DOCX gata); `<code>` la `.scriv`; `trashedFrom` și spațiile din titluri la `.scriv`; avertisment la pachet pentru fișierele media
- [x] (v0.9.5) comentariul peste formatare mixtă = un singur comentariu în Inspector
- [ ] răspuns și „rezolvat” la comentarii
- [x] (v0.9.6) echipă: conflicte false la paragrafe vecine
- [ ] engleză, rămase: bara de imagini, „Caută după formatare”, limbile din Servicii, tabelele din Ajutor → Sintaxă (mod scenariu), mesajele motorului de dictare, folderul `scrivener-original/` (nume nou + citire nume vechi)
- [x] (v0.9.7) eek din D&TED în dictarea Scribner: listă modele, alegere, „Folosit acum”, mesaj pentru D&TED vechi, imagine README
- [ ] D&TED 0.4.2: construit și publicat pe Windows (PyInstaller + instalator + amprente) — la autor
- [ ] probă reală pe Windows: dictare cu eek prin D&TED în Scribner — la autor
- [ ] deschiderea unui proiect cu dublu clic / din linia de comandă (argv, second-instance, open-file, fileAssociations)
- [ ] la ieșire: ferestrele salvează înainte de backup (before-quit → flush din renderer)
- [ ] watcher: folder dispărut pe Linux (rename) tratat ca offline; un singur retry pe proiect
- [ ] echipă: ordonarea jurnalului cu ceasuri decalate; copiile de conflict ale jurnalelor de echipă
- [ ] `mergeDoc` re-ancorare după inserții (conflicte false)
- [x] (v0.9.4) căutare „cuvânt întreg” și `^`/`$` peste granițele de formatare (bold în mijlocul cuvântului) — `src/lib/search.js`
- [ ] Ctrl+Z după schimbarea documentului: pași pe cuvinte, fără reluarea anulărilor — `src/components/Editor.jsx`
- [ ] coadă offline + indicator de sincronizare
- [ ] roluri și permisiuni
- [ ] mod „sugestie”
- [ ] comparare direct din jurnalul echipei
- [ ] adnotări pe PDF în Cercetare
- [ ] sinonimul.ro cu adresă directă
- [ ] la autor: instalare Windows, test MCP, import proiect real, chei, test AI complet, depozit public?
### Request: plugin D&TED în Scribner (spec: docs/DTED.md)
- [x] D&TED: modul --serviciu (JSON pe linii) + teste
- [x] lib/dted.cjs + IPC + D&TED fals pentru teste
- [x] dictare: text nou la cursor; peste selecție = modificare (înlocuire), un singur Ctrl+Z
- [x] bara de dictare (nivel, Pauză, Stop, Anulează), Unelte → Dictare, F9
- [x] transcriere fișier audio → document în Cercetare; din binder
- [x] Setări → Servicii → D&TED (cale găsită automat, Verifică, termeni)
- [x] ajutor RO/EN, README + imagine, CHANGELOG, versiune
- [ ] test real pe Windows (autorul)

### Request: motorul D&TED în Scribner (v0.9.0)
- [x] motor încorporat (whisper.cpp), descărcare din Setări cu progres și amprente, dictare cu microfonul, fișiere audio decodate în fereastră
- [x] teste unitare + browser cu microfon fals; docs, README, ajutor
- [ ] proba pe Windows (autorul): Descarcă motorul, F9, un MP3

- [ ] Scrivenings: istoricul Undo se pierde după o editare în vederea compusă (historyKey comun); săgeți între secțiuni; bară de formatare comună.
- [ ] „Copiază curat”: curățarea comentariilor cu DOMParser (span-uri imbricate).
- [ ] Demo browser: Compile HTML cu doctype/charset și opțiunile (domeniu, titlu); previzualizarea să respecte domeniul.
- [ ] Meniul Vizualizare: etichete în engleză (Corkboard, Outline, Quick Reference); „Duplică” de două ori cu Ctrl+D; Compile → Pagină doar în inchi.
- [ ] MCP `import_files`: folder de import permis, configurabil.
- [ ] Texte netraduse: formatting.js (FORMAT_KINDS, bara de imagine), pacing.js, PacingView, AiPanel („scrie”, „Respinge”), BackupDialog, EditorialPanel, CompileDialog (Interior/Exterior), collections.js, panelsExtra (Notă din ciorne, părți de vorbire), meniul Ajutor din main.cjs, mesajele webApi.js; 7 chei i18n nefolosite.
- [ ] search.js/team.js: regex de tag care înțelege `>` în atribute; decodare `&amp;amp;` într-o singură trecere.
- [ ] sanitize.js: toate URL-urile din srcset, style cu `\`, atributele background/poster.
