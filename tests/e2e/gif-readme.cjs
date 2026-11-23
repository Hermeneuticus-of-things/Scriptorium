// GIF-uri noi pentru README (spec 22.11.2026): mișcarea reală a interfeței, scene pe fluxuri
// de scriitor. Rulează după `npx vite build`:  node tests/e2e/gif-readme.cjs
// Cadrele → docs/assets/gif/frames/<scena>/, apoi ffmpeg (același pipeline ca gif-features.cjs).
// dictation-live NU poate fi capturat automat (cere D&TED instalat + microfon) — scenariul de
// filmare manuală e în docs/readme-gif-uri.md.
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_FRAMES = path.join(ROOT, 'docs', 'assets', 'gif', 'frames');
process.env.PNEUMA_FULL_QA_DIR = 'D:/OpenCode/pneuma-demo-capturi/_qa';
const createHarness = require('./full-app-harness.cjs');

(async () => {
  const H = await createHarness('gif-readme');
  await H.launch();

  const scenes = new Set();
  let n = 0;
  const open = (scene) => { if (!scenes.has(scene)) { fs.rmSync(path.join(OUT_FRAMES, scene), { recursive: true, force: true }); fs.mkdirSync(path.join(OUT_FRAMES, scene), { recursive: true }); scenes.add(scene); n = 0; } };
  const shot = async (scene) => { const f = path.join(OUT_FRAMES, scene, String(++n).padStart(4, '0') + '.png'); await H.p.screenshot({ path: f, timeout: 10000 }); return f; };
  const burst = async (scene, count, pause = 160) => { for (let k = 0; k < count; k++) { await shot(scene); await H.sleep(pause); } };
  const esc = async () => { await H.p.keyboard.press('Escape'); await H.sleep(250); };

  // Proiectul fixture: doc-a „Capitol verificat", doc-b „Al doilea document" în Dosar verificat.
  await H.settingsFixture({});

  // ===== 1. corkboard-move: fișa se trage, binderul se reordonează =====
  await open('01-corkboard-move');
  await H.command('viewCorkboard');
  await H.p.waitForSelector('.corkboard', { timeout: 8000 });
  await H.p.waitForTimeout(400);
  await burst('01-corkboard-move', 4, 180);
  // trage cardul doc-b înaintea lui doc-a (drag HTML5 pe cardul întreg)
  const cardB = H.p.locator('[data-card-id="doc-b"]');
  const cardA = H.p.locator('[data-card-id="doc-a"]');
  const bBox = await cardB.boundingBox();
  const aBox = await cardA.boundingBox();
  await H.p.mouse.move(bBox.x + bBox.width / 2, bBox.y + 20);
  await H.p.mouse.down();
  await H.p.mouse.move(aBox.x + aBox.width / 2, aBox.y + 20, { steps: 12 });
  await H.p.waitForTimeout(300);
  await burst('01-corkboard-move', 4, 180);
  await H.p.mouse.move(aBox.x + aBox.width / 2, aBox.y + 8, { steps: 6 });
  await burst('01-corkboard-move', 4, 180);
  await H.p.mouse.up();
  await H.p.waitForTimeout(500);
  await burst('01-corkboard-move', 7, 180);
  // Închidem scena după demonstrație. Fixture-ul este izolat pentru captură, deci
  // nu refacem ordinea printr-un al doilea drag care poate schimba suprafața activă.
  await esc();

  // ===== 2. translate-side: split cu original + traducere, meniul Traduce =====
  await open('02-translate-side');
  await H.command('viewEditor');
  await H.p.waitForSelector('.pane .ProseMirror', { state: 'visible', timeout: 8000 });
  await H.select('doc-a');
  await burst('02-translate-side', 4, 180);
  await H.command('split');
  await H.p.waitForTimeout(400);
  await burst('02-translate-side', 5, 180);
  // încarcă doc-b în celălalt panou (Alt+click în binder)
  await H.row('doc-b').click({ modifiers: ['Alt'] });
  await H.p.waitForTimeout(500);
  await burst('02-translate-side', 6, 180);
  // Unelte ▸ Traducere (meniu in-app DOM — capturabil; cel nativ nu apare în screenshot-uri)
  const menuBar = H.p.locator('header .menu > button, .menu-bar > button').filter({ hasText: /^Unelte$/ }).first();
  if (await menuBar.count()) {
    await menuBar.click();
    await H.p.waitForTimeout(300);
    await shot('02-translate-side');
    const tradItem = H.p.getByText('Traducere', { exact: false }).first();
    if (await tradItem.count()) { await tradItem.hover(); await H.p.waitForTimeout(300); await shot('02-translate-side'); }
    await burst('02-translate-side', 2, 200);
    await esc();
  }
  await esc();

  // ===== 3. compile-content-preview: bifezi conținutul, preview-ul se vede =====
  await open('03-compile-content');
  await H.command('compile');
  await H.p.waitForSelector('.compile-dialog', { timeout: 10000 });
  await burst('03-compile-content', 5, 180);
  // bifează/debifează un document în tabela de conținut
  const rows = H.p.locator('.compile-dialog input[type="checkbox"]');
  const cnt = await rows.count();
  if (cnt > 2) { await rows.nth(cnt - 1).click(); await H.p.waitForTimeout(300); await burst('03-compile-content', 5, 180); await rows.nth(cnt - 1).click(); await H.p.waitForTimeout(250); await burst('03-compile-content', 5, 180); }
  await H.p.getByRole('button', { name: /^Previzualizare/i }).click();
  await H.p.waitForSelector('.cd-preview', { timeout: 20000 });
  await H.p.waitForTimeout(900);
  await burst('03-compile-content', 6, 180);
  await esc();
  await esc();

  // ===== 4. reference-split: Quick Reference lângă editor =====
  await open('04-reference-quickref');
  await H.select('doc-b');
  await burst('04-reference-quickref', 4, 180);
  await H.command('quickRef');
  await H.p.waitForSelector('.quick-ref, [class*="quickref"]', { timeout: 8000 }).catch(() => {});
  await H.p.waitForTimeout(500);
  await burst('04-reference-quickref', 7, 180);
  // închide panourile quickref pentru curățenie
  const closeBtns = H.p.locator('[class*="quickref"] button[aria-label*="nchide"], .quick-ref button[aria-label*="nchide"]');
  const cb = await closeBtns.count();
  for (let k = 0; k < cb; k++) { await closeBtns.first().click().catch(() => {}); await H.sleep(150); }
  await esc();

  // ===== 5. wiki-link-create: [[Titlu nou]] → propunere → document creat =====
  await open('05-wiki-link');
  await H.command('viewEditor');
  await H.p.waitForSelector('.pane .ProseMirror', { state: 'visible', timeout: 8000 });
  await H.select('doc-a');
  await H.editor().click();
  await H.p.keyboard.press('Control+End');
  await burst('05-wiki-link', 4, 180);
  await H.p.keyboard.type(' Legătura către ');
  for (const ch of '[[Nume nou]]') { await H.p.keyboard.type(ch); await H.sleep(60); }
  await H.p.waitForTimeout(600);
  await burst('05-wiki-link', 6, 180);
  // Enter pe propunere (sau Esc dacă nu apare) — comportamentul real al editorului
  const sug = H.p.locator('.tippy-box, [data-tippy-root], .suggestion, [class*="suggest"]');
  if (await sug.count()) { await H.p.keyboard.press('Enter'); await H.p.waitForTimeout(600); await burst('05-wiki-link', 6, 180); }
  await esc();
  await H.save();

  // ===== 6. timeline-contradiction: cronologia pe zile =====
  await open('06-timeline');
  await H.command('viewEditor');
  await burst('06-timeline', 4, 180);
  await H.command('viewTimeline');
  await H.p.waitForTimeout(700);
  await burst('06-timeline', 7, 180);
  await H.command('viewEditor');
  await esc();

  // ===== 7. research-ask: panoul Cercetare (căutare offline pe surse) =====
  await open('07-research-ask');
  try {
    // Harnessul folosește buildul Electron real, dar backendul RAG nu este disponibil
    // în toate mediile locale. Păstrăm UI-ul și interacțiunea reală și injectăm doar
    // răspunsul determinist al indexului fixture-ului, fără a inventa un răspuns AI.
    await H.p.evaluate(() => {
      if (!window.api) return;
      window.api.ragQuery = async (_dir, query) => ({
        passages: [{ docId: 'doc-a', title: 'Capitol verificat', kind: 'docs', score: 0.98, text: `Pasaj găsit pentru întrebarea: ${query}` }],
      });
    });
    await H.command('research');
    await H.p.waitForSelector('.research-chat, [class*="research"]', { timeout: 6000 });
    await H.p.waitForTimeout(400);
    await burst('07-research-ask', 4, 180);
    const q = H.p.locator('.research-chat input[type="search"], .research-chat textarea').first();
    if (await q.count()) {
      await q.fill('Ce se întâmplă cu personajul?');
      await H.p.waitForTimeout(200);
      await burst('07-research-ask', 4, 180);
      const sourceToggle = H.p.locator('.research-sources-toggle').first();
      if (await sourceToggle.count()) {
        await sourceToggle.click();
        await H.p.waitForTimeout(250);
        await burst('07-research-ask', 4, 180);
        const sourceDetails = H.p.locator('.research-sources details').first();
        if (await sourceDetails.count()) { await sourceDetails.locator('summary').click(); await H.p.waitForTimeout(200); await burst('07-research-ask', 3, 180); }
        const source = H.p.locator('.research-sources input[type="checkbox"]:visible').first();
        if (await source.count()) { await source.scrollIntoViewIfNeeded(); await source.check(); await H.p.waitForTimeout(250); H.assert(await source.isChecked(), 'Research visible source checkbox was not selected'); await burst('07-research-ask', 5, 180); }
      }
      const ask = H.p.locator('.research-chat button').filter({ hasText: /Caută|Search/i }).first();
      if (await ask.count()) { await ask.click(); await H.p.waitForTimeout(500); await burst('07-research-ask', 7, 180); }
    }
    await esc();
  } catch (e) { console.log('research-ask: captura partiala — cadru pastrat ce s-a putut'); }

  await H.dispose();

  // ===== asamblare ffmpeg =====
  const gifDir = path.join(ROOT, 'docs', 'assets', 'gif');
  const FFMPEG = 'C:/Users/Ionut/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffmpeg.exe';
  for (const scene of scenes) {
    const gif = path.join(gifDir, scene + '.gif');
    execSync(`"${FFMPEG}" -y -framerate 7 -i "${frames(scene)}/%04d.png" -vf "fps=7,scale=1180:-1:flags=lanczos,palettegen=stats_mode=diff" "${frames(scene)}/palette.png"`, { stdio: 'pipe' });
    execSync(`"${FFMPEG}" -y -framerate 7 -i "${frames(scene)}/%04d.png" -i "${frames(scene)}/palette.png" -lavfi "fps=7,scale=1180:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3" -loop 0 "${gif}"`, { stdio: 'pipe' });
    console.log('GIF:', gif, Math.round(fs.statSync(gif).size / 1024) + ' KB');
  }
  function frames(scene) { return path.join(OUT_FRAMES, scene); }
  console.log('GIF-URI NOI GATA');
  process.exit(0);
})().catch((e) => { console.error('GIF-README FAIL:', e && e.stack || e); process.exit(1); });
