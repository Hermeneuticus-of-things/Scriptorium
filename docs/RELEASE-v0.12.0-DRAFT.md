# Pregătire release v0.12.0 — „Pneuma Sofer" (draft)

Data: 2026-10-30. Bază: `feat/quick-search` vs release-ul publicat v0.11.0 (2026-10-26).
Destinație: versiunea nouă a aplicației, după integrarea completă a valului de agenți.

## Coerență repo (găsită + rezolvată în curs)

- `package.json` spunea **0.8.3**, deși pe GitHub release-ul publicat e **v0.11.0 „Pneuma Sofer"** → la release, bump la **0.12.0** + intrare în CHANGELOG.
- Numele de produs era încă „Scribner" (`package.name`, `build.productName`, README, i18n) → ramura `feat/rename-pneuma-sofer` (în lucru) îl înlocuiește peste tot cu **Pneuma Sofer**; mențiunile despre aplicația de referință Scrivener și formatul `.scriv` rămân, corect.
- `Scriptorium/` (792 MB artefacte de build) era neurmărit în rădăcină → adăugat în `.gitignore`.
- `docs/ARCHITECTURE.md` + `docs/REQUIREMENTS.md` (decizii acceptate: Pneuma Sofer + motorul D&TED) → intrate în repo.
- TODO.md reconciliat: itemii din sesiunile vechi, de mult implementați, sunt bifați cu dovedă din inventar.
- `main` local rămâne divergent (320 înapoi / 118 înainte) — **decizie de integrare rămâne la autor** înainte de orice merge către `main`/release.

## Ce intră în v0.12.0 (pe `feat/quick-search`, măsurat la 2026-10-30)

### Căutare — capitolul 11 complet (paritate cu manualul oficial)
- **Quick Search** (§11.5): omnibox Ctrl+O, secțiuni Titluri/Sinopse/Text, handoff la căutarea completă.
- **Project Search**: operatori Starts/Ends with, Invert Results, sortare (binder/titlu/dată), termeni speciali (ghilimele, `-excludere`, wildcard `*`), sintaxă de date `mdate:`/`cdate:`, scope Draft/selecție/Included-Excluded.
- **Colecția persistentă „Rezultatele căutării"** (§11.1.1): nu poate fi ștearsă, păstrează ultima căutare, comanda Navigare sare pe ea.
- **Project Replace**: metadate personalizate, buton Swap, pas pe snapshot-uri (active odată cu API-ul de scriere).
- **Find by Formatting** extins: format caracter, linkuri, imagini (§11.6).
- **Quick Search polish**: Shift/Alt+click (Quick Reference / split), derulare la prima apariție.
- **Filter corkboard/outline** (§11.4): bară Ctrl+F, listă plată, metafilă etichetă/stare.

### Organizare & editor
- **Dialogue Focus** (§20.3.2): panou cu replicile din proiect pentru corectură.
- **Eliminare & conversie notații** (§18.4.1/§18.4.5): strip pe document/proiect cu snapshot, conversii inline↔legat.
- **Aranjamente salvate** (§12.3): salvare/aplicare/redenumire/ștergere, la nivel de aplicație.
- **Șabloane de document** (§7.5): folder de șabloane + „Document nou din șablon".

### Compile
- **Înlocuiri la nivel de proiect** (§23.4.4): aplicate înaintea celor pe format, cu ordine și enable/disable, editor în fila „Înlocuiri".

### Infra
- API de scriere snapshot-uri (`updateSnapshotHtml`) — G13.
- Redenumire completă Scribner → **Pneuma Sofer** (inclusiv `PneumaSofer-Setup-<v>.exe` / `-portabil.exe`).
- Teste: **936 trecute / 0 eșuate** la ultimul număr (crește cu integrările); build de producție verde la fiecare pas.

## Pași de release (după integrarea finală — se execută doar cu anunț către autor)

1. Merge `feat/quick-search` → `main` (după decizia autorului pe divergența `main`-ului local).
2. Bump `package.json` → **0.12.0** + intrare în CHANGELOG („Pneuma Sofer v0.12.0: căutarea completă ca în Scrivener 3 + organizare").
3. `npm run dist:win` + `npm run dist:win:setup` → build corect și refăcut (portabil + installer wizard).
4. SHA256SUMS; anunț către autor; **push/tag doar cu acordul autorului** (decizia userului: „mă anunți și atunci facem push la versiunile noi").
5. După installer: migrarea configurațiilor MCP (Claude Code + Claude Desktop) de pe serverul din worktree pe Pneuma Sofer.exe instalat (vezi memorie `pneuma-mcp-claude-desktop`).

## Rămas deschis (după v0.12.0)

- Custom icons (§7.4) — P3 cosmetic.
- Audit pe capitolele rămâne din manual: 8, 9, 13, 15, 16, 17, 19, 21–23, 25–26 (metoda din `PARITY-AUDIT-NEXT-CHAPTERS.md`).
- Depinde de autor: §8 din ROADMAP (proiect Karma real, chei reale servicii, pachet de limbă română Windows, proba MCP pe Windows).
