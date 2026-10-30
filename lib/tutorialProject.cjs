'use strict';
// "Tutorial Pneuma Sofer": an interactive tutorial project. Each binder document explains one
// feature and asks the writer to try it. Same shape as the entries of TEMPLATES in
// lib/templates.cjs ({ name, category, draft, research }), consumed by store.createProject.

const T = (title, html = '<p></p>', extra = {}) => ({ type: 'text', title, html, ...extra });
const F = (title, children = [], extra = {}) => ({ type: 'folder', title, children, ...extra });

const p = (s) => `<p>${s}</p>`;
const h = (s) => `<h2>${s}</h2>`;
const ol = (...items) => `<ol>${items.map((i) => `<li><p>${i}</p></li>`).join('')}</ol>`;
const ul = (...items) => `<ul>${items.map((i) => `<li><p>${i}</p></li>`).join('')}</ul>`;
const TRY = (...steps) => h('Încearcă acum') + ol(...steps);
const NEXT = (title) => p(`<em>Când ai terminat, treci la „${title}” (Ctrl+Alt+↓ sau clic în binder).</em>`);

const DOCS = {
  welcome:
    p('<strong>Bine ai venit în Pneuma Sofer.</strong> Acest proiect este un tutorial pe care îl parcurgi făcând. Fiecare document din binder (lista din stânga) explică o funcție și îți cere să o încerci chiar aici. Nu poți strica nimic: e un proiect de exersat, îl poți șterge oricând.') +
    h('Cum e așezată fereastra') +
    ul(
      '<strong>Binderul</strong> (stânga): arborele proiectului. Dosarele mari sunt <em>Manuscris</em> (textul cărții), <em>Cercetare</em> (materiale) și <em>Coș</em>.',
      '<strong>Editorul</strong> (centru): textul documentului selectat, adică exact ce citești acum.',
      '<strong>Inspectorul</strong> (dreapta): sinopsis, etichetă, status, note, snapshot-uri. Dacă nu-l vezi, apasă Ctrl+Alt+I.',
    ) +
    TRY('Apasă Ctrl+Alt+I de două ori: Inspectorul dispare și reapare.', 'Apasă Ctrl+Alt+B: binderul se ascunde. Apasă din nou ca să revină.', 'Apasă F1 oricând ca să deschizi manualul.') +
    NEXT('2. Scrie și formatează'),
  writing:
    p('Editorul funcționează ca un procesor de text obișnuit. Salvarea este automată; Ctrl+S salvează imediat.') +
    p('Corecturile automate te ajută la tipografie: ghilimelele devin „românești”, două cratime devin linie de dialog, trei puncte devin „…”.') +
    TRY(
      'Scrie sub acest paragraf o propoziție între ghilimele drepte "așa" și observă cum se transformă.',
      'Scrie două cratime urmate de un spațiu și un cuvânt: apare linia de dialog —.',
      'Selectează un cuvânt și apasă Ctrl+B, apoi Ctrl+I.',
      'Din bara de format, aplică stilul de titlu unui rând nou.',
    ) +
    p('Scrie aici:') + p('') +
    NEXT('3. Documente și dosare'),
  binder:
    p('O carte în Pneuma Sofer este făcută din documente mici: scene, capitole, secțiuni. Le creezi, le muți și le redenumești liber.') +
    TRY(
      'Selectează dosarul „Exerciții” din Manuscris și apasă Ctrl+N: apare un document nou. Scrie-i un titlu și apasă Enter.',
      'Apasă F2 pe documentul nou și redenumește-l „Scena mea”.',
      'Trage documentul cu mouse-ul deasupra altui document, apoi înapoi.',
      'Cu documentul selectat, apasă Ctrl+↑ și Ctrl+↓ ca să-l muți din tastatură.',
      'Apasă Ctrl+Shift+N pentru un dosar nou (un capitol).',
    ) +
    p('Ștergerea mută elementul în Coș; de acolo îl poți restaura din meniul Document → Restaurează din coș.') +
    NEXT('4. Corkboard și sinopsis'),
  corkboard:
    p('Fiecare document are un <strong>sinopsis</strong>: două-trei rânduri despre ce se întâmplă în el. Sinopsisul apare pe fișele din <strong>Corkboard</strong>, unde vezi structura dintr-o privire.') +
    TRY(
      'Selectează dosarul „Exerciții” și apasă Ctrl+2: vezi fișele.',
      'Fă dublu-clic pe sinopsisul unei fișe și scrie ceva.',
      'Trage o fișă în altă poziție. Uită-te în binder: ordinea s-a schimbat și acolo.',
      'Apasă Ctrl+3 pentru Outline (tabel), apoi Ctrl+1 ca să revii la Editor.',
    ) +
    NEXT('5. Scrivenings'),
  scrivenings:
    p('Când selectezi un <strong>dosar</strong> în modul Editor, documentele lui apar unul după altul, ca un text continuu. Poți scrie direct în oricare dintre ele; fiecare modificare ajunge în documentul ei.') +
    TRY(
      'Apasă Ctrl+1, apoi selectează dosarul „Exerciții”: vezi toate scenele ca un singur text.',
      'Modifică o frază în a doua scenă, apoi selectează doar acea scenă în binder: modificarea e acolo.',
      'Din meniul Vizualizare, ascunde și arată separatoarele dintre documente.',
    ) +
    NEXT('6. Împarte și unește'),
  split:
    p('O scenă devenită prea lungă se împarte. Două scene prea scurte se unesc. Înainte de ambele, Pneuma Sofer face automat un snapshot.') +
    TRY(
      'Deschide „Scena de împărțit” din dosarul „Exerciții”.',
      'Pune cursorul la începutul paragrafului al doilea și apasă Ctrl+K: apare un document nou cu restul textului.',
      'Selectează în binder cele două bucăți (Ctrl+clic) și apasă Ctrl+Shift+M ca să le unești la loc.',
    ) +
    NEXT('7. Inspector, etichete, status'),
  inspector:
    p('Inspectorul ține informațiile despre document: sinopsis, <strong>etichetă</strong> (colorată, de exemplu Personaj, Loc, Idee), <strong>status</strong> (De făcut, Prima ciornă, Revizuit, Final), cuvinte cheie și note.') +
    TRY(
      'Deschide Inspectorul (Ctrl+Alt+I) pentru acest document.',
      'Alege statusul „Prima ciornă”.',
      'Alege eticheta „Idee” și privește icoana din binder: și-a schimbat culoarea.',
      'Scrie o notă în zona de note: notele nu intră în carte.',
      'Adaugă un cuvânt cheie, de exemplu „tutorial”.',
    ) +
    NEXT('8. Comentarii și note de subsol'),
  comments:
    p('Comentariile sunt observații legate de o bucată de text; nu apar în cartea compilată. Notele de subsol, în schimb, apar.') +
    p('Aceasta este o frază pe care un redactor ar vrea s-o comenteze.') +
    TRY(
      'Selectează fraza de mai sus și apasă butonul de comentariu din bara de format. Scrie comentariul.',
      'Găsește comentariul în Inspector și dă clic pe el: cursorul sare la text.',
      'Pune cursorul la sfârșitul acestui paragraf și inserează o notă de subsol din bara de format.',
    ) +
    NEXT('9. Snapshot-uri'),
  snapshots:
    p('Un snapshot este o fotografie a textului unui document. Îl faci înainte de o rescriere curajoasă și te întorci la el dacă nu-ți place rezultatul.') +
    p('Fraza originală: Vântul bătea dinspre mare și aducea miros de sare.') +
    TRY(
      'Apasă Ctrl+5: snapshot salvat.',
      'Rescrie fraza originală cum vrei.',
      'În Inspector, deschide fila Snapshot-uri, alege snapshot-ul și compară-l cu textul curent.',
      'Dacă vrei, restaurează-l. Textul curent primește și el un snapshot, deci nu pierzi nimic.',
    ) +
    NEXT('10. Ținte și statistici'),
  targets:
    p('Țintele te ajută să scrii constant: o țintă pentru toată cartea, una pentru sesiunea de azi și una pentru fiecare document.') +
    TRY(
      'Deschide Proiect → Ținte și termen limită… și pune o țintă de sesiune de 300 de cuvinte.',
      'În Inspector, pune acestui document o țintă de 150 de cuvinte și urmărește bara de jos a editorului în timp ce scrii mai jos.',
      'Deschide Proiect → Statistici… (Ctrl+Shift+I).',
    ) +
    p('Scrie aici:') + p('') +
    NEXT('11. Căutare și colecții'),
  search:
    p('Ctrl+F caută în documentul curent. Ctrl+Shift+F caută și înlocuiește în tot proiectul. Colecțiile țin liste de documente fără să le muți.') +
    TRY(
      'Apasă Ctrl+Shift+F și caută cuvântul „mare”. Vei găsi documentele care îl conțin.',
      'Apasă Ctrl+G, scrie „snap” și apasă Enter: ai sărit la documentul despre snapshot-uri.',
      'Folosește Alt+← ca să revii aici.',
      'Creează o colecție nouă din bara de deasupra binderului și adaugă în ea două documente.',
    ) +
    NEXT('12. Modul compunere și split'),
  composition:
    p('<strong>Modul compunere</strong> (F11) ascunde tot în afară de text. <strong>Split</strong> împarte editorul în două, ca să vezi o fișă de personaj în timp ce scrii.') +
    TRY(
      'Apasă F11, scrie câteva rânduri, apoi apasă Esc.',
      'Apasă butonul Split din bara de sus.',
      'Ține apăsat Alt și dă clic în binder pe „Ana Popescu” din Cercetare: fișa se deschide în panoul al doilea.',
      'Apasă Ctrl+Shift+R pentru Quick Reference: fișa se deschide într-o fereastră plutitoare.',
    ) +
    NEXT('13. Compile'),
  compile:
    p('<strong>Compile</strong> adună documentele din Manuscris într-o singură carte: Word, PDF, EPUB și altele. Formatul decide cum arată titlurile, paginile și notele.') +
    TRY(
      'Apasă Ctrl+Shift+E.',
      'Alege formatul „Manuscris standard” și ieșirea „Word (.docx)”.',
      'În fila Conținut, debifează dosarul „Exerciții”.',
      'Uită-te în fila Secțiuni la prefixul „Capitolul &lt;$n&gt;”: &lt;$n&gt; devine numărul capitolului. Lista completă a acestor coduri este în Ajutor → Placeholders.',
      'Apasă Compilează și deschide fișierul rezultat.',
    ) +
    NEXT('14. Revizie și unelte'),
  tools:
    p('Câteva unelte de scriitor, toate fără AI:') +
    ul(
      '<strong>I-REP</strong> (butonul din bara de sus): găsește și repară probleme de tipografie, apoi reverifică.',
      '<strong>Unelte → Generator de nume</strong> pentru personaje.',
      '<strong>Unelte → Ciorne (Scratchpad)</strong> pentru idei rapide.',
      '<strong>Vizualizare → Cronologie, Hartă de relații, Analiză de ritm</strong> pentru toată cartea.',
    ) +
    p('Text cu probleme pentru I-REP:  aici sunt  două spații ,o virgulă lipită și "ghilimele drepte"...') +
    TRY('Apasă I-REP și rulează verificarea pe acest document.', 'Aplică reparațiile sigure și citește din nou paragraful de mai sus.', 'Deschide Generatorul de nume și inserează un nume în text.') +
    NEXT('15. Ce urmează'),
  end:
    p('<strong>Ai terminat tutorialul.</strong> Știi acum lucrurile de bază: binder, editor, corkboard, Scrivenings, Inspector, snapshot-uri, ținte, căutare și Compile.') +
    ul(
      'Manualul complet: F1 sau meniul Ajutor.',
      'Lista scurtăturilor: Ajutor → Scurtături.',
      'Un proiect nou: închide acest proiect (⌂) și alege un șablon pe ecranul Acasă.',
      'Ai un proiect Scrivener? Importă-l din ecranul Acasă.',
    ) +
    p('Spor la scris!'),
};

