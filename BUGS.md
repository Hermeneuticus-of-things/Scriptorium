# Sistemul de bug-uri — vânat, semnalat, prins pentru totdeauna

Un sistem coerent, în trei straturi: **vânăm** bug-urile automat, le **semnalăm** structurat, și le **prindem definitiv** cu teste de regresie. Scopul: un bug reparat nu mai revine niciodată tăcut.

## 1. Vânare (hunt) — automat, pe fiecare schimbare

- **CI** (`.github/workflows/ci.yml`) rulează pe **orice branch**, pe PR către `main`, **nocturn** (03:17 UTC) și **la cerere** (`workflow_dispatch`):
  - `npm test` — suita completă (vitest, peste 1300 de teste),
  - `npm run build` + `npm run build:web` — că renderer-ul chiar se construiește,
  - `npm run test:e2e` — aplicația Electron reală (deschide proiect, navighează, salvează) sub `xvfb`.
  Rularea nocturnă prinde eșecurile care depind de mediu/timing (flakes).
- **Revizie pe mai multe axe** înainte de fiecare schimbare mai mare: `/code-review` (8 unghiuri — corectitudine, guard-uri scoase, apelanți, reuse, simplificare, eficiență, altitudine, convenții). Pentru o revizie **profundă** înainte de release: `/code-review ultra` (revizie multi-agent în cloud pe branch-ul curent sau pe un PR).
- **Suita de regresie** (`tests/regressions.test.js`) — vezi stratul 3.

## 2. Semnalare (report) — structurat

- **Pe GitHub**: Issues → New issue → **„Raport de bug"** (`.github/ISSUE_TEMPLATE/bug_report.yml`). Cere pașii de reproducere, versiunea, zona și raportul de eroare din aplicație. Pașii de reproducere sunt cel mai valoros lucru — ei devin testul de regresie.
- **Din aplicație**: când apare „A apărut o problemă", eroarea e salvată local (`<userData>/logs/errors.jsonl`, maxim 200 de intrări). Ajutor → *Raportează o problemă* o arată; o lipești direct în issue.

## 3. Prindere definitivă (regression) — regula de aur

> **Orice bug reparat primește un test în `tests/regressions.test.js`, în același commit cu reparația.**

- Un test pe bug, mic și țintit **exact** pe contractul care s-a stricat.
- Fiecare intrare are o dată și o linie: ce era bug-ul. Intrările noi se adaugă la sfârșit.
- Dacă bug-ul e deja acoperit de un test existent dintr-un alt fișier, fie întărești acel test, fie adaugi aici o verificare scurtă care îl documentează.
- CI rulează `tests/regressions.test.js` ca orice test, deci regresia e prinsă la următorul push.

### De ce „pe contractul exact"
Bug-ul din v0.10.8 („Cannot read properties of undefined (reading 'id')") a dărâmat toată fereastra editorului fiindcă bara de format avea un grup fără id corespunzător. Testul de regresie nu verifică „aplicația pornește", ci exact invariantul rupt: `FORMAT_ITEMS` are id-uri unice și conține grupul nou. Așa, aceeași greșeală e prinsă instant, nu după ce strică iar interfața.

## Flux complet pentru o reparație

1. **Reproduci** bug-ul (din aplicație sau din pașii din issue).
2. **Găsești cauza de fond (root cause)**, nu simptomul: unde și de ce se rupe exact. O scrii în comentariul testului de regresie (cu dată) și în mesajul de commit. Un simptom reparat fără cauză revine sub altă formă.
3. **Scrii întâi testul de regresie** care pică pe cauză (nu pe „aplicația pornește").
4. **Repari**, până testul trece.
5. **Commit**: reparația + testul împreună. `npm test` local, apoi push → CI.
6. **Închizi issue-ul** cu referință la commit și o linie de root cause.

Fiecare test din `tests/regressions.test.js` poartă deja, în comentariu, **cauza de fond** a bug-ului respectiv — așa, fișierul e și istoricul cauzelor, nu doar al simptomelor.
