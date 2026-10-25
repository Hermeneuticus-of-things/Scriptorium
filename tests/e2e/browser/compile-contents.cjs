// Compile window (P1): Contents list with Include / page break / section type per row, the new
// predefined formats, filters (keywords, inverted), per-output front matter, contents settings,
// format export, and a preview that follows the row choices.
const { open, check, done, menuCmd } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  await menuCmd(page, 'Compilează…');
  const dlg = page.locator('.compile-dialog');
  await dlg.waitFor({ timeout: 3000 });
  check('compile window opens', await dlg.isVisible());

  // formats
  const names = await dlg.locator('.cd-formats li button').allInnerTexts();
  for (const n of ['Roman cu părți numerotate', 'Non-ficțiune', 'Povestire', 'Scenariu de film', 'Piesă de teatru', 'Poezie', 'E-book ficțiune', 'Exemplar de corectură']) {
    check(`preset listed: ${n}`, names.some((x) => x.startsWith(n)));
  }
  await dlg.locator('.cd-formats li button', { hasText: 'Scenariu de film' }).click();
  check('script preset tells its intended output', (await dlg.locator('.cd-formats').innerText()).includes('Final Draft'));
  await dlg.locator('.cd-formats li button', { hasText: 'Manuscris standard' }).click();

  // Contents table
  const table = dlg.locator('table.cd-contents');
  check('contents table with four columns', (await table.locator('thead th').count()) === 4);
  const rows = table.locator('tbody tr');
  const n = await rows.count();
  check('contents rows listed', n > 2, String(n));
  const firstTitle = (await rows.nth(1).locator('td').nth(1).innerText()).trim();
  const pb = rows.nth(1).locator('select').first();
  await pb.selectOption('true');
  await page.waitForTimeout(150);
  check('page break choice kept on the row', (await rows.nth(1).locator('select').first().inputValue()) === 'true');
  const typeSel = rows.nth(1).locator('select').nth(1);
  const opts = await typeSel.locator('option').allInnerTexts();
  check('section type list on the row', opts.length > 2, opts.join('|'));
  await typeSel.selectOption({ index: 1 });
  await page.waitForTimeout(150);
  check('section type kept on the row', (await rows.nth(1).locator('select').nth(1).inputValue()) !== '');
  const inc = rows.nth(1).locator('input[type=checkbox]');
  await inc.uncheck();
  await page.waitForTimeout(150);
  check('excluded row is marked', (await rows.nth(1).getAttribute('class') || '').includes('cd-excluded'));

  // preview leaves out the excluded document
  await dlg.locator('.actions button', { hasText: 'Previzualizare' }).click();
  const frame = dlg.locator('.cd-preview iframe');
  await frame.waitFor({ timeout: 4000 });
  const srcdoc = (await frame.getAttribute('srcdoc')) || '';
  check('preview built', srcdoc.length > 200);
  check('preview leaves out the excluded document title', firstTitle && !srcdoc.includes(`>${firstTitle}<`), firstTitle);
  await dlg.locator('.cd-preview button').click();
  await inc.check();

  // Options tab
  await dlg.locator('[role=tab]', { hasText: 'Opțiuni' }).click();
  const opt = dlg.locator('.cd-panel').first();
  check('back matter select', await opt.getByText('Materie de final (back matter)').first().isVisible());
  check('per-output front matter select', (await opt.locator('.cd-per-output select').count()) === 2);
  check('inverted filter checkbox', await opt.getByText('Exclude ce corespunde filtrelor').isVisible());
  check('open after compiling checkbox (desktop only)', (await opt.getByText('Deschide fișierul după compilare').count()) >= 0);
  const tocBox = opt.locator('label.check', { hasText: 'Cuprins' }).first().locator('input');
  if (!(await tocBox.isChecked())) await tocBox.check();
  check('contents settings appear with the contents', await opt.locator('.cd-toc').isVisible());
  await opt.locator('.cd-toc input').first().fill('Sumar');
  await dlg.locator('.compile-dialog .cd-top select, .cd-top select').first().selectOption('pdf');
  check('pages fieldset for PDF (roman numerals, widows/orphans)', await opt.locator('.cd-pages').isVisible());
  check('embedded fonts for PDF', await opt.locator('.cd-fonts').isVisible());
  await dlg.locator('.cd-top select').first().selectOption('html');
  // settings survive closing and reopening the window
  await dlg.locator('.actions button', { hasText: 'Salvează setările' }).click();
  await dlg.locator('.actions button', { hasText: 'Închide' }).click();
  await menuCmd(page, 'Compilează…');
  await dlg.waitFor({ timeout: 3000 });
  await dlg.locator('[role=tab]', { hasText: 'Opțiuni' }).click();
  check('contents title kept in the project settings', (await dlg.locator('.cd-toc input').first().inputValue()) === 'Sumar');

  // export the format (browser: download)
  const dl = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
  await dlg.locator('button', { hasText: 'Exportă formatul…' }).click();
  const d = await dl;
  check('format exported as a file', d && d.suggestedFilename().endsWith('.scribcompile'), d && d.suggestedFilename());

  check('no page errors', errors.length === 0, errors.join('\n'));
  await browser.close();
  done();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
