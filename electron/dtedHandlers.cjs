'use strict';
// D&TED dictation and transcription IPC (docs/DTED.md). Registered from main.cjs:
//   require('./dtedHandlers.cjs')({ handle, assertOpened, getSettings: readSettings, showOpenDialog, app });
// One D&TED service per app; its events go to the window that made the last request ('dted:event').
const path = require('path');
const os = require('os');
const { createDted, locate } = require('../lib/dted.cjs');
const { checkLatestDted, installDted, createScheduler, DAY_MS } = require('../lib/dtedUpdate.cjs');

const AUDIO = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma', 'opus', 'webm'];

module.exports = function register({ handle, assertOpened, getSettings, showOpenDialog, app, pickedAudio = new Set(), dtedFactory = createDted, setSettings = () => {}, fetchImpl = null, notifyAll = () => {} }) {
  // Each request's events go to the window that made it; "service stopped" goes to every window.
  const owners = new Map(); // request id -> webContents
  const deliver = (wc, ev) => {
    try {
      if (wc && !wc.isDestroyed()) wc.send('dted:event', ev);
    } catch {
      /* window closed */
    }
  };
  const find = () => locate({ custom: getSettings().dtedPath || '' });
  const dted = dtedFactory({
    find,
    onEvent: (ev) => {
      if (ev.ev === 'oprit') {
        appliedModel = null; // a restarted service starts again from its own choice
        for (const wc of new Set(owners.values())) deliver(wc, ev);
        owners.clear();
        return;
      }
      const wc = owners.get(String(ev.id));
      deliver(wc, ev);
      if (['rezultat', 'dictare_oprita', 'anulat', 'eroare'].includes(ev.ev)) owners.delete(String(ev.id));
    },
  });
  const reqId = (e, given, prefix) => {
    const id = String(given || `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`);
    owners.set(id, e.sender);
    return id;
  };
  const opts = () => {
    const s = getSettings();
    return { limba: s.dtedLanguage || 'ro', termeni: String(s.dtedTerms || '').slice(0, 2000) };
  };

  // Where D&TED was found ({found, source}); with check, also starts it and asks its state.
  handle('dted:status', async (e, { check = false } = {}) => {
    const how = find();
    if (!how) return { found: false };
    if (!check) return { found: true, source: how.source };
    await dted.start();
    await applyModel();
    const state = await dted.state().catch(() => null);
    // The version is kept in settings: the update check compares releases against it.
    if (state?.versiune && state.versiune !== getSettings().dtedVersion) {
      try {
        setSettings({ dtedVersion: state.versiune });
      } catch {
        /* best effort */
      }
    }
    return { found: true, source: how.source, running: dted.running(), state };
  });
  // The model chosen in Settings (dtedModel), sent once per service start.
  let appliedModel = null;
  const applyModel = async () => {
    const want = getSettings().dtedModel || 'auto';
    if (appliedModel === want && dted.running()) return;
    try {
      await dted.setModel(want);
      appliedModel = want; // only when accepted: a refusal (busy) is retried at the next request
    } catch {
      /* the service keeps its own choice for now */
    }
  };
  handle('dted:setModel', async (e, nume) => {
    await dted.start();
    const state = await dted.setModel(nume || 'auto');
    appliedModel = nume || 'auto';
    return state;
  });
  handle('dted:pickAudio', async (e) => {
    const r = await showOpenDialog(e, { title: 'Fișier audio de transcris', properties: ['openFile'], filters: [{ name: 'Audio', extensions: AUDIO }] });
    if (r.canceled) return null;
    pickedAudio.add(r.filePaths[0]); // the built-in recogniser may read this file (whisperHandlers)
    return r.filePaths[0];
  });
  handle('dted:transcribe', async (e, file, id) => {
    if (!file || !AUDIO.includes(path.extname(String(file)).slice(1).toLowerCase())) throw new Error('Alege un fișier audio (MP3, WAV, M4A, OGG, FLAC).');
    if (!pickedAudio.has(file)) throw new Error('Alege fișierul audio din fereastra de deschidere.'); // only files the user picked
    await dted.start();
    await applyModel();
    return dted.transcribe(file, opts(), reqId(e, id, 't'));
  });
  // An audio file attached to the project (media/<file>), from the binder.
  handle('dted:transcribeMedia', async (e, dir, file, id) => {
    assertOpened(dir);
    if (!/^[A-Za-z0-9-]+\.[a-z0-9]+$/.test(String(file))) throw new Error(`Fișier media invalid: ${file}`);
    await dted.start();
    await applyModel(); // the model chosen in Settings, as for any other transcription
    return dted.transcribe(path.join(dir, 'media', file), opts(), reqId(e, id, 't'));
  });
  handle('dted:dictateStart', async (e, id) => {
    await dted.start();
    await applyModel();
    return dted.dictateStart(opts(), reqId(e, id, 'd'));
  });
  handle('dted:dictateStop', async (_e, id) => dted.dictateStop(id));
  handle('dted:cancel', async (_e, id) => dted.cancel(id));

  // Update D&TED (docs/DTED.md §8): check the releases of its own repo; the install runs the
  // protocol-1 handshake BEFORE switching settings.dtedPath, so a failed update leaves the
  // previous installation active (fallback).
  handle('dted:checkUpdate', async () => {
    if (!fetchImpl) throw new Error('Verificarea actualizărilor D&TED e disponibilă doar în aplicația desktop.');
    return checkLatestDted({ fetchImpl, currentVersion: getSettings().dtedVersion || '' });
  });
  handle('dted:installUpdate', async (e, info) => {
    if (!fetchImpl) throw new Error('Actualizarea D&TED e disponibilă doar în aplicația desktop.');
    if (process.platform !== 'win32') throw new Error('Instalarea automată D&TED e disponibilă doar pe Windows.');
    const deliver = (ev) => {
      try {
        if (!e.sender.isDestroyed()) e.sender.send('dted:event', ev);
      } catch {
        /* window closed */
      }
    };
    const baseDir = process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Programs')
      : path.join(os.homedir(), 'AppData', 'Local', 'Programs');
    const r = await installDted({
      fetchImpl,
      info,
      baseDir,
      onProgress: (p) => deliver({ ev: 'update_progres', primit: p.received, total: p.total }),
    });
    setSettings({ dtedPath: r.exePath, dtedVersion: r.version, dtedLastUpdateCheck: Date.now() });
    await dted.stop(); // next start spawns the new build (find() reads the new settings)
    deliver({ ev: 'update_gata', versiune: r.version });
    return { exePath: r.exePath, version: r.version };
  });

  // The background check: at startup and every 3 days, non-blocking; a newer release is announced
  // to every window ('update_disponibila') — the install happens only on the writer's action.
  const sched = createScheduler({
    check: async () => {
      if (!find()) return;
      const info = await checkLatestDted({ fetchImpl, currentVersion: getSettings().dtedVersion || '' });
      if (info.newer && info.asset) notifyAll({ ev: 'update_disponibila', versiune: info.latest, url: info.url });
    },
    intervalMs: 3 * DAY_MS,
    firstDelayMs: 15000,
    enabled: Boolean(fetchImpl) && getSettings().dtedAutoUpdate !== false,
    lastCheck: getSettings().dtedLastUpdateCheck,
    onChecked: (t) => {
      try {
        setSettings({ dtedLastUpdateCheck: t });
      } catch {
        /* best effort */
      }
    },
  });

  if (app) app.on('will-quit', () => { sched.stop(); dted.stop(); });
  return dted;
};
