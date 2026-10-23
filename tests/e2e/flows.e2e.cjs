// Regression sweep in real Electron: binder (add/rename/move/trash/undo/restore), split and
// Scrivenings edits saved to the right documents, snapshots, project search & replace, import
// DOCX/MD, Compile to every file format, .scriv export + re-import, backup + restore, a new
// project from every built-in template, the tutorial project, and main commands through the
// native menu and keyboard shortcuts.
// Native dialogs, shell, window.confirm/prompt are scripted. Every flow is independent: a
// failure is reported with its step and the sweep continues.
// Run: npm run test:e2e (Linux without a display: xvfb-run -a npm run test:e2e).
const fs = require('fs');
const path = require('path');
const os = require('os');
let _electron;
try {
  ({ _electron } = require('playwright'));
} catch {
  ({ _electron } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright'));
}
const W = fs.mkdtempSync(path.join(os.tmpdir(), 'scribner-flows-'));
const ROOT = path.join(__dirname, '..', '..');
let step = 'start';
const watchdog = setTimeout(() => {
  console.error(`FLOWS TIMEOUT at step: ${step}`);
  process.exit(1);
}, Number(process.env.E2E_TIMEOUT_MS) || 420000);

let failures = 0;
const check = (name, ok, info = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ` — ${info}` : ''}`);
  return ok;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 8000, every = 100) {
  const end = Date.now() + ms;
  let v;
  while (Date.now() < end) {
    try {
      v = await fn();
      if (v) return v;
    } catch {
      /* retry */
    }
    await sleep(every);
  }
  return v;
}
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const flat = (nodes, out = []) => {
  for (const n of nodes || []) {
    out.push(n);
    flat(n.children, out);
  }
  return out;
};

(async () => {
  const app = await _electron.launch({
    executablePath: require(path.join(ROOT, 'node_modules', 'electron')),
    args: ['.', '--no-sandbox', `--user-data-dir=${path.join(W, 'user-data')}`],
    cwd: ROOT,
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
    timeout: 60000,
  });
  app.process().stderr?.on('data', (d) => process.env.CI && process.stderr.write(`[main] ${d}`));
  await app.evaluate(({ dialog, Menu, shell }) => {
    shell.showItemInFolder = () => {};
    shell.openPath = async () => '';
    shell.openExternal = async () => {};
    global.__answers = [];
    const next = () => global.__answers.shift();
    dialog.showOpenDialog = async () => {
      const a = next();
      return a ? { canceled: false, filePaths: Array.isArray(a) ? a : [a] } : { canceled: true, filePaths: [] };
    };
    dialog.showOpenDialogSync = () => {
      const a = next();
      return a ? (Array.isArray(a) ? a : [a]) : undefined;
    };
    dialog.showSaveDialog = async () => {
      const a = next();
      return a ? { canceled: false, filePath: a } : { canceled: true };
    };
    dialog.showMessageBox = async () => ({ response: 0 });
    dialog.showMessageBoxSync = () => 0;
    const orig = Menu.buildFromTemplate;
    Menu.buildFromTemplate = (t) => (global.__lastMenu = orig.call(Menu, t));
  });
  const answer = (...answers) => app.evaluate((_, a) => { global.__answers.push(...a); }, answers);
  const pendingAnswers = () => app.evaluate(() => global.__answers.length);
  const win = await app.firstWindow({ timeout: 60000 });
  const errs = [];
  win.on('pageerror', (e) => errs.push(e.message));
  win.on('console', (m) => m.type() === 'error' && !/Autofill|net::ERR_FILE_NOT_FOUND/.test(m.text()) && errs.push(m.text()));
  // Renderer modal dialogs block the event loop under Playwright: answer them.
  const stubRenderer = () => win.evaluate(() => {
    window.confirm = () => true;
    window.prompt = (_m, d) => d ?? '';
    window.alert = () => {};
    window.Notification = undefined;
  });
  await win.waitForSelector('text=Proiect nou', { timeout: 30000 });
  await stubRenderer();

  // --- helpers bound to the window ---
  const currentDir = () => win.evaluate(async () => (await window.api.getSettings()).recent?.[0]?.dir);
  let dir = null;
  const project = () => readJson(path.join(dir, 'project.json'));
  const nodeBy = (title) => flat(project().tree).find((n) => n.title === title);
  const docOnDisk = (id) => {
    const f = path.join(dir, 'docs', `${id}.html`);
    return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  };
  const ed = () => win.locator('.pane .ProseMirror').first();
  const binderRow = (title) => win.locator('.binder .title', { hasText: title }).first();
  // Native menu item, clicked the way the user would (Menu → item → 'menu:command').
  const menuClick = (label) => app.evaluate(({ Menu }, label) => {
    const m = global.__lastMenu || Menu.getApplicationMenu();
    const find = (items) => {
      for (const it of items) {
        if (it.label === label) return it;
        const sub = it.submenu && find(it.submenu.items);
        if (sub) return sub;
      }
      return null;
    };
    const it = m && find(m.items);
    if (!it) return false;
    if (!it.enabled) return 'disabled';
    it.click();
    return true;
  }, label);
  const cmd = (id) => app.evaluate(({ BrowserWindow }, id) => BrowserWindow.getAllWindows()[0].webContents.send('menu:command', id), id);
  const closeModal = async () => {
    for (let i = 0; i < 3 && (await win.locator('.modal').count()); i++) {
      const close = win.locator('.modal button', { hasText: /^(Închide|Anulează)$/ }).first();
      if (await close.count()) await close.click().catch(() => {});
      else await win.keyboard.press('Escape');
      await win.waitForTimeout(150);
    }
  };
  const save = async () => {
    await cmd('save');
    await win.waitForTimeout(400);
  };
  const flow = async (name, fn) => {
    step = name;
    console.log(`\n## ${name}`);
    const f0 = failures;
    await app.evaluate(() => { global.__answers = []; }); // nothing left over from an earlier flow
    try {
      await fn();
    } catch (e) {
      check(`${name}: no exception`, false, e.message.split('\n')[0]);
    }
    if (failures > f0) {
      const toasts = await win.locator('.toast').allInnerTexts().catch(() => []);
      if (toasts.length) console.log(`  toasts: ${toasts.join(' | ')}`);
      await win.screenshot({ path: path.join(W, `fail-${name.replace(/\W+/g, '_')}.png`) }).catch(() => {});
    }
    await closeModal().catch(() => {});
  };

  // ---------- 1. New project from the Home screen ----------
  await flow('new project', async () => {
    fs.mkdirSync(path.join(W, 'projects'), { recursive: true });
    await answer(path.join(W, 'projects'));
    await win.getByPlaceholder('Titlul cărții').fill('Flows');
    await win.locator('select').filter({ has: win.locator('option[value="blank"]') }).first().selectOption('blank');
    await win.getByRole('button', { name: 'Creează' }).click();
    await win.waitForSelector('.pane .ProseMirror', { timeout: 20000 });
    dir = await currentDir();
    check('project created', dir && fs.existsSync(path.join(dir, 'project.json')), dir);
    await waitFor(() => win.evaluate(() => true));
    await win.waitForTimeout(600);
  });

  // ---------- 2. Binder: add, rename, move, trash, undo, restore ----------
  await flow('binder', async () => {
    const add = async (title) => {
      await win.locator('.binder button', { hasText: '+ Doc' }).click();
      const input = win.locator('.binder input:not(.search)').first();
      await input.waitFor({ timeout: 5000 });
      await input.fill(title);
      await input.press('Enter');
      await waitFor(() => nodeBy(title), 4000);
    };
    await add('Alfa');
    await add('Beta');
    check('add + rename saved to project.json', Boolean(nodeBy('Alfa') && nodeBy('Beta')));
    const parentKids = () => {
      const p = flat(project().tree).find((n) => (n.children || []).some((c) => c.title === 'Beta'));
      return p.children.map((c) => c.title);
    };
    const before = parentKids();
    check('Beta right after Alfa', before.indexOf('Beta') === before.indexOf('Alfa') + 1, before.join(','));
    await binderRow('Beta').click();
    await win.keyboard.press('Control+ArrowUp');
    const moved = await waitFor(() => { const k = parentKids(); return k.indexOf('Beta') < k.indexOf('Alfa') && k; }, 3000);
    check('Ctrl+↑ moves Beta above Alfa', Boolean(moved), (moved || parentKids()).join(','));
    await binderRow('Beta').click();
    await win.keyboard.press('Delete');
    const trashed = () => {
      const trash = project().tree.find((n) => n.root === 'trash');
      return flat(trash.children).some((n) => n.title === 'Beta');
    };
    check('Delete moves Beta to the trash', Boolean(await waitFor(trashed, 3000)));
    await win.locator('.binder').focus().catch(() => {});
    await win.keyboard.press('Control+z');
    check('Ctrl+Z in binder undoes the trash', Boolean(await waitFor(() => !trashed() && nodeBy('Beta'), 3000)));
    await binderRow('Beta').click();
    await win.keyboard.press('Delete');
    await waitFor(trashed, 3000);
    // Restore from trash: select it in the trash, then Documents → Restore from trash.
    const trashRow = win.locator('.binder li', { has: win.locator('.title', { hasText: /^Coș|Trash|Coșul/ }) }).first();
    if (!(await binderRow('Beta').isVisible().catch(() => false))) await trashRow.locator('.twisty').first().click().catch(() => {});
    await binderRow('Beta').click();
    await cmd('restoreTrash');
    check('restore from trash', Boolean(await waitFor(() => !trashed() && nodeBy('Beta'), 3000)));
  });

  // ---------- 3. Split at cursor + Scrivenings edits ----------
  await flow('split and scrivenings', async () => {
    await binderRow('Alfa').click();
    await ed().click();
    await win.keyboard.press('Control+End');
    await win.keyboard.type('Prima parte a textului.');
    await win.keyboard.press('Enter');
    await win.keyboard.type('A doua parte.');
    await save();
    const alfa = nodeBy('Alfa');
    check('typing saved to Alfa', /Prima parte a textului\./.test(docOnDisk(alfa.id)) && /A doua parte\./.test(docOnDisk(alfa.id)));
    await win.keyboard.press('Home'); // caret at the start of "A doua parte."
    await cmd('split');
    const second = await waitFor(() => flat(project().tree).find((n) => /Alfa \(continuare\)/.test(n.title)), 5000);
    check('split creates "Alfa (continuare)"', Boolean(second));
    if (!second) return;
    await save();
    const a1 = docOnDisk(alfa.id);
    const a2 = docOnDisk(second.id);
    check('split: first part keeps the text before the cursor', /Prima parte/.test(a1) && !/A doua parte/.test(a1), a1.slice(0, 120));
    check('split: second part has the text after the cursor', /A doua parte/.test(a2) && !/Prima parte/.test(a2), a2.slice(0, 120));
    // Scrivenings: select the parent folder of Alfa (the Draft) → every section editable in one view.
    const draft = project().tree[0];
    await binderRow(draft.title).click();
    await win.waitForTimeout(400);
    const sections = win.locator('.pane .ProseMirror');
    const count = await sections.count();
    check('Scrivenings shows several sections', count >= 2, String(count));
    // Find the section of "Alfa (continuare)" by its text and type into it.
    let idx = -1;
    for (let i = 0; i < count; i++) if (/A doua parte/.test(await sections.nth(i).innerText())) idx = i;
    check('Scrivenings has the second part', idx >= 0);
    if (idx < 0) return;
    await sections.nth(idx).click();
    await win.keyboard.press('Control+End');
    await win.keyboard.type(' Editat în Scrivenings.');
    await save();
    check('Scrivenings edit saved to the second document', /Editat în Scrivenings/.test(docOnDisk(second.id)));
    check('Scrivenings edit not leaked into the first document', !/Editat în Scrivenings/.test(docOnDisk(alfa.id)));
    check('Scrivenings edit not leaked into any other document', fs.readdirSync(path.join(dir, 'docs')).filter((f) => /Editat în Scrivenings/.test(fs.readFileSync(path.join(dir, 'docs', f), 'utf8'))).length === 1);
  });

  // ---------- 4. Snapshot take + restore ----------
  await flow('snapshots', async () => {
    const alfa = nodeBy('Alfa');
    await binderRow('Alfa').click();
    await win.waitForTimeout(300);
    const original = docOnDisk(alfa.id);
    const snapDir = path.join(dir, 'snapshots', alfa.id);
    const listSnaps = () => (fs.existsSync(snapDir) ? fs.readdirSync(snapDir) : []);
    const s0 = listSnaps().length; // the split already left an automatic snapshot
    await cmd('snapshot');
    check('snapshot written to disk', Boolean(await waitFor(() => listSnaps().length === s0 + 1, 4000)), listSnaps().join(','));
    await ed().click();
    await win.keyboard.press('Control+End');
    await win.keyboard.type(' TEXT DUPĂ SNAPSHOT');
    await save();
    check('text changed after snapshot', /TEXT DUPĂ SNAPSHOT/.test(docOnDisk(alfa.id)));
    if (!(await win.locator('.side').count())) await cmd('toggleInspector');
    await win.locator('.side button[aria-label="Snapshot-uri"]').click();
    const restore = win.locator('.snapshots li', { has: win.locator('strong', { hasText: /^Snapshot / }) }).first().locator('button', { hasText: 'Restaurează' });
    await restore.waitFor({ timeout: 4000 });
    await restore.click();
    await win.waitForTimeout(300);
    await save();
    const now = docOnDisk(alfa.id);
    check('restore puts the snapshot text back on disk', now === original, now.slice(0, 120));
    check('restore shows the snapshot text in the editor', !/TEXT DUPĂ SNAPSHOT/.test(await ed().innerText()));
    check('restore keeps an automatic snapshot of the replaced text', listSnaps().length === s0 + 2, String(listSnaps().length));
    await win.locator('.side button[aria-label="Detalii"]').click().catch(() => {});
  });

  // ---------- 5. Project search & replace ----------
  await flow('project search and replace', async () => {
    await cmd('findProject');
    const dlg = win.locator('.modal[aria-label="Caută în proiect"]');
    await dlg.waitFor({ timeout: 4000 });
    await dlg.locator('label', { hasText: 'Caută' }).locator('input').fill('Prima parte');
    await dlg.locator('label', { hasText: 'Înlocuiește cu' }).locator('input').fill('Partea întâi');
    await dlg.locator('button.primary').click();
    await waitFor(() => dlg.locator('text=Înlocuite').count(), 4000);
    const alfa = nodeBy('Alfa');
    check('replace-all written to disk', /Partea întâi/.test(docOnDisk(alfa.id)) && !/Prima parte/.test(docOnDisk(alfa.id)));
    await closeModal();
    await binderRow('Alfa').click();
    await win.waitForTimeout(300);
    check('open editor shows the replaced text', /Partea întâi/.test(await ed().innerText()));
    // A keystroke after replace-all must not bring the old text back (stale editor/doc cache).
    await ed().click();
    await win.keyboard.press('Control+End');
    await win.keyboard.type('!');
    await save();
    check('typing after replace keeps the replacement', /Partea întâi/.test(docOnDisk(alfa.id)) && !/Prima parte/.test(docOnDisk(alfa.id)));
  });

  // ---------- 5b. Typing followed at once by other actions ----------
  // Typing reaches React state only after a short pause (see App.jsx, typed text); every
  // action right after a keystroke must still see the newest text.
  await flow('typing then immediate actions', async () => {
    const alfa = nodeBy('Alfa');
    await binderRow('Alfa').click();
    await ed().click();
    await win.keyboard.press('Control+End');
    await win.keyboard.type(' Cuvântrapid');
    await binderRow('Beta').click(); // switch documents within the commit delay
    await binderRow('Alfa').click();
    await win.waitForTimeout(150);
    check('switching away and back keeps just-typed text', /Cuvântrapid/.test(await ed().innerText()));
    await ed().click();
    await win.keyboard.press('Control+End');
    await win.keyboard.type(' Altcuvânt');
    await win.keyboard.press('Control+Shift+F');
    const dlg = win.locator('.modal[aria-label="Caută în proiect"]');
    await dlg.waitFor({ timeout: 4000 });
    await dlg.locator('label', { hasText: 'Caută' }).locator('input').fill('Altcuvânt');
    check('project search sees just-typed text', Boolean(await waitFor(() => dlg.locator('button.link', { hasText: 'Alfa' }).count(), 2000)));
    await closeModal();
    await ed().click();
    await win.keyboard.press('Control+End');
    await win.keyboard.type(' Ultimul');
    await cmd('compile');
    await win.waitForSelector('text=Format de ieșire', { timeout: 5000 });
    await win.locator('select').filter({ has: win.locator('option[value="txt"]') }).first().selectOption('txt');
    const f = path.join(W, 'quick.txt');
    await answer(f);
    await win.locator('.modal button.primary', { hasText: 'Compilează' }).click();
    check('compile right after typing includes it', Boolean(await waitFor(() => fs.existsSync(f) && /Ultimul/.test(fs.readFileSync(f, 'utf8')), 8000)));
    await closeModal();
    check('all of it on disk', /Cuvântrapid.*Altcuvânt.*Ultimul/s.test(docOnDisk(alfa.id)));
  });

  // ---------- 6. Compile to every file format ----------
  const outputs = ['docx', 'pdf', 'epub', 'html', 'rtf', 'odt', 'md', 'mmd', 'txt', 'fountain', 'fdx', 'tex'];
  await flow('compile all formats', async () => {
    for (const fmt of outputs) {
      step = `compile ${fmt}`;
      const file = path.join(W, `out.${fmt}`);
      await cmd('compile');
      await win.waitForSelector('text=Format de ieșire', { timeout: 5000 });
      await win.locator('select').filter({ has: win.locator(`option[value="${fmt}"]`) }).first().selectOption(fmt);
      await answer(file);
      await win.locator('.modal button.primary', { hasText: 'Compilează' }).click();
      const ok = await waitFor(() => fs.existsSync(file) && fs.statSync(file).size > 0, 15000);
      const body = ok ? fs.readFileSync(file) : Buffer.alloc(0);
      const text = body.toString('utf8');
      const sane = {
        docx: () => body.slice(0, 2).toString() === 'PK',
        odt: () => body.slice(0, 2).toString() === 'PK',
        epub: () => body.slice(0, 2).toString() === 'PK',
        pdf: () => text.startsWith('%PDF'),
        rtf: () => text.startsWith('{\\rtf') && /Partea/.test(text.replace(/\\'[0-9a-f]{2}|\\u\d+\??/g, '')),
        fdx: () => /<FinalDraft/.test(text),
      }[fmt] || (() => /Partea întâi|Partea/.test(text));
      check(`compile ${fmt}`, ok && sane(), ok ? `${body.length} bytes` : 'MISSING');
      if ((await pendingAnswers()) > 0) await app.evaluate(() => { global.__answers = []; });
      await closeModal();
    }
  });

  // ---------- 7. Import DOCX + Markdown ----------
  await flow('import docx and md', async () => {
    const md = path.join(W, 'capitol.md');
    fs.writeFileSync(md, '# Capitol importat\n\nText din **Markdown** importat.\n');
    const docx = path.join(W, 'out.docx');
    for (const [file, re] of [[md, /Text din <strong>Markdown<\/strong> importat|Text din Markdown importat/], [docx, /Partea întâi/]]) {
      if (!fs.existsSync(file)) { check(`import ${path.extname(file)}: source exists`, false); continue; }
      const before = new Set(flat(project().tree).map((n) => n.id));
      await cmd('import');
      const dlg = win.locator('.modal', { hasText: 'Alege fișiere' });
      await dlg.waitFor({ timeout: 4000 });
      await dlg.locator('select').first().selectOption('none');
      await answer([file]);
      await dlg.locator('button.primary').click();
      const added = await waitFor(() => { const a = flat(project().tree).filter((n) => !before.has(n.id)); return a.length && a.every((n) => docOnDisk(n.id)) && a; }, 6000);
      const texts = (added || []).map((n) => docOnDisk(n.id)).join('\n');
      check(`import ${path.extname(file)} creates a document with its text`, Boolean(added && added.length) && re.test(texts), `${(added || []).map((n) => n.title).join(', ')}: ${texts.slice(0, 160)}`);
      await closeModal();
    }
  });

  // ---------- 8. Export .scriv + re-import ----------
  await flow('scriv export and reimport', async () => {
    const out = path.join(W, 'scrivout');
    fs.mkdirSync(out, { recursive: true });
    await answer(out);
    await cmd('exportScriv');
    const scriv = await waitFor(() => fs.readdirSync(out).find((f) => f.endsWith('.scriv')), 8000);
    check('.scriv folder written', Boolean(scriv));
    if (!scriv) return;
    const re = path.join(W, 'reimport');
    fs.mkdirSync(re, { recursive: true });
    await answer(path.join(out, scriv), re);
    const imp = await win.evaluate(() => window.api.importScriv()).catch((e) => ({ error: e.message }));
    check('re-import .scriv', imp && imp.dir && !imp.error, imp?.error || imp?.dir);
    if (!imp?.dir) return;
    const titles = flat(imp.project.tree).map((n) => n.title);
    check('re-import keeps binder titles', ['Alfa', 'Beta', 'Alfa (continuare)'].every((t) => titles.includes(t)), titles.join(', '));
    const all = fs.readdirSync(path.join(imp.dir, 'docs')).map((f) => fs.readFileSync(path.join(imp.dir, 'docs', f), 'utf8')).join('\n');
    check('re-import keeps the text', /Partea întâi/.test(all) && /Editat în Scrivenings/.test(all));
  });

  // ---------- 9. Backup now + restore ----------
  await flow('backup and restore', async () => {
    await cmd('backups');
    const dlg = win.locator('.modal[aria-label="Backup-uri"]');
    await dlg.waitFor({ timeout: 4000 });
    await dlg.locator('button.primary').click();
    const items = dlg.locator('.backup-list li');
    check('backup listed', Boolean(await waitFor(() => items.count(), 15000)));
    const prev = dir;
    await items.first().locator('button', { hasText: 'Restaurează' }).click();
    // The copy is created next to the project and becomes the most recent one.
    const restored = await waitFor(async () => { const d = await currentDir(); return d && d !== prev && path.dirname(d) === path.dirname(prev) && d; }, 15000);
    check('restore opens a separate copy', Boolean(restored), restored);
    if (!restored) return;
    await win.waitForSelector('.pane .ProseMirror', { timeout: 10000 });
    const all = fs.readdirSync(path.join(restored, 'docs')).map((f) => fs.readFileSync(path.join(restored, 'docs', f), 'utf8')).join('\n');
    check('restored copy has the text', /Partea întâi/.test(all));
    check('original project untouched', fs.existsSync(path.join(prev, 'project.json')));
    dir = restored;
  });

  // ---------- 10. Main commands via the native menu and keyboard ----------
  await flow('native menu and shortcuts', async () => {
    const menuLabels = await app.evaluate(({ Menu }) => {
      const m = global.__lastMenu || Menu.getApplicationMenu();
      return m ? m.items.map((i) => i.label) : [];
    });
    check('native menu present', menuLabels.length >= 8, menuLabels.join(' | '));
    const docsCount = () => flat(project().tree).filter((n) => n.type === 'text').length;
    const foldersCount = () => flat(project().tree).filter((n) => n.type === 'folder' && !n.root).length;
    // Menu → Document nou
    let n0 = docsCount();
    check('menu "Document nou" clicked', (await menuClick('Document nou')) === true);
    check('menu: new document', Boolean(await waitFor(() => docsCount() === n0 + 1, 3000)), `${n0} → ${docsCount()}`);
    await win.keyboard.press('Escape'); // leave rename mode
    await win.waitForTimeout(200);
    const f0 = foldersCount();
    await menuClick('Dosar nou');
    check('menu: new folder', Boolean(await waitFor(() => foldersCount() === f0 + 1, 3000)));
    await win.keyboard.press('Escape');
    await win.waitForTimeout(200);
    // Views
    await menuClick('Corkboard');
    check('menu: corkboard view', Boolean(await waitFor(() => win.locator('.toolbar .seg button.on', { hasText: 'Corkboard' }).count(), 2000)));
    await menuClick('Outline');
    check('menu: outline view', Boolean(await waitFor(() => win.locator('.toolbar .seg button.on', { hasText: 'Outline' }).count(), 2000)));
    await menuClick('Editor');
    check('menu: editor view', Boolean(await waitFor(() => win.locator('.toolbar .seg button.on', { hasText: 'Editor' }).count(), 2000)));
    // Dialogs from the menu
    for (const [label, sel] of [['Mergi la…', '.modal'], ['Caută și înlocuiește în proiect…', '.modal[aria-label="Caută în proiect"]'], ['Compilează…', 'text=Format de ieșire'], ['Statistici…', '.modal']]) {
      const r = await menuClick(label);
      check(`menu: "${label}" opens its dialog`, r === true && Boolean(await waitFor(() => win.locator(sel).count(), 3000)), String(r));
      await closeModal();
    }
    // Keyboard shortcuts (renderer handler) on an editor document.
    await binderRow('Alfa').click();
    await ed().click();
    n0 = docsCount();
    await win.keyboard.press('Control+n');
    check('Ctrl+N: exactly one new document', Boolean(await waitFor(() => docsCount() === n0 + 1, 3000)) && (await sleep(500), docsCount() === n0 + 1), `${n0} → ${docsCount()}`);
    await win.keyboard.press('Escape');
    await win.waitForTimeout(200);
    await win.keyboard.press('Control+2');
    check('Ctrl+2: corkboard', Boolean(await waitFor(() => win.locator('.toolbar .seg button.on', { hasText: 'Corkboard' }).count(), 2000)));
    await win.keyboard.press('Control+1');
    check('Ctrl+1: editor', Boolean(await waitFor(() => win.locator('.toolbar .seg button.on', { hasText: 'Editor' }).count(), 2000)));
    await win.keyboard.press('Control+g');
    check('Ctrl+G: go to dialog', Boolean(await waitFor(() => win.locator('.modal').count(), 2000)));
    await closeModal();
    await binderRow('Alfa').click();
    const alfa = nodeBy('Alfa');
    const snapDir = path.join(dir, 'snapshots', alfa.id);
    const s0 = fs.existsSync(snapDir) ? fs.readdirSync(snapDir).length : 0;
    await win.keyboard.press('Control+5');
    check('Ctrl+5: snapshot', Boolean(await waitFor(() => fs.existsSync(snapDir) && fs.readdirSync(snapDir).length > s0, 3000)));
    await ed().click();
    await win.keyboard.press('Control+End');
    await win.keyboard.type(' Salvat cu Ctrl+S.');
    await win.keyboard.press('Control+s');
    check('Ctrl+S saves immediately', Boolean(await waitFor(() => /Salvat cu Ctrl\+S\./.test(docOnDisk(alfa.id)), 1500)));
    await win.keyboard.press('Control+Shift+I');
    const sideAfter = await waitFor(async () => (await win.locator('.side').count()) === 0, 1500);
    await win.keyboard.press('Control+Shift+I');
    check('Ctrl+Shift+I toggles the inspector', Boolean(sideAfter) && Boolean(await waitFor(() => win.locator('.side').count(), 1500)));
  });

  // ---------- 11. New project from every built-in template ----------
  await flow('templates', async () => {
    const list = await win.evaluate(() => window.api.listTemplates());
    const ids = list.map((t) => t.id).filter((id) => id !== 'tutorial');
    check('built-in templates listed', ids.length >= 5, ids.join(' '));
    const tdir = path.join(W, 'tpl');
    fs.mkdirSync(tdir, { recursive: true });
    for (const id of ids) {
      step = `template ${id}`;
      await answer(tdir);
      const res = await win.evaluate((id) => window.api.newProject(`Tpl ${id}`, id), id).catch((e) => ({ error: e.message }));
      if (!check(`template ${id}: created`, res && res.dir && !res.error, res?.error)) continue;
      const pj = readJson(path.join(res.dir, 'project.json'));
      const nodes = flat(pj.tree).filter((n) => !n.root);
      const reopen = await win.evaluate((d) => window.api.openProject(d).then((r) => Boolean(r.project)), res.dir).catch((e) => e.message);
      const roots = pj.tree.map((n) => n.root).filter(Boolean);
      const missing = nodes.filter((n) => n.type === 'text' && !fs.existsSync(path.join(res.dir, 'docs', `${n.id}.html`)));
      check(`template ${id}: opens, has draft/research/trash and doc files`, reopen === true && ['draft', 'research', 'trash'].every((r) => roots.includes(r)) && missing.length === 0, `${nodes.length} items${missing.length ? `, ${missing.length} without file` : ''}${reopen === true ? '' : `, open: ${reopen}`}`);
    }
  });

  // ---------- 12. Tutorial project from the Home screen ----------
  await flow('tutorial', async () => {
    await cmd('closeProject');
    await win.waitForSelector('text=Proiect nou', { timeout: 8000 });
    fs.mkdirSync(path.join(W, 'tut'), { recursive: true });
    await answer(path.join(W, 'tut'));
    await win.getByText('Tutorial interactiv').first().click();
    await win.waitForSelector('.pane .ProseMirror', { timeout: 15000 });
    const tdir = await currentDir();
    const pj = readJson(path.join(tdir, 'project.json'));
    const texts = flat(pj.tree).filter((n) => n.type === 'text');
    check('tutorial project opened', /Tutorial/.test(pj.title) && texts.length >= 3, `${pj.title}, ${texts.length} documents`);
    check('tutorial editor shows text', (await ed().innerText()).trim().length > 20);
  });

  check('no renderer errors', errs.length === 0, errs.slice(0, 5).join(' | '));
  await app.close().catch(() => {});
  console.log(failures ? `\nFLOWS: ${failures} failing (artefacts in ${W})` : '\nFLOWS OK');
  clearTimeout(watchdog);
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error('FAIL', step, e.message);
  process.exit(1);
});
