// Connecting Pneuma Sofer to Claude (MCP) from the app: config paths, merge, command line, and a
// real run of the server through electron with ELECTRON_RUN_AS_NODE (no Node.js needed on Windows).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
const require = createRequire(import.meta.url);
const m = require('../lib/mcpConfig.cjs');
const store = require('../lib/store.cjs');

describe('mcpConfig', () => {
  it('calea config-ului Claude Desktop pe fiecare sistem', () => {
    expect(m.claudeDesktopConfigPath({ platform: 'win32', env: { APPDATA: 'C:\\Users\\Ionut\\AppData\\Roaming' }, home: 'C:\\Users\\Ionut' })).toBe('C:\\Users\\Ionut\\AppData\\Roaming\\Claude\\claude_desktop_config.json');
    expect(m.claudeDesktopConfigPath({ platform: 'darwin', env: {}, home: '/Users/i' })).toBe('/Users/i/Library/Application Support/Claude/claude_desktop_config.json');
    expect(m.claudeDesktopConfigPath({ platform: 'linux', env: {}, home: '/home/i' })).toBe('/home/i/.config/Claude/claude_desktop_config.json');
  });
  it('păstrează celelalte servere și setări; refuză un fișier stricat', () => {
    const entry = m.serverEntry({ execPath: 'C:\\Program Files\\Pneuma Sofer\\Pneuma Sofer.exe', serverPath: 'C:\\Program Files\\Pneuma Sofer\\resources\\app\\mcp\\server.mjs', projects: ['D:\\Cărți\\Karma.scribner'] });
    const out = JSON.parse(m.mergeDesktopConfig('{"theme":"dark","mcpServers":{"altul":{"command":"x"}}}', entry));
    expect(out.theme).toBe('dark');
    expect(out.mcpServers.altul).toEqual({ command: 'x' });
    expect(out.mcpServers['pneuma-sofer'].env).toEqual({ ELECTRON_RUN_AS_NODE: '1' });
    expect(out.mcpServers['pneuma-sofer'].args).toEqual(['C:\\Program Files\\Pneuma Sofer\\resources\\app\\mcp\\server.mjs', '--project', 'D:\\Cărți\\Karma.scribner']);
    expect(JSON.parse(m.mergeDesktopConfig('', entry)).mcpServers['pneuma-sofer'].command).toContain('Pneuma Sofer.exe');
    expect(() => m.mergeDesktopConfig('{nu e json', entry)).toThrow(/nu l-am modificat/);
  });
  it('comanda claude mcp add, cu spații și diacritice puse între ghilimele', () => {
    const entry = m.serverEntry({ execPath: 'C:\\Program Files\\Pneuma Sofer\\Pneuma Sofer.exe', serverPath: 'C:\\Program Files\\Pneuma Sofer\\resources\\app\\mcp\\server.mjs', projects: ['D:\\Cărți\\Karma.scribner'] });
    expect(m.claudeCodeCommand(entry, { platform: 'win32' })).toBe('claude mcp add pneuma-sofer --scope user -e ELECTRON_RUN_AS_NODE=1 -- "C:\\Program Files\\Pneuma Sofer\\Pneuma Sofer.exe" "C:\\Program Files\\Pneuma Sofer\\resources\\app\\mcp\\server.mjs" --project "D:\\Cărți\\Karma.scribner"');
    expect(m.claudeCodeCommand(entry, { platform: 'linux' })).toContain("'C:\\Program Files\\Pneuma Sofer\\Pneuma Sofer.exe'");
  });
  it('scrie config-ul cu copie de siguranță, atomic', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-cfg-'));
    const file = path.join(dir, 'Claude', 'claude_desktop_config.json');
    const entry = m.serverEntry({ execPath: '/x/Pneuma Sofer', serverPath: '/x/server.mjs', projects: ['/p'] });
    expect(m.writeClaudeDesktopConfig(entry, { file }).backup).toBeNull();
    const r = m.writeClaudeDesktopConfig({ ...entry, args: ['/y'] }, { file });
    expect(fs.existsSync(r.backup)).toBe(true);
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).mcpServers['pneuma-sofer'].args).toEqual(['/y']);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('serverul MCP pornit prin electron ca Node (cum îl pornește Claude)', () => {
  it('răspunde la initialize și listează uneltele', async () => {
    const electron = require('electron'); // path of the electron binary in node_modules
    const proj = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-proj-')), 'Carte.scribner');
    store.createProject(proj, 'Carte');
    const entry = m.serverEntry({ execPath: electron, serverPath: path.resolve('mcp/server.mjs'), projects: [proj] });
    const child = spawn(entry.command, entry.args, { env: { ...process.env, ...entry.env }, stdio: ['pipe', 'pipe', 'pipe'] });
    let buf = '';
    const replies = [];
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (line) replies.push(JSON.parse(line));
      }
    });
    const send = (o) => child.stdin.write(`${JSON.stringify(o)}\n`);
    const wait = async (id) => {
      for (let t = 0; t < 300; t++) {
        const r = replies.find((x) => x.id === id);
        if (r) return r;
        await new Promise((res) => setTimeout(res, 50));
      }
      throw new Error(`fără răspuns la ${id}`);
    };
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } } });
    expect((await wait(1)).result.serverInfo.name).toBeTruthy();
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const tools = (await wait(2)).result.tools;
    expect(tools.length).toBeGreaterThan(50);
    child.kill();
  }, 30000);
});
