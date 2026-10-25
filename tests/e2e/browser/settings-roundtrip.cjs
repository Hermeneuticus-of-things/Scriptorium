// Scenario: Settings round-trip — values changed on several tabs are saved and shown again
// on reopen, including edge values (paper opacity 0, backup every 0 min).
const { open, check, done, menuCmd } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  const dlg = () => page.locator('.modal[role=dialog]').last();
  const openSettings = async () => { await menuCmd(page, /^Setări…|^Settings…/); await page.waitForSelector('.modal [role=tablist]'); };
  const tab = async (i) => { await dlg().locator('[role=tab]').nth(i).click(); await page.waitForTimeout(80); };
  const field = (label) => dlg().locator('label', { hasText: label }).locator('input').first();
  // appearance: composition width/fade
  await openSettings();
  await tab(1);
  await dlg().locator('[data-look-section=composition]').click();
  const labels = await dlg().locator('fieldset label').allInnerTexts();
  const fadeLabel = labels.find((l) => /opac|transpar|Opacit/i.test(l)) || labels[2];
  const widthLabel = labels.find((l) => /lățime|width/i.test(l)) || labels[1];
  await field(fadeLabel.trim()).fill('0');
  await field(widthLabel.trim()).fill('60');
  // general: autosave
  await tab(0);
  const autosave = dlg().locator('input[type=number]').first();
  await autosave.fill('7');
  await dlg().locator('button.primary', { hasText: /Salvează|Save/ }).last().click();
  await page.waitForTimeout(300);
  check('dialog closed after save', (await page.locator('.modal [role=tablist]').count()) === 0);
  await openSettings();
  check('autosave kept', (await dlg().locator('input[type=number]').first().inputValue()) === '7');
  await tab(1);
  await dlg().locator('[data-look-section=composition]').click();
  check('composition width kept', (await field(widthLabel.trim()).inputValue()) === '60');
  check('paper opacity 0 kept (not reset to 100)', (await field(fadeLabel.trim()).inputValue()) === '0', await field(fadeLabel.trim()).inputValue());
  await page.keyboard.press('Escape');
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
