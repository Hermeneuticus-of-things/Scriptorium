// P9 corkboard and outliner in detail: card options (label band, stamp opacity, words, icon,
// synopsis lines), freeform snap to grid, vertical lines, image dropped on a card, global
// defaults in Options, outliner extra columns, column drag and saved widths.
const { open, check, done, menuCmd } = require('./_helpers.cjs');

(async () => {
  const { browser, page, errors } = await open();
  const row = (t) => page.locator('.binder-row', { hasText: t }).first();
  await row('Partea a doua').click();
  await page.locator('header.toolbar button', { hasText: 'Corkboard' }).first().click();
  await page.waitForSelector('.corkboard [data-card-id]');
  const aspect = async () => {
    const d = page.locator('details.cork-options').first();
    if (!(await d.evaluate((x) => x.open))) await d.locator('summary').click();
    return page.locator('.cork-options-body').first();
  };
  let body = await aspect();
  await body.locator('label', { hasText: 'Culoarea etichetei' }).locator('select').selectOption('band');
  await body.locator('label', { hasText: 'Cuvinte și țintă' }).locator('input').check();
  await body.locator('label', { hasText: 'Icoana tipului' }).locator('input').check();
  await body.locator('label', { hasText: 'Rânduri de sinopsis' }).locator('input').fill('2');
  await body.locator('label', { hasText: 'Opacitatea ștampilei' }).locator('input').fill('30');
  await page.waitForTimeout(200);
  check('words on cards', (await page.locator('.corkboard .card-words').count()) > 0);
  check('type icon on cards', (await page.locator('.corkboard .card-type-icon').count()) > 0);
  check('synopsis clamped', (await page.locator('.corkboard .card.syn-clamp').count()) > 0);
  const stampOp = await page.evaluate(() => document.querySelector('.corkboard .stamp')?.style.opacity || 'none');
  check('stamp opacity applied (or no status in demo)', stampOp === 'none' || stampOp === '0.3', stampOp);
  const labelled = await page.evaluate(() => [...document.querySelectorAll('.corkboard .card')].filter((c) => c.style.getPropertyValue('--label-color')).length);
  check('label shown as a side band', labelled === 0 || (await page.locator('.corkboard .card-label-band').count()) === labelled, String(labelled));

  // Image dropped on a card becomes its picture synopsis
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 20;
    c.height = 10;
    c.getContext('2d').fillRect(0, 0, 20, 10);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'x.png', { type: 'image/png' }));
    const card = document.querySelector('.corkboard [data-card-id]');
    card.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    card.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(500);
  check('dropped image becomes the synopsis image', (await page.locator('.corkboard [data-card-id] img.card-image[src^="data:image"]').count()) > 0);

  // Lines, vertical orientation
  await page.locator('.corkboard .seg button', { hasText: 'Linii' }).click();
  await page.locator('.cork-head select[aria-label="Orientarea liniilor"]').selectOption('columns');
  await page.waitForTimeout(150);
  check('vertical lines', (await page.locator('.cork-lines.vertical .cork-line').count()) > 0);

  // Freeform snap to grid
  await page.locator('.corkboard .seg button', { hasText: 'Liber' }).click();
  body = await aspect();
  await body.locator('label', { hasText: 'Aliniază la grilă' }).locator('input').check();
  await body.locator('label', { hasText: 'Mărimea grilei' }).locator('input').fill('40');
  await body.locator('label', { hasText: 'Arată grila' }).locator('input').uncheck();
  await page.locator('details.cork-options summary').first().click();
  await page.waitForTimeout(150);
  check('grid hidden', (await page.locator('.freeform.no-grid').count()) === 1);
  const card = page.locator('.freeform .free-card header').first();
  await card.scrollIntoViewIfNeeded();
  const b = await card.boundingBox();
  await page.mouse.move(b.x + 30, b.y + 8);
  await page.mouse.down();
  await page.mouse.move(b.x + 97, b.y + 71, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const pos = await page.locator('.freeform .free-card').first().evaluate((el) => [parseFloat(el.style.left), parseFloat(el.style.top)]);
  check('freeform card snapped to 40px grid', pos[0] % 40 === 0 && pos[1] % 40 === 0, pos.join(','));

  // Global defaults in Options
  await menuCmd(page, /^Setări…|^Settings…/);
  await page.waitForSelector('.modal [role=tablist]');
  await page.locator('.modal [role=tab]', { hasText: 'Corkboard' }).click();
  check('Corkboard options pane', (await page.locator('.modal .cork-pane fieldset').count()) === 3);
  await page.locator('.modal .cork-pane label', { hasText: 'Ștampila statusului' }).locator('input').uncheck();
  await page.locator('.modal button.primary', { hasText: /Salvează|Save|OK/ }).last().click();
  await page.waitForTimeout(300);

  // Outliner: extra columns, drag, widths
  await page.locator('header.toolbar button', { hasText: 'Outline' }).first().click();
  await page.waitForSelector('.outliner table');
  await page.locator('.col-chooser summary').click();
  for (const name of ['Țintă totală', 'Progres total', 'Pagină nouă înainte', 'Snapshot-uri']) await page.locator('.col-list label', { hasText: name }).locator('input').check();
  await page.locator('.col-chooser summary').click();
  check('extra outliner columns', (await page.locator('.outliner th[data-col="totalTarget"], .outliner th[data-col="snapCount"], .outliner th[data-col="pageBreak"], .outliner th[data-col="totalProgress"]').count()) === 4);
  await page.locator('.outliner th[data-col="snapCount"]').dragTo(page.locator('.outliner th[data-col]').first(), { targetPosition: { x: 3, y: 8 } });
  await page.waitForTimeout(150);
  const first = await page.locator('.outliner th[data-col]').first().getAttribute('data-col');
  check('column moved by drag', first === 'snapCount', first);
  const h = await page.locator('.outliner th[data-col="totalTarget"] .col-resize').boundingBox();
  await page.mouse.move(h.x + 3, h.y + 5);
  await page.mouse.down();
  await page.mouse.move(h.x + 83, h.y + 5, { steps: 4 });
  await page.mouse.up();
  const widths = await page.evaluate(() => JSON.parse(localStorage.getItem('scribner-outline-widths') || '{}'));
  check('column width saved', widths.totalTarget > 60, JSON.stringify(widths));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
