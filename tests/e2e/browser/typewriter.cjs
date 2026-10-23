// Scenario 8: typewriter scrolling on a long document — per-keystroke latency and caret kept visible.
const { open, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open({
    beforeOpen: async (page) => {
      await page.getByRole('button', { name: 'Setări', exact: true }).click();
      for (const tab of await page.locator('.settings-dialog [role=tab]').all()) {
        await tab.click();
        const box = page.locator('.settings-dialog label.check', { hasText: /mașină de scris|Typewriter/ });
        if (await box.count()) { await box.locator('input').check(); break; }
      }
      await page.locator('.settings-dialog > div button.primary').last().click();
      await page.waitForTimeout(200);
    },
  });
  check('typewriter class on page', (await page.locator('.pane .page.typewriter').count()) === 1);
  await caretEnd(page);
  const paras = Array.from({ length: 400 }, (_, i) => `Paragraful ${i} are câteva cuvinte de umplutură pentru un document lung.`).join('\n\n');
  await page.evaluate((text) => { const dt = new DataTransfer(); dt.setData('text/plain', text); document.querySelector('.pane .ProseMirror').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, paras);
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.__lat = []; document.addEventListener('keydown', () => { const t = performance.now(); requestAnimationFrame(() => setTimeout(() => window.__lat.push(performance.now() - t), 0)); }, true); });
  await page.keyboard.type(' abc def', { delay: 40 });
  await page.waitForTimeout(800);
  const lat = (await page.evaluate(() => window.__lat)).sort((a, b) => a - b);
  check('typewriter keystroke median < 100ms', lat[lat.length >> 1] < 100, `median ${lat[lat.length >> 1].toFixed(1)} max ${lat[lat.length - 1].toFixed(1)}`);
  const vis = await page.evaluate(() => { const r = getSelection().getRangeAt(0).getBoundingClientRect(); return [r.top, innerHeight]; });
  check('caret visible near the middle', vis[0] > 0 && vis[0] < vis[1], JSON.stringify(vis));
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
