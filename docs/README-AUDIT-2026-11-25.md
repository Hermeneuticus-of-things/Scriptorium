# Audit README și demonstrații — 25 noiembrie 2026

## Domeniu și metodă

Auditul a urmărit README-ul public, `docs/FEATURES.md`, `ROADMAP.md`, `docs/GAP-AUDIT.md`, codul componentelor și capturatoarele Playwright. Capturile au fost regenerate după `npm run build`, cu Electron real, profil temporar și proiect fixture izolat. Nu au fost folosite proiecte personale, texte private, chei API sau date din cartea Karma.

Validarea de bază:

- `npm test`: **216 fișiere de test, 2.299 teste trecute, 4 omise**;
- build Vite v1.4.2: trecut;
- `tests/e2e/gif-readme.cjs`: trecut pentru 7 scene;
- `tests/e2e/gif-features.cjs`: trecut pentru 5 scene;
- toate cele 12 GIF-uri au mai multe cadre, marker `NETSCAPE2.0`, loop infinit, dimensiune 1180×714 și niciun cadru aproape negru;
- cadrele de început, mijloc și final au fost inspectate vizual.

## Funcții prezentate în README

### Disponibile și verificabile

- Binder, dosare, documente, Corkboard și Outline;
- editor cu formatare, stiluri, note, comentarii, adnotări, revizii și snapshot-uri;
- split editor și Quick Reference;
- căutare în proiect și Help Finder;
- legături interne `[[Titlu]]`;
- cronologie pe baza câmpurilor de dată, POV și locație;
- Compile și export în formatele implementate;
- backup local și sincronizare prin folder extern;
- MCP/CLI cu permisiuni configurabile.

### Disponibile cu limitări sau condiții

- AI, traducere online, dicționare și întrebări pe surse: servicii, chei/conturi sau conectivitate;
- dictare/transcriere: motor, model, microfon și permisiuni locale;
- import/export `.scriv`: raportul de conversie trebuie verificat; nu se promite lipsa pierderilor pentru orice proiect;
- sincronizarea prin cloud/NAS este la nivel de fișiere, nu editare simultană real-time;
- exactitatea paginării și compatibilitatea outputului trebuie verificate în formatul țintă.

### Planificate sau neimplementate

- colaborare real-time cu cursoare, roluri, sugestii și coadă offline;
- adnotare PDF directă și persistentă în viewer;
- export în masă al snapshot-urilor;
- paritate completă pentru toate opțiunile fine de Compile/Print;
- actualizare integrată D&TED;
- semnarea Authenticode a installerului.

## Evidența GIF-urilor

| Fișier | Operațiunea capturată | Rezultat observabil | Status |
|---|---|---|---|
| `01-corkboard-move.gif` | Tragerea fișei `Al doilea document` înaintea lui `Capitol verificat` | Cardul și ordinea din Binder se schimbă | Păstrat |
| `01-ai-corectura.gif` | Deschiderea AI, starter Corectură, streaming mock, diff, acceptare | Propunerea este afișată și acceptată în editor | Păstrat; serviciul este mock local |
| `02-help-finder.gif` | Introducerea întrebării despre revenirea la o versiune | Rezultate de ajutor/comenzi vizibile | Păstrat |
| `02-translate-side.gif` | Split editor și încărcarea documentului alăturat | Originalul și documentul alăturat sunt vizibile | Păstrat; nu pretinde traducere automată |
| `03-compile-content.gif` | Deschiderea Compile și bifarea/debifarea conținutului | Selecția de Compile și previzualizarea sunt vizibile | Păstrat |
| `03-compile-preview.gif` | Deschiderea previzualizării și schimbarea zoomului | Previzualizare în panou separat și zoom modificat | Păstrat |
| `04-focus-f6.gif` | Apăsarea repetată a F6 | Focusul se mută între panouri | Păstrat |
| `04-reference-quickref.gif` | Deschiderea unui document ca referință | Documentul rămâne vizibil lângă editor | Păstrat |
| `05-semnale.gif` | Deschiderea Semnale pe text | Măsurători deterministe vizibile, fără AI | Păstrat |
| `05-wiki-link.gif` | Tastarea `[[Nume nou]]` | Propunerea de creare și legare apare | Păstrat |
| `06-timeline.gif` | Fixture cu două zile, POV-uri și locații | Două evenimente apar pe benzi și pe axă | Refăcut și păstrat |
| `07-research-ask.gif` | Întrebare, deschiderea surselor și bifarea unui dosar | Scope-ul ales apare ca chip în panou | Refăcut și păstrat; nu pretinde răspuns RAG |

Toate scenele sunt capturi ale aplicației Electron reale. Fixture-ul este generat în profil temporar. `gif-features.cjs` folosește un server AI mock local, fără internet și fără chei.

## Contradicții corectate în README

- descrierea de produs a fost mutată de la lista de implementări la activitățile utilizatorului;
- funcțiile locale sunt prezentate înaintea AI/MCP;
- colaborarea real-time nu mai este prezentată ca disponibilă;
- Research nu mai promite răspunsuri sau citări verificate de GIF;
- traducerea side-by-side nu mai este confundată cu traducerea automată;
- importul `.scriv` nu mai este descris fără condiția verificării raportului;
- adnotarea PDF, actualizarea D&TED și colaborarea real-time sunt marcate ca planificate/neimplementate;
- dictarea live nu este prezentată printr-un GIF neverificabil;
- versiunea publică este v1.4.2, iar roadmap-ul a fost aliniat la această referință;
- comenzile MCP sunt însoțite de recomandarea `--read-only` și limitarea cu `--project` în documentația tehnică.

## Fișiere modificate în această fază

