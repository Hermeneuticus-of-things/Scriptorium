// Shared helpers for browser repro scripts (run with: node tests/e2e/browser/<file>.cjs
// against `npx vite preview --port 4183`). Not picked up by vitest (include: tests/**/*.test.js).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
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
module.exports = { open, ed, caretEnd, check, done };
