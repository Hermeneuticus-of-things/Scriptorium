'use strict';
const { app, BrowserWindow, Menu, ipcMain, dialog, safeStorage, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const store = require('../lib/store.cjs');
const { importScriv } = require('../lib/scrivImport.cjs');
const compile = require('../lib/compile.cjs');
const scriptExport = require('../lib/scriptExport.cjs');
const editorPackage = require('../lib/editorPackage.cjs');
const ai = require('../lib/ai.cjs');
const backup = require('../lib/backup.cjs');
const history = require('../lib/history.cjs');
const { listTemplates } = require('../lib/templates.cjs');
const { fileToHtml, splitHtml } = require('../lib/docxImport.cjs');
const bundle = require('../lib/bundle.cjs');

// Portable build: keep settings next to the .exe instead of %APPDATA%.
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  app.setPath('userData', path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'Scribner-data'));
}

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
// Only directories the user opened through a dialog (or recents) are writable from the renderer.
const openedDirs = new Set();
// Projects touched this session; backed up on quit and on the optional timer.
const dirtyDirs = new Set();
let backupTimer = null;

const BACKUP_DEFAULTS = { backupOnClose: true, backupEveryMin: 0, backupKeep: 10, backupDir: '' };

function backupSettings() {
  return { ...BACKUP_DEFAULTS, ...readSettings() };
}

async function backupAll() {
  const s = backupSettings();
  for (const dir of dirtyDirs) {
    try {
      await backup.backupProject(dir, s.backupDir || undefined, s.backupKeep);
    } catch (err) {
      console.error('Backup eșuat pentru', dir, err);
    }
  }
  dirtyDirs.clear();
}

function scheduleBackups() {
  clearInterval(backupTimer);
  const min = Number(backupSettings().backupEveryMin) || 0;
  if (min > 0) backupTimer = setInterval(backupAll, min * 60 * 1000);
}

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch {
    return { recent: [], theme: 'system', fontSize: 18, typewriter: false, smartQuotes: true };
  }
}

function writeSettings(s) {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2));
}

function getApiKey() {
  const s = readSettings();
  if (!s.apiKeyEnc) return process.env.ANTHROPIC_API_KEY || '';
  const buf = Buffer.from(s.apiKeyEnc, 'base64');
  return s.apiKeyPlain ? buf.toString('utf8') : safeStorage.decryptString(buf);
}

function setApiKey(key) {
  const s = readSettings();
  if (!key) {
    delete s.apiKeyEnc;
    delete s.apiKeyPlain;
  } else if (safeStorage.isEncryptionAvailable()) {
    s.apiKeyEnc = safeStorage.encryptString(key).toString('base64');
    delete s.apiKeyPlain;
  } else {
    s.apiKeyEnc = Buffer.from(key, 'utf8').toString('base64');
    s.apiKeyPlain = true;
  }
  writeSettings(s);
}

function rememberRecent(dir, title) {
  openedDirs.add(path.resolve(dir));
  const s = readSettings();
  const pinned = new Set(s.recentPinned || []);
  const list = [{ dir, title }, ...(s.recent || []).filter((r) => r.dir !== dir)];
  // Pinned projects never fall off the list; the rest keep the 10 most recent.
  let free = 10;
  s.recent = list.filter((r) => pinned.has(r.dir) || free-- > 0);
  writeSettings(s);
}

// Multiple project windows: each window shows at most one project and a project
// is open in at most one window. windowDirs: webContents id -> resolved dir.
const windowDirs = new Map();

function windowOwning(dir) {
  const key = path.resolve(dir);
  for (const [wcId, d] of windowDirs) {
    if (d !== key) continue;
    const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && w.webContents.id === wcId);
    if (win) return win;
    windowDirs.delete(wcId);
  }
  return null;
}

// Returns false (and focuses the other window) when the project is open elsewhere.
function claimDir(sender, dir) {
  const other = windowOwning(dir);
  if (other && other.webContents.id !== sender.id) {
    if (other.isMinimized()) other.restore();
    other.focus();
    return false;
  }
  windowDirs.set(sender.id, path.resolve(dir));
  return true;
}

function assertOpened(dir) {
  if (!openedDirs.has(path.resolve(dir))) throw new Error('Proiectul nu a fost deschis în această sesiune.');
}

