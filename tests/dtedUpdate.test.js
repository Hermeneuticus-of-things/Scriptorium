// Actualizările D&TED (docs/DTED.md §8): alegerea pachetului, verificarea versiunii și a SHA-256,
// despachetarea fără căi care ies din folder, handshake-ul protocol 1 și fallback-ul la instalația veche.
import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  pickZipAsset,
  checkLatestDted,
  findExe,
  extractZip,
  verifyService,
  installDted,
  DTED_LATEST_URL,
} from '../lib/dtedUpdate.cjs';

const require = createRequire(import.meta.url);
const crypto = require('crypto');
const JSZip = require('jszip');
const { spawn } = require('child_process');

const FAKE = path.resolve('tests/fixtures/fake-dted.cjs');
const tempDirs = [];
afterEach(() => {
  for (const d of tempDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});
const tempDir = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pneuma-dted-upd-'));
  tempDirs.push(d);
  return d;
};

// Un fetch fals care servește `bytes` (răspuns cu json() și arrayBuffer(), ca un real).
const fakeFetch = (bytes, calls = []) => async (url) => {
  calls.push(String(url));
  return {
    ok: true,
    status: 200,
    headers: { get: () => String(bytes.length || 0) },
    json: async () => JSON.parse(Buffer.from(bytes).toString('utf8')),
    arrayBuffer: async () => bytes,
  };
};
const releaseJson = (assets, body = '') => Buffer.from(JSON.stringify({ tag_name: 'v1.2.0', html_url: 'https://github.com/x', assets, body }));

const fakeDtedFind = (env = {}) => () => ({
  command: process.execPath,
  args: [FAKE],
  cwd: process.cwd(),
  source: 'fals',
  env,
});
const spawnFake = (env = {}) => (cmd, args, o) => spawn(cmd, args, { ...o, env: { ...o.env, ...env } });

describe('pickZipAsset', () => {
  it('preferă pachetul pentru Windows, altfel singurul zip', () => {
    const a = { name: 'dted-source.zip' };
    const win = { name: 'dted-win-portabil.zip' };
    expect(pickZipAsset([a, win])).toBe(win);
    expect(pickZipAsset([{ name: 'dted.exe' }, a])).toBe(a);
    expect(pickZipAsset([{ name: 'dted.exe' }])).toBe(null);
    expect(pickZipAsset(null)).toBe(null);
  });
});

describe('checkLatestDted', () => {
  it('compară versiunile și alege pachetul zip', async () => {
    const calls = [];
    const zip = { name: 'dted-win.zip', size: 10, browser_download_url: 'https://github.com/x/z.zip', url: 'https://api.github.com/x/z' };
    const fetchImpl = fakeFetch(releaseJson([zip], 'notes here'), calls);
    const info = await checkLatestDted({ fetchImpl, currentVersion: '1.0.0' });
    expect(calls[0]).toBe(DTED_LATEST_URL);
    expect(info.latest).toBe('1.2.0');
    expect(info.newer).toBe(true);
    expect(info.asset.name).toBe('dted-win.zip');
    expect(info.sha256).toBe('');
    // la zi sau mai vechi
    const same = await checkLatestDted({ fetchImpl, currentVersion: '1.2.0' });
    const old = await checkLatestDted({ fetchImpl, currentVersion: '2.0.0' });
    expect(same.newer).toBe(false);
    expect(old.newer).toBe(false);
  });

  it('ia SHA-256 din digest, din SHA256SUMS sau din corpul release-ului', async () => {
    const hex = 'a'.repeat(64);
    const zip = { name: 'dted-win.zip', browser_download_url: 'https://github.com/x/z.zip', url: 'https://api.github.com/x/z' };
    expect((await checkLatestDted({ fetchImpl: fakeFetch(releaseJson([{ ...zip, digest: `sha256:${hex}` }])) })).sha256).toBe(hex);
    const sums = { name: 'SHA256SUMS.txt', browser_download_url: 'https://github.com/x/s.txt', url: 'https://api.github.com/x/s' };
    expect((await checkLatestDted({ fetchImpl: fakeFetch(releaseJson([zip, sums], '')) })).sha256).toBe('');
    // SHA256SUMS e descărcat doar la nevoie; corpul release-ului e ultima sursă (format sha256sum)
    const fromBody = await checkLatestDted({ fetchImpl: fakeFetch(releaseJson([zip], `${hex}  dted-win.zip`)) });
    expect(fromBody.sha256).toBe(hex);
  });

  it('fără pachet zip → asset null; adresă nepermisă → respinge', async () => {
    const none = await checkLatestDted({ fetchImpl: fakeFetch(releaseJson([{ name: 'dted.exe' }])) });
    expect(none.asset).toBe(null);
    await expect(checkLatestDted({ fetchImpl: fakeFetch(releaseJson([])), url: 'http://exemplu.test/rel.json' })).rejects.toThrow(/nepermisă/i);
  });
});

