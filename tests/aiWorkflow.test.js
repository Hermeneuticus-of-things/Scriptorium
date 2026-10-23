import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { diffParts, createHistory, actionKind, citationParts } from '../src/lib/aiSession.js';

const require = createRequire(import.meta.url);
const providers = require('../lib/aiProviders.cjs');
const batch = require('../lib/aiBatch.cjs');
const registerRag = require('../electron/ragHandlers.cjs');
const aiRuns = require('../lib/aiRuns.cjs');

// A fetch whose response body is an SSE stream split into arbitrary chunks.
const sseFetch = (chunks, { status = 200, type = 'text/event-stream' } = {}) => {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const enc = new TextEncoder();
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: 'x',
      headers: { get: (h) => (h.toLowerCase() === 'content-type' ? type : '') },
      body: (async function* gen() { for (const c of chunks) yield enc.encode(c); })(),
      json: async () => JSON.parse(chunks.join('')),
      text: async () => chunks.join(''),
    };
  };
  fn.calls = calls;
  return fn;
};

describe('streaming: SSE parser', () => {
  it('joins events split across chunks and multi-line data', async () => {
    const enc = new TextEncoder();
    const body = (async function* g() {
      yield enc.encode('data: {"a"');
      yield enc.encode(':1}\n\n: comment\n\ndata: x\ndata: y\r\n\r\ndata: last');
    })();
    const out = [];
    for await (const d of providers.sseData(body)) out.push(d);
    expect(out).toEqual(['{"a":1}', 'x\ny', 'last']);
  });
  it('keeps multi-byte UTF-8 characters split between chunks', async () => {
    const bytes = new TextEncoder().encode('data: ăîș\n\n');
    const body = (async function* g() { yield bytes.slice(0, 7); yield bytes.slice(7); })();
    const out = [];
    for await (const d of providers.sseData(body)) out.push(d);
    expect(out).toEqual(['ăîș']);
  });
});

describe('streaming: OpenAI-compatible', () => {
  it('streams deltas, skips reasoning, stops at [DONE]', async () => {
    const f = sseFetch([
      'data: {"choices":[{"delta":{"reasoning_content":"hmm"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"Bu"}}]}\n\ndata: {"choices":[{"delta":{"content":"nă"},"finish_reason":"stop"}]}\n\n',
      'data: [DONE]\n\n',
    ]);
    const deltas = [];
    const r = await providers.completeFull({ provider: 'openrouter', model: 'm', apiKey: 'k', prompt: 'P', onDelta: (d) => deltas.push(d) }, { fetch: f });
    expect(r).toEqual({ text: 'Bună', stopReason: 'stop' });
    expect(deltas).toEqual(['Bu', 'nă']);
    expect(f.calls[0].body.stream).toBe(true);
    expect(f.calls[0].url).toBe('https://openrouter.ai/api/v1/chat/completions');
  });
  it('content_filter mid-stream is a refusal', async () => {
    const f = sseFetch(['data: {"choices":[{"delta":{"content":"x"},"finish_reason":"content_filter"}]}\n\n']);
    await expect(providers.completeFull({ provider: 'openai', model: 'm', apiKey: 'k', prompt: 'P', onDelta: () => {} }, { fetch: f })).rejects.toThrow(/refuzat/);
  });
  it('server that ignores stream and returns JSON still works', async () => {
    const f = sseFetch([JSON.stringify({ choices: [{ message: { content: 'Tot' }, finish_reason: 'stop' }] })], { type: 'application/json' });
    const deltas = [];
    const r = await providers.completeFull({ provider: 'ollama', model: 'm', prompt: 'P', onDelta: (d) => deltas.push(d) }, { fetch: f });
    expect(r.text).toBe('Tot');
    expect(deltas).toEqual(['Tot']);
  });
  it('falls back to a non-streaming request when the server rejects stream (400)', async () => {
    let n = 0;
    const f = async (url, init) => {
      n++;
      const body = JSON.parse(init.body);
      if (body.stream) return { ok: false, status: 400, statusText: 'bad', text: async () => '{"error":{"message":"stream unsupported"}}' };
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }] }) };
    };
    const r = await providers.completeFull({ provider: 'custom', baseUrl: 'http://x/v1', model: 'm', prompt: 'P', onDelta: () => {} }, { fetch: f });
    expect(r.text).toBe('OK');
    expect(n).toBe(2);
  });
  it('401 is not retried and stays a friendly provider error', async () => {
    const f = sseFetch(['{"error":{"message":"bad key"}}'], { status: 401 });
    const err = await providers.completeFull({ provider: 'openai', model: 'm', apiKey: 'k', prompt: 'P', onDelta: () => {} }, { fetch: f }).catch((e) => e);
    expect(providers.friendlyProviderError(err)).toMatch(/Cheie API invalidă pentru OpenAI/);
    expect(f.calls.length).toBe(1);
  });
});

