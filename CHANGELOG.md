# CHANGELOG — Scriptorium

## 2026-10-24 — v0.8.6 (continuare) — Raportează o problemă, cu erorile din jurnal

### Cerința user
> "buton de trimis erori direct pe GitHub, pentru userul care nu se pricepe la calculatoare; automat și eroarea din log"

### Rezultat
- **Jurnal de erori** (`userData/logs/errors.jsonl`, maximum 200 / 1 MB): erorile din fereastră și din procesul principal se notează singure.
- **Mesaj discret** la o eroare nouă: „A apărut o problemă. Trimite raportul?”.
- **Ajutor → Raportează o problemă…**: scrii ce s-a întâmplat; detaliile tehnice (versiune, sistem, ultimele erori, ultimele comenzi) sunt completate automat și se văd înainte de trimitere. „Trimite pe GitHub” deschide pagina cu raportul gata scris (cont GitHub gratuit) și copiază raportul întreg; „Copiază raportul” pentru orice alt canal.
- **Fără date personale:** fără text din carte, căile de pe disc scurtate (~, <proiect>), cheile API ascunse.
- **Ecran de recuperare** pentru erorile de afișare: în loc de fereastră albă, un mesaj cu „Reîncarcă”; eroarea ajunge în raport.
- **README:** secțiunea „Ai găsit o problemă?”, panoul de referință, `[[Titlu nou]]`, legăturile înapoi, numerotarea notelor, aspectul fișelor și blocurile cu formatare păstrată; imagini noi `reference.png`, `report.png`.
- Teste: 901 + 2 sărite; scenariu report-problem; E2E Electron trece.

## 2026-10-24 — v0.8.6 — Legături înapoi, panou de referință, numerotarea notelor, fișe personalizate, formatare păstrată

### Rezultat
- **Legături înapoi automate** (Setări → Editare, oprit implicit): când un document primește o legătură către altul, sursa apare în semnele de carte ale țintei; Inspectorul arată „Legături către acest document”.
- **`[[Titlu nou]]`** fără potrivire: bară cu „Creează și leagă” / „Anulează” și alegerea dosarului.
- **Panou de referință** (Vizualizare → Deschide ca referință, Alt+Shift+clic în binder): un document alături de editor și de split, doar citire până bifezi „Editabil”; păstrează derularea și se salvează în layout.
- **Numerotarea notelor de subsol** în Compile: 1, 2, 3 / i, ii, iii / a, b, c / *, †, ‡, §, cu reluare pe capitol (DOCX, HTML/PDF; EPUB format; ODT/RTF format fără reluare).
- **Fișe pe corkboard:** colțuri rotunjite sau drepte, fișe liniate, culoare după etichetă.
- **Păstrează formatarea** (Format): blocuri pe care Compile nu le reformatează (fără înlocuiri, ghilimele, alineat; DOCX își păstrează fontul și indentările).
- Verificarea funcțiilor (`docs/GAP-AUDIT.md`): 69 prezente, 1 lipsă (adnotări în PDF).
- Teste: 882 + 2 sărite; E2E Electron trece.

## 2026-10-24 — v0.8.5 (continuare) — Verificare completă a funcțiilor, legături [[Titlu]], comparare pe frază/paragraf, numărul selecției

### Cerința user
> "caută și alte funcții care nu au fost implementate sau au fost omise, în detaliu"

### Rezultat
- Raport `docs/GAP-AUDIT.md`: fiecare funcție verificată în cod, nu doar în listă; 63 prezente, 1 parțială, 6 lipsă, 3 excluse intenționat (MathType, Kindle KPF, sync iOS).
- Lista veche marca drept gata trei lucruri care nu mergeau; acum merg:
  - **`[[Titlu]]`**: scrii `[[` și titlul unui document, iar textul devine legătură către el (fără majuscule și diacritice; începutul unic al titlului ajunge).
  - **Compararea snapshot-urilor** pe cuvânt, frază, propoziție sau paragraf.
  - **Bara de jos tradusă** (rămânea în română în modul englez); la fel suprapunerea de ținte din modul compunere.
- **Numărul cuvintelor și caracterelor din selecție** apare în bara de jos.
- Rămân: legături înapoi automate, al treilea panou de referință (acoperit parțial de ferestrele Quick Reference), `[[Titlu nou]]` care creează documentul, blocuri cu formatare păstrată, alte formate de numerotare a notelor, forme de fișe, adnotări în PDF.
- Teste: 854 + 2 sărite; E2E Electron trece; scenariu nou gap-audit.

## 2026-10-24 — v0.8.5 — Română curată, cuvinte alogene protejate, 7 bug-uri de interfață, README nou

### Cerința user
> "bug hunter UI și română, tot app" · "atenție la cuvintele alogene din text, să nu se confunde" · "actualizare README și poze, ce ai omis"

