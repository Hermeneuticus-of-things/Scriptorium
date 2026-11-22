# Sursele auditului

## Primare

1. **Scrivener 3.1.6 Windows — manual oficial** (774 pag.), extras din instalarea locală
   `C:\Program Files\Scrivener3\Resources\Scrivener-Manual.pdf`. Extrase text folosite:
   `sources/1-7.txt` (p. 6–115: cap. 1–7), `sources/14-cloud.txt` (p. 298–319: Cloud &
   Sharing), `sources/A-menus.txt` (p. 602–661: meniuri + shortcut-uri),
   `sources/B-options.txt` (p. 662–712: Options), `sources/C-projset.txt` (p. 713–736:
   Project Settings), `sources/D-formats.txt` (p. 737–749: Compile Formats),
   `sources/E-whatsnew.txt` (p. 750–768: What's New 3.0→3.1.6), `sources/F-extras.txt`
   (p. 769–770: Extras Pack).
2. Manualele oficiale online (verificare încrucișată, unde e nevoie):
   - Windows: https://www.literatureandlatte.com/docs/Scrivener_Manual-Win.pdf
   - macOS: https://www.literatureandlatte.com/docs/Scrivener_Manual-Mac.pdf
   - User Guides: https://www.literatureandlatte.com/learn-and-support/user-guides
   - Release Notes: https://www.literatureandlatte.com/scrivener/release-notes
   - Introducing Scrivener 3 (Win/Mac): https://www.literatureandlatte.com/introducing-scrivener-3-for-windows ,
     https://www.literatureandlatte.com/introducing-scrivener-3

## Moștenite (audituri anterioare pe capitolele 8–13, 15–26)

- `docs/SCRIVENER-SEARCH-EVIDENCE.md` (2026-10-30, cap. 11 — cele 6 unelte de căutare)
- `docs/PARITY-AUDIT-NEXT-CHAPTERS.md` (2026-10-30, cap. 10, 12, 18, 20, 24 + tura a doua)
- `docs/PARITY-AUDIT-ch08-ch15-editor.md`, `-ch09-ch13-gathering-inspector.md`,
  `-ch16-ch17-environments-styles.md`, `-ch19-ch21-ch22-scripting-markdown-toc.md`,
  `-ch23-ch25-ch26-compile-export-print.md` (2026-10-30, agenți paraleli)

## Codul verificat

Repo `D:\OpenCode\scriptorium-git` (branch `audit/scrivener3`, bazat pe `origin/main`
2026-11-21). Structură: `src/` (renderer React), `src/lib/` (logică pură), `lib/`
(proces principal Electron), `electron/` (main/preload/handlere IPC), `tests/`
(vitest, 2122+ teste la data auditului).

## Regula dovezilor

Fiecare stare non-UNVERIFIED din registru are dovadă: `fișier:linie` pentru existență,
sau lista căutărilor fără rezultat pentru absență. Dovezile externe (pagini de manual)
se citează cu secțiunea și pagina PDF.
