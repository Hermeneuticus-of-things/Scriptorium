// Invisibles on a long document: dots are drawn only near the screen, and they follow scrolling
// (top of the document, middle, end) without needing a keystroke.
const { open, ed, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  await caretEnd(page);
  const para = 'Era o dimineață rece de octombrie când Andrei a plecat de acasă.';
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    document.querySelector('.pane .ProseMirror').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, Array.from({ length: 3000 }, () => para).join('\n\n'));
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.querySelector('.pane .ProseMirror').editor.commands.setInvisibles(true));
  const dotsOnScreen = async () =>
    page.evaluate(() => {
      const h = window.innerHeight;
      return [...document.querySelectorAll('.inv-space')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < h;
      }).length;
    });
  const total = () => page.evaluate(() => document.querySelectorAll('.inv-space').length);
  for (const [label, where] of [['top', 0], ['middle', 0.5], ['end', 1]]) {
    await page.evaluate((f) => {
      const el = document.querySelector('.pane .ProseMirror');
      let sc = el.parentElement;
      while (sc && sc.scrollHeight <= sc.clientHeight) sc = sc.parentElement;
      (sc || document.scrollingElement).scrollTop = f * ((sc || document.scrollingElement).scrollHeight);
    }, where);
    await page.waitForTimeout(400);
    const on = await dotsOnScreen();
    check(`dots visible at ${label}`, on > 50, `${on} on screen`);
  }
  const all = await total();
  check('dots limited to the visible window', all < 20000, `${all} in DOM (document has ~30000 spaces)`);
  check('no console errors', !errors.length, errors.join(' | '));
  await browser.close();
  done();
})();
