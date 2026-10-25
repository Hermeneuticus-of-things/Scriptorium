'use strict';

// The speech recogniser built into Scribner (docs/DTED.md §7): whisper.cpp's whisper-server with
// the large-v3-turbo model, downloaded once into <userData>/whisper and run on 127.0.0.1 only.
// Audio arrives as 16 kHz mono 16-bit PCM (decoded in the window); nothing leaves the computer.
// Main process only. The downloader, the process spawner and the HTTP client are injected for tests.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const net = require('net');
const { spawn } = require('child_process');

// The server died or refused the connection mid-request: a message the writer can act on.
function transportError(e) {
  const err = new Error('Motorul de recunoaștere s-a oprit în timpul transcrierii. Încearcă din nou.');
  err.cause = e;
  return err;
}

const WHISPER_VERSION = 'v1.7.6';
const RELEASE = `https://github.com/ggml-org/whisper.cpp/releases/download/${WHISPER_VERSION}`;
// Official release assets and the SHA-256 GitHub publishes for them.
const VARIANTS = {
  cpu: { file: 'whisper-blas-bin-x64.zip', sha256: 'adde1afb6e915ae522fffeef117ca178e2561d39487c164f1a7c3899d41b4a1d', mb: 16 },
  cuda: { file: 'whisper-cublas-12.4.0-bin-x64.zip', sha256: '3fc4d3ebd9a678313de50c04d9e59c43117ae190f0cb7bff602d4aeefc4efe3d', mb: 423 },
};
const MODEL = {
  file: 'ggml-large-v3-turbo-q5_0.bin',
  url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin',
  // ~547 MiB; checked by size range and the ggml file magic (no SHA-256 published next to it).
  minBytes: 500 * 1024 * 1024,
  maxBytes: 650 * 1024 * 1024,
  mb: 574,
};

function sha256File(file) {
  const h = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(1 << 20);
  try {
    let n;
    while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n));
  } finally {
    fs.closeSync(fd);
  }
  return h.digest('hex');
}

// ggml model files start with the magic 0x67676d6c ("ggml", little endian "lmgg").
function isGgml(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const b = Buffer.alloc(4);
    fs.readSync(fd, b, 0, 4, 0);
    return b.readUInt32LE(0) === 0x67676d6c;
  } finally {
    fs.closeSync(fd);
  }
}

function findFile(dir, name) {
  if (!fs.existsSync(dir)) return null;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isFile() && e.name.toLowerCase() === name.toLowerCase()) return p;
    if (e.isDirectory()) {
      const hit = findFile(p, name);
      if (hit) return hit;
    }
  }
  return null;
}

/** A 16 kHz mono 16-bit WAV file around PCM samples (Int16Array or Buffer of int16). */
function wavFromPcm16(pcm, rate = 16000) {
  const data = Buffer.from(pcm.buffer ? Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength) : pcm);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

/**
 * root            <userData>/whisper
 * download(url, file, onBytes)  writes url to file (follows redirects, throws on HTTP errors)
 * request(port, wav, opts)      POSTs a WAV to the server's /inference, returns its JSON
 */
