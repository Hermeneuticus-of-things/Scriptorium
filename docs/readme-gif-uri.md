# GIF-urile din README — capturi funcționale Playwright

README-ul folosește numai GIF-uri generate din aplicația Pneuma Sofer, pornită ca aplicație Electron și controlată prin Playwright. Nu se folosesc imagini statice cu zoom, animații decorative sau capturi ale unor proiecte personale.

## Regenerare

Din rădăcina repository-ului:

```bash
npx vite build
$env:SCRIBNER_NO_UPDATE_CHECK='1'
node tests/e2e/gif-features.cjs
node tests/e2e/gif-readme.cjs
```

Pe Linux, echivalentul variabilei este `SCRIBNER_NO_UPDATE_CHECK=1`. Capturatoarele refuză buildurile învechite, folosesc un profil și un proiect fixture izolat și nu ating proiectele utilizatorului. În capturile AI se folosește numai serverul mock local al suitei, fără chei și fără internet.

La începutul fiecărei scene, scripturile șterg cadrele PNG vechi. Această curățare este obligatorie: un cadru rămas dintr-o execuție anterioară nu poate ajunge în GIF-ul nou.

## Scenele publicate

| GIF | Ce acțiune reală demonstrează |
|---|---|
| `01-corkboard-move.gif` | Selectarea unei fișe și tragerea ei înaintea altei fișe; ordinea se schimbă în Corkboard și Binder. |
| `01-ai-corectura.gif` | Selectarea textului, deschiderea AI, streamingul rezultatului mock, afișarea diferenței și acceptarea propunerii. |
| `02-help-finder.gif` | Căutarea unei funcții în Help Finder și afișarea rezultatului/comenzii corespunzătoare. |
| `02-translate-side.gif` | Deschiderea Editorului, împărțirea în două panouri și încărcarea documentului alăturat în panoul din dreapta. |
| `03-compile-content.gif` | Deschiderea Compile, includerea/excluderea conținutului și intrarea în previzualizare. |
| `03-compile-preview.gif` | Previzualizarea Compile în panou propriu și schimbarea zoomului. |
| `04-focus-f6.gif` | Mutarea focusului între panourile aplicației cu F6. |
| `04-reference-quickref.gif` | Deschiderea unui document ca referință lângă editor. |
| `05-semnale.gif` | Deschiderea Semnale pe text și afișarea măsurătorilor deterministe, fără AI. |
| `05-wiki-link.gif` | Tastarea unei legături `[[Nume nou]]` și afișarea propunerii „Creează și leagă”. |
| `06-timeline.gif` | Deschiderea cronologiei proiectului și vizualizarea evenimentelor pe axa timpului. |
| `07-research-ask.gif` | Deschiderea panoului Cercetare, introducerea unei întrebări, selectarea unei surse și afișarea scope-ului ales. Captura nu pretinde un răspuns RAG sau o conversație AI verificată. |

Fiecare GIF este asamblat cu FFmpeg din cadrele PNG corespunzătoare din `docs/assets/gif/frames/<scenă>/`, redimensionat la 1180 px lățime și redat la 4 fps pentru lizibilitate. Scenele complexe folosesc cel puțin 20 de cadre când pașii o cer, iar stările finale sunt menținute suficient pentru citire. Fișierul este scris cu extensia Netscape `loop=0` pentru redare automată și repetare infinită.

## Verificare

Verificarea minimă înainte de commit:

```bash
# referințele din README trebuie să fie GIF-uri existente
node -e "const fs=require('fs'),p=fs.readFileSync('README.md','utf8'); const xs=[...p.matchAll(/docs\/assets\/gif\/([^\"')>]+\.gif)/g)].map(m=>m[1]); if(new Set(xs).size!==12 || xs.some(x=>!fs.existsSync('docs/assets/gif/'+x))) process.exit(1); console.log([...new Set(xs)])"

# fiecare GIF funcțional trebuie să conțină markerul loop infinit
node -e "const fs=require('fs'),path=require('path'); for(const f of fs.readdirSync('docs/assets/gif').filter(x=>/^\d.*\.gif$/.test(x))){const b=fs.readFileSync(path.join('docs/assets/gif',f)); if(!b.includes(Buffer.from('NETSCAPE2.0'))){throw Error('Lipsește loop=0: '+f)}}"

git diff --check
```

Înainte de publicare se inspectează vizual cel puțin un cadru din fiecare scenă și se verifică explicit că nu apare dialogul de actualizare, un proiect privat sau un cadru care nu corespunde textului alternativ din README.

## Ce nu este prezentat fără o captură verificabilă

Dictarea live cu microfon și D&TED, lucrul în echipă și sincronizarea nu sunt folosite ca demonstrații GIF în README. Ele pot fi descrise separat numai dacă există o captură Playwright sau o testare reproductibilă care arată efectul real în aplicație. Asseturile istorice `docs/assets/gif/readme-*.gif` nu sunt sursa demonstrațiilor și nu trebuie reintroduse în README ca dovadă a funcțiilor.