### Rezultat
- **Limba română:** bara de formatare, căutarea și prompturile editorului erau scrise doar în română (rămâneau așa în engleză), acum traduse (peste 100 de texte); installerul trecut pe ș/ț cu virgulă (era cu sedilă); termeni unificați („Tradu selecția”, „Substituenți”, „Evidențiere”, „Aldin / cursiv”, „Împarte orizontal”, „Exponent / indice”); test nou care prinde sedilele, ghilimelele drepte, „...” și româna rămasă în modul englez.
- **Cuvinte alogene:** corecturile învățate nu ating niciodată un cuvânt cu litere din afara alfabetului român (IAST ā ī ū ṛ ṣ ṃ ś, é); verificarea limbii nu atinge termenii sanscriți și regulile ALOGEN.
- **Bug-uri de interfață reparate:** „Înlocuiește tot” în proiect era anulat de panoul al doilea (pierdere de date; acum toate schimbările din afara editorului ajung în ambele panouri); Esc în modul compunere închidea două straturi deodată; restaurarea din coș a unui dosar împreună cu un copil al lui rupea dosarul; opacitatea 0 a hârtiei în compunere se salva ca 100; separator dublat la capătul barei personalizate; MCP `create_document` lăsa un fișier orfan la eroare; în versiunea web pachetele pierdeau istoria scrisului și ștergerea lăsa jurnalul autorului.
- **Engleză:** etichetele și stările implicite (Idee, Personaj, Loc; De făcut, Prima ciornă, Revizuit) apar traduse; valorile salvate rămân neschimbate.
- **Reparații de date din runda anterioară:** restaurare din backup-uri cu `__MACOSX` sau fără folder, entități HTML numite la căutare-înlocuire, nume de fișiere invizibile sau NFD, căi lungi pe Windows.
- **README:** toate imaginile refăcute pe interfața nouă; secțiuni noi (interfață personalizabilă, meniu AI, riglă, repetiții S70 și textul tău protejat, sync prin cloud/NAS, MCP pentru Claude/Codex/Gemini/Cursor/VS Code, pagină și tipărire); generator `scripts/readme-shots.cjs`.
- Teste: 841 + 2 sărite; scenarii noi project-replace, composition, settings-roundtrip, split-scrivenings, scrivenings-empty-undo; test MCP care pornește serverul real.

## 2026-10-24 — v0.8.4 — Interfață personalizabilă ca în Scrivener 3, meniu AI unic, Conectează la Claude (MCP)

### Cerința user
> "în UI pune tot ce e legat de AI într-un submeniu" · "interfața să nu fie aglomerată, folosește submeniuri / dropdown" · "interfața custom e mai importantă pentru useri, ca la Scrivener 3"

### Rezultat
- **Personalizează bara de instrumente** (Vizualizare): bara de sus și bara de formatare; adaugi, scoți, ordonezi (tragere, ↑/↓, Alt+↑/↓), separatoare și spațiu flexibil, iconiță+text / iconiță / text, Restabilește implicit. Salvat în setări; ce scoți rămâne în meniuri.
- **Bara de sus aerisită:** ⌂, Înapoi/Înainte, titlul, Editor / Corkboard / Outline, Compile, Inspector; sub 1180 px doar iconițe, mereu pe un rând. Split și Compunere în Vizualizare (scurtăturile rămân).
- **Meniuri ca în Scrivener:** Fișier, Editare, Vizualizare, Proiect, Documente, Navigare, Unelte, AI, Ajutor, cu submeniuri (▸) care rămân în fereastră și merg din tastatură; meniul nativ al aplicației desktop e construit din aceeași schemă.
- **Meniu AI unic:** Asistent AI, I-REP / I-EDIT, AI pe selecție ▸, AI pe toată cartea ▸, NotebookLM ▸, Setări AI…, **Conectează la Claude (MCP)…** (scrie configurarea Claude Desktop cu copie de siguranță sau copiază comanda pentru Claude Code; serverul pornește din program, fără Node.js). Cu AI oprit rămân I-REP și Setări AI.
- **Ctrl+Z după schimbarea documentului** funcționează (istoria se păstrează pe document).
- Inspector tradus complet în engleză; eticheta/starea „fără” afișată tradus.
- Teste: 811 + 2 sărite; scenarii noi ai-menu, toolbar-customize, undo-switch, topbar-layout (900/1366 px, luminos/întunecat), walk-invariants, snapshots, dialog-a11y; E2E Electron verifică meniul AI nativ și dialogul MCP.

## 2026-10-24 — v0.8.3 (continuare) — VKB2: I-REP repetiția apropiată și I-EDIT textul autorului; tab-uri C/R/D; 13 bug-uri de date; MCP pentru orice client

### Cerința user
> definițiile VKB2 pentru I-REP și I-EDIT, „implementează nativ în UX” · „continuă cu roadmap + bug hunter” · „scrie în help ce comandă dau la Claude, Codex etc. ca să se lege de app prin MCP”

