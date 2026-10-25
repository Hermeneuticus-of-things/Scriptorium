# Roadmap Scribner

Starea reală la 2026-10-23. Legendă: `[x]` făcut și testat · `[~]` parțial (scris, netestat sau incomplet) · `[ ]` de făcut · `[-]` exclus intenționat.
Versiuni: **v0.2** în lucru · **v0.3** revizie și publicare · **v0.4** paritate avansată · **v1.0** paritate completă + extra.

Inventarul detaliat, organizat pe meniuri, e în [`docs/FEATURES.md`](docs/FEATURES.md). Fișierul de față e planul de lucru, în ordinea în care construiesc.

---

## 0. Ce e gata acum

| | Funcție |
|---|---|
| [x] | Binder: Manuscris / Cercetare / Coș, dosare, documente, drag & drop, selecție multiplă (Ctrl/Shift+clic), mutare cu tastatura (Ctrl+săgeți), F2 redenumire, căutare în binder |
| [x] | Editor: bold, italic, subliniat, tăiat, T1/T2, citat, listă, linie de dialog, undo/redo |
| [x] | Ghilimele „…” românești, — din `--`, … din trei puncte (automat, se poate opri) |
| [x] | Comentarii pe text, note de subsol (dublu-clic pentru editare), listă în Inspector |
| [x] | Scrivenings (dosar editat ca text continuu), Split editor cu panou blocat (Alt+clic), Înapoi/Înainte (Alt+←/→) |
| [x] | Split la cursor (Ctrl+K), Merge (Ctrl+Shift+M), snapshot automat înainte |
| [x] | Corkboard cu reordonare drag & drop, Outline cu etichetă/status/Include/cuvinte |
| [x] | Inspector: sinopsis, etichetă, status, cuvinte cheie, Include în Compile, țintă, note document, note proiect, snapshot-uri (vezi, compară cu diff, restaurează) |
| [x] | Caută și înlocuiește în tot proiectul (regex, cuvinte întregi, majuscule, coș, snapshot automat) |
| [x] | Ținte carte / sesiune / document, Writing History (grafic, serie de zile, CSV) |
| [x] | Backup automat la închidere și la interval, păstrează N, restaurare ca proiect separat |
| [x] | Import DOCX / TXT / Markdown cu împărțire la titluri sau separator |
| [x] | Șabloane de proiect: Gol, Roman, Roman cu părți, Povestiri, Non-ficțiune |
| [x] | Compile DOCX / PDF A5 / EPUB 3 / HTML cu note de subsol reale, comentariile eliminate |
| [x] | Panouri redimensionabile, starea proiectului memorată, teme (luminos/întunecat/sepia), mod compunere |
| [x] | Asistent AI Claude: corectură, sinopsis, continuare, critică, consistență, întrebări |
| [x] | Import Scrivener fără pierderi (testat pe un proiect de test complet; neverificat încă pe un proiect real mare) |
| [~] | I-REP / I-EDIT (motor de reguli pentru română, bucle micro/mezzo/macro, panou, VKB2 implementat; verificat cu simulator, nu cu Claude real) |
| [x] | AI opțional: programul funcționează complet și fără AI |

---

## 1. v0.2: finalizare (în lucru)

### 1.1 Import `.scriv` fără pierderi
- [x] Binder complet, ordinea, titluri, titlu adaptiv când lipsește
- [x] RTF: paragrafe, aliniere, bold/italic/subliniat/tăiat, superscript/subscript, culori text, highlight, majuscule
- [x] RTF: liste cu buline/numerotate, tabele, salt de pagină, imagini PNG/JPEG (EMF/WMF păstrate byte cu byte)
- [x] Comentarii legate (`scrivcmt://` + `content.comments`: text, autor, culoare), note de subsol legate
- [x] Note de subsol inline (`\Scrv_fn`) și adnotări inline (`\Scrv_annot`)
- [x] Scrivener Links (refăcute spre documentele noi), linkuri externe
- [x] Stiluri: stylesheet RTF + markeri `<$Scr_…::n>` cu `styles.xml` (titluri, citate, emfază)
- [x] Placeholdere `<$…>` păstrate ca text
- [x] Note, sinopsis, etichete (cu culori), statusuri, Include in Compile
- [x] Keywords (cu culori și ierarhie), Custom Metadata (Text/Checkbox/List/Date), Section Types
- [x] Date create/modificare, icoane, ținte per document, ținte proiect cu deadline
- [x] Collections, bookmarks (document + proiect), note de proiect
- [x] Snapshot-uri (titlu, dată, text), `writing.history`
- [x] Media (imagini, PDF, audio, video) copiate în `media/`
- [x] formatul `.scriv` 1/2 (`Files/Docs`)
- [x] Copia completă a proiectului original în `scrivener-original/`
- [x] Vizualizare media în editor (imagine, PDF, audio, video), icoane pe tip în binder
- [x] Raport de import (ce s-a convertit, ce a rămas doar în copie)
- [x] Inspector: metadate personalizate editabile (Text/Checkbox/List/Date), tip de secțiune, date, icoană, țintă, origine Scrivener, bookmark-uri
- [x] Istoric importat afișat în Writing History (marcat „Scrivener”)
- [x] Compile: documente-container incluse cu copiii lor, adnotări și imagini EMF eliminate, media sărită
- [ ] Verificare pe un proiect .scriv real, mare

### 1.2 I-REP și I-EDIT (fluxul editorial pentru română)
- [x] Motor de reguli: DOOM III (em-dash, paranteze, două puncte, bold, liste, numerotare, majusculă), ghilimele, construcții binare, pasive, „noi” explicit, lexic academic, tranziții P9, autoreferințe R7, reziduuri LLM P3, teleologie, ALOGEN (ancoră, repetiție, terminații), metronom, repetiții micro/mezzo/macro, limita de canvas, antet/notă canonică, attention decay
- [x] Reparații sigure fără AI (ghilimele, spații, majusculă)
- [x] Bucle I-REP repară → reverifică pe trei niveluri: micro (selecție), mezzo (document), macro (capitol)
- [x] I-EDIT: rundele R0–R11 alese individual, apoi P3 + bucla I-REP de verificare
- [x] Comentariile, adnotările și alinierea se re-atașează după fiecare trecere AI
- [x] Propunere cu diff, acceptare cu snapshot automat, evidența rundelor pe document
- [x] Alegerea profilului editorial în Setări (Română / Generic), limita canvas, verificarea antetului și notei canonice
- [x] Clic pe o problemă selectează textul în editor
- [x] Bucla verificată în browser cu simulator de AI
- [x] Editarea listelor de cuvinte interzise din Setări
- [~] Test end-to-end cu un model real: lanțul aplicației (setări → furnizor → răspuns) verificat cu OpenRouter; cu Claude real încă nu
- [x] Glosare generate automat: `Glosar_Alogeni_Indieni`, `Glosar_de_lectură`, `Cuprins_de_tipar`
- [x] Index canonic (`Index_de_Lucru`, noduri N.N.N cu tip/greutate/dependențe) ca sursă pentru R1 și R6 macro
- [x] VKB2: I-REP repetiția apropiată (SEMNAL, R8b/S70) și I-EDIT textul autorului (poartă HARD, COADA_AUTOR, jurnal), după `docs/VKB2.md`

### 1.3 Conexiune MCP pentru agenți AI
- [x] Server MCP `scribner-mcp` (stdio), pornit de Claude Code / Claude Desktop / alți agenți, mod `--read-only`
- [x] 20 de unelte: `project_info`, `list_binder`, `read_document`, `write_document`, `create_document`, `move_item`, `set_metadata`, `trash_item`, `search`, `replace`, `get_notes`, `set_notes`, `add_comment`, `add_footnote`, `lint`, `list_snapshots`, `take_snapshot`, `restore_snapshot`, `compile`, `writing_history`
- [x] Resurse: binderul și fiecare document (`scribner://doc/{id}`)
- [x] Aplicația se reîncarcă automat când un agent modifică fișierele
- [x] Setări: comanda gata de copiat pentru Claude Code și Claude Desktop
- [x] Jurnal al acțiunilor agenților (`agent-log.jsonl`), snapshot înainte de fiecare scriere
- [ ] Verificat cu Claude Code real pe Windows

### 1.4 Restul v0.2
- [x] Paste and Match Style (Ctrl+Shift+V și din meniul contextual)
- [x] Find & Replace în documentul curent (Ctrl+F): următor/anterior, contor, majuscule, cuvinte întregi, regex, înlocuiește unul/toate
- [x] Split with Selection as Title (Ctrl+Shift+K); Ctrl+K împarte doar la cursor
- [x] Duplicare document sau dosar (Ctrl+D), cu sau fără sub-documente, cu note
- [x] Spelling ro + en-US, meniu contextual cu sugestii, „Adaugă în dicționar”, Taie/Copiază/Lipește
- [ ] Spelling verificat pe Windows (acolo folosește corectorul sistemului: trebuie instalat pachetul de limbă română)

---

## 2. v0.3: revizie și publicare

### 2.1 Editor și format
- [x] Bara de format completă: stil de paragraf, superscript, subscript, culoare text, highlight (5 culori), aliniere, tabele (rânduri, coloane, antet, unire, împărțire), imagini, liste numerotate cu indentare
- [x] Ruler: riglă vizuală cu indentări și tab-uri la stânga (exacte în DOCX)
- [x] Styles de paragraf și de caractere: panou, creare, editare, Redefine din selecție, import din alt proiect (păstrează / înlocuiește / adaugă), duse în Compile
- [x] Styles: Para+Char, Next style, scurtături de tastatură
- [x] Revision Mode (5 runde colorate), acceptarea tuturor sau a unei runde, eliminate la Compile
- [x] Adnotări inline din bara editorului, conversie adnotare ↔ comentariu
- [x] Conversie adnotare / notă inline ↔ notă legată
- [x] Scrivener Links `[[ ]]` (Ctrl+clic deschide documentul) și linkuri externe (Ctrl+L)
- [x] Page View (A5), Text Zoom 75–200%, semne de paragraf, caractere în bara de stare
- [x] Linguistic Focus: dialog, paragraf, frază; evidențierea paragrafului curent
- [x] Linguistic Focus pe părți de vorbire: etichetare RO/EN cu liste, terminații și context (≈87% RO, ≈96% EN pe texte noi)
- [x] Composition: fundal, lățimea textului, opacitatea paginii, pagină de hârtie
- [x] Composition: Inspector plutitor
- [x] Transformations: majuscule, minuscule, Title Case, propoziție, spații duble, ghilimele, cratime
- [x] Insert: dată, placeholdere Scrivener, caractere speciale (inclusiv diacritice sanscrite), linie / salt de pagină
- [x] Copy Special (text simplu, Markdown, HTML, HTML fără note)
- [x] Auto-complete cu nume din proiect (Tab)

### 2.2 Proiect și organizare
- [x] Project Settings: proprietăți proiect, Labels (culori, ordine, titlul coloanei), Status, Custom Metadata (Text/Checkbox/List/Date), Section Types cu implicite pe nivel, Template Sheets; redenumirile și ștergerile se propagă în tot proiectul
- [x] Custom Metadata editabile în Inspector și coloane în Outline
- [x] Section Types manual per document (Inspector); implicitele pe nivel se aplică la Compile (2.4)
- [x] Keywords: fereastră proiect, culori, ierarhie, redenumire cu unire, căutare după keyword
- [x] Collections: tab-uri deasupra binderului, manuale (din selecție), din căutare, colorate, adaugă/scoate selecția
- [x] Bookmarks în Inspector (spre documente și pagini web)
- [x] Bookmarks de proiect cu previzualizare
- [x] Template Sheets: „Nou din șablon” (text, note, sinopsis, etichetă, cuvinte cheie)
- [x] Document-container (text cu sub-documente, drop în document), conversie Text ↔ Folder
- [x] Icoane personalizate, Lock document (doar citire), sortare conținut (A→Z, Z→A, dată), favorite
- [x] Media în Cercetare: adăugare imagini, PDF, audio, video, cu vizualizare
- [x] Pagini web salvate offline în Cercetare, cu imagini
- [x] Căutare avansată: câmpuri, operatori (oricare / toate / frază), filtre (etichetă, status, cuvinte cheie, zonă, coș, Compile), salvare ca colecție, înlocuire în text, note, titluri și sinopsis cu snapshot
- [x] Project Targets: carte și sesiune în cuvinte sau caractere, termen limită cu zile de scris și cuvinte pe zi, reset sesiune, notificare
- [x] Statistici: proiect / Compile / tot / selecție, pagini estimate, timp de citire, frecvența cuvintelor (cu cuvinte de legătură românești), lungimea frazelor
- [x] Note de proiect cu mai multe tab-uri
- [x] Go To (Ctrl+G), document anterior/următor (Ctrl+Alt+↑/↓), dosarul părinte, favorite
- [x] AI opțional: comutator „Funcții AI” în Setări; fără AI totul funcționează (verificarea I-REP și reparațiile sigure rămân)

### 2.3 Corkboard și Outline
- [x] Corkboard liber (mutare cu mouse-ul, poziții salvate) și „Fixează ordinea” în binder
- [x] Aranjare pe linii după etichetă / status / cuvânt cheie
- [x] Mărimea fișelor (mic / mediu / mare), ștampile de status, nuanța etichetei, cuvinte cheie pe fișă
- [x] Sinopsis imagine (din media)
- [x] Outline: coloane alese (inclusiv metadate proprii, țintă, progres, date), sortare, titlu editabil (dublu-clic), drag & drop, extinde/restrânge tot, totaluri

### 2.4 Compile complet
- [x] Formate: Standard Manuscript, Paperback, Ebook, Modern; editabile și salvate
- [x] Section Layouts legate de Section Types (titlu, prefix/sufix, page break, separator)
- [x] Front matter / Back matter, pagină de titlu, cuprins
- [x] Placeholders: `<$n>`, `<$t>`, `<$wc>`, `<$p>`, `<$projecttitle>`, `<$author>`, numere romane/în litere
- [x] Replacements, transformări, mapare stiluri
- [x] Note: de subsol / de final / comentarii Word
- [x] Pagină: mărime (A5, A4, 6×9, 5×8), margini oglindite, antet/subsol pe pagini pare/impare
- [x] Metadate și copertă EPUB
- [x] Formate în plus: RTF, ODT, Markdown, MultiMarkdown, text simplu
- [x] Compile doar pentru o selecție sau un grup, previzualizare
- [~] Pachetul pentru editor: variantă implicită (DOCX, sinopsis, glosare, raport I-REP, jurnal snapshot-uri, README); se ajustează după specificația ta

