# Set de test GREU — dictare D&TED (ASR eek + rezumator OpenLLM-Ro)

> **NU rulați testele fără OK explicit de la Ionuț.** Setul e doar *pregătit*: nimeni nu a
> trecut încă audio-ul prin DTED.exe, iar `hyp/` și `results/` sunt goale intenționat.

Cale canonică: `C:\Users\Ionut\dted-hard-test\`
Oglindă (versionare, necomisă): `/workspace/dted/repo/teste/hard_dictare/` pe box.

## Structură

```
dted-hard-test/
├─ README.md            acest fișier
├─ RECORDING.md         cum înlocuiți audio sintetic cu înregistrări reale
├─ manifest.json        id, categorie, audio, durată, gold, facts, hyp, summary, dted_log, note
├─ thresholds.json      praguri PASS/FAIL per categorie (editabil)
├─ score.py             scorer (doar stdlib Python 3; jiwer opțional pt. verificare încrucișată)
├─ audio/               WAV 16 kHz mono PCM16, câte unul ≥ 60 s per categorie
├─ gold/                transcrieri de referință verbatim, UTF-8, punctuație + diacritice
├─ tts_text/            textul rostit efectiv de Piper (06: numere în litere; 07: + interferent)
├─ facts/               entități obligatorii (nume/cifre) + forme anulate în autocorectări
├─ hyp/                 AICI puneți ieșirea D&TED (gol acum)
├─ results/             aici scrie scorer-ul `last_score.json` (gol acum)
└─ tools/               samples_ro.py (sursa textelor), synth_piper.py (regenerare audio)
```

## Probe

| id | categorie | durată |
|---|---|---|
| 01_idei_lungi | long_ideas | 85.53 s |
| 02_autocorectari | self_corrections | 76.21 s |
| 03_intrebari | questions_rising | 74.54 s |
| 04_afirmatii_ferme | firm_statements | 76.18 s |
| 05_liste | lists | 82.3 s |
| 06_numere_nume | numbers_names | 96.07 s |
| 07_zgomot_suprapunere | noisy_overlap | 67.83 s |

Plus `audio/07_zgomot_suprapunere_curat_control.wav` — aceeași rostire ca 07, fără zgomot și
fără al doilea vorbitor (control: diferența de WER 07 vs control = costul zgomotului).

Ce testează fiecare:
- **01 idei lungi** — fraze lungi cu subordonate; idei care se întind peste propoziții (segmentare, virgule).
- **02 autocorectări** — „marți, adică nu, miercuri”, „Maria, stai, Mariana”, „lista de, lista de distribuție”.
  ASR trebuie să le scrie verbatim; rezumatul trebuie să rețină forma CORECTATĂ (`facts/…superseded`).
- **03 întrebări** — multe întrebări totale („Îl trimiți azi?”) care se disting de afirmații doar prin
  intonație ascendentă; metrică cheie: recall pe `?`.
- **04 afirmații ferme** — propoziții scurte, categorice, cu negații; punct final obligatoriu.
- **05 liste** — enumerări cu virgule, „unu, …; doi, …”, „în primul rând / apoi”, nume în listă.
- **06 numere și nume** — ore (13:15, 9:30), date, sume, procente (2,5), telefon, ani, adrese,
  nume (Popescu, Constantinescu, Vasilescu, Dumitrescu), localități (Iași, Cluj-Napoca, Suceava…).
- **07 zgomot + suprapunere** — zgomot roz SNR ≈ 10 dB, bâzâit 50 Hz, al doilea vorbitor la −12 dB.

## Sintetic vs real

**Tot audio-ul e SINTETIC** (Piper TTS, vocea `ro_RO-mihai-medium`, rhasspy/piper-voices, licență
deschisă). Nu s-a folosit audio din `Lectii` și nici clipurile din `D:\OpenCode\probe_ro` (sunt
< 60 s sau fără transcriere de referință verificată).
Limite cunoscute ale sintezei:
- intonația ascendentă la întrebări e cea produsă de Piper/espeak pentru `?` — mai slabă și mai
  regulată decât la un om; un rezultat bun aici NU garantează rezultat bun pe voce reală;
- autocorectările sunt citite fluent, fără ezitări/lungiri reale („ăăă”, cuvinte trunchiate);
- „al doilea vorbitor” din 07 e aceeași voce cu pitch ridicat — mai ușor de separat decât o
  suprapunere reală; zgomotul e staționar;
- o singură voce masculină, fără accent regional.
Pentru verdict final, înregistrați aceleași texte cu voce reală — vezi `RECORDING.md`.

## Cum se alimentează cu ieșirea D&TED (mai târziu, doar cu OK)

Pentru fiecare probă `<id>` puneți în `hyp/`:

| fișier | conținut | obligatoriu |
|---|---|---|
| `hyp/<id>.txt` | textul confirmat (committed) scos de ASR pentru `audio/<id>.wav` | da (metrice ASR) |
| `hyp/<id>.summary.txt` | rezumatul brut produs de OpenLLM-Ro pe acel text | opțional (metrice rezumat) |
| `hyp/<id>.dted.jsonl` | liniile de log `{"component":"dted_summarizer","branch":…}` sau `Rezumat dictare: ramura=… motiv=…` | opțional (gate real) |

Lipsa unui fișier nu oprește scorul — proba apare ca „lipsește ipoteza”.

## Rulare scorer (Windows, PowerShell)

```powershell
cd C:\Users\Ionut\dted-hard-test
# toate probele din manifest
python score.py --manifest manifest.json --normalize-numbers
# o singură probă
python score.py --manifest manifest.json --only 06_numere_nume --normalize-numbers
# ipoteze dintr-un alt folder (ex. alt model/rulare)
python score.py --manifest manifest.json --hyp-dir D:\rulari\eek_2026-10-27 --out results\eek_2026-10-27.json
# fișiere directe, cu rezumat + log
python score.py --ref gold\02_autocorectari.txt --hyp hyp\02_autocorectari.txt `
  --summary hyp\02_autocorectari.summary.txt --dted-log hyp\02_autocorectari.dted.jsonl `
  --facts facts\02_autocorectari.json --category self_corrections
