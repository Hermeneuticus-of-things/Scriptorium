// Shared helpers for browser repro scripts (run with: node tests/e2e/browser/<file>.cjs
// against `npx vite preview --port 4183`). Not picked up by vitest (include: tests/**/*.test.js).
// Prefer a locally installed Playwright; fall back to the CI location.
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const URL = process.env.SCRIBNER_URL || 'http://localhost:4183/?demo';

async function open({ beforeOpen } = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL);
  if (beforeOpen) await beforeOpen(page);
  await page.getByText('Deschide proiect .scribner').first().click();
  await page.waitForSelector('.pane .ProseMirror');
  return { browser, page, errors };
}
const ed = (page) => page.locator('.pane .ProseMirror').first();
// Click into the editor and put the caret at the end (a short wait lets ProseMirror
// finish its focus handling, otherwise an immediate Ctrl+End can be lost).
async function caretEnd(page, loc = ed(page)) {
  await loc.click();
  await page.waitForTimeout(80);
  await page.keyboard.press('Control+End');
  await page.waitForTimeout(30);
}
let failures = 0;
function check(name, ok, info = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
}
function done() { console.log(failures ? `${failures} failing` : 'all passing'); process.exitCode = failures ? 1 : 0; }
// Menu bar: open the menu `menu` and click the item path (submenu labels, then the item).
async function menuPick(page, menu, ...path) {
  await page.locator('header.toolbar .menu > button').filter({ hasText: new RegExp(`^${menu}`) }).first().click();
  for (let i = 0; i < path.length; i++) {
    const it = page.locator('.menu-pop [role="menuitem"]').filter({ hasText: path[i] }).first();
    if (i < path.length - 1) await it.hover();
    await it.click();
    await page.waitForTimeout(80);
  }
}
// Runs a menu-bar command by its label, wherever it is (top level or inside a submenu).
async function menuCmd(page, label, { wait = 300 } = {}) {
  const menus = page.locator('header.toolbar .menu > button');
  for (let i = 0; i < (await menus.count()); i++) {
    await menus.nth(i).click();
    await page.waitForTimeout(60);
    const direct = page.locator('.menu-pop:not(.menu-sub) > button[role=menuitem]:not([disabled])', { hasText: label }).first();
    if (await direct.count()) { await direct.click(); await page.waitForTimeout(wait); return; }
    const subs = page.locator('.menu-pop > .menu-subwrap > [role=menuitem]:not([disabled])');
    for (let j = 0; j < (await subs.count()); j++) {
      await subs.nth(j).hover();
      await page.waitForTimeout(40);
      const it = page.locator('.menu-sub button[role=menuitem]:not([disabled])', { hasText: label }).first();
      if (await it.count()) { await it.click(); await page.waitForTimeout(wait); return; }
    }
    await page.keyboard.press('Escape');
  }
  throw new Error(`menu item not found: ${label}`);
}
module.exports = { open, ed, caretEnd, check, done, menuPick, menuCmd };
