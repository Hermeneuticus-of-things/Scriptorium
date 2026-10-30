# VKB2: definițiile autorului pentru I-REP și I-EDIT

Primite de la autor la 2026-10-24. Sursa de adevăr pentru implementarea din Pneuma Sofer
(`src/lib/nearRepetition.js`, `src/lib/authorText.js`, `src/lib/editorial.js`, panoul I-REP / I-EDIT).

## I-REP: repetiția apropiată (cerința O13, §H107; închis §H121)

- **Ce este:** un detector determinist (în VKB2: `00_MOTOR/vkb2/det_repetitie_apropiata.py`) care semnalează același cuvânt cu conținut (aceeași lemă sau formă) repetat în aceeași frază sau în două fraze vecine, inclusiv anadiploza „…scutul. Scutul…”.
- **Ce dă:** câte un rând `⚠ REP L<n> «formă» ×k` pe fiecare rând al textului unde are apariții un grup; fără direcție, fără propunere. SOFT: nu oprește nimic.
- **Unde intră în buclă:** punct de catalog `D:repetitie_apropiata`, legat de sămânța S70 („termenul nu se schimbă doar ca să nu se repete”), deci ajunge numai la cititorul R8b (cuvântul și litera), nu la rece și nu la rece2. Cititorul judecă cu S70 dacă repetiția supără; termenii cărții („faptă”, „karma”, „urmă”) nu sunt excluși.
- **Ce nu numără:** cuvintele-unealtă (pronume, prepoziții, numerale, auxiliare), locuțiunile („în fața”); reduplicatele („pas cu pas”) contează o singură apariție.
- **Măsurat pe carte:** 3.604 grupuri (24 pe 0.1, 27 pe 0.2).

## I-EDIT: editarea autorului în previzualizare (cerința §H109; partea 1 §H117, partea 2 §H123–§H124)

### Partea 1: panoul
- Butonul **✎ Editează** pe vederea Text; **Salvează** scrie fișierul cu copie `.bak-autor-<dată-oră>`, atomic, cu capetele de rând păstrate.
- Refuză dacă fișierul s-a schimbat între timp (409) sau dacă textul e sub 20% din cel vechi (412, cu „Salvează oricum”).
- Fiecare salvare scrie în `MODIFICARI_AUTOR.jsonl` câte un rând pe bucată: fișier, rând, vechi, nou, oră, hash-uri.
- Doar pagina autorului poate scrie (jeton pe proces; o pagină străină primește 403).

### Partea 2: legătura cu planul
- Ce a scris autorul e decizie. Bucla nu rescrie un rând al autorului: poarta HARD `fraza_autor_atinsa` respinge orice patch care îl schimbă, îl mută sau îl șterge, fără excepție.
- Itemii cititorilor (și ai porților, și chiar un item mai vechi al autorului) care cad pe rândul autorului nu merg la scriitor: vin la autor ca semnal în `COADA_AUTOR`.
- Itemii de pe rândurile vecine merg la scriitor cu nota „leagă de textul autorului, fără să-l schimbi”.
- Cititorii văd în pachet secțiunea „TEXT AL AUTORULUI (doar semnalezi)”.
- Jurnalul buclei primește `MODIFICARE_AUTOR` o singură dată pe fiecare salvare; raportul de buclă are secțiunea „Modificările tale în text”.
- Nicio scriere nu se face fără reverificarea octeților chiar înainte, ca o salvare a autorului în acea clipă să nu se piardă.
- Verdictele pe clustere expiră când textul se schimbă (fișierul de decizii poartă hash-ul textului).
