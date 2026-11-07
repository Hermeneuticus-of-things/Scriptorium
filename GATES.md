# Gates: ADL T9 — migrarea dimensiunilor pe token-e (itemii 9–13)

OWNS: src/styles.css, tests/adlTokens.test.js, GATES.md

Scope: ADL §4 + §11 (docs/IONUT_APPLICATION_DESIGN_LANGUAGE.md; itemii 9–13 din
adl-campaign.md): control sizes 24/28/32, toolbar 32–40 + pointer target ≥32, spacing
4/8/12, icons 16/20, tip UI 12–14, radius 4–8 (token-e), padding control 4–8. Perimetrul
declarat: **src/styles.css** (audit + migrare + token-e în `:root`). Celelalte fișiere CSS
(ai, behaviour, editor-extra, panels-extra, appearance, script, help, component dialogs,
smallWindows, scrivener-theme) — doar auditate, enumerate în raport ca urmatoare; NU migrate
în T9 (risc de conflict cu worktree-urile paralele ale aceleiași campanii).

Decizii de încadrare (audit complet în tests/adlTokens.test.js — allowlist cu motiv per valoare):
- Token-e noi: `--ctl-sm/md/lg` 24/28/32, `--icon-sm/md` 16/20, `--sp-1/2/3` 4/8/12,
  `--radius` 6, `--radius-lg` 8, `--font-ui-sm` 12, `--font-ui` 13, `--font-ui-md` 14.
- Defect PRE-EXISTENT găsit la audit, NE-reparat aici (arenă diferită — layout bară modernă):
  la `data-ui='modern'` menubarul colapsează peste titlul proiectului (`.menubar` shrink+min-width:0,
  copii neshrinkabili — la baseline ~207px suprapunere; T9 adaugă ~40px presiune prin controale
  mai late → ~249px). Tema implicită e classic (neafectată). De rezolvat într-o campanie dedicată
  barei moderne (wrap/scroll/overflow-menu).
- Rămân (documentate în allowlist): lățimile de layout (binder 260, inspector 300, modale,
  panouri), padding-urile de suprafață (pagini, dialoguri, panouri, bare — orizontal), indicatoarele
  (puncte 5–12px, metre, bare de grafic), pill-urile/stadioanele (radius 10–14 pe înălțime de pastile,
  999px), glifele-în-text (badge 11, mini-title 13, mini-clip 12), tipul de afișare (home h1 42,
  stats 22, tile glyph 28), etichetele de grafic 9/10px, conținutul (doc-title 15, quickref 15,
  editor 18, --editor-font-size),-thumbnailurile-preview (tpl-icon 36/32, cd-layout-thumb 46).
- 4px→6px la radius: card/page/tile — subtil, unifică pe 2 token-uri (6/8).
- Gap 6px: 8 între controale, 4 în interiorul compozitelor (label+input, chip, titlu+meta);
  10px: 8 (liste de controale) / 12 (secțiuni de panou); 14/16/24 → 12.
- Toolbar (header + format bar): padding-y 4px + controale min-height 32 → fâșie 40px
  (testul e2e topbar-layout cere <58 și un singur rând — rămâne în limite).
- Pointer target 32: butoanele din toolbar/menubar/seg, format-bar, binder-tools, modal-x
  (30→32), mini-mic (34→32); rândurile dense secundare (pane-head, statusbar, snap-toolbar,
  find-bar, comp-bar) primesc 24/28 — excepție documentată (context dens, țintă vecină).

- [x] G1: Token-ele ADL există în `:root` (src/styles.css): --ctl-sm/md/lg, --icon-sm/md,
  EVIDENCE: automatic-evidence=v1; definition-sha256=0dff0d85d88bc2285390619b587b9ad99331df0dddfc49b1c339b1eddb5687e6; exit=0; EXPECT=matched; output-sha256=8fe875b66cff3e8f27d72af25617e80db09042365dc93d3f0428bec54060a88e; output-bytes=10; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t9; path=a68386b800d3/59 entries
  --sp-1/2/3, --radius, --radius-lg, --font-ui-sm/--font-ui/--font-ui-md cu valorile scalei.
  CHECK: node -e "const s=require('fs').readFileSync('src/styles.css','utf8');const t=['--ctl-sm: 24px','--ctl-md: 28px','--ctl-lg: 32px','--icon-sm: 16px','--icon-md: 20px','--sp-1: 4px','--sp-2: 8px','--sp-3: 12px','--radius: 6px','--radius-lg: 8px','--font-ui-sm: 12px','--font-ui: 13px','--font-ui-md: 14px'];const miss=t.filter(x=>!s.includes(x));if(miss.length){console.error('MISSING '+miss.join(', '));process.exit(1)}console.log('TOKENS OK')"
  EXPECT: /TOKENS OK/

