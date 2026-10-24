// Team work through a shared folder (ROADMAP §9): identity, change log, presence and locks, the
// paragraph merge of a document changed on two computers, and the storage on every platform.
import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  AGENT, LOCK_STALE_MS, PRESENCE_STALE_MS, appendLog, colorFor, filterLog, lastChanges, logRow, mergeDoc, newMachineId,
  parseLog, people, presenceOf, publishPresence, readLogs, readPeers, splitBlocks, teamFiles, teamIdentity, wordDelta,
} from '../src/lib/team.js';
import { pullExternalDocs } from '../src/lib/syncGuard.js';
import { createMockApi } from '../src/lib/mockApi.js';
import { createWebApi, createMemoryKv } from '../src/lib/webApi.js';
import { folderTeamFiles, folderTeamWrite } from '../src/lib/folderKv.js';
const require = createRequire(import.meta.url);
const teamStore = require('../lib/teamStore.cjs');

const ana = { name: 'Ana', color: '#d9822b', machine: 'pc-ana' };
const ion = { name: 'Ion', color: '#2e7dd7', machine: 'pc-ion' };

describe('identity', () => {
  it('is off without a name or a machine id', () => {
    expect(teamIdentity({})).toBe(null);
    expect(teamIdentity({ team: { name: '  ', machine: 'pc-x' } })).toBe(null);
    expect(teamIdentity({ team: { name: 'Ana' } })).toBe(null);
  });
  it('keeps a valid color, else picks a stable one', () => {
    expect(teamIdentity({ team: { name: 'Ana', color: '#112233', machine: 'pc-1' } })).toEqual({ name: 'Ana', color: '#112233', machine: 'pc-1' });
    const t = teamIdentity({ team: { name: 'Ana', color: 'red;', machine: 'pc/../1' } });
    expect(t.color).toBe(colorFor('Ana'));
    expect(t.machine).toBe('pc1');
  });
  it('machine ids are file-name safe', () => {
    for (let i = 0; i < 20; i++) expect(newMachineId()).toMatch(/^pc-[a-z0-9]{10}$/);
  });
});

describe('change log', () => {
  it('counts words added and removed, moved words count as neither', () => {
    expect(wordDelta('a b c', 'c b a')).toEqual({ added: 0, removed: 0 });
    expect(wordDelta('ziua bună', 'ziua foarte bună azi')).toEqual({ added: 2, removed: 0 });
    expect(wordDelta('ceață deasă', 'ceață')).toEqual({ added: 0, removed: 1 });
  });
  it('a row names the person, the computer, the document and a sample', () => {
    const r = logRow({ who: ana, doc: 'd1', title: 'Cap. 1', chunks: [{ old: 'Drumul urca.', new: 'Drumul urca  pe lângă pârâu.' }], time: '2026-10-24T10:00:00.000Z' });
    expect(r).toMatchObject({ doc: 'd1', who: 'Ana', machine: 'pc-ana', added: 3, removed: 0, paragraphs: 1, sample: 'Drumul urca pe lângă pârâu.' });
  });
  it('skips damaged lines and merges every computer, oldest first', () => {
    const files = {
      'log-pc-ana.jsonl': `${JSON.stringify({ doc: 'a', who: 'Ana', time: '2026-10-24T10:00:00Z' })}\n{"doc":"b","who":"An`,
      'log-pc-ion.jsonl': `${JSON.stringify({ doc: 'b', who: 'Ion', time: '2026-10-24T09:00:00Z' })}\n`,
      'presence-pc-ion.json': '{}',
    };
    expect(parseLog(files['log-pc-ana.jsonl'])).toHaveLength(1);
    const rows = readLogs(files);
    expect(rows.map((r) => r.who)).toEqual(['Ion', 'Ana']);
    expect(lastChanges(rows)).toMatchObject({ a: { who: 'Ana' }, b: { who: 'Ion' } });
  });
  it('filters by document, person and period; lists the people newest first', () => {
    const now = Date.parse('2026-10-24T12:00:00Z');
    const rows = [
      { doc: 'a', who: 'Ana', time: '2026-10-01T10:00:00Z' },
      { doc: 'a', who: 'Ion', time: '2026-10-24T08:00:00Z' },
      { doc: 'b', who: AGENT, time: '2026-10-24T11:00:00Z' },
    ];
    expect(filterLog(rows, { doc: 'a' })).toHaveLength(2);
    expect(filterLog(rows, { who: 'Ana' })).toHaveLength(1);
    expect(filterLog(rows, { period: 'day', now })).toHaveLength(2);
    expect(filterLog(rows, { period: 'week', now, doc: 'a' })).toHaveLength(1);
    expect(people(rows).map((p) => p.name)).toEqual([AGENT, 'Ion', 'Ana']);
    expect(people(rows)[0].agent).toBe(true);
  });
});

