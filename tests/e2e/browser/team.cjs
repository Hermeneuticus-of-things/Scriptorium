// Team work (ROADMAP §9) in the real UI, with the demo's second writer "Ana" (?demo&team):
// who is on the open document, the change log with filters, own edits logged, own lock.
const { open, ed, caretEnd, check, done, menuCmd } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open({ beforeOpen: (p) => p.goto(`${p.url()}&team`) });
  check('the other writer is shown on the open document', (await page.locator('.sc-header-bar .team-chip', { hasText: 'Ana' }).count()) === 1);
  check('status bar counts the people working', /2/.test(await page.locator('.statusbar .team-status').textContent()));

  await caretEnd(page);
  await page.keyboard.type(' Vântul bătea tare.');
  await page.waitForTimeout(9000); // the author commit (I-EDIT) closes a run of typing after 8 s
  await page.getByRole('button', { name: /Blochează documentul|Lock the document/ }).click();
  check('own lock is on', (await page.locator('.sc-header-bar [aria-pressed="true"]').count()) === 1);
  check('own lock keeps the document editable here', (await ed(page).getAttribute('contenteditable')) === 'true');

  await menuCmd(page, /^Echipă…|^Team…/);
  const dlg = page.locator('.team-dialog');
  await dlg.waitFor();
  check('dialog lists who works now', (await dlg.locator('.team-live li', { hasText: 'Ana' }).count()) === 1);
  const rows = await dlg.locator('.team-log li').allTextContents();
  check('own edit is in the log, newest first', /Ion.*\+3/.test(rows[0] || ''), rows[0]);
  check('the other writer\'s edits are in the log', rows.filter((r) => r.includes('Ana')).length === 2);
  await dlg.locator('select').nth(1).selectOption('Ana');
  check('filter by person', (await dlg.locator('.team-log li').count()) === 2);
  await dlg.locator('select').nth(2).selectOption('day');
  check('filter by period', (await dlg.locator('.team-log li').count()) === 1);
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();

  // A document locked on another computer opens read-only here.
  const two = await open({ beforeOpen: (p) => p.goto(`${p.url()}&team=lock`) });
  check('lock of the other writer is shown', (await two.page.locator('.sc-header-bar .team-chip.locked', { hasText: 'Ana' }).count()) === 1);
  check('locked document is read-only', (await ed(two.page).getAttribute('contenteditable')) === 'false');
  check('no own lock button on a document locked by someone else', (await two.page.getByRole('button', { name: /Blochează documentul|Lock the document/ }).count()) === 0);
  await two.browser.close();
  done();
})();
