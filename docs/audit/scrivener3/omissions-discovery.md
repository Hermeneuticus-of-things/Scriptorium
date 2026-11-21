# SCRIVENER3-OMISSIONS-DISCOVERY — registrul omisiunilor descoperite

Creat: 2026-11-21, înainte de orice enumerare dintr-o listă dată (clauza anti-omisiune).
Fiecare element: sursă, categorie, funcționalitate, unde a fost inventariat, acțiune.
Nu s-au eliminat elemente „similare" fără verificarea duplicatului real (coloana Duplicat?).

| ID | Sursa descoperirii | Categorie | Funcționalitate descoperită | Inventariat la | Duplicat? | Stare în Pneuma | Acțiune |
|---|---|---|---|---|---|---|---|
| S3-O.01 | manual ch. 5 (§5.2) | proiecte | Placeholder-e de șablon `<$template_*>` în titluri | ch01-ch07 | nu | PARTIAL | de implementat cu șabloanele |
| S3-O.02 | manual ch. 5 | proiecte | „Updated Documents" — colecție automată a documentelor modificate recent | ch01-ch07 | nu | MISSING | colecție dinamică pe dată |
| S3-O.03 | manual ch. 5/7 | proiecte | Indicator „nesalvat" în titlul ferestrei | ch01-ch07 | nu | PARTIAL | titlu fereastră Electron (document.isModified) |
| S3-O.04 | manual ch. 6 | binder | Adaptive naming: titlu ← sinopsis ← text la documente fără titlu | ch01-ch07 | nu | MISSING | `titleOf` fallback |
| S3-O.05 | manual ch. 7 | fișiere | „Set Selected Text as Title" / „Clear Titles" | ch01-ch07 | nu | MISSING | comenzi Document |
| S3-O.06 | manual ch. 6/7 | proiecte | Copy To Project — copiere elemente între proiecte deschise | ch01-ch07 | verificat: Anexa A confirmă separat | MISSING | P2 |
| S3-O.07 | manual ch. 7 | folder sync | Filtru pe colecții + subdosar „Trashed Files" + prefix numeric | ch01-ch07 | nu | MISSING | P2 |
| S3-O.08 | Anexa A (Navigate) | navigare | Move Focus To (Binder/Editor/Inspector/Copyholders) — 31 comenzi tastatură | appendix-a | nu | MISSING | P1 — nucleu accesibilitate |
| S3-O.09 | Anexa A (Format) | formatare | Small Caps, Word Joiner, linii orizontale/de semnătură | appendix-a | nu | MISSING | mărunte, Format menu |
| S3-O.10 | Anexa A (View) | corkboard | Stamps/numere pe carduri, opțiuni freeform (snap to grid, marquee) | appendix-a | parțial în ch08 audit | PARTIAL | Corkboard.jsx |
| S3-O.11 | Anexa A (Documents) | organizare | Ungroup (dezgrupare dosar) | appendix-a | nu | MISSING | tree.js |
| S3-O.12 | Anexa A | research | Modelul „research file shortcuts" (fișiere scurtate în Research) | appendix-a | nu | MISSING | evaluat la import |
| S3-O.13 | Anexa B (B.9) | backup | Întreg panoul de setări Backup (on-open/on-save/zip/keep/dir) | appendix-b-c | verificat: nu era nicăieri | PARTIAL (există, neauditat) | încheiat de B+C |
| S3-O.14 | Anexa B (B.6) | corectură | Smart quotes/dashes/ellipsis + autoReplacements + autoCapitalize | appendix-b-c | nu | PARTIAL | Editing defaults |
| S3-O.15 | Anexa B (B.3.3) | revizuire | Culorile de revizie (revision colors) | appendix-b-c | nu | PARTIAL | există parțial din ch18 |
| S3-O.16 | Anexa B (B.2.8) | text | Separatoare configurabile Merge/Append/Scratchpad | appendix-b-c | nu | MISSING | setări + consum |
| S3-O.17 | Anexa B (B.8) | sync | Folder sync ca setare de program + override per proiect | appendix-b-c | nu | PARTIAL | folderSync.cjs există |
| S3-O.18 | Anexa C (C.6) | metadate | Auto-complete per proiect (listă proprie) | appendix-b-c | nu | COMPLETE acum (AutoCompleteDialog) — falsă omisiune istorică | încheiat |
| S3-O.19 | Anexa D | compile | CriticMarkup (input+output) — absent complet | appendix-d-e-f | nu | MISSING | P3 |
| S3-O.20 | Anexa D | compile | Formatele „outline" la compile (numai la print există) | appendix-d-e-f | nu | MISSING | preseturi compile |
| S3-O.21 | Anexa E (3.0/3.1.3) | stiluri | „Set Styles Defaults" pentru proiecte noi | appendix-d-e-f | nu | MISSING | P2 |
| S3-O.22 | Anexa E (3.1.4.1) | editare | Reset List Indents | appendix-d-e-f | nu | MISSING | P3 |
| S3-O.23 | Anexa F | extras | Proiecte-exemplu scrise (sample projects) în pack | appendix-d-e-f | nu | MISSING | P4 |
| S3-O.24 | cap. 14 | cloud | Sync cu IOS (Scrivener iOS) — partener de ecosistem, nu replicabil | ch14 | N/A documentat | NOT_APPLICABLE | — |

**Regulă de mentenanță:** orice funcție Scrivener descoperită ulterior primește ID `S3-O.nn`
aici + intrare în tabelul sursă aferent, înainte de implementare. Registrul nu se micșorează.
