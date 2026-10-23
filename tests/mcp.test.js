import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('../lib/store.cjs');

let tmp;
let dir;
let client;
const call = async (name, args = {}) => {
  const res = await client.callTool({ name, arguments: args });
  const t = res.content[0].text;
  if (res.isError) throw new Error(t);
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
};

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-'));
  dir = store.projectDirFor(tmp, 'Karma');
  store.createProject(dir, 'Karma', 'novel');
  client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(
    new StdioClientTransport({ command: process.execPath, args: [path.resolve('mcp/server.mjs'), '--project', dir], stderr: 'ignore' }),
  );
}, 30000);

afterAll(async () => {
  await client?.close();
});

describe('Scribner MCP server', () => {
  it('lists the tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(
      expect.arrayContaining(['project_info', 'list_binder', 'read_document', 'write_document', 'create_document', 'move_item', 'set_metadata', 'trash_item', 'search', 'replace', 'get_notes', 'set_notes', 'add_comment', 'add_footnote', 'lint', 'list_snapshots', 'take_snapshot', 'restore_snapshot', 'compile', 'writing_history']),
    );
  });

  it('reads, writes (with snapshot and log), comments, lints and compiles', async () => {
    const info = await call('project_info');
    expect(info.title).toBe('Karma');
    const binder = await call('list_binder');
    const ch1 = binder[0].children[0];
    expect(ch1.title).toBe('Capitolul 1');

    const created = await call('create_document', { title: 'Sub 1.2', parent_id: ch1.id, content: 'Karma nu este o pedeapsă, ci un mecanism (cauzal).\n\nA doua frază.' });
    expect(created.path).toBe('Manuscris / Capitolul 1 / Sub 1.2');

    const doc = await call('read_document', { id: created.id });
    expect(doc.content).toBe('Karma nu este o pedeapsă, ci un mecanism (cauzal).\n\nA doua frază.');

    const issues = await call('lint', { id: created.id, severity: 'GRAVE' });
    expect(issues[0].issues.map((i) => i.round)).toEqual(expect.arrayContaining(['R3', 'R11']));

    await call('add_comment', { id: created.id, quote: 'A doua frază', comment: 'Verifică' });
    const msg = await call('write_document', { id: created.id, content: 'Karma lucrează ca mecanism cauzal.\n\nA doua frază, rescrisă.' });
    expect(msg).toContain('Snapshot salvat');
    const html = store.readDoc(dir, created.id);
    expect(html).toContain('<p>Karma lucrează ca mecanism cauzal.</p>');
    expect(html).toContain('data-comment="Verifică"');
    expect((await call('list_snapshots', { id: created.id })).length).toBe(2);

    await call('add_footnote', { id: created.id, after_quote: 'cauzal', note: 'Tattvārtha 8.1' });
    await call('set_metadata', { id: created.id, status: 'Revizuit', keywords: ['karman'], synopsis: 'Mecanismul.' });
    const after = await call('read_document', { id: created.id });
    expect(after.status).toBe('Revizuit');
    expect(after.content).toContain('[^Tattvārtha 8.1]');

    const found = await call('search', { query: 'mecanism' });
    expect(found.map((f) => f.id)).toContain(created.id);
    expect(await call('replace', { query: 'rescrisă', replacement: 'reformulată' })).toMatch(/^1 înlocuiri/);

    await call('set_notes', { id: 'project', content: 'Plan: 8 capitole.' });
    expect(await call('get_notes', { id: 'project' })).toBe('Plan: 8 capitole.');

    const out = path.join(tmp, 'carte.docx');
    expect(await call('compile', { format: 'docx', output_path: out })).toContain(out);
    expect(fs.statSync(out).size).toBeGreaterThan(1000);

    const log = fs.readFileSync(path.join(dir, 'agent-log.jsonl'), 'utf8').trim().split('\n');
    expect(log.length).toBeGreaterThanOrEqual(7);
    expect(JSON.parse(log[0]).tool).toBe('create_document');
  }, 30000);

  it('reports errors without crashing and exposes resources', async () => {
    await expect(call('read_document', { id: 'nu-exista' })).rejects.toThrow('Element inexistent');
    const { resources } = await client.listResources();
    expect(resources.some((r) => r.uri === 'scribner://binder')).toBe(true);
    const binder = await client.readResource({ uri: 'scribner://binder' });
    expect(JSON.parse(binder.contents[0].text)[0].title).toBe('Manuscris');
  });
});
