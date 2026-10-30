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
| ~~P3~~ ✅ 2026-10-30 | ~~**Dialogue Focus**~~ — `src/lib/dialogueFocus.js` (pur: paragrafe cu „…”, «…”, "…") + `DialogueFocusDialog.jsx` (panou cu replici pe documente, click deschide documentul) + comanda Unelte „Focalizare pe dialoguri…” | §20.3.2, p. ~446 | făcut |
<<<<<<< ours
| ~~P3~~ ✅ 2026-10-30 | ~~**Custom icons**~~ — existau deja: `node.icon` (emoji, selector în Inspector) + `node.iconColor` + randare în binder (fals negativ de grep în audit; constatat la implementare) | §7.4, p. ~110 | făcut (pre-existent) |
=======
| P3 | **Custom icons** — iconițe personalizate pe item-uri de binder, import/ gestionare | §7.4, p. ~110 | `node.icon` + gallery în Setări; cosmetic |
>>>>>>> theirs

## Tura a doua de audit (2026-10-30): capitolele rămase — COMPLETĂ

Capitolele 8, 9, 13, 15–17, 19, 21–23, 25–26 au fost auditate cu aceeași metodă (text extras
din manualul oficial prin outline-ul PDF, apoi verificare țintită în cod), de 5 agenți paraleli.
Documentele de dovedi, cu tabelele lor complete de arii și goluri:

| Document | Capitole (pagini PDF) |
|---|---|
| `PARITY-AUDIT-ch08-ch15-editor.md` | 8 Editor & Views (118–160), 15 Writing and Editing (322–362) |
| `PARITY-AUDIT-ch09-ch13-gathering-inspector.md` | 9 Gathering Material (161–175), 13 Inspector (269–297) |
| `PARITY-AUDIT-ch16-ch17-environments-styles.md` | 16 Writing Environments (363–370), 17 Styles (371–388) |
| `PARITY-AUDIT-ch19-ch21-ch22-scripting-markdown-toc.md` | 19 Scriptwriting (410–428), 21 MMD & Pandoc (451–473), 22 ToC (474–478) |
| `PARITY-AUDIT-ch23-ch25-ch26-compile-export-print.md` | 23 Compiling (479–519), 25 Exporting (587–592), 26 Printing (593–600) |

### Backlog consolidat de goluri noi (25 goluri, dedup)

P1 (nucleul workflow-ului de scriere):
| Gol | Manual | Sursă |
|---|---|---|
| **Snapshots Manager** — listă pe tot proiectul, căutare nume/text/dată/regex, ștergere în masă, export | §15.8.4, p. 353–356 | ch8+15 |
| **Selectare și navigare după stil** — Select Style Range / Next in Same Style / Select All with Style | §17.4.1, p. 379–380 | ch16+17 |
| **ToC static cu numere de pagină** — „Copy Documents as ToC", evaluarea `<$p>` în corpul documentelor la compile/print | §22.1–22.2, p. 475–477 | ch19+21+22 |
| **Lista de conținut în Compile + filtre include/exclude** — tabelă per item, bulk toggle, moduri Included/Excluded/All | §23.4.1, p. 488–491 | ch23+25+26 |
| **Print Settings: fișe index + outline** — corkboard ca fișe (cutting guides, label color), outline indentat cu sinopse/counts | §26.1.1–26.3, p. 590–592 | ch23+25+26 |

P2:
| Gol | Manual | Sursă |
|---|---|---|
| Copyholders — panou subordonat per split, Alt+drag, istoric propriu | §8.1.5, p. 133–136 | ch8+15 |
| Media viewer avansat — Image Tools, controale PDF, Media Time Stamp | §8.1.3, p. 126–130 | ch8+15 |
| Linked research — fișiere externe ca referințe în binder (fără copiere) + reparare țintă | §9.2, p. 170–172 | ch9+13 |
| Import and Split: nesting ierarhic + split Fountain/FDX pe scene cu sinopsis | §9.1.6, p. 166–169 | ch9+13 |
| Panou Bookmarks în Inspector cu preview + editare URL/redenumire | §13.4, p. 279–283 | ch9+13 |
| Control strip pentru compoziție (text scale, paper position, Go To fără ieșire) | §16.1.3, p. 361 | ch16+17 |
| „Remove all styles" din documentele selectate | §17.3.5, p. 378 | ch16+17 |
| Script Settings: formate de scenariu personalizabile | §19.6, p. 420–427 | ch19+21+22 |
| Selector de elemente script în UI (comanda există, fără apelant UI) | §19.1, p. 412–413 | ch19+21+22 |
| Opțiuni de conținut la compile (text tăiat, spații, hyperlinkuri, scalare imagini, backlinks) | §23.4.3, p. 499–501 | ch23+25+26 |
| Opțiuni compile group & front/back matter (lock pe output, group↔subfoldere pereche) | §23.4.1, p. 487, 492–494 | ch23+25+26 |
| Extinderea Export Files (PDF/Fountain/FDX/MMD, numerotare, strip comments) | §25.1–25.2, p. 583–584 | ch23+25+26 |

P3: sortarea paragrafelor (§15.2.4); pachetul de comenzi mici din cap. 15 (inclusiv lista
`project.autoComplete` neconsumată de editor); rafinamentele corkboard/outliner (§8.2–8.3);
drag&drop import extern (§9.1); import proiect Scrivener în binder (§9.1.5); scratchpad
two-way (§9.3); scurtături tab-uri Inspector (§13.2.2); monitoare multiple pentru compoziție
(§16.1.5); import stiluri numite din DOCX/ODT (§17.4.5); post-processing + binare externe
pandoc/mmd (§21.3/21.5.2); stiluri → markup markdown + CriticMarkup (§21.4.6–21.4.7);
import & split pe scene FDX/Fountain (§19.2.2/19.5); partajare formate compile (§23.2.5);
opțiuni fine ToC ebook/OPML/CSV (§23.4.6/§25.3–25.4).

Notă pozitivă: compararea între două snapshots (exclusivă manualului) e implementată;
golurile din tura întâi (strip/convert notații, Saved Layouts, șabloane de document,
înlocuiri de proiect în Compile) sunt acum implementate și confirmate la adâncime.

> Concluzie de metodă, re-confirmată: inventarul `FEATURES-SCRIVENER3.md` nu a prins Quick
> Search și nu prinde nici golurile de mai sus — auditul pe manual rămâne sursa adevărului.