describe('findExe și extractZip', () => {
  it('găsește DTED.exe direct sau în subfoldere', () => {
    const d = tempDir();
    fs.mkdirSync(path.join(d, 'a', 'b'), { recursive: true });
    expect(findExe(d)).toBe(null);
    fs.writeFileSync(path.join(d, 'a', 'b', 'DTED.exe'), 'x');
    expect(findExe(d)).toBe(path.join(d, 'a', 'b', 'DTED.exe'));
    fs.writeFileSync(path.join(d, 'DTED.exe'), 'x');
    expect(findExe(d)).toBe(path.join(d, 'DTED.exe'));
  });

  it('despachetează arhiva fără căi care ies din folder', async () => {
    const d = tempDir();
    const z = new JSZip();
    z.file('ok/pachet/DTED.exe', 'conținut');
    z.file('../evadat.txt', 'nu');
    const zipFile = path.join(d, 'p.zip');
    fs.writeFileSync(zipFile, await z.generateAsync({ type: 'nodebuffer' }));
    const stage = path.join(d, 'stage');
    await extractZip(zipFile, stage);
    expect(fs.readFileSync(path.join(stage, 'ok', 'pachet', 'DTED.exe'), 'utf8')).toBe('conținut');
    // segmentele „..” se taie: nimic nu iese din folderul destinație (ca la motorul încorporat)
    expect(fs.existsSync(path.join(d, 'evadat.txt'))).toBe(false);
  });
});

describe('verifyService (handshake protocol 1)', () => {
  it('pornește un D&TED care vorbește protocolul', async () => {
    const r = await verifyService('oriunde', { spawnFn: spawnFake(), find: fakeDtedFind() });
    expect(r.exePath).toBe(process.execPath);
  });

  it('respinge un D&TED cu alt protocol și un folder fără DTED.exe', async () => {
    await expect(verifyService('oriunde', { spawnFn: spawnFake({ FAKE_DTED_PROTOCOL: '9' }), find: fakeDtedFind() })).rejects.toThrow(/protocol/);
    const empty = tempDir();
    await expect(verifyService(empty)).rejects.toThrow(/DTED\.exe/);
  });
});

describe('installDted (descărcare, handshake, folder cu versiune)', () => {
  const zipWithExe = async () => {
    const z = new JSZip();
    z.file('D&TED/DTED.exe', 'stub');
    return z.generateAsync({ type: 'nodebuffer' });
  };
  const infoFor = async (bytes, sha) => ({
    latest: '1.2.0',
    sha256: sha || crypto.createHash('sha256').update(bytes).digest('hex'),
    asset: { name: 'dted-win.zip', size: bytes.length, url: 'https://github.com/x/z.zip', apiUrl: 'https://api.github.com/x/z' },
  });

  it('instalează în baseDir după handshake reușit', async () => {
    const bytes = await zipWithExe();
    const base = tempDir();
    const r = await installDted({ fetchImpl: fakeFetch(bytes), info: await infoFor(bytes), baseDir: base, spawnFn: spawnFake(), find: fakeDtedFind() });
    expect(r.version).toBe('1.2.0');
    expect(fs.existsSync(path.join(base, 'D&TED – Dictare și transcriere în limba română (1.2.0)'))).toBe(true);
    expect(fs.existsSync(r.exePath)).toBe(true);
  });

  it('fallback: handshake pică → nimic instalat, eroare cu cod', async () => {
    const bytes = await zipWithExe();
    const base = tempDir();
    await expect(
      installDted({ fetchImpl: fakeFetch(bytes), info: await infoFor(bytes), baseDir: base, spawnFn: spawnFake({ FAKE_DTED_PROTOCOL: '9' }), find: fakeDtedFind() }),
    ).rejects.toThrow(/protocol/);
    expect(fs.readdirSync(base).length).toBe(0);
  });

  it('amprentă SHA-256 greșită → respinge fără să instaleze', async () => {
    const bytes = await zipWithExe();
    const base = tempDir();
    await expect(
      installDted({ fetchImpl: fakeFetch(bytes), info: await infoFor(bytes, 'b'.repeat(64)), baseDir: base, spawnFn: spawnFake(), find: fakeDtedFind() }),
    ).rejects.toThrow(/amprenta/i);
    expect(fs.readdirSync(base).length).toBe(0);
  });
});
