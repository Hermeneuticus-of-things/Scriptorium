# Trierea issue-urilor pentru următorul ciclu

Data verificării: 26 noiembrie 2026  
Repository: [Hermeneuticus-of-things/Scriptorium](https://github.com/Hermeneuticus-of-things/Scriptorium)  
Versiune curentă: [v1.4.3](https://github.com/Hermeneuticus-of-things/Scriptorium/releases/tag/v1.4.3)

## Situația curentă

Repository-ul are patru issue-uri deschise. Versiunea 1.4.3 este în principal o versiune de documentație, demonstrații și distribuție fiabilă; nu închide automat aceste issue-uri funcționale.

## Prioritatea 0 — stabilitate și reproducere

### #113 — „sa blocat”

Issue: [#113](https://github.com/Hermeneuticus-of-things/Scriptorium/issues/113)

Raportul descrie blocări și erori renderer în versiunea 1.4.2, inclusiv `Cannot read properties of undefined (reading 'preventDefault')` și `h is not a function`. Autorul indică o succesiune de comenzi care include updaterul, paginarea, focusul lingvistic, setările AI/MCP și I-EDIT, dar nu oferă încă pași minimali de reproducere.

**Acțiune recomandată:** reproducere controlată pe 1.4.3, cu logul rendererului și pași minimali. Se verifică mai întâi dacă erorile provin din evenimente fără obiect `event` sau din callback-uri nelegate după deschiderea/închiderea ferestrelor AI și MCP. Dacă se reproduce, se adaugă un test E2E de regresie înainte de orice refactorizare.

**Prioritate:** P0, deoarece este singurul issue deschis care raportează explicit un crash sau o blocare în utilizare.

## Prioritatea 1 — QA care trebuie să devină repetabil

### #100 — roadmap post-1.2.6

Issue: [#100](https://github.com/Hermeneuticus-of-things/Scriptorium/issues/100)

Issue-ul este un container de roadmap și enumeră restanțe încă relevante: matricea QA de 5.515 cazuri, adăugarea unor suite E2E în CI, diff AI pe fragment, acțiunea „Continuare” la cursor, chip de context persistent în AI, unificarea comportamentului de salvare și măsurători pe cărți mari.

**Acțiune recomandată:** nu se implementează ca un singur task. Se sparge în issue-uri mici și verificabile:

1. E2E în CI pentru funcțiile critice;
2. reproducere și benchmark pe corpus mare fără date private;
3. contract unic pentru salvarea setărilor;
4. AI: diff pe fragment, Accept/Respinge și Continue la cursor;
5. curățarea sau arhivarea elementelor istorice care nu mai sunt relevante.

**Prioritate:** P1, deoarece issue-ul influențează calitatea următoarelor release-uri, dar nu trebuie să blocheze remedierea crashului #113.

## Prioritatea 2 — funcție cu impact direct pentru cărți lungi

### #40 — formatare la nivel de document și valori implicite de proiect

Issue: [#40](https://github.com/Hermeneuticus-of-things/Scriptorium/issues/40)

Solicită aplicarea alinierii și a altor setări de formatare asupra întregului manuscris, inclusiv în proiecte vechi, plus alegerea unor valori implicite la crearea unui proiect nou.

**Acțiune recomandată:** definirea exactă a domeniului — toate documentele text, numai Manuscris sau numai selecția curentă — urmată de preview, undo/snapshot, progres și test pe carte mare. Funcția trebuie să păstreze formatările locale unde utilizatorul nu cere explicit suprascrierea lor.

**Prioritate:** P1/P2. Este o funcție importantă pentru producția de cărți lungi, dar trebuie implementată după stabilizarea fluxurilor de salvare și a operațiilor lungi.

## Prioritatea 3 — guvernanță UX și documentație

### #41 — Ionuț Application Design Language

Issue: [#41](https://github.com/Hermeneuticus-of-things/Scriptorium/issues/41)

Issue-ul descrie regulile generale de design: funcția principală în prim-plan, controale complete dar discrete, scale măsurabile, ținte accesibile, focus de tastatură, etichete pentru cititoare de ecran și comportament pentru reduced motion.

**Acțiune recomandată:** verificare de conformitate pe suprafețe concrete, nu o rescriere abstractă a regulilor. Se aleg mai întâi editorul, Binderul, ferestrele AI și setările. Pentru fiecare suprafață se păstrează o listă de criterii și capturi E2E; issue-ul poate rămâne documentul de guvernanță, iar implementările se urmăresc în issue-uri separate.

**Prioritate:** P2/P3. Este important pentru consistență și accesibilitate, dar nu trebuie să amâne fixurile de stabilitate.

## Ordinea recomandată pentru următorul ciclu

1. Reproducere și fix pentru #113 pe v1.4.3.
2. Separarea #100 în taskuri testabile; introducerea E2E-urilor critice în CI.
3. Stabilirea contractului de salvare și a operațiilor lungi cu progres/anulare.
4. Implementarea formatării la nivel de document din #40.
5. Verificare ADL focalizată pe editor, Binder, AI și Setări pentru #41.
6. Curățarea elementelor istorice: PR-uri sau branch-uri fără proprietar clar, după confirmare.

## Ce nu trebuie declarat încă drept rezolvat

- #113 nu este rezolvat doar pentru că buildul 1.4.3 și E2E-ul standard au trecut; trebuie reproducere pe scenariul raportat.
- #100 nu este un criteriu unic de „QA complet” până când matricea și suitele sunt executate într-un mediu controlat.
- #40 nu este acoperit de formatarea pe documente individuale; cerința este la nivel de manuscris și proiect nou.
- #41 este o regulă de design, nu o dovadă că fiecare fereastră respectă deja toate criteriile.

## Surse

- [Release v1.4.3](https://github.com/Hermeneuticus-of-things/Scriptorium/releases/tag/v1.4.3)
- [Issue #113 — sa blocat](https://github.com/Hermeneuticus-of-things/Scriptorium/issues/113)
- [Issue #100 — roadmap post 1.2.6](https://github.com/Hermeneuticus-of-things/Scriptorium/issues/100)
- [Issue #40 — formatare la nivel de document](https://github.com/Hermeneuticus-of-things/Scriptorium/issues/40)
- [Issue #41 — Ionuț Application Design Language](https://github.com/Hermeneuticus-of-things/Scriptorium/issues/41)
