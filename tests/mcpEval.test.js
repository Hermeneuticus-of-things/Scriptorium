// The evaluation set (mcp/eval/evaluation.xml) is answerable from the fixture book with read-only
// tools: each answer is found here the way an agent would find it.
import { describe, it, expect, afterAll } from 'vitest';
import { createRequire } from 'module';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildFixture } = require('../mcp/eval/fixture.cjs');

let client;
afterAll(() => client?.close().catch(() => {}));

describe('MCP evaluation set', () => {
  it('every answer is reachable with read-only tools', async () => {
    const dir = buildFixture(fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-eval-')));
    client = new Client({ name: 'eval', version: '1.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve('mcp/server.mjs'), '--project', dir, '--read-only'], stderr: 'ignore' }));
    const call = async (name, args = {}) => {
      const r = await client.callTool({ name, arguments: args });
      if (r.isError) throw new Error(r.content[0].text);
      try { return JSON.parse(r.content[0].text); } catch { return r.content[0].text; }
    };
    const xml = fs.readFileSync(path.resolve('mcp/eval/evaluation.xml'), 'utf8');
    const answers = [...xml.matchAll(/<answer>(.*?)<\/answer>/g)].map((m) => m[1]);
    expect(answers).toHaveLength(10);
    const flat = [];
    const walk = (list, parent) => (list || []).forEach((n) => { flat.push({ ...n, parent }); walk(n.children, n.title); });
    walk(await call('list_binder'));
    const byTitle = (t) => flat.find((n) => n.title === t);
    const doc = (t, format) => call('read_document', { id: byTitle(t).id, ...(format ? { format } : {}) });
    const docs = await Promise.all(['Plecarea', 'Amintirea', 'Cabana', 'Lacul'].map((t) => doc(t)));
    expect((await doc('Plecarea')).content).toContain(answers[0]);
    expect((await doc('Plecarea')).content).toContain(answers[1]);
    expect(String(docs.filter((d) => d.label === 'Acțiune').length)).toBe(answers[2]);
    expect(docs.find((d) => d.label === 'Flashback').title).toBe(answers[3]);
    const lac = JSON.stringify(await doc('Lacul', 'html'));
    expect(lac).toContain(answers[4]);
    expect(lac).toContain(answers[5]);
    expect((await doc('Personaje')).content).toContain(`${answers[6]} de ani`);
    expect(String(docs.find((d) => d.status === 'De făcut').target.value)).toBe(answers[7]);
    expect(String(docs.filter((d) => d.keywords.includes('busola')).length)).toBe(answers[8]);
    expect(byTitle('Cabana').parent).toBe(answers[9]);
  });
});
