// P4 + P7: quick search in the toolbar with results in the binder, replace preview with
// exclusions, the Navigation / Behaviors panes in Options and the shortcut editor's search.
const { open, check, done, menuCmd } = require('./_helpers.cjs');
(async () => {
  const { browser, page: p, errors } = await open();
  p.on('dialog', (d) => d.accept());

  // Quick search: results replace the tree in the binder; Esc goes back.
  const qs = p.locator('.qs input[type=search]');
  check('quick search field in the toolbar', (await qs.count()) === 1);
  await qs.fill('a');
  await qs.press('Enter');
  await p.waitForTimeout(400);
  check('binder lists the results', (await p.locator('.binder-results-head').count()) === 1 && (await p.locator('.collection-list .binder-row').count()) > 0);
  check('rows show hit counts', (await p.locator('.collection-list .hit-count').count()) > 0);
  await p.locator('.qs .qs-opt').click();
  check('options menu opens', (await p.locator('.qs-pop').count()) === 1);
  await p.locator('.qs-pop label', { hasText: /^\s*Titlu/ }).locator('input').check();
  await p.waitForTimeout(200);
  await p.keyboard.press('Escape');
  await qs.press('Escape');
  await p.waitForTimeout(200);
  check('Esc goes back to the binder tree', (await p.locator('.binder-results-head').count()) === 0 && (await p.locator('ul.tree[role=tree]').count()) > 0);

  // Advanced search: preview of the replace, one checkbox per occurrence.
  // Project find and replace (Ctrl+Shift+F): documents can be left out; results go to the binder.
  await p.keyboard.press('Control+Shift+F');
  await p.waitForTimeout(300);
  const fd = p.locator('.modal[role=dialog]').first();
  await fd.locator('input').first().fill('e');
  await p.waitForTimeout(300);
  check('find dialog: one checkbox per document', (await fd.locator('.result > input[type=checkbox]').count()) > 0);
  await fd.getByRole('button', { name: 'Arată în binder' }).click();
  await p.waitForTimeout(300);
  check('find dialog: Show in binder', (await p.locator('.binder-results-head').count()) === 1);
  await p.locator('.binder-results-head .link').click();
  await p.locator('.qs .qs-opt').click();
  await p.locator('.qs-pop button', { hasText: 'Căutare avansată' }).click();
  await p.waitForTimeout(300);
  const dlg = p.locator('.modal[role=dialog]').filter({ hasText: 'Previzualizează înlocuirea' }).first();
  await dlg.locator('input').first().fill('e');
  await dlg.locator('input').nth(1).fill('E');
  await p.waitForTimeout(300);
  await dlg.getByRole('button', { name: /Previzualizează înlocuirea/ }).click();
  await p.waitForTimeout(300);
  const boxes = dlg.locator('.as-occ input[type=checkbox]');
  const n = await boxes.count();
  if (!n) console.log((await dlg.innerText()).slice(0, 1500));
  check('preview lists occurrences', n > 1, String(n));
  await boxes.first().uncheck();
  check('unchecked occurrence counted out', /Înlocuiește bifatele \(\d+\)/.test(await dlg.locator('.actions .primary').innerText()) && (await dlg.locator('.as-occ.off').count()) === 1);
  check('type, dates and formatting filters', (await dlg.locator('input[type=date]').count()) === 4 && (await dlg.locator('select[aria-label="Formatare"]').count()) === 1);
  await dlg.getByRole('button', { name: 'Arată în binder' }).click();
  await p.waitForTimeout(300);
  check('Show in binder closes and lists', (await p.locator('.binder-results-head').count()) === 1);
  await p.locator('.binder-results-head .link').click();

  // Options: Navigation and Behaviors panes.
  await menuCmd(p, 'Opțiuni');
  await p.waitForTimeout(300);
  const set = p.locator('.settings-dialog');
  await set.getByRole('tab', { name: 'Navigare' }).click();
  check('Navigation pane', (await set.locator('text=Fiecare document își păstrează poziția cursorului').count()) === 1);
  await set.getByRole('tab', { name: 'Comportament' }).click();
  check('Behaviors pane: folder double-click, drag into text, multi-selection', (await set.locator('select').count()) >= 8);
  await set.getByRole('tab', { name: 'General' }).click();
  check('General: startup choice and reset warnings', (await set.locator('text=La pornire').count()) === 1 && (await set.locator('text=Resetează avertizările ascunse').count()) === 1);
  await set.getByRole('button', { name: 'Anulează' }).click();
  await p.waitForTimeout(200);

  // Shortcut editor: find a command by its shortcut, move a taken one in one step.
  await menuCmd(p, 'Scurtături');
  await p.waitForTimeout(300);
  const sc = p.locator('.modal[role=dialog]').filter({ hasText: 'Caută după scurtătură' }).first();
  await sc.locator('label', { hasText: 'Caută după scurtătură' }).locator('input').press('Control+s');
  await p.waitForTimeout(150);
  const rows = await sc.locator('.shortcut-row').count();
  check('find by shortcut narrows to one command', rows === 1, String(rows));
  await sc.getByRole('button', { name: 'Toate comenzile' }).click();
  const compile = sc.locator('.shortcut-row', { hasText: /^Compil/ }).locator('input').first();
  await compile.focus();
  await p.keyboard.press('Control+s');
  await p.waitForTimeout(150);
  check('taken shortcut offers replace', (await sc.locator('text=Înlocuiește scurtătura existentă').count()) === 1);
  await sc.getByRole('button', { name: 'Înlocuiește scurtătura existentă' }).click();
  check('no conflicts after replace', (await sc.locator('.shortcut-row.conflict').count()) === 0);
  check('save / load set buttons', (await sc.getByRole('button', { name: 'Salvează set…' }).count()) === 1 && (await sc.getByRole('button', { name: 'Încarcă set…' }).count()) === 1);
  await sc.getByRole('button', { name: 'Anulează' }).click();

  check('no page errors', !errors.length, errors.join(' | '));
  await browser.close();
  done();
})();
