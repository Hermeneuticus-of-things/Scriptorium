# Editorul Pneuma Sofer față de practicile moderne pentru scris de lungă respirație

Notă de cercetare + inventar „ce avem / ce lipsește”, cu prioritizare. Scopul: să adăugăm doar
ce lipsește cu adevărat și aduce valoare, fără să umflăm interfața și fără să atingem motorul
I-REP determinist (`src/lib/editorial.js`) sau panourile Editorial/AI din Setări.

Data: 26 oct. 2026. Surse web consultate la final.

## Rezumat

Editorul Pneuma Sofer acoperă deja aproape toată lista de bune practici pentru editoare de carte
(tipografie configurabilă, măsură/lățime de rând, mod typewriter, moduri focus, corecturi
inteligente, ținte de sesiune/termen, outline, căutare/înlocuire avansată, accesibilitate pe
bara de format). Golurile reale sunt puține. Am implementat **un singur** adaos curat și fără
risc — un indicator de lizibilitate în Statistici — și documentez mai jos de ce celelalte
candidate au fost amânate (valoare vs. risc/aglomerare).

## Ce există deja (nu rescriem)

| Practică | Stare în Pneuma Sofer |
|---|---|
| Tipografie (font serif, corp, interlinie) | ✅ Setări → Aspect (`editorFont`, `fontSize`, `lineHeight`) |
| Măsură / lățime de rând | ✅ `pageWidth` în `em` → `.page { max-width: var(--editor-page-width) }` |
| Mod typewriter (cursor centrat) | ✅ `onSelectionUpdate` + `.typewriter` |
| Moduri focus (paragraf / frază / dialog) | ✅ `WritingFocus`, meniul Vizualizare |
| Evidențiere linie / paragraf curent, intensitate estompare | ✅ `LineHighlight`, `setFadeOpacity` |
| Focus lingvistic (parte de vorbire) | ✅ `LinguisticFocus` |
| Ghilimele/liniuțe/puncte de suspensie inteligente (RO) | ✅ `RomanianQuotes`, `corrections.js` |
| Autocorectare + învățarea corecturilor | ✅ `corrections.js`, `learnCorrections` |
| Lipire ca text / „păstrează stilul” | ✅ `Ctrl+Shift+V`, `pasteAndMatchStyle` |
| Niveluri de revizie, comentarii, note de subsol, adnotări | ✅ `writing.js`, extensii dedicate |
| Indent/spațiere paragraf, tab stops, stiluri cu „stil următor” | ✅ `ParagraphFormat`, `ParagraphStyle` |
| Autosalvare (interval configurabil) + backup periodic | ✅ `autosaveSec`, `backupEveryMin` |
| Ținte: manuscris, sesiune (reset la miezul nopții/deschidere/manual), termen cu cuvinte/zi | ✅ `TargetsDialog`, `deadlinePlan` |
| Notificări la atingerea țintei | ✅ `Notification` în `App.jsx` |
| Numărători + timp de citire + distribuția lungimii frazelor + frecvența cuvintelor | ✅ `stats.js`, `StatisticsDialog` |
| Căutare/înlocuire (document + proiect), regex, cuvânt întreg, caz | ✅ `FindBar`, `AdvancedSearchDialog` |
| Outline + corkboard | ✅ `Outliner`, `Corkboard` |
| Scurtături rebindabile + navigare WAI-ARIA pe bara de format | ✅ `commands.js`, `OverflowBar` |
| Semne de carte în text + „mergi la document” | ✅ `Bookmark`, `goto` |
| Semne invizibile (¶, puncte de spațiu) | ✅ `invisibles.js` |

## Ce lipsea — prioritizat

