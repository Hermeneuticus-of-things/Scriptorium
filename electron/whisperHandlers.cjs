'use strict';
// Built-in speech recognition IPC (lib/whisperEngine.cjs, docs/DTED.md §7). Registered from main.cjs:
//   require('./whisperHandlers.cjs')({ handle, app, net, assertOpened, store, pickedAudio });
// Downloads go through Electron's network stack (system proxy, certificates); progress goes to
// the window that asked ('whisper:progress').
const fs = require('fs');
const path = require('path');
const { createWhisperEngine } = require('../lib/whisperEngine.cjs');
const { createTtsEngine } = require('../lib/ttsEngine.cjs');

// Compressed audio, read whole into the window and decoded there: ~2–3 hours of MP3.
const MAX_AUDIO = 150 * 1024 * 1024;

module.exports = function register({ handle, app, net, assertOpened, store, pickedAudio, engineFactory = createWhisperEngine, allWindows = () => require('electron').BrowserWindow.getAllWindows(), getSettings = () => ({}), dtedFound = () => false }) {
  // Streams url to file. A write error (disk full) rejects instead of crashing the main process;
  // a failed download leaves no partial file behind.
  async function download(url, file, onBytes) {
    const res = await net.fetch(url);
    if (!res.ok) throw new Error(`Descărcarea a eșuat (${res.status}). Verifică internetul și încearcă din nou.`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const out = fs.createWriteStream(file);
    let failed = null;
    const failure = new Promise((_, reject) => out.on('error', (e) => {
      failed = e;
      reject(e);
    }));
    failure.catch(() => {});
    let bytes = 0;
    let last = 0;
    try {
      for await (const chunk of res.body) {
        if (failed) throw failed;
        bytes += chunk.length;
        if (!out.write(chunk)) await Promise.race([new Promise((r) => out.once('drain', r)), failure]);
        if (bytes - last > 4 * 1048576) {
          last = bytes;
          onBytes(bytes);
        }
      }
      await Promise.race([new Promise((r) => out.end(r)), failure]);
      if (failed) throw failed;
    } catch (e) {
      out.destroy();
      fs.rmSync(file, { force: true });
      throw e.code === 'ENOSPC' ? new Error('Nu e destul loc pe disc pentru motor (în jur de 1 GB).') : e;
    }
    onBytes(bytes);
  }

  const engine = engineFactory({ root: path.join(app.getPath('userData'), 'whisper'), download });

  // Progress goes to every window: a download started at start-up shows wherever the writer looks.
  const broadcast = (p) => {
    for (const w of allWindows()) {
      try {
        if (!w.isDestroyed()) w.webContents.send('whisper:progress', p);
      } catch {
        /* window closed */
      }
    }
  };
  handle('whisper:status', () => engine.status());
  handle('whisper:install', (_e, variant) => engine.install({ variant, onProgress: broadcast }));
  // Ready without a visit to Settings: on Windows, when neither the built-in engine nor D&TED is
  // there, the engine downloads once in the background (kept in <userData>/whisper across
  // updates). Settings → speechAutoInstall: false turns this off.
  // Reading aloud (Piper + a Romanian voice, <userData>/tts), installed the same way.
  const tts = createTtsEngine({ root: path.join(app.getPath('userData'), 'tts'), download });
  const ttsProgress = (p) => broadcast({ ...p, tts: true });
  handle('tts:status', () => tts.status());
  handle('tts:install', () => tts.install({ onProgress: ttsProgress }));
  handle('tts:synth', (_e, text, opts) => tts.synth(text, opts || {}));
  engine.autoInstall = () => {
    if (getSettings().speechAutoInstall === false) return null;
    try {
      const ts = tts.status();
      if (ts.supported && !ts.installed && !ts.installing) tts.install({ onProgress: ttsProgress }).catch(() => null);
    } catch {
      /* retried at the next start */
    }
    try {
      const st = engine.status();
      if (!st.supported || st.installed || st.installing || dtedFound()) return null;
      return engine.install({ variant: 'cpu', onProgress: broadcast }).catch(() => null); // retried at the next start
    } catch {
      return null;
    }
  };
  handle('whisper:remove', () => engine.remove());
  // 16 kHz mono 16-bit PCM (an ArrayBuffer / Uint8Array from the window) -> { text, segmente }.
  handle('whisper:transcribePcm', (_e, pcm, opts) => {
    const buf = Buffer.from(pcm instanceof ArrayBuffer ? new Uint8Array(pcm) : pcm);
    if (buf.length % 2) throw new Error('Sunet invalid.');
    return engine.transcribePcm(new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2), opts || {});
  });
  // The bytes of an audio file chosen in the D&TED / audio dialog (only that file), or of an audio
  // file attached to the open project, for decoding in the window.
  handle('whisper:readAudio', (_e, file) => {
    if (!pickedAudio.has(String(file))) throw new Error('Fișierul nu a fost ales din dialog.');
    if (fs.statSync(file).size > MAX_AUDIO) throw new Error('Fișierul audio e prea mare (peste 150 MB). Împarte-l în bucăți de cel mult două ore.');
    return fs.readFileSync(file);
  });
  handle('whisper:readMedia', (_e, dir, file) => {
    assertOpened(dir);
    const { data } = store.readMedia(dir, file);
    if (data.length > MAX_AUDIO) throw new Error('Fișierul audio e prea mare (peste 150 MB). Împarte-l în bucăți de cel mult două ore.');
    return data;
  });
  if (app) app.on('will-quit', () => engine.stop());
  return engine;
};
