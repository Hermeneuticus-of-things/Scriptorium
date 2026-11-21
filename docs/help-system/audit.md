# Auditul sistemului Help existent (PS-HELP-001, REGULA ZERO)

Data: 2026-11-21. Metodă: examinarea completă a repo-ului cu dovezi `file:line`.
Concluzia de arhitectură: **există un nucleu solid care se reutilizhează** — nu se construiește
paralel, se extinde.

## Ce există deja (de reutilizat)

| Componentă | Unde | Stare |
|---|---|---|
| Fereastră Help (modal, TOC, istoric Alt+←/→, căutare Ctrl+F, subliniere rezultate) | `src/components/HelpWindow.jsx` (278 linii) | funcțională |
| Manual română — 23 capitole, conținut HTML în date JS | `src/help/manual.ro.js` (978 linii) | complet |
| Manual engleză | `src/help/manual.en.js` (377 linii) | **parțial** — de completat |
| Căutare full-text în manual, cu scor (titlu=10p + frecvență) | `src/help/helpSearch.js` (`buildIndex`, `searchManual`, `fold` cu diacritice) | funcțională |
| Maparea context → subiect de help (23 zone) | `src/help/helpSearch.js` `CONTEXT_TOPICS` + `helpContext()` (App.jsx:3177) | funcțională |
| Comenzi Help: manual/contextual/shortcuts/placeholders/syntax/tutorial | `App.jsx:3531–3540`, **F1** (`commands.js:83`) | funcționale |
| Tutorial interactiv = proiect real generat | `lib/tutorialProject.cjs` + Home „Tutorial" | funcțional |
| Tabele generate: shortcut-uri, placeholder-e, sintaxă MMD/Fountain | `src/help/reference.js` (`shortcutRows` din `DEFAULT_KEYS`, `PLACEHOLDERS`, `SYNTAX`) | funcționale |
| Scurtături configurabile + conflicte + disable | `src/lib/commands.js` (DEFAULT_KEYS ~45, `shortcutFor`, `conflicts`) + `ShortcutsDialog.jsx` | funcționale |
| Registrul de comenzi | tuples `['group','id',label,action]` în `App.jsx:3382+` — **210 comenzi** | doar etichete, fără descrieri |
| Raportare probleme + toasts de eroare | `ReportProblemDialog.jsx`, `report()` → toast `role="alert"` | mesaje tehnice, necurate |
| Accesibilitate de bază | 349 aria-label / 80 fișiere; `DialogA11y`; focusEngine multi-fereastră | bună bază |

## Golurile (ce lipsea înainte de acest PR)

1. **Fuzzy matching** — inexistente (doar substring după folding) → **închis**: `src/lib/help/search.js`.
2. **Command Finder** — inexistent → **închis**: `HelpFinderDialog.jsx` (Ctrl+Shift+H).
3. **Descrieri pe comenzi** — 210 comenzi au doar etichete → parțial închis prin Command Finder
   (grupul + tasta vizibile); descrierile proprii = etapa 4.
4. **Onboarding / tour / coach marks** — nimic (grep: onboarding/tour/firstRun = 0) → etapa 5.
5. **Empty states** — ad-hoc (`<p className="muted">`), fără componentă partajată → etapa 4.
6. **What's New** — CHANGELOG.md nu e expus în UI; UpdateDialog arată note doar la update → etapa 5.
7. **Manual EN** — ~1/3 din RO → de completat la conținut.
8. **Tooltips** — 222 `title=` native, fără sistem → etapele 4–5 (tooltipuri extinse).

## Decizii de arhitectură (pe baza auditului)

- `src/help/helpSearch.js` (manual) și `src/lib/help/search.js` (articole+comenzi) rămân
  separate prin rol, dar Help Finder le uneste la UI; la etapa 4 se unifică indexul.
- F1 = manual (nedesființat); Ctrl+Shift+H = omnibox. Contextual help existent (`helpContext`)
  se leagă la `uiComponentIds` din schema articolelor.
- Nimic AI-extern pentru Help-ul elementar (regula §17) — motorul e pur și offline.
