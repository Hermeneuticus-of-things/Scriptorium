// Small windows (P11): the scratchpad as its own always-on-top window (also without a project, with a
// global shortcut), scratchpad notes as files in a folder the author chose, sending a note to a project
// open in another window, and deleting writing-history days.
const fs = require('fs');
const path = require('path');
const history = require('../lib/history.cjs');

const SHORTCUT = 'CommandOrControl+Alt+Shift+N';

module.exports = function smallWindowHandlers({ handle, app, BrowserWindow, globalShortcut, dialog, getSettings, setSettings, claims, assertOpened, appPage, preload, isAppUrl, shell }) {
  let scratchWin = null;

  function openScratchWindow() {
    if (scratchWin && !scratchWin.isDestroyed()) {
      if (scratchWin.isMinimized()) scratchWin.restore();
      scratchWin.show();
      scratchWin.focus();
      return true;
    }
    scratchWin = new BrowserWindow({
      width: 560,
      height: 400,
      minWidth: 360,
      minHeight: 240,
      alwaysOnTop: getSettings().scratchOnTop !== false,
      title: 'Scratchpad',
      webPreferences: { preload, contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
    scratchWin.setMenuBarVisibility(false);
    const guard = (e, url) => {
      if (isAppUrl(url)) return;
      e.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    };
    scratchWin.webContents.on('will-navigate', guard);
    scratchWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    scratchWin.on('closed', () => { scratchWin = null; });
    if (appPage.url) scratchWin.loadURL(`${appPage.url}${appPage.url.includes('?') ? '&' : '?'}scratchpad=1`);
    else scratchWin.loadFile(appPage.file, { search: 'scratchpad=1' });
    return true;
  }

  app.whenReady().then(() => {
    try {
      if (getSettings().scratchShortcut !== false) globalShortcut.register(SHORTCUT, openScratchWindow);
    } catch {
      /* the shortcut is taken by another program */
    }
  });
  app.on('will-quit', () => {
    try { globalShortcut.unregister(SHORTCUT); } catch { /* ignore */ }
  });

  handle('scratch:openWindow', () => openScratchWindow());
  handle('scratch:setOnTop', (_e, on) => {
    setSettings({ scratchOnTop: Boolean(on) });
    if (scratchWin && !scratchWin.isDestroyed()) scratchWin.setAlwaysOnTop(Boolean(on));
    return Boolean(on);
  });

  // --- notes folder: only the folder the author picked in the dialog is ever read or written
  const folder = () => {
    const f = getSettings().scratchFolder;
    return f && fs.existsSync(f) ? f : null;
  };
  handle('scratch:chooseFolder', async (e) => {
    const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), { title: 'Scratchpad', properties: ['openDirectory', 'createDirectory'] });
    if (res.canceled || !res.filePaths[0]) return null;
    setSettings({ scratchFolder: res.filePaths[0] });
    return res.filePaths[0];
  });
  handle('scratch:clearFolder', () => {
    setSettings({ scratchFolder: '' });
    return true;
  });
  handle('scratch:readFolder', () => {
    const dir = folder();
    if (!dir) return null;
    return fs.readdirSync(dir)
      .filter((f) => /\.html?$/i.test(f))
      .map((f) => {
        const file = path.join(dir, f);
        const text = fs.readFileSync(file, 'utf8');
        const body = (text.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [null, text])[1].trim();
        return { id: f, file: f, title: f.replace(/\.html?$/i, ''), html: body, updated: fs.statSync(file).mtimeMs };
      })
      .sort((a, b) => b.updated - a.updated);
  });
  // notes: [{file, html}] — writes every note and deletes .html files no longer in the list.
  handle('scratch:writeFolder', (_e, notes) => {
    const dir = folder();
    if (!dir) throw new Error('Nu e ales niciun dosar pentru notițe.');
    const keep = new Set();
    for (const n of notes || []) {
      const name = path.basename(String(n.file || ''));
      if (!/\.html$/i.test(name) || name.startsWith('.')) continue;
      keep.add(name);
      const target = path.join(dir, name);
      if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === n.content) continue;
      fs.writeFileSync(target, String(n.content || ''));
    }
    for (const f of fs.readdirSync(dir)) if (/\.html$/i.test(f) && !keep.has(f)) fs.unlinkSync(path.join(dir, f));
    return keep.size;
  });

  // --- send a note to a project open in some window
  handle('scratch:projects', () => BrowserWindow.getAllWindows()
    .filter((w) => !w.isDestroyed() && w !== scratchWin && claims.dirOf(w.webContents.id))
    .map((w) => ({ id: w.webContents.id, dir: claims.dirOf(w.webContents.id), title: path.basename(claims.dirOf(w.webContents.id)).replace(/\.scribner$/i, '') })));
  handle('scratch:send', (_e, wcId, payload) => {
    const w = BrowserWindow.getAllWindows().find((x) => !x.isDestroyed() && x.webContents.id === wcId);
    if (!w) throw new Error('Fereastra proiectului s-a închis.');
    w.webContents.send('scratch:receive', { title: String(payload?.title || ''), html: String(payload?.html || ''), mode: payload?.mode === 'append' ? 'append' : 'new' });
    return true;
  });

  // --- writing history: delete days (null = everything)
  handle('history:delete', (_e, dir, dates) => {
    assertOpened(dir);
    return history.deleteHistory(dir, Array.isArray(dates) ? dates.map(String) : null);
  });
};
