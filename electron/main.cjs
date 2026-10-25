'use strict';
const { app, BrowserWindow, Menu, ipcMain, dialog, safeStorage, shell, clipboard, net } = require('electron');
const fs = require('fs');
const path = require('path');
const store = require('../lib/store.cjs');
const { loadHtml } = require('../lib/loadHtml.cjs');
const teamStore = require('../lib/teamStore.cjs');
const { importScriv } = require('../lib/scrivImport.cjs');
const compile = require('../lib/compile.cjs');
const scriptExport = require('../lib/scriptExport.cjs');
const editorPackage = require('../lib/editorPackage.cjs');
const ai = require('../lib/ai.cjs');
const aiRuns = require('../lib/aiRuns.cjs');
const aiProviders = require('../lib/aiProviders.cjs');
const aiKeys = require('../lib/aiKeys.cjs');
const services = require('../lib/services.cjs');
const translate = require('../lib/translate.cjs');
const notebookLm = require('../lib/notebookLm.cjs');
const backup = require('../lib/backup.cjs');
const history = require('../lib/history.cjs');
const { listTemplates } = require('../lib/templates.cjs');
const { fileToHtml, splitHtml } = require('../lib/docxImport.cjs');
const bundle = require('../lib/bundle.cjs');
const projectWatch = require('../lib/projectWatch.cjs');

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

const BACKUP_DEFAULTS = { backupOnClose: true, backupEveryMin: 0, backupKeep: backup.DEFAULT_KEEP, backupDir: '', backupOnOpen: false, backupOnSave: false, backupDateName: true, backupZip: true };
// Backup on manual save (Ctrl+S): at most once a minute per project.
const saveBackupDue = backup.makeSaveThrottle(60 * 1000);

function backupSettings() {
  return { ...BACKUP_DEFAULTS, ...readSettings() };
}

let backupRunning = null;
async function backupAll() {
  const s = backupSettings();
  if (backupRunning) return backupRunning;
  // Taken first: a project edited during the backup stays marked for the next one.
  const list = [...dirtyDirs];
  dirtyDirs.clear();
  backupRunning = (async () => {
    for (const dir of list) {
      try {
        await backup.backupProject(dir, s.backupDir || undefined, s.backupKeep, backup.backupOptions(s));
      } catch (err) {
        console.error('Backup eșuat pentru', dir, err);
        dirtyDirs.add(path.resolve(dir));
      }
    }
  })().finally(() => {
    backupRunning = null;
  });
  return backupRunning;
}

function scheduleBackups() {
  clearInterval(backupTimer);
  const min = Number(backupSettings().backupEveryMin) || 0;
  if (min > 0) backupTimer = setInterval(backupAll, min * 60 * 1000);
}

const SETTINGS_DEFAULTS = { recent: [], theme: 'system', fontSize: 18, typewriter: false, smartQuotes: true };
function readSettings() {
  let text;
  try {
    text = fs.readFileSync(settingsFile(), 'utf8');
  } catch {
    return { ...SETTINGS_DEFAULTS }; // first start
  }
  try {
    const parsed = JSON.parse(text);
    // Valid JSON that is not a settings object (null, a list, a string) counts as corrupt too.
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    if (!Array.isArray(parsed.recent)) parsed.recent = [];
    parsed.recent = parsed.recent.filter((r) => r && typeof r.dir === 'string');
    return parsed;
  } catch {
    // Unreadable: kept aside (never overwritten by defaults) and the last good copy is used.
    try {
      fs.renameSync(settingsFile(), `${settingsFile()}.corrupt-${Date.now()}`);
    } catch {
      /* best effort */
    }
    try {
      const good = JSON.parse(fs.readFileSync(`${settingsFile()}.bak`, 'utf8'));
      if (!good || typeof good !== 'object' || Array.isArray(good)) throw new Error('bad backup');
      if (!Array.isArray(good.recent)) good.recent = [];
      store.writeAtomic(settingsFile(), JSON.stringify(good, null, 2));
      return good;
    } catch {
      return { ...SETTINGS_DEFAULTS };
    }
  }
}

function writeSettings(s) {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  // Write to a temp file and rename it over the old one, so a crash mid-write never leaves
  // a truncated settings.json (API key and recent projects would be lost).
  store.writeAtomic(settingsFile(), JSON.stringify(s, null, 2));
  try {
    store.writeAtomic(`${settingsFile()}.bak`, JSON.stringify(s, null, 2)); // the last good copy
  } catch {
    /* best effort */
  }
}

// AI provider + per-provider keys (lib/aiKeys.cjs). Keys never leave the main process.
const aiProviderOf = (s) => (aiProviders.PRESETS[s.aiProvider] ? s.aiProvider : aiProviders.DEFAULT_PROVIDER);

function getApiKey(provider) {
  const s = readSettings();
  return aiKeys.getKey(s, provider || aiProviderOf(s), safeStorage);
}

function setApiKey(key, provider) {
  const s = readSettings();
  writeSettings(aiKeys.setKey(s, provider || aiProviderOf(s), key, safeStorage));
}

const OWN_URL_PROVIDERS = new Set(['custom', 'ollama', 'lmstudio']);
/** {provider, model, baseUrl, apiKey}; `override` (unsaved Settings form) wins over saved values. */
function getAiConfig(override = {}) {
  const s = readSettings();
  const provider = aiProviders.PRESETS[override.provider] ? override.provider : aiProviderOf(s);
  const same = provider === aiProviderOf(s);
  const model = override.model !== undefined ? override.model : same ? s.aiModel : '';
  // A stored key only travels to its provider's own address: the URL can be chosen only for the
  // servers that have none (custom, Ollama, LM Studio).
  const ownUrl = OWN_URL_PROVIDERS.has(provider);
  const baseUrl = !ownUrl ? '' : override.baseUrl !== undefined ? override.baseUrl : same ? s.aiBaseUrl : '';
  return { ...aiProviders.resolveConfig({ provider, model, baseUrl }), apiKey: aiKeys.getKey(s, provider, safeStorage) };
}

