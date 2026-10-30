# Audit de paritate Scrivener 3 — capitolele 10, 12, 18, 20, 24

Data: 2026-10-30. Continuarea metodei din `SCRIVENER-SEARCH-EVIDENCE.md` (audit pe manualul
oficial inclus în instalare, nu pe inventarul auto-intreținut). Capitole acoperite:
**10 Organising Your Work** (PDF 186–221), **12 Project Navigation** (244–270),
**18 Annotations and Footnotes** (390–412), **20 Writing Tools** (444–452),
**24 The Compile Format Designer** (485–545).

Metoda și adâncimea: extragerea textului capitolului din PDF, scanare pe arii de
funcționalități, apoi verificare în cod (`src/`, `lib/`) prin căutare țintită pe
identificatori + confirmarea ariilor mari prin fișiere concrete. Nu e o diferență linie cu
linie; ariile marcate „cod" au fost confirmate prin implementare reală, cele marcate „gol"
au fost confirmate prin absența oricărui identificator relevant.

## Rezumat pe capitole

| Capitol | Arii verificate | Stare |
|---|---|---|
| 10 Organising | linkuri interne/wiki (19 fiș.), **included text**/transclud (8), colecții (gata din etapa Quick Search), bookmark-uri de proiect+document (17), metadate + custom metadata, keywords, sinopsis cu imagini (7) | **acoperit** (cod) |
| 12 Navigation | Go To, split-uri, Quick Reference, hoisting (Focus), „doar compilabile" | acoperit, **minus Saved Layouts** (gol) |
| 18 Annotations | adnotări inline, note legate, comentarii/subsol, culori revizii, highlight, Text Colour | acoperit (cod), **minus Strip/Convert notații** (gol) |
| 20 Writing tools | ținte + statistici + istoric, auto-completion (9), generator de nume (`NameGeneratorDialog`), bibliografie (Zotero), Dialogue Focus | acoperit, **minus Dialogue Focus** (gol) |
| 24 Compile designer | section types + section layouts, separators, transformări, CSS, page setup, antet/subsol, front/back matter, copertă, Kindle (advancedExport), Pandoc/MMD/LaTeX, replacements pe format | acoperit, **minus Project-level Replacements** (gol) |

## Goluri noi identificate (backlog, prioritizat)

| Prioritate | Gol | Manual | Notă de implementare |
|---|---|---|---|
| P1 | **Strip out all notation** — comenzi „elimină toate adnotările/comentariile/subsolurile" din selecție/document | §18.4.1, p. ~408 | pur pe HTML (parserul din `src/lib/search.js`): scoate nodurile de comentariu/adnotare/subsol; intră în meniul Document |
| P1 | **Convert notation between types** — inline ↔ legat (adnotare→comentariu, subsol inline→notă legată) | §18.4.5 | conversie pe structurile existente din editor (tiptap marks/nodes); mai greu decât strip — estimare medie |
| P1 | **Saved Layouts** — salvează/redenumște/șterge/aplică aranjamente de fereastră (panouri, split-uri, inspector) | §12.3, p. 258 | persistă în `ui` state (deja există saveUi/loadUi); dialog mic în meniul Window |
| P2 | **Project-level Replacements** — înlocuiri la nivel de proiect, aplicate la Compile indiferent de format, cu ordine | §23.4.4, p. ~500 | `project.replacements` în project.json + aplicare în `lib/compile.cjs` înainte de cele pe format |
| P2 | **Document Templates** — folder special de șabloane de document; „Document nou din șablon"; șablon implicit pe subdocumente | §7.5, p. ~120 | există deja șabloane de proiect (`templates.cjs`) — se adaugă tipul de folder + fluxul de instanțiere |
| P3 | **Dialogue Focus** — evidențiază doar dialogurile pentru verificare (liniile cu ghilimele) | §20.3.2, p. ~446 | vizualizare în editor sau panou: filtrează paragrafele cu ghilimele românești „"; util corecturii |
| P3 | **Custom icons** — iconițe personalizate pe item-uri de binder, import/ gestionare | §7.4, p. ~110 | `node.icon` + gallery în Setări; cosmetic |

## Ce NU a fost auditat încă (rămâne pentru turele următoare)

Capitolele 8 (editor & views — split/copyholder detaliat), 9 (import & linked research),
13 (Inspector — tab cu tab), 15 (writing & editing — imagini inline, ruler, preserve
formatting), 16 (composition/page view — parțial confirmat prin cod), 17 (stylesheets —
confirmat parțial), 19 (scriptwriting), 21–23 (markdown & compile overview), 25–26 (export
& printing). Inventarul susține acoperirea lor; auditul pe manual rămâne de făcut cu aceeași
metodă.

> Concluzie de metodă, re-confirmată: inventarul `FEATURES-SCRIVENER3.md` nu a prins Quick
> Search și nu prinde nici golurile de mai sus — auditul pe manual rămâne sursa adevărului.
