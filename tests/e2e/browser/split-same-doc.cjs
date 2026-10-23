// Scenario 5: same document in both panes — edits sync, the other pane's caret stays put, no update loop.
const { open, ed, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  await page.locator('button[title="Split editor"]').click();
  await page.waitForSelector('.pane.second .ProseMirror');
  const p1 = ed(page);
  const p2 = page.locator('.pane.second .ProseMirror');
  // caret in pane 2 after "dimineață" (no focus needed: ProseMirror keeps its selection)
  const pos2 = await page.evaluate(() => {
    const e = document.querySelector('.pane.second .ProseMirror').editor;
    let tx = 0; e.on('transaction', () => tx++); window.__tx2 = () => tx;
    const i = e.state.doc.textContent.indexOf('dimineață') + 'dimineață'.length + 1;
    e.commands.setTextSelection(i);
    return i;
  });
  await caretEnd(page, p1);
  const t0 = Date.now();
  await page.keyboard.type(' SINCRON', { delay: 20 });
  const typingMs = Date.now() - t0;
  await page.waitForTimeout(300);
  const t2 = await p2.innerText();
  check('pane 2 shows text typed in pane 1', t2.includes('SINCRON'), t2);
  const after = await page.evaluate(() => document.querySelector('.pane.second .ProseMirror').editor.state.selection.from);
  check('pane 2 caret did not jump', after === pos2, `before ${pos2} after ${after}`);
  const tx = await page.evaluate(() => window.__tx2());
  check('no update loop (pane 2 transactions bounded)', tx < 40, `tx=${tx}`);
  check('typing not slowed', typingMs < 8 * 20 + 1500, `${typingMs}ms`);
  // and the other way round
  await caretEnd(page, p2);
  await page.keyboard.type(' INVERS', { delay: 20 });
  await page.waitForTimeout(300);
  check('pane 1 shows text typed in pane 2', (await p1.innerText()).includes('INVERS'));
  const sel1 = await page.evaluate(() => document.querySelector('.pane .ProseMirror').editor.state.selection.from);
  check('pane 1 caret not reset to start', sel1 > 1, `sel=${sel1}`);
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