function migrateAiKeys() {
  const s = readSettings();
  if (aiKeys.needsMigration(s)) writeSettings(aiKeys.migrateKeys(s));
}

function rememberRecent(dir, title) {
  openedDirs.add(path.resolve(dir));
  rememberBase(dir);
  const s = readSettings();
  const pinned = new Set(s.recentPinned || []);
  const list = [{ dir, title }, ...(s.recent || []).filter((r) => r.dir !== dir)];
  // Pinned projects never fall off the list; the rest keep the 10 most recent.
  let free = 10;
  s.recent = list.filter((r) => pinned.has(r.dir) || free-- > 0);
  writeSettings(s);
}

// Multiple project windows: each window shows at most one project and a project
// is open in at most one window (lib/projectWatch.cjs createClaimRegistry).
const liveWindow = (wcId) => BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && w.webContents.id === wcId && !w.webContents.isCrashed());
const claims = projectWatch.createClaimRegistry({ isAlive: (wcId) => Boolean(liveWindow(wcId)) });

// Returns false (and focuses the other window) when the project is open elsewhere.
function claimDir(sender, dir) {
  const res = claims.claim(sender.id, dir);
  if (!res.ok) {
    const other = liveWindow(res.owner);
    if (other) {
      if (other.isMinimized()) other.restore();
      other.focus();
    }
    return false;
  }
  return true;
}

// Frees the window's project (closed, crashed, reloaded, back to start screen).
function releaseWindow(wcId) {
  const dir = claims.release(wcId);
  closeWatchers(wcId);
  if (dir && !claims.ownerOf(dir)) {
    bases.delete(dir);
    trackers.delete(dir);
  }
}

// A window that is not the project's owner must not write into it (stale window
// after a crash / reload while another window opened the project).
function assertOwner(sender, dir) {
  const owner = claims.ownerOf(dir);
  if (owner !== null && owner !== sender.id) throw new Error('Proiectul este deschis în altă fereastră.');
}

// Last project.json content each open project's window started from (three-way
// merge base for project:save). Set once per open; see lib/projectWatch.cjs saveMerged.
const bases = new Map();
function rememberBase(dir, force = false) {
  const key = path.resolve(dir);
  if (bases.has(key) && !force) return;
  try {
    bases.set(key, fs.readFileSync(path.join(dir, 'project.json'), 'utf8'));
  } catch {
    bases.delete(key);
  }
}

function assertOpened(dir) {
  if (!openedDirs.has(path.resolve(dir))) throw new Error('Proiectul nu a fost deschis în această sesiune.');
}

// Spell checking in Romanian (+ English) with a context menu of suggestions.
// On Windows and macOS Chromium uses the system spellchecker, so the Romanian
// language pack must be installed in the OS; on Linux the dictionaries download on demand.
const { lookupGroups } = require('../src/lib/lookups.js');

function applySpellLanguages(win) {
  const ses = win.webContents.session;
  const langs = (readSettings().spellLanguages || ['ro', 'en-US']).filter((l) => ses.availableSpellCheckerLanguages.length === 0 || ses.availableSpellCheckerLanguages.includes(l));
  try {
    if (langs.length) ses.setSpellCheckerLanguages(langs);
  } catch {
    /* system spellchecker (Windows/macOS) decides the languages */
  }
}
function setupSpelling(win) {
  applySpellLanguages(win);
  // Words ignored for this session ("Ignoră"): no suggestions menu for them.
  const ignored = new Set();
  const lookup = (url) => shell.openExternal(url);
  win.webContents.on('context-menu', async (_e, params) => {
    const items = [];
    const L = services.contextMenuLabels(readSettings().language);
    if (params.misspelledWord && !ignored.has(params.misspelledWord.toLowerCase())) {
      for (const s of params.dictionarySuggestions.slice(0, 6)) items.push({ label: s, click: () => {
        win.webContents.replaceMisspelling(s);
        win.webContents.send('spell:replaced', { from: params.misspelledWord, to: s });
      } });
      if (!params.dictionarySuggestions.length) items.push({ label: L.noSuggestions, enabled: false });
      items.push({ label: L.addToDict(params.misspelledWord), click: () => ses.addWordToSpellCheckerDictionary(params.misspelledWord) });
      items.push({ label: L.ignore(params.misspelledWord), click: () => ignored.add(params.misspelledWord.toLowerCase()) });
      items.push({ type: 'separator' });
    }
    // The editor selects the word under the pointer in its own contextmenu handler; Chromium may
    // have filled `params` before that, so read the live selection when params has none.
    let text = (params.selectionText || params.misspelledWord || '').trim();
    if (!text && params.isEditable) {
      text = String((await win.webContents.executeJavaScript('String(getSelection())').catch(() => '')) || '').trim();
      if (win.isDestroyed()) return;
    }
    if (text) {
      const st = readSettings();
      const g = lookupGroups(text, { from: st.translateFrom || 'auto', to: st.translateTo || 'ro', lang: st.language || 'ro' });
      const links = (list) => list.map((l) => ({ label: l.label, click: () => lookup(l.url) }));
      const cmd = (id) => () => { if (!win.isDestroyed()) win.webContents.send('menu:command', id); };
      const sv = services.serviceStatus(st, safeStorage);
      const inApp = [
        ...(sv.deepl.configured ? [{ label: L.inAppDeepl, click: cmd('deeplInApp') }] : []),
        ...(sv.googleTranslate.configured ? [{ label: L.inAppGoogle, click: cmd('googleInApp') }] : []),
      ];
      if (g.translate.length) items.push({ label: L.translate, submenu: [...inApp, ...(inApp.length ? [{ type: 'separator' }] : []), ...links(g.translate)] });
      items.push({ label: L.grammar, click: cmd('grammarSel') });
      if (g.dict.length) items.push({ label: L.dictionaries, submenu: links(g.dict) });
      items.push({ label: L.research, submenu: links(g.research) });
      if (st.aiEnabled !== false) {
        items.push({
          label: L.ai,
          submenu: [
            { label: L.aiResearch, click: cmd('aiResearchSel') },
            { label: L.aiDefine, click: cmd('aiDefineSel') },
            { label: L.aiProofread, click: cmd('aiProofreadSel') },
            { label: L.aiTranslate, click: cmd('aiTranslateSel') },
          ],
        });
      }
      items.push({
        label: L.inProject,
        submenu: [
          { label: L.findSel, click: cmd('findSel') },
          { label: L.researchSel, click: cmd('researchSel') },
          ...(st.aiEnabled !== false ? [{ label: L.researchAsk, click: cmd('researchAskSel') }] : []),
          { label: L.glossaryAdd, click: cmd('glossaryAdd') },
        ],
      });
      items.push({ label: L.notebookLm, click: cmd('nlmAskSel') });
      items.push({ type: 'separator' });
    }
    if (params.isEditable) {
      const cmd = (id) => () => { if (!win.isDestroyed()) win.webContents.send('menu:command', id); };
      items.push({
        label: L.extend,
        submenu: [
          { label: L.toSentence, click: cmd('selectSentence') },
          { label: L.toParagraph, click: cmd('selectParagraph') },
        ],
      });
      items.push({ type: 'separator' });
    }
    if (params.isEditable) {
      items.push(
        { label: L.cut, role: 'cut', enabled: params.editFlags.canCut },
        { label: L.copy, role: 'copy', enabled: params.editFlags.canCopy },
        { label: L.paste, role: 'paste', enabled: params.editFlags.canPaste },
        { label: L.pastePlain, role: 'pasteAndMatchStyle', enabled: params.editFlags.canPaste },
        { type: 'separator' },
        { label: L.selectAll, role: 'selectAll' },
        { type: 'separator' },
        { label: L.recheck, click: () => recheckSpelling(win) },
      );
    } else if (params.selectionText) {
      items.push({ label: L.copy, role: 'copy' });
    }
    if (items.length) Menu.buildFromTemplate(items).popup({ window: win });
  });
}

