// Regression: MCP server reads the author's data from the pre-rename "Scribner" folder when the
// new-name folder has no settings.json (the same fallback the app pins in main.cjs). Found on the
// installed 0.13.0: the server exited "Niciun proiect" even though the recents list had projects.
import { describe, it, expect, afterEach } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const SERVER = path.resolve('mcp/server.mjs');
const dirs = [];
afterEach(() => { for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });
const tempDir = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pneuma-mcp-ud-')); dirs.push(d); return d; };

const talk = async (env) => new Promise((resolve) => {
  // XDG_CONFIG_HOME too: on Linux the server reads the config dir from it, not from APPDATA.
  const p = spawn(process.execPath, [SERVER], { env: { ...process.env, XDG_CONFIG_HOME: env.APPDATA, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  let out = '';
  let err = '';
  let code = null;
  p.stdout.on('data', (c) => {
    out += c;
    if (out.includes('"pneuma"')) { p.kill(); resolve({ ok: true, out }); }
  });
  p.stderr.on('data', (c) => { err += c; });
  p.on('exit', (c) => { code = c; resolve({ ok: false, code, err: err.slice(-200) }); });
  setTimeout(() => { if (code === null) { p.kill(); resolve({ ok: false, err: 'timeout', out }); } }, 8000);
  p.stdin.write('{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}\n');
});

describe('MCP server: userData fallback la dosarul legacy "Scribner"', () => {
  it('găsește proiectele din recent când există doar dosarul Scribner', async () => {
    const appdata = tempDir();
    const proj = path.join(appdata, 'proj');
    fs.mkdirSync(proj, { recursive: true });
    fs.writeFileSync(path.join(proj, 'project.json'), JSON.stringify({ tree: [] }));
    fs.mkdirSync(path.join(appdata, 'Scribner'), { recursive: true });
    fs.writeFileSync(path.join(appdata, 'Scribner', 'settings.json'), JSON.stringify({ recent: [{ dir: proj, title: 'X' }] }));
    const r = await talk({ APPDATA: appdata, SCRIBNER_USER_DATA: '' });
    expect(r.ok, JSON.stringify(r).slice(0, 300)).toBe(true);
  });

  it('dosarul nou cu settings câștigă față de legacy (serverul pornește)', async () => {
    const appdata = tempDir();
    const proj = path.join(appdata, 'proj');
    fs.mkdirSync(proj, { recursive: true });
    fs.writeFileSync(path.join(proj, 'project.json'), JSON.stringify({ tree: [] }));
    fs.mkdirSync(path.join(appdata, 'Pneuma Sofer'), { recursive: true });
    fs.writeFileSync(path.join(appdata, 'Pneuma Sofer', 'settings.json'), JSON.stringify({ recent: [{ dir: proj, title: 'Nou' }] }));
    fs.mkdirSync(path.join(appdata, 'Scribner'), { recursive: true });
    fs.writeFileSync(path.join(appdata, 'Scribner', 'settings.json'), JSON.stringify({ recent: [{ dir: proj, title: 'Legacy' }] }));
    const r1 = await talk({ APPDATA: appdata, SCRIBNER_USER_DATA: '' });
    expect(r1.ok, JSON.stringify(r1).slice(0, 200)).toBe(true);
  });

  it('fără settings nicaieri → iesire curată 2 cu îndrumare', async () => {
    const appdata2 = tempDir();
    const r2 = await talk({ APPDATA: appdata2, SCRIBNER_USER_DATA: '' });
    expect(r2.ok).toBe(false);
    expect(r2.code).toBe(2);
    expect(r2.err).toMatch(/Niciun proiect/);
  });
});