- `README.md` — rescrierea structurii și a afirmațiilor publice;
- `ROADMAP.md` — alinierea referinței la v1.4.2;
- `docs/readme-gif-uri.md` — descrierea exactă a scenei Research;
- `tests/e2e/gif-readme.cjs` — fixture datat pentru cronologie și rezultat vizibil pentru Research;
- `docs/assets/gif/*.gif` — cele 12 capturi regenerate din aplicația reală;
- `docs/README-AUDIT-2026-11-25.md` — acest raport.

Nu au fost adăugate fixture-uri, proiecte personale, texte de test sau chei în repository.

## Ce a fost omis sau demonstrat doar parțial

Verificarea față de atașamentul complet arată că validarea tehnică a GIF-urilor nu este echivalentă cu demonstrarea integrală a fluxului. Următoarele puncte rămân neacoperite sau doar parțial acoperite:

| Zonă | Ce cere atașamentul | Ce arată acum | Status și motiv |
|---|---|---|---|
| Prezentarea interfeței | O vedere de ansamblu cu Binder, editor, referință și Inspector | Scenele arată aplicația în utilizare, dar nu există o scenă dedicată de orientare | Parțial; nu am creat o captură nouă doar decorativă |
| Categorii de utilizatori | Secțiuni separate pentru ficțiune, nonficțiune, traducere, cercetare, academic, tehnic, jurnalism și proiecte editoriale | README-ul avea inițial doar o formulare scurtă | Corectat local; secțiunea „Pentru cine este aplicația” a fost adăugată, dar nu este încă publicată pe `main` |
| Corkboard | Deschidere fișă după mutare pentru a confirma păstrarea conținutului | Se vede reordonarea cardului și Binderul | Parțial; deschiderea documentului după mutare nu este în scenă |
| Traducere | Selectare fragment, funcție de traducere, rezultat și comparație | Se vede split-ul și documentul alăturat | Parțial; nu am folosit un serviciu extern sau mock de traducere pentru a nu simula un rezultat neverificat |
| Compile conținut | Modificarea ordinii elementelor și confirmarea configurației finale | Se vede includerea/excluderea și previzualizarea | Parțial; reordonarea în dialog nu a fost demonstrată separat |
| Compile rezultat | Generarea fișierului și afișarea mai multor pagini/structura outputului | Se vede previzualizarea și schimbarea zoomului | Parțial; captura nu validează un fișier exportat în afara aplicației |
| Semnale | Localizarea fragmentului și intervenția de corectare | Se văd categoriile și măsurătorile | Parțial; nu se vede o reparație efectivă în aceeași scenă |
| Legături Wiki | Navigarea efectivă la documentul asociat și revenirea | Se vede propunerea „Creează și leagă” | Parțial; nu se vede deschiderea documentului nou creat |
| Cronologie | Selectarea unui eveniment și accesarea documentului | Se văd evenimentele, datele și benzile POV | Parțial; nu se vede clicul pe eveniment și revenirea la cronologie |
| Research | Lansarea căutării, rezultat, surse asociate și păstrarea rezultatului | Se vede întrebarea și scope-ul cu sursa selectată | Limitat intenționat; backendul RAG local nu a fost prezentat ca rezultat verificat |
| AI/corectură | Separarea funcțiilor locale de funcția dependentă de AI | GIF-ul AI folosește streaming mock local | Parțial; există Semnale separat, dar nu există un GIF dedicat pentru Reparații simple cu aplicarea unei modificări |
| Help Finder | Selectarea comenzii și accesarea funcției găsite | Se văd rezultatele Help Finder | Parțial; comanda nu este executată în scenă |
| Dictare live | Microfon, vorbire, text apărut și oprire | Nu există GIF | Neacoperit; necesită hardware și motor audio real |
| Transcriere audio | Alegerea fișierului, procesare și text rezultat | Nu există GIF | Neacoperit; necesită fișier audio și motor configurat |
| Căutare în proiect | Rezultate din mai multe documente și salt la fragment | Nu există GIF dedicat | Neacoperit ca demonstrație vizuală; funcția este descrisă textual |
| Salvare/recuperare | Salvare, versiune anterioară și recuperare | Există descrieri și teste de snapshot/backup | Neacoperit ca GIF; nu se afirmă în README că GIF-ul dovedește recuperarea |

Aceste lipsuri nu au fost ascunse în README: formulările sunt intenționat prudente. Totuși, ele înseamnă că lucrarea nu îndeplinește încă în sens strict cerința atașamentului ca fiecare dintre cele 12 scene să demonstreze un flux complet de la acțiune la rezultat final. Următoarea etapă ar trebui să fie refacerea scenelor marcate „Parțial”, numai dacă funcția poate fi demonstrată fără date private și fără simularea unui rezultat inexistent.

## Cerințe din atașament îndeplinite

README-ul este în română, pornește de la activitățile utilizatorului, pune funcțiile locale înaintea integrărilor, marchează limitările, nu prezintă colaborarea real-time, nu pretinde memorie de traducere sau adnotare PDF, păstrează cele 12 nume de GIF existente și include textele alternative. Capturile sunt generate prin aplicația Electron reală, iar verificarea tehnică a autorun/loop/lizibilității a trecut.

## Concluzie de acceptare

Din punct de vedere tehnic, repository-ul este coerent și verificabil. Din punct de vedere editorial și demonstrativ, README-ul este mult mai corect decât versiunea anterioară, dar nu trebuie declarat încă „complet conform” cu atașamentul până când scenele marcate parțial și demonstrațiile suplimentare pentru dictare, transcriere, căutare și recuperare nu sunt fie capturate real, fie marcate explicit ca neacoperite în versiunea publicată.
