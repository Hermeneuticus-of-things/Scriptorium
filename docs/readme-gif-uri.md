# GIF-urile din README — cum se refac (PS-HELP/README, 23.11.2026)

Pagina principală (`README.md`) arată **mișcare** în toate materialele vizuale. GIF-urile de flux
sunt capturate cu Playwright pe fixture izolat, iar asseturile ilustrative sunt convertite
reproductibil în GIF-uri cu zoom discret și loop infinit.

## Refacerea GIF-urilor capturate cu Playwright (12 fluxuri)

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

## Conversia asseturilor ilustrative

Imaginile istorice din `assets/readme/` nu mai sunt referite direct de pagina principală.
Pentru fiecare există un GIF în `docs/assets/gif/readme-*.gif`, generat cu:

```bash
node scripts/animate-readme-assets.cjs
```

Scriptul rasterizează SVG-urile cu Playwright, apoi `scripts/animate-readme-assets.py`
creează cadre PIL la 900×540, cu paletă adaptivă și `loop=0`. Captura ilustrativă pentru
dictare nu pretinde că înlocuiește un test D&TED cu microfon; fluxurile reale capturate
de Playwright rămân în GIF-urile cu prefix numeric din `docs/assets/gif/`.

## Reguli pentru GIF-uri (directiva autor)

- Loop infinit (`loop=0`), o singură acțiune sau stare clară pe animație.
- Cursorul/elementul care se mișcă trebuie să fie vizibil.
- Alt-textul din README descrie exact ce se întâmplă, pentru un scriitor care nu știe ce
  e un „binder" sau un „compile format".
- GIF-urile existente NU se înlocuiesc fără motiv — se refac doar când se schimbă feature-ul.
