// In-app updates from the project's GitHub Releases (own code, no extra dependencies).
// Pure helpers (version compare, asset choice, host allowlist, checksum parsing) are exported for tests;
// the network goes through an injected fetch (Electron's net.fetch in the app) with redirects followed by hand,
// only to the allowed GitHub hosts.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO = 'Hermeneuticus-of-things/Scriptorium';
const LATEST_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const ALLOWED_HOSTS = new Set(['api.github.com', 'github.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com']);
const MAX_REDIRECTS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const USER_AGENT = 'Pneuma Sofer-Updater';

/** "v1.2.3" / "1.2.3-beta.1" -> { nums: [1,2,3], pre: ['beta', 1] } or null. */
function parseVersion(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+.*)?$/.exec(String(v || '').trim());
  if (!m) return null;
  return { nums: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p)) : [] };
}

/** Semver order: -1, 0, 1 (a pre-release sorts before its release). Unparseable versions compare equal. */
function compareSemver(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return 0;
  for (let i = 0; i < 3; i++) if (x.nums[i] !== y.nums[i]) return x.nums[i] < y.nums[i] ? -1 : 1;
  if (!x.pre.length || !y.pre.length) return x.pre.length === y.pre.length ? 0 : x.pre.length ? -1 : 1;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i];
    const q = y.pre[i];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    if (p === q) continue;
    if (typeof p === 'number' && typeof q === 'number') return p < q ? -1 : 1;
    if (typeof p === 'number') return -1;
    if (typeof q === 'number') return 1;
    return p < q ? -1 : 1;
  }
  return 0;
}

/** Only https to the GitHub hosts that serve the release API and its files. */
function isAllowedUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && ALLOWED_HOSTS.has(u.hostname.toLowerCase()) && !u.username && !u.password;
  } catch {
    return false;
  }
}

/** Running as the portable build (electron-builder sets these for the portable launcher). */
function isPortable(env = process.env) {
  return Boolean(env.PORTABLE_EXECUTABLE_DIR || env.PORTABLE_EXECUTABLE_FILE);
}

/** The installer (Pneuma Sofer-Setup-x.y.z.exe) or the portable exe (Pneuma Sofer-x.y.z-portabil.exe). */
function pickAsset(assets, { portable = false } = {}) {
  const list = Array.isArray(assets) ? assets.filter((a) => a && typeof a.name === 'string' && /\.exe$/i.test(a.name)) : [];
  const want = portable ? (n) => /portab/i.test(n) : (n) => /setup/i.test(n);
  return list.find((a) => want(a.name)) || null;
}

/** "<sha256>  <name>" lines (sha256sum format, optional '*' binary marker) -> hash for `name`, or ''. */
function parseSha256Sums(text, name) {
  for (const line of String(text || '').split(/\r?\n/)) {
    const m = /^\s*([0-9a-fA-F]{64})\s+\*?(.+?)\s*$/.exec(line);
    if (m && path.basename(m[2]) === name) return m[1].toLowerCase();
  }
  return '';
}

/** Expected sha256 of the asset: GitHub's own digest, a SHA256SUMS text, or a line in the release notes. */
function expectedSha256({ asset, sumsText = '', body = '' }) {
  const digest = /^sha256:([0-9a-f]{64})$/i.exec(String(asset?.digest || ''));
  if (digest) return digest[1].toLowerCase();
  return parseSha256Sums(sumsText, asset?.name) || parseSha256Sums(body, asset?.name);
}

/** fetch with redirects followed by hand, only through allowed hosts; the token goes only to api.github.com.
 * A stale/revoked token answers 401 (or 403 non-rate-limit) even for a public repo: after such an
 * answer the whole chain is retried once WITHOUT the token, so the in-app update keeps working
 * when the saved key went bad. The thrown errors carry `.status` for callers and tests. */
