// The same paragraph changed here and "on another computer": the conflict dialog offers both
// versions; choosing theirs puts their text in the editor.
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:4183/?demo&conflict';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.getByText('Deschide proiect .scribner').first().click();
  const ed = page.locator('.pane .ProseMirror').first();
  await ed.click();
  await page.evaluate(() => document.querySelector('.pane .ProseMirror').editor.commands.setTextSelection(1));
  await page.keyboard.type('Ploua mărunt. ');
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__demoExternalEdit((h) => h.replace('rece de octombrie', 'cețoasă de noiembrie')));
  await page.locator('button.sync-conflict').click();
  await page.waitForSelector('.conflict-dialog');
  await page.locator('.conflict-side', { hasText: 'celălalt calculator' }).click();
  await page.getByRole('button', { name: 'Aplică alegerile' }).click();
  const text = await ed.innerText();
  const ok = text.includes('cețoasă de noiembrie') && !text.includes('Ploua mărunt') && !(await page.locator('.conflict-dialog').count());
  console.log(ok ? 'PASS conflict: their version applied' : `FAIL conflict: ${text.slice(0, 120)}`);
  console.log(errors.length ? `FAIL page errors: ${errors}` : 'PASS no page errors');
  await browser.close();
  if (!ok || errors.length) process.exit(1);
  console.log('all passing');
})();
