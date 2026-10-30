# Cum funcționează căutarea în Scrivener 3 — dovezi și paritatea în Pneuma Sofer

Data: 2026-10-30. Sursa dovezilor: **manualul oficial inclus în instalare**,
`C:\Program Files\Scrivener3\Resources\Scrivener-Manual.pdf` (774 pag., Scrivener 3.1.6).
Capitolul 11 „Searching and Replacing" acoperă paginile tipărite 216–241 (PDF 221–246).
Pentru fiecare afirmație cităm secțiunea și pagina din manual. Concluziile sunt
verificate și în codul aplicației noastre (referințe la fișiere la final).

---

## 1. Cele șase unelte de căutare din Scrivener 3 (manual, p. 216/PDF 221)

| Unealtă | Ce face | Unde în manual |
|---|---|---|
| **Project Search** | Caută în tot proiectul; rezultatele înlocuiesc binderul în bara laterală (fundal mov), ca o „filtrare" a binderului | §11.1, p. 217 (PDF 222) |
| **Document Find and Replace** | Găsește/înlocuiește în editorul curent, pas cu pas, cu wrap-around | §11.2, p. 226 (PDF 231) |
| **Project Replace** | Înlocuire în masă în tot proiectul, cu domeniu și elemente afectate alese | §11.3, p. 228 (PDF 233) |
| **Filter Outliner & Corkboard** | Filtrează vizualizările corkboard/outline după text și metadate | §11.4, p. 229 (PDF 234) |
| **Quick Search** | Omnibox în toolbar („ca bara de adrese din browser"): sari la document după titlu/sinopsisă/text | §11.5, p. 234 (PDF 239) |
| **Find by Formatting** | Caută formatare: highlight, comentarii, adnotări, culori de revizie, stiluri, linkuri, imagini | §11.6, p. 237 (PDF 242) |

---

## 2. Project Search — specificația completă (§11.1, p. 217–225)

- **Rezultate în sidebar**: lista înlocuiește binderul; fundal mov; buton × închide; se poate
  sorta (Binder Order implicit / după Titlu cu A-Z / după Dată cu Newest First);
  Navigare → Reveal in Binder (Shift+R) localizează rezultatul în binder (p. 219).
- **Rezultatele persistă**: ultima căutare rămâne în colecția specială „Search Results",
  disponibilă și după redeschiderea proiectului (p. 219).
- **Dinamic la taste**: lista se restreânge în timp ce tastezi; nu se actualizează singură la
  modificări externe — Enter reîmprospătează (p. 220).
- **Textul căutat e preluat de Find**: la deschiderea unui rezultat, termenul se încarcă în
  unealta de căutare din editor; F3 sare la următoarea apariție (p. 218–219).
- **Search In** (multi-select cu Alt): All, Title, Text, Notes, Synopsis, Keywords, Label,
  Status, Section Type + fiecare câmp de metadate personalizate; pentru Checkbox se înțeleg
  „yes/true/1", pentru Date și sintaxa relativă (p. 220–221).
- **Operatori** (p. 222): **Any Word** (OR, implicit), **All Words** (AND; acceptă și fraze
  între ghilimele amestecate cu cuvinte), **Exact Phrase**, **Whole Word**, **RegEx**.
- **Opțiuni** (p. 222–223): Search Draft Only · Search Binder Selection Only (incl. subdocumente) ·
  Exclude Trash Documents · Search „Included" Documents · Search „Excluded" Documents ·
  Case Sensitive · **Invert Results** (toate documentele care NU se potrivesc) · Reset Search Options.
- **Termeni speciali** (p. 223–225):
  - fraze între ghilimele amestecate cu All Words: `Bob "black car"`;
  - excludere cu cratimă: `Lydia -Dovahkiin` (merge și cu fraze: `Lydia -"Needs Proofing"`);
  - wildcard universal `*` = tot proiectul (combinabil cu opțiuni; „tot ce nu are etichetă" = Invert);
  - date: `mdate:` / `cdate:` + `YYYY-MM-DD`, `YYYY`, `#d`, `#m`, `#y`, `>`, `<`
    (ex. `ToDo mdate:<6m` = note „ToDo" nemodificate de 6 luni) — Tabel 11.1, p. 225.

## 3. Document Find and Replace (§11.2, p. 226–227)

- Moduri: **Contains / Starts with / Whole word / Ends with / RegEx / Ignore Case**.
- Replace · Replace & Find · Replace All; Replace All Scope: Entire Document / Selected Text.
- Tastatură: Enter = Next; **F3 / Shift+F3** funcționează și cu panoul închis; Ctrl+E încarcă
  selecția în câmpul Find. Caută și în comentariile/notele de subsol din inspector (p. 226).

## 4. Project Replace (§11.3, p. 228–229)

- Dialog separat, bară de progres, **nu poate fi anulat** (avertizează; recomandă backup).
- Buton **Swap** pentru inversarea termenilor.
- **Scope**: tot proiectul sau doar selecția din binder (copiii dosarelor NU sunt incluși).
- **Affect**: Titles · Text · Notes · Synopses · Custom Metadata · **Snapshots** (și comentariile
  legate din snapshot-uri). Ctrl+Enter / Ctrl+Tab introduc newline/tab.

## 5. Quick Search (§11.5, p. 234–237) — **implementat acum în Pneuma Sofer**

Specificația din manual:
- Stă „front and centre" în toolbar; arată titlul documentului curent, „ca bara de adrese";
  focalizare cu Ctrl+G sau Edit ▸ Find ▸ Quick Search; fără toolbar, comanda creează un
  câmp popup (p. 234, 236).
- Căutare după **Exact Phrase**; rezultatele vin pe **trei secțiuni**:
  1. **Titles** — „prioritised by titles that match … or that begin with the typed in text";
  2. **Synopses** — fraza exactă din sinopsele scrise de mână;
  3. **Text** — documente care conțin fraza, „with a little context around the phrase" (p. 235).
- La deschiderea unui rezultat din secțiunea Text, prima apariție se derulează și se
  selectează; unealta Find se presetază cu termenul (F3 funcționează apoi) (p. 235).
- Shift+click deschide în Quick Reference; Alt+click în celălalt split; rezultatele sunt
  drag-and-drop (p. 235–236).
- Buton **„Full Project Search"** la baza listei duce căutarea în Project Search, cu setările
  și textul deja tastat (p. 235).
- Esc golește textul, apoi închide (p. 237).

### Ce am implementat (etapa 1)

- `src/lib/quickSearch.js` — modul pur: potrivire frază exactă (insensibilă la majuscule și
  diacritice, ca typeAhead-ul din binder), secțiuni Titluri (început-de-titlu prioritizat,
  apoi titluri mai scurte) / Sinopse / Text cu context ±30/40 caractere, excluderea Coșului,
  limită pe secțiune, `handoffCriteria` (fraza devine operator „exact" pentru căutarea completă),
  `quickNav` (navigare pe cheie unică de rând — același document poate apărea în mai multe secțiuni).
- `src/components/QuickSearch.jsx` — omnibox popup sus-centrat, placeholder cu titlul curent,
  secțiuni etichetate, navigare ↑/↓/Enter, Esc golește apoi închide, snippet cu `<mark>`,
  buton „Căutare completă în proiect…" → dialogul avansat cu interogarea precompletată.
- Wiring în `src/App.jsx`: comandă `quickSearch` (grup Edit), dialog `quicksearch`,
  deschiderea rezultatului preseed-ează unealta Find (`findSeed`) ca în Scrivener.
- Scurtătură implicită **Ctrl+O** (metafora barei de adrese; Ctrl+G e ocupat de Go To,
  Ctrl+K de split; Ctrl+Alt evitat — AltGr pe layout românesc, nota din commands.js).
- i18n ro/en (`ui.quickSearch.*`, `cmd.quickSearch`), CSS în `src/styles.css`.
- Teste: `tests/quickSearch.test.js` — 13 teste (secțiuni, prioritizare, diacritice, coș,
  context, markup ignorat, limită, handoff, navigare cu wrap).

### Deviații conștiente față de Scrivener (documentate)

- Scurtătura: Ctrl+O în loc de Ctrl+G (ocupa în Pneuma Sofer de Go To).
- Shift/Alt+click pe rezultat (Quick Reference / alt split) — rămas în backlog.
- Derulare+selectare a primei apariții din text — rămas în backlog (deschide documentul;
  Find-ul e preseed-at, deci F3 funcționează).

---

## 6. Goluri rămase în capitolul „Căutare" (înaplog cu priorități)

Verificat în cod (`src/components/AdvancedSearchDialog.jsx`, `src/lib/projectSearch.js`,
`src/lib/search.js`) față de manual:

| Prioritate | Gol | Manual | Efort estimat |
|---|---|---|---|
| ~~P1~~ ✅ 2026-10-30 | ~~Operatori **Starts with / Ends with**~~ — implementați în `buildTerms` (ancorare la marginea de cuvânt, Unicode) | §11.2.1, p. 227 | făcut |
| ~~P1~~ ✅ 2026-10-30 | ~~**Invert Results**~~ — criteriul `invert` în `searchProject` (complementul potrivirii; filtrele rămân; fără Coș) | §11.1.2, p. 223 | făcut |
| ~~P1~~ ✅ 2026-10-30 | ~~Sortare rezultate~~ — `sort: 'binder'/'title'/'created'` + `sortDesc`, collation ro; în dialog | §11.1.1, p. 219 | făcut |
| P2 | Termeni speciali: ghilimele în All Words, excludere cu `-`, wildcard `*` | §11.1.3, p. 223 | mediu |
| P2 | Sintaxa de date `mdate:` / `cdate:` (YYYY-MM-DD, #d/#m/#y, >, <) | §11.1.3 + Tabel 11.1, p. 224–225 | mediu |
| P2 | Colecția persistentă „Search Results" (ultima căutare, supraviețuiește redeschiderii) | §11.1.1, p. 219 | mediu |
| P3 | Search Draft Only · Search Binder Selection Only · Search Included/Excluded separate | §11.1.2, p. 222 | mediu |
| P3 | Project Replace: afectare **Snapshots** + Custom Metadata text + Swap | §11.3, p. 229 | mediu |
| P3 | Filter pentru Corkboard/Outliner (text + metadate + Included/Excluded) | §11.4, p. 229–233 | mare |
| P3 | Find by Formatting: extinderi (caracter, linkuri, imagini, formatting păstrat) | §11.6, p. 237–240 | mediu |

### Etapa P1 — implementată (2026-10-30)

- `src/lib/projectSearch.js`: operatorii `startsWith`/`endsWith` în `buildTerms` (ancorare
  `(?<![\p{L}\p{N}_])` / `(?![\p{L}\p{N}_])` — marginea de cuvânt, ca la Whole Word); criteriul
  `invert` (complementul potrivirii termenilor; filtrele se aplică normal, Coșul rămâne ascuns,
  interogarea goală + invert = toate nodurile care trec de filtre); sortarea `sort`/`sortDesc`
  (titlu cu collation românesc, dată de creare; „binder" rămâne implicit).
- `src/components/AdvancedSearchDialog.jsx`: operatorii noi în lista „Potrivire", „Ordonare"
  (binder/titlu/dată) + „Descrescător", caseta „Inversează rezultatele".
- i18n ro/en; 7 teste noi în `tests/projectSearch.test.js` (20 total în fișier); suita completă
  verde (851 trecute), build OK.
- Semantica fixată în timpul testării: „începe cu" = cuvântul **începe** cu textul („pădur"
  se potrivește cu „Pădurea"); la invert, dosarele sunt item-uri la fel ca documentele.

### Lecție de metodă

Inventarul `FEATURES-SCRIVENER3.md` (264 × [x]) **nu conținea deloc Quick Search** — uneltele
sunt clonate pe cât e inventarul de complet. Pentru paritatea completă cerută („toate
facilitățile + UI-ul Scrivener 3"), metoda corectă este audit **capitol cu capitol împotriva
manualului** (774 pag.), nu împotriva inventarului auto-intreținut. Acest document e primul
audit de acest tip (cap. 11). Următoarele capitole candidate: 10 (Organisare/metadata),
12 (editor), 18 (comentarii/adnotări), 24 (Compile).

> Notă de nume: aplicația se numește acum oficial **Pneuma Sofer** (fostul „Scribner");
> README-ul și fișierele care folosesc numele vechi vor fi redenumite treptat.
