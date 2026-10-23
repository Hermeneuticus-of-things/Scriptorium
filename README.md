# Scribner

Program de scris pentru cărți lungi, inspirat de Scrivener și scris de la zero (Electron + React). Deschide proiectele tale Scrivener 3 și adaugă un asistent AI.

## Ce face

- **Binder**: Manuscris / Cercetare / Coș, dosare și documente, drag & drop, redenumire cu dublu-clic, căutare în tot proiectul.
- **Editor**: bold, italic, subliniat, tăiat, titluri, citat, listă, linie de dialog; mod compunere pe tot ecranul (F11); defilare tip mașină de scris.
- **Corkboard**: fișe cu sinopsis editabil, culoarea etichetei, status.
- **Outline**: tabel cu titlu, sinopsis, etichetă, status, Include în Compile și număr de cuvinte.
- **Inspector**: sinopsis, etichetă, status, Include în Compile, țintă de cuvinte, note per document, snapshot-uri (salvare, previzualizare, restaurare).
- **Ținte**: cuvinte pe carte, pe sesiune și pe document, în bara de jos.
- **Import Scrivener 3** (`.scriv`): binder, text (RTF), note, sinopsis, etichete, status și Include in Compile.
- **Compile**: DOCX (pentru editor), PDF A5, EPUB 3, HTML. Dosarele devin capitole, separator între scene, font și mărime.
- **Asistent AI (Claude)**: corectură, sinopsis automat, continuare în stilul tău, critică editorială, verificare de consistență față de notele din Cercetare, întrebări libere. Rezultatul se poate insera, înlocui selecția/documentul sau pune ca sinopsis.

Scurtături: Ctrl+N document nou, Ctrl+Shift+N dosar nou, Ctrl+S salvare imediată (salvarea e oricum automată), F11 mod compunere, Esc ieșire.

## Pornire pe Windows

Ai nevoie de Node.js 22+.

```
cd "PROJECTS\Scribner"
npm install
npm start          # construiește și pornește aplicația
npm run dist:win   # creează Scribner.exe portabil în release\
```

Versiunea portabilă își ține setările lângă .exe, în `Scribner-data\`, deci merge de pe stick sau de pe `D:`.

`npm run dev` deschide interfața în browser, cu un proiect demo în memorie (fără salvare pe disc, import sau AI).

## Asistentul AI

Pune cheia API Anthropic în Setări (⚙). Cheia e criptată cu protecția sistemului de operare și rămâne în procesul principal; interfața nu o vede. Modelul folosit: `claude-opus-5-5`.

## I-REP și I-EDIT

Panoul „I-REP / I-EDIT” aplică profilul editorial al proiectului (implicit regulile `karma-book-engine`: R0–R11, P1–P13, ALOGEN, DOOM III).

- **I-REP** găsește problemele (em-dash, paranteze, construcții binare, pasive, ALOGEN, reziduuri LLM, redundanță), face reparațiile sigure fără AI, apoi rulează bucle repară → reverifică cu Claude până nu mai rămân probleme grave. Nivel micro (selecția), mezzo (documentul) sau macro (tot capitolul).
- **I-EDIT** rulează rundele alese din R0–R11, apoi P3 și bucla de verificare.
- Rezultatul apare ca diff; la acceptare se face snapshot înainte. Comentariile, adnotările și alinierea se păstrează.

## Agenți AI prin MCP

Serverul `mcp/server.mjs` dă acces agenților (Claude Code, Claude Desktop, orice client MCP) la un proiect: citire și scriere de documente, binder, căutare și înlocuire, metadate, note, comentarii, note de subsol, I-REP (`lint`), snapshot-uri, Compile, istoric. Fiecare scriere face snapshot înainte și se notează în `agent-log.jsonl`. Aplicația deschisă se actualizează singură când un agent modifică fișierele.

Comanda exactă de conectare apare în Setări → Conexiune MCP. Manual:

```
claude mcp add scribner -- node "C:\...\Scribner\mcp\server.mjs" --project "D:\Carti\Karma.scribner"
```

`--read-only` permite doar citirea.

## Formatul proiectului

```
Cartea mea.scribner/
  project.json          binder, etichete, statusuri, ținte
  docs/<id>.html        textul fiecărui document
  notes/<id>.html       notele
  snapshots/<id>/*.json snapshot-urile
```

Fișiere text simple: le poți versiona cu git sau sincroniza cu orice cloud.

## Teste

```
npm test
```
