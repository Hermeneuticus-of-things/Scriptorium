'use strict';
// Verificarea și instalarea actualizărilor D&TED (docs/DTED.md §8). D&TED trăiește în depozitul său
// (Hermeneuticus-of-things/dted); Pneuma citește Releases-urile lui, descarcă pachetul Windows,
// verifică SHA-256, îl instalează în folderul de utilizator (fără admin) și mută settings.dtedPath
// pe el — doar după un handshake reușit pe protocol 1; dacă handshake-ul pică, instalația veche
// rămâne activă (fallback). Transportul e fetch-ul injectat (net.fetch în aplicație).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createDted } = require('./dted.cjs');
const { safeFetch, compareSemver, expectedSha256, downloadAsset, createScheduler } = require('./updater.cjs');

const DTED_REPO = 'Hermeneuticus-of-things/dted';
const DTED_LATEST_URL = `https://api.github.com/repos/${DTED_REPO}/releases/latest`;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Pachetul Windows (zip) din release: unul cu „win”/„portabil” în nume, altfel singurul zip. */
function pickZipAsset(assets) {
  const list = (Array.isArray(assets) ? assets : []).filter((a) => a && typeof a.name === 'string' && /\.zip$/i.test(a.name));
  if (!list.length) return null;
  return list.find((a) => /win|portab/i.test(a.name)) || list[0];
}

/** Ultimul release D&TED: { current, latest, newer, url, asset {name,size,url,apiUrl}, sha256, notes }. */
async function checkLatestDted({ fetchImpl, currentVersion = '', token = '', cache = null, url = DTED_LATEST_URL }) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (cache && cache.etag && cache.release) headers['If-None-Match'] = cache.etag;
  const res = await safeFetch(fetchImpl, url, { headers, token });
  let rel;
  if (res.status === 304 && cache && cache.release) {
    rel = cache.release;
  } else {
    rel = await res.json();
    if (cache) Object.assign(cache, { etag: res.headers?.get?.('etag') || '', release: rel });
  }
  const latest = String(rel.tag_name || rel.name || '').replace(/^v/, '');
  const asset = pickZipAsset(rel.assets);
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
    url: rel.html_url || `https://github.com/${DTED_REPO}/releases`,
    asset: asset ? { name: asset.name, size: asset.size, url: asset.browser_download_url, apiUrl: asset.url } : null,
    sha256: asset ? expectedSha256({ asset, sumsText, body: rel.body }) : '',
    notes: String(rel.body || ''),
  };
}

/** DTED.exe din folderul despachetat (direct sau într-un subfolder de până la 3 niveluri). */
function findExe(dir, depth = 3) {
  const p = path.join(dir, 'DTED.exe');
  try {
    if (fs.statSync(p).isFile()) return p;
  } catch {
    /* nu e direct aici: continuă în subfoldere */
  }
  if (depth > 0) {
    let names = [];
    try {
      names = fs.readdirSync(dir);
    } catch {
      return null;
    }
    for (const name of names) {
      const full = path.join(dir, name);
      let st = null;
      try {
        st = fs.statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        const hit = findExe(full, depth - 1);
        if (hit) return hit;
      }
    }
  }
  return null;
}

/** Despachetează o arhivă fără căi care ies din folder (același gard ca la motorul încorporat). */
async function extractZip(zipFile, dest) {
  const JSZip = require('jszip');
  const z = await JSZip.loadAsync(fs.readFileSync(zipFile));
  for (const [name, entry] of Object.entries(z.files)) {
    if (entry.dir) continue;
    const out = path.join(dest, ...name.split('/').filter((p) => p && p !== '..'));
    if (!out.startsWith(dest + path.sep)) continue;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, await entry.async('nodebuffer'));
  }
}

/**
 * Pornește o dată un D&TED din `dir` (handshake protocol 1, ca la orice pornire — dted.cjs respinge
 * singur un protocol diferit). Rezoală cu DTED_NO_EXE / DTED_HANDSHAKE când nu merge. `find`
 * (injectabil pentru teste) schimbă cum se pornește programul.
 */
async function verifyService(dir, { timeoutMs = 15000, spawnFn, find } = {}) {
  const how = find ? find() : null;
  const exe = how ? how.command : findExe(dir);
  if (!exe) {
    const e = new Error('Arhiva D&TED nu conține DTED.exe.');
    e.code = 'DTED_NO_EXE';
    throw e;
  }
  const cfg = how || { command: exe, args: ['--serviciu'], cwd: path.dirname(exe), source: exe };
  const dted = createDted({ find: () => cfg, spawnFn });
  let timer = null;
  try {
    await Promise.race([
      dted.start(),
      new Promise((_, rej) => {
        timer = setTimeout(() => {
          const e = new Error('D&TED-ul nou nu a răspuns la pornire (handshake protocol 1).');
          e.code = 'DTED_HANDSHAKE';
          rej(e);
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    try {
      await dted.stop();
    } catch {
      /* deja oprit */
    }
  }
  return { exePath: cfg.command };
}

/**
 * Descarcă și instalează pachetul din `info` (forma dată de checkLatestDted) în `baseDir`, într-un
 * folder cu versiune în nume. Nu atinge nicio setare: comutarea o face apelantul doar după succes.
 * Întoarce { exePath, version, dir, sha256 }.
 */
async function installDted({ fetchImpl, info, baseDir, onProgress = () => {}, spawnFn, find, token = '' }) {
  if (!info || !info.asset) throw new Error('Versiunea D&TED nu are pachet pentru Windows.');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'pneuma-dted-upd-'));
  try {
    const { file, sha256 } = await downloadAsset({ fetchImpl, info, dir: work, onProgress, token });
    const stage = path.join(work, 'stage');
    await extractZip(file, stage);
    const { exePath } = await verifyService(stage, { spawnFn, find }); // pică → nu instalăm nimic (fallback)
    const dest = path.join(baseDir, `D&TED – Dictare și transcriere în limba română (${info.latest || 'nou'})`);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(stage, dest);
    return { exePath: path.join(dest, path.relative(stage, exePath)), version: info.latest || '', dir: dest, sha256 };
  } finally {
    try {
      fs.rmSync(work, { recursive: true, force: true });
    } catch {
      /* temporar */
    }
  }
}

module.exports = {
  DTED_REPO,
  DTED_LATEST_URL,
  pickZipAsset,
  checkLatestDted,
  findExe,
  extractZip,
  verifyService,
  installDted,
  createScheduler,
  DAY_MS,
};
