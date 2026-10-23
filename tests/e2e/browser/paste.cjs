// Scenario 2: Word-like HTML paste, plain paste (Ctrl+Shift+V), URL paste, image data URL paste.
const { open, ed, caretEnd, check, done } = require('./_helpers.cjs');
const paste = (page, data) =>
  page.evaluate((data) => {
    const dt = new DataTransfer();
    for (const [k, v] of Object.entries(data)) dt.setData(k, v);
    document.querySelector('.pane .ProseMirror').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, data);
const WORD = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><style>p.MsoNormal{margin:0}</style></head><body><!--StartFragment--><p class=MsoNormal style='margin-bottom:0cm;mso-line-height-alt:12pt'><span lang=RO style='font-size:12.0pt;font-family:"Times New Roman",serif;mso-fareast-font-family:Calibri;color:black'><font face="Arial"><font size=3>Vorbă <b>tare</b> din Word</font></font><o:p></o:p></span></p><p class=MsoNormal><o:p>&nbsp;</o:p></p><!--EndFragment--></body></html>`;
(async () => {
  const { browser, page, errors } = await open();
  const binder = (t) => page.locator('.binder').getByText(t, { exact: true });
  await caretEnd(page);
  await page.keyboard.press('Enter');
  await paste(page, { 'text/html': WORD, 'text/plain': 'Vorbă tare din Word' });
  await page.waitForTimeout(100);
  await page.keyboard.press('Enter');
  // Plain paste: Ctrl+Shift+V then the paste event (the shortcut itself only arms the flag).
  await page.keyboard.press('Control+Shift+v');
  await paste(page, { 'text/html': '<b style="color:red">ROSU</b>', 'text/plain': 'ROSU simplu' });
  await page.waitForTimeout(100);
  await page.keyboard.press('Enter');
  await paste(page, { 'text/plain': 'https://example.com/a?b=1' });
  await page.keyboard.press('Enter');
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  await paste(page, { 'text/html': `<img src="${png}">` });
  await page.waitForTimeout(300);
  await binder('Drumul').click();
  await page.waitForTimeout(200);
  await binder('Începutul').click();
  await page.waitForTimeout(300);
  const html = await ed(page).innerHTML();
  console.log(html);
  check('word text kept', html.includes('Vorbă <strong>tare</strong> din Word') || html.includes('tare'));
  check('no o:p / mso / font tags', !/o:p|mso-|<font|MsoNormal|lang=/i.test(html));
  check('plain paste has no bold/colour', html.includes('ROSU simplu') && !/<strong>ROSU|color: ?red/.test(html));
  check('url pasted', html.includes('https://example.com/a?b=1'));
  check('image kept', html.includes('<img') && html.includes('data:image/png'));
  check('no console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
