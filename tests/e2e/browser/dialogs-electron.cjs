// Real-Electron check of the dialogs that do not open in the browser demo:
// Backup, Page setup, Save as template. Each is opened through the native menu path
// (main sends 'menu:command' with the command id), screenshotted at 1440x900 in light
// and dark, and checked for overflow and low-contrast text.
// Run: xvfb-run -a node tests/e2e/browser/dialogs-electron.cjs [outDir]
const fs = require('fs');
const path = require('path');
const os = require('os');
let _electron;
try {
  ({ _electron } = require('playwright'));
} catch {
  ({ _electron } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright'));
}
const W = fs.mkdtempSync(path.join(os.tmpdir(), 'pneuma-dlg-'));
const OUT = process.argv[2] || path.join(W, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.join(__dirname, '..', '..', '..');
let failures = 0;
const check = (name, ok, info = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
};
const watchdog = setTimeout(() => { console.error('TIMEOUT'); process.exit(1); }, 180000);

// Runs in the page: overflow of the dialog and its children + WCAG contrast of visible text.
function audit() {
  const m = document.querySelector('.modal');
  if (!m) return { missing: true };
  const r = m.getBoundingClientRect();
  const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  const bgOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c.length >= 3 && (c.length < 4 || c[3] > 0.5)) return c;
    }
    return [255, 255, 255];
  };
  const lowContrast = [];
  const overflow = [];
  m.querySelectorAll('*').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return;
    const er = el.getBoundingClientRect();
    if (er.width && (er.right > r.right + 1 || er.left < r.left - 1)) overflow.push(`${el.tagName}.${el.className} ${Math.round(er.left)}-${Math.round(er.right)}`);
    if (el.scrollWidth > el.clientWidth + 1 && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) === false && cs.overflowX !== 'visible') overflow.push(`scroll ${el.tagName}.${el.className}`);
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own && !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
    const fg = parse(cs.color);
    const L1 = lum(fg), L2 = lum(bgOf(el));
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const min = el.disabled ? 0 : 4.5;
    if (ratio < min) lowContrast.push(`${el.tagName}.${el.className} "${(el.textContent || el.value || '').trim().slice(0, 30)}" ${ratio.toFixed(2)}`);
  });
  return {
    box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
    offscreen: r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth,
    modalScroll: m.scrollWidth > m.clientWidth + 1,
    overflow,
    lowContrast,
  };
}

(async () => {
  const app = await _electron.launch({ executablePath: require(path.join(ROOT, 'node_modules', 'electron')), args: ['.', '--no-sandbox', `--user-data-dir=${path.join(W, 'user-data')}`], cwd: ROOT, env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' }, timeout: 60000 });
  await app.evaluate(({ dialog, shell }) => {
    shell.showItemInFolder = () => {};
    shell.openPath = async () => '';
    shell.openExternal = async () => {};
    global.__answers = [];
    dialog.showOpenDialog = async () => { const a = global.__answers.shift(); return a ? { canceled: false, filePaths: [a] } : { canceled: true, filePaths: [] }; };
    dialog.showSaveDialog = async () => { const a = global.__answers.shift(); return a ? { canceled: false, filePath: a } : { canceled: true }; };
    dialog.showMessageBox = async () => ({ response: 0 });
  });
  const answer = (...p) => app.evaluate((_, p) => { global.__answers.push(...p); }, p);
  const win = await app.firstWindow({ timeout: 60000 });
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setContentSize(1440, 900); });
  await win.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  const errs = [];
  win.on('pageerror', (e) => errs.push(e.message));
  await win.waitForSelector('text=Proiect nou', { timeout: 30000 });
  fs.mkdirSync(W + '/projects', { recursive: true });
  await answer(W + '/projects');
  await win.getByPlaceholder('Titlul cărții').fill('Dialoguri E2E');
  await win.getByRole('button', { name: 'Creează' }).click();
  await win.waitForSelector('.pane .ProseMirror', { timeout: 20000 });
  await win.waitForTimeout(800);

  const send = (id) => app.evaluate(({ BrowserWindow }, id) => BrowserWindow.getAllWindows()[0].webContents.send('menu:command', id), id);
  for (const theme of ['light', 'dark']) {
    await win.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    for (const id of ['backups', 'pageSetup', 'saveTemplate']) {
      await send(id);
      const opened = await win.waitForSelector('.modal', { timeout: 5000 }).then(() => true, () => false);
      check(`${id} opens via menu:command (${theme})`, opened);
      if (!opened) continue;
      await win.waitForTimeout(400);
      if (id === 'backups') {
        await win.locator('.modal button.primary').click();
        await win.waitForTimeout(1200);
      }
      const a = await win.evaluate(audit);
      check(`${id} ${theme}: inside viewport`, !a.offscreen, JSON.stringify(a.box));
      check(`${id} ${theme}: no horizontal overflow`, !a.modalScroll && !a.overflow.length, a.overflow.slice(0, 4).join('; '));
      check(`${id} ${theme}: text contrast >= 4.5`, !a.lowContrast.length, a.lowContrast.slice(0, 4).join('; '));
      await win.screenshot({ path: path.join(OUT, `${id}-${theme}.png`) });
      await win.keyboard.press('Escape');
      await win.waitForTimeout(200);
      if (await win.locator('.modal').count()) await win.locator('.modal .actions button').first().click();
      await win.waitForTimeout(200);
      check(`${id} ${theme}: closes`, (await win.locator('.modal').count()) === 0);
    }
  }
  check('no page errors', !errs.length, errs.join(' | '));
  await app.close().catch(() => {});
  clearTimeout(watchdog);
  console.log(`screenshots: ${OUT}`);
  console.log(failures ? `${failures} failing` : 'all passing');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