async function safeFetch(fetchImpl, url, { headers = {}, token = '' } = {}) {
  const run = async (useToken) => {
    let current = url;
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      if (!isAllowedUrl(current)) throw new Error(`Adresă nepermisă pentru actualizare: ${current}`);
      const h = { 'User-Agent': USER_AGENT, ...headers };
      if (useToken && token && new URL(current).hostname === 'api.github.com') h.Authorization = `Bearer ${token}`;
      const res = await fetchImpl(current, { headers: h, redirect: 'manual' });
      if (res.status === 304) return res; // not modified (If-None-Match)
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers && (typeof res.headers.get === 'function' ? res.headers.get('location') : res.headers.location);
        if (!loc) throw new Error(`Redirecționare fără adresă (${res.status})`);
        current = new URL(loc, current).toString();
        continue;
      }
      if (res.status === 403 || res.status === 429) {
        const err = new Error('GitHub limitează temporar cererile; reîncerc mai târziu.');
        err.rateLimited = true;
        const reset = Number(res.headers?.get?.('x-ratelimit-reset')) * 1000;
        const retry = Number(res.headers?.get?.('retry-after')) * 1000;
        err.retryAt = retry ? Date.now() + retry : reset || 0;
        throw err;
      }
      if (!res.ok) {
        const err = new Error(res.status === 404
          ? 'Nu s-a găsit nicio versiune publicată.'
          : `GitHub a răspuns ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res;
    }
    throw new Error('Prea multe redirecționări');
  };
  if (!token) return run(false);
  try {
    return await run(true);
  } catch (err) {
    if ((err?.status === 401 || err?.status === 403) && !err.rateLimited) return run(false); // token invalid → public
    throw err;
  }
}

/** Latest release: { current, latest, newer, notes, url, asset, portable, sha256 }. */
// `cache` ({ etag, release }) makes repeated checks conditional (If-None-Match): a 304 reuses the stored release
// and does not count against GitHub's rate limit. The cache object is updated in place.
async function checkLatest({ fetchImpl, currentVersion, portable = false, token = '', cache = null }) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (cache && cache.etag && cache.release) headers['If-None-Match'] = cache.etag;
  const res = await safeFetch(fetchImpl, LATEST_URL, { headers, token });
  let rel;
  if (res.status === 304 && cache && cache.release) {
    rel = cache.release;
  } else {
    rel = await res.json();
    const etag = res.headers?.get?.('etag');
    if (cache) Object.assign(cache, { etag: etag || '', release: rel });
  }
  const latest = String(rel.tag_name || rel.name || '').replace(/^v/, '');
  const asset = pickAsset(rel.assets, { portable });
  let sumsText = '';
  const sums = (rel.assets || []).find((a) => /^SHA256SUMS(\.txt)?$/i.test(a.name || ''));
  if (asset && sums && !/^sha256:/i.test(String(asset.digest || ''))) {
    try {
      sumsText = await (await safeFetch(fetchImpl, token ? sums.url : sums.browser_download_url, { headers: { Accept: 'application/octet-stream' }, token })).text();
    } catch {
      sumsText = '';
    }
  }
  return {
    current: currentVersion,
    latest,
    newer: Boolean(latest) && compareSemver(latest, currentVersion) > 0,
    notes: String(rel.body || ''),
    url: rel.html_url || `https://github.com/${REPO}/releases`,
    portable,
    asset: asset ? { name: asset.name, size: asset.size, url: asset.browser_download_url, apiUrl: asset.url } : null,
    sha256: asset ? expectedSha256({ asset, sumsText, body: rel.body }) : '',
  };
}

/** Streams the asset to `dir`, checking size and (when known) sha256. Returns the file path. */
async function downloadAsset({ fetchImpl, info, dir, onProgress = () => {}, token = '' }) {
  const asset = info && info.asset;
  if (!asset) throw new Error('Versiunea nouă nu are fișier pentru Windows.');
  if (path.basename(asset.name) !== asset.name) throw new Error('Nume de fișier nepermis.');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, asset.name);
  const part = `${file}.part`;
  const res = await safeFetch(fetchImpl, token && asset.apiUrl ? asset.apiUrl : asset.url, { headers: { Accept: 'application/octet-stream' }, token });
  const total = Number(asset.size) || Number(res.headers?.get?.('content-length')) || 0;
  const hash = crypto.createHash('sha256');
  const out = fs.createWriteStream(part);
  let received = 0;
  try {
    const write = (chunk) => new Promise((resolve, reject) => out.write(chunk, (err) => (err ? reject(err) : resolve())));
    if (res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const buf = Buffer.from(value);
        hash.update(buf);
        received += buf.length;
        await write(buf);
        onProgress({ received, total });
      }
    } else {
      const buf = Buffer.from(await res.arrayBuffer());
      hash.update(buf);
      received = buf.length;
      await write(buf);
      onProgress({ received, total });
    }
    await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())));
  } catch (err) {
    out.destroy();
    fs.rmSync(part, { force: true });
    throw err;
  }
  if (asset.size && received !== Number(asset.size)) {
    fs.rmSync(part, { force: true });
    throw new Error(`Descărcare incompletă (${received} din ${asset.size} octeți).`);
  }
  const actual = hash.digest('hex');
  if (info.sha256 && actual !== info.sha256) {
    fs.rmSync(part, { force: true });
    throw new Error('Amprenta SHA-256 a fișierului descărcat nu se potrivește; nu a fost folosit.');
  }
  fs.rmSync(file, { force: true });
  fs.renameSync(part, file);
  return { file, sha256: actual, verified: Boolean(info.sha256) };
}

