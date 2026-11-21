import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';

// Registrul de decizii și provenance (directiva autor 2026-11-20): fiecare generare și fiecare
// decizie a autorului produc un eveniment append-only, cu actor, model, hash-uri și semantică.
const require = createRequire(import.meta.url);
const aiAudit = require('../lib/aiAudit.cjs');
const { listFixedPhrases, touchedFixedPhrases } = await import('../src/lib/fixedPhrases.js');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ai-audit-'));

describe('lib/aiAudit — registru de decizii', () => {
  it('append + read: evenimente complete, append-only, cu timestamp', () => {
    const d = tmp();
    aiAudit.append(d, { actor: 'agent', action: 'revise', model: 'claude-x', promptHash: 'p1', rulesHash: 'r1' });
    aiAudit.append(d, { actor: 'autor', action: 'revise', decision: 'acceptat', note: 'fraze fixate atinse: X' });
    const ev = aiAudit.read(d);
    expect(ev).toHaveLength(2);
    expect(ev[0].actor).toBe('agent');
    expect(ev[0].decision).toBe('generat');
    expect(ev[0].semantic).toBe('sens'); // revise = schimbare de sens, nu de formă
    expect(ev[1].actor).toBe('autor');
    expect(ev[1].decision).toBe('acceptat');
    expect(ev[1].at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it('clasificarea semantică: formă vs sens vs conținut', () => {
    expect(aiAudit.semanticOf('proofread')).toBe('formă');
    expect(aiAudit.semanticOf('translate')).toBe('formă');
    expect(aiAudit.semanticOf('revise')).toBe('sens');
    expect(aiAudit.semanticOf('continue')).toBe('conținut');
    expect(aiAudit.semanticOf('summarize')).toBe('sinopsis');
    expect(aiAudit.semanticOf('ask')).toBe('analiză');
  });
  it('nu aruncă niciodată (auditul nu rupe fluxul de scriere)', () => {
    expect(() => aiAudit.append('', {})).not.toThrow();
    expect(() => aiAudit.append(null, null)).not.toThrow();
    expect(aiAudit.read(path.join(tmp(), 'inexistent'))).toEqual([]);
  });
  it('provenance e legat în fluxul ai:run (main) și deciziile vin pe ai:audit', async () => {
    const fs2 = await fs.promises.readFile(new URL('../electron/main.cjs', import.meta.url), 'utf8');
    expect(fs2).toContain("require('../lib/aiAudit.cjs')");
    expect(fs2).toContain("decision: 'generat'");
    expect(fs2).toContain("handle('ai:audit'");
    const pre = await fs.promises.readFile(new URL('../electron/preload.cjs', import.meta.url), 'utf8');
    expect(pre).toContain("call('ai:audit'");
  });
});

describe('fixedPhrases — garda frazelor fixate', () => {
  it('listează frazele pe rând', () => {
    expect(listFixedPhrases('Fraza fixată\n\n  Alta  ')).toEqual(['Fraza fixată', 'Alta']);
    expect(listFixedPhrases('')).toEqual([]);
  });
  it('detectează fraza fixată prezentă înainte și scoasă după', () => {
    const before = 'Text vechi. Cuvântul autorului rămâne aici. Sfârșit.';
    const after = 'Text nou. Sfârșit.';
    expect(touchedFixedPhrases(before, after, ['Cuvântul autorului rămâne aici'])).toEqual(['Cuvântul autorului rămâne aici']);
    expect(touchedFixedPhrases(before, before, ['Cuvântul autorului rămâne aici'])).toEqual([]);
    expect(touchedFixedPhrases(before, after, ['frază care nici nu era'])).toEqual([]);
  });
  it('normalizează spațiile la comparație', () => {
    expect(touchedFixedPhrases('Fraza   cu    spații', 'Altceva', ['Fraza cu spații'])).toEqual(['Fraza cu spații']);
  });
});
