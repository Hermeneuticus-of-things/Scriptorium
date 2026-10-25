// Audit 2 windows: Page View at the Page Setup size, Linguistic Focus panel, Keywords HUD,
// Special Characters, Auto-complete list + Ctrl+Space. Run against `npx vite preview` (SCRIBNER_URL).
const { open, ed, caretEnd, check, done, menuCmd, onAppDialog } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  onAppDialog(page, (d) => d.accept());
  await page.locator('.binder-row', { hasText: 'Începutul' }).first().click();
  await page.waitForTimeout(250);

  // Page View at the Page Setup size
  await menuCmd(page, 'Vedere pagină la mărimea din Configurare pagină');
  const pv = page.locator('.page.page-view.page-setup').first();
  check('page view uses the Page Setup class', (await pv.count()) === 1);
  const w = await pv.evaluate((el) => getComputedStyle(el).maxWidth);
  const cm = parseFloat(w) / 37.795;
  check('page width follows the paper size', cm > 20 && cm < 22.2, w);
  await menuCmd(page, 'Vedere pagină la mărimea din Configurare pagină');
  check('toggles off', (await page.locator('.page.page-view').count()) === 0);

  // Linguistic Focus panel
  await menuCmd(page, 'Focus lingvistic…');
  const lf = page.locator('.linguistic-focus-panel');
  check('linguistic focus opens', (await lf.count()) === 1);
  await lf.locator('input[value="noun"]').check();
  await page.waitForTimeout(250);
  check('nouns fade the rest', (await page.locator('.pane .ProseMirror .pos-faded').count()) > 0);
  await lf.locator('input[type=range]').fill('0.6');
  await lf.locator('.fp-close').click();
  await page.waitForTimeout(200);
  check('closing turns focus off', (await page.locator('.pane .ProseMirror .pos-faded').count()) === 0 && (await lf.count()) === 0);

  // Special characters
  await caretEnd(page);
  await menuCmd(page, 'Caractere speciale…');
  const sc = page.locator('.special-chars');
  check('special characters open', (await sc.count()) === 1);
  await sc.locator('button.sc-char', { hasText: '—' }).first().click();
  await page.waitForTimeout(150);
  check('inserts at the cursor', (await ed(page).innerText()).trimEnd().endsWith('—'));
  await sc.locator('select').selectOption('greek');
  check('category switch', (await sc.locator('button.sc-char', { hasText: 'Ω' }).count()) >= 1 && (await sc.locator('button.sc-char', { hasText: '—' }).count()) === 0);
  await sc.locator('.fp-close').click();

  // Auto-complete list + Ctrl+Space
  await menuCmd(page, 'Listă de completare automată…');
  const ac = page.locator('.autocomplete-dialog');
  await ac.locator('input').fill('Zamfirescu');
  await ac.locator('button.ac-add').click();
  check('word listed', (await ac.locator('li', { hasText: 'Zamfirescu' }).count()) === 1);
  await ac.locator('button.ac-save').click();
  await caretEnd(page);
  await page.keyboard.type(' Zamf');
  await page.keyboard.press('Control+Space');
  await page.waitForTimeout(150);
  check('Ctrl+Space completes', (await ed(page).innerText()).trimEnd().endsWith('Zamfirescu'));

  // Keywords HUD
  await menuCmd(page, 'Panou de cuvinte cheie (HUD)');
  const kh = page.locator('.keywords-hud');
  check('keywords HUD opens', (await kh.count()) === 1);
  const items = kh.locator('.kh-item');
  if (await items.count()) {
    const first = items.first();
    const before = Number(await first.locator('.muted').innerText());
    await first.dblclick();
    await page.waitForTimeout(250);
    const after = Number(await kh.locator('.kh-item').first().locator('.muted').innerText());
    check('double-click toggles the keyword on the selection', after === before + 1 || after === before - 1, `${before}→${after}`);
  } else {
    check('HUD shows the empty state', (await kh.innerText()).includes('Niciun cuvânt cheie'));
  }
  await kh.locator('.fp-close').click();

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
