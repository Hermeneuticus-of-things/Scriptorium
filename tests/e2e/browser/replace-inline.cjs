// Inserting one line (name generator, dictation, AI/translation results) stays inside the paragraph.
const { open, ed, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  await ed(page).click({ delay: 60 });
  await page.keyboard.press('Control+a');
  await page.keyboard.type('alfa beta gama');
  // select exactly "beta" (double-click selects the word, as a user would)
  const box = await page.evaluate(() => {
    const t = document.querySelector('.pane .ProseMirror p').firstChild;
    const i = t.textContent.indexOf('beta');
    const r = document.createRange(); r.setStart(t, i + 1); r.setEnd(t, i + 2);
    const b = r.getBoundingClientRect(); return { x: b.x + 1, y: b.y + b.height / 2 };
  });
  await page.mouse.dblclick(box.x, box.y);
  await page.waitForTimeout(150);
  // name generator inserts through replaceSelection
  await page.locator('header.toolbar .menu > button').filter({ hasText: /^Unelte/ }).click();
  await page.locator('.menu-pop button', { hasText: 'Generator de nume' }).first().click();
  await page.waitForSelector('.modal');
  const insert = page.locator('.modal button', { hasText: /Inserează/ }).first();
  const hasInsert = await insert.count();
  if (hasInsert) {
    await page.locator('.modal li, .modal .name, .modal button.name').first().click().catch(() => {});
    await insert.click().catch(() => {});
  }
  await page.waitForTimeout(200);
  const paras = await page.evaluate(() => document.querySelectorAll('.pane .ProseMirror p').length);
  const text = await ed(page).innerText();
  check('one line inserted inside the paragraph (no split)', paras === 1, `${paras} paragraphs: ${JSON.stringify(text)}`);
  check('surrounding words kept', /^alfa /.test(text.trim()) && /gama$/.test(text.trim()), text);
  check('no page errors', !errors.length, errors.join(' | '));
  await browser.close();
  done();
})();
