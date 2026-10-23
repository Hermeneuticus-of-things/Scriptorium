import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const providers = require('../lib/aiProviders.cjs');
const ai = require('../lib/ai.cjs');
const aiKeys = require('../lib/aiKeys.cjs');
const batch = require('../lib/aiBatch.cjs');

const fakeFetch = (status, body) => {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: 'x',
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };
  fn.calls = calls;
  return fn;
};

describe('aiProviders: openai-compatible', () => {
  it('shapes the request and parses the reply', async () => {
    const f = fakeFetch(200, { choices: [{ message: { content: ' Salut ' }, finish_reason: 'stop' }] });
    const text = await providers.complete(
      { provider: 'openrouter', model: 'org/model', apiKey: 'sk-or-1', system: 'SYS', prompt: 'P', maxTokens: 64 },
      { fetch: f },
    );
    expect(text).toBe('Salut');
    const c = f.calls[0];
    expect(c.url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(c.init.method).toBe('POST');
    expect(c.init.headers.Authorization).toBe('Bearer sk-or-1');
    expect(c.init.headers['Content-Type']).toBe('application/json');
    expect(c.body).toEqual({ model: 'org/model', messages: [{ role: 'system', content: 'SYS' }, { role: 'user', content: 'P' }], max_tokens: 64 });
  });
  it('local servers need no key; custom base URL is used and trimmed; big maxTokens not sent', async () => {
    const f = fakeFetch(200, { choices: [{ message: { content: [{ type: 'text', text: 'A' }, { type: 'text', text: 'B' }] } }] });
    expect(await providers.complete({ provider: 'ollama', model: 'llama', prompt: 'P', maxTokens: 32000 }, { fetch: f })).toBe('AB');
    expect(f.calls[0].url).toBe('http://localhost:11434/v1/chat/completions');
    expect(f.calls[0].init.headers.Authorization).toBeUndefined();
    expect(f.calls[0].body.max_tokens).toBeUndefined();
    const g = fakeFetch(200, { choices: [{ message: { content: 'x' } }] });
    await providers.complete({ provider: 'custom', baseUrl: 'http://srv:8000/v1/', model: 'm', prompt: 'P' }, { fetch: g });
    expect(g.calls[0].url).toBe('http://srv:8000/v1/chat/completions');
  });
  it('requires key / model where needed', async () => {
    const f = fakeFetch(200, {});
    await expect(providers.complete({ provider: 'openai', model: 'm', prompt: 'P' }, { fetch: f })).rejects.toThrow(/cheia API OpenAI/);
    await expect(providers.complete({ provider: 'openai', apiKey: 'k', prompt: 'P' }, { fetch: f })).rejects.toThrow(/modelul/);
    expect(f.calls).toHaveLength(0);
  });
  it('maps HTTP and network errors to Romanian messages', async () => {
    const cases = [[401, /invalidă pentru Mistral/], [403, /nu are acces/], [404, /modelul sau adresa nu există/], [429, /prea multe cereri/], [500, /problemă temporară/]];
    for (const [status, re] of cases) {
      const f = fakeFetch(status, { error: { message: 'boom' } });
      const err = await providers.complete({ provider: 'mistral', model: 'm', apiKey: 'k', prompt: 'P' }, { fetch: f }).catch((e) => e);
      expect(err).toBeInstanceOf(providers.ProviderError);
      expect(err.status).toBe(status);
      expect(ai.friendlyError(err)).toMatch(re);
    }
    const down = async () => { throw new TypeError('fetch failed'); };
    const err = await providers.complete({ provider: 'lmstudio', model: 'm', prompt: 'P' }, { fetch: down }).catch((e) => e);
    expect(ai.friendlyError(err)).toMatch(/Nu mă pot conecta la LM Studio/);
  });
  it('content_filter is a refusal', async () => {
    const f = fakeFetch(200, { choices: [{ message: { content: '' }, finish_reason: 'content_filter' }] });
    const err = await providers.complete({ provider: 'groq', model: 'm', apiKey: 'k', prompt: 'P' }, { fetch: f }).catch((e) => e);
    expect(ai.friendlyError(err)).toBe('Modelul a refuzat cererea.');
  });
});

describe('aiProviders: gemini', () => {
  it('shapes generateContent and parses candidates', async () => {
    const f = fakeFetch(200, { candidates: [{ content: { parts: [{ text: 'Bună ' }, { text: 'ziua' }] }, finishReason: 'STOP' }] });
    const text = await providers.complete({ provider: 'gemini', model: 'models/gem-x', apiKey: 'AIza k', system: 'SYS', prompt: 'P', maxTokens: 16 }, { fetch: f });
    expect(text).toBe('Bună ziua');
    const c = f.calls[0];
    expect(c.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gem-x:generateContent?key=AIza%20k');
    expect(c.init.headers.Authorization).toBeUndefined();
    expect(c.body).toEqual({
      contents: [{ role: 'user', parts: [{ text: 'P' }] }],
      systemInstruction: { parts: [{ text: 'SYS' }] },
      generationConfig: { maxOutputTokens: 16 },
    });
  });
  it('maps blocked prompts and API errors', async () => {
    const blocked = fakeFetch(200, { promptFeedback: { blockReason: 'SAFETY' } });
    const e1 = await providers.complete({ provider: 'gemini', model: 'g', apiKey: 'k', prompt: 'P' }, { fetch: blocked }).catch((e) => e);
    expect(ai.friendlyError(e1)).toBe('Modelul a refuzat cererea.');
    const bad = fakeFetch(400, [{ error: { message: 'API key not valid' } }]);
    const e2 = await providers.complete({ provider: 'gemini', model: 'g', apiKey: 'k', prompt: 'P' }, { fetch: bad }).catch((e) => e);
    expect(ai.friendlyError(e2)).toMatch(/Google Gemini 400: API key not valid/);
  });
});

describe('ai.cjs keeps Anthropic as default', () => {
  it('missing key message unchanged for Anthropic', async () => {
    await expect(ai.runAction({ action: 'proofread', text: 'x' })).rejects.toThrow('Setează cheia API Anthropic în Setări.');
    await expect(ai.runEditorial({ system: 's', prompt: 'p' })).rejects.toThrow('Setează cheia API Anthropic în Setări.');
    expect(ai.MODEL).toBe('claude-opus-5-5');
    expect(providers.resolveConfig({}).model).toBe('claude-opus-5-5');
  });
  it('makeRun accepts a legacy key or a provider config', async () => {
    const seen = [];
    const fake = { runEditorial: async (o) => { seen.push(o); return { text: 'T' }; } };
    expect(await batch.makeRun('k', fake)({ system: 's', prompt: 'p', effort: 'low' })).toBe('T');
    expect(seen[0]).toMatchObject({ apiKey: 'k', system: 's', prompt: 'p', effort: 'low' });
    await batch.makeRun({ provider: 'ollama', model: 'm', baseUrl: 'http://x/v1', apiKey: '' }, fake)({ system: 's', prompt: 'p' });
    expect(seen[1]).toMatchObject({ provider: 'ollama', model: 'm', baseUrl: 'http://x/v1' });
  });
});

describe('aiKeys', () => {
  const safe = {
    isEncryptionAvailable: () => true,
    encryptString: (s) => Buffer.from(`enc:${s}`, 'utf8'),
    decryptString: (b) => b.toString('utf8').replace(/^enc:/, ''),
  };
  it('migrates the legacy Anthropic key', () => {
    const legacy = { theme: 'dark', apiKeyEnc: Buffer.from('enc:sk-ant-1').toString('base64') };
    expect(aiKeys.needsMigration(legacy)).toBe(true);
    const s = aiKeys.migrateKeys(legacy);
    expect(s.apiKeyEnc).toBeUndefined();
    expect(s.theme).toBe('dark');
    expect(aiKeys.getKey(s, 'anthropic', safe, {})).toBe('sk-ant-1');
    expect(aiKeys.getKey(legacy, 'anthropic', safe, {})).toBe('sk-ant-1');
    const plain = aiKeys.migrateKeys({ apiKeyEnc: Buffer.from('k2').toString('base64'), apiKeyPlain: true });
    expect(plain.apiKeys.anthropic.plain).toBe(true);
    expect(aiKeys.getKey(plain, 'anthropic', safe, {})).toBe('k2');
    expect(aiKeys.needsMigration(s)).toBe(false);
  });
  it('stores one encrypted key per provider and exposes only flags', () => {
    let s = aiKeys.setKey({}, 'openai', 'sk-1', safe);
    s = aiKeys.setKey(s, 'gemini', 'AIza', safe);
    expect(s.apiKeys.openai.enc).not.toContain('sk-1');
    expect(aiKeys.getKey(s, 'openai', safe, {})).toBe('sk-1');
    const flags = aiKeys.keyFlags(s, safe, {});
    expect(flags).toMatchObject({ openai: true, gemini: true, anthropic: false, ollama: false });
    expect(JSON.stringify(flags)).not.toContain('sk-1');
    s = aiKeys.setKey(s, 'openai', '', safe);
    expect(aiKeys.getKey(s, 'openai', safe, {})).toBe('');
    expect(aiKeys.getKey({}, 'anthropic', safe, { ANTHROPIC_API_KEY: 'env' })).toBe('env');
  });
});
