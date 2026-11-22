# Jurnal de lansare — Pneuma Sofer

## 1.2.8 — 19 noiembrie 2026

- Curățare de publicare: repository-ul, installerul și asseturile release nu includ proiecte de test, corpusuri private, rapoarte locale sau căi personale.
- Testele pentru corpus mare acceptă acum calea numai prin `PNEUMA_CORPUS_DIR`, fără fixture inclus în codul public.
- Textele și documentația folosesc căi portabile și formulări generice pentru mediul local.
- Updaterul păstrează descărcarea verificată prin SHA-256 și selectează numai installerul sau portabilul Windows din release.
- Instanțele duplicate sunt explicate și refuzate clar; aceeași carte primește un lock inter-proces, iar Despre afișează versiunea și executabilul activ.

---

## 1.2.6 — 14 noiembrie 2026

- **AI în pagină (ciclul A)**: fereastra AI flotantă este înlocuită de panoul andocat unic; **micro-toolbar AI în editor** la selecție (Rescriere/Rezumat/Revizuire/Întreabă) cu **propunere aplicată în text și Accept/Respinge** (Respinge = undo simplu, snapshot automat înainte) (#96).
- **Setări: claritate salvare** — indicator „Modificări nesalvate" lângă Salvează pe fiecare filă și confirmare „Setări salvate." după salvare; Setările AI ale proiectului afișează toast la salvare (#98).
- **Lectura unificat** — View → Lectura are o singură poartă (panoul de focus); dialogul de replici se deschide din panou; dublura de comenzi eliminată (#98).
- **Fix anti-churn formatare** — re-aplicarea aceleiași formatari nu mai rescrie fișierele și nu mai raportează „documente modificate" fără schimbare vizibilă; valoarea efectivă (moștenită pe span-uri) e comparată înainte de scriere (#98).
- **Registrul cărții redenumit** în interfață (fără „Codex") (#98).
- Continuare: verificare extinsă pe o carte mare de test — sweep de comenzi curat, statistici corecte, formatare aplicată real pe disc și în editor (#93, #94, #98).

---

## 1.2.5 — 14 noiembrie 2026

- **Registrul cărții** (Proiect → Registrul cărții): personaje, locații, termeni și lore cu descriere și aliasuri; contextul AI le include **automat** când sunt menționate în textul lucrat (#94).
- E2E-urile scrise dar niciodată rulate au fost rulate și reparate: ai-workspace 5/5, ergonomic-menus 280/0, document-formatting 5/5 (#93).
- 2 corecturi găsite de e2e: meniul contextual Binder nu mai oferă „Asistent AI" când AI e dezactivat; etichetele cu placeholder nerezolvat („Documentul: {title}") din binderContextMenu sunt interpolate (#93).
- Guard-ul de paritate MCP actualizat pentru noile tool-uri (#94) — vezi și 1.2.4.

---

## 1.2.4 — 13 noiembrie 2026

- Reparare critică: **actualizarea din aplicație funcționează din nou** — „Descarcă" din Ajutor → Caută actualizări eșua cu „Redirect was cancelled" la redirectul GitHub → CDN de fișiere (#89).
- Fișierul nou este mereu salvat în același loc: `%TEMP%\pneuma-update\<versiune>\`, cu verificare SHA-256 înainte de instalare (#89).
- Siguranța se păstrează: gazda finală a descărcării e verificată pe lista de host-uri GitHub, iar cheia salvată nu mai poate ajunge la CDN (#89).

---

## 1.2.3 — 13 noiembrie 2026

- Continuarea accelerării deschiderii cărților mari: numărătoarea de cuvinte per document se calculează pe idle, cu umplere progresivă în Binder/totale/tinte (#87).
- O singură implementare HTML→text și numărare de cuvinte pentru procesul intern — eliminate clonele divergente din store și RAG (#87).
- Corectare: cuvintele se separau greșit la limita de tag („patrucinci") în numărătoarea din procesul intern (#87).
- Parcurgerea arborelui unificată între straturi (renderer + proces intern) (#87).

---

## 1.2.2 — 13 noiembrie 2026

- Deschiderea cărților mari cu ~⅓ mai rapidă (măsurat): ancorarea istoricului și indexul auto-complete se calculează pe idle, nu pe traseul critic al deschiderii (#85).
- Ancorarea istoricului reutilizează numărătoarea deja făcută (nu mai numără toate documentele de două ori la deschidere) (#85).
- htmlToText fără parsarea DOM a markup-ului — echivalență dovedită pe toate documentele testelor cu corpus real (#85).
- Dependența `zod` eliminată din aplicație (era cerută doar transitive de SDK-uri) (#85).

---

## 1.2.1 — 13 noiembrie 2026

- Performanță pe cărți mari: Quick Search nu mai re-parsează HTML-ul întregii cărți la fiecare tastă (cache de text per document, invalidat pe conținut) (#83).
- Titluri și sinopse foldate o dată per versiune de arbore, nu per interogare; index per arbore (WeakMap) (#83).
- Corectare: contextul potrivirilor din Quick Search tăia greșit textul cu diacritice (pozițiile din varianta foldată nu se aliniau cu textul original) (#83).
- Diagnostice de profilare env-gated `PNEUMA_PERF_DIAG` (inerte în producție) (#83).

---

## 1.2.0 — 13 noiembrie 2026

- Formatare document/manuscris din meniuri și toolbar (#70).
- Fereastră AI dedicată cu 30 de tipuri de carte și mod persistat (#71).
- Spațiere meniuri: separatoare logice și deduplicare comenzi (#72).
- Binder: imbricare ca în Scrivener 3 — „Adaugă în interior" pe documente, Mută în… cu documente ca țintă (#73).
- Panou AI andocat (dock/undock) + context AI pe niveluri: carte/manuscris/capitol/secțiune/paragrafe (#74).
- Popover-uri in-page (GoTo, Mută în, Adaugă la final, Quick Search și toate prompturile mici) în loc de modale; acordeoane quiet în Setări; toolbar ADL regroupat (#75).
- Dictare și voce ONLINE: serviciu STT compatibil OpenAI (cheie criptată) și Speechify ca motor de redare (#76).
- Șablon de teză academică cu FrontMatter/Body/BackMatter și validare structurală (#77).
- NotebookLM Studio: „Întreabă pe tot documentul" cu răspuns cu citări salvat în Cercetare + comenzi Studio (Audio/Video/MindMap); I-EDIT/I-REP mutate în asistentul AI (#78).

---

## 1.1.0 — 10 noiembrie 2026

- Fundație Ionuț ADL, focus modal sigur și revenire la selecția editorului; fără prompt ADL la pornire.
- Meniuri Binder contextuale, Proprietăți/Organizare/Arbore grupate și duplicare unificată cu payload.
- Selector unic rapid pentru spațiere; comenzi imposibile ascunse și identificatori comuni.
- Protecție Salvează/Renunță/Anulează la închidere și reload, splash/skeleton și hint-uri ghidate.
- Servicii neconfigurate ascunse; activare explicită pentru endpointuri gratuite; AI opțional fără spațiu inutil în toolbar.
- Redenumire corectă în colecții, citire concurentă limitată a notelor și cleanup pentru listenerul vocilor.
- E2E și FLOWS executate separat; 1.988 teste unitare trecute, trei sărite declarate.
- Matrice extinsă cu 5.515 cazuri pregătite, nu raportate drept audit integral executat. Detalii: [verificarea 1.1.0](docs/RELEASE-1.1.0-VERIFICATION.md).

---

## Jurnal de Lansare — Pneuma Sofer v1.0.0 Stable (General Availability)

## Rezumat Executiv
Pneuma Sofer trece de la stadiul de Beta (`0.13.x`) la **v1.0.0 Stable (General Availability)**, cu toate fazele din `DETERMINISTIC_ROADMAP.md` executate, validate și instalate pe Windows.

### Detalii Implementare & Pași Finalizați
1. **Adopția Ionuț ADL & Widget:**
   - Componenta `AdlAdoptionWidget` integrată în `App.jsx` + stocare preferință `ionut_adl_adopted` în `localStorage`.
   - Stilurile aferente în `AdlAdoptionWidget.css`.
2. **Fundație Opaque & Design:**
   - `scrivener-theme.css` refactorizată pentru warm opaque foundations (corkboard, hârtie, suprafețe).
3. **Focus Engine & Stive per Fereastră (ADL §2):**
   - `focusEngine.js` actualizat pentru stive active per fereastră, comutare suprafețe și cascadă Escape.
4. **Audit UI & Panouri Opțiuni (A1-A12):**
   - Setări avansate, auto-salvare, fonturi, mini-editor riglă în `FormatSettings.jsx`.
5. **Binder & Inspector (G2):**
   - Meniu contextual complet, drag-and-drop fișe, etichete colorate.
6. **Stabilitate, Dictare & Build:**
   - Flux D&TED v0.4.2 validat pe Windows.
   - Suitea completă de teste unitare: 1935 teste trecute cu succes (`npm test`).
   - Vite production bundle: build trecut cu succes.
   - Executabil portabil: `release\PneumaSofer-1.0.0-portabil.exe` (~107 MB).
   - Instalator: `release\PneumaSofer-Setup-1.0.0.exe` (Inno Setup 6).
   - **Instalat local:** buildul Windows a fost verificat după instalare → `ProductVersion: 1.0.0.0`.
   - Toate etichetele "Beta" eliminate din `package.json` (versiune `1.0.0`), interfață și documentație.

# Pneuma Sofer v1.3.0

## Fereastra AI — autonomă, cu context vizibil
- Fereastra AI are container propriu (`.ai-window`), separat fizic de coloana Inspectorului; Inspector rămâne instrument de măsură, AI rămâne zonă de propuneri.
- Chip-uri de context mereu vizibile (carte / document / nivel / tipul cărții) + acțiuni rapide din contextul curent (rescrie/corectează selecția, continuă textul, sinopsis capitol, „în stilul cărții").
- Indicator de stare lângă model: inactiv / gândire / scrie / aplică / gata.
- Prompt starters: un click pe acțiune pornește sarcina.

## Motor universal de scriere + pachet de carte
- Metoda „write-for-me" distilată în system promptul fiecărui apel AI (doza de intervenție, anti-amprentă, nu rescrii ce funcționează).
- Pachetul cărții (AI ▸ Setări AI (carte)): fraze fixate (nu se ating niciodată) și formule oprite (zero apariții), cu prioritate maximă.
- Garda frazelor fixate: propunerea care le-ar schimba se blochează cu confirmare explicită, decizia intră în registru.
- Registru de decizii și provenance (ai-audit.jsonl în proiect): actor, model, hash-uri, decizie, semantică formă/sens/conținut.

## Reparații simple și Semnale (fără AI)
- Unelte ▸ Reparații simple (fără AI)…: ghilimele românești, spații duble, majuscule, caractere invizibile — diff înainte de aplicare, snapshot automat.
- Unelte ▸ Semnale pe text (fără AI)…: ritm + semnale de limbă, deterministe, fără model.

## Ajutor
- Ctrl+Shift+H: ajutor și comenzi într-o singură căutare — exactă, fuzzy, sinonime, întrebări naturale; Command Finder peste comenzile reale.
- Manualul (F1) rămâne sursa completă.

## Navigare și organizare (Scrivener parity, tranșele T1–T3)
- F6/Shift+F6: mutarea focusului între panouri; Ctrl+Shift+1..4 ținte directe.
- Comenzi noi: Trimite la gunoi, Grupează/Degrupează, Copy To…, Textul selectat ca titlu, Golește titlul, Selectează cu subdocumentele, Copiază textul documentelor, Arată dosarul Manuscris, Extinde/Restrânge tot în Binder; Word Joiner, linie orizontală, ghilimele drepte, eliminare/editare legături.
- Corkboard: dublu-click pe fundal creează fișă nouă.
- Setări: separator configurabil la unirea documentelor; margini editor configurabile.

## Compile
- Previzualizarea nu mai umflă dialogul: panou propriu cu zoom „Potrivire la lățime" și bară de acțiuni mereu vizibilă.

# Pneuma Sofer v1.3.1

## AI complet invizibil până îl activezi tu (directivă autor)
- Când AI e oprit (starea implicită la prima pornire), **nu mai există nicio urmă de AI în program**: niciun meniu AI, fără I-REP/I-EDIT, fără setări AI separate, fără MCP, fără NotebookLM. Programul arată și merge ca un program de scris clasic.
- Activarea e self-service din **Program → Setări → Chei și conturi**: pui cheia (sau alegi un model local, fără cheie) + bifezi „Funcții AI" — abia atunci apare meniul AI.
- Motivul: unii scriitori pot fi oribilați de prezența AI-ului; programul trebuie să se prezinte ca instrument de scris cărți, cu AI ca opțiune la final.
