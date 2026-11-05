// Repro: (a) Research panel toggled alone never shows; (b) AI turned off while the AI panel is open leaves an empty side column.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { check, done, menuPick } = require('./_helpers.cjs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
  await p.goto((process.env.SCRIBNER_URL || 'http://localhost:4183/?demo')); await p.getByText('Deschide proiect .scribner').first().click(); await p.waitForSelector('.pane .ProseMirror');
  const menuClick = async (label) => { const n = await p.locator('.menu').count(); for (let i = 0; i < n; i++) { await p.locator('.menu').nth(i).locator('button').first().click(); await p.waitForTimeout(80); const it = p.locator('.menu').nth(i).getByText(label, { exact: true }); if (await it.count()) { await it.first().click(); await p.waitForTimeout(300); return; } await p.keyboard.press('Escape'); } };
  // close inspector if open
  if (await p.locator('.side .inspector').count()) await p.locator('button[data-tb=inspector]').click();
  await p.waitForTimeout(200);
  await menuClick('Cercetare în proiect (RAG)');
  check('(a) research panel visible when toggled alone', await p.locator('.research-panel').count() === 1);
  await menuClick('Cercetare în proiect (RAG)');
  await menuPick(p, 'AI', 'Asistent AI'); await p.waitForTimeout(200);
  await p.locator('.menu').first().locator('button').first().click().catch(()=>{});
  await p.keyboard.press('Escape');
  // turn AI off in Settings
  const n = await p.locator('.menu').count();
  for (let i = 0; i < n; i++) { await p.locator('.menu').nth(i).locator('button').first().click(); const it = p.locator('.menu').nth(i).getByText('Setări program…'); if (await it.count()) { await it.first().click(); break; } await p.keyboard.press('Escape'); }
  await p.waitForTimeout(300);
  await p.locator('.settings-dialog [role=tab]:has-text("AI")').click();
  const box = p.locator('.settings-dialog input[type=checkbox]').first();
  await box.uncheck();
  await p.locator('.settings-dialog button:has-text("Salvează"), .settings-dialog button:has-text("OK")').first().click().catch(async () => p.keyboard.press('Escape'));
  await p.waitForTimeout(500);
  const side = await p.locator('.side').count();
  const sideText = side ? (await p.locator('.side').innerText()).trim() : '';
  check('(b) no empty side column after AI off', !(side && !sideText), `side=${side} text=${JSON.stringify(sideText.slice(0, 40))}`);
  await p.locator('header.toolbar .menu > button').filter({ hasText: /^AI/ }).first().click();
  check('(b) AI assistant item hidden', await p.locator('.menu-pop [role=menuitem]', { hasText: 'Asistent AI' }).count() === 0);
  await p.keyboard.press('Escape');
  done(); await b.close();
})();
