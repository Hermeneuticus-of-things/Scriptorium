# CHANGELOG — Scriptorium


## v0.10.14
- Traducere în program — înlocuire automată: DeepL și Google traduc acum selecția și o înlocuiesc pe loc (ca plugin-urile din alte editoare), cu Ctrl+Z pentru revenire. Nu mai e nevoie de pasul de confirmare. Verificarea gramaticală (LanguageTool) rămâne cu fereastra de revizuire.
- Sinonime în program (sinonimul.ro): click dreapta → Dicționare → „Sinonime în program" aduce sinonimele direct în aplicație și le arată ca butoane; apeși unul și înlocuiește cuvântul. Cuvintele cu diacritice merg; formele flexionate (ex. „frumoasă") primesc un mesaj clar să folosești forma de bază, nu o eroare „404".
- Sistem de bug-uri (vânat + semnalat + prins): `BUGS.md` descrie procesul; `tests/regressions.test.js` ține câte un test pe fiecare bug reparat, cu cauza de fond (root cause) în comentariu, ca să nu mai revină; șablon de PR care cere root cause + test de regresie. (CI pe orice branch + nocturn și șablonul de raport de bug sunt deja active din 0.10.13.)

## v0.10.13
- Binder — reparație: dacă panoul editorului e fixat pe loc (🔒), click pe alt document din binder nu-l schimba și nu spunea nimic, așa că părea că aplicația e stricată. Acum apare un mesaj clar care te trimite la lacăt. (Fixarea pe loc e o funcție intenționată — un singur click pe lacăt o oprește, și rămâne oprită.)
- Sistem de raportare bug-uri: șablon de „Raport de bug" pe GitHub (Issues → New issue), cu pași de reproducere, versiune, zonă și raportul de eroare din aplicație.
- CI: rulează acum pe orice branch (nu doar main), plus o rulare nocturnă și una la cerere, ca regresiile să fie prinse mai devreme.

## v0.10.12
- Editor — fără artefacte la zoom: zoom-ul scalează textul prin `font-size` (titlu și text, împreună), nu prin proprietatea CSS `zoom`, care lăsa artefacte (caret, selecție, urme la derulare) în zona de scris. Rămâne coerent titlu+text.
- Editor — pagină mai lată: lățimea implicită a zonei de scris crește de la 42em (~504px) la 56em (~672px), o lungime de rând mai confortabilă. Instalările existente cu vechea valoare (42) sunt urcate automat o dată la 56; dacă setezi tu altă lățime, rămâne a ta.

## v0.10.11
- Dicționare — sinonimul.ro cu adresă directă: căutarea de sinonime deschide acum direct pagina cuvântului (`https://sinonimul.ro/cuvânt`), nu prin ocolul Google. Verificat pe cuvinte simple și cu diacritice. Eticheta din meniu e acum doar „Sinonime".

## v0.10.10
- Meniul din click-dreapta: citirea cu voce se numește acum „Redă audio" (înainte „Citește"), cu „Redă selecția / Redă de aici / Redă tot documentul / Oprește redarea" — mai ușor de găsit.

