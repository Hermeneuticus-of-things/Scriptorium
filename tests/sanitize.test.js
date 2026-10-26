import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { stripAiWatermarks, hasHiddenChars, countHidden } from '../src/lib/sanitize.js';
import { lint, autofix, profileFor, applyLists, GENERIC_PROFILE } from '../src/lib/editorial.js';

const require = createRequire(import.meta.url);
const cjs = require('../lib/sanitizeText.cjs');

// A sample that packs the known AI-fingerprint characters plus normal text and a legit diacritic.
const DIRTY =
  'Ătman​ are un sens' + // ZWSP, narrow nbsp, nbsp
  '⁠﻿­' + // word joiner, BOM, soft hyphen
  '󠅧' + // a variation selector supplement (steganography carrier)
  '‮bidi‬' + // bidi override pair
  ' linie'; // line separator

describe('sanitize — strip LLM fingerprint characters', () => {
  it('removes zero-width / bidi / variation-selector carriers and normalises exotic spaces', () => {
    const out = stripAiWatermarks(DIRTY);
    expect(out).toBe('Ătman are un sens' + 'bidi' + '\nlinie');
    expect(hasHiddenChars(out)).toBe(false);
  });

  it('keeps combining diacritics (ALOGEN transliteration) and ordinary text intact', () => {
    const clean = 'Ātman ṛṣi și ī rămân neatinse.';
    expect(stripAiWatermarks(clean)).toBe(clean);
    expect(hasHiddenChars(clean)).toBe(false);
  });

  it('counts the hidden characters it would strip', () => {
    expect(countHidden('a​b c')).toBe(2);
    expect(countHidden('curat')).toBe(0);
  });

  it('ESM and CJS twins behave identically (parity guard)', () => {
    expect(cjs.stripAiWatermarks(DIRTY)).toBe(stripAiWatermarks(DIRTY));
    expect(cjs.hasHiddenChars(DIRTY)).toBe(hasHiddenChars(DIRTY));
  });
});

describe('editorial — hidden chars, custom lists, AI rules', () => {
  it('lint flags invisible characters and autofix removes them', () => {
    const html = '<p>Text​ cu amprentă.</p>';
    const issues = lint(html, { profile: GENERIC_PROFILE });
    expect(issues.some((i) => i.rule === 'hiddenChars')).toBe(true);
    expect(hasHiddenChars(autofix(html))).toBe(false);
  });

  it('applyLists turns a custom set into flagged phrases', () => {
    const profile = applyLists(GENERIC_PROFILE, { custom: [{ name: 'Clișee', words: ['în peisajul', 'fascinant'] }] });
    const issues = lint('<p>Ceva fascinant aici.</p>', { profile });
    const hit = issues.find((i) => i.rule === 'custom');
    expect(hit).toBeTruthy();
    expect(hit.message).toContain('Clișee');
  });

  it('profileFor carries the author aiRules free-text onto the profile', () => {
    const p = profileFor({ editorialProfile: { base: 'generic', aiRules: 'Nu folosi „în peisajul".' } }, null);
    expect(p.aiRules).toContain('în peisajul');
  });
});
