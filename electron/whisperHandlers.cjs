'use strict';
// Built-in speech recognition IPC (lib/whisperEngine.cjs, docs/DTED.md §7). Registered from main.cjs:
//   require('./whisperHandlers.cjs')({ handle, app, net, assertOpened, store, pickedAudio });
// Downloads go through Electron's network stack (system proxy, certificates); progress goes to
// the window that asked ('whisper:progress').
const fs = require('fs');
const path = require('path');
const { createWhisperEngine } = require('../lib/whisperEngine.cjs');

const MAX_AUDIO = 600 * 1024 * 1024;

module.exports = function register({ handle, app, net, assertOpened, store, pickedAudio, engineFactory = createWhisperEngine }) {
  async function download(url, file, onBytes) {
    const res = await net.fetch(url);
    if (!res.ok) throw new Error(`Descărcarea a eșuat (${res.status}). Verifică internetul și încearcă din nou.`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const out = fs.createWriteStream(file);
    let bytes = 0;
    let last = 0;
    try {
      for await (const chunk of res.body) {
        bytes += chunk.length;
        if (!out.write(chunk)) await new Promise((r) => out.once('drain', r));
        if (bytes - last > 4 * 1048576) {
          last = bytes;
          onBytes(bytes);
        }
      }
    } finally {
      await new Promise((r) => out.end(r));
    }
    onBytes(bytes);
  }

  const engine = engineFactory({ root: path.join(app.getPath('userData'), 'whisper'), download });

  handle('whisper:status', () => engine.status());
  handle('whisper:install', (e, variant) =>
    engine.install({
      variant,
      onProgress: (p) => {
        try {
          if (!e.sender.isDestroyed()) e.sender.send('whisper:progress', p);
        } catch {
          /* window closed */
        }
      },
    }),
  );
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
    if (fs.statSync(file).size > MAX_AUDIO) throw new Error('Fișierul audio e prea mare (peste 600 MB). Împarte-l în bucăți.');
    return fs.readFileSync(file);
  });
  handle('whisper:readMedia', (_e, dir, file) => {
    assertOpened(dir);
    return store.readMedia(dir, file).data;
  });
  if (app) app.on('will-quit', () => engine.stop());
  return engine;
};
