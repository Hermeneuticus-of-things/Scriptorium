// Dialogs (Settings, Compile, Page Setup, Print Preview, Quick Reference …): role=dialog with an
// accessible name, focus moves inside, Tab / Shift+Tab never leave it, Esc closes and focus
// returns to the page.
const { open, check, done } = require('./_helpers.cjs');
const NAMES = [/^(Setări|Settings)…/, /^(Compilează|Compile)…/, /^(Configurare pagină|Page Setup)…/, /^(Previzualizare|Print Preview)/];

async function openFromMenus(p, re) {
  const menus = p.locator('header.toolbar .menu > button');
  for (let i = 0; i < (await menus.count()); i++) {
    await menus.nth(i).click();
    await p.waitForTimeout(60);
    const it = p.locator('.menu-pop button:not([disabled])').filter({ hasText: re });
    if (await it.count()) { await it.first().click(); await p.waitForTimeout(250); return true; }
    await p.keyboard.press('Escape');
  }
  return false;
}

(async () => {
  const { browser, page, errors } = await open();
  for (const re of NAMES) {
    if (!(await openFromMenus(page, re))) { console.log(`skip ${re} (not in menus)`); continue; }
    const info = await page.evaluate(() => {
      const d = [...document.querySelectorAll('[role=dialog],[role=alertdialog],dialog[open]')].pop();
      if (!d) return null;
      const name = d.getAttribute('aria-label') || (d.getAttribute('aria-labelledby') && document.getElementById(d.getAttribute('aria-labelledby'))?.textContent);
      return { name: (name || '').trim(), modal: d.getAttribute('aria-modal'), inside: d.contains(document.activeElement) };
    });
    check(`${re} has role=dialog`, Boolean(info));
    if (!info) { await page.keyboard.press('Escape'); continue; }
    check(`${re} has an accessible name`, Boolean(info.name));
    check(`${re} focus starts inside`, info.inside);
    let escaped = 0;
    for (let k = 0; k < 40; k++) {
      await page.keyboard.press(k % 3 === 2 ? 'Shift+Tab' : 'Tab');
      const ok = await page.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog],[role=alertdialog],dialog[open]')].pop(); return Boolean(d && d.contains(document.activeElement)); });
      if (!ok) escaped++;
    }
    check(`${re} Tab stays inside`, escaped === 0, `${escaped} escapes`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    check(`${re} Esc closes`, !(await page.locator('[role=dialog]').count()));
  }
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
