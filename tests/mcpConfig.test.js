// Connecting Scribner to Claude (MCP) from the app: config paths, merge, command line, and a
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
    expect(m.claudeDesktopConfigPath({ platform: 'win32', env: { APPDATA: 'C:\\Users\\Nume\\AppData\\Roaming' }, home: 'C:\\Users\\Nume' })).toBe('C:\\Users\\Nume\\AppData\\Roaming\\Claude\\claude_desktop_config.json');
    expect(m.claudeDesktopConfigPath({ platform: 'darwin', env: {}, home: '/Users/i' })).toBe('/Users/i/Library/Application Support/Claude/claude_desktop_config.json');
    expect(m.claudeDesktopConfigPath({ platform: 'linux', env: {}, home: '/home/i' })).toBe('/home/i/.config/Claude/claude_desktop_config.json');
  });
  it('păstrează celelalte servere și setări; refuză un fișier stricat', () => {
    const entry = m.serverEntry({ execPath: 'C:\\Program Files\\Scribner\\Scribner.exe', serverPath: 'C:\\Program Files\\Scribner\\resources\\app\\mcp\\server.mjs', projects: ['D:\\Cărți\\Drumul.scribner'] });
    const out = JSON.parse(m.mergeDesktopConfig('{"theme":"dark","mcpServers":{"altul":{"command":"x"}}}', entry));
    expect(out.theme).toBe('dark');
    expect(out.mcpServers.altul).toEqual({ command: 'x' });
    expect(out.mcpServers.scribner.env).toEqual({ ELECTRON_RUN_AS_NODE: '1' });
    expect(out.mcpServers.scribner.args).toEqual(['C:\\Program Files\\Scribner\\resources\\app\\mcp\\server.mjs', '--project', 'D:\\Cărți\\Drumul.scribner']);
    expect(JSON.parse(m.mergeDesktopConfig('', entry)).mcpServers.scribner.command).toContain('Scribner.exe');
    expect(() => m.mergeDesktopConfig('{nu e json', entry)).toThrow(/nu l-am modificat/);
  });
  it('comanda claude mcp add, cu spații și diacritice puse între ghilimele', () => {
    const entry = m.serverEntry({ execPath: 'C:\\Program Files\\Scribner\\Scribner.exe', serverPath: 'C:\\Program Files\\Scribner\\resources\\app\\mcp\\server.mjs', projects: ['D:\\Cărți\\Drumul.scribner'] });
    expect(m.claudeCodeCommand(entry, { platform: 'win32' })).toBe('claude mcp add scribner --scope user -e ELECTRON_RUN_AS_NODE=1 -- "C:\\Program Files\\Scribner\\Scribner.exe" "C:\\Program Files\\Scribner\\resources\\app\\mcp\\server.mjs" --project "D:\\Cărți\\Drumul.scribner"');
    expect(m.claudeCodeCommand(entry, { platform: 'linux' })).toContain("'C:\\Program Files\\Scribner\\Scribner.exe'");
  });
  it('scrie config-ul cu copie de siguranță, atomic', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-cfg-'));
    const file = path.join(dir, 'Claude', 'claude_desktop_config.json');
    const entry = m.serverEntry({ execPath: '/x/Scribner', serverPath: '/x/server.mjs', projects: ['/p'] });
    expect(m.writeClaudeDesktopConfig(entry, { file }).backup).toBeNull();
    const r = m.writeClaudeDesktopConfig({ ...entry, args: ['/y'] }, { file });
    expect(fs.existsSync(r.backup)).toBe(true);
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).mcpServers.scribner.args).toEqual(['/y']);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('mcpConfig — mai mulți clienți MCP', () => {
  const entry = m.serverEntry({ execPath: '/x/Scribner', serverPath: '/x/server.mjs', projects: ['/p'] });
  const winOpts = { platform: 'win32', env: { APPDATA: 'C:\\U\\A\\Roaming', LOCALAPPDATA: 'C:\\U\\A\\Local' }, home: 'C:\\U' };
  const nixOpts = { platform: 'linux', env: {}, home: '/home/i' };

  it('calea config-ului pentru fiecare client', () => {
    expect(m.clientConfigPath('cursor', nixOpts)).toBe('/home/i/.cursor/mcp.json');
    expect(m.clientConfigPath('gemini', nixOpts)).toBe('/home/i/.gemini/settings.json');
    expect(m.clientConfigPath('windsurf', nixOpts)).toBe('/home/i/.codeium/windsurf/mcp_config.json');
    expect(m.clientConfigPath('opencode', nixOpts)).toBe('/home/i/.config/opencode/opencode.json');
    expect(m.clientConfigPath('codex', nixOpts)).toBe('/home/i/.codex/config.toml');
    expect(m.clientConfigPath('vscode', nixOpts)).toBe('/home/i/.config/Code/User/mcp.json');
    expect(m.clientConfigPath('vscode', winOpts)).toBe('C:\\U\\A\\Roaming\\Code\\User\\mcp.json');
    expect(m.clientConfigPath('cursor', winOpts)).toBe('C:\\U\\.cursor\\mcp.json');
    expect(m.clientConfigPath('claudeCode', nixOpts)).toBeNull();
  });
  it('Cursor/Gemini/Windsurf folosesc cheia mcpServers; VS Code cheia servers', () => {
    expect(JSON.parse(m.mergeForClient('cursor', '', entry)).mcpServers.scribner.command).toBe('/x/Scribner');
    expect(JSON.parse(m.mergeForClient('gemini', '{"mcpServers":{"altul":{"command":"y"}}}', entry)).mcpServers.altul).toEqual({ command: 'y' });
    const vs = JSON.parse(m.mergeForClient('vscode', '', entry));
    expect(vs.servers.scribner.command).toBe('/x/Scribner');
    expect(vs.mcpServers).toBeUndefined();
  });
  it('OpenCode: command ca listă, type local', () => {
    const o = JSON.parse(m.mergeForClient('opencode', '', entry));
    expect(o.mcp.scribner).toMatchObject({ type: 'local', enabled: true });
    expect(o.mcp.scribner.command).toEqual(['/x/Scribner', '/x/server.mjs', '--project', '/p']);
  });
  it('Codex: tabel TOML [mcp_servers.scribner], înlocuiește-l pe cel vechi', () => {
    const out = m.mergeForClient('codex', '[other]\nx = 1\n[mcp_servers.scribner]\ncommand = "vechi"\n', entry);
    expect(out).toContain('[other]');
    expect(out).toContain('[mcp_servers.scribner]');
    expect(out).toContain('command = "/x/Scribner"');
    expect(out).toContain('args = ["/x/server.mjs", "--project", "/p"]');
    expect((out.match(/\[mcp_servers\.scribner\]/g) || []).length).toBe(1); // only one, the new one
    expect(out).not.toContain('vechi');
  });
  it('detectare: client instalat dacă folderul de config există', () => {
    const exists = (p) => p === '/home/i/.cursor' || p === '/home/i/.cursor/mcp.json';
    expect(m.clientDetected('cursor', { ...nixOpts, exists })).toBe(true);
    expect(m.clientDetected('gemini', { ...nixOpts, exists })).toBe(false);
    expect(m.clientDetected('claudeCode', nixOpts)).toBe(true); // command-only, mereu oferit
  });
  it('writeClientConfig scrie cu backup și e atomic', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-cli-'));
    const file = path.join(dir, '.cursor', 'mcp.json');
    expect(m.writeClientConfig('cursor', entry, { file }).backup).toBeNull();
    const r = m.writeClientConfig('cursor', { ...entry, args: ['/z'] }, { file });
    expect(fs.existsSync(r.backup)).toBe(true);
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).mcpServers.scribner.args).toEqual(['/z']);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it('registrul listează clienții principali', () => {
    const ids = m.MCP_CLIENTS.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['claudeDesktop', 'claudeCode', 'cursor', 'gemini', 'opencode', 'windsurf', 'vscode', 'codex']));
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
