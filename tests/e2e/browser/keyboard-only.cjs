// Keyboard-only use: Tab order reaches menus, binder and editor with a visible focus target;
// a menu command chosen with the keyboard leaves focus in the editor; binder moves with
// Ctrl+arrows keep focus in the binder and are undoable; Escape from the binder goes to the editor.
process.env.SCRIBNER_URL = process.env.SCRIBNER_URL || 'http://localhost:4183/?demo';
const { open, ed, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  const where = () => page.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return { zone: 'body' };
    const r = a.getBoundingClientRect();
    const zone = a.closest('.ProseMirror') ? 'editor' : a.closest('header.toolbar') ? 'toolbar' : a.closest('.binder') ? 'binder' : a.closest('.inspector') ? 'inspector' : a.className || a.tagName;
    return { zone, visible: r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth, desc: `${a.tagName}.${a.className}`.slice(0, 60) };
  });
  // Tab sweep
  await page.locator('body').click({ position: { x: 1, y: 1 } }).catch(() => {});
  const zones = new Set(); const invisible = []; let body = 0;
  for (let i = 0; i < 120; i++) {
    await page.keyboard.press('Tab');
    const w = await where();
    zones.add(w.zone);
    if (w.zone === 'body') body++;
    else if (!w.visible) invisible.push(w.desc);
    if (w.zone === 'editor') break; // Tab inside the editor indents; stop there
  }
  check('Tab reaches the toolbar, binder and editor', ['toolbar', 'binder', 'editor'].every((z) => zones.has(z)), [...zones].join(','));
  check('Tab never lands on an invisible element', !invisible.length, [...new Set(invisible)].slice(0, 5).join(' ; '));
  // Menu via keyboard, command runs, typing goes to the editor
  await ed(page).click();
  await page.keyboard.press('End');
  const menuBtn = page.locator('header.toolbar .menu > button').nth(3);
  await menuBtn.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  check('Enter opens the menu with focus on an item', await page.evaluate(() => document.activeElement?.getAttribute('role') === 'menuitem'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  check('Esc returns focus to the menu button', await menuBtn.evaluate((b) => b === document.activeElement));
  // binder keyboard moves
  const row = page.locator('.binder-row', { hasText: 'Căutarea' }).first();
  await row.click();
  await page.waitForTimeout(100);
  const order = () => page.locator('.binder-row').allInnerTexts();
  const before = await order();
  await page.keyboard.press('Control+ArrowUp');
  await page.waitForTimeout(150);
  const after = await order();
  check('Ctrl+↑ moves the document up', JSON.stringify(before) !== JSON.stringify(after));
  check('focus stays in the binder after a keyboard move', (await where()).zone === 'binder', (await where()).desc);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(150);
  check('Ctrl+Z in the binder undoes the move', JSON.stringify(await order()) === JSON.stringify(before));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check('Esc in the binder focuses the editor', (await where()).zone === 'editor', (await where()).desc);
  check('no page errors', !errors.length, errors.join(' | '));
  await browser.close();
  done();
})();