### 2.5 Import / export / siguranță
- [x] Import RTF, ODT, HTML, OPML, PDF, imagini, pagini web
- [x] Export documente ca fișiere (DOCX/RTF/MD/TXT) cu structura de foldere și metadate
- [x] Export OPML, Export metadate CSV
- [x] Print, Page Setup, Print Preview
- [x] Proprietăți proiect (titlu, autor, abreviere), Save As
- [x] Recente: fixare, ștergere

### 2.6 Interfață
- [x] Meniu complet (Fișier, Editare, Vizualizare, Navigare, Proiect, Documente, Format, Unelte, Fereastră, Ajutor)
- [x] Scurtături configurabile
- [x] Layouts salvate, Quick Reference
- [x] Options complete: General, Appearance, Behaviors, Corrections, Editing, Backup, Keyboard
- [x] Interfață în română și engleză

---

## 3. v0.4: paritate avansată

- [x] Script Mode: Screenplay, Stage Play, Comic, BBC Radio; elemente cu Tab/Enter; export FDX și Fountain
- [x] Sync cu folder extern (Dropbox/Drive), RTF/TXT/MD, conflicte cu snapshot
- [x] Export ca proiect Scrivener (.scriv)
- [x] Mai multe ferestre de proiect
- [x] Name Generator, Text-to-speech, Dictare, Scratchpad
- [x] Import Zotero, bibliografie
- [~] Export Kindle (KPF), LaTeX, Pandoc: LaTeX, Pandoc și MultiMarkdown gata; KPF nu se poate produce deschis, Kindle primește EPUB

## 4. v1.0: paritate completă + extra

- [x] Toate rândurile `[ ]` din `docs/FEATURES.md` închise sau mutate explicit la `[-]` (0 rămase)
- [x] Sinopsis AI în bloc, consistență pe toată cartea, fișe vii
- [x] Cronologie, hartă de relații, analiză de ritm
- [x] Panou NotebookLM / RAG cu cozi asincrone și cache pe concept (fluxul NLM din workspace)
- [x] Revizie multi-agent pe niveluri de zoom (Maha / Macro / Mezzo / Micro / Nano), cu rapoarte GRAVE/MEDIU
- [x] PWA / sync: versiune web cu IndexedDB și pachete de proiect, plus folder `.scribner` real în Chrome/Edge (sincronizare prin OneDrive, Dropbox, Google Drive sau NAS cu aplicația desktop). Pe telefon rămâne pachetul .json (browserele mobile nu au acces la foldere).

## 5. Excluse intenționat

| Funcție | Motiv |
|---|---|
| Sync Dropbox cu Scrivener iOS | Format proprietar al aplicației mobile; în locul lui vin sync prin folder extern și PWA |
| Simplenote / Index Card | Servicii închise |
| MathType | Program comercial; în locul lui vine un editor MathML |
| EndNote / Bookends | În locul lor vine Zotero |

## 6. Ajutor (ca în Scrivener)

- [x] Meniu Ajutor: manual (F1), ajutor pentru vederea curentă, scurtături, placeholders, sintaxă Markdown / Fountain / Script Mode, raportează o problemă, despre
- [x] Manual complet în română (22 de capitole, căutare cu evidențiere), variantă scurtă în engleză
- [x] Tutorial interactiv: proiect „Tutorial Scribner” cu 15 lecții și exerciții

## 7. Verificare în Electron real

- [x] Test cap-coadă `npm run test:e2e` (Electron real, dialoguri simulate): proiect nou, text cu corecturi automate salvat pe disc, meniu nativ complet, Compile DOCX/PDF/EPUB, export `.scriv` și reimport; trece pe Linux
- [x] Același test pe Windows: rulează în CI pe windows-latest la fiecare PR (E2E cu aplicația reală, installer, portabil)
- [ ] Import pe un proiect real mare (la autor)


## 8. Așteaptă ceva de la autor (nu se pot face fără)

- [ ] Un proiect `.scriv` real, mare, pentru proba de import fără pierderi
- [ ] Cheile reale DeepL / Google / LanguageTool Premium / Speechify / Zotero pentru o probă cap-coadă (codul e testat cu răspunsuri simulate)
- [~] Test cu model real: rulat de autor pe Windows prin OpenRouter (model gratuit `nvidia/nemotron-3.5-super-vl:free`): corectura corectă; traducerea și explicarea au picat la furnizorul gratuit („Provider returned error”); scriptul reîncearcă acum și trece la alt model. Rămâne o rulare completă verde.
- [x] Definițiile VKB2 primite și implementate
- [ ] O probă cu Claude Code pe Windows prin MCP (`claude mcp add scribner …`)
- [ ] Pachetul de limbă română pentru corectorul ortografic al Windows (setare de sistem)

## 9. Lucru în echipă (mai mulți oameni, mai multe calculatoare): folder comun gata (v0.8.8), server în plan

Cerința autorului: mai multe copii ale aplicației, pe calculatoare diferite, lucrează la același proiect; proiectul se trimite printr-un server, un NAS sau un cloud; se vede cine ce a modificat și când.

- [x] **Identitate** (v0.8.8: Setări → Partajare → Echipă; nume, culoare, id de calculator; fiecare modificare de mână poartă autorul, ora și calculatorul): fiecare instalare are un nume de utilizator și o culoare (Setări → Echipă); fiecare scriere în proiect poartă autorul, ora și calculatorul.
- [x] **Jurnal de modificări pe document** (v0.8.8: `team/log-<calculator>.jsonl`, fereastra Proiect → Echipă… cu filtre pe document, persoană și perioadă; revenirea la o versiune: Inspector → Snapshot-uri; rămâne de făcut: comparare direct din jurnal): `history/<id>.jsonl` cu rânduri `{autor, oră, calculator, bucăți schimbate vechi → nou, hash}` (extinde jurnalul I-EDIT `MODIFICARI_AUTOR.jsonl`); panou „Istoric” în Inspector cu filtrare pe persoană și pe perioadă, comparare și revenire la orice versiune.
- [x] **Transport 1, folder comun (NAS / OneDrive / Dropbox / Google Drive)** (v0.8.8: fiecare calculator scrie doar `team/*-<calculator>`; documentele se îmbină pe paragrafe, `src/lib/team.js` mergeDoc): formatul `.scribner` rămâne fișiere text; fiecare calculator scrie doar fișierele lui plus un jurnal propriu (`sync/<calculator>.jsonl`), ca sincronizarea clientului de cloud să nu producă conflicte; un watcher îmbină schimbările celorlalți (îmbinarea în trei căi există deja pentru `project.json`).
- [ ] **Transport 2, server Scribner:** un server mic (Node, în același repo, pornit din aplicație sau ca serviciu pe NAS / VPS), cu WebSocket; schimbările circulă în timp real ca operații CRDT pe documente (de ex. Yjs pentru TipTap), cu salvare pe disc în formatul `.scribner`; autentificare cu cont și parolă sau cheie de invitație; HTTPS.
- [~] **Prezență** (v0.8.8, prin folder: cine are deschis ce document, la 20 s; blocare cu lacăt, doar citire la ceilalți, expiră după 30 min fără semne; cursorii celorlalți rămân pentru server): cine are deschis ce document; cursorul și selecția celorlalți, colorate; blocare opțională a unui document (Inspector → Blocat de …).
- [~] **Conflicte** (v0.8.8: paragrafe diferite se îmbină automat; același paragraf: rămâne textul local, al celuilalt în snapshot; rămâne dialogul cu variantele alături): documente diferite se îmbină automat; același paragraf modificat offline de doi oameni → dialog cu cele două variante, alături, și alegere sau combinare; nimic nu se pierde (ambele variante rămân în snapshot-uri).
- [x] **Offline:** (v0.9.3) coadă locală a schimbărilor, trimisă la reconectare; indicator de stare în bara de jos (sincronizat / în așteptare / conflict).
- [ ] **Roluri și permisiuni:** autor (tot), traducător (textul), redactor (comentarii și modificări propuse, fără scriere directă), cititor; pe proiect și pe dosar.
- [ ] **Modificări propuse:** mod „sugestie” în care schimbările altcuiva apar marcate până le accepți sau le respingi, pe persoană.
- [x] **Compatibilitate** (v0.8.8: fără nume nu se scrie nimic în `team/`; agentul MCP apare ca „agent”, unealta `team_activity`): proiectele fără echipă rămân exact ca acum; MCP vede autorul agentului ca persoană separată („agent”).
- [~] **Teste** (v0.8.8: tests/team.test.js, scenariul de browser team; rămân simulările cu server, latență și deconectări): simulare cu 3 clienți și latență, deconectări, editări simultane în același paragraf, sincronizare prin folder cu întârzieri de cloud, recuperare după oprire bruscă.


## 10. De făcut în continuare (ordinea propusă)

