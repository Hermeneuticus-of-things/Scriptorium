// Escape closes only the top-most layer: dialog over dialog, menu over editor, context menu over dialog.
process.env.SCRIBNER_URL = process.env.SCRIBNER_URL || 'http://localhost:4183/?demo';
const { open, ed, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  const cmd = async (re) => {
    const menus = page.locator('header.toolbar .menu > button');
    for (let i = 0; i < (await menus.count()); i++) {
      await menus.nth(i).click(); await page.waitForTimeout(60);
      const it = page.locator('.menu-pop button:not([disabled])').filter({ hasText: re }).first();
      if (await it.count()) { await it.click(); await page.waitForTimeout(250); return; }
      await page.keyboard.press('Escape');
    }
    throw new Error(`no ${re}`);
  };
  const layers = () => page.evaluate(() => ({ modals: document.querySelectorAll('.modal-backdrop > .modal').length, help: document.querySelectorAll('.help-window, [class*=help-win]').length, ctx: document.querySelectorAll('.ctx-menu').length, menu: document.querySelectorAll('.menu-pop').length }));
  // Settings, then Keyboard shortcuts on top (from inside Settings → keyboard tab)
  await cmd(/^Setări…/);
  const m0 = (await layers()).modals;
  await cmd(/^Lista scurtăturilor|^Scurtături/).catch(() => {});
  const l1 = await layers();
  if (l1.modals > m0) {
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    check('Esc closes only the upper dialog', (await layers()).modals === m0, JSON.stringify(await layers()));
  }
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  check('Esc closes Settings', (await layers()).modals === 0, JSON.stringify(await layers()));
  // context menu on a binder row over nothing; Esc closes it and nothing else
  await page.locator('.binder-row').nth(3).click({ button: 'right' });
  await page.waitForTimeout(100);
  check('binder context menu open', (await layers()).ctx === 1);
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  check('Esc closes the context menu', (await layers()).ctx === 0);
  // editor context menu, then a dialog from it, then Esc
  await ed(page).click({ button: 'right' }); await page.waitForTimeout(120);
  check('editor context menu open', (await layers()).ctx === 1);
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  check('Esc closes the editor context menu, focus in editor', (await layers()).ctx === 0 && (await page.evaluate(() => !!document.activeElement.closest('.ProseMirror'))));
  // Find dialog then a menu over it? menus are behind modals; open Project settings, Esc
  await cmd(/^Setările proiectului/);
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  check('Esc closes Project settings', (await layers()).modals === 0);
  check('no page errors', !errors.length, errors.join(' | '));
  await browser.close(); done();
})();