/** Arguments for the Inno Setup installer: no wizard pages, closes and restarts the running program. */
const INSTALLER_ARGS = ['/SILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/CLOSEAPPLICATIONS', '/RESTARTAPPLICATIONS'];

/**
 * Background checks, once per day: `firstDelayMs` after start when the last check (`lastCheck`, kept in settings
 * through `onChecked`) is older than `intervalMs`, otherwise when the interval has passed; then once per interval
 * with one timer. `poke()` (window focus) checks only when the last check is older than the interval. Rate-limit errors back off (retryAt or doubling, max 6 h).
 * timers: { setTimeout, clearTimeout, now } (fake timers in tests).
 */
function createScheduler({ check, intervalMs = DAY_MS, firstDelayMs = 10000, enabled = true, lastCheck = 0, onChecked = () => {}, timers = {} }) {
  const st = timers.setTimeout || setTimeout;
  const ct = timers.clearTimeout || clearTimeout;
  const now = timers.now || Date.now;
  const MAX_BACKOFF = 6 * 60 * 60 * 1000;
  let timer = null;
  let last = Number(lastCheck) || 0;
  let backoff = 0;
  let running = false;
  let on = false;
  const arm = (ms) => {
    if (timer) ct(timer);
    timer = on ? st(run, Math.max(1000, ms)) : null;
  };
  async function run() {
    timer = null;
    if (running || !on) return;
    running = true;
    let next = intervalMs;
    try {
      await check();
      last = now();
      backoff = 0;
      try { onChecked(last); } catch { /* settings write is best effort */ }
    } catch (err) {
      last = now();
      if (err && err.rateLimited) {
        backoff = Math.min(MAX_BACKOFF, Math.max(intervalMs, backoff * 2 || intervalMs));
        next = err.retryAt && err.retryAt > now() ? Math.max(err.retryAt - now(), intervalMs) : backoff;
      }
    } finally {
      running = false;
    }
    arm(next);
  }
  const api = {
    start() {
      if (on) return;
      on = true;
      const t = now();
      arm(last && last <= t && t - last < intervalMs ? last + intervalMs - t : firstDelayMs);
    },
    stop() { on = false; if (timer) ct(timer); timer = null; },
    configure(opts = {}) {
      if (opts.enabled === false) api.stop();
      else if (opts.enabled === true) api.start();
    },
    poke() {
      if (on && !running && !backoff && now() - last >= intervalMs) arm(1000);
    },
    get lastCheck() { return last; },
    get active() { return on; },
  };
  if (enabled) api.start();
  return api;
}


module.exports = {
  REPO,
  LATEST_URL,
  ALLOWED_HOSTS,
  INSTALLER_ARGS,
  parseVersion,
  compareSemver,
  isAllowedUrl,
  isPortable,
  pickAsset,
  parseSha256Sums,
  expectedSha256,
  safeFetch,
  checkLatest,
  downloadAsset,
  createScheduler,
  DAY_MS,
};
