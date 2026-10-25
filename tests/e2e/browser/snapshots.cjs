// Inspector snapshots: take (+) → edit → compare shows the change (with ◀ ▶ navigation) → rename
// inline → roll back (confirm mentions the automatic snapshot) brings the old text back → delete (−)
// → the Snapshots Manager lists the document; the text survives a document switch.
const { open, ed, caretEnd, check, done, menuPick } = require('./_helpers.cjs');
const SHOTS = process.env.SNAP_SHOTS || '';
(async () => {
  const { browser, page, errors } = await open();
  await page.setViewportSize({ width: 1280, height: 800 });
  const dialogs = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });
  await page.locator('.binder-row', { hasText: 'Începutul' }).first().click();
  await page.waitForTimeout(250);
  if (!(await page.locator('.inspector .tabs').count())) { await page.keyboard.press('Control+Shift+I'); await page.waitForTimeout(200); }
  const tab = page.locator('.inspector .tabs button').nth(4);
  await tab.click();
  await page.waitForTimeout(150);
  const original = await ed(page).innerText();
  const pane = page.locator('.inspector .snapshots');
  await pane.locator('button.snap-add').click();
  await page.waitForTimeout(300);
  check('snapshot listed', (await pane.locator('li').count()) === 1);
  check('binder marks the document', (await page.locator('.binder-row', { hasText: 'Începutul' }).first().locator('.icon.has-snapshots').count()) === 1);

  await caretEnd(page);
  await page.keyboard.type(' SNAPEDIT');
  await page.waitForTimeout(700);
  await tab.click();
  await pane.locator('li').first().click();
  check('selecting shows the snapshot text read-only', (await pane.locator('.snap-preview.prose').count()) === 1);
  await pane.locator('button.snap-compare').click();
  await page.waitForTimeout(250);
  const cmp = await pane.locator('.snap-preview.diff').innerText();
  check('compare shows the added text', cmp.includes('SNAPEDIT'), cmp.slice(-200));
  await pane.locator('button.snap-next').click();
  await page.waitForTimeout(100);
  check('next change highlights a change', (await pane.locator('.diff .current').count()) >= 1 && /^1 \//.test(await pane.locator('.snap-count').innerText()));
  await pane.locator('.diff-level select').selectOption('paragraph');
  check('granularity switch keeps the change', (await pane.locator('.snap-preview.diff').innerText()).includes('SNAPEDIT'));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/snap-pane.png` });
  await pane.locator('button.snap-compare').click();

  // rename inline: Esc cancels, Enter saves
  const title = pane.locator('li').first().locator('.snap-title');
  const oldName = await title.innerText();
  await title.dblclick();
  await pane.locator('input.snap-rename').fill('ANULAT');
  await pane.locator('input.snap-rename').press('Escape');
  check('Esc cancels rename', (await pane.locator('li').first().locator('.snap-title').innerText()) === oldName);
  await pane.locator('li').first().locator('.snap-title').dblclick();
  await pane.locator('input.snap-rename').fill('Versiunea A');
  await pane.locator('input.snap-rename').press('Enter');
  await page.waitForTimeout(200);
  check('Enter saves rename', (await pane.locator('li').first().locator('.snap-title').innerText()) === 'Versiunea A');

  await pane.locator('li', { hasText: 'Versiunea A' }).click();
  await pane.locator('button.snap-rollback').click();
  await page.waitForTimeout(500);
  check('roll back asks first and mentions the automatic snapshot', dialogs.some((m) => m.includes('Înainte de revenire')), dialogs.join(' | '));
  check('roll back brings the old text back', !(await ed(page).innerText()).includes('SNAPEDIT'));
  let rows = [];
  for (let i = 0; i < 20 && rows.length < 2; i++) { rows = await pane.locator('li .snap-title').allInnerTexts(); if (rows.length < 2) await page.waitForTimeout(100); }
  check('automatic snapshot taken before roll back', rows.length === 2 && rows.includes('Înainte de revenire'), rows.join(','));

  // sort by title
  await pane.locator('.snap-head button').nth(1).click();
  await pane.locator('.snap-head button').nth(1).click(); // title, descending
  const names = await pane.locator('li .snap-title').allInnerTexts();
  check('sort by title (header click toggles direction)', names[0] === 'Versiunea A' && names[1] === 'Înainte de revenire', names.join(','));
  await pane.locator('.snap-head button').nth(0).click(); // back to date

  // delete (−)
  await pane.locator('li', { hasText: 'Înainte de revenire' }).click();
  await pane.locator('button.snap-del').click();
  await page.waitForTimeout(200);
  check('delete removes the snapshot', (await pane.locator('li').count()) === 1);

  // manager
  await menuPick(page, 'Documente', 'Snapshot-uri', 'Managerul de snapshot-uri');
  const mgr = page.locator('.modal.snap-manager');
  await mgr.waitFor({ timeout: 3000 });
  check('manager lists the document', (await mgr.locator('.snap-manager-docs li', { hasText: 'Începutul' }).count()) === 1);
  check('manager shows its snapshots', (await mgr.locator('.snapshots li', { hasText: 'Versiunea A' }).count()) === 1);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/snap-manager.png` });
  await mgr.locator('.actions button').click();

  await page.locator('.binder-row', { hasText: 'Partea întâi' }).first().click();
  await page.waitForTimeout(250);
  await page.locator('.binder-row', { hasText: 'Începutul' }).first().click();
  await page.waitForTimeout(300);
  const after = await ed(page).innerText();
  check('restored text survives a document switch', !after.includes('SNAPEDIT') && after.trim() === original.trim());
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
