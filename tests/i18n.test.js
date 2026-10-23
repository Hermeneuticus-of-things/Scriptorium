import { describe, it, expect, afterEach } from 'vitest';
import { dictionaries, t, setLanguage, getLanguage, cmdLabel, groupLabel } from '../src/lib/i18n.js';
import { applySettingsCss, DEFAULT_SETTINGS } from '../src/lib/settingsDefaults.js';
import fs from 'node:fs';

afterEach(() => setLanguage('ro'));

describe('i18n', () => {
  it('every ro key exists in en and vice versa', () => {
    const ro = Object.keys(dictionaries.ro), en = Object.keys(dictionaries.en);
    expect(ro.filter((k) => !en.includes(k))).toEqual([]);
    expect(en.filter((k) => !ro.includes(k))).toEqual([]);
  });
  it('defaults to ro, switches, interpolates, falls back', () => {
    expect(getLanguage()).toBe('ro');
    expect(t('btn.save')).toBe('Salvează');
    setLanguage('en');
    expect(t('btn.save')).toBe('Save');
    expect(t('cmd.layout', { name: 'X' })).toBe('Layout: X');
    expect(t('nope.key')).toBe('nope.key');
    setLanguage('xx');
    expect(getLanguage()).toBe('ro');
  });
  it('cmdLabel/groupLabel', () => {
    setLanguage('en');
    expect(cmdLabel('save', 'S')).toBe('Save now');
    expect(cmdLabel('layout:0', 'Layout: A')).toBe('Layout: A');
    expect(groupLabel('file')).toBe('File');
  });
  it('covers every command id in App commandList', () => {
    const src = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
    const block = src.slice(src.indexOf('const commandList = ['), src.indexOf('const commands = Object.fromEntries'));
    const ids = [...block.matchAll(/\[\s*'(\w+)',\s*'(\w+)'/g)].map((m) => m[2]);
    expect(ids.length).toBeGreaterThan(10);
    expect(ids.filter((id) => !(`cmd.${id}` in dictionaries.ro))).toEqual([]);
  });
});

describe('applySettingsCss', () => {
  it('sets and removes CSS variables', () => {
    const props = {};
    const root = { style: { setProperty: (k, v) => (props[k] = v), removeProperty: (k) => delete props[k] }, dataset: {} };
    applySettingsCss({ ...DEFAULT_SETTINGS, fontSize: 20, accentColor: '#ff0000' }, root);
    expect(props['--editor-font-size']).toBe('20px');
    expect(props['--accent']).toBe('#ff0000');
    applySettingsCss({ accentColor: '' }, root);
    expect(props['--accent']).toBeUndefined();
  });
});