### Rezultat
- **I-REP, repetiția apropiată** (`src/lib/nearRepetition.js`): același cuvânt cu conținut (formă sau lemă) în aceeași frază sau în fraza vecină, inclusiv anadiploza; fără cuvinte-unealtă, numerale, auxiliare și locuțiuni; reduplicatele o singură dată; termenii cărții numărați. Panoul arată `⚠ REP L<n> «formă» ×k` ca **SEMNAL** (nu blochează, nu se repară automat, nu ajunge în promptul de reparare); clic → apariția exactă în text. Runda nouă **R8b „Cuvântul și litera” (S70)** primește singura catalogul `D:repetitie_apropiata`. Vechea regulă „Repetiție apropiată” (MINOR, R6) e oprită implicit, ca să nu contrazică S70.
- **I-EDIT, textul autorului** (`src/lib/authorText.js`): ce scrii de mână devine text al autorului (hash pe paragraf în proiect) și se notează în `editorial/MODIFICARI_AUTOR.jsonl` (doc, rând, vechi, nou, oră, hash-uri). Poarta HARD `fraza_autor_atinsa` respinge orice propunere care schimbă, mută sau șterge un paragraf al tău (cu rândul și motivul). Problemele de pe textul tău vin în COADA_AUTOR; cele vecine merg la model cu nota „leagă de textul autorului, fără să-l schimbi”; modelul primește „TEXT AL AUTORULUI (doar semnalezi)”. „✎ Editează” pe propunere, cu refuz 409 (s-a schimbat între timp), 412 (sub 20%, „Salvează oricum”) și snapshot `.bak-autor-<dată>`. Jurnalul buclei: `MODIFICARE_AUTOR`; raportul: „Modificările tale în text”; deciziile expiră când textul se schimbă. Reverificare a textului din memorie și de pe disc înainte de orice scriere.
- **Tab-uri centrat / la dreapta / zecimal** pe riglă (selector L/C/R/D, dublu clic schimbă tipul), exacte în DOCX.
- **13 bug-uri de date, import și export:** RTF românesc din Word (cp1250) cu ș/ă/ț greșite, RTF cu BOM, entități numerice în .scrivx și la căutare-înlocuire, BOM și UTF-16 la TXT/MD/Fountain, import ODT/OPML oprit de o entitate invalidă, text pierdut la împărțirea pe titluri, emoji tăiat în numele de fișier, note de subsol pierdute în DOCX/ODT/RTF când conțin „>”, DOCX/EPUB/ODT care nu se deschideau din cauza caracterelor de control, un snapshot stricat ascundea toate snapshot-urile, backup cu lock care bloca salvarea după restaurare, nume NFC/NFD suprapuse la export.
- **MCP pentru orice client:** programul instalat pornește singur serverul MCP (fără Node.js). Ajutor → „Ce faci tu” are comenzile pentru Claude Code, Codex, Gemini CLI și configurările pentru Claude Desktop, Cursor, Windsurf, LM Studio, VS Code. `lib/mcpConfig.cjs` scrie configurarea Claude Desktop (cu copie) și generează comanda Claude Code; testat cu serverul pornit prin executabilul programului.
- Total 798 teste + 2 sărite; E2E Electron trece; scenarii browser noi: irep-vkb2, ruler.

## 2026-10-24 — v0.8.3 (continuare) — Corecturi învățate

### Cerința user
> "la corecțiile manuale să creeze automat în dicționar, ca să nu mai rescriu aceleași cuvinte pe viitor"

### Rezultat
- Un cuvânt subliniat ca greșit, corectat de mână (selectat și rescris sau ales din sugestiile de clic dreapta), intră automat în *Setări → Corecturi → Înlocuiri automate*, marcat „învățat”, și se corectează singur la scriere data viitoare, păstrând majusculele („fata” → „față”, „Fata” → „Față”, „FATA” → „FAȚĂ”). Confirmarea apare ca mesaj scurt.
- Se învață doar greșeli apropiate (diacritice, literă lipsă, în plus sau inversată) și doar când corectorul ortografic respinge forma veche și o acceptă pe cea nouă; așa „casa” → „masa” (două cuvinte corecte) nu se învață. Înlocuirile scrise de tine au prioritate; o corectură inversă o anulează pe cea veche; maximum 2000 de intrări învățate.
- Opțiunea *Învață din corecturile mele* (pornită implicit) o oprește. Înlocuirile noi se aplică imediat, fără reîncărcarea editorului.
- În browser nu există corector de sistem, deci acolo nu se învață din rescriere.
- `src/lib/learnCorrections.js`, `src/editor/corrections.js` (plugin), `electron/preload.cjs` (`isMisspelled`, `onSpellReplaced`), `electron/main.cjs`; 11 teste noi. Total 732 + 2 sărite; E2E Electron trece.

## 2026-10-24 — v0.8.3 (continuare) — Riglă cu tab-uri, Print Preview, imagini offline din web, Linguistic Focus precis, ajutor „Ce faci tu”

### Cerința user
> "continuă automat cu roadmap pentru tot app" · "fă tot ce depinde de tine, restul scrie în help"

### Rezultat
- **Riglă vizuală** (Format → Arată rigla, Ctrl+Alt+Shift+R): indent stânga/dreapta/prima linie trase cu mouse-ul, clic adaugă tab, tragere în afara riglei îl șterge. Indentările și tab-urile ajung exact în DOCX (inclusiv indent agățat și tab-uri reale).
- **Configurare pagină și Previzualizare tipărire** (Fișier): hârtie A4/A5/Letter/Legal/6×9/personalizată, orientare, margini, antet/subsol cu câmpuri, fără antet pe prima pagină; previzualizarea arată PDF-ul real (pagini, zoom, Tipărește, Salvează PDF); tipărirea folosește aceleași pagini. Verificat în Electron: 6×9 in → 432×648 pt.
- **Cercetare → pagină web**: imaginile se descarcă și se salvează în proiect (srcset, data-src, adrese relative), cu limite de număr, mărime și timp; doar `image/*`; imaginile care nu se pot lua rămân link cu textul alternativ.
- **Linguistic Focus**: etichetare RO/EN refăcută (liste închise complete, terminații, context). Pe texte noi: RO 72% → 87%, EN 83% → 96%.
- **Ajutor**: capitol nou „Ce faci tu” (chei de servicii și AI, test cu model real, corectorul românesc din Windows, MCP, sincronizare prin folder, proiectul Karma și VKB2, limite cunoscute).
- **Test cu model real** rulat de autor pe Windows prin OpenRouter (model gratuit): corectura corectă; traducerea și explicarea au picat la furnizorul gratuit. Scriptul reîncearcă acum și trece la alt model.

