// Captures Scribner's UI for the visual audit: the native menu (labels, order, shortcuts, enabled,
// checked, submenus) as menus.json in the same shape as uia-dump.ps1, and for each scene an
// accessibility snapshot (scene.json) plus a screenshot. The app runs on a private profile with the
// test project reopened, so it never touches the user's settings.
// Usage: node scripts/ui-audit/scribner-capture.cjs <projectDir.scribner> <outDir> [--lang en|ro] [--scenes]
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
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'scribner-audit-'));
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
  fs.writeFileSync(path.join(outDir, 'menus.json'), JSON.stringify({ role: 'MenuBar', name: 'Scribner', children: menus.filter((m) => m.visible !== false).map(menuNode) }, null, 1));

  const snap = async (name) => {
    const ax = await win.accessibility.snapshot({ interestingOnly: true });
    fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(axNode(ax || { role: 'none' }), null, 1));
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
    for (const s of SCENES.filter((x) => x.scribner)) {
      const r = s.scribner.menu ? await clickMenu(s.scribner.menu) : true;
      if (s.scribner.keys) for (const k of s.scribner.keys) await win.keyboard.press(k);
      if (s.scribner.click) await win.locator(s.scribner.click).first().click({ button: s.scribner.button || 'left' }).catch((e) => console.log(s.id, e.message.split('\n')[0]));
      await win.waitForTimeout(700);
      if (r !== true) console.log(s.id, r);
      await snap(s.id);
      for (const t of s.scribner.tabs || []) {
        await win.getByRole('tab', { name: t }).or(win.getByRole('button', { name: t, exact: true })).first().click().catch(() => console.log(s.id, 'tab missing', t));
        await win.waitForTimeout(300);
        await snap(`${s.id}--${t.replace(/[^\w]+/g, '_')}`);
      }
      await win.keyboard.press('Escape'); await win.keyboard.press('Escape');
      if (s.scribner.after) await clickMenu(s.scribner.after);
      await win.waitForTimeout(300);
    }
  }
  await app.close();
})().catch((e) => { console.error(e); process.exit(1); });
