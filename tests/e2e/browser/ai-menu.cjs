// AI menu: everything AI in one menu (with submenus), keyboard navigation of submenus,
// "Setări AI…" opens Settings on the AI tab, MCP item hidden in browser mode (no api.mcpConnectInfo),
// and with AI off only I-REP (+ AI settings to turn it back on) remains. The old top-bar
// "Asistent AI" / "I-REP" buttons are gone.
const { open, check, done, menuPick } = require('./_helpers.cjs');
(async () => {
  const { browser, page: p, errors } = await open();
  const aiBtn = () => p.locator('header.toolbar .menu > button').filter({ hasText: /^AI/ }).first();
  const items = () => p.locator('.menu-pop:not(.menu-sub) > [role=menuitem], .menu-pop:not(.menu-sub) > .menu-subwrap > [role=menuitem]').allInnerTexts();
  check('no "Asistent AI" toolbar button', (await p.locator('header.toolbar > button', { hasText: 'Asistent AI' }).count()) === 0);
  check('no I-REP toolbar button', (await p.locator('header.toolbar > button', { hasText: 'I-REP' }).count()) === 0);
  check('AI menu present', (await aiBtn().count()) === 1);
  await aiBtn().click();
  const top = (await items()).map((s) => s.replace(/\s+/g, ' ').trim());
  for (const l of ['Asistent AI', 'I-REP / I-EDIT', 'AI pe selecție', 'AI pe toată cartea', 'NotebookLM', 'Setări AI…']) check(`AI menu has ${l}`, top.some((x) => x.startsWith(l)), top.join(' | '));
  check('MCP item hidden in browser mode', !top.some((x) => x.includes('MCP')));
  await p.locator('.menu-pop [role=menuitem]', { hasText: 'AI pe selecție' }).hover();
  await p.waitForTimeout(100);
  const sub = (await p.locator('.menu-sub [role=menuitem]').allInnerTexts()).join(' | ');
  for (const l of ['AI: cercetare pe selecție', 'AI: explică termenul selectat', 'AI: corectează selecția', 'AI: tradu selecția']) check(`selection submenu has ${l}`, sub.includes(l), sub);
  const box = await p.locator('.menu-sub').boundingBox();
  const vw = p.viewportSize().width;
  check('submenu inside the viewport', box && box.x >= 0 && box.x + box.width <= vw, JSON.stringify(box));
  await p.keyboard.press('Escape');
  await p.keyboard.press('Escape');
  // keyboard: Enter opens, ↓ to the submenu item, → opens it, ← returns, Esc closes
  await aiBtn().focus();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(80);
  for (let i = 0; i < 6; i++) {
    if ((await p.evaluate(() => document.activeElement.textContent)).startsWith('AI pe selecție')) break;
    await p.keyboard.press('ArrowDown');
  }
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(100);
  check('→ opens the submenu with focus inside', await p.evaluate(() => Boolean(document.activeElement.closest('.menu-sub'))));
  await p.keyboard.press('ArrowDown');
  check('↓ moves inside the submenu', await p.evaluate(() => Boolean(document.activeElement.closest('.menu-sub'))));
  await p.keyboard.press('ArrowLeft');
  await p.waitForTimeout(80);
  check('← closes the submenu, focus on its item', (await p.locator('.menu-sub').count()) === 0 && (await p.evaluate(() => document.activeElement.textContent)).startsWith('AI pe selecție'));
  await p.keyboard.press('Escape');
  check('Esc closes the menu', (await p.locator('.menu-pop').count()) === 0);
  // Setări AI… → Settings on the AI tab
  await menuPick(p, 'AI', 'Setări AI…');
  await p.waitForSelector('.settings-dialog');
  check('Settings open on the AI tab', /AI/.test(await p.locator('.settings-dialog [role=tab][aria-selected=true]').innerText()));
  // turn AI off
  await p.locator('.settings-dialog input[type=checkbox]').first().uncheck();
  await p.locator('.settings-dialog button:has-text("Salvează"), .settings-dialog button:has-text("OK")').first().click().catch(() => p.keyboard.press('Escape'));
  await p.waitForTimeout(400);
  await aiBtn().click();
  const off = (await items()).map((s) => s.trim());
  check('AI off: I-REP stays', off.includes('I-REP'), off.join(' | '));
  check('AI off: AI-only items hidden', !off.some((x) => /Asistent AI|AI pe selecție|AI pe toată cartea|MCP/.test(x)), off.join(' | '));
  await p.keyboard.press('Escape');
  await menuPick(p, 'AI', 'I-REP');
  check('I-REP opens with AI off', (await p.locator('.editorial').count()) === 1);
  check('no page errors', !errors.length, errors.join(' | '));
  await browser.close();
  done();
})();
