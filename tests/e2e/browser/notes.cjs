// Scenario 3: comments and footnotes — add, edit, delete, undo/redo, survive document switches.
const { open, ed, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  // The notes group is not on the default format bar; add it the way a user would keep it (saved toolbars).
  const { browser, page, errors } = await open({
    beforeOpen: async (p) => {
      await p.evaluate(() => localStorage.setItem('pneuma-demo-toolbars', JSON.stringify({ format: ['block', 'font', 'bui', 'notes'] })));
      await p.reload();
    },
  });
  let answer = '';
  page.on('dialog', (d) => (d.type() === 'prompt' ? d.accept(answer) : d.accept()));
  const binder = (t) => page.locator('.binder').getByText(t, { exact: true });
  const html = () => ed(page).innerHTML();
  const btn = (title) => page.locator(`.format-bar button[title="${title}"], button[title="${title}"]`).first();
  // select the word "rece"
  await page.evaluate(() => {
    const e = document.querySelector('.pane .ProseMirror').editor;
    const i = e.state.doc.textContent.indexOf('rece');
    e.chain().focus().setTextSelection({ from: i + 1, to: i + 5 }).run();
  });
  answer = 'Prima notă';
  await btn('Comentariu pe textul selectat').click();
  check('comment added', (await html()).includes('data-comment="Prima notă"'), (await html()).slice(0, 200));
  // footnote at end
  await caretEnd(page);
  answer = 'Sursa 1';
  await btn('Notă de subsol (dublu-clic pe număr pentru editare)').click();
  check('footnote added', (await html()).includes('data-footnote="Sursa 1"'));
  await page.waitForTimeout(600); // separate history groups, like a human
  answer = 'Sursa 2';
  await page.locator('.pane .ProseMirror .footnote').first().dblclick();
  await page.waitForTimeout(100);
  check('footnote edited by double-click', (await html()).includes('data-footnote="Sursa 2"'), (await html()).match(/data-footnote="[^"]*"/g)?.join());
  await page.keyboard.press('Control+z');
check('undo footnote edit', (await html()).includes('data-footnote="Sursa 1"'), (await html()).match(/data-footnote="[^"]*"/g)?.join());
  await page.keyboard.press('Control+Shift+Z');
  check('redo footnote edit', (await html()).includes('data-footnote="Sursa 2"'));
  // delete comment: put caret inside it
  await page.evaluate(() => {
    const e = document.querySelector('.pane .ProseMirror').editor;
    const i = e.state.doc.textContent.indexOf('rece');
    e.chain().focus().setTextSelection(i + 3).run();
  });
  await page.waitForTimeout(50);
  await btn('Șterge comentariul').click();
  check('comment deleted, text kept', !(await html()).includes('data-comment') && (await html()).includes('rece'));
  await page.keyboard.press('Control+z');
  check('undo restores comment', (await html()).includes('data-comment="Prima notă"'));
  await page.waitForTimeout(200);
  await binder('Drumul').click();
  await page.waitForTimeout(200);
  await binder('Începutul').click();
  await page.waitForTimeout(300);
  const h = await html();
  check('after switching: comment + edited footnote kept', h.includes('data-comment="Prima notă"') && h.includes('data-footnote="Sursa 2"'), h);
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
