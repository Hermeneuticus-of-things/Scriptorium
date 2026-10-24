// The speech recogniser built into Scribner (docs/DTED.md §7): download and checks, the local
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
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'scribner-whisper-'));
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
