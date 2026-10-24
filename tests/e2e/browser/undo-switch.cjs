// Undo history survives switching documents: type in A, open B, come back to A, Ctrl+Z undoes the typing.
const { open, ed, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page: p, errors } = await open();
  await caretEnd(p);
  await p.keyboard.type(' UNDOME');
  await p.waitForTimeout(500);
  const rows = p.locator('.binder .title');
  const first = (await p.locator('.binder-row.selected .title, .binder-row.sel .title').first().innerText().catch(() => '')) || '';
  // pick another text document in the binder
  const titles = await rows.allInnerTexts();
  const cur = await p.locator('.sc-header-bar strong').innerText();
  const other = titles.find((t) => t && t !== cur && !/Manuscris|Draft|Cercetare|Research|Coș|Trash/.test(t));
  await rows.filter({ hasText: other }).first().click();
  await p.waitForTimeout(400);
  await rows.filter({ hasText: cur }).first().click();
  await p.waitForTimeout(400);
  check('text still there after switching back', (await ed(p).innerText()).includes('UNDOME'));
  await ed(p).click();
  await p.keyboard.press('Control+z');
  await p.waitForTimeout(200);
  check('Ctrl+Z after switching back undoes the typing', !(await ed(p).innerText()).includes('UNDOME'), `${first}`);
  check('no page errors', !errors.length, errors.join(' | '));
  await browser.close();
  done();
})();
