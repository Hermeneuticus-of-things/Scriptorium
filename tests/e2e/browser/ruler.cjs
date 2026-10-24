// Ruler: Ctrl+Alt+Shift+R shows it; dragging the left-indent marker indents the paragraph,
// a click adds a tab stop, dragging a tab off the ruler removes it, Tab inserts a tab.
const { open, ed, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  await caretEnd(page);
  await page.keyboard.press('Control+Alt+Shift+R');
  await page.waitForTimeout(100);
  const ruler = page.locator('.pane .ruler').first();
  check('shortcut shows the ruler', (await ruler.count()) === 1);
  const cmPx = 96 / 2.54;
  const box = await ruler.boundingBox();
  const para = () => page.evaluate(() => {
    const sel = window.getSelection();
    let n = sel.anchorNode;
    while (n && !(n.nodeType === 1 && /^(P|H\d)$/.test(n.tagName))) n = n.parentNode;
    return n ? { left: n.dataset.indentLeft || null, tabs: n.dataset.tabs || null, ml: getComputedStyle(n).marginLeft, text: n.textContent } : null;
  });
  // drag the left-indent marker 2 cm to the right
  const h = await ruler.locator('.ruler-handle.left').boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2 + cmPx, h.y + h.height / 2, { steps: 4 });
  await page.mouse.move(box.x + 2 * cmPx, h.y + h.height / 2, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  let p = await para();
  check('left indent dragged to 2 cm', p && p.left === '2' && Math.abs(parseFloat(p.ml) - 2 * cmPx) < 2, JSON.stringify(p));
  // click on the ruler body (away from markers) adds a tab stop at 5 cm
  await page.mouse.click(box.x + 5 * cmPx, box.y + 3);
  await page.waitForTimeout(100);
  p = await para();
  check('click adds a tab stop at 5 cm', p && p.tabs === '5', JSON.stringify(p));
  check('tab marker drawn', (await ruler.locator('.ruler-tab').count()) === 1);
  // Tab inserts a tab character in a paragraph with tab stops
  await page.keyboard.press('Tab');
  await page.waitForTimeout(50);
  p = await para();
  check('Tab key inserts \\t', p && p.text.endsWith('\t'), JSON.stringify(p && p.text.slice(-5)));
  // drag the tab off the ruler removes it
  const t = await ruler.locator('.ruler-tab').boundingBox();
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
  await page.mouse.down();
  await page.mouse.move(t.x + t.width / 2, t.y + 80, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  p = await para();
  check('tab dragged off is removed', p && !p.tabs && (await ruler.locator('.ruler-tab').count()) === 0, JSON.stringify(p));
  await page.keyboard.press('Control+Alt+Shift+R');
  await page.waitForTimeout(100);
  check('shortcut hides the ruler', (await page.locator('.pane .ruler').count()) === 0);
  check('no page errors', !errors.length, errors.join(' | '));
  await browser.close();
  done();
})();
