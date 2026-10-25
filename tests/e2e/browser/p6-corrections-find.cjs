// P6: Options → Corrections / Editing panes (saved and applied) and the find bar's new modes.
const { open, caretEnd, check, done, menuCmd } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  page.setDefaultTimeout(8000);
  process.on('unhandledRejection', async (e) => { console.log('FAIL', e.message.split('\n')[0]); await browser.close(); process.exit(1); });
  const dlg = () => page.locator('.modal[role=dialog]').last();
  const openSettings = async () => { await menuCmd(page, /^Setări…|^Settings…/); await page.waitForSelector('.modal [role=tablist]'); };
  const tabNamed = async (re) => { await dlg().locator('[role=tab]', { hasText: re }).first().click(); await page.waitForTimeout(80); };
  const box = (re) => dlg().locator('label.check', { hasText: re }).locator('input');
  const text = () => page.evaluate(() => document.querySelector('.pane .ProseMirror').editor.state.doc.textContent);

  // Corrections: two capitals, English quotes, grammar check on.
  await openSettings();
  await tabNamed(/^Corecturi|^Corrections/);
  check('corrections pane shown', (await dlg().locator('.corrections-pane').count()) === 1);
  if (!(await box(/DOuă|TWo/).isChecked())) await box(/DOuă|TWo/).check();
  await box(/gramatica|grammar/i).check();
  await dlg().locator('select').first().selectOption('en');
  check('import / export buttons', (await dlg().locator('button', { hasText: /Importă|Import/ }).count()) === 1 && (await dlg().locator('button', { hasText: /Exportă|Export/ }).count()) === 1);
  // Editing: three sub-tabs, auto-pair brackets.
  await tabNamed(/^Editare|^Editing/);
  const subs = await dlg().locator('.editing-pane [role=tab]').allInnerTexts();
  check('editing sub-tabs', subs.length === 3, subs.join(','));
  await box(/parantezele|brackets/i).check();
  await dlg().locator('.editing-pane [role=tab]').nth(1).click();
  check('mini ruler', (await dlg().locator('.mini-ruler').count()) === 1);
  await dlg().locator('.editing-pane [role=tab]').nth(2).click();
  await dlg().locator('.editing-pane input:not([type=checkbox])').first().fill('Redactor');
  await dlg().locator('button.primary', { hasText: /Salvează|Save/ }).last().click();
  await page.waitForTimeout(400);

  await caretEnd(page);
  await page.keyboard.press('Enter');
  await page.keyboard.type('THe "x" (y', { delay: 10 });
  const t1 = await text();
  check('two capitals fixed', t1.includes('The '), t1);
  check('chosen quotes', t1.includes('“x”'), t1);
  check('bracket closed', t1.endsWith('(y)'), t1);
  await page.keyboard.press('End');
  await page.keyboard.type(' Gata. apoi', { delay: 10 });
  await page.waitForTimeout(100);
  check('grammar mark', (await page.locator('.pane .ProseMirror .grammar-issue').count()) > 0);

  // Reopen: the values are kept.
  await openSettings();
  await tabNamed(/^Editare|^Editing/);
  await dlg().locator('.editing-pane [role=tab]').nth(2).click();
  check('round name kept', (await dlg().locator('.editing-pane input:not([type=checkbox])').first().inputValue()) === 'Redactor');
  await dlg().locator('button', { hasText: /Anulează|Cancel/ }).last().click();
  await page.waitForTimeout(150);

  // Find bar: mode select, diacritics, in-selection, history.
  await page.locator('.pane .ProseMirror').click();
  await caretEnd(page);
  await page.keyboard.press('Enter');
  await page.keyboard.type('casa acasa casă', { delay: 5 });
  await page.keyboard.press('Control+f');
  const q = page.locator('.find-bar input').first();
  await q.fill('casa');
  const count = () => page.locator('.find-bar .count').innerText();
  const c0 = Number((await count()).split('/')[1]);
  await page.locator('.find-bar select.find-mode').selectOption('starts');
  const c1 = Number((await count()).split('/')[1]);
  check('starts-with finds fewer', c1 < c0, `${c0} ${c1}`);
  await page.locator('.find-bar button', { hasText: 'ă=a' }).click();
  const c2 = Number((await count()).split('/')[1]);
  check('ignore diacritics finds casă too', c2 === c1 + 1, `${c1} ${c2}`);
  await q.press('Enter');
  check('history kept', (await page.evaluate(() => localStorage.getItem('scribner-find-history') || '')).includes('casa'));
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
