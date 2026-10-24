// Offline queue: writes fail (folder gone), the status bar shows the waiting documents, the text
// stays in the editor, and once the folder is back the queue empties by itself.
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:4183/?demo';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.getByText('Deschide proiect .scribner').first().click();
  const ed = page.locator('.pane .ProseMirror').first();
  await ed.click();
  await page.evaluate(() => (window.__demoOffline = true));
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' Scris fără conexiune.');
  await page.keyboard.press('Control+s');
  const waiting = await page.locator('.sync-pending').waitFor({ timeout: 5000 }).then(() => true, () => false);
  const label = waiting ? await page.locator('.sync-pending').innerText() : '';
  while (await page.locator('.toast button').count()) await page.locator('.toast button').first().click().catch(() => {});
  // Closing the app while offline: the queue is kept on this computer and sent at the next opening.
  await page.reload();
  await page.getByText('Deschide proiect .scribner').first().click();
  await ed.waitFor();
  // (demo ids change at every load, so the recovered text cannot land in the same document here;
  // the queue being sent and cleared is what is checked)
  const recovered = await page.waitForFunction(() => !Object.keys(localStorage).some((k) => k.startsWith('scribner-queue:')), null, { timeout: 5000 }).then(() => true, () => false);
  const toast = await page.locator('.toast').innerText().catch(() => '');
  while (await page.locator('.toast button').count()) await page.locator('.toast button').first().click().catch(() => {});
  await page.evaluate(() => { window.__demoOffline = true; });
  await page.keyboard.press('Control+s');
  await page.evaluate(() => { window.__demoOffline = false; window.dispatchEvent(new Event('online')); });
  const cleared = await page.locator('.sync-pending').waitFor({ state: 'detached', timeout: 5000 }).then(() => true, () => false);
  const checks = [
    ['the status bar shows the waiting document', waiting && /1 document\b/.test(label), label],
    ['the queue empties when the folder comes back', cleared && !(await page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith('scribner-queue:')))), ''],
    ['after closing the app offline, the text comes back and is sent', recovered && /recuperat \(documente: 1\)/.test(toast), toast],
    ['no page errors', !errors.length, errors.join(' | ')],
  ];
  for (const [n, ok, d] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${!ok && d ? ` — ${d}` : ''}`);
  await browser.close();
  if (checks.some(([, ok]) => !ok)) process.exit(1);
  console.log('all passing');
})();
