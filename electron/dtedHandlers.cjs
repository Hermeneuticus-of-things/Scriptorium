'use strict';
// D&TED dictation and transcription IPC (docs/DTED.md). Registered from main.cjs:
//   require('./dtedHandlers.cjs')({ handle, assertOpened, getSettings: readSettings, showOpenDialog, app });
// One D&TED service per app; its events go to the window that made the last request ('dted:event').
const path = require('path');
const { createDted, locate } = require('../lib/dted.cjs');

const AUDIO = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma', 'opus', 'webm'];

module.exports = function register({ handle, assertOpened, getSettings, showOpenDialog, app, pickedAudio = new Set(), dtedFactory = createDted }) {
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

  if (app) app.on('will-quit', () => dted.stop());
  return dted;
};
