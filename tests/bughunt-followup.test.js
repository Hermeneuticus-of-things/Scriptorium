import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const providers = require('../lib/aiProviders.cjs');
const ai = require('../lib/ai.cjs');
const { ProviderError } = providers;
const RO = /[ăâîșțĂÂÎȘȚ]|Cheie|Verifică|Încearcă|Setează|Alege|Modelul/;

describe('AI errors in English mode', () => {
  const cases = [
    new ProviderError('x', { status: 401, provider: 'openai' }),
    new ProviderError('x', { status: 403, provider: 'openai' }),
    new ProviderError('x', { status: 404, provider: 'openai' }),
    new ProviderError('x', { status: 410, provider: 'openai' }),
    new ProviderError('x', { status: 429, provider: 'openai' }),
    new ProviderError('x', { status: 503, provider: 'openai' }),
    new ProviderError('x', { status: 418, provider: 'openai' }),
    new ProviderError('fetch failed', { provider: 'gemini', code: 'network' }),
    new ProviderError('Modelul a refuzat cererea.', { code: 'refusal' }),
    new ProviderError('Modelul a întors un răspuns gol.', { code: 'bad_response', provider: 'openai' }),
    new ProviderError('Răspuns invalid (nu e JSON).', { code: 'bad_response', provider: 'openai' }),
  ];
  it('every provider error has an English message; Romanian stays the default', () => {
    for (const e of cases) {
      expect(ai.friendlyError(e, 'en')).not.toMatch(RO);
      expect(ai.friendlyError(e)).toBe(providers.friendlyProviderError(e, 'ro'));
    }
    expect(ai.friendlyError(cases[0])).toMatch(/Cheie API invalidă/);
  });
  it('configuration errors (no key / no model / no URL) are translated too', async () => {
    const errs = [
      await providers.completeFull({ provider: 'openai', prompt: 'x' }).catch((e) => e),
      await providers.completeFull({ provider: 'custom', apiKey: 'k', model: 'm', baseUrl: '', prompt: 'x' }).catch((e) => e),
      await ai.runAction({ provider: 'anthropic', action: 'proofread', text: 'a' }).catch((e) => e),
    ];
    for (const e of errs) {
      expect(e).toBeInstanceOf(Error);
      expect(ai.friendlyError(e, 'en')).not.toMatch(RO);
      expect(ai.friendlyError(e, 'ro')).toMatch(RO);
    }
  });
});

describe('ai.cjs own messages in English', () => {
  it('refusal / too long / unknown action', () => {
    for (const m of ['Modelul a refuzat cererea.', 'Textul e prea lung pentru o singură trecere. Selectează un fragment mai scurt.', 'Textul e prea lung pentru o singură trecere. Lucrează pe un document mai scurt.', 'Acțiune necunoscută: zz']) {
      expect(ai.friendlyError(new Error(m), 'en')).not.toMatch(RO);
      expect(ai.friendlyError(new Error(m))).toBe(m);
    }
  });
});

import { wordAt } from '../src/lib/textRange.js';
describe('right-click word selection (wordAt)', () => {
  const w = (t, o) => { const r = wordAt(t, o); return r && t.slice(...r); };
  it('a doubled hyphen used as a dash separates words', () => {
    expect(w('cuvânt--altul', 3)).toBe('cuvânt');
    expect(w('cuvânt--altul', 10)).toBe('altul');
    expect(w('cuvânt - altul', 3)).toBe('cuvânt');
  });
  it('keeps Romanian hyphenated forms and elisions whole', () => {
    expect(w('s-a dus', 0)).toBe('s-a');
    expect(w('într-o zi', 6)).toBe('într-o');
    expect(w('l’am văzut', 3)).toBe('l’am');
    expect(w('„casă” mare', 5)).toBe('casă');
    expect(w('‘casă’', 3)).toBe('casă');
    expect(w("'casă'", 0)).toBe('casă');
  });
  it('handles letters outside the BMP (surrogate pairs)', () => {
    expect(w('𝒜bc d', 2)).toBe('𝒜bc');
    expect(w('𝒜bc d', 1)).toBe('𝒜bc');
    expect(w('x 😀 y', 3)).toBe(null);
  });
});

const aiRuns = require('../lib/aiRuns.cjs');
describe('AI cancel / timeout / empty text', () => {
  it('cancel and timeout messages have English versions', async () => {
    const hang = (signal) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
    const p = aiRuns.track('w1', hang, 60000);
    aiRuns.cancel('w1');
    const cancelled = await p.catch((e) => e);
    const timedOut = await aiRuns.track('w2', hang, 30).catch((e) => e);
    for (const e of [cancelled, timedOut, new Error('Funcțiile AI sunt oprite din Setări.')]) {
      expect(ai.friendlyError(e, 'en')).not.toMatch(RO);
      expect(ai.friendlyError(e)).toBe(e.message);
    }
    expect(ai.friendlyError(timedOut, 'en')).toMatch(/\b0 seconds|\d+ seconds/);
  });
  it('an action on empty text is refused before any request', async () => {
    let called = 0;
    const orig = providers.completeFull;
    providers.completeFull = async () => { called += 1; return { text: 'x', stopReason: 'end_turn' }; };
    try {
      await expect(ai.runAction({ provider: 'anthropic', apiKey: 'k', action: 'proofread', text: '  \n ' })).rejects.toThrow();
      expect(called).toBe(0);
      await ai.runAction({ provider: 'anthropic', apiKey: 'k', action: 'ask', text: '', question: 'Ce?' });
      expect(called).toBe(1);
    } finally {
      providers.completeFull = orig;
    }
  });
});

describe('Romanian number agreement in the AI timeout message', () => {
  const hang = (signal) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(new Error('aborted'))));
  it('the message itself follows the rule', async () => {
    const e = await aiRuns.track('a', hang, 1000).catch((x) => x);
    expect(e.message).toMatch(/depășit 1 secundă și/);
  });
  it('formats counts', () => {
    expect(aiRuns.secondsRo(1)).toBe('1 secundă');
    expect(aiRuns.secondsRo(10)).toBe('10 secunde');
    expect(aiRuns.secondsRo(19)).toBe('19 secunde');
    expect(aiRuns.secondsRo(20)).toBe('20 de secunde');
    expect(aiRuns.secondsRo(300)).toBe('300 de secunde');
    expect(aiRuns.secondsRo(101)).toBe('101 secunde');
    expect(aiRuns.secondsRo(119)).toBe('119 secunde');
    expect(aiRuns.secondsRo(120)).toBe('120 de secunde');
  });
});
