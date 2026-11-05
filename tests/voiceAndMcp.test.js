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
    const e = mc.serverEntry({ execPath: 'C:\\Users\\Ana\\AppData\\Local\\Programs\\Pneuma Sofer\\Pneuma Sofer.exe', serverPath: 'x', platform: 'win32', env, exists: () => true });
    expect(e).toEqual({ command: 'cmd', args: ['/c', '%LOCALAPPDATA%\\Programs\\Pneuma Sofer\\pneuma-mcp.cmd'] });
    const cmd = mc.claudeCodeCommand(e, { platform: 'win32' });
    expect(cmd).toBe('claude mcp add pneuma --scope user -- cmd /c "%LOCALAPPDATA%\\Programs\\Pneuma Sofer\\pneuma-mcp.cmd"');
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
  it('pins the Mihai voice and its config by SHA-256 (Z6-1)', () => {
    const { VOICE } = require('../lib/ttsEngine.cjs');
    expect(VOICE.sha256).toBe('e0608bbbd53c80267c09ece681b09f5199f54e792356684c8073738e5f15d29f');
    expect(VOICE.configSha256).toBe('8cc0c9f077dc0cec3c25a6a055ec8046db8e40a2510591582f2c9c869f4bc47e');
  });
  it('refuses a voice of the right size whose fingerprint does not match; nothing is installed', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-'));
    fs.mkdirSync(path.join(root, 'piper'), { recursive: true });
    fs.writeFileSync(path.join(root, 'piper', 'piper.exe'), '');
    const tts = createTtsEngine({
      root,
      platform: 'win32',
      download: async (_u, file) => {
        fs.writeFileSync(file, '');
        fs.truncateSync(file, 40 * 1024 * 1024); // in size range, wrong bytes
      },
    });
    await expect(tts.install()).rejects.toThrow(/Vocea desc\S+ nu corespunde amprentei/);
    const voices = path.join(root, 'voices');
    expect(fs.existsSync(path.join(voices, 'ro_RO-mihai-medium.onnx'))).toBe(false);
    expect(fs.existsSync(path.join(voices, 'ro_RO-mihai-medium.onnx.part'))).toBe(false);
    expect(fs.existsSync(path.join(voices, 'ro_RO-mihai-medium.onnx.json'))).toBe(false);
    expect(tts.status().installed).toBe(false);
  });
});