// Spell checking in Romanian (+ English) with a context menu of suggestions.
// On Windows and macOS Chromium uses the system spellchecker, so the Romanian
// language pack must be installed in the OS; on Linux the dictionaries download on demand.
function setupSpelling(win) {
  const ses = win.webContents.session;
  const langs = (readSettings().spellLanguages || ['ro', 'en-US']).filter((l) => ses.availableSpellCheckerLanguages.length === 0 || ses.availableSpellCheckerLanguages.includes(l));
  try {
    if (langs.length) ses.setSpellCheckerLanguages(langs);
  } catch {
    /* system spellchecker (Windows/macOS) decides the languages */
  }
  win.webContents.on('context-menu', (_e, params) => {
    const items = [];
    if (params.misspelledWord) {
      for (const s of params.dictionarySuggestions.slice(0, 6)) items.push({ label: s, click: () => win.webContents.replaceMisspelling(s) });
      if (!params.dictionarySuggestions.length) items.push({ label: 'Nicio sugestie', enabled: false });
      items.push({ label: `Adaugă „${params.misspelledWord}” în dicționar`, click: () => ses.addWordToSpellCheckerDictionary(params.misspelledWord) });
      items.push({ type: 'separator' });
    }
    if (params.isEditable) {
      items.push(
        { label: 'Taie', role: 'cut', enabled: params.editFlags.canCut },
        { label: 'Copiază', role: 'copy', enabled: params.editFlags.canCopy },
        { label: 'Lipește', role: 'paste', enabled: params.editFlags.canPaste },
        { label: 'Lipește fără formatare', role: 'pasteAndMatchStyle', enabled: params.editFlags.canPaste },
        { type: 'separator' },
        { label: 'Selectează tot', role: 'selectAll' },
      );
    } else if (params.selectionText) {
      items.push({ label: 'Copiază', role: 'copy' });
    }
    if (items.length) Menu.buildFromTemplate(items).popup({ window: win });
  });
}

function createWindow() {
  const offset = BrowserWindow.getAllWindows().length * 30;
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    ...(offset ? { x: 80 + offset, y: 60 + offset } : {}),
    title: 'Scribner',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  setupSpelling(win);
  const wcId = win.webContents.id;
  win.on('closed', () => {
    windowDirs.delete(wcId);
    closeWatchers(wcId);
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  return win;
}

// The window closed its project (back to the start screen): free it for other windows.
handle('project:release', (e) => {
  windowDirs.delete(e.sender.id);
  closeWatchers(e.sender.id);
  return true;
});
handle('window:new', () => {
  createWindow();
  return true;
});

function handle(channel, fn) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return { ok: true, value: await fn(event, ...args) };
    } catch (err) {
      return { ok: false, error: channel.startsWith('ai:') ? ai.friendlyError(err) : err.message || String(err) };
    }
  });
}

handle('settings:get', () => {
  const s = readSettings();
  const b = backupSettings();
  return {
    recent: s.recent || [],
    theme: s.theme,
    fontSize: s.fontSize,
    typewriter: s.typewriter,
    compBg: s.compBg || '',
    compWidth: s.compWidth || 40,
    compPaper: s.compPaper !== false,
    compFade: s.compFade || 100,
    spellLanguages: s.spellLanguages || ['ro', 'en-US'],
    smartQuotes: s.smartQuotes !== false,
    aiEnabled: s.aiEnabled !== false,
    shortcuts: s.shortcuts || {},
    layouts: s.layouts || [],
    backupOnClose: b.backupOnClose,
    backupEveryMin: b.backupEveryMin,
    backupKeep: b.backupKeep,
    backupDir: b.backupDir,
    hasApiKey: Boolean(getApiKey()),
  };
});
handle('settings:set', (_e, patch) => {
  const { apiKey, ...rest } = patch;
  if (apiKey !== undefined) setApiKey(apiKey);
  writeSettings({ ...readSettings(), ...rest });
  scheduleBackups();
  return true;
});
handle('settings:chooseBackupDir', async (e) => {
  const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Folder pentru backup-uri',
    properties: ['openDirectory', 'createDirectory'],
  });
  return res.canceled ? null : res.filePaths[0];
});
handle('templates:list', () => listTemplates());

handle('project:new', async (e, title, templateId) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const res = await dialog.showOpenDialog(win, { title: 'Alege folderul în care se creează proiectul', properties: ['openDirectory', 'createDirectory'] });
  if (res.canceled) return null;
  const dir = store.projectDirFor(res.filePaths[0], title);
  const project = store.createProject(dir, title, templateId);
  claimDir(e.sender, dir);
  rememberRecent(dir, title);
  return { dir, project };
});

