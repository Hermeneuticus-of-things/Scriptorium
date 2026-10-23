import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const aiRuns = require('../lib/aiRuns.cjs');

// A provider call that only ends when its signal is aborted (a hung server).
const hang = (signal) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));

describe('AI requests in flight', () => {
  it('cancel aborts the running request with a clear message', async () => {
    const p = aiRuns.track('w1', hang);
    expect(aiRuns.cancel('w1')).toBe(1);
    await expect(p).rejects.toThrow('anulată');
    expect(aiRuns.cancel('w1')).toBe(0);
  });

  it('a hung request stops at the timeout', async () => {
    await expect(aiRuns.track('w2', hang, 30)).rejects.toThrow('depășit');
  });

  it('cancel only affects the window that started the request', async () => {
    let doneB = false;
    const a = aiRuns.track('A', hang);
    const b = aiRuns.track('B', (s) => new Promise((r) => setTimeout(() => r('ok'), 20)).then((v) => ((doneB = true), v)));
    aiRuns.cancel('A');
    await expect(a).rejects.toThrow('anulată');
    await expect(b).resolves.toBe('ok');
    expect(doneB).toBe(true);
  });

  it('errors from the provider pass through unchanged', async () => {
    await expect(aiRuns.track('w3', async () => { throw new Error('Cheie greșită'); })).rejects.toThrow('Cheie greșită');
  });
});
