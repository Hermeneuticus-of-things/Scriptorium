# Registrul consolidat al auditului Scrivener 3 ↔ Pneuma Sofer

Data: 2026-11-21. Referință: Scrivener 3.1.6 (manualele oficiale Windows — 774 pag. — și
macOS — 919 pag.). **799 intrări individuale verificate**, cu dovezi (file:line sau căutare
documentată). ID-urile sunt stabile; tabelele detaliate stau în fișierele-sursă de mai jos —
registrul de față este indexul consolidat + totalurile + deduplicarea.

## Sursele registrului (reconcilierea A–N)

| Sursă | Document | Intrări |
|---|---|---|
| Cap. 1–7 + 14 (interfață, proiecte, binder, fișiere, cloud) | `scrivener-ch01-ch07-ch14.md` | 87 |
| Anexa A — meniuri și shortcut-uri (fiecare comandă) | `scrivener-appendix-a-menus.md` | 375 |
| Anexa B — Options (fiecare setare) + Anexa C — Project Settings | `scrivener-appendix-b-c-settings.md` | 255 |
| Anexa D — Compile Formats + E — What's New 3.0–3.1.6 + F — Extras Pack | `scrivener-appendix-d-e-f.md` | 82 |
| Cap. 8–13, 15–26 (moștenire, 2026-10-30) | `../PARITY-AUDIT-*.md`, `../SCRIVENER-SEARCH-EVIDENCE.md` | acoperite acolo; ID-urile S3-* de mai sus trimit și la ele |
| Workflow-uri (K) | `workflows.md` | schelet — se completează la implementare |
| Platformă macOS (M) | sursele `sources/MAC-*.txt` | faza 2 — vezi „Rămase" |

## Totaluri pe stări (cele 799 intrări S3-*)

| Stare | Intrări | Observație |
|---|---|---|
| COMPLETE | 258 | implementat, accesibil, cu dovadă |
| EQUIVALENT | 49 | acoperit prin alt mecanism, verificat |
| SUPERIOR | 15 | Pneuma depășește Scrivener pe funcția respectivă |
| PARTIAL | 81 | implementare incompletă — intră în plan |
| MISSING | 279 | absent — intră în plan |
| NOT_APPLICABLE | 46 | legat de realitatea de produs Scrivener (iOS sync, trial etc.), motivat |
| UNVERIFIED | 0 | ambele reverificate la T8-ecran (22.11): Reveal Draft → COMPLETE (T2); scrub multi-doc → LIVRAT |

## Stare după tranșele implementate (22.11.2026)

T1 (PR #106) + T2/T3 (#110, main) + T4/T5/T6 (main, direct): au închis ~90 de goluri
MISSING/PARTIAL din registru — navigarea din tastatură (31), comenzile de meniu (11+),
comportamentele/aspectul eșantion, Copy To Project, adaptive naming, filtre sync,
preseturile Schiță/LaTeX + CriticMarkup + italic→underline, Reset List Indents.
T7 macOS: EXCLUS la decizia autorului (22.11). Stările din tabelele-sursă se actualizează
la fiecare tranșă; contorul de MISSING coboară corespunzător.

## Top-ul lacunelor (detaliile complete în fișierele-sursă)

1. **Navigare din tastatură** (Anexa A, Navigate ▸ Move Focus: 31 MISSING) — panouri/focus
   de la tastatură, nearhitectate intenționat până acum.
2. **Options-Behaviors + Appearance** (B: 123 MISSING) — comportamente fine (double-click
   fundal corkboard, containere-ca-foldere, margini editor, teme export/import).
3. **Compile formats** (D: 12 MISSING) — Vellum, LaTeX variante, CriticMarkup, outline formats.
4. **Copy To Project** + filtre folder-sync + adaptive naming (cap. 5–7, P2).
5. **Release-notes 3.x** (E: 8 MISSING) — default styles pt. proiecte noi, MMD→RTF, Reset List Indents.

## Rămase (faza următoare a auditului)

- **macOS separat**: Anexa A Mac (p. 707–777, extras în `sources/MAC-A-menus.txt`) +
  Anexa E Mac (Stock Window Layouts) — inventar separat de comenzi/shortcut-uri/layout-uri
  și matricea diferențelor Win/Mac; Pneuma e cross-platform prin Electron, deci diferențele
  se rezolvă mai ales la shortcut-uri și meniuri native.
- **Workflow-urile** (`workflows.md`): 16 fluxuri definite, se bifează etapă cu etapă pe
  măsură ce golurile P1/P2 se închid.
- **FINAL ANTI-OMISSION REVIEW**: se execută după faza macOS + workflows (a doua trecere
  independentă, cerută de misiune) — nu înainte.