handle('project:open', async (e, dirArg) => {
  let dir = dirArg;
  if (!dir) {
    const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
      title: 'Deschide un proiect .scribner',
      properties: ['openDirectory'],
    });
    if (res.canceled) return null;
    dir = res.filePaths[0];
  } else if (!(readSettings().recent || []).some((r) => r.dir === dir)) {
    throw new Error('Proiectul nu este în lista recentă.');
  }
  // Already open in another window: focus it and leave this one as it is.
  if (!claimDir(e.sender, dir)) return null;
  const project = store.loadProject(dir);
  rememberRecent(dir, project.title);
  return { dir, project };
});

// Single-file project bundle (.json) for sync with the web/PWA build.
handle('project:exportBundle', async (e, dir) => {
  assertOpened(dir);
  const data = bundle.exportBundle(dir);
  const res = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Exportă proiectul ca pachet (pentru web / mobil)',
    defaultPath: `${data.project.title || 'Proiect'}.scribner.json`,
    filters: [{ name: 'Pachet Scribner', extensions: ['json'] }],
  });
  if (res.canceled) return null;
  fs.writeFileSync(res.filePath, JSON.stringify(data));
  return res.filePath;
});
handle('project:importBundle', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const src = await dialog.showOpenDialog(win, {
    title: 'Importă un pachet de proiect',
    properties: ['openFile'],
    filters: [{ name: 'Pachet Scribner', extensions: ['json'] }],
  });
  if (src.canceled) return null;
  const data = JSON.parse(fs.readFileSync(src.filePaths[0], 'utf8'));
  bundle.validateBundle(data);
  const dest = await dialog.showOpenDialog(win, { title: 'Unde salvez proiectul?', properties: ['openDirectory', 'createDirectory'] });
  if (dest.canceled) return null;
  const result = bundle.importBundle(data, dest.filePaths[0]);
  claimDir(e.sender, result.dir);
  rememberRecent(result.dir, result.project.title);
  return result;
});

handle('project:save', (_e, dir, project) => {
  assertOpened(dir);
  noteSelfWrite(path.join(dir, 'project.json'));
  store.saveProject(dir, project);
  dirtyDirs.add(dir);
  return true;
});

handle('doc:read', (_e, dir, id, kind) => {
  assertOpened(dir);
  return store.readDoc(dir, id, kind === 'notes' ? 'notes' : 'docs');
});
handle('doc:write', (_e, dir, id, kind, html) => {
  assertOpened(dir);
  noteSelfWrite(path.join(dir, kind === 'notes' ? 'notes' : 'docs', `${id}.html`));
  store.writeDoc(dir, id, kind === 'notes' ? 'notes' : 'docs', html);
  dirtyDirs.add(dir);
  return true;
});

// MCP: the command an AI agent client uses to start the Scribner MCP server for
// the open project. Packaged builds run the server with Electron's own Node.
handle('mcp:info', (_e, dir) => {
  assertOpened(dir);
  const server = path.join(__dirname, '..', 'mcp', 'server.mjs');
  const packaged = app.isPackaged;
  const command = packaged ? process.execPath : 'node';
  const env = packaged ? { ELECTRON_RUN_AS_NODE: '1' } : {};
  const q = (s) => (/[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s);
  const envPrefix = packaged ? '--env ELECTRON_RUN_AS_NODE=1 ' : '';
  return {
    claudeCode: `claude mcp add scribner ${envPrefix}-- ${q(command)} ${q(server)} --project ${q(dir)}`,
    desktopJson: JSON.stringify({ mcpServers: { scribner: { command, args: [server, '--project', dir], env } } }, null, 2),
  };
});

// Reload the open project when files change outside the app (an AI agent via MCP,
// a sync client). Writes made by the app itself are ignored.
const selfWrites = new Map(); // absolute file -> time
const watchers = new Map(); // `${webContentsId}|${dir}` -> fs.FSWatcher (one per window)
function closeWatchers(wcId) {
  for (const [k, w] of watchers) {
    if (k.startsWith(`${wcId}|`)) {
      try {
        w.close();
      } catch {
        /* already closed */
      }
      watchers.delete(k);
    }
  }
}
function noteSelfWrite(file) {
  selfWrites.set(path.resolve(file), Date.now());
}
function watchProject(dir, webContents) {
  const wkey = `${webContents.id}|${path.resolve(dir)}`;
  if (watchers.has(wkey)) return;
  // A window watches only its current project.
  closeWatchers(webContents.id);
  let timer = null;
  const changed = new Set();
  try {
    const w = fs.watch(dir, { recursive: true }, (_event, rel) => {
      if (!rel || /(^|[\\/])(snapshots|media|scrivener-original)[\\/]|\.tmp$|agent-log\.jsonl$|history\.json$/.test(rel)) return;
      const full = path.resolve(dir, rel);
      const t = selfWrites.get(full);
      if (t && Date.now() - t < 2000) return;
      changed.add(rel.replace(/\\/g, '/'));
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!webContents.isDestroyed()) webContents.send('project:changed', { dir, files: [...changed] });
        changed.clear();
      }, 400);
    });
    watchers.set(wkey, w);
  } catch {
    /* recursive watch unsupported: external changes appear on reopen */
  }
}
handle('project:watch', (e, dir) => {
  assertOpened(dir);
  watchProject(dir, e.sender);
  return true;
});

