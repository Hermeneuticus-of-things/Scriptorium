// The speech recogniser built into Pneuma Sofer (docs/DTED.md §7): download and checks, the local
// server process, PCM requests; and the window side: resampling, cutting at pauses, filtering.
import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { RATE, concatPcm, cutPoint, filePieces, rms, toPcm16, usefulText } from '../src/lib/localSpeech.js';
const require = createRequire(import.meta.url);
const { createWhisperEngine, wavFromPcm16, VARIANTS, MODEL } = require('../lib/whisperEngine.cjs');
const JSZip = require('jszip');

const tmp = [];
const engines = [];
afterEach(async () => {
  for (const e of engines.splice(0)) await e.stop();
  for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});
const tempDir = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pneuma-whisper-'));
  tmp.push(d);
  return d;
};
const SERVER = 'whisper-server.exe';
const fakeServerSpawn = (exe, args, o) => require('child_process').spawn(process.execPath, [path.resolve('tests/fixtures/fake-whisper-server.cjs'), ...args], o);

// An installed engine without downloading: the binary folder and a model file.
function installedRoot() {
  const root = tempDir();
  fs.mkdirSync(path.join(root, 'bin-cpu', 'Release'), { recursive: true });
  fs.writeFileSync(path.join(root, 'bin-cpu', 'Release', SERVER), '');
  fs.mkdirSync(path.join(root, 'models'));
  fs.writeFileSync(path.join(root, 'models', MODEL.file), 'lmgg');
  return root;
}

