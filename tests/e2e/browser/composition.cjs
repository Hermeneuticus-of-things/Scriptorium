// Scenario: composition mode — enter (F11), type, Esc closes only the top-most layer, Esc exits.
const { open, ed, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  const inComp = () => page.evaluate(() => document.querySelector('.app').classList.contains('composition'));
  await caretEnd(page);
  await page.keyboard.press('F11');
  await page.waitForTimeout(300);
  check('F11 enters composition', await inComp());
  check('binder hidden in composition', (await page.locator('.binder').count()) === 0);
  await caretEnd(page);
  await page.keyboard.type(' COMPOZITIE', { delay: 15 });
  check('typing works in composition', (await ed(page).innerText()).includes('COMPOZITIE'));
  // Project search dialog over composition: Esc closes the dialog only
  await page.keyboard.press('Control+Shift+F');
  await page.waitForTimeout(300);
  const modals = () => page.locator('.modal-backdrop > .modal').count();
  const opened = (await modals()) > 0;
  check('project search opens in composition', opened);
  if (opened) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    check('Esc closes the dialog', (await modals()) === 0);
    check('Esc over a dialog does not also leave composition', await inComp());
  }
  // Find bar over composition
  await caretEnd(page);
  await page.keyboard.press('Control+F');
  await page.waitForTimeout(250);
  const fb = page.locator('.find-bar input').first();
  if (await fb.count()) {
    await fb.focus();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    check('Esc in the find bar does not leave composition', await inComp());
  }
  await caretEnd(page);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('Esc in the editor leaves composition', !(await inComp()));
  check('text kept after leaving', (await ed(page).innerText()).includes('COMPOZITIE'));
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
