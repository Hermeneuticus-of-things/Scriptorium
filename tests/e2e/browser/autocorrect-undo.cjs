// Scenario 1: Romanian typing with autocorrect, then Ctrl+Z reverts one correction/word at a time.
const { open, ed, caretEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  await caretEnd(page);
  await page.keyboard.press('Enter');
  const last = () => page.evaluate(() => { const ps = document.querySelectorAll('.pane .ProseMirror p'); return ps[ps.length - 1].textContent; });
  await page.keyboard.type('El a zis -- "Vino aici" ... apoi a plecat. ', { delay: 10 });
  const typed = await last();
  console.log('typed:', JSON.stringify(typed), await ed(page).innerHTML());
  check('em dash', typed.includes('—'));
  check('ro quotes', typed.includes('„Vino aici”'));
  check('ellipsis', typed.includes('…'));
  const steps = [];
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Control+z'); steps.push(await last()); }
  steps.forEach((s, i) => console.log(i + 1, JSON.stringify(s)));
  check('no corruption: each undo state is a prefix-ish of typed or raw', steps.every((s) => !/undefined|￼/.test(s)));
  check('undo eventually removes the new paragraph', steps[steps.length - 1] === 'Nu știa încă unde va ajunge.');
  // Playwright sends key "z" with Shift here, like Caps Lock / macOS Cmd+Shift+Z: extra redos must not undo.
  for (let i = 0; i < 12; i++) await page.keyboard.press('Control+Shift+z');
  check('redo restores typed text', (await last()) === typed, JSON.stringify(await last()));
  // Ctrl+Z right after a correction reverts only the correction.
  await page.keyboard.type('x --', { delay: 10 });
  await page.keyboard.press('Control+z');
  check('Ctrl+Z right after -- → — restores --', (await last()).endsWith('x --'), JSON.stringify(await last()));
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
