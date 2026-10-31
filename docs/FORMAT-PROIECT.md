# Formatul de proiect Pneuma Sofer (`.scribner`)

Stare: **finalizat, versiunea 1**. Documentul este contractul complet al formatului — ce conține un
proiect, cum se numesc fișierele, cum se versionează și cum se traduce către și dinspre formatul
Scrivener (`.scriv`). Nu se inventează un format nou: este același din 2025, înainte de redenumirea
în Pneuma Sofer, și rămâne stabil.

## 1. Principiu

Un proiect Pneuma Sofer este un **dosar** `<Nume>.scribner` — exact ca un `.scriv` Scrivener, care
tot dosar este. Înăuntru, totul e **text deschis**: JSON pentru structură și metadate, HTML pentru
text, UTF-8. Fără fișier binar opac, fără lock-ul bazelor de date — dosarul merge direct pe
OneDrive/Dropbox/NAS (sincronizare la nivel de fișier) și poate fi citit cu orice editor.

## 2. Layout-ul complet

```
<Nume>.scribner/
  project.json                 structura + metadatele (schema mai jos, versiunea `format`)
  docs/<id>.html               textul principal al fiecărui item (id = UUID)
  notes/<id>.html              notele per item
  snapshots/<id>/<ts>.json     {name, date, html} — un fișier per snapshot (ts = data ISO cu „-”)
  media/<fișier>               imagini/PDF/audio atașate
  backups/                     copiile de siguranță rotite (implicit ultimele 100)
  editorial/                   I-EDIT: MODIFICARI_AUTOR.jsonl + listele editoriale
  team/                        jurnalul de echipă (prezență, modificări pe paragrafe)
  history.json                 istoricul de scriere (sesiuni)
  agent-log.jsonl              jurnalul apelurilor agentului MCP
  follow.json                  starea urmăririi vault-ului (circuitul MCP vault ↔ Pneuma)
  scrivener-original/          la import din .scriv: pachetul original, copiat integral (nimic nu se pierde)
```

`agent-log.jsonl`, `follow.json`, `editorial/` și `team/` sunt opționale: apar când se folosesc
funcțiile respective; lipsa lor nu afectează proiectul.

## 3. Schema `project.json` (versiunea `format: 1`)

| Cheie | Tip | Ce ține |
|---|---|---|
| `format` | număr | **versiunea schemei**; azi `1`. Aplicația refuză politicos un proiect cu `format` mai mare decât știe ea (mesaj: instalează o versiune nouă) și citește fără probleme unele mai mici (câmpurile noi sunt adăugitive, cu valori implicite) |
| `title`, `author`, `created` | text/data | identitatea proiectului |
| `targets` | obiect | `{draft, session}` — ținte de cuvinte (manuscris, sesiune) |
| `labels`, `statuses`, `defaultLabel`, `defaultStatus`, `labelTitle`, `statusTitle` | liste/text | etichetele (cu culori) și stările, cu nume personalizabile |
| `tree` | listă de noduri | binder-ul. Trei rădăcini fixe (`root: draft/research/trash`, titluri personalizabile); fiecare nod: `{id (UUID), type: folder/file, title, children, label, status, includeInCompile, favorite, synopsis (text), synopsisImage, icon, iconColor, lock, fromTemplate, custom: {…}}` |
| `customFields` | listă | metadatele personalizate (nume, tip: text/listă/număr/checkbox) |
| `keywordDefs` | listă | cuvintele cheie cu culori și grupuri |
| `styles` | obiect | stilurile de paragraf/caracter ale proiectului |
| `collections` | listă | colecțiile: manuale (`ids`) și căutări salvate (`type: 'search'`, cu interogarea) |
| `bookmarks` | listă | bookmark-urile de proiect (intern sau URL extern) |
| `compile` | obiect | setările de compilare per proiect (format curent, opțiuni, `replacements` = înlocuirile de proiect) |
| `editorialProfile` | obiect | profilul I-REP/I-EDIT (baze, reguli, limite) |
| `vaultSync`, `vaultMirror`, `scrivener`, `importReport` | obiecte | stări ale circuitelor opționale (vault MCP, importul .scriv) |

Regula de evoluție: **câmp nou = adăugit, cu implicit neutru; câmp vechi nu se șterge niciodată
fără migrare**. `store.cjs` validează `format` la încărcare.

## 4. Versiune și compatibilitate

- `format: 1` — forma curentă, neschimbată din 2025.
- Viitor: `format: 2` se introduce doar cu migrator (citește 1, scrie 2) și cu test de round-trip;
  aplicațiile vechi refuză politicos un `2`, cele noi citesc oricând un `1`.
- Proiectul **nu** se convertește „pe loc” la salvare: fișierele rămân în forma în care sunt.

## 5. Interoperabilitate cu Scrivener (`.scriv`)

Ambele direcții sunt implementate propriu (fără biblioteci externe) și acoperite de **29 de teste
de round-trip** (`tests/scrivRoundTrip.test.js`):

**Import (`lib/scrivImport.cjs`, „lossless”):** citește `.scriv` în formatul **1, 2 și 3** (scrivx +
RTF-uri, notes, synopsis, `content.comments`, styles.xml, snapshots cu index.xml, ProjectNotes,
writing.history, Settings/compile.xml) și convertește tot ce are echivalent în Pneuma Sofer:
binder cu root-uri, text (RTF → HTML), note, sinopse, comentarii + note legate, etichete, stări,
cuvinte cheie, metadate personalizate, snapshot-uri, colecții, bookmark-uri, secțiuni de tip,
ținte. Pachetul original se copiază integral în `scrivener-original/` — **importul nu pierde
niciodată nimic**, chiar dacă un element nu are echivalent.

**Export (`lib/scrivExport.cjs`, `.scriv` format 3):** scrie un pachet pe care Scrivener îl
deschide direct: `<Name>.scrivx` (binder, etichete, stări, cuvinte cheie, CustomMetaDataSettings,
SectionTypes, ProjectTargets, Collections, ProjectBookmarks, metadata per item), `Files/Data/
<UUID>/` (content.rtf, notes.rtf, synopsis.txt, content.comments, snapshots + index.xml),
ProjectNotes, styles.xml, writing.history.

**Ce NU se traduce 1:1** (diferențe de model, documentate, nu pierderi accidentale): stilurile de
paragraf Pneuma → numite în RTF unde Scrivener nu are echivalent direct; înlocuirile de proiect și
formatele de compilare Pneuma nu există în `.scriv` (rămân în `project.json`, nu pleacă în
export); profilul I-REP și circuitul vault sunt proprii Pneuma.

## 6. Ce NU este formatul

- Nu este `.scriv` nativ: fișierul principal e `project.json` (JSON), nu `scrivx` (XML). Motivul:
  schema e mai expresivă pentru funcțiile proprii (colecții vii, înlocuiri de proiect, profil
  editorial) și citibilă programatic fără parser XML. **Compatibilitatea cu Scrivener se
  asigură prin import/export lossless**, nu prin format identic — asta garantează și că un
  proiect Pneuma Sofer se duce în Scrivener și se întoarce fără pierderi.
- Nu este un fișier unic zip: dosar deschis, sincronizabil fișier cu fișier.
