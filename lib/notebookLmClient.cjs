'use strict';
// MCP client for the `notebooklm-mcp` server. Lets Pneuma Sofer INTERROGATE a NotebookLM notebook
// (ask follow-up questions on its sources) from the Electron main process.
//
// NotebookLM has no public API for personal accounts, so the user already runs the community
// `notebooklm-mcp` stdio server (the same one the `karma-nlm-doctrina` agent uses). We don't
// configure or install it: we DISCOVER its launch command from the user's existing Claude MCP
// configuration, spawn it as a child process, and speak MCP over stdio as a client.
//
// Everything here is optional: if the server can't be discovered the feature is simply off and
// the rest of the app (including all other AI) keeps working.
//
// The SDK import and the config readers are injected so tests never spawn a real process.
const fs = require('fs');
const os = require('os');
const path = require('path');

// Default name of the server entry in the Claude MCP config (overridable per project in Settings).
const SERVER_NAME = 'notebooklm-mcp';

/** Config files that may hold an mcpServers entry, most specific first. */
function defaultConfigPaths({ home = os.homedir(), env = process.env, platform = process.platform } = {}) {
  const out = [path.join(home, '.claude.json')];
  try {
    out.push(require('./mcpConfig.cjs').claudeDesktopConfigPath({ home, env, platform }));
  } catch {
    /* mcpConfig unavailable: Claude Code config alone */
  }
  return out;
}

function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** mcpServers entries from one parsed config: the top-level map plus every `projects.*` map. */
function serversIn(cfg) {
  if (!cfg || typeof cfg !== 'object') return {};
  const merged = { ...(cfg.mcpServers && typeof cfg.mcpServers === 'object' ? cfg.mcpServers : {}) };
  for (const proj of Object.values(cfg.projects || {})) {
    if (proj && typeof proj.mcpServers === 'object') Object.assign(merged, proj.mcpServers);
  }
  return merged;
}

/**
 * Finds the launch entry for the notebooklm server across the user's Claude config files.
 * @returns {{command, args:string[], env:object, source:string}|null}
 */
function discoverServerEntry({ name = SERVER_NAME, paths = defaultConfigPaths(), readJson = readJsonSafe } = {}) {
  for (const file of paths) {
    const servers = serversIn(readJson(file));
    const entry = servers[name];
    // Only stdio servers can be spawned as a child process; http/sse entries are skipped.
    if (entry && entry.command && (!entry.type || entry.type === 'stdio')) {
      return { command: entry.command, args: Array.isArray(entry.args) ? entry.args : [], env: entry.env || {}, source: file };
    }
  }
  return null;
}

/** True when a usable notebooklm server entry exists (used to gate the feature in the UI). */
function isAvailable(opts) {
  return Boolean(discoverServerEntry(opts));
}

// MCP tool results are { content: [{type:'text', text}], isError? }. Pull the text out and parse
// JSON when the payload is JSON (chat_ask / chat_status return structured objects).
function parseToolResult(res) {
  if (!res) return null;
  const parts = (res.content || []).filter((c) => c && c.type === 'text').map((c) => c.text);
  const textOut = parts.join('\n').trim();
  if (res.isError) throw new Error(textOut || 'Eroare de la notebooklm-mcp.');
  try {
    return JSON.parse(textOut);
  } catch {
    return textOut;
  }
}

// Default SDK loader: the @modelcontextprotocol/sdk client is ESM-only, so a CJS module must
// import it dynamically. Injectable so tests pass a fake with no real process.
async function loadSdk() {
  const [{ Client }, { StdioClientTransport }] = await Promise.all([
    import('@modelcontextprotocol/sdk/client/index.js'),
    import('@modelcontextprotocol/sdk/client/stdio.js'),
  ]);
  return { Client, StdioClientTransport };
}

/**
 * Spawns the notebooklm server and connects as an MCP client.
 * @returns {Promise<{callTool, close}>} callTool(name, args) -> parsed tool result.
 */
async function createClient({ entry, importSdk = loadSdk, env = process.env } = {}) {
  if (!entry || !entry.command) throw new Error('Serverul notebooklm-mcp nu este configurat.');
  const { Client, StdioClientTransport } = await importSdk();
  const transport = new StdioClientTransport({
    command: entry.command,
    args: entry.args || [],
    // The child inherits our environment plus the entry's env (e.g. PYTHONIOENCODING=utf-8).
    env: { ...env, ...(entry.env || {}) },
    stderr: 'ignore',
  });
  const client = new Client({ name: 'pneuma-sofer', version: '0.3.0' }, { capabilities: {} });
  await client.connect(transport);
  return {
    callTool: async (name, args = {}) => parseToolResult(await client.callTool({ name, arguments: args })),
    close: async () => {
      try {
        await client.close();
      } catch {
        /* already gone */
      }
    },
  };
}

module.exports = {
  SERVER_NAME,
  defaultConfigPaths,
  serversIn,
  discoverServerEntry,
  isAvailable,
  parseToolResult,
  createClient,
};
