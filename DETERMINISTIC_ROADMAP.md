# Pneuma Sofer — Roadmap Deterministic v1.0.0 (Release Stable / General Availability)

Acest roadmap conține pașii atomici pentru trecerea definitivă a aplicației **Pneuma Sofer** de la stadiul de Beta (`v0.13.x`) la **v1.0.0 Stable (General Availability)**, conform standardelor Ionuț ADL și auditului complet de producție.

## Faza 1: Consolidarea Core & Stabilității Arhitecturale (v0.99.0)
1. [x] **Adopție ADL & Widget:** Widget Yes/No integrat în `App.jsx` + stocare persistentă în `localStorage`.
2. [x] **Fundația Opaque & Teme:** Rafinarea `scrivener-theme.css` pentru warm opaque foundations.
3. [x] **Focus Engine (§2 ADL):** Stive active per fereastră, comutare de suprafețe și scurgere de evenimente Escape.
4. [x] **Mecanismul de Sincronizare & Cache:** Robustțe extinsă pe IPC în `electron/main.cjs` și securizarea cheilor API prin `safeStorage`.

## Faza 2: Optimizarea Performanței & Bundle Production (v0.99.5)
5. [x] **Code Splitting & Chunks:** Reducerea avertismentelor de dimensiune chunk prin optimizări în Vite (`rollupOptions.output.manualChunks`).
6. [x] **Audit Complet de Teste:** Execuția și trecerea cu succes a suitei de teste unitare (1935+ teste trecute).
7. [x] **Validare D&TED v0.4.2 & Dictare:** Verificare pe Windows (NVIDIA, F9/F8) a dictării locale și transcrierii audio.

## Faza 3: Pregătirea Lansării Oficiale v1.0.0 Stable (GA)
8. [ ] **Eliminarea etichetelor Beta:** Actualizarea versiunii din `package.json`, `main.cjs` și interfața About/Header la `1.0.0` (eliminarea oricăror mențiuni de "Beta").
9. [ ] **Semnarea Codului (Code Signing) & Inno Setup:** Generarea scriptului final de instalare `PneumaSofer-Setup-1.0.0.exe` cu certificare nativă pe Windows.
10. [ ] **Documentația Finală & Jurnalul v1.0.0:** Actualizarea completă a `CHANGELOG.md`, `FEATURES.md` și ghidului de utilizare pentru versiunea stabilă de producție.

---
*Status curent: Executare Faza 3 — Trecerea la v1.0.0 Stable (GA).*