// "Check document now": Chromium re-checks editable text when spellcheck is toggled.
function recheckSpelling(win) {
  const ses = win.webContents.session;
  try {
    ses.setSpellCheckerEnabled(false);
    ses.setSpellCheckerEnabled(true);
  } catch {
    /* older Electron */
  }
  win.webContents
    .executeJavaScript(
      "document.querySelectorAll('[contenteditable=\"true\"]').forEach((el) => { el.spellcheck = false; setTimeout(() => { el.spellcheck = true; }, 30); }); true",
    )
    .catch(() => {});
}

function createWindow() {
  const offset = BrowserWindow.getAllWindows().filter((w) => w.isVisible()).length * 30; // hidden PDF windows do not count
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    ...(offset ? { x: 80 + offset, y: 60 + offset } : {}),
    title: 'Scribner',
    icon: path.join(__dirname, '..', 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      // Chromium's built-in PDF viewer, for the Print Preview dialog (blob: PDF in an iframe).
      plugins: true,
    },
  });
  win.setMenuBarVisibility(false);
  setupSpelling(win);
  const wcId = win.webContents.id;
  win.on('closed', () => releaseWindow(wcId));
  // A crashed or reloaded renderer has lost its project: free it for other windows.
  win.webContents.on('render-process-gone', () => releaseWindow(wcId));
  win.webContents.on('did-navigate', () => {
    releaseWindow(wcId);
    win.setMenu(null); // the reloaded page sends its own menu; the old one pointed at the old project
  });
  // The window only ever shows the app: a link or a dropped file must not load another page,
  // which would get window.api. Web links open in the browser instead.
  const guard = (e, url) => {
    if (isAppUrl(url)) return;
    e.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url);
  };
  win.webContents.on('will-navigate', guard);
  win.webContents.on('will-frame-navigate', (e) => e.isMainFrame === false || guard(e, e.url));
  win.webContents.on('will-redirect', guard);
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
  releaseWindow(e.sender.id);
  return true;
});
handle('window:fullScreen', (e, on) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return false;
  win.setFullScreen(on === undefined ? !win.isFullScreen() : Boolean(on));
  return win.isFullScreen();
});
handle('spell:recheck', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) recheckSpelling(win);
  return true;
});

handle('window:new', () => {
  createWindow();
  return true;
});

// Address of the app's own page (dev server or dist/index.html).
function isAppUrl(url) {
  const u = String(url || '');
  if (process.env.VITE_DEV_SERVER_URL) return u.startsWith(process.env.VITE_DEV_SERVER_URL);
  return u.startsWith('file:') && decodeURIComponent(u).replace(/\\/g, '/').includes('/dist/index.html');
}

function handle(channel, fn) {
  ipcMain.handle(channel, async (event, ...args) => {
    // Only the app's own page may call the main process (never a page a link navigated to).
    const from = event.senderFrame && event.senderFrame.url;
    if (from && !isAppUrl(from)) return { ok: false, error: 'Cerere refuzată: pagina nu aparține programului.' };
    try {
      return { ok: true, value: await fn(event, ...args) };
    } catch (err) {
      return { ok: false, error: channel.startsWith('ai:') || channel === 'rag:ask' || channel === 'rag:chat' ? ai.friendlyError(err, readSettings().language) : err.message || String(err) };
    }
  });
}

