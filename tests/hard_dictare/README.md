# Set de test GREU — dictare D&TED (ASR eek/Parakeet + rezumator OpenLLM-Ro)

> **NU rulați testele pe motor fără OK explicit de la Ionuț.** Setul e *pregătit*: `hyp/` și
> `results/` sunt goale intenționat. Scorer-ul doar compară fișiere text deja produse.

## 1. Ce este și la ce folosește
Un set fix de probe audio românești (WAV 16 kHz mono) + transcrieri de referință (gold) +
un scorer, ca să măsurăm reproductibil cât de bine scrie D&TED ce s-a spus: cuvinte, propoziții,
punctuație (fiecare semn), numere/date, entități, și dacă rezumatul inventează ceva.
Rezultatele sunt comparabile între versiuni ale motorului (Python → C++ nativ, v3 → eek RO, CPU → CUDA).

Căi: Windows (canonic) `C:\Users\Ionut\dted-hard-test\` ·
Linux box `/workspace/dted/repo/teste/hard_dictare/` (oglindă identică, necomisă) ·
GitHub (de urcat) `Hermeneuticus-of-things/Scriptorium` → `tests/hard_dictare/`.

## 2. Categorii (17 probe)

| id | categorie | ce testează | durată | semne țintă |
|---|---|---|---|---|
| 01_idei_lungi | long_ideas | fraze lungi, subordonate, idei peste propoziții | 85.5 s | — |
| 02_autocorectari | self_corrections | „marți, adică nu, miercuri”; rezumatul trebuie să rețină forma corectată | 76.2 s | — |
| 03_intrebari | questions_rising | întrebări totale doar prin intonație ascendentă → `?` | 74.5 s | ? |
| 04_afirmatii_ferme | firm_statements | afirmații scurte categorice, punct final | 76.2 s | . |
| 05_liste | lists | enumerări cu `,` `;` `:` | 82.3 s | , : ; |
| 06_numere_nume | numbers_names | ore, date, sume, telefoane, nume, localități | 96.1 s | — |
| 07_zgomot_suprapunere | noisy_overlap | zgomot roz SNR≈10 dB, 50 Hz, vorbitor secundar −12 dB (+ control curat) | 67.8 s | — |
| 08_exclamatii | exclamations | intonație emfatică → `!` vs `.` | 43.1 s | ! . |
| 09_citate | quotes | vorbire raportată, expresii citate → „ ” | 43.9 s | " : , |
| 10_punct_si_virgula | semicolons | coordonate legate cu `;` | 42.1 s | ; , . |
| 11_virgule | commas | vocativ, incidente, subordonate antepuse, apoziții | 41.3 s | , |
| 12_puncte | periods | propoziții scurte, segmentare | 43.8 s | . |
| 13_dialog_linie | dialogue_dashes | un vorbitor dictează dialog literar → `—` la început de replică | 31.9 s | — ? ! , |
| 14_puncte_suspensie | ellipses | ezitări/pauze suspendate → `…` | 32.4 s | … , . |
| 15_doua_puncte | colons | `:` înaintea enumerărilor/explicațiilor | 43.9 s | : , . |
| 16_numere_date | numbers_data | procente, lei/euro/dolari, HH:MM, zi.lună.an, numere mari, telefoane, adrese | 96.0 s | , . |
| 17_dialog_vorbitori | multi_speaker_dialogue | 2 vorbitori alternând (turn-taking) | 40.3 s | — ? ! . |

**Lipsesc încă:** *accente regionale* (Moldova, Ardeal, Oltenia, Banat, Maramureș) — nu există o voce
Piper RO regională; trebuie înregistrări reale (vezi `RECORDING.md`). Și voce feminină / vorbire reală.

## 3. Sintetic vs real — etichetare
**Tot audio-ul e SINTETIC** (Piper TTS, `ro_RO-mihai-medium`); fiecare intrare din `manifest.json` are
`"source": "synthetic: …"`. La 17, vorbitorul B = aceeași voce cu pitch +3 semitonuri (etichetat).
Limite: intonația pentru `?`/`!` e cea a lui Piper (slabă, regulată); ghilimelele, liniile de dialog și
`…` nu au corelat prozodic real (TTS-ul primește textul fără ele, cu virgulă/pauză în loc);
08–17 au 30–96 s (01–07 ≥ 60 s). Un scor bun pe sintetic NU garantează scor bun pe voce reală.

## 4. Unde sunt fișierele
```
audio/<id>.wav        WAV 16 kHz mono PCM16 (+ 07_…_curat_control.wav)
gold/<id>.txt         referință verbatim, UTF-8, diacritice, punctuație corectă, cifre formatate
tts_text/<id>.txt     ce a rostit efectiv Piper (numere în litere; 17: [A]/[B] pe replici)
facts/<id>.json       entities (trebuie păstrate), superseded (forme anulate), data (16: valori pe tip)
manifest.json         v2: id, category, audio, durată, gold, facts, hyp, focus_marks, source, notes
thresholds.json       praguri PASS/FAIL per categorie
score.py              scorer (stdlib Python 3.8+; jiwer opțional)
tools/samples_ro.py, tools/samples_ro_extra.py   sursa textelor (01–07, 08–17)
tools/synth_piper.py  regenerare audio (box Linux)
hyp/                  AICI vine ieșirea D&TED (gol)
results/              ieșirea scorer-ului (gol)
```

## Cum se alimentează cu ieșirea D&TED (mai târziu, doar cu OK)

Pentru fiecare probă `<id>` puneți în `hyp/`:

| fișier | conținut | obligatoriu |
|---|---|---|
| `hyp/<id>.txt` | textul confirmat (committed) scos de ASR pentru `audio/<id>.wav` | da (metrice ASR) |
| `hyp/<id>.summary.txt` | rezumatul brut produs de OpenLLM-Ro pe acel text | opțional (metrice rezumat) |
| `hyp/<id>.dted.jsonl` | liniile de log `{"component":"dted_summarizer","branch":…}` sau `Rezumat dictare: ramura=… motiv=…` | opțional (gate real) |

Lipsa unui fișier nu oprește scorul — proba apare ca „lipsește ipoteza”.

## 5. Rulare scorer
```powershell
cd C:\Users\Ionut\dted-hard-test
python score.py --manifest manifest.json --normalize-numbers           # toate
python score.py --manifest manifest.json --only 16_numere_date         # una (FĂRĂ normalize: verifică formatul)
python score.py --manifest manifest.json --hyp-dir D:\rulari\eek_x --out results\eek_x.json
python score.py --ref gold\09_citate.txt --hyp hyp\09_citate.txt --focus-marks quote colon
```
Linux: aceleași, cu `python3`. Ieșire: tabel per probă + tabel **pe categorii** + `results/last_score.json`.
`--normalize-numbers` = cifre ↔ litere echivalente (13:15 ≡ „treisprezece și cincisprezece”).

## 6. Metrici
- **WER** = (S+D+I)/cuvinte gold, aliniere Levenshtein pe tokeni normalizați (litere mici, ș/ț, fără punctuație).
- **Propoziții, pe poziții gold** (ca înainte): `sentence_success_strict` / `_lenient` (WER propoziție ≤ 0,15,
  semn final corect, 0 inventat).
- **Rata de eroare la nivel de propoziție (nou)** `asr.sentence_alignment`: propozițiile ipotezei
  (segmentate după `.` `!` `?` din hyp) se aliniază DP cu cele din gold → `correct` / `wrong` (aliniată,
  dar similaritate < 0,85 sau alt semn final) / `missing` (gold fără pereche sau contopită) / `extra`
  (hyp în plus sau fragment rupt). `sentence_error_rate = (wrong+missing+extra)/n_gold`,
  `sentence_success_rate = correct/n_gold`; lista concretă în `errors`.
- **Punctuație per semn (nou)** `asr.punctuation.per_mark` pentru **. , ; : ! ? " — …**: tp/fp/fn,
  precision, recall, F1, accuracy = tp/(tp+fp+fn), pe pozițiile aliniate (semnul aparține cuvântului
  dinainte; semnele de dinaintea primului cuvânt → primul cuvânt). Echivalențe: `...`≡`…`;
  `–` și `-` izolat ≡ `—`; `"` `„` `”` `“` `«` `»` ≡ ghilimele. Rămân și clasele vechi
  (`per_class`, micro-F1). `…` NU mai încheie propoziția (pauză).
