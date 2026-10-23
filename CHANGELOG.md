# CHANGELOG — Scriptorium

## 2026-10-23 — v0.1.0 — Program de scris tip Scrivener + extensii

### Cerința user
> "vreau să-l faci un program asemănător [cu Scrivener] dar să mai adaug lucruri la el"
Alegeri: Electron + React; Baza Scrivener, Import .scriv, Export DOCX/PDF/EPUB, Asistent AI.

### Decizii
- Implementare proprie de la zero (clean-room), fără cod decompilat din Scrivener.
- Format proiect: folder `<Nume>.scriptorium/` cu `project.json` + `docs/*.html` + `notes/*.html` + `snapshots/`.
- Import `.scriv` (Scrivener 3): parsare `.scrivx` + RTF → HTML.
- AI: Anthropic SDK în procesul main, model `claude-opus-5-5`, cheie API din setări locale.
- Build portabil Windows: electron-builder target `portable`.

### Fișiere vizate
`electron/`, `lib/`, `src/`, `tests/`, `package.json`, `vite.config.js`

### Rezultat (v0.1.0)
- Aplicație completă: binder (drag & drop, căutare), editor TipTap, corkboard, outline, inspector (sinopsis, etichetă, status, țintă, note, snapshot-uri), mod compunere, teme (luminos/întunecat/sepia), ținte carte/sesiune/document.
- Import Scrivener 3 (`lib/scrivImport.cjs`, `lib/rtf.cjs`).
- Compile DOCX/EPUB/HTML (`lib/compile.cjs`) + PDF A5 prin Electron.
- Asistent AI (`lib/ai.cjs`): corectură, sinopsis, continuare, critică, consistență, întrebări.
- Teste: 11/11 vitest; UI verificat în Chromium (mod browser), fără erori în consolă.
- Neverificat aici: rularea efectivă în Electron (binarul nu se poate descărca în containerul cloud) și apelul real la API (fără cheie).

## 2026-10-23 — ROADMAP.md
Roadmap extins cu funcțiile Scrivener 3 (12 secțiuni, P1/P2/P3) și ordinea v0.2 / v0.3 / v1.0.

## 2026-10-23 — v0.2.0 — Roadmap v0.2 (scris zilnic)

### Cerința user
> "rămânem pe Electron + React, începe cu roadmap"

### Decizii
- Ordinea din ROADMAP.md, secțiunea v0.2.
- Comentarii și note de subsol ca mark-uri TipTap în HTML-ul documentului (`<span data-comment>` / `<span data-footnote>`), fără fișiere separate.
- Writing History în `history.json` din proiect (primul și ultimul număr de cuvinte pe zi).
- Backup = zip al folderului proiectului în `<proiect>.backups/` lângă proiect (sau folder ales), păstrează ultimele N.
- Import DOCX cu `mammoth`, diff snapshot cu `diff`, ghilimele românești cu `@tiptap/extension-typography`.

### Fișiere vizate
`lib/backup.cjs`, `lib/history.cjs`, `lib/templates.cjs`, `lib/docxImport.cjs`, `lib/compile.cjs`, `lib/store.cjs`, `electron/*`, `src/**`, `tests/*`

### Rezultat (v0.2.0)
- Funcțiile v0.2 (binder multi-selecție, Scrivenings, split editor, comentarii, note de subsol, ghilimele „”, Split/Merge, Find & Replace în proiect, Writing History, backup, import DOCX/TXT/MD, șabloane, panouri redimensionabile).
- Import Scrivener fără pierderi: `lib/rtf.cjs` rescris (aliniere, culori, highlight, super/subscript, liste, tabele, imagini, comentarii și note legate/inline, adnotări, Scrivener Links, stiluri), `lib/scrivImport.cjs` rescris (keywords, metadate personalizate, section types, ținte, colecții, bookmarks, snapshot-uri, writing.history, note de proiect, media, Scrivener 1/2, copie completă în `scrivener-original/`), raport de import, vizualizare media, metadate în Inspector.
- I-REP / I-EDIT după `karma-book-engine`: `src/lib/editorial.js` (reguli R0–R11, ALOGEN, DOOM III, bucle micro/mezzo/macro, reattach), `src/components/EditorialPanel.jsx`, profil editorial în Setări.
- `FEATURES-SCRIVENER3.md` (inventar complet) și `ROADMAP.md` extins.
- Teste: 44/44. UI verificat în Chromium cu simulator de AI.
