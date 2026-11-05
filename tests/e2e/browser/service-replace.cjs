// In-app translation / grammar replace exactly the text that was sent: a selection with a
// trailing space keeps the space; the original range is replaced even if the caret moved.
process.env.SCRIBNER_URL = process.env.SCRIBNER_URL || 'http://localhost:4183/?demo';
const { open, ed, caretEnd, check, done, menuCmd } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  const cmd = (label) => menuCmd(page, label);
  await cmd('Setări program…');
  await page.getByRole('tab', { name: 'Servicii și conturi' }).click();
  const row = page.locator('.service-row', { hasText: 'DeepL' });
  await row.locator('input').first().fill('demo-key:fx');
  await row.getByRole('button', { name: 'Salvează' }).click();
  await page.waitForTimeout(150);
  await page.locator('.settings-dialog .actions .primary').click();
  await page.waitForTimeout(300);
  await caretEnd(page);
  await page.keyboard.press('Enter');
  await page.keyboard.type('alfa beta gama');
  // select "beta " (with the trailing space)
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
  for (let i = 0; i < 5; i++) await page.keyboard.press('Shift+ArrowLeft');
  await cmd('Tradu selecția în program (DeepL)');
  await page.waitForSelector('.translate-pair');
  await page.getByRole('button', { name: 'Înlocuiește selecția' }).click();
  await page.waitForTimeout(200);
  const last = (await ed(page).locator('p').last().innerText()).trim();
  check('trailing space of the selection is kept', last === 'alfa [ro] beta gama', JSON.stringify(last));
  // "Insert after" puts the text after the sent words, in the same paragraph
  await page.keyboard.press('End');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowLeft');
  await cmd('Tradu selecția în program (DeepL)');
  await page.waitForSelector('.translate-pair');
  await page.getByRole('button', { name: 'Inserează după' }).click();
  await page.waitForTimeout(200);
  const last2 = (await ed(page).locator('p').last().innerText()).trim();
  check('insert after stays in the paragraph', last2 === 'alfa [ro] beta gama [ro] gama', JSON.stringify(last2));
  check('no page errors', !errors.length, errors.join(' | '));
  await browser.close();
  done();
})();
