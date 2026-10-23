// Scenario 6: Scrivenings — edits in each section save to their own document; Enter at a section end.
const { open, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  const binder = (t) => page.locator('.binder').getByText(t, { exact: true });
  await binder('Partea întâi').click();
  await page.waitForSelector('.scriv-section .ProseMirror');
  const secs = page.locator('.scriv-section .ProseMirror');
  check('one section per document of the folder', (await secs.count()) === 3);
  await caretEnd(page, secs.nth(1));
  await page.keyboard.type(' DOI', { delay: 10 });
  await caretEnd(page, secs.nth(0));
  await page.keyboard.type(' UNU', { delay: 10 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Paragraf nou', { delay: 10 });
  await page.waitForTimeout(300);
  await binder('Începutul').click();
  await page.waitForTimeout(300);
  const a = await page.locator('.pane .ProseMirror').first().innerHTML();
  await binder('Drumul').click();
  await page.waitForTimeout(300);
  const b = await page.locator('.pane .ProseMirror').first().innerHTML();
  check('section 1 saved to Începutul', a.includes('rămâne. UNU</p><p>Paragraf nou</p>') && !a.includes('DOI'), a);
  check('section 2 saved to Drumul', b.includes('crezi.” DOI') && !b.includes('UNU') && !b.includes('Paragraf nou'), b);
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
