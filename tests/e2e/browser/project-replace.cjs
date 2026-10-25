// Scenario: project Find & Replace — Replace All updates every open editor (split pane,
// Scrivenings), takes a snapshot, and a later edit in the other pane does not bring the old text back.
const { open, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  page.on('dialog', (d) => d.accept());
  const binder = (t) => page.locator('.binder').getByText(t, { exact: true });
  await binder('Drumul').click();
  await page.locator('button.split-btn').click();
  await page.waitForSelector('.pane.second .ProseMirror');
  const p1 = page.locator('.pane:not(.second) .ProseMirror').first();
  const p2 = page.locator('.pane.second .ProseMirror');
  await page.keyboard.press('Control+Shift+F');
  await page.waitForTimeout(300);
  const dlg = page.locator('.modal[role=dialog]').last();
  const inputs = dlg.locator('input:not([type=checkbox])');
  await inputs.nth(0).fill('Matei');
  await inputs.nth(1).fill('Mateus');
  await page.waitForTimeout(200);
  await dlg.locator('button.primary').click();
  await page.waitForTimeout(600);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const t1 = await p1.innerText();
  const t2 = await p2.innerText();
  check('pane 1 shows the replacement', t1.includes('Mateus') && !/Matei\b/.test(t1), t1.slice(0, 120));
  check('pane 2 shows the replacement', t2.includes('Mateus') && !/Matei\b/.test(t2), t2.slice(0, 120));
  // an edit in pane 2 after Replace All must not resurrect the old text
  await caretEnd(page, p2);
  await page.keyboard.type(' DUPA', { delay: 15 });
  await page.waitForTimeout(500);
  await binder('Începutul').click();
  await page.waitForTimeout(300);
  await binder('Drumul').click();
  await page.waitForTimeout(400);
  const t3 = await p1.innerText();
  check('saved text keeps the replacement and the later edit', t3.includes('Mateus') && !/Matei\b/.test(t3) && t3.includes('DUPA'), t3.slice(0, 160));
  // Scrivenings over the folder shows replaced text too
  await binder('Partea a doua').click();
  await page.waitForTimeout(400);
  const scr = await page.locator('.pane:not(.second) .scriv-section .scriv-body').allInnerTexts();
  check('Scrivenings sections show the replacement', scr.length > 0 && scr.every((s) => !/Matei\b/.test(s)), scr.join(' / ').slice(0, 160));
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
