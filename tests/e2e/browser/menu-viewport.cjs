// Every top menu opens fully inside the window, at narrow and wide sizes (menus that wrap to the
// second toolbar row near the left edge used to open off-screen to the left).
process.env.SCRIBNER_URL = process.env.SCRIBNER_URL || 'http://localhost:4183/?demo';
const { open, check, done } = require('./_helpers.cjs');
(async () => {
  for (const [w, h] of [[800, 600], [1024, 700], [1440, 900]]) {
    const { browser, page, errors } = await open();
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(200);
    const menus = page.locator('header.toolbar .menu > button');
    const n = await menus.count();
    const bad = [];
    for (let i = 0; i < n; i++) {
      await menus.nth(i).click();
      await page.waitForTimeout(80);
      const b = await page.locator('.menu-pop').first().boundingBox();
      if (b && (b.x < 0 || b.y < 0 || b.x + b.width > w + 0.5 || b.y + b.height > h + 0.5)) bad.push(`${(await menus.nth(i).innerText()).trim()} [${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.x + b.width)},${Math.round(b.y + b.height)}]`);
      await page.keyboard.press('Escape');
    }
    check(`${w}x${h}: all ${n} menus inside the window`, !bad.length, bad.join('; '));
    check(`${w}x${h}: no errors`, !errors.length, errors.join(' | '));
    await browser.close();
  }
  done();
})();
