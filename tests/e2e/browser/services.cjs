// Settings → Servicii și conturi: DeepL key, then in-app translation and grammar check on a selection.
const { open, ed, check, done, menuCmd, answerAppDialog } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  const cmd = (label) => menuCmd(page, label);
  // translation without a key: a clear message, no crash
  await page.locator('.binder-row', { hasText: 'Căutarea' }).first().click();
  await ed(page).click({ delay: 60 });
  await page.waitForTimeout(120);
  await page.keyboard.press('Control+a');
  await cmd('Tradu selecția în program (DeepL)');
  await page.waitForTimeout(300);
  const toast = (await page.locator('.toast').allInnerTexts()).join(' | ');
  check('without a key: tells where to put it', /Setări/.test(toast), toast);
  while (await page.locator('.toast button').count()) await page.locator('.toast button').first().click();
  // save a DeepL key in Settings
  await cmd('Setări…');
  await page.getByRole('tab', { name: 'Servicii și conturi' }).click();
  const row = page.locator('.service-row', { hasText: 'DeepL' });
  await row.locator('input').first().fill('demo-key:fx');
  await row.getByRole('button', { name: 'Salvează' }).click();
  await page.waitForTimeout(200);
  check('DeepL shows as set up', /configurat/.test(await row.innerText()) && !/neconfigurat/.test(await row.innerText()));
  const sp = page.locator('.service-row', { hasText: 'Speechify' });
  await sp.locator('input').nth(0).fill('sp-key');
  await sp.locator('input').nth(1).fill('george');
  await sp.getByRole('button', { name: 'Salvează' }).click();
  await page.waitForTimeout(200);
  check('Speechify set up with a visible voice id', (await sp.locator('input').nth(1).inputValue()) === 'george' && /configurat/.test(await sp.innerText()));
  const zr = page.locator('.service-row', { hasText: 'Zotero' });
  await zr.locator('input').nth(0).fill('1234567');
  await zr.locator('input').nth(1).fill('zot-key');
  await zr.getByRole('button', { name: 'Salvează' }).click();
  await page.waitForTimeout(200);
  check('the key is not shown back', (await row.locator('input').first().inputValue()) === '');
  // account with password
  await page.getByRole('button', { name: 'Adaugă un cont' }).click();
  const form = page.locator('.account-form');
  await form.locator('input').nth(0).fill('Portal editură');
  await form.locator('input').nth(1).fill('https://portal.example.ro');
  await form.locator('input').nth(2).fill('ana');
  await form.locator('input').nth(3).fill('secret');
  await form.getByRole('button', { name: 'Salvează' }).click();
  await page.waitForTimeout(200);
  check('account listed with user, password hidden', /Portal editură · ana/.test(await page.locator('.accounts').innerText()) && !/secret/.test(await page.locator('.accounts').innerText()));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Settings asks (in-app) before discarding edits
  if (!(await page.locator('.app-dialog').count()) && (await page.locator('.modal-backdrop').count())) await page.locator('.modal-backdrop').first().click({ position: { x: 3, y: 3 } });
  await page.waitForTimeout(100);
  if (await page.locator('.app-dialog').count()) await answerAppDialog(page);
  // in-app translation, replace the selection
  await page.waitForTimeout(500);
  await ed(page).click({ delay: 60 });
  await page.waitForTimeout(120);
  await page.keyboard.press('Control+a');
  await cmd('Tradu selecția în program (DeepL)');
  await page.waitForSelector('.translate-pair', { timeout: 5000 });
  check('translation dialog shows original and result', /\[ro\]/.test(await page.locator('.translate-pair').innerText()));
  await page.getByRole('button', { name: 'Înlocuiește selecția' }).click();
  await page.waitForTimeout(200);
  check('selection replaced by the translation', /^\[ro\]/.test((await ed(page).innerText()).trim()));
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(200);
  // grammar check, apply the corrections
  await ed(page).click({ delay: 60 });
  await page.waitForTimeout(120);
  await page.keyboard.press('Control+a');
  await cmd('Verifică gramatica selecției');
  await page.waitForSelector('.grammar-list');
  const n = await page.locator('.grammar-list li').count();
  check('grammar issues listed', n >= 5, String(n));
  await page.getByRole('button', { name: 'Aplică corecturile' }).click();
  await page.waitForTimeout(200);
  const txt = await ed(page).innerText();
  check('corrections applied', /dimineață/.test(txt) && /și Ilinca/.test(txt) && /munte,/.test(txt), txt.slice(0, 120));
  // bibliography from Zotero
  await cmd('Importă bibliografia din Zotero');
  await page.waitForTimeout(300);
  const zt = (await page.locator('.toast').allInnerTexts()).join(' | ');
  check('Zotero import adds the titles to the bibliography', /2 titluri importate/.test(zt), zt);
  while (await page.locator('.toast button').count()) await page.locator('.toast button').first().click();
  // read aloud with Speechify
  await cmd('Mini-player voce');
  await page.waitForSelector('.mini-player');
  await page.waitForTimeout(300);
  const engine = await page.locator('.mini-player select').first().inputValue();
  check('voice mini-player offers Speechify and picks it', engine === 'speechify', engine);
  await page.locator('.mini-player button[aria-label="▶ Citește"]').click();
  await page.waitForTimeout(800);
  const barMsg = await page.locator('.mini-player').innerText();
  check('Speechify plays without an error', !/Pune cheia|eroare|Error/i.test(barMsg), barMsg);
  check('no page errors', !errors.length, errors.join(' | '));
  await browser.close();
  done();
})();
