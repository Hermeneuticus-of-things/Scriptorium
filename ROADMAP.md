# Roadmap Scribner: toate funcțiile Scrivener 3 (extins)

Starea reală la 2026-10-23. Legendă: `[x]` făcut și testat · `[~]` parțial (scris, netestat sau incomplet) · `[ ]` de făcut · `[-]` exclus intenționat.
Versiuni: **v0.2** în lucru · **v0.3** revizie și publicare · **v0.4** paritate avansată · **v1.0** paritate completă + extra.

Inventarul detaliat, organizat pe meniuri, e în [`FEATURES-SCRIVENER3.md`](FEATURES-SCRIVENER3.md). Fișierul de față e planul de lucru, în ordinea în care construiesc.

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
| [x] | Import Scrivener fără pierderi (testat pe un proiect de test complet; neverificat încă pe Karma Book real) |
| [~] | I-REP / I-EDIT (motor de reguli Karma, bucle micro/mezzo/macro, panou; verificat cu simulator, nu cu Claude real) |
| [x] | AI opțional: programul funcționează complet și fără AI |

---

## 1. v0.2: finalizare (în lucru)

### 1.1 Import Scrivener 3 fără pierderi
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
- [x] Scrivener 1/2 (`Files/Docs`)
- [x] Copia completă a proiectului original în `scrivener-original/`
- [x] Vizualizare media în editor (imagine, PDF, audio, video), icoane pe tip în binder
- [x] Raport de import (ce s-a convertit, ce a rămas doar în copie)
- [x] Inspector: metadate personalizate editabile (Text/Checkbox/List/Date), tip de secțiune, date, icoană, țintă, origine Scrivener, bookmark-uri
- [x] Istoric importat afișat în Writing History (marcat „Scrivener”)
- [x] Compile: documente-container incluse cu copiii lor, adnotări și imagini EMF eliminate, media sărită
- [ ] Verificare pe un proiect Scrivener real (Karma Book)

### 1.2 I-REP și I-EDIT (fluxul cărții Karma)
- [x] Motor de reguli: DOOM III (em-dash, paranteze, două puncte, bold, liste, numerotare, majusculă), ghilimele, construcții binare, pasive, „noi” explicit, lexic academic, tranziții P9, autoreferințe R7, reziduuri LLM P3, teleologie, ALOGEN (ancoră, repetiție, terminații), metronom, repetiții micro/mezzo/macro, limita de canvas, antet/notă canonică, attention decay
- [x] Reparații sigure fără AI (ghilimele, spații, majusculă)
- [x] Bucle I-REP repară → reverifică pe trei niveluri: micro (selecție), mezzo (document), macro (capitol)
- [x] I-EDIT: rundele R0–R11 alese individual, apoi P3 + bucla I-REP de verificare
- [x] Comentariile, adnotările și alinierea se re-atașează după fiecare trecere AI
- [x] Propunere cu diff, acceptare cu snapshot automat, evidența rundelor pe document
- [x] Alegerea profilului editorial în Setări (Karma / Generic), limita canvas, verificarea antetului și notei canonice
- [x] Clic pe o problemă selectează textul în editor
- [x] Bucla verificată în browser cu simulator de AI
- [x] Editarea listelor de cuvinte interzise din Setări
- [ ] Test end-to-end cu Claude real
- [x] Glosare generate automat: `Glosar_Alogeni_Indieni`, `Glosar_de_lectură`, `Cuprins_de_tipar`
- [x] Index canonic (`Index_de_Lucru`, noduri N.N.N cu tip/greutate/dependențe) ca sursă pentru R1 și R6 macro
- [ ] „VKB2” și definițiile tale exacte pentru I-REP / I-EDIT (nu le am; aștept fișierele)

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
- [~] Ruler: indent și spațiere prin stiluri; lipsesc riglă vizuală și tab-uri
- [x] Styles de paragraf și de caractere: panou, creare, editare, Redefine din selecție, import din alt proiect (păstrează / înlocuiește / adaugă), duse în Compile
- [x] Styles: Para+Char, Next style, scurtături de tastatură
- [x] Revision Mode (5 runde colorate), acceptarea tuturor sau a unei runde, eliminate la Compile
- [x] Adnotări inline din bara editorului, conversie adnotare ↔ comentariu
- [x] Conversie adnotare / notă inline ↔ notă legată
- [x] Scrivener Links `[[ ]]` (Ctrl+clic deschide documentul) și linkuri externe (Ctrl+L)
- [x] Page View (A5), Text Zoom 75–200%, semne de paragraf, caractere în bara de stare
- [x] Linguistic Focus: dialog, paragraf, frază; evidențierea paragrafului curent
- [~] Linguistic Focus pe părți de vorbire (substantive, verbe, adjective): etichetare euristică RO/EN, aproximativă
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
- [~] Pagini web salvate offline în Cercetare: importul paginii ca document gata; imaginile rămân linkuri
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
- [~] Print, Page Setup, Print Preview: tipărire document gata; pagina și previzualizarea sunt în Compile
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

- [x] Toate rândurile `[ ]` din `FEATURES-SCRIVENER3.md` închise sau mutate explicit la `[-]` (0 rămase)
- [x] Sinopsis AI în bloc, consistență pe toată cartea, fișe vii
- [x] Cronologie, hartă de relații, analiză de ritm
- [x] Panou NotebookLM / RAG cu cozi asincrone și cache pe concept (fluxul NLM din workspace)
- [x] Revizie multi-agent pe niveluri de zoom (Maha / Macro / Mezzo / Micro / Nano), cu rapoarte GRAVE/MEDIU
- [~] PWA / sync mobil: versiune web cu IndexedDB și pachete de proiect; sincronizare automată nu există

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
- [ ] Import pe proiectul Karma real (aștept proiectul)


## 8. Așteaptă ceva de la autor (nu se pot face fără)

- [ ] Proiectul Karma real (`.scriv`) pentru proba de import fără pierderi
- [ ] Cheile reale DeepL / Google / LanguageTool Premium / Speechify / Zotero pentru o probă cap-coadă (codul e testat cu răspunsuri simulate)
- [ ] O cheie AI pentru testul cap-coadă cu un model real
- [ ] Definițiile VKB2 pentru I-REP / I-EDIT
- [ ] O probă cu Claude Code pe Windows prin MCP (`claude mcp add scribner …`)
- [ ] Pachetul de limbă română pentru corectorul ortografic al Windows (setare de sistem)
