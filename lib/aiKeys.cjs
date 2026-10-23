'use strict';
// Per-provider API keys stored in settings.json, encrypted with Electron safeStorage.
//   settings.apiKeys = { [provider]: { enc: base64, plain?: true } }
// `plain` marks keys saved where OS encryption is unavailable (base64 only, as before).
// Legacy settings.apiKeyEnc / apiKeyPlain (Anthropic only) migrate to apiKeys.anthropic.
// Pure functions over a settings object; `safeStorage` and `env` are injected (tests).
const PRESETS = require('./aiPresets.json');

/** Returns a new settings object with the legacy Anthropic key moved to apiKeys.anthropic. */
function migrateKeys(settings) {
  const s = { ...(settings || {}) };
  if (s.apiKeyEnc) {
    const keys = { ...(s.apiKeys || {}) };
    if (!keys.anthropic) keys.anthropic = s.apiKeyPlain ? { enc: s.apiKeyEnc, plain: true } : { enc: s.apiKeyEnc };
    s.apiKeys = keys;
  }
  delete s.apiKeyEnc;
  delete s.apiKeyPlain;
  return s;
}

const needsMigration = (settings) => Boolean(settings && ('apiKeyEnc' in settings || 'apiKeyPlain' in settings));

function getKey(settings, provider, safeStorage, env = process.env) {
  const s = migrateKeys(settings);
  const entry = (s.apiKeys || {})[provider];
  if (!entry || !entry.enc) {
    const envName = PRESETS[provider] && PRESETS[provider].envKey;
    return (envName && env[envName]) || '';
  }
  const buf = Buffer.from(entry.enc, 'base64');
  try {
    return entry.plain ? buf.toString('utf8') : safeStorage.decryptString(buf);
  } catch {
    return ''; // key encrypted on another machine / user profile
  }
}

/** Returns new settings with the key for `provider` set (empty key deletes it). */
function setKey(settings, provider, key, safeStorage) {
  const s = migrateKeys(settings);
  const keys = { ...(s.apiKeys || {}) };
  const k = String(key || '').trim();
  if (!k) delete keys[provider];
  else if (safeStorage && safeStorage.isEncryptionAvailable()) keys[provider] = { enc: safeStorage.encryptString(k).toString('base64') };
  else keys[provider] = { enc: Buffer.from(k, 'utf8').toString('base64'), plain: true };
  s.apiKeys = keys;
  return s;
}

/** { [provider]: boolean } for every known provider — safe to send to the renderer. */
function keyFlags(settings, safeStorage, env = process.env) {
  return Object.fromEntries(Object.keys(PRESETS).map((p) => [p, Boolean(getKey(settings, p, safeStorage, env))]));
}

module.exports = { migrateKeys, needsMigration, getKey, setKey, keyFlags };
