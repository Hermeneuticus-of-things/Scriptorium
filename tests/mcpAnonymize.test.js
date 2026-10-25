// --anonymize: private names, e-mails and phones reach the agent as tokens; tokens the agent writes
// back are stored as the real values (APPEND / PACK / HYDRATE on this computer).
import { describe, it, expect, afterAll } from 'vitest';
import { createRequire } from 'module';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('../lib/store.cjs');
const { buildFixture } = require('../mcp/eval/fixture.cjs');
const { createAnonymizer } = require('../lib/anonymize.cjs');

let client;
afterAll(() => client?.close().catch(() => {}));

describe('anonymizer', () => {
  it('packs names, e-mails and phones into stable tokens and hydrates them back', () => {
    const a = createAnonymizer(['Ilinca', 'Ana'], { emails: true, phones: true });
    const packed = a.pack('Ilinca scrie Anei? Ana: ana@ex.ro, 0722 123 456. Anastasia rămâne.');
    expect(packed).not.toMatch(/Ilinca|ana@ex\.ro|0722/);
    expect(packed).toContain('Anastasia'); // whole words only
    expect(a.pack('Ilinca')).toBe(a.pack('Ilinca'));
    expect(a.hydrate(packed)).toBe('Ilinca scrie Anei? Ana: ana@ex.ro, 0722 123 456. Anastasia rămâne.');
    // fiction: only the listed names, invented e-mails and phones stay
    expect(createAnonymizer(['Ana']).pack('Ana: ana@ex.ro, 0722 123 456')).toMatch(/^\$ENT:PERSON:[0-9a-f]{6}: ana@ex\.ro, 0722 123 456$/);
  });
});

describe('MCP --anonymize', () => {
  it('the agent never sees the private names, and its writes keep the real ones', async () => {
    const dir = buildFixture(fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-anon-')));
    fs.writeFileSync(path.join(dir, 'private-names.txt'), 'Ilinca\nMatei\n');
    client = new Client({ name: 'anon', version: '1.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve('mcp/server.mjs'), '--project', dir, '--anonymize'], stderr: 'ignore' }));
    const call = async (name, args = {}) => {
      const r = await client.callTool({ name, arguments: args });
      if (r.isError) throw new Error(r.content[0].text);
      return r.content[0].text;
    };
    const binder = JSON.parse(await call('list_binder'));
    const flat = [];
    const walk = (l) => (l || []).forEach((n) => { flat.push(n); walk(n.children); });
    walk(binder);
    const plecarea = flat.find((n) => n.title === 'Plecarea');
    const seen = await call('read_document', { id: plecarea.id });
    expect(seen).not.toContain('Ilinca');
    const token = /\$ENT:PERSON:[0-9a-f]{6}/.exec(seen)[0];
    await call('write_document', { id: plecarea.id, content: `${token} ajunge la cabană.` });
    expect(store.readDoc(dir, plecarea.id)).toContain('Ilinca ajunge la cabană.');
  });
});