describe('built-in engine (main process)', () => {
  it('installs: verifies the zip fingerprint, unpacks, checks the model; refuses tampered files', async () => {
    const root = tempDir();
    const zip = new JSZip();
    zip.file('Release/whisper-server.exe', 'exe');
    zip.file('Release/whisper.dll', 'dll');
    zip.file('../evil.txt', 'x');
    const zipBytes = await zip.generateAsync({ type: 'nodebuffer' });
    // A small model: the size limits are lowered for the test (writing 500 MB is slow on CI disks).
    const savedModel = { minBytes: MODEL.minBytes, maxBytes: MODEL.maxBytes };
    Object.assign(MODEL, { minBytes: 1000, maxBytes: 100000 });
    const model = Buffer.alloc(2000);
    model.writeUInt32LE(0x67676d6c, 0);
    const saved = { ...VARIANTS.cpu };
    VARIANTS.cpu.sha256 = crypto.createHash('sha256').update(zipBytes).digest('hex');
    const got = [];
    const download = async (url, file, onBytes) => {
      got.push(url);
      fs.writeFileSync(file, url.endsWith('.zip') ? zipBytes : model);
      onBytes(1048576);
    };
    try {
      const prog = [];
      const e = createWhisperEngine({ root, download, platform: 'win32' });
      expect(e.status().installed).toBe(false);
      const st = await e.install({ onProgress: (p) => prog.push(p) });
      expect(st.installed).toBe(true);
      expect(got[0]).toMatch(/releases\/download\/v1\.7\.6\/whisper-blas-bin-x64\.zip$/);
      expect(got[1]).toMatch(/ggml-large-v3-turbo-q5_0\.bin$/);
      expect(fs.existsSync(path.join(root, 'evil.txt'))).toBe(false);
      expect(prog.at(-1).what).toBe('gata');
      // a second install downloads nothing
      await e.install();
      expect(got).toHaveLength(2);
      // tampered zip / truncated model are deleted, never used
      const root2 = tempDir();
      VARIANTS.cpu.sha256 = '0'.repeat(64);
      await expect(createWhisperEngine({ root: root2, download, platform: 'win32' }).install()).rejects.toThrow(/amprentei/);
      expect(fs.readdirSync(root2).some((f) => f.endsWith('.part'))).toBe(false);
      VARIANTS.cpu.sha256 = crypto.createHash('sha256').update(zipBytes).digest('hex');
      const small = async (url, file) => fs.writeFileSync(file, url.endsWith('.zip') ? zipBytes : Buffer.from('lmgg'));
      await expect(createWhisperEngine({ root: tempDir(), download: small, platform: 'win32' }).install()).rejects.toThrow(/nu e întreg/);
    } finally {
      Object.assign(VARIANTS.cpu, saved);
      Object.assign(MODEL, savedModel);
    }
  }, 30000);
  it('other systems: no automatic download; removal deletes everything', async () => {
    const e = createWhisperEngine({ root: tempDir(), download: async () => {}, platform: 'linux' });
    expect(e.status().supported).toBe(false);
    await expect(e.install()).rejects.toThrow(/doar pe Windows/);
    const root = installedRoot();
    const e2 = createWhisperEngine({ root, platform: 'win32' });
    expect(e2.status().installed).toBe(true);
    await e2.remove();
    expect(fs.existsSync(root)).toBe(false);
  });
  it('runs the local server once and sends PCM as WAV; refuses when not installed', async () => {
    const e = createWhisperEngine({ root: installedRoot(), platform: 'win32', spawnFn: fakeServerSpawn, threads: 2 });
    engines.push(e);
    const two = new Int16Array(2 * 16000);
    const r = await e.transcribePcm(two);
    expect(r.text).toBe('Am auzit 2 secunde.');
    expect(r.segmente).toEqual([{ start: 0, end: 2, text: 'Am auzit 2 secunde.' }]);
    expect((await e.transcribePcm(new Int16Array(16000))).text).toBe('Am auzit 1 secunde.');
    expect(await e.transcribePcm(new Int16Array(0))).toEqual({ text: '', segmente: [] });
    expect(e.status().running).toBe(true);
    await e.stop();
    expect(e.status().running).toBe(false);
    const none = createWhisperEngine({ root: tempDir(), platform: 'win32' });
    await expect(none.transcribePcm(two)).rejects.toMatchObject({ code: 'WHISPER_MISSING' });
  }, 20000);
  it('WAV header is a 16 kHz mono 16-bit file', () => {
    const w = wavFromPcm16(new Int16Array([1, -1, 300]));
    expect(w.toString('ascii', 0, 4)).toBe('RIFF');
    expect(w.readUInt32LE(24)).toBe(16000);
    expect(w.readUInt16LE(22)).toBe(1);
    expect(w.readUInt32LE(40)).toBe(6);
    expect(w.readInt16LE(44 + 4)).toBe(300);
  });
});

describe('window side: audio and pieces', () => {
  const tone = (sec, amp = 0.3, rate = RATE) => Float32Array.from({ length: sec * rate }, (_, i) => amp * Math.sin(i / 5));
  it('resamples 48 kHz to 16 kHz and clips', () => {
    expect(toPcm16(tone(1, 0.3, 48000), 48000).length).toBe(16000);
    expect(Array.from(toPcm16(Float32Array.from([2, -2]), RATE))).toEqual([32767, -32768]);
  });
  it('cuts dictation at the quietest moment between 3 and 6 s', () => {
    const loud = toPcm16(tone(6), RATE);
    loud.fill(0, Math.round(4.2 * RATE), Math.round(4.5 * RATE));
    const at = cutPoint(loud) / RATE;
    expect(at).toBeGreaterThan(4.1);
    expect(at).toBeLessThan(4.6);
  });
  it('long files go in pieces of at most two minutes, nothing lost', () => {
    const pcm = toPcm16(tone(300, 0.2), RATE);
    const parts = filePieces(pcm);
    expect(parts.length).toBe(3);
    expect(parts.every((p) => p.pcm.length <= 120 * RATE)).toBe(true);
    expect(concatPcm(parts.map((p) => p.pcm)).length).toBe(pcm.length);
    expect(parts[1].start).toBeCloseTo(parts[0].pcm.length / RATE, 5);
  });
  it('silence and credit lines the recogniser invents are never inserted', () => {
    expect(rms(new Int16Array(100))).toBe(0);
    expect(usefulText(' Mulțumesc pentru vizionare! ')).toBe('');
    expect(usefulText('[muzică]')).toBe('');
    expect(usefulText('...')).toBe('');
    expect(usefulText(' Ceața se ridica  (râsete) încet. ')).toBe('Ceața se ridica încet.');
  });
});

