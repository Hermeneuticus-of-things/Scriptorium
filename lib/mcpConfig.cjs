'use strict';
// Connects the installed Pneuma Sofer to Claude (MCP) without Node.js on the machine: Pneuma Sofer.exe runs
// mcp/server.mjs as plain Node with ELECTRON_RUN_AS_NODE=1 (the app is packaged without asar).
//   Claude Desktop: merges mcpServers["pneuma-sofer"] into claude_desktop_config.json (backup first).
//   Claude Code (CLI and the Claude Code tab of the desktop app): the `claude mcp add` command.
// Pure helpers except writeClaudeDesktopConfig; paths are injected for tests.
const fs = require('fs');
const path = require('path');

const SERVER_NAME = 'pneuma-sofer';

/** Where Claude Desktop keeps its config on this platform. */
function claudeDesktopConfigPath({ platform = process.platform, env = process.env, home = require('os').homedir() } = {}) {
  if (platform === 'win32') return path.win32.join(env.APPDATA || path.win32.join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
  if (platform === 'darwin') return path.posix.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  return path.posix.join(env.XDG_CONFIG_HOME || path.posix.join(home, '.config'), 'Claude', 'claude_desktop_config.json');
}

/** The stdio server entry: { command, args, env }. `projects` = project folders the agent may open. */
function serverEntry({ execPath, serverPath, projects = [], readOnly = false }) {
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
      cfg = JSON.parse(text);
    } catch {
      throw new Error('Fișierul de configurare Claude nu e JSON valid; nu l-am modificat.');
    }
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) throw new Error('Fișierul de configurare Claude are o formă neașteptată; nu l-am modificat.');
  }
  const servers = cfg.mcpServers && typeof cfg.mcpServers === 'object' ? cfg.mcpServers : {};
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
  return ['claude mcp add', name, '--scope user', env, '--', [entry.command, ...entry.args].map((a) => quoteArg(a, platform)).join(' ')].filter(Boolean).join(' ');
}

/** Writes the Claude Desktop config (backup of the old one next to it). Returns { file, backup }. */
function writeClaudeDesktopConfig(entry, { file = claudeDesktopConfigPath(), now = new Date() } = {}) {
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const next = mergeDesktopConfig(old, entry);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let backup = null;
  if (old) {
    backup = `${file}.bak-pneuma-sofer-${now.toISOString().replace(/[:.]/g, '-')}`;
    fs.writeFileSync(backup, old);
  }
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, next);
  fs.renameSync(tmp, file);
  return { file, backup };
}

module.exports = { SERVER_NAME, claudeDesktopConfigPath, serverEntry, mergeDesktopConfig, claudeCodeCommand, writeClaudeDesktopConfig, quoteArg };