describe('streaming: Gemini', () => {
  it('uses streamGenerateContent?alt=sse and drops thought parts', async () => {
    const f = sseFetch([
      'data: {"candidates":[{"content":{"parts":[{"text":"gând","thought":true}]}}]}\r\n\r\n',
      'data: {"candidates":[{"content":{"parts":[{"text":"Salut"}]}}]}\r\n\r\n',
      'data: {"candidates":[{"content":{"parts":[{"text":"!"}]},"finishReason":"STOP"}]}\r\n\r\n',
    ]);
    const deltas = [];
    const r = await providers.completeFull({ provider: 'gemini', model: 'models/g', apiKey: 'AIza', prompt: 'P', onDelta: (d) => deltas.push(d) }, { fetch: f });
    expect(r).toEqual({ text: 'Salut!', stopReason: 'STOP' });
    expect(deltas).toEqual(['Salut', '!']);
    expect(f.calls[0].url).toBe('https://generativelanguage.googleapis.com/v1beta/models/g:streamGenerateContent?alt=sse&key=AIza');
  });
  it('SAFETY finish mid-stream is a refusal', async () => {
    const f = sseFetch(['data: {"candidates":[{"finishReason":"SAFETY"}]}\n\n']);
    await expect(providers.completeFull({ provider: 'gemini', model: 'g', apiKey: 'k', prompt: 'P', onDelta: () => {} }, { fetch: f })).rejects.toThrow(/refuzat/);
  });
});

describe('streaming: Anthropic', () => {
  it('forwards SDK text events to onDelta', async () => {
    const { Messages } = require('@anthropic-ai/sdk/resources/beta/messages/messages');
    const listeners = {};
    const fakeStream = {
      on: (ev, fn) => { listeners[ev] = fn; return fakeStream; },
      finalMessage: async () => {
        listeners.text('Sa');
        listeners.text('lut');
        return { content: [{ type: 'thinking', thinking: 'x' }, { type: 'text', text: 'Salut' }], stop_reason: 'end_turn' };
      },
    };
    const { vi } = await import('vitest');
    const s = vi.spyOn(Messages.prototype, 'stream').mockReturnValue(fakeStream);
    const deltas = [];
    try {
      const r = await providers.completeFull({ provider: 'anthropic', apiKey: 'k', prompt: 'P', onDelta: (d) => deltas.push(d) });
      expect(r).toEqual({ text: 'Salut', stopReason: 'end_turn' });
      expect(deltas).toEqual(['Sa', 'lut']);
    } finally {
      s.mockRestore();
    }
  });
});

// Bug: cancelling a bulk job threw away every synopsis already written.
describe('bulk jobs keep partial results when cancelled', () => {
  const docs = [1, 2, 3, 4].map((i) => ({ id: `d${i}`, title: `D${i}`, text: `text ${i}` }));
  it('bulkSynopsis returns finished docs with cancelled: true', async () => {
    const ctrl = new AbortController();
    let calls = 0;
    const run = async ({ prompt }) => {
      calls++;
      if (calls === 2) {
        ctrl.abort();
        throw new Error('aborted');
      }
      return `syn ${prompt.length}`;
    };
    const r = await batch.bulkSynopsis({ docs, run, concurrency: 1, signal: ctrl.signal });
    expect(r.cancelled).toBe(true);
    expect(Object.keys(r.results)).toEqual(['d1']);
    expect(r.errors).toEqual({}); // the aborted call is not an error of that document
  });
  it('multiZoomReview returns findings so far with cancelled: true', async () => {
    const ctrl = new AbortController();
    let calls = 0;
    const run = async () => {
      calls++;
      if (calls === 2) ctrl.abort();
      return JSON.stringify({ findings: [{ severity: 'GRAVE', issue: `i${calls}` }] });
    };
    const r = await batch.multiZoomReview({ docs, levels: ['Mezzo'], run, concurrency: 1, signal: ctrl.signal });
    expect(r.cancelled).toBe(true);
    expect(r.findings.length).toBe(2);
  });
  it('bookConsistency merges extracted docs and skips the cross-check', async () => {
    const ctrl = new AbortController();
    let calls = 0;
    const run = async () => {
      calls++;
      if (calls === 2) ctrl.abort();
      return JSON.stringify({ characters: [{ name: 'Ana', attributes: { ochi: 'verzi' } }], facts: [] });
    };
    const r = await batch.bookConsistency({ docs, run, concurrency: 1, signal: ctrl.signal });
    expect(r.cancelled).toBe(true);
    expect(Object.keys(r.sheets.docs).length).toBe(2);
    expect(calls).toBe(2);
  });
});

