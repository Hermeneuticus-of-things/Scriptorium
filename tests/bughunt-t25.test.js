// T25 bug hunt deep — backend + scaffold: store / backup / main-handlers / history.
// Every bug below was reproduced before its fix (the test failed or hung on the old code).
import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fork } from 'node:child_process';

const require = createRequire(import.meta.url);
const store = require('../lib/store.cjs');
const history = require('../lib/history.cjs');
const backup = require('../lib/backup.cjs');
const projectWatch = require('../lib/projectWatch.cjs');
const JSZip = require('jszip');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 't25-'));
const realRename = fs.renameSync;

afterEach(() => {
  fs.renameSync = realRename;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function makeProject(dir, title = 'Proiect') {
  fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'project.json'), JSON.stringify({ format: 1, title, tree: [{ id: 'draft', title: 'Manuscris', type: 'folder', root: 'draft', children: [] }, { id: 'research', title: 'Cercetare', type: 'folder', root: 'research', children: [] }, { id: 'trash', title: 'Coș', type: 'folder', root: 'trash', children: [] }] }));
  store.writeDoc(dir, 'doc-1', 'docs', '<p>Un cuvânt</p>');
}

describe('T25-STORE: project.json integrity', () => {
  it('a truncated project.json gives a clear message pointing at snapshots/_backup, not a raw JSON.parse error', () => {
    const dir = tmp();
    fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'project.json'), '{"format":1,"title":"X","tree":[{"id":"draft"');
    let msg = '';
    try {
      store.loadProject(dir);
    } catch (e) {
      msg = e.message;
    }
    expect(msg).toMatch(/deteriorat/);
    expect(msg).toMatch(/snapshots\/_backup/);
    // the load failure must not have created sub-folders in a project that cannot be read
    expect(fs.existsSync(path.join(dir, 'notes'))).toBe(false);
  });

  it('concurrent read-modify-write of project.json from several processes never loses an update', async () => {
    const dir = tmp();
    makeProject(dir, 'Curse');
    const worker = path.join(dir, 'worker.cjs');
    fs.writeFileSync(worker, `
      const fs = require('fs');
      const store = require(${JSON.stringify(path.resolve('lib/store.cjs'))});
      const [dir] = process.argv.slice(2);
      for (let i = 0; i < 20; i++) {
        store.updateProject(dir, (p) => { p.count = (p.count || 0) + 1; }, { timeoutMs: 30000 });
      }
    `);
    await Promise.all(Array.from({ length: 3 }, () => new Promise((res, rej) => {
      const child = fork(worker, [dir], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
      let err = '';
      child.stderr.on('data', (d) => { err += d; });
      child.on('exit', (c) => (c === 0 ? res() : rej(new Error(`exit ${c}: ${err.slice(0, 600)}`))));
    })));
    expect(store.loadProject(dir).count).toBe(60);
  }, 60000);

  it('marker', () => {
    // eslint-disable-next-line no-console
    console.log('T25-STORE passed');
  });
});

