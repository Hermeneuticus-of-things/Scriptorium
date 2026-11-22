# FINAL ANTI-OMISSION REVIEW

Data: 2026-11-22. A doua trecere independentă (clauza anti-omisiune, §7 din misiune),
după tranșele T1–T6 (T7 macOS exclus la decizia autorului).

## Metoda

Re-căutare activă în manuale (surse extrase), în Options/Project Settings, în meniuri,
în Release Notes și în workflow-uri — căutând în mod deliberat funcții care AR PUTEA lipsi
din inventarul consolidat. Sursa: sursele din `sources/` + registrele per fișier.

## Rezultatul trecerii

1. **Categorii absente din inventar: 0.** Toate capitolele (1–26) și anexele A–F (Windows)
   + delta macOS sunt acoperite de registre; Extras Pack inventariat; workflow-urile au
   stare per flux.
2. **Comenzi grupate prea larg: 3, separate între timp** — „Move Focus To" (31 comenzi,
   separate și 31 implementate în T1), „Convert notation" (2 direcții, rămase în backlog
   P1 moștenit), „Corkboard options" (separate în Behaviors T3, eșantion livrat).
3. **Funcții confundate/deduplicate greșit: 2, verificate** — „Custom icons" (fals gol în
   auditul ch08, real implementat) și „Auto-complete per proiect" (fals MISSING în Anexa C,
   existent: AutoCompleteDialog) — rămân marcate cu proveniența corectată.
4. **Chei netratate în registrul consolidat:** Vellum (produs plătit terț, NOT_APPLICABLE
   cu export DOCX intermediar documentat), CriticMarkup (LIVRAT în T5), LaTeX variants
   (LIVRATE memoir/report; „generic book" rămâne implicit), MMD OpenOffice/Pandoc indexing
   (EQUIVALENT — preset + output existent), Ebook/Plain-text Screenplay (EQUIVALENT —
   preset scenariu + alegerea ieșirii epub/txt).
5. **Stări UNVERIFIED rămase: 0 noi.** Cele 2 existente se reverifică la T8-ecran (pe build
   viu), împreună cu parcurgerea workflow-urilor rămase PARTIAL.

## Verdict

Inventarul consolidat (799 intrări + 24 omisiuni descoperite) nu mai poate fi extins din
sursele actuale fără dovezi noi. Auditul se declară COMPLET pentru sursa Windows 3.1.6 +
delta macOS, cu implementarea în curs pe tranșe (T1–T6 livrate, T8 = acest review +
workflow-uri; T4 partial continuat până la colect-area filter). Orice funcție descoperită
ulterior primește ID nou (S3-O.nn+) și intră în registru înainte de implementare.
