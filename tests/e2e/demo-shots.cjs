// Tur demonstrativ cu capturi (cerință autor 2026-11-22): aplicația reală, zonele modificate —
// fereastra AI (chips contextuale + stare), Help Finder, preview-ul de compile (fix: panou +
// zoom «potrivire» + acțiuni sticky), focus T1, semnale fără AI. Capturile ajung în
// D:\OpenCode\pneuma-demo-capturi\. Rulează după `npx vite build`:  node tests/e2e/demo-shots.cjs
const path = require('path');
const fs = require('fs');
const os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = 'D:/OpenCode/pneuma-demo-capturi';
process.env.PNEUMA_FULL_QA_DIR = path.join(OUT, '_qa');
fs.mkdirSync(OUT, { recursive: true });
const createHarness = require('./full-app-harness.cjs');

// Garanție „testez pe ultima versiune": build-ul din dist/ trebuie mai nou decât orice sursă.
const distAge = fs.statSync(path.join(ROOT, 'dist', 'index.html')).mtimeMs;
let newest = 0;
for (const root of ['src', 'electron', 'lib']) {
  const rec = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p2 = path.join(d, e.name);
      if (e.isDirectory()) rec(p2);
      else newest = Math.max(newest, fs.statSync(p2).mtimeMs);
    }
  };
  rec(path.join(ROOT, root));
}
if (newest > distAge) {
  console.error('BUILD ÎNVECHIT: dist e mai vechi decât sursele. Rulează întâi `npx vite build`.');
  process.exit(2);
}
(async () => {
  const H = await createHarness('demo');
  await H.launch();
  try {
    await H.settingsFixture({ aiEnabled: true, aiProvider: 'ollama' });
    await H.shot('01-editor-si-binder');

    // Fereastra AI: separată de Inspector, chips contextuale, stare vizibilă
    await H.command('ai');
    await H.p.waitForSelector('.ai-window .side-ai, .ai-panel', { timeout: 10000 });
    await H.p.waitForTimeout(400);
    await H.shot('02-fereastra-AI-chips-si-stare');

    await H.command('toggleInspector');
    await H.p.waitForTimeout(300);
    await H.shot('03-inspectorul-separat-de-AI');

    // Help Finder: întrebare în limbaj natural
    await H.native(['Ajutor', 'Caută ajutor și comenzi…']);
    await H.p.waitForSelector('.help-finder', { timeout: 8000 });
    await H.p.fill('.help-finder-q', 'cum export manuscrisul în pdf');
    await H.p.waitForTimeout(500);
    await H.shot('04-help-finder-cautare-naturala');
    await H.p.keyboard.press('Escape');
    await H.p.waitForTimeout(200);

    // Compile + preview fix
    await H.command('compile');
    await H.p.waitForSelector('.compile-dialog', { timeout: 10000 });
    await H.p.getByRole('button', { name: /^Previzualizare/i }).click();
    await H.p.waitForSelector('.cd-preview', { timeout: 15000 });
    await H.p.waitForTimeout(900);
    await H.shot('05-compile-preview-panou-zoom-sticky');
    await H.p.keyboard.press('Escape');
    await H.p.waitForTimeout(200);

    // T1: focus pe Binder din tastatură
    const menu = await H.menu();
    const focusItem = menu.find((m) => /Mută focusul/i.test(m.label || ''));
    H.assert(focusItem, 'Lipsește «Mută focusul» din Navigate');
    await H.command('focusBinder');
    await H.p.waitForTimeout(300);
    await H.shot('06-focus-pe-binder-T1');

    // Semnale (măsură, fără AI)
    await H.command('signals');
    await H.p.waitForSelector('.signals-dialog', { timeout: 8000 }).catch(() => {});
    await H.p.waitForTimeout(600);
    await H.shot('07-semnale-pe-text-fara-AI');
    await H.p.keyboard.press('Escape');

    const src = path.join(process.env.PNEUMA_FULL_QA_DIR, 'demo', 'screens');
    if (fs.existsSync(src)) {
      for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(OUT, f));
    }
    console.log('CAPTURI SALVATE ÎN:', OUT);
  } finally {
    await H.dispose();
  }
  process.exit(0);
})().catch((e) => { console.error('DEMO FAIL:', e && e.stack || e); process.exit(1); });
