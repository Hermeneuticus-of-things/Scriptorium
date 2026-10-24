// Help → Report a problem: a captured error shows the toast once, the dialog fills the technical
// details (sanitized), and "Send on GitHub" builds the issue URL (window.open intercepted).
const { open, check, done, menuCmd } = require('./_helpers.cjs');
(async () => {
  const { browser, page } = await open();
  await page.evaluate(() => {
    window.__opened = [];
    window.open = (url) => (window.__opened.push(String(url)), null);
  });
  const boom = () => page.evaluate(() => setTimeout(() => { throw new Error('Test boom /home/maria/x sk-ant-abcdefghijkl'); }, 0));
  await boom();
  const toast = page.locator('.report-toast');
  await toast.waitFor({ timeout: 3000 }).catch(() => {});
  check('toast appears after an error', await toast.isVisible());
  check('toast text', (await toast.innerText()).includes('A apărut o problemă'));
  await toast.locator('button[aria-label]').click();
  await boom();
  await page.waitForTimeout(300);
  check('same error does not show the toast again', !(await toast.isVisible()));

  await menuCmd(page, 'Raportează o problemă');
  const dlg = page.locator('.report-problem');
  check('dialog opens from Help menu', await dlg.isVisible());
  await dlg.locator('summary').click();
  const tech = await dlg.locator('.report-tech').innerText();
  check('details: version', /Versiune: \d+\.\d+\.\d+/.test(tech), tech.slice(0, 80));
  check('details: error message', tech.includes('Test boom'));
  check('details: sanitized', !tech.includes('maria') && !tech.includes('abcdefghijkl'), tech);
  check('details: recent command', tech.includes('reportIssue'));
  const send = dlg.locator('button', { hasText: 'Trimite pe GitHub' });
  check('send disabled while empty', await send.isDisabled());
  check('no e-mail button without maintainer address', (await dlg.locator('button', { hasText: 'e-mail' }).count()) === 0);
  await dlg.locator('textarea').first().fill('Compile s-a blocat');
  await dlg.locator('textarea').nth(1).fill('Am apăsat Compile');
  await send.click();
  await page.waitForTimeout(300);
  const opened = await page.evaluate(() => window.__opened);
  const u = opened[0] ? new URL(opened[0]) : null;
  check('window.open called with the issue URL', u && u.href.startsWith('https://github.com/Hermeneuticus-of-things/Scriptorium/issues/new'), opened[0]);
  check('URL title', u && u.searchParams.get('title') === 'Compile s-a blocat');
  const body = (u && u.searchParams.get('body')) || '';
  check('URL body has description, steps and details', body.includes('Compile s-a blocat') && body.includes('Am apăsat Compile') && body.includes('Test boom'));
  check('URL labels=bug', u && u.searchParams.get('labels') === 'bug');
  check('URL length under limit', opened[0].length <= 7000);
  check('dialog closes with a thank-you', !(await dlg.isVisible()) && (await page.locator('.ok-toast').innerText()).includes('GitHub'));
  await browser.close();
  done();
})();
