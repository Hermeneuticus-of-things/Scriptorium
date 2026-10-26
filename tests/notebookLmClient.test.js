import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const client = require('../lib/notebookLmClient.cjs');

describe('notebooklm server discovery', () => {
  const entry = { command: 'notebooklm-mcp.exe', args: [], env: { PYTHONIOENCODING: 'utf-8' }, type: 'stdio' };

  it('finds a top-level mcpServers entry', () => {
    const readJson = (f) => (f === 'a.json' ? { mcpServers: { 'notebooklm-mcp': entry } } : null);
    const hit = client.discoverServerEntry({ paths: ['a.json'], readJson });
    expect(hit).toMatchObject({ command: 'notebooklm-mcp.exe', env: { PYTHONIOENCODING: 'utf-8' }, source: 'a.json' });
  });

  it('finds an entry nested under projects.*', () => {
    const readJson = () => ({ projects: { 'C:/p': { mcpServers: { 'notebooklm-mcp': entry } } } });
    expect(client.discoverServerEntry({ paths: ['x'], readJson })).toMatchObject({ command: 'notebooklm-mcp.exe' });
  });

  it('respects a custom server name', () => {
    const readJson = () => ({ mcpServers: { nlm: { ...entry } } });
    expect(client.discoverServerEntry({ name: 'nlm', paths: ['x'], readJson })).toMatchObject({ command: 'notebooklm-mcp.exe' });
    expect(client.discoverServerEntry({ name: 'notebooklm-mcp', paths: ['x'], readJson })).toBeNull();
  });

  it('skips non-stdio (http/sse) entries and reports unavailable', () => {
    const readJson = () => ({ mcpServers: { 'notebooklm-mcp': { type: 'sse', url: 'https://x' } } });
    expect(client.discoverServerEntry({ paths: ['x'], readJson })).toBeNull();
    expect(client.isAvailable({ paths: ['x'], readJson })).toBe(false);
  });

  it('returns null and is unavailable when nothing matches', () => {
    expect(client.discoverServerEntry({ paths: ['x'], readJson: () => null })).toBeNull();
    expect(client.isAvailable({ paths: ['x'], readJson: () => ({ mcpServers: { other: { command: 'x' } } }) })).toBe(false);
  });

  it('reads config files most-specific first', () => {
    const readJson = (f) => (f === 'first' ? { mcpServers: { 'notebooklm-mcp': { command: 'A', args: [] } } } : { mcpServers: { 'notebooklm-mcp': { command: 'B', args: [] } } });
    expect(client.discoverServerEntry({ paths: ['first', 'second'], readJson }).command).toBe('A');
  });
});

describe('parseToolResult', () => {
  it('parses JSON text payloads', () => {
    expect(client.parseToolResult({ content: [{ type: 'text', text: '{"answer":"da","references":[]}' }] })).toEqual({ answer: 'da', references: [] });
  });
  it('returns plain text when not JSON', () => {
    expect(client.parseToolResult({ content: [{ type: 'text', text: 'hello' }] })).toBe('hello');
  });
  it('throws on isError results', () => {
    expect(() => client.parseToolResult({ isError: true, content: [{ type: 'text', text: 'boom' }] })).toThrow('boom');
  });
  it('returns null for empty', () => {
    expect(client.parseToolResult(null)).toBeNull();
  });
});

describe('createClient (injected sdk, no real process)', () => {
  it('connects, calls a tool (parsed), and closes', async () => {
    const calls = [];
    let closed = false;
    const fakeSdk = {
      Client: class {
        async connect() { calls.push('connect'); }
        async callTool(req) { calls.push(['callTool', req.name, req.arguments]); return { content: [{ type: 'text', text: '{"ok":true}' }] }; }
        async close() { closed = true; }
      },
      StdioClientTransport: class { constructor(o) { this.o = o; } },
    };
    const conn = await client.createClient({ entry: { command: 'x', args: ['--y'], env: { A: '1' } }, importSdk: async () => fakeSdk, env: { PATH: '/bin' } });
    const res = await conn.callTool('chat_start', { notebook: 'N' });
    expect(res).toEqual({ ok: true });
    await conn.close();
    expect(calls[0]).toBe('connect');
    expect(calls[1]).toEqual(['callTool', 'chat_start', { notebook: 'N' }]);
    expect(closed).toBe(true);
  });

  it('throws without a server entry', async () => {
    await expect(client.createClient({ entry: null })).rejects.toThrow();
  });
});