describe('presence and locks', () => {
  const now = Date.parse('2026-10-24T12:00:00Z');
  const file = (who, minAgo, extra = {}) => JSON.stringify({ ...presenceOf(who, { now: now - minAgo * 60000, ...extra }) });
  it('lists the other computers working now, not this one', () => {
    const { live } = readPeers({ 'presence-pc-ana.json': file(ana, 0, { doc: 'd1' }), 'presence-pc-ion.json': file(ion, 0) }, { self: 'pc-ion', now });
    expect(live.map((p) => p.who)).toEqual(['Ana']);
    expect(live[0].doc).toBe('d1');
  });
  it('a computer gone quiet leaves "working now", and later its locks lapse', () => {
    const quiet = PRESENCE_STALE_MS / 60000 + 1;
    let r = readPeers({ 'presence-pc-ana.json': file(ana, quiet, { locks: ['d1'] }) }, { now });
    expect(r.live).toEqual([]);
    expect(r.locks.d1.who).toBe('Ana');
    r = readPeers({ 'presence-pc-ana.json': file(ana, LOCK_STALE_MS / 60000 + 1, { locks: ['d1'] }) }, { now });
    expect(r.locks).toEqual({});
  });
  it('ignores unreadable presence files', () => {
    expect(readPeers({ 'presence-pc-x.json': '{nu', 'presence-pc-y.json': '{"who":"Y","time":"azi"}' }, { now }).live).toEqual([]);
  });
});

describe('merge of one document by paragraphs', () => {
  const base = '<p>Unu.</p><p>Doi.</p><p>Trei.</p>';
  it('splits top-level blocks, nested tags included', () => {
    expect(splitBlocks('<p>a<br>b</p><ul><li><p>x</p></li></ul><!-- c --><hr><p>z</p>')).toEqual(['<p>a<br>b</p>', '<ul><li><p>x</p></li></ul>', '<!-- c --><hr>', '<p>z</p>']);
    expect(splitBlocks('')).toEqual([]);
  });
  it('different paragraphs changed on two computers: both kept', () => {
    const mine = '<p>Unu, aici.</p><p>Doi.</p><p>Trei.</p>';
    const theirs = '<p>Unu.</p><p>Doi.</p><p>Trei, acolo.</p>';
    expect(mergeDoc(base, mine, theirs)).toEqual({ html: '<p>Unu, aici.</p><p>Doi.</p><p>Trei, acolo.</p>', conflicts: 0 });
  });
  it('paragraphs added and deleted on either side', () => {
    const mine = '<p>Zero.</p><p>Unu.</p><p>Doi.</p><p>Trei.</p>';
    const theirs = '<p>Unu.</p><p>Trei.</p><p>Patru.</p>';
    expect(mergeDoc(base, mine, theirs)).toEqual({ html: '<p>Zero.</p><p>Unu.</p><p>Trei.</p><p>Patru.</p>', conflicts: 0 });
  });
  it('the same paragraph changed differently: this computer wins, a conflict is counted', () => {
    const r = mergeDoc(base, '<p>Unu.</p><p>Doi A.</p><p>Trei.</p>', '<p>Unu.</p><p>Doi B.</p><p>Trei, acolo.</p>');
    expect(r).toEqual({ html: '<p>Unu.</p><p>Doi A.</p><p>Trei, acolo.</p>', conflicts: 1 });
  });
  it('the same change on both sides is not a conflict', () => {
    const both = '<p>Unu.</p><p>Doi!</p><p>Trei.</p>';
    expect(mergeDoc(base, both, both)).toEqual({ html: both, conflicts: 0 });
    expect(mergeDoc(base, `${both}<p>Patru.</p>`, both).conflicts).toBe(0);
  });
});

