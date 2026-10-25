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
- **G1 Meniuri și scurtături** [ ]: meniuri Inserare, Format, Fereastră separate; Editare completă (Anulează/Refă, Lipește potrivind stilul, Copiere specială, Transformări, submeniu Găsește); Găsește următorul/anteriorul; Mergi la ca submeniu cu tot binder-ul (favorite sus); Vizualizare: Mașină de scris, Caractere invizibile, Pagină, Fixează pe loc, Bara antet/subsol, Culoarea etichetei în…; Mod revizie în Format (punctele 1–4, 7–10, 31, 39).
- **G2 Binder, colecții, etichete, cuvinte cheie** [ ]: meniul contextual complet (Adaugă la colecție, Convertește, Schimbă iconița, Tip secțiune, Sortează, Grupează, Copiază legătura, Snapshot, Arată în Explorer); „Culoarea etichetei în” binder/fișe/Outline/iconițe; colecții: redenumire pe tab, tab permanent Rezultatele căutării, tragere pe tab; cuvinte cheie ca arbore cu tragere pe documente și fișe; benzi de culoare pe fișe; hoist fără ieșire automată; Outline cu sinopsis sub titlu și culoarea etichetei (punctele 5, 11–22, F).
- **G3 Inspector, editor, text** [x]: Comentarii și note de subsol într-o singură listă în ordinea textului, cu + Comentariu / + Notă și note editabile; comentariu pe cuvântul de sub cursor; culoarea implicită a comentariilor; semne de carte Document/Proiect în același panou; subsol „Cuvinte: 37 din 1.234”; culorile reviziilor în Setări; spațiere 1,0/1,2/1,5/2,0/2,5/3,0/Alta; Scrivenings fără titluri implicit (punctele 23–32, 35).
- **G4 Import, export, backup, șabloane, generator de nume** [ ]: Importă și împarte (separator #, primul rând ca titlu); titlu și conversie la importul web; OPML cu note; backup la deschidere/la salvare/cu dată în nume/zip, păstrează 5; Salvează ca șablon în Fișier și Opțiuni în fereastra de șabloane; generator de nume cu mai multe origini, raritate, nume duble, inițiale (punctele 44–48, G).
- **G5 Mai mari, runda următoare** [ ]: căutarea din bara de sus cu rezultatele în binder și opțiuni (6); panoul de stiluri lateral (33); Fixează pe loc pe fiecare panou (36); istoric înapoi/înainte pe panou cu listă (38); panou Focus lingvistic (40); riglă cu indentări și tab-uri trase (34); pagina la mărimea din Page Setup (43).
