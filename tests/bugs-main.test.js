import { describe, it, expect, afterAll } from 'vitest';
import { createRequire } from 'module';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const store = require('../lib/store.cjs');
const folderSync = require('../lib/folderSync.cjs');

const sha1 = (s) => crypto.createHash('sha1').update(String(s)).digest('hex');
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bugs-main-'));

describe('folderSync: manifest paths cannot escape the sync folder', () => {
  const project = { title: 'P', tree: [{ id: 'draft', root: 'draft', type: 'folder', children: [{ id: 'a1', type: 'text', title: 'A' }] }] };

  it('syncOut does not delete files outside the folder listed in a crafted manifest', () => {
    const root = tmpDir();
    const folder = path.join(root, 'sync');
    fs.mkdirSync(folder);
    const victim = path.join(root, 'victim.txt');
    fs.writeFileSync(victim, 'precious');
    fs.writeFileSync(path.join(folder, folderSync.MANIFEST), JSON.stringify({ files: { x: { file: '../victim.txt', hash: sha1('precious') } } }));
    folderSync.syncOut(project, folder, () => '<p>a</p>', { format: 'txt' });
    expect(fs.existsSync(victim)).toBe(true);
  });

  it('syncIn ignores manifest entries that point outside the folder', () => {
    const root = tmpDir();
    const folder = path.join(root, 'sync');
    fs.mkdirSync(folder);
    fs.writeFileSync(path.join(root, 'secret.txt'), 'secret');
    fs.writeFileSync(path.join(folder, folderSync.MANIFEST), JSON.stringify({ files: { a1: { file: '../secret.txt', hash: 'x', docHash: sha1('') } } }));
    const writes = [];
    const res = folderSync.syncIn(project, folder, () => '', (id, html) => writes.push(html));
    expect(writes).toEqual([]);
    expect(res.updates).toEqual([]);
  });
});

describe('MCP create_document after_id', () => {
  let client;
  afterAll(async () => {
    await client?.close();
  });

  it('places the new item after a folder, not inside it', async () => {
    const dir = store.projectDirFor(tmpDir(), 'M');
    store.createProject(dir, 'M', 'blank');
    const pj = store.loadProject(dir);
    const ch = store.newNode('folder', 'Cap 1');
    pj.tree[0].children.push(ch);
    store.saveProject(dir, pj);
    client = new Client({ name: 't', version: '1.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve('mcp/server.mjs'), '--project', dir], stderr: 'ignore' }));
    const res = await client.callTool({ name: 'create_document', arguments: { title: 'Cap 2', type: 'folder', after_id: ch.id } });
    expect(res.isError).toBeFalsy();
    const draft = store.loadProject(dir).tree[0].children;
    expect(draft.map((n) => n.title).slice(-2)).toEqual(['Cap 1', 'Cap 2']);
    expect(draft.find((n) => n.id === ch.id).children).toEqual([]);
  }, 30000);
});

describe('addSnapshot with an invalid date', () => {
  it('keeps the snapshot instead of throwing', () => {
    const os = require('os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snapdate-'));
    const dir = store.projectDirFor(tmp, 'Snap');
    store.createProject(dir, 'Snap', 'blank');
    expect(() => store.addSnapshot(dir, 'abc', { name: 'Vechi', date: 'nu e o dată', html: '<p>x</p>' })).not.toThrow();
    expect(store.listSnapshots(dir, 'abc')[0].name).toBe('Vechi');
  });
});
