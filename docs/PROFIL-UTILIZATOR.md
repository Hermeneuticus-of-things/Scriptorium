# Profilul utilizatorului-țintă Pneuma Sofer (directivă autor, 23.11.2026)

**Baza de referință pentru toate deciziile de produs**: analiza de paritate aplicația de referință, funcțiile
noi, sistemul Help (Help Center, Smart Search, Contextual Help, Tips & Tricks), fluxurile de
lucru și prioritizarea tranșelor. Publicul-țintă = **oamenii care scriu, documentează,
structurează, dezvoltă și gestionează texte de mari dimensiuni**, pe proiecte care durează
luni sau ani. **Nu e publicul de film/regie/storyboard** — scenariile cinematografice rămân
periferice, fără să consume resursele principale de proiectare (suportul tehnic pentru
Fountain/FDX există în cod și rămâne, dar nu e ținta de design).

## Categoriile, prioritizate

### P1 — nucleul de design (deciziile mari se iau pentru ei)

**1. Romancieri și prozatori.** Romane, serii literare; zeci de personaje, locuri, scene;
continuitate narativă pe sute de pagini.
- *Nevoi concrete:* scene pe fișe reordonabile fără fricțiune; sinopsis per scenă; cronologie;
  legături între documente (personaj ↔ scene); status/label pe etapele scrierii; ținte de
  cuvinte; volume mari rămân fluide.
- *Dificultăți de lucru:* pierderea firului narativ pe texte lungi; contradicțiile de
  continuitate; frica de a restructura („mut un capitol și pierd textul?").
- *Funcții care contează:* corkboard drag → binder reorder; snapshot-uri non-distructive;
  split/merge fără pierderi; căutare instant pe titluri/sinopse/text; quick reference.

**2. Scriitori SF, fantasy și ficțiune speculativă.** Universuri, lumi fictive, genealogii,
reguli interne, lore.
- *Nevoi:* documentare integrată lângă text ( Registrul cărții / Codex); termeni cu glosa
  lor canonică nu se ating de AI sau de corecturi; consistență între volume.
- *Dificultăți:* lore-ul se risipește prin fișiere separate; termenii inventați sunt
  „corectați" de uneltele generice.
- *Funcții:* colecții, keywords, Registrul cărții injectat în context, garda frazelor fixate,
  translate cu termeni protejați.

**3. Cercetători, autori academici și de tratate** (tratate, teze, disertații, articole,
lucrări de specialitate).
- *Nevoi:* capitole interdependente, surse și bibliografie lângă text, citări cu trimiteri,
  versiuni pe parcursul unei lucrări de ani, export curat (DOCX pentru comisie, LaTeX pentru
  reviste, PDF pentru tipar).
- *Dificultăți:* masa de referințe; revizuiri multiple (supervisor → autor); formatarea
  cerută de instituție la final.
- *Funcții:* cercetare cu trimiteri [1][2] saltabile; snapshot-uri comparate; styles;
  replacements de proiect; Compile cu formate multiple din același text; LaTeX documentClass.

### P2 — publicul secundar direct

**4. Traducători.** Text sursă lângă traducere, terminologie consistentă, note.
- *Funcții:* split pe capitole la import; side-by-side cu panou activ vizibil; DeepL/Google +
  dicționare pe selecție; note de subsol păstrate; replacements pentru terminologie.

**5. Autori de nonficțiune, eseuri, biografii.** Structură tematică, argumente, capitole.
- *Funcții:* fișe + outline; semnale de măsură (ritm, repetiții) fără AI; compile.

**6. Jurnaliști de investigație și autori documentari.** Dosare, interviuri, cronologii.
- *Funcții:* import web/PDF; colecții per dosar; căutare pe tot proiectul; backup automat.

**7. Autori de manuale și materiale educaționale.** Module, explicații, exemple.
- *Funcții:* șabloane de document; secțiuni tipizate; compilare per modul.

**8. Autori de serii de cărți și proiecte editoriale.** Continuitate între volume, arhive.
- *Funcții:* proiecte separate + Registrul cărții; sincronizare folder; echipă/istoric.

## Dificultățile transversale (ce ne obligă la design)

Din cercetarea 2025–2026 (aplicația de referință, Novelcrafter, Dabble, complaining threads) și din
directiva autorului:

1. **Complexitate în plus** — uneltele mature au curba de învățare abruptă → Help-ul
   (Help Finder Ctrl+Shift+H, empty states, What's New) trebuie să scurteze drumul, nu să
   documenteze complexitatea.
2. **Cloud obligatoriu / abonament** — Pneuma e local-first, dosare simple, fără cont.
3. **AI care rescrie fără control** — Pneuma: AI invizibil până e activat din Setări;
   propune, nu aplică niciodată singur; textul autorului e protejat (gardozi + audit).
4. **Frica de pierdere** — snapshot automat înainte de orice riscant; backup-uri; merge
   3-way la schimbări externe.

## Criterii de design pentru sistemul Help (pe profilul de mai sus)

- **Limbaj de scriitor, nu de programator:** „fișă", „capitol", „revizie" — nu „node", „format
  preset". Animațiile GIF arată mișcarea, nu statica.
- **Help Finder înțelege intenția** („cum revin la o versiune anterioară"), nu doar numele
  comenzilor; rezultate separate „Cum se face" vs „Comenzi".
- **Contextual help pe suprafețe:** Binder (pentru organizatori de volume), Inspector
  (metadate), Compile (pentru export curat) — mapeate pe `uiComponentIds` din schema articolelor.
- **Tips & Tricks pe fluxuri reale:** „structura unei cărți cu 40 de capitole", „cum țin lore-ul
  la zi într-o serie", „pregătesc manuscrisul pentru comisie".
- **Fără presupunerea că utilizatorul știe aplicația de referință** — paritatea se implementează, dar
  denumirile și ajutorul stau în limba scriitorului român.

## Regula de gardă

Orice funcție nouă, text nou de help sau tranșă din planul de paritate trece întâi prin
întrebarea: **„ce scriitor din profilul de mai sus o folosește și ce dificultate a lui
rezolvă?"** Dacă răspunsul e „filmul/regia", se amână — periferic, la cerere.