describe('pullExternalDocs with the merge', () => {
  const api = (disk) => {
    const snaps = [];
    return { snaps, readDoc: async () => disk, takeSnapshot: async (_d, id, label) => snaps.push([id, label]) };
  };
  const base = '<p>Unu.</p><p>Doi.</p>';
  it('merges local edits with the arriving version, no snapshot', async () => {
    const a = api('<p>Unu.</p><p>Doi, acolo.</p>');
    const r = await pullExternalDocs({ api: a, dir: 'x', ids: ['d'], hasLocal: () => true, localHtml: () => '<p>Unu, aici.</p><p>Doi.</p>', baseHtml: () => base, merge: mergeDoc, label: 'L' });
    expect(r.merged).toEqual({ d: '<p>Unu, aici.</p><p>Doi, acolo.</p>' });
    expect(r.conflicts).toEqual([]);
    expect(r.theirs.d).toBe('<p>Unu.</p><p>Doi, acolo.</p>');
    expect(a.snaps).toEqual([]);
  });
  it('a clash keeps their version as a snapshot and still merges the rest', async () => {
    const a = api('<p>Unu B.</p><p>Doi, acolo.</p>');
    const r = await pullExternalDocs({ api: a, dir: 'x', ids: ['d'], hasLocal: () => true, localHtml: () => '<p>Unu A.</p><p>Doi.</p>', baseHtml: () => base, merge: mergeDoc, label: 'L' });
    expect(r.merged).toEqual({ d: '<p>Unu A.</p><p>Doi, acolo.</p>' });
    expect(r.conflicts).toEqual(['d']);
    expect(a.snaps).toEqual([['d', 'L']]);
  });
  it('the base is taken before reading (a reader that records the base cannot hide their change)', async () => {
    const bases = new Map();
    const a = { readDoc: async () => { if (!bases.has('d')) bases.set('d', '<p>Al lor.</p>'); return '<p>Al lor.</p>'; }, takeSnapshot: async () => {} };
    const r = await pullExternalDocs({ api: a, dir: 'x', ids: ['d'], hasLocal: () => true, localHtml: () => '<p>Al meu.</p>', baseHtml: (id) => bases.get(id), merge: mergeDoc, label: 'L' });
    expect(r.conflicts).toEqual(['d']);
  });
  it('without a known base it falls back to the snapshot', async () => {
    const a = api('<p>Altceva.</p>');
    const r = await pullExternalDocs({ api: a, dir: 'x', ids: ['d'], hasLocal: () => true, localHtml: () => '<p>Al meu.</p>', baseHtml: () => undefined, merge: mergeDoc, label: 'L' });
    expect(r.merged).toEqual({});
    expect(r.conflicts).toEqual(['d']);
  });
});

