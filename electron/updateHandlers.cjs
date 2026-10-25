// Updates from GitHub Releases: IPC update:check / update:download / update:install and the background
// checks: once per day (10 s after start when the last check is older than 24 h, then every 24 h; on window focus
// only when the last check is older than 24 h). The manual check always asks GitHub (conditional request, ETag).
const os = require('os');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const updater = require('../lib/updater.cjs');

module.exports = function updateHandlers({ handle, app, net, shell, BrowserWindow, getSettings, setSettings }) {
  const cache = {}; // ETag + last release body (conditional requests)
  let lastInfo = null;
  let downloaded = null;
  const portable = updater.isPortable();
  const fetchImpl = (url, opts) => net.fetch(url, opts);
  const token = process.env.SCRIBNER_GITHUB_TOKEN || '';
  const broadcast = (channel, payload) => {
    for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send(channel, payload);
  };

  async function check() {
    lastInfo = await updater.checkLatest({ fetchImpl, currentVersion: app.getVersion(), portable, token, cache });
    return lastInfo;
  }
  // Background check: the windows show the banner (once per new version, remembered by the renderer).
  async function scheduledCheck() {
    const info = await check();
    if (info.newer) broadcast('update:available', info);
  }

  const enabled = () => getSettings().autoUpdateCheck !== false;
  // Only packaged builds check on their own (development and tests run without network chatter).
  const auto = app.isPackaged && process.env.SCRIBNER_NO_UPDATE_CHECK !== '1';
  const scheduler = updater.createScheduler({
    check: scheduledCheck,
    enabled: auto && enabled(),
    lastCheck: getSettings().updateLastCheck || 0,
    onChecked: (t) => setSettings({ updateLastCheck: t }),
  });
  app.on('browser-window-focus', () => scheduler.poke());
  app.on('before-quit', () => scheduler.stop());

  handle('update:check', () => check());
  handle('update:configure', () => {
    if (auto) scheduler.configure({ enabled: enabled() });
    return true;
  });
  handle('update:download', async (event) => {
    const info = lastInfo && lastInfo.newer ? lastInfo : await check();
    if (!info.newer) throw new Error('Programul este deja la zi.');
    const dir = path.join(os.tmpdir(), 'scribner-update', info.latest);
    let lastSent = 0;
    downloaded = await updater.downloadAsset({
      fetchImpl,
      info,
      dir,
      token,
      onProgress: ({ received, total }) => {
        const now = Date.now();
        if (now - lastSent < 150 && received !== total) return;
        lastSent = now;
        if (!event.sender.isDestroyed()) event.sender.send('update:progress', { received, total });
      },
    });
    return { ...downloaded, portable, version: info.latest };
  });
  handle('update:install', async () => {
    if (!downloaded || !fs.existsSync(downloaded.file)) throw new Error('Descarcă mai întâi versiunea nouă.');
    if (portable) {
      shell.showItemInFolder(downloaded.file);
      return { portable: true, file: downloaded.file };
    }
    if (process.platform !== 'win32') throw new Error('Instalarea automată este disponibilă doar pe Windows.');
    const child = spawn(downloaded.file, updater.INSTALLER_ARGS, { detached: true, stdio: 'ignore' });
    child.unref();
    // The renderer saved before calling; before-quit makes the closing backup. The installer closes and restarts the app.
    setTimeout(() => app.quit(), 300);
    return { portable: false };
  });
  return { scheduler, check };
};
