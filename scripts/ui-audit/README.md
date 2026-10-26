# Audit vizual 5 — unelte

Compară Pneuma Sofer, fereastră cu fereastră, cu programul clasic de referință, până la nivel de element,
ordine, text, valoare implicită, stare activ/inactiv, bifă și scurtătură. Observă doar comportamentul
prin stratul de accesibilitate; nu citește codul, imaginile sau resursele programului clasic.

Scara de decizie (conform regulii „calitate prin unelte, nu prin credit"):
1. **Extragere deterministă** — capturi + aplatizare + diff. Niciun model.
2. **Judecată doar pe rezidul ambiguu** — rulată pe serverul local **OmniRoute** (fără credit cloud),
   cu lead pe **Opus 4.7** și lucrători ieftini. Rezultatele se cache-uiesc pe hash de conținut.

## Fluxul
1. `make-test-project.cjs <dir>` — scrie un proiect de test identic în `.scribner` și `.scriv`.
2. Programul clasic: deschis pe proiectul de test. Pneuma Sofer: `pneuma-capture.cjs` (Playwright, profil
   separat, nu atinge setările reale).
3. Captură:
   - clasic: `uia-dump.ps1` (arbore UIA + PNG; `-Menus` pentru bara de meniu la 3 niveluri;
     `-Path`/`-Tabs`/`-Close` pentru dialoguri; `-RightClickBinder`/`-RightClickText` pentru meniuri
     contextuale, prin tasta de meniu, fără mouse; `-InspectorTabs`; `-Context text`). Scurtăturile,
     neexpuse de Qt, se citesc cu `ocr.ps1` (OCR Windows, cu upscale 3×). `run-classic.ps1` rulează
     toate scenele din `scenes.json`.
   - Pneuma Sofer: `pneuma-capture.cjs` scoate meniul nativ și o captură de accesibilitate per scenă.
4. Aplatizare: `flatten.cjs` → o linie per element.
5. Diff determinist: `menu-diff.cjs` (bara de meniu), `element-diff.cjs` (orice fereastră). Potrivire pe
   text normalizat + `aliases.json`. Scoate: lipsă, alt meniu, scurtătură, stare, bifă, valoare, ordine.
6. Judecată: `omniroute-judge.cjs` (un lucrător) și `judge-run.cjs` (lead Opus 4.7 + lucrători).
   Verdicte: `gap` (de adăugat în Pneuma Sofer), `alias` (există sub alt nume → `aliases.json`),
   `skip` (extra proprii Pneuma Sofer — AI, MCP, dictare — sau irelevant). Extrasele Pneuma Sofer nu se scot.

## Desktop 3 și captură de pe desktop inactiv
Capturile se fac prin **PrintWindow** (fereastra se desenează singură în contextul grafic), nu prin
`CopyFromScreen`. Diferența: `CopyFromScreen` ia doar pixelii vizibili de pe **desktopul activ**, deci
pică dacă fereastra e acoperită (alt proiect, un panou always-on-top) sau pe alt desktop virtual —
exact cazul în care „captura nu apărea" / apărea conținut greșit. PrintWindow merge și când fereastra e
acoperită **sau pe un desktop virtual inactiv**; UI Automation la fel nu cere fereastra vizibilă.

De aceea ferestrele de captură se țin pe un **desktop dedicat (Desktop 3)**: `place-desktop3.ps1
-Process Scrivener` le mută acolo (modulul `VirtualDesktop`). Meniurile și dialogurile deschise în timpul
capturii apar pe Desktop 3, nu pe ecranul de lucru al utilizatorului, iar captura funcționează cu Desktop
3 inactiv. Captura Pneuma Sofer (Playwright) desenează pagina direct, deci e deja independentă de desktop.

## OCR (scurtături + text UI)
`ocr.ps1` folosește **Tesseract** (local) cu pachetele `ron+eng` (diacritice române + scurtături ASCII),
cu upscale 3× și ieșire TSV (casete per cuvânt). Dacă Tesseract lipsește, cade pe OCR-ul Windows.
Setup o singură dată: `pwsh get-tessdata.ps1` (descarcă modelele „best", ~24 MB, într-un folder al
utilizatorului; modelele nu se urcă în depozit). Reglaj: `OCR_TESSDATA`, `OCR_LANG`, `OCR_PSM`.

## Mediu
- `OMNIROUTE_URL` (implicit `http://127.0.0.1:20128/v1`), `OMNIROUTE_API_KEY`.
- `OMNIROUTE_LEAD` (implicit `aug/opus4.7`), `OMNIROUTE_WORKER` (implicit `auto/best-fast`).
- Cheile se iau din mediu; nu sunt scrise niciodată în fișiere. `cache/` nu se urcă.

## Stare
- Capturat: meniurile clasice (10, nivel 3, + context cu text) și dialogul Opțiuni (43 de pagini);
  meniul Pneuma Sofer. Restul ferestrelor: de recapturat (vezi `scenes.json`).
