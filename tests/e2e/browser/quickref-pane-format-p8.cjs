// P8: editor header bar per pane (title menu, link panes), Scrivenings / corkboard footers,
// Quick Reference with format bar, inspector, zoom and keep-on-top, Format › Text, format bar
// character spacing and list numbering.
const { open, ed, caretEnd, check, done, menuPick, menuCmd } = require('./_helpers.cjs');

(async () => {
  const { browser, page, errors } = await open();
  const row = (t) => page.locator('.binder-row', { hasText: t }).first();
  const mainTitle = () => page.locator('.sc-header-bar strong').first().innerText();

  // 1. Title menu: recent documents + same folder
  await row('Drumul').click();
  await page.waitForTimeout(200);
  await row('Căutarea').click();
  await page.waitForTimeout(200);
  await page.locator('.sc-header-bar .hdr-title').click();
  const menu = page.locator('.sc-header-bar .hdr-title-menu');
  check('title menu opens', await menu.isVisible());
  check('title menu lists recent documents', (await menu.locator('.hdr-recent').count()) >= 2);
  check('title menu lists documents in the same folder', (await menu.locator('.hdr-near').count()) >= 1);
  await menu.locator('.hdr-recent', { hasText: 'Drumul' }).first().click();
  await page.waitForTimeout(200);
  check('picking a recent document opens it', (await mainTitle()).includes('Drumul'), await mainTitle());

  // 2. Open in the other pane from the title menu; link panes
  await page.locator('.sc-header-bar .hdr-title').click();
  await page.locator('.sc-header-bar .hdr-open-other').click();
  await page.waitForSelector('.pane.second .ProseMirror');
  check('opened in pane 2 from the title menu', (await page.locator('.pane.second .pane-title').innerText()).includes('Drumul'));
  await ed(page).click();
  await page.locator('.sc-header-bar .pane-link').click();
  check('link toggle on', (await page.locator('.sc-header-bar .pane-link.on').count()) === 1);
  const t0 = await mainTitle();
  await row('Căutarea').click();
  await page.waitForTimeout(300);
  check('linked: binder pick from the main pane opens in pane 2', (await page.locator('.pane.second .pane-title').innerText()).includes('Căutarea') && (await mainTitle()) === t0);
  await page.locator('.sc-header-bar .pane-link').click();
  await page.locator('.pane.second .pane-head button.link', { hasText: /Închide|Close/ }).click();

  // 3. Format › Text: remove comments, plain text, hyphenation
  await caretEnd(page);
  await page.keyboard.type(' unu doi');
  await page.evaluate(() => {
    const e = document.querySelector('.pane .ProseMirror').editor;
    e.commands.setContent('<p>A <span data-comment="x">b</span> <strong>c</strong></p>', true);
  });
  await menuPick(page, 'Format', /^Text▸/, 'Elimină toate comentariile');
  await page.waitForTimeout(150);
  let html = await page.evaluate(() => document.querySelector('.pane .ProseMirror').editor.getHTML());
  check('Format › Text › remove all comments', !html.includes('data-comment'), html);
  await menuPick(page, 'Format', /^Text▸/, 'Convertește la text simplu');
  await page.waitForTimeout(150);
  html = await page.evaluate(() => document.querySelector('.pane .ProseMirror').editor.getHTML());
  check('Format › Text › convert to plain text', !html.includes('<strong>'), html);
  await menuPick(page, 'Format', /^Text▸/, 'Despărțire în silabe');
  await page.waitForTimeout(150);
  check('hyphenation on the page', (await page.locator('.pane .page.hyphenate').count()) === 1);
  await menuPick(page, 'Format', /^Text▸/, 'Despărțire în silabe');

  // 4. Format bar: character spacing, list numbering, font preview
  await ed(page).click();
  await page.keyboard.press('Control+a');
  await page.evaluate(() => document.querySelector('.pane .ProseMirror').editor.chain().focus().selectAll().setLetterSpacing('0.1em').run());
  html = await page.evaluate(() => document.querySelector('.pane .ProseMirror').editor.getHTML());
  check('character spacing applied', html.includes('letter-spacing: 0.1em'), html);
  await page.evaluate(() => document.querySelector('.pane .ProseMirror').editor.chain().focus().setOrderedListFormat('paren', 'a').run());
  const marker = await page.evaluate(() => getComputedStyle(document.querySelector('.pane .ProseMirror ol li'), '::marker').content);
  check('list a) numbering', /lower-alpha/.test(marker || '') && /\)/.test(marker || ''), marker);
  await page.evaluate(() => document.querySelector('.pane .ProseMirror').editor.commands.setContent('<p>Text de probă.</p>', true));

  // 5. Folder footers: Scrivenings totals, or the corkboard footer with its controls
  await row('Partea întâi').click();
  await page.waitForTimeout(400);
  const scriv = page.locator('.scriv-footer');
  const cork = page.locator('.view-footer-corkboard');
  if (await scriv.count()) {
    check('Scrivenings footer with totals', /\d/.test(await scriv.locator('.footer-docs').innerText()) && /\d/.test(await scriv.locator('.footer-words').innerText()));
  } else {
    check('corkboard footer with item count', (await cork.count()) === 1 && /\d/.test(await cork.locator('.footer-docs').innerText()));
    await cork.locator('button[data-mode=lines]').click();
    await page.waitForTimeout(200);
    check('corkboard footer changes the board mode', (await cork.locator('button[data-mode=lines].on').count()) === 1);
    await cork.locator('button[data-mode=grid]').click();
  }
  await page.locator('header.toolbar').getByRole('button', { name: /Scrivenings/ }).first().click().catch(() => {});
  await page.waitForTimeout(300);
  if (await scriv.count()) check('Scrivenings footer with totals (after switching)', /\d/.test(await scriv.locator('.footer-words').innerText()));

  await menuCmd(page, 'Corkboard');
  await page.waitForTimeout(300);
  const corkFoot = page.locator('.view-footer-corkboard');
  check('corkboard footer with item count', (await corkFoot.count()) === 1 && /\d/.test(await corkFoot.locator('.footer-docs').innerText()));
  await corkFoot.locator('button[data-mode=lines]').click();
  await page.waitForTimeout(200);
  check('corkboard footer changes the board mode', (await corkFoot.locator('button[data-mode=lines].on').count()) === 1);
  await corkFoot.locator('button[data-mode=grid]').click();
  await corkFoot.locator('input[type=range]').fill('2');
  await page.waitForTimeout(200);
  check('corkboard footer card size', (await page.locator('.corkboard, [class*=cork]').first().evaluate((el) => getComputedStyle(el).getPropertyValue('--card-w'))).trim() === '300px');
  await menuCmd(page, 'Editor');
  await page.waitForTimeout(200);

  // 6. Quick Reference: format bar, inspector, zoom, keep on top, counts in footer
  await row('Drumul').click();
  await page.waitForTimeout(200);
  await row('Căutarea').click({ button: 'right' });
  await page.locator('[role=menuitem]', { hasText: 'Deschide în Quick Reference' }).first().click();
  const qr = page.locator('.quickref').first();
  await qr.waitFor();
  const hb = await qr.locator('.quickref-head .qr-title').boundingBox();
  await page.mouse.move(hb.x + 5, hb.y + 5);
  await page.mouse.down();
  await page.mouse.move(800, 420, { steps: 5 });
  await page.mouse.up();
  await row('Drumul').click(); // the main editor moves away: the QR copy becomes editable
  await page.waitForTimeout(300);
  check('QR footer shows counts', (await qr.locator('.editor-footer .footer-words').count()) === 1);
  await qr.locator('.qr-tools').click();
  check('QR format bar', (await qr.locator('.format-bar').count()) === 1);
  await qr.locator('.qr-ruler').click();
  check('QR ruler', (await qr.locator('.ruler').count()) >= 1);
  await qr.locator('.qr-zoom').selectOption('150');
  check('QR own zoom', (await qr.locator('.page').first().evaluate((p) => p.style.getPropertyValue('--zoom'))) === '1.5');
  await qr.locator('.qr-inspector').click();
  check('QR inspector with synopsis', (await qr.locator('.quickref-inspector textarea').count()) === 1);
  await qr.locator('.qr-pinned').click();
  check('QR keep on top', (await qr.evaluate((el) => el.classList.contains('pinned') && Number(getComputedStyle(el).zIndex) >= 1000)));

  console.log(errors.length ? `page errors: ${errors.join(' | ')}` : 'no page errors');
  check('no page errors', !errors.length);
  await browser.close();
  done();
})();
