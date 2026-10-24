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
- [x] Aspect Scrivener 3 pe toate paginile
- [x] Profil generic implicit; profilul cărții = „Română”
- [ ] Verificare pe Windows în Electron real; proiect Karma real; Claude real

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
