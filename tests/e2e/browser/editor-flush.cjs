// Debounced serialization must never lose typing: blur, getHtml, document switch, App flush, unload.
const { open, ed, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  const binder = (t) => page.locator('.binder').getByText(t, { exact: true });
  await caretEnd(page);
  await page.keyboard.type(' ZETA', { delay: 0 });
  // no wait at all: switch document immediately (editor unmount must flush)
  await binder('Drumul').click();
  await page.waitForTimeout(400);
  await binder('Începutul').click();
  await page.waitForTimeout(400);
  check('switch right after typing keeps text', (await ed(page).innerText()).includes('ZETA'));
  // imperative getHtml flushes too
  await caretEnd(page);
  await page.keyboard.type(' OMEGA', { delay: 0 });
  const viaHandle = await page.evaluate(() => document.querySelector('.pane .ProseMirror').editor.getHTML().includes('OMEGA'));
  check('editor state has text', viaHandle);
  // pagehide (window close) flushes pending typing into the App store
  await caretEnd(page);
  await page.keyboard.type(' KAPPA', { delay: 0 });
  const saved = await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); return true; });
  await binder('Drumul').click(); await page.waitForTimeout(300); await binder('Începutul').click(); await page.waitForTimeout(300);
  check('pagehide flush + switch keeps text', saved && (await ed(page).innerText()).includes('KAPPA'));
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
