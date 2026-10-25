// The MCP server over Streamable HTTP (--http): a bearer token is required, and the same
// initialize / tools/list / tools/call exchange works as over stdio.
import { describe, it, expect, afterAll } from 'vitest';
import { createRequire } from 'module';
import { spawn } from 'child_process';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildFixture } = require('../mcp/eval/fixture.cjs');

let proc;
afterAll(() => proc?.kill());

describe('MCP over HTTP', () => {
  it('refuses without the token and answers with it', async () => {
    const dir = buildFixture(fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-http-')));
    const port = 9300 + Math.floor(Math.random() * 500);
    proc = spawn(process.execPath, [path.resolve('mcp/server.mjs'), '--project', dir, '--read-only', '--http', String(port)], { env: { ...process.env, SCRIBNER_MCP_TOKEN: 'tok-test' }, stdio: ['ignore', 'ignore', 'pipe'] });
    await new Promise((resolve) => proc.stderr.on('data', (d) => /pe http/.test(String(d)) && resolve()));
    const post = (body, token) => fetch(`http://127.0.0.1:${port}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    expect((await post({ jsonrpc: '2.0', id: 1, method: 'tools/list' })).status).toBe(401);
    expect((await post({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, 'gresit')).status).toBe(401);
    const init = await (await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } }, 'tok-test')).json();
    expect(init.result.serverInfo.name).toBe('scribner');
    const list = await (await post({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, 'tok-test')).json();
    expect(list.result.tools.find((t) => t.name === 'read_document').annotations.readOnlyHint).toBe(true);
    const call = await (await post({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'project_info', arguments: {} } }, 'tok-test')).json();
    expect(call.result.content[0].text).toContain('Drumul spre munte');
    const guide = await (await post({ jsonrpc: '2.0', id: 4, method: 'resources/read', params: { uri: 'scribner://ghid' } }, 'tok-test')).json();
    expect(guide.result.contents[0].text).toContain('snapshot');
  });
});
