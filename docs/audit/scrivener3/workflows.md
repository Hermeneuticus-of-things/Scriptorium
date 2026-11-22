# Workflow-uri Scrivener 3 verificate în Pneuma Sofer

Actualizat: 2026-11-21, pe baza inventarelor din acest registru (dovezi în fișierele-sursă).
Regula: un workflow e COMPLETE doar când TOATE etapele au stare COMPLETE/EQUIVALENT cu
dovadă; o etapă blocantă → PARTIAL cu etapa numită.

| ID | Workflow | Stare | Etapa blocantă / dovada |
|---|---|---|---|
| S3-W.01 | Creare proiect din șablon | **COMPLETE** | 17 șabloane pe categorii + categorii proprii (Anexa F; `lib/templates.cjs`) |
| S3-W.02 | Scriere + organizare incrementală | **COMPLETE** | sinopsis/label/status/keywords (ch. 10 audit + B+C) |
| S3-W.03 | Restructurare manuscris | **COMPLETE** | drag-drop binder, split/merge, colecții (ch. 8+15) |
| S3-W.04 | Cercetare + asociere materiale | **COMPLETE** | import web/Opml/Word/Zotero, folder Research, bookmark (ch. 9) |
| S3-W.05 | Revizuire cu snapshot-uri | **COMPLETE** | Snapshot Manager cu căutare + comparare + restore (Anexa E; `snapshotSearch.cjs`) |
| S3-W.06 | Corectură cu comentarii/adnotări/subsoluri | **PARTIAL** | strip/convert notații = gol P1 moștenit (ch. 18 audit); restul acoperit |
| S3-W.07 | Metadate + căutare avansată | **COMPLETE** | Quick Search + operatori + colecții dinamice (ch. 11; SCRIVENER-SEARCH-EVIDENCE) |
| S3-W.08 | Compile cu format personalizat | **COMPLETE** | replacements de proiect LIVRATE (verificat, CompileDialog), Schiță/LaTeX/CriticMarkup LIVRATE (T5) |
| S3-W.09 | Export/print împachetat | **PARTIAL** (mai aproape) | LaTeX memoir/report + CriticMarkup livrate; Vellum = produs plătit terț (NOT_APPLICABLE, export DOCX intermediar); print fișe+outline COMPLETE |
| S3-W.10 | Backup + restaurare + migrare | **COMPLETE** | backup per-minut + zip + restore UI; merge 3-way la schimbări externe = SUPERIOR (ch. 5) |
| S3-W.11 | Sync cloud + partajare | **PARTIAL** (mai aproape) | Trashed Files + prefix numeric LIVRATE (T4); filtrul pe colecții rămâne; iOS = N/A documentat |
| S3-W.12 | Configurare mediu de scriere | **PARTIAL** | composition/teme există (ch. 16); margini editor + stiluri Scrivenings MISSING (T3) |
| S3-W.13 | Scriptwriting cap-coadă | **COMPLETE** | mode + elements + FDX/Fountain (ch. 19; scriptRows în help) |
| S3-W.14 | ToC + publicare | **COMPLETE** | ToC static cu `<$p>` + cuprins în compile (ch. 22, închis 2026-11-07) |
| S3-W.15 | Lucru pe selecții multi-doc | **COMPLETE** | move/merge multiplu + scrub label/status pe selecție mare (Inspector: onPatchMulti, livrat la T8-ecran 22.11) |
| S3-W.16 | Navigare rapidă în proiect mare | **COMPLETE** | quick search, go to, istoric, hoisting (ch. 12) + F6 (T1, PR #106) |

**Bilanț: 10 COMPLETE · 6 PARTIAL** — fiecare etapă blocantă are intrare în planul de
implementare (T3–T6, T8). Capabilitățile combinate (§4) se enumeră la T8, după ce tranșele
T3–T6 închid golurile de componente.

## Regula de mentenanță

La fiecare tranșă merge-uită, rândurile își re-evaluează starea; un workflow poate coborî
dacă o etapă nou descoperită pică (registru deschis, nu doar bifat).