- **Numere/date (nou)**: `data_asr` (din `facts.data`) per tip — `value_accuracy` (valoarea există la nivel
  de token; cu `--normalize-numbers` și în litere) și `format_accuracy` (exact formatul gold:
  `4,5%`, `06:45`, `15.03.2024`, `1.250.000`, `0744 123 456`, `nr. 12`); plus `numeric_tokens`
  (P/R pe tokenii-cifră, orice probă).
- **Defalcare pe categorie (nou)** `aggregate.per_category`: WER, succes/eroare propoziții, micro-F1,
  F1 per semn și pe semnele țintă (`focus_marks` din manifest), date.
- Halucinație ASR, entități, rezumat (oglinda `verify.cpp`, gate 0,90) — neschimbate.

## 7. Regula: rulăm doar testele care contează
Handoff-ul ASR → LLM din D&TED e **text UTF-8** (nu token IDs) — asta e doar interfața, nu un test.
Testele de pe setul greu se fac **la nivel de token / conținut față de gold** (cuvinte, propoziții,
semne, valori numerice), nu comparații de octeți/UTF-8 sau „textul a trecut prin pipe”. Nu rulăm
teste-umplutură: o rulare există doar dacă produce o cifră de mai sus pe audio din set.

## Ce înseamnă „FAILED” (motive în `verdict.fail_reasons`)

