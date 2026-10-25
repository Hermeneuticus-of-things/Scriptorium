// Inspector snapshots: take → edit → compare shows the change → restore brings the old text back
// (and keeps an automatic snapshot of the edited text); the text survives a document switch.
const { open, ed, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  page.on('dialog', (d) => d.accept());
  await page.locator('.binder-row', { hasText: 'Începutul' }).first().click();
  await page.waitForTimeout(250);
  if (!(await page.locator('.inspector .tabs').count())) { await page.keyboard.press('Control+Shift+I'); await page.waitForTimeout(200); }
  const tab = page.locator('.inspector .tabs button').nth(3);
  await tab.click();
  await page.waitForTimeout(150);
  const original = await ed(page).innerText();
  await page.locator('.snapshots > button').first().click();
  await page.waitForTimeout(300);
  check('snapshot listed', (await page.locator('.snapshots li').count()) === 1);

  await caretEnd(page);
  await page.keyboard.type(' SNAPEDIT');
  await page.waitForTimeout(700);
  await tab.click();
  await page.locator('.snapshots li').first().locator('button.link').nth(1).click(); // Compare
  await page.waitForTimeout(250);
  const cmp = await page.locator('.snapshots').innerText();
  check('compare shows the added text', cmp.includes('SNAPEDIT'), cmp.slice(-200));

  await page.locator('.snapshots li').first().locator('button.link').last().click(); // Restore
  await page.waitForTimeout(500);
  check('restore brings the old text back', !(await ed(page).innerText()).includes('SNAPEDIT'));
  check('automatic snapshot taken before restore', (await page.locator('.snapshots li').count()) === 2);

  await page.locator('.binder-row', { hasText: 'Partea întâi' }).first().click();
  await page.waitForTimeout(250);
  await page.locator('.binder-row', { hasText: 'Începutul' }).first().click();
  await page.waitForTimeout(300);
  const after = await ed(page).innerText();
  check('restored text survives a document switch', !after.includes('SNAPEDIT') && after.trim() === original.trim());
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
