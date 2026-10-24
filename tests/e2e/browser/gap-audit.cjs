// Gap audit features in the real UI: selection word count in the status bar and [[Title]] links.
const { open, ed, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  await caretEnd(page);
  await page.keyboard.press('Enter');
  await page.keyboard.type('unu doi trei');
  await page.keyboard.press('Shift+Home');
  await page.waitForTimeout(150);
  const sel = page.locator('.statusbar .sel-count');
  check('status bar shows the selection count', (await sel.count()) === 1 && /3 cuvinte · 12 caractere/.test(await sel.textContent()), await sel.textContent().catch(() => ''));
  await page.keyboard.press('End');
  await page.waitForTimeout(150);
  check('selection count disappears when the selection collapses', (await sel.count()) === 0);
  // a leaf document in the binder (folders are not link targets): its row has a plain span twisty
  const linkTitle = await page.evaluate(() => [...document.querySelectorAll('span.twisty')].map((t) => t.parentElement.innerText.trim()).find((x) => x && x.length > 2));
  await page.keyboard.type(` [[${linkTitle}]]`);
  await page.waitForTimeout(150);
  const links = await ed(page).locator('a[href^="scribner://doc/"]').allTextContents();
  check('[[Title]] became an internal link', links.includes(linkTitle), `${linkTitle} → ${JSON.stringify(links)}`);
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
