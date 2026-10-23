// Format bar overflow (»), split pane header and binder context menu in the browser demo.
// Run against `npx vite preview --port 4186`: SCRIBNER_URL=http://localhost:4186/?demo node tests/e2e/browser/formatbar-binder-ui.cjs [shotDir]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.SCRIBNER_URL || 'http://localhost:4186/?demo';
const OUT = process.argv[2] || require('os').tmpdir();
let failures = 0;
const check = (name, ok, info = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
};
const barInfo = (page, sel = '.pane .format-bar') => page.evaluate((sel) => {
  const bars = [...document.querySelectorAll(sel)].filter((b) => b.offsetParent);
  return bars.map((b) => {
    const r = b.getBoundingClientRect();
    const kids = [...b.children].map((c) => c.getBoundingClientRect());
    const mids = kids.map((k) => k.top + k.height / 2);
    const rows = 1 + mids.filter((m) => m - mids[0] > 8).length;
    return { h: Math.round(r.height), rows, clipped: kids.some((k) => k.right > r.right + 1), more: Boolean(b.querySelector('.fb-more')), hidden: b.scrollWidth > b.clientWidth + 1 };
  });
}, sel);

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(URL);
    await page.getByText('Deschide proiect .scribner').first().click();
    await page.waitForSelector('.pane .ProseMirror');
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await page.waitForTimeout(300);

    // 1. format bar: one row at every width
    // below ~1000px the Inspector overlays the editor, so narrow panes are tested via the split view too
    for (const w of [1440, 1200, 1100, 1000]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(250);
      const [b] = await barInfo(page);
      check(`${theme} format bar one row @${w}`, b && b.rows === 1 && !b.clipped, JSON.stringify(b));
    }
    await page.screenshot({ path: `${OUT}/formatbar-1000-${theme}.png`, clip: { x: 0, y: 0, width: 1000, height: 200 } });
    // overflow menu + dropdown inside it
    await page.locator('.pane .format-bar .fb-more > button').first().click();
    const pop = page.locator('.fb-overflow-pop').first();
    check(`${theme} overflow popup opens`, await pop.isVisible());
    const menuBtn = pop.locator('.menu > button', { hasText: 'Tabel' });
    await menuBtn.click();
    const inner = pop.locator('.menu-pop').first();
    const ok = await inner.isVisible();
    const box = ok ? await inner.boundingBox() : null;
    const popBox = await pop.boundingBox();
    check(`${theme} overflow popup not clipped`, await page.evaluate(() => { const p = document.querySelector('.fb-overflow-pop'); const r = p.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + 6, r.top + 6); return p.contains(hit); }), JSON.stringify(popBox));
    check(`${theme} dropdown works inside overflow`, ok && box.x >= 0 && box.x + box.width <= 1000 + 1 && await page.evaluate(() => { const m = document.querySelector('.fb-overflow-pop .menu-pop'); const r = m.getBoundingClientRect(); return m.contains(document.elementFromPoint(r.left + 8, r.top + 8)) && m.contains(document.elementFromPoint(r.right - 8, r.bottom - 8)); }), JSON.stringify(box));
    await page.screenshot({ path: `${OUT}/formatbar-overflow-${theme}.png` });
    // Esc closes only the inner dropdown (focus back on its button); the overflow stays open.
    await page.keyboard.press('Escape');
    check(`${theme} Esc closes inner dropdown, keeps overflow`, (await pop.locator('.menu-pop').count()) === 0 && await pop.isVisible() && await page.evaluate(() => document.activeElement?.textContent.includes('Tabel')));
    await menuBtn.click();
    await inner.locator('[role="menuitem"]').first().click();
    check(`${theme} menu item closes overflow`, (await page.locator('.fb-overflow-pop').count()) === 0);
    await page.locator('.pane .format-bar .fb-more > button').first().click();
    await page.mouse.click(700, 600);
    check(`${theme} outside click closes overflow`, (await page.locator('.fb-overflow-pop').count()) === 0);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(250);
    const [wide] = await barInfo(page);
    check(`${theme} groups come back when wider`, wide.rows === 1, JSON.stringify(wide));

    // 2. split pane header
    await page.locator('.binder-row', { hasText: 'Drumul' }).first().click({ modifiers: ['Alt'] });
    await page.waitForSelector('.pane-head');
    for (const w of [1440, 1200, 1000]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(250);
      const h = await page.evaluate(() => {
        const head = document.querySelector('.pane-head');
        const r = head.getBoundingClientRect();
        const span = head.querySelector('span').getBoundingClientRect();
        const btns = [...head.querySelectorAll('button')].map((b) => b.getBoundingClientRect());
        return { cap: Math.round(span.width), clipped: btns.some((b) => b.right > r.right + 1 || b.width < 10), h: Math.round(r.height) };
      });
      check(`${theme} pane-head @${w}: caption visible, actions not clipped`, h.cap >= 60 && !h.clipped, JSON.stringify(h));
    }
    const hb = await page.locator('.pane-head').first().boundingBox();
    await page.screenshot({ path: `${OUT}/panehead-1000-${theme}.png`, clip: { x: Math.max(0, hb.x - 40), y: Math.max(0, hb.y - 40), width: Math.min(1000 - Math.max(0, hb.x - 40), hb.width + 80), height: hb.height + 120 } });
    await page.setViewportSize({ width: 1440, height: 900 });

    // 4. binder context menu
    const row = page.locator('.binder-row', { hasText: 'Partea întâi' }).first();
    await row.click({ button: 'right' });
    const menu = page.locator('.ctx-menu').first();
    check(`${theme} binder context menu opens`, await menu.isVisible());
    const labels = await menu.locator(':scope > [role="menuitem"] .ctx-label').allTextContents();
    check(`${theme} context menu items`, ['Adaugă', 'Redenumește', 'Mută în', 'Mută în coș', 'Deschide în Quick Reference', 'Extinde tot', 'Restrânge tot'].every((l) => labels.includes(l)), labels.join(', '));
    const mb = await menu.boundingBox();
    const rb = await row.boundingBox();
    check(`${theme} menu at cursor`, Math.abs(mb.x - (rb.x + rb.width / 2)) < 4 && Math.abs(mb.y - (rb.y + rb.height / 2)) < 4, JSON.stringify(mb));
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    const focused = await page.evaluate(() => document.activeElement?.textContent);
    check(`${theme} arrow keys move focus`, /Duplic|Redenum/.test(focused), focused);
    await menu.locator('[role="menuitem"]', { hasText: 'Mută în' }).first().hover();
    const subVisible = await page.locator('.ctx-menu .ctx-menu').isVisible();
    check(`${theme} submenu opens on hover`, subVisible);
    await page.screenshot({ path: `${OUT}/binder-context-${theme}.png`, clip: { x: 0, y: 0, width: 700, height: 700 } });
    await page.keyboard.press('Escape');
    check(`${theme} Esc closes submenu first`, (await page.locator('.ctx-menu').count()) === 1);
    await page.keyboard.press('Escape');
    check(`${theme} Esc closes menu`, (await page.locator('.ctx-menu').count()) === 0);
    // keyboard: Menu key, → opens submenu, Enter runs
    await row.click();
    await page.keyboard.press('Shift+F10');
    check(`${theme} Shift+F10 opens menu`, (await page.locator('.ctx-menu').count()) === 1);
    await page.keyboard.press('Escape');
    // edge flip: right-click near the bottom-right corner of the window
    await page.setViewportSize({ width: 1440, height: 420 });
    const last = page.locator('.binder-row').last();
    await last.scrollIntoViewIfNeeded();
    const lb = await last.boundingBox();
    await page.mouse.click(lb.x + 30, lb.y + lb.height / 2, { button: 'right' });
    const fb = await page.locator('.ctx-menu').first().boundingBox();
    check(`${theme} menu flips to stay on screen`, fb && fb.y >= 0 && fb.y + fb.height <= 421, JSON.stringify(fb));
    await page.screenshot({ path: `${OUT}/binder-context-flip-${theme}.png` });
    await page.mouse.click(900, 10);
    check(`${theme} outside click closes menu`, (await page.locator('.ctx-menu').count()) === 0);
    // rename through the menu
    await page.setViewportSize({ width: 1440, height: 900 });
    const r2 = page.locator('.binder-row', { hasText: 'Drumul' }).first();
    await r2.click({ button: 'right' });
    await page.locator('.ctx-menu [role="menuitem"]', { hasText: 'Redenumește' }).click();
    check(`${theme} Rename from menu edits the title`, (await page.locator('.binder-row input').count()) === 1);
    await page.keyboard.press('Escape');
    await page.close();
  }
  check('no page errors', !errors.length, errors.join(' | '));
  await browser.close();
  console.log(failures ? `${failures} failing` : 'all passing');
  process.exitCode = failures ? 1 : 0;
})();
