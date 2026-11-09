# Jurnal de Lansare — Pneuma Sofer v1.0.0 Stable (General Availability)

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
