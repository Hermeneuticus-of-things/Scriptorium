// Scenario 8: Script Mode Tab/Enter cycling, uppercase elements; Linguistic Focus on/off restores text.
const { open, ed, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  await page.getByRole('button', { name: 'Format ▾' }).click();
  await page.getByText('Mod scenariu: Scenariu de film', { exact: true }).click();
  await page.waitForSelector('.prose.script-mode');
  await caretEnd(page);
  const last = () => page.evaluate(() => { const ps = document.querySelectorAll('.pane .ProseMirror p'); const p = ps[ps.length - 1]; return [p.getAttribute('data-script'), p.textContent]; });
  await page.keyboard.press('Enter');
  const seq = [];
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Tab'); seq.push((await last())[0]); }
  console.log('Tab cycle:', seq.join(' → '));
  check('Tab cycles elements', new Set(seq).size >= 3 && !seq.includes(null), seq.join());
  // go to character
  while ((await last())[0] !== 'character') await page.keyboard.press('Tab');
  await page.keyboard.type('ion', { delay: 10 });
  check('character uppercased', (await last())[1] === 'ION', (await last())[1]);
  await page.keyboard.press('Enter');
  check('Enter after character → dialogue', (await last())[0] === 'dialogue');
  await page.keyboard.type('Bună ziua.', { delay: 10 });
  await page.keyboard.press('Enter');
  check('Enter after dialogue → character', (await last())[0] === 'character');
  await page.keyboard.press('Shift+Tab');
  check('Shift+Tab goes back', (await last())[0] !== 'character', (await last())[0]);
  check('focus stayed in editor after Tab', await page.evaluate(() => document.activeElement.classList.contains('ProseMirror')));
  // Linguistic focus on/off
  const before = await ed(page).innerHTML();
  await page.evaluate(() => document.querySelector('.pane .ProseMirror').editor.commands.setLinguisticFocus('noun', 'ro'));
  const faded = await page.locator('.pane .ProseMirror .pos-faded').count();
  check('linguistic focus fades text', faded > 0, `${faded}`);
  await page.keyboard.type('x', { delay: 10 });
  await page.keyboard.press('Backspace');
  await page.evaluate(() => document.querySelector('.pane .ProseMirror').editor.commands.setLinguisticFocus(null));
  check('linguistic focus off restores DOM', (await ed(page).innerHTML()) === before && (await page.locator('.pane .ProseMirror .pos-faded').count()) === 0);
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
