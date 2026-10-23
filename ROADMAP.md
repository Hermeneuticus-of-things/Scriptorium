# Roadmap Scriptorium: toate funcțiile Scrivener 3 (extins)

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
- [ ] Editarea listelor de cuvinte interzise din Setări
- [ ] Test end-to-end cu Claude real
- [ ] Glosare generate automat: `Glosar_Alogeni_Indieni`, `Glosar_de_lectură`, `Cuprins_de_tipar`
- [ ] Index canonic (`Index_de_Lucru`, noduri N.N.N cu tip/greutate/dependențe) ca sursă pentru R1 și R6 macro
- [ ] „VKB2” și definițiile tale exacte pentru I-REP / I-EDIT (nu le am; aștept fișierele)

### 1.3 Conexiune MCP pentru agenți AI
- [x] Server MCP `scriptorium-mcp` (stdio), pornit de Claude Code / Claude Desktop / alți agenți, mod `--read-only`
- [x] 20 de unelte: `project_info`, `list_binder`, `read_document`, `write_document`, `create_document`, `move_item`, `set_metadata`, `trash_item`, `search`, `replace`, `get_notes`, `set_notes`, `add_comment`, `add_footnote`, `lint`, `list_snapshots`, `take_snapshot`, `restore_snapshot`, `compile`, `writing_history`
- [x] Resurse: binderul și fiecare document (`scriptorium://doc/{id}`)
- [x] Aplicația se reîncarcă automat când un agent modifică fișierele
- [x] Setări: comanda gata de copiat pentru Claude Code și Claude Desktop
- [x] Jurnal al acțiunilor agenților (`agent-log.jsonl`), snapshot înainte de fiecare scriere
- [ ] Verificat cu Claude Code real pe Windows

### 1.4 Restul v0.2
- [ ] Paste and Match Style (Ctrl+Shift+V)
- [ ] Find & Replace în documentul curent (Ctrl+F)
- [ ] Split with Selection as Title
- [ ] Duplicare document
- [ ] Spelling în română (dicționar ro, ignoră, dicționar personal)

---

## 2. v0.3: revizie și publicare

### 2.1 Editor și format
- [ ] Bara de format completă: superscript, subscript, culoare text, highlight (5 culori), aliniere, tabele, imagini, liste numerotate
- [ ] Ruler: indent prima linie, spațiere, tab-uri
- [ ] Styles (Paragraph / Character / Para+Char), panou, Redefine, Next style, scurtături, import stylesheet
- [ ] Revision Mode (5 nivele de culoare), eliminare culori de revizie
- [ ] Adnotări inline din bara editorului, conversie inline ↔ comentariu, inline ↔ notă legată
- [ ] Scrivener Links `[[` și linkuri externe din bara editorului
- [ ] Page View, Text Zoom, Show Invisibles, header/footer bar
- [ ] Linguistic Focus (dialog, părți de vorbire), Highlight current line
- [ ] Composition: fundal, lățime, opacitate, Inspector plutitor
- [ ] Transformations: majuscule, spații duble, ghilimele
- [ ] Insert: dată, placeholder, caractere speciale, salt de pagină
- [ ] Copy Special (text simplu, HTML, Markdown, fără note)
- [ ] Auto-complete cu nume din proiect

### 2.2 Proiect și organizare
- [ ] Project Settings complet: Labels, Status, Custom Metadata, Section Types, Auto-complete, Special Folders, Bookmarks
- [ ] Custom Metadata editabile în Inspector și coloane în Outline
- [ ] Section Types: pe nivel (Folders/Containers/Files) și manual per document
- [ ] Keywords: fereastră proiect, culori, ierarhie, căutare după keyword
- [ ] Collections: tab-uri, manuale, din căutare, colorate
- [ ] Bookmarks în Inspector (document + proiect) cu previzualizare
- [ ] Template Sheets: „Nou din șablon”
- [ ] Document-container (text cu copii), conversie Text ↔ Folder
- [ ] Icoane personalizate, Lock document, Sort children, Separator
- [ ] Media în Cercetare: imagini, PDF, audio, video, pagini web, cu vizualizare
- [ ] Project Search avansat (câmpuri, operatori, salvat ca colecție), Replace și în titluri/sinopsis/note
- [ ] Project Targets complete: deadline, zile de scris, reset sesiune, doar textul din Compile, notificare, caractere
- [ ] Project Statistics și Text Statistics (frecvență cuvinte, pagini estimate)
- [ ] Note de proiect cu mai multe tab-uri
- [ ] Go To (Ctrl+G), Next/Previous document, Enclosing group, Reveal in Binder, Favorite

