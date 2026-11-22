// Shared helpers for browser repro scripts. The helper owns the demo server when the
// caller did not provide one, so direct execution is deterministic and self-contained.
// Not picked up by vitest (include: tests/**/*.test.js).
// Prefer a locally installed Playwright; fall back to the CI location.
const { spawn, spawnSync } = require('child_process');
const http = require('http');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const URL = process.env.SCRIBNER_URL || 'http://localhost:4183/?demo';
let ownedServer = null;

function stopOwnedServer() {
  if (!ownedServer || ownedServer.killed) return;
  if (process.platform === 'win32') {
    spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `taskkill /pid ${ownedServer.pid} /t /f`], { stdio: 'ignore', windowsHide: true });
  } else {
    ownedServer.kill('SIGTERM');
  }
  ownedServer = null;
}

function probe(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => { res.resume(); resolve(res.statusCode < 500); });
    req.on('error', reject);
    req.setTimeout(700, () => req.destroy(new Error('demo server timeout')));
  });
}

async function ensureDemoServer() {
  if (process.env.SCRIBNER_SERVER_EXTERNAL === '1' || !/^https?:\/\/localhost:4183\b/i.test(URL)) return;
  try {
    if (await probe(URL)) return;
  } catch { /* start the owned server below */ }
  const root = path.resolve(__dirname, '../../..');
  const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npx';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npx vite --host 127.0.0.1 --port 4183']
    : ['vite', '--host', '127.0.0.1', '--port', '4183'];
  ownedServer = spawn(command, args, {
    cwd: root,
    stdio: 'ignore',
    windowsHide: true,
  });
  // The test owns cleanup, but must not remain alive waiting for the detached child.
  ownedServer.unref();
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      if (await probe(URL)) return;
    } catch { /* Vite is still starting */ }
  }
  stopOwnedServer();
  throw new Error('Serverul Vite demo nu a pornit pe portul 4183.');
}

process.on('exit', stopOwnedServer);
process.on('SIGINT', () => { stopOwnedServer(); process.exit(130); });
process.on('SIGTERM', () => { stopOwnedServer(); process.exit(143); });

async function open({ beforeOpen } = {}) {
  await ensureDemoServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL);
  if (beforeOpen) await beforeOpen(page);
  // The visible label is localized and does not include the file extension; the title does.
  await page.getByRole('button', { name: /^Deschide.*proiect/i }).first().click();
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