// Add images, PDFs, audio, video or any file to the Research folder (copied into media/).
handle('media:add', async (e, dir) => {
  assertOpened(dir);
  const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Adaugă fișiere în Cercetare',
    properties: ['openFile', 'multiSelections'],
  });
  if (res.canceled) return [];
  return res.filePaths.map((src) => {
    const id = store.newId();
    const ext = path.extname(src).slice(1) || 'bin';
    noteSelfWrite(path.join(dir, 'media', `${id}.${ext.toLowerCase()}`));
    const file = store.writeMedia(dir, id, ext, fs.readFileSync(src));
    return { id, title: path.basename(src).replace(/\.[^.]+$/, ''), media: { file, mime: store.mimeFor(file), name: path.basename(src) } };
  });
});

require('./ioHandlers.cjs')({ handle, dialog, BrowserWindow, store, assertOpened, rememberRecent, noteSelfWrite });
require('./v04Handlers.cjs')({ handle, dialog, BrowserWindow, store, assertOpened, noteSelfWrite });
require('./ragHandlers.cjs')({ handle, store, assertOpened, getSettings: readSettings, getApiKey, ai });
require('./v10Handlers.cjs')({ handle, getSettings: readSettings, getApiKey, assertOpened, app });

// Native application menu built from the renderer's command registry. Accelerators
// are shown but not registered: the renderer handles keys, so a shortcut never fires twice.
handle('menu:set', (e, spec) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const template = spec.map((menu) => ({
    label: menu.label,
    submenu: menu.items.map((it) =>
      it === '-'
        ? { type: 'separator' }
        : {
            label: it.label,
            enabled: !it.disabled,
            accelerator: it.key ? it.key.replace('↑', 'Up').replace('↓', 'Down').replace('←', 'Left').replace('→', 'Right').replace('Ctrl', 'CmdOrCtrl') : undefined,
            registerAccelerator: false,
            click: () => win && !win.isDestroyed() && win.webContents.send('menu:command', it.id),
          },
    ),
  }));
  template.push({
    label: 'Ajutor',
    submenu: [
      { label: 'Despre Scribner', click: () => dialog.showMessageBox(win, { message: `Scribner ${app.getVersion()}`, detail: 'Program de scris pentru cărți lungi, inspirat de Scrivener 3.' }) },
      { label: 'Instrumente pentru dezvoltatori', role: 'toggleDevTools' },
    ],
  });
  const menu = Menu.buildFromTemplate(template);
  if (win) {
    win.setMenu(menu);
    win.setMenuBarVisibility(true);
    win.autoHideMenuBar = false;
  }
  return true;
});

// Stylesheet import: read only the "styles" list of another project.
handle('styles:readFromProject', async (e) => {
  const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Alege proiectul din care imporți stilurile',
    properties: ['openDirectory'],
  });
  if (res.canceled) return null;
  const project = store.loadProject(res.filePaths[0]);
  return Array.isArray(project.styles) ? project.styles : [];
});

handle('media:read', (_e, dir, file) => {
  assertOpened(dir);
  const { data, mime } = store.readMedia(dir, file);
  return `data:${mime};base64,${data.toString('base64')}`;
});

handle('backup:now', async (_e, dir) => {
  assertOpened(dir);
  const s = backupSettings();
  return backup.backupProject(dir, s.backupDir || undefined, s.backupKeep);
});
handle('backup:list', (_e, dir) => {
  assertOpened(dir);
  return backup.listBackups(dir, backupSettings().backupDir || undefined);
});
handle('backup:restore', async (_e, dir, file) => {
  assertOpened(dir);
  const allowed = backup.listBackups(dir, backupSettings().backupDir || undefined).some((b) => b.file === file);
  if (!allowed) throw new Error('Backup necunoscut.');
  const target = await backup.restoreBackup(file, path.dirname(dir));
  const project = store.loadProject(target);
  claimDir(_e.sender, target);
  rememberRecent(target, project.title);
  return { dir: target, project };
});