### Limite
- Tab-urile exacte doar în DOCX; în PDF/EPUB/HTML tab-uri egale. Doar tab-uri la stânga.
- Fereastra principală are acum `plugins: true` (vizualizatorul PDF intern pentru previzualizare).

## 2026-10-24 — v0.8.3 — Versiunea web pe un folder .scribner real (OneDrive, Dropbox, Google Drive, NAS), NVIDIA NIM

### Cerința user
> "continuă automat cu roadmap" · "sincronizare între web și desktop prin OneDrive, Dropbox sau Google Drive sau personal NAS" · "o cheie AI pentru testul cu un model real: NVIDIA sau OpenRouter"

### Decizii
- Versiunea web (Chrome / Edge pe desktop) deschide un folder `.scribner` real prin File System Access API și scrie exact formatul aplicației desktop (`project.json`, `docs/`, `notes/`, `snapshots/`, `history.json`). Sincronizarea o face clientul de cloud sau NAS-ul; programul nu are server propriu.
- Schimbările făcute de desktop sau de sincronizare se văd în web printr-un watcher care verifică fișierele la 3 secunde; scrierile proprii nu sunt raportate înapoi.
- „Șterge” din lista web doar uită folderul; fișierele de pe disc rămân.
- Cheia AI nu e scrisă nicăieri în repo; testul cu model real citește cheia din variabila de mediu.

### Rezultat
- `src/lib/folderKv.js` (nou): stocare pe folder + rutare `fs:` în `src/lib/webApi.js`; permisiunea se cere din nou după reîncărcare; același folder deschis de două ori rămâne o singură intrare; id-urile cu `../` sunt respinse.
- Home în web: „Deschide proiect .scribner” alege un folder, „Importă pachet .json” rămâne separat.
- Furnizor nou **NVIDIA NIM** (`integrate.api.nvidia.com`, compatibil OpenAI, cheie `nvapi-…`). Fără model implicit fix: primul test real pe Windows a arătat că `meta/llama-3.3-70b-instruct` a fost retras (HTTP 410). Scriptul de test alege singur un model activ din lista serverului; aplicația explică eroarea 410 („modelul a fost retras, alege alt model”).
- `scripts/ai-smoke.cjs`: `NVIDIA_API_KEY=… node scripts/ai-smoke.cjs nvidia` (sau `openrouter` cu `OPENROUTER_API_KEY`) rulează corectura, traducerea și explicarea unui termen pe modelul real.
- `tests/webFolder.test.js`: 7 teste pe un folder real, cu aplicația desktop (`lib/store.cjs`) de cealaltă parte. Total 692 teste + 2 sărite.

### Neverificat aici
- Testul cu modelul NVIDIA real: mediul cloud blochează `integrate.api.nvidia.com` și `openrouter.ai` (403 la proxy). Rulează local scriptul de mai sus.

## 2026-10-24 — v0.8.2 — Titlul capitolului în antet, Ctrl+Y după o corectură automată, versiune publicată

### Cerința user
> "fă tot" (punctele rămase din TODO)

### Rezultat
- **Titlul capitolului în antet:** `<$t>` în antet sau subsol arată titlul capitolului de pe pagina respectivă. În PDF fiecare capitol e o pagină numită cu antetul ei (paginile oglindite rămân corecte); în Word fiecare capitol e o secțiune cu antetul ei, numerotarea continuă, iar prima pagină a capitolului rămâne fără antet. `<$wc>` din antet arată acum numărul real de cuvinte și în PDF. Verificat pe PDF-ul din Electron și pe Word deschis în LibreOffice.
- **Ctrl+Y / Ctrl+Shift+Z** după Ctrl+Z pe o corectură automată (ghilimele, liniuță, …) readuce corectura, ca în Word; după alte tastări redo-ul obișnuit rămâne neschimbat.
- **Zotero:** „Fișier → Importă bibliografia din Zotero” aduce toată biblioteca din contul tău (ID și cheie din Setări → Servicii și conturi), cu chei de citare lizibile; titlurile cu aceeași cheie se actualizează, celelalte rămân.
- Manualul și dialogul Compile descriu `<$t>` și `<$subtitle>`.
- `installer\\build-windows.cmd`: pe un Windows cu Node.js și Inno Setup, dublu clic construiește aplicația, varianta portabilă și installerul cu wizard, apoi deschide folderul `release`.
- Release `v0.8.2` pe GitHub cu `Scribner-Setup-0.8.2.exe` (wizard) și varianta portabilă.

## 2026-10-24 — v0.8.1 — Vânătoare de bug-uri: încrucișat, divergent și convergent

### Cerința user
> "testează încrucișat și divergent, convergent, BUG HUNTER DEEP"

