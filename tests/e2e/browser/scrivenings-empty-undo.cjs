// Scenario: Scrivenings with an empty document — typing into the empty section saves to it,
// Ctrl+Z undoes only in that section, other sections are untouched.
const { open, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  const binder = (t) => page.locator('.binder').getByText(t, { exact: true });
  await binder('Scrisoarea').click();
  await page.waitForTimeout(200);
  // new empty text after "Scrisoarea" (inside Partea întâi)
  await page.keyboard.press('Control+n').catch(() => {});
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await binder('Partea întâi').click();
  await page.waitForTimeout(400);
  const secs = page.locator('.pane .scriv-section .ProseMirror');
  const n = await secs.count();
  check('empty document gets its own section', n === 4, `sections=${n}`);
  if (n === 4) {
    const before0 = await secs.nth(0).innerHTML();
    await caretEnd(page, secs.nth(3));
    await page.keyboard.type('Gol completat', { delay: 15 });
    await page.waitForTimeout(300);
    check('typing into the empty section', (await secs.nth(3).innerText()).includes('Gol completat'));
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    check('undo removes the typing in that section', !(await secs.nth(3).innerText()).includes('Gol completat'), await secs.nth(3).innerText());
    check('undo leaves other sections alone', (await secs.nth(0).innerHTML()) === before0);
    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(300);
    check('redo brings it back', (await secs.nth(3).innerText()).includes('Gol completat'));
    await binder('Începutul').click();
    await page.waitForTimeout(300);
    await binder('Partea întâi').click();
    await page.waitForTimeout(400);
    check('text saved to the formerly empty document', (await secs.nth(3).innerText()).includes('Gol completat'));
  }
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
