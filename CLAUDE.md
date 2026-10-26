# Pneuma Sofer — proiect

> Parent: [`../../CLAUDE.md`](../../CLAUDE.md)

Tip: aplicație desktop (Electron + React + TipTap). Program de scris tip Scrivener + import .scriv + Compile DOCX/PDF/EPUB + asistent Claude.

## Hartă
- `electron/main.cjs` IPC, dialoguri, setări (cheia API criptată cu safeStorage), export PDF
- `electron/preload.cjs` `window.api`
- `lib/store.cjs` format proiect `.scribner`
- `lib/rtf.cjs` RTF → HTML; `lib/scrivImport.cjs` import `.scriv`
- `lib/compile.cjs` HTML/DOCX/EPUB; `lib/ai.cjs` Claude (`claude-opus-5-5`)
- `src/` UI React; `src/lib/mockApi.js` mod browser fără Electron
- `tests/` vitest (`npm test`)

## Reguli
- Implementare proprie, fără cod sau resurse din Scrivener.
- Tot accesul la disc și la API trece prin procesul main; renderer-ul nu are Node.
- În textele pentru utilizator (interfață, ajutor, README, imagini) nu se dau nume de alte programe de scris și nici comparații cu ele; formatul de fișier `.scriv` și comanda de import rămân numite funcțional.