handle('history:record', (_e, dir, counts) => {
  assertOpened(dir);
  history.recordHistory(dir, counts);
  return true;
});
handle('history:get', (_e, dir) => {
  assertOpened(dir);
  return history.summarize(history.readHistory(dir));
});

handle('import:file', async (e, mode, separator) => {
  const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Importă text',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Text', extensions: ['docx', 'txt', 'md', 'markdown'] }],
  });
  if (res.canceled) return null;
  const parts = [];
  for (const file of res.filePaths) {
    const html = await fileToHtml(file);
    parts.push(...splitHtml(html, mode, separator, path.basename(file).replace(/\.[^.]+$/, '')));
  }
  return parts;
});
handle('snap:take', (_e, dir, id, name) => {
  assertOpened(dir);
  return store.takeSnapshot(dir, id, name);
});
handle('snap:list', (_e, dir, id) => {
  assertOpened(dir);
  return store.listSnapshots(dir, id);
});

handle('import:scriv', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const src = await dialog.showOpenDialog(win, { title: 'Alege folderul proiectului Scrivener (.scriv)', properties: ['openDirectory'] });
  if (src.canceled) return null;
  const dest = await dialog.showOpenDialog(win, { title: 'Unde salvez proiectul Scribner?', properties: ['openDirectory', 'createDirectory'] });
  if (dest.canceled) return null;
  const result = importScriv(src.filePaths[0], dest.filePaths[0]);
  claimDir(e.sender, result.dir);
  rememberRecent(result.dir, result.project.title);
  return result;
});

handle('compile:export', async (e, dir, project, format, options) => {
  assertOpened(dir);
  const read = (id) => store.readDoc(dir, id);
  const info = compile.OUTPUT_FORMATS[format];
  if (!info) throw new Error(`Format necunoscut: ${format}`);
  const res = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Compilează manuscrisul',
    defaultPath: `${project.title}.${info.ext}`,
    filters: [{ name: info.name, extensions: [info.ext] }],
  });
  if (res.canceled) return null;
  const data = await compile.compile(project, read, format, options, {
    renderPdf: async (html, pdfOpts) => {
      const pdfWin = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } });
      try {
        await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        return await pdfWin.webContents.printToPDF(pdfOpts);
      } finally {
        pdfWin.destroy();
      }
    },
  });
  fs.writeFileSync(res.filePath, data);
  shell.showItemInFolder(res.filePath);
  return res.filePath;
});

handle('script:export', async (e, format, html, title) => {
  const ext = format === 'fdx' ? 'fdx' : 'fountain';
  const res = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Exportă scenariul',
    defaultPath: `${title || 'Scenariu'}.${ext}`,
    filters: [{ name: ext === 'fdx' ? 'Final Draft' : 'Fountain', extensions: [ext] }],
  });
  if (res.canceled) return null;
  const data = ext === 'fdx' ? scriptExport.htmlToFdx(html, { title }) : scriptExport.htmlToFountain(html, { title });
  fs.writeFileSync(res.filePath, data, 'utf8');
  return res.filePath;
});

handle('editor:package', async (e, dir, project, options = {}) => {
  assertOpened(dir);
  const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Unde creez pachetul PENTRU EDITOR?',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const pkg = await editorPackage.buildEditorPackage(
    project,
    (id) => store.readDoc(dir, id),
    (id) => store.readDoc(dir, id, 'notes'),
    res.filePaths[0],
    { ...options, settings: readSettings(), readSnapshots: (id) => store.listSnapshots(dir, id) },
  );
  shell.openPath(pkg.dir);
  return pkg;
});

handle('compile:preview', (_e, dir, project, options) => {
  assertOpened(dir);
  return compile.previewHtml(project, (id) => store.readDoc(dir, id), options);
});

handle('ai:run', (_e, payload) => {
  if (readSettings().aiEnabled === false) throw new Error('Funcțiile AI sunt oprite din Setări.');
  return ai.runAction({ ...payload, apiKey: getApiKey() });
});

let quitting = false;
app.on('before-quit', (event) => {
  if (quitting || !backupSettings().backupOnClose || dirtyDirs.size === 0) return;
  event.preventDefault();
  quitting = true;
  backupAll().finally(() => app.quit());
});

// Single instance: a second launch focuses the existing app instead of starting
// another process (several windows live inside the one instance).
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    } else createWindow();
  });
}

app.whenReady().then(() => {
  if (!gotLock) return;
  scheduleBackups();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
