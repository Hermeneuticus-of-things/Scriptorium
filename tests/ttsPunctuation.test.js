import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { normalizeForPiper } = require('../lib/ttsEngine.cjs');

// The built-in voice "Mihai" (Piper) must hear Romanian punctuation, not read it flat. These pin the
// normalization that gives espeak-ng the right intonation/pauses.
describe('normalizeForPiper — Romanian punctuation for the built-in voice', () => {
  it('keeps the pause/intonation punctuation espeak already handles', () => {
    expect(normalizeForPiper('Unu, doi; trei: patru? cinci!')).toBe('Unu, doi; trei: patru? cinci!');
  });

  it('turns the ellipsis into dots espeak pauses on', () => {
    expect(normalizeForPiper('Stai… gândește.')).toBe('Stai... gândește.');
  });

  it('turns an em/en dash into a comma pause, keeping sentences intact', () => {
    expect(normalizeForPiper('Mihai — vocea – citește.')).toBe('Mihai, vocea, citește.');
  });

  it('turns parentheses/brackets into a comma pause around the aside', () => {
    expect(normalizeForPiper('Era bine (chiar foarte bine) atunci.')).toBe('Era bine, chiar foarte bine, atunci.');
  });

  it('drops a leading dialogue dash but keeps the paragraph break', () => {
    expect(normalizeForPiper('— Salut, zise el.\n— Bună.')).toBe('Salut, zise el.\nBună.');
  });

  it('drops quotes and guillemets (no pause, not spoken)', () => {
    const out = normalizeForPiper('El spuse „da” și « nu ».');
    expect(out).not.toMatch(/[„“”«»"]/);
    expect(out).toContain('da');
    expect(out).toContain('nu');
  });

  it('collapses blank lines between paragraphs to a single break (a pause, not a run-on)', () => {
    expect(normalizeForPiper('Primul.\n\nAl doilea.')).toBe('Primul.\nAl doilea.');
  });
});