| # | Lipsă | Valoare | Risc | Decizie |
|---|---|---|---|---|
| 1 | **Indicator de lizibilitate** (fraze lungi, cuvinte pe frază, bandă estimată) | Mare (auto-editare) | Minim (logică pură) | **Implementat** |
| 2 | Cronometru de sesiune / ritm cuvinte-pe-minut, timp estimat până la țintă | Medie | Mediu (necesită marcaj de timp în logica de reset a sesiunii din `App.jsx`) | Amânat — vezi mai jos |
| 3 | Mod focus pe o singură linie vizuală | Mică (fraza acoperă deja intenția) | Mediu (decorare per linie, dependentă de layout) | Amânat |
| 4 | Bară de instrumente reordonabilă de utilizator | Medie | Mare (refactor `FormatBar`, risc de aglomerare) | Amânat — bara e deja responsivă cu overflow |
| 5 | Configurarea granularității Undo | Mică | Mic | Nerecomandat (implicitul StarterKit e bun) |
| 6 | Indice de lizibilitate validat pentru RO (Flesch etc.) | Mică/incertă | — | Nerecomandat (Flesch e tarat pe engleză/silabe; am ales ARI, neutru la limbă, marcat clar euristic) |

## Ce am implementat (#1)

`readability(text)` în `src/lib/stats.js` — funcție pură, fără DOM, testată:

- **cuvinte pe frază** și **procent de fraze lungi** (peste 25 de cuvinte, pragul uzual din
  ghidurile de limbaj clar) — cele mai acționabile semnale pentru proza de lungă respirație;
- **litere pe cuvânt** și procent de cuvinte lungi;
- un **grad** stil ARI (Automated Readability Index) — folosește doar caractere și cuvinte,
  deci se degradează grațios pe alte limbi decât engleza; e marcat explicit ca euristică,
  nu verdict;
- o **bandă** (ușor / mediu / dificil / foarte dificil) derivată din grad.

Afișat în dialogul **Statistici → fila „Fraze”**, lângă distribuția existentă a lungimii
frazelor — fără buton nou, fără aglomerare. Textul precizează că e estimare euristică,
în același registru ca nota de la fila „Părți de vorbire”.

Teste: `tests/stats.test.js` (text gol → bandă `na`; fraze scurte → `easy`; detectarea
frazelor lungi și a cuvintelor lungi; text dens → `hard`/`veryHard`).

## De ce nu mai mult

Aplicația e matură; adaosurile de dragul listei ar încălca cerința „fără a umfla interfața”
și principiul proiectului (calitate prin unelte permanente și testate, nu muncă făcută o dată).
Candidatul #2 (ritm de scris) merită, dar wiring-ul corect atinge semantica de reset a sesiunii
și ar fi trebuit tratat ca schimbare separată, cu propriul test de regresie — îl las ca
recomandare, nu ca risc introdus în acest PR.

## Surse

- [Editorial Typography — typographymaster.com](https://www.typographymaster.com/guide/editorial-typography)
- [Stop Exhausting Your Reader — TypeEd (măsura ~66 caractere, Bringhurst)](https://type-ed.com/resources/rag-right/2015/02/15/stop-exhausting-reader)
- [Typography for Long-Form Reading — Designer Daily](https://www.designer-daily.com/typography-for-long-form-reading-designing-pages-people-actually-finish-213373)
- [Book typography & readability — Writelight Group](https://writelightgroup.com/2025/10/book-typography-readability/)
- [Distraction-free writing (focus/typewriter) — Zoho Writer](https://help.zoho.com/portal/fr/community/topic/tip-2-the-road-to-distraction-free-writing?page=13)
- [Track Your Word Count and Progress with Scrivener](https://writerunboxed.com/2016/06/30/track-your-word-count-and-progress-with-scrivener/)
- [Writing Targets and Alerts in Scrivener](https://www.alicianovo.com/post/writing-targets-and-x-in-scrivener)
- [Clipboard / paste cleanup patterns — Syncfusion RTE docs](https://help.syncfusion.com/rich-text-editor-sdk/react/rich-text-editor/clipboard-cleanup)
- [Copy and Paste accessibility tips — ALA](https://www.ala.org/accessibility/copy-and-paste-tips)
