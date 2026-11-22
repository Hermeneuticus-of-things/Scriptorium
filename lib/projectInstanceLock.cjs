'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function canonical(dir) {
  let resolved = path.resolve(String(dir || ''));
  try { resolved = fs.realpathSync.native(resolved); } catch { /* project may be created after claiming */ }
  return process.platform === 'win32' || process.platform === 'darwin' ? resolved.toLowerCase() : resolved;
}

function keyFor(dir) {
  return crypto.createHash('sha256').update(canonical(dir)).digest('hex');
}

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error && error.code === 'EPERM';
  }
}

function createProjectInstanceLock({ root, pid = process.pid, version = '', execPath = process.execPath, alive = processAlive } = {}) {
  if (!root) throw new Error('Directorul lockului de proiect este obligatoriu.');
  const held = new Map();
  const fileFor = (dir) => path.join(root, `${keyFor(dir)}.json`);
  const ownerRecord = (dir) => ({
    pid,
    version: String(version || ''),
    execPath: String(execPath || ''),
    projectDir: path.resolve(dir),
    startedAt: new Date().toISOString(),
  });

  function readOwner(file) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
  }

  function claim(dir) {
    const projectDir = path.resolve(dir);
    const file = fileFor(projectDir);
    fs.mkdirSync(root, { recursive: true });
    const record = ownerRecord(projectDir);
    try {
      fs.writeFileSync(file, JSON.stringify(record, null, 2), { encoding: 'utf8', flag: 'wx' });
      held.set(canonical(projectDir), { file, token: `${record.pid}:${record.startedAt}` });
      return { ok: true, owner: record };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const owner = readOwner(file);
      if (owner && owner.pid === pid && owner.execPath === execPath) {
        held.set(canonical(projectDir), { file, token: `${owner.pid}:${owner.startedAt}` });
        return { ok: true, owner };
      }
      if (owner && alive(Number(owner.pid))) return { ok: false, owner };
      try { fs.rmSync(file, { force: true }); } catch { return { ok: false, owner, stale: true }; }
      try {
        fs.writeFileSync(file, JSON.stringify(record, null, 2), { encoding: 'utf8', flag: 'wx' });
        held.set(canonical(projectDir), { file, token: `${record.pid}:${record.startedAt}` });
        return { ok: true, owner: record, recovered: true };
      } catch (retryError) {
        if (retryError.code === 'EEXIST') return { ok: false, owner: readOwner(file) };
        throw retryError;
      }
    }
  }

  function release(dir) {
    const k = canonical(dir);
    const state = held.get(k);
    if (!state) return false;
    held.delete(k);
    const owner = readOwner(state.file);
    if (owner && `${owner.pid}:${owner.startedAt}` === state.token) {
      try { fs.rmSync(state.file, { force: true }); } catch { /* best effort on shutdown */ }
    }
    return true;
  }

  function releaseAll() {
    for (const dir of [...held.keys()]) release(dir);
  }

  function ownerOf(dir) {
    return readOwner(fileFor(dir));
  }

  return { claim, release, releaseAll, ownerOf, fileFor, canonical };
}

module.exports = { canonical, keyFor, processAlive, createProjectInstanceLock };
