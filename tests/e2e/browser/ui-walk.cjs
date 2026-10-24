// Seeded random walk over the UI: menus, views, context menus, Escape, in RO/EN, light/dark, several
// window sizes. After every step: no page/console errors, no raw i18n keys, no Romanian in the
// top-most popup in English mode, popups fully inside the viewport.
// Usage: SEED=1 STEPS=120 node tests/e2e/browser/ui-walk.cjs
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.SCRIBNER_URL || 'http://localhost:4191/?demo';
const STEPS = Number(process.env.STEPS || 80);
const SEEDS = (process.env.SEED || '1,2,3').split(',').map(Number);
const rng = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const SKIP = /Ieșire|Quit|Exit|Închide proiectul|Close project|Închide fereastra|Close window|Golește coșul|Empty trash|Reîncarcă|Reload|Șterge|Delete|Mută în coș|Move to trash|Revert|Revino la|Tutorial/i;
const RO = /[ăâîșțĂÂÎȘȚ]/;
const findings = new Map();
const note = (k, v) => { if (!findings.has(k)) { findings.set(k, v); console.log('FINDING', k, '—', v); } };

async function settings(p, lang, theme) {
  const menus = p.locator('header.toolbar .menu > button');
  for (let i = 0; i < (await menus.count()) && !(await p.locator('.settings-dialog').count()); i++) {
    await menus.nth(i).click();
    await p.waitForTimeout(60);
    const it = p.locator('.menu-pop button:not([disabled])').filter({ hasText: /^(Setări|Settings)…/ });
    if (await it.count()) await it.first().click(); else await p.keyboard.press('Escape');
    await p.waitForTimeout(150);
  }
  if (!(await p.locator('.settings-dialog').count())) throw new Error('Settings not found in menus');
  const tabs = p.locator('.settings-dialog [role=tab]');
  await tabs.nth(1).click(); // appearance
  const th = p.locator('.settings-dialog select').filter({ has: p.locator('option[value=sepia]') });
  if (await th.count()) await th.first().selectOption(theme);
  await tabs.last().click(); // language
  await p.locator('.settings-dialog select').filter({ has: p.locator('option[value=en]') }).first().selectOption(lang);
  await p.locator('.settings-dialog .actions .primary').click();
  await p.waitForTimeout(300);
}

async function invariants(p, label, lang, errors) {
  if (errors.length) { note(`err:${errors[0].slice(0, 90)}`, label); errors.length = 0; }
  const r = await p.evaluate(({ lang }) => {
    const vw = innerWidth, vh = innerHeight;
    const out = { keys: [], ro: [], off: [] };
    const chrome = [...document.querySelectorAll('body *')].filter((e) => !e.closest('.ProseMirror, [contenteditable=true], textarea, input, select, .binder-row, .card, .outliner td, .corkboard'));
    for (const e of chrome) for (const n of e.childNodes) if (n.nodeType === 3) {
      const s = n.textContent;
      const m = s.match(/\b(ui|cmd|set|btn)\.[a-zA-Z_]+\.[a-zA-Z_.]+/);
      if (m) out.keys.push(m[0]);
    }
    for (const a of ['title', 'aria-label', 'placeholder']) for (const e of document.querySelectorAll(`[${a}]`)) {
      const m = e.getAttribute(a).match(/^(ui|cmd|set|btn)\.[a-zA-Z_.]+$/); if (m) out.keys.push(`${a}=${m[0]}`);
    }
    const tops = [...document.querySelectorAll('.modal, .menu-pop, .context-menu, [role=menu]')];
    const top = tops.pop();
    if (top) {
      const b = top.getBoundingClientRect();
      if (b.left < -1 || b.top < -1 || b.right > vw + 1 || b.bottom > vh + 1) out.off.push(`${top.className} ${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.right)},${Math.round(b.bottom)} in ${vw}x${vh}`);
      if (lang === 'en') {
        const w = document.createTreeWalker(top, NodeFilter.SHOW_TEXT);
        let n; while ((n = w.nextNode())) {
          const pe = n.parentElement;
          if (pe.closest('.ProseMirror, [contenteditable=true], option, .user-content, li.binder-row, mark, .translate-pair, .preview')) continue;
          if (/[ăâîșțĂÂÎȘȚ]/.test(n.textContent)) out.ro.push(n.textContent.trim().slice(0, 60));
        }
      }
    }
    return out;
  }, { lang });
  for (const k of r.keys) note(`key:${k}`, label);
  for (const o of r.off) note(`off:${o.split(' ')[0]}`, `${label}: ${o}`);
  for (const s of r.ro.slice(0, 3)) note(`ro:${s}`, label);
}

