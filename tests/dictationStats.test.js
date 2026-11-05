// Live dictation-engine stats: CPU% math, tasklist parsing, nvidia-smi parsing.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ds = require('../lib/dictationStats.cjs');

describe('computeCpuPct', () => {
  it('Δcpu / Δwall × 100 — multi-thread poate depăși 100', () => {
    expect(ds.computeCpuPct(1, 3.5, 2)).toBe(125);
    expect(ds.computeCpuPct(1, 1.5, 2)).toBe(25);
  });
  it('0 când datele lipsesc sau wall nu e valid', () => {
    expect(ds.computeCpuPct(null, 2, 1)).toBe(0);
    expect(ds.computeCpuPct(1, 2, 0)).toBe(0);
    expect(ds.computeCpuPct(1, 2, -1)).toBe(0);
  });
  it('nu coboară sub 0 (timp CPU nu scade)', () => {
    expect(ds.computeCpuPct(5, 4, 1)).toBe(0);
  });
});

describe('parseTasklistRow + aggregateTasklist', () => {
  it('parsează rândul CSV și agregă pe imagine', () => {
    const csv = '"whisper-server.exe","123","Console","1","1 048 576 K"\n"DTED.exe","456","Console","1","512 000 K"\n"chrome.exe","789","Console","1","999 999 K"';
    const agg = ds.aggregateTasklist(csv, ['DTED.exe', 'whisper-server.exe']);
    expect(agg).toEqual([
      { name: 'whisper-server.exe', pids: [123], ramMB: 1024 },
      { name: 'DTED.exe', pids: [456], ramMB: 500 },
    ]);
  });
  it('imagini străine ignorate', () => {
    expect(ds.aggregateTasklist('"chrome.exe","1","C","1","100 K"', ['DTED.exe'])).toEqual([]);
  });
});

describe('parseNvidiaSmi', () => {
  it('parsează used/total/util din CSV', () => {
    expect(ds.parseNvidiaSmi('3482, 8192, 45')).toEqual({ vramUsedGB: 3.4, vramTotalGB: 8, gpuUtilPct: 45 });
  });
  it('linie lipsă / invalid → null', () => {
    expect(ds.parseNvidiaSmi('')).toBe(null);
    expect(ds.parseNvidiaSmi('a, b, c')).toBe(null);
  });
});
