# Pneuma Sofer — contract ADL pentru orientare și ergonomie

Sursa de referință: [Ionuț Application Design Language](https://github.com/Hermeneuticus-of-things/ionut-design-language). Această specificație adaptează cerințele proprietarului aplicației din 10 noiembrie 2026. Nu este un certificat de conformitate al tuturor suprafețelor.

## Invarianta principală

Indiferent câte meniuri și ferestre există, utilizatorul trebuie să poată identifica unde lucrează, obiectul sau selecția afectată, efectul comenzii și calea de întoarcere. Complexitatea funcțională nu justifică lipsa orientării.

Ordinea frecvenței este o ipoteză de proiectare a proprietarului, nu o măsurătoare de telemetrie: editarea efectivă și acțiunile contextuale sunt frecvente; lucrul pe proiect este mai puțin frecvent; configurarea programului este rară. Pozițiile comenzilor rămân stabile. Nu se reordonează automat după fiecare clic și nu se colectează date noi despre utilizator.

## Aplicabilitate la toate nivelurile

O acțiune imposibilă pentru obiectul sau suprafața curentă nu se afișează ca o comandă moartă. O condiție remediabilă trebuie explicată împreună cu locul în care se rezolvă. Validarea unui formular și indicarea opțiunii curente nu sunt echivalente cu o acțiune imposibilă asupra unui obiect.

`commandApplicability.js` exprimă reguli explicite pentru comenzile migrate. `tidyMenuItems` elimină recursiv intrările ascunse, acțiunile dezactivate fără explicație, grupurile goale și separatoarele redundante. Este utilizat de meniurile interne, contextuale și de specificația meniului nativ. Toolbar-ul principal folosește același registru. Regulile implicite ale comenzilor încă nemigrate trebuie auditate în continuare; faptul că există un mecanism central nu dovedește că fiecare funcție a primit deja o regulă completă.

## P0 și P1: meniuri Binder

`binderContextMenu.js` generează structura din tipul obiectului, rădăcina de apartenență, selecția explicită și callback-urile disponibile. Rădăcinile, documentele, dosarele, media și elementele din Coș au contexte distincte. Se afișează un titlu de context, de exemplu «Document: …», «Dosar: …», «Rădăcină: Coș» sau «Selecție: 2 elemente».

Eticheta, statusul, includerea în Compile, favoritul, iconița și tipul secțiunii sunt grupate în Proprietăți. Operațiile arborelui sunt în Arbore. Duplicarea este o singură familie; cele două variante apar numai când există efectiv sub-documente. Colecțiile folosesc «Adaugă elementul…» sau «Adaugă selecția…». Payload-ul identifică explicit țintele; salvarea metadatelor, duplicarea, snapshot-urile și restaurarea reutilizează funcțiile existente. Acțiunea rară și permanentă Golește Coșul nu mai ocupă permanent subsolul Binderului: rămâne în contextul rădăcinii Coș, numai când există conținut.

Ținta de proiectare pentru contextul Binder obișnuit este cel mult 12 intrări de prim nivel, fără numărarea titlului și a separatoarelor. Nu este o scuză pentru eliminarea funcțiilor: acțiunile se grupează după sarcină și după obiectul afectat.

Selectorul de spațiere rapidă păstrează valorile și setarea personalizată; lista numerică duplicată din meniul rapid Paragraf este eliminată. Valori comune sunt definite o singură dată și refolosite în suprafețele legitime. Accesul alternativ din Format este intenționat; nu reprezintă o a doua implementare a aceleiași operații.

## P2: identitate și rutare

`commandItem` păstrează `commandId` independent de eticheta tradusă. `scope` și `payload` precizează obiectul și parametrii. Native IPC folosește un identificator de rutare distinct numai când trebuie să distingă două variante parametrizate ale aceleiași comenzi. Identitatea logică rămâne comună. Acest mecanism este aplicat comenzilor modificate în acest lot; nu afirmă că toate extras-urile vechi generate numeric au fost migrate.

Motorul ADL existent este reutilizat. Un modal este o barieră pentru promovarea unei suprafețe de fundal și pentru comenzile care nu-i aparțin. Excepțiile globale sunt explicite. Comanda locală are prioritate; fallback-ul nu ocolește bariera. Evenimentele deja consumate de editor sau de câmp nu produc o a doua comandă globală.

Confirmarea modificărilor nesalvate este un strat ADL distinct. Escape anulează decizia și închide numai confirmarea. Cererile simultane reutilizează aceeași promisiune de decizie, în loc să înlocuiască resolver-ul unui apel anterior.

## Orientare și dimensiuni

Managerul DOM existent al dialogurilor izolează fundalul prin `inert`, evită focusul inițial pe închidere/distructiv și memorează inclusiv un câmp din dialogul părinte. La revenire restaurează focusul fără scroll implicit, selecția și scrollurile capturate când țintele mai există. Listener-ele, cadrele și referințele temporare au cleanup.

Meniurile se dimensionează după conținut, cu limite de viewport și etichete întregi. Rândurile nu se comprimă sub 32 px. Titlurile contextuale, numele accesibile și `aria-checked` expun informația fără a obliga utilizatorul să interpreteze doar un simbol. În toolbar, iconița poate reprezenta o acțiune familiară dacă există nume accesibil și tooltip; în listele complexe se preferă textul.

Setările nu mai rezervă 260 px în fiecare tab indiferent de conținut. Zona de conținut poate derula, păstrând reperele și acțiunile. Quick Reference are limite de dimensiune și un antet protejat de titluri lungi. Dialogul Compile primește spațiul necesar celor trei coloane: compact nu înseamnă prea îngust pentru sarcină. Editorul și suprafețele de scriere nu sunt micșorate doar pentru a economisi pixeli.

## Dovezi și criterii de închidere

Rulări distincte, fără a confunda inventarul cu testarea funcțională:

1. Suita unitară completă: modele, stare, rutare și regresii.
2. `tests/e2e/electron.e2e.cjs`: E2E separat în Electron real, inclusiv scriere/salvare, DOCX/PDF/EPUB, import și închidere sigură.
3. `tests/e2e/flows.e2e.cjs`: FLOWS separat pentru Binder, Scrivenings, snapshot, înlocuire, formate, backup, șabloane și comenzi native. Se verifică absența fără selecție și prezența cu selecție a comenzilor AI contextuale.
4. `tests/e2e/ergonomic-menus.e2e.cjs`: inventar recursiv și activarea fiecărei intrări emise pentru zece contexte de fixture, cu reset de date între cazuri, capturi și aserțiuni pe disc/clipboard/UI. Nu se alege aleatoriu și nu se filtrează după importanță. Include fiecare opțiune de iconiță.
5. Verificări de geometrie și focus la 960×720 și 1733×1048, pentru fiecare tab Settings și pentru Compile.

Toate datele de lucru ale testelor sunt temporare. Exporturile, golirea Coșului și restaurările se efectuează pe fixture-uri, nu pe manuscrisele autorului. Dependențele externe fără cont/serviciu nu sunt declarate validate doar pentru că o acțiune a afișat feedback.

Versiunea din manifestul acestei copii sursă este 0.13.7; nu este schimbată artificial în 1.0.0. Executabilul instalat 1.0.0 este o țintă distinctă. Modificările nu se livrează peste acesta prin înlocuirea unui renderer provenit din altă versiune. Închiderea unei verificări complete a aplicației instalate cere integrare în sursa corespunzătoare instalării și rerularea matricelor relevante pe artefactul rezultat.
