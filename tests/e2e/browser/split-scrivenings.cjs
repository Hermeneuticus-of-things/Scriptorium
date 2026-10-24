// Scenario: Scrivenings in pane 1 and one of its documents alone in pane 2 — edits flow both ways.
const { open, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  const binder = (t) => page.locator('.binder').getByText(t, { exact: true });
  await binder('Drumul').click();
  await page.locator('button[title="Split editor"]').click();
  await page.waitForSelector('.pane.second .ProseMirror');
  // pane 1 (focused first pane) shows the folder as Scrivenings
  await page.locator('.pane').first().click({ position: { x: 20, y: 60 } }).catch(() => {});
  await binder('Partea întâi').click();
  await page.waitForTimeout(400);
  const secs = page.locator('.pane:not(.second) .scriv-section .ProseMirror');
  const n = await secs.count();
  check('pane 1 shows Scrivenings', n === 3, `sections=${n}`);
  const p2 = page.locator('.pane.second .ProseMirror');
  check('pane 2 shows Drumul', (await p2.innerText()).includes('Matei'));
  if (n === 3) {
    await caretEnd(page, secs.nth(1));
    await page.keyboard.type(' DINSCRIV', { delay: 15 });
    await page.waitForTimeout(500);
    check('pane 2 shows the edit made in Scrivenings', (await p2.innerText()).includes('DINSCRIV'));
    await caretEnd(page, p2);
    await page.keyboard.type(' DINPANOU', { delay: 15 });
    await page.waitForTimeout(500);
    const s1 = await secs.nth(1).innerText();
    check('Scrivenings section shows the edit made in pane 2', s1.includes('DINPANOU'), s1.slice(-80));
    check('both edits kept', s1.includes('DINSCRIV'));
  }
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
