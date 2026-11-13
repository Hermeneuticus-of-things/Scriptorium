# Hotspoturi de performanță — Pneuma Sofer pe carte mare (Karma)

Cauze **confirmate prin profilare** (smoke cu PerformanceObserver + instrumentare `writeAtomic`/`saveMerged`/preload pe branch-ul `feat/perf-karma-large`). Protocol: copie nedistructivă a Karma.scribner (218 MB, 2358 documente, 2393 noduri), user-data-dir izolat, `perf/smoke-run.mjs`.

## Baseline (înainte de reparații)

| Operație | Durată | Longtasks >50 ms |
|---|---|---|
| Pornire → ecran start | 567 ms | — |
| Deschidere Karma | 2,0 s | 2 (max 935 ms) |
| Tastare 300 caractere | 935 ms | 1 (68 ms) |
| Salvare Ctrl+S → disc | 8,2 s | 4 (max 192 ms) |
| Comutare document | 419 ms | 1 (72 ms) |
| QuickSearch + interogare | 1,4 s | **9 (728 ms total)** |
| Tastare stabilă 104 caractere | 244 ms | 0 |

## Hotspot 1 — QuickSearch: parse DOM al întregii cărți per tastă (REPARAT)

**Cauză (file:line):** `src/lib/quickSearch.js` — `quickSearchProject` apela `htmlToText(docs[node.id])` pentru **fiecare** nod la **fiecare** tastă; pe Karma = 2358 parse-uri DOM per tastă (`src/lib/text.js` — `document.createElement` + innerHTML). Plus `foldText(plain)` (NFD + regex) pe tot textul cărții, per tastă.

**Reparație root-cause:** cache de text-plain + text-foldat per id de document, invalidat pe conținut (`plainCache` în `quickSearch.js`); doar documentele modificate se re-parsează. `htmlToText` injectabil pentru teste.

**Bug corectat colateral:** pozițiile de potrivire din textul foldat (NFD schimbă lungimea string-ului) nu se aliniau cu textul original — contextul tăia greșit pe text românesc. Adăugat `fold1to1` (un cod-punct în → unul out), poziții garantate aliniate.

**Test:** `tests/quickSearchCache.test.js` (5 teste, roșu-verde demonstrate).

## Hotspot 2 — „Salvarea durează 8 s" (NEDEFECT — misiune falsă de măsură)

**Verificat cu instrumentare:** scrierea `project.json` (3,9 MB, atomic + fsync) durează **89 ms** (`saveMerged` read=6 ms, merge=1 ms, serialize+write=83 ms). Cele 8,2 s măsurate până la schimbarea mtime-ului = **`AUTHOR_COMMIT_DELAY = 8000`** (`src/App.jsx:190`): jurnalul editorial I-EDIT se comite programat la 8 s după ultima tastă (prin `commitAuthorRef`), iar acel comit actualizează `authorHashes` → scrie `project.json`. Design intenționat, nu blocaj: nu se repară.

## Hotspot 3 — Stall de ~935 ms la deschiderea proiectului (documentat, nereparat)

Un singur longtask la deschidere (prima randare Binder cu 2393 noduri + încărcarea documentelor). Evidențiat în măsurători; orice reparație (virtualizare Binder, randare eșalonată) cere propriul ciclu roșu-verde înainte de implementare — nu se repară fără profilare dedicată.

## Dubluri de cod (inventar confirmat)

Inventarul inițial a contat 22 de funcții exportate cu nume dublu între `src/lib` (ESM, renderer) și `lib` (CJS, main). **Verdictul final, pereche cu pereche (ciclul 4, 13 noiembrie):**

**Consolidate efectiv (clone reale, cu teste de echivalență):**
- `htmlToText` + `wordCount` main-side → `lib/textCore.cjs` (store.cjs + rag.cjs; bug „patrucinci" corectat — #87).
- `walk` + `findNode` → `lib/treeCore.cjs` (store.cjs consumă; tree.js re-exportă) — #87.
- `htmlToText` renderer → rescris pur, echivalență dovedită pe corpus Karma (#85) — rămâne distinct de varianta main (DOM decode vs string-only, medii diferite).

**Distinct-by-design (verificate, NU se unesc — semantici diferite intenționat):**
- `parseQuery` (projectSearch = parser de criterii complexe; snapshotSearch = matcher simplu) — doar numele comun.
- `applyReplacements` (autoReplace = regex word-boundary general; dictation = normalizare cedille cu păstrarea capitalizării).
- `htmlToPlain` (search = segment-parser cu BLOCK_END; stats = strip pentru statistici, cu script/style eliminate).
- `sanitizeHtml` (importers = curățenie la import cu allowlist; sanitize.js = cealaltă parte, renderer) — straturi diferite.
- Perechile gemene `researchChat.js` (93 l.) vs `.cjs` (314 l.) și `snapshotSearch.js` (44 l.) vs `.cjs` (78 l.) — implementări paralele cu evoluții separate, nu clone; unirea lor cere refactor cross-layer (ESM/CJS) cu raport risc/beneficiu slab.
- `newNode`, `escapeHtml`, `chunkText`, `tokenize`, `fold`, `summarize`, `listTemplates`, `validateBundle`, `pdfPageCount`, `hasHiddenChars`, `stripAiWatermarks`, `textToHtml`, `matchSnapshot`/`toSearchText`, `applyReplacements` (compile.cjs) — la fel: straturi diferite cu dependențe incompatibile (fs/i18n/crypto), nu clone.

**Concluzie:** clonele reale au fost eliminate în ciclurile 2–3. Restul numelor duble sunt implementări distincte cu motiv — consolidate doar dacă viitorul refactor cross-layer (module pure CJS re-exportate în renderer) le face ieftine și sigure.
