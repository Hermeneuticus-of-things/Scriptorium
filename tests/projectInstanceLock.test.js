import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createProjectInstanceLock, keyFor } = require('../lib/projectInstanceLock.cjs');

const temps = [];
function tempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pneuma-project-lock-'));
  temps.push(dir);
  return dir;
}
afterEach(() => { while (temps.length) fs.rmSync(temps.pop(), { recursive: true, force: true }); });

describe('projectInstanceLock', () => {
  it('permite un singur owner pentru aceeași carte între procese', () => {
    const root = tempDir();
    const first = createProjectInstanceLock({ root, pid: 101, version: '1.2.7', execPath: 'first.exe', alive: () => true });
    const second = createProjectInstanceLock({ root, pid: 202, version: '1.2.6', execPath: 'second.exe', alive: () => true });
    const project = path.join(tempDir(), 'book.scribner');
    expect(first.claim(project).ok).toBe(true);
    const result = second.claim(project);
    expect(result.ok).toBe(false);
    expect(result.owner).toMatchObject({ pid: 101, version: '1.2.7', execPath: 'first.exe' });
    expect(fs.existsSync(path.join(root, `${keyFor(project)}.json`))).toBe(true);
  });

  it('recuperează lockul rămas după un proces mort', () => {
    const root = tempDir();
    const first = createProjectInstanceLock({ root, pid: 101, version: '1.2.6', execPath: 'old.exe', alive: () => false });
    const second = createProjectInstanceLock({ root, pid: 202, version: '1.2.7', execPath: 'new.exe', alive: (pid) => pid !== 101 });
    const project = path.join(tempDir(), 'book.scribner');
    expect(first.claim(project).ok).toBe(true);
    expect(second.claim(project)).toMatchObject({ ok: true, recovered: true });
    expect(second.ownerOf(project)).toMatchObject({ pid: 202, version: '1.2.7' });
  });

  it('eliberarea nu șterge lockul preluat ulterior de alt proces', () => {
    const root = tempDir();
    const first = createProjectInstanceLock({ root, pid: 101, version: '1.2.6', execPath: 'old.exe', alive: () => false });
    const second = createProjectInstanceLock({ root, pid: 202, version: '1.2.7', execPath: 'new.exe', alive: (pid) => pid !== 101 });
    const project = path.join(tempDir(), 'book.scribner');
    first.claim(project);
    second.claim(project);
    first.release(project);
    expect(second.ownerOf(project)).toMatchObject({ pid: 202 });
    second.release(project);
    expect(second.ownerOf(project)).toBe(null);
  });
});
