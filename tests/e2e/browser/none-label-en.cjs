// English UI: the stored "no label / no status" value ('Fără') must be shown translated in the
// binder context menu (Label / Status submenus) and in the Label / Status selects of the
// inspector and outline, not as raw Romanian.
const { open, check, done } = require('./_helpers.cjs');

async function toEnglish(p) {
  const menus = p.locator('header.toolbar .menu > button');
  for (let i = 0; i < (await menus.count()) && !(await p.locator('.settings-dialog').count()); i++) {
    await menus.nth(i).click();
    await p.waitForTimeout(60);
    const it = p.locator('.menu-pop button:not([disabled])').filter({ hasText: /^(Setări|Settings)…/ });
    if (await it.count()) await it.first().click(); else await p.keyboard.press('Escape');
    await p.waitForTimeout(150);
  }
  await p.locator('.settings-dialog [role=tab]').last().click();
  await p.locator('.settings-dialog select').filter({ has: p.locator('option[value=en]') }).first().selectOption('en');
  await p.locator('.settings-dialog .actions .primary').click();
  await p.waitForTimeout(300);
}

(async () => {
  const { browser, page, errors } = await open();
  await toEnglish(page);
  const row = page.locator('.binder-row', { hasText: 'Începutul' }).first();
  await row.click();
  await page.waitForTimeout(200);

  // Inspector / any visible Label or Status select.
  const opts = await page.locator('select option').allTextContents();
  check('selects show no raw "Fără"', !opts.includes('Fără'), opts.filter((o) => o === 'Fără').length + ' raw');

  for (const name of ['Label', 'Status']) {
    await row.click({ button: 'right' });
    await page.waitForTimeout(150);
    await page.locator('.ctx-menu [role=menuitem]', { hasText: new RegExp(`^\\s*${name}`) }).first().hover();
    await page.waitForTimeout(250);
    const labels = await page.locator('.ctx-menu .ctx-label').allTextContents();
    check(`binder ${name} submenu has no raw "Fără"`, !labels.includes('Fără'), labels.join(' | '));
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
  }

  // Outline view selects.
  await page.keyboard.press('Control+3');
  await page.waitForTimeout(300);
  const oopts = await page.locator('select option').allTextContents();
  check('outline selects show no raw "Fără"', !oopts.includes('Fără'));

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
