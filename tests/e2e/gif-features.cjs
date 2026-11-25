// Captare GIF-uri pentru README (cerință autor 2026-11-22): în locul pozelor statice,
// animații cu funcțiile principale — fereastra AI (streaming real + diff + acceptare),
// Help Finder, compile preview cu zoom, F6 focus, semnale fără AI.
// Cadrele ajung în docs/assets/gif/frames/<scenă>/ și se asamblează cu ffmpeg (paletă).
// Rulează după `npx vite build`:  node tests/e2e/gif-features.cjs
const path = require('path');
const fs = require('fs');
const http = require('http');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'assets', 'gif', 'frames');
process.env.PNEUMA_FULL_QA_DIR = 'D:/OpenCode/pneuma-demo-capturi/_qa';
fs.mkdirSync(OUT, { recursive: true });

// ---- Server AI mock (OpenAI-compatible, SSE) — streaming real pentru GIF -----------------
const REPLY = 'Capitol verificat, prima frază rămâne. A doua frază primește o formare mai clară, cu ritm mai lung la final.';
const MOCK_PORT = 8899;
const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    const words = REPLY.split(' ');
    let i = 0;
    const tick = setInterval(() => {
      if (i < words.length) {
        const chunk = (i ? ' ' : '') + words[i++];
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`);
        res.write('data: [DONE]\n\n');
        clearInterval(tick);
        res.end();
      }
    }, 90);
  });
});

const createHarness = require('./full-app-harness.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await new Promise((r) => mock.listen(MOCK_PORT, r));
  console.log('mock AI pe :' + MOCK_PORT);
  const H = await createHarness('gif');
  await H.launch();

  const frames = (scene) => path.join(OUT, scene);
  let n = 0;
  const shot = async (scene) => {
    const f = path.join(frames(scene), String(++n).padStart(4, '0') + '.png');
    await H.p.screenshot({ path: f, timeout: 10000 });
    return f;
  };
  const burst = async (scene, count, pause = 140) => { for (let k = 0; k < count; k++) { await shot(scene); await sleep(pause); } };

  const scenes = new Set();
  const open = async (scene) => { if (!scenes.has(scene)) { fs.rmSync(frames(scene), { recursive: true, force: true }); fs.mkdirSync(frames(scene), { recursive: true }); scenes.add(scene); n = 0; } };

  // Pregătire: proiect + AI pe serverul mock local
  // provider «custom»: keyless (needsKey=false) cu URL propriu — serverul mock local;
  // hasApiKey e calculat din preset (patch-urile cu hasApiKey sunt ignorate de settings:set).
  await H.settingsFixture({
    aiEnabled: true, aiProvider: 'custom', aiModel: 'demo-1',
    aiBaseUrl: `http://127.0.0.1:${MOCK_PORT}/v1`,
  });
  await H.selectText();

  // ===== Scena 1: fereastra AI — starter, streaming, diff, acceptare =====
  await open('01-ai-corectura');
  await H.command('ai');
  await H.p.waitForSelector('.ai-window .side-ai, .ai-panel', { timeout: 10000 });
  await H.p.waitForTimeout(300);
  await shot('01-ai-corectura');
  await shot('01-ai-corectura');
  // starter Corectură — un click pornește sarcina
  await H.p.locator('.ai-starter', { hasText: 'Corectură' }).click();
  await burst('01-ai-corectura', 3, 200);
  // streaming: status «scrie…» + text live
  for (let k = 0; k < 12; k++) { await shot('01-ai-corectura'); await sleep(160); }
  // cardul cu diff
  await H.p.waitForSelector('.ai-result', { timeout: 20000 });
  await burst('01-ai-corectura', 3, 250);
  // acceptare → aplică în editor
  await H.p.locator('.ai-result .ai-actions .primary').first().click();
  await burst('01-ai-corectura', 4, 200);
  await H.save();

  // ===== Scena 2: Help Finder — întrebare naturală, rezultate live =====
  await open('02-help-finder');
  await H.native(['Ajutor', 'Caută ajutor și comenzi…']);
  await H.p.waitForSelector('.help-finder', { timeout: 8000 });
  await shot('02-help-finder');
  const q = 'cum revin la o versiune anterioara';
  for (let i = 1; i <= q.length; i++) {
    await H.p.fill('.help-finder-q', q.slice(0, i));
    await H.p.waitForTimeout(60);
    if (i % 3 === 0 || i === q.length) await shot('02-help-finder');
  }
  await H.p.waitForTimeout(400);
  await burst('02-help-finder', 3, 220);
  await burst('02-help-finder', 8, 240);
  await H.p.keyboard.press('Escape');
  await H.p.waitForTimeout(200);

  // ===== Scena 3: compile — preview cu zoom „Potrivire la lățime” + acțiuni sticky =====
  await open('03-compile-preview');
  await H.command('compile');
  await H.p.waitForSelector('.compile-dialog', { timeout: 10000 });
  await shot('03-compile-preview');
  await H.p.getByRole('button', { name: /^Previzualizare/i }).click();
  await H.p.waitForSelector('.cd-preview', { timeout: 20000 });
  await burst('03-compile-preview', 7, 180);
  await H.p.locator('.cd-preview-head select').selectOption('100');
  await burst('03-compile-preview', 6, 180);
  await H.p.locator('.cd-preview-head select').selectOption('0');
  await burst('03-compile-preview', 5, 180);
  await H.p.keyboard.press('Escape');
  await H.p.waitForTimeout(200);

  // ===== Scena 4: F6 — focusul călătorește între panouri =====
  await open('04-focus-f6');
  await burst('04-focus-f6', 4, 180);
  for (let k = 0; k < 3; k++) {
    await H.p.keyboard.press('F6');
    await H.p.waitForTimeout(350);
    await burst('04-focus-f6', 4, 180);
  }
  await burst('04-focus-f6', 8, 240);

  // ===== Scena 5: semnale pe text (măsură, fără AI) =====
  await open('05-semnale');
  await H.command('viewEditor');
  await burst('05-semnale', 4, 180);
  await H.command('signals');
  await H.p.waitForSelector('.signals-dialog', { timeout: 8000 }).catch(() => {});
  await H.p.waitForTimeout(500);
  await burst('05-semnale', 8, 180);
  const grupa = H.p.locator('.signals-grupa summary').first();
  if (await grupa.count()) { await grupa.click(); await burst('05-semnale', 6, 180); }
  await burst('05-semnale', 8, 240);
  await H.p.keyboard.press('Escape');

  await H.dispose();
  mock.close();

  // ===== Asamblare GIF cu ffmpeg (paletă globală pe scenă) =====
  const gifDir = path.join(ROOT, 'docs', 'assets', 'gif');
  fs.mkdirSync(gifDir, { recursive: true });
  const FFMPEG = 'C:/Users/Ionut/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffmpeg.exe';
  for (const scene of scenes) {
    const gif = path.join(gifDir, scene + '.gif');
    execSync(`"${FFMPEG}" -y -framerate 4 -i "${frames(scene)}/%04d.png" -vf "fps=4,scale=1180:-1:flags=lanczos,palettegen=stats_mode=diff" "${frames(scene)}/palette.png"`, { stdio: 'pipe' });
    execSync(`"${FFMPEG}" -y -framerate 4 -i "${frames(scene)}/%04d.png" -i "${frames(scene)}/palette.png" -lavfi "fps=4,scale=1180:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3" -loop 0 "${gif}"`, { stdio: 'pipe' });
    console.log('GIF:', gif, Math.round(fs.statSync(gif).size / 1024) + ' KB');
  }
  console.log('GIF-URI GATA în docs/assets/gif/');
  process.exit(0);
})().catch((e) => { console.error('GIF FAIL:', e && e.stack || e); process.exit(1); });
