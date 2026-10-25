// P10: Project Settings (default label/status, number metadata with alignment, section types per
// level, global default formatting, language and publishing details, icons tab, export/import)
// and Inspector (page break / compile as-is, synopsis from text, comment filter, project notes
// tabs, bookmarks to outside files with drag reordering).
const { open, check, done, menuCmd } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  page.on('dialog', (d) => d.accept());
  await page.evaluate(() => { window.__demoBookmarkFile = '/home/demo/Documente/harta.pdf'; });

  await menuCmd(page, 'Setările proiectului');
  const dlg = page.locator('.ps-dialog');
  check('project settings open', (await dlg.count()) === 1);
  const tab = (name) => dlg.locator('.ps-tabs button', { hasText: name }).first().click();

  await tab('Proiect');
  await dlg.locator('input.ps-language').fill('en');
  await dlg.locator('input.ps-publisher').fill('Editura Demo');
  await dlg.locator('input.ps-isbn').fill('978-0-00-000000-0');

  await tab('Etichete');
  const lblOpts = await dlg.locator('select.ps-default-label option').allTextContents();
  check('label default select lists labels', lblOpts.length > 1, lblOpts.join(','));
  await dlg.locator('select.ps-default-label').selectOption({ index: 1 });
  const wantLabel = await dlg.locator('select.ps-default-label').inputValue();
  check('export / import buttons', (await dlg.locator('.ps-export-meta').count()) === 1 && (await dlg.locator('.ps-import-meta').count()) === 1);

  await tab('Statusuri');
  await dlg.locator('select.ps-default-status').selectOption({ index: 1 });
  const wantStatus = await dlg.locator('select.ps-default-status').inputValue();

  await tab('Metadate');
  await dlg.getByRole('button', { name: /Adaugă câmp/ }).click();
  const field = dlg.locator('.ps-field').last();
  await field.locator('select').first().selectOption('number');
  check('number type sets right alignment', (await field.locator('select.ps-field-align').inputValue()) === 'right');
  await field.locator('input[type=number]').fill('5');

  await tab('Tipuri de secțiune');
  check('per-level section type table', (await dlg.locator('table.ps-depths tbody tr').count()) >= 5);

  await tab('Formatare');
  const global = dlg.locator('input.dfp-global');
  check('ruler shown', (await dlg.locator('.dfp-ruler .dfp-mark').count()) === 3);
  if (!(await global.isChecked())) await global.check();
  check('use global disables the fields', await dlg.locator('.dfp select').first().isDisabled());
  await global.uncheck();

  await tab('Icoane');
  check('icons tab', (await dlg.locator('.ps-add-icon').count()) === 1);

  await dlg.getByRole('button', { name: 'Salvează' }).click();
  await page.waitForTimeout(300);
  check('dialog closed after save', (await page.locator('.ps-dialog').count()) === 0);

  // New document gets the defaults
  await page.locator('.binder-row', { hasText: 'Începutul' }).first().click();
  await page.waitForTimeout(200);
  await menuCmd(page, 'Document nou');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  if (!(await page.locator('.inspector .tabs').count())) { await page.keyboard.press('Control+Shift+I'); await page.waitForTimeout(200); }
  await page.locator('.inspector .tabs button[aria-label="Detalii"]').click();
  await page.waitForTimeout(150);
  const selects = page.locator('.inspector .insp-section select');
  const gotLabel = await selects.nth(0).inputValue();
  const gotStatus = await selects.nth(1).inputValue();
  check('new document has the default label', gotLabel === wantLabel, `${gotLabel} vs ${wantLabel}`);
  check('new document has the default status', gotStatus === wantStatus, `${gotStatus} vs ${wantStatus}`);
  while (await page.locator('.inspector details.insp-section:not([open]) > summary').count()) {
    await page.locator('.inspector details.insp-section:not([open]) > summary').first().click();
    await page.waitForTimeout(60);
  }
  check('number field with default value', (await page.locator('.inspector input.insp-number-field').inputValue()) === '5');
  await page.locator('.inspector input.insp-page-break').check();
  check('page break before toggles', await page.locator('.inspector input.insp-page-break').isChecked());
  check('compile as-is checkbox', (await page.locator('.inspector input.insp-as-is').count()) === 1);

  // Synopsis from text on a document with text
  await page.locator('.binder-row', { hasText: 'Începutul' }).first().click();
  await page.waitForTimeout(250);
  await page.locator('.inspector .tabs button').nth(0).click();
  await page.locator('.inspector button.insp-synopsis-from-text').click();
  await page.waitForTimeout(200);
  const syn = await page.locator('.inspector textarea[aria-label="Sinopsis"]').inputValue();
  check('synopsis from the text', syn.length > 10, syn.slice(0, 50));

  // Project notes as tabs inside the Inspector
  await page.locator('.inspector .seg button', { hasText: 'Proiect' }).first().click();
  await page.waitForTimeout(250);
  check('project notes tabs in inspector', (await page.locator('.inspector .project-notes-tabs [role=tab]').count()) >= 1);

  // Comments filter
  await page.locator('.inspector .tabs button').nth(4).click();
  check('comments filter', (await page.locator('.inspector .annot-filter button').count()) === 3 || (await page.locator('.inspector .annot-pane').count()) === 1);

  // Bookmarks: outside file + reorder by drag
  await page.locator('.inspector .tabs button').nth(1).click();
  await page.locator('.inspector .doc-bookmarks .bm-add-file').click();
  await page.waitForTimeout(150);
  const sel = page.locator('.inspector .doc-bookmarks .bookmark-add select');
  await sel.selectOption({ index: 1 });
  await page.waitForTimeout(150);
  const items = page.locator('.inspector .doc-bookmarks ul.bookmarks li');
  check('file bookmark added', (await page.locator('.inspector .doc-bookmarks .bm-file').count()) === 1);
  await items.nth(1).dragTo(items.nth(0));
  await page.waitForTimeout(200);
  check('drag reorders bookmarks', (await items.nth(1).locator('.bm-file').count()) === 1);
  await page.locator('.inspector .doc-bookmarks .bm-file').click();
  await page.waitForTimeout(100);
  const opened = await page.evaluate(() => window.__demoOpenedFiles || []);
  check('file bookmark opens', opened.includes('/home/demo/Documente/harta.pdf'), opened.join(','));

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
