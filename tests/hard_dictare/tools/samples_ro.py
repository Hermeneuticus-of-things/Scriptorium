# -*- coding: utf-8 -*-
"""Sursa unică a textelor pentru setul de test greu D&TED.

Pentru fiecare probă:
  gold  = transcrierea de referință (verbatim, punctuație corectă, diacritice),
          scrisă așa cum ar trebui s-o producă motorul de dictare (cifre, ore).
  tts   = textul rostit efectiv de sinteza Piper (numere scrise în litere),
          None => identic cu gold.
  facts = entități care TREBUIE păstrate (nume, cifre) și forme ANULATE
          (autocorectări) pe care un rezumat nu are voie să le afirme ca finale.
"""

SAMPLES = [
  {
    "id": "01_idei_lungi",
    "category": "long_ideas",
    "notes": "Fraze lungi cu subordonate; ideile se întind peste mai multe propoziții.",
    "gold": (
      "Când am început proiectul acesta, nu mi-am imaginat că o simplă aplicație de dictare "
      "va ajunge să ne schimbe felul în care lucrăm, pentru că, la început, voiam doar să scriu "
      "mai repede notițele de la ședințe, fără să mai pierd ore întregi la tastatură. "
      "Pe parcurs însă am observat că, dacă textul apare pe ecran aproape imediat, gândul nu se mai "
      "rupe, iar ideile care altfel s-ar fi pierdut între două propoziții rămân legate una de alta. "
      "De aceea cred că o unealtă bună nu trebuie doar să recunoască cuvintele, ci trebuie să "
      "înțeleagă și unde se termină o idee și unde începe următoarea, chiar și atunci când vorbitorul "
      "face pauze lungi, se gândește cu voce tare sau revine asupra unui lucru spus cu câteva minute "
      "în urmă. Dacă reușim să păstrăm continuitatea aceasta pe parcursul unei dictări de o oră, "
      "atunci rezumatul pe care îl construim în fundal poate deveni o memorie reală a discuției, "
      "nu doar o listă de fraze tăiate la întâmplare. Totuși, trebuie să fim foarte atenți ca "
      "rezumatul să nu adauge nimic din afară, pentru că o singură informație inventată, oricât de "
      "mică ar părea, poate strica încrederea omului care se bazează pe text ca să-și amintească "
      "ce a spus de fapt. Prin urmare, prefer un rezumat mai scurt și mai sărac, dar fidel, decât unul "
      "elegant care spune lucruri pe care nimeni nu le-a rostit vreodată."
    ),
    "tts": None,
    "facts": {"entities": [], "superseded": []},
  },
  {
    "id": "02_autocorectari",
    "category": "self_corrections",
    "notes": "Reveniri și reluări rostite explicit („adică… nu”, „mai bine zis”, „stai”). "
             "Gold verbatim păstrează și forma greșită, și corectura.",
    "gold": (
      "Bun, deci ședința de proiect se mută marți, adică nu, nu marți, miercuri, la ora zece. "
      "Participă Andrei, Maria și, stai, nu Maria, Mariana de la contabilitate. "
      "Vrem să discutăm bugetul pe trimestrul trei, mai bine zis pe trimestrul patru, pentru că "
      "trimestrul trei e deja închis. Am trimis documentul ieri, de fapt nu ieri, alaltăieri seara, "
      "dar se pare că nu a ajuns la toată lumea. Rog pe cineva să verifice lista, lista de, "
      "lista de distribuție, și să o actualizeze până joi. "
      "Apoi, a doua problemă, sau mai degrabă prima, dacă ne gândim la urgență, este contractul cu "
      "furnizorul din Cluj, scuze, din Brașov, care expiră la sfârșitul lunii. "
      "Eu aș propune să-l prelungim cu șase luni, nu, cu un an, ca să nu mai negociem din nou în "
      "primăvară. Dacă cineva nu e de acord, vă rog să-mi scrieți, adică, mai bine sunați-mă, "
      "că e mai repede. Și încă ceva, am uitat să spun, sala nu mai e cea de la etajul doi, "
      "ci sala mare de la parter, cea de lângă recepție. Reiau, pe scurt: miercuri, la ora zece, "
      "sala mare de la parter, cu Andrei și Mariana, despre bugetul pe trimestrul patru și "
      "contractul cu Brașovul."
    ),
    "tts": None,
    "facts": {
      "entities": ["miercuri", "Andrei", "Mariana", "Brașov", "parter"],
      "superseded": ["marți", "Maria", "trimestrul trei", "Cluj", "șase luni", "etajul doi"],
    },
  },
  {
    "id": "03_intrebari",
    "category": "questions_rising",
    "notes": "Întrebări totale (da/nu) fără cuvânt interogativ — se disting de afirmații doar prin "
             "intonație ascendentă — amestecate cu întrebări parțiale și afirmații.",
    "gold": (
      "Ai terminat raportul? Îl trimiți azi? Bine. Atunci am câteva întrebări pentru tine. "
      "Ai verificat cifrele din tabelul al doilea? Directorul a văzut deja varianta veche? "
      "Pentru că, dacă a văzut-o, trebuie să-i explicăm diferențele. Când crezi că putem face "
      "o întâlnire scurtă? Mâine dimineață ți-ar conveni? Sau preferi după-amiază? "
      "Eu sunt liber de la două. Clientul a confirmat comanda? Nu știu. Tu știi? "
      "Dacă nu a confirmat, ce facem cu stocul rezervat? Îl eliberăm? Îl mai ținem o săptămână? "
      "Și încă un lucru: echipa de testare a primit versiunea nouă? A raportat ceva grav? "
      "Mi s-a spus că aplicația se închide uneori la pornire. E adevărat? Se întâmplă pe toate "
      "calculatoarele sau doar pe cele vechi? Cine se ocupă de problema asta? Tu sau colegul tău? "
      "De ce nu am aflat mai devreme? Nu e un reproș, vreau doar să înțeleg. "
      "Putem să stabilim acum cine răspunde de ce? Ești de acord? Perfect. "
      "Atunci ne vedem mâine. Îmi trimiți un mesaj când ajungi? Mulțumesc."
    ),
    "tts": None,
    "facts": {"entities": ["tabelul al doilea", "de la două"], "superseded": []},
  },
  {
    "id": "04_afirmatii_ferme",
    "category": "firm_statements",
    "notes": "Afirmații scurte, categorice, cu negații și imperative; punctul final e obligatoriu.",
    "gold": (
      "Decizia este luată. Nu mai amânăm lansarea. Versiunea nouă iese luni, indiferent de "
      "vreme sau de alte priorități. Toată echipa lucrează de acum înainte pe aceeași ramură. "
      "Nu se mai adaugă funcții noi până la lansare. Orice eroare critică se raportează imediat, "
      "nu la sfârșitul zilei. Testele automate trebuie să treacă înainte de fiecare livrare. "
      "Nimeni nu publică nimic fără o a doua verificare. Documentația se actualizează în aceeași zi "
      "cu codul. Clientul primește un singur mesaj oficial, nu zece mesaje separate. "
      "Bugetul rămâne neschimbat. Nu cerem bani în plus. Nu angajăm pe nimeni nou în luna aceasta. "
      "Răspunderea pentru calitate este a noastră, a tuturor, nu doar a echipei de testare. "
      "Am încredere în voi. Știu că termenul este strâns. Știu și că putem să-l respectăm. "
      "Dacă apare o problemă reală, o rezolvăm împreună, fără să căutăm vinovați. "
      "Ședința de mâine începe la timp. Telefoanele rămân închise. Fiecare vine cu propriul raport. "
      "Asta este tot pentru azi. Mulțumesc tuturor. Ne vedem mâine dimineață, la prima oră."
    ),
    "tts": None,
    "facts": {"entities": ["luni"], "superseded": []},
  },
  {
    "id": "05_liste",
    "category": "lists",
    "notes": "Enumerări rostite: cu „în primul rând / apoi”, cu numerotare, cu virgule și „și”.",
    "gold": (
      "Pentru mutarea biroului avem nevoie de următoarele lucruri. În primul rând, cutii de carton, "
      "bandă adezivă, folie cu bule și markere. Apoi, o listă cu toate calculatoarele, monitoarele, "
      "imprimantele și cablurile, fiecare cu eticheta ei. "
      "Pașii sunt aceștia: unu, golim dulapurile; doi, împachetăm documentele în ordine alfabetică; "
      "trei, deconectăm echipamentele; patru, notăm pe fiecare cutie camera de destinație; "
      "cinci, verificăm la final că nu a rămas nimic în birourile vechi. "
      "De cumpărat de la magazin: pâine, lapte, ouă, brânză, roșii, castraveți, ceapă, usturoi, "
      "ulei de măsline și o sticlă de apă minerală. "
      "Pentru prezentare, structura va fi: introducere, contextul proiectului, rezultatele din "
      "primul an, problemele întâmpinate, soluțiile propuse și, la sfârșit, întrebările publicului. "
      "Echipa de mutare este formată din Ion, Elena, Mihai, Cristina și Radu. "
      "Ion se ocupă de calculatoare, Elena de documente, Mihai de mobilier, Cristina de inventar, "
      "iar Radu coordonează totul. Lucruri de evitat: să amestecăm cablurile, să lăsăm cutiile "
      "nenotate, să pierdem cheile și să mutăm totul într-o singură zi."
    ),
    "tts": None,
    "facts": {"entities": ["Ion", "Elena", "Mihai", "Cristina", "Radu"], "superseded": []},
  },
  {
    "id": "06_numere_nume",
    "category": "numbers_names",
    "notes": "Ore, date, sume, procente, telefoane, nume proprii românești și localități. "
             "Gold folosește cifre; TTS rostește în litere. Folosiți --normalize-numbers pentru "
             "scor indiferent de forma (cifre/litere).",
    "gold": (
      "Domnul Gheorghe Popescu ajunge la Iași pe 14 martie 2027, cu trenul de la ora 13:15. "
      "Doamna Ioana Constantinescu îl așteaptă în gara din Iași, la peronul 3. "
      "Factura numărul 2481 are valoarea de 1250 de lei, iar avansul plătit este de 300 de lei. "
      "Rămân de plată 950 de lei până pe 31 martie. Dobânda crește cu 2,5 la sută pe an. "
      "Ședința cu firma Bogdan și Asociații din Timișoara are loc pe 2 aprilie, la ora 9:30, "
      "în sala 204. Numărul de telefon al secretariatului este 0721 345 678. "
      "Profesorul Mircea Vasilescu de la Universitatea din Cluj-Napoca a confirmat prezența "
      "pentru 18 aprilie. Conferința durează 3 zile și are 120 de participanți din 7 țări. "
      "Biletul de avion de la București la Constanța costă 89 de euro. "
      "Doamna Ecaterina Dumitrescu, născută în 1958, locuiește pe strada Mihai Eminescu, "
      "numărul 47, apartamentul 12, în Suceava. Pachetul cântărește 4,2 kilograme și ajunge "
      "în 48 de ore. Coada la ghișeu a fost de 25 de minute, iar temperatura afară era de "
      "minus 7 grade."
    ),
    "tts": (
      "Domnul Gheorghe Popescu ajunge la Iași pe paisprezece martie două mii douăzeci și șapte, "
      "cu trenul de la ora treisprezece și cincisprezece. "
      "Doamna Ioana Constantinescu îl așteaptă în gara din Iași, la peronul trei. "
      "Factura numărul două mii patru sute optzeci și unu are valoarea de o mie două sute cincizeci "
      "de lei, iar avansul plătit este de trei sute de lei. "
      "Rămân de plată nouă sute cincizeci de lei până pe treizeci și unu martie. "
      "Dobânda crește cu doi virgulă cinci la sută pe an. "
      "Ședința cu firma Bogdan și Asociații din Timișoara are loc pe doi aprilie, la ora nouă și "
      "treizeci, în sala două sute patru. Numărul de telefon al secretariatului este zero șapte "
      "sute douăzeci și unu, trei sute patruzeci și cinci, șase sute șaptezeci și opt. "
      "Profesorul Mircea Vasilescu de la Universitatea din Cluj-Napoca a confirmat prezența "
      "pentru optsprezece aprilie. Conferința durează trei zile și are o sută douăzeci de "
      "participanți din șapte țări. "
      "Biletul de avion de la București la Constanța costă optzeci și nouă de euro. "
      "Doamna Ecaterina Dumitrescu, născută în o mie nouă sute cincizeci și opt, locuiește pe "
      "strada Mihai Eminescu, numărul patruzeci și șapte, apartamentul doisprezece, în Suceava. "
      "Pachetul cântărește patru virgulă doi kilograme și ajunge în patruzeci și opt de ore. "
      "Coada la ghișeu a fost de douăzeci și cinci de minute, iar temperatura afară era de "
      "minus șapte grade."
    ),
    "facts": {
      "entities": ["Gheorghe Popescu", "Iași", "14 martie", "13:15", "Ioana Constantinescu",
                   "2481", "1250", "300", "950", "31 martie", "2,5", "Timișoara", "9:30", "204",
                   "0721", "Mircea Vasilescu", "Cluj-Napoca", "18 aprilie", "120", "București",
                   "Constanța", "89", "Ecaterina Dumitrescu", "1958", "Mihai Eminescu", "47",
                   "Suceava", "4,2", "48", "25"],
      "superseded": [],
    },
  },
  {
    "id": "07_zgomot_suprapunere",
    "category": "noisy_overlap",
    "notes": "Vorbitor principal (vocea mihai) + al doilea vorbitor (aceeași voce, pitch +3 semitonuri, "
             "-12 dB, text diferit, suprapus în ferestre) + zgomot roz la SNR ~10 dB + bâzâit 50 Hz. "
             "Gold = DOAR vorbitorul principal. Cuvintele vorbitorului secundar apărute în ipoteză "
             "sunt inserții (= conținut neancorat în referință).",
    "gold": (
      "Bună ziua tuturor, vă rog să mă ascultați un minut, chiar dacă e zgomot în sală. "
      "Am primit rezultatele analizei de ieri și vreau să le discutăm pe scurt. "
      "Vânzările au crescut în nordul țării, dar au scăzut ușor în sud, mai ales în orașele mici. "
      "Cred că explicația ține de transport, nu de calitatea produsului. "
      "Depozitul din Bacău a livrat cu întârziere aproape toată luna trecută. "
      "Propun să mutăm o parte din stoc la Ploiești, ca să scurtăm drumul spre sud. "
      "Știu că ușa se tot deschide și că lumea vorbește pe hol, dar e important să rămână clar "
      "un lucru: nu schimbăm prețurile până nu rezolvăm livrările. "
      "Echipa de logistică pregătește un plan până vineri. După aceea, ne întâlnim din nou și "
      "decidem dacă extindem programul de livrare și în weekend. "
      "Dacă aveți observații, scrieți-le pe foaia de la intrare sau trimiteți-mi un mesaj. "
      "Vă mulțumesc pentru răbdare și îmi cer scuze pentru gălăgie. "
      "Ne revedem săptămâna viitoare, în aceeași sală, la aceeași oră, sper eu, mai în liniște."
    ),
    "tts": None,
    "interferer": (
      "Alo, da, sunt eu, nu te aud bine, sună-mă mai târziu. "
      "Cine a lăsat cafeaua pe masă? Hai că închidem ușa. "
      "Am uitat cheile la mașină, mă întorc imediat. "
      "Zi-i lui Sorin că vin și eu la prânz. "
      "Unde e încărcătorul meu? L-am lăsat lângă imprimantă."
    ),
    "facts": {"entities": ["Bacău", "Ploiești", "vineri"], "superseded": []},
  },
]
