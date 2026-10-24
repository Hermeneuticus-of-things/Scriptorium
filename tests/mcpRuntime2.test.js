// MCP server at runtime, second pass: read-only refusals, the shared project.json lock,
// snapshot before writes, agent-log entries, unicode titles and compile output.
import { describe, it, expect, afterAll } from 'vitest';
import { createRequire } from 'module';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('../lib/store.cjs');
const flatten = (tree) => { const out = []; store.walk(tree, (n) => out.push(n)); return out; };

const clients = [];
afterAll(async () => { for (const c of clients) await c.close().catch(() => {}); });

async function connect(dir, extra = []) {
  const client = new Client({ name: 'runtime2', version: '1.0.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve('mcp/server.mjs'), '--project', dir, ...extra], stderr: 'ignore' }));
  clients.push(client);
  return async (name, args = {}) => {
    const res = await client.callTool({ name, arguments: args });
    const t = res.content[0].text;
    if (res.isError) throw new Error(t);
    try { return JSON.parse(t); } catch { return t; }
  };
}
function makeProject(title = 'Carte') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-rt2-'));
  const dir = store.projectDirFor(tmp, title);
  store.createProject(dir, title);
  return dir;
}
const snapshotOf = (dir) => {
  const out = {};
  const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else out[path.relative(dir, p)] = fs.readFileSync(p, 'utf8'); } };
  walk(dir);
  return out;
};
const readLog = (dir) => { const f = path.join(dir, 'agent-log.jsonl'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []; };

describe('MCP runtime: read-only', () => {
  it('refuses every write and leaves the project byte-identical, with nothing logged', async () => {
    const dir = makeProject();
    const p = store.loadProject(dir);
    const docId = flatten(p.tree).find((n) => n.type === 'text')?.id;
    const before = snapshotOf(dir);
    const call = await connect(dir, ['--read-only']);
    const writes = [
      ['create_document', { title: 'X', content: 'x' }],
      ['set_project_info', { title: 'Nou' }],
      ['set_notes', { id: 'project', content: 'n' }],
      ['manage_label', { action: 'add', name: 'L' }],
      ['empty_trash', {}],
      ['backup_now', {}],
      ...(docId ? [['write_document', { id: docId, content: 'y' }], ['take_snapshot', { id: docId }], ['trash_item', { id: docId }]] : []),
    ];
    for (const [name, args] of writes) await expect(call(name, args), name).rejects.toThrow(/doar-citire|read-only/);
    expect(await call('project_info')).toBeTruthy();
    expect(snapshotOf(dir)).toEqual(before);
    expect(readLog(dir)).toEqual([]);
  }, 30000);
});

describe('MCP runtime: writes', () => {
  it('snapshot before write_document, log entries, unicode titles', async () => {
    const dir = makeProject('Ședință „nouă”');
    const call = await connect(dir);
    const title = 'Țară și „ghilimele” — 😀 «x»';
    const d = await call('create_document', { title, content: 'Început.' });
    await call('write_document', { id: d.id, content: 'Al doilea text, cu ș și ț.' });
    const snaps = await call('list_snapshots', { id: d.id });
    expect(snaps.length).toBe(1);
    const snapFile = fs.readdirSync(path.join(dir, 'snapshots', d.id)).find((f) => f.endsWith('.json'));
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'snapshots', d.id, snapFile), 'utf8')).html).toContain('Început');
    expect(store.readDoc(dir, d.id)).toContain('cu ș și ț');
    const node = flatten(store.loadProject(dir).tree).find((n) => n.id === d.id);
    expect(node.title).toBe(title);
    const binder = JSON.stringify(await call('list_binder'));
    expect(binder).toContain(title);
    const log = readLog(dir);
    expect(log.map((r) => r.tool)).toEqual(['create_document', 'write_document']);
    expect(log[0].input.title).toBe(title);
    for (const r of log) expect(Number.isNaN(Date.parse(r.date))).toBe(false);
  }, 30000);

  it('waits for the app lock and never loses the app change made under it', async () => {
    const dir = makeProject();
    const call = await connect(dir);
    const lock = path.join(dir, 'project.json.lock');
    fs.writeFileSync(lock, 'app-token');
    const pending = call('create_document', { title: 'Din agent', content: 'a' });
    await new Promise((r) => setTimeout(r, 300));
    // The "app" saves while it holds the lock, then releases it.
    const p = store.loadProject(dir);
    p.author = 'Autorul aplicației';
    store.saveProject(dir, p);
    fs.unlinkSync(lock);
    await pending;
    const after = store.loadProject(dir);
    expect(after.author).toBe('Autorul aplicației');
    expect(flatten(after.tree).some((n) => n.title === 'Din agent')).toBe(true);
  }, 30000);

  it('two agents writing at once both land', async () => {
    const dir = makeProject();
    const [a, b] = [await connect(dir), await connect(dir)];
    await Promise.all(Array.from({ length: 6 }, (_, i) => (i % 2 ? a : b)('create_document', { title: `Doc ${i}`, content: `t${i}` })));
    const titles = flatten(store.loadProject(dir).tree).map((n) => n.title);
    for (let i = 0; i < 6; i++) expect(titles).toContain(`Doc ${i}`);
    expect(fs.existsSync(path.join(dir, 'project.json.lock'))).toBe(false);
  }, 30000);

  it('compile writes next to the project (unicode title) and refuses paths inside it', async () => {
    const dir = makeProject('Țara „mea”: ce?');
    const call = await connect(dir);
    await call('create_document', { title: 'Capitol', content: 'Text compilat cu ș.' });
    const res = await call('compile', { format: 'html' });
    const out = String(res).replace(/^Compilat: /, '');
    expect(path.dirname(out)).toBe(path.dirname(dir));
    expect(path.basename(out)).not.toMatch(/[<>:"/\\|?*]/);
    expect(fs.readFileSync(out, 'utf8')).toContain('Text compilat cu ș.');
    await expect(call('compile', { format: 'txt', output_path: path.join(dir, 'x.txt') })).rejects.toThrow(/interiorul unui proiect/);
    await expect(call('compile', { format: 'nope' })).rejects.toThrow();
    const md = String(await call('compile', { format: 'md', output_path: path.join(path.dirname(dir), 'ieșire.md') }));
    expect(fs.readFileSync(md.replace(/^Compilat: /, ''), 'utf8')).toContain('Text compilat');
  }, 30000);

  it('invalid arguments give errors, not crashes, and the server keeps answering', async () => {
    const dir = makeProject();
    const call = await connect(dir);
    await expect(call('write_document', { id: '../../etc/passwd', content: 'x' })).rejects.toThrow();
    await expect(call('write_document', { content: 'x' })).rejects.toThrow();
    await expect(call('get_document', { id: 'nu-exista' })).rejects.toThrow();
    await expect(call('project_info', { project: 'alt-proiect' })).rejects.toThrow();
    expect(await call('project_info')).toBeTruthy();
    expect(readLog(dir)).toEqual([]);
  }, 30000);
});