| motiv | definiție |
|---|---|
| `missing_words` | ștergeri (D) în aliniere, iar WER probă > prag categorie |
| `wrong_words` | substituții (S), iar WER > prag |
| `wer>X` | WER probă peste prag (implicit 0,10; 07: 0,25) |
| `sentence_success_low` | succes lenient pe propoziții < prag (implicit 0,80; 07: 0,50) |
| `bad_punctuation` | micro-F1 punctuație < prag (implicit 0,75; 07: 0,60) |
| `question_marks_missed` | (03) recall pe `?` < 0,80 |
| `invented_content` | inserții ASR fără corespondent în referință peste prag (implicit 0; 07: 2 %) |
| `entity_lost` | un nume/număr din `facts` lipsește din textul ASR |
| `gate_triggered` | rezumatul a căzut pe `verbatim_tail` (overlap < 0,90, `llm_empty`, `filtered_empty`) |
| `summary_invented_content` | rezumat cu tokeni de conținut sau cifre nesprijinite de sursă |
| `summary_superseded_asserted` | rezumatul conține o formă anulată de vorbitor (ex. „marți” în loc de „miercuri”) |
| `mark_<semn>_low` | F1 pe un semn din `focus_marks` (manifest) < `min_focus_mark_f1` (implicit 0,70) |
| `sentence_alignment_low` | succes propoziții aliniate < `min_sentence_success_aligned` (17: 0,70) |
| `data_value_wrong` / `data_format_wrong` | (16) valoare lipsă/greșită (prag 1,0) / format greșit (prag 0,80) |

La nivel de propoziție (`sentence_detail`) motivele sunt: `missing_words`, `wrong_words`,
`extra_words` (inserții existente în referință), `invented_content`, `bad_punctuation`, cu
listele concrete de cuvinte lipsă/greșite/în plus.

Pragurile se schimbă din `thresholds.json` fără a modifica codul.

## 8. Cum adaugi o categorie nouă
1. Adaugă un dict în `tools/samples_ro_extra.py` (`id` cu prefix numeric nou, `category`, `notes`,
   `gold`, `tts` dacă rostirea diferă, `facts` cu `entities`/`superseded`/`data` opțional,
   `focus_marks` din `score.MARKS`, `turns` pentru multi-vorbitor).
2. Pe box: `/workspace/piper-venv/bin/python tools/synth_piper.py --piper /workspace/piper-venv/bin/piper
   --voice /workspace/piper-voices/ro_RO-mihai-medium.onnx --only <id>` (nu regenerează restul).
3. Opțional praguri în `thresholds.json` sub cheia categoriei; un semn nou → `MARKS` + `_marks_of` în `score.py`.
4. Verifică scorer-ul cu gold ca ipoteză (`--hyp-dir gold` → totul PASS), apoi sincronizează Windows ↔ box.
5. Real: înregistrează după `RECORDING.md`, pune `"source": "real: …"`.