handle('settings:get', () => {
  const s = readSettings();
  const b = backupSettings();
  // Every saved preference goes back to the window (language, autosave, replacements…), except
  // the secrets, which stay in this process.
  const SECRET = new Set(['apiKeys', 'apiKeyEnc', 'apiKeyPlain', 'services', 'accounts']);
  const plain = Object.fromEntries(Object.entries(s).filter(([k]) => !SECRET.has(k) && !/(apikey|secret|token|password)/i.test(k)));
  return {
    ...plain,
    // `missing`: the Home screen marks recents whose folder is gone (moved, deleted, drive unplugged).
    recent: (s.recent || []).map((r) => (r && r.dir && !fs.existsSync(path.join(r.dir, 'project.json')) ? { ...r, missing: true } : r)),
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
    backupOnOpen: Boolean(b.backupOnOpen),
    backupOnSave: Boolean(b.backupOnSave),
    backupDateName: b.backupDateName !== false,
    backupZip: b.backupZip !== false,
    backupEveryMin: b.backupEveryMin,
    backupKeep: b.backupKeep,
    backupDir: b.backupDir,
    aiProvider: aiProviderOf(s),
    aiModel: s.aiModel || '',
    aiBaseUrl: s.aiBaseUrl || '',
    aiLabel: aiProviders.providerLabel(aiProviderOf(s)),
    notebookLmUrl: s.notebookLmUrl || '',
    // Only flags reach the renderer, never keys.
    hasKeys: aiKeys.keyFlags(s, safeStorage),
    // Current provider is usable: it has a key, or (local / custom servers) needs none.
    hasApiKey: Boolean(getApiKey()) || !aiProviders.PRESETS[aiProviderOf(s)].needsKey,
  };
});
handle('settings:set', (_e, patch) => {
  // apiKey: key for patch.aiProvider (or the current provider); apiKeys: {provider: key|''}.
  // Keys are stripped from the patch and only stored encrypted.
  const { apiKey, apiKeys, apiKeyEnc, apiKeyPlain, hasKeys, hasApiKey, ...rest } = patch || {};
  if (rest.aiProvider !== undefined && !aiProviders.PRESETS[rest.aiProvider]) delete rest.aiProvider;
  if (rest.notebookLmUrl !== undefined) rest.notebookLmUrl = String(rest.notebookLmUrl || '').trim();
  const cur = readSettings();
  // Recent projects: the window may only remove entries (Home → clear list), never add a folder,
  // which would make it count as opened. The backup folder comes only from its folder dialog.
  if (rest.recent !== undefined) rest.recent = (Array.isArray(rest.recent) ? rest.recent : []).filter((r) => r && (cur.recent || []).some((c) => c.dir === r.dir));
  if (rest.backupDir !== undefined && rest.backupDir && rest.backupDir !== cur.backupDir && rest.backupDir !== chosenBackupDir) delete rest.backupDir;
  writeSettings({ ...readSettings(), ...rest });
  // A new spelling language takes effect now in every window, not at the next start.
  if (rest.spellLanguages !== undefined) for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) applySpellLanguages(w);
  if (apiKeys && typeof apiKeys === 'object') {
    for (const [p, k] of Object.entries(apiKeys)) if (aiProviders.PRESETS[p] && typeof k === 'string') setApiKey(k, p);
  }
  if (apiKey !== undefined) setApiKey(apiKey, rest.aiProvider);
  scheduleBackups();
  return true;
});
handle('settings:chooseBackupDir', async (e) => {
  const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Folder pentru backup-uri',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (!res.canceled) chosenBackupDir = res.filePaths[0];
  return res.canceled ? null : res.filePaths[0];
});
let chosenBackupDir = null;
handle('templates:list', () => listTemplates());

handle('project:new', async (e, title, templateId) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const res = await dialog.showOpenDialog(win, { title: 'Alege folderul în care se creează proiectul', properties: ['openDirectory', 'createDirectory'] });
  if (res.canceled) return null;
  const dir = store.projectDirFor(res.filePaths[0], title);
  const project = store.createProject(dir, title, templateId);
  releaseWindow(e.sender.id);
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
  // One spelling per folder (a link or another letter case is the same project): two windows
  // must not both write into it.
  try {
    dir = fs.realpathSync.native(dir);
  } catch {
    /* missing: the open below reports it */
  }
  // Already open in another window: focus it and leave this one as it is.
  const owner = claims.ownerOf(dir);
  if (owner !== null && owner !== e.sender.id) {
    claimDir(e.sender, dir); // focuses the owner window
    return null;
  }
  // Load before claiming: a missing / broken project must not move this window's claim.
  store.checkProjectDir(dir, readSettings().language);
  const project = store.loadProject(dir);
  const reopening = claims.dirOf(e.sender.id) === path.resolve(dir);
  if (!reopening) releaseWindow(e.sender.id);
  if (!claimDir(e.sender, dir)) return null;
  rememberRecent(dir, project.title);
  if (!reopening) backup.backupOnOpen(dir, backupSettings());
  return { dir, project };
});

// Re-read project.json after an external change (no backup, no recent-list update).
// The merge base stays where it is: the next save merges against it.
handle('project:reload', (e, dir) => {
  assertOpened(dir);
  assertOwner(e.sender, dir);
  store.loadProject(dir); // creates missing sub-folders, as before
  return projectWatch.reloadWithBase(dir, bases);
});
handle('project:syncConflicts', (e, dir) => {
  assertOpened(dir);
  return projectWatch.syncConflicts(dir);
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
  releaseWindow(e.sender.id);
  claimDir(e.sender, result.dir);
  rememberRecent(result.dir, result.project.title);
  return result;
});

