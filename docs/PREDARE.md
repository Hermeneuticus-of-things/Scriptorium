# Predare: continuarea lucrului într-o sesiune locală (25.10.2026)

## Starea
- `main` = v0.9.9, publicată (installer, portabil, SHA256SUMS), cu actualizare din aplicație.
- PR #22 (`claude/wizardly-pascal-k9npg5`, v0.10.0, draft) conține deja: G2, G5, P1, P5, P10, P11, Q12 și auditurile 3 și 4 din ROADMAP. Teste locale: 1315 unitare, flows, electron, browser — toate trec.
- Ramuri `wip/*` cu lucru început, NEintegrat (fiecare pornit din `claude/wizardly-pascal-k9npg5`):

| Ramură | Pachet (ROADMAP) | Stare |
|---|---|---|
| `wip/p6-corecturi` | P6 corecturi, editare, căutare în document | terminat și testat de agent, de integrat |
| `wip/p2-p3-compile` | P2+P3 designerul de format Compile + setările P10 citite de Compile | neterminat |
| `wip/p4-p7-navigare-cautare` | P4+P7 Navigare/Comportamente/Tastatură, căutare în proiect, căutarea din bara de sus | neterminat (lipsea testul de browser) |
| `wip/p8-antet-quickref` | P8 antetul editorului, Quick Reference | neterminat |
| `wip/p9-corkboard-outliner` | P9 Corkboard și Outliner | neterminat (rula flows) |
| `wip/p12-meniuri-scenariu-import` | P12 meniul binder, tipărire, scenariu, import/export, șabloane | neterminat (lipseau textele ro/en) |
| `wip/q4-scrivenings` | Q4 Scrivenings ca text continuu | neterminat (lipsea testul nou) |
| `wip/q10-confirmari` | Q10 confirmări în aplicație, stări goale | neterminat (lipseau editările din App.jsx) |

## Rămase nepornite
Audit 4: Q1 (.scriv dus-întors), Q2 (siguranța datelor), Q3 (performanță), Q5 (Undo), Q6 (drag and drop), Q7 (memoria pe document/fereastră), Q8 (focus și taste), Q9 (meniul de pe text), Q11 (comenzi și tooltip-uri), Q13, Q14. Audit 5 (comparația vizuală cu programul clasic) e de făcut local.

## Reguli
- Implementare proprie; fără cod sau resurse din programul clasic; în textele pentru utilizator nu se numesc alte programe de scris.
- Texte noi prin `tr()`, chei în `src/lib/i18n-ui.js` în ambele blocuri ro și en.
- API nou în preload: IPC + preload + `src/lib/mockApi.js` + intrare în `tests/mcpFull.test.js`.
- Fără chei API în commit-uri.
- La integrare: pentru conflicte JSX se ia varianta întreagă a unei părți, apoi se refac micile editări; concatenarea doar pentru fișiere aditive (`i18n-ui.js`, CSS). Verifică dublurile de chei în handle-ul din `Editor.jsx`.
- Verificare: `npx vitest run`, `npx vite build`, `npx vite preview --port 4183` + `SCRIBNER_URL=http://localhost:4183/?demo node tests/e2e/browser/<test>.cjs`, `node tests/e2e/flows.e2e.cjs` și `tests/e2e/electron.e2e.cjs` (pe Linux cu `xvfb-run -a`).
