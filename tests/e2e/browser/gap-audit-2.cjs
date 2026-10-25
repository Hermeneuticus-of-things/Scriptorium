// Gap audit round 2 in the real UI: automatic back-links + "Links to this document",
// [[New title]] creating a document, the copyholder (reference pane), Preserve Formatting,
// corkboard card look.
const { open, ed, caretEnd, check, done, menuCmd } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  const dlg = () => page.locator('.modal[role=dialog]').last();
  // turn on automatic back-links (Settings → Editing)
  await menuCmd(page, /^Setări…|^Settings…/);
  await page.waitForSelector('.modal [role=tablist]');
  await dlg().locator('[role=tab]', { hasText: /Editare|Editing/ }).first().click();
  await dlg().locator('label.check', { hasText: /legătura înapoi|back-links/ }).locator('input').check();
  await dlg().locator('button.primary', { hasText: /Salvează|Save/ }).last().click();
  await page.waitForTimeout(300);

  const sourceTitle = (await page.locator('.pane .doc-title').first().textContent()).trim();
  // [[New title]] → offer → create and link
  await caretEnd(page);
  await page.keyboard.press('Enter');
  await page.keyboard.type('Vezi [[Document legat nou]]');
  await page.waitForSelector('.wiki-offer', { timeout: 2000 }).catch(() => {});
  check('[[New title]] offers to create the document', (await page.locator('.wiki-offer').count()) === 1);
  await page.locator('.wiki-offer button.primary').click();
  await page.waitForTimeout(500);
  const links = await ed(page).locator('a[href^="scribner://doc/"]').allTextContents();
  check('typed text became a link to the new document', links.includes('Document legat nou'), JSON.stringify(links));
  check('new document is in the binder', (await page.locator('.binder', { hasText: 'Document legat nou' }).count()) > 0);
  // Esc on a second offer leaves plain text
  await page.keyboard.type(' [[Alt titlu inexistent]]');
  await page.waitForSelector('.wiki-offer', { timeout: 2000 }).catch(() => {});
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('Esc dismisses the offer', (await page.locator('.wiki-offer').count()) === 0);
  check('Esc leaves the typed text', (await ed(page).innerText()).includes('[[Alt titlu inexistent]]'));
  await page.waitForTimeout(700); // serialize + back-link

  // open the new document: back-link bookmark + incoming links in the Inspector
  await page.locator('.binder >> text=Document legat nou').first().click();
  await page.waitForTimeout(400);
  const insp = page.locator('.side');
  await insp.locator('[role=tab]').nth(1).click(); // Bookmarks and links pane
  await page.waitForTimeout(200);
  const bm = await insp.locator('ul.bookmarks').first().innerText().catch(() => '');
  check('target got a back-link bookmark', bm.includes(sourceTitle), `${sourceTitle} vs ${bm}`);
  const inc = await insp.locator('.incoming-links').innerText().catch(() => '');
  check('Inspector lists links to this document', /Legături către acest document|Links to this document/.test(inc) && inc.includes(sourceTitle), inc);

  // copyholder via menu: open the current doc as reference
  await menuCmd(page, /Deschide ca referință|Open as reference/);
  await page.waitForTimeout(300);
  const copy = page.locator('.pane.copyholder');
  check('copyholder pane opens', (await copy.count()) === 1);
  check('copyholder is read-only by default', (await copy.locator('.ProseMirror[contenteditable=false]').count()) === 1);
  await copy.locator('.pane-head input[type=checkbox]').check();
  await page.waitForTimeout(200);
  check('copyholder can be made editable', (await copy.locator('.ProseMirror[contenteditable=true]').count()) === 1);
  // Alt+Shift+click another binder doc swaps the reference
  const other = page.locator('.binder-row', { hasText: sourceTitle }).first();
  await other.click({ modifiers: ['Alt', 'Shift'] });
  await page.waitForTimeout(300);
  check('Alt+Shift+click shows that document as reference', ((await copy.locator('.doc-title').textContent().catch(() => '')) || '').trim() === sourceTitle);
  await copy.locator('.pane-head button', { hasText: /Închide|Close/ }).click();
  check('copyholder closes', (await page.locator('.pane.copyholder').count()) === 0);

  // Preserve Formatting from the Format menu
  await caretEnd(page);
  await menuCmd(page, /Păstrează formatarea|Preserve formatting/);
  check('Preserve Formatting wraps the paragraph', (await ed(page).locator('div.preserve-format').count()) === 1);

  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
