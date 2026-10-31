// Menu bar: order, Insert / Format / Window menus, Edit › Find › Find Next (Ctrl+G), Navigate › Go To.
const { open, ed, caretEnd, check, done, menuPick } = require('./_helpers.cjs');

(async () => {
  const { browser, page, errors } = await open();
  const bar = await page.locator('header.toolbar .menu > button').allInnerTexts();
  const names = bar.map((s) => s.replace(/\s*▾\s*$/, '').trim());
  // Menu reorg 2026-10-31: APPLICATION (Program) / PROJECT (Fișier, Proiect) / WORKFLOW / Fereastră, Ajutor.
  const want = ['Program', 'Fișier', 'Proiect', 'Editare', 'Inserare', 'Format', 'Documente', 'Vizualizare', 'Navigare', 'Unelte', 'Fereastră'];
  check('menu bar order', want.every((w, i) => names.indexOf(w) >= 0 && (i === 0 || names.indexOf(w) > names.indexOf(want[i - 1]))), names.join(' | '));

  await caretEnd(page);
  await menuPick(page, 'Inserare', 'Caractere speciale', 'Linie de dialog');
  check('Insert › Special characters › dialogue dash', (await ed(page).innerText()).includes('— '));

  await page.keyboard.type('alfa beta alfa');
  await page.keyboard.down('Shift');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.up('Shift');
  await menuPick(page, 'Format', 'Font', 'Aldin');
  check('Format › Font › Bold', (await ed(page).locator('strong').allInnerTexts()).some((t) => t.includes('alfa')));

  await menuPick(page, 'Editare', 'Găsește', 'Folosește selecția');
  await page.keyboard.press('Control+Home');
  await page.keyboard.press('Control+g');
  await page.waitForTimeout(100);
  const sel = await page.evaluate(() => String(window.getSelection()));
  check('Ctrl+G finds the next match of the selection', sel === 'alfa', sel);
  check('Ctrl+G opened no dialog', (await page.locator('.modal').count()) === 0);

  await page.locator('header.toolbar .menu > button').filter({ hasText: /^Navigare/ }).first().click();
  await page.locator('.menu-pop [role="menuitem"]').filter({ hasText: 'Mergi la' }).first().hover();
  await page.waitForTimeout(100);
  const sub = await page.locator('.menu-sub [role="menuitem"]').allInnerTexts();
  check('Navigate › Go To lists the binder', sub.some((s) => s.includes('Manuscris')) && sub.length > 3, String(sub.length));
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  await page.locator('header.toolbar .menu > button').filter({ hasText: /^Fereastră/ }).first().click();
  const win = await page.locator('.menu-pop [role="menuitem"]').allInnerTexts();
  check('Window: no native-only items in the browser', !win.some((s) => s.includes('Minimizează')) && win.some((s) => s.includes('Ecran complet')), win.join(' | '));
  await page.keyboard.press('Escape');

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
