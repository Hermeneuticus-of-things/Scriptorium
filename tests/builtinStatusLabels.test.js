import { describe, it, expect, afterEach } from 'vitest';
import { setLanguage, t } from '../src/lib/i18n.js';
import { noneLabel, noneStatus } from '../src/lib/projectSettings.js';

describe('built-in labels and statuses follow the interface language (display only)', () => {
  afterEach(() => setLanguage('ro'));
  it('English shows translated defaults; user names stay as stored', () => {
    setLanguage('en');
    expect(noneStatus('Prima ciornă', t)).toBe('First Draft');
    expect(noneStatus('De făcut', t)).toBe('To Do');
    expect(noneLabel('Personaj', t)).toBe('Character');
    expect(noneLabel('Eticheta mea', t)).toBe('Eticheta mea');
    expect(noneStatus('Fără', t)).toBe('No status');
  });
  it('Romanian shows the stored names unchanged', () => {
    expect(noneStatus('Prima ciornă', t)).toBe('Prima ciornă');
    expect(noneLabel('Loc', t)).toBe('Loc');
  });
});
