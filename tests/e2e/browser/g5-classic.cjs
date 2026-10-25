// G5 classic features: line numbers, zoom per pane, format painter, ruler, styles panel,
// lock in place per pane, per-pane history with recent list, equation editor.
const { open, ed, caretEnd, check, done, menuCmd, answerAppDialog } = require('./_helpers.cjs');

(async () => {
  const { browser, page, errors } = await open();
  const row = (t) => page.locator('.binder-row', { hasText: t }).first();
  const mainTitle = () => page.locator('.sc-header-bar strong').first().innerText();

  // 1. Line numbers
  await caretEnd(page);
  await menuCmd(page, 'Numere de rând');
  await page.waitForTimeout(200);
  const nums = await page.locator('.pane .line-numbers-gutter .line-no').allInnerTexts();
  check('line numbers shown in a gutter', nums.length > 1 && nums[0] === '1' && nums[1] === '2', nums.slice(0, 5).join(','));
  const printHidden = await page.evaluate(() => [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.media && /print/.test(r.media.mediaText) && /line-numbers-gutter/.test(r.cssText)); } catch { return false; } }));
  check('line numbers hidden when printing', printHidden);
  const inHtml = await page.evaluate(() => document.querySelector('.pane .ProseMirror').editor.getHTML().includes('line-no'));
  check('line numbers are not part of the text', !inHtml);
  await menuCmd(page, 'Numere de rând');
  check('line numbers toggle off', (await page.locator('.line-numbers-gutter').count()) === 0);

  // 2. Separate zoom per pane
  await page.locator('button.split-btn').click();
  await page.waitForSelector('.pane.second .ProseMirror');
  const zooms = page.locator('.zoom-select');
  check('each pane has its own footer zoom', (await zooms.count()) === 2, String(await zooms.count()));
  await page.locator('.pane.second .zoom-select').selectOption('150');
  await page.waitForTimeout(150);
  const zv = await page.evaluate(() => [...document.querySelectorAll('.page')].slice(0, 2).map((p) => p.style.getPropertyValue('--zoom')));
  check('split pane zoom applies to that pane only', zv[0] === '' && zv[1] === '1.5', JSON.stringify(zv));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('scribner-editor-view') || '{}'));
  check('pane zoom persisted', stored.zoom2 === 150 && (stored.zoom || 100) === 100, JSON.stringify({ z: stored.zoom, z2: stored.zoom2 }));
  await page.locator('.pane:not(.second) .zoom-select').first().selectOption('125');
  await page.waitForTimeout(150);
  const zv2 = await page.evaluate(() => [...document.querySelectorAll('.page')].slice(0, 2).map((p) => p.style.getPropertyValue('--zoom')));
  check('main pane zoom independent', zv2[0] === '1.25' && zv2[1] === '1.5', JSON.stringify(zv2));
  await page.locator('.pane:not(.second) .zoom-select').first().selectOption('100');
  await page.locator('.pane.second .zoom-select').selectOption('100');

  // 6. Lock in place + 7. per-pane history
  const t0 = await mainTitle();
  await page.locator('.sc-header-bar .pane-lock').click();
  check('lock icon pressed in header', (await page.locator('.sc-header-bar .pane-lock').getAttribute('aria-pressed')) === 'true');
  const splitBefore = await page.locator('.pane.second .pane-title').innerText();
  await row('Drumul').click();
  await page.waitForTimeout(300);
  check('locked main pane does not follow the binder', (await mainTitle()) === t0, await mainTitle());
  const splitAfter = await page.locator('.pane.second .pane-title').innerText();
  check('binder click opens in the other pane', splitAfter.includes('Drumul') && splitAfter !== splitBefore, `${splitBefore} → ${splitAfter}`);
  await row('Căutarea').click();
  await page.waitForTimeout(300);
  check('second binder click also goes to pane 2', (await page.locator('.pane.second .pane-title').innerText()).includes('Căutarea'));
  await page.locator('.pane.second .pane-back').click();
  await page.waitForTimeout(250);
  check('pane 2 back', (await page.locator('.pane.second .pane-title').innerText()).includes('Drumul'));
  await page.locator('.pane.second .pane-forward').click();
  await page.waitForTimeout(250);
  check('pane 2 forward', (await page.locator('.pane.second .pane-title').innerText()).includes('Căutarea'));
  await page.locator('.pane.second .pane-history').click();
  const recent = await page.locator('.pane.second .pane-history-list li').allInnerTexts();
  check('pane 2 recent list', recent.length >= 3 && recent[0].includes('Căutarea'), recent.join(' | '));
  await page.locator('.pane.second .pane-history-list li').nth(recent.length - 1).click();
  await page.waitForTimeout(250);
  check('jump from the recent list', (await page.locator('.pane.second .pane-title').innerText()) === splitBefore);
  check('main pane untouched by pane 2 history', (await mainTitle()) === t0);
  // lock pane 2 too: nothing changes
  await page.locator('.pane.second .pane-lock').click();
  await row('Începutul').click();
  await page.waitForTimeout(250);
  check('both locked: binder changes neither pane', (await mainTitle()) === t0 && (await page.locator('.pane.second .pane-title').innerText()) === splitBefore);
  await page.locator('.pane.second .pane-lock').click();
  await page.locator('.sc-header-bar .pane-lock').click();
  await menuCmd(page, 'Fixează pe loc');
  check('View › Lock in place toggles the active pane', (await page.locator('.pane-lock[aria-pressed="true"]').count()) === 1);
  await menuCmd(page, 'Fixează pe loc');
  await page.locator('.pane.second .pane-head button.link', { hasText: /Închide|Close/ }).click();
  await page.waitForTimeout(200);
  // main pane history dropdown
  await row('Drumul').click();
  await page.waitForTimeout(250);
  await row('Scrisoarea').click();
  await page.waitForTimeout(250);
  await page.locator('.sc-header-bar .pane-history').click();
  const mainRecent = await page.locator('.sc-header-bar .pane-history-list li').allInnerTexts();
  check('main pane recent list', mainRecent.length >= 3 && mainRecent[0].includes('Scrisoarea'), mainRecent.join(' | '));
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 5);

  // 3. Format painter
  await caretEnd(page);
  await page.keyboard.press('Enter');
  await page.keyboard.type('sursa tinta');
  await page.waitForTimeout(350);
  const selWord = (w, caret) => page.evaluate(([w, caret]) => {
    const e = document.querySelector('.pane .ProseMirror').editor;
    let at = null;
    e.state.doc.descendants((n, pos) => { if (n.isText && at === null && n.text.includes(w)) at = pos + n.text.lastIndexOf(w); });
    if (caret) e.chain().focus().setTextSelection(at + 2).run();
    else e.chain().focus().setTextSelection({ from: at, to: at + w.length }).run();
  }, [w, caret]);
  await selWord('sursa', false);
  await page.keyboard.press('Control+b');
  await page.keyboard.press('Control+i');
  await menuCmd(page, 'Copiază formatarea');
  await selWord('tinta', true);
  await menuCmd(page, 'Lipește formatarea');
  const painted = await page.evaluate(() => document.querySelector('.pane .ProseMirror').editor.getHTML());
  check('format painter pastes bold+italic on the word', /<strong><em>tinta<\/em><\/strong>|<em><strong>tinta<\/strong><\/em>/.test(painted), painted.slice(-160));

  // 4. Ruler: first-line indent drag + tab stop
  await page.keyboard.press('Control+Alt+Shift+R');
  await page.waitForTimeout(100);
  const ruler = page.locator('.pane .ruler').first();
  const cmPx = 96 / 2.54;
  const rb = await ruler.boundingBox();
  const fh = await ruler.locator('.ruler-handle.first').boundingBox();
  await page.mouse.move(fh.x + fh.width / 2, fh.y + fh.height / 2);
  await page.mouse.down();
  await page.mouse.move(rb.x + 1 * cmPx, fh.y + fh.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  await page.mouse.click(rb.x + 6 * cmPx, rb.y + 3);
  await page.waitForTimeout(100);
  const pAttrs = await page.evaluate(() => { const e = document.querySelector('.pane .ProseMirror').editor; return e.state.selection.$from.parent.attrs; });
  check('ruler: first-line indent dragged', Math.abs((pAttrs.firstIndent || 0) - 1) < 0.3, JSON.stringify(pAttrs.firstIndent));
  check('ruler: click adds tab stop', /6/.test(String(pAttrs.tabStops || '')), String(pAttrs.tabStops));
  await page.keyboard.press('Control+Alt+Shift+R');

  // 5. Styles panel
  await menuCmd(page, 'Panou de stiluri');
  const panel = page.locator('.styles-panel');
  check('styles panel opens', (await panel.count()) === 1);
  await panel.locator('li[data-style-id="centrat"] .style-apply').click();
  await page.waitForTimeout(100);
  const ps = await page.evaluate(() => document.querySelector('.pane .ProseMirror').editor.state.selection.$from.parent.attrs.styleName);
  check('click applies paragraph style', ps === 'centrat', String(ps));
  check('panel shows the current style', (await panel.locator('li.on[data-style-id="centrat"]').count()) === 1 && (await panel.locator('.styles-current').innerText()).includes('Centrat'));
  await panel.locator('.style-add-para').click();
  await answerAppDialog(page, { text: 'Stil G5' });
  await page.waitForTimeout(200);
  check('+ from selection adds a style', (await panel.locator('li[data-style-id="stil-g5"]').count()) === 1);
  await panel.locator('li[data-style-id="stil-g5"] .style-rename').click();
  await answerAppDialog(page, { text: 'Stil G5 nou' });
  await page.waitForTimeout(150);
  check('rename style', (await panel.locator('li[data-style-id="stil-g5"]').innerText()).includes('Stil G5 nou'));
  await panel.locator('li[data-style-id="stil-g5"] .style-delete').click();
  await answerAppDialog(page);
  await page.waitForTimeout(150);
  check('delete style', (await panel.locator('li[data-style-id="stil-g5"]').count()) === 0);
  await panel.locator('.styles-panel-head button').click();
  check('styles panel closes', (await page.locator('.styles-panel').count()) === 0);

  // 8. Equation editor
  await caretEnd(page);
  await menuCmd(page, 'Ecuație…');
  const dlg = page.locator('.equation-dialog');
  check('equation dialog opens', (await dlg.count()) === 1);
  await dlg.locator('.equation-input').fill('\\frac{a}{b} + x^{2}');
  await page.waitForTimeout(100);
  check('live MathML preview', (await dlg.locator('.equation-render math mfrac').count()) === 1 && (await dlg.locator('.equation-render msup').count()) === 1);
  await dlg.locator('.equation-insert').click();
  await page.waitForTimeout(400);
  const img = await page.evaluate(() => { const i = [...document.querySelectorAll('.pane .ProseMirror img[alt^="$"]')].pop(); return i ? { alt: i.alt, src: i.src.slice(0, 22) } : null; });
  check('equation inserted as image with LaTeX alt', img && img.alt === '$\\frac{a}{b} + x^{2}$' && /^data:image\/(png|svg)/.test(img.src), JSON.stringify(img));
  await page.locator('.pane .ProseMirror img[alt^="$"]').last().dblclick();
  await page.waitForTimeout(150);
  check('double-click reopens the equation', (await dlg.count()) === 1 && (await dlg.locator('.equation-input').inputValue()).includes('\\frac{a}{b}'));
  await page.keyboard.press('Escape');

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
