# Design — ferestre, popover-uri și tips (cum le facem „nici prea mari, nici prea mici")

Reguli scurte, de aplicat de fiecare dată, ca interfața să fie coerentă și pe viitor. Bazate pe
îndrumări autoritare (web.dev „Building a dialog component", regulile implicite din specificația
HTML pentru `<dialog>` modal) plus convenții de bun-simț.

## Principii (limbajul de design Pneuma Sofer)

Pneuma Sofer e o unealtă pentru texte lungi. UI-ul **servește scrisul**, nu se arată pe sine.

1. **Textul e eroul.** Interfața e sobră; cromatica tare și decorul stau deoparte. Modul compunere și focusul duc totul la minim când omul scrie.
2. **Arată puțin, dezvăluie la nevoie (progressive disclosure).** Lucrurile de zi cu zi sunt la vedere; restul în meniuri, popover-uri, panouri — apar când le ceri.
3. **Tastatura întâi.** Orice acțiune frecventă are scurtătură; mouse-ul e o alternativă, nu singura cale.
4. **Spune unde și de ce.** Când ceva e blocat sau nesetat, un tip ghidat (glow) + mesaj, nu tăcere (vezi mai jos).
5. **Coerență.** Aceleași tokenuri (culori, spațiere, tipografie) peste tot; aceeași suprafață pentru aceeași nevoie. Un utilizator nou învață o dată.
6. **Accesibil din start.** Contrast suficient, focus vizibil, `aria-*`, respectă `prefers-reduced-motion` și light/dark.

## Fundamente (tokenuri — sunt în `src/styles.css` / `appearance.css`)

- **Tipografie.** Corpul textului: serif (Georgia implicit), mărime reglabilă (implicit 18px în editor), **interlinie 1,4–1,6** (cercetarea dă 120–150% din font — confortul la citit). Lungimea rândului **~60–75 de caractere** (pagina e plafonată la ~56em; WCAG 1.4.8 cere ≤ ~80). UI-ul folosește un font de sistem, mai mic, ca să nu concureze cu textul.
- **Culoare.** Tokenuri semantice, nu culori brute: `--bg`, `--panel`, `--paper`, `--line`, `--muted`, `--accent`, `--accent-soft`, `--danger`, `--ok`. Se redefinesc pentru dark mode (sub `prefers-color-scheme` și `[data-theme]`). Accentul se folosește cu măsură: selecție, focus, tip ghidat.
- **Spațiu.** Scară mică și consecventă (4 / 8 / 12 / 16 / 24 px). Aer generos în editor; dens în panouri și liste.
- **Mișcare.** Scurtă și cu rost (un glow de ~2s care arată un control, o tranziție de 0.2s). Niciodată gratuită; oprită la `prefers-reduced-motion`.
- **Contrast & focus.** Text pe fundal cu contrast suficient; focus vizibil pe orice element interactiv.

## Ce tip de suprafață alegi (de la cel mai puțin intruziv la cel mai intruziv)

1. **Toast** — un mesaj scurt, trecător (ex. „Tradus cu DeepL", „Panoul e blocat"). Nu cere o acțiune.
2. **Tip ghidat (glow)** — când o acțiune e blocată, un glow scurt pe controlul de apăsat (`data-hint` + `showHint`). Arată UNDE, fără să întrerupă.
3. **Popover / mic panou lângă conținut** — pentru o alegere contextuală legată de un loc din text (ex. a alege un sinonim pentru cuvântul de sub cursor). De preferat când opțiunile sunt legate de o poziție.
4. **Dialog modal centrat** — pentru o decizie sau un formular care merită toată atenția (ex. verificarea gramaticală, setări). Oprește restul interfeței.

Regula: folosește cea mai puțin intruzivă suprafață care face treaba. Traducerea (un singur rezultat) **nu** deschide nimic — înlocuiește pe loc. Sinonimele (multe cuvinte din care alegi) deschid o fereastră compactă.

## Dimensionare — „nici prea mare, nici prea mică"

- **Pornește de la conținut**, apoi **plafonează**. Nu fixa dimensiuni arbitrare mari.
- **Lățime lizibilă**: plafon la ~`min(60ch, 92vw)` pentru text; pentru liste/formulare compacte, un plafon fix mic e în regulă (ex. `min(460px, 92vw)` pentru lista de sinonime; ~480px pentru confirmări simple; ~720px pentru conținut bogat).
- **Gutter pe margini**: lasă mereu ~16–24px până la marginea ecranului (de aceea `92vw`, nu `100vw`).
- **Înălțime + scroll**: `max-height` (ex. `min(80vh, 560px)`) și o **zonă internă derulabilă** pentru conținut mult, ca fereastra să nu crească necontrolat. Conținutul se derulează, rama rămâne.
- **Evită săriturile**: dacă vine conținut asincron, rezervă o dimensiune minimă rezonabilă ca fereastra să nu „salte".
- **Mobil/îngust**: la lățimi mici, lățimea devine practic `92vw`; verifică la ~380px.

### Exemplu — fereastra de sinonime (aplicat în `styles.css`, `.modal.syn-modal`)
```css
.modal.syn-modal { width: min(460px, 92vw); max-height: 80vh; }
.modal.syn-modal .synonyms-list { max-height: 50vh; overflow: auto; } /* multe cuvinte → scroll, nu cât tot ecranul */
```

## Mișcare și accesibilitate

- Glow-urile și animațiile respectă `@media (prefers-reduced-motion: reduce)` (fără pulsație, doar un contur).
- Orice dialog are `role="dialog"` și o etichetă (`aria-label`); închidere cu Esc și cu click pe fundal.
- Controalele au `title` și `aria-label`, ca un utilizator nou să înțeleagă fără ghicit.

## De reținut (principiul general)

Gândește **inteligent per utilitate**: forma suprafeței urmează funcția. Un rezultat unic → înlocuire pe loc. O alegere din multe → fereastră compactă cu scroll. O blocare → tip ghidat (glow) spre control. Când apare o situație nouă, alege după aceleași reguli, nu la întâmplare.

Surse: [web.dev — Building a dialog component](https://web.dev/articles/building/a-dialog-component), [Simon Willison — dialog full height (regulile implicite din spec)](https://til.simonwillison.net/css/dialog-full-height), [Making perfectly sized, centered, scrollable modals](https://medium.com/@ResearchNowEng/making-perfectly-sized-centered-scrollable-modals-a36da09b68e6).
