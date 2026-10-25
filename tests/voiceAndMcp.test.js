import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
const require = createRequire(import.meta.url);
const mc = require('../lib/mcpConfig.cjs');
const { createTtsEngine } = require('../lib/ttsEngine.cjs');

describe('MCP command names no person and no book', () => {
  it('installed on Windows: cmd /c with %LOCALAPPDATA%, no project', () => {
    const env = { LOCALAPPDATA: 'C:\\Users\\Ana\\AppData\\Local' };
    const e = mc.serverEntry({ execPath: 'C:\\Users\\Ana\\AppData\\Local\\Programs\\Scribner\\Scribner.exe', serverPath: 'x', platform: 'win32', env, exists: () => true });
    expect(e).toEqual({ command: 'cmd', args: ['/c', '%LOCALAPPDATA%\\Programs\\Scribner\\scribner-mcp.cmd'] });
    const cmd = mc.claudeCodeCommand(e, { platform: 'win32' });
    expect(cmd).toBe('claude mcp add scribner --scope user -- cmd /c %LOCALAPPDATA%\\Programs\\Scribner\\scribner-mcp.cmd');
    expect(cmd).not.toMatch(/Ana|\.scribner/);
  });
});

describe('built-in reading voice', () => {
  it('is not installed until engine and voice are there; synth refuses before', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-'));
    const tts = createTtsEngine({ root, download: async () => {}, platform: 'win32' });
    expect(tts.status()).toMatchObject({ supported: true, installed: false });
    await expect(tts.synth('Bună')).rejects.toThrow(/nu e descărcată/);
    fs.mkdirSync(path.join(root, 'piper'), { recursive: true });
    fs.writeFileSync(path.join(root, 'piper', 'piper.exe'), '');
    fs.mkdirSync(path.join(root, 'voices'), { recursive: true });
    fs.writeFileSync(path.join(root, 'voices', 'ro_RO-mihai-medium.onnx'), 'x');
    fs.writeFileSync(path.join(root, 'voices', 'ro_RO-mihai-medium.onnx.json'), '{}');
    expect(tts.status().installed).toBe(true);
  });
  it('refuses a download that does not match the published fingerprint', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-'));
    const tts = createTtsEngine({ root, download: async (_u, file) => fs.writeFileSync(file, 'not piper'), platform: 'win32' });
    await expect(tts.install()).rejects.toThrow(/amprentei/);
    expect(fs.existsSync(path.join(root, 'piper.zip.part'))).toBe(false);
  });
});