// Bug: rag:ask was not registered with aiRuns, so "Anulează" did nothing and a hung server kept the panel busy.
describe('rag:ask is cancellable', () => {
  it('cancel(window) aborts the ask', async () => {
    const handlers = {};
    const store = {
      loadProject: () => ({ tree: [{ id: 'draft', root: 'draft', children: [{ id: 'a', title: 'A' }] }] }),
      walk: (nodes, fn) => nodes.forEach((n) => fn(n)),
      readDoc: (_d, id, kind) => (kind === 'docs' ? '<p>Andrei are ochi verzi.</p>' : ''),
    };
    let gotSignal = null;
    registerRag({
      handle: (ch, fn) => (handlers[ch] = fn),
      store,
      assertOpened: () => {},
      getSettings: () => ({}),
      getApiKey: () => 'k',
      ai: {
        runAction: ({ signal }) => {
          gotSignal = signal;
          return new Promise((_, rej) => signal.addEventListener('abort', () => rej(new Error('aborted'))));
        },
      },
    });
    const e = { sender: { id: 'rag-w', isDestroyed: () => false, send: () => {} } };
    const p = handlers['rag:ask'](e, '/p', 'ochi');
    await new Promise((r) => setTimeout(r, 20));
    expect(gotSignal).toBeTruthy();
    expect(aiRuns.cancel('rag-w')).toBe(1);
    await expect(p).rejects.toThrow('anulată');
  });
});

describe('aiSession helpers', () => {
  it('diffParts marks words added and removed', () => {
    const parts = diffParts('Era o dimineata rece.', 'Era o dimineață rece.');
    expect(parts.filter((p) => p.removed).map((p) => p.value.trim())).toEqual(['dimineata']);
    expect(parts.filter((p) => p.added).map((p) => p.value.trim())).toEqual(['dimineață']);
    expect(parts.filter((p) => !p.added && !p.removed).map((p) => p.value).join('')).toContain('Era o');
  });
  it('history keeps the last N results, newest first', () => {
    const h = createHistory(3);
    for (let i = 1; i <= 5; i++) h.add({ action: 'continue', text: `t${i}` });
    expect(h.list().map((x) => x.text)).toEqual(['t5', 't4', 't3']);
    expect(h.list()[0].id).toBeTruthy();
    h.clear();
    expect(h.list()).toEqual([]);
  });
  it('actionKind says which actions replace text and which insert', () => {
    expect(actionKind('proofread')).toBe('replace');
    expect(actionKind('continue')).toBe('insert');
    expect(actionKind('summarize')).toBe('synopsis');
    expect(actionKind('feedback')).toBe('read');
  });
  it('citationParts turns [1] and [2, 3] into links to the passages', () => {
    const parts = citationParts('Ochii sunt verzi [1], vezi și [2, 3] și [9].', 3);
    expect(parts.filter((p) => p.cite).map((p) => p.cite)).toEqual([1, 2, 3]);
    expect(parts.map((p) => p.text || '').join('')).toContain('[9]');
  });
});

// UX bug: the bulk job showed nothing (and no Cancel) until the first document finished.
describe('bulk jobs announce themselves', () => {
  it('first progress event is done: 0', async () => {
    const prog = [];
    await batch.bulkSynopsis({ docs: [{ id: 'a', text: 'x' }], run: async () => 's', onProgress: (p) => prog.push(p) });
    expect(prog[0]).toMatchObject({ job: 'bulkSynopsis', done: 0, total: 1 });
    const z = [];
    await batch.multiZoomReview({ docs: [{ id: 'a', title: 'A', text: 'x' }], levels: ['Mezzo'], run: async () => '{"findings":[]}', onProgress: (p) => z.push(p) });
    expect(z[0]).toMatchObject({ job: 'zoomReview', done: 0, total: 1 });
  });
});
