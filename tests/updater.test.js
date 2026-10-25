import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const u = require('../lib/updater.cjs');

const res = (status, { json, text, body, headers = {} } = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  json: async () => json,
  text: async () => text ?? '',
  arrayBuffer: async () => body,
});

const release = (over = {}) => ({
  tag_name: 'v1.2.0',
  body: 'Noutăți',
  html_url: 'https://github.com/Hermeneuticus-of-things/Scriptorium/releases/tag/v1.2.0',
  assets: [
    { name: 'Scribner-Setup-1.2.0.exe', size: 5, browser_download_url: 'https://github.com/x/setup.exe', url: 'https://api.github.com/a/1' },
    { name: 'Scribner-1.2.0-portabil.exe', size: 5, browser_download_url: 'https://github.com/x/port.exe', url: 'https://api.github.com/a/2' },
  ],
  ...over,
});

describe('compareSemver', () => {
  it('orders versions', () => {
    expect(u.compareSemver('1.2.0', '1.1.9')).toBe(1);
    expect(u.compareSemver('v0.9.9', '0.10.0')).toBe(-1);
    expect(u.compareSemver('1.0.0', 'v1.0.0')).toBe(0);
    expect(u.compareSemver('1.0.0-beta.1', '1.0.0')).toBe(-1);
    expect(u.compareSemver('1.0.0-beta.2', '1.0.0-beta.10')).toBe(-1);
    expect(u.compareSemver('1.0.0-alpha', '1.0.0-beta')).toBe(-1);
    expect(u.compareSemver('garbage', '1.0.0')).toBe(0);
  });
});

describe('pickAsset / isPortable', () => {
  it('chooses Setup for installed builds and the portable exe otherwise', () => {
    expect(u.pickAsset(release().assets).name).toBe('Scribner-Setup-1.2.0.exe');
    expect(u.pickAsset(release().assets, { portable: true }).name).toBe('Scribner-1.2.0-portabil.exe');
    expect(u.pickAsset([{ name: 'SHA256SUMS' }])).toBe(null);
    expect(u.pickAsset(undefined)).toBe(null);
  });
  it('detects the portable launcher', () => {
    expect(u.isPortable({ PORTABLE_EXECUTABLE_DIR: 'C:\\x' })).toBe(true);
    expect(u.isPortable({})).toBe(false);
  });
});

describe('isAllowedUrl', () => {
  it('only https GitHub hosts', () => {
    expect(u.isAllowedUrl('https://api.github.com/repos/x')).toBe(true);
    expect(u.isAllowedUrl('https://objects.githubusercontent.com/f')).toBe(true);
    expect(u.isAllowedUrl('http://github.com/x')).toBe(false);
    expect(u.isAllowedUrl('https://github.com.evil.example/x')).toBe(false);
    expect(u.isAllowedUrl('https://user:pw@github.com/x')).toBe(false);
    expect(u.isAllowedUrl('not a url')).toBe(false);
  });
  it('refuses a redirect to another host', async () => {
    const f = vi.fn(async () => res(302, { headers: { location: 'https://evil.example/x.exe' } }));
    await expect(u.safeFetch(f, 'https://github.com/x')).rejects.toThrow(/nepermis/);
  });
  it('sends the token only to api.github.com', async () => {
    const seen = [];
    const f = async (url, opts) => {
      seen.push([url, opts.headers.Authorization]);
      return url.includes('api.github') ? res(302, { headers: { location: 'https://objects.githubusercontent.com/f' } }) : res(200);
    };
    await u.safeFetch(f, 'https://api.github.com/a/1', { token: 'T' });
    expect(seen).toEqual([['https://api.github.com/a/1', 'Bearer T'], ['https://objects.githubusercontent.com/f', undefined]]);
  });
});

describe('checksums', () => {
  const h = 'a'.repeat(64);
  it('parses SHA256SUMS lines', () => {
    expect(u.parseSha256Sums(`${h}  Scribner-Setup-1.2.0.exe\n${'b'.repeat(64)} *other.exe`, 'Scribner-Setup-1.2.0.exe')).toBe(h);
    expect(u.parseSha256Sums(`${'B'.repeat(64)} *other.exe`, 'other.exe')).toBe('b'.repeat(64));
    expect(u.parseSha256Sums('nimic', 'x.exe')).toBe('');
  });
  it('prefers the GitHub digest, then SHA256SUMS, then the release notes', () => {
    const asset = { name: 'a.exe', digest: `sha256:${'c'.repeat(64)}` };
    expect(u.expectedSha256({ asset, sumsText: `${h}  a.exe` })).toBe('c'.repeat(64));
    expect(u.expectedSha256({ asset: { name: 'a.exe' }, sumsText: `${h}  a.exe` })).toBe(h);
    expect(u.expectedSha256({ asset: { name: 'a.exe' }, body: `Sume:\n${h}  a.exe` })).toBe(h);
  });
});

