// An app shortcut typed in the editor (Ctrl+Shift+E = Compile) does not also format the text.
const { open, ed, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page: p, errors } = await open();
  await ed(p).click();
  await p.keyboard.press('Control+Home');
  await p.keyboard.press('Control+Shift+E');
  await p.waitForTimeout(600);
  const html = await ed(p).innerHTML();
  check('the paragraph is not centred', !/text-align:\s*center/.test(html));
  check('Compile opened', (await p.locator('.modal').count()) > 0);
  check('no page errors', !errors.length, errors.join(' | '));
  await browser.close();
  done();
})();
