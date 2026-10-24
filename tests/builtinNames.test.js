import { describe, it, expect, afterEach } from 'vitest';
import { builtinName, setLanguage } from '../src/lib/i18n.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const F = require('../lib/compileFormats.cjs');

describe('built-in format and style names follow the interface language', () => {
  afterEach(() => setLanguage('ro'));
  it('every built-in Compile format has an English name, Romanian stays as stored', () => {
    const builtins = F.allFormats().filter((f) => f.builtin);
    setLanguage('en');
    for (const f of builtins) expect(builtinName('format', f)).not.toBe(f.name === 'E-book' || f.name === 'Modern' ? '' : f.name);
    setLanguage('ro');
    for (const f of builtins) expect(builtinName('format', f)).toBe(f.name);
  });
  it('a renamed or user style keeps its own name in English', () => {
    setLanguage('en');
    expect(builtinName('style', { id: 'motto', name: 'Motto' })).toBe('Epigraph');
    expect(builtinName('style', { id: 'motto', name: 'Motto-ul meu' })).toBe('Motto-ul meu');
    expect(builtinName('style', { id: 'x1', name: 'Al meu' })).toBe('Al meu');
  });
});
