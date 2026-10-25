// G3: Inspector › Comments & Footnotes in one list in text order (+ Comment on the word under the
// cursor, + Footnote, edit in place, click jumps, delete), Document/Project bookmarks in one pane,
// footer "Words: x of y" on a selection, line spacing menu in the format bar, Scrivenings titles
// hidden by default.
const { open, ed, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  await page.setViewportSize({ width: 1400, height: 900 });
  page.on('dialog', (d) => d.accept());
  await page.locator('.binder-row', { hasText: 'Începutul' }).first().click();
  await page.waitForTimeout(250);
  if (!(await page.locator('.inspector .tabs').count())) { await page.keyboard.press('Control+Shift+I'); await page.waitForTimeout(200); }
  await page.locator('.inspector .tabs button').nth(4).click();
  const pane = page.locator('.inspector .annot-pane');
  check('annotations pane shown', (await pane.count()) === 1);

  // caret inside the first word, nothing selected → + Comment wraps that word
  const firstP = ed(page).locator('p').first();
  const box = await firstP.boundingBox();
  await page.mouse.click(box.x + 12, box.y + 8);
  await page.waitForTimeout(100);
  await pane.locator('button.annot-add-comment').click();
  await page.waitForTimeout(500);
  const box1 = pane.locator('textarea.annot-edit');
  check('new comment opens for editing', (await box1.count()) === 1);
  await box1.fill('Comentariul meu');
  await page.keyboard.press('Control+Enter');
  await page.waitForTimeout(400);
  const commented = await ed(page).locator('[data-comment]').first().innerText().catch(() => '');
  check('comment wraps the word under the cursor', /^\S+$/.test(commented.trim()) && commented.trim().length > 1, commented);
  check('comment text saved', (await ed(page).locator('[data-comment="Comentariul meu"]').count()) === 1);

  // + Footnote at the end of the document
  await ed(page).click();
  await page.keyboard.press('Control+End');
  await pane.locator('button.annot-add-footnote').click();
  await page.waitForTimeout(500);
  await pane.locator('textarea.annot-edit').fill('Nota unu');
  await page.keyboard.press('Control+Enter');
  await page.waitForTimeout(400);
  const kinds = await pane.locator('.annot-item').evaluateAll((els) => els.map((e) => (e.classList.contains('annot-comment') ? 'c' : 'f')));
  check('one list, text order (comment then footnote)', kinds.join('') === 'cf', kinds.join(''));
  check('footnote in text', (await ed(page).locator('[data-footnote="Nota unu"]').count()) === 1);

  // edit in place
  await pane.locator('.annot-footnote .annot-text').click();
  await pane.locator('textarea.annot-edit').fill('Nota schimbată');
  await page.keyboard.press('Control+Enter');
  await page.waitForTimeout(400);
  check('footnote edited in place', (await ed(page).locator('[data-footnote="Nota schimbată"]').count()) === 1);

  // jump: clicking the comment head selects its text
  await pane.locator('.annot-comment .annot-head').click();
  await page.waitForTimeout(300);
  const sel = await page.evaluate(() => String(window.getSelection()));
  check('click jumps to the comment', sel.trim() === commented.trim(), sel);
  check('footer shows words of selection', /\d+ (din|of) \d/.test(await page.locator('.editor-footer .footer-words').innerText()), await page.locator('.editor-footer .footer-words').innerText());

  // delete both
  await pane.locator('.annot-footnote .annot-delete').click();
  await page.waitForTimeout(300);
  await pane.locator('.annot-comment .annot-delete').click();
  await page.waitForTimeout(300);
  const left = [await pane.locator('.annot-item').count(), await ed(page).locator('[data-comment],[data-footnote]').count()];
  check('deleted', left[0] === 0 && left[1] === 0, left.join(','));

  // bookmarks: Document / Project in the same pane
  await page.locator('.inspector .tabs button').nth(1).click();
  await page.waitForTimeout(150);
  check('bookmark scope switch', (await page.locator('.inspector .bookmark-scope button').count()) === 2);
  await page.locator('.inspector .bookmark-scope button').nth(1).click();
  await page.waitForTimeout(150);
  const before = await page.locator('.inspector .bookmarks-panel .bookmark-list li').count();
  await page.locator('.inspector .bookmarks-panel button', { hasText: '+' }).first().click();
  await page.waitForTimeout(200);
  check('project bookmark added from Inspector', (await page.locator('.inspector .bookmarks-panel .bookmark-list li').count()) === before + 1);
  await page.locator('.inspector .bookmark-scope button').nth(0).click();

  // line spacing menu
  await ed(page).locator('p').first().click();
  await page.locator('.fb-spacing button').first().click();
  const items = await page.locator('.menu-pop [role="menuitem"]').allInnerTexts();
  check('spacing menu 1,0…3,0 + Other', ['1,0', '1,2', '1,5', '2,0', '2,5', '3,0'].every((v) => items.some((t) => t.includes(v))) && items.some((t) => /Alta|Other/.test(t)), items.join('|'));
  await page.locator('.menu-pop [role="menuitem"]', { hasText: '2,0' }).first().click();
  await page.waitForTimeout(200);
  check('line spacing applied', /line-height:\s*2/.test((await ed(page).locator('p').first().getAttribute('style')) || ''));

  // Scrivenings: titles hidden by default
  await page.locator('.binder').getByText('Partea întâi', { exact: true }).click();
  await page.waitForSelector('.scrivenings');
  check('Scrivenings titles hidden by default', (await page.locator('.scrivenings.no-titles').count()) === 1);

  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