handle('project:save', (e, dir, project) => {
  assertOpened(dir);
  assertOwner(e.sender, dir);
  const key = path.resolve(dir);
  const res = projectWatch.saveMerged(dir, project, bases.get(key), { noteWrite: noteSelfWrite });
  // After a merge the window still holds its own version: keep the old base so its next
  // save merges again, and tell it to reload the merged project.
  if (!res.merged) bases.set(key, res.raw);
  else if (!e.sender.isDestroyed()) e.sender.send('project:changed', { dir, files: ['project.json'], merged: true });
  dirtyDirs.add(path.resolve(dir));
  return true;
});

handle('doc:read', (_e, dir, id, kind) => {
  assertOpened(dir);
  return store.readDoc(dir, id, kind === 'notes' ? 'notes' : 'docs');
});
handle('doc:write', (e, dir, id, kind, html) => {
  assertOpened(dir);
  assertOwner(e.sender, dir);
  noteSelfWrite(path.join(dir, kind === 'notes' ? 'notes' : 'docs', `${id}.html`), html);
  store.writeDoc(dir, id, kind === 'notes' ? 'notes' : 'docs', html);
  dirtyDirs.add(path.resolve(dir));
  return true;
});

// MCP: the command an AI agent client uses to start the Scribner MCP server for
// the open project. Packaged builds run the server with Electron's own Node.
handle('mcp:info', (_e, dir) => {
  assertOpened(dir);
  // The general form (no project, no user name): the same line for every book and computer.
  const mc = require('../lib/mcpConfig.cjs');
  const entry = app.isPackaged ? mcpEntry() : { command: 'node', args: [path.join(__dirname, '..', 'mcp', 'server.mjs')] };
  return { claudeCode: mc.claudeCodeCommand(entry), desktopJson: JSON.stringify({ mcpServers: { scribner: entry } }, null, 2) };
});

// Reload the open project when files change outside the app (an AI agent via MCP,
// a sync client). Writes made by the app itself are recognised by content
// (lib/projectWatch.cjs createChangeTracker).
const trackers = new Map(); // resolved dir -> change tracker (shared by save paths and the watcher)
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
function trackerFor(dir, onFlush = () => {}) {
  const key = path.resolve(dir);
  let t = trackers.get(key);
  if (!t) {
    const target = { onFlush };
    t = projectWatch.createChangeTracker({ dir: key, onFlush: (files) => target.onFlush(files) });
    t.target = target;
    trackers.set(key, t);
  }
  return t;
}
// content: the exact text written (recommended); without it a 2 s window is used.
function noteSelfWrite(file, content) {
  const abs = path.resolve(file);
  const projectDir = [...trackers.keys()].find((d) => abs.startsWith(d + path.sep));
  trackerFor(projectDir || (path.basename(abs) === 'project.json' ? path.dirname(abs) : path.dirname(path.dirname(abs)))).noteWrite(abs, content);
}
function watchProject(dir, webContents) {
  const wkey = `${webContents.id}|${path.resolve(dir)}`;
  if (watchers.has(wkey)) return;
  // A window watches only its current project.
  closeWatchers(webContents.id);
  const tracker = trackerFor(dir);
  tracker.target.onFlush = (files) => {
    if (!webContents.isDestroyed()) webContents.send('project:changed', { dir, files });
  };
  try {
    const w = fs.watch(dir, { recursive: true }, (_event, rel) => tracker.handle(rel));
    // The folder went away (NAS offline, network drive or sync folder disconnected): tell the window
    // and watch again once it is back, instead of silently never reporting changes again.
    w.on('error', () => {
      closeWatchers(webContents.id);
      if (!webContents.isDestroyed()) webContents.send('project:changed', { dir, files: [], offline: true });
      const retry = setInterval(() => {
        if (webContents.isDestroyed() || claims.dirOf(webContents.id) !== path.resolve(dir)) return clearInterval(retry);
        if (!fs.existsSync(path.join(dir, 'project.json'))) return undefined;
        clearInterval(retry);
        watchProject(dir, webContents);
        // Whatever changed meanwhile is read again.
        webContents.send('project:changed', { dir, files: ['project.json'], online: true });
        return undefined;
      }, 5000);
    });
    watchers.set(wkey, w);
  } catch {
    /* recursive watch unsupported: external changes appear on reopen */
  }
}
handle('project:watch', (e, dir) => {
  assertOpened(dir);
  assertOwner(e.sender, dir);
  // Projects opened through paths that don't claim (Save As, New from template) are claimed here.
  if (claims.dirOf(e.sender.id) !== path.resolve(dir)) {
    releaseWindow(e.sender.id);
    claimDir(e.sender, dir);
  }
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

// Error log for Help → Report a problem (logs/errors.jsonl in userData, rotated).
const errorLog = require('../lib/errorLog.cjs');
const errorLogFile = () => path.join(app.getPath('userData'), 'logs', 'errors.jsonl');
function logAppError(info) {
  try {
    const entry = errorLog.appendEntry(errorLogFile(), errorLog.makeEntry({ version: app.getVersion(), ...info }));
    for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('app:error', entry);
    return entry;
  } catch (err) {
    console.error('Jurnalul de erori nu poate fi scris', err);
    return null;
  }
}
process.on('uncaughtException', (error) => {
  console.error(error);
  logAppError({ process: 'main', kind: 'uncaughtException', error });
});
process.on('unhandledRejection', (error) => {
  console.error(error);
  logAppError({ process: 'main', kind: 'unhandledRejection', error });
});
app.on('render-process-gone', (_e, _wc, d) => logAppError({ process: 'renderer', kind: 'render-process-gone', message: `Fereastra s-a oprit: ${d.reason} (cod ${d.exitCode})` }));
app.on('child-process-gone', (_e, d) => {
  if (d.reason !== 'clean-exit') logAppError({ process: d.type, kind: 'child-process-gone', message: `${d.type}${d.name ? ' ' + d.name : ''}: ${d.reason} (cod ${d.exitCode})` });
});
handle('errors:get', () => ({
  entries: errorLog.readEntries(errorLogFile()),
  env: {
    appVersion: app.getVersion(),
    os: `${process.platform} ${require('os').release()}`,
    arch: process.arch,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    home: require('os').homedir(),
    user: (() => { try { return require('os').userInfo().username; } catch { return ''; } })(),
    projectDirs: (readSettings().recent || []).map((r) => (typeof r === 'string' ? r : r && r.dir)).filter(Boolean),
  },
}));
handle('errors:clear', () => errorLog.clear(errorLogFile()));
handle('errors:log', (_e, info = {}) => {
  logAppError({ process: 'renderer', kind: String(info.kind || 'error').slice(0, 40), message: String(info.message || '').slice(0, 1000), stack: String(info.stack || '').slice(0, 4000) });
  return true;
});
handle('app:copyText', (_e, text) => {
  clipboard.writeText(String(text || ''));
  return true;
});
require('./ioHandlers.cjs')({ handle, dialog, BrowserWindow, store, assertOpened, rememberRecent, noteSelfWrite });
require('./v04Handlers.cjs')({ handle, dialog, BrowserWindow, store, assertOpened, noteSelfWrite });
require('./ragHandlers.cjs')({ handle, store, assertOpened, getSettings: readSettings, getApiKey, getAiConfig, ai, noteSelfWrite, showOpenDialog: (e, o) => dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), o) });
const pickedAudio = new Set();
const whisper = require('./whisperHandlers.cjs')({ handle, app, net, assertOpened, store, pickedAudio, getSettings: readSettings, dtedFound: () => Boolean(require('../lib/dted.cjs').locate({ custom: readSettings().dtedPath || '' })) });
require('./dtedHandlers.cjs')({ handle, assertOpened, getSettings: readSettings, app, pickedAudio, showOpenDialog: (e, o) => dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), o) });
require('./v10Handlers.cjs')({ handle, getSettings: readSettings, getApiKey, getAiConfig, assertOpened, app });

