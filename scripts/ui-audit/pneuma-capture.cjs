// Captures Pneuma Sofer's UI for the visual audit: the native menu (labels, order, shortcuts, enabled,
// checked, submenus) as menus.json in the same shape as uia-dump.ps1, and for each scene an
// accessibility snapshot (scene.json) plus a screenshot. The app runs on a private profile with the
// test project reopened, so it never touches the user's settings.
// Usage: node scripts/ui-audit/pneuma-capture.cjs <projectDir.scribner> <outDir> [--lang en|ro] [--scenes]
const fs = require('fs');
const path = require('path');
const os = require('os');
const { _electron } = require('playwright');

const ROOT = path.join(__dirname, '..', '..');
const [projectDir, outDir] = process.argv.slice(2);
const lang = process.argv.includes('--lang') ? process.argv[process.argv.indexOf('--lang') + 1] : 'en';
const SCENES = require('./scenes.json');

// Electron accelerators as the user reads them on Windows
function shortcut(acc) {
  if (!acc) return '';
  return acc.replace(/CommandOrControl|CmdOrCtrl|Command|Cmd/g, 'Ctrl').replace(/Option/g, 'Alt').replace(/Super|Meta/g, 'Win').replace(/Plus/g, '+');
}
function menuNode(it) {
  if (it.type === 'separator') return { role: 'Separator', name: '', enabled: false };
  const n = { role: 'MenuItem', name: it.label.replace(/&/g, ''), enabled: it.enabled, key: shortcut(it.accelerator) };
  if ((it.type === 'checkbox' || it.type === 'radio') && it.checked) n.toggle = 'On';
  if (it.visible === false) n.hidden = true;
  if (it.submenu) n.children = it.submenu.items.filter((s) => s.visible !== false).map(menuNode);
  return n;
}
// Playwright accessibility tree → the uia-dump node shape
function axNode(a) {
  const role = { button: 'Button', checkbox: 'CheckBox', radio: 'RadioButton', combobox: 'ComboBox', textbox: 'Edit', tab: 'TabItem', menuitem: 'MenuItem', option: 'ListItem', treeitem: 'TreeItem', StaticText: 'Text', text: 'Text', slider: 'Slider', spinbutton: 'Spinner', separator: 'Separator', heading: 'Text', link: 'Button', menuitemcheckbox: 'MenuItem', menuitemradio: 'MenuItem' }[a.role] || a.role;
  const n = { role, name: a.name || '' };
  if (a.disabled) n.enabled = false;
  if (a.checked === true || a.pressed === true || a.selected === true) n.toggle = 'On';
  if (a.value !== undefined && a.value !== '') n.value = String(a.value);
  if (a.focused) n.focus = true;
  if (a.keyshortcuts) n.key = a.keyshortcuts;
  if (a.children) n.children = a.children.map(axNode);
  return n;
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'pneuma-audit-'));
  fs.writeFileSync(path.join(ud, 'settings.json'), JSON.stringify({ language: lang, recent: [{ dir: path.resolve(projectDir), title: 'Audit vizual' }], reopenLastProject: true, onboardingDone: true }));
  const app = await _electron.launch({ executablePath: require(path.join(ROOT, 'node_modules', 'electron')), args: ['.', `--user-data-dir=${ud}`], cwd: ROOT, env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' } });
  await app.evaluate(({ dialog, Menu }) => {
    dialog.showMessageBox = async () => ({ response: 1 });
    const orig = Menu.buildFromTemplate;
    Menu.buildFromTemplate = (t) => (global.__lastMenu = orig.call(Menu, t));
  });
  const win = await app.firstWindow();
  await win.setViewportSize({ width: 1400, height: 900 }).catch(() => {});
  await win.waitForSelector('.binder', { timeout: 30000 });
  await win.waitForTimeout(1500);

  const menus = await app.evaluate(({ Menu }) => {
    const m = global.__lastMenu || Menu.getApplicationMenu();
    const ser = (it) => ({ type: it.type, label: it.label, accelerator: it.accelerator, enabled: it.enabled, checked: it.checked, visible: it.visible, submenu: it.submenu && { items: it.submenu.items.map(ser) } });
    return m.items.map(ser);
  });
  fs.writeFileSync(path.join(outDir, 'menus.json'), JSON.stringify({ role: 'MenuBar', name: 'Pneuma Sofer', children: menus.filter((m) => m.visible !== false).map(menuNode) }, null, 1));

  // Playwright dropped page.accessibility; Pneuma Sofer is a web UI, so read the DOM directly — more
  // accurate than an a11y snapshot. Emits the same node shape element-diff.cjs expects.
  const domSnapshot = () => win.evaluate(() => {
    const roleOf = (el) => {
      const r = el.getAttribute('role');
      if (r) return { tab: 'TabItem', checkbox: 'CheckBox', radio: 'RadioButton', button: 'Button', menuitem: 'MenuItem', option: 'ListItem', combobox: 'ComboBox', textbox: 'Edit', heading: 'Text' }[r] || null;
      const tag = el.tagName.toLowerCase();
      if (tag === 'button') return 'Button';
      if (tag === 'a') return 'Button';
      if (tag === 'select') return 'ComboBox';
      if (tag === 'textarea') return 'Edit';
      if (tag === 'summary') return 'Button';
      if (tag === 'input') { const t = (el.type || 'text').toLowerCase(); return t === 'checkbox' ? 'CheckBox' : t === 'radio' ? 'RadioButton' : ['button', 'submit', 'reset'].includes(t) ? 'Button' : 'Edit'; }
      if (/^h[1-6]$/.test(tag) || el.classList.contains('field-label') || tag === 'label') return 'Text';
      return null;
    };
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const labelText = (el) => {
      let t = (el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
      if (!t && el.id) { const l = document.querySelector(`label[for="${el.id}"]`); if (l) t = l.textContent.trim(); }
      if (!t && el.tagName === 'INPUT') { const l = el.closest('label'); if (l) t = l.textContent.trim(); }
      if (!t) t = (el.textContent || '').trim();
      return t.replace(/\s+/g, ' ').slice(0, 120);
    };
    const out = [];
    const seen = new Set();
    // When a dialog is open, capture only inside it (the main window stays in the DOM behind the backdrop).
    const modals = [...document.querySelectorAll('.modal, [role="dialog"]')].filter((m) => m.getBoundingClientRect().width > 0);
    const root = modals.length ? modals[modals.length - 1] : document.body;
    for (const el of root.querySelectorAll('button,a,input,select,textarea,summary,label,h1,h2,h3,h4,h5,h6,[role]')) {
      const role = roleOf(el);
      if (!role || !vis(el)) continue;
      const name = labelText(el);
      if (!name) continue;
      const key = role + '::' + name;
      if (seen.has(key)) continue; seen.add(key);
      const n = { role, name };
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') n.enabled = false;
      if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) n.toggle = 'On'; }
      else if (el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-selected') === 'true' || el.classList.contains('active')) n.toggle = 'On';
      if (el.value !== undefined && el.value !== '' && role !== 'Button') n.value = String(el.value).slice(0, 60);
      out.push(n);
    }
    return { role: 'Window', name: document.title || 'Pneuma Sofer', children: out };
  });
  const snap = async (name) => {
    const tree = await domSnapshot();
    fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(tree, null, 1));
    await win.screenshot({ path: path.join(outDir, `${name}.png`) });
  };
  await snap('main');

  if (process.argv.includes('--scenes')) {
    const clickMenu = (labelPath) => app.evaluate(({ Menu }, labelPath) => {
      let items = (global.__lastMenu || Menu.getApplicationMenu()).items;
      let it = null;
      for (const l of labelPath) { it = items.find((x) => x.label.replace(/&/g, '') === l); if (!it) return `missing: ${l}`; items = it.submenu ? it.submenu.items : []; }
      if (!it.enabled) return 'disabled';
      it.click();
      return true;
    }, labelPath);
    // Dispatch an in-app command straight to the renderer (menu:command) — the reliable way to open
    // Pneuma Sofer's own dialogs, which a native-menu click does not always surface in the capture.
    const command = (id) => app.evaluate(({ BrowserWindow }, id) => BrowserWindow.getAllWindows()[0].webContents.send('menu:command', id), id);
    const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
    for (const s of SCENES.filter((x) => x.scribner && (!only || x.id === only))) {
      const sc = s.scribner;
      if (sc.command) await command(sc.command);
      else if (sc.menu) { const r = await clickMenu(sc.menu); if (r !== true) console.log(s.id, r); }
      if (sc.keys) for (const k of sc.keys) await win.keyboard.press(k);
      if (sc.click) await win.locator(sc.click).first().click({ button: sc.button || 'left' }).catch((e) => console.log(s.id, e.message.split('\n')[0]));
      if (sc.waitFor) await win.waitForSelector(sc.waitFor, { timeout: 4000 }).catch(() => console.log(s.id, 'waitFor missing:', sc.waitFor));
      await win.waitForTimeout(600);
      await snap(s.id);
      // Iterate every tab inside the opened dialog/area (allTabs), or named tabs.
      if (sc.allTabs) {
        const scope = sc.waitFor || '.modal';
        const tabs = await win.locator(`${scope} [role="tab"]`).all().catch(() => []);
        for (let i = 0; i < tabs.length; i++) {
          const name = (await tabs[i].textContent().catch(() => '') || `t${i}`).replace(/\s+/g, ' ').trim();
          await tabs[i].click().catch(() => {});
          await win.waitForTimeout(300);
          await snap(`${s.id}--${(name || `t${i}`).replace(/[^\w]+/g, '_').slice(0, 24)}`);
        }
      }
      for (const t of sc.tabs || []) {
        await win.getByRole('tab', { name: t }).or(win.getByRole('button', { name: t, exact: true })).first().click().catch(() => console.log(s.id, 'tab missing', t));
        await win.waitForTimeout(300);
        await snap(`${s.id}--${t.replace(/[^\w]+/g, '_')}`);
      }
      await win.keyboard.press('Escape'); await win.keyboard.press('Escape');
      if (sc.after) await clickMenu(sc.after);
      await win.waitForTimeout(300);
    }
  }
  await app.close();
})().catch((e) => { console.error(e); process.exit(1); });
