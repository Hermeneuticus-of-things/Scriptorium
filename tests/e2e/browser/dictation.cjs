// D&TED dictation (docs/DTED.md) with the simulated service of the demo (?demo&dted):
// F9 dictates at the cursor; over a selection the dictated text replaces it and one Ctrl+Z
// brings the old text back; Cancel takes the text out; an audio file becomes a Research document.
const { open, ed, caretEnd, check, done, menuCmd } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open({ beforeOpen: (p) => p.goto(`${p.url()}&dted`) });
  const text = () => ed(page).innerText();
  // new text at the cursor
  await caretEnd(page);
  await page.keyboard.press('F9');
  await page.waitForSelector('.dictation-bar');
  await page.waitForFunction(() => document.querySelector('.pane .ProseMirror').innerText.includes('Și drumul urca'), null, { timeout: 5000 }).catch(() => {});
  await page.locator('.dictation-bar button', { hasText: /^Stop$/ }).click();
  await page.waitForSelector('.dictation-bar', { state: 'detached', timeout: 3000 }).catch(() => {});
  const after = await text();
  check('dictated text is at the cursor, capitalised', /poate rămâne\. Ceața se ridica încet din vale și drumul urca/.test(after.replace(/\s+/g, ' ')), after.slice(-140));
  check('the bar closes on Stop', (await page.locator('.dictation-bar').count()) === 0);

  // over a selection: replaced; one Ctrl+Z restores
  await ed(page).click();
  await page.evaluate(() => {
    const p = document.querySelector('.pane .ProseMirror p');
    const r = document.createRange();
    r.selectNodeContents(p);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
  });
  await page.waitForTimeout(150);
  const firstBefore = await ed(page).locator('p').first().innerText();
  await page.keyboard.press('F9');
  await page.waitForFunction(() => document.querySelector('.pane .ProseMirror p').innerText.includes('drumul urca'), null, { timeout: 5000 }).catch(() => {});
  await page.locator('.dictation-bar button', { hasText: /^Stop$/ }).click();
  await page.waitForTimeout(400);
  const firstAfter = await ed(page).locator('p').first().innerText();
  check('dictation over a selection replaces it', firstAfter.startsWith('Ceața se ridica') && !firstAfter.includes('octombrie'), firstAfter);
  await ed(page).click();
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(300);
  check('one Ctrl+Z brings the old text back', (await ed(page).locator('p').first().innerText()) === firstBefore, await ed(page).locator('p').first().innerText());

  // Cancel takes the dictated text out
  await caretEnd(page);
  const beforeCancel = await text();
  await page.keyboard.press('F9');
  await page.waitForFunction(() => document.querySelector('.pane .ProseMirror').innerText.includes('Ceața se ridica încet din vale.') || true, null, { timeout: 100 });
  await page.waitForTimeout(1600);
  await page.locator('.dictation-bar button', { hasText: /^Anulează$/ }).click();
  await page.waitForTimeout(300);
  check('Cancel removes what was dictated', (await text()) === beforeCancel);

  // an audio file → a Research document
  await menuCmd(page, /^Transcrie fișier audio/);
  await page.waitForFunction(() => [...document.querySelectorAll('.binder-row')].some((r) => r.textContent.includes('Transcriere: interviu-bunica.mp3')), null, { timeout: 5000 }).catch(() => {});
  check('the transcript is a new document in Research', (await page.locator('.binder-row', { hasText: 'Transcriere: interviu-bunica.mp3' }).count()) === 1);
  const tr = await ed(page).innerText();
  check('paragraphs follow the pauses, with times', /\[00:00\] Când eram mică, iarna venea devreme\. Tata tăia lemne în curte\.\s+\[01:02\] Apoi am plecat la oraș\./.test(tr), tr);
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
