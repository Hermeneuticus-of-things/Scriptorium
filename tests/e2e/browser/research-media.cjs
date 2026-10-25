// Q12: research files in the editor pane — PDF (page, zoom, search, annotations kept on the item),
// image (zoom / fit), recording (timestamp into the text beside), web copy, split pane, files dropped
// on the binder. Uses ?demo&media (Research holds a PDF, an image, a WAV and a saved page).
const base = process.env.SCRIBNER_URL || 'http://localhost:4183/?demo';
process.env.SCRIBNER_URL = base.includes('media') ? base : `${base}${base.includes('?') ? '&' : '?'}media`;
const { open, check, done } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  const binder = (t) => page.locator('.binder').getByText(t, { exact: true }).first();
  const mainMedia = page.locator('.media-view').first();

  // PDF
  await binder('Arhiva satului').click();
  await page.waitForSelector('.media-view[data-kind="pdf"] .pdf-frame');
  const frameSrc = () => page.locator('.pdf-frame').first().getAttribute('src');
  check('pdf opens in the pane with the viewer bar', (await frameSrc()).startsWith('blob:') && (await frameSrc()).includes('#page=1'), await frameSrc());
  check('pdf page count read from the file', (await page.locator('.viewer-page').innerText()).includes('3'), await page.locator('.viewer-page').innerText());
  await page.getByRole('button', { name: 'Pagina următoare' }).click();
  check('next page goes to page 2', (await frameSrc()).includes('page=2'));
  await page.locator('.viewer-search input').fill('satului');
  await page.locator('.viewer-search button').click();
  check('search term passed to the viewer', (await frameSrc()).includes('search=satului'));
  await page.getByRole('button', { name: 'Mărește' }).first().click();
  check('zoom in sets a percentage', /zoom=\d+/.test(await frameSrc()), await frameSrc());
  await page.locator('.pdf-notes textarea').fill('Harta e pe pagina asta');
  await page.getByRole('button', { name: 'Adaugă nota' }).click();
  check('note annotation listed with its page', (await page.locator('.pdf-ann').count()) === 1 && (await page.locator('.pdf-ann').innerText()).includes('p. 2'));
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(() => navigator.clipboard.writeText('Arhiva satului din 1898'));
  await page.getByRole('button', { name: 'Evidențiază selecția copiată' }).click();
  await page.waitForTimeout(200);
  check('highlight from copied text', (await page.locator('.pdf-ann.highlight').count()) === 1);
  await page.waitForTimeout(700); // page / zoom are saved shortly after the last change

  // image, then back to the PDF: page and annotations remembered
  await binder('Munții Apuseni').click();
  await page.waitForSelector('.media-view[data-kind="image"] .image-stage img');
  await page.waitForTimeout(200);
  const imgW = () => page.locator('.image-stage img').evaluate((i) => i.getBoundingClientRect().width);
  const fitW = await imgW();
  await page.getByRole('button', { name: 'Mărime reală (100%)' }).click();
  check('image actual size is 1200px wide', Math.round(await imgW()) === 1200, String(await imgW()));
  await page.getByRole('button', { name: 'Potrivește în panou' }).click();
  check('image fit is smaller than the pane', (await imgW()) < 1200 && Math.abs((await imgW()) - fitW) < 2, `${fitW}`);
  await page.getByRole('button', { name: 'Mărește' }).click();
  check('image zoom in grows the image', (await imgW()) > fitW);

  await binder('Arhiva satului').click();
  await page.waitForSelector('.pdf-frame');
  check('pdf reopens at the remembered page', (await frameSrc()).includes('page=2'), await frameSrc());
  check('annotations kept on the item', (await page.locator('.pdf-ann').count()) === 2);

  // web copy
  await binder('Cabane din Apuseni').click();
  await page.waitForSelector('.media-view[data-kind="web"] .web-frame');
  const sandbox = await page.locator('.web-frame').getAttribute('sandbox');
  const frameText = await page.frameLocator('.web-frame').locator('h1').innerText();
  check('web copy in a sandboxed frame without scripts', sandbox === '' && frameText.includes('Cabane'), `${sandbox} ${frameText}`);

  // recording beside the text: timestamp goes into the text
  await binder('Începutul').click();
  await page.waitForSelector('.pane .ProseMirror');
  await page.evaluate(() => {
    const e = document.querySelector('.pane .ProseMirror').editor;
    e.chain().focus().setTextSelection(5).run();
  });
  await binder('Interviu Matei').click();
  await page.waitForSelector('.media-view[data-kind="audio"]');
  await page.getByRole('button', { name: 'Deschide alături de text' }).click();
  await page.waitForTimeout(200);
  await binder('Începutul').click();
  await page.waitForSelector('.workspace.split .media-view[data-kind="audio"]');
  check('recording shown in the split pane beside the text', (await page.locator('.workspace.split .pane .ProseMirror').count()) >= 1);
  await page.locator('.workspace .ProseMirror').first().click();
  await page.keyboard.press('Control+Alt+t');
  await page.waitForTimeout(150);
  const text = await page.locator('.workspace .ProseMirror').first().innerText();
  check('Ctrl+Alt+T inserts the timestamp into the text beside', text.includes('[00:00]'), text.slice(0, 120));
  await page.locator('.media-view .insert-time').click();
  await page.waitForTimeout(150);
  check('the button inserts it too', ((await page.locator('.workspace .ProseMirror').first().innerText()).match(/\[00:00\]/g) || []).length === 2);

  // files dropped from the system on the binder go to Research
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'], 'schita.svg', { type: 'image/svg+xml' }));
    const col = document.querySelector('.binder-col');
    col.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    col.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(300);
  check('dropped file added to Research and opened', (await binder('schita').count()) === 1 && (await mainMedia.getAttribute('data-kind')) === 'image');

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
