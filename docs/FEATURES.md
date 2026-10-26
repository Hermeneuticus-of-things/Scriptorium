# Inventarul complet al funcțiilor Pneuma Sofer

Lista de control după care construim. Structura urmează meniurile și panourile programului de referință, plus Compile, sincronizare și formatul de fișier.

Stare: `[x]` făcut · `[~]` parțial · `[ ]` de făcut · `[-]` exclus intenționat (motivul e scris lângă).
Versiunea țintă: v0.2 / v0.3 / v0.4 / v1.0.

Sursele sunt programul de referință, din cunoașterea mea, și documentația comunității pentru formatul `.scriv` ([scrivener-skills](https://github.com/donnfelker/scrivener-skills)). Nu am putut verifica manualul oficial de aici, pentru că literatureandlatte.com e blocat în rețeaua containerului.

---

## A. Fișier (File)

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Proiect nou |
| [x] | 0.2 | Proiect nou din șablon (Gol, Roman, Roman cu părți, Povestiri, Non-ficțiune) |
| [x] | 0.3 | Șabloane Scrivener complete: Novel (with Parts), Short Story (format manuscris), Screenplay, Stage Play, Non-Fiction (Essay, Thesis, Lecture Notes, Recipe Collection), Poetry, Blank, Novel Formatted — toate, grupate pe categorii în Acasă |
| [x] | 0.3 | Salvează proiectul ca șablon (titlu, categorie, descriere, icoană) — copie în userData/templates, listat pe categorii în Acasă, ștergere |
| [x] | 0.1 | Deschide proiect, proiecte recente |
| [x] | 0.3 | Recente: șterge lista, fixează proiecte favorite |
| [x] | 0.1 | Închide proiectul |
| [x] | 0.1 | Salvare automată, Ctrl+S salvare imediată |
| [x] | 0.3 | Save As (copie a proiectului cu alt nume) |
| [x] | 0.2 | Backup: automat la închidere și la interval, păstrează N, folder ales, restaurare |
| [x] | 0.3 | Backup: la deschidere, la salvarea manuală, opțiunea zip/nezipat, nume cu dată — la deschidere (setarea backupOnOpen), închidere, interval, manual; zip sau folder (backupZip) |
| [x] | 0.1 | Import `.scriv` (.scriv) |
| [~] | 0.2 | Import .scriv **fără pierderi** (vezi secțiunea Q) |
| [x] | 0.3 | Import Scrivener 1 și 2 (Files/Docs/N.rtf) |
| [x] | 0.2 | Import Word (.docx), text, Markdown, cu împărțire în documente |
| [x] | 0.3 | Import: RTF, ODT, HTML, OPML, Final Draft (.fdx), Fountain, PDF, imagini, audio/video, pagini web |
| [x] | 0.3 | Import and Split cu separator ales (deja la DOCX/TXT/MD; de extins la RTF/ODT) — dialogul Import acceptă DOCX/RTF/ODT/TXT/MD/HTML/Fountain/FDX cu toate modurile de împărțire |
| [x] | 0.4 | Import Web Page (salvare offline în Cercetare) — imaginile se descarcă în media (elemente în Cercetare) și se încorporează în document |
| [x] | 0.4 | Import din Zotero / manager de bibliografie |
| [x] | 0.1 | Compile: DOCX, PDF, EPUB, HTML |
| [x] | 0.3 | Export fișiere: documentele ca DOCX/RTF/ODT/TXT/MD cu structura de foldere, cu note și metadate |
| [x] | 0.3 | Export OPML, Export metadate CSV |
| [x] | 0.4 | Export ca proiect Scrivener (.scriv) |
| [x] | 0.3 | Page Setup / Print Setup — hârtie, orientare, margini, font (userData/page-setup.json), folosite la tipărire și previzualizare |
| [x] | 0.3 | Print Current Document, Print Preview — previzualizare PDF (document curent / selecție / Compile → Tipărire) cu buton de tipărire |
| [x] | 0.4 | Sync cu folder extern (Dropbox/Drive), RTF/TXT/FDX/Fountain, formate separate draft și notes, sync la deschidere/închidere — RTF/TXT/MD/FDX/Fountain, formate separate Draft/Notes, sync automat (project.syncAuto), conflicte cu snapshot |
| [-] | 1.0 | Sync cu aplicația mobilă (Scrivener iOS: Dropbox). Exclus pentru format, înlocuit de PWA/sync propriu — format proprietar al aplicației iOS; înlocuit de sync prin folder extern și pachete PWA |
| [x] | 0.3 | Proprietăți proiect: titlu, autor, prenume, nume, abreviere titlu |

## B. Editare (Edit)

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Undo/Redo, Cut/Copy/Paste |
| [x] | 0.2 | Paste and Match Style (Ctrl+Shift+V) |
| [x] | 0.3 | Copy Special: ca text simplu, ca HTML, ca Markdown, fără comentarii și note |
| [x] | 0.3 | Select All / Select Paragraph / Select Sentence / Select Word — Select Paragraph / Sentence / Word în meniul Paragraf (Ctrl+Alt+Shift+P/S/W) |
| [x] | 0.3 | Insert: data și ora, linie orizontală, salt de pagină, tabel, imagine, legătură, notă, adnotare, placeholder (<$n>, <$wc>…), caracter special, semn de paragraf — ora și formate dată/oră; salt de pagină separat (Ctrl+Enter, linie punctată) |
| [x] | 0.2 | Comentarii (legate de text) |
| [x] | 0.3 | Adnotări inline (text colorat în corpul documentului) și conversie inline ↔ comentariu |
| [x] | 0.2 | Note de subsol (în text, editabile cu dublu-clic) |
| [x] | 0.3 | Note de subsol în Inspector (legate) vs inline, conversie între ele |
| [x] | 0.3 | Scrivener Links (legătură internă spre alt document, `[[`) |
| [x] | 0.3 | Hyperlink extern, editare, eliminare |
| [x] | 0.3 | Bookmark-uri în text (legături de tip bookmark) — semne de carte în text (meniul Semne de carte: adaugă, listă, salt, ștergere) |
| [x] | 0.2 | Find & Replace în proiect (regex, cuvinte întregi, majuscule) |
| [x] | 0.2 | Find & Replace în documentul curent (Ctrl+F) cu evidențiere și Next/Previous |
| [x] | 0.3 | Find by formatting: comentarii, note, highlight, culoare text, revizii, stil, adnotări — Caută formatare (Ctrl+Alt+F): comentarii, note, adnotări, highlight, culoare, revizii, stil, semne de carte |
| [x] | 0.3 | Find Synonyms, Look up in dictionary — dexonline (definiție + sinonime) din meniul contextual și comenzi |
| [x] | 0.1 | Spelling: corector Chromium |
| [x] | 0.2 | Spelling în română (dicționar ro), Check document now, dicționar personal, ignoră — ro + en-US, sugestii, „Adaugă în dicționar”, „Ignoră” (pe sesiune), „Verifică ortografia acum”, dicționar personal în Setări → Corecturi |
| [x] | 0.3 | Text Substitutions (smart quotes ✓, dashes ✓, elipse ✓, autocorectare personalizată, fracții) — + fracții (smartFractions) |
| [x] | 0.3 | Auto-complete list (nume din proiect) |
| [x] | 0.3 | Transformations: majuscule/minuscule/Title Case, eliminare spații duble, convertire ghilimele, conversie inline ↔ linked notes, convertire adnotări în comentarii |
| [x] | 0.2 | Split at Selection (Ctrl+K) |
| [x] | 0.2 | Split with Selection as Title |
| [x] | 0.2 | Merge documente |
| [x] | 0.3 | Append Selection to Document (trimite selecția în alt document) |
| [x] | 0.3 | Duplicare document |

## C. Vizualizare (View)

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Scrivenings / Corkboard / Outline (comutare) |
| [x] | 0.2 | Scrivenings pentru dosar |
| [x] | 0.3 | Scrivenings pentru selecție multiplă, rezultat de căutare, colecție — selecție și colecția activă (inclusiv căutări salvate) |
| [x] | 0.3 | Scrivenings: separatoare vizibile/ascunse, titluri ca text — comutare titluri și separatoare |
| [x] | 0.2 | Split editor (vertical) |
| [x] | 0.3 | Split orizontal, comutare, swap, același document în ambele (sincronizat) |
| [x] | 0.2 | Lock in place (panoul 2 blocat) |
| [x] | 0.3 | Navigare: Go To document (căutare titlu, Ctrl+G) |
| [x] | 0.2 | Înapoi/Înainte |
| [x] | 0.1 | Composition Mode (F11) |
| [x] | 0.3 | Composition: fundal (imagine/culoare), lățime pagină, opacitate, panou Inspector plutitor, ținte vizibile — fundal culoare/imagine, lățime, opacitate, Inspector plutitor, ținte vizibile (setări + CSS) |
| [x] | 0.1 | Typewriter Scrolling |
| [x] | 0.3 | Text Zoom (100–300%), Page View (A4/Letter/pagini față-verso) — Page View A5/A4/Letter, pagini față-verso, salturi de pagină aproximative |
| [x] | 0.3 | Show Invisibles (spații, tab-uri, paragrafe) |
| [x] | 0.3 | Ruler, Format Bar ascuns/afișat — riglă cu indent prima linie/stânga/dreapta și tab stops (Vizualizare → Arată rigla) |
| [x] | 0.3 | Header bar editor (titlu, navigare, meniu document) |
| [x] | 0.3 | Footer bar (cuvinte, caractere, țintă, zoom) |
| [x] | 0.3 | Linguistic Focus: dialog, substantive, verbe, adjective, adverbe, pronume — + pronume |
| [x] | 0.3 | Highlight current line, Fade text — linie curentă reală și estompare configurabilă (puternică/medie/slabă) |
| [x] | 0.3 | Text Appearance: afișare comentarii/note inline, revizii — comutare evidențiere comentarii și culori revizii |
| [x] | 0.1 | Inspector vizibil/ascuns |
| [x] | 0.1 | Binder vizibil/ascuns |
| [x] | 0.3 | Collections tabs |
| [x] | 0.3 | Quick Reference panels (ferestre cu un document) |
| [x] | 0.2 | Lățimea panourilor redimensionabilă |
| [x] | 0.3 | Layouts salvate (Window > Layouts) |
| [x] | 0.3 | Full screen fereastră (Ctrl+Shift+F11) |
| [x] | 0.3 | Outline: coloane vizibile alese, expand/collapse all |
| [x] | 0.3 | Corkboard: Freeform, Arrange by label/status/keyword, carduri pe rânduri, mărime card, ratio, stampile status, culoare eticheta pe card — freeform, linii, mărime, ratio, spațiere, coloane, pioneze, ștampile, nuanța etichetei |

## D. Navigare (Navigate)

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.2 | Back/Forward |
| [x] | 0.3 | Go To Next/Previous document în binder |
| [x] | 0.3 | Go To Enclosing Group |
| [x] | 0.3 | Reveal in Binder (Ctrl+Alt+R) |
| [x] | 0.2 | Open in other editor (Alt+clic) |
| [x] | 0.3 | Open in Quick Reference |
| [x] | 0.3 | Open in External Editor (pentru fișiere media) |
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
| [x] | 0.2 | Project Targets: carte și sesiune |
| [x] | 0.3 | Project Targets: deadline, zilele de scris, resetarea sesiunii (miezul nopții / la deschidere), numără doar textul inclus în Compile, notificare la atingere, țintă în caractere sau pagini — deadline, zile, reset sesiune, doar Compile, notificare (și pentru documente), cuvinte/caractere/pagini |
| [x] | 0.2 | Writing History (pe zile, CSV) |
| [x] | 0.3 | Writing History: lunar, caractere, alte documente separat — zilnic și lunar, caractere (când istoricul le înregistrează), CSV |
| [x] | 0.3 | Project Statistics: cuvinte, caractere, pagini estimate (paperback/printed), pentru Compile/selecție |
| [x] | 0.3 | Text Statistics: frecvența cuvintelor, distribuție părți de vorbire, lungime medie — frecvența cuvintelor, lungimea frazelor, distribuția părților de vorbire (euristic) |
| [x] | 0.2 | Project Notes |
| [x] | 0.3 | Project Notes: mai multe tab-uri |
| [x] | 0.3 | Project Keywords: fereastră cu listă, culori, ierarhie, căutare după keyword |
| [x] | 0.2 | Keywords per document, culori (fereastra Cuvinte cheie) |
| [x] | 0.3 | Project Settings: Labels (nume, culori, titlu rubrică), Status, Custom Metadata (Text, Checkbox, List, Date), Section Types, Formatting implicit, Auto-complete, Backup per proiect, Compile, Bookmarks proiect, Special Folders — + Formatare implicită, listă Auto-complete, Backup per proiect, Foldere speciale (șabloane, importuri, ciorne) |
| [x] | 0.3 | Custom Metadata: valori per document în Inspector și coloane în Outline |
| [x] | 0.3 | Section Types: definire, atribuire pe nivel (Folders/Containers/Files) și manual per document |
| [x] | 0.3 | Project Bookmarks |
| [x] | 0.3 | Collections: create, redenumire, culoare, adaugă/scoate documente, colecție din căutare |

## F. Documente (Documents)

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Move to Trash |
| [x] | 0.2 | Move cu tastatura (sus/jos/indent/outdent) |
| [x] | 0.3 | Move To (alt dosar din meniu) |
| [x] | 0.1 | Include in Compile |
| [x] | 0.1 | Label / Status |
| [x] | 0.3 | Change icon (set + culori), Revert icon — set de icoane, culoare icoană, revenire la implicită |
| [x] | 0.2 | Duplicare (cu/fără copii) |
| [x] | 0.2 | Snapshots: take, list, view, restore |
| [x] | 0.2 | Snapshots: comparare cu textul curent |
| [x] | 0.3 | Snapshots: comparare între două snapshot-uri, titlu editabil, ștergere, auto-snapshot la sync, snapshot pentru toate documentele selectate — comparare cu textul curent sau între două snapshot-uri, titlu editabil, ștergere (IPC snap:rename/snap:delete) |
| [x] | 0.3 | Convert: Text to Folder / Folder to Text, To Default Formatting (Format → Paragraf) |
| [x] | 0.3 | Auto-generate Synopsis from text — local din primele fraze (fără AI) și Sinopsis AI în bloc |
| [x] | 0.3 | Lock Document (doar citire) |
| [x] | 0.3 | Sort children (alfabetic, după dată) |
| [x] | 0.3 | Expand/Collapse all — Extinde/Restrânge tot în Outline și în binder |
| [x] | 0.3 | Separator (marcare ca separator) — afișat ca linie în binder |

## G. Format

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Bold, Italic, Underline, Strikethrough |
| [x] | 0.3 | Font (familie, mărime per text), culoare text, culoare fundal — familie și mărime font per text în bara de format |
| [x] | 0.3 | Superscript, Subscript, Small caps, All caps — + butoane small caps și all caps (mărci) |
| [x] | 0.3 | Highlight (5 culori + personalizat) — + culoare personalizată |
| [x] | 0.1 | Titluri, citat, listă cu buline |
| [x] | 0.3 | Liste numerotate (1., a., i.), indentare, stiluri de listă — stiluri 1. / a. / A. / i. / I. |
| [x] | 0.3 | Alignment: stânga, centru, dreapta, justify |
| [x] | 0.3 | Line spacing, spațiere înainte/după, indent prima linie, indent stânga/dreapta — spațiere rânduri, înainte/după, indent prima linie/stânga/dreapta per paragraf (meniul Paragraf) |
| [x] | 0.3 | Tab stops (ruler) — tab stops pe riglă (atribut de paragraf, Tab inserează tab) |
| [x] | 0.3 | Tabele (inserare, rânduri, coloane, margini) |
| [x] | 0.3 | Imagini (inserare, scalare, aliniere) — lățime (25–100% sau personalizată) și aliniere stânga/centru/dreapta |
| [x] | 0.3 | Styles: Paragraph, Character, Para+Char; panou stiluri; Redefine from selection; Next style; scurtături; import stylesheet din alt proiect |
| [-] | 0.3 | Formatting presets (formatul 2) — înlocuit de Styles (formatul 3 a renunțat la Formatting presets) |
| [x] | 0.3 | Revision Mode (5 nivele de culoare), Remove revision colors, Track changes la import/export DOCX — w:ins/w:del ↔ marcaje de revizie (ștergerile ca text tăiat), export cu autor și dată |
| [x] | 0.3 | Make Default Formatting, Copy/Paste formatting — Formatarea implicită (doc/selecție), Copiază/Lipește formatarea (Ctrl+Alt+C/V) |
| [x] | 0.3 | Script Mode (Screenplay, Stage Play, Comic) cu elemente și Tab/Enter |
| [x] | 0.3 | Writing direction RTL — comutare RTL per paragraf (atribut dir) |

## H. Unelte (Tools)

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Spelling (Chromium) |
| [x] | 0.3 | Name Generator |
| [x] | 0.3 | Text-to-speech (citire cu voce tare) |
| [x] | 0.3 | Dictare |
| [x] | 0.3 | Statistics (proiect și text) |
| [x] | 0.3 | Writing Tools: Look up în dicționar, tezaur, Wikipedia, Google (deschide browser) |
| [x] | 0.3 | Scratchpad (bloc global, trimite în proiect) — bloc global cu note, trimitere notă în proiect |
| [x] | 0.3 | Appearance customization: culori interfață, fonturi editor, temă |
| [x] | 0.3 | Keyboard shortcuts personalizate |
| [x] | 0.1 | Options/Preferences (parțial: temă, font, typewriter, cheie AI, backup, ghilimele) |
| [x] | 0.3 | Options complete: General, Appearance, Behaviors, Corrections, Editing, Sharing, Backup, Keyboard — General, Appearance, Behaviors, Corrections, Editing, Sharing, Backup, Keyboard |

## I. Fereastră (Window)

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.3 | Layouts: save, manage, switch |
| [x] | 0.3 | Float Quick Reference |
| [x] | 0.4 | Mai multe ferestre de proiect |

## J. Binder

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Draft, Research, Trash |
| [x] | 0.1 | Drag & drop |
| [x] | 0.2 | Selecție multiplă |
| [x] | 0.3 | Drag & drop selecție multiplă, Alt-drag = copiere — drag & drop pentru toată selecția, Alt-drag = copiere |
| [x] | 0.3 | Text cu copii (document-container, nu doar dosar) |
| [x] | 0.3 | Media în binder (imagine, PDF, audio, video, web) cu vizualizare |
| [x] | 0.3 | Icoane personalizate și culoarea etichetei pe icoană — icoane personalizate, culoarea icoanei, nuanța etichetei pe icoană |
| [x] | 0.3 | Hoisting (Focus on folder) |
| [x] | 0.3 | Document în coș: restaurează la locul original |

## K. Inspector

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Synopsis (text) |
| [x] | 0.3 | Synopsis imagine — aleasă și afișată în Inspector, apare pe card |
| [x] | 0.1 | General Meta-Data: Label, Status, Include in Compile |
| [x] | 0.3 | Section Type, Created, Modified |
| [x] | 0.3 | Custom Metadata |
| [x] | 0.2 | Keywords |
| [x] | 0.1 | Notes (document) |
| [x] | 0.2 | Project Notes |
| [x] | 0.3 | Bookmarks (document + proiect) cu previzualizare |
| [x] | 0.2 | Snapshots |
| [x] | 0.2 | Comments & Footnotes (listă) |
| [x] | 0.3 | Comments: culoare, autor, dată, salt la text, editare, ștergere, conversie — culoare, autor, dată, salt la text, editare, ștergere în Inspector; conversia în bara de format |
| [x] | 0.3 | Lock Inspector — Inspector blocat pe documentul curent în timpul navigării |

## L. Ținte și progres

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Țintă document (cuvinte) |
| [x] | 0.3 | Țintă document în caractere, notificare, vizibilă în Outline și bara de jos — țintă în cuvinte sau caractere, notificare, vizibilă în Outline și bara de jos |
| [x] | 0.1 | Țintă carte și sesiune |
| [x] | 0.3 | Vezi secțiunea E (Project Targets complete) — vezi Project Targets (inclusiv pagini) |

## M. Corkboard

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Carduri cu titlu și sinopsis |
| [x] | 0.2 | Reordonare drag & drop |
| [x] | 0.3 | Freeform, Commit order |
| [x] | 0.3 | Arrange by label / status / keyword (linii) |
| [x] | 0.3 | Card size, ratio, spacing, coloane — mărime, ratio, spațiere, coloane |
| [x] | 0.3 | Status stamps, label tint, keyword chips pe card, pin-uri — ștampile, nuanța etichetei, cuvinte cheie, pioneze |
| [x] | 0.3 | Synopsis imagine pe card |
| [x] | 0.3 | Corkboard din mai multe dosare (stacked) — mai multe dosare afișate pe secțiuni |

## N. Outline

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Titlu, sinopsis, label, status, Include, cuvinte |
| [x] | 0.3 | Coloane alese: Target, Progress, Created, Modified, Keywords, Section Type, Characters, Custom Metadata, Total Words — inclusiv coloana Caractere |
| [x] | 0.3 | Sortare, editare titlu inline, drag & drop rânduri, expand/collapse |

## O. Compile

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | DOCX, PDF, EPUB, HTML |
| [x] | 0.3 | Formate: RTF, ODT, MultiMarkdown, Markdown, Fountain, FDX, LaTeX (prin MMD/Pandoc), Kindle (KPF), Plain text, Print — toate în Compile (LaTeX direct, Print = previzualizare PDF); KPF imposibil (format închis, Kindle primește EPUB) |
| [x] | 0.3 | Compile Formats: Default, Standard Manuscript, Paperback Novel, Ebook, Modern, Times/Courier; editabile; salvate ca proiect sau globale — plus Implicit, Times New Roman, Courier; formate globale în userData |
| [x] | 0.3 | Section Layouts (titlu, prefix/sufix, text, page break, separator) legate de Section Types |
| [x] | 0.3 | Separatoare: text, folder, între tipuri |
| [x] | 0.3 | Front Matter / Back Matter din dosare |
| [x] | 0.3 | Contents: alegere documente, filtre (label, status, collection) |
| [x] | 0.3 | Placeholders: <$n>, <$t>, <$wc>, <$p>, <$projecttitle>, <$author>, <$date>, <$img>, numere romane/în litere — <$img:Nume> = imaginea din Cercetare cu acel titlu/nume de fișier |
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
| [x] | 0.4 | Screenplay, Stage Play (US/UK), Comic Script, BBC Radio — + Stage Play UK |
| [x] | 0.4 | Elemente cu Tab/Enter, auto-complete personaje/scene — + auto-complete scene (INT./EXT. și titluri anterioare, Tab) |
| [x] | 0.4 | Export Final Draft FDX, Fountain |

## Q. Import `.scriv` fără pierderi

Ce conține un proiect `.scriv` și unde ajunge în Pneuma Sofer:

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
| [x] | formatul `.scriv` 1/2 (`Files/Docs/N.rtf`) | la fel ca formatul 3 |
| [x] | Raport de import: câte elemente, ce s-a convertit, ce s-a păstrat doar în copie | dialog |

## R. Excluse intenționat

| Funcție | Motiv |
|---|---|
| Sync Dropbox cu Scrivener iOS | Format proprietar al aplicației mobile; înlocuit de sync prin folder extern și PWA |
| Simplenote / Index Card sync | Servicii închise sau abandonate |
| MathType | Program comercial extern; înlocuit de editor de formule MathML (v1.0) |
| Bibliografie EndNote/Bookends | Integrare Zotero (deschis) în schimb |

## S. Peste Scrivener (Pneuma Sofer)

| Stare | Ver. | Funcție |
|---|---|---|
| [x] | 0.1 | Asistent AI Claude (corectură, sinopsis, continuare, critică, consistență, întrebări) |
| [x] | 0.1 | Format deschis HTML + JSON, portabil |
| [x] | 0.3 | Sinopsis AI în bloc, fișe personaje vii, consistență pe toată cartea |
| [x] | 0.4 | Cronologie, hartă relații, analiză de ritm, pachet pentru editor |
