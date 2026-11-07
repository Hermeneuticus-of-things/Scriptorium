# Audit Ionuț Application Design Language (ADL) — Pneuma Sofer

Data: 2026-11-05. Aplicare deep pe cod + UI + UX + cauze-rădăcină (§17 checklist), cu focar pe
instabilitatea raportată de autor (editare + dictare). Skill: `ionut-application-design-language`.

## Cauze-rădăcină găsite și reparate (în acest audit)

### 1. Dictarea heavy + editarea instabilă în timpul dictării — ADL §12 violat + perf (REPARAT)
**Cauza:** evenimentele `nivel` de la motorul de dictare sosesc la fiecare ~150 ms și intrau în
`setDict` — **stare React la nivelul App**. Rezultat: re-randarea completă a aplicației
(~6,6×/secundă) în timp ce dictezi, cu reporniri de hook-uri, reconstrucția listei de comenzi
(~190 intrări) și propagare în toate componentele. Tastarea simultană cu dictarea = lag.
**Fix (ADL §12 — feedback la cauză, liniștit, fără furt):** nivelul microfonului a ieșit din
starea React → `levelRef` + `onLevel(cb)` în `useDictation`; **DictationBar** aplică valoarea
**direct pe nodul DOM al metrului** (fără re-randări: 0 re-randări pentru nivel). Evenimentele rare
(start/stop/pauză/ cuvinte) rămân în stare.
**Verificare:** `DictationBar` folosește `dict.onLevel`; metrul primește valori live; restul
aplicației nu se re-randează.

### 2. Motorul de focus (ADL §2) — lipsă ca arhitectură (IMPLEMENTAT)
**Cauza:** focus era ad-hoc (handler-e dispersate, cascade Escape duplicare-izabile).
**Fix:** `src/lib/focusEngine.js` — stive per fereastră, înregistrare suprafețe
(`editor.document.core`, `settings.app`, `popover.service`), push/pop cu captură/restaurare,
dispatch cu bubbling (suprafață activă → părinți), cascade Escape (cel mai interior primul,
unul per apăsare), focus ≠ selecție, sincronizare focus nativ. **8 teste** (restore exact,
bubbling, cascade, destroy cu copii, switchFocus). Legat în App: înregistrări la mount,
popover servicii push/pop la deschidere/închidere. Integrarea completă (toate dialogurile,
meniurile, dropdown-urile, scheme de id per instanță) continuă incremental.

### 3. Sinonimele incomplete + cerere fără timeout (REPARAT)
**Cauza:** parserul lua doar listele directe; secțiunea „Sinonime Apropiate" a site-ului era
sărită; cererea putea atârna nelimitat.
**Fix:** `parseRelated` — cuvintele apropiate cu listele lor; grupul „Cuvinte apropiate" în
popover, apăsare = re-căutare în popover (fără ieșire din pagină); timeout 10 s pe cerere;
`related` adăugat și în calea de selecție (lipsea — prins la test E2E).
**Verificare E2E:** popover DA, grup DA, 8 chipuri, re-căutare DA, 0 erori.

### 4. Updaterul cu token vechi (REPARAT mai devreme, 0.13.1)
401 cu token invalid → reîncercare anonimă automată (depozit public). 3 teste.

## §17 Checklist — starea la 2026-11-05

| Item | Stare |
|---|---|
| Adoption + înregistrare („Design language: Ionuț ADL — yes") | ✅ acest doc + plan |
| Focus ca motor (stive, routing, dispatch, restore exact) | 🟡 motor + teste + popover/setări legate; restul suprafețelor incremental |
| Focus ≠ selecție | 🟡 motorul le ține separat; UI-ul păstrează selecția inactivă |
| Core function (editor) cel mai mare, activ la deschidere | ✅ |
| Nimic eliminat (comenzi/menuri intacte) | ✅ (AI isolation = mutat în meniul AI, nu șters) |
| Scales/token-e (§4) | ✅ styles.css pe token-e (T9: --ctl 24/28/32, --icon 16/20, --sp 4/8/12, --radius 6/8, --font-ui 12-14; audit executabil tests/adlTokens.test.js; restul fișierelor CSS rămân) |
| Disappear vs available (§5) | ✅ totul are cale fixă de revenire (meniu/paletă/shortcut) |
| Dropdownuri (§6) | 🟡 majoritatea conforme; audit rămâne |
| Butoane + 6 stări (§7) | 🟡 stările de bază există; loading/error sistematizat rămâne |
| AA contrast + ring + tastatură + SR | 🟡 ring și tastatură existente; audit AA pe teme rămâne |
| Vector la 100/150/200% (§9) | ✅ icons SVG |
| Densitate 4/8/12 (§11) | ✅ gap-urile din styles.css pe token-e (T9: 8 între controale, 4 în compozite, 12 între grupuri; allowlist în tests/adlTokens.test.js) |
| Feedback la cauză, fără furt (§12) | ✅ **reparat acum** (nivel dictare, popover ancorat, toast-uri non-blocante) |
| Teme/mișcare pe token-uri (§13) | 🟡 teme existente; motion audit rămâne |
| §14 AI-assisted UI: nimic șters, raport comenzi | ✅ 190 comenzi păstrate (bug-hunt) |
| §15 Hallmark Floor + fundație caldă opacă | ✅ fundația existentă respectată |
| Instabilitate (cauză-rădăcină) | ✅ storm-ul de re-randări la dictare — reparat |

## Rămâne (priority order)

1. Integrarea completă a motorului de focus pe toate suprafețele (dialoguri, meniuri, dropdown-uri,
   split-uri, quick-ref) — schema de id per instanță, capture/restore pe caret real.
2. Audit de scală/AA/motion pe toate temele (§4/§8/§13) — după T9 rămân: fișierele CSS secundare
   (ai, editor-extra, panels-extra, help, dialoguri-componentă, smallWindows, scrivener-theme),
   layoutul barei moderne (menubarul colapsează peste titlu la fereastră îngustă — defect
   preexistent, vezi GATES.md T9) și AA/motion.
3. Etapele 2–3 AI (coada de revizuire per paragraf, o singură suprafață Editorial) — docs/PLAN-AI-DEDICAT.md.