1. **Server Scribner în timp real** (§9, transport 2): server mic Node pe NAS / VPS, WebSocket + HTTPS, schimbări CRDT (Yjs) pe documente, salvare în formatul `.scribner`, cont și parolă sau cheie de invitație.
2. **Cursorii și selecția celorlalți**, colorați, prin server (§9, prezență).
3. ✅ (v0.9.2) **Dialogul de conflict cu variantele alături**: același paragraf schimbat de doi oameni, alegi sau combini (§9, conflicte).
4. ✅ (v0.9.3) **Coadă offline** a schimbărilor + indicator sincronizat / în așteptare / conflict în bara de jos (§9).
5. **Roluri și permisiuni**: autor, traducător, redactor, cititor; pe proiect și pe dosar (§9).
6. **Modul „sugestie”**: schimbările altcuiva marcate până le accepți sau le respingi, pe persoană (§9).
7. **Comparare din jurnalul echipei**: clic pe un rând → diferența față de versiunea de dinainte.
8. **Adnotări pe PDF-urile din Cercetare** (singura funcție lipsă din docs/GAP-AUDIT.md).
9. **sinonimul.ro cu adresă directă** în loc de căutarea prin Google (de verificat formatul adresei pe site).
10. **Rămân la autor** (§8): instalare pe Windows, test MCP cu Claude Desktop / Claude Code, importul unui proiect real mare, cheile de servicii, testul AI complet cu un model real, decizia depozit public / privat.
11. **[x] v0.8.8 — Plugin D&TED (dictare și transcriere în română) integrat în interfață; rămâne testul real pe Windows** — specificația tehnică completă (protocol, arhitectură, teste, pași): [`docs/DTED.md`](docs/DTED.md). Dictare de text nou la cursor și **dictare peste o selecție, care o înlocuiește (modificare)**. D&TED (https://github.com/Hermeneuticus-of-things/dted) e un program Python separat (Whisper `large-v3-turbo`, local, fără internet). Pași:
    - în D&TED: un mod fără fereastră pentru alte programe: `python -m dictare_transcriere_romana --transcrie <fișier> --json` (text + segmente cu timp) și `--dictare --stdio` (text parțial pe măsură ce vorbești, JSON pe linii);
    - în Scribner: Setări → Servicii → D&TED (calea programului, detectată automat din instalarea Windows; test „Verifică”);
    - Unelte → Dictare (D&TED): bară de dictare peste editor, textul intră la cursor, cu ghilimele, diacritice și corecturile învățate aplicate; pauză / reluare / stop;
    - Fișier → Importă → Transcrie fișier audio…: MP3, WAV, M4A, OGG, FLAC → document nou în Cercetare (opțional cu marcaje de timp), fișierul audio atașat ca media;
    - în binder, pe un fișier audio: „Transcrie cu D&TED” → nota sau un document legat;
    - fără D&TED instalat, comenzile apar cu un link de instalare; nimic nu pleacă pe internet; procesul rulează din main, renderer-ul nu pornește programe;
    - teste: protocolul JSON simulat, anularea, erori (lipsă model, fără microfon), scenariu de browser cu un D&TED fals.
12. **[x] v0.9.0 — Motorul de recunoaștere a vorbirii încorporat în Scribner** (whisper.cpp + large-v3-turbo, descărcat din Setări; detalii în docs/DTED.md §7). Rămâne: proba reală pe Windows (descărcare, microfon, NVIDIA).

## Dictare: modelul eek (v0.9.7)

- [x] D&TED modul serviciu: comanda `model`, lista modelelor în `stare` (D&TED 0.4.2)
- [x] Scribner: alegerea modelului în Setări, „Folosit acum”, mesaj pentru D&TED vechi
- [ ] D&TED 0.4.2 publicat (Windows)
- [ ] Motorul încorporat cu un model românesc descărcabil liber (eek cere acces aprobat individual)

## Cereri 25.10.2026 (lista completă, în ordinea în care au venit)

Stare: [x] făcut în v0.9.9 · [~] parțial · [ ] de făcut

1. [x] Fereastra de scris prea îngustă: pagina se lățește trăgând de margini, dublu-clic = toată fereastra.
2. [x] Mărirea textului cât e nevoie: Ctrl+= / Ctrl+- / Ctrl+0, Ctrl+rotiță, zoom în bara documentului.
3. [x] Dictare instalată și activată din prima, fără instalare de fiecare dată (descărcare automată o dată; D&TED folosit dacă există).
4. [x] Mini-player nativ de dictare (F8, 🎙): dictare + citire, fereastră mică mutabilă.
5. [x] Voce de citire (TTS) inclusă, nativă: voce românească „Mihai” (Piper), descărcată singură o dată.
6. [x] Iconiță proprie pentru program, installer, desktop și Start, cu scris „SCRIBNER” sub ea.
7. [x] Comanda MCP generală, fără date personale (fără nume de utilizator, fără carte), aceeași pentru orice client AI (`scribner-mcp.cmd`).
8. [x] Date personale scoase din repo-urile publice (dted: test cu nume; rapoartele ascund orice cale).
9. [ ] Date personale (adrese de email) în scripturile din CCDEW `.claude/helpers` — așteaptă decizia autorului.
10. [~] Interfața 1:1 cu programul clasic de scris, pe toate nivelurile (ferestre, setări, dialoguri intermediare):
    - [x] Inspector pe panouri cu iconițe jos (Note, Semne de carte, Metadate, Snapshot-uri, Comentarii); secțiuni pliabile, doar ce trebuie vizibil
    - [x] Bara de jos a documentului (zoom, cuvinte, caractere, țintă)
    - [x] ▲▼ în bara documentului; corkboard cu bara de comenzi jos; Outline cu coloanele implicite clasice
    - [x] Compile pe trei coloane (formate, așezări de secțiuni, conținut/opțiuni/metadate) + „Editează formatul…”
    - [x] Ținte în panou plutitor cu bare de progres; Statistici manuscris/selecție alăturate
    - [x] Mod compunere cu bara de comenzi la marginea de jos (fundal, poziția paginii, mărime text, lățime, estompare)
    - [x] Bara de formatare implicită mai scurtă
    - [x] Proiect nou: șabloane pe categorii cu fișe; Setările proiectului cu listă verticală
    - [ ] Căutare rapidă în bara de sus cu rezultatele în binder
    - [ ] Bara de sus implicită (Binder, Adaugă, Dosar, vederi, căutare, Referință rapidă, Compunere, Compile, Inspector)
    - [ ] Bara documentului comună pentru ambele panouri (meniul titlului, blocare pe loc)
    - [ ] Comparare și restul ferestrelor: Cuvinte cheie, Colecții, Import/Export, Generator de nume, Referință rapidă, meniuri
11. [x] Mesajul „niciun server MCP Scrivener”: serverul Scribner citește și proiecte .scriv pe loc (`scriv_outline`, `scriv_read`), are prompts și resurse.
12. [x] Import pornind și de la fișierul `.scrivx` (nu doar de la folderul `.scriv`), în aplicație și în MCP; `scriv_search` în proiectul .scriv. Exportul scrie un folder `.scriv` complet (cu `.scrivx` în el).
13. [x] Evaluare MCP după ghidul mcp-builder: `mcp/eval/` (carte de test + 10 întrebări) verificată de `tests/mcpEval.test.js`; adnotări readOnly/destructive pe fiecare unealtă; `read_document` arată și ținta.
14. [ ] Bug-uri rămase din vânătoarea pe niveluri (lista din TODO.md, secțiunea 25.10).
15. [ ] Arhitectura AI pe trei straturi (propunerea din 25.10), ce lipsește față de ce există deja:
    - există: panou AI lateral, AI pe selecție cu Accept/Respinge, cercetare în proiect (RAG), server MCP complet, furnizori locali (Ollama, LM Studio) și în cloud
    - [ ] diff vizual roșu/verde la propunerile AI (acum: text propus + Accept/Respinge)
    - [ ] Ctrl+K inline: casetă de comandă AI în editor (Ctrl+K e acum „împarte”; altă tastă)
    - [ ] căutare hibridă lexicală + semantică (embeddings locale) în cercetarea din proiect
    - [ ] Scribner ca client MCP (servere externe: bibliografie, dicționare) pentru asistentul intern
    - [ ] unealtă MCP de adnotare pe interval exact de caractere (acum: comentariu după citat)
16. [x] MCP pe cele cinci categorii: unelte (cu adnotări), resurse (proiecte, binder, documente, ghid), șabloane de lucru, transport prin rețea (`--http` cu token), securitate (doar citire, snapshot înainte de scriere, blocări, căi ascunse refuzate, adrese locale blocate la import web).
17. [x] Agentul AI ca orchestrator, Scribner ca execuție: documentat în `docs/MCP_ARHITECTURA.md`; date private împachetate/rehidratate local (`--anonymize`).

## Clonare în detaliu, funcție cu funcție (audit 25.10.2026, 48 de puncte)

Grupuri de lucru (în paralel, câte un grup pe fișiere separate):
- **G0 Snapshot-uri** [~]: + / −, sortare Dată/Titlu, redenumire, comparare cu ◀ ▶ și între două snapshot-uri, „Revino la acesta” cu confirmare, Snapshot cu titlu (Ctrl+Shift+5), Manager de snapshot-uri, snapshot la salvarea manuală, semn în binder.
- **G1 Meniuri și scurtături** [~] (rămâne: lista ferestrelor deschise; Fixează pe loc făcut în G5): meniuri Inserare, Format, Fereastră separate; Editare completă (Anulează/Refă, Lipește potrivind stilul, Copiere specială, Transformări, submeniu Găsește); Găsește următorul/anteriorul; Mergi la ca submeniu cu tot binder-ul (favorite sus); Vizualizare: Mașină de scris, Caractere invizibile, Pagină, Fixează pe loc, Bara antet/subsol, Culoarea etichetei în…; Mod revizie în Format (punctele 1–4, 7–10, 31, 39).
- **G2 Binder, colecții, etichete, cuvinte cheie** [ ]: meniul contextual complet (Adaugă la colecție, Convertește, Schimbă iconița, Tip secțiune, Sortează, Grupează, Copiază legătura, Snapshot, Arată în Explorer); „Culoarea etichetei în” binder/fișe/Outline/iconițe; colecții: redenumire pe tab, tab permanent Rezultatele căutării, tragere pe tab; cuvinte cheie ca arbore cu tragere pe documente și fișe; benzi de culoare pe fișe; hoist fără ieșire automată; Outline cu sinopsis sub titlu și culoarea etichetei (punctele 5, 11–22, F).
- **G3 Inspector, editor, text** [x]: Comentarii și note de subsol într-o singură listă în ordinea textului, cu + Comentariu / + Notă și note editabile; comentariu pe cuvântul de sub cursor; culoarea implicită a comentariilor; semne de carte Document/Proiect în același panou; subsol „Cuvinte: 37 din 1.234”; culorile reviziilor în Setări; spațiere 1,0/1,2/1,5/2,0/2,5/3,0/Alta; Scrivenings fără titluri implicit (punctele 23–32, 35).
- **G4 Import, export, backup, șabloane, generator de nume** [ ]: Importă și împarte (separator #, primul rând ca titlu); titlu și conversie la importul web; OPML cu note; backup la deschidere/la salvare/cu dată în nume/zip, păstrează 5; Salvează ca șablon în Fișier și Opțiuni în fereastra de șabloane; generator de nume cu mai multe origini, raritate, nume duble, inițiale (punctele 44–48, G).
- **G5 Mai mari, runda următoare** [~] (rămâne: căutarea din bara de sus cu rezultatele în binder și opțiuni (6)): [x] panoul de stiluri lateral (33): Format › Stiluri › Panou de stiluri, clic aplică, stilul curent marcat, + din selecție, redenumire, ștergere; [x] Fixează pe loc pe fiecare panou (36): lacăt în antetul fiecărui panou și Vizualizare › Fixează pe loc, binder-ul deschide în panoul liber; [x] istoric înapoi/înainte pe panou cu listă (38); [x] panou Focus lingvistic (40, în G6); [x] riglă cu indentări și tab-uri trase (34), aplicată paragrafelor selectate și la Compile DOCX/PDF; [x] pagina la mărimea din Page Setup (43, în G6).

## Ferestre și funcții lipsă (audit 2)

Inventar al ferestrelor, panourilor, dialogurilor și funcțiilor programului clasic de scris (ediția 3 pentru Windows), comparat cu `src/` și `lib/`. Stare: [x] există · [~] parțial · [ ] lipsește. Grupurile G1–G5 de mai sus (meniuri, binder, Inspector, import/export) nu se repetă aici.

**Există deja** (verificat în cod): Configurare pagină (hârtie, orientare, margini, antet/subsol, aplicată la Tipărire, Previzualizare și PDF); Ciorne (Scratchpad) cu „Trimite în proiect”; Istoricul scrisului pe zile și luni (`history.json`, unealta MCP `writing_history`); Statistici proiect/selecție; Ținte proiect și sesiune; Referință rapidă (mai multe ferestre); Layout-uri: salvare, aplicare, gestionare; Mod scenariu (scenariu, piesă de teatru US/UK, bandă desenată, radio) cu Tab/Enter, completare de personaje și de antete de scenă; Corecție automată (listă în Setări, corecturi învățate); Șabloane de document (dosar de șabloane → Nou din șablon) și șabloane de proiect; Metadate personalizate, Tipuri de secțiune, Etichete, Stări; Semne de carte; Împarte / Unește documente; Tabele și liste; Note de subsol, comentarii, adnotări; Stiluri; Teme de aspect; Sincronizare cu dosar extern; Snapshot-uri cu manager; Colecții; Favorite; Căutare în proiect, căutare avansată, înlocuire în proiect; Dicționar/sinonime (căutare externă); Ecran complet / Compunere cu bara de opțiuni; Mașină de scris; Etichete de substituție (ajutor); Compile cu designer de format; Import/Export (DOCX, RTF, ODT, OPML, Fountain, FDX, LaTeX, EPUB, folder `.scriv`); Generator de nume; Backup.

### G6 Pagină și vizualizare
- [x] Vedere pagină la mărimea din Configurare pagină (hârtie, orientare peisaj, margini), comanda „Vedere pagină la mărimea din Configurare pagină”; până acum vederea pagină avea doar A5/A4/Letter fixe
- [x] Focus lingvistic ca fereastră plutitoare (substantive, verbe, adjective, adverbe, conjuncții, oprit, limba, estompare); până acum doar submeniu
- [x] Numerotarea rândurilor în editor (Vizualizare › Numere de rând: fiecare rând vizual numerotat într-o margine, nu se tipărește și nu intră în Compile)
- [x] Zoom independent pe fiecare panou al editorului împărțit (subsol cu zoom pe fiecare panou, Ctrl+rotiță și Zoom +/− pe panoul activ, păstrat separat)

### G7 Inserare și text
- [x] Caractere speciale (Inserare): tabel pe categorii (punctuație, diacritice, matematică, monede, simboluri, săgeți, greacă, spații speciale), cod Unicode, inserare la cursor
- [x] Listă de completare automată (Proiect) + Ctrl+Space în editor
- [x] Ecuații (Inserare › Ecuație…: LaTeX cu previzualizare MathML în timp real, convertor propriu fără dependențe; se inserează ca imagine cu LaTeX-ul păstrat, dublu-clic o redeschide)
- [x] Copiază / lipește formatarea și rigla (pensula de format): paragraf + caractere; fără selecție se aplică pe cuvântul de sub cursor
- [ ] Iconițe personalizate pentru documente (Schimbă iconița e în G2)

### G8 Metadate și organizare
- [x] Panou plutitor de cuvinte cheie (HUD): filtrare, culoare, număr de documente, dublu-clic/Aplică pune sau scoate cuvântul pe documentele selectate
- [~] Căutare rapidă în bara de sus (rămâne în G5)

### G9 Sincronizare și altele
- [ ] Sincronizare cu aplicația mobilă (prin dosar în cloud): există doar sincronizarea cu un dosar extern
- [ ] Verificare de actualizări din Ajutor (există opțiunea în Setări, fără fereastră proprie)
- [ ] Înregistrare/licență (nu se aplică: program liber)

## Paritate în adâncime, fereastră cu fereastră (audit 3)

Audit opțiune cu opțiune, făcut pe codul din `src/components/`, `src/extensions/` și `lib/`, față de manualul programului clasic (ediția 3 pentru Windows). Auditurile 1 și 2 au marcat ferestrele ca „prezente” după nume; aici fiecare control al ferestrei clasice e căutat în componenta Scribner. Legendă: rândul **Identic** adună controalele care există cu același comportament (un control = un element între virgule); fiecare casetă e un element **parțial** (cu diferența spusă) sau **lipsă**. Totalurile sunt în tabelul de la final, apoi prioritățile și pachetele de lucru.

### A1. Opțiuni: General (`SettingsDialog.jsx`, panoul `general`)
**Identic:** redeschide ultimul proiect la pornire, salvare automată după N secunde de inactivitate, caută actualizări, verificare automată a actualizărilor.
- [ ] **parțial** Salvare automată: doar pragul de inactivitate; lipsește „salvează oricum la fiecare N minute”.
- [ ] **lipsă** „La pornire arată fereastra de șabloane / proiect nou” ca alegere separată de redeschiderea ultimului proiect.
- [ ] **lipsă** „Redeschide toate proiectele deschise la închidere” (nu doar ultimul).
- [ ] **lipsă** Buton „Resetează avertizările ascunse” (toate „Nu mai arăta” reactivate).
- [ ] **lipsă** Folder implicit pentru proiectele noi.
- [ ] **lipsă** Managerul de bibliografie extern (aplicația deschisă de „Inserează citare”, F4).
- [ ] **lipsă** „Fereastra de șabloane rămâne pe ultima categorie aleasă”.
- [ ] **parțial** Ținta cărții și a sesiunii sunt aici și în fereastra Ținte; în clasic stau doar în Ținte. Dublura trebuie unificată cu `TargetsDialog.jsx`.
- [ ] **lipsă** „Arată numărul de cuvinte al selecției în bara de stare” ca opțiune (acum mereu).
- [ ] **lipsă** Mărimea implicită a ferestrei și „Pornește maximizat”.

### A2. Opțiuni: Aspect (Appearance), cu toate sub-secțiunile
**Identic:** temă (ca sistemul, luminoasă, întunecată, sepia), aspect interfață clasic/modern, culoare de accent, culoarea comentariilor, culorile celor 5 runde de revizie, fontul editorului, mărimea textului în editor, interlinie, lățimea paginii, mărimea textului în binder.
- [x] **lipsă** Teme de culori salvabile: „Salvează tema”, „Încarcă tema”, export/import fișier de temă. (făcut în P5)
- [x] **lipsă** Binder: culoarea fundalului, culoarea textului, rânduri alternante colorate. (făcut în P5)
- [x] **lipsă** Binder: unde apare culoarea etichetei (pe rând întreg / pe icoană / punct). (făcut în P5)
- [x] **lipsă** Binder: font separat pentru dosare (bold) și pentru documentele cu copii. (făcut în P5: stil aldin/cursiv pentru dosarele și documentele cu copii)
- [x] **lipsă** Binder: fontul (familia), nu doar mărimea. (făcut în P5)
- [x] **parțial** Editor: culorile vin doar din temă + accent; lipsesc culoarea fundalului editorului, a textului, a selecției, a cursorului. (făcut în P5)
- [x] **lipsă** Editor: culoarea paginii și a zonei din jurul paginii în Vedere pagină. (făcut în P5)
- [x] **lipsă** Editor: culoarea și opacitatea liniei curente evidențiate. (făcut în P5)
- [x] **lipsă** Editor: culori pentru legăturile interne vs externe. (făcut în P5)
- [x] **lipsă** Editor: culoarea blocurilor „Păstrează formatarea”. (făcut în P5)
- [x] **lipsă** Editor: culoarea marcajelor rezultatelor de căutare. (făcut în P5: culoarea rezultatului curent din bara de căutare)
- [x] **lipsă** Corkboard: fundal (plută, lemn, culoare, imagine proprie), culoarea fișelor, culoarea titlului fișei. (făcut în P5)
- [x] **lipsă** Corkboard: fontul titlului și fontul sinopsisului pe fișe. (făcut în P5)
- [x] **lipsă** Outliner: rânduri alternante, culoarea grilei, culoarea rândurilor de dosar, fonturi titlu/sinopsis. (făcut în P5)
- [x] **parțial** Compunere: fundal, lățime, opacitate, aliniere, pagină de hârtie există; lipsesc culoarea textului, culoarea paginii, culoarea barei de control. (făcut în P5)
- [x] **lipsă** Scenariu: culorile elementelor de scenariu în editor. (făcut în P5)
- [x] **lipsă** Inspector: fontul și fundalul notelor, fontul sinopsisului. (făcut în P5)
- [x] **lipsă** Scrivenings: fontul titlurilor de document și aspectul separatorului dintre documente (culoare, stil linie). (făcut în P5)
- [x] **lipsă** Margine de adnotări: font și mărime pentru comentarii și note de subsol. (făcut în P5)
- [x] **lipsă** Mărimea icoanelor din bara de instrumente / densitate compactă. (făcut în P5)
- [x] **lipsă** „Implicit” pentru fiecare culoare în parte cu previzualizare (există doar la accent și comentarii). (făcut în P5)

### A3. Opțiuni: Corkboard
**Identic:** formă rotunjită/pătrată, fișe liniate, umplere cu culoarea etichetei, mărime mică/medie/mare, proporție, spațiere, coloane automate (toate în bara panoului, pe proiect).
- [ ] **parțial** Opțiunile există doar în bara corkboard-ului, pe proiect; lipsesc ca implicite globale în Opțiuni.
- [ ] **lipsă** Ștampila de status pe fișă, cu opacitate reglabilă.
- [ ] **lipsă** Eticheta afișată ca pin colorat / bandă (acum doar umplere completă).
- [ ] **lipsă** Icoana tipului de document pe fișă.
- [ ] **lipsă** Numărul de cuvinte / ținta pe fișă.
- [ ] **lipsă** Cuvintele-cheie ca pătrățele colorate pe marginea fișei.
- [ ] **lipsă** Număr maxim de rânduri de sinopsis (trunchiere).
- [ ] **lipsă** Corkboard liber: „Aliniază la grilă”, mărimea grilei, „Arată grila”.
- [ ] **lipsă** „Arată imaginea în loc de sinopsis” ca implicit global.
- [ ] **lipsă** Mai multe dosare selectate: fișele lor pe același panou, grupate sau una după alta.

### A4. Opțiuni: Compunere (Compose)
**Identic:** fundal culoare/imagine, încadrare/repetare imagine, lățimea textului, opacitatea paginii, aliniere, pagină de hârtie, ținte afișate.
- [x] **lipsă** Bara de control: ascundere automată și întârzierea apariției. (făcut în P5)
- [x] **lipsă** Alegerea monitorului / fundal pe monitorul al doilea. (făcut în P5: ecran complet pe monitorul ales; fundalul pe al doilea monitor rămâne de făcut)
- [x] **lipsă** Zoom propriu al textului în compunere (separat de editor). (făcut în P5)
- [x] **lipsă** Margini interne ale paginii (sus/jos/lateral). (făcut în P5)
- [x] **parțial** Inspectorul în compunere există ca buton; lipsesc opacitatea lui și alegerea taburilor. (făcut în P5)
- [x] **lipsă** Mașină de scris pornită automat în compunere, separat de editor. (făcut în P5)
- [x] **lipsă** „Arată bara de derulare” și „Ascunde cursorul mouse-ului când scriu”. (făcut în P5)

### A5. Opțiuni: Editare / Opțiuni
**Identic:** defilare tip mașină de scris, caractere invizibile, vizualizare implicită (editor/corkboard/outline), legătură înapoi automată.
- [x] **lipsă** Mașină de scris: poziția rândului (procent din înălțime), nu doar mijlocul. (făcut în P5)
- [x] **lipsă** Evidențierea rândului curent (opțiune). (făcut în P5)
- [ ] **lipsă** Lățimea cursorului și clipirea lui.
- [ ] **lipsă** Spațiu suplimentar după finalul documentului (derulare dincolo de final).
- [ ] **lipsă** Zoom implicit al editorului pentru documentele deschise.
- [ ] **lipsă** Titlul implicit al documentelor noi.
- [ ] **lipsă** Închiderea automată a parantezelor și ghilimelelor.
- [ ] **parțial** Completare automată: lista e pe proiect; lipsesc opțiunile „propune după N litere” și „include titlurile documentelor”.
- [ ] **lipsă** „Selectează cuvinte întregi la tragere”.

### A6. Opțiuni: Editare / Formatare
**Identic:** font implicit, mărime, interlinie, indentarea primei linii, spațiu după paragraf.
- [ ] **parțial** Lipsește mini-editorul cu riglă pentru formatarea implicită: aliniere, indent stânga/dreapta, spațiu înainte, tab-uri.
- [ ] **lipsă** Font separat pentru notițe (notele documentului și ale proiectului).
- [ ] **lipsă** Font implicit pentru notele de subsol și comentarii.
- [ ] **lipsă** „Aplică formatarea implicită textului lipit”.
- [ ] **lipsă** „Convertește documentele existente la formatarea implicită” pe tot proiectul (există pe document, în bara de format).
- [ ] **lipsă** Unități de măsură pentru riglă și indent (cm / in / pt).

### A7. Opțiuni: Editare / Revizii
**Identic:** culorile celor 5 runde.
- [ ] **lipsă** Ștergerile în modul revizie apar tăiate în culoarea rundei (în loc să dispară).
- [ ] **lipsă** Nume editabile pentru runde.

### A8. Opțiuni: Partajare (Import, Export, Sincronizare)
**Identic:** formatul implicit la export fișiere, păstrează dosarele, include notele, include metadatele, sincronizare cu folder extern, formatul fișierelor sincronizate, sincronizează notele, la deschidere, la închidere.
- [ ] **lipsă** Import: „Convertește textul importat la formatarea implicită”.
- [ ] **lipsă** Import: paginile web se importă ca text / PDF / arhivă (alegere).
- [ ] **lipsă** Import OPML: textul nodului merge în sinopsis sau în text.
- [ ] **lipsă** Import Word: notele de subsol rămân inline sau devin note legate.
- [ ] **lipsă** Export: notițele în format separat de text.
- [ ] **lipsă** Export: comentariile și notele de subsol ca note Word sau ca text.
- [ ] **parțial** Sincronizare: lipsesc „prefix cu numărul de ordine”, „doar documentele dintr-o colecție”, „sincronizează și Cercetarea”, „formatul fișierelor de cercetare”.
- [ ] **lipsă** Sincronizare cu aplicația mobilă prin dosar în cloud (vezi și G9).
- [ ] **lipsă** Verificare periodică a fișierelor externe modificate.

### A9. Opțiuni: Comportamente (Behaviors)
**Identic:** Enter în binder (editează / document nou), dublu-clic în binder (redenumește / Quick Reference), snapshot la salvarea manuală.
- [ ] **lipsă** Dublu-clic pe dosar: expandează / deschide în corkboard / în outliner.
- [ ] **lipsă** Vizualizarea implicită diferită pentru dosare și pentru documente cu copii.
- [ ] **lipsă** Selecția multiplă în binder se afișează ca Scrivenings / corkboard / outliner (alegere).
- [ ] **lipsă** Documentele cărora li se adaugă copii devin dosare automat (opțiune).
- [ ] **lipsă** Tragerea din binder în editor creează legătură / inserează textul / inserează imaginea.
- [ ] **lipsă** Legăturile interne se deschid în panoul curent / celălalt panou / Quick Reference.
- [ ] **lipsă** Semnele de carte se deschid în Quick Reference sau în editor (alegere).
- [ ] **lipsă** Confirmare la golirea coșului (opțiune).
- [ ] **lipsă** Documentele fără titlu primesc prima linie ca titlu.
- [ ] **lipsă** Sunet la atingerea țintei.

### A10. Opțiuni: Backup
**Identic:** la închidere, la deschidere, la salvarea manuală, la N minute, ZIP, data în nume, păstrează ultimele N, folder de backup, alege folder, folder implicit.
- [ ] **lipsă** Buton „Deschide folderul de backup”.
- [ ] **lipsă** Buton „Fă backup acum” în panoul de Opțiuni (comanda există în meniu).

### A11. Opțiuni: Corecturi / Corecție automată
**Identic:** ghilimele automate, liniuță din --, elipsă din trei puncte, fracții, majusculă la început de propoziție, limbi pentru corector, înlocuiri automate, învățarea corecturilor, dicționar personal.
- [ ] **lipsă** Corectează DOuă MAjuscule la început de cuvânt.
- [ ] **lipsă** Majusculă pentru numele zilelor (pentru limbile care o cer).
- [ ] **lipsă** Corectează apăsarea accidentală a Caps Lock.
- [ ] **lipsă** Excepții la majuscula automată (abrevieri: „dr.”, „etc.”, „nr.”).
- [ ] **lipsă** Verificarea ortografiei în timp ce scrii: pornit/oprit global.
- [ ] **lipsă** Verificarea gramaticii ca opțiune separată.
- [ ] **lipsă** Ignoră cuvintele scrise cu MAJUSCULE, cele cu cifre și adresele web.
- [ ] **lipsă** Alegerea perechii de ghilimele („…”, "…", «…», ‚…’) și a celor simple.
- [ ] **lipsă** Lista de înlocuiri: import/export fișier.

### A12. Opțiuni: Tastatură (`ShortcutsDialog.jsx`)
**Identic:** scurtătură proprie pentru fiecare comandă, editare.
- [ ] **lipsă** Salvare/încărcare set de scurtături în fișier.
- [ ] **lipsă** Căutare comandă după scurtătură.
- [ ] **parțial** Conflictele sunt semnalate; lipsește „Înlocuiește scurtătura existentă” într-un pas.
- [ ] **lipsă** Resetare individuală la implicit.

### A13. Opțiuni: Navigare (Navigation)
- [ ] **lipsă** Panoul întreg lipsește (nu există tab `navigation` în `TABS`).
- [ ] **lipsă** Editor împărțit: ce selectez în corkboard/outliner se deschide în celălalt panou.
- [ ] **lipsă** Selecția din corkboard/outliner se reflectă în binder.
- [ ] **lipsă** Poziția cursorului ținută la schimbarea documentului: opțiune (acum mereu).
- [ ] **lipsă** Taste în outliner: Enter = rând nou / editează; Tab = mută la dreapta.
- [ ] **lipsă** Quick Reference: fereastră mereu deasupra.
- [ ] **lipsă** Restaurarea aranjamentului ferestrelor la deschiderea proiectului: opțiune.

### B. Setări proiect, toate taburile (`ProjectSettingsDialog.jsx`)
**Identic:** etichete (nume, culoare, ordine, adaugă, șterge), statusuri (nume, ordine, adaugă, șterge), metadate proprii (text, text pe mai multe rânduri, bifă, listă cu opțiuni, dată, valoare implicită, titlul coloanei), tipuri de secțiune (adaugă, șterge, tip implicit după nivel), formatare implicită pe proiect, listă de completare automată, foldere speciale (șabloane, importuri, scratchpad), autor (nume, prenume, completare), titlu prescurtat, subtitlu, backup pe proiect (excludere, la închidere, la N minute).
- [x] **P10** Etichete: titlul câmpului redenumibil („Etichetă” → „Punct de vedere”) folosit apoi în Inspector și Outliner (`project.labelTitle`, `labelTitleOf`).
- [x] **P10** Etichete și statusuri: valoare implicită pentru documentele noi (`defaultLabel`/`defaultStatus`, urmează redenumirea/ștergerea; `newNodeDefaults` în App și `store.newNode(…, project)`; și valorile implicite ale metadatelor proprii).
- [x] **P10** Statusuri: titlul câmpului redenumibil (`project.statusTitle`).
- [x] **P10** Metadate proprii: alinierea coloanei (stânga/centru/dreapta, `field.align`) și încadrarea textului (`wraps`, câmp pe mai multe rânduri în Inspector). Folosirea alinierii în coloanele Outliner rămâne pentru pachetul Outliner.
- [x] **P10** Metadate proprii: tip „număr” cu sortare numerică (valoarea se salvează ca Number; Outliner compară numerele ca numere; `compareCustomValues`).
- [x] **P10** Tipuri de secțiune: tabel pe niveluri 1–4 × dosar / document cu copii / document simplu + „celelalte niveluri” (`sectionTypeDepths`, `sectionTypeIdFor`). De legat în `lib/compile.cjs` (azi citește doar `sectionTypeLevels`).
- [x] **P10** Proprietățile proiectului: limba principală (`project.language`). De legat la corector și compile (fișiere în afara P10).
- [x] **P10** Proprietățile proiectului: editura, ISBN, adresă, drepturi (`publisher`, `isbn`, `address`, `rights`).
- [x] **P10** Tab „Icoane”: icoane proprii (importă imagine, redenumește, șterge; alegere în Inspector ca `icon:<id>`). Afișarea lor în binder rămâne pentru pachetul Binder.
- [x] **P10** Dosarul destinație pentru „Adaugă selecția la document” / note primite din alte aplicații (exista deja: `inboxFolder`, folosit de Scratchpad).
- [x] **P10** Formatare implicită: „folosește setarea globală” (anularea suprascrierii pe proiect), panou nou `DefaultFormatPane.jsx` cu riglă (indent prima linie / stânga / dreapta), aliniere, spațiu înainte/după, font pentru notițe și note de subsol.
- [x] **P10** Export/import al etichetelor, statusurilor, metadatelor și tipurilor de secțiune pentru alt proiect (fișier `.meta.json`).

### C. Configurare pagină (`PageSetupDialog.jsx`)
**Identic:** hârtie (A4, Letter, Legal, personalizat), lățime/înălțime, orientare portret/peisaj, margini sus/jos/stânga/dreapta, antet stânga/centru/dreapta, subsol stânga/centru/dreapta, fără antet pe prima pagină, substituenți, mărime pt, spațiere rânduri, previzualizare tipărire.
- [ ] **lipsă** Butonul „Imprimantă…”: alegerea imprimantei și a tăvii.
- [ ] **lipsă** Scalare la tipărire (%).
- [ ] **lipsă** Setări de tipărire pe tip de vedere: document (titluri, sinopsis, note), corkboard (fișe pe pagină, chenare, culori), outline (coloane).
- [ ] **lipsă** Tipărirea fișelor din corkboard ca fișe reale 3×5 / 4×6 cu linii de tăiere.
- [ ] **lipsă** Margini în oglindă la tipărirea directă (există doar în Compile).
- [ ] **parțial** Antet/subsol: lipsesc fontul propriu și distanța față de marginea paginii.

### D1. Compile: fereastra de ansamblu (`CompileDialog.jsx`, `lib/compileFormats.cjs`)
**Identic:** formate de ieșire (Word, ODT, EPUB, HTML, Markdown, MultiMarkdown, LaTeX, Fountain, Final Draft, text simplu, PDF prin tipărire), „compilează pentru”, sursă (tot manuscrisul, dosar, selecție, colecție), filtre după etichetă și stare, atribuirea așezărilor pe tip de secțiune, cuprins, copertă din Cercetare, pagină de titlu automată, materie de început, formate globale și ale proiectului, duplicare/ștergere format, previzualizare.
- [x] **parțial** Formate predefinite puține; lipsesc echivalentele: manuscris standard (Courier), manuscris (Times), roman tipărit (paperback), roman cu părți numerotate, non-ficțiune, povestire, scenariu de film, piesă de teatru, scenariu BD, scenariu radio, poezie, e-book ficțiune, exemplar de corectură. *Făcut (P1): 10 formate noi (roman cu părți, non-ficțiune, povestire, scenariu de film, piesă de teatru, scenariu BD, scenariu radio, poezie, e-book ficțiune, exemplar de corectură) lângă manuscris Courier/Times și paperback; cele de scenariu spun ieșirea pentru care sunt gândite.*
- [x] **lipsă** Lista „Conținut” în fereastră cu bifa „Include”, „Pagină nouă înainte” și tipul secțiunii editabile pe fiecare rând.
- [x] **lipsă** Filtru invers („exclude ce corespunde”) și filtru după cuvinte-cheie / căutare salvată.
- [x] **lipsă** Materie de final (back matter), simetric cu materia de început.
- [x] **lipsă** Materie de început aleasă diferit pe tip de ieșire (PDF vs EPUB); la fel materia de final.
- [x] **lipsă** „Deschide fișierul după compilare” (în aplicația implicită).
- [x] **lipsă** Import/export al unui format de compile ca fișier (`.scribcompile`).
- [x] **lipsă** RTF ca ieșire de Compile (există doar la Export).
- [x] **parțial** PDF = tipărire Chromium din HTML; lipsesc controlul rupturilor de pagină (văduve/orfane), încorporarea fonturilor alese, numerotarea cu cifre romane în front matter. *Făcut (P1): văduve/orfane și titlu legat de text (CSS + Word), fonturi încorporate (PDF/HTML/EPUB/Word), materia de început pe pagini proprii numerotate i, ii, iii (PDF și Word), corpul de la 1.*

### D2. Compile / designer: Separatoare
**Identic:** separator între secțiuni de același tip, între tipuri diferite, separator înainte (rând gol, pagină nouă, text propriu, nimic).
- [ ] **parțial** Clasicul are patru reguli (text-text, dosar-dosar, dosar-text, text-dosar) și reguli pe tip de secțiune; Scribner are două (același tip / tip diferit).
- [ ] **lipsă** Ruptură de secțiune Word (secțiune nouă, începe pe pagină impară).
- [ ] **lipsă** Separator decorativ ales din listă (#, *, ⁂, linie) cu aliniere.

### D3. Compile / designer: Așezări de secțiune (Section Layouts)
**Identic:** listă de așezări, arată titlul, arată textul, prefix, sufix, litere (normale / MAJUSCULE / Majuscule / majuscule mici), aliniere titlu, pagină nouă înainte.
- [ ] **lipsă** Miniatura fiecărei așezări în listă (cum arată secțiunea).
- [ ] **lipsă** Conținut suplimentar per așezare: sinopsis, note, metadate (etichetă, status, cuvinte-cheie) înainte sau după text.
- [ ] **lipsă** Formatarea titlului per așezare: font, mărime, spațiu înainte/după, stil.
- [ ] **lipsă** Primul paragraf: primele N cuvinte cu majuscule mici; majusculă inițială mare (drop cap).
- [ ] **lipsă** Indentarea primului paragraf per așezare (există doar global „fără alineat după titluri”).
- [ ] **lipsă** „Pagină nouă după” și „începe pe pagina din dreapta”.
- [ ] **lipsă** „Suprascrie formatarea textului” vs „păstrează formatarea din editor” per așezare.
- [ ] **lipsă** Text pe coloane per așezare.

### D4. Compile / designer: Stiluri
- [ ] **parțial** Stilurile din editor ajung în DOCX; lipsește tabul care redefinește un stil doar la ieșire (font, mărime, culoare, indent).
- [ ] **lipsă** „Elimină stilul X la compilare” (textul rămâne, stilul cade).
- [ ] **lipsă** Corespondența stil → stil Word / clasă CSS în EPUB/HTML, explicită.

### D5. Compile / designer: Prefix și sufix de titlu
**Identic:** prefix, sufix, substituenți de numerotare de bază.
- [ ] **lipsă** Prefix pe mai multe rânduri cu formatare proprie (ex. „Capitolul unu” centrat, alt font, apoi titlul).
- [ ] **parțial** Numerotări: lipsesc numerele scrise în litere, cifrele romane mari/mici, literele (a, b, c) și contoarele cu nume separate.

### D6. Compile / designer: Opțiuni de text
**Identic:** ghilimele inteligente, două cratime → linie de dialog, elimină culorile textului, elimină evidențierile, legăturile interne devin text, comentarii Word, revizii ca modificări urmărite.
- [ ] **lipsă** Italic → subliniat (manuscris standard) și invers.
- [ ] **lipsă** Elimină spațiile duble și spațiile de la sfârșitul paragrafelor.
- [ ] **lipsă** Ghilimele inteligente → drepte; elipsa → trei puncte.
- [ ] **lipsă** Elimină textul tăiat / ștergerile din revizii.
- [ ] **lipsă** Elimină legăturile externe (textul rămâne).

### D7. Compile / designer: Înlocuiri
**Identic:** caută, înlocuiește cu, regex, majuscule, cuvânt întreg, doar în text.
- [ ] **lipsă** Domeniu pe înlocuire: doar titluri / doar text / peste tot.
- [ ] **lipsă** Bifă de activare pe fiecare înlocuire și reordonare.

### D8. Compile / designer: Transformări
**Identic:** majuscule mici pentru text marcat, fără alineat după titluri.
- [ ] **lipsă** Convertește la text simplu (fără formatare).
- [ ] **lipsă** Spațiu de nedespărțit înainte de semnele duble de punctuație (pentru franceză).
- [ ] **lipsă** Blocurile „Păstrează formatarea” tratate ca bloc de cod / citat în Markdown.

### D9. Compile / designer: Note de subsol și comentarii
**Identic:** note de subsol, note la finalul capitolului, note la finalul cărții, numerotare, repornirea numerotării, comentarii Word.
- [ ] **lipsă** Comentariile ca note de subsol / eliminate / ca text între paranteze (alegere).
- [ ] **lipsă** Formatul numerelor de notă (1, i, *, a) și al marcajului în text.
- [ ] **lipsă** Titlul și stilul secțiunii de note de final.
- [ ] **lipsă** Tratament diferit pentru notele inline și cele legate.

### D10. Compile / designer: Setări de pagină
**Identic:** hârtie, lățime/înălțime, margini, margini în oglindă, prima pagină fără antet, spațiere.
- [ ] **lipsă** Numerotarea paginilor începe de la N; cifre romane pentru materia de început. *Cifrele romane: făcute în P1 (D1); rămâne „începe de la N”.*
- [ ] **lipsă** Spațiu de legătură (gutter).
- [ ] **lipsă** Pagina de titlu fără număr (separat de „prima pagină fără antet”).
- [ ] **lipsă** Coloane de text pe pagină.

### D11. Compile / designer: Antete și subsoluri
**Identic:** antet și subsol (stânga/centru/dreapta), număr de pagină, substituenți.
- [ ] **lipsă** Antet diferit pe paginile pare și impare.
- [ ] **lipsă** Antet diferit (sau absent) pe prima pagină a fiecărui capitol.
- [ ] **lipsă** Titlul capitolului curent în antet (running head).
- [ ] **lipsă** Font și mărime proprii pentru antet/subsol.

### D12. Compile / designer: Statistici
- [ ] **lipsă** Tabul care stabilește cum se numără pentru substituenții de cuvinte (rotunjire la 100/1000, cu sau fără titluri).

### D13. Compile / designer: Substituenți
**Identic:** substituenții de bază documentați în ajutor (titlu, autor, numerotare).
- [ ] **parțial** Lipsesc: titlul prescurtat, data compilării cu format, numărul de cuvinte rotunjit, pagina curentă/totală, eticheta, statusul, cuvintele-cheie, câmpurile de metadate proprii, includerea unei imagini și a altui document.
- [ ] **lipsă** Previzualizarea valorii unui substituent în dialog.

### D14. Compile / designer: Metadate
**Identic:** titlu, autor, editura, identificator (ISBN), subiecte.
- [ ] **lipsă** Limba, data publicării, descriere, drepturi, serie și numărul în serie.
- [ ] **lipsă** Metadate YAML pentru ieșirile Markdown.

### D15. Compile / designer: Setări de scenariu (Script settings)
- [ ] **lipsă** Alegerea formatului de scenariu la compile, cu corespondența element → stil de ieșire.
- [ ] **lipsă** „(CONT'D)” / „(MORE)” automate la ruperea dialogului pe pagini.

### D16. Compile / designer: alte secțiuni
- [x] **parțial** Cuprins: doar bifă; lipsesc titlul cuprinsului, adâncimea, punctele de conducere și stilul. *Făcut (P1): titlu, 1–3 niveluri (și în navigarea EPUB), numere de pagină cu puncte de conducere în Word (PAGEREF actualizat la deschidere); în PDF cuprinsul are legături, fără numere de pagină (Chromium nu le calculează).*
- [ ] **lipsă** E-book: CSS propriu, împărțirea în fișiere, imaginea de copertă separată de text.
- [ ] **lipsă** HTML: CSS propriu, un fișier sau mai multe.
- [ ] **lipsă** Markdown: stilul titlurilor (# sau subliniat), separatorul notelor.
- [ ] **lipsă** Post-procesare (comandă externă după compile, ex. Pandoc/LaTeX).

### E. Ținte de proiect (`TargetsDialog.jsx`)
**Identic:** ținta manuscrisului, ținta sesiunii, unitate (cuvinte/caractere/pagini), cuvinte pe pagină, termen limită, zile de scris, zile rămase, cuvinte pe zi calculate, resetarea sesiunii (miezul nopții / deschidere / manual), resetare manuală, doar textul inclus în compile, notificare la atingerea țintei, notificare și pentru țintele documentelor.
- [x] **lipsă** „Permite numărări negative” (ștergerile scad din sesiune).
- [x] **lipsă** Sesiunea preia automat ținta pe zi calculată din termen.
- [x] **lipsă** Sesiunea numără textul din toate proiectele deschise.
- [x] **parțial** Fereastra e un dialog; în clasic e un panou mic, plutitor, mereu deasupra, cu cele două bare.

### F. Statistici proiect / text (`StatisticsDialog.jsx`)
**Identic:** domeniu (manuscris compilat, tot proiectul, selecție), cuvinte, caractere cu și fără spații, paragrafe, fraze, pagini tipărite, pagini de carte, minute de lectură, frecvența cuvintelor, lungimea frazelor.
- [x] **lipsă** Sortarea tabelului de frecvență pe coloane și export CSV.
- [x] **lipsă** „Statistici de text” rapide pentru selecție, ca fereastră mică separată.
- [x] **lipsă** Grafic al frecvenței.

### G. Istoricul scrisului (`HistoryDialog.jsx`)
**Identic:** zilnic, lunar, manuscris / tot proiectul, cuvinte, caractere, medie pe zi, zile cu scris, zile la rând, grafic pe 30 de zile.
- [x] **lipsă** Export CSV.
- [x] **lipsă** Cuvinte adăugate și șterse separat (brut / net).
- [x] **lipsă** Interval de date ales.
- [x] **lipsă** Ștergerea istoricului sau a zilelor selectate.

### H. Scratchpad (`Scratchpad.jsx`)
**Identic:** listă de note, notă nouă, titlu, ștergere, trimite în proiect.
- [x] **lipsă** Fereastră independentă, deschisă și fără proiect, mereu deasupra, cu scurtătură globală.
- [x] **lipsă** Folder pe disc ales de utilizator; notele ca fișiere.
- [x] **parțial** „Trimite în proiect”: lipsesc alegerea proiectului deschis, a dosarului și „Adaugă la documentul selectat”.
- [x] **lipsă** Text formatat în notă (bold, italic).
- [x] **lipsă** Import/export de note.

### I. Ecran complet / Compunere (`CompositionBar.jsx`)
**Identic:** fundal, lățime, opacitatea paginii, poziția textului, salt la document, inspector, numărare cuvinte, ieșire cu Esc.
- [x] **lipsă** Zoom al textului din bara de control.
- [x] **lipsă** Butonul de cuvinte-cheie (HUD) din bară.
- [x] **lipsă** Ținta afișată ca bară de progres în bară.
- [x] **lipsă** Navigare înainte/înapoi între documente din bară.

### J. Scenariu (`extensions/ScriptMode.js`, `lib/scriptFormats.js`)
**Identic:** formate film, teatru, BD, radio, elementele (antet de scenă, acțiune, personaj, paranteză, dialog, tranziție, plan), Tab/Enter spre elementul următor, completare personaje și antete de scenă.
- [ ] **lipsă** Editorul de formate de scenariu: element nou, font, indent, majuscule, spațiu înainte, „Tab duce la”, „Enter duce la”.
- [ ] **lipsă** Salvarea și importul unui format de scenariu ca fișier.
- [ ] **lipsă** Lista de completare a scenariului editabilă (personaje, locații, tranziții) într-o fereastră.
- [ ] **parțial** Indicatorul elementului curent în bara de jos fără sfatul „Tab: …, Enter: …”.

### K. Snapshot-uri (`SnapshotsPane.jsx`, `SnapshotManagerDialog.jsx`)
**Identic:** snapshot cu/fără titlu, listă cu dată și titlu, comparare cu textul curent (cuvânt/frază/paragraf), modificarea următoare/anterioară, revenire cu snapshot de siguranță, redenumire, ștergere, manager pe proiect.
- [x] **lipsă** Comparare între două snapshot-uri oarecare.
- [x] **lipsă** Copierea unei porțiuni din snapshot în document.
- [x] **lipsă** Managerul: sortare pe coloane și „Arată în binder”.

### L1. Căutare / Înlocuire în document (`FindBar.jsx`)
**Identic:** caută, anterior/următor, majuscule, cuvinte întregi, regex, înlocuiește, înlocuiește tot.
- [ ] **lipsă** Mod „Conține / Începe cu / Cuvânt întreg”.
- [ ] **lipsă** Doar în selecție.
- [ ] **lipsă** Istoricul căutărilor.
- [ ] **lipsă** Ignoră diacriticele.

### L2. Căutare și înlocuire în proiect (`AdvancedSearchDialog.jsx`, `FindDialog.jsx`)
**Identic:** domenii (tot, titlu, text, sinopsis, note, cuvinte-cheie, etichete, stări, metadate), oricare cuvânt / toate / expresia exactă / regex, majuscule, cuvinte întregi, include coșul, doar incluse în compile, înlocuire în proiect cu confirmare, salvare ca colecție.
- [ ] **lipsă** Căutare într-un câmp de metadate propriu anume.
- [ ] **lipsă** Rezultatele afișate în binder (lista filtrată în locul arborelui).
- [ ] **lipsă** Previzualizarea fiecărei apariții înainte de înlocuirea în proiect, cu excluderi.
- [ ] **lipsă** Filtre după tipul documentului și după data creării/modificării.
- [ ] **lipsă** Căutare după formatare în tot proiectul (azi `FormatFind.jsx` e pe document).

### M. Colecții (`CollectionsBar.jsx`)
**Identic:** colecție nouă, din selecție, adaugă/scoate selecția, culoare, redenumire, ștergere, căutare salvată.
- [ ] **lipsă** Reordonarea taburilor de colecții.
- [ ] **lipsă** Editarea criteriilor unei căutări salvate.
- [ ] **lipsă** „Compilează colecția” din meniul ei.

### N. Cuvinte-cheie (`KeywordsDialog.jsx`, HUD în `MissingWindows.jsx`)
**Identic:** listă, culoare, redenumire, ștergere, părinte, filtrare, număr de utilizări, unire la redenumire, HUD plutitor cu aplicare pe selecție.
- [ ] **lipsă** Tragerea unui cuvânt-cheie pe documente din binder/corkboard.
- [ ] **lipsă** „Caută documentele cu acest cuvânt-cheie”.

### O. Aranjamente (Layouts)
**Identic:** salvează aranjamentul, aplică, gestionează.
- [x] **parțial** Nu e garantat că se salvează coloanele outliner-ului, modul corkboard și împărțirea editorului; de verificat și completat.
- [x] **lipsă** Export/import al unui aranjament.
- [x] **lipsă** Miniatură în lista de aranjamente.

### P. Quick Reference (`QuickRef.jsx`, 32 de rânduri)
**Identic:** fereastră separată, mai multe ferestre, „deschide în editorul principal”.
- [ ] **lipsă** Bara de format și rigla în fereastră.
- [ ] **lipsă** Inspector în fereastră (sinopsis, note, metadate).
- [ ] **lipsă** Zoom propriu, mereu deasupra.
- [ ] **lipsă** Fișiere de cercetare (imagine, PDF) în Quick Reference.
- [ ] **lipsă** Numărare și țintă în subsolul ferestrei.

### Q. Generator de nume (`NameGeneratorDialog.jsx`)
**Identic:** gen, prenume și/sau nume, origini prenume, origini nume, raritate, inițiale aliterate, nume duble, număr, copiază, copiază lista, inserează, generează din nou.
- [x] **lipsă** Nume care încep cu o literă dată.
- [x] **lipsă** Liste proprii de nume importate din fișier.

### R. Focus lingvistic (`extensions/LinguisticFocus.js`)
**Identic:** substantive, verbe, adjective, adverbe, conjuncții, oprit, limba, estompare.
- [x] **lipsă** Pronume și prepoziții.
- [x] **parțial** Focus pe dialog există în bara de format, nu în fereastra de focus lingvistic.
- [x] **lipsă** Evidențiere colorată în loc de estompare.

### S. Import (`ImportDialog.jsx`, `lib/scrivImport.cjs`)
**Identic:** Word/RTF/ODT/text, Markdown, OPML, pagină web, BibTeX, Zotero, proiect `.scriv`, pachet JSON, Fountain, FDX, împarte la Titlu 1, la Titlu 1 și 2, la rând separator, primul rând ca titlu, modificări urmărite → revizii.
- [ ] **lipsă** Import dosar întreg de pe disc cu structura lui.
- [ ] **lipsă** Import ca document legat (fișier extern, nu copiat).
- [ ] **lipsă** Import HTML local și EPUB.
- [ ] **parțial** Imagini/PDF/media se pot pune în Cercetare, dar dialogul de import nu le listează ca format.
- [ ] **lipsă** Import și împărțire: separatorul păstrat ca titlu al documentului nou.

### T. Export (`ExportDialog.jsx`)
**Identic:** tot proiectul / dosarul curent / selecția, DOCX, RTF, HTML, TXT, Markdown, păstrează structura, note, metadate CSV, outline OPML, revizii ca modificări urmărite.
- [ ] **lipsă** ODT la Export.
- [ ] **lipsă** Snapshot-urile exportate ca fișiere separate.
- [ ] **lipsă** Fișierele de cercetare în formatul original.
- [ ] **lipsă** Alegerea coloanelor la exportul de metadate CSV.

### U. Șabloane de document
**Identic:** dosar de șabloane, document nou din șablon.
- [x] **P10** Substituenți rezolvați la crearea documentului: `<$date>`, `<$time>`, `<$year>`, `<$n>` (numerotare în titlu), `<$title>`, `<$author>`, în titlu, sinopsis, text și notițe.
- [x] **P10** Șablon implicit pentru documentele noi dintr-un dosar anume (Inspector › Semne de carte pe dosar; „Document nou” în acel dosar pornește din șablon).
- [x] **P10** Eticheta, statusul, cuvintele-cheie, metadatele, icoana și tipul de secțiune se copiază din șablon (statusul lipsea; `nodeFromTemplate`, testat).

### V. Alegerea șablonului de proiect (`Home.jsx`, `SaveTemplateDialog.jsx`)
**Identic:** categorii, proiect gol, titlu, descriere, salvează ca șablon (categorie, descriere, icoană, include conținut), import/export șablon, șablon implicit, ștergere, proiecte recente fixate.
- [ ] **lipsă** Șabloane predefinite echivalente: roman, roman cu părți, povestire, non-ficțiune cu note, eseu/teză, scenariu de film, piesă de teatru, BD, poezie, listă de lectură.
- [ ] **lipsă** Căutare în lista de șabloane.

### W. Semne de carte (`BookmarksPanel.jsx`, tab în Inspector)
**Identic:** semne ale documentului și ale proiectului, adaugă documentul curent, previzualizare la clic, deschide la dublu-clic, elimină.
- [x] **P10** Fișiere externe (și adrese web) în semnele de carte ale documentului și ale proiectului (`chooseBookmarkFile` / `openBookmarkFile`: se deschide doar o cale salvată ca semn de carte, niciodată un program).
- [x] **P10** Reordonare prin tragere (ambele liste).

### X. Inspector, fiecare tab (`Inspector.jsx`)
**Identic:** sinopsis text, sinopsis imagine, titlu, subtitlu, etichetă, status, tip secțiune, include în compile, cuvinte-cheie, câmpuri proprii, note document, note proiect, semne de carte, snapshot-uri, comentarii, note de subsol, creat/modificat, ținta documentului, legături de intrare, blocare inspector, icoană și culoarea ei, favorit.
- [x] **P10** „Pagină nouă înainte” și „Compilează așa cum e” pe document (`node.pageBreakBefore`, `node.compileAsIs`). Efectul lor în `lib/compile.cjs` rămâne pentru pachetul de compile.
- [x] **P10** Sinopsis din primele fraze ale textului, fără AI (`synopsisFromText`).
- [x] **P10** Comentarii: filtru (toate / comentarii / note de subsol, ținut minte) și culoare per comentariu.
- [x] **P10** Mai multe note de proiect ca taburi în inspector (`ProjectNotesTabs` în Notițe › Proiect).

### Y. Corkboard, opțiunile panoului (`Corkboard.jsx`)
**Identic:** grilă, liber, linii după etichetă/status/cuvânt-cheie, mărime, formă, liniat, umplere etichetă, proporție, spațiere, fișă nouă după selecție, fixează ordinea, aranjează pe linii.
- [ ] **lipsă** Orientarea liniilor (orizontal / vertical).
- [ ] **lipsă** Imagine trasă direct pe fișă devine sinopsis-imagine.

### Z. Outliner, coloane și opțiuni (`Outliner.jsx`)
**Identic:** titlu, sinopsis, etichetă, status, cuvinte, caractere, țintă, progres, tip secțiune, cuvinte-cheie, creat, modificat, în compile, câmpuri proprii, extinde/restrânge tot, sortare, revino la ordinea din binder, total cuvinte.
- [ ] **lipsă** Coloane: total cuvinte cu copii, țintă totală, progres total, pagină nouă înainte, număr de snapshot-uri, data ultimului snapshot.
- [ ] **lipsă** Reordonarea coloanelor prin tragere și lățimi salvate.
- [ ] **lipsă** Sinopsisul sub titlu în aceeași coloană.
- [ ] **lipsă** Rândurile colorate cu culoarea etichetei.

### AA. Meniul contextual al binderului (`Binder.jsx`, `ContextMenu.jsx`)
**Identic:** document nou, dosar nou, duplicat, mută în, mută în coș, golește coșul, redenumește, include în compile, favorit, deschide în panoul 2, deschide în Quick Reference, setează ca (etichetă/status), extinde tot, restrânge tot.
- [ ] **lipsă** Convertește în dosar / în document text.
- [ ] **lipsă** Adaugă la colecție.
- [ ] **lipsă** Schimbă icoana.
- [ ] **lipsă** Fă snapshot pentru documentele selectate.
- [ ] **lipsă** Unește și Sortează copiii (alfabetic) din meniu.
- [ ] **lipsă** Arată fișierul în Explorer (cercetare).
- [ ] **lipsă** Copiază legătura către document.

### AB. Bara de antet și bara de subsol a editorului (`Editor.jsx`, `EditorFooter.jsx`)
**Identic:** subsol: cuvinte, caractere, ținta documentului, unitatea, zoom.
- [ ] **lipsă** Bara de antet pe fiecare panou: înapoi/înainte, titlul documentului cu meniu (istoric, documente vecine), blocare în loc, legare cu celălalt panou, împărțire.
- [ ] **parțial** Înapoi/înainte există doar ca comenzi globale (`back`/`forward`), nu pe panou.
- [ ] **lipsă** Subsol în Scrivenings: totalul tuturor documentelor afișate.
- [ ] **lipsă** Subsol în corkboard/outliner cu controalele vederii (mărime fișe etc.), cum e în clasic.

### AC. Bara de format (`FormatBar.jsx`)
**Identic:** stiluri, font, mărime, bold, italic, subliniat, tăiat, culoare text, evidențiere, aliniere, interlinie cu valoare proprie, liste, indent, tab-uri, tabel, imagine, legătură, comentariu, notă de subsol, revizii, semn de carte, transformări de litere, copiere specială, copiază/lipește formatarea.
- [ ] **lipsă** Lista de fonturi cu previzualizarea fontului.
- [ ] **lipsă** Spațierea între caractere.
- [ ] **lipsă** Stiluri de listă cu numerotare proprie (1.1, a), I.).

### AD. Meniul Text / Format
**Identic:** schimbă literele (MAJUSCULE, minuscule, titlu, propoziție), selectează cuvânt/propoziție/paragraf, elimină spațiile duble, liniuțe, ghilimele, data de azi, pagină nouă, linie orizontală, note inline ↔ legate, text de la dreapta la stânga.
- [ ] **lipsă** Inserează substituent (submeniu cu substituenții de compile).
- [ ] **lipsă** Elimină toate comentariile / notele de subsol din document.
- [ ] **lipsă** Convertește la text simplu (fără formatare).
- [ ] **lipsă** Despărțire în silabe (hyphenation) în editor și la compile.

### Totaluri audit 3

Numărătoarea „identic” e pe elementele din rândul **Identic** (aproximativă: o paranteză cu variante contează ca un element).

| Fereastră | identic | parțial | lipsă |
|---|---:|---:|---:|
| A1. Opțiuni: General | 4 | 2 | 8 |
| A2. Opțiuni: Aspect | 13 | 2 | 19 |
| A3. Opțiuni: Corkboard | 8 | 1 | 9 |
| A4. Opțiuni: Compunere | 7 | 1 | 6 |
| A5. Opțiuni: Editare / Opțiuni | 4 | 1 | 8 |
| A6. Opțiuni: Editare / Formatare | 5 | 1 | 5 |
| A7. Opțiuni: Editare / Revizii | 1 | 0 | 2 |
| A8. Opțiuni: Partajare | 9 | 1 | 8 |
| A9. Opțiuni: Comportamente | 3 | 0 | 10 |
| A10. Opțiuni: Backup | 10 | 0 | 2 |
| A11. Opțiuni: Corecturi | 9 | 0 | 9 |
| A12. Opțiuni: Tastatură | 2 | 1 | 3 |
| A13. Opțiuni: Navigare | 0 | 0 | 7 |
| B. Setări proiect | 32 | 1 | 11 |
| C. Configurare pagină | 14 | 1 | 5 |
| D1. Compile: ansamblu | 25 | 2 | 7 |
| D2. Compile: Separatoare | 6 | 1 | 2 |
| D3. Compile: Așezări de secțiune | 8 | 0 | 8 |
| D4. Compile: Stiluri | 0 | 1 | 2 |
| D5. Compile: Prefix/sufix titlu | 3 | 1 | 1 |
| D6. Compile: Opțiuni de text | 7 | 0 | 5 |
| D7. Compile: Înlocuiri | 6 | 0 | 2 |
| D8. Compile: Transformări | 2 | 0 | 3 |
| D9. Compile: Note și comentarii | 6 | 0 | 4 |
| D10. Compile: Setări de pagină | 6 | 0 | 4 |
| D11. Compile: Antete/subsoluri | 3 | 0 | 4 |
| D12. Compile: Statistici | 0 | 0 | 1 |
| D13. Compile: Substituenți | 3 | 1 | 1 |
| D14. Compile: Metadate | 5 | 0 | 2 |
| D15. Compile: Scenariu | 0 | 0 | 2 |
| D16. Compile: alte secțiuni | 0 | 1 | 4 |
| E. Ținte | 13 | 1 | 3 |
| F. Statistici | 12 | 0 | 3 |
| G. Istoricul scrisului | 9 | 0 | 4 |
| H. Scratchpad | 5 | 1 | 4 |
| I. Compunere | 8 | 0 | 4 |
| J. Scenariu | 13 | 1 | 3 |
| K. Snapshot-uri | 8 | 0 | 3 |
| L1. Căutare în document | 7 | 0 | 4 |
| L2. Căutare în proiect | 16 | 0 | 5 |
| M. Colecții | 7 | 0 | 3 |
| N. Cuvinte-cheie | 9 | 0 | 2 |
| O. Aranjamente | 3 | 1 | 2 |
| P. Quick Reference | 3 | 0 | 5 |
| Q. Generator de nume | 12 | 0 | 2 |
| R. Focus lingvistic | 8 | 1 | 2 |
| S. Import | 15 | 1 | 4 |
| T. Export | 11 | 0 | 4 |
| U. Șabloane de document | 2 | 1 | 2 |
| V. Șabloane de proiect | 12 | 0 | 2 |
| W. Semne de carte | 5 | 0 | 2 |
| X. Inspector | 22 | 1 | 3 |
| Y. Corkboard (panou) | 12 | 0 | 2 |
| Z. Outliner | 18 | 0 | 4 |
| AA. Meniul contextual binder | 14 | 0 | 7 |
| AB. Antet/subsol editor | 5 | 1 | 3 |
| AC. Bara de format | 24 | 0 | 3 |
| AD. Meniul Text | 13 | 0 | 4 |
| **Total** | **487** | **28** | **253** |

Concluzie: ferestrele de lucru zilnic (Inspector, Outliner, bara de format, căutare, ținte, import/export) sunt aproape complete. Golurile mari sunt în **Opțiuni** (Aspect, Comportamente, Navigare, Corecturi: 61 de lipsuri), în **designerul de Compile** (D2–D16: 45 de lipsuri) și în ferestrele „mici” rămase schelet (Quick Reference, Scratchpad, antetul editorului).

### Primele 40, după valoarea pentru utilizator

1. Formate de compile predefinite: manuscris standard, roman tipărit, non-ficțiune, scenariu (D1)
2. Lista „Conținut” în Compile cu Include / Pagină nouă înainte / tip secțiune pe rând (D1)
3. Formatarea titlului per așezare: font, mărime, spațiu, prefix pe mai multe rânduri (D3, D5)
4. Antete diferite par/impar, prima pagină de capitol, titlul capitolului în antet (D11)
5. Numerotare de la N și cifre romane în materia de început; materie de final (D10, D1)
6. Comentariile/notele: alegerea tratamentului la compile și formatul numerelor (D9)
7. Opțiuni de text la compile: italic ↔ subliniat, spații duble, ghilimele drepte, elimină tăiatul (D6)
8. Cuprins configurabil (titlu, adâncime, puncte de conducere) (D16)
9. Panoul Navigare în Opțiuni (A13)
10. Comportamente: dublu-clic pe dosar, vedere implicită pe tip, selecție multiplă ca Scrivenings/corkboard (A9)
11. Bara de antet pe fiecare panou al editorului: înapoi/înainte, meniul titlului, blocare, legare panouri (AB)
12. Quick Reference cu bara de format, inspector, mereu deasupra (P)
13. Corecturi: DOuă MAjuscule, Caps Lock, excepții, corector pornit/oprit, alegerea ghilimelelor (A11)
14. Ignoră diacriticele + doar în selecție în căutare (L1)
15. Previzualizarea înlocuirii în proiect cu excluderi (L2)
16. Rezultatele căutării afișate în binder (L2)
17. Culori editor: fundal, text, selecție, linia curentă, pagina în Vedere pagină (A2, A5)
18. Teme de culori salvabile și importabile (A2)
19. Corkboard: ștampila de status, pin de etichetă, cuvinte-cheie pe fișe, fundal (A3)
20. Corkboard liber: aliniere la grilă (A3)
21. Outliner: coloane totale cu copii, reordonare coloane, lățimi salvate (Z)
22. Etichete/statusuri: titlu de câmp redenumibil, valoare implicită (B)
23. Limba proiectului + date editoriale în Setări proiect (B, D14)
24. Mașină de scris: poziția rândului; evidențierea rândului curent (A5)
25. Formatare implicită completă cu riglă; font pentru notițe și note de subsol (A6)
26. Scratchpad ca fereastră independentă, cu folder pe disc și „Adaugă la document” (H)
27. Meniul contextual al binderului: convertește dosar/text, adaugă la colecție, icoană, snapshot, sortează (AA)
28. Compunere: zoom propriu, bară care se ascunde, țintă în bară, HUD cuvinte-cheie (A4, I)
29. Comparare între două snapshot-uri și copiere parțială din snapshot (K)
30. Tipărire corkboard ca fișe și setări de tipărire pe vedere (C)
31. Editor de formate de scenariu + (CONT'D)/(MORE) la compile (J, D15)
32. Ținte: numărări negative, sesiunea preia ținta pe zi, panou plutitor (E)
33. Sincronizare: prefix numeric, doar o colecție, include Cercetarea (A8)
34. Import dosar de pe disc cu structură; import EPUB/HTML local (S)
35. Stiluri la compile: redefinire și eliminare pe stil (D4)
36. Substituenți lipsă + meniul „Inserează substituent” (D13, AD)
37. Istoric scris: export CSV, brut/net, interval (G)
38. Separatoare cu patru reguli și separator decorativ (D2)
39. Tastatură: salvare/încărcare set, resetare individuală (A12)
40. Șabloane de proiect predefinite pe genuri (V)

### Pachete de lucru (câte un agent fiecare, fișiere în mare parte disjuncte)

- **P1. Compile: formate și conținut** (1, 2, 5, 8) — `lib/compileFormats.cjs`, `lib/compile.cjs` (partea de selecție, front/back matter, cuprins), `CompileDialog.jsx` (doar tabul „Conținut”/ansamblu), `tests/compile*.test.js`. **Făcut:** D1 complet, cuprinsul din D16; din punctul 5 materia de final și cifrele romane în materia de început (numerotarea de la N rămâne la P3).
- **P2. Compile: așezări, text, note, stiluri, separatoare** (3, 6, 7, 35, 38) — `lib/compile.cjs` (redarea secțiunilor și transformările; coordonat cu P1 prin funcții separate, ex. `lib/compileLayouts.cjs` nou), `src/components/CompileLayoutEditor.jsx` (nou, scos din `CompileDialog.jsx`), teste.
- **P3. Compile: pagină, antete, substituenți, scenariu** (4, 5 partea de numerotare, 31 partea de compile, 36) — `lib/compileDocx.cjs`/partea DOCX și PDF din `lib/compile.cjs`, `lib/placeholders.cjs` (nou), `PageSetupDialog.jsx`, `src/help/` (lista substituenților), `FormatBar.jsx` doar meniul „Inserează substituent”.
- **P4. Opțiuni: Navigare + Comportamente + Tastatură** (9, 10, 39) — `SettingsDialog.jsx` (panouri noi `navigation`, `behaviors`), `lib/settingsDefaults.js`, `Binder.jsx` (dublu-clic, selecție multiplă), `ShortcutsDialog.jsx`, `lib/commands.js`.
- **P5. Opțiuni: Aspect și teme de culori** (17, 18, 24) — `src/components/AppearancePane.jsx` (nou, scos din `SettingsDialog.jsx`), `lib/settingsDefaults.js` (`applySettingsCss`), `src/styles.css`, foaia de stil a temei clasice din `src/`, `src/editor/lineHighlight.js`, `src/editor/writing.js` (mașina de scris).
- **P6. Corecturi și căutare în document** (13, 14) — `src/editor/corrections.js`, `lib/autoReplace.js`, `src/components/CorrectionsPane.jsx` (nou), `FindBar.jsx`, `src/editor/docSearch.js`.
- **P7. Căutare în proiect** (15, 16) — `AdvancedSearchDialog.jsx`, `FindDialog.jsx`, `lib/projectSearch.js`, `lib/search.js`, vedere „rezultate” în `Binder.jsx` (doar un mod de filtrare izolat; coordonat cu P4).
- **P8. Antetul editorului și Quick Reference** (11, 12) — `src/components/EditorHeader.jsx` (nou), `Editor.jsx`, `EditorFooter.jsx`, `QuickRef.jsx`, `electron/main.cjs` (fereastra QR mereu deasupra).
- **P9. Corkboard și Outliner** (19, 20, 21) — `Corkboard.jsx`, `Outliner.jsx`, `src/panels-extra.css`.
- **P10. Setări proiect și Inspector** (22, 23, 25) — `ProjectSettingsDialog.jsx`, `lib/projectSettings.js`, `Inspector.jsx`, `lib/store.cjs` (câmpuri noi de proiect), `src/components/DefaultFormatPane.jsx` (nou).
- **P11. Ferestre mici: Scratchpad, Compunere, Ținte, Snapshot-uri, Istoric** (26, 28, 29, 32, 37) — `Scratchpad.jsx`, `CompositionBar.jsx`, `TargetsDialog.jsx`, `SnapshotsPane.jsx`, `lib/snapshotDiff.js`, `HistoryDialog.jsx`, `electron/main.cjs` (fereastră scratchpad; coordonat cu P8 prin handler IPC separat).
- **P12. Binder (meniu), tipărire, scenariu, import/sync, șabloane** (27, 30, 31 partea de editor, 33, 34, 40) — `ContextMenu.jsx`, `lib/editorMenus.js`, `PrintPreviewDialog.jsx`, `extensions/ScriptMode.js`, `lib/scriptFormats.js`, `ImportDialog.jsx`, `lib/scrivImport.cjs` doar pentru import dosar, `templates/` (șabloane noi), `Home.jsx`.

Ordinea recomandată: P1 → P2 → P3 secvențial (toate ating Compile); P4–P12 se pot face în paralel cu ele, cu atenție la `SettingsDialog.jsx` (P4, P5, P6 extrag fiecare panoul propriu într-un fișier nou, ca să nu se calce) și la `Binder.jsx` (P4 și P7).

## Omisiuni pe cinci niveluri: macro, mega, mezzo, micro, nano (audit 4)

Comparație cu programul clasic (versiunea 3 pentru Windows), verificată în cod (`src/`, `lib/`, `electron/`). Nu repetă punctele din G0–G5, audit 2 și audit 3. Format: ce face programul clasic → ce face Scribner acum.

### MACRO: fluxuri întregi, cap-coadă

- [ ] **Flux șablon → compile fără ruptură**: programul clasic leagă șablonul de proiect de un format de compile implicit, de tipurile de secțiune și de stilurile proprii, astfel încât un proiect nou compilează corect din prima → Scribner aplică șablonul doar structurii din binder (`lib/templates.cjs`); formatul de compile se alege separat.
- [x] **PDF în panoul editorului cu căutare și pagina ținută minte**: programul clasic afișează PDF-ul cu pagini, căutare și copiere de text → Scribner îl afișează în `MediaView.jsx` prin vizualizatorul încorporat, fără căutare legată de proiect. *(Q12: `PdfViewer.jsx` — bară proprie cu pagină / mărire / căutare peste vizualizatorul încorporat, adnotări evidențiere/notă per pagină ținute în `node.media.annotations`, copiate în notele documentului la cerere.)*
- [x] **Pagina PDF-ului și poziția din audio/video ținute minte per document**: clasicul redeschide la aceeași pagină / secundă → Scribner pornește mereu de la început. *(Q12: `node.media.page`/`zoom`/`time`/`rate`.)*
- [x] **Pagină web importată ca arhivă locală, vizualizabilă offline**: clasicul o salvează ca fișier în proiect → Scribner o salvează ca text sau legătură. *(Q12: Documente → „Arhivează o pagină web în Cercetare…”, `buildWebArchive` în `lib/importers.cjs`, IPC `research:archiveWeb`, afișată în cadru izolat fără scripturi.)*
- [x] **Transcriere cu media alături**: clasicul are taste pentru pauză și „înapoi câteva secunde” cât timp cursorul e în text → `MiniPlayer.jsx` nu are scurtături globale active din editor. *(Q12: `MediaPlayerView.jsx` — Ctrl+Alt+P / ← / → / T active și din textul din panoul de alături; momentul se inserează în text sau în notele fișierului.)*
- [ ] **Referințe ale documentului și ale proiectului** (listă de URL-uri, fișiere, documente din proiect în Inspector) → Scribner are doar legăturile din text și semnele de carte.
- [ ] **Înlocuire în tot proiectul cu domeniu** (text, titluri, sinopsis, note) și cu listă de documente afectate → `AdvancedSearchDialog.jsx` înlocuiește fără bife de domeniu pe câmpuri.
- [ ] **Sincronizare cu varianta mobilă prin dosar cloud**, cu conflicte rezolvate pe document → Scribner are doar sincronizare cu dosar extern (`lib/folderSync.cjs`) și dosar de echipă.
- [ ] **Mai multe proiecte deschise, fiecare în fereastra lui, cu meniul Fereastră care le listează** → există `window:new` (`electron/preload.cjs`), dar fără listă de ferestre și cu setări „ultimul proiect” globale.
- [ ] **Copiere/mutare de documente între două proiecte deschise prin tragere** → lipsește.
- [ ] **Backup la închidere cu „păstrează ultimele N” vizibil și restaurare dintr-o listă la deschidere** → `lib/backup.cjs` face copia, restaurarea se face manual.
- [ ] **Flux de revizie**: clasicul face snapshot automat înainte de a porni revizia și compară snapshot-uri pe cuvânt în panou → Scribner nu leagă pornirea reviziei de un snapshot automat.

### MEGA: arhitectură și comportament

- [ ] **Rotund `.scriv` → Scribner → `.scriv` fără pierderi**: în `lib/scrivExport.cjs` lipsesc culorile și ordinea etichetelor, definițiile câmpurilor proprii (listă/dată/bifă), setările și formatele de compile, stilurile proiectului, colecțiile de căutare (salvate ca interogare), imaginile de sinopsis, semnele de carte ale proiectului, notele de proiect multiple. Nu există test de rotund pe un proiect de referință.
- [ ] **Raport de fidelitate la export `.scriv`** (simetric cu `ImportReport.jsx`): ce nu a putut fi scris.
- [ ] **Recuperare după cădere**: clasicul oferă la repornire „recuperează modificările nesalvate” → Scribner salvează la inactivitate și la `beforeunload`, fără jurnal de recuperare pentru textul tastat între salvări.
- [ ] **Lacăt de sesiune la deschiderea aceluiași proiect de două ori** (avertizare, deschidere doar în citire) → `project.json.lock` din `lib/store.cjs` protejează doar scrierile scurte.
- [ ] **Performanță la 1.000 de documente / 500k cuvinte**: binder-ul, outliner-ul și corkboard-ul randează toate rândurile (nicio virtualizare în `src/`); Scrivenings creează câte un editor pe secțiune.
- [ ] **Încărcare leneșă a textelor**: clasicul citește doar documentele deschise → Scribner ține tot proiectul în memorie.
- [ ] **Istoricul de anulare păstrat per document** după ce schimbi documentul din panou → se pierde (editorul e recreat).
- [ ] **Anulare pentru operațiile din binder** (mutare, redenumire, tragere, ștergere) → doar coșul permite revenirea.
- [ ] **Regulile sincronizării cu dosar extern documentate și testate** (subdosare, formate, documente noi create din fișiere noi, conflict când ambele părți s-au schimbat) → `lib/folderSync.cjs` fără test de conflict.
- [ ] **Indicator „nesalvat” în titlul ferestrei** cât timp există modificări în așteptare → lipsește.

### MEZZO: comportament la nivel de panou

- [ ] **Tragere din binder în editor** inserează legătură internă sau imagine → `Editor.jsx` nu are `onDrop`.
- [ ] **Tragere pe un dosar din corkboard / outliner** mută documentul înăuntru → doar binder-ul acceptă plasare „în”.
- [ ] **Plasare direct pe tab-ul unei colecții** → `CollectionsBar.jsx` are o singură țintă.
- [ ] **Ctrl + tragere = copiere** în binder, corkboard, outliner → Scribner mută mereu.
- [ ] **Indicatorul „în / deasupra / dedesubt”** la fel în toate vizualizările → complet doar în binder.
- [ ] **Scrivenings: selecție, căutare și înlocuire continue peste secțiuni** → `Scrivenings.jsx` are un editor separat pe secțiune, deci se opresc la margine.
- [ ] **Scrivenings: săgeată sus/jos trece în secțiunea vecină** fără clic → nu există gestionare explicită.
- [ ] **Selecția comună între binder, corkboard și outliner** → selecția e locală fiecărei vizualizări.
- [ ] **Istoricul de navigare ține și vizualizarea** (înapoi revine la corkboard-ul dosarului) → istoricul din G5 ține doar documentul.
- [ ] **Panoul legat urmărește și selecția din outliner/corkboard**, nu doar din binder → de completat.

### MICRO: valori implicite, texte, stări

- [ ] **Confirmări uniforme cu verbe pe butoane** (Golește coșul / Anulează) → `confirm()` nativ în ~18 fișiere, cu OK/Cancel.
- [ ] **Bifă „nu mai întreba”** la confirmările repetitive → lipsește.
- [ ] **Stări goale cu îndemn** (corkboard gol, colecție goală, căutare fără rezultate, coș gol, note goale) → niciun tipar comun în `src/`.
- [ ] **Comenzi dezactivate când nu se aplică** (Împarte la cursor fără cursor, Combină cu un singur document) → rămân active și nu fac nimic.
- [ ] **Tooltip cu scurtătura** pe fiecare buton din bara de unelte → `title=` fără scurtătură.
- [ ] **Ordinea și gruparea meniurilor** ca în programul clasic, cu separatoare pe grupe → de aliniat în `Menu.jsx`.
- [ ] **Mesaje scurte în bara de stare** („Salvat”, „3 documente mutate”, „Compilare terminată”) → lipsesc.
- [ ] **Unități la marginile paginii** (cm / in / pt după sistem) → o singură unitate.
- [ ] **Document nou intră direct în redenumire** cu „Fără titlu” selectat → de verificat în binder, corkboard și outliner.
- [ ] **Numărătoare pe dosar** în corkboard/outliner („12 documente, 8.430 cuvinte”) → lipsește.
- [ ] **Avertizare la închidere cu compilare/export în curs** → lipsește.

### NANO: tastatură, cursor, memorie per document

- [ ] **Defilarea ținută minte per document** în editorul principal → doar panoul de copiere o ține (`App.jsx`, `copyScroll`).
- [ ] **Cursorul și selecția ținute minte per document**, și după repornire → lipsește.
- [ ] **Zoom ținut minte per document** (opțional) → doar per panou.
- [ ] **Mărimea, poziția și maximizarea ferestrei ținute minte** → `BrowserWindow` pornește mereu la 1400 lățime (`electron/main.cjs`).
- [ ] **Lățimile binder/inspector și raportul împărțirii ținute minte per proiect** → de verificat, parțial global.
- [ ] **Ordinea focusului între panouri** (Ctrl+Tab / F6: binder → editor → inspector) → nedefinită.
- [ ] **Variante cu modificatori la clic**: Shift+clic în binder deschide în celălalt panou, Alt+clic în fereastră rapidă → doar Ctrl+clic e consecvent.
- [ ] **Triplu clic selectează paragraful fără marcajul paragrafului următor** la copiere → comportamentul implicit al browserului.
- [ ] **Meniul contextual pe text**: sugestiile de ortografie există (`electron/main.cjs`); lipsesc Caută în dicționar / pe web, Ignoră peste tot, Adaugă comentariu, Adaugă selecția la colecție, Legătură către document.
- [ ] **Anulare pe cuvânt**: clasicul anulează pe cuvânt → Scribner grupează după timp (implicit ProseMirror), deci o frază tastată repede se anulează integral.
- [ ] **O corectură automată se anulează cu un singur Ctrl+Z** (ghilimele, linie, majusculă), revenind la ce ai tastat → de verificat pe fiecare regulă din `src/extensions/`.
- [ ] **Completare automată cu întârziere și Esc** pentru cuvinte-cheie și câmpuri proprii → temporizare neuniformă.
- [ ] **Cursorul la tragere** (+ la copiere, interdicție peste ținte invalide) → `dropEffect` nesetat pe cazuri.
- [ ] **Ctrl+Home/End în Scrivenings duce la începutul/sfârșitul întregii secvențe**, nu al secțiunii → de verificat.

### Totaluri audit 4

MACRO 12, MEGA 10, MEZZO 10, MICRO 11, NANO 14. Total 57; primele 50 intră în pachetele de mai jos (rămân în afară: MICRO 8–9, NANO 5, 12, 14, MEZZO 10, MACRO 10).

### Pachete de lucru Q (câte un agent, fișiere disjuncte)

- **Q1 Rotund `.scriv`** (MEGA 1–2): `lib/scrivExport.cjs`, `lib/scrivImport.cjs`, `tests/scrivRoundtrip.test.js` (nou).
- **Q2 Siguranța datelor** (MEGA 3–4, 10; MACRO 11): `lib/store.cjs`, `lib/backup.cjs`, `electron/ioHandlers.cjs`, `src/components/BackupDialog.jsx`, `src/components/ConflictDialog.jsx`.
- **Q3 Performanță** (MEGA 5–6): `src/components/Outliner.jsx`, `src/components/Corkboard.jsx`, `src/components/Binder.jsx`, `lib/loadHtml.cjs`.
- **Q4 Scrivenings** (MEZZO 6–7): `src/components/Scrivenings.jsx`, `src/editor/scriveningsBoundary.js` (nou).
- **Q5 Anulare** (MEGA 7–8; NANO 10–11): `src/components/Editor.jsx`, `src/extensions/` (regulile de tastare), `src/lib/undoBinder.js` (nou).
- **Q6 Tragere și plasare** (MEZZO 1–5; NANO 13): `src/lib/dnd.js` (nou, reguli comune), `src/components/CollectionsBar.jsx`; legarea în binder/corkboard/outliner după Q3.
- **Q7 Memorie per document și fereastră** (NANO 1–4): `electron/main.cjs` (limitele ferestrei), `src/lib/docViewState.js` (nou), `src/components/PaneNav.jsx`.
- **Q8 Focus, modificatori, selecție comună** (NANO 6–8; MEZZO 8–9): `src/lib/focusOrder.js` (nou), `src/components/Menu.jsx`, `src/components/ShortcutsDialog.jsx`.
- **Q9 Meniul contextual pe text** (NANO 9): `src/components/ContextMenu.jsx`, `electron/v10Handlers.cjs` (handler nou; `main.cjs` rămâne la Q7).
- **Q10 Confirmări, stări goale, mesaje** (MICRO 1–3, 7, 10–11): `src/components/DialogA11y.jsx`, `src/components/StatusBar.jsx`, `src/lib/i18n.js`.
- **Q11 Comenzi și tooltip-uri** (MICRO 4–6): `src/components/FormatBar.jsx`, `src/components/ToolbarCustomizeDialog.jsx`, `src/components/QuickRef.jsx`.
- **Q12 Cercetare în panou** (MACRO 2–5) — făcut: vizualizatoare PDF/imagine/pagină web/audio/video în panoul editorului și în panoul împărțit, fișiere trase din sistem pe binder → Cercetare (`media:addData`): `src/components/MediaView.jsx`, `src/components/MiniPlayer.jsx`, `src/components/ResearchPanel.jsx`, `lib/importers.cjs`.
- **Q13 Referințe, înlocuire cu domeniu, flux de revizie** (MACRO 6–7, 12): `src/components/AdvancedSearchDialog.jsx`, `src/components/Inspector.jsx`, `src/components/SnapshotsPane.jsx`, `lib/trackChanges.cjs`.
- **Q14 Șablon → compile, ferestre multiple, sincronizare** (MACRO 1, 8–9; MEGA 9): `lib/templates.cjs`, `lib/folderSync.cjs`, `electron/windowHandlers.cjs` (nou), `src/components/Home.jsx`.

Ordine: Q3 înaintea lui Q6 (aceleași vizualizări); Q7 și Q9 nu ating același fișier; restul în paralel.

## Comparație vizuală (audit 5)

Comparație fereastră-cu-fereastră cu programul clasic de referință, pe un proiect de test identic,
până la nivel de element, ordine, text, valoare implicită, stare, bifă și scurtătură. Unelte în
`scripts/ui-audit/` (captură deterministă prin accesibilitate + OCR; diff determinist; judecată doar pe
rezidul ambiguu, pe serverul local OmniRoute, lead Opus 4.7 + lucrători). Doar comportamentul e observat;
nimic nu se copiază din programul clasic. Extrasele proprii Scribner (AI, MCP, dictare) se păstrează.

### Meniuri
Capturate complet ambele bare de meniu (10 meniuri clasice la 3 niveluri + context cu text; meniul
Scribner). Diff determinist: 468 intrări prezente în clasic și nepotrivite în Scribner, 53 diferențe de
scurtătură (multe sunt zgomot OCR — tratate ca semnal slab, neimplementate orb), 49 de stare.

- [x] **Curățare text** (clasic: Edit › Text Tidying) — submeniu nou în Transformări cu: spații multiple →
  un spațiu, elimină liniile goale dintre paragrafe, scoate tab-urile de la începutul rândului.
  `src/lib/editorMenus.js` (funcții pure `collapseSpaces`/`collapseBlankLines`/`stripLeadingTabs`),
  `src/lib/i18n-ui.js`, test `tests/textTidy.test.js`.
- [ ] Transformări în plus (clasic: Edit › Transformations): versale mici (Small Caps) și eliminarea lor —
  necesită o marcă nouă, nu doar transformare de șir.
- [ ] Șterge textul tăiat (clasic: Edit › Text Tidying › Delete Struck-Through Text) — comandă pe editor.
- [ ] Rest de triat din cele 468: multe sunt echivalente sub alt nume (alias) sau intrări dinamice/niche;
  de confirmat una câte una înainte de implementare.

### Opțiuni / Setări
Capturate: dialogul Opțiuni clasic (43 de pagini) și Setările Scribner (11 tab-uri, prin DOM).
Scribner acoperă toate categoriile clasice (General, Editare, Comportamente, Aspect, Corecturi,
Tastatură, Partajare, Backup) plus extrasele proprii (AI, Servicii și conturi, Limbă). Comparație
deterministă: 252 setări clasice, 264 Scribner; majoritatea „diferențelor" sunt aceeași setare sub alt
nume (alias). Golurile reale, confirmate manual pe datele deterministe (OmniRoute fiind nesigur la
sarcini structurate), sunt puține.

- [x] **Deschide folderul de backup** (clasic: Opțiuni › Backup › „Open backup folder…") — buton nou în
  tab-ul Backup care deschide folderul efectiv de backup în managerul de fișiere. `electron/main.cjs`
  (IPC `settings:openBackupFolder`), `electron/preload.cjs`, `lib/backup.cjs` (`effectiveBackupDir`, pur +
  testat), `src/components/SettingsDialog.jsx`, `src/lib/i18n.js`, teste `tests/g4ImportExportBackup.test.js`
  + intrare în `tests/mcpFull.test.js`.
- [ ] Comutator unic „Backup automat pornit/oprit" (clasic: master toggle) — Scribner are comutatoare
  separate (la închidere/deschidere/salvare); de evaluat dacă merită un singur comutator-umbrelă.

### Inspector
Structura se potrivește: ambele au 5 tab-uri — Note, Semne de carte/linkuri, Detalii (Metadate),
Snapshot-uri, Comentarii și note de subsol. Inspectorul Scribner (verificat în cod) e complet:
icoană + culoare, tip de secțiune, etichetă, status, include în compile, pagină nouă înainte,
compilează așa cum e, cuvinte cheie, țintă (+ unitate + notificare), subtitlu, câmpuri personalizate,
date creat/modificat, număr de cuvinte, linkuri, snapshot-uri, comentarii/note.

Comparația nano a conținutului tab-urilor din programul clasic e **blocată pe acest calculator**:
(1) câmpurile Inspectorului clasic nu sunt expuse prin stratul de accesibilitate (widget-uri Qt custom);
(2) partea dreaptă a ecranului, unde stă Inspectorul, e acoperită de un panou always-on-top al
utilizatorului, deci nici captura de ecran + OCR nu-l poate citi. Nu se mută ferestrele utilizatorului.
- [ ] De reluat când panoul always-on-top e ascuns temporar, sau pe un ecran liber.

### Ținte, Statistici, Scratchpad, Compunere, Corkboard, Outliner, Căutare — stadiu
Capturarea dialogurilor programului clasic se face acum pe **Desktop 3** prin **PrintWindow + OCR**
(merge cu desktopul inactiv) și prin UI Automation unde toolkitul o expune. Limită reală: multe
dialoguri Qt ale programului clasic **nu-și expun conținutul prin accesibilitate** (doar pixeli, citiți cu
OCR), iar unele sunt **modale** (deschiderea prin UIA blochează firul) — se deschid printr-un proces
separat și se capturează prin PrintWindow.

Constatări (verificate pe partea Scribner, care e inspectabilă complet):
- **Ținte** — Scribner e superset: țintă draft + sesiune, deadline, zile de scris, reset sesiune, numără
  doar grupul compilat, notificări, cuvinte/pagină, permite negativ, sesiune din deadline, pe toate
  proiectele (`TargetsDialog.jsx`, `lib/stats.js`). Paritate+.
- **Statistici** — clasicul: numărători + „Word Frequency". Scribner are `Statistics…` și istoric de
  scriere; comparația nano a numărătorilor e limitată de OCR pe dialogul modal.
- **Scratchpad, Compunere, Corkboard, Outliner, Căutare** — prezente în Scribner la nivel de meniu și
  componente dedicate; comparația de conținut e limitată de accesibilitatea Qt a programului clasic.
- [ ] De reluat comparația nano pe aceste dialoguri cu panoul always-on-top ascuns (pentru zona din
  dreapta) sau pe un ecran liber; infrastructura (Desktop 3 + PrintWindow + OCR) e gata.
