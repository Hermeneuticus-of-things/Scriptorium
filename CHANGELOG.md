# Jurnal de lansare — Pneuma Sofer

## 1.1.0 — 10 noiembrie 2026

- Fundație Ionuț ADL, focus modal sigur și revenire la selecția editorului; fără prompt ADL la pornire.
- Meniuri Binder contextuale, Proprietăți/Organizare/Arbore grupate și duplicare unificată cu payload.
- Selector unic rapid pentru spațiere; comenzi imposibile ascunse și identificatori comuni.
- Protecție Salvează/Renunță/Anulează la închidere și reload, splash/skeleton și hint-uri ghidate.
- Servicii neconfigurate ascunse; activare explicită pentru endpointuri gratuite; AI opțional fără spațiu inutil în toolbar.
- Redenumire corectă în colecții, citire concurentă limitată a notelor și cleanup pentru listenerul vocilor.
- E2E și FLOWS executate separat; 1.988 teste unitare trecute, trei sărite declarate.
- Matrice extinsă cu 5.515 cazuri pregătite, nu raportate drept audit integral executat. Detalii: [verificarea 1.1.0](docs/RELEASE-1.1.0-VERIFICATION.md).

---

## Jurnal de Lansare — Pneuma Sofer v1.0.0 Stable (General Availability)

## Rezumat Executiv
Pneuma Sofer trece de la stadiul de Beta (`0.13.x`) la **v1.0.0 Stable (General Availability)**, cu toate fazele din `DETERMINISTIC_ROADMAP.md` executate, validate și instalate pe Windows.

### Detalii Implementare & Pași Finalizați
1. **Adopția Ionuț ADL & Widget:**
   - Componenta `AdlAdoptionWidget` integrată în `App.jsx` + stocare preferință `ionut_adl_adopted` în `localStorage`.
   - Stilurile aferente în `AdlAdoptionWidget.css`.
2. **Fundație Opaque & Design:**
   - `scrivener-theme.css` refactorizată pentru warm opaque foundations (corkboard, hârtie, suprafețe).
3. **Focus Engine & Stive per Fereastră (ADL §2):**
   - `focusEngine.js` actualizat pentru stive active per fereastră, comutare suprafețe și cascadă Escape.
4. **Audit UI & Panouri Opțiuni (A1-A12):**
   - Setări avansate, auto-salvare, fonturi, mini-editor riglă în `FormatSettings.jsx`.
5. **Binder & Inspector (G2):**
   - Meniu contextual complet, drag-and-drop fișe, etichete colorate.
6. **Stabilitate, Dictare & Build:**
   - Flux D&TED v0.4.2 validat pe Windows.
   - Suitea completă de teste unitare: 1935 teste trecute cu succes (`npm test`).
   - Vite production bundle: build trecut cu succes.
   - Executabil portabil: `release\PneumaSofer-1.0.0-portabil.exe` (~107 MB).
   - Instalator: `release\PneumaSofer-Setup-1.0.0.exe` (Inno Setup 6).
   - **Instalat pe laptop:** `C:\Users\Ionut\AppData\Local\Programs\Pneuma Sofer\Pneuma Sofer.exe` → `ProductVersion: 1.0.0.0`.
   - Toate etichetele "Beta" eliminate din `package.json` (versiune `1.0.0`), interfață și documentație.
