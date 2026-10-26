import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fork } from 'node:child_process';

const require = createRequire(import.meta.url);
const store = require('../lib/store.cjs');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pneuma-lock-'));

describe('project.json lock', () => {
  it('releases only its own lock (a lock taken over by another process stays)', () => {
    const dir = tmp();
    const lock = path.join(dir, 'project.json.lock');
    store.withProjectLock(dir, () => {
      // another process decided our lock was stale and replaced it
      fs.writeFileSync(lock, 'other-process-token');
    });
    expect(fs.readFileSync(lock, 'utf8')).toBe('other-process-token');
  });
  it('takes over a stale lock and leaves no private files behind', () => {
    const dir = tmp();
    const lock = path.join(dir, 'project.json.lock');
    fs.writeFileSync(lock, 'crashed-writer');
    fs.utimesSync(lock, new Date(0), new Date(0));
    let ran = false;
    store.withProjectLock(dir, () => { ran = true; });
    expect(ran).toBe(true);
    expect(fs.readdirSync(dir)).toEqual([]);
  });
  it('a fresh lock is waited for, then times out with a clear message', () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, 'project.json.lock'), 'busy');
    expect(() => store.withProjectLock(dir, () => {}, { timeoutMs: 100 })).toThrow(/ocupat/);
    expect(fs.readFileSync(path.join(dir, 'project.json.lock'), 'utf8')).toBe('busy');
  });
  it('many processes taking over the same stale lock never hold it at the same time', async () => {
    const dir = tmp();
    const lock = path.join(dir, 'project.json.lock');
    fs.writeFileSync(lock, 'crashed-writer');
    fs.utimesSync(lock, new Date(0), new Date(0));
    const log = path.join(dir, 'log.txt');
    const worker = path.join(dir, 'worker.cjs');
    fs.writeFileSync(worker, `
      const fs = require('fs');
      const store = require(${JSON.stringify(path.resolve('lib/store.cjs'))});
      const [dir, log] = process.argv.slice(2);
      for (let i = 0; i < 15; i++) {
        store.withProjectLock(dir, () => {
          fs.appendFileSync(log, 'in ' + process.pid + '\\n');
          const t = Date.now(); while (Date.now() - t < 3) {}
          fs.appendFileSync(log, 'out ' + process.pid + '\\n');
        }, { timeoutMs: 20000 });
      }
    `);
    await Promise.all(Array.from({ length: 6 }, () => new Promise((res, rej) => {
      const child = fork(worker, [dir, log], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
      let err = '';
      child.stderr.on('data', (d) => { err += d; });
      child.on('exit', (c) => (c === 0 ? res() : rej(new Error(`exit ${c}: ${err.slice(0, 800)}`))));
    })));
    const lines = fs.readFileSync(log, 'utf8').trim().split('\n');
    expect(lines.length).toBe(6 * 15 * 2);
    for (let i = 0; i < lines.length; i += 2) {
      expect(lines[i].startsWith('in ')).toBe(true);
      expect(lines[i + 1]).toBe(lines[i].replace('in ', 'out '));
    }
    expect(fs.existsSync(lock)).toBe(false);
  }, 60000);
});
