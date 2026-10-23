import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'module';
import { proposalIsStale } from '../src/lib/editorial.js';

const require = createRequire(import.meta.url);
const providers = require('../lib/aiProviders.cjs');
const ai = require('../lib/ai.cjs');
const batch = require('../lib/aiBatch.cjs');

afterEach(() => vi.restoreAllMocks());

describe('provider parsing edge cases', () => {
  it('openai: drops reasoning/thinking parts from array content', () => {
    const r = providers.openaiText({
      choices: [{ message: { content: [{ type: 'reasoning', text: 'secret plan' }, { type: 'thinking', thinking: 'x', text: 'hmm' }, { type: 'text', text: 'Răspuns' }, '!'] }, finish_reason: 'stop' }],
    });
    expect(r.text).toBe('Răspuns!');
  });
  it('openai: empty content on a normal stop is an error, not silent ""', () => {
    expect(() => providers.openaiText({ choices: [{ message: { content: null, reasoning_content: 'thinking…' }, finish_reason: 'stop' }] })).toThrow(providers.ProviderError);
  });
  it('gemini: drops thought parts', () => {
    const r = providers.geminiText({ candidates: [{ content: { parts: [{ text: 'gând', thought: true }, { text: 'Bun' }] }, finishReason: 'STOP' }] });
    expect(r.text).toBe('Bun');
  });
  it('gemini: RECITATION / BLOCKLIST / SPII are refusals', () => {
    for (const fr of ['RECITATION', 'BLOCKLIST', 'SPII']) {
      expect(() => providers.geminiText({ candidates: [{ finishReason: fr }] })).toThrow(/refuzat/);
    }
  });
  it('gemini: candidate without content and MAX_TOKENS keeps the stop reason', () => {
    expect(providers.geminiText({ candidates: [{ finishReason: 'MAX_TOKENS' }] })).toEqual({ text: '', stopReason: 'MAX_TOKENS' });
  });
  it('base URL pasted with /chat/completions is not doubled', () => {
    const c = providers.resolveConfig({ provider: 'custom', model: 'm', baseUrl: 'http://localhost:1234/v1/chat/completions/' });
    expect(c.baseUrl).toBe('http://localhost:1234/v1');
  });
});

describe('runAction truncation', () => {
  it('throws on max_tokens instead of returning a truncated proofread (would replace the document)', async () => {
    vi.spyOn(providers, 'completeFull').mockResolvedValue({ text: 'jumătate de', stopReason: 'max_tokens' });
    await expect(ai.runAction({ provider: 'ollama', action: 'proofread', text: 'x' })).rejects.toThrow(/prea lung/);
  });
  it('throws on OpenAI length and Gemini MAX_TOKENS too', async () => {
    for (const sr of ['length', 'MAX_TOKENS']) {
      vi.spyOn(providers, 'completeFull').mockResolvedValue({ text: 'a', stopReason: sr });
      await expect(ai.runAction({ provider: 'ollama', action: 'continue', text: 'x' })).rejects.toThrow(/prea lung/);
    }
  });
});

describe('aiBatch cache scoped by provider + model', () => {
  it('switching model does not reuse another model\'s cached answer', async () => {
    const cache = batch.createCache(null);
    const fakeAi = { runEditorial: vi.fn(async (o) => ({ text: `from ${o.model}` })) };
    const docs = [{ id: 'a', title: 'A', text: 'text' }];
    const r1 = await batch.bulkSynopsis({ docs, cache, run: batch.makeRun({ provider: 'openai', model: 'm1', apiKey: 'k' }, fakeAi) });
    const r2 = await batch.bulkSynopsis({ docs, cache, run: batch.makeRun({ provider: 'openai', model: 'm2', apiKey: 'k' }, fakeAi) });
    expect(r1.results.a).toBe('from m1');
    expect(r2.results.a).toBe('from m2');
    expect(r2.cachedCount).toBe(0);
    const r3 = await batch.bulkSynopsis({ docs, cache, run: batch.makeRun({ provider: 'openai', model: 'm1', apiKey: 'other' }, fakeAi) });
    expect(r3.cachedCount).toBe(1);
  });
  it('concurrency limit respected', async () => {
    let live = 0;
    let peak = 0;
    const run = async () => { live++; peak = Math.max(peak, live); await new Promise((r) => setTimeout(r, 5)); live--; return 's'; };
    const docs = Array.from({ length: 10 }, (_, i) => ({ id: String(i), title: 't', text: `x${i}` }));
    await batch.bulkSynopsis({ docs, run, concurrency: 2 });
    expect(peak).toBe(2);
  });
});

describe('editorial proposal staleness', () => {
  it('detects the document changed while the AI was working', () => {
    const p = { id: 'a', before: '<p>v1</p>' };
    expect(proposalIsStale(p, '<p>v1</p>')).toBe(false);
    expect(proposalIsStale(p, '<p>v1 edited</p>')).toBe(true);
  });
  it('selection proposals are stale when the selection moved', () => {
    const p = { id: 'a', before: '<p>sel</p>', base: '<p>doc</p>', selection: true, selText: 'sel' };
    expect(proposalIsStale(p, '<p>doc</p>', 'sel')).toBe(false);
    expect(proposalIsStale(p, '<p>doc</p>', 'other')).toBe(true);
  });
});
