// Seeded random walk over binder documents with invariants: text typed into a document survives
// switching documents and views, undo removes it again, no page errors, no horizontal overflow
// at 900px width, and body text contrast >= 4.5 in the dark theme.
// SEED=n to reproduce one walk.
const { open, ed, caretEnd, check, done } = require('./_helpers.cjs');

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

async function setTheme(p, theme) {
  const menus = p.locator('header.toolbar .menu > button');
  for (let i = 0; i < (await menus.count()) && !(await p.locator('.settings-dialog').count()); i++) {
    await menus.nth(i).click();
    await p.waitForTimeout(60);
    const it = p.locator('.menu-pop button:not([disabled])').filter({ hasText: /^(Setări|Settings)…/ });
    if (await it.count()) await it.first().click(); else await p.keyboard.press('Escape');
    await p.waitForTimeout(150);
  }
  await p.locator('.settings-dialog [role=tab]').nth(1).click();
  await p.locator('.settings-dialog select').filter({ has: p.locator('option[value=sepia]') }).first().selectOption(theme);
  await p.locator('.settings-dialog .actions .primary').click();
  await p.waitForTimeout(300);
}

(async () => {
  const seeds = process.env.SEED ? [Number(process.env.SEED)] : [1, 2, 3];
  for (const seed of seeds) {
    const rand = rng(seed);
    const { browser, page, errors } = await open();
    const rows = page.locator('.binder-row:has(.title)');
    const n = await rows.count();
    const typed = new Map(); // title -> marker
    for (let step = 0; step < 12; step++) {
      const i = Math.floor(rand() * n);
      const r = rows.nth(i);
      const title = (await r.locator('.title').textContent()).trim();
      await r.click();
      await page.waitForTimeout(200);
      if (!(await page.locator('.pane .ProseMirror').count())) continue; // folder → corkboard
      const marker = `zq${seed}x${step}`;
      if (rand() < 0.6 && !typed.has(title)) {
        await caretEnd(page);
        await page.keyboard.type(' ' + marker);
        await page.waitForTimeout(120);
        typed.set(title, marker);
      }
      if (rand() < 0.2) { await page.keyboard.press('Control+2'); await page.waitForTimeout(150); await page.keyboard.press('Control+1'); await page.waitForTimeout(150); }
    }
    // Every marker is still there after the walk.
    for (const [title, marker] of typed) {
      await page.locator('.binder-row', { has: page.locator('.title', { hasText: title }) }).first().click();
      await page.waitForTimeout(250);
      const txt = (await ed(page).count()) ? await ed(page).innerText() : '';
      check(`seed${seed} "${title}" keeps typed text`, txt.includes(marker));
    }
    // Undo restores (within the current document; the editor is remounted per document, so
    // history does not survive a switch — reported separately).
    if (await ed(page).count()) {
      const before = await ed(page).innerText();
      await caretEnd(page);
      await page.keyboard.type(' undomark');
      await page.waitForTimeout(150);
      for (let k = 0; k < 6 && (await ed(page).innerText()).includes('undomark'); k++) { await page.keyboard.press('Control+z'); await page.waitForTimeout(60); }
      check(`seed${seed} undo restores text`, (await ed(page).innerText()) === before, JSON.stringify([before.slice(-80), (await ed(page).innerText()).slice(-80)]));
    }
    // Narrow window: no horizontal page overflow.
    await page.setViewportSize({ width: 900, height: 700 });
    await page.waitForTimeout(300);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`seed${seed} no horizontal overflow at 900px`, over <= 1, `${over}px`);
    // Dark theme contrast of editor text.
    await setTheme(page, 'dark');
    const ratio = await page.evaluate(() => {
      const el = document.querySelector('.pane .ProseMirror p') || document.querySelector('.pane .ProseMirror');
      const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      let bgEl = el; let bg = 'rgba(0, 0, 0, 0)';
      while (bgEl && (bg = getComputedStyle(bgEl).backgroundColor).match(/rgba\(.*, 0\)$/)) bgEl = bgEl.parentElement;
      const a = lum(rgb(getComputedStyle(el).color)); const b = lum(rgb(bg));
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    check(`seed${seed} dark editor text contrast >= 4.5`, ratio >= 4.5, ratio.toFixed(2));
    check(`seed${seed} no page errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
    await browser.close();
  }
  done();
})();