// Native application menu built from the renderer's command registry. Accelerators
// are shown but not registered: the renderer handles keys, so a shortcut never fires twice.
// Menu items the window does itself (clipboard, window size); anything else goes to the renderer.
const NATIVE_ROLES = new Set(['cut', 'copy', 'paste', 'pasteAndMatchStyle', 'minimize', 'togglefullscreen']);
handle('menu:set', (e, spec) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const items = (list) =>
    list.map((it) =>
      it === '-'
        ? { type: 'separator' }
        : Array.isArray(it.items)
        ? { label: it.label, submenu: items(it.items) }
        : it.role === 'toggleMaximize'
        ? { label: it.label, click: () => win && !win.isDestroyed() && (win.isMaximized() ? win.unmaximize() : win.maximize()) }
        : it.role && NATIVE_ROLES.has(it.role)
        ? { label: it.label, role: it.role, enabled: !it.disabled, accelerator: it.key ? it.key.replace('Ctrl', 'CmdOrCtrl') : undefined, registerAccelerator: false }
        : {
            label: it.label,
            enabled: !it.disabled,
            accelerator: it.key ? it.key.replace('↑', 'Up').replace('↓', 'Down').replace('←', 'Left').replace('→', 'Right').replace('Ctrl', 'CmdOrCtrl') : undefined,
            registerAccelerator: false,
            click: () => win && !win.isDestroyed() && win.webContents.send('menu:command', it.id),
          },
    );
  const template = spec.map((menu) => ({ label: menu.label, submenu: items(menu.items) }));
  // The renderer sends its own Help menu; About and developer tools are appended to it.
  const extra = [
    { type: 'separator' },
    { label: 'Despre Scribner', click: () => dialog.showMessageBox(win, { message: `Scribner ${app.getVersion()}`, detail: 'Program de scris pentru texte lungi.' }) },
    { label: 'Instrumente pentru dezvoltatori', role: 'toggleDevTools', accelerator: 'F12' } // Ctrl+Shift+I is the Inspector,
  ];
  const helpMenu = template.find((m, i) => spec[i] && spec[i].items.some((it) => it !== '-' && it.id === 'help'));
  if (helpMenu) helpMenu.submenu.push(...extra);
  else template.push({ label: 'Ajutor', submenu: extra.slice(1) });
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

// Open in External Editor: hands the media file to the OS default application.
handle('media:openExternal', async (_e, dir, file) => {
  assertOpened(dir);
  if (!/^[A-Za-z0-9-]+\.[a-z0-9]+$/.test(file)) throw new Error(`Fișier media invalid: ${file}`);
  if (store.mimeFor(file) === 'application/octet-stream') throw new Error(`Tip de fișier care nu se deschide în alt program: ${file}`);
  const err = await shell.openPath(path.join(dir, 'media', file));
  if (err) throw new Error(err);
  return true;
});

handle('backup:now', async (_e, dir) => {
  assertOpened(dir);
  const s = backupSettings();
  return backup.backupProject(dir, s.backupDir || undefined, s.backupKeep, backup.backupOptions(s));
});
// File > Back Up To…: one backup in a folder chosen in a dialog (remembered as the next default).
handle('backup:to', async (e, dir) => {
  assertOpened(dir);
  const s = backupSettings();
  const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Backup în…',
    defaultPath: s.backupToDir || s.backupDir || undefined,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  writeSettings({ ...readSettings(), backupToDir: res.filePaths[0] });
  return backup.backupProject(dir, res.filePaths[0], s.backupKeep, backup.backupOptions(s));
});
// Manual save: a backup when "back up on each manual save" is on, throttled to once a minute.
handle('backup:onSave', async (_e, dir) => {
  assertOpened(dir);
  const s = backupSettings();
  if (!s.backupOnSave || !saveBackupDue(dir)) return null;
  return backup.backupProject(dir, s.backupDir || undefined, s.backupKeep, backup.backupOptions(s));
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
  releaseWindow(_e.sender.id);
  if (!claimDir(_e.sender, target)) throw new Error('Proiectul restaurat este deschis în altă fereastră.');
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

handle('import:file', async (e, mode, separator, opts) => {
  const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Importă text',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Text', extensions: ['docx', 'txt', 'md', 'markdown'] }],
  });
  if (res.canceled) return null;
  const parts = [];
  for (const file of res.filePaths) {
    const html = await fileToHtml(file);
    parts.push(...splitHtml(html, mode, separator, path.basename(file).replace(/\.[^.]+$/, ''), { firstLineTitle: Boolean(opts && opts.firstLineTitle) }));
  }
  return parts;
});
// I-EDIT: journal of the author's own changes. Only the window that owns the project writes.
// Team work through a shared folder (src/lib/team.js): log and presence files in <project>/team/.
handle('team:files', (_e, dir) => {
  assertOpened(dir);
  return teamStore.teamFiles(dir);
});
handle('team:write', (e, dir, name, text, opts) => {
  assertOpened(dir);
  assertOwner(e.sender, dir);
  return teamStore.teamWrite(dir, name, text, opts);
});
handle('editorial:appendAuthorJournal', (e, dir, rows) => {
  assertOpened(dir);
  assertOwner(e.sender, dir);
  return store.appendAuthorJournal(dir, rows);
});
handle('snap:take', (e, dir, id, name) => {
  assertOpened(dir);
  assertOwner(e.sender, dir);
  return store.takeSnapshot(dir, id, name);
});
handle('snap:list', (_e, dir, id) => {
  assertOpened(dir);
  return store.listSnapshots(dir, id);
});