describe('storage', () => {
  const tmp = [];
  afterEach(() => {
    for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  });
  const tempDir = () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'scribner-team-'));
    tmp.push(d);
    return d;
  };
  // The renderer's helpers over the main-process store.
  const desktop = (dir) => ({ teamFiles: async () => teamStore.teamFiles(dir), teamWrite: async (_d, n, t, o) => teamStore.teamWrite(dir, n, t, o) });

  it('desktop: one log and one presence file per computer in team/', async () => {
    const dir = tempDir();
    const api = desktop(dir);
    await appendLog(api, dir, ana, [logRow({ who: ana, doc: 'd1', chunks: [{ old: '', new: 'Text nou.' }] })]);
    await appendLog(api, dir, ana, [logRow({ who: ana, doc: 'd2', chunks: [{ old: 'x', new: '' }] })]);
    await appendLog(api, dir, ion, [logRow({ who: ion, doc: 'd1', chunks: [{ old: 'a', new: 'b' }] })]);
    await publishPresence(api, dir, ana, { doc: 'd1', locks: ['d2', 'd2'] });
    expect(fs.readdirSync(path.join(dir, 'team')).sort()).toEqual(['log-pc-ana.jsonl', 'log-pc-ion.jsonl', 'presence-pc-ana.json']);
    const files = await teamFiles(api, dir);
    expect(readLogs(files)).toHaveLength(3);
    expect(readPeers(files, { self: 'pc-ion' }).locks.d2.who).toBe('Ana');
    expect(JSON.parse(files['presence-pc-ana.json']).locks).toEqual(['d2']);
  });
  it('desktop: other files are neither read nor written', () => {
    const dir = tempDir();
    fs.mkdirSync(path.join(dir, 'team'));
    fs.writeFileSync(path.join(dir, 'team', 'notite.txt'), 'x');
    fs.writeFileSync(path.join(dir, 'team', 'log-pc-a (conflicted copy).jsonl'), 'x');
    expect(teamStore.teamFiles(dir)).toEqual({});
    expect(() => teamStore.teamWrite(dir, '../project.json', '{}')).toThrow(/invalid/);
    expect(() => teamStore.teamWrite(dir, 'log-a/b.jsonl', '')).toThrow(/invalid/);
    expect(teamStore.teamFiles(tempDir())).toEqual({});
  });
  it('desktop: a long log is read from its end, without a cut line', () => {
    const dir = tempDir();
    fs.mkdirSync(path.join(dir, 'team'));
    const line = JSON.stringify({ doc: 'd', who: 'Ana', time: '2026-10-24T10:00:00Z', sample: 'x'.repeat(900) });
    fs.writeFileSync(path.join(dir, 'team', 'log-pc-ana.jsonl'), `${line}\n`.repeat(5000));
    const rows = readLogs(teamStore.teamFiles(dir));
    expect(rows.length).toBeGreaterThan(3000);
    expect(rows.length).toBeLessThan(5000);
  });
  it('mock (demo) and web (browser store)', async () => {
    for (const api of [createMockApi(), createWebApi({ kv: createMemoryKv(), channel: null })]) {
      await appendLog(api, 'p', ana, [logRow({ who: ana, doc: 'd1', chunks: [{ old: '', new: 'a' }] })]);
      await appendLog(api, 'p', ana, [logRow({ who: ana, doc: 'd2', chunks: [{ old: '', new: 'b' }] })]);
      await publishPresence(api, 'p', ana, { doc: 'd1' });
      const files = await teamFiles(api, 'p');
      expect(readLogs(files).map((r) => r.doc)).toEqual(['d1', 'd2']);
      expect(readPeers(files).live[0].who).toBe('Ana');
    }
  });
  it('web folder project: files in the folder team/', async () => {
    const dir = tempDir();
    const handle = (p) => ({
      kind: 'directory',
      async getDirectoryHandle(name, { create } = {}) {
        const q = path.join(p, name);
        if (!fs.existsSync(q)) {
          if (!create) throw Object.assign(new Error('nf'), { name: 'NotFoundError' });
          fs.mkdirSync(q);
        }
        return handle(q);
      },
      async getFileHandle(name, { create } = {}) {
        const q = path.join(p, name);
        if (!fs.existsSync(q)) {
          if (!create) throw Object.assign(new Error('nf'), { name: 'NotFoundError' });
          fs.writeFileSync(q, '');
        }
        return {
          kind: 'file',
          getFile: async () => ({ text: async () => fs.readFileSync(q, 'utf8') }),
          createWritable: async () => {
            let buf = '';
            return { write: async (t) => { buf += t; }, close: async () => fs.writeFileSync(q, buf) };
          },
        };
      },
      async *entries() {
        for (const name of fs.readdirSync(p)) yield [name, fs.statSync(path.join(p, name)).isDirectory() ? await this.getDirectoryHandle(name) : { kind: 'file', ...(await this.getFileHandle(name)) }];
      },
    });
    const root = handle(dir);
    expect(await folderTeamFiles(root)).toEqual({});
    await folderTeamWrite(root, 'log-pc-ana.jsonl', 'a\n', true);
    await folderTeamWrite(root, 'log-pc-ana.jsonl', 'b\n', true);
    await folderTeamWrite(root, 'presence-pc-ana.json', '{}');
    expect(fs.readFileSync(path.join(dir, 'team', 'log-pc-ana.jsonl'), 'utf8')).toBe('a\nb\n');
    expect(Object.keys(await folderTeamFiles(root)).sort()).toEqual(['log-pc-ana.jsonl', 'presence-pc-ana.json']);
    await expect(folderTeamWrite(root, 'x.json', '')).rejects.toThrow(/invalid/);
  });
});

