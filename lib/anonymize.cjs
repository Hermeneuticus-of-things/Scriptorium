'use strict';
// Private names out, symbolic tokens in (MCP --anonymize): before text leaves for the AI model,
// each private name, e-mail address and phone number becomes a fixed token ($ENT:PERSON:7f3a…);
// tokens in what the agent sends back are turned into the real values again, on this computer.
//   pack(text)    real → tokens        hydrate(value)  tokens → real (strings, arrays, objects)
const crypto = require('crypto');

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE = /(?<![\w$])(?:\+40|0)\s?7\d{2}[\s.-]?\d{3}[\s.-]?\d{3}(?!\d)/g;

function createAnonymizer(names = []) {
  const toToken = new Map();
  const toReal = new Map();
  const tokenFor = (kind, value) => {
    const key = `${kind}:${value}`;
    if (!toToken.has(key)) {
      const t = `$ENT:${kind}:${crypto.createHash('sha256').update(key).digest('hex').slice(0, 6)}`;
      toToken.set(key, t);
      toReal.set(t, value);
    }
    return toToken.get(key);
  };
  // Longest names first, whole words only ("Ana" must not change "Anastasia").
  const list = [...new Set(names.map((n) => String(n).trim()).filter((n) => n.length > 1))].sort((a, b) => b.length - a.length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nameRe = list.length ? new RegExp(`(?<![\\p{L}\\p{N}])(${list.map(esc).join('|')})(?![\\p{L}\\p{N}])`, 'gu') : null;
  const pack = (text) => {
    let s = String(text);
    s = s.replace(EMAIL, (m) => tokenFor('EMAIL', m));
    s = s.replace(PHONE, (m) => tokenFor('PHONE', m));
    if (nameRe) s = s.replace(nameRe, (m) => tokenFor('PERSON', m));
    return s;
  };
  const hydrateText = (s) => String(s).replace(/\$ENT:(?:PERSON|EMAIL|PHONE):[0-9a-f]{6}/g, (t) => toReal.get(t) ?? t);
  const hydrate = (v) => {
    if (typeof v === 'string') return hydrateText(v);
    if (Array.isArray(v)) return v.map(hydrate);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, hydrate(x)]));
    return v;
  };
  return { pack, hydrate, size: () => toReal.size };
}

module.exports = { createAnonymizer };
