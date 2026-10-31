// Scenario: Options > Appearance in detail — current line highlight from Options, typing line
// position, an editor colour with its own Default, binder label mode, and a saved colour theme.
const { open, caretEnd, check, done, menuCmd } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  const dlg = () => page.locator('.modal[role=dialog]').last();
  const openLook = async () => {
    await menuCmd(page, /^Setări program…|^Program settings…/);
    await page.waitForSelector('.modal [role=tablist]');
    await dlg().locator('[role=tablist] [role=tab]').nth(1).click();
    await page.waitForSelector('.appearance-pane');
  };
  await openLook();
  check('appearance sections listed', (await dlg().locator('.look-sections button').count()) >= 10);
  await dlg().locator('[data-look-section=editor]').click();
  await dlg().locator('label.check', { hasText: /Evidențiază rândul|Highlight the current/ }).locator('input').check();
  await dlg().locator('input[type=range]').first().fill('30');
  await dlg().locator('.look-color input[type=color]').first().evaluate((el) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(el, '#fafae0');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await dlg().locator('[data-look-section=binder]').click();
  await dlg().locator('select').filter({ has: page.locator('option[value=row]') }).selectOption('row');
  // theme: name + save
  await dlg().locator('.look-themes input').first().fill('Test');
  await dlg().locator('.look-themes button').first().click();
  await dlg().locator('button.primary', { hasText: /Salvează|Save/ }).last().click();
  await page.waitForTimeout(300);
  const st = await page.evaluate(() => ({ cur: document.documentElement.dataset.curLine, tw: document.documentElement.dataset.typewriterPos, bg: document.documentElement.style.getPropertyValue('--ed-bg'), lab: document.documentElement.dataset.binderLabels }));
  check('current line switch on <html>', st.cur === 'on', JSON.stringify(st));
  check('typing line position 30', st.tw === '30', JSON.stringify(st));
  check('editor background colour applied', st.bg === '#fafae0', JSON.stringify(st));
  check('binder label mode row', st.lab === 'row', JSON.stringify(st));
  await caretEnd(page);
  await page.keyboard.type(' x');
  await page.waitForTimeout(200);
  check('current line overlay shown', await page.locator('.current-line-overlay').first().isVisible());
  // reopen: theme saved in the list, Default clears the colour
  await openLook();
  check('saved theme listed', (await dlg().locator('.look-themes select option', { hasText: 'Test' }).count()) === 1);
  await dlg().locator('[data-look-section=editor]').click();
  await dlg().locator('.look-color').first().locator('button').click();
  await dlg().locator('button.primary', { hasText: /Salvează|Save/ }).last().click();
  await page.waitForTimeout(300);
  check('Default removes the colour', (await page.evaluate(() => document.documentElement.style.getPropertyValue('--ed-bg'))) === '');
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