### Rezultat
Patru vânători de bug-uri în paralel, pe zone separate (editor, integritatea datelor, Compile, interfață): sesiuni aleatoare cu semințe reproductibile (divergent) și cazuri cu risc mare (convergent); fiecare bug reprodus întâi cu un test care pică, apoi reparat la cauză.
- **Editor:** tab-urile, spațiile duble și cele de la început de paragraf se pierdeau la redeschiderea documentului și în split; lipirea fără formatare lăsa `\r`; Ctrl+Shift+V rămânea armat; inserarea unui singur rând (generator de nume, dictare, traduceri) rupea paragraful; Scrivenings nu aplica corecturile, stilurile și linkurile; titlul imaginii nu se ștergea.
- **Date:** îmbinarea binderului cu mutări încrucișate bloca salvarea; fișier temporar rămas după o scriere eșuată; două snapshot-uri în aceeași milisecundă se suprascriau; backup-uri parțiale (disc plin) socotite valide; restaurarea unui zip gol; pachet cu id invalid lăsa un proiect pe jumătate; cursă la preluarea unui lock vechi (acum lock cu token, test cu 6 procese) și erorile trecătoare de lock pe Windows.
- **Compile:** caractere de control stricau capitole EPUB; imagini stricate puse în EPUB/DOCX/ODT/RTF (acum textul alternativ); lățimi în procente respinse de epubcheck; imaginile din DOCX tăiate la un rând în LibreOffice (inclusiv coperta); subtitlurile lipseau din LaTeX. Matrice: 8 formate × 12 ieșiri × 2 seturi de opțiuni, validate cu epubcheck, validatorul OOXML, LibreOffice, pandoc și PDF-ul real privit pagină cu pagină.
- **Interfață:** meniurile ieșeau din ecran în ferestre mici; „Înlocuiește” după traducere rupea paragraful și pierdea spațiile; citirea Speechify continua după Stop; meniul de clic dreapta din aplicația desktop rămânea în română în modul englez; numele formatelor de Compile, ale stilurilor și ale modurilor de scenariu rămâneau în română în modul englez; erorile din Servicii și conturi erau tăcute; corecturile LanguageTool suprapuse stricau textul.
- **Word ca o carte:** coperta, pagina de titlu și cuprinsul stau într-o secțiune fără antet și fără număr; corpul cărții începe de la pagina 1 (verificat cu LibreOffice).
- Scenarii noi în browser: editor-fuzz, ui-walk, keyboard-only, drag-drop, escape-stack, menu-viewport, service-replace, replace-inline. Total 677 teste unitare + 2 sărite; E2E Electron trece; CI pe Linux și Windows.

## 2026-10-24 — v0.8.0 — Carte gata de tipar și digital, imagini redimensionabile, servicii și conturi, Speechify, bug-uri Windows și meniuri

### Cerința user
> "să formateze cartea gata de tipar și digital, cu imagini în text și carte, titlu, subtitlu, caractere speciale" · "imaginile să se încadreze și să se redimensioneze în text, ca în grafică" · "cheile pe lângă AI, ex. DeepL, și alte servicii care au nevoie de user și parolă" · "https://speechify.com/" · "testează încrucișat, divergent și convergent, bug hunter deep" · "Windows: caută bug-uri reale"

### Rezultat
- **Carte gata de tipar și digital (Compile):** subtitlu de carte (Setări proiect) și subtitlu de capitol (Inspector) în toate formatele (HTML/PDF, DOCX cu stilul Word „Subtitle”, EPUB, ODT, RTF, Markdown); placeholder `<$subtitle>`; copertă ca primă pagină și în PDF/DOCX (pe lângă EPUB); tipar: despărțire în silabe, fără rânduri orfane/văduve, titlul nu rămâne singur la capăt de pagină, imaginile și tabelele nu se rup; limba ro-RO în DOCX; caractere speciale (ș ț „” «» — … ½ © € grecești, chirilice) verificate în toate formatele.
- **Imagini:** în editor au colțuri de tras (redimensionare cu proporții păstrate) și o bară pe imaginea selectată: stânga/dreapta cu text în jur, în rând, centrată, 25/50/75/100%, mărimea originală. În cartea finală lățimea aleasă (px sau % din coloană) și alinierea se păstrează; nicio imagine nu mai depășește pagina (bug: în DOCX/ODT lățimea maximă era fixă la 6 in, deci ieșea din pagină la formatul 5×8).
- **Servicii și conturi (filă nouă în Setări):** DeepL și Google Translate (traducere direct în program, cu dialog Înlocuiește / Inserează după / Copiază), LanguageTool (gramatică, gratuit fără cont sau Premium cu e-mail + cheie; corecturile se aleg una câte una), Speechify (citire cu voce tare cu vocile lor în bara „Citește”), Zotero; plus „Alte conturi” cu utilizator și parolă (parola se copiază și se șterge din clipboard după 30 s). Totul criptat de sistemul de operare, rămâne în procesul principal.
- **Bug-uri găsite prin testare încrucișată (93 de comenzi din meniu parcurse în demo + scenarii noi):** meniurile din bara de sus nu se închideau cu Escape și rămâneau deschise peste editor, așa că următorul clic nimerea o comandă în loc de text; acum Escape închide, săgețile navighează, comenzile rulează cu focusul înapoi în editor (fără conflict cu navigarea din bara de formatare). Mesajul „… lucrează” rămânea afișat după o eroare de serviciu.
- **Windows:** nume de fișiere/foldere sigure peste tot (CON, NUL, COM1, punct sau spațiu la final, lungime), salvare atomică cu reîncercare când antivirusul/OneDrive țin fișierul deschis (și pentru setări și cache-ul AI), „Salvează ca” cu copiere explicită (cpSync eșua pe Windows), traducerea română a wizardului Inno Setup inclusă, E2E cu aplicația reală rulat și pe Windows în CI.
- **PDF ca o carte tipărită:** antetul și subsolul sunt desenate de pagină (CSS page-margin boxes), deci urmează paginile oglindite (numărul pe marginea exterioară) și lipsesc pe copertă, pagina de titlu și cuprins (bug: înainte apăreau pe toate paginile, iar ruperea dublă lăsa pagini goale); paragraful cu imagine înconjurată de text nu mai e centrat (regula CSS `:only-child` ignora textul). Verificat pe un PDF real randat de Electron, 6×9 in, fonturi încorporate.
- Teste noi: printReady (12), services (10), windowsFs (18), browser: image-resize, services, menu-keyboard. Total 627 unitare + 2 sărite; E2E Electron și 21 de scenarii în browser trec.