## v0.10.9
- Reparație: butoanele de spațiu între paragrafe (0.10.8) stricau afișarea editorului („Fereastra nu se mai poate afișa" — `Cannot read properties of undefined (reading 'id')`). Grupul nou din bara de format nu avea intrarea corespunzătoare în lista de grupuri, așa că indexarea ieșea din sincron. Acum lista e completă, iar bara e protejată: un grup fără pereche nu mai e afișat în loc să pice toată fereastra.

## v0.10.8
- Bara de format — butoane directe pentru spațiul dintre paragrafe: patru butoane (↥− ↥+ pentru spațiul înainte, ↧− ↧+ pentru cel după) schimbă spațierea dintr-un clic, câte 3 pt, fără să mai deschidă un dialog. Meniul „Paragraf" (cu valoare exactă în pt) rămâne. Coborârea la 0 readuce paragraful la spațierea implicită.

## v0.10.7
- Editor — zoom coerent: zoom-ul e acum o lupă pe toată pagina (ca la editoarele obișnuite), nu o mărire separată a textului. Textul, titlul, spațierea și marginile cresc și scad împreună, la fel în ambele ferestre; mărimea reală a fontului documentului rămâne neatinsă (la 100% textul e exact cât e setat, ex. 10pt). Înainte titlul și textul se măreau prin mecanisme diferite și ieșeau necoerente.
- Editor — spațiere mai strânsă implicit: când nu e setată o spațiere anume în formatare, rândurile sunt la 1,5 (nu 1,7), deci textul e mai apropiat.
- Citire cu voce (Mihai) — intonația punctuației și a aliniatelor: pauzele dintre paragrafe se păstrează, iar un rând fără semn de punctuație la final (un titlu) primește cadența lui de încheiere în loc să se lipească de fraza următoare. Punctuația dă intonația firească (ton urcat la „?", oprire la „.", pauză scurtă la „,").

## v0.10.6
- Mini-player voce: fereastră mai mare, bara de nivel a microfonului mai mare (verde → galben → roșu pe măsură ce se apropie de maxim) și un avertisment „prea tare" când semnalul distorsionează. Dictarea tot nu pornește singură — microfonul pornește doar la click.

## v0.10.5
- Import pagini web: cererile (pagină și imagini) trimit acum un User-Agent de Chrome și anteturi Accept/Accept-Language, ca site-urile cu protecție anti-bot să nu mai blocheze importul. Afectează doar paginile aduse din web.

## v0.10.4
- Ajutor (F1): secțiunea „Cheile serviciilor" rescrisă cu linkuri corecte și capcanele de configurare — DeepL (`:fx` gratuit), Google (activează Cloud Translation API + deblochează cheia, altfel `API_KEY_SERVICE_BLOCKED`), Speechify (cheie de API, nu premium de utilizator), Zotero, plus email/parolă și butonul „Testează conexiunea". Textul din panoul Google e mai clar, iar o cheie restricționată (403) primește o indicație în mesaj.

## v0.10.3
- Servicii și conturi: buton **„Testează conexiunea"** la fiecare serviciu cu API (DeepL, Google, LanguageTool, Speechify, Zotero, GitHub) — face o cerere minimă cu cheia pusă și spune dacă e acceptată; mesaj clar dacă lipsește cheia. (`lib/serviceTest.cjs`)

## v0.10.2
- Servicii și conturi: fiecare serviciu (DeepL, Google, LanguageTool, Speechify, Zotero) are acum și **Email cont + Parolă cont** (criptate ca restul), pe lângă cheie — pentru serviciile unde te loghezi cu un cont, nu (doar) cu o cheie. Un serviciu e „configurat" de când pui orice câmp.
- D&TED: documentația descrie compatibilitatea pe **protocolul serviciului (protocol 1)**, nu pe un număr de versiune; modelul **eek** corectat la 5,4% WER.

## v0.10.1
- Conectare MCP pentru mai mulți clienți: dialogul detectează, în funcție de calculator, ce clienți AI ai instalați (Claude Desktop, Claude Code, Cursor, Gemini CLI, OpenCode, Windsurf, VS Code, Codex) și scrie/îmbină configul fiecăruia dintr-un clic, cu copie de siguranță; fiecare cu schema și locul lui. (`lib/mcpConfig.cjs`, `src/components/McpConnectDialog.jsx`)
- Token GitHub pentru actualizator în Setări → Servicii și conturi (criptat), cu variabila de mediu ca rezervă; necesar cât timp depozitul e privat.
- Formatul Compile implicit „Manuscris standard”: corp Georgia 10 pt, titluri 12 pt bold, subtitluri 10 pt bold.
- Curățare text (editor): comandă structurală care păstrează paragrafele și formatarea; CSS personalizat la Compile scris atomic (fără cursă la formatele globale).
- Imaginile din README refăcute; scripturile de captură rulează și local (Playwright rezolvat pe lângă calea de CI).

## v0.9.9
- Actualizare din aplicație de pe GitHub: verificare automată o dată pe zi (10 s după pornire dacă ultima verificare e mai veche de 24 h; cerere condiționată cu ETag, așteptare la limita de cereri), anunț „Versiune nouă” o singură dată pe versiune, Ajutor → Caută actualizări… cu note, descărcare cu progres, verificare dimensiune + SHA-256, instalare silențioasă și repornire (portabil: arată fișierul nou). Setare „Verifică automat actualizările” (pornită implicit); buton opțional „Actualizare” în bara de sus. Versiunile publică și `SHA256SUMS`; instalatorul are `RestartApplications=yes`. (`lib/updater.cjs`, `electron/updateHandlers.cjs`, `src/components/UpdateDialog.jsx`)
- MCP `--anonymize` (oprit implicit): numele din private-names.txt (și, la cerere, emailurile și telefoanele) trimise modelului ca jetoane și rehidratate local la scriere; `docs/MCP_ARHITECTURA.md` descrie toată legătura agent ↔ Scribner.
- MCP prin rețea: `--http <port>` (Streamable HTTP, cu token obligatoriu, pe 127.0.0.1 implicit, `--host` pentru alt calculator); resursa `scribner://ghid` cu regulile de lucru pentru agent.
- Proiect nou: șabloanele pe categorii (stânga), fișe cu iconiță (mijloc), descriere dedesubt; Opțiuni▾ și Deschide recent▾ jos.
- Setările proiectului cu listă verticală de file în stânga.
- Compile pe trei coloane (formate · așezări de secțiuni · Conținut/Opțiuni/Metadate) și „Editează formatul…” separat.
- Ținte într-un panou plutitor cu bare de progres; Statistici cu manuscrisul și selecția alăturate.
- Modul compunere: bara de comenzi apare la marginea de jos (fundal, poziția paginii, mărimea textului, lățimea, estomparea, Inspector, Mergi la, Ieșire).
- Bara de formatare implicită mai scurtă (restul în »).
- Inspector ca în programele de scris clasice: un singur panou o dată, ales din iconițele de jos (Note, Semne de carte și legături, Metadate, Snapshot-uri, Comentarii); Note e implicit, cu sinopsisul sus și comutatorul Document / Proiect.
- Bara de jos a documentului: zoom, cuvinte, caractere și ținta documentului (buton cu fereastră mică și bară de progres).
- Bara documentului: ▲▼ pentru documentul anterior / următor.
- Corkboard: comenzile de vizualizare în bara de jos.
- Outline: coloane implicite Sinopsis, Etichetă, Status.
- Binder: indicațiile de taste mutate în tooltip-ul căutării (mai puțin text pe ecran).
- Texte rămase în română în interfața engleză (Metadate, Previzualizare, Formate, Statistici, Linii, Liber, Aspect, Progres, Creat, Modificat…).
- MCP: `scriv_outline`, `scriv_read`, `scriv_search` și `import_scriv` primesc folderul .scriv sau fișierul .scrivx; în aplicație importul pornește de la fișierul .scrivx; evaluare în `mcp/eval` (10 întrebări pe o carte de test); unelte marcate doar citire / distructive. `scriv_outline` și `scriv_read` citesc un proiect .scriv pe loc, fără import; serverul își descrie uneltele clientului AI; șabloane de lucru (prompts: revizie_capitol, rezumat_proiect, importa_scriv) și resursa `scribner://projects`.
- Mini-player Voce: și vocea Speechify, dacă e configurată.
- Iconiță nouă (carte deschisă cu peniță, scris „SCRIBNER” sub ea) pentru program, installer, scurtătura de pe desktop și din meniul Start.
- Pagina de scris: se lățește sau se îngustează trăgând de margini; dublu-clic pe margine = toată fereastra (și comanda „Pagina pe toată fereastra”).
- Mărirea textului: Ctrl+= / Ctrl+- / Ctrl+0 și Ctrl+rotița mouse-ului; se mărește doar textul, pagina își păstrează lățimea.
- Mini-player „Voce” (F8 sau butonul 🎙 din bară): dictare (●/❚❚/■) și citire cu voce tare, fereastră mică mutabilă.
- Vocea de citire românească inclusă (Piper, „Mihai”), descărcată singură o dată la prima pornire; vocile sistemului rămân ca alternativă.
- Dictarea e gata fără vizită în Setări: motorul se descarcă singur o dată, în fundal; dacă D&TED e instalat, e folosit el.
- MCP: comandă generală, aceeași pe orice calculator și pentru orice client AI, fără nume de utilizator și fără carte (`cmd /c %LOCALAPPDATA%\Programs\Scribner\scribner-mcp.cmd`); fără `--project` serverul oferă proiectele din lista recentă.

## 2026-10-25 — v0.9.8 — Bug hunting pe mai multe niveluri (dictare, proces principal, D&TED)

### v0.9.8, a doua rundă pe toate nivelurile + lista cerută
- Colecțiile din căutare salvată care includ câmpul Note încarcă notele (găsesc aceleași documente ca dialogul).
- Ținte: unitatea (cuvinte/caractere/pagini) se aplică la bara de stare și la notificări; caracterele se numără exact; „numără doar ce intră în Compile” are efect; sesiunea se resetează la miezul nopții, la deschidere sau manual (buton „Începe o sesiune nouă acum”).
- Numele date câmpurilor Etichetă și Status (Setările proiectului) apar în Outline, Binder, Inspector și Corkboard.
- Corkboard pe rânduri: o cartonașă trasă în alt rând primește eticheta/statusul rândului; Ctrl+←/→ mută în rândul ei.
- Setări D&TED: Anulează readuce calea și modelul salvate (Verifică și lista de modele acționează imediat asupra motorului).
- MCP: tipare regex periculoase ((a+)+) refuzate (și în aplicație); adrese IPv6 cu IPv4 local (::ffff:127.0.0.1, NAT64, 6to4) blocate; legături simbolice la ieșire refuzate; căi ascunse verificate și după legături; folderul de export existent nu se suprascrie; `set_metadata` cu etichetă goală refuzat; `import_files` validează toate căile înainte de a scrie.
- CLI: `backup -o` și `import -o` nu mai pot scrie în interiorul unui proiect; comenzi ca `__proto__` nu mai dau eroare JS.
- Istoricul scrisului: un history.json stricat e pus deoparte, nu șters; scriere atomică.
- Compile: textul adnotărilor cu stiluri în interior nu mai intră în carte; regulile regex cu `\-` merg.
- Import: OPML cu `>` în atribute și entități duble corect; fișiere text Windows-1250 și UTF-16 fără BOM.
- Editorial: majuscula după `'` se corectează; Ritm: dialog cu ghilimele amestecate, zecimale cu virgulă.
- Cuvinte-cheie: unirea prin redenumire nu mai creează bucle de părinți.
- Contrast: culorile de eroare și succes în tema întunecată, gri-ul în temele luminoase.
- Desktop: limba corectorului se schimbă imediat; Compile citește media doar din proiectul deschis.
- Mod mașină de scris: rândul curent stă la mijloc; Comentarii › Salt selectează comentariul; fereastra de Ajutor ține focusul; după un dialog focusul revine în text, nu pe meniu.

### v0.9.8, căutare separată pe MCP
- Căutare/înlocuire cu tipar care poate potrivi gol (`x*`, `^`, `\b`) pe text cu emoji: nu mai blochează serverul MCP și nici aplicația.
- `editorial_autofix` sare documentele blocate (fără snapshot) și le numește; `glossary_add` verifică blocarea înainte de snapshot.
- `merge_documents` și `empty_trash` respectă documentele blocate din subarbore.
- `create_document` cu `after_id` în Coș e refuzat.
- `import_web_page`: doar adrese publice (fără localhost, rețeaua proprie, metadata cloud), verificat la fiecare redirecționare; maximum 20 MB.

### v0.9.8, căutare mezzo (fluxuri complete)
- Note de proiect: o filă nouă nu mai primește textul filei anterioare, iar fila anterioară nu mai apare goală.
- Redenumirea sau ștergerea unei etichete/unui status actualizează și filtrele din Compile; numele cu spații la capăt nu mai pierd culoarea etichetei.
- Outline: Eticheta și Statusul se sortează în ordinea din proiect.
- Glosarele regenerate apar imediat și în editorul deschis (fără suprascriere la autosalvare).

### v0.9.8, căutare macro (aplicația desktop cap-coadă)
- Setările salvate (limba, autosalvarea, înlocuirile automate, rândul, fontul, redeschiderea ultimului proiect) se citesc înapoi; înainte dialogul pornea cu valorile implicite și le suprascria la salvare. Cheile rămân în procesul principal.
- Un settings.json valid dar greșit (null, listă, `recent` stricat) nu mai oprește pornirea aplicației.
- Același proiect deschis printr-o legătură simbolică (sau altă literă mare/mică) nu mai poate fi deschis în două ferestre.
- Backup manual: include ultimele rânduri tastate.
- EPUB comprimat (4,5 MB → zeci de KB la 2000 de documente).

### v0.9.8, căutare micro/nano
- Scurtăturile aplicației cu Ctrl+Shift (Compile, Referință rapidă, Binder, Salvează ca, Inspector) tastate în editor nu mai aplică și formatarea editorului pe aceeași tastă; uneltele pentru dezvoltatori trec pe F12.
- Numărarea cuvintelor: blocuri div/tabel separate; diacriticele descompuse (s + virgulă) nu mai rup cuvântul, nici la căutarea pe cuvânt întreg.
- Plural românesc: probleme, erori, fraze, titluri, termeni, intrări, conflicte („25 de probleme”, „1 problemă”).
- Înlocuirile la dictare: regulile scrise cu sedilă se aplică; o regulă goală șterge cuvântul.
- Coș lipsă, file fără tab curent: fără erori. Textul gol din editor tradus.

### v0.9.8, căutare pe editor și binder
- Editor împărțit: Undo într-un panou nu mai readuce textul anulat în celălalt.
- Documentele blocate nu mai sunt atinse de Găsește și înlocuiește în proiect și nu mai pot fi restaurate dintr-un snapshot.
- Ștergerea unui dosar împreună cu un copil nu mai lasă selecția în Coș.
- Modul compoziție (F11) deschide editorul și din Corkboard sau Outline.
- Golirea coșului: fără confirmare când coșul e gol; selecția trece în Manuscris.
- Texte rămase în română în interfața engleză („Blocat”, „Mai multe comenzi de formatare”).

### v0.9.8, căutare pe MCP, importuri și Compile
- MCP: `compile` și exporturile nu mai suprascriu fișiere existente străine; nicio cale ascunsă sau de pornire (.ssh, Startup) nu se citește sau scrie; blocările din echipă se judecă după ceasul serverului, nu al celuilalt calculator; un dosar cu un document blocat nu se mai mută sau trimite la coș.
- Îmbinarea project.json păstrează schimbările ambelor părți în obiecte (`custom`) și liste (cuvinte-cheie, colecții, etichete).
- Import .scriv: niciun element nu mai citește fișiere din afara proiectului; UUID repetat primește id nou; etichete `__proto__` ignorate; `content.rtf` folder nu mai oprește importul.
- RTF: legăturile `javascript:` nu mai trec; escape-urile stricate nu mai produc caractere NUL.
- Proiect: `project.json` cu BOM se deschide; unul fără arbore dă mesaj clar; id-uri rezervate Windows refuzate.
- Markdown: notele de subsol sunt escapate; notele goale nu mai lasă marcaj.
- AI: textul documentului nu mai poate închide blocul `<text>` din cerere.

### v0.9.8, căutare L3 pe interfață
- AI: acceptarea unei corecturi pe o parte de paragraf și „Inserează la cursor” nu mai rup paragraful (`src/lib/inlineInsert.js`); spațiile din jurul selecției rămân.
- Cercetare: „Inserează în document” pune răspunsul după selecție, fără s-o șteargă (`insertHtmlAfter`).
- Istoricul scrisului: înregistrează imediat la deschidere, fără întârzierea de 5 s.
- Statistici: rândul „Altele” nu mai include pronumele; demo AI: „38 de cuvinte”.

### Cerința user
> "extins multilevel bug hunting pe toate aplicația"

- **PDF și tipărire pentru o carte întreagă:** pagina se încarcă dintr-un fișier temporar; înainte, peste ~1,2 MB (o carte de ~100 000 de cuvinte) exportul PDF și Print Preview cădeau (verificat în Electron: 5 MB merg).
- **Setări stricate:** un `settings.json` ilizibil nu mai e înlocuit cu valorile implicite (pierdeai cheile și proiectele recente): e păstrat deoparte și se folosește ultima copie bună (`settings.json.bak`).
- **Backup:** un proiect modificat în timpul unui backup intră în următorul; aceeași cale scrisă diferit nu mai face două backup-uri; două backup-uri nu mai rulează deodată.
- **Ferestre:** ferestrele ascunse pentru PDF nu mai sunt luate drept ferestre de lucru; meniul nativ se golește la reîncărcarea paginii.
- **Dictare (motorul încorporat):** o pornire eșuată nu mai blochează dictarea până la repornirea ferestrei; oprirea în timpul pornirii nu mai dă eroare; mesaj în română când motorul cade în mijlocul transcrierii; fișierele lungi se decodează la 16 kHz (de ~3 ori mai puțină memorie); la schimbarea motorului, cel vechi se oprește (D&TED nu mai ține microfonul).
- **Dictare (text):** ş/ţ cu sedilă devin ș/ț; majuscula după „ sau « la început de frază; înlocuirile tale se aplică și pe varianta cu sedilă.
- **D&TED în Scribner:** cererile de stare/model se potrivesc după id; modelul se reîncearcă dacă D&TED era ocupat; transcrierea fișierelor din binder folosește și ea modelul ales.
- **D&TED (repo separat):** serviciul nu mai moare la un caracter care nu se poate scrie sau la o comandă greșită; „Stop” al unei ferestre nu mai oprește dictarea alteia; id dublu refuzat; schimbarea modelului refuzată cât timp așteaptă transcrieri; anularea merge și cât se încarcă modelul.

## 2026-10-24 — v0.9.7 — Modelul eek de la D&TED în Scribner

### Cerința user
> "pune motor eek de la D&TED – Dictare și transcriere și integrează motor eek și să fie deep în Scribner UI dictarea"

- **Dictarea cu D&TED folosește modelul eek** (antrenat pe română, 5,8% cuvinte greșite față de 10,9%): *Setări → Servicii și conturi → D&TED → Verifică* arată modelele instalate, „Folosit acum” și permite alegerea; alegerea se păstrează și se aplică la fiecare pornire a serviciului.
- D&TED (repo separat, ramura cu modul serviciu): comanda `model` și lista modelelor în `stare`.
- Un D&TED mai vechi (fără alegerea modelului) primește mesajul să se actualizeze la 0.4.2.
- D&TED 0.4.2: versiunea și pașii de publicare (`docs/SERVICIU.md`); executabilul Windows se construiește pe calculatorul autorului.
- Ajutor (RO/EN), README cu imagine (`assets/readme/dtedmodel.png`) și `docs/DTED.md` §8.
- Test E2E „typing saved to Alfa” așteaptă scrierea pe disc (era fragil pe CI).

## 2026-10-24 — v0.9.6 — Bucle divergente/convergente (runda 3)

- **Interfața în engleză și Ajutorul (căutare divergentă):**
  - Ajutorul (RO și EN) descrie conflictul nou („Conflict” în bara de jos, alegere pe paragraf) și coada fără conexiune;
  - fără nume de alte programe: „Exportă scenariu .fdx…”;
  - în engleză: „saved” în bara de jos (și culoarea roșie la eroare), Statistici, Istoric, Backup-uri, Import, Semne de carte, documentele noi („New document”), copii și părți împărțite („(copy)”, „(continued)”);
  - plurale în engleză: „1 locked document”, „1 error”, „1 book page”.
- **Lucru în echipă, mai puține conflicte false:** un paragraf adăugat sau șters de un om chiar lângă unul editat de altul se unește singur (înainte cerea alegere). Simularea cu 500 de rulări: conflictele scad de la 379 la 304, fără text pierdut. Ștergerea unui paragraf pe care celălalt l-a editat rămâne o alegere.

## 2026-10-24 — v0.9.5 — Bucle divergente/convergente (runda 2)

### Cerința user
> "continua automat cu roadmap + bug hunter, ALL TYPE în bucle mai multe divergent și bucle mai multe convergente"

- **Lucru în echipă (simulare cu 2–3 calculatoare, 500 de rulări aleatoare):**
  - un document adăugat pe celălalt calculator nu mai dispare din binder după două salvări (îmbinarea binderului cădea când ambele părți aveau un nod nou);
  - trei calculatoare care blochează același document în aceeași secundă: unul singur poate scrie (cel cu id-ul cel mai mic);
  - un fișier pe care clientul de sincronizare încă îl scrie (tăiat la jumătate sau gol o clipă) nu mai e luat drept ștergere;
  - un document adăugat într-un dosar șters pe celălalt calculator ajunge în Manuscris, nu lângă Manuscris și Coș.
- **Agenți AI (MCP) și linia de comandă:**
  - `compile -o` și exporturile din linia de comandă refuză un fișier sau folder din interiorul proiectului (puteau suprascrie `project.json`);
  - împărțirea unui document, comentariile și notele adăugate de agent caută doar în text, nu și în atributele HTML (stricau documentul);
  - un document blocat de un coleg e refuzat de toate uneltele care scriu, înainte de orice snapshot sau document nou; „replace” sare documentele blocate și le numește;
  - numele proiectului e acceptat și cu extensia (`Carte.scribner`); titlul nu mai poate fi gol.
- **Comentarii:** un comentariu pus peste text cu formatare amestecată (o parte aldin) apare în Inspector ca un singur comentariu; editarea și ștergerea îl schimbă în întregime (`src/lib/panelsExtra.js`).

## 2026-10-24 — v0.9.4 — Bug hunter din TODO: căutare, tastatură, siguranță

### Cerința user
> "continua automat cu roadmap + bug hunter, ALL TYPE"

- **Căutare „cuvânt întreg”** și `^`/`$` văd literele de lângă un cuvânt îngroșat sau cursiv: „pre**fix**” nu mai e găsit ca „fix”, iar `^` înseamnă începutul paragrafului (`src/lib/search.js`).
- **Tastatură:** taburile din Compile și din Inspector se schimbă cu ←/→/Home/End și sunt un singur pas de Tab; pe Corkboard tot panoul e un singur pas de Tab, iar săgețile trec de la o fișă la alta.
- **Siguranță:** previzualizarea semnelor de carte, notele din Inspectorul plutitor și snapshot-urile trec printr-un filtru comun care păstrează doar formatarea (fără scripturi, formulare, redirecționări sau imagini de pe internet); legăturile se deschid în browser.
- **Restaurarea unei copii de siguranță** refuză arhivele cu peste 200 000 de fișiere sau peste 4 GB despachetat.
- **Drumul textului (căutare divergentă pe date):**
  - exportul `.scriv` păstrează tab-urile și spațiile repetate;
  - saltul de pagină rămâne salt de pagină după oricâte drumuri `.scriv` (nu se mai transformă în „* * *”);
  - pachetul de proiect (export/import) duce cu el și istoricul scrisului;
- **Editor (căutare divergentă pe funcțiile editorului):**
  - Caută și înlocuiește (Ctrl+F) nu mai poate șterge o notă de subsol, o imagine sau o adnotare aflată în mijlocul unei potriviri;
  - textul înlocuit își păstrează aldinul, cursivul și comentariul;
  - după „Înlocuiește”, selecția și contorul trec corect la potrivirea următoare;
  - o notă de subsol golită la editare se șterge, nu mai rămâne numerotată și goală;
  - o imagine din clipboard (captură de ecran, imagine copiată) se lipește direct în text.
- **Ecran îngust (mod browser):** bara de meniuri trece pe două rânduri, iar meniurile nu mai ies din pagină.
  - caracterele de control (din text lipit) nu mai ajung în RTF, comentariile `.scriv`, OPML și LaTeX, care ieșeau invalide;
  - listele numerotate care încep de la alt număr („5.”) încep tot de acolo în DOCX;
  - „Unește documentele” nu mai trimite în Coș documentele așezate sub cele unite (trec sub primul) și păstrează cuvintele-cheie ale tuturor.
- **Viteză:** numărul de caractere (ținte pe caractere, istoric) se calculează doar pentru documentele schimbate.

## 2026-10-24 — v0.9.3 — Bug hunter pe interfață și pe textele în română

### Cerința user
> "continua automat cu roadmap+ bug hunter, ui, ui si romina tot app … actualizează README-ul cu text și imagini pentru funcțiile noi"

- **Sinopsis:** editat în Inspector, pe Corkboard sau în Outline, nu mai e suprascris de varianta veche dintr-o altă casetă.
- **Corkboard liber:** fișa nu mai sare la un simplu clic; selectarea textului din titlu nu mai mută fișa; clicul fără mișcare nu mai marchează proiectul ca modificat.
- **Caută și înlocuiește în proiect:** „Înlocuiește tot” schimbă și titlurile și sinopsisurile pe care le arată în listă; nu mai cade pe un proiect fără Coș.
- **Numere în română:** „1 cuvânt”, „1 document blocat”, „din 1 pagină”, „25 de cuvinte”, „100 de pagini” (`pluralRo` în `src/lib/i18n.js`, aplicat oricărui text cu număr); în engleză „1 word”.
- **Fără nume de alte programe** în interfață și în ajutor: „proiect .scriv”, „Import .scriv”, „Legături interne”, „Text continuu” (în loc de numele vechi al modului).
- **Traduceri:** „Creat”, „Modificat”, „Origine .scriv” din Inspector, „Ține cont de majuscule” din Caută, „Selecția curentă (n elemente)” din Compile.
- **Lucru fără conexiune (roadmap §9):** textul care nu se poate scrie în folder rămâne în coadă, se reîncearcă singur la 15 s și imediat când revine folderul; coada se păstrează și dacă închizi programul. Bara de jos arată „Sincronizat” / „În așteptare: n documente” / „Conflict” (scenariu `offline.cjs`).
- **Securitate:**
  - fereastra programului nu mai poate fi dusă pe alt site de o legătură sau de un fișier tras peste ea; legăturile web se deschid în browser, iar doar pagina programului mai poate cere ceva procesului principal;
  - cheia AI pleacă doar la furnizorul ei (adresa se poate alege numai pentru serverele proprii: personalizat, Ollama, LM Studio);
  - lista de proiecte recente poate doar să scadă din fereastră, iar folderul de backup vine doar din dialogul de alegere;
  - transcrierea D&TED primește doar fișiere alese în dialog; snapshot-ul cere fereastra care deține proiectul;
  - serverul MCP nu mai poate fi păcălit să scrie în proiect prin litere mari/mici sau legături simbolice.
- **Coada fără conexiune:** textul unui proiect nu mai poate ajunge în alt proiect deschis după; la recuperare, ce s-a schimbat între timp pe disc se îmbină (conflictul păstrează varianta de pe disc ca snapshot), iar documentele șterse nu se recreează.
- **Viteză:** scrisul într-un paragraf uriaș (1 MB) nu mai încetinește: corecturile, ghilimelele și completarea automată citesc doar ultimele 256 de caractere.
- **Data:** istoricul scrisului în browser și data din Compile LaTeX/Pandoc folosesc ziua locală, nu ora UTC.
- **Conflictul nu mai deschide fereastra peste textul în care scrii:** apare „Conflict” în bara de jos, iar clicul deschide alegerea.
- **Dialogul de conflict:** imagine în README, „Într-un loc” la un singur conflict, fără mesajul dublu de jos; scenariu de browser `conflict.cjs`.

## 2026-10-24 — v0.9.2 — Dialog de conflict + bug hunter pe tot programul (24 de bug-uri)

### Cerința user
> "continua automat cu roadmap+ bug hunter extensiva tot app"

- **Dialog de conflict:** același paragraf schimbat pe două calculatoare deschide variantele alături; alegi pe fiecare loc a mea / a lor / amândouă (`ConflictDialog.jsx`, `resolveMerge` în `team.js`). Dacă ai scris între timp, alegerea nu suprascrie nimic.
- **Salvare sigură la pană de curent:** fișierele se scriu complet pe disc înainte de înlocuire (fsync); media se scrie atomic.
- **Import:** notele de subsol Word (`\footnote`) rămân note, nu intră în text; datele binare (`\bin`) nu mai strică documentul; un `.scriv` modificat nu mai poate citi fișiere din afara lui.
- **Securitate:** „Deschide în alt program” refuză tipurile necunoscute (.bat, .exe); fișierele atașate cu tip necunoscut se salvează `.bin`; ștergerea și redenumirea snapshot-urilor cer fereastra care deține proiectul.
- **Export:** o notă legată sau un comentariu peste un cuvânt îngroșat ies o singură dată (nu de 3 ori); exportul pe documente păstrează notele legate în MD/TXT/RTF; `.scrivx` fără caractere de control.
- **Binder:** documentele noi nu se mai creează în Coș; tragerea unui dosar împreună cu copilul lui păstrează structura; tragerea în Coș ține minte locul pentru Restaurare.
- **Tastatură:** scurtăturile nu mai rulează în spatele unui dialog sau în câmpurile de text; înregistrarea unei scurtături nu o mai execută; Esc care închide un meniu nu mai oprește răspunsul AI.
- **Setări:** Esc sau clic în afară întreabă înainte să renunțe la modificări.
- **Îmbinare:** dacă îmbinarea proiectului eșuează, versiunea de pe disc se păstrează ca backup.
- **Traducere:** tooltip-urile din Istoric și „(nimic)” din Inspector în engleză.
- Rămase pentru o versiune viitoare (TODO): căutarea „cuvânt întreg” peste formatare, pașii Ctrl+Z după schimbarea documentului.

## 2026-10-24 — v0.9.1 — Bug hunter pe motorul de dictare încorporat (11 bug-uri)

- Verificat pe codul whisper-server v1.7.6: comenzile, câmpurile cererii și răspunsul `verbose_json` sunt corecte.
- **Dictare de două ori mai rapidă:** bucățile cer doar textul (`json`); varianta cu timpi (`verbose_json`, care în 1.7.6 face încă o trecere prin model) rămâne doar pentru fișiere.
- **Contextul nu mai trece de la o cerere la alta:** prompt-ul și limba se trimit la fiecare cerere (serverul le păstra pe cele de dinainte).
- **Anulare / Stop în timp ce pornește dictarea:** microfonul nu mai rămâne deschis, iar F9 merge din nou.
- **Schimbarea motorului în timpul dictării** eliberează microfonul și închide bara.
- **Un singur server** și la două cereri simultane; serverul căzut repornește la cererea următoare; varianta NVIDIA intră în lucru imediat după descărcare.
- **Fișiere audio:** cel mult 150 MB sau 3 ore (o înregistrare foarte lungă putea închide fereastra); fără limită de 300 s pe cerere (bucăți lungi pe procesoare lente); erorile serverului apar ca erori, nu ca transcriere goală.
- **Descărcare:** disc plin = mesaj clar, fără căderea aplicației și fără fișiere parțiale.
- **Microfon:** filtru la reeșantionare (fără distorsiuni de aliasing); erorile după anulare nu mai apar.
- Teste: 1092; scenariile `whisper`, `dictation`, `settings-roundtrip`, `team`; E2E Electron.

## 2026-10-24 — v0.9.0 — Recunoașterea vorbirii încorporată în Scribner

### Cerința user
> "implementează motoarele D&TED … în UI Scribner" (motorul în Scribner, fără program separat)

### Rezultat
- Motor încorporat (whisper.cpp v1.7.6 + Whisper large-v3-turbo), ales implicit: Setări → Servicii și conturi → Dictare și transcriere → Descarcă motorul (~590 MB o dată; varianta NVIDIA opțională), cu progres, verificare SHA-256 și Șterge.
- F9 dictează cu microfonul direct în Scribner (bucăți tăiate la pauze, fără liniște și texte inventate), „Transcrie fișier audio” decodează MP3/WAV/M4A/OGG/FLAC în fereastră; D&TED rămâne opțiune.
- Bug UI reparat: mesajele de jos nu mai acoperă butoanele dialogurilor (Salvează).
- `lib/whisperEngine.cjs`, `electron/whisperHandlers.cjs`, `src/lib/localSpeech.js`, Setări; docs/DTED.md §7; README, ajutor RO/EN. Teste: 1087 + scenariul de browser `whisper`.

## 2026-10-24 — v0.8.9 — Fără date personale

- Exemplele din ajutor, README, CLI și MCP folosesc proiectul inventat „Drumul spre munte” și `C:\Users\Nume`; profilul românesc are id-ul `ro` (proiectele vechi se citesc la fel); „.scriv” numit funcțional peste tot; nicio cheie sau token real în depozit (verificat în tot istoricul).

## 2026-10-24 — v0.8.8 (continuare) — README reorganizat

### Cerința user
> "README s-a aglomerat; logică mai bună: ce este, pentru cine, ce face, cum face, cum lucrezi, funcțiile pe rând, cum lucrați împreună, ce urmează, instalare"

### Rezultat
- README pe 9 secțiuni numerotate, în ordinea cerută; harta nouă `features.svg` (8 fișe) cu tabel de linkuri; „Cum face” (bucăți, local, fără pierderi, AI opțional, Compile); „Cum lucrezi” în 4 pași; detaliile lungi (Compile pas cu pas, cronologie, AI, riglă) în secțiuni care se deschid la clic.
- Scos `voice-team.svg` (înlocuit de harta funcțiilor); „Ce urmează” cu tot planul; întrebare nouă „Pot dicta?”; numărul de teste actualizat.

## 2026-10-24 — v0.8.8 (continuare) — Bug hunter: 19 bug-uri în echipă și dictare

- **Dictare:** id-urile cererilor se fac în fereastră și se înregistrează înainte de trimitere (rezultatul unei transcrieri rapide nu se mai pierde, bara nu mai rămâne blocată după o eroare); evenimentele merg la fereastra care a cerut; dictarea se oprește la schimbarea documentului (nu mai scrie în altul); „Și apoi” la mijloc de frază devine „și apoi”; scrierea către un D&TED căzut nu mai oprește aplicația; D&TED de altă versiune e închis.
- **D&TED (serviciu):** anularea oprește doar cererea ei; un singur model chiar cu cereri simultane; dictare nouă imediat după Stop; ieșirea oprește transcrierea în curs.
- **Echipă:** blocare dublă (doi oameni în aceeași clipă) rezolvată (id-ul mai mic păstrează documentul, celălalt își poate scoate lacătul); ceasuri diferite între calculatoare nu mai ascund oameni sau blocări; blocările proprii nu se mai pierd la deschidere; echipa oprită își retrage imediat prezența; baza îmbinării ținută la zi de orice salvare (înlocuiri, glosar, împărțire, documente noi); scrieri suprapuse în varianta web nu mai pierd rânduri; agentul MCP nu mai scrie în documente blocate; jurnalul reîncearcă dacă OneDrive ține fișierul.
- Rămas: liste / tabele editate de doi oameni în elemente diferite trec încă prin snapshot (nimic pierdut).
- Teste: 1078.

## 2026-10-24 — v0.8.8 (continuare) — Dictare și transcriere cu D&TED; README refăcut

### Cerința user
> "plugin https://github.com/Hermeneuticus-of-things/dted integrat la nivel de UI în Scribner"; "să poți dicta direct, modificare și text nou"; "README cu beautify-github-readme"

### Rezultat
- **D&TED** (depozitul dted, PR #3): modul `--serviciu`, JSON pe linii (stare, transcrie, dictare_start/stop, anuleaza, iesire), merge și lângă fereastra D&TED deschisă; teste.
- **Scribner:** `lib/dted.cjs` (găsește DTED.exe sau codul sursă, un singur proces, oprit la ieșire), `electron/dtedHandlers.cjs` (IPC), `src/lib/dictation.js` + `useDictation.js` + `DictationBar.jsx`.
- **Dictare (F9):** text nou la cursor; peste o selecție o înlocuiește; tot textul dictat = un singur Ctrl+Z; Pauză / Stop / Anulează; majuscule și spații corecte; înlocuirile automate aplicate; documentele blocate nu primesc text.
- **Transcriere:** Fișier → Importă → Transcrie fișier audio…; Documente → Transcrie cu D&TED pe audio din binder; document nou în Cercetare, paragrafe după pauze, marcaje [mm:ss].
- **Setări → Servicii și conturi → Dictare și transcriere:** cale, termeni, marcaje de timp, Verifică.
- Demo în browser: `?demo&dted` (D&TED simulat).
- **README:** placa nouă voice-team.svg, secțiunea „Dictezi direct în carte” cu imaginea dictation.png, linkuri noi în antet, nota de instalare D&TED; ajutor RO/EN.
- Specificație: docs/DTED.md. Teste: 1074 (+14), scenariu de browser `dictation`.

## 2026-10-24 — v0.8.8 — Lucru în echipă prin folder comun (ROADMAP §9)

### Cerința user
> "fa ROADMAP" (§9: mai mulți oameni, mai multe calculatoare, proiect pe NAS / cloud, cine ce a modificat și când)

### Rezultat
- **Identitate:** Setări → Partajare → Echipă (nume, culoare; id de calculator generat). Fără nume, nimic nu se schimbă.
- **Jurnal:** fiecare modificare de mână intră în `team/log-<calculator>.jsonl` (cine, calculator, oră, cuvinte +/−, fragment). Fereastra Proiect → Echipă… cu filtre pe document, persoană și perioadă.
- **Prezență:** `team/presence-<calculator>.json` la 20 s; numele celui care are documentul deschis lângă titlu; „N în lucru” în bara de jos.
- **Blocare:** lacăt lângă titlu; la ceilalți documentul se deschide doar pentru citire („Blocat de …”), în editor, panoul 2, referință și Scrivenings; expiră după 30 min fără semne.
- **Îmbinare pe paragrafe** a unui document schimbat pe două calculatoare (diff3 pe blocuri); același paragraf: textul local rămâne, al celuilalt în snapshot.
- **Agent MCP** înregistrat ca „agent” în proiectele cu `team/`; unealta nouă `team_activity`.
- Desktop, web (folder și browser) și demo (`?demo&team`, `?demo&team=lock`).
- README (secțiune nouă + imaginea team.png, „Ce urmează” = serverul în timp real), ajutor RO/EN, ROADMAP §9.
- Teste: 1062 (+25), scenariu de browser nou `team`.

### Fișiere
`src/lib/team.js`, `src/lib/useTeam.js`, `lib/teamStore.cjs`, `src/components/TeamDialog.jsx`, `src/App.jsx`, `src/components/{StatusBar,SettingsDialog,Scrivenings}.jsx`, `src/lib/{syncGuard,folderKv,webApi,mockApi,i18n,i18n-ui}.js`, `electron/{main,preload}.cjs`, `mcp/{server,fullTools}.mjs`, `tests/team.test.js`, `tests/e2e/browser/team.cjs`, `scripts/readme-shots.cjs`.

## 2026-10-24 — v0.8.7 (continuare) — Sincronizare prin OneDrive, Dropbox, Google Drive și NAS: 10 bug-uri, plasă de siguranță

- **Același document editat în două locuri:** nu se mai pierde nimic; textul local rămâne, varianta venită se salvează ca snapshot „Versiunea de pe celălalt calculator, HH:MM”, cu mesaj.
- **Copii de conflict** (Dropbox, OneDrive, Google Drive, Syncthing, Nextcloud) recunoscute, scoase din exporturi și semnalate la deschidere; `desktop.ini`, `Thumbs.db`, `.DS_Store`, `~$…`, `.~lock` ignorate.
- **Schimbările nu se mai pierd:** scrierea din celălalt calculator imediat după a ta, NAS cu ore rotunjite la 2 s, fișier șters și recreat de clientul de cloud (nu mai golește documentul deschis).
- **Îmbinarea binderului** corectă după reîncărcare, pe ambele părți; lock venit de pe un calculator cu ceasul înainte nu mai blochează salvarea.
- **NAS / cloud deconectat:** un mesaj la dispariție și unul la revenire; aplicația desktop reia urmărirea singură.
- **Instalare dintr-o comandă:** cât timp depozitul e privat, scriptul acceptă un token GitHub (`GITHUB_TOKEN`) și explică eroarea 404.
- Teste: 1034 + 2 sărite; scenariu nou folder-sync.

## 2026-10-24 — v0.8.7 (continuare) — Panoul activ evidențiat

### Cerința user
> "originalul într-o parte și traducerea în cealaltă: fereastra activă cu chenar verde, cea inactivă altfel, automat, fără setări"

### Rezultat
- Cu două panouri deschise (split sau panoul de referință), cel în care dai clic sau scrii are chenar verde; celelalte au chenar gri și textul ușor estompat. Automat, fără setare; culori potrivite și pentru tema întunecată.
- Butonul de pe bara panoului 2 tradus („Alăturate” / „Una sub alta”), la fel comanda din meniu.
- Imaginea „Originalul și traducerea, alături” refăcută; README și ajutorul descriu evidențierea.
- Scenariu nou: active-pane.

## 2026-10-24 — v0.8.7 (continuare) — Instalare dintr-o comandă, 17 bug-uri în discuția cu sursele, CLI și installer

- **Instalare dintr-o comandă:** `irm https://raw.githubusercontent.com/Hermeneuticus-of-things/Scriptorium/main/install.ps1 | iex` (ultima versiune, verificare SHA-256 publicată de GitHub, opțiuni pentru PATH, fără ferestre și portabil). CI pe Windows instalează silențios installerul construit, verifică programul, serverul MCP, comanda `scribner` din PATH și rulează scriptul în mod de probă.
- **Discuția cu sursele:** întrebări foarte lungi încap în buget; mai multe titluri de „întrebări de continuare” recunoscute; răspunsul nu mai e tăiat în timp ce curge; un fișier de discuții stricat e păstrat ca `.bad-<oră>`, nu suprascris; titluri pe un rând; Enter în timpul răspunsului nu mai trimite a doua întrebare; „Inserează în document” refuză documentele doar-citire.
- **Import PDF:** ghilimelele românești, liniuțele și „…” apar corect; șiruri mari nu mai opresc importul; dicționare imbricate; PDF-urile criptate apar ca „Fără text”.
- **Linia de comandă:** NotebookLM rămâne sub 50 de surse și cu `--per document`; valorile numerice greșite opresc comanda cu mesaj; căile Windows cu ghilimele la final și folderele noi `-o dir\` merg; o sesiune `ask` stricată se pune deoparte; `scribner.cmd` păstrează codul de ieșire și argumentele cu paranteze.
- **Installer:** PATH fără dubluri și fără `;` goale, scos la dezinstalare, terminalele deschise anunțate; textul opțiunii în română și engleză.
- „Doar citire.” tradus; importul arată și ODT/RTF.
- Teste: 1014 + 2 sărite; E2E Electron trece.

## 2026-10-24 — v0.8.7 — Discuție cu sursele (ca într-un caiet de cercetare), linia de comandă „scribner”, 13 bug-uri

### Cerința user
> "import, consultă AI cu sursele, cu întrebare follow-up, alături de NotebookLM" · "CLI pentru NotebookLM și altele asemănătoare, ChatGPT, Manus" · "bug hunter la dicționare, traducere online, AI, MCP, ecranul de început, română" · "să meargă și cu DeepL gratuit"

### Rezultat
- **Cercetare → Întreabă devine o discuție:** întrebări de continuare (ultimele 6 replici, cu buget de lungime), trimiteri [n] care deschid pasajul, alegerea surselor (manuscris, cercetare, note, dosare), import de surse (PDF, DOCX, TXT, MD, HTML, RTF, ODT, pagini web, text lipit), „Salvează ca notă”, „Inserează în document” (note de subsol sau legături), „Copiază”, 2–3 întrebări sugerate; discuțiile se păstrează în proiect (`research-chats.json`); răspunsul curge pe ecran și se poate opri.
- **Linia de comandă `scribner`** (`cli/scribner.cjs`, `scribner.cmd` instalat lângă program, opțiune în installer pentru PATH): info, list, cat, search, stats, compile, export-sources cu `--target notebooklm|gemini|chatgpt|manus|generic`, export-notebooklm, export-docs, backup, snapshot, import, ask cu `--session`, mcp.
- **DeepL gratuit:** cheile API Free (`:fx`) merg automat; fără cont se deschide pagina DeepL.
- **Bug-uri:** meniul de dicționare cădea la un emoji pe limita de 5000 de caractere; dicționare și erori AI în engleză; timpul depășit scris corect („10 secunde”); acțiune AI pe text gol nu mai costă; cheia API ascunsă din mesajele de eroare; config Claude Desktop cu BOM sau `mcpServers` neobișnuit; ecranul de început: proiecte dispărute marcate „(lipsește)”, „Golește lista” nu mai dispare, Enter creează proiectul, titluri lungi; clic dreapta pe „cuvânt--altul”; „Înlocuiește” după traducere păstrează aldinul și cursivul, corecturile de gramatică schimbă doar cuvintele corectate.
- **MCP verificat în rulare:** doar-citire refuză scrierile, snapshot înainte de scriere, jurnalul agentului, lock fără pierderi, diacritice și emoji.
- **README:** secțiunile „Întrebi sursele” și „Linia de comandă”, DeepL gratuit.
- Teste: 989 + 2 sărite; E2E Electron trece.

## 2026-10-24 — v0.8.6 (continuare) — Bug-uri în funcțiile noi

- **Raport de probleme:** numele de familie din căi cu spații (`C:\Users\Ion Popescu\…`), numele cu diacritice, adresele de e-mail și cheile din adrese web (`access_token=…`) nu se mai scurg în raport.
- **Note de subsol cu simboluri sau litere:** HTML, PDF și EPUB numerotează acum ca Word (*, †, ‡, §, apoi dublate; z, aa, bb…), nu diferit de DOCX.
- **`[[Titlu nou]]`** nu mai creează documentul în coș când dosarul ales între timp a fost șters.
- **„Legături către acest document”** nu mai arată documente din coș; legăturile din dosare apar cu titlul lor.
- Texte: „Fereastra nu se mai poate afișa”, „Send via GitHub”, butonul „+ link web” din Inspector tradus.
- Teste: 910 + 2 sărite; E2E Electron trece.

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

## 2026-10-24 — v0.8.4 — Interfață personalizabilă, meniu AI unic, Conectează la Claude (MCP)

### Cerința user
> "în UI pune tot ce e legat de AI într-un submeniu" · "interfața să nu fie aglomerată, folosește submeniuri / dropdown" · "interfața personalizabilă e mai importantă"

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
- **Ajutor**: capitol nou „Ce faci tu” (chei de servicii și AI, test cu model real, corectorul românesc din Windows, MCP, sincronizare prin folder, proiectul real și VKB2, limite cunoscute).
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

## 2026-10-23 — v0.6.0 — Bug-uri reparate la cauză, AI cu orice furnizor, UI/UX

### Cerința user
> "repare bug cu best practice root cause" · "ori ce cheie API, nu doar Anthropic" · "NotebookLM" · "UI și UX (Scrivener clone)"

### Rezultat
- Bug-uri reproduse cu test, apoi reparate la cauză: sincronizare folder (căi în afara folderului), import mixt, salvări din stare veche, scrieri pierdute la eroare, setări atomice, snapshot cu dată invalidă, MCP after_id, editor (redo/undo, cursor în split, $n, ghilimele românești, apostrof, regex pătratice, viteză pe documente lungi), AI (raționament în răspuns, răspunsuri goale/blocate/tăiate, cache pe model, propuneri peste editări noi, anulare și limită de timp).
- AI cu orice furnizor (Anthropic, OpenAI, Gemini, OpenRouter, Mistral, Groq, DeepSeek, xAI, Ollama, LM Studio, compatibil OpenAI), cheie criptată per furnizor; export pentru NotebookLM.
- UX: săgeți și căutare din tastatură în binder, Delete în coș, documente noi în modul redenumire, undo/redo în binder, corkboard și outline din tastatură, scurtături fără Ctrl+Alt (AltGr).
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

## 2026-10-23 — v0.5.0 — Aspect nou, profil generic, ferestre, web, profil românesc

### Cerința user
> "programul este pentru orice fel de text" · profilul românesc „să se numească Română”

### Rezultat
- Temă „Clasic” implicită pe toate paginile, cu variantă întunecată; iconițe SVG proprii (bara de unelte, binder, taburile Inspectorului), bara de titlu deasupra editorului; „Modern” rămâne în Setări → Aspect.
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
- Import `.scriv`: parsare `.scrivx` + RTF → HTML.
- AI: Anthropic SDK în procesul main, model `claude-opus-5-5`, cheie API din setări locale.
- Build portabil Windows: electron-builder target `portable`.

### Fișiere vizate
`electron/`, `lib/`, `src/`, `tests/`, `package.json`, `vite.config.js`

### Rezultat (v0.1.0)
- Aplicație completă: binder (drag & drop, căutare), editor TipTap, corkboard, outline, inspector (sinopsis, etichetă, status, țintă, note, snapshot-uri), mod compunere, teme (luminos/întunecat/sepia), ținte carte/sesiune/document.
- Import `.scriv` (`lib/scrivImport.cjs`, `lib/rtf.cjs`).
- Compile DOCX/EPUB/HTML (`lib/compile.cjs`) + PDF A5 prin Electron.
- Asistent AI (`lib/ai.cjs`): corectură, sinopsis, continuare, critică, consistență, întrebări.
- Teste: 11/11 vitest; UI verificat în Chromium (mod browser), fără erori în consolă.
- Neverificat aici: rularea efectivă în Electron (binarul nu se poate descărca în containerul cloud) și apelul real la API (fără cheie).

## 2026-10-23 — ROADMAP.md
Roadmap extins cu toate funcțiile (12 secțiuni, P1/P2/P3) și ordinea v0.2 / v0.3 / v1.0.

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
- Import Scrivener fără pierderi: `lib/rtf.cjs` rescris (aliniere, culori, highlight, super/subscript, liste, tabele, imagini, comentarii și note legate/inline, adnotări, Scrivener Links, stiluri), `lib/scrivImport.cjs` rescris (keywords, metadate personalizate, section types, ținte, colecții, bookmarks, snapshot-uri, writing.history, note de proiect, media, formatul `.scriv` 1/2, copie completă în `scrivener-original/`), raport de import, vizualizare media, metadate în Inspector.
- I-REP / I-EDIT după motorul editorial românesc: `src/lib/editorial.js` (reguli R0–R11, ALOGEN, DOOM III, bucle micro/mezzo/macro, reattach), `src/components/EditorialPanel.jsx`, profil editorial în Setări.
- `docs/FEATURES.md` (inventar complet) și `ROADMAP.md` extins.
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