- [x] G2: Testul de conformitate executabil (tests/adlTokens.test.js) codifică auditul: fără
  EVIDENCE: automatic-evidence=v1; definition-sha256=ea47fabf2b386c026ffbece8f12027683f2ec84782b2da17cf28bfc61c432c52; exit=0; EXPECT=matched; output-sha256=d40927a91cc2b8e665156ca35058c314439f5f6cecae756f622fc10b1988cfaf; output-bytes=8806; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t9; path=a68386b800d3/59 entries
  valori off-scale în styles.css în afara allowlist-ului documentat (heights/widths de
  control, gap, radius, font-size UI, iconițe) și fără `transition: all`.
  CHECK: npx vitest run tests/adlTokens.test.js --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":0/

- [x] G3: Fără regresii — întreaga suită vitest verde (4 skip preexistente rămân singurele pending).
  CHECK: npx vitest run --reporter=json
  EXPECT: /"numFailedTests":0,"numPendingTests":4/
  EVIDENCE: automatic-evidence=v1; definition-sha256=444d343f04e84f4242df4e5dec428820e0ed92c3adde6d13f329308b243f59d3; exit=0; EXPECT=matched; output-sha256=9e44d677882e809580f78b609d5a84911b6be75a71e4cc9ae645b727813c21c2; output-bytes=630997; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t9; path=a68386b800d3/59 entries

- [x] G4: Build-ul de producție trece.
  CHECK: npx vite build
  EXPECT: /built in/
  EVIDENCE: automatic-evidence=v1; definition-sha256=202b6423274a1e776d6ddcc8d133917c5c706a45d1cd69c285f24b4a854abbd3; exit=0; EXPECT=matched; output-sha256=88a62467dd2ed44e175d9f4d57c556a67c70dc82c54f2367e409f9683e0c5fa2; output-bytes=868; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t9; path=a68386b800d3/59 entries

- [x] G5: E2E Electron rămâne verde.
  CHECK: node -e "process.env.PLAYWRIGHT_PATH='C:/Users/Ionut/Documents/Scriptorium/node_modules/playwright/index.js'; require('./tests/e2e/electron.e2e.cjs');"
  EXPECT: /E2E OK/
  EVIDENCE: automatic-evidence=v1; definition-sha256=e82f851dcf926cad47bf29548d46338ae00eb5cd68890f78d9ff4637ca3af995; exit=0; EXPECT=matched; output-sha256=8e9c6930dd9ffbc50f521f61c5778640a37461dec23b4ee8c6a2c04fa0a39273; output-bytes=802; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t9; path=a68386b800d3/59 entries

- [x] G6: Suita de flows (Electron) rămâne verde.
  CHECK: node -e "process.env.PLAYWRIGHT_PATH='C:/Users/Ionut/Documents/Scriptorium/node_modules/playwright/index.js'; require('./tests/e2e/flows.e2e.cjs');"
  EXPECT: /FLOWS OK/
  EVIDENCE: automatic-evidence=v1; definition-sha256=b770413524aa15cf7fc568584eba8f1ba19b257a3df4e463793be1d0383edcb9; exit=0; EXPECT=matched; output-sha256=babcbb2cdbc6b4a5a51746879b23f8d6b051d08d5f52024c72bc7dc161cb9f8b; output-bytes=5992; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t9; path=a68386b800d3/59 entries

- [x] G7: Flows-urile browser sensibile la dimensiuni rămân verzi (topbar-layout: toolbar <58px
  EVIDENCE: automatic-evidence=v1; definition-sha256=d84957158c65662ff8c51f08d67e557a8aa9a090878d0ca33725829306561929; exit=0; EXPECT=matched; output-sha256=abc2fb70522f32d709ba2219773e8ff889e64a28bdeb0a8cdb94a52f224ba3f9; output-bytes=136; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\Ionut\Documents\Scriptorium-wt-t9; path=a68386b800d3/59 entries
  + un rând + nimic tăiat; formatbar-binder-ui; dialogs-electron; keyboard-only: ținte vizibile;
  menu-viewport) pe `vite preview :4183`. Excepții documentate (PRE-EXISTENTE, măsurate la
  baseline cu git stash: „light-900" ȘI „dark-900 top bar is one row — 86.1875px" — tema
  classic își permite prin design bara pe 2 rânduri la ≤960px, scrivener-theme.css
  `[data-ui='classic'] .toolbar { flex-wrap: wrap }`; cu T9 măsoară 67px — îmbunătățit,
  tot pe 2 rânduri). Orice ALT FAIL = poarta căzută.
  CHECK: bash "C:/Users/Ionut/AppData/Local/Temp/adl-t9-audit/run-browser-flows.sh"
  EXPECT: /BROWSER FLOWS OK/
