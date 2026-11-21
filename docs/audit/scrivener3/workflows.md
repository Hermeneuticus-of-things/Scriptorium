# Workflow-uri Scrivener 3 verificate în Pneuma Sofer

Stadiu: **schelet** (2026-11-21) — fluxurile se completează după întoarcerea inventarelor
pe capitole; stările se alocă doar cu dovadă per pas. Fiecare workflow se verifică pas cu
pas: fiecare etapă trebuie să aibă instrument + comandă + comportament în Pneuma Sofer;
nu e suficient ca componentele să existe separat dacă fluxul complet nu poate fi parcurs.

| ID | Workflow (manual) | Etape de verificat | Stare | Observații |
|---|---|---|---|---|
| S3-W.01 | Creare proiect din șablon + configurare inițială | alegere șablon, titlu, locație, deschidere, salvare | de verificat | șabloane: `lib/templates.cjs` |
| S3-W.02 | Scriere + organizare incrementală (draft pe bucăți) | document nou, sinopsis, status/label, mutare în binder | de verificat | |
| S3-W.03 | Restructurare manuscris | drag-drop în binder, split/merge documente, collections | de verificat | |
| S3-W.04 | Cercetare și asociere materiale | import web/Opml/DAISY/Word, research folder, drag în document, bookmark | de verificat | |
| S3-W.05 | Revizuire cu snapshot-uri + comparație | take/compare/restore snapshot, roll back | de verificat | |
| S3-W.06 | Corectură cu comentarii/adnotări/subsoluri | insert, navigare, convert, strip la compile | de verificat | |
| S3-W.07 | Metadate + căutare avansată pe metadate | custom metadata, labels, keywords, căutare salvată, collections dinamice | de verificat | |
| S3-W.08 | Compile cu format personalizat | section types/layouts, replacements, front matter, preview, export per format | de verificat | |
| S3-W.09 | Export/print împachetat | DOCX/PDF/EPUB/Pandoc/MMD, print index cards/outline | de verificat | |
| S3-W.10 | Backup + restaurare + migrare | backup la deschidere/închidere, zip, restore, move project | de verificat | |
| S3-W.11 | Sync cloud + partajare | folder de proiect pe Dropbox/iCloud, warnings, IOS sync | de verificat | |
| S3-W.12 | Configurare mediu de scriere | composition mode, layouts, focus, backgrounds | de verificat | |
| S3-W.13 | Scriptwriting cap-coadă | mode, elements, autocomplete scene headings, compile FDX/Fountain | de verificat | |
| S3-W.14 | ToC + publicare | ToC static/dinamic, cuprins în compile, Kindle/EPUB | de verificat | |
| S3-W.15 | Lucru pe colecții (editare multi-doc) | scrub status/label pe selecție, move/merge multiplu | de verificat | |
| S3-W.16 | Navigare rapidă în proiect mare | quick search, go to, history, bookmarks, hoisting | de verificat | |

## Capabilități combinate (§4 din misiune)

De identificat după inventare: operațiuni care nu apar ca funcții individuale în manual,
dar rezultă din combinarea unor comenzi/moduri/configurări (ex. „editare în Scrivenings cu
snapshot înainte și strip notații după", „corkboard freeform → commit → compile"). Fiecare
capabilitate combinată identificată primește ID `S3-C.nn` și verificare completă pași.

## Regula de verificare

Un workflow e COMPLETE doar când TOATE etapele lui sunt COMPLETE/EQUIVALENT cu dovezi.
O singură etapă PARTIAL/MISSING → workflow-ul e PARTIAL, cu etapa blocantă numită.
