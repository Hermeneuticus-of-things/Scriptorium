# Inventarul complet al funcțiilor Scrivener 3 → Scribner

Lista de control după care construim. Structura urmează meniurile și panourile din Scrivener 3 (Windows 3.x și macOS 3.x), plus Compile, sincronizare și formatul de fișier.

Stare: `[x]` făcut · `[~]` parțial · `[ ]` de făcut · `[-]` exclus intenționat (motivul e scris lângă).
Versiunea țintă: v0.2 / v0.3 / v0.4 / v1.0.

Sursele sunt manualul și interfața Scrivener 3, din cunoașterea mea, și documentația comunității pentru formatul `.scriv` ([scrivener-skills](https://github.com/donnfelker/scrivener-skills)). Nu am putut verifica manualul oficial de aici, pentru că literatureandlatte.com e blocat în rețeaua containerului.

---

## A. Fișier (File)

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Proiect nou |
| [x] | 0.2 | Proiect nou din șablon (Gol, Roman, Roman cu părți, Povestiri, Non-ficțiune) |
| [~] | 0.3 | Șabloane Scrivener complete: Novel (with Parts), Short Story (format manuscris), Screenplay, Stage Play, Non-Fiction (Essay, Thesis, Lecture Notes, Recipe Collection), Poetry, Blank, Novel Formatted — există doar Gol, Roman, Roman cu părți, Povestiri, Non-ficțiune; lipsesc Short Story manuscris, Screenplay, Stage Play, Essay/Thesis/Lecture Notes/Recipe, Poetry |
| [ ] | 0.3 | Salvează proiectul ca șablon (titlu, categorie, descriere, icoană) |
| [x] | 0.1 | Deschide proiect, proiecte recente |
| [x] | 0.3 | Recente: șterge lista, fixează proiecte favorite |
| [x] | 0.1 | Închide proiectul |
| [x] | 0.1 | Salvare automată, Ctrl+S salvare imediată |
| [x] | 0.3 | Save As (copie a proiectului cu alt nume) |
| [x] | 0.2 | Backup: automat la închidere și la interval, păstrează N, folder ales, restaurare |
| [~] | 0.3 | Backup: la deschidere, la salvarea manuală, opțiunea zip/nezipat, nume cu dată — backup la închidere, la interval și manual (zip, nume cu dată); lipsesc backup la deschidere și opțiunea nezipat |
| [x] | 0.1 | Import Scrivener 3 (.scriv) |
| [~] | 0.2 | Import .scriv **fără pierderi** (vezi secțiunea Q) |
| [x] | 0.3 | Import Scrivener 1 și 2 (Files/Docs/N.rtf) |
| [x] | 0.2 | Import Word (.docx), text, Markdown, cu împărțire în documente |
| [x] | 0.3 | Import: RTF, ODT, HTML, OPML, Final Draft (.fdx), Fountain, PDF, imagini, audio/video, pagini web |
| [~] | 0.3 | Import and Split cu separator ales (deja la DOCX/TXT/MD; de extins la RTF/ODT) — backend-ul (io:importFiles) împarte orice format, dar dialogul Import filtrează doar DOCX/TXT/MD, iar „Importă fișiere” trimite mereu modul none |
| [~] | 0.4 | Import Web Page (salvare offline în Cercetare) — pagina se importă ca document; imaginile rămân linkuri, nu se salvează offline |
| [x] | 0.4 | Import din Zotero / manager de bibliografie |
| [x] | 0.1 | Compile: DOCX, PDF, EPUB, HTML |
| [~] | 0.3 | Export fișiere: documentele ca DOCX/RTF/ODT/TXT/MD cu structura de foldere, cu note și metadate — DOCX/RTF/MD/TXT/HTML cu foldere, note și metadate; lipsește ODT |
| [x] | 0.3 | Export OPML, Export metadate CSV |
| [x] | 0.4 | Export ca proiect Scrivener (.scriv) |
| [~] | 0.3 | Page Setup / Print Setup — mărimea paginii și marginile există doar în Compile; nu există Page Setup pentru tipărire |
| [~] | 0.3 | Print Current Document, Print Preview — tipărirea documentului curent există; lipsește Print Preview |
| [~] | 0.4 | Sync cu folder extern (Dropbox/Drive), RTF/TXT/FDX/Fountain, formate separate draft și notes, sync la deschidere/închidere — RTF/TXT/MD, conflicte cu snapshot; lipsesc FDX/Fountain, formate separate pentru Draft și Notes, sync automat la deschidere/închidere |
| [-] | 1.0 | Sync cu aplicația mobilă (Scrivener iOS: Dropbox). Exclus pentru format, înlocuit de PWA/sync propriu — format proprietar al aplicației iOS; înlocuit de sync prin folder extern și pachete PWA |
| [x] | 0.3 | Proprietăți proiect: titlu, autor, prenume, nume, abreviere titlu |

## B. Editare (Edit)

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Undo/Redo, Cut/Copy/Paste |
| [x] | 0.2 | Paste and Match Style (Ctrl+Shift+V) |
| [x] | 0.3 | Copy Special: ca text simplu, ca HTML, ca Markdown, fără comentarii și note |
| [~] | 0.3 | Select All / Select Paragraph / Select Sentence / Select Word — Select All există (nativ, meniu contextual); lipsesc Select Paragraph / Sentence / Word |
| [~] | 0.3 | Insert: data și ora, linie orizontală, salt de pagină, tabel, imagine, legătură, notă, adnotare, placeholder (<$n>, <$wc>…), caracter special, semn de paragraf — lipsește inserarea orei; salt de pagină și linie orizontală sunt același element |
| [x] | 0.2 | Comentarii (legate de text) |
| [x] | 0.3 | Adnotări inline (text colorat în corpul documentului) și conversie inline ↔ comentariu |
| [x] | 0.2 | Note de subsol (în text, editabile cu dublu-clic) |
| [x] | 0.3 | Note de subsol în Inspector (legate) vs inline, conversie între ele |
| [x] | 0.3 | Scrivener Links (legătură internă spre alt document, `[[`) |
| [x] | 0.3 | Hyperlink extern, editare, eliminare |
| [ ] | 0.3 | Bookmark-uri în text (legături de tip bookmark) |
| [x] | 0.2 | Find & Replace în proiect (regex, cuvinte întregi, majuscule) |
| [x] | 0.2 | Find & Replace în documentul curent (Ctrl+F) cu evidențiere și Next/Previous |
| [ ] | 0.3 | Find by formatting: comentarii, note, highlight, culoare text, revizii, stil, adnotări |
| [ ] | 0.3 | Find Synonyms, Look up in dictionary |
| [x] | 0.1 | Spelling: corector Chromium |
| [~] | 0.2 | Spelling în română (dicționar ro), Check document now, dicționar personal, ignoră — ro + en-US, sugestii, „Adaugă în dicționar”; lipsesc „Ignoră”, Check document now și gestionarea dicționarului personal |
| [~] | 0.3 | Text Substitutions (smart quotes ✓, dashes ✓, elipse ✓, autocorectare personalizată, fracții) — ghilimele, cratime, elipse, înlocuiri personalizate; lipsesc fracțiile |
| [x] | 0.3 | Auto-complete list (nume din proiect) |
| [x] | 0.3 | Transformations: majuscule/minuscule/Title Case, eliminare spații duble, convertire ghilimele, conversie inline ↔ linked notes, convertire adnotări în comentarii |
| [x] | 0.2 | Split at Selection (Ctrl+K) |
| [x] | 0.2 | Split with Selection as Title |
| [x] | 0.2 | Merge documente |
| [ ] | 0.3 | Append Selection to Document (trimite selecția în alt document) |
| [x] | 0.3 | Duplicare document |

## C. Vizualizare (View)

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Scrivenings / Corkboard / Outline (comutare) |
| [x] | 0.2 | Scrivenings pentru dosar |
| [ ] | 0.3 | Scrivenings pentru selecție multiplă, rezultat de căutare, colecție |
| [~] | 0.3 | Scrivenings: separatoare vizibile/ascunse, titluri ca text — titlurile secțiunilor se afișează mereu; lipsește comutarea separatoarelor și a titlurilor ca text |
| [x] | 0.2 | Split editor (vertical) |
| [~] | 0.3 | Split orizontal, comutare, swap, același document în ambele (sincronizat) — split doar vertical, cu panou blocat; lipsesc split orizontal, swap și același document editabil sincronizat în ambele |
| [x] | 0.2 | Lock in place (panoul 2 blocat) |
| [x] | 0.3 | Navigare: Go To document (căutare titlu, Ctrl+G) |
| [x] | 0.2 | Înapoi/Înainte |
| [x] | 0.1 | Composition Mode (F11) |
| [~] | 0.3 | Composition: fundal (imagine/culoare), lățime pagină, opacitate, panou Inspector plutitor, ținte vizibile — fundal culoare, lățime, opacitate, Inspector plutitor; lipsesc fundalul imagine și țintele vizibile în compunere |
| [x] | 0.1 | Typewriter Scrolling |
| [~] | 0.3 | Text Zoom (100–300%), Page View (A4/Letter/pagini față-verso) — zoom 75–200%, Page View doar A5; lipsesc A4/Letter și pagini față-verso |
| [x] | 0.3 | Show Invisibles (spații, tab-uri, paragrafe) |
| [ ] | 0.3 | Ruler, Format Bar ascuns/afișat |
| [x] | 0.3 | Header bar editor (titlu, navigare, meniu document) |
| [~] | 0.3 | Footer bar (cuvinte, caractere, țintă, zoom) — cuvinte, caractere, țintă; lipsește controlul de zoom în bara de jos |
| [~] | 0.3 | Linguistic Focus: dialog, substantive, verbe, adjective, adverbe, pronume — dialog, substantive, verbe, adjective, adverbe (etichetare euristică); lipsesc pronumele |
| [~] | 0.3 | Highlight current line, Fade text — evidențiază paragraful curent și focus paragraf/frază; lipsesc linia curentă propriu-zisă și Fade text configurabil |
| [ ] | 0.3 | Text Appearance: afișare comentarii/note inline, revizii |
| [x] | 0.1 | Inspector vizibil/ascuns |
| [x] | 0.1 | Binder vizibil/ascuns |
| [x] | 0.3 | Collections tabs |
| [x] | 0.3 | Quick Reference panels (ferestre cu un document) |
| [x] | 0.2 | Lățimea panourilor redimensionabilă |
| [x] | 0.3 | Layouts salvate (Window > Layouts) |
| [ ] | 0.3 | Full screen fereastră |
| [x] | 0.3 | Outline: coloane vizibile alese, expand/collapse all |
| [~] | 0.3 | Corkboard: Freeform, Arrange by label/status/keyword, carduri pe rânduri, mărime card, ratio, stampile status, culoare eticheta pe card — freeform, aranjare pe linii, 3 mărimi, ștampile, nuanța etichetei; lipsesc ratio, spațiere și numărul de coloane |

## D. Navigare (Navigate)

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.2 | Back/Forward |
| [x] | 0.3 | Go To Next/Previous document în binder |
| [x] | 0.3 | Go To Enclosing Group |
| [ ] | 0.3 | Reveal in Binder |
| [x] | 0.2 | Open in other editor (Alt+clic) |
| [x] | 0.3 | Open in Quick Reference |
| [ ] | 0.3 | Open in External Editor (pentru fișiere media) |
| [x] | 0.3 | Bookmark-uri (sare la document) |
| [x] | 0.3 | Favorite documents (meniu Go To Favorites) |

## E. Proiect (Project)

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | New Text / New Folder |
| [x] | 0.3 | New From Template (din Template Sheets) |
| [x] | 0.3 | Add new: Media, Web Page, File (în Cercetare) |
| [x] | 0.3 | Template Sheets folder (desemnat) |
| [x] | 0.1 | Empty Trash |
| [x] | 0.2 | Project Search (căutare în tot proiectul) |
| [x] | 0.3 | Project Search: căutare în titlu/text/note/sinopsis/metadate/keywords, operatori, salvată |
| [x] | 0.2 | Project Replace (cu snapshot automat) |
| [x] | 0.3 | Project Replace: și în titluri, sinopsis, note |
| [~] | 0.2 | Project Targets: carte și sesiune ✓ |
| [~] | 0.3 | Project Targets: deadline, zilele de scris, resetarea sesiunii (miezul nopții / la deschidere), numără doar textul inclus în Compile, notificare la atingere, țintă în caractere sau pagini — deadline, zile de scris, reset sesiune, doar Compile, notificare, cuvinte/caractere; lipsește ținta în pagini |
| [x] | 0.2 | Writing History (pe zile, CSV) |
| [~] | 0.3 | Writing History: lunar, caractere, alte documente separat — zilnic, manuscris vs. tot proiectul, CSV; lipsesc vederea lunară și caracterele |
| [x] | 0.3 | Project Statistics: cuvinte, caractere, pagini estimate (paperback/printed), pentru Compile/selecție |
| [~] | 0.3 | Text Statistics: frecvența cuvintelor, distribuție părți de vorbire, lungime medie — frecvența cuvintelor și lungimea frazelor; lipsește distribuția părților de vorbire |
| [x] | 0.2 | Project Notes |
| [x] | 0.3 | Project Notes: mai multe tab-uri |
| [x] | 0.3 | Project Keywords: fereastră cu listă, culori, ierarhie, căutare după keyword |
| [~] | 0.2 | Keywords per document ✓, culori ✗ |
| [~] | 0.3 | Project Settings: Labels (nume, culori, titlu rubrică), Status, Custom Metadata (Text, Checkbox, List, Date), Section Types, Formatting implicit, Auto-complete, Backup per proiect, Compile, Bookmarks proiect, Special Folders — proprietăți, Labels, Status, Custom Metadata, Section Types, Template Sheets; lipsesc Formatting implicit, listă Auto-complete, Backup per proiect și Special Folders în setări |
| [x] | 0.3 | Custom Metadata: valori per document în Inspector și coloane în Outline |
| [x] | 0.3 | Section Types: definire, atribuire pe nivel (Folders/Containers/Files) și manual per document |
| [x] | 0.3 | Project Bookmarks |
| [x] | 0.3 | Collections: create, redenumire, culoare, adaugă/scoate documente, colecție din căutare |

## F. Documente (Documents)

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Move to Trash |
| [x] | 0.2 | Move cu tastatura (sus/jos/indent/outdent) |
| [ ] | 0.3 | Move To (alt dosar din meniu) |
| [x] | 0.1 | Include in Compile |
| [x] | 0.1 | Label / Status |
| [~] | 0.3 | Change icon (set + culori), Revert icon — set de icoane și revenire la implicită; lipsesc culorile icoanei |
| [x] | 0.2 | Duplicare (cu/fără copii) |
| [x] | 0.2 | Snapshots: take, list, view, restore |
| [x] | 0.2 | Snapshots: comparare cu textul curent |
| [~] | 0.3 | Snapshots: comparare între două snapshot-uri, titlu editabil, ștergere, auto-snapshot la sync, snapshot pentru toate documentele selectate — comparare doar cu textul curent, auto-snapshot la conflict de sync; lipsesc compararea a două snapshot-uri, titlu editabil, ștergere, snapshot pentru selecție multiplă |
| [~] | 0.3 | Convert: Text to Folder / Folder to Text, To Default Formatting — Text ↔ Folder există; lipsește To Default Formatting |
| [~] | 0.3 | Auto-generate Synopsis from text — doar prin AI (Sinopsis AI în bloc); lipsește generarea locală din primele fraze |
| [x] | 0.3 | Lock Document (doar citire) |
| [x] | 0.3 | Sort children (alfabetic, după dată) |
| [~] | 0.3 | Expand/Collapse all — doar în Outline; lipsește în binder |
| [ ] | 0.3 | Separator (marcare ca separator) |

## G. Format

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Bold, Italic, Underline, Strikethrough |
| [~] | 0.3 | Font (familie, mărime per text), culoare text, culoare fundal — culoare text și highlight; lipsesc familia și mărimea fontului per text (doar prin stiluri) |
| [~] | 0.3 | Superscript, Subscript, Small caps, All caps — superscript/subscript în bară; small caps doar prin stiluri, all caps doar ca transformare |
| [~] | 0.3 | Highlight (5 culori + personalizat) — 5 culori; lipsește culoarea personalizată |
| [x] | 0.1 | Titluri, citat, listă cu buline |
| [~] | 0.3 | Liste numerotate (1., a., i.), indentare, stiluri de listă — liste 1. cu indentare; lipsesc stilurile a. / i. și alegerea stilului de listă |
| [x] | 0.3 | Alignment: stânga, centru, dreapta, justify |
| [~] | 0.3 | Line spacing, spațiere înainte/după, indent prima linie, indent stânga/dreapta — indent și spațiere doar prin stiluri; lipsesc line spacing, indent prima linie și indent dreapta per paragraf |
| [ ] | 0.3 | Tab stops (ruler) |
| [x] | 0.3 | Tabele (inserare, rânduri, coloane, margini) |
| [~] | 0.3 | Imagini (inserare, scalare, aliniere) — inserare; lipsesc scalarea și alinierea imaginii |
| [x] | 0.3 | Styles: Paragraph, Character, Para+Char; panou stiluri; Redefine from selection; Next style; scurtături; import stylesheet din alt proiect |
| [-] | 0.3 | Formatting presets (Scrivener 2) — înlocuit de Styles (Scrivener 3 a renunțat la Formatting presets) |
| [~] | 0.3 | Revision Mode (5 nivele de culoare), Remove revision colors, Track changes la import/export DOCX — 5 runde, acceptare/eliminare; lipsește Track changes la import/export DOCX |
| [ ] | 0.3 | Make Default Formatting, Copy/Paste formatting |
| [x] | 0.3 | Script Mode (Screenplay, Stage Play, Comic) cu elemente și Tab/Enter |
| [ ] | 0.3 | Writing direction RTL |

## H. Unelte (Tools)

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Spelling (Chromium) |
| [x] | 0.3 | Name Generator |
| [x] | 0.3 | Text-to-speech (citire cu voce tare) |
| [x] | 0.3 | Dictare |
| [x] | 0.3 | Statistics (proiect și text) |
| [ ] | 0.3 | Writing Tools: Look up în dicționar, tezaur, Wikipedia, Google (deschide browser) |
| [~] | 0.3 | Scratchpad (bloc global, trimite în proiect) — bloc global cu note; lipsește trimiterea notei în proiect |
| [x] | 0.3 | Appearance customization: culori interfață, fonturi editor, temă |
| [x] | 0.3 | Keyboard shortcuts personalizate |
| [x] | 0.1 | Options/Preferences (parțial: temă, font, typewriter, cheie AI, backup, ghilimele) |
| [~] | 0.3 | Options complete: General, Appearance, Behaviors, Corrections, Editing, Sharing, Backup, Keyboard — General, Appearance, Behaviors, Corrections, Editing, Backup, Keyboard; lipsește Sharing |

## I. Fereastră (Window)

| Stare | Ver. | Funcție |
|---|---|---|
| [~] | 0.3 | Layouts: save, manage, switch — salvare și comutare; lipsește gestionarea (ștergere/redenumire) |
| [x] | 0.3 | Float Quick Reference |
| [x] | 0.4 | Mai multe ferestre de proiect |

## J. Binder

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Draft, Research, Trash |
| [x] | 0.1 | Drag & drop |
| [x] | 0.2 | Selecție multiplă |
| [~] | 0.3 | Drag & drop selecție multiplă, Alt-drag = copiere — selecție multiplă există, dar drag & drop mută un singur element; lipsește Alt-drag = copiere |
| [x] | 0.3 | Text cu copii (document-container, nu doar dosar) |
| [x] | 0.3 | Media în binder (imagine, PDF, audio, video, web) cu vizualizare |
| [~] | 0.3 | Icoane personalizate și culoarea etichetei pe icoană — icoane personalizate; lipsește culoarea etichetei pe icoană |
| [ ] | 0.3 | Hoisting (Focus on folder) |
| [ ] | 0.3 | Document în coș: restaurează la locul original |

## K. Inspector

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Synopsis (text) |
| [~] | 0.3 | Synopsis imagine — apare pe card în Corkboard; nu se poate alege/vedea în Inspector |
| [x] | 0.1 | General Meta-Data: Label, Status, Include in Compile |
| [x] | 0.3 | Section Type, Created, Modified |
| [x] | 0.3 | Custom Metadata |
| [x] | 0.2 | Keywords |
| [x] | 0.1 | Notes (document) |
| [x] | 0.2 | Project Notes |
| [x] | 0.3 | Bookmarks (document + proiect) cu previzualizare |
| [x] | 0.2 | Snapshots |
| [x] | 0.2 | Comments & Footnotes (listă) |
| [~] | 0.3 | Comments: culoare, autor, dată, salt la text, editare, ștergere, conversie — listă doar pentru citire în Inspector; lipsesc culoare, autor, dată, salt la text, editare, ștergere (conversia există în bara de format) |
| [ ] | 0.3 | Lock Inspector |

## L. Ținte și progres

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Țintă document (cuvinte) |
| [~] | 0.3 | Țintă document în caractere, notificare, vizibilă în Outline și bara de jos — țintă în cuvinte, vizibilă în Outline și bara de jos; lipsesc ținta în caractere și notificarea |
| [x] | 0.1 | Țintă carte și sesiune |
| [~] | 0.3 | Vezi secțiunea E (Project Targets complete) — vezi Project Targets: lipsește ținta în pagini |

## M. Corkboard

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Carduri cu titlu și sinopsis |
| [x] | 0.2 | Reordonare drag & drop |
| [x] | 0.3 | Freeform, Commit order |
| [x] | 0.3 | Arrange by label / status / keyword (linii) |
| [~] | 0.3 | Card size, ratio, spacing, coloane — doar mărimea (3 trepte); lipsesc ratio, spațiere și coloane |
| [~] | 0.3 | Status stamps, label tint, keyword chips pe card, pin-uri — ștampile, nuanța etichetei, cuvinte cheie; lipsesc pin-urile |
| [x] | 0.3 | Synopsis imagine pe card |
| [ ] | 0.3 | Corkboard din mai multe dosare (stacked) |

## N. Outline

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Titlu, sinopsis, label, status, Include, cuvinte |
| [~] | 0.3 | Coloane alese: Target, Progress, Created, Modified, Keywords, Section Type, Characters, Custom Metadata, Total Words — lipsește coloana Characters |
| [x] | 0.3 | Sortare, editare titlu inline, drag & drop rânduri, expand/collapse |

## O. Compile

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | DOCX, PDF, EPUB, HTML |
| [~] | 0.3 | Formate: RTF, ODT, MultiMarkdown, Markdown, Fountain, FDX, LaTeX (prin MMD/Pandoc), Kindle (KPF), Plain text, Print — RTF, ODT, MMD, MD, text în Compile; Fountain/FDX/LaTeX doar ca exporturi separate; KPF imposibil (format închis, Kindle primește EPUB); lipsește Print direct |
| [~] | 0.3 | Compile Formats: Default, Standard Manuscript, Paperback Novel, Ebook, Modern, Times/Courier; editabile; salvate ca proiect sau globale — Manuscris standard, Paperback, E-book, Modern, PDF A5 editabile; salvate doar în proiect (nu globale); lipsesc Default și Times/Courier |
| [x] | 0.3 | Section Layouts (titlu, prefix/sufix, text, page break, separator) legate de Section Types |
| [x] | 0.3 | Separatoare: text, folder, între tipuri |
| [x] | 0.3 | Front Matter / Back Matter din dosare |
| [~] | 0.3 | Contents: alegere documente, filtre (label, status, collection) — alegere dosar, filtre etichetă/status; lipsește filtrul după colecție |
| [~] | 0.3 | Placeholders: <$n>, <$t>, <$wc>, <$p>, <$projecttitle>, <$author>, <$date>, <$img>, numere romane/în litere — lipsește <$img> |
| [x] | 0.3 | Replacements |
| [x] | 0.3 | Transformations: ghilimele, dash, înlocuire linii, eliminare highlight |
| [x] | 0.3 | Styles mapping la compile |
| [x] | 0.3 | Footnotes & Comments: note de subsol / de final / comentarii Word, numerotare, separator |
| [x] | 0.3 | Page Settings: mărime, margini, antet/subsol diferit pe prima pagină și pe pagini pare/impare |
| [x] | 0.3 | Metadata (titlu, autor, ISBN, limbă, cuvinte cheie) |
| [x] | 0.3 | Cover și Title page EPUB |
| [x] | 0.3 | Table of Contents (din titluri) |
| [x] | 0.3 | Text processing: eliminare comentarii/adnotări/highlight/culori |
| [x] | 0.3 | Compile Group (subset din manuscris) |
| [x] | 0.3 | Preview înainte de Compile |

## P. Scenarii (Script Mode)

| Stare | Ver. | Funcție |
|---|---|---|
| [~] | 0.4 | Screenplay, Stage Play (US/UK), Comic Script, BBC Radio — Screenplay, Stage Play, Comic, BBC Radio; lipsește varianta Stage Play UK separată |
| [~] | 0.4 | Elemente cu Tab/Enter, auto-complete personaje/scene — Tab/Enter și auto-complete personaje; lipsește auto-complete pentru scene |
| [x] | 0.4 | Export Final Draft FDX, Fountain |

## Q. Import Scrivener 3 fără pierderi

Ce conține un proiect `.scriv` și unde ajunge în Scribner:

| Stare | Element Scrivener | Ajunge în |
|---|---|---|
| [x] | Binder: Draft, Research, Trash, foldere, documente, ordinea | arbore |
| [x] | Titlu | titlu |
| [x] | Titlu lipsă (titlu adaptiv din sinopsis / primul rând) | titlu |
| [x] | `Type` necunoscut / viitor | păstrat ca element generic |
| [x] | Text cu copii (file group) | document-container |
| [x] | `content.rtf`: paragrafe, bold, italic, underline | HTML |
| [x] | RTF: strikethrough, superscript, subscript, culori text, highlight, aliniere, indent, liste (buline/numerotate), tabele, salt de linie/pagină | HTML |
| [x] | RTF: imagini `\pict` (PNG/JPEG/EMF), `\NeXTGraphic` | imagini |
| [x] | RTF: stiluri `<$Scr_H::n>` / `<$Scr_Ps::n>` / `<$Scr_Cs::n>` + `styles.xml` | titluri, citate, stiluri |
| [x] | RTF: hyperlink extern | link |
| [x] | RTF: Scrivener Link (spre UUID) | link intern |
| [x] | RTF: comentarii legate (`scrivcmt://` + `content.comments`), autor, culoare, dată | comentariu |
| [x] | RTF: note de subsol legate (Footnote="Yes") | notă de subsol |
| [x] | RTF: note de subsol inline (`\Scrv_fn` … `\end_Scrv_fn`) | notă de subsol |
| [x] | RTF: adnotări inline (`\Scrv_annot` … `\end_Scrv_annot`) | adnotare |
| [x] | RTF: placeholdere `<$…>` | păstrate ca text |
| [x] | `notes.rtf` | note document |
| [x] | `synopsis.txt` | sinopsis |
| [x] | Synopsis imagine | sinopsis imagine |
| [x] | Labels (nume, culoare), Status | etichete, statusuri |
| [x] | Include in Compile | Include în Compile |
| [x] | Keywords (nume, culoare) + per document | cuvinte cheie |
| [x] | Custom Metadata (definiții + valori) | metadate proprii |
| [x] | Section Types (definiții, pe nivel, per document) | tipuri de secțiune |
| [x] | Created / Modified | date |
| [x] | Icoane personalizate | icoană |
| [x] | Ținte per document | țintă |
| [x] | Project Targets (draft, sesiune, deadline) | ținte proiect |
| [x] | Collections (Arbitrary, Search) | colecții |
| [x] | Bookmarks (document + proiect) | bookmark-uri |
| [x] | Project Notes | note de proiect |
| [x] | Snapshots (titlu, dată, text) | snapshot-uri |
| [x] | `writing.history` | istoricul scrisului |
| [x] | Media: `content.<ext>` (imagini, PDF, audio, video, web archive) | fișiere în Cercetare |
| [x] | Template Sheets folder | Șabloane |
| [x] | `Settings/compile.xml` (format, replacements, metadate) | păstrat |
| [x] | Corkboard freeform (poziții), Outline (stări) | păstrat |
| [x] | Proprietăți proiect (titlu, autor) | proiect |
| [x] | Orice altceva necunoscut | copia completă a proiectului original, păstrată în `scrivener-original/` |
| [x] | Scrivener 1/2 (`Files/Docs/N.rtf`) | la fel ca Scrivener 3 |
| [x] | Raport de import: câte elemente, ce s-a convertit, ce s-a păstrat doar în copie | dialog |

## R. Excluse intenționat

| Funcție | Motiv |
|---|---|
| Sync Dropbox cu Scrivener iOS | Format proprietar al aplicației mobile; înlocuit de sync prin folder extern și PWA |
| Simplenote / Index Card sync | Servicii închise sau abandonate |
| MathType | Program comercial extern; înlocuit de editor de formule MathML (v1.0) |
| Bibliografie EndNote/Bookends | Integrare Zotero (deschis) în schimb |

## S. Peste Scrivener (Scribner)

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Asistent AI Claude (corectură, sinopsis, continuare, critică, consistență, întrebări) |
| [x] | 0.1 | Format deschis HTML + JSON, portabil |
| [x] | 0.3 | Sinopsis AI în bloc, fișe personaje vii, consistență pe toată cartea |
| [x] | 0.4 | Cronologie, hartă relații, analiză de ritm, pachet pentru editor |
