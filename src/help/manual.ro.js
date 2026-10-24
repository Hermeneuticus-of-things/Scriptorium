// Manualul Scribner (română). Date structurate: [{ id, title, sections: [{ id, title, html }] }].
// Text propriu, scris pentru Scribner. Id-urile secțiunilor sunt unice în tot manualul
// și sunt folosite pentru ajutorul contextual (HelpWindow initialTopic).

const k = (s) => s.split('+').map((p) => `<kbd>${p}</kbd>`).join('+');

export const MANUAL_RO = [
  {
    id: 'start',
    title: 'Primii pași',
    sections: [
      {
        id: 'start-intro',
        title: 'Ce este Scribner',
        html: `<p>Scribner este un program pentru texte lungi: romane, non-ficțiune, teze, scenarii, volume de poezie. În loc de un singur fișier uriaș, lucrezi cu <strong>documente mici</strong> (scene, capitole, secțiuni) așezate într-un arbore numit <strong>binder</strong>. Le muți, le împarți și le unești liber, iar la final <strong>Compile</strong> le adună într-un singur manuscris (DOCX, PDF, EPUB și altele).</p>
<p>Programul e scris de la zero. Proiectele <code>.scriv</code> se pot importa fără pierderi și se pot exporta înapoi.</p>
<p>AI-ul este <strong>opțional</strong>: totul merge fără el, iar comutatorul din <em>Setări → AI</em> îl oprește complet.</p>`,
      },
      {
        id: 'start-window',
        title: 'Fereastra principală',
        html: `<p>Fereastra unui proiect are trei zone:</p>
<ul>
<li><strong>Binderul</strong> (stânga): arborele proiectului, cu dosarele rădăcină <em>Manuscris</em>, <em>Cercetare</em> și <em>Coș</em>. Se ascunde cu ${k('Ctrl+Shift+B')}.</li>
<li><strong>Zona de lucru</strong> (centru): editorul, corkboard-ul sau outline-ul pentru elementul selectat. Comuți cu ${k('Ctrl+1')}, ${k('Ctrl+2')}, ${k('Ctrl+3')} sau cu butoanele <em>Editor / Corkboard / Outline</em> din bara de sus.</li>
<li><strong>Inspectorul</strong> (dreapta): sinopsis, metadate, note, snapshot-uri, comentarii. Se arată și se ascunde cu ${k('Ctrl+Shift+I')}.</li>
</ul>
<p>Bara de sus e aerisită: ⌂ (închide proiectul), Înapoi/Înainte, titlul proiectului, comutatorul <em>Editor / Corkboard / Outline</em>, <em>Compile</em> și <em>Inspector</em>. Restul comenzilor sunt în meniuri: <em>Fișier, Editare, Vizualizare, Proiect, Documente, Navigare, Unelte, AI, Ajutor</em> (în aplicația desktop, în meniul nativ al ferestrei). Comenzile înrudite sunt grupate în submeniuri (▸), de exemplu <em>Fișier → Importă ▸ / Exportă ▸</em>; <em>Format</em> e un submeniu în <em>Editare</em>, iar <em>Fereastră</em> (layout-uri, ecran complet) unul în <em>Vizualizare</em>. Split-ul editorului e în <em>Vizualizare → Împarte editorul</em> (și pe bara documentului), Compunerea în <em>Vizualizare</em> (F11).</p>
<p><strong>Meniul AI</strong> adună tot ce ține de AI: <em>Asistent AI</em> (panoul), <em>I-REP / I-EDIT</em>, <em>AI pe selecție ▸</em> (cercetare, explică, corectează, traduce, răspuns din cercetarea proiectului), <em>AI pe toată cartea ▸</em> (sinopsis în bloc, consistență, revizie pe niveluri), <em>NotebookLM ▸</em>, <em>Setări AI…</em> și, în aplicația desktop, <em>Conectează la Claude (MCP)…</em>. Cu AI oprit, în meniu rămân doar <em>I-REP</em> (funcționează fără AI) și <em>Setări AI…</em> (ca să-l pornești din nou).</p>
<p><strong>Bara se personalizează</strong> din <em>Vizualizare → Personalizează bara de instrumente…</em>: pentru bara de sus și pentru bara de formatare vezi elementele disponibile și pe cele din bară; adaugi, scoți, reordonezi (tragere sau butoanele ↑/↓; în listă Alt+↑/↓), pui separatoare și spații flexibile, alegi afișarea (pictogramă și text / doar pictogramă / doar text) și poți reveni cu <em>Restabilește implicit</em>. Ce scoți din bară rămâne accesibil din meniuri. Bara de formatare mută automat în <em>»</em> ce nu încape pe un rând.</p>
<p>Lățimea panourilor se schimbă trăgând de marginea lor; programul ține minte layout-ul pentru fiecare proiect.</p>`,
      },
      {
        id: 'start-first-project',
        title: 'Primul proiect în cinci minute',
        html: `<ol>
<li>Pe ecranul <em>Acasă</em> alege un șablon (de exemplu <em>Roman</em>), scrie titlul și apasă <em>Creează</em>. Alegi apoi folderul în care se salvează proiectul.</li>
<li>În binder, selectează <em>Scena 1</em> din <em>Capitolul 1</em> și scrie.</li>
<li>Adaugă o scenă nouă cu ${k('Ctrl+N')} și un dosar (capitol) cu ${k('Ctrl+Shift+N')}.</li>
<li>Completează sinopsisul scenei în Inspector; apare pe fișa din corkboard (${k('Ctrl+2')}).</li>
<li>Când vrei să vezi cartea întreagă, apasă ${k('Ctrl+Shift+E')} (Compile), alege formatul și ieșirea (de exemplu Word) și salvează.</li>
</ol>
<p>Nu trebuie să salvezi manual: salvarea este automată. ${k('Ctrl+S')} salvează imediat.</p>
<p>Dacă vrei să înveți făcând, creează proiectul <strong>Tutorial Scribner</strong> din meniul <em>Ajutor → Tutorial interactiv</em>.</p>`,
      },
      {
        id: 'start-saving',
        title: 'Salvare, backup și fișierele proiectului',
        html: `<p>Un proiect este un folder <code>Nume.scribner</code> cu fișiere text simple:</p>
<pre>project.json           binder, etichete, statusuri, ținte, setări Compile
docs/&lt;id&gt;.html         textul fiecărui document
notes/&lt;id&gt;.html        notele documentelor
snapshots/&lt;id&gt;/*.json  snapshot-urile
media/                 imagini, PDF, audio, video</pre>
<p>Salvarea automată se face după câteva secunde de inactivitate (configurabil în <em>Setări → General</em>). Backup-urile automate (la închidere, la deschidere, la interval) se configurează în <em>Setări → Backup</em>; lista și restaurarea sunt în <em>Fișier → Backup-uri…</em>. O restaurare creează un proiect separat, nu suprascrie originalul.</p>
<p><em>Fișier → Salvează ca…</em> (${k('Ctrl+Shift+S')}) face o copie a proiectului cu alt nume.</p>`,
      },
    ],
  },
  {
    id: 'projects',
    title: 'Proiecte și șabloane',
    sections: [
      {
        id: 'projects-home',
        title: 'Ecranul Acasă',
        html: `<p>La pornire (sau după <em>Închide proiectul</em>) apare ecranul <em>Acasă</em>: proiecte recente (cu fixare la favorite și golirea listei), deschiderea unui proiect existent, importul unui proiect Scrivener și crearea unui proiect nou din șablon.</p>
<p>Opțiunea <em>Setări → General → La pornire, redeschide ultimul proiect</em> sare peste acest ecran.</p>`,
      },
      {
        id: 'projects-templates',
        title: 'Șabloane predefinite',
        html: `<p>Șabloanele sunt grupate pe categorii:</p>
<ul>
<li><strong>Generale:</strong> Gol.</li>
<li><strong>Ficțiune:</strong> Roman (capitole, fișe de personaje și locuri), Roman cu părți, Volum de povestiri, Povestire (format manuscris, cu pagină de titlu), Roman formatat (front matter și back matter).</li>
<li><strong>Non-ficțiune:</strong> Non-ficțiune, Eseu, Teză / lucrare de licență, Note de curs, Colecție de rețete.</li>
<li><strong>Scenariu:</strong> Scenariu de film, Piesă de teatru (cu Script Mode pregătit).</li>
<li><strong>Poezie:</strong> Volum de poezie.</li>
</ul>
<p>Unele șabloane au un dosar <em>Șabloane</em> în Cercetare (fișă personaj, fișă loc). Documentele din el nu intră în Compile și pot fi folosite cu <em>Document → Nou din șablon</em>.</p>`,
      },
      {
        id: 'projects-user-templates',
        title: 'Șabloanele tale',
        html: `<p><em>Fișier → Salvează ca șablon…</em> salvează proiectul curent (fără snapshot-uri și istoric) ca șablon, cu titlu, categorie, descriere și icoană. Apare pe ecranul <em>Acasă</em> în categoria aleasă (implicit <em>Ale mele</em>) și se poate șterge de acolo.</p>`,
      },
      {
        id: 'projects-properties',
        title: 'Proprietățile și setările proiectului',
        html: `<p><em>Proiect → Setările proiectului…</em> conține: titlul, autorul (prenume, nume), abrevierea titlului (folosită în antete), etichetele (nume, culoare), statusurile, metadatele personalizate (Text, Checkbox, Listă, Dată), tipurile de secțiune și atribuirea lor pe niveluri, formatarea implicită, lista de auto-completare, dosarul de șabloane și opțiuni de backup pentru proiect.</p>
<p>Datele autorului și titlul alimentează placeholder-ele din Compile (<code>&lt;$author&gt;</code>, <code>&lt;$surname&gt;</code>, <code>&lt;$abbr_title&gt;</code>…).</p>`,
      },
      {
        id: 'projects-windows',
        title: 'Mai multe ferestre și layout-uri',
        html: `<p><em>Fișier → Fereastră nouă</em> deschide încă o fereastră (pentru alt proiect). Un proiect se deschide într-o singură fereastră o dată.</p>
<p><em>Fereastră → Salvează layout-ul curent…</em> memorează panourile vizibile și lățimile lor; <em>Gestionează layout-urile…</em> le redenumește sau le șterge, iar fiecare layout salvat apare ca o comandă în meniul <em>Fereastră</em>. <em>Ecran complet</em>: ${k('Ctrl+Shift+F11')}.</p>`,
      },
    ],
  },
  {
    id: 'binder',
    title: 'Binder',
    sections: [
      {
        id: 'binder-basics',
        title: 'Manuscris, Cercetare, Coș',
        html: `<p>Binderul are trei dosare rădăcină care nu se pot șterge:</p>
<ul>
<li><strong>Manuscris</strong>: textul cărții. Doar ce e aici intră în Compile.</li>
<li><strong>Cercetare</strong>: fișe, note, surse, imagini, PDF-uri, pagini web.</li>
<li><strong>Coș</strong>: elementele șterse. <em>Document → Restaurează din coș</em> le pune la locul inițial; golirea coșului este definitivă.</li>
</ul>
<p>Elementele pot fi <strong>documente text</strong>, <strong>dosare</strong> și <strong>fișiere media</strong>. Un document text poate avea și el copii (document-container).</p>`,
      },
      {
        id: 'binder-organize',
        title: 'Organizare: creare, mutare, redenumire',
        html: `<ul>
<li>Document nou: ${k('Ctrl+N')}. Dosar nou: ${k('Ctrl+Shift+N')}. Elementul nou apare după cel selectat (în interior, dacă e dosar) și intră direct în redenumire: scrie titlul și apasă ${k('Enter')} pentru a trece cu cursorul în editor (${k('Esc')} rămâne în binder).</li>
<li>Redenumire: ${k('F2')} sau dublu-clic (comportamentul dublu-clicului se alege în <em>Setări → Comportament</em>).</li>
<li>Mutare: drag &amp; drop, inclusiv pentru o selecție multiplă; <kbd>Alt</kbd> în timpul tragerii copiază. Cu tastatura: ${k('Ctrl+↑')} / ${k('Ctrl+↓')} mută în sus/jos, ${k('Ctrl+→')} / ${k('Ctrl+←')} schimbă nivelul.</li>
<li>Selecție multiplă: ${k('Ctrl')}+clic și ${k('Shift')}+clic (sau ${k('Shift+↑')} / ${k('Shift+↓')}); ${k('Ctrl+săgeți')} mută toată selecția.</li>
<li>Navigare cu tastatura: ${k('↑')} / ${k('↓')} (și ${k('Home')} / ${k('End')}) trec la elementul anterior / următor; ${k('←')} restrânge dosarul sau urcă la părinte, ${k('→')} îl extinde sau coboară la primul copil. Tastarea primelor litere sare la elementul cu titlul respectiv. ${k('Enter')} trece în editor (sau creează un document, după <em>Setări → Comportament</em>), ${k('Esc')} întoarce cursorul în editor.</li>
<li>${k('Delete')} (sau ${k('Ctrl+Delete')}) mută selecția în coș, fără confirmare, iar selecția trece la elementul vecin. Ștergerea definitivă se face doar cu <em>Golește coșul</em>, care cere confirmare; <em>Document → Restaurează din coș</em> pune elementul înapoi la locul lui.</li>
<li>Anulare: cu binderul activ, ${k('Ctrl+Z')} anulează ultima adăugare, mutare, ștergere în coș sau restaurare; ${k('Ctrl+Y')} (sau ${k('Ctrl+Shift+Z')}) o reface. Modificările de metadate făcute între timp se păstrează. După o împărțire, unire sau golirea coșului istoricul se resetează.</li>
<li>La tragere, linia de deasupra / de dedesubt arată inserarea înainte / după, iar conturul arată inserarea în interior; un dosar restrâns se deschide singur dacă ții cursorul deasupra lui.</li>
<li><em>Document → Mută în…</em> mută selecția într-un dosar ales din listă.</li>
<li><em>Duplică</em> (${k('Ctrl+D')}) copiază documentul cu sub-documente; <em>Duplică doar elementul</em> îl copiază singur.</li>
<li><em>Convertește în dosar / în document text</em>, <em>Sortează conținutul</em> (A→Z, Z→A, după data creării) sunt în meniul <em>Document</em>.</li>
<li><em>Marchează ca separator</em> afișează elementul ca linie în binder.</li>
</ul>`,
      },
      {
        id: 'binder-hoist',
        title: 'Focus pe dosar, favorite, căutare în binder',
        html: `<p><em>Navigare → Focus pe dosar (hoist)</em> afișează în binder doar dosarul selectat; <em>Ieși din focus</em> revine la arborele complet. <em>Arată în binder</em> (${k('Ctrl+Alt+R')}) selectează în binder documentul deschis în editor.</p>
<p>Bifează <em>Favorit</em> în Inspector pentru ca documentul să apară în meniul <em>Navigare</em>. Câmpul de căutare din capul binderului filtrează după titlu.</p>
<p>Icoana unui element se schimbă din Inspector (set de icoane și culoare); culoarea etichetei se vede ca nuanță pe icoană.</p>`,
      },
      {
        id: 'binder-media',
        title: 'Fișiere media în Cercetare',
        html: `<p><em>Document → Adaugă fișiere în Cercetare</em> copiază imagini, PDF-uri, audio și video în <code>media/</code>. Ele se vizualizează direct în editor. <em>Deschide în editor extern</em> le deschide cu programul implicit al sistemului.</p>
<p>O imagine din Cercetare poate fi inserată la Compile prin placeholder-ul <code>&lt;$img:Nume&gt;</code> (vezi capitolul Compile).</p>`,
      },
    ],
  },
  {
    id: 'editor',
    title: 'Editor și formatare',
    sections: [
      {
        id: 'editor-basics',
        title: 'Scrierea textului',
        html: `<p>Editorul este un editor de text bogat. Bara de format (se ascunde din <em>Vizualizare → Arată / ascunde bara de format</em>) are stilurile, fontul și mărimea, bold/italic/subliniat/tăiat, superscript/subscript, majuscule mici, culoarea textului și highlight, aliniere, liste și comentarii.</p>
<p>Corecturi automate (configurabile în <em>Setări → Corecturi</em>): ghilimele românești „…”, liniuța — din <code>--</code>, … din trei puncte, majusculă la început de propoziție, fracții, înlocuiri proprii. Auto-completarea propune nume din lista proiectului.</p>
<p>${k('Ctrl+Shift+V')} lipește fără formatare (ia stilul textului din jur).</p>`,
      },
      {
        id: 'editor-paragraph',
        title: 'Paragrafe, riglă, tabele, imagini',
        html: `<ul>
<li>Interlinie, spațiu înainte/după, indent prima linie, stânga, dreapta: meniul <em>Paragraf</em> din bara de format.</li>
<li>Rigla (<em>Vizualizare → Arată rigla</em>) are indentări și tab stop-uri.</li>
<li>Liste cu buline și numerotate (1. / a. / A. / i. / I.).</li>
<li>Tabele: inserare, rânduri, coloane, margini.</li>
<li>Imagini: inserare, lățime (25–100% sau personalizată), aliniere.</li>
<li>Inserare: dată și oră, linie orizontală, salt de pagină, legătură, placeholder, caracter special.</li>
<li>Direcție de scriere dreapta-stânga per paragraf.</li>
<li>Selecție: paragraf / propoziție / cuvânt cu ${k('Ctrl+Alt+Shift+P')}, ${k('Ctrl+Alt+Shift+S')}, ${k('Ctrl+Alt+Shift+W')}.</li>
<li>Copiază / lipește formatarea: ${k('Ctrl+Alt+C')} / ${k('Ctrl+Alt+V')}.</li>
</ul>`,
      },
      {
        id: 'editor-split-merge',
        title: 'Împărțire și unire',
        html: `<p><em>Împarte documentul la cursor</em> (${k('Ctrl+K')}) creează un document nou cu textul de după cursor. <em>Împarte cu selecția ca titlu</em> (${k('Ctrl+Shift+K')}) folosește textul selectat ca titlu al documentului nou.</p>
<p><em>Unește documentele selectate</em> (${k('Ctrl+Shift+M')}) le combină în primul. Înainte de împărțire sau unire se face automat un snapshot.</p>
<p><em>Adaugă selecția la document…</em> trimite textul selectat la sfârșitul altui document.</p>`,
      },
      {
        id: 'editor-view',
        title: 'Vizualizare: zoom, pagină, focus',
        html: `<ul>
<li>Bara de jos a editorului arată cuvintele, caracterele, ținta documentului și zoom-ul.</li>
<li>Vizualizare pe pagini (A5/A4/Letter, față-verso).</li>
<li>Defilare tip mașină de scris: rândul curent rămâne la mijloc (<em>Setări → Editare</em>).</li>
<li>Caractere invizibile (spații, tab-uri, paragrafe), evidențierea rândului curent, estomparea restului textului.</li>
<li><strong>Focus lingvistic</strong>: <em>Vizualizare → Focus lingvistic</em> evidențiază substantivele sau verbele (euristic, fără AI).</li>
<li><em>Aspect text</em>: ascunde evidențierea comentariilor sau culorile reviziilor.</li>
</ul>`,
      },
      {
        id: 'editor-revisions',
        title: 'Mod revizie și modificări urmărite',
        html: `<p>Modul revizie colorează textul nou scris cu una din cinci culori (câte una pentru fiecare rundă). Culorile se pot elimina din bara de format.</p>
<p>La importul unui DOCX, modificările urmărite (inserări și ștergeri) devin marcaje de revizie, ștergerile apărând ca text tăiat. Exportul DOCX le scrie înapoi cu autor și dată.</p>`,
      },
      {
        id: 'editor-links',
        title: 'Legături, semne de carte, dicționar',
        html: `<p>Scrie <code>[[Titlu]]</code> pentru o legătură internă spre documentul din proiect cu acel titlu (nu contează majusculele și diacriticele; ajunge și începutul titlului, dacă e unic). Dacă niciun document nu se potrivește, aplicația îți propune să creezi documentul (în același dosar sau în dosarul ales, ținut minte pentru proiect) și să-l legi; <kbd>Esc</kbd> sau <em>Anulează</em> lasă textul așa cum l-ai scris. Legătura internă se poate alege și din bara de format. Legăturile externe se inserează și se editează din bara de format.</p>
<p>Cu <em>Setări → Editare → Adaugă automat legătura înapoi</em>, orice legătură nouă spre un document (Ctrl+L, <code>[[Titlu]]</code>, bara de format, lipire) adaugă documentul curent în bookmark-urile documentului țintă, nu în textul lui. În Inspector, sub bookmark-uri, lista <em>Legături către acest document</em> arată toate documentele care trimit la cel curent.</p>
<p>Semnele de carte în text și semnele de carte ale proiectului (<em>Proiect → Semne de carte ale proiectului…</em>) duc rapid la un loc anume.</p>
<p>Din meniul contextual sau din <em>Unelte</em>: caută cuvântul în dicționar sau sinonime (dexonline), pe Wikipedia sau cu Google; se deschide browserul.</p>
<p>Corectura ortografică folosește dicționarele sistemului (română și engleză, configurabile). Clic dreapta pe un cuvânt subliniat: sugestii, <em>Adaugă în dicționar</em>, <em>Ignoră</em>. <em>Unelte → Verifică ortografia acum</em> reverifică documentul.</p>`,
      },
    ],
  },
  {
    id: 'styles',
    title: 'Stiluri',
    sections: [
      {
        id: 'styles-basics',
        title: 'Stiluri de paragraf și de caracter',
        html: `<p>Stilurile dau nume formatărilor repetate: <em>Titlu 1</em>, <em>Citat</em>, <em>Emfază</em> etc. Există stiluri de paragraf, de caracter și combinate. Se aplică din lista de stiluri a barei de format.</p>
<p><em>Format → Stiluri…</em> (sau <em>Proiect → Stiluri…</em>) deschide panoul în care creezi, redenumești și ștergi stiluri, redefinești un stil din selecție, alegi stilul următor (aplicat după Enter) și dai fiecărui stil o scurtătură.</p>`,
      },
      {
        id: 'styles-compile',
        title: 'Stiluri la import și la Compile',
        html: `<p>Stilurile pot fi importate dintr-un alt proiect Scribner (butonul din panoul de stiluri). La importul din Scrivener, stilurile din proiect se păstrează.</p>
<p>La Compile, textul cu stil păstrează numele stilului (de exemplu în DOCX), astfel încât în Word poți modifica aspectul tuturor citatelor dintr-o dată.</p>`,
      },
    ],
  },
  {
    id: 'comments',
    title: 'Comentarii și note',
    sections: [
      {
        id: 'comments-comments',
        title: 'Comentarii',
        html: `<p>Selectează textul și apasă butonul de comentariu din bara de format. Comentariul se leagă de text și apare în Inspector, cu culoare, autor și dată. Din Inspector poți sări la text, edita sau șterge comentariul.</p>
<p>Adnotările sunt text colorat direct în corpul documentului. Ambele se pot converti una în alta. Nici comentariile, nici adnotările nu ajung în cartea compilată (comentariile pot fi exportate ca comentarii Word în DOCX).</p>`,
      },
      {
        id: 'comments-footnotes',
        title: 'Note de subsol',
        html: `<p>Notele de subsol se inserează din bara de format. Nota apare ca marcaj în text; dublu-clic o editează. Notele pot fi și legate (afișate în Inspector), cu conversie între forme.</p>
<p>La Compile, fila <em>Note</em> alege: note de subsol, note la finalul fiecărui capitol sau la finalul cărții.</p>`,
      },
      {
        id: 'comments-notes',
        title: 'Notele documentului și notele proiectului',
        html: `<p>Fiecare document are o zonă de <strong>note</strong> în Inspector, separată de text, care nu intră în Compile. <strong>Notele proiectului</strong> (<em>Proiect → Note proiect (file)…</em>) sunt comune întregului proiect și pot avea mai multe file.</p>`,
      },
      {
        id: 'comments-find-format',
        title: 'Căutare după formatare',
        html: `<p>${k('Ctrl+Alt+F')} caută în document după tip de formatare: comentarii, note, adnotări, highlight, culoare de text, revizii, stil, semne de carte.</p>`,
      },
    ],
  },
  {
    id: 'scrivenings',
    title: 'Scrivenings, split, Quick Reference, compunere',
    sections: [
      {
        id: 'scrivenings-basics',
        title: 'Scrivenings: mai multe documente ca un singur text',
        html: `<p>Când selectezi un dosar în modul Editor, documentele lui apar unul sub altul, ca un text continuu, pe care îl poți edita direct. Fiecare modificare se salvează în documentul ei.</p>
<p>Poți vedea astfel și o selecție (<em>Vizualizare → Scrivenings pentru selecție</em>) sau colecția activă. Titlurile și separatoarele dintre documente se ascund sau se arată din <em>Vizualizare</em>.</p>`,
      },
      {
        id: 'scrivenings-split',
        title: 'Editorul împărțit (split)',
        html: `<p><em>Vizualizare → Împarte editorul</em> (sau butonul de pe antetul documentului) deschide al doilea panou. ${k('Alt')}+clic în binder deschide documentul în panoul din dreapta. Panoul poate fi blocat pe un document, așezat orizontal sau vertical (<em>Vizualizare → Împarte orizontal / vertical</em>) și inversat (<em>Inversează panourile</em>). Același document poate fi deschis în ambele panouri.</p>`,
      },
      {
        id: 'scrivenings-quickref',
        title: 'Quick Reference',
        html: `<p>${k('Ctrl+Shift+R')} deschide documentul curent într-o fereastră mică, plutitoare, pe care o poți ține deschisă lângă text (o fișă de personaj, un plan). Poți deschide mai multe.</p>
<p><strong>Panoul de referință</strong>: <em>Vizualizare → Deschide ca referință</em> sau Alt+Shift+clic în binder pune un document într-un panou lângă editor (și lângă split). E doar pentru citire; bifa <em>Editabil</em> permite modificarea. Poziția de derulare se păstrează, iar panoul se salvează cu proiectul și în layout-uri.</p>`,
      },
      {
        id: 'scrivenings-composition',
        title: 'Modul compunere',
        html: `<p>${k('F11')} ascunde tot în afară de text. Fundalul (culoare sau imagine), lățimea textului, opacitatea paginii și pagina de hârtie se aleg în <em>Setări → Aspect</em>. <em>Inspector plutitor</em> afișează metadatele în modul compunere. ${k('Esc')} sau ${k('F11')} iese.</p>`,
      },
      {
        id: 'scrivenings-nav',
        title: 'Navigare',
        html: `<ul>
<li>Înapoi / Înainte: ${k('Alt+←')} / ${k('Alt+→')}.</li>
<li>Documentul anterior / următor din binder: ${k('Ctrl+Alt+↑')} / ${k('Ctrl+Alt+↓')}.</li>
<li>Mergi la… (căutare după titlu): ${k('Ctrl+G')}.</li>
<li><em>Navigare → Dosarul părinte</em>, favorite.</li>
</ul>`,
      },
    ],
  },
  {
    id: 'corkboard',
    title: 'Corkboard',
    sections: [
      {
        id: 'corkboard-basics',
        title: 'Fișe pe panou',
        html: `<p>${k('Ctrl+2')} arată conținutul dosarului selectat ca fișe: titlu și sinopsis (sau imaginea de sinopsis). Trage fișele pentru a schimba ordinea; ordinea se aplică imediat în binder. Dublu-clic pe titlu deschide documentul în editor; clic în sinopsis îl editează.</p>
<p>Tastatura: clic pe o fișă o selectează; săgețile trec de la o fișă la alta, ${k('Enter')} (sau ${k('F2')}) editează titlul, ${k('Ctrl+Enter')} deschide documentul, ${k('Ctrl+←')} / ${k('Ctrl+→')} mută fișa. <em>+ Fișă</em> adaugă o fișă după cea selectată, direct cu titlul în editare.</p>
<p>Fișele arată culoarea etichetei, ștampila de status, cuvintele cheie și pionezele, după opțiuni.</p>`,
      },
      {
        id: 'corkboard-options',
        title: 'Opțiuni: mărime, freeform, aranjare',
        html: `<ul>
<li>Mărimea fișelor, raportul, spațierea și numărul de coloane se aleg din bara corkboard-ului.</li>
<li><strong>Freeform</strong>: așezi fișele oriunde pe panou; <em>Fixează ordinea</em> transferă ordinea vizuală în binder.</li>
<li>Aranjare pe linii după etichetă, status sau cuvânt cheie.</li>
<li>Selectând mai multe dosare, corkboard-ul le afișează pe secțiuni.</li>
<li>Aspectul fișelor (în <em>Opțiuni</em>): colțuri rotunjite sau drepte, fișe liniate, fișa colorată după etichetă.</li>
</ul>`,
      },
    ],
  },
  {
    id: 'outline',
    title: 'Outline',
    sections: [
      {
        id: 'outline-basics',
        title: 'Vederea de tip tabel',
        html: `<p>${k('Ctrl+3')} arată conținutul dosarului ca listă ierarhică, cu coloane: titlu și sinopsis, etichetă, status, Include în Compile, cuvinte, caractere, țintă și progres, date create/modificat, cuvinte cheie, tip de secțiune, metadate personalizate, total cuvinte.</p>
<p>Coloanele vizibile se aleg din meniul coloanelor. Sortezi cu clic pe capul coloanei, muți rânduri prin drag &amp; drop, extinzi sau restrângi tot. Clic selectează un rând, dublu-clic îl deschide în editor; ${k('↑')} / ${k('↓')} navighează, ${k('←')} / ${k('→')} restrâng / extind, ${k('Enter')} (sau ${k('F2')}) editează titlul pe loc, ${k('Ctrl+Enter')} deschide documentul.</p>`,
      },
    ],
  },
  {
    id: 'inspector',
    title: 'Inspector și metadate',
    sections: [
      {
        id: 'inspector-basics',
        title: 'Ce conține Inspectorul',
        html: `<p>Pentru documentul selectat, Inspectorul are: <strong>sinopsis</strong> (text sau imagine), <strong>etichetă</strong>, <strong>status</strong>, <strong>Include în Compile</strong>, <strong>tip de secțiune</strong>, <strong>cuvinte cheie</strong>, <strong>metadate personalizate</strong>, ținta documentului, datele de creare și modificare, icoana, favorit, <strong>note</strong>, <strong>semne de carte</strong>, <strong>snapshot-uri</strong>, <strong>comentarii și note de subsol</strong>.</p>
<p>Lacătul din Inspector îl blochează pe documentul curent în timp ce navighezi în altă parte.</p>`,
      },
      {
        id: 'inspector-labels',
        title: 'Etichete, statusuri, cuvinte cheie',
        html: `<p>Etichetele (cu culori) și statusurile se definesc în <em>Setările proiectului</em>. Implicit: etichete <em>Idee, Personaj, Loc</em>; statusuri <em>De făcut, Prima ciornă, Revizuit, Final</em>.</p>
<p><em>Proiect → Cuvinte cheie…</em> gestionează cuvintele cheie ale proiectului (culori, ierarhie) și caută documentele care au un anumit cuvânt.</p>
<p><em>Document → Sinopsis automat din primele fraze</em> completează sinopsisul fără AI.</p>`,
      },
      {
        id: 'inspector-metadata',
        title: 'Metadate personalizate și tipuri de secțiune',
        html: `<p>Câmpurile personalizate (Text, Checkbox, Listă, Dată) se definesc în <em>Setările proiectului</em> și apar în Inspector și ca coloane în Outline. Cronologia folosește câmpuri numite de exemplu <em>Data</em>, <em>Ora</em>, <em>Loc</em>, <em>POV</em>.</p>
<p><strong>Tipurile de secțiune</strong> (Capitol, Scenă, Parte…) spun Compile-ului cum arată fiecare document. Se atribuie automat pe niveluri (dosare, containere, fișiere) sau manual în Inspector.</p>`,
      },
    ],
  },
  {
    id: 'snapshots',
    title: 'Snapshot-uri',
    sections: [
      {
        id: 'snapshots-basics',
        title: 'Versiuni ale unui document',
        html: `<p>Un snapshot este o copie datată a textului unui document. ${k('Ctrl+5')} face un snapshot al documentului curent; <em>Document → Snapshot pentru documentele selectate</em> face pentru mai multe.</p>
<p>Snapshot-uri automate se fac înainte de împărțire, unire, înlocuire în proiect, sincronizare și înainte de orice scriere a unui agent MCP.</p>`,
      },
      {
        id: 'snapshots-compare',
        title: 'Comparare și restaurare',
        html: `<p>În Inspector, fila Snapshot-uri: vezi textul, compară cu textul curent sau între două snapshot-uri (diff colorat), redenumește, șterge, restaurează. La comparare alegi nivelul: pe cuvinte, pe sintagme (până la virgulă), pe fraze sau pe paragrafe; nivelurile mari arată mai limpede o rescriere amplă. Restaurarea face mai întâi snapshot textului curent, deci nu pierzi nimic.</p>`,
      },
    ],
  },
  {
    id: 'search',
    title: 'Căutare și colecții',
    sections: [
      {
        id: 'search-doc',
        title: 'Căutare în document',
        html: `<p>${k('Ctrl+F')} deschide bara de căutare și înlocuire în documentul curent, cu evidențiere și Următorul / Anteriorul.</p>`,
      },
      {
        id: 'search-project',
        title: 'Caută și înlocuiește în proiect',
        html: `<p>${k('Ctrl+Shift+F')} caută în tot proiectul, cu expresii regulate, cuvinte întregi, majuscule și opțiunea de a include coșul. Înlocuirea poate atinge și titluri, sinopsis și note; se face snapshot automat înainte.</p>`,
      },
      {
        id: 'search-advanced',
        title: 'Căutare avansată',
        html: `<p><em>Editare → Căutare avansată…</em> caută în câmpuri anume (titlu, text, note, sinopsis, metadate, cuvinte cheie) cu filtre după etichetă, status și altele. O căutare se poate salva ca <strong>colecție de căutare</strong>, care se actualizează singură.</p>`,
      },
      {
        id: 'search-collections',
        title: 'Colecții',
        html: `<p>Colecțiile sunt file deasupra binderului cu liste de documente (de exemplu „De revizuit”, „Scenele Anei”). Le creezi, redenumești, colorezi, adaugi sau scoți documente. Un document poate fi în mai multe colecții fără să fie mutat. <em>Scrivenings pentru colecția activă</em> le afișează ca text continuu; Compile poate filtra după colecție.</p>`,
      },
    ],
  },
  {
    id: 'targets',
    title: 'Ținte și statistici',
    sections: [
      {
        id: 'targets-project',
        title: 'Ținte de proiect și de sesiune',
        html: `<p><em>Proiect → Ținte și termen limită…</em>: ținta cărții (cuvinte, caractere sau pagini), ținta sesiunii, termenul limită și zilele de scris (sesiunea zilnică se calculează din ce a rămas), resetarea sesiunii (la miezul nopții sau la deschidere), numărarea doar a textului inclus în Compile, notificare la atingere.</p>`,
      },
      {
        id: 'targets-document',
        title: 'Ținta documentului',
        html: `<p>În Inspector setezi ținta unui document, în cuvinte sau caractere. Progresul apare în bara de jos a editorului și în coloana <em>Progres</em> din Outline.</p>
<p>Când selectezi text în editor, bara de jos arată și câte cuvinte și caractere are selecția.</p>`,
      },
      {
        id: 'targets-stats',
        title: 'Statistici și istoricul scrisului',
        html: `<p><em>Proiect → Statistici…</em> (${k('Ctrl+Alt+Shift+I')}): cuvinte, caractere, pagini estimate pentru tot proiectul, pentru Compile sau pentru selecție; frecvența cuvintelor, lungimea frazelor, distribuția părților de vorbire (euristic).</p>
<p><em>Proiect → Istoricul scrisului…</em>: grafic zilnic și lunar, serie de zile, export CSV. Istoricul importat din Scrivener este marcat separat.</p>`,
      },
    ],
  },
  {
    id: 'compile',
    title: 'Compile',
    sections: [
      {
        id: 'compile-basics',
        title: 'Cum funcționează Compile',
        html: `<p>${k('Ctrl+Shift+E')} deschide fereastra Compile. Aici alegi trei lucruri:</p>
<ol>
<li><strong>Formatul</strong> (lista din stânga): cum arată cartea. Predefinite: Manuscris standard, Carte tipărită (paperback), E-book, Modern, Citire PDF A5, Implicit, Times New Roman (dublu spațiat), Courier (manuscris clasic).</li>
<li><strong>Ieșirea</strong>: Word (.docx), PDF, EPUB, HTML, RTF, OpenDocument (.odt), Markdown, MultiMarkdown, Text simplu, Fountain, Final Draft (.fdx), LaTeX, Tipărire (previzualizare).</li>
<li><strong>Conținutul</strong>: ce documente intră.</li>
</ol>
<p>Formatele predefinite nu se modifică: apasă <em>Duplică</em> și editează copia. <em>Salvează global</em> face formatul disponibil în toate proiectele (🌐). Previzualizarea arată rezultatul înainte de salvare.</p>`,
      },
      {
        id: 'compile-content',
        title: 'Fila Conținut',
        html: `<p>Alegi dosarul compilat (tot Manuscrisul sau doar un sub-dosar), filtrezi după etichetă, status sau colecție și bifezi/debifezi documentele. Bifa este aceeași cu <em>Include în Compile</em> din Inspector. Front matter și back matter se aleg din dosare din Cercetare.</p>`,
      },
      {
        id: 'compile-sections',
        title: 'Secțiuni și separatoare',
        html: `<p>Fila <em>Secțiuni</em> leagă fiecare <strong>tip de secțiune</strong> de un aspect: titlu afișat sau nu, prefix și sufix (de exemplu <code>Capitolul &lt;$n&gt;</code>), majuscule, aliniere, text inclus, salt de pagină înainte.</p>
<p>Fila <em>Separatoare</em> alege ce se pune între documente: text (de exemplu <code>***</code>), pagină nouă, rând gol sau nimic, separat pentru text, dosare și între tipuri diferite.</p>`,
      },
      {
        id: 'compile-placeholders',
        title: 'Substituenți',
        html: `<p>Substituenții sunt coduri de forma <code>&lt;$nume&gt;</code> înlocuite la Compile. Funcționează în prefixe/sufixe, antete și subsoluri și în text. Lista completă, cu explicații, este în fila <strong>Placeholders</strong> a acestei ferestre de ajutor. Cele mai folosite:</p>
<ul>
<li><code>&lt;$n&gt;</code>: numărul secțiunii (1, 2, 3…); cu format: <code>&lt;$n:roman&gt;</code> (IV), <code>&lt;$n:lroman&gt;</code> (iv), <code>&lt;$n:words&gt;</code> (patru), <code>&lt;$n:Words&gt;</code> (Patru), <code>&lt;$n:WORDS&gt;</code>.</li>
<li><code>&lt;$t&gt;</code>: titlul documentului; <code>&lt;$wc&gt;</code>: cuvintele.</li>
<li><code>&lt;$projecttitle&gt;</code>, <code>&lt;$abbr_title&gt;</code>, <code>&lt;$author&gt;</code>, <code>&lt;$surname&gt;</code>, <code>&lt;$forename&gt;</code>.</li>
<li><code>&lt;$date&gt;</code>, <code>&lt;$year&gt;</code>.</li>
<li><code>&lt;$p&gt;</code>: numărul paginii, doar în antet și subsol.</li>
<li><code>&lt;$t&gt;</code> în antet sau subsol: titlul capitolului de pe pagina respectivă (în PDF și Word).</li>
<li><code>&lt;$subtitle&gt;</code>: subtitlul cărții.</li>
<li><code>&lt;$img:Nume&gt;</code>: imaginea din Cercetare cu acel titlu sau nume de fișier.</li>
</ul>
<p>Un placeholder necunoscut rămâne ca text, ca să-l observi.</p>`,
      },
      {
        id: 'compile-replacements',
        title: 'Înlocuiri și transformări',
        html: `<p>Fila <em>Înlocuiri</em> are o listă de perechi <em>Caută → Înlocuiește cu</em> aplicate doar textului compilat (proiectul nu se schimbă), cu opțiuni Regex, Cuvânt întreg, Majuscule. Exemplu: numele de lucru al unui personaj înlocuit cu numele final.</p>
<p><em>Transformări</em>: conversia ghilimelelor, a liniuțelor, eliminarea highlight-ului și a culorilor textului.</p>`,
      },
      {
        id: 'compile-notes',
        title: 'Note și comentarii la Compile',
        html: `<p>Fila <em>Note</em>: notele devin note de subsol, note la finalul fiecărui capitol sau la finalul cărții. Comentariile se elimină sau, doar pentru DOCX, se exportă ca comentarii Word. Adnotările din text nu ajung niciodată în carte.</p>
<p><em>Numerotarea notelor</em>: 1, 2, 3 · i, ii, iii · a, b, c · simboluri (*, †, ‡, §). <em>Reia numerotarea la fiecare capitol</em> începe din nou la fiecare capitol care pornește pe pagină nouă (în DOCX, fiecare capitol devine o secțiune Word). În RTF și ODT se aplică doar formatul.</p>
<p><strong>Păstrează formatarea</strong> (<em>Format → Păstrează formatarea</em>): blocul marcat cu chenar punctat iese la Compile exact cum e scris, fără înlocuiri, ghilimele sau linii de dialog, fără alineatul și spațierea formatului, cu fontul și mărimea proprii.</p>`,
      },
      {
        id: 'compile-page',
        title: 'Pagina: mărime, margini, antet, subsol',
        html: `<p>Fila <em>Pagină</em>: mărimea (A4, A5, Letter, 6 × 9 in, 5 × 8 in, 5,5 × 8,5 in sau personalizată), marginile, fontul și mărimea, interlinia, antetul și subsolul (stânga / centru / dreapta), diferite pe prima pagină și pe paginile pare/impare. Exemplu de antet de manuscris: <code>&lt;$surname&gt; / &lt;$abbr_title&gt; / &lt;$p&gt;</code>.</p>
<p>Pentru tipărirea unui singur document folosește <em>Fișier → Configurare pagină…</em>, <em>Previzualizare tipărire</em> și <em>Tipărește documentul…</em> (${k('Ctrl+P')}).</p>`,
      },
      {
        id: 'compile-epub',
        title: 'EPUB și metadate',
        html: `<p>Fila <em>Metadate</em>: titlu, autor, ISBN, limbă, cuvinte cheie și coperta (o imagine din Cercetare). EPUB 3 are pagină de titlu, cuprins generat din titluri și note reale. Pentru Kindle, trimite fișierul EPUB prin serviciile Amazon (formatul KPF este închis).</p>`,
      },
      {
        id: 'compile-other-exports',
        title: 'LaTeX, Pandoc, MultiMarkdown',
        html: `<p>În meniul <em>Fișier</em> există și exporturi directe: <em>Exportă LaTeX…</em>, <em>Exportă Pandoc Markdown…</em> (cu antet YAML și bibliografie) și <em>Exportă MultiMarkdown…</em>. Citările de tip <code>[@cheie]</code> funcționează cu bibliografia importată.</p>`,
      },
    ],
  },
  {
    id: 'import',
    title: 'Import/export, Scrivener .scriv, sincronizare',
    sections: [
      {
        id: 'import-files',
        title: 'Importul fișierelor',
        html: `<p><em>Fișier → Importă Word / text / Markdown…</em> importă .docx, .rtf, .odt, .txt, .md (și .html, .fountain, .fdx în aplicația desktop) și poate împărți textul în documente: la fiecare Titlu 1, la Titlu 1 și 2, sau la un rând-separator ales (implicit <code>#</code>).</p>
<p>Alte importuri: <em>Importă fișiere (RTF, ODT, HTML, Fountain, media)…</em>, <em>Importă OPML…</em>, <em>Importă pagină web…</em> (salvată offline în Cercetare, cu imagini), <em>Importă bibliografie (Zotero BibTeX / CSL-JSON)…</em>, <em>Importă pachet de proiect…</em>.</p>`,
      },
      {
        id: 'import-scrivener',
        title: 'Proiecte Scrivener (.scriv)',
        html: `<p>Din ecranul <em>Acasă</em>, importă un proiect Scrivener 1, 2 sau 3. Se preiau: binderul, textul (cu formatare, liste, tabele, imagini), comentarii, note de subsol, adnotări, legături, stiluri, note, sinopsis, etichete, statusuri, cuvinte cheie, metadate, tipuri de secțiune, ținte, colecții, semne de carte, snapshot-uri, istoricul scrisului și media.</p>
<p>O copie completă a originalului rămâne în <code>scrivener-original/</code>, iar la final apare un <strong>raport de import</strong> cu ce s-a convertit. Proiectul Scrivener original nu este modificat.</p>
<p><em>Fișier → Exportă ca proiect Scrivener (.scriv)…</em> scrie proiectul înapoi în format Scrivener.</p>`,
      },
      {
        id: 'import-export',
        title: 'Export de documente',
        html: `<p><em>Fișier → Exportă documente / OPML / CSV…</em> scrie documentele ca DOCX, RTF, ODT, TXT sau Markdown, păstrând structura de foldere, opțional cu note și metadate; sau exportă structura ca OPML ori metadatele ca CSV.</p>
<p><em>Pachet pentru editor…</em> pregătește un folder cu manuscrisul și materialele pentru un redactor. <em>Exportă pachet pentru web / mobil…</em> creează un pachet pentru versiunea web.</p>`,
      },
      {
        id: 'import-sync',
        title: 'Sincronizare cu un folder extern',
        html: `<p><em>Fișier → Sincronizează cu folder extern: scrie…</em> scrie documentele într-un folder (Dropbox, Drive etc.) ca RTF, TXT, Markdown, FDX sau Fountain, cu formate separate pentru Manuscris și note. Editează fișierele pe alt dispozitiv, apoi <em>citește modificările</em> le aduce înapoi; se face snapshot înainte. Sincronizarea poate fi automată la deschidere și închidere.</p>
<p>Fiindcă proiectul e făcut din fișiere text, îl poți versiona cu git sau ține într-un folder sincronizat. Nu deschide același proiect simultan pe două calculatoare.</p>`,
      },
    ],
  },
  {
    id: 'script',
    title: 'Script Mode',
    sections: [
      {
        id: 'script-basics',
        title: 'Scenarii, piese, benzi desenate',
        html: `<p><em>Format → Mod scenariu</em> transformă editorul pentru scenarii. Formate: <strong>Scenariu de film</strong>, <strong>Piesă de teatru</strong>, <strong>Piesă de teatru (UK)</strong>, <strong>Benzi desenate</strong>, <strong>Teatru radiofonic (BBC)</strong>. <em>Mod scenariu: dezactivat</em> revine la proză.</p>
<p>Fiecare paragraf are un <strong>element</strong> (titlu de scenă, acțiune, personaj, dialog…), cu propria așezare în pagină.</p>`,
      },
      {
        id: 'script-keys',
        title: 'Tab și Enter',
        html: `<p><kbd>Tab</kbd> schimbă elementul paragrafului curent (de exemplu din Acțiune în Personaj); ${k('Shift+Tab')} merge înapoi. <kbd>Enter</kbd> creează paragraful următor cu elementul potrivit (după Personaj vine Dialog, după Dialog vine Personaj). Tabelul complet pentru fiecare format este în fila <strong>Sintaxă</strong>.</p>
<p>Numele personajelor și titlurile de scenă (INT./EXT.) se completează automat.</p>`,
      },
      {
        id: 'script-export',
        title: 'Export Final Draft și Fountain',
        html: `<p><em>Fișier → Exportă scenariu Final Draft (.fdx)…</em> și <em>Exportă scenariu Fountain…</em> (active când modul scenariu este pornit). Compile are și ieșirile Fountain și FDX. Fișierele .fdx și .fountain se pot și importa.</p>`,
      },
    ],
  },
  {
    id: 'tools',
    title: 'Unelte',
    sections: [
      {
        id: 'tools-names',
        title: 'Generator de nume',
        html: `<p><em>Unelte → Generator de nume…</em> propune nume după cultură (sau amestec), gen și format (prenume și nume, doar prenume, doar nume de familie). Fiecare nume se poate copia sau insera în text; <em>Generează din nou</em> dă altă listă.</p>`,
      },
      {
        id: 'tools-scratchpad',
        title: 'Ciorne (Scratchpad)',
        html: `<p><em>Unelte → Ciorne (Scratchpad)</em> este un carnet global, independent de proiect, pentru idei rapide. O notă poate fi trimisă în proiectul deschis.</p>`,
      },
      {
        id: 'tools-speech',
        title: 'Citire cu voce tare și dictare',
        html: `<p><em>Unelte → Citire cu voce tare / Dictare</em> deschide o bară care citește documentul (sau selecția) cu vocile sistemului și poate transcrie dictarea în text, acolo unde sistemul o permite.</p>`,
      },
      {
        id: 'tools-timeline',
        title: 'Cronologie',
        html: `<p><em>Vizualizare → Cronologie</em> așază scenele pe o axă a timpului. Data se ia din metadatele personalizate (câmpuri ca <em>Data</em>, <em>Ora</em>, <em>Durata</em>, <em>Loc</em>, <em>POV</em>) sau din rânduri de tipul <code>Data: …</code> în sinopsis.</p>`,
      },
      {
        id: 'tools-relations',
        title: 'Hartă de relații',
        html: `<p><em>Vizualizare → Hartă de relații</em> arată personajele care apar împreună în aceleași scene. Numele sunt ghicite din cuvintele scrise cu majusculă care apar în mai multe documente; lista poate fi corectată.</p>`,
      },
      {
        id: 'tools-pacing',
        title: 'Analiză de ritm',
        html: `<p><em>Vizualizare → Analiză de ritm</em> arată, scenă cu scenă, lungimea, proporția de dialog și lungimea frazelor, fără AI. Ajută la găsirea porțiunilor prea lente sau prea grăbite.</p>`,
      },
      {
        id: 'tools-research',
        title: 'Cercetare în proiect și glosare',
        html: `<p><em>Unelte → Cercetare în proiect (RAG)</em> caută pasaje relevante pentru o întrebare în tot proiectul, local. Cu AI pornit, poate și formula un răspuns cu trimiteri la documente.</p>
<p><em>Unelte → Generează glosare și cuprins de tipar</em> creează documente cu glosarul termenilor și cuprinsul pentru tipar.</p>`,
      },
    ],
  },
  {
    id: 'irep',
    title: 'Revizie I-REP/I-EDIT și profiluri',
    sections: [
      {
        id: 'irep-basics',
        title: 'I-REP: verificare, reparare, reverificare',
        html: `<p>Meniul <em>AI → I-REP / I-EDIT</em> (cu AI oprit: <em>AI → I-REP</em>) deschide panoul editorial. <strong>I-REP</strong> verifică documentul după regulile profilului, listează problemele pe niveluri de gravitate (GRAVE, MEDIU, MINOR), aplică reparațiile sigure și reverifică, în bucle, până nu mai găsește nimic de reparat automat.</p>
<p>I-REP funcționează complet fără AI. Cu AI pornit, o buclă suplimentară poate propune reparații pentru ce nu se poate corecta mecanic.</p>`,
      },
      {
        id: 'irep-iedit',
        title: 'I-EDIT: runde editoriale',
        html: `<p><strong>I-EDIT</strong> (necesită AI) rulează runde editoriale succesive (structură, completitudine, voce, ritm etc.), fiecare cu propriul scop. Rezultatul fiecărei runde se vede înainte de a fi aplicat; se face snapshot înainte.</p>`,
      },
      {
        id: 'irep-profiles',
        title: 'Profiluri: Generic și Română',
        html: `<p>Profilul se alege în <em>Setări → AI → Profil editorial</em>:</p>
<ul>
<li><strong>Generic</strong> (implicit): orice text; verifică tipografia (spații, ghilimele, liniuțe, puncte de suspensie) și reziduurile tipice textelor generate de modele de limbaj.</li>
<li><strong>Română</strong>: aplică DOOM III, protocoalele P1–P13 și rundele R0–R11, plus regulile pentru termeni străini.</li>
</ul>
<p>Opțional: limita de cuvinte pe document, verificarea primei linii „Cap. N / Secț. N / Subcap. N” și a notei finale de navigare. Profilul se salvează în proiect, deci fiecare carte poate avea regulile ei.</p>`,
      },
      {
        id: 'irep-near',
        title: 'Repetiții apropiate (S70)',
        html: `<p>Panoul are secțiunea <em>Repetiții apropiate (S70)</em>: același cuvânt cu conținut (aceeași lemă sau formă) în aceeași frază sau în două fraze vecine, inclusiv anadiploza „…scutul. Scutul…”. Câte un rând <code>⚠ REP L&lt;n&gt; «formă» ×k</code> pe fiecare paragraf (L = numărul paragrafului în document) unde grupul are apariții; un clic selectează apariția în editor.</p>
<p>Nu se numără cuvintele-unealtă (pronume, prepoziții, conjuncții, numerale, auxiliare), locuțiunile („în fața”, „pe lângă”, „de-a lungul”…), iar reduplicatele („pas cu pas”, „zi de zi”) contează o singură apariție. Termenii cărții („faptă”, „karma”, „urmă”) se numără.</p>
<p>Este un <strong>semnal</strong>, nu o problemă: nu oprește bucla, nu se repară automat și nu ajunge în promptul de reparare. Regula S70: termenul nu se schimbă doar ca să nu se repete. Lista intră doar la runda <strong>R8b Cuvântul și litera</strong> din I-EDIT, unde cititorul judecă dacă repetiția supără.</p>`,
      },
      {
        id: 'irep-author',
        title: 'Textul tău: editare în propunere și protecția paragrafelor tale',
        html: `<p>Ce scrii tu de mână e decizie. Paragrafele pe care le schimbi în editor devin <strong>text al autorului</strong> (după câteva secunde de pauză) și fiecare salvare se notează în <code>editorial/MODIFICARI_AUTOR.jsonl</code>, câte un rând pe bucată schimbată: document, rând, vechi, nou, oră, hash-uri.</p>
<p>În propunerea I-REP / I-EDIT, <em>✎ Editează</em> îți arată textul propus ca să-l corectezi tu; <em>Salvează</em> face întâi un snapshot <code>.bak-autor-&lt;dată-oră&gt;</code>. Salvarea e refuzată dacă documentul s-a schimbat între timp (409) sau dacă textul nou e sub 20% din cel vechi (412, cu <em>Salvează oricum</em>). Paragrafele scrise de tine acolo devin și ele text al autorului.</p>
<p>Bucla nu rescrie textul autorului: poarta <code>fraza_autor_atinsa</code> respinge orice rezultat care îl schimbă, îl mută sau îl șterge, fără excepție, și îți arată rândul și motivul. Modelul primește paragrafele tale în secțiunea „TEXT AL AUTORULUI (doar semnalezi)”. Problemele care cad pe ele vin la tine în <em>COADA_AUTOR</em>; cele de pe paragrafele vecine merg la reparare cu nota „leagă de textul autorului, fără să-l schimbi”. Reparațiile sigure nu ating paragrafele tale.</p>
<p>Dacă salvezi în timpul unei bucle, jurnalul ei primește <code>MODIFICARE_AUTOR</code>, raportul are secțiunea „Modificările tale în text”, iar propunerea nu se mai aplică peste textul tău: textul se reverifică chiar înainte de scriere. O propunere respinsă rămâne respinsă doar cât textul documentului nu se schimbă.</p>`,
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI opțional și MCP',
    sections: [
      {
        id: 'ai-setup',
        title: 'Pornirea asistentului',
        html: `<p>În <em>Setări → AI</em> bifează funcțiile AI și introdu cheia API Anthropic. Cheia este criptată de sistemul de operare și rămâne în procesul principal; interfața nu o vede. Butonul <em>Șterge cheia API</em> o elimină.</p>
<p>Debifat, nimic nu contactează serviciul AI, iar comenzile AI dispar sau sunt dezactivate.</p>`,
      },
      {
        id: 'ai-assistant',
        title: 'Asistentul AI',
        html: `<p><em>AI → Asistent AI</em> deschide panoul: corectură, sinopsis, continuare în stilul tău, critică, verificare de consistență și întrebări libere despre documentul curent. Propunerile se aplică doar când le accepți.</p>
<p>În bloc (meniul <em>Unelte</em>): <em>Sinopsis AI în bloc</em>, <em>Consistență pe toată cartea (fișe vii)</em> (fișe de personaje actualizate), <em>Revizie pe niveluri de zoom</em> (de la carte la frază).</p>`,
      },
      {
        id: 'ai-research-chat',
        title: 'Conversație cu sursele (Cercetare în proiect)',
        html: `<p><em>Unelte → Cercetare în proiect (RAG)</em> devine, cu AI pornit, o conversație despre sursele tale. Pui o întrebare, AI-ul răspunde numai din pasajele găsite în surse și le citează ca [1], [2]; un clic pe o citare deschide documentul din care vine pasajul. Întrebările de continuare (de exemplu „și în capitolul 3?”) țin cont de ultimele schimburi din conversație, iar căutarea folosește și întrebarea anterioară.</p>
<p><strong>Sursele.</strong> Butonul <em>Alege sursele…</em> arată ce poate folosi AI-ul: Manuscris, Cercetare, Note sau doar anumite foldere și documente. Implicit sunt bifate Cercetare și Note; alegerea apare ca etichete deasupra conversației și se poate scoate cu ×.</p>
<p><strong>Adăugarea surselor.</strong> Tot acolo: <em>Din fișiere</em> (PDF cu text, DOCX, TXT, MD, HTML), <em>Pagină web</em> (cu imaginile salvate local) și <em>Lipește text ca sursă</em>. Sursele noi intră în folderul Cercetare și sunt indexate imediat. Un PDF scanat (numai imagini) nu are text de extras.</p>
<p><strong>Folosirea răspunsurilor.</strong> Sub fiecare răspuns: <em>Salvează ca notă</em> (document nou în Cercetare → Note, cu întrebarea, răspunsul și legături către surse), <em>Inserează în document</em> (la cursor; citările devin note de subsol sau legături, după opțiunea din panoul surselor) și <em>Copiază</em>. Întrebările de continuare propuse apar ca butoane sub ultimul răspuns.</p>
<p>Conversațiile se salvează în proiect (fișierul <code>research-chats.json</code>) și se regăsesc după redeschidere; <em>Conversație nouă</em> începe una curată. Răspunsul apare pe măsură ce e scris și se poate opri cu <em>Anulează</em> sau Esc. Fără AI, panoul rămâne căutare locală în surse.</p>`,
      },
      {
        id: 'ai-mcp',
        title: 'Agenți AI prin MCP',
        html: `<p>Serverul MCP Scribner (<code>mcp/server.mjs</code>) permite unui agent (Claude Code, Claude Desktop sau alt client MCP) să lucreze cu un proiect ca din program: binder, text, căutare, metadate, note pe taburi, cuvinte cheie, etichete și statusuri, ținte, colecții, comentarii și note de subsol, împărțire și unire, coș, snapshot-uri și comparare, I-REP și I-EDIT fără AI, statistici, cronologie, cercetare, glosar, Compile în toate formatele, import și export (inclusiv <code>.scriv</code>, NotebookLM, pachetul PENTRU EDITOR), proiecte noi din șabloane și backup. Fiecare scriere face snapshot înainte și se notează în <code>agent-log.jsonl</code>.</p>
<pre>claude mcp add scribner -- node "/cale/Scribner/mcp/server.mjs" --project "/cale/Cartea mea.scribner"</pre>
<p><code>--read-only</code> permite doar citirea. Comanda exactă pentru instalarea ta apare în <em>Setări → AI → Conexiune MCP → Arată comanda de conectare</em>.</p>`,
      },
    ],
  },
  {
    id: 'settings',
    title: 'Setări',
    sections: [
      {
        id: 'settings-tabs',
        title: 'Filele ferestrei Setări',
        html: `<p><em>Unelte → Setări…</em>:</p>
<ul>
<li><strong>General</strong>: redeschiderea ultimului proiect, salvarea automată, ținte implicite, căutarea actualizărilor (oprită: aplicația nu contactează rețeaua).</li>
<li><strong>Aspect</strong>: tema (sistem, luminoasă, întunecată, sepia), fontul și mărimea editorului, interlinia, lățimea paginii, mărimea textului în binder, culoarea de accent, modul compunere.</li>
<li><strong>Comportament</strong>: ce face Enter și dublu-clicul în binder, vederea implicită.</li>
<li><strong>Corecturi</strong>: ghilimele, liniuțe, puncte de suspensie, majuscule automate, limbile corectorului, înlocuirile automate. Cu <em>Învață din corecturile mele</em> (pornit implicit), un cuvânt subliniat ca greșit pe care îl corectezi de mână (îl selectezi și scrii forma bună sau alegi o sugestie din clic dreapta) intră în înlocuiri, marcat <em>învățat</em>, și se corectează singur data viitoare, păstrând majusculele. Se învață doar greșeli apropiate (diacritice, o literă lipsă sau inversată), doar când corectorul respinge vechea formă și o acceptă pe cea nouă. O intrare învățată se șterge sau se modifică din aceeași listă.</li>
<li><strong>Editare</strong>: defilare tip mașină de scris, indentarea și spațierea implicite, caractere invizibile.</li>
<li><strong>Backup</strong>: la închidere, la interval, câte se păstrează, folderul.</li>
<li><strong>Tastatură</strong>: scurtăturile (vezi capitolul Scurtături).</li>
<li><strong>AI</strong>: funcțiile AI, cheia API, profilul editorial, conexiunea MCP.</li>
<li><strong>Limbă</strong>: română sau engleză.</li>
</ul>
<p>Versiunea portabilă ține setările lângă executabil, în <code>Scribner-data/</code>.</p>`,
      },
    ],
  },
  {
    id: 'shortcuts',
    title: 'Scurtături',
    sections: [
      {
        id: 'shortcuts-config',
        title: 'Configurarea scurtăturilor',
        html: `<p><em>Unelte → Scurtături de tastatură…</em> afișează toate comenzile pe grupuri. Clic pe o comandă, apasă combinația dorită și salvează. O scurtătură goală dezactivează comanda; conflictele sunt marcate cu roșu. <em>Implicit</em> revine la valoarea inițială.</p>
<p>Lista scurtăturilor implicite este în fila <strong>Scurtături</strong> a acestei ferestre.</p>`,
      },
      {
        id: 'shortcuts-common',
        title: 'Cele mai folosite',
        html: `<table>
<tr><td>${k('Ctrl+S')}</td><td>Salvează acum</td></tr>
<tr><td>${k('Ctrl+N')} / ${k('Ctrl+Shift+N')}</td><td>Document nou / dosar nou</td></tr>
<tr><td>${k('Ctrl+1')} / ${k('Ctrl+2')} / ${k('Ctrl+3')}</td><td>Editor / Corkboard / Outline</td></tr>
<tr><td>${k('F11')}</td><td>Mod compunere</td></tr>
<tr><td>${k('Ctrl+K')}</td><td>Împarte la cursor</td></tr>
<tr><td>${k('Ctrl+F')} / ${k('Ctrl+Shift+F')}</td><td>Caută în document / în proiect</td></tr>
<tr><td>${k('Ctrl+G')}</td><td>Mergi la…</td></tr>
<tr><td>${k('Ctrl+5')}</td><td>Snapshot</td></tr>
<tr><td>${k('Ctrl+Shift+E')}</td><td>Compile</td></tr>
<tr><td>${k('F1')}</td><td>Manualul</td></tr>
</table>`,
      },
    ],
  },
  {
    id: 'faq',
    title: 'Depanare și întrebări frecvente',
    sections: [
      {
        id: 'faq-missing-compile',
        title: 'Un document lipsește din cartea compilată',
        html: `<ul>
<li>Este în <em>Manuscris</em>? Ce e în Cercetare nu intră în Compile.</li>
<li>Are bifa <em>Include în Compile</em> (Inspector sau fila Conținut)?</li>
<li>Filtrele din fila <em>Conținut</em> (etichetă, status, colecție) sau dosarul compilat îl exclud?</li>
<li>Tipul lui de secțiune are textul ascuns în fila <em>Secțiuni</em>?</li>
</ul>`,
      },
      {
        id: 'faq-placeholder',
        title: 'Un placeholder apare ca text în carte',
        html: `<p>Verifică ortografia (<code>&lt;$n&gt;</code>, nu <code>&lt;$N&gt;</code>) și lista din fila Substituenți. <code>&lt;$p&gt;</code> funcționează doar în antet și subsol. Pentru <code>&lt;$img:Nume&gt;</code>, imaginea trebuie să existe în Cercetare cu exact acel titlu sau nume de fișier.</p>`,
      },
      {
        id: 'faq-spelling',
        title: 'Corectorul nu subliniază cuvintele românești',
        html: `<p>Pe Windows și macOS, corectura folosește corectorul sistemului: instalează limba română (pachetul de limbă) în sistemul de operare. Pe Linux dicționarele se descarcă la nevoie. Limbile se aleg în <em>Setări → Corecturi</em>.</p>`,
      },
      {
        id: 'faq-lost-text',
        title: 'Am pierdut text',
        html: `<ol>
<li>${k('Ctrl+Z')} în document.</li>
<li>Fila Snapshot-uri din Inspector: împărțirile, unirile și înlocuirile fac snapshot automat.</li>
<li>Coșul din binder.</li>
<li><em>Fișier → Backup-uri…</em>: restaurează un backup ca proiect separat și copiază textul.</li>
</ol>`,
      },
      {
        id: 'faq-ai',
        title: 'Comenzile AI sunt gri',
        html: `<p>Pornește funcțiile AI și introdu cheia în <em>Setări → AI</em>. Restul programului nu depinde de AI.</p>`,
      },
      {
        id: 'faq-scriv',
        title: 'Importul Scrivener nu a adus ceva',
        html: `<p>Citește raportul de import: arată ce s-a convertit și ce a rămas doar în copia <code>scrivener-original/</code> din proiect. Dacă lipsește ceva important, raportează problema din <em>Ajutor → Raportează o problemă</em>, cu o descriere (fără să trimiți textul cărții).</p>`,
      },
      {
        id: 'faq-report',
        title: 'Raportarea unei probleme',
        html: `<p><em>Ajutor → Raportează o problemă…</em> deschide o fereastră simplă în care descrii problema cu cuvintele tale. Nu trebuie să știi nimic tehnic.</p>
<ol>
<li>Scrie la <em>Ce s-a întâmplat?</em> ce ai văzut (de exemplu „am apăsat Compile și nu s-a creat fișierul”).</li>
<li>Opțional, la <em>Ce făceai înainte?</em>, pașii de dinainte.</li>
<li>Apasă <em>Trimite pe GitHub</em>: se deschide pagina proiectului cu raportul completat; acolo apeși <em>Submit new issue</em>. Ai nevoie de un cont GitHub gratuit. Dacă nu ai, folosește <em>Copiază raportul</em> și trimite textul cum îți e comod.</li>
</ol>
<p><strong>Ce se trimite:</strong> versiunea programului, sistemul de operare, limba interfeței, ultimele erori înregistrate de program și numele ultimelor comenzi folosite. Le vezi pe toate la <em>Detalii tehnice trimise</em>, înainte de trimitere. <strong>Ce nu se trimite:</strong> textul cărții, notele, numele tău de utilizator, căile proiectelor (apar ca <code>~</code> și <code>&lt;proiect&gt;</code>) și cheile API.</p>
<p>Când programul întâlnește o eroare, apare discret jos în dreapta mesajul <em>A apărut o problemă. Trimite raportul?</em> (o singură dată pentru fiecare eroare). Îl poți închide liniștit. Erorile se păstrează într-un jurnal mic în folderul de date al aplicației (<code>logs/errors.jsonl</code>, cel mult 200 de intrări).</p>`,
      },
    ],
  },
  {
    id: 'yours',
    title: 'Ce faci tu (pași care țin de contul și calculatorul tău)',
    sections: [
      {
        id: 'yours-overview',
        title: 'Pe scurt',
        html: `<p>Programul e complet, dar câteva lucruri depind de conturile, cheile și setările tale. Fără ele funcțiile respective rămân oprite, restul merge normal.</p>
<ul>
<li>cheile serviciilor externe (traducere, gramatică, voce, bibliografie);</li>
<li>cheia unui model AI;</li>
<li>pachetul de limbă română pentru corectorul din Windows;</li>
<li>legătura cu Claude Code (MCP), dacă vrei ca un agent să lucreze direct în proiect;</li>
<li>folderul de sincronizare (OneDrive, Dropbox, Google Drive sau NAS), dacă scrii și din browser.</li>
</ul>`,
      },
      {
        id: 'yours-services',
        title: 'Cheile serviciilor: DeepL, Google, LanguageTool, Speechify, Zotero',
        html: `<p>Deschide <em>Setări → Servicii și conturi</em>. Fiecare serviciu are linkul <em>Unde găsesc cheia</em>. Lipești cheia, apeși <em>Salvează</em>; cheia e criptată pe calculatorul tău și nu mai poate fi citită din interfață.</p>
<ul>
<li><strong>DeepL</strong>: contul gratuit dă 500.000 de caractere pe lună.</li>
<li><strong>Google Cloud Translation</strong>: cheie din Google Cloud Console, cu Cloud Translation API activat.</li>
<li><strong>LanguageTool</strong>: merge fără cont; cu Premium pui e-mailul și cheia API.</li>
<li><strong>Speechify</strong>: cheia din consola Speechify API și ID-ul vocii (de exemplu <code>george</code>).</li>
<li><strong>Zotero</strong>: ID-ul numeric de utilizator și o cheie din <em>zotero.org/settings/keys</em>; apoi <em>Fișier → Importă bibliografia din Zotero</em>.</li>
</ul>
<p>Verificare: selectezi un paragraf, clic dreapta, <em>În program: DeepL</em> sau <em>Verifică gramatica</em>.</p>`,
      },
      {
        id: 'yours-ai',
        title: 'Cheia AI și testul cu un model real',
        html: `<p>În <em>Setări → AI</em> alegi furnizorul (Anthropic, OpenAI, OpenRouter, NVIDIA NIM, Mistral, Groq, DeepSeek, xAI, Gemini, Ollama local, LM Studio local sau un server compatibil OpenAI), lipești cheia și scrii id-ul modelului. Modelele se retrag des: dacă primești <em>modelul a fost retras</em>, alege altul din lista furnizorului.</p>
<p>Fără bani: pe OpenRouter, modelele terminate în <code>:free</code>; pe <em>build.nvidia.com</em>, cheia <code>nvapi-…</code> vine cu credite gratuite; local, Ollama sau LM Studio nu cer cheie.</p>
<p>Test rapid din folderul programului, în PowerShell:</p>
<pre>$env:OPENROUTER_API_KEY = "sk-or-…"
node scripts\ai-smoke.cjs openrouter

$env:NVIDIA_API_KEY = "nvapi-…"
node scripts\ai-smoke.cjs nvidia</pre>
<p>Scriptul alege singur un model care răspunde și încearcă corectura, traducerea și explicarea unui termen. Modelele gratuite sunt uneori supraîncărcate; scriptul reîncearcă și trece la alt model. Nu scrie cheile în fișiere sau în mesaje; dacă una a ajuns undeva public, regenereaz-o.</p>`,
      },
      {
        id: 'yours-spelling',
        title: 'Corectorul ortografic românesc pe Windows',
        html: `<p>Pe Windows programul folosește corectorul sistemului. Instalează limba: <em>Setări Windows → Oră și limbă → Limbă și regiune → Adăugare limbă → Română</em>, cu opțiunea de verificare ortografică bifată. Repornește Scribner. Pe Linux și macOS dicționarul vine cu programul.</p>`,
      },
      {
        id: 'yours-mcp',
        title: 'Legarea de Claude, Codex și alți agenți AI (MCP)',
        html: `<p>Scribner are un server MCP inclus (peste 70 de unelte: binder, documente, note, metadate, snapshot-uri, căutare, Compile). Orice agent AI care știe MCP îl poate folosi. <strong>Nu ai nevoie de Node.js</strong>: programul instalat pornește serverul singur, cu variabila <code>ELECTRON_RUN_AS_NODE=1</code>. Agentul vede doar proiectele puse după <code>--project</code>; cu <code>--read-only</code> doar citește. Fiecare scriere face întâi un snapshot și se notează în <code>agent-log.jsonl</code> din proiect.</p>
<p><strong>Cel mai simplu:</strong> deschide proiectul și alege <em>AI → Conectează la Claude (MCP)…</em>. Butonul scrie configurarea pentru Claude Desktop, iar celălalt copiază comanda pentru Claude Code, cu căile tale reale.</p>
<p>Căile de mai jos sunt cele ale installerului pe Windows (instalare pentru utilizatorul curent). Înlocuiește <code>Ionut</code> cu numele tău de utilizator și calea proiectului cu a ta. Varianta portabilă: folosește calea unde ai pus-o.</p>
<pre>Program:  C:\\Users\\Ionut\\AppData\\Local\\Programs\\Scribner\\Scribner.exe
Server:   C:\\Users\\Ionut\\AppData\\Local\\Programs\\Scribner\\resources\\app\\mcp\\server.mjs
Proiect:  D:\\Carti\\Karma.scribner</pre>

<h4>Claude Code (terminal și fila Code din Claude Desktop)</h4>
<pre>claude mcp add scribner --scope user -e ELECTRON_RUN_AS_NODE=1 -- "C:\\Users\\Ionut\\AppData\\Local\\Programs\\Scribner\\Scribner.exe" "C:\\Users\\Ionut\\AppData\\Local\\Programs\\Scribner\\resources\\app\\mcp\\server.mjs" --project "D:\\Carti\\Karma.scribner"</pre>
<p>Verificare: <code>claude mcp list</code> arată <em>scribner: connected</em>. În sesiune, <code>/mcp</code> arată uneltele.</p>

<h4>Claude Desktop (chat)</h4>
<p>Fișierul <code>%APPDATA%\\Claude\\claude_desktop_config.json</code> (în Claude Desktop: <em>Settings → Developer → Edit Config</em>). Adaugă în <code>mcpServers</code>, apoi repornește Claude Desktop complet (și din bara de sistem):</p>
<pre>{
  "mcpServers": {
    "scribner": {
      "command": "C:\\\\Users\\\\Ionut\\\\AppData\\\\Local\\\\Programs\\\\Scribner\\\\Scribner.exe",
      "args": ["C:\\\\Users\\\\Ionut\\\\AppData\\\\Local\\\\Programs\\\\Scribner\\\\resources\\\\app\\\\mcp\\\\server.mjs",
               "--project", "D:\\\\Carti\\\\Karma.scribner"],
      "env": { "ELECTRON_RUN_AS_NODE": "1" }
    }
  }
}</pre>
<p>În JSON, fiecare <code>\\</code> din cale se scrie dublat.</p>

<h4>OpenAI Codex (CLI și extensia de editor)</h4>
<pre>codex mcp add scribner --env ELECTRON_RUN_AS_NODE=1 -- "C:\\Users\\Ionut\\AppData\\Local\\Programs\\Scribner\\Scribner.exe" "C:\\Users\\Ionut\\AppData\\Local\\Programs\\Scribner\\resources\\app\\mcp\\server.mjs" --project "D:\\Carti\\Karma.scribner"</pre>
<p>Sau direct în <code>%USERPROFILE%\\.codex\\config.toml</code>:</p>
<pre>[mcp_servers.scribner]
command = 'C:\\Users\\Ionut\\AppData\\Local\\Programs\\Scribner\\Scribner.exe'
args = ['C:\\Users\\Ionut\\AppData\\Local\\Programs\\Scribner\\resources\\app\\mcp\\server.mjs', '--project', 'D:\\Carti\\Karma.scribner']
env = { ELECTRON_RUN_AS_NODE = '1' }</pre>
<p>Verificare: <code>codex mcp list</code>.</p>

<h4>Gemini CLI</h4>
<pre>gemini mcp add scribner -e ELECTRON_RUN_AS_NODE=1 "C:\\Users\\Ionut\\AppData\\Local\\Programs\\Scribner\\Scribner.exe" "C:\\Users\\Ionut\\AppData\\Local\\Programs\\Scribner\\resources\\app\\mcp\\server.mjs" --project "D:\\Carti\\Karma.scribner"</pre>
<p>Sau în <code>%USERPROFILE%\\.gemini\\settings.json</code>, același bloc <code>mcpServers</code> ca la Claude Desktop.</p>

<h4>Cursor, Windsurf, LM Studio și alți clienți cu <code>mcpServers</code></h4>
<p>Același bloc JSON ca la Claude Desktop, în fișierul fiecăruia: Cursor <code>%USERPROFILE%\\.cursor\\mcp.json</code>; Windsurf <code>%USERPROFILE%\\.codeium\\windsurf\\mcp_config.json</code>; LM Studio <em>Program → Install → Edit mcp.json</em>.</p>

<h4>VS Code (GitHub Copilot, mod Agent)</h4>
<p>Fișierul <code>.vscode\\mcp.json</code> din folderul de lucru (cheia e <code>servers</code>, nu <code>mcpServers</code>):</p>
<pre>{
  "servers": {
    "scribner": {
      "type": "stdio",
      "command": "C:\\\\Users\\\\Ionut\\\\AppData\\\\Local\\\\Programs\\\\Scribner\\\\Scribner.exe",
      "args": ["C:\\\\Users\\\\Ionut\\\\AppData\\\\Local\\\\Programs\\\\Scribner\\\\resources\\\\app\\\\mcp\\\\server.mjs",
               "--project", "D:\\\\Carti\\\\Karma.scribner"],
      "env": { "ELECTRON_RUN_AS_NODE": "1" }
    }
  }
}</pre>

<h4>Din sursă (fără installer, cu Node.js)</h4>
<pre>claude mcp add scribner -- node "C:\\cale\\Scriptorium\\mcp\\server.mjs" --project "D:\\Carti\\Karma.scribner"</pre>

<h4>Probă</h4>
<p>Cere agentului: „listează documentele din proiectul Scribner”, apoi „citește primul capitol și scrie-i sinopsisul în inspector”. Fă un snapshot înainte de modificări mari. Mai multe proiecte: repetă <code>--project</code> pentru fiecare. Dacă agentul nu vede unelte: repornește clientul, verifică dublarea <code>\\</code> în JSON și că Scribner e instalat la calea scrisă.</p>`,
      },
      {
        id: 'yours-cli',
        title: 'Linia de comandă (CLI)',
        html: `<p>Scribner are și o linie de comandă: citești, cauți, compilezi și exporți proiectul din terminal sau din scripturi, fără să deschizi fereastra. Comenzile care doar citesc nu blochează proiectul; cele care scriu (<code>snapshot</code>, <code>import</code>) așteaptă ca aplicația să termine salvarea.</p>
<h4>Pornire</h4>
<p>Programul instalat pe Windows nu are nevoie de Node.js. Copiază <code>scribner.cmd</code> (din folderul <code>installer</code> al sursei) lângă <code>Scribner.exe</code>, în <code>%LOCALAPPDATA%\\Programs\\Scribner</code>, și adaugă folderul în PATH. Apoi scrii direct <code>scribner …</code>. Fără wrapper, în PowerShell:</p>
<pre>$env:ELECTRON_RUN_AS_NODE=1; &amp; "$env:LOCALAPPDATA\\Programs\\Scribner\\Scribner.exe" "$env:LOCALAPPDATA\\Programs\\Scribner\\resources\\app\\cli\\scribner.cjs" info "D:\\Carti\\Karma.scribner"</pre>
<p>Din sursă, cu Node.js: <code>node cli/scribner.cjs help</code>.</p>
<h4>Comenzi</h4>
<pre>scribner info "D:\\Carti\\Karma.scribner"              titlu, autor, cuvinte, ultima modificare
scribner list "D:\\Carti\\Karma.scribner" --tree       binderul, cu id-uri
scribner cat "D:\\Carti\\Karma.scribner" "Capitolul 1" --md
scribner search "D:\\Carti\\Karma.scribner" "karma" --whole
scribner stats "D:\\Carti\\Karma.scribner"             cuvinte pe document, ținte, istoric
scribner compile "D:\\Carti\\Karma.scribner" --format docx --preset paperback -o "D:\\Export"
scribner export-docs "D:\\Carti\\Karma.scribner" -o "D:\\Export\\Docs" --format md
scribner backup "D:\\Carti\\Karma.scribner"
scribner snapshot "D:\\Carti\\Karma.scribner" "Capitolul 1" --name "Înainte de revizie"
scribner import "D:\\Texte\\Roman.docx" -o "D:\\Carti\\Roman.scribner" --split h1
scribner mcp "D:\\Carti\\Karma.scribner"               serverul MCP pentru agenți AI</pre>
<p>Adaugă <code>--json</code> pentru ieșire pe care o citesc scripturile, <code>--lang en</code> pentru mesaje în engleză. Coduri de ieșire: 0 reușit, 1 eroare, 2 comandă scrisă greșit. PDF-ul se face doar din aplicație (<em>Compile → PDF</em>); din terminal folosește <code>--format docx</code> sau <code>html</code>.</p>
<h4>Cartea ca surse pentru NotebookLM, Gemini, ChatGPT, Claude Projects sau Manus</h4>
<pre>scribner export-sources "D:\\Carti\\Karma.scribner" -o "D:\\NotebookLM"</pre>
<p>Rezultă folderul <code>Surse - Karma</code>: <code>00 - Cuprins</code> (cuprinsul cu sinopsisuri), câte un fișier pe capitol, cercetarea și notele, plus <code>sources.json</code> (lista surselor). Opțiuni: <code>--per document</code> (un fișier pe fiecare document, nu pe capitol), <code>--format txt</code> sau <code>docx</code>, <code>--max-sources 50</code>, <code>--target notebooklm</code> (cel mult 50 de surse; capitolele se unesc) sau <code>gemini</code>, <code>chatgpt</code>, <code>claude</code>, <code>manus</code>.</p>
<ol>
<li>Rulează comanda de mai sus.</li>
<li>Deschide <a href="https://notebooklm.google.com">notebooklm.google.com</a> → <em>Notebook nou</em> → <em>Adaugă surse</em> → <em>Încarcă</em> și selectează toate fișierele din folder (fără <code>sources.json</code>).</li>
<li>Întreabă notebook-ul despre carte: personaje, cronologie, contradicții între capitole.</li>
</ol>
<p>Pentru limita NotebookLM există și <code>scribner export-notebooklm … -o folder</code>, care unește capitole ca să nu depășească 50 de surse. Același folder se încarcă și într-un Gem Gemini, într-un proiect ChatGPT, într-un proiect Claude sau în Manus (manus.im). După ce scrii mai departe, rulează din nou comanda și înlocuiește sursele.</p>`,
      },
      {
        id: 'yours-sync',
        title: 'Același proiect pe desktop și în browser',
        html: `<p>Pune folderul <code>.scribner</code> în OneDrive, Dropbox, Google Drive sau pe un NAS. Pe desktop îl deschizi normal; în Chrome sau Edge, versiunea web deschide <em>același folder</em> (butonul <em>Deschide proiect .scribner</em>) și scrie direct în el. Schimbările făcute de cealaltă parte apar în câteva secunde. Nu edita același document în două locuri în același timp. Pe telefon browserele nu pot deschide foldere: acolo folosești <em>Exportă pachet</em> / <em>Importă pachet .json</em>.</p>`,
      },
      {
        id: 'yours-karma',
        title: 'Proiectele tale Scrivener și regulile I-REP / I-EDIT',
        html: `<p>Importul <code>.scriv</code> e testat pe proiecte de probă. Pe un proiect real (de exemplu cartea Karma), fă importul cu <em>Fișier → Importă proiect Scrivener</em>, citește raportul de import și verifică capitolele cu cele mai multe formatări, comentarii și note de subsol. Originalul rămâne neatins, iar o copie stă în <code>scrivener-original/</code>.</p>
<p>I-REP / I-EDIT urmează definițiile tale VKB2: repetițiile apropiate (S70, runda R8b) și protecția textului scris de tine (vezi capitolul <em>Revizie I-REP/I-EDIT</em>).</p>`,
      },
      {
        id: 'yours-limits',
        title: 'Limite cunoscute',
        html: `<ul>
<li>Tab-urile cu poziții exacte (din riglă) apar exact în DOCX; în PDF, EPUB și HTML tab-urile sunt egale, după prima poziție. Doar tab-uri la stânga.</li>
<li>Kindle: programul produce EPUB, pe care Amazon îl acceptă direct; formatul KPF nu se poate produce cu unelte deschise.</li>
<li>Sincronizarea cu aplicația Scrivener pentru iOS nu e posibilă (format închis); folosește folderul sincronizat de mai sus.</li>
</ul>`,
      },
    ],
  },
];

export default MANUAL_RO;
