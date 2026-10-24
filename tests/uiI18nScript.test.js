import { describe, it, expect, afterEach } from 'vitest';
import { setLanguage, t } from '../src/lib/i18n.js';
import { SCRIPT_FORMAT_LIST } from '../src/lib/scriptFormats.js';

afterEach(() => setLanguage('ro'));
describe('script format names in the Format menu', () => {
  it('have an English name for every format', () => {
    setLanguage('en');
    for (const f of SCRIPT_FORMAT_LIST) {
      const s = t(`ui.scriptFormat.${f.id}`);
      expect(s, f.id).not.toMatch(/^ui\./);
      expect(s, f.id).not.toMatch(/[ăâîșț]/i);
    }
  });
  it('keep the Romanian name in Romanian', () => {
    for (const f of SCRIPT_FORMAT_LIST) expect(t(`ui.scriptFormat.${f.id}`)).toBe(f.label);
  });
});
