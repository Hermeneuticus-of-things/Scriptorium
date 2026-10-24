'use strict';
// D&TED dictation and transcription IPC (docs/DTED.md). Registered from main.cjs:
//   require('./dtedHandlers.cjs')({ handle, assertOpened, getSettings: readSettings, showOpenDialog, app });
// One D&TED service per app; its events go to the window that made the last request ('dted:event').
const path = require('path');
const { createDted, locate } = require('../lib/dted.cjs');

const AUDIO = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma', 'opus', 'webm'];

module.exports = function register({ handle, assertOpened, getSettings, showOpenDialog, app, dtedFactory = createDted }) {
  let owner = null; // webContents receiving the events
  const find = () => locate({ custom: getSettings().dtedPath || '' });
  const dted = dtedFactory({
    find,
    onEvent: (ev) => {
      try {
        if (owner && !owner.isDestroyed()) owner.send('dted:event', ev);
      } catch {
        /* window closed */
      }
    },
  });
  const opts = () => {
    const s = getSettings();
    return { limba: s.dtedLanguage || 'ro', termeni: String(s.dtedTerms || '').slice(0, 2000) };
  };
  const take = (e) => {
    owner = e.sender;
  };

  // Where D&TED was found ({found, source}); with check, also starts it and asks its state.
  handle('dted:status', async (e, { check = false } = {}) => {
    const how = find();
    if (!how) return { found: false };
    if (!check) return { found: true, source: how.source };
    take(e);
    await dted.start();
    await dted.status();
    return { found: true, source: how.source, running: dted.running() };
  });
  handle('dted:pickAudio', async (e) => {
    const r = await showOpenDialog(e, { title: 'Fișier audio de transcris', properties: ['openFile'], filters: [{ name: 'Audio', extensions: AUDIO }] });
    return r.canceled ? null : r.filePaths[0];
  });
  handle('dted:transcribe', async (e, file) => {
    if (!file || !AUDIO.includes(path.extname(String(file)).slice(1).toLowerCase())) throw new Error('Alege un fișier audio (MP3, WAV, M4A, OGG, FLAC).');
    take(e);
    return dted.transcribe(file, opts());
  });
  // An audio file attached to the project (media/<file>), from the binder.
  handle('dted:transcribeMedia', async (e, dir, file) => {
    assertOpened(dir);
    if (!/^[A-Za-z0-9-]+\.[a-z0-9]+$/.test(String(file))) throw new Error(`Fișier media invalid: ${file}`);
    take(e);
    return dted.transcribe(path.join(dir, 'media', file), opts());
  });
  handle('dted:dictateStart', async (e) => {
    take(e);
    return dted.dictateStart(opts());
  });
  handle('dted:dictateStop', async (_e, id) => dted.dictateStop(id));
  handle('dted:cancel', async (_e, id) => dted.cancel(id));

  if (app) app.on('will-quit', () => dted.stop());
  return dted;
};
