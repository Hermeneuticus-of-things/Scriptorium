// P11 small windows: scratchpad (formatted text, folder mode, import, send to a chosen folder and
// append to the selected document), composition bar (zoom, keywords, progress, prev/next), targets
// panel (options, stays open beside other dialogs), statistics (sortable frequency, CSV, chart, quick
// text statistics), history (range, gross words, delete days), snapshots (copy selection to the
// document, manager sorting + reveal), name generator (starting letter), linguistic focus (pronouns,
// prepositions, dialogue, highlight), layouts (export/import, thumbnail).
// Run against `npx vite preview` (SCRIBNER_URL).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { open, ed, caretEnd, check, done, menuCmd } = require('./_helpers.cjs');
(async () => {
  const { browser, page, errors } = await open();
  page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'Aranjament P11' : undefined));
  await page.locator('.binder-row', { hasText: 'Începutul' }).first().click();
  await page.waitForTimeout(250);

  // ---------- Scratchpad
  await menuCmd(page, 'Ciorne (Scratchpad)');
  const sp = page.locator('.scratchpad');
  check('scratchpad opens', (await sp.count()) === 1);
  // move it off the binder (dragged by its title bar)
  const hb = await sp.locator('strong').first().boundingBox();
  await page.mouse.move(hb.x + 5, hb.y + 5);
  await page.mouse.down();
  await page.mouse.move(hb.x + 600, hb.y + 300, { steps: 5 });
  await page.mouse.up();
  await sp.locator('button.sp-add').click();
  await sp.locator('input.sp-title').fill('Idee P11');
  const body = sp.locator('.sp-body');
  await body.click();
  await page.keyboard.type('text ');
  await sp.locator('button.sp-bold').click();
  await page.keyboard.type('gros');
  await page.waitForTimeout(500);
  check('formatted text in the note', (await body.locator('b, strong').count()) >= 1, await body.innerHTML());
  await sp.locator('button.sp-folder').click();
  await page.waitForTimeout(400);
  check('notes kept in a folder', (await sp.locator('button.sp-folder.on').count()) === 1);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p11-'));
  const noteFile = path.join(tmp, 'importata.txt');
  fs.writeFileSync(noteFile, 'rand unu\nrand doi');
  await sp.locator('input[type=file]').setInputFiles(noteFile);
  await page.waitForTimeout(300);
  check('imported note listed', (await sp.locator('li.sp-note', { hasText: 'importata' }).count()) === 1);
  await sp.locator('li.sp-note', { hasText: 'Idee P11' }).click();
  const destOptions = await sp.locator('select.sp-dest option').count();
  check('destination folders offered', destOptions >= 2, String(destOptions));
  await sp.locator('button.sp-send-btn').click();
  await page.waitForTimeout(300);
  check('note sent as a new document', (await page.locator('.binder-row', { hasText: 'Idee P11' }).count()) >= 1);
  await page.locator('.binder-row', { hasText: 'Începutul' }).first().click();
  await page.waitForTimeout(250);
  await sp.locator('select.sp-mode').selectOption('append');
  await sp.locator('button.sp-send-btn').click();
  await page.waitForTimeout(400);
  check('note appended to the selected document', (await ed(page).innerText()).includes('gros'));
  await sp.locator('button[aria-label="Închide"], button[title="Închide"]').last().click().catch(() => {});
  if (await sp.count()) await menuCmd(page, 'Ciorne (Scratchpad)');

  // ---------- Linguistic focus: prepositions, highlight, dialogue
  await menuCmd(page, 'Focus lingvistic…');
  const lf = page.locator('.linguistic-focus-panel');
  await lf.locator('input[value="prep"]').check();
  await page.waitForTimeout(250);
  check('prepositions focused', (await page.locator('.pane .ProseMirror .pos-focus').count()) > 0);
  await lf.locator('select.lf-style').selectOption('highlight');
  await page.waitForTimeout(150);
  check('highlight style on the body', await page.evaluate(() => document.body.classList.contains('lf-highlight')));
  await lf.locator('input[value="pron"]').check();
  await page.waitForTimeout(200);
  check('pronouns focused', (await page.locator('.pane .ProseMirror .pos-focus').count()) > 0);
  await lf.locator('input[value="dialogue"]').check();
  await page.waitForTimeout(200);
  check('dialogue focus from the panel', (await page.locator('.pane .ProseMirror .pos-focus').count()) === 0);
  await lf.locator('.fp-close').click();

  // ---------- Targets panel
  await menuCmd(page, 'Ținte și termen limită…');
  const tp = page.locator('.targets-panel');
  check('targets panel opens', (await tp.count()) === 1);
  await tp.locator('summary').click();
  await tp.locator('input.tg-negative').check();
  await tp.locator('input.tg-from-deadline').check();
  await tp.locator('input.tg-all-projects').check();
  await page.waitForTimeout(500);
  await menuCmd(page, 'Statistici…');
  check('targets panel stays open beside another window', (await tp.count()) === 1);

  // ---------- Statistics
  const st = page.locator('.modal[aria-label="Statistici"]');
  await st.locator('summary').click();
  await st.locator('[role=tab]', { hasText: 'Frecvența' }).click();
  await page.waitForTimeout(200);
  const firstBefore = await st.locator('.freq-table tbody tr td').first().innerText();
  await st.locator('button.freq-sort-word').click();
  await page.waitForTimeout(100);
  const words = await st.locator('.freq-table tbody tr td:first-child').allInnerTexts();
  const sorted = [...words].sort((a, b) => a.localeCompare(b));
  check('frequency sorted by word', JSON.stringify(words.slice(0, 5)) === JSON.stringify(sorted.slice(0, 5)), `${firstBefore} → ${words.slice(0, 3)}`);
  await st.locator('input.freq-chart-toggle').check();
  check('frequency chart', (await st.locator('.freq-chart-row').count()) > 0);
  const [dl] = await Promise.all([page.waitForEvent('download'), st.locator('button.freq-csv').click()]);
  check('frequency CSV', /\.csv$/.test(dl.suggestedFilename()));
  await tp.locator('.tp-close').click();
  await st.locator('.actions button.primary').click();

  // ---------- Quick text statistics
  await caretEnd(page);
  await page.keyboard.press('Shift+Home');
  // P10: the live window opens from Proiect › Statistici… (textStats command unified).
  await menuCmd(page, 'Statistici…');
  await page.locator('button.stats-live-text').click();
  const ts = page.locator('.text-stats-panel');
  check('text statistics open', (await ts.count()) === 1);
  check('text statistics count the selection', /Selecția/.test(await ts.locator('.ts-scope').innerText()) && Number(await ts.locator('.ts-words').innerText()) > 0);
  await ts.locator('.fp-close').click();

  // ---------- History: gross words, range, delete
  await caretEnd(page);
  await page.keyboard.type(' unu doi trei');
  await page.waitForTimeout(2500);
  await menuCmd(page, 'Istoricul scrisului…');
  const hi = page.locator('.history-dialog');
  check('history opens', (await hi.count()) === 1);
  check('added words shown', (await hi.locator('.hi-added').count()) === 1);
  await hi.locator('input.hi-from').fill('2001-01-01');
  await hi.locator('input.hi-to').fill('2001-01-02');
  check('date range filters days', (await hi.locator('tbody tr').count()) === 0);
  await hi.locator('button.link', { hasText: 'Toate datele' }).click();
  const days = await hi.locator('input.hi-pick').count();
  if (days) {
    await hi.locator('input.hi-pick').first().check();
    await hi.locator('button.hi-delete-days').click();
    await page.waitForTimeout(300);
    check('selected day deleted', (await hi.locator('input.hi-pick').count()) === days - 1);
  } else check('history has a day', false);
  await hi.locator('.actions button.primary').click();

  // ---------- Composition bar
  await menuCmd(page, 'Mod compunere');
  await page.mouse.move(700, 895);
  await page.waitForTimeout(400);
  const bar = page.locator('.comp-bar');
  const reveal = async () => { await page.mouse.move(700, 600); await page.mouse.move(700, 895); await page.waitForTimeout(350); };
  check('composition zoom select', (await bar.locator('select.comp-zoom').count()) === 1);
  await bar.locator('select.comp-zoom').selectOption('150');
  check('keywords button', (await bar.locator('button.comp-keywords').count()) === 1);
  await reveal();
  await bar.locator('button.comp-keywords').click();
  await page.waitForTimeout(200);
  check('keywords HUD from the bar', (await page.locator('.keywords-hud').count()) === 1);
  await page.locator('.keywords-hud .fp-close').click();
  check('session progress in the bar', (await bar.locator('progress.comp-session-progress').count()) === 1);
  const titleBefore = (await ed(page).innerText()).slice(0, 60);
  await reveal();
  await bar.locator('button.comp-next').click();
  await page.waitForTimeout(300);
  const titleAfter = (await ed(page).innerText()).slice(0, 60);
  check('next document from the bar', titleBefore !== titleAfter, `${titleBefore} → ${titleAfter}`);
  await reveal();
  await bar.locator('button.exit-composition').click();
  await page.waitForTimeout(300);
  check('composition closed', (await page.locator('.app.composition').count()) === 0);

  // ---------- Name generator: starting letter
  await menuCmd(page, 'Generator de nume');
  const ng = page.locator('.modal', { has: page.locator('input.ng-starts') });
  check('name generator opens', (await ng.count()) === 1);
  await ng.locator('input.ng-starts').fill('M');
  await page.waitForTimeout(150);
  const names = await ng.locator('ul li > span:first-child').allInnerTexts();
  check('names start with the letter', names.length > 0 && names.every((n) => n.startsWith('M')), names.slice(0, 3).join(', '));
  const listFile = path.join(tmp, 'nume.txt');
  fs.writeFileSync(listFile, 'm: Zorel\nf: Zamfira\nn: Zăbavă\n');
  await ng.locator('input[type=file]').setInputFiles(listFile);
  await page.waitForTimeout(200);
  check('custom list imported', (await ng.locator('.ng-list', { hasText: 'nume' }).count()) === 1);
  await ng.locator('.modal-actions button').last().click();

  // ---------- Snapshots: copy part into the document, manager sort + reveal
  await page.locator('.binder-row', { hasText: 'Începutul' }).first().click();
  await page.waitForTimeout(250);
  if (!(await page.locator('.inspector .tabs').count())) { await page.keyboard.press('Control+Shift+I'); await page.waitForTimeout(200); }
  await page.locator('.inspector .tabs button').nth(3).click();
  const pane = page.locator('.inspector .snapshots');
  await pane.locator('button.snap-add').click();
  await page.waitForTimeout(300);
  await pane.locator('li').first().click();
  await page.waitForTimeout(150);
  await caretEnd(page);
  await page.keyboard.type(' ');
  const before = await ed(page).innerText();
  await page.evaluate(() => {
    const p = document.querySelector('.inspector .snap-preview.prose');
    const r = document.createRange();
    const tn = p.querySelector('p')?.firstChild || p.firstChild;
    r.setStart(tn, 0);
    r.setEnd(tn, Math.min(5, tn.textContent.length));
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  });
  await page.waitForTimeout(150);
  await pane.locator('button.snap-copy-to-doc').click();
  await page.waitForTimeout(300);
  check('snapshot part copied into the document', (await ed(page).innerText()).length > before.length);
  await menuCmd(page, 'Managerul de snapshot-uri');
  const sm = page.locator('.modal.snap-manager');
  check('manager sort buttons', (await sm.locator('button.sm-sort-count').count()) === 1);
  await sm.locator('button.sm-sort-count').click();
  check('manager sorted', (await sm.locator('.snap-manager-docs [aria-sort="descending"]').count()) === 1);
  await sm.locator('button.sm-reveal').click();
  await page.waitForTimeout(300);
  check('reveal in binder closes the manager', (await sm.count()) === 0);

  // ---------- Layouts: save, export, import, thumbnail
  await menuCmd(page, 'Salvează layout-ul curent');
  await menuCmd(page, 'Gestionează layout-urile');
  const ly = page.locator('.layouts-dialog');
  check('layout thumbnail', (await ly.locator('svg.layout-thumb rect').count()) >= 2);
  const [ldl] = await Promise.all([page.waitForEvent('download'), ly.locator('button.ly-export').first().click()]);
  const lfile = path.join(tmp, 'layout.json');
  await ldl.saveAs(lfile);
  const json = JSON.parse(fs.readFileSync(lfile, 'utf8'));
  json.layout.name = 'Importat P11';
  fs.writeFileSync(lfile, JSON.stringify(json));
  await ly.locator('input[type=file]').setInputFiles(lfile);
  await page.waitForTimeout(300);
  check('layout imported', (await ly.locator('input[value="Importat P11"]').count()) === 1);

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
