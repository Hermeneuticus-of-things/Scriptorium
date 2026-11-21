# Pneuma Sofer

Pneuma Sofer este un editor desktop local-first pentru cărți, traduceri, teze, scenarii și alte manuscrise lungi. În loc să țină o carte într-un singur document greu de controlat, aplicația o organizează în dosare, capitole, scene, note și surse care pot fi mutate, căutate, comparate și compilate.

**[Descarcă ultima versiune pentru Windows](https://github.com/Hermeneuticus-of-things/Scriptorium/releases/latest)**

AI-ul și serviciile online sunt opționale. Scrierea, organizarea, salvarea, formatarea, revizia deterministă, backupul, importul și exportul de bază funcționează fără AI și fără cont obligatoriu.

<p align="center">
  <img src="./assets/readme/hero.png" width="100%" alt="Pneuma Sofer: binderul în stânga, editorul în centru și Inspectorul în dreapta">
</p>

## Pe scurt

- **Binder pentru manuscris, cercetare și coș**, cu dosare, documente, documente-container, selecție multiplă, drag-and-drop, favorite și mutare cu tastatura.
- **Editor long-form** cu formatare, stiluri, tabele, imagini, note, comentarii, adnotări, legături interne și externe, revizii și undo/redo.
- **Corkboard, Outline și Scrivenings** pentru a vedea aceeași structură ca fișe, tabel, arbore sau text continuu.
- **Căutare și înlocuire** în document sau în proiect, inclusiv regex, metadate, note, sinopsis, titluri și căutare după formatare.
- **Compile și export** pentru editură, tipar, e-book, scenarii, cercetare și interoperabilitate cu alte aplicații.
- **Import Scrivener** cu raport al conversiei și copie a proiectului original pentru elementele care nu pot fi reprezentate integral.
- **Reparații simple**, locale și deterministe, cu previzualizare și aplicare explicită, fără AI.
- **Fereastră AI separată de Inspector**, cu propunere, acceptare, respingere, anulare și contextul cărții vizibil.
- **Backup, snapshot-uri, istoricul scrisului și protecția instanțelor duplicate**.

## Modelul proiectului

Un proiect Pneuma Sofer este un folder local. Textul, notele, snapshot-urile și media rămân în proiect și pot fi copiate, arhivate sau sincronizate printr-un serviciu de foldere. Nu este necesar un server central pentru lucrul individual.

Structura tipică este:

```text
Cartea mea.scribner/
  project.json           structura, metadate și setări
  docs/<id>.html         textul documentelor
  notes/<id>.html        notele
  snapshots/<id>/        versiuni salvate
  media/                 imagini, PDF-uri, audio și video
```

Schimbările făcute din aplicație și schimbările externe sunt urmărite prin watcher și reîncărcare controlată. Pentru lucrul simultan cu alte aplicații, se recomandă backup și verificarea conflictelor înainte de a păstra ambele variante.

## Flux de lucru recomandat

1. Creezi un proiect gol sau pornești dintr-un șablon.
2. Importezi manuscrisul existent sau creezi documentele în Binder.
3. Organizezi capitolele și scenele în Draft; păstrezi sursele și media în Research.
4. Scrii în editor, folosind sinopsis, etichete, statusuri, cuvinte-cheie și ținte.
5. Verifici textul cu instrumente locale, Reparații simple sau, opțional, AI.
6. Creezi un snapshot înaintea unei schimbări mari și verifici rezultatul.
7. Compilezi sau exporți doar ceea ce trebuie să intre în livrare.

Acțiunile care pot schimba textul sunt proiectate ca fluxuri **previzualizare → aplicare** sau **propunere → acceptare/respingere**. O propunere AI nu trebuie considerată aplicată doar pentru că a fost generată.

<p align="center">
  <img src="./assets/readme/workflow.svg" width="100%" alt="Flux de lucru: import, organizare, scriere, verificare și export">
</p>

## Binder și organizare

Binderul are zone pentru manuscris, cercetare și coș. Poți:

- crea documente, dosare, documente-container, media și pagini web salvate;
- muta elemente cu mouse-ul sau cu tastatura și schimba nivelul lor în arbore;
- lucra cu selecții multiple, copii și ținte de tip document sau dosar;
- redenumi, duplica, muta în coș și restaura la locul inițial;
- seta etichete, statusuri, icoane, culori, cuvinte-cheie și includerea în Compile;
- fixa documente favorite, crea colecții manuale sau colecții din rezultate de căutare;
- extinde sau restrânge arborele și sorta copiii după titlu sau dată;
- transforma un text în folder sau un folder în document-container.

Corkboard-ul afișează fișe cu titlu, sinopsis, status, etichetă, cuvinte-cheie și, opțional, imagine. Are mod freeform, aranjare pe linii, dimensiuni și proporții configurabile, ștampile și poziții memorate.

Outline-ul permite coloane alese pentru titlu, sinopsis, etichetă, status, includere în Compile, cuvinte, caractere, ținte, progres, date, tip de secțiune și metadate proprii. Rândurile pot fi sortate, editate și mutate.

Scrivenings deschide conținutul unui dosar, al unei selecții sau al unei colecții ca text continuu. Split editor permite două panouri, inclusiv același document în ambele, cu navigare și panou blocat.

## Editor și formatare

Editorul este bazat pe Tiptap/ProseMirror și include:

- bold, italic, subliniat, tăiat, superscript, subscript, small caps și all caps;
- font, mărime, culoare text, highlight, aliniere și direcție RTL;
- titluri, citate, liste cu buline și liste numerotate cu stiluri diferite;
- spațiere între rânduri, înainte și după paragraf, indentări și tab stops pe riglă;
- tabele cu rânduri, coloane, antet, unire și împărțire;
- imagini cu scalare și aliniere;
- stiluri de paragraf, caracter și combinații paragraf-caracter;
- stil următor, scurtături, redefinire din selecție și import de stylesheet;
- copiere și lipire a formatării, Copy Special ca text, HTML sau Markdown;
- transformări pentru majuscule, ghilimele, cratime, spații duble și formatarea textului;
- mod de revizie cu niveluri colorate, acceptare și eliminare a culorilor la Compile;
- moduri Screenplay, Stage Play și Comic, cu elemente și navigare prin Tab/Enter.

Poți selecta paragraf, frază sau cuvânt, insera dată/oră, salt de pagină, linie, caracter special, placeholder, legătură, comentariu, adnotare sau notă de subsol.

## Inspectorul și fereastra AI

**Inspectorul rămâne Inspector.** El afișează sinopsisul, metadatele, eticheta, statusul, includerea în Compile, cuvintele-cheie, notele, bookmark-urile, snapshot-urile, comentariile și notele de subsol ale elementului selectat.

**AI-ul este o suprafață separată.** Fereastra AI este mare, mobilă și independentă de Inspector. Ea poate lucra pe selecție, document, capitol, manuscris sau contextul proiectului, în funcție de operație și configurare. Rezultatele sunt propuneri; utilizatorul poate vedea contextul, accepta, respinge sau anula.

Reparațiile fără AI nu sunt ascunse în fereastra AI. **Reparații simple** execută operații locale și deterministe, cum ar fi corectarea spațiilor, ghilimelelor sau punctuației, cu previzualizare înainte de aplicare și fără trimiterea textului către un furnizor AI.

Furnizorii AI sunt configurabili. Pot fi folosite servicii compatibile cu furnizorii implementați în aplicație sau modele locale, dar cheile și profilurile rămân configurații locale și nu trebuie incluse în proiecte publice, issue-uri sau release-uri.

## Revizie, căutare și cercetare

Revizia locală poate semnala ortografie, ghilimele, spații, punctuație, repetiții și alte probleme de tipografie. Corectorul Chromium și dicționarele română/engleză pot fi folosite împreună cu dicționarul personal.

Căutarea rapidă indexează titluri, sinopsisuri și text. Căutarea proiectului poate lucra în titluri, text, note, sinopsis, metadate și cuvinte-cheie și poate folosi operatori, filtre și colecții salvate. Înlocuirea în proiect poate crea snapshot înainte de schimbare.

Căutarea după formatare găsește comentarii, note, adnotări, highlight, culori, revizii, stiluri și bookmark-uri. Poți selecta sau naviga după stil și poți folosi focalizarea pe dialoguri pentru a vedea replicile din proiect.

În Research poți păstra PDF-uri, imagini, audio, video, pagini web salvate offline și bibliografie. Bookmark-urile pot indica documente sau surse externe. Vizualizarea și conversia media depind de tipul fișierului și de limitele formatului sursă.

## Dictare și voce

Pneuma Sofer oferă o interfață pentru dictare și transcriere. Motorul D&TED este o dependență separată, descoperită și pornită prin protocolul său de serviciu; Pneuma Sofer deține interfața, setările și modul în care rezultatul ajunge în document.

Dictarea poate insera text la cursor sau poate înlocui selecția. Transcrierea fișierelor audio este disponibilă pentru formatele acceptate de instalarea curentă. Pentru funcțiile online de voce sau transcriere sunt necesare configurarea serviciului și, după caz, internetul și o cheie proprie.

D&TED nu este inclus ca un motor reimplementat în codul Pneuma Sofer. Actualizările motorului și actualizările interfeței sunt canale separate.

## Import și export

### Formate de import

Sunt acceptate, în funcție de conținut și de calea aleasă în dialog:

- DOCX, RTF, ODT, TXT, Markdown și HTML;
- Fountain, Final Draft și OPML;
- PDF, imagini, audio, video și pagini web;
- BibTeX/CSL-JSON și surse din Zotero;
- proiecte Scrivener `.scriv`, inclusiv structuri provenite din formate mai vechi.

Importul cu împărțire poate folosi titluri sau un separator ales. La importul Scrivener se păstrează, când este posibil, Binderul, ordinea, titlurile, sinopsisurile, stilurile, imaginile, linkurile, notele, comentariile, adnotările, etichetele, statusurile, cuvintele-cheie, metadatele, snapshot-urile, țintele, colecțiile, bookmark-urile și istoricul scrisului.

Elementele pe care Pneuma Sofer nu le poate reprezenta integral sunt raportate și păstrate în copia originală a proiectului. Importul nu trebuie interpretat ca o garanție că fiecare particularitate proprietară Scrivener are un echivalent editabil identic.

### Formate de export și Compile

Compile adună documentele incluse într-o carte sau într-un subset ales și poate produce:

- DOCX, pentru editură și schimb de documente;
- PDF, pentru tipar sau citire;
- EPUB, pentru e-book;
- RTF, ODT, HTML, Markdown, MultiMarkdown și text simplu;
- LaTeX, Fountain și Final Draft;
- un proiect `.scriv` sau pachete pentru fluxuri externe, când sunt disponibile în dialog.

Formatele de Compile includ șabloane pentru manuscris standard, paperback, e-book, Modern, Times și Courier. Poți configura conținutul, front matter, back matter, tipurile de secțiune, titlurile, separatoarele, înlocuirile, maparea stilurilor, notele, comentariile, metadatele, coperta, dimensiunea paginii, marginile, antetul, subsolul și cuprinsul.

Preview-ul și bara de progres trebuie verificate înainte de a considera operația finalizată. Numerele de pagină ale cuprinsului și unele placeholdere depind de paginarea finală a formatului și pot rămâne estimate în anumite căi de export.

## Setări, ținte și progres

Setările aplicației includ, între altele, General, Appearance, Behaviors, Corrections, Editing, Sharing, Backup și Keyboard. Setările proiectului includ proprietăți, etichete, statusuri, metadate proprii, tipuri de secțiune, formatare implicită, șabloane, bookmark-uri, colecții și opțiuni de backup și Compile.

Există ținte pentru document, sesiune și carte, în cuvinte sau caractere, cu deadline, zile de scris, notificări și resetare de sesiune. Statisticile pot calcula cuvinte, caractere, pagini estimate, timp de citire, frecvențe și lungimea frazelor pentru proiect, Compile, selecție sau text.

Operațiile lungi de import, export, Compile, backup și AI trebuie să arate progresul și starea curentă. Unde fluxul oferă anulare, anularea trebuie așteptată până la finalizarea curată a operației; închiderea forțată a aplicației nu este o strategie de anulare.

## Salvare, snapshot-uri și backup

Salvarea automată și `Ctrl+S` păstrează documentele. Dialogurile de setări au stare de modificări nesalvate și acțiuni explicite de salvare, renunțare sau anulare acolo unde se aplică.

Snapshot-urile pot fi create pentru un document, comparate cu textul curent sau între două snapshot-uri, redenumite, restaurate și șterse. Managerul de snapshot-uri permite căutare și selecție; exportul în masă al mai multor snapshot-uri este o extensie distinctă, nu trebuie presupus automat.

Backupul poate fi configurat la deschidere, salvare, închidere sau interval, cu păstrarea unui număr ales de copii și, în funcție de setare, ca arhivă sau folder. Restaurarea trebuie făcută într-o copie separată până când rezultatul este verificat.

Aplicația protejează instanțele duplicate ale programului și proiectului prin identificare și lock inter-proces. Installerul poate detecta o instanță activă, poate cere închiderea grațioasă și poate avertiza la downgrade; nu porni simultan copii diferite ale aceleiași cărți fără să înțelegi lockurile și sincronizarea.

## Sincronizare și lucru în echipă

Un proiect poate fi păstrat într-un folder sincronizat extern, cum ar fi Dropbox, Google Drive, OneDrive sau NAS, iar Pneuma poate sincroniza formate text și surse în funcție de configurare. Conflictele sunt protejate prin snapshot-uri și trebuie verificate înainte de a accepta o variantă.

Prezența, jurnalul, lockul și conflictul nu înseamnă editare colaborativă simultană cu cursoare comune. Serverul real-time cu CRDT, roluri, sugestii și coadă offline rămâne o lucrare viitoare. Sync-ul prin folder nu trebuie prezentat ca echivalent al colaborării live.

## Actualizări ale aplicației

Updaterul citește informațiile din GitHub Releases și compară versiunea locală cu release-ul disponibil. Selectează installerul sau varianta portabilă Windows, descarcă în locația temporară controlată și verifică assetul înainte de folosire.

Verificarea folosește HTTPS, allowlist pentru hosturile GitHub, dimensiunea așteptată, SHA-256 publicat și ETag când este disponibil. Installerul și portabilul sunt variante diferite; utilizatorul trebuie să păstreze o singură instalație activă pentru lucrul curent.

Istoricul Git, tagurile și release-urile nu sunt rescrise pentru a elimina versiuni vechi. Numărul și asseturile disponibile se citesc din pagina Releases indicată la începutul acestui document, nu dintr-un număr copiat în README.

## CLI și MCP

Instalarea poate include comanda `pneuma` și serverul `pneuma-mcp`. CLI-ul poate inspecta proiecte, compila, exporta surse și adresa întrebări în funcție de comenzile disponibile în buildul instalat.

Serverul MCP poate oferi unelte de citire și modificare pentru Binder, documente, metadate, căutare, note, comentarii, snapshot-uri, Compile, import/export și revizie. Modul `--read-only` limitează operațiile la citire. Scrierile agenților trebuie să fie tratate ca modificări reale: se recomandă snapshot, jurnal și verificare după fiecare operație.

Exemplu de configurare pentru un client care acceptă comanda MCP:

```bat
claude mcp add pneuma --scope user -- cmd /c %LOCALAPPDATA%\Programs\Pneuma Sofer\pneuma-mcp.cmd
```

Nu pune în comenzi, loguri sau README calea către manuscrisul tău, tokenuri, cookie-uri sau chei API.

## Instalare și dezvoltare

Din pagina Releases alegi installerul Windows sau varianta portabilă. Installerul este pentru utilizatorul curent; proiectele și cărțile tale nu sunt șterse la dezinstalarea aplicației.

Pentru dezvoltare locală:

```bash
git clone https://github.com/Hermeneuticus-of-things/Scriptorium.git
cd Scriptorium
npm ci
npm start
```

Comenzi uzuale:

```bash
npm run build
npm test
npm run test:regressions
npm run test:e2e
npm run dist:win
npm run dist:win:portable
npm run dist:win:setup
```

Buildul installerului Windows necesită Inno Setup. Buildurile sunt scrise în `release/`; nu adăuga artefacte binare în commiturile sursă dacă ele sunt publicate prin GitHub Releases.

## Testare și limite cunoscute

Testele unitare acoperă logica de proiect, editor, import/export, Compile, updater, AI, MCP și protecția datelor. Testele E2E pornesc Electron și verifică fluxuri reale, inclusiv ferestre, dialoguri, salvare, persistență și aplicare/respingere.

Un test care deschide un meniu nu dovedește că efectul comenzii este corect. Pentru QA complet, fiecare caz trebuie să aibă condiție inițială, acțiune, postcondiție verificată și, când este util, captură sau verificare pe disc.

Limitele care trebuie ținute explicite:

- cuprinsul și numerele de pagină pot necesita paginare finală pentru rezultate exacte;
- adnotările PDF directe și persistente nu sunt echivalente cu notele de proiect;
- unele opțiuni fine de Compile/Export și formatele de scenariu rămân parțiale;
- importul Scrivener păstrează originalul, dar nu transformă automat fiecare extensie proprietară într-o funcție editabilă;
- installerul Windows poate fi nesemnat Authenticode;
- colaborarea real-time nu este același lucru cu sincronizarea prin folder;
- o funcție existentă în cod sau într-o ramură de lucru nu este funcție publicată până când nu este integrată și testată în buildul distribuit.

Planul activ și criteriile de închidere sunt în [ROADMAP.md](ROADMAP.md). Inventarul detaliat al funcțiilor este în [docs/FEATURES.md](docs/FEATURES.md), iar jurnalul public este în [CHANGELOG.md](CHANGELOG.md).

## Documentație tehnică

- [Arhitectură](docs/ARCHITECTURE.md) — limitele dintre Electron/React și motorul D&TED;
- [Formatul proiectului](docs/FORMAT-PROIECT.md) — structura locală a proiectelor;
- [Ionuț Application Design Language](docs/IONUT_APPLICATION_DESIGN_LANGUAGE.md) — principii de interfață și focus;
- [D&TED](docs/DTED.md) — protocol și integrarea dictării;
- [MCP](docs/MCP_ARHITECTURA.md) — accesul agenților la proiect;
- [VKB2](docs/VKB2.md) — reguli și protecții ale reviziei.

## Date private și contribuții

Nu include în repository, issue-uri, pull request-uri, release-uri sau capturi:

- manuscrise reale, corpusuri personale și texte Karma;
- căi locale de pe calculator;
- tokenuri, chei API, cookie-uri sau configurații de cont;
- rapoarte de test care conțin conținut privat.

Pentru un bug, descrie pașii de reproducere, rezultatul așteptat și rezultatul observat. Folosește fixture-uri neutre și loguri filtrate. Pentru probleme vizuale, o captură fără conținut sensibil este preferabilă unei copii a proiectului.

## Licență

MIT. Vezi [LICENSE](LICENSE).