describe('bug hunt fixes (v0.9.1)', () => {
  it('two requests at once start one server; the prompt is always sent; a server error is an error', async () => {
    const spawned = [];
    const seen = [];
    const request = async (port, wav, opts) => {
      if (opts.probe) return {};
      seen.push(opts);
      return seen.length === 3 ? { error: 'failed to read WAV file' } : { text: 'ok', segments: [] };
    };
    const e = createWhisperEngine({ root: installedRoot(), platform: 'win32', request, spawnFn: (...a) => { spawned.push(a); return { on() {}, once() {}, kill() {}, stderr: null }; } });
    await Promise.all([e.transcribePcm(new Int16Array(10)), e.transcribePcm(new Int16Array(10), { format: 'json' })]);
    expect(spawned).toHaveLength(1);
    expect(seen.map((o) => [o.prompt, o.format])).toEqual([['', 'verbose_json'], ['', 'json']]);
    await expect(e.transcribePcm(new Int16Array(10))).rejects.toThrow(/failed to read WAV/);
  });
  it('a crashed server is started again on the next request', async () => {
    const procs = [];
    const spawnFn = () => {
      const handlers = {};
      const p = { on: (ev, f) => (handlers[ev] = f), once() {}, kill() {}, stderr: null, die: () => handlers.exit?.() };
      procs.push(p);
      return p;
    };
    const e = createWhisperEngine({ root: installedRoot(), platform: 'win32', spawnFn, request: async () => ({ text: 'x', segments: [] }) });
    await e.transcribePcm(new Int16Array(4));
    procs[0].die();
    expect(e.status().running).toBe(false);
    await e.transcribePcm(new Int16Array(4));
    expect(procs).toHaveLength(2);
  });
  it('the real HTTP client talks multipart to the server (fake whisper-server)', async () => {
    const e = createWhisperEngine({ root: installedRoot(), platform: 'win32', spawnFn: fakeServerSpawn, threads: 1 });
    engines.push(e);
    const r = await e.transcribePcm(new Int16Array(3 * 16000), { prompt: 'Ilinca\nApuseni', format: 'json' });
    expect(r.text).toBe('Am auzit 3 secunde.');
  }, 20000);
});

describe('window side: stop and cancel while starting', () => {
  const fakeApi = () => ({ whisperStatus: () => new Promise((r) => setTimeout(() => r({ installed: true }), 30)), whisperTranscribePcm: async () => ({ text: '' }) });
  const tracks = [];
  const media = { getUserMedia: async () => ({ getTracks: () => [{ stop: () => tracks.push('stop') }] }) };
  it('cancel before the microphone is open: nothing records, F9 works again', async () => {
    const { createLocalSpeech } = await import('../src/lib/localSpeech.js');
    const sp = createLocalSpeech(fakeApi(), { media });
    const evs = [];
    sp.onDtedEvent((e) => evs.push(e.ev));
    const started = sp.dtedDictateStart('d1');
    await sp.dtedCancel('d1');
    await started;
    expect(evs).toEqual(['anulat']);
    // free again
    const again = sp.dtedDictateStart('d2');
    await sp.dtedDictateStop('d2');
    await again;
    expect(evs).toEqual(['anulat', 'dictare_oprita']);
  });
  it('cancelling an unknown or finished job leaves nothing behind', async () => {
    const { createLocalSpeech } = await import('../src/lib/localSpeech.js');
    const sp = createLocalSpeech(fakeApi(), { media });
    await sp.dtedCancel('t-gone');
    expect(sp.dispose()).toBe(undefined);
  });
});
