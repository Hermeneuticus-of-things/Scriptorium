// D&TED model choice: Settings → Services → D&TED → Check lists the models (eek recommended)
// and choosing one is applied to the service.
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:4183/?demo&dted';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(URL);
  await page.getByText('Deschide proiect .scribner').first().click();
  await page.locator('.pane .ProseMirror').first().waitFor();
  await require('./_helpers.cjs').menuCmd(page, 'Setări…');
  await page.getByRole('tab', { name: 'Servicii și conturi' }).click();
  await page.getByRole('button', { name: 'Verifică' }).click();
  const select = page.locator('select', { has: page.locator('option', { hasText: 'Optimizat pentru română' }) });
  await select.waitFor({ timeout: 5000 });
  const inUse1 = await page.getByText(/Folosit acum:/).innerText();
  await select.selectOption('whisper-large-v3-turbo-ct2');
  await page.waitForFunction(() => /Standard multilingv/.test(document.body.innerText.match(/Folosit acum:[^\n]*/)?.[0] || ''));
  const inUse2 = await page.getByText(/Folosit acum:/).innerText();
  const checks = [
    ['eek is the model in use by default', /Optimizat pentru română/.test(inUse1), inUse1],
    ['choosing another model applies it', /Standard multilingv/.test(inUse2), inUse2],
    ['no page errors', !errors.length, errors.join(' | ')],
  ];
  // An older D&TED: no list, a message to update it.
  await page.goto(URL.replace('&dted', '&dted=old'));
  await page.getByText('Deschide proiect .scribner').first().click();
  await page.locator('.pane .ProseMirror').first().waitFor();
  await require('./_helpers.cjs').menuCmd(page, 'Setări…');
  await page.getByRole('tab', { name: 'Servicii și conturi' }).click();
  await page.getByRole('button', { name: 'Verifică' }).click();
  const old = await page.getByRole('status').filter({ hasText: 'D&TED' }).first().innerText().catch(() => '');
  checks.push(['an older D&TED is told to update', /actualizează D&TED la 0\.4\.2/.test(old) && !(await page.getByText(/Folosit acum:/).count()), old]);
  for (const [n, ok, d] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${!ok && d ? ` — ${d}` : ''}`);
  await browser.close();
  if (checks.some(([, ok]) => !ok)) process.exit(1);
  console.log('all passing');
})();
