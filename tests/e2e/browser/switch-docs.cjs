// Scenario 4: type then switch documents within <100ms; text must land in the right doc.
const { open, ed, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  const binder = (t) => page.locator('.binder').getByText(t, { exact: true });
  await binder('Începutul').click();
  await ed(page).click();
  await page.keyboard.press('End');
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' ALFA', { delay: 5 });
  await binder('Drumul').click();
  await page.waitForTimeout(50);
  await ed(page).click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' BETA', { delay: 5 });
  await binder('Începutul').click();
  await page.waitForTimeout(300);
  const a = await ed(page).innerText();
  await binder('Drumul').click();
  await page.waitForTimeout(300);
  const b = await ed(page).innerText();
  check('ALFA saved in Începutul only', a.includes('ALFA') && !b.includes('ALFA'), JSON.stringify(a));
  check('BETA saved in Drumul only', b.includes('BETA') && !a.includes('BETA'), JSON.stringify(b));
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
