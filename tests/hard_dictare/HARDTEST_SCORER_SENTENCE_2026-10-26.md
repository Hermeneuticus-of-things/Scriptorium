# Hard test — extindere scorer + categorii noi (2026-10-26)

Nimic nu a fost rulat pe motorul D&TED. Singura verificare: scorer-ul cu gold (și gold ușor
alterat) ca ipoteză — gold→gold: 17/17 PASS, 256/256 propoziții corecte.

## Scorer (`score.py`)
- **Sentence-level error rate**: `asr.sentence_alignment` — aliniere DP propoziții hyp ↔ gold;
  correct / wrong / missing / extra, `sentence_error_rate`, `sentence_success_rate`, lista erorilor.
  Raportat lângă WER și punctuație (coloanele `sentOK` și `SER` în tabel). Vechile
  `sentence_success_strict/lenient` rămân.
- **Punctuație per semn**: `per_mark` pentru . , ; : ! ? " — … (P/R/F1/accuracy); `...`≡`…`,
  `–`/`-`≡`—`, toate tipurile de ghilimele ≡ `"`. `…` nu mai e sfârșit de propoziție.
- **Semne țintă**: `focus_marks` în manifest → verdict `mark_<semn>_low` dacă F1 < 0,70.
- **Numere/date**: `data_asr` per tip (percent, currency, time, date, large_number, phone, address):
  value_accuracy + format_accuracy; `numeric_tokens` P/R pe orice probă.
- **Defalcare pe categorie**: `aggregate.per_category` + tabel „Pe categorii”. Categoria vine din
  `manifest.json` → `category` (o probă = o categorie: long_ideas, self_corrections, questions_rising,
  firm_statements, lists, numbers_names, noisy_overlap, exclamations, quotes, semicolons, commas,
  periods, dialogue_dashes, ellipses, colons, numbers_data, multi_speaker_dialogue).
- CLI nou: `--focus-marks`. `thresholds.json`: `min_focus_mark_f1`, `min_sentence_success_aligned`,
  `min_data_value_accuracy`, `min_data_format_accuracy`, categorii `numbers_data`, `multi_speaker_dialogue`.

## Probe noi (SINTETICE, Piper ro_RO-mihai-medium)
08 exclamații · 09 citate („ ”) · 10 punct și virgulă · 11 virgule · 12 puncte · 13 dialog cu linie (—) ·
14 puncte de suspensie (…) · 15 două puncte · 16 numere/date (procente, lei/euro/dolari, HH:MM,
zi.lună.an, numere mari, telefoane, adrese) · 17 dialog 2 vorbitori (B = pitch +3 st).
Întrebările (`?`) erau deja acoperite de 03 și apar și în 09, 13, 17.
Audio 01–07 neatins (md5 identic). Lipsesc: accente regionale (doar înregistrări reale).

## Fișiere schimbate / noi
score.py, manifest.json (v2, 17 probe, focus_marks), thresholds.json, README.md (rescris),
tools/synth_piper.py (--only, dialog multi-vorbitor), tools/samples_ro_extra.py (nou),
audio|gold|tts_text|facts/08…17 (noi), acest fișier, HARDTEST_PUNCT_DIALOGUE_2026-10-26.md, EXPORT_READY.txt.