## 2026-10-24 — v0.7.2 — MCP integral: agentul poate folosi tot programul

### Cerința user
> serverul MCP să permită oricărui client MCP să folosească programul integral (tot ce face aplicația fără ferestre)

### Rezultat
- `mcp/fullTools.mjs`: 57 de unelte noi (77 în total), toate prin aceleași gărzi (`--read-only`, snapshot/backup înainte, lock pe project.json, id-uri validate, ieșiri doar la căi date de client și niciodată în proiect, `agent-log.jsonl`): proiecte și șabloane, import (fișiere text/OPML/media, pagini web, bibliografie, `.scriv`, pachet), export (documente, OPML/CSV, `.scriv`, NotebookLM, PENTRU EDITOR, pachet, Salvează ca), Compile în toate formatele (fără PDF; `print` = HTML de tipar) cu format, colecție, dosar sau documente, note pe taburi, cuvinte cheie, etichete, statusuri, metadate, tipuri de secțiune, ținte, colecții, semne de carte, comentarii, note de subsol, duplicare/împărțire/unire/transformare, coș, comparare și gestiune snapshot-uri, statistici, cronologie, ritm, relații, cercetare în proiect, glosar, linkuri de dicționare/traducere, backup, I-EDIT fără AI.
- Bug-uri la cauză: importul OPML pierdea eticheta și statusul (căuta `.id` pe nume); fișierele media importate (Import fișiere, imaginile paginilor web) primeau tipul `media` în loc de `file` și erau tratate ca text de binder/Compile; exportul NotebookLM nu includea notele proiectului (căuta `project.notes`); comentariile adăugate prin MCP aveau `data-author` (Inspectorul citește `data-comment-author`).
- Logica mutată în biblioteci partajate de aplicație și MCP: `opmlToNodes`, `mediaNode`, `parseFootnotes` (panelsExtra), glosarul traducătorului (glossary.js), `collectSources` (rag.cjs).
- Teste: `tests/mcpFull.test.js` (43): câte o probă pe unealtă, refuz `--read-only` pentru fiecare unealtă nouă de scriere, lista completă de unelte și o gardă care pică pentru orice funcție nouă din `preload.cjs` fără unealtă MCP sau motiv „doar GUI”.

## 2026-10-24 — v0.7.1 — Installer Windows cu wizard (Inno Setup)

### Cerința user
> "programul să aibă wizard de instalare, adică .exe" · "Inno Setup cu wizard"

### Rezultat
- `installer/scribner.iss`: wizard Inno Setup 6 în română și engleză (licență, folder, grup în Start, scurtătură pe Desktop, pornire la final); instalare per utilizator fără drepturi de admin sau pentru toți utilizatorii; dezinstalarea păstrează proiectele și setările.
- `npm run dist:win` împachetează aplicația și varianta portabilă; `npm run dist:win:setup` face `Scribner-Setup-<versiune>.exe`.
- Workflow `Windows` pe GitHub (windows-latest): teste, pachet, installer; artefactele se descarcă din Actions, iar un tag `v*` publică automat un Release cu ambele `.exe`.

## 2026-10-24 — v0.7.1 — Clic dreapta: „În proiect” (căutare, cercetare, glosar)

### Cerința user
> "trimitere ... la AI pentru cercetare ... sau căutare în baza de date ... pe cuvânt sau pe frază"

### Rezultat
- Meniul contextual are „În proiect”: caută selecția în tot proiectul, caută în cercetarea proiectului, răspuns AI din cercetarea proiectului, adaugă în glosar (documentul „Glosar…” din Cercetare, creat dacă lipsește, fără dubluri).
- Bug la cauză: butoanele panoului de cercetare primeau evenimentul click ca text de căutare când funcția accepta un argument; acum doar un șir e interogare, iar „Reîncearcă” păstrează interogarea.
- Test în browser extins (context-actions): 13 verificări.

## 2026-10-23 — v0.7.0 — Clic dreapta pe cuvânt sau frază: traducere, dicționare, cercetare, AI, NotebookLM