handle('import:scriv', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  // The .scrivx file inside the project (on Windows a .scriv project is a folder: open it and pick
  // its .scrivx). importScriv takes either the file or the folder.
  const src = await dialog.showOpenDialog(win, { title: 'Alege proiectul .scriv (fișierul .scrivx din el)', properties: ['openFile'], filters: [{ name: 'Proiect .scriv', extensions: ['scrivx'] }] });
  if (src.canceled) return null;
  const dest = await dialog.showOpenDialog(win, { title: 'Unde salvez proiectul Scribner?', properties: ['openDirectory', 'createDirectory'] });
  if (dest.canceled) return null;
  const result = importScriv(src.filePaths[0], dest.filePaths[0]);
  releaseWindow(e.sender.id);
  claimDir(e.sender, result.dir);
  rememberRecent(result.dir, result.project.title);
  return result;
});

handle('compile:export', async (e, dir, project, format, options) => {
  assertOpened(dir);
  options = { ...(options || {}), projectDir: dir }; // media only from the opened project
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
        await loadHtml(pdfWin, html);
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

// Snapshot management from the Inspector: rename (title stored in the JSON) and delete.
const snapPath = (dir, id, file) => {
  if (!/^[A-Za-z0-9-]+$/.test(String(id)) || !/^[\w.-]+\.json$/.test(String(file))) throw new Error('Snapshot invalid');
  return path.join(dir, 'snapshots', id, file);
};
handle('snap:counts', (_e, dir) => {
  assertOpened(dir);
  return store.snapshotCounts(dir);
});
handle('snap:delete', (e, dir, id, file) => {
  assertOpened(dir);
  assertOwner(e.sender, dir);
  fs.unlinkSync(snapPath(dir, id, file));
  return true;
});
handle('snap:rename', (e, dir, id, file, name) => {
  assertOpened(dir);
  assertOwner(e.sender, dir);
  const p = snapPath(dir, id, file);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  data.name = String(name || 'Snapshot');
  fs.writeFileSync(p, JSON.stringify(data));
  return true;
});

// Personal spelling dictionary (Options → Corrections).
handle('spell:listWords', (e) => e.sender.session.listWordsInSpellCheckerDictionary());
handle('spell:removeWord', (e, word) => e.sender.session.removeWordFromSpellCheckerDictionary(String(word)));

handle('compile:preview', (_e, dir, project, options) => {
  assertOpened(dir);
  return compile.previewHtml(project, (id) => store.readDoc(dir, id), options);
});

handle('ai:run', (_e, payload) => {
  if (readSettings().aiEnabled === false) throw new Error('Funcțiile AI sunt oprite din Setări.');
  // Provider, model and key come only from settings; the renderer can't pick them per call.
  const { provider, model, baseUrl, apiKey, signal: _ignored, onDelta: _no, runId, ...rest } = payload || {};
  const timeoutMs = (Number(readSettings().aiTimeoutSec) || 300) * 1000;
  // With a runId the answer is streamed to the window as 'ai:delta' events while it is written.
  const onDelta = runId
    ? (delta) => {
        try { if (!_e.sender.isDestroyed()) _e.sender.send('ai:delta', { runId, delta }); } catch { /* window gone */ }
      }
    : undefined;
  return aiRuns.track(_e.sender.id, (signal) => ai.runAction({ ...rest, ...getAiConfig(), signal, onDelta }), timeoutMs);
});

// Cancels every AI request started by this window (panels and bulk jobs).
handle('ai:cancel', (e) => aiRuns.cancel(e.sender.id));

// "Testează conexiunea": tiny prompt to the provider chosen in the (possibly unsaved) form.
handle('ai:test', async (_e, override = {}) => {
  if (readSettings().aiEnabled === false) throw new Error('Funcțiile AI sunt oprite din Setări.');
  const cfg = getAiConfig({ provider: override.provider, model: override.model, baseUrl: override.baseUrl });
  if (cfg.needsKey && !cfg.apiKey) throw new Error(aiProviders.missingKeyMessage(cfg.provider));
  const started = Date.now();
  const text = await aiProviders.complete({
    ...cfg,
    system: 'Răspunzi foarte scurt.',
    prompt: 'Răspunde doar cu cuvântul: OK',
    maxTokens: 16,
    effort: 'low',
    signal: AbortSignal.timeout(60000),
  });
  return { ok: true, provider: cfg.provider, label: cfg.label, model: cfg.model, reply: String(text || '').slice(0, 200), ms: Date.now() - started };
});

// NotebookLM: no public API for personal accounts, so export sources + open the site.
handle('nlm:export', async (e, dir, options = {}) => {
  assertOpened(dir);
  const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    title: 'Folder pentru sursele NotebookLM',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const project = store.loadProject(dir);
  const out = notebookLm.exportNotebookLm({ project, readDoc: (id, kind) => store.readDoc(dir, id, kind), outDir: res.filePaths[0], ...options });
  shell.openPath(out.dir);
  return out;
});
// Web lookups from the renderer (dictionaries, DeepL, research). Only http(s) links leave the app.
handle('app:openLink', async (_e, url) => {
  if (typeof url !== 'string' || !/^https:\/\/[^\s]+$/.test(url) || url.length > 20000) throw new Error('Link invalid.');
  await shell.openExternal(url);
  return true;
});
// Outside services and other accounts (lib/services.cjs). Secrets stay in this process:
// the window gets only which services are set up and the non-secret fields.
handle('services:status', () => ({ services: services.serviceStatus(readSettings(), safeStorage), accounts: services.listAccounts(readSettings()) }));
handle('services:set', (_e, id, values) => {
  writeSettings(services.setService(readSettings(), id, values || {}, safeStorage));
  return services.serviceStatus(readSettings(), safeStorage)[id];
});
handle('accounts:set', (_e, account) => {
  const r = services.setAccount(readSettings(), account || {}, safeStorage);
  writeSettings(r.settings);
  return r.id;
});
handle('accounts:delete', (_e, id) => {
  writeSettings(services.deleteAccount(readSettings(), id));
  return true;
});
// The password goes to the clipboard and is cleared after 30 s if still there; never to the window.
handle('accounts:copyPassword', (_e, id) => {
  const pw = services.accountPassword(readSettings(), id, safeStorage);
  if (!pw) throw new Error('Contul nu are parolă salvată.');
  clipboard.writeText(pw);
  setTimeout(() => {
    if (clipboard.readText() === pw) clipboard.writeText('');
  }, 30000);
  return true;
});
handle('translate:run', async (_e, { service = 'deepl', text, from, to } = {}) => {
  const st = readSettings();
  const opts = { text, from: from || st.translateFrom || 'auto', to: to || st.translateTo || 'ro' };
  if (service === 'google') return translate.googleTranslate({ ...opts, apiKey: services.getService(st, 'googleTranslate', safeStorage).apiKey });
  return translate.deeplTranslate({ ...opts, apiKey: services.getService(st, 'deepl', safeStorage).apiKey });
});
handle('zotero:import', async (_e, { collection } = {}) => {
  const zt = services.getService(readSettings(), 'zotero', safeStorage);
  return { entries: await require('../lib/zotero.cjs').fetchZoteroLibrary({ userId: zt.userId, apiKey: zt.apiKey, collection }) };
});
// Ajutor → Conectează la Claude (MCP): the installed app runs the MCP server itself (no Node.js needed).
const mcpEntry = ({ projects = [], readOnly = false } = {}) =>
  require('../lib/mcpConfig.cjs').serverEntry({ execPath: process.execPath, serverPath: path.join(app.getAppPath(), 'mcp', 'server.mjs'), projects, readOnly });
handle('mcp:connectInfo', async (_e, opts = {}) => {
  const mc = require('../lib/mcpConfig.cjs');
  const entry = mcpEntry(opts);
  return { entry, command: mc.claudeCodeCommand(entry), desktopConfig: mc.claudeDesktopConfigPath() };
});
handle('mcp:connectDesktop', async (_e, opts = {}) => require('../lib/mcpConfig.cjs').writeClaudeDesktopConfig(mcpEntry(opts)));
handle('tts:speak', async (_e, { text } = {}) => {
  const sp = services.getService(readSettings(), 'speechify', safeStorage);
  return translate.speechifySpeak({ apiKey: sp.apiKey, voiceId: sp.voiceId, text });
});
handle('grammar:check', async (_e, { text, language } = {}) => {
  const lt = services.getService(readSettings(), 'languagetool', safeStorage);
  return translate.languageToolCheck({ text, language: language || 'auto', username: lt.username, apiKey: lt.apiKey });
});
handle('nlm:open', async () => {
  const url = notebookLm.notebookUrl(readSettings().notebookLmUrl);
  await shell.openExternal(url);
  return url;
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
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows().find((w) => w.isVisible());
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    } else createWindow();
  });
}

app.whenReady().then(() => {
  if (!gotLock) return;
  try {
    const migrated = backup.migrateBackupKeep(readSettings(), fs.existsSync(settingsFile()));
    if (migrated) writeSettings(migrated);
  } catch (err) {
    console.error('Migrarea setărilor de backup a eșuat', err);
  }
  try {
    migrateAiKeys();
  } catch (err) {
    console.error('Migrarea cheii API a eșuat', err);
  }
  scheduleBackups();
  createWindow();
  setTimeout(() => whisper.autoInstall?.(), 5000); // dictation ready without a trip to Settings
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().some((w) => w.isVisible())) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