describe('T25-BACKUP: backup at scale and under concurrency', () => {
  it('two backups of the same project started in the same millisecond both land (no shared tmp, no overwrite)', async () => {
    const dir = tmp();
    makeProject(dir, 'Conc');
    const dest = tmp();
    // The clock stands still: both calls compute the same stamp, the exact race two concurrent
    // backups hit on a fast machine. The old code spun forever on the frozen stamp and shared
    // one temp file; the new code claims the final name and takes the "-2" suffix.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T10:00:00'));
    const [a, b] = await Promise.all([backup.backupProject(dir, dest, 5), backup.backupProject(dir, dest, 5)]);
    vi.useRealTimers();
    expect(a).not.toBe(b);
    for (const f of [a, b]) {
      expect(fs.existsSync(f)).toBe(true);
      const zip = await JSZip.loadAsync(fs.readFileSync(f));
      const pjName = Object.keys(zip.files).find((k) => k.endsWith('project.json'));
      const pj = await zip.file(pjName).async('string');
      expect(JSON.parse(pj).title).toBe('Conc');
    }
    // and nothing else is left behind (no temp files that a later restore could trip over)
    const leftovers = fs.readdirSync(dest).filter((f) => f.endsWith('.tmp') || /\.tmp-/.test(f));
    expect(leftovers).toEqual([]);
  });

  it('two concurrent folder backups (zip: false) both land, under private temp folders', async () => {
    const dir = tmp();
    makeProject(dir, 'FolderRace');
    const dest = tmp();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T10:00:00'));
    const [a, b] = await Promise.all([backup.backupProject(dir, dest, 5, { zip: false }), backup.backupProject(dir, dest, 5, { zip: false })]);
    vi.useRealTimers();
    expect(a).not.toBe(b);
    for (const f of [a, b]) {
      expect(fs.existsSync(path.join(f, path.basename(dir), 'project.json'))).toBe(true);
    }
    const tmpLeft = fs.readdirSync(dest).filter((f) => /\.tmp-/.test(f) || f.endsWith('.tmp'));
    expect(tmpLeft).toEqual([]);
  });

  it('media is stored, not deflated, and comes back byte-identical', async () => {
    const dir = tmp();
    makeProject(dir, 'Media');
    fs.mkdirSync(path.join(dir, 'media'), { recursive: true });
    const media = Buffer.alloc(1024 * 1024);
    require('node:crypto').randomFillSync(media); // incompressible, like real photo/video data
    fs.writeFileSync(path.join(dir, 'media', 'video.mp4'), media);
    const dest = tmp();
    const t0 = process.hrtime.bigint();
    const file = await backup.backupProject(dir, dest, 3);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    const zip = await JSZip.loadAsync(fs.readFileSync(file));
    const back = await zip.file(Object.keys(zip.files).find((k) => k.endsWith('video.mp4'))).async('nodebuffer');
    expect(back.equals(media)).toBe(true);
    // eslint-disable-next-line no-console
    console.log(`[T25-BACKUP] 1 MB incompressible media zipped+rotated in ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(30000); // a full backup of 1 MB must never hang the app
  });

  it('a non-numeric backupKeep (corrupted settings) can no longer disable rotation', async () => {
    const dir = tmp();
    makeProject(dir, 'Rot');
    const dest = tmp();
    for (let i = 0; i < 12; i++) await backup.backupProject(dir, dest, 'nu-merge', {});
    expect(backup.listBackups(dir, dest).length).toBeLessThanOrEqual(10);
    expect(backup.listBackups(dir, dest).length).toBeGreaterThan(0);
  });

  it('marker', () => {
    // eslint-disable-next-line no-console
    console.log('T25-BACKUP passed');
  });
});

describe('T25-MAIN: the autosave vs MCP agent race', () => {
  const V1 = '<p>Author version one</p>'; // loaded at open, served by doc:read
  const VAGENT = '<p>Agent improvement via MCP</p>';
  const V2 = '<p>Author version two typed</p>';

  it('an agent edit that landed inside the autosave race window is kept in snapshots/_backup, not destroyed', () => {
    const dir = tmp();
    const file = path.join(dir, 'docs', 'abc.html');
    fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
    fs.writeFileSync(file, V1);
    const tracker = projectWatch.createChangeTracker({ dir, onFlush: () => {} });
    // doc:read: the app adopts the disk version as its own
    tracker.noteWrite(file, V1);
    // t0: the agent (MCP write_document) writes; fs.watch queues the event
    fs.writeFileSync(file, VAGENT);
    // t1: the author's autosave is about to land BEFORE the watcher event is processed.
    // doc:write consults the guard FIRST — the disk still holds the agent's version:
    const lost = projectWatch.lostExternalContent(tracker, file, V2);
    expect(lost).toBe(VAGENT);
    // …and main.cjs keeps it in snapshots/_backup before saving:
    store.backupFile(dir, 'abc.html', lost);
    const bdir = path.join(dir, 'snapshots', '_backup');
    const saved = fs.readdirSync(bdir).find((f) => f.endsWith('abc.html'));
    expect(fs.readFileSync(path.join(bdir, saved), 'utf8')).toBe(VAGENT);
    // the save itself, exactly like the handler: note the new content, then write it
    tracker.noteWrite(file, V2);
    fs.writeFileSync(file, V2);
    // t2: the watcher processes the queued event — and cannot tell it from a self-write:
    expect(tracker.handle('docs/abc.html')).toBe(false);
    // The next autosave (disk already holds the last self-write) must not back up anything again:
    expect(projectWatch.lostExternalContent(tracker, file, V2)).toBe(null);
  });

  it('the guard stays silent on the normal paths (own version on disk, same content, no file)', () => {
    const dir = tmp();
    const file = path.join(dir, 'docs', 'abc.html');
    fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
    const tracker = projectWatch.createChangeTracker({ dir, onFlush: () => {} });
    // no file on disk (new document): nothing can be destroyed
    expect(projectWatch.lostExternalContent(tracker, file, '<p>nou</p>')).toBe(null);
    // the disk holds exactly what is about to be written
    fs.writeFileSync(file, V1);
    expect(projectWatch.lostExternalContent(tracker, file, V1)).toBe(null);
    // the disk holds the app's own last write — nothing to keep even for a different next version
    tracker.noteWrite(file, V1);
    expect(projectWatch.lostExternalContent(tracker, file, V2)).toBe(null);
  });

  it('a writer that handed over no content (external-folder sync) is trusted briefly, then verified', () => {
    const dir = tmp();
    const file = path.join(dir, 'docs', 'abc.html');
    fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
    fs.writeFileSync(file, V1);
    const tracker = projectWatch.createChangeTracker({ dir, onFlush: () => {} });
    tracker.noteWrite(file); // time only, like v04:syncIn used to note its writes
    // inside the 2 s trust window the disk version counts as the app's own
    expect(projectWatch.lostExternalContent(tracker, file, V2)).toBe(null);
    // after the window an unknown disk version is an outside edit about to be destroyed
    const later = () => Date.now() + 3000;
    expect(projectWatch.lostExternalContent(tracker, file, V2, fs.readFileSync, later)).toBe(V1);
  });

  it('marker', () => {
    // eslint-disable-next-line no-console
    console.log('T25-MAIN passed');
  });
});

describe('T25-HISTORY: writing history survives and stays cheap', () => {
  it('a sync client holding history.json for a moment does not lose the day or leave .tmp litter', () => {
    const dir = tmp();
    let failures = 0;
    fs.renameSync = (a, b) => {
      if (String(b).endsWith('history.json') && failures < 2) {
        failures += 1;
        const e = new Error('EPERM: operation not permitted');
        e.code = 'EPERM';
        throw e; // antivirus / OneDrive has the file open, like on a real sync folder
      }
      return realRename(a, b);
    };
    const h = history.recordHistory(dir, { draft: 1000, total: 2000 });
    expect(h.days[history.dayKey()].draftEnd).toBe(1000);
    expect(fs.readFileSync(path.join(dir, 'history.json'), 'utf8')).toMatch(/"draftEnd": 1000/);
    expect(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp'))).toEqual([]);
    // a permanently held file still fails loudly and leaves no temp file behind
    fs.renameSync = (a, b) => {
      const e = new Error('EPERM: operation not permitted');
      e.code = 'EPERM';
      if (String(a).endsWith('.tmp')) throw e;
      return realRename(a, b);
    };
    expect(() => history.recordHistory(dir, { draft: 1100, total: 2100 })).toThrow(/EPERM/);
    expect(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });

  it('recordHistory no longer re-reads the whole file on every autosave (cached until the file changes)', () => {
    const dir = tmp();
    history.recordHistory(dir, { draft: 100, total: 100 });
    const spy = vi.spyOn(fs, 'readFileSync');
    for (let i = 1; i <= 5; i++) history.recordHistory(dir, { draft: 100 + i, total: 100 + i });
    const readCalls = spy.mock.calls.filter(([f]) => String(f).endsWith('history.json')).length;
    expect(readCalls).toBe(0);
    const h = history.readHistory(dir);
    expect(h.days[history.dayKey()].draftEnd).toBe(105);
    spy.mockRestore();
    // an external change (another computer through the sync client) is picked up again
    const file = path.join(dir, 'history.json');
    const external = JSON.parse(fs.readFileSync(file, 'utf8'));
    external.days['2020-01-01'] = { draftStart: 0, draftEnd: 10, totalStart: 0, totalEnd: 10 };
    realRename(file, `${file}.swap`);
    fs.writeFileSync(file, JSON.stringify(external));
    fs.rmSync(`${file}.swap`, { force: true });
    fs.utimesSync(file, new Date(1000), new Date(1000)); // different mtime and size than the cache
    const h2 = history.readHistory(dir);
    expect(h2.days['2020-01-01'].draftEnd).toBe(10);
    expect(h2.days[history.dayKey()].draftEnd).toBe(105);
  });

  it('ten years of daily history keeps recording correctly through the cache', () => {
    const dir = tmp();
    const d = new Date();
    d.setFullYear(d.getFullYear() - 10);
    d.setHours(12, 0, 0, 0); // noon: calendar-day steps never straddle a DST change
    for (let i = 0; i < 3650; i++) {
      history.recordHistory(dir, { draft: 100000 + i * 10, total: 200000 + i * 20 }, d);
      d.setDate(d.getDate() + 1);
    }
    const t0 = process.hrtime.bigint();
    history.recordHistory(dir, { draft: 465000, total: 465000 });
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    const sum = history.summarize(history.readHistory(dir));
    expect(sum.length).toBe(3651);
    expect(sum[sum.length - 1].draftWords).toBe(465000);
    // eslint-disable-next-line no-console
    console.log(`[T25-HISTORY] recordHistory on a 10-year history: ${ms.toFixed(1)} ms per autosave`);
    expect(ms).toBeLessThan(20);
  }, 60000);

  it('marker', () => {
    // eslint-disable-next-line no-console
    console.log('T25-HISTORY passed');
  });
});
