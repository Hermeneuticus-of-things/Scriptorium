// Binder and corkboard drag & drop: reorder, drop inside a folder, multi-selection drag keeps
// order, a folder can't be dropped into its own child, corkboard card reorder.
process.env.SCRIBNER_URL = process.env.SCRIBNER_URL || 'http://localhost:4191/?demo';
const { open, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  const titles = () => page.locator('.binder-row').evaluateAll((rs) => rs.map((r) => (r.querySelector('.title') || r).textContent.trim()));
  const row = (t) => page.locator('.binder-row').filter({ has: page.locator('.title', { hasText: new RegExp(`^${t}$`) }) }).first();
  const t0 = await titles();
  console.log('binder:', t0.join(' | '));
  // pick two siblings: the first two documents after "Manuscris"
  const folder = 'Partea întâi';
  const kids = ['Începutul', 'Drumul', 'Scrisoarea'];
  // drag the 3rd child above the 1st (top part of the row)
  const target = row(kids[0]);
  const box = await target.boundingBox();
  await row(kids[2]).dragTo(target, { targetPosition: { x: 20, y: 2 } });
  await page.waitForTimeout(200);
  const t1 = await titles();
  check('drag reorders inside the folder', t1.indexOf(kids[2]) < t1.indexOf(kids[0]), t1.join(' | '));
  // a folder dropped into its own child is refused
  await row(folder).dragTo(row(kids[1]), { targetPosition: { x: 40, y: box.height / 2 } });
  await page.waitForTimeout(200);
  const t2 = await titles();
  check('folder not dropped inside its own child (tree intact)', t2.length === t1.length && t2.includes(folder), t2.join(' | '));
  // multi-selection drag keeps order
  await row(kids[0]).click();
  await row(kids[1]).click({ modifiers: ['Control'] });
  const last = t2[t2.length - 1];
  await row(kids[0]).dragTo(row(folder), { targetPosition: { x: 20, y: 2 } });
  await page.waitForTimeout(200);
  const t3 = await titles();
  check('multi drag moves both, in order', t3.indexOf(kids[0]) < t3.indexOf(kids[1]) && t3.indexOf(kids[1]) < t3.indexOf(folder), t3.join(' | '));
  // corkboard: open the folder and drag the last card before the first
  await row('Partea a doua').click();
  await page.locator('header.toolbar button', { hasText: 'Corkboard' }).first().click();
  await page.waitForSelector('.corkboard .card, .corkboard [data-card-id]');
  const cards = page.locator('.corkboard [data-card-id]');
  const n = await cards.count();
  const ids = async () => cards.evaluateAll((cs) => cs.map((c) => c.getAttribute('data-card-id')));
  const c0 = await ids();
  if (n >= 2) {
    await cards.nth(n - 1).dragTo(cards.nth(0), { targetPosition: { x: 5, y: 20 } });
    await page.waitForTimeout(200);
    const c1 = await ids();
    check('corkboard drag puts the card first', c1[0] === c0[n - 1], `${c0} -> ${c1}`);
  } else check('corkboard has cards', false, String(n));
  check('no page errors', !errors.length, errors.join(' | '));
  await browser.close();
  done();
})();
