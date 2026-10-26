import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { lookupUrl, lookupGroups, MAX_TRANSLATE } from '../src/lib/lookups.js';
const require = createRequire(import.meta.url);
const { mergeDesktopConfig } = require('../lib/mcpConfig.cjs');
const providers = require('../lib/aiProviders.cjs');

describe('lookups: long selection with emoji at the cut', () => {
  it('does not throw when the translation cut falls inside a surrogate pair', () => {
    const text = 'a'.repeat(MAX_TRANSLATE - 1) + '😀 rest';
    expect(() => lookupGroups(text)).not.toThrow();
    const url = lookupUrl('googleTranslate', text);
    expect(decodeURIComponent(url.split('text=')[1])).toBe('a'.repeat(MAX_TRANSLATE - 1));
  });
});

describe('lookups: English labels', () => {
  it('uses English labels in EN mode, keeps kinds stable, Romanian by default', () => {
    const ro = lookupGroups('casă');
    const en = lookupGroups('casă', { lang: 'en' });
    expect(en.dict.map((x) => x.kind)).toEqual(ro.dict.map((x) => x.kind));
    const all = [...en.dict, ...en.translate, ...en.research].map((x) => x.label).join(' ');
    expect(all).not.toMatch(/[ăâîșțĂÂÎȘȚ]|Sinonime|exemple|terminologie/);
    expect(ro.dict.find((x) => x.kind === 'dictionary').label).toBe('Dicționar (dexonline)');
  });
});

describe('mcpConfig merge with odd files', () => {
  const entry = { command: 'x', args: [], env: {} };
  it('accepts a UTF-8 BOM and keeps other servers', () => {
    const out = JSON.parse(mergeDesktopConfig('﻿{"mcpServers":{"a":{"command":"a"}},"x":1}', entry));
    expect(out.mcpServers.a.command).toBe('a');
    expect(out.mcpServers.pneuma).toEqual(entry);
    expect(out.x).toBe(1);
  });
  it('refuses comments and trailing commas', () => {
    expect(() => mergeDesktopConfig('{ // c\n "a": 1 }', entry)).toThrow(/nu l-am modificat/);
    expect(() => mergeDesktopConfig('{"a": 1,}', entry)).toThrow(/nu l-am modificat/);
  });
  it('refuses an mcpServers that is not an object instead of rewriting it', () => {
    expect(() => mergeDesktopConfig('{"mcpServers":[{"command":"a"}]}', entry)).toThrow(/nu l-am modificat/);
    expect(() => mergeDesktopConfig('{"mcpServers":"x"}', entry)).toThrow(/nu l-am modificat/);
  });
});

describe('AI provider errors never carry the API key', () => {
  it('redacts the key from a network error message (Gemini puts it in the URL)', async () => {
    const key = 'AIzaSECRET123456';
    const fetch = async (url) => { throw new Error(`request to ${url} failed, reason: ECONNREFUSED`); };
    const err = await providers.completeFull({ provider: 'gemini', model: 'gemini-x', apiKey: key, prompt: 'x' }, { fetch }).catch((e) => e);
    expect(err).toBeInstanceOf(providers.ProviderError);
    expect(err.message).not.toContain(key);
    expect(providers.friendlyProviderError(err)).not.toContain(key);
  });
  it('redacts the key echoed in an error body', async () => {
    const key = 'sk-SECRETKEY999';
    const fetch = async () => ({ ok: false, status: 401, statusText: '', text: async () => JSON.stringify({ error: { message: `Incorrect API key provided: ${key}` } }) });
    const err = await providers.completeFull({ provider: 'openai', model: 'gpt-x', apiKey: key, prompt: 'x' }, { fetch }).catch((e) => e);
    expect(err.message).not.toContain(key);
  });
});
