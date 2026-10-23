// Format bar keyboard use (WAI-ARIA toolbar) + priority overflow.
const { open, ed, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  const active = () => page.evaluate(() => { const a = document.activeElement; return { label: a.getAttribute('aria-label') || a.textContent.trim(), tab: a.getAttribute('tabindex'), inBar: !!a.closest('.format-bar'), pm: a.classList.contains('ProseMirror'), item: a.getAttribute('role') }; });
  // priority: frequent actions visible at 1400px and at a narrow pane
  for (const w of [1400, 1000]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(250);
    const vis = await page.evaluate(() => { const b = document.querySelector('.pane .format-bar'); return [...b.querySelectorAll(':scope > .fb-group button, :scope > .fb-group select')].map((x) => x.getAttribute('aria-label') || x.textContent.trim()); });
    const need = ['Stilul paragrafului', 'Bold (Ctrl+B)', 'Italic (Ctrl+I)', 'Subliniat (Ctrl+U)', 'Comentariu pe textul selectat', 'Notă de subsol (dublu-clic pe număr pentru editare)', 'Link extern (Ctrl+L)', 'Highlight'];
    const miss = need.filter((n) => !vis.includes(n));
    check(`@${w}: frequent actions visible`, !miss.length, miss.join(', '));
  }
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForTimeout(250);
  // single tab stop
  const stops = await page.evaluate(() => [...document.querySelector('.pane .format-bar').querySelectorAll('button,select,input')].filter((e) => e.tabIndex >= 0).length);
  check('toolbar has exactly one tab stop', stops === 1, String(stops));
  const unlabeled = await page.evaluate(() => [...document.querySelectorAll('.pane .format-bar button')].filter((b) => !b.getAttribute('aria-label') && !b.textContent.trim().match(/[A-Za-zăîșțâ]{2}/)).map((b) => b.outerHTML.slice(0, 80)));
  check('every icon button has aria-label', !unlabeled.length, unlabeled.join(' | '));
  await page.locator('.pane .format-bar select').first().focus();
  let a = await active();
  check('focus on first control (style select)', a.label === 'Stilul paragrafului', JSON.stringify(a));
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  a = await active();
  check('ArrowRight moves through toolbar, roving tabindex 0', a.inBar && a.tab === '0', JSON.stringify(a));
  await page.keyboard.press('ArrowRight'); // off the selects (Home/End keep their native meaning there)
  await page.keyboard.press('Home');
  check('Home → first control', (await active()).label === 'Stilul paragrafului');
  // focus ring visible (classic + dark)
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft');
    const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 1 ? s.outlineColor : null; });
    check(`${theme}: focus ring visible`, !!ring, String(ring));
  }
  // Tab leaves toolbar into the editor
  await page.keyboard.press('Tab');
  a = await active();
  check('Tab from toolbar → editor', a.pm, JSON.stringify(a));
  await page.keyboard.press('Shift+Tab');
  a = await active();
  check('Shift+Tab back to the remembered toolbar control', a.inBar && a.label === 'Stilul paragrafului', JSON.stringify(a));
  // Menus: go to "Inserează", ArrowDown opens + focuses first item, Esc closes and returns
  for (let i = 0; i < 40 && (await active()).label !== 'Inserează ▾'; i++) await page.keyboard.press('ArrowRight');
  check('reached Inserează by arrows', (await active()).label === 'Inserează ▾');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(50);
  a = await active();
  check('ArrowDown opens menu, focus on first item', a.item === 'menuitem', JSON.stringify(a));
  await page.keyboard.press('ArrowDown');
  check('ArrowDown moves in menu', (await active()).item === 'menuitem');
  await page.keyboard.press('Escape');
  a = await active();
  check('Esc closes menu, focus back on button', a.label === 'Inserează ▾' && (await page.locator('.pane .format-bar .menu-pop').count()) === 0, JSON.stringify(a));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(50);
  check('Enter opens menu with focus inside', (await active()).item === 'menuitem');
  await page.keyboard.press('Escape');
  await page.keyboard.press(' ');
  await page.waitForTimeout(50);
  check('Space opens menu with focus inside', (await active()).item === 'menuitem');
  await page.keyboard.press('Escape');
  // overflow »
  await page.keyboard.press('End');
  a = await active();
  check('End → » button', a.label === 'Mai multe comenzi de formatare', JSON.stringify(a));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(50);
  a = await active();
  check('Enter on » opens overflow with focus inside', await page.evaluate(() => !!document.activeElement.closest('.fb-overflow-pop')), JSON.stringify(a));
  await page.keyboard.press('ArrowRight');
  check('arrows inside overflow', await page.evaluate(() => !!document.activeElement.closest('.fb-overflow-pop')));
  await page.keyboard.press('Escape');
  a = await active();
  check('Esc closes overflow, focus on »', a.label === 'Mai multe comenzi de formatare' && (await page.locator('.fb-overflow-pop').count()) === 0, JSON.stringify(a));
  // B via keyboard applies bold to a selection
  await page.evaluate(() => { const e = document.querySelector('.pane .ProseMirror').editor; e.commands.setTextSelection({ from: 1, to: 4 }); });
  await page.keyboard.press('Home');
  for (let i = 0; i < 10 && (await active()).label !== 'Bold (Ctrl+B)'; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  check('Enter on B toggles bold', /<strong>/.test(await ed(page).innerHTML()));
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
