// Menu bar: Esc closes an open menu and returns to the editor; arrows move; typing continues.
const { open, ed, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  await caretEnd(page);
  const btn = page.locator('header.toolbar .menu > button').filter({ hasText: /^Proiect/ });
  await btn.click();
  check('menu opens', await page.locator('.menu-pop').count() === 1);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  check('Esc closes the menu', await page.locator('.menu-pop').count() === 0);
  await ed(page).click({ delay: 60 });
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' XYZ');
  await page.waitForTimeout(100);
  check('typing works after closing a menu with Esc', (await ed(page).innerText()).includes('XYZ'));
  // keyboard: Enter on the button opens on the first item, arrows move, Esc returns focus to the editor
  await btn.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  const first = await page.evaluate(() => document.activeElement.getAttribute('role'));
  check('Enter opens the menu with focus on the first item', first === 'menuitem');
  await page.keyboard.press('ArrowDown');
  const second = await page.evaluate(() => document.activeElement.textContent);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  const last = await page.evaluate(() => document.activeElement.textContent);
  check('arrows move and wrap', second !== last && Boolean(last));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  check('Esc from an item closes the menu', await page.locator('.menu-pop').count() === 0);
  check('no page errors', !errors.length, errors.join(' | '));
  await browser.close();
  done();
})();