describe('MCP agent in a team project', () => {
  it('its writes go in the log as "agent"; team_activity shows the log and the people', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
    const store = require('../lib/store.cjs');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scribner-team-mcp-'));
    const dir = store.projectDirFor(tmp, 'Echipa');
    store.createProject(dir, 'Echipa', 'novel');
    const doc = store.loadProject(dir).tree[0].children.flatMap((n) => [n, ...(n.children || [])]).find((n) => n.type === 'text');
    teamStore.teamWrite(dir, 'presence-pc-ana.json', JSON.stringify(presenceOf(ana, { doc: doc.id })));
    const client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve('mcp/server.mjs'), '--project', dir], stderr: 'ignore' }));
    try {
      const call = async (name, args) => JSON.parse((await client.callTool({ name, arguments: args })).content[0].text);
      await client.callTool({ name: 'write_document', arguments: { id: doc.id, content: 'Text scris de agent.' } });
      const act = await call('team_activity', { project: dir });
      expect(act.working_now.map((p) => p.who)).toEqual(['Ana']);
      expect(act.locked).toEqual({});
      expect(act.changes.at(-1)).toMatchObject({ who: AGENT, doc: doc.id, machine: AGENT });
      expect(act.changes.at(-1).added).toBeGreaterThan(0);
      // a document Ana locked is not written by the agent
      teamStore.teamWrite(dir, 'presence-pc-ana.json', JSON.stringify(presenceOf(ana, { doc: doc.id, locks: [doc.id] })));
      const refused = await client.callTool({ name: 'write_document', arguments: { id: doc.id, content: 'Altceva.' } });
      expect(refused.isError).toBe(true);
      expect(refused.content[0].text).toMatch(/blocat de Ana/);
      expect(store.readDoc(dir, doc.id)).toContain('Text scris de agent');
    } finally {
      await client.close();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }, 30000);

  it('a project without team/ gets no team files from the agent', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
    const store = require('../lib/store.cjs');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scribner-team-mcp-'));
    const dir = store.projectDirFor(tmp, 'Singur');
    store.createProject(dir, 'Singur', 'novel');
    const doc = store.loadProject(dir).tree[0].children.flatMap((n) => [n, ...(n.children || [])]).find((n) => n.type === 'text');
    const client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve('mcp/server.mjs'), '--project', dir], stderr: 'ignore' }));
    try {
      await client.callTool({ name: 'write_document', arguments: { id: doc.id, content: 'Text.' } });
      expect(fs.existsSync(path.join(dir, 'team'))).toBe(false);
    } finally {
      await client.close();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }, 30000);
});

describe('clock skew and double locks', () => {
  it('a computer whose clock runs ahead is judged by this one\'s clock', async () => {
    const { seenTimes } = await import('../src/lib/team.js');
    const now = Date.parse('2026-10-24T12:00:00Z');
    const ahead = JSON.stringify(presenceOf(ana, { now: now + 3600e3, locks: ['d'] }));
    const seen = new Map();
    let r = readPeers(seenTimes({ 'presence-pc-ana.json': ahead }, seen, now), { now });
    expect(r.live.map((p) => p.who)).toEqual(['Ana']);
    expect(r.locks.d.who).toBe('Ana');
    // the same file, 3 minutes later and unchanged: gone quiet
    r = readPeers(seenTimes({ 'presence-pc-ana.json': ahead }, seen, now + 180e3), { now: now + 180e3 });
    expect(r.live).toEqual([]);
    // a computer running behind, but writing again: alive
    const behind1 = JSON.stringify(presenceOf(ion, { now: now - 3600e3 }));
    const behind2 = JSON.stringify(presenceOf(ion, { now: now - 3600e3 + 20e3 }));
    seenTimes({ 'presence-pc-ion.json': behind1 }, seen, now);
    r = readPeers(seenTimes({ 'presence-pc-ion.json': behind2 }, seen, now + 20e3), { now: now + 20e3 });
    expect(r.live.map((p) => p.who)).toEqual(['Ion']);
  });
  it('two computers lock the same document: the smaller machine id keeps it', async () => {
    const { lockFor } = await import('../src/lib/team.js');
    const anaLock = { who: 'Ana', machine: 'pc-ana' };
    const ionLock = { who: 'Ion', machine: 'pc-ion' };
    expect(lockFor({ d: ionLock }, ['d'], ana, 'd')).toBe(null); // Ana writes
    expect(lockFor({ d: anaLock }, ['d'], ion, 'd')).toBe(anaLock); // Ion reads, can unlock
    expect(lockFor({ d: anaLock }, [], ion, 'd')).toBe(anaLock);
    expect(lockFor({}, ['d'], ion, 'd')).toBe(null);
  });
  it('web: overlapping appends keep every row', async () => {
    const api = createWebApi({ kv: createMemoryKv(), channel: null });
    await Promise.all(Array.from({ length: 10 }, (_, i) => api.teamWrite('p', 'log-pc-ana.jsonl', `${i}\n`, { append: true })));
    expect((await api.teamFiles('p'))['log-pc-ana.jsonl'].split('\n').filter(Boolean).sort()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });
});
