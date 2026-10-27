// P1: Project Settings > Backup (project.backup.{exclude,override,onClose,everyMin,keep}) in the backup engine.
import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const backup = require('../lib/backup.cjs');

const program = { backupOnClose: true, backupEveryMin: 30, backupKeep: 5, backupDir: 'D:/B', backupOnOpen: true, backupOnSave: true, backupZip: false, backupDateName: true };

const tmps = [];
afterEach(() => {
  while (tmps.length) fs.rmSync(tmps.pop(), { recursive: true, force: true });
});

describe('resolveBackupSettings', () => {
  it('no project block / override off: program settings as they are', () => {
    expect(backup.resolveBackupSettings(undefined, program)).toEqual({ ...program, backupExcluded: false });
    expect(backup.resolveBackupSettings({ override: false, onClose: false, everyMin: 5, keep: 2 }, program)).toEqual({ ...program, backupExcluded: false });
  });
  it('override: onClose / everyMin / keep replace the program values, the rest stays', () => {
    const r = backup.resolveBackupSettings({ override: true, onClose: false, everyMin: 10, keep: 3 }, program);
    expect(r).toMatchObject({ backupOnClose: false, backupEveryMin: 10, backupKeep: 3, backupExcluded: false });
    expect(r).toMatchObject({ backupDir: 'D:/B', backupOnOpen: true, backupOnSave: true, backupZip: false });
  });
  it('override uses the dialog defaults for missing / bad values', () => {
    const r = backup.resolveBackupSettings({ override: true }, program);
    expect(r).toMatchObject({ backupOnClose: true, backupEveryMin: 0, backupKeep: 10 });
    expect(backup.resolveBackupSettings({ override: true, everyMin: 'x', keep: 0 }, program)).toMatchObject({ backupEveryMin: 0, backupKeep: 10 });
    expect(backup.resolveBackupSettings({ override: true, everyMin: -5, keep: '7' }, program)).toMatchObject({ backupEveryMin: 0, backupKeep: 7 });
  });
  it('exclude: marked excluded and wins over override', () => {
    const r = backup.resolveBackupSettings({ exclude: true, override: true, onClose: false, everyMin: 1, keep: 2 }, program);
    expect(r.backupExcluded).toBe(true);
    expect(r).toMatchObject({ backupOnClose: true, backupEveryMin: 30, backupKeep: 5 });
    expect(backup.resolveBackupSettings({ exclude: true }, program).backupExcluded).toBe(true);
  });
  it('ignores a malformed block', () => {
    expect(backup.resolveBackupSettings([], program).backupExcluded).toBe(false);
    expect(backup.resolveBackupSettings('x', program).backupKeep).toBe(5);
  });
});

describe('readProjectBackup / intervalDue / backupOnOpen', () => {
  it('reads project.json "backup", {} when missing or broken', () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'p1-'));
    tmps.push(d);
    expect(backup.readProjectBackup(d)).toEqual({});
    fs.writeFileSync(path.join(d, 'project.json'), '{bad');
    expect(backup.readProjectBackup(d)).toEqual({});
    fs.writeFileSync(path.join(d, 'project.json'), JSON.stringify({ tree: [], backup: { exclude: true } }));
    expect(backup.readProjectBackup(d)).toEqual({ exclude: true });
  });
  it('intervalDue', () => {
    expect(backup.intervalDue(0, 0, 10 ** 9)).toBe(false);
    expect(backup.intervalDue(5, 0, 5 * 60 * 1000 - 1)).toBe(false);
    expect(backup.intervalDue(5, 0, 5 * 60 * 1000)).toBe(true);
    expect(backup.intervalDue('10', 1000, 1000 + 10 * 60 * 1000)).toBe(true);
  });
  it('backupOnOpen skips an excluded project', async () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'p1-'));
    tmps.push(d);
    const proj = path.join(d, 'Carte.scribner');
    fs.mkdirSync(proj);
    fs.writeFileSync(path.join(proj, 'project.json'), JSON.stringify({ tree: [], backup: { exclude: true } }));
    const s = backup.resolveBackupSettings(backup.readProjectBackup(proj), { backupOnOpen: true, backupKeep: 5, backupDir: path.join(d, 'b') });
    expect(await backup.backupOnOpen(proj, s)).toBeNull();
    expect(fs.existsSync(path.join(d, 'b'))).toBe(false);
    const s2 = backup.resolveBackupSettings({ override: true, keep: 1 }, { backupOnOpen: true, backupKeep: 5, backupDir: path.join(d, 'b') });
    expect(await backup.backupOnOpen(proj, s2)).toMatch(/\.zip$/);
    expect(await backup.backupOnOpen(proj, s2)).toMatch(/\.zip$/);
    expect(fs.readdirSync(path.join(d, 'b')).filter((f) => f.endsWith('.zip'))).toHaveLength(1); // project keep = 1
  });
});
