import { describe, it, expect } from 'vitest';
// Coada de revizuire editorială (PLAN-AI-DEDICAT Etapa 2, principii A2UI varianta 1):
// diff monolitic → carduri per schimbare, acceptare pe subset cu o singură scriere.
import { diffSegments, applySubset, countChanges, changeContext } from '../src/lib/aiReviewQueue.js';

describe('diffSegments — segmentarea schimbărilor', () => {
  it('separă schimbările individuale dintr-un text', () => {
    const before = 'Ana are mere. Ion are pere.';
    const result = 'Ana are pere. Ion are mere.';
    const seg = diffSegments(before, result);
    expect(seg.changes.length).toBeGreaterThanOrEqual(2);
    expect(seg.changes[0].i).toBe(0);
  });
  it('fără schimbări → null (fallback monolitic)', () => {
    expect(diffSegments('Text identic.', 'Text identic.')).toBeNull();
    expect(diffSegments('', '')).toBeNull();
  });
  it('poate reconstitui rezultatul aplicând TOATE schimbările', () => {
    const before = 'El vine azi și pleacă mâine.';
    const result = 'El sosește azi și pleacă poimâine.';
    const seg = diffSegments(before, result);
    const all = new Set(seg.changes.map((c) => c.i));
    expect(applySubset(before, result, all)).toBe(result);
  });
  it('aplicarea subsetului păstrează originalul în rest', () => {
    const before = 'El vine azi și pleacă mâine.';
    const result = 'El sosește azi și pleacă poimâine.';
    const seg = diffSegments(before, result);
    // acceptă doar PRIMA schimbare: „vine”→„sosește” rămâne, „mâine” rămâne original
    const first = new Set([seg.changes[0].i]);
    const out = applySubset(before, result, first);
    expect(out).toContain('sosește');
    expect(out).toContain('mâine');
    expect(out).not.toContain('poimâine');
  });
  it('subset vid → textul original intact', () => {
    const before = 'El vine azi.';
    const result = 'El sosește azi.';
    expect(applySubset(before, result, new Set())).toBe(before);
  });
});

describe('countChanges + context', () => {
  it('numără schimbările', () => {
    expect(countChanges('Ana are mere.', 'Ana avea mere.')).toBeGreaterThanOrEqual(1);
    expect(countChanges('Ana', 'Ana')).toBe(0);
  });
  it('changeContext dă vecinătățile din textul original', () => {
    const ctx = changeContext('Prima parte. Cuvântul cheie rămâne aici. Final.', 'cheie');
    expect(ctx.lead).toContain('Prima');
    expect(ctx.trail).toContain('Final');
  });
  it('cuvânt absent din before → context gol', () => {
    const ctx = changeContext('Alt text.', 'inexistent');
    expect(ctx.lead).toBe('');
    expect(ctx.trail).toBe('');
  });
});