```
(Linux: aceleași comenzi cu `python3` și `/`.) Python 3.8+, fără pachete externe.
Ieșire: tabel în consolă + `results/last_score.json` (sau `--out`).

`--normalize-numbers` transformă cifrele în cuvinte RO pe ambele părți (13:15 ≡ „treisprezece și
cincisprezece”, 0721 ≡ „zero șapte sute douăzeci și unu”) și unifică genul (două/doi, una/unu).
Fără el, „13:15” vs „treisprezece și cincisprezece” contează ca eroare — util dacă vreți să
măsurați explicit formatarea numerelor.

## Metrici

- **WER** = (S + D + I) / cuvinte referință; aliniere Levenshtein pe cuvinte normalizate
  (litere mici, ş/ţ cu sedilă → ș/ț cu virgulă, punctuația scoasă).
- **Succes la nivel de propoziție** (propozițiile = gold împărțit la `.` `?` `!` `…`):
  *strict* = 0 erori de cuvânt ȘI semnul final corect; *lenient* = WER propoziție ≤ 0,15, semn final
  corect, 0 conținut inventat. Se raportează și rata de eșec strict.
- **Punctuație** — fiecare cuvânt poartă clasa semnului de după el (virgulă/`;`/`:` = comma,
  `.`/`…` = period, `?`, `!`); pe perechile aliniate: precision/recall/F1 per clasă + micro-F1,
  acuratețe pe pozițiile cu semn. Recall pe `?` = măsura pentru intonație ascendentă.
- **Halucinație ASR** — inserții care nu există (nici fuzzy ≥ 0,90) în vocabularul referinței;
  rata = tokeni inventați / cuvinte ipoteză; se listează spanurile. La 07 se raportează separat
  `interferer_leak` = cuvinte ale vorbitorului secundar ajunse în text.
- **Entități** — recall pe `facts/<id>.json:entities` (nume, cifre; toleranță la articol: Brașov ≈ Brașovul).
- **Rezumat** — oglindă Python a `cpp/summarizer/src/verify.cpp`: tokeni de conținut (fără stopwords,
  aceeași listă), potrivire exactă sau Levenshtein ≥ 0,90 (cifrele doar exact), overlap =
  0,75·unigram + 0,25·bigram față de **sursă** (implicit `hyp/<id>.txt` = textul ASR confirmat, nu gold;
  `--source` îl suprascrie). Halucinație rezumat = tokeni de conținut nesprijiniți / total; spanuri
  neverificate; cifre inventate.
- **Gate** — `gate_triggered` = DA dacă logul D&TED spune `branch=verbatim_tail` / `ramura=verbatim_tail*`;
  fără log se folosește predicția oglinzii (overlap < 0,90). `log_vs_mirror_mismatch` semnalează
  diferențe între logul real și oglindă (de investigat).

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

La nivel de propoziție (`sentence_detail`) motivele sunt: `missing_words`, `wrong_words`,
`extra_words` (inserții existente în referință), `invented_content`, `bad_punctuation`, cu
listele concrete de cuvinte lipsă/greșite/în plus.
Pragurile se schimbă din `thresholds.json` fără a modifica codul.

## Regenerare audio (opțional, pe box Linux)

```bash
python3 -m venv /workspace/piper-venv && /workspace/piper-venv/bin/pip install piper-tts numpy
# vocea: https://huggingface.co/rhasspy/piper-voices/tree/main/ro/ro_RO/mihai/medium
/workspace/piper-venv/bin/python tools/synth_piper.py --piper /workspace/piper-venv/bin/piper \
    --voice /workspace/piper-voices/ro_RO-mihai-medium.onnx
```
Textele se editează DOAR în `tools/samples_ro.py`; scriptul rescrie gold/, tts_text/, facts/,
audio/ și manifest.json. Seed fix (20261026) pentru zgomot.
