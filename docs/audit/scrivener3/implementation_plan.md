# Plan de implementare — acoperirea integrală a Scrivener 3 în Pneuma Sofer

Data: 2026-11-21. Sursa: `comparison_registry.md` (799 intrări: 279 MISSING + 81 PARTIAL de
închis). Principiile misiunii: tranșe mici și testabile; fără dublarea funcțiilor existente;
fără reducerea funcțiilor proprii ale Pneumei; fiecare tranșă = implementare + teste + CI verde.

## Tranchelor (ordinea = prioritate × valoare de scriere)

### T1 — Navigare din tastatură (P1, 31 goluri, Anexa A.6)
Move Focus To Binder/Editor/Inspector/AI + comenzile de deplasare între panouri și split-uri,
pe motorul de focus existent (`src/lib/focusEngine.js`, `focusPanes.js`).
Teste: unit pe mapările de focus + e2e tastatură. Acoperă și accesibilitatea (§16 PS-HELP).

### T2 — Comenzi lipsă din meniuri (P1–P2, ~60 goluri, Anexa A)
Grupate pe fișier: Documents (Move to Trash, Ungroup, Set/Clear Titles), Format (Small Caps,
linii orizontale, Word Joiner), Navigate (Jump to Selection, Reveal), Insert (media timestamp).
Fiecare = tuple în `src/App.jsx` + handler existent sau nou + intrare în meniul potrivit.

### T3 — Comportamente și aspect (P2, ~123 goluri, Anexa B)
Sub-tranșe: (a) Behaviors corkboard/binder (dbl-click fundal, Alt-drag duplică, drop-as-child);
(b) containere-ca-foldere + text folder în Scrivenings; (c) margini editor + Scrivenings styles;
(d) Corrections (smart quotes/dashes, autoReplacements); (e) separatoare Merge/Append/Scratchpad;
(f) teme export/import; (g) backup panou complet + dir per proiect.

### T4 — Organizare & proiecte (P2, cap. 5–7)
Copy To Project (dialog de alegere proiect + copyItems), adaptive naming (titleOf cu fallback),
„Updated Documents" (colecție dinamică), filtre folder-sync + Trashed + prefix numeric,
shared templates folder.

### T5 — Compile & export (P2–P3, Anexa D)
Preseturi „outline" la compile; variante LaTeX (memoir/report…); MMD OpenOffice indexing;
CriticMarkup (P3, ultimul în tranșă); Vellum (evaluat — export intermediar, nu achiziție).

### T6 — Stiluri & 3.x rămase (P2–P3, Anexa E)
Set Styles Defaults la proiecte noi; MMD→RTF; Reset List Indents; italic→underline transform;
merge-separator settings; link-behavior options.

### T7 — macOS parity (faza 2 a auditului + implementare diferențe)
Inventar Anexa A Mac + Stock Window Layouts → matrice diferențe → shortcut-uri alternative
(fără AltGr — principiul existent) + layout-uri salvate (parțial există).

### T8 — Workflow-urile (capcana §4 a misiunii)
După T1–T6: parcurgerea celor 16 fluxuri din `workflows.md` pas cu pas; orice etapă blocantă
deschide intrare nouă. Abia apoi FINAL ANTI-OMISSION REVIEW.

## Reguli de execuție

- Fiecare tranșă = branch propriu (`impl/t1-focus-nav` etc.) + PR cu referință la ID-urile S3-*.
- Starea din registrul sursă se actualizează la merge (MISSING→COMPLETE cu dovada nouă).
- Fără refolosirea abuzivă a „EQUIVALENT": fiecare închidere se verifică pe comportament, nu pe nume.
- Testele e2e noi merg în `tests/e2e/`, unit în `tests/` — suita rămâne verde la fiecare PR.
