# -*- coding: utf-8 -*-
"""Probe suplimentare (2026-10-26): punctuație completă, dialog multi-vorbitor, numere/date.

Câmpuri noi față de samples_ro.py:
  focus_marks = semnele evaluate țintit pentru proba respectivă (cheile din score.MARKS)
  facts.data  = {tip: [valori formatate corect]} — pentru „acuratețe numere/date” pe tip
  turns       = [(vorbitor, text_rostit)] — doar la dialog multi-vorbitor; vorbitorul B e
                sintetizat cu aceeași voce Piper, pitch +3 semitonuri (sintetic, etichetat).
TTS: textul rostit nu conține ghilimele/linii de dialog (Piper le-ar citi ciudat); pauzele vin
din --sentence-silence și din virgule. Intonația pentru ! și ? e cea a lui Piper (slabă).
"""

EXTRA_SAMPLES = [
  {
    "id": "08_exclamatii",
    "category": "exclamations",
    "focus_marks": ["exclam", "period"],
    "notes": "Exclamații emfatice amestecate cu afirmații neutre; semnul ! trebuie distins de punct.",
    "gold": (
      "Ce zi frumoasă! Am terminat, în sfârșit, toată lucrarea. Nu-mi vine să cred! "
      "Am muncit trei luni la ea și acum e gata. Bravo vouă, ați fost extraordinari! "
      "Mâine o trimitem la tipografie. Ce bucurie pe mine! Totuși, mai avem de verificat coperta. "
      "Atenție, nu atingeți fișierul final! Îl salvez eu pe stick și pe disc. "
      "Doamne, cât am alergat săptămâna asta! Acum putem să ne odihnim puțin. "
      "Ura, am reușit! Diseară mergem la masă împreună. Nu accept niciun refuz! "
      "Plătesc eu, pentru că așa am promis. Ce noroc am avut cu echipa asta! "
      "Mulțumesc tuturor, din suflet!"
    ),
    "tts": None,
    "facts": {"entities": [], "superseded": []},
  },
  {
    "id": "09_citate",
    "category": "quotes",
    "focus_marks": ["quote", "colon", "comma"],
    "notes": "Vorbire raportată și expresii citate; gold folosește ghilimele românești „…” "
             "(scorer-ul acceptă și \"…\", «…», “…”).",
    "gold": (
      "Directorul a spus clar: „Nu mai acceptăm întârzieri.” "
      "Apoi a adăugat, pe un ton mai blând: „Știu că ați muncit mult.” "
      "Colegul meu numește proiectul acesta „marea mutare”. "
      "Pe ușa biroului scrie „Intrarea interzisă”, dar toată lumea intră. "
      "Bunica îmi zicea mereu: „Graba strică treaba.” "
      "Clientul a răspuns doar atât: „Mă mai gândesc.” "
      "Cuvântul „urgent” apare de cinci ori în același mesaj. "
      "Am citit în ziar titlul „Primăvara vine mai devreme anul acesta”. "
      "Maria a întrebat: „Cine vine cu mine la piață?” "
      "Iar Andrei a strigat din hol: „Eu vin!” "
      "Profesorul ne-a spus că „o greșeală recunoscută e pe jumătate iertată”."
    ),
    "tts": (
      "Directorul a spus clar: Nu mai acceptăm întârzieri. "
      "Apoi a adăugat, pe un ton mai blând: Știu că ați muncit mult. "
      "Colegul meu numește proiectul acesta, marea mutare. "
      "Pe ușa biroului scrie, Intrarea interzisă, dar toată lumea intră. "
      "Bunica îmi zicea mereu: Graba strică treaba. "
      "Clientul a răspuns doar atât: Mă mai gândesc. "
      "Cuvântul, urgent, apare de cinci ori în același mesaj. "
      "Am citit în ziar titlul, Primăvara vine mai devreme anul acesta. "
      "Maria a întrebat: Cine vine cu mine la piață? "
      "Iar Andrei a strigat din hol: Eu vin! "
      "Profesorul ne-a spus că, o greșeală recunoscută e pe jumătate iertată."
    ),
    "facts": {"entities": ["Maria", "Andrei"], "superseded": []},
  },
  {
    "id": "10_punct_si_virgula",
    "category": "semicolons",
    "focus_marks": ["semicolon", "comma", "period"],
    "notes": "Propoziții coordonate legate prin ; (pauză medie, fără coborâre finală de ton).",
    "gold": (
      "Dimineața lucrez la raport; după-amiaza răspund la mesaje. "
      "Echipa din Iași se ocupă de interfață; echipa din Cluj se ocupă de server. "
      "Primul capitol e gata; al doilea mai are nevoie de o lectură. "
      "Nu pot veni marți; pot veni însă joi, după ora prânzului. "
      "Prețul a crescut; calitatea, din păcate, a rămas aceeași. "
      "Unii preferă cafeaua; alții beau doar ceai verde. "
      "Am verificat contractul; nu am găsit nicio greșeală. "
      "Vremea e frumoasă; totuși, iau umbrela cu mine. "
      "Copiii dorm; casa e, în sfârșit, liniștită. "
      "Proiectul nu e perfect; e însă cel mai bun pe care l-am făcut până acum."
    ),
    "tts": None,
    "facts": {"entities": ["Iași", "Cluj"], "superseded": []},
  },
  {
    "id": "11_virgule",
    "category": "commas",
    "focus_marks": ["comma"],
    "notes": "Virgule: vocativ, incidente, subordonate antepuse, apoziții, enumerări scurte.",
    "gold": (
      "Ioana, te rog să închizi fereastra. Mâine, dacă nu plouă, mergem la munte. "
      "Fratele meu, care locuiește la Brașov, vine de sărbători. "
      "Desigur, poți să iei mașina, dar adu-o înapoi până seara. "
      "Când am ajuns acasă, toată lumea dormea. "
      "Domnul Popa, vecinul nostru, repară biciclete, trotinete și cărucioare. "
      "Din păcate, magazinul era închis, așa că ne-am întors fără pâine. "
      "Dragi colegi, vă mulțumesc pentru răbdare. "
      "Cartea, deși veche, se citește foarte ușor. "
      "Dacă ai timp, sună-mă, ca să stabilim detaliile. "
      "În schimb, eu cred că ar trebui să mai așteptăm, cel puțin o săptămână."
    ),
    "tts": None,
    "facts": {"entities": ["Ioana", "Brașov", "Popa"], "superseded": []},
  },
  {
    "id": "12_puncte",
    "category": "periods",
    "focus_marks": ["period"],
    "notes": "Propoziții scurte, declarative, separate de pauze clare; testează segmentarea și punctul final.",
    "gold": (
      "Am ajuns la birou la opt. Cafeaua era deja făcută. Colegii nu sosiseră încă. "
      "Am deschis calculatorul. Aveam patruzeci de mesaje noi. Am citit doar trei. "
      "Restul pot să aștepte. Pe la nouă a venit Dan. A adus covrigi pentru toată lumea. "
      "Am vorbit despre meciul de aseară. Echipa noastră a pierdut. Nimeni nu era surprins. "
      "Apoi am început ședința. A durat o oră. Am stabilit trei termene noi. "
      "Primul este vineri. Al doilea este la sfârșitul lunii. Al treilea nu e încă fixat. "
      "La prânz am ieșit în parc. Era soare. M-am simțit bine."
    ),
    "tts": None,
    "facts": {"entities": ["Dan"], "superseded": []},
  },
  {
    "id": "13_dialog_linie",
    "category": "dialogue_dashes",
    "focus_marks": ["dash", "question", "exclam", "comma"],
    "notes": "Un singur vorbitor dictează un dialog literar; gold folosește linia de dialog — "
             "(scorer-ul acceptă și – sau - izolat). Fiecare replică pe rând nou.",
    "gold": (
      "— Vii mâine la noi? a întrebat Ana.\n"
      "— Nu știu încă, a răspuns Mihai. Depinde de program.\n"
      "— Hai, te rog! Facem plăcinte.\n"
      "— Bine, vin, dar doar o oră.\n"
      "— Perfect. Adu și chitara, dacă poți.\n"
      "— O aduc. Ce cântec vrei să cântăm?\n"
      "— Pe cel vechi, de la mare. Ți-l mai amintești?\n"
      "— Cum să nu! L-am cântat toată vara.\n"
      "— Atunci ne vedem la șase.\n"
      "— Ne vedem. Și spune-i mamei tale că vin cu flori."
    ),
    "tts": (
      "Vii mâine la noi? a întrebat Ana. "
      "Nu știu încă, a răspuns Mihai. Depinde de program. "
      "Hai, te rog! Facem plăcinte. "
      "Bine, vin, dar doar o oră. "
      "Perfect. Adu și chitara, dacă poți. "
      "O aduc. Ce cântec vrei să cântăm? "
      "Pe cel vechi, de la mare. Ți-l mai amintești? "
      "Cum să nu! L-am cântat toată vara. "
      "Atunci ne vedem la șase. "
      "Ne vedem. Și spune-i mamei tale că vin cu flori."
    ),
    "facts": {"entities": ["Ana", "Mihai"], "superseded": []},
  },
  {
    "id": "14_puncte_suspensie",
    "category": "ellipses",
    "focus_marks": ["ellipsis", "comma", "period"],
    "notes": "Ezitări și pauze suspendate → …; scorer-ul acceptă și ... ca echivalent. "
             "TTS: pauza e marcată cu virgulă + tăcere; intonația suspendată reală lipsește (sintetic).",
    "gold": (
      "Mă gândeam că… poate ar fi mai bine să plecăm mai devreme. "
      "Nu știu… parcă am uitat ceva acasă. "
      "Era o vreme când… mă rog, nu mai contează. "
      "Am vrut să-ți spun ceva important, dar… mi-a ieșit din minte. "
      "Deci… unde rămăseserăm? A, da, la buget. "
      "Bugetul ar fi de… să zicem, două mii de lei. "
      "Dacă nu ajunge… o să găsim o soluție. "
      "Și apoi… liniște. Nimeni nu a mai zis nimic. "
      "Poate mâine… sau poimâine, vedem. "
      "Ei bine… asta a fost tot."
    ),
    "tts": (
      "Mă gândeam că, poate ar fi mai bine să plecăm mai devreme. "
      "Nu știu, parcă am uitat ceva acasă. "
      "Era o vreme când, mă rog, nu mai contează. "
      "Am vrut să-ți spun ceva important, dar, mi-a ieșit din minte. "
      "Deci, unde rămăseserăm? A, da, la buget. "
      "Bugetul ar fi de, să zicem, două mii de lei. "
      "Dacă nu ajunge, o să găsim o soluție. "
      "Și apoi, liniște. Nimeni nu a mai zis nimic. "
      "Poate mâine, sau poimâine, vedem. "
      "Ei bine, asta a fost tot."
    ),
    "facts": {"entities": [], "superseded": []},
  },
  {
    "id": "15_doua_puncte",
    "category": "colons",
    "focus_marks": ["colon", "comma", "period"],
    "notes": "Două puncte înaintea enumerărilor și explicațiilor.",
    "gold": (
      "Pentru excursie luăm următoarele: cort, saci de dormit, lanternă și apă. "
      "Regula e simplă: cine gătește nu spală vasele. "
      "Avem trei opțiuni: trenul, autobuzul sau mașina. "
      "Problema principală este aceasta: nu avem destui oameni. "
      "Pe listă sunt patru nume: Elena, Radu, Sorin și Ilinca. "
      "Concluzia mea: amânăm lansarea cu o săptămână. "
      "Ingrediente: făină, ouă, lapte, zahăr și un praf de sare. "
      "Un singur lucru contează acum: să terminăm la timp. "
      "Programul de mâine: dimineața ședință, după-amiaza teste, seara raport. "
      "Motivul e clar: clientul a cerut modificări."
    ),
    "tts": None,
    "facts": {"entities": ["Elena", "Radu", "Sorin", "Ilinca"], "superseded": []},
  },
  {
    "id": "16_numere_date",
    "category": "numbers_data",
    "focus_marks": ["comma", "period"],
    "notes": "Formatare date numerice în dictare RO: procente, monede (lei/euro/dolari), ore HH:MM, "
             "date zi/lună/an, numere mari, telefoane, adrese. Gold = formatul corect cu cifre; TTS "
             "rostește în litere. facts.data grupează valorile pe tip pentru acuratețe per tip.",
    "gold": (
      "Inflația a scăzut la 4,5% în septembrie, după 6,2% în august. "
      "Dobânda la credit este de 7,25%, iar comisionul de administrare de 0,5%. "
      "Chiria costă 450 de euro pe lună, adică aproximativ 2.240 de lei. "
      "Licența software costă 199 de dolari, plus 35 de lei taxa de transfer. "
      "Trenul pleacă la 06:45 și ajunge la 11:20. Ședința începe la 14:30 și se termină la 16:00. "
      "Contractul a fost semnat pe 15.03.2024 și expiră pe 31.12.2026. "
      "Termenul de plată este 05.11.2026. "
      "Populația orașului a ajuns la 1.250.000 de locuitori. Bugetul anual este de 3.700.000 de lei. "
      "Firma a vândut 48.500 de bucăți anul trecut. "
      "Mă puteți suna la 0744 123 456 sau la fix, la 021 315 22 10. "
      "Adresa este strada Mihai Viteazu nr. 12, bl. A3, sc. 2, ap. 45, sector 3, București. "
      "Coletul pleacă din bulevardul Independenței nr. 7, Iași, cod poștal 700100."
    ),
    "tts": (
      "Inflația a scăzut la patru virgulă cinci la sută în septembrie, după șase virgulă doi la sută în august. "
      "Dobânda la credit este de șapte virgulă douăzeci și cinci la sută, iar comisionul de administrare de zero virgulă cinci la sută. "
      "Chiria costă patru sute cincizeci de euro pe lună, adică aproximativ două mii două sute patruzeci de lei. "
      "Licența software costă o sută nouăzeci și nouă de dolari, plus treizeci și cinci de lei taxa de transfer. "
      "Trenul pleacă la ora șase și patruzeci și cinci și ajunge la unsprezece și douăzeci. "
      "Ședința începe la paisprezece și treizeci și se termină la ora șaisprezece. "
      "Contractul a fost semnat pe cincisprezece martie două mii douăzeci și patru și expiră pe "
      "treizeci și unu decembrie două mii douăzeci și șase. "
      "Termenul de plată este cinci noiembrie două mii douăzeci și șase. "
      "Populația orașului a ajuns la un milion două sute cincizeci de mii de locuitori. "
      "Bugetul anual este de trei milioane șapte sute de mii de lei. "
      "Firma a vândut patruzeci și opt de mii cinci sute de bucăți anul trecut. "
      "Mă puteți suna la zero șapte patru patru, unu doi trei, patru cinci șase, sau la fix, la "
      "zero doi unu, trei unu cinci, douăzeci și doi, zece. "
      "Adresa este strada Mihai Viteazu numărul doisprezece, blocul A trei, scara doi, apartamentul "
      "patruzeci și cinci, sector trei, București. "
      "Coletul pleacă din bulevardul Independenței numărul șapte, Iași, cod poștal șapte sute o sută."
    ),
    "facts": {
      "entities": ["4,5%", "6,2%", "7,25%", "0,5%", "450 de euro", "2.240 de lei", "199 de dolari",
                   "35 de lei", "06:45", "11:20", "14:30", "16:00", "15.03.2024", "31.12.2026",
                   "05.11.2026", "1.250.000", "3.700.000", "48.500", "0744 123 456",
                   "021 315 22 10", "nr. 12", "ap. 45", "București", "Iași", "700100"],
      "superseded": [],
      "data": {
        "percent": ["4,5%", "6,2%", "7,25%", "0,5%"],
        "currency": ["450 de euro", "2.240 de lei", "199 de dolari", "35 de lei"],
        "time": ["06:45", "11:20", "14:30", "16:00"],
        "date": ["15.03.2024", "31.12.2026", "05.11.2026"],
        "large_number": ["1.250.000", "3.700.000", "48.500"],
        "phone": ["0744 123 456", "021 315 22 10"],
        "address": ["strada Mihai Viteazu nr. 12", "bl. A3", "sc. 2", "ap. 45", "sector 3",
                    "bulevardul Independenței nr. 7", "700100"],
      },
    },
  },
  {
    "id": "17_dialog_vorbitori",
    "category": "multi_speaker_dialogue",
    "focus_marks": ["dash", "question", "exclam", "period"],
    "notes": "Doi vorbitori care alternează (SINTETIC: vorbitorul B = aceeași voce Piper, pitch +3 "
             "semitonuri; pauză 0,5 s între replici, fără suprapunere). Gold = toate replicile, câte una "
             "pe rând, cu linie de dialog. Metrică: segmentarea la schimbarea vorbitorului (propoziții).",
    "turns": [
      ("A", "Bună ziua, cu ce vă pot ajuta?"),
      ("B", "Bună ziua. Aș vrea să fac o programare la medicul de familie."),
      ("A", "Sigur. Pentru ce zi?"),
      ("B", "Dacă se poate, joi dimineața."),
      ("A", "Joi dimineața e totul ocupat. Vineri la zece vă convine?"),
      ("B", "Vineri la zece e perfect!"),
      ("A", "Pe ce nume fac programarea?"),
      ("B", "Pe numele Elena Stoica."),
      ("A", "Aveți și un număr de telefon?"),
      ("B", "Da, vă dau imediat. Sau, stați, mai bine vă trimit pe mesaj."),
      ("A", "Bine. Vă rog să veniți cu zece minute mai devreme."),
      ("B", "Mulțumesc mult! O zi bună."),
      ("A", "La fel. La revedere!"),
    ],
    "gold": None,   # construit din turns
    "tts": None,
    "facts": {"entities": ["Elena Stoica", "joi", "Vineri"], "superseded": []},
  },
]

for _s in EXTRA_SAMPLES:
    if _s.get("turns") and _s["gold"] is None:
        _s["gold"] = "\n".join("— " + t for _, t in _s["turns"])
