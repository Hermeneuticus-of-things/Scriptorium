# Înlocuire cu înregistrări reale (recomandat pentru verdict final)

1. Pentru fiecare `<id>`, citiți cu voce tare `tts_text/<id>.txt` (la 06 puteți citi direct
   `gold/<id>.txt`, cifrele rostindu-le natural). La 02 faceți autocorectările natural, cu ezitare.
   La 03 ridicați clar tonul la finalul întrebărilor fără cuvânt interogativ.
2. Format: WAV, 16 kHz, mono, PCM 16-bit, ≥ 60 s, microfonul folosit zilnic cu D&TED.
   Conversie: `ffmpeg -i in.m4a -ac 1 -ar 16000 -sample_fmt s16 audio\<id>.wav`
3. Pentru 07 înregistrați într-o cameră cu zgomot real (TV/radio la volum mic, a doua persoană
   vorbind din când în când din `tts_text/07_zgomot_suprapunere_interferent.txt`).
4. Dacă abateți de la text, corectați `gold/<id>.txt` să corespundă EXACT cu ce s-a rostit
   (verbatim, cu reveniri). Actualizați `duration_sec` și `"source": "real: …"` în `manifest.json`.
5. Păstrați fișierele sintetice ca `audio/<id>_sintetic.wav` pentru comparație.