const SCENE = (n, syn) =>
  T(`Scena ${n}`, p(`Text de exercițiu pentru scena ${n}. ${syn}`) + p('Al doilea paragraf: aici poți pune cursorul ca să împarți scena.'));

function tutorialTemplate() {
  return {
    name: 'Tutorial Pneuma Sofer',
    category: 'Generale',
    draft: [
      F('Tutorial', [
        T('1. Bun venit', DOCS.welcome),
        T('2. Scrie și formatează', DOCS.writing),
        T('3. Documente și dosare', DOCS.binder),
        T('4. Corkboard și sinopsis', DOCS.corkboard),
        T('5. Scrivenings', DOCS.scrivenings),
        T('6. Împarte și unește', DOCS.split),
        T('7. Inspector, etichete, status', DOCS.inspector),
        T('8. Comentarii și note de subsol', DOCS.comments),
        T('9. Snapshot-uri', DOCS.snapshots),
        T('10. Ținte și statistici', DOCS.targets),
        T('11. Căutare și colecții', DOCS.search),
        T('12. Modul compunere și split', DOCS.composition),
        T('13. Compile', DOCS.compile),
        T('14. Revizie și unelte', DOCS.tools),
        T('15. Ce urmează', DOCS.end),
      ]),
      F('Exerciții', [
        SCENE(1, 'Ana ajunge în orașul de lângă mare.'),
        SCENE(2, 'Ana îl întâlnește pe Mihai în port.'),
        T('Scena de împărțit', p('Primul paragraf rămâne în documentul acesta.') + p('Al doilea paragraf va pleca într-un document nou când apeși Ctrl+K aici.') + p('Al treilea paragraf merge împreună cu al doilea.')),
      ]),
    ],
    research: [
      F('Personaje', [
        T('Ana Popescu', h('Cine este') + p('Fotografă, 34 de ani, se întoarce în orașul copilăriei.') + h('Ce vrea') + p('Să afle ce s-a întâmplat cu fratele ei.'), { label: 'Personaj' }),
        T('Mihai', h('Cine este') + p('Pescar, prietenul din copilărie al Anei.'), { label: 'Personaj' }),
      ]),
      F('Locuri', [T('Portul', h('Descriere') + p('Bărci vechi, plase întinse la uscat, miros de sare.'), { label: 'Loc' })]),
      T('Idei', p('Notează aici idei. Documentele din Cercetare nu intră în Compile.'), { label: 'Idee' }),
    ],
  };
}

module.exports = { tutorialTemplate };
