# Raportul de verificare (dovezi per stare)

Data: 2026-11-21. Regula: fiecare stare non-UNVERIFIED are dovadă — `fișier:linie` pentru
existență sau lista căutărilor fără rezultat pentru absență. Acest raport descrie METODA
de verificare și unde se găsesc dovezile; dovezile în sine stau în fișierele-sursă.

## Metoda

1. **Extragerea surselor**: textul capitolelor/anexelor extras din PDF-ul oficial
   (pdftotext -layout, paginile din `sources.md`); inventarul se construiește DIN TEXTUL
   extras, nu din memorie (regula misiunii §2).
2. **Verificarea în cod**: pentru fiecare element — căutare țintită pe identificatori
   (grep în src/, lib/, electron/), apoi citirea implementării pentru ariile mari.
   Complete/EQUIVALENT/SUPERIOR pretind `file:line` concret; MISSING pretinde căutarea
   negativă scrisă (ce șabloane s-au căutat).
3. **Dedup cu moștenirea**: PARITY-AUDIT-* (ch. 8–13, 15–26) nu se re-auditează; noile
   intrări trimit la ele și le verifică doar unde anexele aduc detaliu nou.
4. **Calibrarea aserțiunilor**: niciun BROKEN/UNINTEGRATED fără dovadă pozitivă de defect
   (nu se inventează); incertitudinea rămâne UNVERIFIED.

## Unde sunt dovezile

| Document | Tipuri de dovadă folosite |
|---|---|
| `scrivener-ch01-ch07-ch14.md` | file:line (App.jsx, tree.js, folderSync.cjs, backup.cjs, projectWatch.cjs…); căutări negative documentate per rând |
| `scrivener-appendix-a-menus.md` | file:line pe commandList (App.jsx), menuLayout.js, editorMenus.js, commands.js DEFAULT_KEYS, electron/main.cjs |
| `scrivener-appendix-b-c-settings.md` | file:line pe settingsDefaults.js, SettingsDialog.jsx, ProjectSettingsDialog, lib/backup.cjs, folderSync.cjs; rularea modulului de preseturi compile |
| `scrivener-appendix-d-e-f.md` | rularea efectivă a `lib/compileFormats.cjs` (18 preseturi verificate viu), file:line pe exporteri, HistoryDialog, snapshotSearch.cjs |
| `scrivener-appendix-mac-delta.md` | (în lucru) delta pe baza auditului Windows + sursele MAC-*.txt |

## Verificări automate care susțin registrul

- `tests/` — 2195+ teste la data acestei tranșe; fiecare PR de implementare (T1+)
  actualizează starea din registru doar împreună cu teste noi.
- Help: `tests/helpArticles.test.js` refuză articole cu comenzi inexistente (regula
  „zero explicații inventate", aplicată automat).

## Limitele verificării (declarat)

- **E2E pe Electron** nu a fost rulat în această tură (doar unit + build); afirmațiile
  de comportament se bazează pe citirea codului + teste existente.
- **2 UNVERIFIED** rămân până la T8 (reverificare pe build viu).
- Auditul macOS e delta (comenzile comune sunt verificate prin auditul Windows).
