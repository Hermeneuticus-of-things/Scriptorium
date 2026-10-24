// View → Customize Toolbar…: remove/add/reorder items (buttons and keyboard), display mode,
// format bar items, persistence across a reload (demo keeps it in localStorage), restore defaults.
const { open, check, done, menuPick } = require('./_helpers.cjs');
(async () => {
  const { browser, page: p, errors } = await open();
  const tbIds = () => p.$$eval('header.toolbar > [data-tb]', (els) => els.map((e) => e.dataset.tb));
  check('default toolbar: compile + inspector', JSON.stringify(await tbIds()) === JSON.stringify(['home', 'back', 'forward', 'compile', 'inspector']), JSON.stringify(await tbIds()));
  await menuPick(p, 'Vizualizare', 'Personalizează bara de instrumente…');
  const dlg = p.locator('.tb-customize');
  check('dialog opens', (await dlg.count()) === 1);
  const cur = dlg.locator('.tb-list').nth(1);
  const av = dlg.locator('.tb-list').nth(0);
  // remove Inspector
  await cur.locator('li', { hasText: 'Inspector' }).click();
  await dlg.getByRole('button', { name: 'Scoate' }).click();
  // add Split editor after Compile, then move it up with the keyboard (Alt+↑)
  await cur.locator('li', { hasText: 'Compilează' }).click();
  await av.locator('li', { hasText: 'Împarte editorul' }).click();
  await dlg.getByRole('button', { name: 'Adaugă' }).click();
  await cur.focus();
  await p.keyboard.press('Alt+ArrowUp');
  const curList = await cur.locator('li').allInnerTexts();
  const iS = curList.findIndex((x) => x.includes('Împarte editorul'));
  const iC = curList.findIndex((x) => x.includes('Compilează'));
  check('Alt+↑ moved the item before Compile', iS >= 0 && iS < iC, curList.join(' | '));
  // drag Separator into the list
  await av.locator('li', { hasText: 'Separator' }).dragTo(cur.locator('li').nth(4));
  check('drag adds a separator', (await cur.locator('li', { hasText: 'Separator' }).count()) === 1);
  await dlg.locator('select').selectOption('icon');
  // format bar: remove undo/redo
  await dlg.getByRole('tab', { name: 'Bara de formatare' }).click();
  await cur.locator('li', { hasText: 'Anulează / Refă' }).click();
  await dlg.getByRole('button', { name: 'Scoate' }).click();
  await dlg.getByRole('button', { name: 'Salvează' }).click();
  await p.waitForTimeout(300);
  const after = await tbIds();
  check('Inspector removed, Split added before Compile', !after.includes('inspector') && after.indexOf('splitEditor') >= 0 && after.indexOf('splitEditor') < after.indexOf('compile'), JSON.stringify(after));
  check('separator shown', (await p.locator('header.toolbar > .tb-sep').count()) === 1);
  check('icon-only display: no labels', (await p.locator('header.toolbar .tb-label').count()) === 0);
  check('format bar: undo gone', (await p.locator('.format-bar button[title^="Anulează (Ctrl+Z)"]').count()) === 0);
  check('Inspector still reachable from the View menu', await (async () => { await p.locator('header.toolbar .menu > button').filter({ hasText: /^Vizualizare/ }).click(); const n = await p.locator('.menu-pop [role=menuitem]', { hasText: 'Inspector' }).count(); await p.keyboard.press('Escape'); return n > 0; })());
  // reload
  await p.reload();
  await p.getByText('Deschide proiect .scribner').first().click();
  await p.waitForSelector('.pane .ProseMirror');
  const reloaded = await tbIds();
  check('customization survives reload', JSON.stringify(reloaded) === JSON.stringify(after), JSON.stringify(reloaded));
  check('format bar customization survives reload', (await p.locator('.format-bar button[title^="Anulează (Ctrl+Z)"]').count()) === 0);
  // restore defaults
  await menuPick(p, 'Vizualizare', 'Personalizează bara de instrumente…');
  await p.locator('.tb-customize').getByRole('button', { name: 'Restabilește implicit' }).click();
  await p.locator('.tb-customize').getByRole('button', { name: 'Salvează' }).click();
  await p.waitForTimeout(300);
  check('defaults restored', JSON.stringify(await tbIds()) === JSON.stringify(['home', 'back', 'forward', 'compile', 'inspector']), JSON.stringify(await tbIds()));
  check('no page errors', !errors.length, errors.join(' | '));
  await browser.close();
  done();
})();
