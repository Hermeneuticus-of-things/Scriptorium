// The built-in recogniser in the real UI (?demo&whisper, Chromium's fake microphone): download from
// Settings with progress, F9 dictation at the cursor, an audio file to a Research document.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { check, done, menuCmd } = require('./_helpers.cjs');
const URL = (process.env.SCRIBNER_URL || 'http://localhost:4183/?demo') + '&whisper=missing';
(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL);
  await page.getByText('Deschide proiect .scribner').first().click();
  await page.waitForSelector('.pane .ProseMirror');
  const ed = page.locator('.pane .ProseMirror').first();

  // engine missing: F9 starts the one-time download by itself and says so
  await ed.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('F9');
  await page.waitForTimeout(500);
  check('without the engine F9 starts the download', /descărcarea motorului de dictare/.test(await page.locator('body').innerText()));
  check('no dictation bar without the engine', (await page.locator('.dictation-bar').count()) === 0);

  // download from Settings → Services
  await menuCmd(page, /^Setări…/);
  await page.locator('.modal [role=tab]', { hasText: /Servicii/ }).first().click();
  const eng = page.locator('.local-engine');
  check('the built-in engine is the default choice', (await page.locator('input[name=speechEngine]').first().isChecked()) === true);
  // the download F9 started is finishing (or done): Settings shows it, no second download needed
  await page.waitForFunction(() => /gata/.test(document.querySelector('.local-engine')?.innerText || ''), null, { timeout: 5000 }).catch(() => {});
  check('engine ready after download', /e descărcat și gata/.test(await eng.innerText()), await eng.innerText());
  await page.locator('.modal button.primary', { hasText: /^Salvează$/ }).last().click();
  await page.waitForTimeout(300);

  // dictation with the fake microphone
  await ed.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('F9');
  await page.waitForSelector('.dictation-bar');
  await page.waitForFunction(() => document.querySelector('.pane .ProseMirror').innerText.includes('Ceața se ridica'), null, { timeout: 15000 }).catch(() => {});
  await page.locator('.dictation-bar button', { hasText: /^Stop$/ }).click();
  await page.waitForSelector('.dictation-bar', { state: 'detached', timeout: 15000 }).catch(() => {});
  const text = await ed.innerText();
  check('dictated text from the microphone is in the document', /rămâne\. Ceața se ridica încet din vale/.test(text.replace(/\s+/g, ' ')), text.slice(-160));
  check('bar closed after Stop', (await page.locator('.dictation-bar').count()) === 0);

  // an audio file decoded in the window and transcribed
  await menuCmd(page, /^Transcrie fișier audio/);
  await page.waitForFunction(() => [...document.querySelectorAll('.binder-row')].some((r) => r.textContent.includes('Transcriere: amintiri.wav')), null, { timeout: 10000 }).catch(() => {});
  check('audio file → Research document', (await page.locator('.binder-row', { hasText: 'Transcriere: amintiri.wav' }).count()) === 1);
  check('transcript text', /Când eram mică, iarna venea devreme\./.test(await ed.innerText()), (await ed.innerText()).slice(0, 120));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