### Cerința user
> "la edit text ... trimitere la DeepL și la dicționare online și trimitere la AI pentru cercetare, corecții sau căutare în NotebookLM, pe cuvânt sau pe frază" · "README pentru un om obișnuit, fără Scrivener" · "repare bug cu root cause"

### Rezultat
- Clic dreapta în editor: fără selecție se selectează cuvântul de sub cursor; meniul are Traduce (DeepL, Google Translate), Dicționare (dexonline, sinonime, Wiktionary, Cambridge, Merriam-Webster, Linguee, IATE), Cercetare pe web (Wikipedia, Google Scholar, Google), Asistent AI (Cercetare, Explică termenul, Corectează, Traduce), Întreabă NotebookLM și Extinde selecția la frază/paragraf. Același meniu în versiunea web.
- AI: acțiuni noi research / define / translate; limba de traducere din Setări → Traducere și dicționare.
- Bug-uri la cauză: variabila locală `tr` din CompileDialog ascundea funcția de traducere și bloca fereastra Compile (test de gardă nou pentru toate fișierele); cronologia tăia titlul ultimei scene; câmpurile personalizate din demo fără nume; selecția programatică pierdută când editorul nu avea focus.
- Compile validat cu consumatori reali (Word schema, LibreOffice, epubcheck, pandoc): tabele, imagini, liste imbricate, linkuri, note de final, numerotarea capitolelor.
- MCP și editări externe: --read-only nu mai scrie, lock pe project.json, îmbinare în trei căi, ferestre multiple fără proiecte blocate, web cu mai multe taburi.
- README nou, pe limba unui om obișnuit, cu 8 capturi prezentate din proiectul demo îmbogățit.
- Teste: 546 unitare, E2E Electron și browser trec.

## 2026-10-23 — v0.6.0 — Bug-uri reparate la cauză, AI cu orice furnizor, UI/UX ca Scrivener 3

### Cerința user
> "repare bug cu best practice root cause" · "ori ce cheie API, nu doar Anthropic" · "NotebookLM" · "UI și UX (Scrivener clone)"

### Rezultat
- Bug-uri reproduse cu test, apoi reparate la cauză: sincronizare folder (căi în afara folderului), import mixt, salvări din stare veche, scrieri pierdute la eroare, setări atomice, snapshot cu dată invalidă, MCP after_id, editor (redo/undo, cursor în split, $n, ghilimele românești, apostrof, regex pătratice, viteză pe documente lungi), AI (raționament în răspuns, răspunsuri goale/blocate/tăiate, cache pe model, propuneri peste editări noi, anulare și limită de timp).
- AI cu orice furnizor (Anthropic, OpenAI, Gemini, OpenRouter, Mistral, Groq, DeepSeek, xAI, Ollama, LM Studio, compatibil OpenAI), cheie criptată per furnizor; export pentru NotebookLM.
- UX ca Scrivener 3: săgeți și căutare din tastatură în binder, Delete în coș, documente noi în modul redenumire, undo/redo în binder, corkboard și outline din tastatură, scurtături fără Ctrl+Alt (AltGr).
- UI: contrast AA în luminos și întunecat, bara de unelte la 1024 px, ferestre care nu ies din ecran, stări de selecție ca în Scrivener.
- CI nou (teste, build, E2E Electron), `npm audit` 0 vulnerabilități.
- Teste: 386 trec; E2E Electron OK local și în CI.

## 2026-10-23 — v0.5.1 — CI reparat

### Cerința user
> "repare bug cu best practice root cause"

### Cauza
Fluxul „NodeJS with Webpack” rula `npx webpack`, dar Scribner se construiește cu Vite și nu are webpack: CI pica la fiecare push pe `main`. Fluxul SLSA semna două fișiere de exemplu („artifact1/2”), nu aplicația.

### Rezultat
- `.github/workflows/ci.yml` (în locul șablonului webpack): Node 22, `npm ci`, `npm test`, build Vite, build web, test cap-coadă în Electron cu `xvfb-run`.
- SLSA: construiește artefactele reale (Scribner pentru Windows, zip, și versiunea web), le semnează și le atașează la release; generator `v2.1.0`.
- Verificat: toți pașii CI rulați într-o clonă curată trec (312 teste, build, E2E OK).

## 2026-10-23 — v0.5.0 — Aspect Scrivener 3, profil generic, ferestre, web, Karma

### Cerința user
> "toate paginile să arate ca Scrivener 3" · "Karma este doar exemplu, programul este pentru orice fel de text" · profilul Karma „să se numească Română”

### Rezultat
- Temă „Clasic (ca Scrivener 3)” implicită pe toate paginile, cu variantă întunecată; iconițe SVG proprii (bara de unelte, binder, taburile Inspectorului), bara de titlu deasupra editorului; „Modern” rămâne în Setări → Aspect.
- Profil editorial implicit „Generic: orice text”; profilul cărții se numește „Română”; numele glosarelor și ale pachetului pentru editor urmează profilul.
- Setările din Opțiuni au efect (corecturi automate cu Ctrl+Z, invizibile, binder, autosave, redeschidere, vedere implicită).
- Ferestre multiple, versiune web/PWA cu IndexedDB și pachete de proiect, panou de cercetare local (BM25) cu răspuns Claude opțional.
- Liste de cuvinte în Setări, glosare și cuprins de tipar, index canonic în R1/R6, pachet pentru editor.
- Teste: 238 trec. Build trece. Verificat în Chromium (?demo).

