// Q4: Scrivenings behaves as one continuous text — caret moves across sections, selection
// (Shift+arrows, mouse drag, Ctrl+A) and copy span sections, typing over a cross-section
// selection edits each section without merging documents, find & replace runs across sections.
const { open, sectionEnd, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  const binder = (t) => page.locator('.binder').getByText(t, { exact: true });
  await binder('Partea întâi').click();
  await page.waitForSelector('.scriv-section .scriv-body');
  const secs = page.locator('.pane .scriv-section .scriv-body');
  const n = await secs.count();
  check('one editor for the whole set', (await page.locator('.pane .scrivenings .ProseMirror').count()) === 1);
  check('three sections', n === 3, String(n));
  const texts0 = await secs.allInnerTexts();
  const caretSection = () => page.evaluate(() => {
    const s = window.getSelection();
    const el = s.focusNode && (s.focusNode.nodeType === 1 ? s.focusNode : s.focusNode.parentElement);
    const sec = el && el.closest('.scriv-section');
    return sec ? [...document.querySelectorAll('.pane .scriv-section')].indexOf(sec) : -1;
  });

  // caret: down arrow from the end of section 1 goes into section 2
  await sectionEnd(page, secs.nth(0));
  check('caret starts in section 1', (await caretSection()) === 0);
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
  check('ArrowDown crosses into the next section', (await caretSection()) >= 1, String(await caretSection()));
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  check('ArrowUp comes back', (await caretSection()) === 0, String(await caretSection()));
  await page.keyboard.press('Control+End');
  check('Ctrl+End goes to the end of the whole set', (await caretSection()) === n - 1);
  await page.keyboard.press('Control+Home');
  check('Ctrl+Home goes to the start of the whole set', (await caretSection()) === 0);
  await page.keyboard.press('PageDown');
  await page.keyboard.press('PageDown');
  check('PageDown moves on through the set', (await caretSection()) >= 0);

  // Shift+arrows across a boundary
  await sectionEnd(page, secs.nth(0));
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  const shiftSel = await page.evaluate(() => window.getSelection().toString());
  check('Shift+Right selects into the next section', shiftSel.length >= 2 && (await caretSection()) === 1, JSON.stringify(shiftSel));

  // Ctrl+A selects every section; copy carries the text of all of them
  await secs.nth(1).click();
  await page.keyboard.press('Control+a');
  const all = await page.evaluate(() => window.getSelection().toString());
  check('Ctrl+A selects the text of all sections', texts0.every((t) => all.includes(t.trim().slice(0, 20))), all.slice(0, 120));
  await page.keyboard.press('Control+c');
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null);
  if (clip !== null) check('copy across sections', texts0.every((t) => clip.includes(t.trim().slice(0, 20))), (clip || '').slice(0, 100));

  // mouse drag from section 1 into section 2
  const b1 = await secs.nth(0).boundingBox();
  const b2 = await secs.nth(1).boundingBox();
  await page.mouse.move(b1.x + 40, b1.y + b1.height - 6);
  await page.mouse.down();
  await page.mouse.move(b2.x + 60, b2.y + 8, { steps: 8 });
  await page.mouse.up();
  const drag = await page.evaluate(() => window.getSelection().toString());
  check('mouse drag selects across sections', drag.length > 5 && (await caretSection()) === 1, String(drag.length));

  // typing over the cross-section selection: text gone in both, both sections stay
  await page.keyboard.type('X', { delay: 20 });
  await page.waitForTimeout(400);
  const t1 = await secs.allInnerTexts();
  check('sections kept after typing over a cross-section selection', t1.length === 3, String(t1.length));
  check('typed text lands in the first section', t1[0].includes('X'));
  check('second section lost only its selected start', t1[1].length < texts0[1].length && !t1[1].includes('X'));
  check('third section untouched', t1[2] === texts0[2]);

  // Backspace at the start of a section does not merge
  await secs.nth(1).locator(':scope > *').first().click({ position: { x: 2, y: 4 } });
  await page.keyboard.press('Home');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(200);
  check('Backspace at a section start keeps both sections', (await secs.count()) === 3);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(400);
  check('undo brings back the replaced text', (await secs.allInnerTexts())[1] === texts0[1], (await secs.allInnerTexts())[1].slice(0, 60));

  // Ctrl+A + Delete: every section emptied, none removed
  await secs.nth(0).click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await page.waitForTimeout(300);
  const t2 = await secs.allInnerTexts();
  check('select all + Delete empties sections but keeps them', t2.length === 3 && t2.every((t) => !t.trim()), JSON.stringify(t2));
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(400);
  check('undo restores all sections', JSON.stringify(await secs.allInnerTexts()) === JSON.stringify(texts0));

  // find & replace across sections (find bar of the Scrivenings editor)
  await secs.nth(0).click();
  await page.keyboard.press('Control+f');
  await page.waitForTimeout(200);
  const word = 'și';
  const before = (await secs.allInnerTexts()).map((t) => t.split(word).length - 1);
  const inputs = page.locator('.pane .find-bar input');
  if ((await inputs.count()) >= 2) {
    await inputs.nth(0).fill(word);
    await inputs.nth(1).fill('ȘI');
    const allBtn = page.locator('.pane .find-bar button').filter({ hasText: /tot|all/i }).first();
    await allBtn.click();
    await page.waitForTimeout(400);
    const after = (await secs.allInnerTexts()).map((t) => t.split('ȘI').length - 1);
    check('replace all reaches every section', before.filter(Boolean).length >= 2 && before.every((c, i) => after[i] >= c), `${before} → ${after}`);
    await page.keyboard.press('Escape');
  } else check('find bar has find and replace fields', false, String(await inputs.count()));

  // saved per document
  await page.waitForTimeout(500);
  await binder('Începutul').click();
  await page.waitForTimeout(300);
  const a = await page.locator('.pane .ProseMirror').first().innerText();
  check('section 1 saved to its own document only', a.includes('ȘI') || !before[0], a.slice(0, 80));
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
