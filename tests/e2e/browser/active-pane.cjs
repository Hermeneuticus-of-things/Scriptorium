// Split view: the pane you click or type in gets the green "active" border; the other one does not.
const { open, menuCmd } = require('./_helpers.cjs');

(async () => {
  const { browser, page, errors } = await open();
  let fails = 0;
  const check = (ok, msg) => {
    console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
    if (!ok) fails++;
  };
  await menuCmd(page, 'Împarte editorul');
  await page.waitForSelector('.workspace .pane.second', { timeout: 5000 }).catch(() => {});
  const panes = page.locator('.workspace > .pane');
  check((await panes.count()) >= 2, 'two panes open');
  await page.locator('.workspace > .pane.second .ProseMirror').first().click();
  check(await page.locator('.workspace > .pane.second').evaluate((el) => el.hasAttribute('data-active')), 'second pane active after click');
  check(await panes.first().evaluate((el) => !el.hasAttribute('data-active')), 'first pane inactive');
  await page.waitForTimeout(300);
  const shadow = await page.locator('.workspace > .pane.second').evaluate((el) => getComputedStyle(el).boxShadow);
  check(/46, 157, 87|76, 196, 122/.test(shadow), `active pane has the green border (${shadow})`);
  await panes.first().locator('.ProseMirror').first().click();
  check(await panes.first().evaluate((el) => el.hasAttribute('data-active')), 'first pane active after click');
  check(await page.locator('.workspace > .pane.second').evaluate((el) => !el.hasAttribute('data-active')), 'second pane inactive again');
  check(errors.length === 0, 'no page errors');
  await browser.close();
  console.log(fails ? `${fails} failing` : 'all passing');
  process.exit(fails ? 1 : 0);
})();