## 2026-10-23 — v0.4.0 — Roadmap 2.1–2.6, v0.4 și extra v1.0

### Cerința user
> "continua automat cu Roadmap pana la finalul proectului"

### Decizii
- Lucru în paralel pe agenți cu fișiere exclusive; integrarea în `App.jsx`, `main.cjs`, `preload.cjs` făcută centralizat.
- Meniu nativ construit din registrul de comenzi (acceleratoare afișate, neînregistrate); în browser aceleași comenzi apar ca meniuri în fereastră.
- KPF (Kindle) nu se poate produce cu unelte deschise: Kindle primește EPUB.
- Lucrările AI în bloc sunt blocate când AI e oprit; fișele vii se salvează în `project.livingSheets`.

### Rezultat
- 2.1/2.2: stiluri Para+Char, stil următor, scurtături pe stil; conversii note inline ↔ legate; Linguistic Focus (euristic RO/EN); Inspector plutitor; bookmarks de proiect; note de proiect pe file; recente fixate.
- 2.4: Compile complet (formate editabile, Section Layouts, separatoare, front/back matter, placeholders, înlocuiri, note de final, pagină, EPUB metadate + copertă, RTF/ODT/MD/MMD/TXT, previzualizare, selecție); notele legate compilate ca note de subsol.
- 2.5: import RTF/ODT/HTML/FDX/Fountain/OPML/pagină web/media; export documente, OPML, CSV; Save As; Print.
- 2.6: dialog scurtături, meniu nativ, Quick Reference, Opțiuni în 9 secțiuni, interfață RO/EN.
- v0.4: Script Mode (film, teatru, benzi desenate, radio) + export FDX/Fountain; generator de nume; Scratchpad; citire cu voce și dictare; export .scriv; sync cu folder extern; bibliografie Zotero; LaTeX/Pandoc/MultiMarkdown.
- v1.0: cronologie, hartă de relații, analiză de ritm; sinopsis AI în bloc, consistență cu fișe vii, revizie pe niveluri Maha→Nano.
- Teste: 205 trec. Build Vite trece. Verificat în Chromium (mock API).

### Neverificat
Electron real pe Windows (meniu nativ, PDF, dialoguri de fișiere, dictare), apeluri Claude reale.

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

## 2026-10-23 — v0.2.1 — Roadmap 1.4

### Cerința user
> "să da 1.4"

### Decizii
- Paste and Match Style (Ctrl+Shift+V): text simplu, paragrafe păstrate.
- Ctrl+F: bară de căutare în document cu următor/anterior, înlocuire una/toate, aceleași opțiuni ca în proiect.
- Split: Ctrl+K la cursor, Ctrl+Shift+K cu selecția ca titlu (ca în Scrivener).
- Duplicare document/dosar (Ctrl+D), cu sau fără copii, cu note.
- Spelling: limbi ro + en-US în Electron, meniu contextual cu sugestii și „Adaugă în dicționar”.

### Fișiere vizate
`src/components/Editor.jsx`, `src/components/FindBar.jsx`, `src/App.jsx`, `src/lib/tree.js`, `electron/main.cjs`, `tests/*`

### Rezultat (v0.2.1)
- Ctrl+F în document (`src/components/FindBar.jsx`, `src/editor/docSearch.js`), Paste and Match Style, Split cu selecția ca titlu (Ctrl+Shift+K), duplicare (Ctrl+D, `duplicateNode` în `src/lib/tree.js`), spelling ro/en-US cu meniu contextual (`electron/main.cjs`).
- Teste: 48/48; funcțiile verificate în Chromium.

## 2026-10-23 — v0.2.2 — Redenumire în „Scribner”

### Cerința user
> "programul să se numească Scribner"

### Rezultat
- Numele vizibil, pachetul (`scribner`, appId `ro.scribner.app`), serverul MCP (`scribner`, `bin: scribner-mcp`), formatul proiectului (`<Nume>.scribner`), linkurile interne (`scribner://doc/…`), datele portabile (`Scribner-data`).
- Compatibilitate: proiectele `.scriptorium` se deschid, se salvează în backup și se restaurează la fel; linkurile `scriptorium://` vechi rămân valide.
- Repo-ul GitHub rămâne `Scriptorium` până la redenumirea lui din setările GitHub.

## 2026-10-23 — v0.3.0 (în lucru) — Roadmap v0.3, secțiunile 2.1–2.3

### Cerința user
> "da cu tot roadmap-ul până la final, nu mă mai întreba"; "Scribner să poată fi folosit și cu AI și fără AI, să nu fie dependent de AI"

### Rezultat
- 2.1: bara de format completă, stiluri cu dialog, Revision Mode, focus, Page View, zoom, auto-complete, Copy Special, transformări, setări de compunere.
- 2.2: setările proiectului, statistici, ținte cu termen limită, colecții, cuvinte cheie, căutare avansată, documente-container, șabloane, media, navigare, bookmark-uri.
- 2.3: Corkboard grilă / linii / liber, Outline complet.
- AI opțional: comutator „Funcții AI”; fără AI nu se pierde nicio funcție de scris.
- Teste: 102/102.