function createWhisperEngine({ root, download, request = postInference, spawnFn = spawn, platform = process.platform, threads } = {}) {
  const SERVER_EXE = platform === 'win32' ? 'whisper-server.exe' : 'whisper-server';
  const modelPath = () => path.join(root, 'models', MODEL.file);
  const binDir = (variant) => path.join(root, `bin-${variant}`);
  let server = null; // { proc, port, ready }
  let installing = null;

  function status() {
    const variants = Object.keys(VARIANTS).filter((v) => findFile(binDir(v), SERVER_EXE));
    const model = fs.existsSync(modelPath());
    return {
      installed: Boolean(model && variants.length),
      variants,
      model,
      supported: platform === 'win32',
      sizes: { cpu: VARIANTS.cpu.mb, cuda: VARIANTS.cuda.mb, model: MODEL.mb },
      running: Boolean(server),
      // A download under way (started by hand or automatically at the first start).
      installing: installing ? { variant: installing.variant, ...(installing.progress || {}) } : null,
    };
  }

  async function install({ variant = 'cpu', onProgress = () => {} } = {}) {
    if (installing) {
      if (installing.variant === variant) return installing.done;
      throw new Error('Se descarcă deja o altă variantă a motorului. Așteaptă să termine.');
    }
    const v = Object.hasOwn(VARIANTS, variant) ? VARIANTS[variant] : null;
    if (!v) throw new Error(`Variantă necunoscută: ${variant}`);
    if (platform !== 'win32') throw new Error('Motorul încorporat se descarcă automat doar pe Windows. Pe alte sisteme folosește D&TED.');
    const report = onProgress;
    onProgress = (p) => {
      if (installing) installing.progress = { mb: p.mb, totalMb: p.totalMb, what: p.what };
      report(p);
    };
    const done = (async () => {
      fs.mkdirSync(path.join(root, 'models'), { recursive: true });
      const total = (findFile(binDir(variant), SERVER_EXE) ? 0 : v.mb) + (fs.existsSync(modelPath()) ? 0 : MODEL.mb);
      let done = 0;
      const step = (what) => (bytes) => onProgress({ what, mb: Math.round((done + bytes / 1048576) * 10) / 10, totalMb: total });
      if (!findFile(binDir(variant), SERVER_EXE)) {
        const zip = path.join(root, `${variant}.zip.part`);
        await download(`${RELEASE}/${v.file}`, zip, step('motor'));
        if (sha256File(zip) !== v.sha256) {
          fs.rmSync(zip, { force: true });
          throw new Error('Motorul descărcat nu corespunde amprentei publicate. L-am șters; încearcă din nou.');
        }
        const JSZip = require('jszip');
        const z = await JSZip.loadAsync(fs.readFileSync(zip));
        const dest = binDir(variant);
        fs.rmSync(dest, { recursive: true, force: true });
        for (const [name, entry] of Object.entries(z.files)) {
          if (entry.dir) continue;
          const out = path.join(dest, ...name.split('/').filter((p) => p && p !== '..'));
          if (!out.startsWith(dest + path.sep)) continue;
          fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.writeFileSync(out, await entry.async('nodebuffer'));
        }
        fs.rmSync(zip, { force: true });
        if (!findFile(dest, SERVER_EXE)) throw new Error(`Arhiva motorului nu conține ${SERVER_EXE}.`);
        done += v.mb;
      }
      if (!fs.existsSync(modelPath())) {
        const part = `${modelPath()}.part`;
        await download(MODEL.url, part, step('model'));
        const size = fs.statSync(part).size;
        if (size < MODEL.minBytes || size > MODEL.maxBytes || !isGgml(part)) {
          fs.rmSync(part, { force: true });
          throw new Error('Modelul descărcat nu e întreg. L-am șters; încearcă din nou.');
        }
        fs.renameSync(part, modelPath());
      }
      onProgress({ what: 'gata', mb: total, totalMb: total });
      // A running server keeps the old variant: the next request starts the new one (NVIDIA).
      await stop();
      return status();
    })();
    installing = { variant, done };
    try {
      return await done;
    } finally {
      installing = null;
    }
  }

  async function remove() {
    await stop();
    fs.rmSync(root, { recursive: true, force: true });
    return status();
  }

  function start() {
    if (server) return server.ready;
    const st = status();
    if (!st.installed) {
      const e = new Error('Motorul de recunoaștere a vorbirii nu e descărcat încă. Setări → Servicii și conturi → Dictare și transcriere.');
      e.code = 'WHISPER_MISSING';
      return Promise.reject(e);
    }
    // Claimed before any await: two requests at once share one server instead of starting two.
    const s = { proc: null, port: 0 };
    server = s;
    s.ready = launch(s, st).catch((e) => {
      if (server === s) server = null;
      try {
        s.proc?.kill();
      } catch {
        /* already gone */
      }
      throw e;
    });
    return s.ready;
  }

  async function launch(s, st) {
    const variant = st.variants.includes('cuda') ? 'cuda' : st.variants[0];
    const exe = findFile(binDir(variant), SERVER_EXE);
    const port = await freePort();
    if (server !== s) throw new Error('Motorul a fost oprit.');
    const args = ['-m', modelPath(), '--host', '127.0.0.1', '--port', String(port), '-l', 'ro', '-t', String(threads || Math.max(2, Math.min(8, require('os').cpus().length - 1)))];
    const proc = spawnFn(exe, args, { cwd: path.dirname(exe), windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    s.proc = proc;
    s.port = port;
    let log = '';
    let dead = false;
    proc.stderr?.on('data', (d) => {
      log = (log + d).slice(-3000);
    });
    // A crash ends this server; the next request starts a new one.
    const gone = () => {
      dead = true;
      if (server === s) server = null;
    };
    proc.on('exit', gone);
    proc.on('error', gone);
    const deadline = Date.now() + 120000; // loading the model can take a while on a slow disk
    for (;;) {
      if (dead || server !== s) throw new Error(`Motorul s-a oprit la pornire. ${log.split('\n').filter(Boolean).pop() || ''}`.trim());
      try {
        await request(port, null, { probe: true });
        return s;
      } catch {
        if (Date.now() > deadline) throw new Error(`Motorul nu a pornit. ${log.split('\n').filter(Boolean).pop() || ''}`.trim());
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  }

  /** Text of 16 kHz mono 16-bit PCM: { text, segmente: [{start, end, text}] }. */
  // `format`: 'json' (text only: dictation) or 'verbose_json' (with timed segments: files; in
  // whisper.cpp 1.7.6 it also runs a language detection pass, so it is slower).
  async function transcribePcm(pcm, { language = 'ro', prompt = '', format = 'verbose_json' } = {}) {
    const s = await start();
    if (!pcm.length) return { text: '', segmente: [] }; // only starts the engine
    const r = await request(s.port, wavFromPcm16(pcm), { language, prompt, format });
    if (r && r.error) throw new Error(`Motorul nu a putut transcrie: ${r.error}`);
    const segs = (r.segments || []).map((x) => ({ start: Number(x.start) || 0, end: Number(x.end) || 0, text: String(x.text || '').trim() })).filter((x) => x.text);
    return { text: String(r.text || segs.map((x) => x.text).join(' ')).replace(/\s+/g, ' ').trim(), segmente: segs };
  }

  function stop() {
    const s = server;
    server = null;
    if (!s) return Promise.resolve();
    return new Promise((resolve) => {
      if (!s.proc) return resolve(); // still starting: launch() sees server !== s and gives up
      const t = setTimeout(resolve, 3000);
      s.proc.once?.('exit', () => {
        clearTimeout(t);
        resolve();
      });
      try {
        s.proc.kill();
      } catch {
        clearTimeout(t);
        resolve();
      }
    });
  }

  return { status, install, remove, start, stop, transcribePcm, paths: { root, model: modelPath } };
}

// whisper-server's /inference endpoint (multipart form), over node:http: no client timeout (a long
// piece on a slow processor can take minutes; fetch gives up after 300 s). `probe` only checks it
// answers. `prompt` and `language` are always sent: the 1.7.6 server keeps the previous request's
// values otherwise.
function postInference(port, wav, { probe = false, language = 'ro', prompt = '', format = 'verbose_json' } = {}) {
  const http = require('http');
  return new Promise((resolve, reject) => {
    if (probe) {
      const req = http.get({ host: '127.0.0.1', port, path: '/', timeout: 2000 }, (res) => {
        res.resume();
        if (res.statusCode >= 200 && res.statusCode < 500) resolve({});
        else reject(new Error(`HTTP ${res.statusCode}`));
      });
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', reject);
      return;
    }
    const boundary = `----scribner${crypto.randomBytes(12).toString('hex')}`;
    const field = (name, value) => Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`),
      wav,
      Buffer.from('\r\n'),
      field('response_format', format),
      field('language', language),
      field('temperature', '0.0'),
      field('prompt', String(prompt || '').replace(/[\r\n]+/g, ' ')),
      Buffer.from(`--${boundary}--\r\n`),
    ]);
    const req = http.request(
      { host: '127.0.0.1', port, path: '/inference', method: 'POST', headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode !== 200) return reject(new Error(`Motorul a răspuns cu eroare (${res.statusCode}).`));
          try {
            resolve(JSON.parse(text));
          } catch {
            reject(new Error('Motorul a dat un răspuns de neînțeles.'));
          }
        });
        res.on('error', (e) => reject(transportError(e)));
      },
    );
    req.on('error', (e) => reject(transportError(e)));
    req.end(body);
  });
}

module.exports = { createWhisperEngine, wavFromPcm16, postInference, VARIANTS, MODEL, WHISPER_VERSION, isGgml };
