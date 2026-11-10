# Pneuma Sofer 1.1.0 — implementare și verificare

Data: 10 noiembrie 2026. Versiune stabilă; nu este denumită beta.

## Schimbări livrate

Fundația existentă Ionuț Application Design Language este păstrată și întărită: motor comun de focus, barieră modală, revenire la selecția editorului și dimensionare bazată pe tokenuri. Dialogul de alegere ADL nu mai întrerupe pornirea aplicației.

Meniurile Binder sunt construite dintr-un model contextual comun, cu tipuri diferite pentru document, dosar, media, rădăcini, Coș și colecții. Proprietățile sunt grupate; acțiunile de arbore și organizare sunt în submeniuri. Duplicarea documentului și duplicarea cu descendenți folosesc aceeași comandă și payload-uri distincte. Variantele imposibile sunt ascunse. Comenzile pentru element și selecție sunt diferențiate.

Selectorul rapid de spațiere este păstrat; valorile duplicate din meniul Paragraf au fost eliminate. ID-urile comenzilor și regulile de aplicabilitate sunt comune suprafețelor de comandă.

Sunt livrate splash/skeleton la pornire, hint-uri ghidate și protecția modificărilor nesalvate la închiderea proiectului, ferestrei și reload: Salvează / Renunță / Anulează. Flush-ul și handshake-ul Electron sunt verificate separat de beforeunload.

Serviciile neconfigurate nu expun comenzile lor operaționale. Un ID de utilizator sau de voce fără cheia necesară nu înseamnă serviciu configurat. Endpointurile publice gratuite și căutarea web necesită activare explicită în Setări. Activarea/dezactivarea actualizează disponibilitatea fără repornire. Comutatorul AI nu ocupă toolbarul dacă furnizorul nu are configurație utilizabilă. Funcțiile de scriere, organizare, salvare și export nu necesită AI. Configurarea rămâne accesibilă în Setări.

Redenumirea din colecții folosește același renderer editabil ca arborele. Starea de redenumire este curățată la schimbarea proiectului. Citirile de note din căutarea avansată au concurență limitată. Listenerul temporar de încărcare a vocilor este curățat după timeout.

## Dovezi executate

- Suită unitară integrală: **185 fișiere trecute, 1.988 teste trecute, 3 teste sărite**. Testele sărite sunt declarate, nu echivalate cu rezultate trecute.
- E2E separat în Electron: creare proiect, scriere/salvare, DOCX/PDF/EPUB, export/reimport .scriv, Print Preview/PDF și închidere protejată. **E2E OK; fără erori de renderer.**
- FLOWS separat în Electron: Binder, undo/trash/restaurare, split/Scrivenings și izolarea scrierii între documente, snapshots, căutare/înlocuire, comenzi native, scurtături, șabloane și tutorial. **FLOWS OK.**
- Traversarea Binder: **324 acțiuni**; 323 trecute la rularea integrală, o problemă de redenumire în colecție remediată și retestată cu rezultat trecut. Au fost capturate și 89 de submeniuri, zece contexte, geometria și revenirea focusului. Deschiderea unui submeniu nu este numărată drept efect funcțional.
- Dialogurile Setări și Compile au fost verificate la 960×720 și 1733×1048; revenirea la selecția editorului a fost verificată.
- Disponibilitatea serviciilor: profil curat fără integrare, cont incomplet și activare/dezactivare explicită Datamuse prin UI; toate cele trei cazuri au trecut. Acestea verifică Setările și disponibilitatea registrului, nu calitatea răspunsurilor API externe.
- Executabilul Windows împachetat a fost pornit cu Playwright și profil separat; cele trei cazuri de disponibilitate au trecut.

## Limite explicite

Matricea extinsă are **5.515 cazuri pregătite în opt domenii**, cu condiție inițială, acțiune, verificare și captură. Înregistrarea modulelor și integritatea cataloagelor sunt verificate. Matricea **nu a fost rulată integral** înaintea acestui release, pentru a prioritiza livrarea în bugetul de credite cerut de utilizator. Nu este prezentată drept audit complet al aplicației.

Autentificarea reală la serviciile externe, evaluarea calității AI, microfonul și modelele ASR, toate codecurile/native media menus, toate popupurile Windows, tipărirea fizică, transporturile NAS/cloud și toate combinațiile de teme/DPI rămân necertificate. Adaptoarele HTTP/process/Shell din suite sunt marcate în cataloage; un URL capturat nu este echivalat cu o pagină externă verificată. Configurarea unei integrări nu garantează conectivitatea, valabilitatea cheii sau cota furnizorului.

Ollama local a fost folosit numai pentru trierea tehnică de loguri, ca sugestie, nu pentru aprobarea automată a testelor sau executarea codului. Modelul de 9B a fost încărcat integral în VRAM; nu raportează capabilitate de vedere, deci nu a certificat capturi.

## Reproducere

```powershell
npm ci
npm test
npm run build
node tests/e2e/electron.e2e.cjs
node tests/e2e/flows.e2e.cjs
node tests/e2e/service-availability.e2e.cjs
```

Matricea extinsă se poate executa serial prin `node tests/e2e/full-app-runner.cjs`; `PNEUMA_FULL_QA_DIR` stabilește directorul de artefacte. `PNEUMA_QA_DOMAINS` și `PNEUMA_QA_CASE_IDS` permit reluarea selectivă, fără a transforma cazurile neexecutate în rezultate trecute. Profilurile de test sunt separate; nu sunt folosite cheile sau manuscrisele utilizatorului.