async function walk(seed, lang, theme, vp) {
  const rand = rng(seed);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: vp });
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  p.on('popup', (w) => w.close().catch(() => {}));
  await p.goto(URL);
  await p.getByText('Deschide proiect .scribner').first().click();
  await p.waitForSelector('.pane .ProseMirror');
  await settings(p, lang, theme);
  const ctx = `seed${seed} ${lang} ${theme} ${vp.width}x${vp.height}`;
  const trail = [];
  for (let i = 0; i < STEPS; i++) {
    const a = rand();
    let label = '';
    try {
      if (a < 0.45) {
        const menus = p.locator('header.toolbar .menu > button');
        const mi = Math.floor(rand() * (await menus.count()));
        await menus.nth(mi).click({ timeout: 1500 });
        await p.waitForTimeout(80);
        const items = (await p.locator('.menu-pop button:not([disabled])').allInnerTexts()).map((s) => s.split('\n')[0].trim()).filter((s) => s && !SKIP.test(s));
        if (!items.length) { await p.keyboard.press('Escape'); continue; }
        const it = pick(items);
        label = `menu ${it}`;
        await invariants(p, `${ctx} open menu ${mi}`, lang, errors);
        await p.locator('.menu-pop button', { hasText: it }).first().click({ timeout: 1500 });
      } else if (a < 0.6) {
        const rows = p.locator('.binder-row');
        const n = await rows.count();
        if (!n) continue;
        const k = Math.floor(rand() * n);
        label = `binder ${k}`;
        await rows.nth(k).click({ modifiers: rand() < 0.2 ? ['Control'] : [], timeout: 1500 });
      } else if (a < 0.72) {
        const rows = p.locator('.binder-row');
        const k = Math.floor(rand() * (await rows.count()));
        label = `binder ctx ${k}`;
        await rows.nth(k).click({ button: 'right', timeout: 1500 });
        await p.waitForTimeout(80);
        await invariants(p, `${ctx} ${label}`, lang, errors);
        const items = (await p.locator('.context-menu button:not([disabled])').allInnerTexts()).map((s) => s.split('\n')[0].trim()).filter((s) => s && !SKIP.test(s));
        if (items.length && rand() < 0.6) { const it = pick(items); label += ` › ${it}`; await p.locator('.context-menu button', { hasText: it }).first().click({ timeout: 1500 }); }
      } else if (a < 0.82) {
        const e = p.locator('.pane .ProseMirror').first();
        if (!(await e.count())) continue;
        label = 'editor ctx';
        const box = await e.boundingBox();
        if (!box) continue;
        await p.mouse.click(box.x + 20 + rand() * Math.min(300, box.width - 40), box.y + 10 + rand() * Math.min(100, box.height - 20), { button: 'right' });
        await p.waitForTimeout(80);
        await invariants(p, `${ctx} ${label}`, lang, errors);
        const items = (await p.locator('.context-menu button:not([disabled])').allInnerTexts()).map((s) => s.split('\n')[0].trim()).filter((s) => s && !SKIP.test(s));
        if (items.length && rand() < 0.5) { const it = pick(items); label += ` › ${it}`; await p.locator('.context-menu button', { hasText: it }).first().click({ timeout: 1500 }); }
      } else {
        const k = pick(['Escape', 'Escape', 'Control+1', 'Control+2', 'Control+3', 'Control+f', 'Control+Shift+f', 'Control+k', 'F1', 'Control+g']);
        label = `key ${k}`;
        await p.keyboard.press(k);
      }
    } catch (e) { label += ` (skip: ${e.message.split('\n')[0].slice(0, 60)})`; }
    await p.waitForTimeout(160);
    trail.push(label);
    await invariants(p, `${ctx} after "${label}" [${trail.slice(-4).join(' / ')}]`, lang, errors);
    if (rand() < 0.35) for (let j = 0; j < 3; j++) await p.keyboard.press('Escape');
    if (!(await p.locator('header.toolbar .menu > button').count())) {
      await p.goto(URL); await p.getByText('Deschide proiect .scribner').first().click(); await p.waitForSelector('.pane .ProseMirror'); await settings(p, lang, theme);
    }
  }
  await b.close();
}

(async () => {
  const combos = [['en', 'dark', { width: 1024, height: 700 }], ['ro', 'light', { width: 1440, height: 900 }], ['en', 'light', { width: 800, height: 600 }]];
  for (const seed of SEEDS) for (const [lang, theme, vp] of combos) await walk(seed, lang, theme, vp).catch((e) => note(`crash:${e.message.slice(0, 80)}`, `seed${seed}`));
  console.log(`\n${findings.size} distinct findings`);
  process.exitCode = findings.size ? 1 : 0;
})();
