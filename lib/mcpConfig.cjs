'use strict';
// Connects the installed Pneuma Sofer to Claude (MCP) without Node.js on the machine: Pneuma Sofer.exe runs
// mcp/server.mjs as plain Node with ELECTRON_RUN_AS_NODE=1 (the app is packaged without asar).
//   Claude Desktop: merges mcpServers.scribner into claude_desktop_config.json (backup first).
//   Claude Code (CLI and the Claude Code tab of the desktop app): the `claude mcp add` command.
// Pure helpers except writeClaudeDesktopConfig; paths are injected for tests.
const fs = require('fs');
const path = require('path');

const SERVER_NAME = 'pneuma';

/** Where Claude Desktop keeps its config on this platform. */
function claudeDesktopConfigPath({ platform = process.platform, env = process.env, home = require('os').homedir() } = {}) {
  if (platform === 'win32') return path.win32.join(env.APPDATA || path.win32.join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
  if (platform === 'darwin') return path.posix.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  return path.posix.join(env.XDG_CONFIG_HOME || path.posix.join(home, '.config'), 'Claude', 'claude_desktop_config.json');
}

// The install folder written the same way on every computer: %LOCALAPPDATA%\Programs\Pneuma Sofer
// instead of C:\Users\<name>\…, so a command or config shared with others names no person.
function portablePath(p, env = process.env) {
  const s = String(p);
  for (const v of ['LOCALAPPDATA', 'APPDATA', 'ProgramFiles', 'USERPROFILE']) {
    const base = env[v];
    if (base && s.toLowerCase().startsWith(String(base).toLowerCase() + '\\')) return `%${v}%${s.slice(base.length)}`;
  }
  return s;
}

/**
 * The stdio server entry: { command, args, env }. Without `projects` the server offers the projects
 * in Pneuma Sofer's recent list, so the entry is the same for every book and every computer.
 * Installed on Windows (pneuma-mcp.cmd next to Pneuma Sofer.exe): `cmd /c "%LOCALAPPDATA%\…\pneuma-mcp.cmd"`,
 * which any MCP client can run (cmd expands the variable).
 */
function serverEntry({ execPath, serverPath, projects = [], readOnly = false, platform = process.platform, env = process.env, exists = fs.existsSync }) {
  const wrapper = path.win32.join(path.win32.dirname(String(execPath)), 'pneuma-mcp.cmd');
  if (platform === 'win32' && exists(wrapper)) {
    const args = ['/c', portablePath(wrapper, env)];
    for (const p of projects) args.push('--project', p);
    if (readOnly) args.push('--read-only');
    return { command: 'cmd', args };
  }
  const args = [serverPath];
  for (const p of projects) args.push('--project', p);
  if (readOnly) args.push('--read-only');
  // In development (`npm start`) execPath is electron itself, which also runs as Node with the flag.
  return { command: execPath, args, env: { ELECTRON_RUN_AS_NODE: '1' } };
}

/** Claude Desktop config text with our server set; other servers and settings are kept. */
function mergeDesktopConfig(text, entry, name = SERVER_NAME) {
  let cfg = {};
  if (String(text || '').trim()) {
    try {
      // Windows editors often save with a BOM, which JSON.parse rejects; the content itself is fine.
      cfg = JSON.parse(String(text).replace(/^\uFEFF/, ''));
    } catch {
      throw new Error('Fișierul de configurare Claude nu e JSON valid; nu l-am modificat.');
    }
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) throw new Error('Fișierul de configurare Claude are o formă neașteptată; nu l-am modificat.');
  }
  const ms = cfg.mcpServers;
  // An array or scalar here would be silently replaced (or spread into "0", "1" keys): refuse instead.
  if (ms != null && (typeof ms !== 'object' || Array.isArray(ms))) throw new Error('Fișierul de configurare Claude are o formă neașteptată; nu l-am modificat.');
  const servers = ms || {};
  return `${JSON.stringify({ ...cfg, mcpServers: { ...servers, [name]: entry } }, null, 2)}\n`;
}

