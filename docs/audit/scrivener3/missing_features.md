# Raportul lipsurilor (categoriile A–Q din misiune)

Data: 2026-11-21. Sursa: `comparison_registry.md` (799 intrări) + fișierele-sursă.
Detaliile fiecărui element (ID, dovadă, diferență, prioritate) stau în tabelele-sursă;
acesta e indexul pe categoriile cerute de misiune. Golurile P0/P1: **niciunul** — nucleul
scrierii e la paritate sau peste; lacunele sunt P2+.

## A. Funcționalități lipsă (MISSING, 279)
Cluster principal: navigare tastatură (31, Anexa A.6 — **T1 deschisă, PR #106**), opțiuni
Behaviors/Appearance din Options (Anexa B), comenzi mărunte de meniu (~60, **T2**), formate
de compile (12, Anexa D — Vellum, variante LaTeX, CriticMarkup — **T5**), funcții 3.x
rămase (8, Anexa E — **T6**), organizare (Copy To Project, adaptive naming — **T4**).

## B. Comenzi lipsă — Anexa A (`scrivener-appendix-a-menus.md`, 125 MISSING)
## C. Meniuri/submeniuri lipsă — Navigate ▸ Move Focus (acum „Mută focusul", PR #106); View corkboard options parțial.
## D. Shortcut-uri lipsă — odată cu B; tastatura configurabilă există pentru toate.
## E. Configurări lipsă — Anexele B+C (`scrivener-appendix-b-c-settings.md`, 133 MISSING).
## F. Implementate parțial (81 PARTIAL) — header bar editor, media tools, corkboard freeform options, copyholders etc.
## G. Neintegrate (UNINTEGRATED) — 0 identificate în noile inventare; moștenirea nu raporta.
## H. Defecte (BROKEN) — 0 cu dovezi (nu s-au inventat).
## I. Neverificate (2 UNVERIFIED) — marcate în fișierele-sursă, de reverificat la T8.
## J. Echivalente fără acoperire integrală — notate per-rând „Diferență" în tabele.
## K. Peste Scrivener (15 SUPERIOR) — merge 3-way la schimbări externe, audit provenance AI,
   pachet de carte, semnale deterministe, integrare D&TED, backup pe minute.
## L–N. Diferențe platformă/UI/workflow — macOS delta: `scrivener-appendix-mac-delta.md`
   (în lucru); workflow-uri: `workflows.md`.
## O. Persistence — proiecte JSON + snapshot-uri; fără goluri P1.
## P. Export — Anexa D + `scrivener-appendix-d-e-f.md` GOLURI NOI.
## Q. Accesibilitate — T1 (F6/panouri) primul pas; restul cu PS-HELP-001 etapele 4–5.

## Unde se închid (tranșa → categoria)

| Tranche | Categorii atinse |
|---|---|
| T1 (PR #106) | A/B/D/Q parțial — 31 comenzi navigare |
| T2 | A/B/D — ~60 comenzi meniuri |
| T3 | E/F — comportamente + aspect (123) |
| T4 | A/L — organizare și proiecte |
| T5–T6 | A/P — compile, export, 3.x |
| T7 | L — macOS |
| T8 | I/J/N — workflow-uri + reverificări |
