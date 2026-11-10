'use strict';
// Only this domain module and its catalog are authored here. The parent runs Electron serially.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const source = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
// Read-only evaluation of declarative source data, NEVER replacement of window.api or commands.
function data(rel, names, env = {}) {
  const code = source(rel).replace(/^import .*?;\s*$/gm, '').replace(/\bexport\s+default\s+/g, '').replace(/\bexport\s+(?=(const|let|var|function|class)\b)/g, '').replace(/^export\s*\{[^}]*\};?\s*$/gm, '');
  return Function(...Object.keys(env), code + '\nreturn {' + names.join(',') + '};')(...Object.values(env));
}
const UI = data('src/lib/i18n-ui.js', ['uiRo', 'uiEn']);
const I18N = data('src/lib/i18n.js', ['dictionaries'], UI).dictionaries;
const t = (key, vars = {}) => String(I18N.ro[key] || key).replace(/\{([^}]+)\}/g, (_, k) => String(vars[k] ?? ''));
const { DEFAULT_KEYS } = data('src/lib/commands.js', ['DEFAULT_KEYS']);
const { MANUAL_RO } = data('src/help/manual.ro.js', ['MANUAL_RO']);
const { SCRIPT_FORMAT_LIST } = data('src/lib/scriptFormats.js', ['SCRIPT_FORMAT_LIST']);
const ABOUT = data('src/lib/aboutInfo.js', ['ABOUT_LICENSES', 'REPO_URL', 'DTED_URL']);
const { TEMPLATES } = require(path.join(ROOT, 'lib/templates.cjs'));
const { MANUAL_EN } = data('src/help/manual.en.js', ['MANUAL_EN']);
const REF = data('src/help/reference.js', ['shortcutRows', 'placeholderRows', 'syntaxRows', 'scriptRows'], { DEFAULT_KEYS, dictionaries: I18N, SCRIPT_FORMAT_LIST, MANUAL_RO, MANUAL_EN });
const appSource = source('src/App.jsx');
const REGISTRY = [...appSource.slice(appSource.indexOf('const commandList = ['), appSource.indexOf('// AI off:')).matchAll(/\['(app|file|project|edit|insert|format|document|view|nav|tools|ai|window|help)',\s*'([^']+)'/g)].map(m => ({ group: m[1], id: m[2] }));
REGISTRY.push(...SCRIPT_FORMAT_LIST.map(f => ({ group: 'format', id: 'script_' + f.id })));
const SHORTCUT_GROUPS = ['file', 'edit', 'view', 'nav', 'project', 'document', 'format', 'tools', 'window'];
const SHORTCUT_ROWS = REGISTRY.filter(c => SHORTCUT_GROUPS.includes(c.group));
const categories = ['Generale', 'Ficțiune', 'Non-ficțiune', 'Scenariu', 'Poezie', 'Diverse', 'Ale mele'];
const SETTINGS_TABS = ['general', 'appearance', 'behaviors', 'corrections', 'editing', 'editorial', 'sharing', 'backup', 'keyboard', 'services', 'accounts', 'language'];
const owners = ['lifecycle', 'documents', 'editor', 'media', 'project', 'planning', 'program', 'services'];
function labelOf(id) {
  if (id.startsWith('script_')) return t('ui.app.mod_scenariu_x', { label: t('ui.scriptFormat.' + id.slice(7)) });
  if (I18N.ro['cmd.' + id]) return t('cmd.' + id);
  const literal = appSource.match(new RegExp("\\['[^']+',\\s*'" + id + "',\\s*'([^']+)'"));
  return literal?.[1] || id;
}
function ownerOf(route, commandId) {
  const top = route[0] || '';
  if (!commandId) commandId = REGISTRY.find(c => t('group.' + c.group) === top && labelOf(c.id) === route.at(-1))?.id;
  if (['Fereastră', 'Ajutor'].includes(top)) return 'lifecycle';
  if (top === 'Program') return commandId === 'shortcuts' ? 'lifecycle' : 'program';
  if (top === 'Fișier') return ['save', 'saveAs', 'closeProject'].includes(commandId) ? 'lifecycle' : commandId === 'transcribeAudio' ? 'media' : 'documents';
  if (['Editare', 'Inserare', 'Format'].includes(top)) return 'editor';
  if (top === 'Vizualizare') return 'planning';
  if (top === 'Navigare') return 'program';
  if (top === 'Documente') return commandId === 'transcribeMedia' || commandId === 'openExternal' ? 'media' : /snapshot/.test(commandId || '') ? 'project' : /Notation|Annot|Comment|Footnote/.test(commandId || '') ? 'editor' : 'program';
  if (top === 'Proiect') return 'project';
  if (top === 'AI') return commandId === 'irep' || commandId === 'iedit' ? 'planning' : commandId === 'aiProjectSettings' ? 'project' : 'services';
  if (top === 'Unelte') return /^(read|stopRead|speech|dictat|scratchpad)/.test(commandId || '') ? 'media' : 'services';
  if (top === 'Contextual nativ') return /select|cut|copy|paste|spell/i.test(commandId || route.at(-1)) ? 'editor' : /read|dictat|stopRead/.test(commandId || '') ? 'media' : 'services';
  return null;
}
const routes = id => [[t('group.' + (REGISTRY.find(c => c.id === id)?.group || 'help')), id === 'fullScreen' ? 'Ecran complet' : t('cmd.' + id)]];
const button = (H, name) => H.p.getByRole('button', { name, exact: true });
const native = (H, id) => H.native(routes(id)[0]);
const settings = H => H.p.evaluate(() => window.api.getSettings());
async function home(H) { await H.save(); await H.command('closeProject'); await H.p.waitForSelector('.home'); }
async function reopen(H, dir = H.dir) { await H.answer(dir); await H.p.getByRole('button', { name: /^Deschide un proiect/ }).click(); await H.p.waitForSelector('.binder'); }
async function returned(H, id = 'doc-a') {
  await H.wait(async () => !!await H.row(id).count() && (await H.editor().textContent()).includes(id === 'doc-a' ? 'Capitol verificat' : 'Text separat'));
  H.assert((await H.p.title()).includes('Pneuma'), 'Application title/context lost');
  H.assert(!await H.p.locator('.home').count(), 'Returned to wrong surface');
}
async function closeButton(H, locator = H.modal()) { await locator.getByRole('button', { name: 'Închide', exact: true }).first().click(); }
async function dirty(H, text) { await H.editor().click(); await H.p.keyboard.press('Control+End'); await H.p.keyboard.insertText(text); }
async function prompt(H, text) { const p = H.p.locator('.prompt-modal'); await p.waitFor(); if (text !== undefined) await p.locator('input').fill(text); await p.getByRole('button', { name: t('btn.ok'), exact: true }).click(); }
function readProject(dir) { return JSON.parse(fs.readFileSync(path.join(dir, 'project.json'), 'utf8')); }
const flat = ns => ns.flatMap(n => [n, ...flat(n.children || [])]);
async function currentDir(H) { return (await settings(H)).recent[0].dir; }
async function newUserTemplate(H, category = 'Ale mele', name = 'Lifecycle fixture template') {
  await native(H, 'saveTemplate');
  const m = H.modal(); await m.locator('input:not([type=checkbox])').first().fill(name);
  await m.locator('select').selectOption(category); await m.locator('textarea').fill('Descriere fixture lifecycle');
  await m.getByRole('button', { name: t('ui.saveTemplateDialog.salveaza_sablonul'), exact: true }).click();
  await H.wait(async () => !await H.p.locator('[aria-label="' + t('ui.saveTemplateDialog.salveaza_ca_sablon') + '"]').count());
  const all = await H.p.evaluate(() => window.api.listAllTemplates());
  const tpl = all.find(x => x.name === name); H.assert(tpl && tpl.user, 'User template not persisted'); return tpl;
}
async function choose(H, id, category) {
  await H.p.locator('.tpl-cats [role=option]').filter({ hasText: category }).click();
  await H.p.locator('[data-tpl="' + id + '"]').click();
  await H.wait(async () => await H.p.locator('[data-tpl="' + id + '"]').getAttribute('aria-selected') === 'true');
}
async function options(H) { await H.p.locator('.tpl-footer button').filter({ hasText: /^Opțiuni/ }).click(); }
async function recent(H) { await H.p.locator('.tpl-footer button').filter({ hasText: /^Deschide recent/ }).click(); }
async function aux(H) {
  const old = new Set((await H.app.windows())); await native(H, 'newWindow');
  let p; await H.wait(async () => { p = (await H.app.windows()).find(p => !old.has(p) && !p.isClosed()); return p; });
  p.setDefaultTimeout(5000); await p.waitForSelector('.home');
  // URL is shared: resolve by the webContents identity of the new Playwright page.
  const handle = await H.app.browserWindow(p); const wid = await handle.evaluate(w => w.id);
  const a = { p, id: wid }; (H.lifecycleAux ||= []).push(a); return a;
}
async function auxShot(H, a, label) { const file = path.join(H.W, 'screens', label + '.png'); await a.p.screenshot({ path: file }); H.assert(fs.existsSync(file), 'Auxiliary before-close screenshot missing'); return file; }
async function auxClose(H, a) { await H.app.evaluate(({ BrowserWindow }, id) => BrowserWindow.fromId(id)?.close(), a.id); }
async function auxGone(H, a) {
  await H.wait(async () => await H.app.evaluate(({ BrowserWindow }, id) => !BrowserWindow.fromId(id), a.id));
  H.assert(a.p.isClosed(), 'BrowserWindow removed but renderer page still alive');
  H.limit('closed-window-capture:' + H.currentCase, 'Screenshot saved before close; BrowserWindow absence and page.isClosed verified. No renderer screenshot exists after close; the harness after-image is the surviving main window, not the closed window.');
}
async function auxDispose(H, a) { if (a && !a.p.isClosed()) { await auxClose(H, a); if (await a.p.locator('.unsaved-dialog').count().catch(() => 0)) await a.p.locator('.unsaved-dialog').getByRole('button', { name: 'Renunță', exact: true }).click(); await auxGone(H, a); } }

module.exports = async function lifecycle(H) {
  const start = H.cases.length;
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'full-app-lifecycle.catalog.json'), 'utf8'));
  for (const limit of catalog.uncovered) H.limit(limit.id, limit.reason);
  const add = (id, surface, control, commands, setup, act, verify, expected, nativeRoutes = []) => H.test(id, { surface, control, commands, routes: nativeRoutes, kind: id.startsWith('native-inventory-') ? 'inventory-only' : 'functional', initial: 'Fresh isolated fixture; ' + (setup ? 'case-specific setup below' : 'doc-a selected in real Electron renderer'), expected, setup: async H => { for (const a of H.lifecycleAux || []) await auxDispose(H, a); H.lifecycleAux = []; if (setup) await setup(H); }, act, verify });
  H.limit('native-chrome-visual', 'H.native executes real MenuItem callbacks but Playwright screenshots exclude OS menu chrome, Electron title-bar and native dialogs. Functional effects are asserted; complete native popup hover/keyboard/geometry traversal requires parent OS-level visual evidence, not IPC success.');
  H.limit('shell-adapter', 'openExternal/openPath/showItemInFolder are captured adapters. URL/path request is verifiable; actual browser, mail client or Explorer opening is NOT live evidence. No issue/mail submission is performed.');

  for (const mode of ['text', 'folder', 'trash', 'multi', 'ai-off', 'ai-on', 'script', 'layout']) {
    add('native-inventory-' + mode, 'Native menu tree', 'Every recursive leaf: ' + mode, [], async H => {
      if (mode === 'folder') await H.select('folder-a');
      if (mode === 'trash') { if (await H.row(H.roots.trash).getAttribute('aria-expanded') !== 'true') await H.row(H.roots.trash).locator('.twisty').click(); await H.select('trashed-a'); }
      if (mode === 'multi') { await H.select(); await H.row('doc-b').click({ modifiers: ['Control'] }); }
      if (mode.startsWith('ai-')) await H.settingsFixture({ aiEnabled: mode === 'ai-on' });
      if (mode === 'script') await H.fixture(async pj => { pj.scriptFormat = 'screenplay'; });
      if (mode === 'layout') await H.settingsFixture({ layouts: [{ name: 'Fixture layout', view: 'editor', showInspector: true, hideBinder: false }] });
    }, async H => { await H.wait(async () => (await H.menu()).some(m => m.route[0] === 'Program')); }, async H => {
      const tree = await H.menu(), leaves = tree.filter(m => !m.submenu);
      H.assert(leaves.length > 30, 'Native menu is empty/incomplete');
      const annotated = leaves.map(m => ({ ...m, commandId: m.commandId || REGISTRY.find(c => t('group.' + c.group) === m.route[0] && labelOf(c.id) === m.label)?.id || null, owner: ownerOf(m.route, m.commandId), evidence: 'inventory-only; effects owned by domain test, NOT functional pass' }));
      H.assert(annotated.every(m => owners.includes(m.owner)), 'Unowned native leaf');
      H.assert(new Set(leaves.map(m => m.route.join(' > '))).size === leaves.length, 'Duplicate native route');
      for (const top of ['Program', 'Fișier', 'Fereastră', 'Ajutor']) H.assert(tree.some(m => m.route[0] === top), 'Missing native top menu ' + top);
      fs.writeFileSync(path.join(H.W, 'native-' + mode + '.json'), JSON.stringify(annotated, null, 2));
      H.limit('inventory-only:' + mode, 'This case proves recursive inventory/ownership, not the behavior or visual rendering of leaves delegated to other domains. All actual leaves are emitted to native-' + mode + '.json.');
    }, 'Recursive native route inventory exists, is unique, each leaf owned by one of eight domains; no functional claim for delegated leaves.');
  }

  add('home-startup-return', 'Home', 'Close project; open fixture; native menu reset', ['closeProject'], null, async H => { await native(H, 'closeProject'); }, async H => {
    await H.wait(async () => !!await H.p.locator('.home').count());
    H.assert(await H.p.locator('.tpl-chooser h2').textContent() === 'Proiect nou', 'Home chooser title wrong');
    H.assert(!await H.p.locator('.binder').count(), 'Project binder retained on Home');
    await H.wait(async () => !(await H.menu()).length); await reopen(H); await returned(H);
  }, 'Home title, templates and native-menu removal; open returns fixture content/title.', routes('closeProject'));

  for (const category of categories) {
    add('home-category-' + categories.indexOf(category), 'Home categories', category, [], async H => { if (!Object.values(TEMPLATES).some(x => x.category === category)) await newUserTemplate(H, category, 'Category ' + category); await home(H); }, async H => { await H.p.locator('.tpl-cats [role=option]').filter({ hasText: category }).click(); }, async H => {
      const cat = H.p.locator('.tpl-cats [role=option]').filter({ hasText: category }); H.assert(await cat.getAttribute('aria-selected') === 'true', 'Category selection wrong');
      const all = await H.p.evaluate(() => window.api.listAllTemplates()); const expected = all.filter(x => (x.category || 'Generale') === category);
      const ids = await H.p.locator('.tpl-card').evaluateAll(es => es.map(e => e.dataset.tpl)); H.assert(JSON.stringify(ids) === JSON.stringify(expected.map(x => x.id)), 'Category cards incomplete or cross-category');
      H.assert(await H.p.locator('.tpl-desc strong').textContent() === expected[0].name, 'Default selection/description did not follow category');
      await H.p.locator('.tpl-cats [aria-selected=true]').focus(); H.assert(await H.p.evaluate(() => document.activeElement?.matches('.tpl-cats [aria-selected=true]')), 'Category cannot receive keyboard focus');
    }, 'Every category, all of its cards, selected title and focus are verified.');
  }
  for (const [id, spec] of Object.entries(TEMPLATES)) {
    add('home-template-' + id, 'Home template/create', spec.name, [], home, async H => {
      await choose(H, id, spec.category || 'Generale');
      H.assert(await H.p.locator('.tpl-desc strong').textContent() === spec.name, 'Chosen template label wrong');
      H.assert(await button(H, 'Creează').isDisabled(), 'Empty title accepted');
      const parent = path.join(H.W, 'projects', 'create-' + id); fs.mkdirSync(parent, { recursive: true }); await H.answer(parent);
      await H.p.getByPlaceholder('Titlul cărții').fill('Lifecycle ' + id); await button(H, 'Creează').click(); await H.p.waitForSelector('.binder');
    }, async H => {
      const dir = await currentDir(H), pj = readProject(dir); H.assert(pj.title === 'Lifecycle ' + id, 'Created title not persisted');
      for (const root of ['draft', 'research']) {
        const actual = pj.tree.find(x => x.root === root)?.children || [], expected = spec[root] || [];
        const shape = ns => ns.map(n => ({ title: n.title, type: n.type, children: n.children ? shape(n.children) : undefined }));
        H.assert(JSON.stringify(shape(actual)) === JSON.stringify(shape(expected)), 'Template binder structure differs: ' + root);
        const A = flat(actual), E = flat(expected); for (let i = 0; i < E.length; i++) if (E[i].type === 'text') H.assert(fs.readFileSync(path.join(dir, 'docs', A[i].id + '.html'), 'utf8') === E[i].html, 'Template text missing/different: ' + E[i].title);
      }
      H.assert((await H.p.locator('.project-title').textContent()).includes(pj.title), 'New project navigation title wrong');
      await home(H); await reopen(H); await returned(H);
    }, 'Each built-in creates a real project with exact draft/research hierarchy and every initial HTML file; return to fixture.');
  }
  for (const method of ['title-enter', 'card-enter', 'double-click', 'cancel-dialog']) {
    add('home-create-' + method, 'Home', method, [], home, async H => {
      await choose(H, 'blank', 'Generale'); await H.p.getByPlaceholder('Titlul cărții').fill('Lifecycle ' + method);
      if (method !== 'cancel-dialog') { const parent = path.join(H.W, 'projects', method); fs.mkdirSync(parent, { recursive: true }); await H.answer(parent); }
      if (method === 'title-enter') await H.p.getByPlaceholder('Titlul cărții').press('Enter');
      else if (method === 'card-enter') { await H.p.locator('[data-tpl=blank]').focus(); await H.p.keyboard.press('Enter'); }
      else if (method === 'double-click') await H.p.locator('[data-tpl=blank]').dblclick(); else await button(H, 'Creează').click();
    }, async H => {
      if (method === 'cancel-dialog') { H.assert(await H.p.locator('.home').isVisible(), 'Canceled create changed surface'); H.assert((await H.effects()).some(x => x.kind === 'open-dialog' && !x.answered), 'Native cancel not observed'); }
      else { await H.p.waitForSelector('.binder'); const dir = await currentDir(H); H.assert(readProject(dir).title === 'Lifecycle ' + method, 'Create alternative title wrong'); H.assert(flat(readProject(dir).tree).some(x => x.title === 'Document nou'), 'Alternative did not create blank template'); await home(H); }
      await reopen(H); await returned(H);
    }, 'Each alternate create activation persists exact blank structure/title; canceled picker remains Home.');
  }
  for (const list of ['category', 'card']) {
    add('home-keyboard-' + list, 'Home', 'Arrows/Home/End/focus: ' + list, [], home, async H => {
      const sel = list === 'category' ? '.tpl-cats' : '.tpl-grid'; if (list === 'card') await H.p.locator('.tpl-cats [role=option]').filter({ hasText: 'Ficțiune' }).click();
      const items = H.p.locator(sel + ' [role=option]'); await items.first().focus();
      const keys = list === 'category' ? ['End', 'Home', 'ArrowDown', 'ArrowUp'] : ['End', 'Home', 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
      for (const key of keys) { await H.p.keyboard.press(key); H.assert(await H.p.evaluate(sel => document.activeElement?.matches(sel + ' [aria-selected=true]'), sel), 'Selection/focus diverged on ' + key); await H.shot('home-' + list + '-' + key); }
    }, async H => { H.assert(await H.p.locator((list === 'category' ? '.tpl-cats' : '.tpl-grid') + ' [aria-selected=true]').count() === 1, 'Keyboard selection not singular'); H.assert(await H.p.locator('.tpl-desc strong').textContent(), 'Description lost during keyboard navigation'); }, 'All declared chooser keys update a single selected option and DOM focus.');
  }
  for (const how of ['button', 'recent', 'cancel', 'missing', 'invalid']) {
    add('home-open-' + how, 'Home/open/recents', how, [], async H => { await home(H); if (how === 'missing') { const missing = path.join(H.W, 'missing.scribner'); await H.p.evaluate(async item => window.api.setSettings({ recent: [item], recentPinned: [] }), { dir: missing, title: 'Missing fixture', missing: true }); await H.p.reload(); await H.p.waitForSelector('.home'); } }, async H => {
      if (how === 'recent' || how === 'missing') { await recent(H); await H.p.locator('.recent .link').first().click(); }
      else { if (how === 'button') await H.answer(H.dir); if (how === 'invalid') { const invalid = path.join(H.W, 'invalid-project'); fs.mkdirSync(invalid, { recursive: true }); fs.writeFileSync(path.join(invalid, 'project.json'), '{}'); await H.answer(invalid); } await H.p.getByRole('button', { name: /^Deschide un proiect/ }).click(); }
    }, async H => {
      if (how === 'button' || how === 'recent') { await returned(H); H.assert((await settings(H)).recent[0].dir.toLowerCase() === H.dir.toLowerCase(), 'Recent path not remembered'); }
      else { H.assert(await H.p.locator('.home').isVisible(), 'Failed/canceled open replaced Home'); if (how === 'cancel') H.assert((await H.effects()).some(x => x.kind === 'open-dialog' && !x.answered), 'Canceled open dialog missing'); else await H.wait(async () => !!await H.p.locator('[role=alert]').filter({ hasText: /proiect|project|exist|fișier/i }).count()); }
    }, 'Open verifies fixture content/title/path; canceled or broken open remains Home with error evidence.');
  }
  for (const how of ['pin', 'unpin', 'clear', 'clear-cancel', 'empty']) {
    add('home-recents-' + how, 'Home/recents', how, [], async H => {
      const other = path.join(H.W, 'projects', 'recent-other.scribner'); fs.cpSync(H.dir, other, { recursive: true });
      await H.settingsFixture({ recent: [{ dir: other, title: 'Other recent' }, { dir: H.dir, title: H.project().title }], recentPinned: how === 'unpin' || how === 'clear' || how === 'clear-cancel' ? [other] : [] });
      await home(H); if (how === 'empty') { await H.p.evaluate(() => window.api.setSettings({ recent: [], recentPinned: [] })); await H.p.reload(); await H.p.waitForSelector('.home'); }
    }, async H => {
      await recent(H); if (how === 'empty') return;
      const other = H.p.locator('.recent li').filter({ hasText: 'Other recent' });
      if (how === 'pin' || how === 'unpin') await other.locator('.pin').click(); else {
        if (how === 'clear-cancel') { H.p.removeAllListeners('dialog'); H.p.once('dialog', d => d.dismiss()); }
        await button(H, 'Golește lista (păstrează fixatele)').click();
        if (how === 'clear-cancel') H.p.on('dialog', d => d.accept().catch(() => {}));
      }
    }, async H => {
      const s = await settings(H), other = path.join(H.W, 'projects', 'recent-other.scribner');
      if (how === 'empty') { H.assert(await H.p.locator('.tpl-recent').textContent().then(x => /Niciun proiect recent/.test(x)), 'Empty recent message missing'); H.assert(!await H.p.locator('.recent li').count(), 'Empty list has rows'); }
      if (how === 'pin') { H.assert(s.recentPinned.includes(other), 'Pin not persisted'); H.assert((await H.p.locator('.recent li').first().textContent()).includes('Other recent'), 'Pinned not first'); }
      if (how === 'unpin') H.assert(!s.recentPinned.includes(other), 'Unpin not persisted');
      if (how === 'clear') { H.assert(s.recent.length === 1 && s.recent[0].dir === other, 'Clear removed pinned or kept unpinned'); H.assert(fs.existsSync(path.join(H.dir, 'project.json')) && fs.existsSync(path.join(other, 'project.json')), 'Recent clear deleted actual projects'); }
      if (how === 'clear-cancel') H.assert(s.recent.length === 2, 'Canceled recent clear changed settings');
    }, 'Pin/unpin order, persistent settings, clear preservation, cancel and empty state verified without deleting fixture projects.');
  }
  for (const how of ['default', 'import', 'export', 'delete', 'delete-cancel', 'create', 'import-cancel', 'export-cancel']) {
    let tpl, templatePath;
    add('home-user-template-' + how, 'Home/template Options', how, ['saveTemplate'], async H => { tpl = await newUserTemplate(H, 'Ale mele', 'User template ' + how); await home(H); await choose(H, tpl.id, 'Ale mele'); templatePath = path.join(H.W, 'profile', 'templates', tpl.id.replace(/^user:/, '')); }, async H => {
      if (how === 'create') { const parent = path.join(H.W, 'projects', 'user-create'); fs.mkdirSync(parent, { recursive: true }); await H.answer(parent); await H.p.getByPlaceholder('Titlul cărții').fill('User-created fixture'); await button(H, 'Creează').click(); return; }
      await options(H);
      if (how === 'default') await H.p.getByRole('menuitem', { name: 'Setează ca implicit', exact: true }).click();
      if (how.startsWith('import')) { if (how === 'import') await H.answer(templatePath); await H.p.getByRole('menuitem', { name: 'Importă șablon…', exact: true }).click(); }
      if (how.startsWith('export')) { if (how === 'export') { const dest = path.join(H.W, 'export-template'); fs.mkdirSync(dest, { recursive: true }); await H.answer(dest); } await H.p.getByRole('menuitem', { name: 'Exportă șablon…', exact: true }).click(); }
      if (how.startsWith('delete')) { if (how === 'delete-cancel') { H.p.removeAllListeners('dialog'); H.p.once('dialog', d => d.dismiss()); } await H.p.getByRole('menuitem', { name: 'Șterge șablonul', exact: true }).click(); if (how === 'delete-cancel') H.p.on('dialog', d => d.accept().catch(() => {})); }
    }, async H => {
      if (how === 'default') { H.assert((await settings(H)).defaultTemplate === tpl.id, 'Default not persisted'); await options(H); H.assert(await H.p.getByRole('menuitem', { name: 'Setează ca implicit', exact: true }).isDisabled(), 'Default action not disabled'); }
      if (how === 'import') { await H.wait(async () => (await H.p.evaluate(() => window.api.listAllTemplates())).filter(x => x.name === tpl.name).length === 2); H.assert(await H.p.locator('.tpl-card[aria-selected=true] .tpl-name').textContent() === tpl.name, 'Imported template not selected'); }
      if (how === 'export') { const dest = path.join(H.W, 'export-template', tpl.id.replace(/^user:/, '') + '.sablon'); await H.wait(() => fs.existsSync(path.join(dest, 'project', 'docs', 'doc-a.html'))); H.assert(readProject(path.join(dest, 'project')).tree.some(x => x.root === 'draft'), 'Exported template project absent'); H.assert(fs.readFileSync(path.join(dest, 'project', 'docs', 'doc-a.html'), 'utf8') === H.doc(), 'Template export text differs'); H.assert(JSON.parse(fs.readFileSync(path.join(dest, 'template.json'))).title === tpl.name, 'Template export metadata wrong'); }
      if (how === 'delete') { await H.wait(async () => !(await H.p.evaluate(() => window.api.listAllTemplates())).some(x => x.id === tpl.id)); H.assert(!fs.existsSync(templatePath), 'Template directory survived deletion'); H.assert(fs.existsSync(path.join(H.dir, 'docs', 'doc-a.html')), 'Template delete damaged original project'); }
      if (how === 'delete-cancel') H.assert(fs.existsSync(templatePath), 'Canceled deletion removed template');
      if (how === 'create') { await H.p.waitForSelector('.binder'); const dir = await currentDir(H); H.assert(readProject(dir).title === 'User-created fixture', 'User template creation title wrong'); H.assert(fs.readFileSync(path.join(dir, 'docs', 'doc-a.html'), 'utf8') === H.doc(), 'User template initial HTML not copied'); await home(H); }
      if (how.endsWith('cancel')) H.assert(await H.p.locator('.home').isVisible(), 'Canceled template operation left Home');
    }, 'Home user-template options verify persisted settings, copied metadata/HTML, deletion/cancel and new project contents.');
  }
  for (const how of ['escape', 'outside', 'toggle']) {
    add('home-options-dismiss-' + how, 'Home menus', 'Options + recents: ' + how, [], home, async H => {
      for (const which of ['options', 'recent']) { const open = which === 'options' ? options : recent; await open(H); H.assert(await H.p.locator('.tpl-menu').isVisible(), 'Home popup not visible'); if (how === 'escape') await H.p.keyboard.press('Escape'); if (how === 'outside') await H.p.locator('.home h1').click(); if (how === 'toggle') await open(H); H.assert(!await H.p.locator('.tpl-menu').count(), 'Home popup failed dismissal'); }
    }, async H => { H.assert(await H.p.locator('.home').isVisible(), 'Dismissal navigated away'); H.assert(!await H.p.locator('.tpl-menu').count(), 'Popup leaked'); }, 'Both Home menus dismiss by each supported path without navigation.');
  }
  add('home-import-scriv', 'Home Options', 'Importă proiect .scriv (direct real Home API; no canonical menu command)', [], home, async H => {
    const src = path.join(H.W, 'Lifecycle import.scriv'), uuid = 'AAAAAAAA-0000-0000-0000-000000000001'; fs.mkdirSync(path.join(src, 'Files', 'Data', uuid), { recursive: true });
    fs.writeFileSync(path.join(src, 'Fixture.scrivx'), '<ScrivenerProject Version="2.0"><Binder><BinderItem UUID="BBBBBBBB-0000-0000-0000-000000000001" Type="DraftFolder"><Title>Manuscris</Title><Children><BinderItem UUID="' + uuid + '" Type="Text"><Title>Imported lifecycle</Title></BinderItem></Children></BinderItem></Binder></ScrivenerProject>');
    fs.writeFileSync(path.join(src, 'Files', 'Data', uuid, 'content.rtf'), '{\\rtf1\\ansi Imported fixture lifecycle text.}'); const dest = path.join(H.W, 'projects', 'scriv-import'); fs.mkdirSync(dest, { recursive: true }); await H.answer(src, dest); await options(H); await H.p.getByRole('menuitem', { name: 'Importă proiect .scriv', exact: true }).click();
  }, async H => { await H.p.waitForSelector('.binder'); const dir = await currentDir(H), pj = readProject(dir), n = flat(pj.tree).find(n => n.title === 'Imported lifecycle'); H.assert(n, 'Imported binder title absent'); H.assert(fs.readFileSync(path.join(dir, 'docs', n.id + '.html'), 'utf8').includes('Imported fixture lifecycle text.'), 'RTF body not imported'); H.assert(pj.importReport, 'Import provenance/report absent'); }, 'Home import creates actual binder, HTML and provenance in fixture destination.');

  for (const entry of ['settings', 'customizeToolbar']) {
    add('program-door-' + entry, 'Program native', t('cmd.' + entry), [entry], null, async H => { await native(H, entry); }, async H => {
      const selector = entry === 'settings' ? '.settings-dialog' : '.tb-customize'; const d = H.p.locator(selector); await d.waitFor(); H.assert(await d.locator('h2').textContent(), 'Program door has no title'); H.assert(await d.getByRole('tab').count() >= 2, 'Program dialog tabs missing');
      for (const tab of await d.getByRole('tab').all()) { await tab.click(); H.assert(await tab.getAttribute('aria-selected') === 'true', 'Program tab navigation not selected'); await H.shot('program-' + entry + '-' + (await tab.textContent())); }
      await d.getByRole('button', { name: 'Anulează', exact: true }).click(); await returned(H); H.limit('delegated-controls:' + entry, 'All tabs traversed here; option mutation and toolbar add/remove/reorder/display are owned by settings-services/views domain, not claimed as covered by door navigation.');
    }, 'Native Program doors verify title, all tab selections, safe cancel and return to original document.', routes(entry));
  }
  for (const entry of ['settings', 'help', 'about', 'tutorial']) {
    add('home-link-' + entry, 'Home links', entry, [entry], home, async H => {
      if (entry === 'tutorial') { const dest = path.join(H.W, 'projects', 'home-tutorial'); fs.mkdirSync(dest, { recursive: true }); await H.answer(dest); }
      const link = H.p.locator('.home-links button').filter({ hasText: entry === 'settings' ? t('set.title') : t('cmd.' + entry) }); await link.click();
    }, async H => {
      if (entry === 'tutorial') { await H.p.waitForSelector('.binder'); const pj = readProject(await currentDir(H)); H.assert(pj.title === 'Tutorial Pneuma Sofer', 'Tutorial project title wrong'); H.assert(flat(pj.tree).length > 10, 'Tutorial content missing'); }
      else { const d = H.p.locator(entry === 'help' ? '.help-window' : entry === 'about' ? '.about-dialog' : '.settings-dialog'); await d.waitFor(); H.assert(await d.getByRole('button').count() > 0, 'Home link opened empty dialog'); if (entry === 'settings') await d.getByRole('button', { name: 'Anulează', exact: true }).click(); else await closeButton(H, d); H.assert(await H.p.locator('.home').isVisible(), 'Home link close did not return Home'); await reopen(H); await returned(H); }
    }, 'Each Home link verifies destination content and return; tutorial persists a real project.');
  }

  for (const how of ['button', 'escape', 'backdrop']) {
    add('about-' + how, 'About', how + '; all licenses', ['about'], null, async H => { await native(H, 'about'); }, async H => {
      const d = H.p.locator('.about-dialog'); await d.waitFor(); H.assert((await d.textContent()).includes(require(path.join(ROOT, 'package.json')).version), 'About current app version absent');
      H.assert(await d.locator('.about-group').count() === 6, 'About license groups incomplete');
      const rows = d.locator('.about-licenses tbody tr:not(.about-group)'); H.assert(await rows.count() === ABOUT.ABOUT_LICENSES.length, 'About license rows incomplete');
      for (let i = 0; i < ABOUT.ABOUT_LICENSES.length; i++) { const txt = await rows.nth(i).textContent(), l = ABOUT.ABOUT_LICENSES[i]; H.assert(txt.includes(l.name) && txt.includes(l.license), 'About license content mismatch: ' + l.name); await rows.nth(i).scrollIntoViewIfNeeded(); }
      H.assert(await d.locator('a').nth(0).getAttribute('href') === ABOUT.REPO_URL, 'Source URL wrong'); H.assert(await d.locator('a').nth(1).getAttribute('href') === ABOUT.DTED_URL, 'DTED URL wrong');
      if (how === 'button') await closeButton(H, d); if (how === 'escape') { await d.locator('button').first().focus(); await H.p.keyboard.press('Escape'); } if (how === 'backdrop') await H.p.locator('.modal-backdrop').last().click({ position: { x: 2, y: 2 } });
      await H.wait(async () => !await H.p.locator('.about-dialog').count()); await returned(H);
    }, 'Every About license/component/current version/link target checked, close returns selected document.', routes('about'));
  }
  for (const which of ['REPO_URL', 'DTED_URL']) {
    add('about-link-' + which, 'About links', which, ['about'], null, async H => { await native(H, 'about'); await H.p.locator('.about-dialog a[href="' + ABOUT[which] + '"]').click(); }, async H => {
      await H.wait(async () => (await H.effects()).some(x => x.kind === 'external-url' && x.url === ABOUT[which])); H.assert(await H.p.locator('.about-dialog').isVisible(), 'About external link navigated renderer'); await closeButton(H); await returned(H); H.limit('about-link:' + which, 'Exact external URL captured by shell adapter; real browser opening is not verified. No third-party publication.');
    }, 'Exact safe link destination captured; renderer remains About and returns to document.', routes('about'));
  }
  for (const [id, tab] of [['help', 'Manual'], ['helpShortcuts', 'Scurtături'], ['helpPlaceholders', 'Substituenți'], ['helpSyntax', 'Sintaxă']]) {
    add('help-native-' + id, 'Help native entry', tab, [id], null, async H => { await native(H, id); }, async H => {
      const d = H.p.locator('.help-window'); await d.waitFor(); H.assert(await d.getByRole('tab', { name: tab, exact: true }).getAttribute('aria-selected') === 'true', 'Help native tab wrong');
      H.assert((await d.locator('.help-content h1').textContent()).length > 0, 'Help tab content/title missing');
      if (tab !== 'Manual') H.assert(await d.locator('.help-table tbody tr').count() >= 10, 'Reference incomplete');
      for (const b of await d.getByRole('tab').all()) {
        await b.click(); H.assert(await b.getAttribute('aria-selected') === 'true', 'Help tab switch wrong'); const name = await b.textContent(), text = await d.locator('.help-content').textContent();
        if (name === 'Scurtături') for (const row of REF.shortcutRows('ro', await settings(H))) H.assert(text.includes(row.label) && text.includes(row.key || '—'), 'Shortcut reference missing ' + row.label);
        if (name === 'Substituenți') for (const row of REF.placeholderRows('ro')) H.assert(text.includes(row.code) && text.includes(row.text), 'Placeholder reference missing ' + row.code);
        if (name === 'Sintaxă') { for (const kind of ['markdown', 'multimarkdown', 'fountain']) for (const row of REF.syntaxRows(kind, 'ro')) H.assert(text.includes(row.code) && text.includes(row.text), 'Syntax reference missing ' + row.code); for (const f of REF.scriptRows()) for (const row of f.elements) H.assert(text.includes(row.label) && text.includes(row.tab) && text.includes(row.enter), 'Script reference missing ' + f.id + '/' + row.id); }
        for (const row of await d.locator('.help-table tbody tr').all()) await row.scrollIntoViewIfNeeded(); await H.shot('help-tab-' + name);
      }
      await closeButton(H, d); await returned(H);
    }, 'Native Help entries select correct tab, populated content, all four tabs and return path.', routes(id));
  }
  for (const ch of MANUAL_RO) for (const section of ch.sections) {
    add('help-section-' + section.id, 'Help Manual', ch.title + ' / ' + section.title, ['help'], null, async H => {
      await native(H, 'help'); const d = H.p.locator('.help-window'); await d.locator('.help-chapter').nth(MANUAL_RO.indexOf(ch)).click(); await d.locator('.help-section').nth(ch.sections.indexOf(section)).click();
    }, async H => {
      const d = H.p.locator('.help-window'), s = d.locator('[id="help-' + section.id + '"]'); H.assert(await s.getAttribute('class') === 'current', 'Help section context wrong'); H.assert(await s.locator('h2').textContent() === section.title, 'Help section heading wrong');
      const expected = await H.p.evaluate(html => new DOMParser().parseFromString(html, 'text/html').body.textContent.replace(/\s+/g, ' ').trim(), section.html);
      H.assert((await s.locator('div').textContent()).replace(/\s+/g, ' ').trim() === expected, 'Manual section body differs from source'); await s.scrollIntoViewIfNeeded(); await H.shot('manual-' + section.id);
      H.assert(await d.locator('.help-section.on').textContent() === section.title, 'TOC section selection wrong'); await closeButton(H, d); await returned(H);
    }, 'Every manual chapter/section control is traversed and exact heading/body/current context verified, with screenshot and return.', routes('help'));
  }
  for (const context of ['editor', 'scrivenings', 'corkboard', 'outline', 'composition', 'settings']) {
    const target = { editor: 'editor-basics', scrivenings: 'scrivenings-basics', corkboard: 'corkboard-basics', outline: 'outline-basics', composition: 'scrivenings-composition', settings: 'settings-tabs' }[context];
    add('help-context-' + context, 'Contextual Help', context, ['helpContext'], async H => {
      if (context === 'scrivenings') await H.select('folder-a'); if (context === 'corkboard') await H.command('viewCorkboard'); if (context === 'outline') await H.command('viewOutline'); if (context === 'composition') await H.command('composition'); if (context === 'settings') await native(H, 'settings');
    }, async H => { await native(H, 'helpContext'); }, async H => {
      await H.wait(async () => !!await H.p.locator('#help-' + target + '.current').count()); H.assert(await H.p.locator('#help-' + target + ' h2').textContent(), 'Contextual heading missing'); await closeButton(H, H.p.locator('.help-window'));
      if (context === 'settings') H.assert(await H.p.locator('.settings-dialog').isVisible(), 'Closing contextual help closed underlying settings'); else H.assert(!await H.p.locator('.help-window').count(), 'Context help did not close');
    }, 'Help resolves actual view/modal context and closes only its own surface.', routes('helpContext'));
  }
  add('help-search-history-focus', 'Help', 'Search/results/history/Ctrl+F/Escape', ['help'], null, async H => {
    await native(H, 'help'); const d = H.p.locator('.help-window'); await H.p.keyboard.press('Control+f'); H.assert(await d.locator('.help-search').evaluate(e => e === document.activeElement), 'Ctrl+F did not focus manual search');
    await d.locator('.help-search').fill('qzxwvlifecycle-no-hit'); H.assert((await d.locator('.help-results').textContent()).includes('Niciun rezultat'), 'No-results state wrong');
    await d.locator('.help-search').fill('binder'); await H.wait(async () => await d.locator('.help-result').count() > 1); const title = await d.locator('.help-result-title').first().textContent(); await d.locator('.help-result').first().click();
    H.assert(await d.locator('section.current h2').textContent() === title, 'Search result opened wrong topic'); H.assert(await d.locator('.help-content mark').count() > 0, 'Search terms not highlighted');
    const first = await d.locator('section.current').getAttribute('id'); await d.getByRole('button', { name: 'Înainte', exact: true }).isDisabled().then(v => H.assert(v, 'Forward enabled at end'));
    await d.getByRole('button', { name: 'Înapoi', exact: true }).click(); H.assert(await d.locator('section.current').getAttribute('id') !== first, 'Back failed'); await H.p.keyboard.press('Alt+ArrowRight'); H.assert(await d.locator('section.current').getAttribute('id') === first, 'Alt+Right history failed');
    await d.locator('.help-search').focus(); await H.p.keyboard.press('Escape'); H.assert(await d.locator('.help-search').inputValue() === '', 'First Escape did not clear query'); H.assert(await d.isVisible(), 'First Escape closed instead of clearing query'); await H.p.keyboard.press('Escape');
  }, async H => { await H.wait(async () => !await H.p.locator('.help-window').count()); await returned(H); }, 'Search no-hit and highlighted results, exact topic, back/forward state, search focus and two-stage Escape verified.', routes('help'));
  for (const entry of ['native', 'help-button']) {
    add('tutorial-' + entry, 'Help/tutorial', entry, ['tutorial'], null, async H => { const dest = path.join(H.W, 'projects', 'tutorial-' + entry); fs.mkdirSync(dest, { recursive: true }); await H.answer(dest); if (entry === 'native') await native(H, 'tutorial'); else { await native(H, 'help'); await H.p.locator('.help-window').getByRole('button', { name: 'Pornește tutorialul', exact: true }).click(); } }, async H => {
      await H.wait(async () => (await H.p.locator('.project-title').textContent()).includes('Tutorial Pneuma Sofer')); const dir = await currentDir(H), pj = readProject(dir); H.assert(pj.title === 'Tutorial Pneuma Sofer' && flat(pj.tree).length > 10, 'Tutorial project not populated'); H.assert(!await H.p.locator('.help-window').count(), 'Help retained over tutorial'); H.assert(H.doc().includes('Capitol verificat'), 'Tutorial switch damaged source fixture'); await home(H); await reopen(H); await returned(H);
    }, 'Tutorial creates populated real project, updates project title, leaves source unchanged and returns.', routes('tutorial'));
  }
  for (const how of ['copy', 'close', 'escape', 'backdrop']) {
    add('report-problem-' + how, 'ReportProblem', how + '; fields/privacy/details', ['reportIssue'], null, async H => {
      await native(H, 'reportIssue'); const d = H.p.locator('.report-problem'); await d.waitFor(); H.assert(await d.locator('textarea').first().evaluate(e => e === document.activeElement), 'Report autofocus missing');
      H.assert(await d.getByRole('button', { name: 'Trimite pe GitHub', exact: true }).isDisabled(), 'Empty report enabled submission');
      await d.locator('textarea').nth(0).fill('Fixture lifecycle issue, never submitted'); await d.locator('textarea').nth(1).fill('Fixture-only prior action'); await d.locator('summary').click(); await H.wait(async () => (await d.locator('.report-tech').textContent()).includes('Versiune'));
      H.assert(!(await d.locator('.report-tech').textContent()).includes('Prima frază pentru test'), 'Document body leaked into diagnostics'); H.assert(!await d.getByRole('button', { name: 'Trimite pe GitHub', exact: true }).isDisabled(), 'Valid report not ready');
      if (how === 'copy') { await d.getByRole('button', { name: 'Copiază raportul', exact: true }).click(); await H.wait(async () => (await d.getByRole('status').textContent()).includes('copiat')); }
      else if (how === 'close') await closeButton(H, d); else if (how === 'escape') await H.p.keyboard.press('Escape'); else await H.p.locator('.modal-backdrop').last().click({ position: { x: 2, y: 2 } });
    }, async H => {
      if (how === 'copy') { const clip = await H.app.evaluate(({ clipboard }) => clipboard.readText()); H.assert(clip.includes('Fixture lifecycle issue, never submitted') && clip.includes('Fixture-only prior action') && clip.includes('Versiune'), 'Clipboard report omitted fields or diagnostics'); H.assert(!clip.includes('Prima frază pentru test') && !clip.includes(H.dir), 'Report leaked document/path'); await closeButton(H, H.p.locator('.report-problem')); }
      await H.wait(async () => !await H.p.locator('.report-problem').count()); H.assert(!(await H.effects()).some(x => x.kind === 'external-url'), 'Report unexpectedly sent externally'); await returned(H);
      H.limit('report-submission-forbidden', 'GitHub/email controls inventoried and enabled-state checked, but intentionally NEVER activated under user prohibition. No published issue, mail, or remote delivery claim.');
    }, 'Report fields, empty/valid state, technical disclosure/privacy, clipboard and dismissal verified; no external submission.', routes('reportIssue'));
  }
  for (const how of ['close', 'escape', 'backdrop']) {
    add('update-' + how, 'UpdateDialog', 'Actual check + ' + how, ['checkUpdates'], null, async H => { await native(H, 'checkUpdates'); }, async H => {
      const d = H.p.locator('.update-dialog'); await d.waitFor(); await H.wait(async () => !/Se caută versiunea cea mai nouă/.test(await d.textContent()), 45000);
      const text = await d.textContent(), version = await H.app.evaluate(({ app }) => app.getVersion());
      H.assert(text.includes(version) || !!await d.getByRole('alert').count(), 'Update result lacks installed version or explicit error');
      if (await d.locator('.update-notes').count()) { const before = await d.locator('.update-notes').getAttribute('open'); await d.locator('summary').click(); H.assert(await d.locator('.update-notes').getAttribute('open') !== before, 'Release notes toggle failed'); await d.locator('summary').click(); }
      if (how === 'close') await closeButton(H, d); if (how === 'escape') await H.p.keyboard.press('Escape'); if (how === 'backdrop') await H.p.locator('.modal-backdrop').last().click({ position: { x: 2, y: 2 } }); await H.wait(async () => !await H.p.locator('.update-dialog').count()); await returned(H);
      H.limit('update-download-install-banner', 'Real manual update check only, no mocked update response. Newer/no-asset/portable/progress/SHA/install/restart/banner variants depend on remote release and cannot be exhaustively established by this fixture. Download/install not activated: may write outside fixture or replace executable.');
    }, 'Real update check shows current version/result or explicit network error; notes toggle when present and every close path returns.', routes('checkUpdates'));
  }

  for (const choice of ['save', 'discard', 'cancel']) for (const trigger of ['native-close-project', 'home-toolbar', 'F5', 'Control+r']) {
    let before;
    add('unsaved-' + trigger + '-' + choice, 'Unsaved lifecycle', trigger + '/' + choice, ['save', 'closeProject'], async H => { await H.settingsFixture({ autosaveSec: 3600 }); before = H.doc(); }, async H => {
      await dirty(H, ' LIFECYCLE_UNSAVED_' + choice); if (trigger === 'native-close-project') await native(H, 'closeProject'); else if (trigger === 'home-toolbar') await H.p.locator('[data-command-id=closeProject]').click(); else await H.p.keyboard.press(trigger);
      const d = H.p.locator('.unsaved-dialog'); await d.waitFor(); H.assert(await d.getByRole('button').count() >= 3, 'Save/discard/cancel options missing'); await H.shot('unsaved-' + trigger + '-' + choice);
      await d.getByRole('button', { name: { save: 'Salvează', discard: 'Renunță', cancel: 'Anulează' }[choice], exact: true }).click();
    }, async H => {
      if (choice === 'cancel') { H.assert(await H.p.locator('.binder').isVisible(), 'Cancel left project'); H.assert((await H.editor().textContent()).includes('LIFECYCLE_UNSAVED_cancel'), 'Cancel lost local text'); H.assert(H.doc() === before, 'Cancel unexpectedly wrote file'); }
      else { await H.p.waitForSelector('.home'); H.assert(choice === 'save' ? H.doc().includes('LIFECYCLE_UNSAVED_save') : H.doc() === before, 'Save/discard file semantics wrong'); await reopen(H); await H.select(); H.assert(choice === 'save' ? (await H.editor().textContent()).includes('LIFECYCLE_UNSAVED_save') : !(await H.editor().textContent()).includes('LIFECYCLE_UNSAVED_discard'), 'Reopen did not reflect save/discard'); }
      H.assert(!await H.p.locator('.unsaved-dialog').count(), 'Unsaved prompt leaked');
    }, 'Every save/discard/cancel choice preserves or persists exact HTML correctly across close, toolbar, F5 and Ctrl+R.', trigger === 'native-close-project' ? routes('closeProject') : []);
  }
  for (const how of ['escape', 'backdrop', 'stack']) {
    let before;
    add('unsaved-cancel-' + how, 'Unsaved modal stack', how, ['closeProject', 'about', 'composition'], async H => { await H.settingsFixture({ autosaveSec: 3600 }); before = H.doc(); }, async H => {
      await dirty(H, ' STACK_CANCEL_FIXTURE'); if (how === 'stack') { await H.command('composition'); await native(H, 'about'); await H.app.evaluate(({ BrowserWindow }, id) => BrowserWindow.fromId(id).close(), H.windowId); } else await native(H, 'closeProject'); await H.p.locator('.unsaved-dialog').waitFor();
      if (how === 'backdrop') await H.p.locator('.unsaved-backdrop').click({ position: { x: 2, y: 2 } }); else await H.p.keyboard.press('Escape');
    }, async H => {
      await H.wait(async () => !await H.p.locator('.unsaved-dialog').count()); H.assert(H.doc() === before, 'Cancel wrote document'); H.assert(await H.p.locator('.app').count() && !await H.p.locator('.home').count(), 'Cancel closed project');
      if (how === 'stack') { H.assert(await H.p.locator('.about-dialog').isVisible(), 'Escape popped underlying modal'); await closeButton(H); H.assert(await H.p.locator('.composition').count() || await H.p.locator('.compose').count(), 'Cancel escaped underlying composition'); }
      else H.assert((await H.editor().textContent()).includes('STACK_CANCEL_FIXTURE'), 'Cancel lost local edit');
    }, 'Escape/backdrop cancel only unsaved prompt, retain text and underlying modal/composition.');
  }
  for (const how of ['native', 'shortcut', 'modal-shortcut']) {
    add('save-' + how, 'Save lifecycle', how, ['save'], async H => { await H.settingsFixture({ autosaveSec: 3600 }); }, async H => {
      await dirty(H, ' SAVE_' + how); if (how === 'modal-shortcut') await native(H, 'about'); if (how === 'native') await native(H, 'save'); else await H.p.keyboard.press('Control+s');
    }, async H => { await H.wait(() => H.doc().includes('SAVE_' + how)); H.assert(H.project().tree.some(n => n.root === 'draft'), 'Save damaged project.json'); if (how === 'modal-shortcut') { H.assert(await H.p.locator('.about-dialog').isVisible(), 'Save closed modal'); await closeButton(H); } await home(H); await reopen(H); await H.select(); H.assert((await H.editor().textContent()).includes('SAVE_' + how), 'Saved HTML did not reopen'); }, 'Native/Ctrl+S/background-modal Save persists edited HTML and valid project then reloads exact text.', how === 'native' ? routes('save') : []);
  }
  for (const how of ['native', 'shortcut', 'cancel-prompt', 'cancel-picker']) {
    let original;
    add('save-as-' + how, 'Save As', how, ['saveAs'], async H => { original = H.doc(); }, async H => {
      if (how === 'shortcut') await H.p.keyboard.press('Control+Shift+s'); else await native(H, 'saveAs');
      if (how === 'cancel-prompt') await H.p.locator('.prompt-modal').getByRole('button', { name: 'Anulează', exact: true }).click(); else { if (how !== 'cancel-picker') { const dest = path.join(H.W, 'projects', 'save-as-' + how); fs.mkdirSync(dest, { recursive: true }); await H.answer(dest); } await prompt(H, 'Lifecycle copy ' + how); }
    }, async H => {
      if (how.startsWith('cancel')) { H.assert(H.doc() === original, 'Cancel changed source HTML'); await returned(H); H.assert((await H.p.locator('.project-title').textContent()).includes(H.project().title), 'Cancel switched title'); }
      else { await H.wait(async () => (await H.p.locator('.project-title').textContent()).includes('Lifecycle copy ' + how)); const dir = await currentDir(H); H.assert(dir.toLowerCase() !== H.dir.toLowerCase(), 'SaveAs reused source dir'); H.assert(readProject(dir).title === 'Lifecycle copy ' + how, 'Copy title not persisted'); for (const rel of ['docs/doc-a.html', 'docs/doc-b.html', 'notes/doc-a.html']) H.assert(fs.readFileSync(path.join(dir, rel), 'utf8') === fs.readFileSync(path.join(H.dir, rel), 'utf8'), 'SaveAs file mismatch ' + rel); H.assert(H.doc() === original, 'Copy altered original'); await home(H); await reopen(H); await returned(H); }
    }, 'SaveAs copied project, all fixture texts and notes to distinct directory and title; both cancel paths preserve source.', how === 'shortcut' ? [] : routes('saveAs'));
  }

  for (const how of ['home', 'duplicate-claim', 'clean-close', 'save', 'discard', 'cancel']) {
    let a, copy, original;
    add('window-' + how, 'BrowserWindow lifecycle', how, ['newWindow'], async H => { await H.settingsFixture({ autosaveSec: 3600, reopenLastProject: false }); }, async H => {
      a = await aux(H); H.assert(await a.p.locator('.home').isVisible(), 'New window not Home');
      if (how === 'duplicate-claim') { await H.answer(H.dir); await a.p.getByRole('button', { name: /^Deschide un proiect/ }).click(); return; }
      if (['clean-close', 'save', 'discard', 'cancel'].includes(how)) {
        copy = path.join(H.W, 'projects', 'aux-' + how + '.scribner'); fs.cpSync(H.dir, copy, { recursive: true }); original = fs.readFileSync(path.join(copy, 'docs', 'doc-a.html'), 'utf8'); await H.answer(copy); await a.p.getByRole('button', { name: /^Deschide un proiect/ }).click(); await a.p.waitForSelector('.binder'); await a.p.locator('[data-node-id=doc-a]').click(); await a.p.locator('.pane .ProseMirror').first().click(); await a.p.keyboard.press('Control+End'); await a.p.keyboard.insertText(' AUX_' + how);
        if (how === 'clean-close') { await a.p.keyboard.press('Control+s'); await H.wait(() => fs.readFileSync(path.join(copy, 'docs', 'doc-a.html'), 'utf8').includes('AUX_clean-close')); original = fs.readFileSync(path.join(copy, 'docs', 'doc-a.html'), 'utf8'); }
      }
      await auxShot(H, a, 'aux-before-close-' + how); if (how !== 'home') await auxClose(H, a);
      if (['save', 'discard', 'cancel'].includes(how)) { const d = a.p.locator('.unsaved-dialog'); await d.waitFor(); await auxShot(H, a, 'aux-unsaved-' + how); await d.getByRole('button', { name: { save: 'Salvează', discard: 'Renunță', cancel: 'Anulează' }[how], exact: true }).click(); }
    }, async H => {
      try {
        if (how === 'home') { H.assert(await H.app.evaluate(({ BrowserWindow }, id) => !!BrowserWindow.fromId(id)?.isVisible(), a.id), 'New BrowserWindow not visible'); await auxClose(H, a); await auxGone(H, a); }
        else if (how === 'duplicate-claim') { H.assert(await a.p.locator('.home').isVisible(), 'Duplicate project opened in second window'); await H.wait(async () => await H.app.evaluate(({ BrowserWindow }, id) => BrowserWindow.fromId(id)?.isFocused(), H.windowId)); H.assert(H.doc().includes('Capitol verificat'), 'Duplicate claim damaged project'); await auxShot(H, a, 'aux-before-close-duplicate-claim'); await auxClose(H, a); await auxGone(H, a); }
        else if (how === 'cancel') { H.assert(!a.p.isClosed(), 'Cancel destroyed BrowserWindow'); H.assert(await H.app.evaluate(({ BrowserWindow }, id) => !!BrowserWindow.fromId(id), a.id), 'Cancel window absent'); H.assert((await a.p.locator('.pane .ProseMirror').first().textContent()).includes('AUX_cancel'), 'Cancel lost aux text'); H.assert(fs.readFileSync(path.join(copy, 'docs', 'doc-a.html'), 'utf8') === original, 'Cancel wrote aux text'); await auxShot(H, a, 'aux-before-final-discard'); await auxClose(H, a); await a.p.locator('.unsaved-dialog').getByRole('button', { name: 'Renunță', exact: true }).click(); await auxGone(H, a); }
        else { await auxGone(H, a); if (copy) H.assert(how === 'save' ? fs.readFileSync(path.join(copy, 'docs', 'doc-a.html'), 'utf8').includes('AUX_save') : fs.readFileSync(path.join(copy, 'docs', 'doc-a.html'), 'utf8') === original, 'Native close save/discard semantics wrong'); }
        await returned(H);
      } finally { await auxDispose(H, a); }
    }, 'New-window content/identity, one-window-per-project focus, and native close save/discard/cancel effects plus before-close screenshot and BrowserWindow absence.', routes('newWindow'));
  }
  for (const id of ['minimize', 'maximize', 'fullScreen', 'fullScreen-shortcut']) {
    add('window-state-' + id, 'Fereastră', id, id.startsWith('fullScreen') ? ['fullScreen'] : [], async H => { await H.app.evaluate(({ BrowserWindow }, id) => { const w = BrowserWindow.fromId(id); w.setFullScreen(false); if (w.isMinimized()) w.restore(); if (w.isMaximized()) w.unmaximize(); w.focus(); }, H.windowId); await H.wait(async () => await H.app.evaluate(({ BrowserWindow }, id) => { const w = BrowserWindow.fromId(id); return !w.isFullScreen() && !w.isMinimized() && !w.isMaximized(); }, H.windowId)); }, async H => {
      if (id === 'minimize') await H.native(['Fereastră', 'Minimizează']); else if (id === 'maximize') await H.native(['Fereastră', 'Mărește / Restaurează']); else if (id === 'fullScreen-shortcut') await H.p.keyboard.press('Control+Shift+F11'); else await native(H, 'fullScreen');
    }, async H => {
      const state = await H.wait(async () => await H.app.evaluate(({ BrowserWindow }, { id, kind }) => { const w = BrowserWindow.fromId(id); return kind === 'minimize' ? w.isMinimized() : kind === 'maximize' ? w.isMaximized() : w.isFullScreen(); }, { id: H.windowId, kind: id })); H.assert(state, 'Native window state unchanged');
      if (id === 'minimize') await H.app.evaluate(({ BrowserWindow }, id) => { BrowserWindow.fromId(id).restore(); BrowserWindow.fromId(id).focus(); }, H.windowId); else if (id === 'maximize') await H.native(['Fereastră', 'Mărește / Restaurează']); else if (id === 'fullScreen-shortcut') await H.p.keyboard.press('Control+Shift+F11'); else await native(H, 'fullScreen');
      await H.wait(async () => await H.app.evaluate(({ BrowserWindow }, id) => { const w = BrowserWindow.fromId(id); return !w.isMinimized() && !w.isMaximized() && !w.isFullScreen(); }, H.windowId)); await returned(H);
    }, 'Real BrowserWindow flags assert minimize/maximize/fullscreen and inverse restoration, preserving fixture context.');
  }
  for (const how of ['save', 'rename', 'apply-native', 'apply-dialog', 'delete', 'export', 'import', 'invalid-import', 'close', 'cancel-prompt']) {
    add('layout-' + how, 'Fereastră/layouts', how, ['saveLayout', 'manageLayouts'], async H => { await H.settingsFixture({ layouts: [{ name: 'Fixture layout', view: 'editor', showInspector: false, hideBinder: false, widths: { binder: 260, side: 320 } }] }); }, async H => {
      if (how === 'save' || how === 'cancel-prompt') { await native(H, 'saveLayout'); if (how === 'save') await prompt(H, 'Lifecycle saved layout'); else await H.p.locator('.prompt-modal').getByRole('button', { name: 'Anulează', exact: true }).click(); return; }
      if (how === 'apply-native') { await H.command('viewOutline'); await H.native(['Fereastră', 'Layout: Fixture layout']); return; }
      await native(H, 'manageLayouts'); const d = H.p.locator('.layouts-dialog'); await d.waitFor();
      if (how === 'rename') { await d.locator('.layout-list input').fill('Renamed fixture'); await d.locator('h3').click(); }
      if (how === 'apply-dialog') { await H.command('viewOutline'); await d.getByRole('button', { name: 'Aplică', exact: true }).first().click(); }
      if (how === 'delete') await d.getByRole('button', { name: 'Șterge', exact: true }).first().click();
      if (how === 'export') { const pending = H.p.waitForEvent('download'); await d.locator('.ly-export').click(); const download = await pending; await download.saveAs(path.join(H.W, 'layout-export.json')); }
      if (how === 'import' || how === 'invalid-import') { const file = path.join(H.W, 'layout-' + how + '.json'); fs.writeFileSync(file, how === 'import' ? JSON.stringify({ kind: 'pneuma-layout', version: 1, layout: { name: 'Imported layout', view: 'corkboard', hideBinder: false, showInspector: false } }) : '{"kind":"invalid"}'); await d.locator('input[type=file]').setInputFiles(file); }
      if (how === 'close') await closeButton(H, d);
    }, async H => {
      const s = await settings(H);
      if (how === 'save') { const l = s.layouts.find(x => x.name === 'Lifecycle saved layout'); H.assert(l?.view === 'editor' && l.widths?.binder > 0 && l.saved, 'Captured layout missing actual view/widths/timestamp'); H.assert(!('selectedId' in l), 'Layout leaked selected document identity'); }
      if (how === 'cancel-prompt') H.assert(s.layouts.length === 1, 'Canceled layout saved');
      if (how === 'rename') { H.assert(s.layouts[0].name === 'Renamed fixture', 'Rename not persisted'); await closeButton(H, H.p.locator('.layouts-dialog')); await H.wait(async () => (await H.menu()).some(x => x.label === 'Layout: Renamed fixture')); }
      if (how.startsWith('apply')) { if (how === 'apply-dialog') await closeButton(H, H.p.locator('.layouts-dialog')); H.assert(await H.editor().isVisible(), 'Applied layout view not editor'); H.assert(!await H.p.locator('.inspector').isVisible().catch(() => false), 'Applied inspector setting not reflected'); H.assert(H.doc().includes('Capitol verificat'), 'Layout changed document'); }
      if (how === 'delete') { H.assert(s.layouts.length === 0, 'Delete not persisted'); H.assert((await H.p.locator('.layouts-dialog').textContent()).includes('Niciun layout'), 'Empty layout message missing'); }
      if (how === 'export') { const out = JSON.parse(fs.readFileSync(path.join(H.W, 'layout-export.json'), 'utf8')); H.assert(out.kind === 'pneuma-layout' && out.version === 1 && out.layout.name === 'Fixture layout' && out.layout.showInspector === false, 'Layout export structure/payload wrong'); }
      if (how === 'import') { await H.wait(async () => (await settings(H)).layouts.some(x => x.name === 'Imported layout' && x.view === 'corkboard' && x.showInspector === false)); H.assert(await H.p.locator('.layout-list li').count() === 2, 'Imported layout row absent'); }
      if (how === 'invalid-import') { H.assert(s.layouts.length === 1, 'Invalid import mutated layouts'); await H.wait(async () => !!await H.p.getByRole('alert').filter({ hasText: 'Fișierul nu conține un aranjament' }).count()); }
      if (how === 'close') { H.assert(!await H.p.locator('.layouts-dialog').count(), 'Layouts did not close'); await returned(H); }
    }, 'All layout operations validate actual settings/visible arrangement/file contents, including import errors and destructive deletion.', how === 'apply-native' ? [['Fereastră', 'Layout: Fixture layout']] : how === 'save' || how === 'cancel-prompt' ? routes('saveLayout') : routes('manageLayouts'));
  }

  // Every enumerable shortcut field is tested for recording -> persistence, not a generic IPC dispatch.
  for (const row of SHORTCUT_ROWS) {
    add('shortcut-record-' + row.id, 'Program/Shortcuts', row.id, ['shortcuts', row.id], async H => { await H.settingsFixture({ aiEnabled: true, scriptFormat: null }); }, async H => {
      await native(H, 'shortcuts'); const d = H.modal(); const label = labelOf(row.id);
      const input = d.getByRole('textbox', { name: label + ': ' + t('ui.stylesDialog.scurtatura'), exact: true }); H.assert(await input.count() === 1, 'Shortcut row unavailable or ambiguous: ' + row.id);
      await input.focus(); await input.press('Control+Alt+Shift+F10'); H.assert(await input.inputValue() === 'Ctrl+Alt+Shift+F10', 'Recorder did not capture combo'); await d.getByRole('button', { name: 'Salvează', exact: true }).click();
    }, async H => { await H.wait(async () => (await settings(H)).shortcuts[row.id] === 'Ctrl+Alt+Shift+F10'); H.assert(!await H.p.locator('.shortcut-table').count(), 'Save shortcut did not close dialog'); H.assert(H.doc().includes('Capitol verificat'), 'Recording executed destructive command'); }, 'Every existing shortcut row records an actual keyboard combo and persists it under its canonical command ID.', routes('shortcuts'));
  }
  for (const how of ['delete', 'backspace', 'escape', 'default-one', 'default-all', 'cancel', 'conflict']) {
    add('shortcut-control-' + how, 'Shortcuts editor', how, ['shortcuts', 'save', 'saveAs'], async H => { await H.settingsFixture({ shortcuts: { save: 'Ctrl+Alt+S', saveAs: 'Ctrl+Alt+Shift+S' } }); }, async H => {
      await native(H, 'shortcuts'); const d = H.modal(), row = d.locator('.shortcut-row').filter({ hasText: 'Salvează acum' });
      if (how === 'default-one') await row.getByRole('button', { name: t('ui.shortcutsDialog.implicit'), exact: true }).click(); else if (how === 'default-all') await d.getByRole('button', { name: 'Toate la implicit', exact: true }).click(); else if (how === 'conflict') { await row.locator('input').focus(); await row.locator('input').press('Control+Alt+Shift+s'); H.assert(await d.locator('.shortcut-row.conflict').count() >= 2, 'Conflict not marked on both rows'); }
      else { await row.locator('input').focus(); await row.locator('input').press({ delete: 'Delete', backspace: 'Backspace', escape: 'Escape', cancel: 'Control+Alt+Shift+F10' }[how]); }
      await d.getByRole('button', { name: how === 'cancel' ? 'Anulează' : 'Salvează', exact: true }).click();
    }, async H => {
      const m = (await settings(H)).shortcuts || {}; if (how === 'delete' || how === 'backspace') H.assert(m.save === '', 'Delete did not disable shortcut'); if (how === 'escape' || how === 'cancel') H.assert(m.save === 'Ctrl+Alt+S', 'Cancel/Escape changed shortcut'); if (how === 'default-one') H.assert(m.save === undefined && m.saveAs === 'Ctrl+Alt+Shift+S', 'One-default cleared wrong rows'); if (how === 'default-all') H.assert(!Object.keys(m).length, 'All-default did not reset map'); if (how === 'conflict') H.assert(m.save === m.saveAs, 'Conflict recording not persisted'); await returned(H);
    }, 'All recorder controls verify precise persistent map values, canceled edits and conflict markup.', routes('shortcuts'));
  }
  add('shortcut-custom-save-dispatch', 'Shortcut routing', 'Reassigned Save vs disabled old key', ['save', 'shortcuts'], async H => { await H.settingsFixture({ autosaveSec: 3600, shortcuts: { save: 'Ctrl+Alt+Shift+F10' } }); }, async H => { await dirty(H, ' CUSTOM_SAVE_FIXTURE'); await H.p.keyboard.press('Control+s'); H.assert(!H.doc().includes('CUSTOM_SAVE_FIXTURE'), 'Old key still active after reassignment'); await H.p.keyboard.press('Control+Alt+Shift+F10'); }, async H => { await H.wait(() => H.doc().includes('CUSTOM_SAVE_FIXTURE')); H.assert(H.project().tree.length === 3, 'Custom save corrupted project roots'); }, 'Reassigned shortcut truly saves exact edited HTML; old Ctrl+S no longer writes.');
  add('shortcut-modal-block-stack', 'Modal stack', 'F1/Ctrl+N blocked; Escape top; editor focus', ['about', 'help', 'newText'], null, async H => { await H.editor().click(); await native(H, 'about'); await H.p.keyboard.press('F1'); await H.p.keyboard.press('Control+n'); }, async H => { H.assert(!await H.p.locator('.help-window').count(), 'F1 leaked behind modal'); H.assert(flat(H.project().tree).length === flat(H.base.tree).length, 'Ctrl+N ran behind modal'); H.assert(await H.p.locator('.about-dialog').isVisible(), 'Modal lost during shortcut'); await H.p.keyboard.press('Escape'); await H.wait(async () => !await H.p.locator('.about-dialog').count()); H.assert(await H.p.evaluate(() => !!document.activeElement?.closest('.ProseMirror')), 'Modal close did not restore editor focus'); await returned(H); }, 'App shortcuts cannot create/navigate behind modal; top Escape closes and restores exact editor focus.');
  add('developer-tools-native', 'Ajutor', 'Instrumente pentru dezvoltatori', [], null, async H => { await H.native(['Ajutor', 'Instrumente pentru dezvoltatori']); }, async H => {
    await H.wait(async () => await H.app.evaluate(({ BrowserWindow }, id) => BrowserWindow.fromId(id).webContents.isDevToolsOpened(), H.windowId)); H.assert(H.doc().includes('Capitol verificat'), 'Devtools action altered project'); await H.native(['Ajutor', 'Instrumente pentru dezvoltatori']); await H.wait(async () => await H.app.evaluate(({ BrowserWindow }, id) => !BrowserWindow.fromId(id).webContents.isDevToolsOpened(), H.windowId)); await returned(H); H.limit('devtools-visual', 'DevTools real open/close state is asserted; its own tabs/controls are external Chromium tooling, not application controls and not traversed.');
  }, 'Real DevTools state toggles and leaves selected project intact.', [['Ajutor', 'Instrumente pentru dezvoltatori']]);
  add('home-whitespace-title', 'Home', 'Whitespace title validation', [], home, async H => { await H.p.getByPlaceholder('Titlul cărții').fill('   '); await H.p.getByPlaceholder('Titlul cărții').press('Enter'); }, async H => { H.assert(await button(H, 'Creează').isDisabled(), 'Whitespace title enabled Create'); H.assert(await H.p.locator('.home').isVisible(), 'Whitespace Enter left Home'); H.assert(!(await H.effects()).some(x => x.kind === 'open-dialog'), 'Whitespace opened a picker'); }, 'Whitespace cannot create project or invoke native chooser.');
  add('home-template-import-invalid', 'Home Options', 'Invalid template folder', [], home, async H => { const dir = path.join(H.W, 'invalid-template'); fs.mkdirSync(dir, { recursive: true }); await H.answer(dir); await options(H); await H.p.getByRole('menuitem', { name: 'Importă șablon…', exact: true }).click(); }, async H => { await H.wait(async () => !!await H.p.getByRole('alert').filter({ hasText: /nu este un șablon/ }).count()); H.assert(await H.p.locator('.home').isVisible(), 'Invalid template navigated away'); H.assert(!(await H.p.evaluate(() => window.api.listAllTemplates())).some(t => t.name === 'invalid-template'), 'Invalid template added'); }, 'Invalid native template choice produces explicit error and no template/project.');
  for (const cancelAt of ['source', 'destination']) add('home-scriv-cancel-' + cancelAt, 'Home Options', 'Cancel .scriv picker ' + cancelAt, [], home, async H => {
    if (cancelAt === 'destination') { const dir = path.join(H.W, 'Canceled.scriv'); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'Canceled.scrivx'), '<ScrivenerProject><Binder/></ScrivenerProject>'); await H.answer(dir); }
    await options(H); await H.p.getByRole('menuitem', { name: 'Importă proiect .scriv', exact: true }).click();
  }, async H => { H.assert(await H.p.locator('.home').isVisible(), 'Canceled scriv picker left Home'); const eff = (await H.effects()).filter(x => x.kind === 'open-dialog'); H.assert(eff.length === (cancelAt === 'source' ? 1 : 2) && !eff.at(-1).answered, 'Wrong .scriv dialog canceled'); H.assert(H.doc().includes('Capitol verificat'), 'Canceled import changed existing project'); }, 'Cancel each native .scriv chooser independently, no project mutation.');
  add('help-close-backdrop', 'Help', 'Backdrop dismissal', ['help'], null, async H => { await native(H, 'help'); await H.p.locator('.help-backdrop').click({ position: { x: 2, y: 2 } }); }, async H => { await H.wait(async () => !await H.p.locator('.help-window').count()); await returned(H); }, 'Help backdrop closes viewer and returns exact document.', routes('help'));
  add('shortcut-record-layout-dynamic', 'Shortcuts', 'Dynamic layout:0 field', ['shortcuts', 'layout:0'], async H => { await H.settingsFixture({ layouts: [{ name: 'Shortcut fixture', view: 'editor' }] }); }, async H => { await native(H, 'shortcuts'); const input = H.modal().getByRole('textbox', { name: 'Layout: Shortcut fixture: ' + t('ui.stylesDialog.scurtatura'), exact: true }); await input.focus(); await input.press('Control+Alt+Shift+F10'); await H.modal().getByRole('button', { name: 'Salvează', exact: true }).click(); }, async H => { H.assert((await settings(H)).shortcuts['layout:0'] === 'Ctrl+Alt+Shift+F10', 'Dynamic layout shortcut not persisted'); H.assert((await settings(H)).layouts[0].name === 'Shortcut fixture', 'Recorder mutated layout payload'); }, 'Every dynamic layout field is covered with the fixture layout instance.', routes('shortcuts'));
  for (const key of ['F5', 'Control+r']) add('reload-clean-' + key, 'Reload lifecycle', key, [], async H => { await H.save(); }, async H => { await H.p.keyboard.press(key); }, async H => { await H.p.waitForSelector('.home'); H.assert(!await H.p.locator('.unsaved-dialog').count(), 'Clean reload incorrectly prompted'); H.assert(H.doc().includes('Capitol verificat'), 'Clean reload damaged HTML'); await reopen(H); await returned(H); }, 'Clean native reload returns Home without unsaved prompt and opens original fixture.');
  // Last case owns relaunch: private harness page/window handles are refreshed by H.launch().
  let exitedApp, quitDir, quitHtml;
  add('quit-real-process-and-relaunch', 'Application quit', 'Electron app.quit, actual process exit and fresh launch', [], async H => { await dirty(H, ' QUIT_SAVED_FIXTURE'); await H.save(); quitDir = H.dir; quitHtml = H.doc(); }, async H => {
    await H.shot('last-window-before-quit'); exitedApp = H.app; await H.app.evaluate(({ app }) => { setTimeout(() => app.quit(), 100); });
  }, async H => {
    await H.wait(() => exitedApp.process().exitCode !== null || exitedApp.process().signalCode !== null, 30000); H.assert(H.p.isClosed(), 'Quit did not close main renderer'); H.assert(fs.readFileSync(path.join(quitDir, 'docs', 'doc-a.html'), 'utf8') === quitHtml && quitHtml.includes('QUIT_SAVED_FIXTURE'), 'Quit lost saved fixture HTML');
    H.limit('quit-after-close-capture', 'Before screenshot is last-window-before-quit. Renderer page closure and process exit prove disappearance; BrowserWindow APIs cannot be queried after process exit. After screenshot belongs only to relaunched replacement window. Unsaved app.quit is not claimed equivalent to the three-way native close handshake. No Quit menu leaf exists in source menuLayout.');
    await H.launch(); H.assert(!H.p.isClosed() && await H.p.locator('.binder').isVisible(), 'Harness-owned real relaunch failed');
  }, 'Saved fixture survives actual process quit; renderer closes, process exits, and harness safely relaunches for final screenshot/disposal.');
  H.lifecycleCaseCount = H.cases.length - start;
  H.assert(H.lifecycleCaseCount === catalog.cases_count, 'Expanded lifecycle count drift: ' + H.lifecycleCaseCount + ' vs catalog ' + catalog.cases_count);
  H.assert(JSON.stringify(H.cases.slice(start).map(c => c.id)) === JSON.stringify(catalog.case_ids), 'Expanded lifecycle case IDs/order differ from catalog');
};
module.exports.inventory = { owners, ownerOf, REGISTRY, SHORTCUT_ROWS, categories, SETTINGS_TABS };