// Quote one argument for the shell the command is pasted in (PowerShell / cmd on Windows, sh elsewhere).
function quoteArg(a, platform) {
  const s = String(a);
  if (/^[\w@%+=:,./\\-]+$/.test(s)) return s;
  return platform === 'win32' ? `"${s.replace(/"/g, '\\"')}"` : `'${s.replace(/'/g, `'\\''`)}'`;
}

/** `claude mcp add` command for Claude Code (user scope: every folder sees the server). */
function claudeCodeCommand(entry, { platform = process.platform, name = SERVER_NAME } = {}) {
  const env = Object.entries(entry.env || {}).map(([k, v]) => `-e ${k}=${v}`).join(' ');
  // %VAR% stays for cmd to expand: quoted only when it has spaces.
  return ['claude mcp add', name, '--scope user', env, '--', [entry.command, ...entry.args].map((a) => quoteArg(a, platform)).join(' ')].filter(Boolean).join(' ');
}

/** Writes the Claude Desktop config (backup of the old one next to it). Returns { file, backup }. */
function writeClaudeDesktopConfig(entry, { file = claudeDesktopConfigPath(), now = new Date() } = {}) {
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const next = mergeDesktopConfig(old, entry);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let backup = null;
  if (old) {
    backup = `${file}.bak-pneuma-${now.toISOString().replace(/[:.]/g, '-')}`;
    fs.writeFileSync(backup, old);
  }
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, next);
  fs.renameSync(tmp, file);
  return { file, backup };
}

// ---- more MCP clients -----------------------------------------------------------------------
// Each MCP client keeps its config in its own place and schema. The Pneuma Sofer stdio entry
// ({command,args,env}) is the same everywhere; only the wrapper around it differs.
const MCP_CLIENTS = [
  { id: 'claudeDesktop', label: 'Claude Desktop', kind: 'file' },
  { id: 'claudeCode', label: 'Claude Code', kind: 'command' },
  { id: 'cursor', label: 'Cursor', kind: 'file' },
  { id: 'gemini', label: 'Gemini CLI', kind: 'file' },
  { id: 'opencode', label: 'OpenCode', kind: 'file' },
  { id: 'windsurf', label: 'Windsurf', kind: 'file' },
  { id: 'vscode', label: 'VS Code', kind: 'file' },
  { id: 'codex', label: 'Codex', kind: 'file' },
];

const pj = (platform) => (platform === 'win32' ? path.win32 : path.posix);

/** The config file for client `id` on this platform, or null for command-only clients. */
function clientConfigPath(id, { platform = process.platform, env = process.env, home = require('os').homedir() } = {}) {
  const P = pj(platform);
  const appData = env.APPDATA || P.join(home, 'AppData', 'Roaming');
  const xdg = env.XDG_CONFIG_HOME || P.join(home, '.config');
  switch (id) {
    case 'claudeDesktop': return claudeDesktopConfigPath({ platform, env, home });
    case 'claudeCode': return null; // configured with the `claude mcp add` command
    case 'cursor': return P.join(home, '.cursor', 'mcp.json');
    case 'gemini': return P.join(home, '.gemini', 'settings.json');
    case 'windsurf': return P.join(home, '.codeium', 'windsurf', 'mcp_config.json');
    case 'opencode': return P.join(xdg, 'opencode', 'opencode.json');
    case 'codex': return P.join(home, '.codex', 'config.toml');
    case 'vscode':
      if (platform === 'win32') return P.join(appData, 'Code', 'User', 'mcp.json');
      if (platform === 'darwin') return P.join(home, 'Library', 'Application Support', 'Code', 'User', 'mcp.json');
      return P.join(xdg, 'Code', 'User', 'mcp.json');
    default: return null;
  }
}

/** True when the client looks installed (its config file or its folder exists). Command-only: always. */
function clientDetected(id, opts = {}) {
  const exists = opts.exists || fs.existsSync;
  const file = clientConfigPath(id, opts);
  if (!file) return true;
  const P = pj(opts.platform || process.platform);
  return exists(file) || exists(P.dirname(file)) || exists(P.dirname(P.dirname(file)));
}

function parseJsonConfig(text, what) {
  if (!String(text || '').trim()) return {};
  let cfg;
  try { cfg = JSON.parse(String(text).replace(/^﻿/, '')); } // editors may add a BOM
  catch { throw new Error(`Fișierul de configurare ${what} nu e JSON valid; nu l-am modificat.`); }
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) throw new Error(`Fișierul de configurare ${what} are o formă neașteptată; nu l-am modificat.`);
  return cfg;
}

/** Merge our server under `topKey` ("mcpServers" or "servers"), keeping everything else. */
function mergeJsonConfig(topKey, text, entry, { name = SERVER_NAME, what = 'MCP' } = {}) {
  const cfg = parseJsonConfig(text, what);
  const cur = cfg[topKey];
  if (cur != null && (typeof cur !== 'object' || Array.isArray(cur))) throw new Error(`Fișierul de configurare ${what} are o formă neașteptată; nu l-am modificat.`);
  return `${JSON.stringify({ ...cfg, [topKey]: { ...(cur || {}), [name]: entry } }, null, 2)}\n`;
}

/** OpenCode schema: mcp.<name> = { type:"local", command:[cmd,...args], enabled:true, environment? }. */
function mergeOpencodeConfig(text, entry, { name = SERVER_NAME } = {}) {
  const cfg = parseJsonConfig(text, 'OpenCode');
  const mcp = cfg.mcp;
  if (mcp != null && (typeof mcp !== 'object' || Array.isArray(mcp))) throw new Error('Fișierul de configurare OpenCode are o formă neașteptată; nu l-am modificat.');
  const server = { type: 'local', command: [entry.command, ...entry.args], enabled: true };
  if (entry.env && Object.keys(entry.env).length) server.environment = { ...entry.env };
  return `${JSON.stringify({ ...cfg, mcp: { ...(mcp || {}), [name]: server } }, null, 2)}\n`;
}

/** Codex config.toml: a [mcp_servers.<name>] table. The old table of the same name is replaced. */
function mergeCodexConfig(text, entry, { name = SERVER_NAME } = {}) {
  const lines = [
    `[mcp_servers.${name}]`,
    `command = ${JSON.stringify(entry.command)}`,
    `args = [${entry.args.map((a) => JSON.stringify(a)).join(', ')}]`,
  ];
  if (entry.env && Object.keys(entry.env).length) {
    lines.push(`env = { ${Object.entries(entry.env).map(([k, v]) => `${k} = ${JSON.stringify(String(v))}`).join(', ')} }`);
  }
  const block = `${lines.join('\n')}\n`;
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let base = String(text || '').replace(new RegExp(`(^|\\n)\\[mcp_servers\\.${esc}\\][^\\[]*`, 'g'), '\n').replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '');
  return (base ? `${base}\n\n` : '') + block;
}

/** The text that would be written to client `id` for this entry (merging `oldText`, '' = fresh). */
function mergeForClient(id, oldText, entry) {
  switch (id) {
    case 'claudeDesktop': return mergeJsonConfig('mcpServers', oldText, entry, { what: 'Claude' });
    case 'cursor': return mergeJsonConfig('mcpServers', oldText, entry, { what: 'Cursor' });
    case 'gemini': return mergeJsonConfig('mcpServers', oldText, entry, { what: 'Gemini' });
    case 'windsurf': return mergeJsonConfig('mcpServers', oldText, entry, { what: 'Windsurf' });
    case 'vscode': return mergeJsonConfig('servers', oldText, entry, { what: 'VS Code' });
    case 'opencode': return mergeOpencodeConfig(oldText, entry);
    case 'codex': return mergeCodexConfig(oldText, entry);
    default: throw new Error(`Client MCP necunoscut: ${id}`);
  }
}

/** The config shown in the dialog (as if written to an empty file). */
const previewClientConfig = (id, entry) => mergeForClient(id, '', entry);

/** Writes client `id`'s config (backup of the old file first). Returns { file, backup }. */
function writeClientConfig(id, entry, { file = clientConfigPath(id), now = new Date() } = {}) {
  if (!file) throw new Error('Acest client se configurează cu comanda afișată, nu cu un fișier.');
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const next = mergeForClient(id, old, entry);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let backup = null;
  if (old) {
    backup = `${file}.bak-pneuma-${now.toISOString().replace(/[:.]/g, '-')}`;
    fs.writeFileSync(backup, old);
  }
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, next);
  fs.renameSync(tmp, file);
  return { file, backup };
}

module.exports = {
  SERVER_NAME, portablePath, claudeDesktopConfigPath, serverEntry, mergeDesktopConfig, claudeCodeCommand, writeClaudeDesktopConfig, quoteArg,
  MCP_CLIENTS, clientConfigPath, clientDetected, mergeJsonConfig, mergeOpencodeConfig, mergeCodexConfig, mergeForClient, previewClientConfig, writeClientConfig,
};