describe('checkLatest + ETag', () => {
  it('reports a newer version, fetches SHA256SUMS and reuses the release on 304', async () => {
    const sum = 'd'.repeat(64);
    const rel = release({ assets: [...release().assets, { name: 'SHA256SUMS', browser_download_url: 'https://github.com/x/SHA256SUMS' }] });
    const calls = [];
    const f = async (url, opts) => {
      calls.push([url, opts.headers['If-None-Match']]);
      if (url.endsWith('SHA256SUMS')) return res(200, { text: `${sum}  Scribner-Setup-1.2.0.exe` });
      return opts.headers['If-None-Match'] === '"e1"' ? res(304) : res(200, { json: rel, headers: { etag: '"e1"' } });
    };
    const cache = {};
    const a = await u.checkLatest({ fetchImpl: f, currentVersion: '1.1.0', cache });
    expect(a).toMatchObject({ latest: '1.2.0', newer: true, sha256: sum, asset: { name: 'Scribner-Setup-1.2.0.exe' } });
    expect(cache.etag).toBe('"e1"');
    const b = await u.checkLatest({ fetchImpl: f, currentVersion: '1.2.0', cache });
    expect(b.newer).toBe(false);
    expect(calls.filter(([url]) => url === u.LATEST_URL).map((c) => c[1])).toEqual([undefined, '"e1"']);
  });
  it('marks 403/429 as rate limited', async () => {
    const f = async () => res(429, { headers: { 'retry-after': '60' } });
    await expect(u.checkLatest({ fetchImpl: f, currentVersion: '1.0.0' })).rejects.toMatchObject({ rateLimited: true });
  });
});

describe('downloadAsset', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'upd-'));
  const data = Buffer.from('hello');
  const sha = crypto.createHash('sha256').update(data).digest('hex');
  const f = async () => res(200, { body: data });
  const info = (over) => ({ asset: { name: 'S.exe', size: 5, url: 'https://github.com/x' }, sha256: sha, ...over });
  it('writes the file and verifies size and sha256', async () => {
    const progress = [];
    const r = await u.downloadAsset({ fetchImpl: f, info: info(), dir, onProgress: (p) => progress.push(p) });
    expect(fs.readFileSync(r.file, 'utf8')).toBe('hello');
    expect(r.verified).toBe(true);
    expect(progress.at(-1)).toEqual({ received: 5, total: 5 });
  });
  it('rejects a wrong checksum or size', async () => {
    await expect(u.downloadAsset({ fetchImpl: f, info: info({ sha256: 'e'.repeat(64) }), dir })).rejects.toThrow(/SHA-256/);
    await expect(u.downloadAsset({ fetchImpl: f, info: info({ asset: { name: 'S.exe', size: 9, url: 'https://github.com/x' } }), dir })).rejects.toThrow(/incompletă/);
  });
});

describe('createScheduler (once per day)', () => {
  afterEach(() => vi.useRealTimers());
  const DAY = u.DAY_MS;
  const make = (opts) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-25T10:00:00Z'));
    const check = vi.fn(async () => {});
    const onChecked = vi.fn();
    const s = u.createScheduler({ check, onChecked, ...opts });
    return { s, check, onChecked };
  };
  it('checks 10 s after start when the last check is old, then every 24 h', async () => {
    const { check, onChecked } = make({ lastCheck: 0 });
    await vi.advanceTimersByTimeAsync(9000);
    expect(check).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(check).toHaveBeenCalledTimes(1);
    expect(onChecked).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(DAY - 1000);
    expect(check).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(check).toHaveBeenCalledTimes(2);
  });
  it('waits for the rest of the day when checked recently; focus does not force a check', async () => {
    const { s, check } = make({ lastCheck: Date.parse('2026-10-25T04:00:00Z') });
    await vi.advanceTimersByTimeAsync(60000);
    s.poke();
    await vi.advanceTimersByTimeAsync(5000);
    expect(check).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(18 * 3600 * 1000);
    expect(check).toHaveBeenCalledTimes(1);
  });
  it('focus re-checks when the last check is older than a day', async () => {
    const { s, check } = make({ lastCheck: 0, enabled: true, firstDelayMs: DAY * 2 });
    s.poke();
    await vi.advanceTimersByTimeAsync(1000);
    expect(check).toHaveBeenCalledTimes(1);
  });
  it('backs off on rate limits and can be turned off', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-25T10:00:00Z'));
    const check = vi.fn(async () => {
      const e = new Error('limit');
      e.rateLimited = true;
      throw e;
    });
    const s = u.createScheduler({ check });
    await vi.advanceTimersByTimeAsync(10000);
    expect(check).toHaveBeenCalledTimes(1);
    s.poke(); // backing off: focus does not retry
    await vi.advanceTimersByTimeAsync(5000);
    expect(check).toHaveBeenCalledTimes(1);
    s.configure({ enabled: false });
    await vi.advanceTimersByTimeAsync(3 * DAY);
    expect(check).toHaveBeenCalledTimes(1);
    expect(s.active).toBe(false);
  });
  it('does not start when disabled', async () => {
    const { check } = make({ enabled: false });
    await vi.advanceTimersByTimeAsync(2 * DAY);
    expect(check).not.toHaveBeenCalled();
  });
});
