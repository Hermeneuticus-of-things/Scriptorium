// Top bar at 900 and 1366 px, light and dark: one row, no horizontal overflow, nothing clipped,
// every menu (and the AI submenus) opens inside the viewport. Screenshots → argv[2] (optional).
const fs = require('fs');
const path = require('path');
const { open, check, done } = require('./_helpers.cjs');
const out = process.argv[2];
(async () => {
  const { browser, page: p, errors } = await open();
  if (out) fs.mkdirSync(out, { recursive: true });
  for (const scheme of ['light', 'dark']) {
    await p.emulateMedia({ colorScheme: scheme });
    for (const width of [900, 1366]) {
      await p.setViewportSize({ width, height: 800 });
      await p.waitForTimeout(300);
      const tag = `${scheme}-${width}`;
      const m = await p.evaluate(() => {
        const bar = document.querySelector('header.toolbar');
        const kids = [...bar.children].filter((e) => e.offsetParent);
        const r = bar.getBoundingClientRect();
        return {
          over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          barOver: bar.scrollWidth - bar.clientWidth,
          height: r.height,
          clipped: kids.filter((e) => { const b = e.getBoundingClientRect(); return b.right > r.right + 1 || b.left < r.left - 1 || b.top < r.top - 1 || b.bottom > r.bottom + 1; }).map((e) => e.className || e.tagName),
          fbRows: (() => { const fb = document.querySelector('.format-bar'); if (!fb) return 0; const tops = new Set([...fb.children].map((c) => Math.round(c.getBoundingClientRect().top))); return tops.size; })(),
        };
      });
      check(`${tag} no horizontal page overflow`, m.over <= 1, `${m.over}px`);
      check(`${tag} top bar fits (no internal overflow)`, m.barOver <= 1, `${m.barOver}px`);
      check(`${tag} top bar is one row`, m.height < 58, `${m.height}px`);
      check(`${tag} nothing clipped in the top bar`, !m.clipped.length, m.clipped.join(','));
      check(`${tag} format bar is one row`, m.fbRows <= 1, String(m.fbRows));
      if (out) await p.screenshot({ path: path.join(out, `topbar-${tag}.png`) });
      const menus = p.locator('header.toolbar .menu > button');
      for (let i = 0; i < (await menus.count()); i++) {
        await menus.nth(i).click();
        await p.waitForTimeout(80);
        const label = (await menus.nth(i).innerText()).trim();
        const b = await p.locator('.menu-pop').first().boundingBox();
        check(`${tag} menu "${label}" inside viewport`, b && b.x >= 0 && b.x + b.width <= width + 1 && b.y + b.height <= 801, JSON.stringify(b));
        const subs = p.locator('.menu-pop > .menu-subwrap > [role=menuitem]:not([disabled])');
        for (let j = 0; j < (await subs.count()); j++) {
          await subs.nth(j).hover();
          await p.waitForTimeout(50);
          const sb = await p.locator('.menu-sub').boundingBox();
          if (!(sb && sb.x >= 0 && sb.x + sb.width <= width + 1 && sb.y >= 0 && sb.y + sb.height <= 801)) check(`${tag} submenu ${label}/${j} inside viewport`, false, JSON.stringify(sb));
        }
        if (label === 'AI' && out) {
          await subs.first().hover();
          await p.waitForTimeout(80);
          await p.screenshot({ path: path.join(out, `ai-menu-${tag}.png`) });
        }
        await p.keyboard.press('Escape');
        await p.keyboard.press('Escape');
      }
    }
  }
  check('no page errors', !errors.length, errors.join(' | '));
  await browser.close();
  done();
})();
