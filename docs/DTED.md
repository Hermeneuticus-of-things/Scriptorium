# D&TED în Scribner: dictare și transcriere în română

D&TED (https://github.com/Hermeneuticus-of-things/dted) e un program Python separat. Recunoaște vorbirea local, cu Whisper `large-v3-turbo` prin faster-whisper, pe placa video NVIDIA dacă există. Nu folosește internetul. Scribner nu include modelul (circa 1,6 GB) și nici Python: pornește D&TED instalat pe calculator în **modul serviciu** și vorbește cu el prin intrarea și ieșirea standard.

## 1. Ce vede autorul

| Unde | Ce face |
|---|---|
| Unelte → Dictare (D&TED), F9 | Bară peste editor: nivelul microfonului, Pauză, Stop, Anulează. Textul intră la cursor pe măsură ce vorbești (bucăți de ~4 s). |
| Dictare peste o selecție | Ce spui **înlocuiește selecția** (modificare). Un singur Ctrl+Z întoarce textul vechi. |
| Fișier → Importă → Transcrie fișier audio… | MP3, WAV, M4A, OGG, FLAC → document nou în Cercetare, cu marcaje de timp opționale; fișierul audio rămâne atașat ca media. |
| Binder, clic dreapta pe un fișier audio | „Transcrie cu D&TED” → document nou legat de fișier. |
| Setări → Servicii → D&TED | Calea programului (găsită automat), butonul „Verifică”, limba, termenii (nume proprii) trimiși modelului. |

Fără D&TED instalat, comenzile rămân în meniu și explică unde se instalează. Nimic nu pleacă pe internet.

## 2. Protocolul (D&TED `--serviciu`, protocol 1)

Pornire: `DTED.exe --serviciu`, sau din codul sursă `python -m dictare_transcriere_romana --serviciu` (cwd = folderul depozitului). Comunicarea se face prin JSON pe linii, în UTF-8. La pornire, D&TED trimite `{"ev":"gata","protocol":1}`.

Comenzi (Scribner → D&TED):

```json
{"cmd":"stare"}
{"cmd":"transcrie","id":"t1","cale":"C:\\...\\interviu.mp3","limba":"ro","termeni":"Ilinca, Apuseni"}
{"cmd":"dictare_start","id":"d1","limba":"ro","termeni":"..."}
{"cmd":"dictare_stop","id":"d1"}
{"cmd":"anuleaza","id":"t1"}
{"cmd":"iesire"}
```

Evenimente (D&TED → Scribner):

```json
{"ev":"stare","protocol":1,"versiune":"1.0.0","model_incarcat":false,"dispozitiv":"cuda"}
{"ev":"faza","id":"t1","text":"Transcriu…"}
{"ev":"progres","id":"t1","p":0.42}
{"ev":"rezultat","id":"t1","text":"...","segmente":[{"start":0.0,"end":3.2,"text":"..."}],"secunde_audio":95.0}
{"ev":"dictare_pornita","id":"d1"}
{"ev":"nivel","id":"d1","nivel":0.35}
{"ev":"fragment","id":"d1","text":"..."}
{"ev":"dictare_oprita","id":"d1","text":"tot textul dictat"}
{"ev":"anulat","id":"t1"}
{"ev":"eroare","id":"d1","mesaj":"Nu găsesc microfonul...","ce_fac":"Verifică microfonul..."}
```

Reguli:
- un singur model în memorie; transcrierile și bucățile de dictare se calculează pe rând;
- o singură dictare odată (a doua primește `eroare`);
- serviciul ocolește blocarea „o singură instanță”, deci merge și cu fereastra D&TED deschisă;
- în `DTED.exe`, împachetat fără consolă, `sys.stdin` și `sys.stdout` sunt `None`, așa că serviciul deschide direct handle-urile Windows (`serviciu._flux_windows`);
- închiderea intrării standard închide serviciul.

## 3. Arhitectura în Scribner

- `lib/dted.cjs` (procesul main):
  - găsește programul (§4);
  - pornește un singur proces serviciu, la prima cerere, și îl ține pornit cât e deschisă aplicația;
  - citește liniile JSON și le trimite ferestrei ca `dted:event`;
  - îl oprește cu `{"cmd":"iesire"}` la închidere, apoi cu kill după 3 s.
- IPC:
  - `dted:status`: calea găsită, versiunea, protocolul;
  - `dted:transcribe(path, opts)`;
  - `dted:dictateStart(opts)`, `dted:dictateStop()`, `dted:cancel(id)`;
  - `dted:pickAudio()`.

  Renderer-ul nu pornește procese. Toate trec prin main, după regula din CLAUDE.md.
- `src/lib/dictation.js`, logica pură, testabilă:
  - la pornire ține minte selecția;
  - primul fragment o înlocuiește, cele următoare se adaugă după, cu spațiu și majusculă după punct;
  - tot textul dictat intră într-un singur pas de anulare;
  - corecturile învățate și înlocuirile automate se aplică pe fiecare fragment.
- `src/components/DictationBar.jsx`: nivelul, timpul, Pauză (oprește trimiterea fragmentelor), Stop, Anulează (scoate textul dictat).
- Transcriere de fișier:
  - document nou în Cercetare, cu titlul fișierului;
  - textul pe paragrafe, câte un segment pe paragraf, unite când pauza dintre ele e sub 1,5 s;
  - opțional marcaje de timp `[mm:ss]`;
  - audio copiat în `media/`, ca la importul obișnuit.
- Modul browser (fără Electron): comenzile apar dezactivate, cu explicația că dictarea locală are nevoie de aplicația desktop.

## 4. Găsirea programului (Windows)

Ordinea:
1. `settings.dtedPath`:
   - un `.exe`;
   - sau folderul depozitului, care conține `dictare_transcriere_romana/`; atunci comanda e `python -m …`, cu `py -3` sau `python` din PATH.
2. `%LOCALAPPDATA%\Programs\D&TED – Dictare și transcriere în limba română\DTED.exe`.
3. `%ProgramFiles%\D&TED – Dictare și transcriere în limba română\DTED.exe`.
4. Orice folder din cele două locuri de mai sus al cărui nume începe cu `D&TED` și care conține `DTED.exe`.

Pe Linux sau macOS doar varianta din codul sursă, cu `python3`.

## 5. Teste

- D&TED, `teste/test_serviciu.py`:
  - motor și microfon falși;
  - stare, transcriere, erori, anulare, dictare cu fragmente și oprire, dictare dublă, lipsa microfonului, bucla JSON.
- Scribner, unitare:
  - `lib/dted.cjs` cu un D&TED fals (`tests/fixtures/fake-dted.cjs`, care vorbește protocolul): găsirea căii, pornirea, evenimentele, anularea, oprirea la închidere, proces căzut;
  - `src/lib/dictation.js`: înlocuirea selecției, spațiere, majuscule, un singur pas de anulare, Pauză.
- Scribner, browser: un D&TED simulat în `mockApi` (`?demo&dted`) trimite fragmente; scenariul dictează peste o selecție și verifică textul și Ctrl+Z.
- Rămâne la autor, pe Windows:
  - instalează D&TED;
  - dictează în Scribner 3–4 fraze, o dată ca text nou și o dată peste o selecție;
  - transcrie un MP3.

## 6. Pași (stare)

- [x] D&TED: modul `--serviciu` + teste (`dictare_transcriere_romana/serviciu.py`, `teste/test_serviciu.py`)
- [x] Scribner: `lib/dted.cjs` + IPC + D&TED fals pentru teste
- [x] Scribner: dictare la cursor / peste selecție, bara de dictare, F9
- [x] Scribner: transcriere fișier audio → document; din binder
- [x] Scribner: Setări → Servicii → D&TED (cale, Verifică, termeni)
- [x] ajutor RO/EN, README cu imagine, CHANGELOG, versiune nouă
- [ ] test real pe Windows (autorul)

## 7. Motorul încorporat (v0.9.0)

Dictarea și transcrierea merg acum și fără D&TED. Scribner are propriul motor, ales implicit: *Setări → Servicii și conturi → Dictare și transcriere → Încorporat în Scribner*. D&TED rămâne a doua opțiune.

- **Ce se descarcă, o singură dată**, în `<userData>/whisper`:
  - whisper.cpp **v1.7.6**, arhiva oficială `whisper-blas-bin-x64.zip` (16 MB) sau `whisper-cublas-12.4.0-bin-x64.zip` (423 MB, pentru NVIDIA), verificată cu amprenta SHA-256 publicată de GitHub;
  - modelul `ggml-large-v3-turbo-q5_0.bin` (~547 MiB), verificat prin mărime și antetul ggml.
- **Cum rulează:** `whisper-server` pornește la prima cerere, ascultă doar pe `127.0.0.1` pe un port liber, păstrează modelul încărcat și e oprit la ieșire. Nimic nu pleacă pe internet după descărcare.
- **Ce face fereastra** (`src/lib/localSpeech.js`):
  - citește microfonul (Web Audio) și îl aduce la 16 kHz mono;
  - taie vorbirea în bucăți de 3–6 s, în cel mai liniștit moment, și le trimite pe rând prin `whisper:transcribePcm`;
  - sare peste liniște și peste textele inventate de model („Mulțumesc pentru vizionare”);
  - dă modelului ca context numele din setări și ultimele cuvinte dictate.
- **Fișiere audio:** le decodează browserul (MP3, WAV, M4A, OGG, FLAC), apoi le trimite în bucăți de cel mult 2 minute, cu timpii păstrați.
- **Pentru ce rămâne la fel:** produce aceleași evenimente ca serviciul D&TED (§2), deci bara de dictare, F9, „Transcrie fișier audio” și „Transcrie cu D&TED” din binder nu s-au schimbat.
- **Securitate:** fereastra poate citi doar fișierul audio ales în dialog sau un fișier media din proiectul deschis. Arhiva se despachetează fără căi care ies din folder.
- **Teste:**
  - `tests/whisper.test.js`: descărcarea cu amprente, arhiva falsificată, modelul trunchiat, serverul simulat (`tests/fixtures/fake-whisper-server.cjs`), tăierea pe pauze, filtrele;
  - `tests/e2e/browser/whisper.cjs`: descărcarea din Setări, microfonul fals din Chromium, fișierul audio.
- **Rămâne la autor:** proba pe Windows, cu descărcarea reală și cu microfonul.

## 8. Modelul eek (v0.9.7, D&TED v0.4.1)

- D&TED v0.4 folosește implicit modelul **eek** (`eek/whisper-turbo-ro-en`, Whisper turbo antrenat pe română): 5,8% cuvinte greșite față de 10,9% la `large-v3-turbo` standard (măsurători în `docs/MODELE_ROMANA.md` din D&TED).
- Protocolul serviciului are comanda `{"cmd":"model","nume":…}`, iar `stare` raportează `model`, `model_folosit` și `modele` `[{nume, descriere, instalat}]`.
- În Scribner: `lib/dted.cjs` `state()` / `setModel()`; IPC `dted:setModel`; setarea `dtedModel` (implicit `auto`), aplicată la prima cerere după fiecare pornire a serviciului; în *Setări → Servicii și conturi → D&TED → Verifică* apare lista modelelor (cele neinstalate sunt dezactivate) și „Folosit acum”.
- Un D&TED mai vechi (fără comanda `model`) merge mai departe, doar fără listă.
- Motorul încorporat (whisper.cpp) rămâne pe `large-v3-turbo`: eek e publicat cu acces aprobat individual, deci nu se poate descărca automat din Scribner.
- Teste: `tests/dted.test.js` (stare, alegere, model necunoscut) și `tests/e2e/browser/dted-model.cjs`.
