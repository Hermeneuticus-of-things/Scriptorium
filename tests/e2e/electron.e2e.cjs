// End-to-end check in real Electron: new project, typing with auto-corrections saved to disk,
// native menu, Compile to DOCX/PDF/EPUB, export as .scriv and import it back.
// Native dialogs are scripted. Run: npm run test:e2e (Linux without a display: xvfb-run -a npm run test:e2e).
const fs = require('fs');
const path = require('path');
let _electron;
try {
  ({ _electron } = require('playwright'));
} catch {
  ({ _electron } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright'));
}
const os = require('os');
const W = fs.mkdtempSync(path.join(os.tmpdir(), 'pneuma-e2e-'));
const ROOT = path.join(__dirname, '..', '..');
const log = (...a) => console.log(...a);
// Fail fast with the last step reached instead of hanging until the CI job timeout.
let step = 'start';
const watchdog = setTimeout(() => {
  console.error(`E2E TIMEOUT at step: ${step}`);
  process.exit(1);
}, Number(process.env.E2E_TIMEOUT_MS) || 240000);
(async () => {
  const app = await _electron.launch({ executablePath: require(path.join(ROOT, 'node_modules', 'electron')), args: ['.', '--no-sandbox', `--user-data-dir=${path.join(W, 'user-data')}`], cwd: ROOT, env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' }, timeout: 60000 });
  step = 'launched';
  app.process().stderr?.on('data', (d) => process.env.CI && process.stderr.write(`[main] ${d}`));
  // Native dialogs are scripted: each call takes the next answer from a queue.
  await app.evaluate(({ dialog, Menu, shell }, W) => {
    // Revealing compiled files or opening links would start the desktop's file manager or browser,
    // whose processes outlive the app on CI runners.
    shell.showItemInFolder = () => {};
    shell.openPath = async () => '';
    shell.openExternal = async () => {};
    global.__answers = [];
    dialog.showOpenDialog = async () => { const a = global.__answers.shift(); return a ? { canceled: false, filePaths: [a] } : { canceled: true, filePaths: [] }; };
    dialog.showSaveDialog = async () => { const a = global.__answers.shift(); return a ? { canceled: false, filePath: a } : { canceled: true }; };
    dialog.showMessageBox = async () => ({ response: 0 });
    const orig = Menu.buildFromTemplate; Menu.buildFromTemplate = (t) => (global.__lastMenu = orig.call(Menu, t));
  }, W);
  const answer = (...paths) => app.evaluate((_, p) => { global.__answers.push(...p); }, paths);
  const win = await app.firstWindow({ timeout: 60000 });
  step = 'first window';
  const errs = []; win.on('pageerror', (e) => errs.push(e.message)); win.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await win.waitForSelector('text=Proiect nou', { timeout: 30000 });
  step = 'home';
  log('home ok');
  // 1. New project
  fs.mkdirSync(W + '/projects', { recursive: true });
  await answer(W + '/projects');
  await win.getByPlaceholder('Titlul cărții').fill('Test E2E');
  await win.getByRole('button', { name: 'Creează' }).click();
  await win.waitForSelector('.pane .ProseMirror', { timeout: 20000 });
  const dir = fs.readdirSync(W + '/projects').find((d) => d.endsWith('.scribner'));
  step = 'project';
  log('project created:', dir);
  await win.waitForTimeout(800);
  log('native menu:', await app.evaluate(({ Menu }) => { const m = global.__lastMenu || Menu.getApplicationMenu(); return m ? m.items.map((i) => i.label).join(' | ') : 'none'; }));
  // 2. Type text and verify it lands on disk
  await win.locator('.pane .ProseMirror').first().click();
  await win.keyboard.type('Era o dimineață rece -- și "frig"... Andrei pleacă.');
  await win.keyboard.press('Control+s'); await win.waitForTimeout(1500);
  const docsDir = path.join(W, 'projects', dir, 'docs');
  const onDisk = fs.readdirSync(docsDir).map((f) => fs.readFileSync(path.join(docsDir, f), 'utf8')).join('\n');
  step = 'typing';
  log('text saved:', /dimineață rece — și „frig”…/.test(onDisk), onDisk.match(/Era[^<]*/)?.[0]);
  // 3. Compile DOCX, PDF, EPUB via the Compile dialog
  for (const [fmt, label] of [['docx', 'Word'], ['pdf', 'PDF'], ['epub', 'EPUB']]) {
    await win.locator('button[title^="Compilează"]').first().click();
    await win.waitForSelector('text=Compilează pentru');
    const sel = win.locator('select').filter({ has: win.locator(`option[value="${fmt}"]`) }).first();
    await sel.selectOption(fmt);
    await answer(`${W}/out.${fmt}`);
    await win.locator('.modal button.primary', { hasText: 'Compilează' }).click();
    for (let i = 0; i < 40 && !fs.existsSync(`${W}/out.${fmt}`); i++) await win.waitForTimeout(250);
    log(`compile ${fmt}:`, fs.existsSync(`${W}/out.${fmt}`) ? fs.statSync(`${W}/out.${fmt}`).size + ' bytes' : 'MISSING');
    await win.keyboard.press('Escape'); await win.waitForTimeout(200);
    if (await win.locator('.modal').count()) await win.locator('.modal button', { hasText: 'Închide' }).first().click().catch(() => {});
  }
  // 4. Export as .scriv, then import it back
  await answer(W + '/scrivout');
  fs.mkdirSync(W + '/scrivout', { recursive: true });
  const r = await win.evaluate(async (d) => window.api.exportScriv(d.dir, (await window.api.openProject(d.dir)).project), { dir: path.join(W, 'projects', dir) }).catch((e) => 'ERR ' + e.message);
  log('export .scriv:', typeof r === 'string' ? r : r?.dir);
  if (r?.dir) {
    fs.mkdirSync(W + '/reimport', { recursive: true });
    await answer(r.dir, W + '/reimport');
    const imp = await win.evaluate(() => window.api.importScriv()).catch((e) => 'ERR ' + e.message);
    log('re-import .scriv:', typeof imp === 'string' ? imp : `${imp?.project?.title} · docs: ${JSON.stringify(imp?.stats || {}).slice(0, 120)}`);
  }
  // 5. File > Print Preview with a Page Setup (6 × 9 in, footer with page number) → real PDF, Save PDF.
  step = 'print preview';
  await answer(`${W}/preview.pdf`);
  const pv = await win.evaluate(async (d) => {
    const { project } = await window.api.openProject(d.dir);
    const r = await window.api.printPreview(d.dir, project, { pageSetup: { size: '6x9', footer: { center: '<$p>' } } });
    const saved = await window.api.savePrintPdf(r.token);
    return { pageCount: r.pageCount, pageSize: r.pageSize, bytes: r.data?.length || 0, saved };
  }, { dir: path.join(W, 'projects', dir) }).catch((e) => ({ error: e.message }));
  const pvFile = fs.existsSync(`${W}/preview.pdf`) ? fs.readFileSync(`${W}/preview.pdf`) : null;
  const pvOk = Boolean(pvFile) && pvFile.slice(0, 5).toString() === '%PDF-' && pv.pageCount >= 1 && Math.round(pv.pageSize?.width) === 432 && Math.round(pv.pageSize?.height) === 648;
  log('print preview:', JSON.stringify(pv), pvOk);
  if (!pvOk) errs.push('print preview PDF missing or wrong page size');
  // Typing right before closing the window must reach the disk (no Ctrl+S, before the autosave delay).
  step = 'close with unsaved typing';
  await win.locator('.pane .ProseMirror').first().click();
  await win.keyboard.press('Control+End');
  await win.keyboard.type(' Ultima frază înainte de închidere.');
  // Wait for the window itself to go away (the app process may outlive it briefly).
  const closed = win.waitForEvent('close', { timeout: 30000 });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await closed;
  await new Promise((r) => setTimeout(r, 500));
  const lastText = fs.readdirSync(docsDir).map((f) => fs.readFileSync(path.join(docsDir, f), 'utf8')).join('\n');
  const keptOnClose = lastText.includes('Ultima frază înainte de închidere.');
  log('typing kept on close:', keptOnClose);
  if (!keptOnClose) errs.push('typing lost on window close');
  log('errors:', errs);
  await app.close().catch(() => {});
  const ok = !errs.length && ['docx', 'pdf', 'epub'].every((f) => fs.existsSync(path.join(W, `out.${f}`)));
  log(ok ? 'E2E OK' : 'E2E FAILED');
  clearTimeout(watchdog);
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
