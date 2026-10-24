import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { contextMenuLabels } = require('../lib/services.cjs');

describe('native editor context menu labels', () => {
  it('exist in Romanian and English with the same keys', () => {
    const ro = contextMenuLabels('ro');
    const en = contextMenuLabels('en');
    expect(Object.keys(en).sort()).toEqual(Object.keys(ro).sort());
    expect(ro.translate).toBe('Traduce');
  });
  it('have no Romanian in English', () => {
    const en = contextMenuLabels('en');
    for (const [k, v] of Object.entries(en)) {
      const s = typeof v === 'function' ? v('xyz') : v;
      expect(s, k).not.toMatch(/[ăâîșțĂÂÎȘȚ]|Traduce|Caută|Lipește|Copiază|Taie\b/);
    }
    expect(en.addToDict('casă')).toContain('casă');
  });
  it('falls back to Romanian for unknown languages', () => {
    expect(contextMenuLabels('xx')).toEqual(contextMenuLabels('ro'));
  });
});
