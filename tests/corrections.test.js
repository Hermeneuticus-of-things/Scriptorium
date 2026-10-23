import { describe, expect, it } from 'vitest';
import { correctionFor, isSentenceStart, simulateTyping } from '../src/editor/corrections.js';
import { spaceOffsets } from '../src/editor/invisibles.js';

const all = { smartDashes: true, smartEllipsis: true, autoCapitalize: true, replacements: [{ from: 'teh', to: 'the' }, { from: '(c)', to: '©' }] };

describe('correctionFor', () => {
  it('turns -- into an em dash', () => {
    expect(correctionFor('a -', '-', all)).toEqual({ deleteFrom: 1, insert: '—' });
    expect(simulateTyping('a -- b', all)).toBe('A — b');
  });
  it('leaves --- alone after the first conversion and respects smartDashes=false', () => {
    expect(correctionFor('a--', '-', all)).toBeNull();
    expect(simulateTyping('a -- b', { smartDashes: false })).toBe('a -- b');
  });
  it('turns ... into an ellipsis', () => {
    expect(simulateTyping('Da...', all)).toBe('Da…');
    expect(simulateTyping('Da...', { smartEllipsis: false })).toBe('Da...');
  });
  it('capitalizes sentence starts only when enabled', () => {
    expect(simulateTyping('ana are mere. ea pleacă! ce? ok… da', all)).toBe('Ana are mere. Ea pleacă! Ce? Ok… Da');
    expect(simulateTyping('ana. ea', { autoCapitalize: false })).toBe('ana. ea');
    expect(simulateTyping('„ana', all)).toBe('„Ana');
  });
  it('does not capitalize after common abbreviations or mid-sentence', () => {
    expect(simulateTyping('Vezi etc. altele', all)).toBe('Vezi etc. altele');
    expect(simulateTyping('Unu doi', all)).toBe('Unu doi');
  });
  it('applies replacements on a word boundary only', () => {
    expect(simulateTyping('Vezi teh carte', all)).toBe('Vezi the carte');
    expect(simulateTyping('Vezi tehnic ', all)).toBe('Vezi tehnic ');
    expect(simulateTyping('Vezi ateh ', all)).toBe('Vezi ateh ');
    expect(simulateTyping('Copyright (c) ', all)).toBe('Copyright © ');
    expect(simulateTyping('X teh.', all)).toBe('X the.');
  });
  it('returns null when nothing applies', () => {
    expect(correctionFor('abc', 'd', all)).toBeNull();
    expect(correctionFor('', 'a', {})).toBeNull();
  });
});

describe('isSentenceStart', () => {
  it('detects block start and punctuation + space', () => {
    expect(isSentenceStart('')).toBe(true);
    expect(isSentenceStart('Gata. ')).toBe(true);
    expect(isSentenceStart('Gata.')).toBe(false);
    expect(isSentenceStart('gata ')).toBe(false);
  });
});

describe('spaceOffsets', () => {
  it('finds normal and non-breaking spaces', () => {
    expect(spaceOffsets('a b c')).toEqual([1, 3]);
  });
});
