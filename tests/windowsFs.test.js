import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { safeName } = require('../lib/fsNames.cjs');
const store = require('../lib/store.cjs');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'scribner-win-'));

// Names Windows refuses or silently changes; the same rules apply on every OS so a project
// made on Linux/macOS can be copied to Windows.
describe('Windows-safe names', () => {
  it.each([
    ['CON', '_CON'], ['nul.txt', '_nul.txt'], ['Com1', '_Com1'], ['LPT¹', '_LPT¹'], ['CON .scribner', '_CON .scribner'],
    ['Capitolul 1.', 'Capitolul 1'], ['Final   ', 'Final'], ['a:b*c?"d"<e>|f', 'a_b_c__d__e__f'], ['tab\there', 'tab here'],
    ['', 'Fără titlu'], ['...', 'Fără titlu'], ['Mihai  Eminescu', 'Mihai Eminescu'],
  ])('%j -> %j', (input, out) => expect(safeName(input)).toBe(out));
  it('caps length so nested paths stay under 260 characters', () => {
    expect(safeName('ă'.repeat(400)).length).toBe(120);
    expect(safeName(`${'x'.repeat(119)}. y`).endsWith('.')).toBe(false);
  });
  it('project folders use the same rules (reserved title, trailing dot)', () => {
    expect(path.basename(store.projectDirFor('/p', 'CON'))).toBe('_CON.scribner');
    expect(path.basename(store.projectDirFor('/p', 'Cartea mea.'))).toBe('Cartea mea.scribner');
    expect(path.basename(store.projectDirFor('/p', '   '))).toBe('Proiect.scribner');
  });
  it('creates, reopens and saves a project with a reserved, accented, punctuated title', () => {
    const dir = store.projectDirFor(tmp(), 'NUL: Însemnări ș-așa.');
    store.createProject(dir, 'NUL: Însemnări ș-așa.');
    const p = store.loadProject(dir);
    expect(p.title).toBe('NUL: Însemnări ș-așa.');
    store.saveProject(dir, { ...p, title: 'Altul' });
    expect(store.loadProject(dir).title).toBe('Altul');
  });
});

describe('atomic save while another program holds the file', () => {
  it('retries a rename that fails for a moment with EPERM/EBUSY, then succeeds', () => {
    let calls = 0;
    const flaky = (a, b) => {
      calls += 1;
      if (calls < 3) throw Object.assign(new Error('busy'), { code: calls === 1 ? 'EPERM' : 'EBUSY' });
      fs.renameSync(a, b);
    };
    const file = path.join(tmp(), 'project.json');
    store.writeAtomic(file, '{"a":1}', { rename: flaky });
    expect(calls).toBe(3);
    expect(fs.readFileSync(file, 'utf8')).toBe('{"a":1}');
  });
  it('gives up after a while, keeps the old file and leaves no temp file behind', () => {
    const d = tmp();
    const file = path.join(d, 'project.json');
    fs.writeFileSync(file, 'old');
    const locked = () => { throw Object.assign(new Error('locked'), { code: 'EACCES' }); };
    expect(() => store.writeAtomic(file, 'new', { rename: locked, tries: 3 })).toThrow('locked');
    expect(fs.readFileSync(file, 'utf8')).toBe('old');
    expect(fs.readdirSync(d)).toEqual(['project.json']);
  });
  it('does not retry other errors', () => {
    let calls = 0;
    const missing = () => { calls += 1; throw Object.assign(new Error('nope'), { code: 'ENOENT' }); };
    expect(() => store.writeAtomic(path.join(tmp(), 'x.json'), '1', { rename: missing })).toThrow('nope');
    expect(calls).toBe(1);
  });
  // Real Windows behaviour: a file opened by another handle. On Windows the rename either waits
  // out the lock or fails cleanly; on POSIX it simply succeeds.
  it('saves over a file that is open for reading', () => {
    const file = path.join(tmp(), 'doc.html');
    fs.writeFileSync(file, 'old');
    const fd = fs.openSync(file, 'r');
    let err = null;
    try { store.writeAtomic(file, 'new', { tries: 4 }); } catch (e) { err = e; }
    fs.closeSync(fd);
    if (err) {
      expect(process.platform).toBe('win32');
      expect(fs.readFileSync(file, 'utf8')).toBe('old');
    } else expect(fs.readFileSync(file, 'utf8')).toBe('new');
  });
});
