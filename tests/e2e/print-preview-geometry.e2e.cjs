// Print Preview geometry E2E: viewport containment, zoom, real save-dialog action and close.
const createHarness = require('./full-app-harness.cjs');

(async () => {
  const H = await createHarness('print-preview-geometry');
  H.test('print-preview-stays-usable', {
    surface: 'Fișier → Tipărire → Previzualizare tipărire',
    control: 'dialog flex cu preview elastic și footer vizibil',
    initial: 'Fixture izolat cu document lung și viewport Electron implicit',
    expected: 'Preview-ul rămâne în viewport, butonul Salvează PDF este activ, zoom-ul schimbă viewerul, salvarea și închiderea funcționează',
    setup: async () => {
      await H.fixture((pj, files) => {
        pj.pageSetup = { size: 'A5', orientation: 'portrait', format: 'manuscript', margins: { top: 2, bottom: 2, left: 2, right: 2 }, fontFamily: 'Georgia', fontSizePt: 16, lineSpacing: 2 };
        files['docs/doc-a.html'] = '<h1>Preview QA</h1>' + Array.from({ length: 100 }, (_, i) => `<p>SENTINEL_PREVIEW_${i} text pentru geometrie și salvare.</p>`).join('');
      });
    },
    act: async () => {
      await H.native(['Fișier', 'Tipărire', 'Previzualizare tipărire']);
      await H.wait(async () => (await H.modal().locator('iframe').count()) > 0 && /[1-9]/.test(await H.modal().locator('[data-testid="print-preview-count"]').innerText()), 20000);
    },
    verify: async () => {
      const modal = H.modal();
      const geometry = await modal.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const frame = el.querySelector('.print-preview-frame')?.getBoundingClientRect();
        const actions = el.querySelector('.print-preview-actions')?.getBoundingClientRect();
        return { viewport: { width: innerWidth, height: innerHeight }, rect, frame, actions };
      });
      H.assert(geometry.rect.top >= 0 && geometry.rect.left >= 0, 'Preview dialog starts outside the viewport');
      H.assert(geometry.rect.bottom <= geometry.viewport.height + 1 && geometry.rect.right <= geometry.viewport.width + 1, 'Preview dialog exceeds the viewport');
      H.assert(geometry.frame && geometry.frame.height > 40, 'PDF preview area has no usable height');
      H.assert(geometry.actions && geometry.actions.bottom <= geometry.viewport.height + 1, 'Preview actions are below the viewport');

      const save = modal.getByRole('button', { name: /Salvează PDF/i });
      H.assert(await save.isVisible(), 'Salvează PDF is not visible');
      H.assert(await save.isEnabled(), 'Salvează PDF is not enabled after generation');

      const zoom = modal.locator('select').last();
      await zoom.selectOption('150');
      H.assert((await modal.locator('iframe').getAttribute('src')).includes('zoom=150'), 'Zoom selection did not reach the PDF viewer');

      const output = H.path.join(H.W, 'preview-saved.pdf');
      await H.answer(output);
      await save.click();
      await H.wait(() => H.fs.existsSync(output), 20000);
      H.assert(H.fs.statSync(output).size > 0, 'Saved PDF is empty');

      await modal.locator('.print-preview-actions').getByRole('button', { name: /^Închide$/ }).click();
      H.assert((await H.p.locator('.print-preview').count()) === 0, 'Print Preview did not close');
    },
  });

  const result = await H.run();
  console.log(JSON.stringify(result));
  process.exit(result.failed || result.executed !== result.total ? 1 : 0);
})().catch((error) => { console.error(error); process.exit(1); });
