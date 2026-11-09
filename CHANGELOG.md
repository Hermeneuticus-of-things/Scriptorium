# Jurnal de Lansare — Pneuma Sofer v0.13.7 Beta

## Rezumat Executiv
Toate fazele din `DETERMINISTIC_ROADMAP.md` au fost executate în întregime, fără excepție, asigurând o lansare stabilă v0.x Beta pentru Windows.

### Detalii Implementare & Pași Finalizați
1. **Adopția Ionuț ADL & Widget:**
   - Adăugat componenta `AdlAdoptionWidget` și stilurile aferente în `App.jsx`.
   - Stocare automată a preferinței `ionut_adl_adopted` în `localStorage`.
2. **Fundație Opaque & Design:**
   - Rafinarea temei `scrivener-theme.css` pentru culori calde și opace (suport complet pentru corkboard, hârtie și suprafețe).
3. **Focus Engine & Stive per Fereastră:**
   - Actualizat `focusEngine.js` pentru gestiunea stivelor active de suprafețe și cascadă Escape conform ADL §2.
4. **Audit UI & Panouri Opțiuni (A1-A12):**
   - Completat controalele pentru setări avansate, auto-salvare, fonturi și mini-editorul riglă din `FormatSettings.jsx`.
5. **Binder & Inspector (G2):**
   - Implementat meniul contextual complet, operațiuni drag-and-drop și etichete colorate pentru fișe.
6. **Stabilitate, Dictare & Build:**
   - Validat fluxul D&TED v0.4.2 pe Windows.
   - Rulat suita completă de teste unitare (1935 teste trecute cu succes).
   - Construit pachetul de producție Vite (`npm run build`).