### 2.3 Corkboard și Outline
- [ ] Freeform corkboard, Commit order
- [ ] Arrange by label / status / keyword (linii)
- [ ] Mărime card, ratio, coloane, stampile status, culoarea etichetei, keywords pe card
- [ ] Synopsis imagine
- [ ] Outline: coloane alese, sortare, titlu editabil, drag & drop, expand/collapse

### 2.4 Compile complet
- [ ] Formate: Standard Manuscript, Paperback, Ebook, Modern; editabile și salvate
- [ ] Section Layouts legate de Section Types (titlu, prefix/sufix, page break, separator)
- [ ] Front matter / Back matter, pagină de titlu, cuprins
- [ ] Placeholders: `<$n>`, `<$t>`, `<$wc>`, `<$p>`, `<$projecttitle>`, `<$author>`, numere romane/în litere
- [ ] Replacements, transformări, mapare stiluri
- [ ] Note: de subsol / de final / comentarii Word
- [ ] Pagină: mărime (A5, A4, 6×9, 5×8), margini oglindite, antet/subsol pe pagini pare/impare
- [ ] Metadate și copertă EPUB
- [ ] Formate în plus: RTF, ODT, Markdown, MultiMarkdown, text simplu
- [ ] Compile doar pentru o selecție sau un grup, previzualizare
- [ ] Pachetul pentru editor (ce merge în „PENTRU EDITOR”, după specificația ta)

### 2.5 Import / export / siguranță
- [ ] Import RTF, ODT, HTML, OPML, PDF, imagini, pagini web
- [ ] Export documente ca fișiere (DOCX/RTF/MD/TXT) cu structura de foldere și metadate
- [ ] Export OPML, Export metadate CSV
- [ ] Print, Page Setup, Print Preview
- [ ] Proprietăți proiect (titlu, autor, abreviere), Save As
- [ ] Recente: fixare, ștergere

### 2.6 Interfață
- [ ] Meniu complet (Fișier, Editare, Vizualizare, Navigare, Proiect, Documente, Format, Unelte, Fereastră, Ajutor)
- [ ] Scurtături configurabile
- [ ] Layouts salvate, Quick Reference
- [ ] Options complete: General, Appearance, Behaviors, Corrections, Editing, Backup, Keyboard
- [ ] Interfață în română și engleză

---

## 3. v0.4: paritate avansată

- [ ] Script Mode: Screenplay, Stage Play, Comic, BBC Radio; elemente cu Tab/Enter; export FDX și Fountain
- [ ] Sync cu folder extern (Dropbox/Drive), RTF/TXT/MD, conflicte cu snapshot
- [ ] Export ca proiect Scrivener (.scriv)
- [ ] Mai multe ferestre de proiect
- [ ] Name Generator, Text-to-speech, Dictare, Scratchpad
- [ ] Import Zotero, bibliografie
- [ ] Export Kindle (KPF), LaTeX, Pandoc

## 4. v1.0: paritate completă + extra

- [ ] Toate rândurile `[ ]` din `FEATURES-SCRIVENER3.md` închise sau mutate explicit la `[-]`
- [ ] Sinopsis AI în bloc, consistență pe toată cartea, fișe vii
- [ ] Cronologie, hartă de relații, analiză de ritm
- [ ] Panou NotebookLM / RAG cu cozi asincrone și cache pe concept (fluxul NLM din workspace)
- [ ] Revizie multi-agent pe niveluri de zoom (Maha / Macro / Mezzo / Micro / Nano), cu rapoarte GRAVE/MEDIU
- [ ] PWA / sync mobil

## 5. Excluse intenționat

| Funcție | Motiv |
|---|---|
| Sync Dropbox cu Scrivener iOS | Format proprietar al aplicației mobile; în locul lui vin sync prin folder extern și PWA |
| Simplenote / Index Card | Servicii închise |
| MathType | Program comercial; în locul lui vine un editor MathML |
| EndNote / Bookends | În locul lor vine Zotero |
