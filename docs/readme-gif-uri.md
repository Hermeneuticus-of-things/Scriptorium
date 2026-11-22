# GIF-urile din README — cum se refac (PS-HELP/README, 23.11.2026)

Pagina principală (`README.md`) arată **mișcarea** interfeței, nu poze statice. Două scripturi
Playwright capturează cadrele, iar ffmpeg le asamblează în GIF-uri paletizate.

## Refacerea GIF-urilor automate (11 din 12)

```bash
npx vite build
node tests/e2e/gif-features.cjs   # 5 GIF-uri: AI corectură, Help Finder, compile preview, F6, semnale
node tests/e2e/gif-readme.cjs     # 7 GIF-uri: corkboard-move, translate-side, compile-content,
                                  #             reference-quickref, wiki-link, timeline, research-ask
```

- Cadre: 7 fps, PNG în `docs/assets/gif/frames/<scena>/`, scalate la 1180 px, paletă
  `palettegen=stats_mode=diff` + `paletteuse=dither=bayer` (2 treceri ffmpeg).
- Ambele scripturi au **garda anti-build-învechit**: refuză rularea dacă `dist/` e mai vechi
  decât sursele — testezi mereu ultima versiune (directivă autor).
- Se rulează pe fixture izolat (`_qa` profile) — nu ating proiectele tale.
- Server AI mock local (OpenAI-compatible SSE pe 127.0.0.1:8899) pentru streaming-ul real
  din scena de corectură AI — fără cheie, fără internet.

## Filmare manuală (1 din 12): `dictation-live.gif`

Dictarea cere serviciul **D&TED instalat + microfon** — nu poate fi capturată automat.
Pe calculatorul cu D&TED:

1. Deschide un proiect, un document cu 2–3 fraze scrise.
2. Pornește recorder-ul zonei ecranului (OBS/Win+G), **1180 px lățime recomandat**.
3. Apasă **F9** → spune două propoziții → observă bara de dictare jos (nivelul microfonului,
   Pauză, Stop) și textul apărând la ~4 secunde la cursor.
4. Oprește. Tunde la 5–8 secunde. Salvează ca `docs/assets/gif/08-dictation-live.gif`
   și leagă-l în secțiunea „Dictezi" din README (acolo e marcat locul).

## Reguli pentru GIF-uri (directiva autor)

- Durată 5–12 s, o singură acțiune clară pe animație.
- Cursorul/elementul care se mișcă trebuie să fie vizibil.
- Alt-textul din README descrie exact ce se întâmplă, pentru un scriitor care nu știe ce
  e un „binder" sau un „compile format".
- GIF-urile existente NU se înlocuiesc fără motiv — se refac doar când se schimbă feature-ul.
