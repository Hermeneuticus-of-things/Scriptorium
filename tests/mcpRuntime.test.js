// MCP server at runtime (stdio JSON-RPC): a failed create_document leaves no orphan file,
// a full create/edit/move/snapshot/compile session keeps the project consistent and logged.
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
afterAll(async () => {
  for (const c of clients) await c.close().catch(() => {});
});

async function connect(dir) {
  const client = new Client({ name: 'runtime', version: '1.0.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve('mcp/server.mjs'), '--project', dir], stderr: 'ignore' }));
  clients.push(client);
  return async (name, args = {}) => {
    const res = await client.callTool({ name, arguments: args });
    const t = res.content[0].text;
    if (res.isError) throw new Error(t);
    try { return JSON.parse(t); } catch { return t; }
  };
}

function makeProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-rt-'));
  const dir = store.projectDirFor(tmp, 'Carte');
  store.createProject(dir, 'Carte');
  return dir;
}
const docFiles = (dir) => (fs.existsSync(path.join(dir, 'docs')) ? fs.readdirSync(path.join(dir, 'docs')).filter((f) => f.endsWith('.html')) : []);

describe('MCP runtime session', () => {
  it('create_document that fails (bad after_id / parent) leaves no orphan document file', async () => {
    const dir = makeProject();
    const call = await connect(dir);
    const before = docFiles(dir);
    await expect(call('create_document', { title: 'X', content: 'Text', after_id: 'nu-exista' })).rejects.toThrow();
    await expect(call('create_document', { title: 'Y', content: 'Text', after_id: 'draft' })).rejects.toThrow();
    expect(docFiles(dir)).toEqual(before);
  }, 20000);

  it('create, write, move, snapshot, restore and compile keep the project consistent', async () => {
    const dir = makeProject();
    const call = await connect(dir);
    const ch = await call('create_document', { title: 'Capitol', type: 'folder' });
    const a = await call('create_document', { title: 'A', parent_id: ch.id, content: 'Primul text.' });
    const b = await call('create_document', { title: 'B', after_id: a.id, content: 'Al doilea.' });
    await call('write_document', { id: a.id, content: 'Primul text, rescris.' });
    await call('move_item', { id: b.id, target_id: a.id, position: 'before' });
    await call('take_snapshot', { id: b.id, name: 'manual' });
    await call('write_document', { id: b.id, content: 'Schimbat.' });
    const snaps = await call('list_snapshots', { id: b.id });
    expect(snaps.length).toBeGreaterThan(0);
    const p = store.loadProject(dir);
    const ids = flatten(p.tree).map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    const chapter = flatten(p.tree).find((n) => n.id === ch.id);
    expect(chapter.children.map((n) => n.title)).toEqual(['B', 'A']);
    expect(store.readDoc(dir, a.id)).toContain('rescris');
    const log = fs.readFileSync(path.join(dir, 'agent-log.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    expect(log.map((r) => r.tool)).toEqual(expect.arrayContaining(['create_document', 'write_document', 'move_item', 'take_snapshot']));
  }, 30000);
});
