import { describe, it, expect } from 'vitest';
import { normalizeList, toolbarPrefs, toolbarSettings, TOP_ITEMS, TOP_DEFAULT, FORMAT_ITEMS, FORMAT_DEFAULT, topItemAvailable } from '../src/lib/toolbars.js';
import { buildMenuLayout, nativeMenuSpec, AI_ONLY_COMMANDS, SUBMENUS } from '../src/lib/menuLayout.js';
import { dictionaries } from '../src/lib/i18n.js';

describe('toolbar registry', () => {
  it('ids are unique and defaults are known', () => {
    for (const [items, defs] of [[TOP_ITEMS, TOP_DEFAULT], [FORMAT_ITEMS, FORMAT_DEFAULT]]) {
      const ids = items.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const d of defs) expect(ids.includes(d) || ['sep', 'space'].includes(d)).toBe(true);
    }
  });
  it('every item label exists in RO and EN', () => {
    for (const it of [...TOP_ITEMS, ...FORMAT_ITEMS]) for (const l of ['ro', 'en']) expect(dictionaries[l][it.label], `${l} ${it.label}`).toBeTruthy();
  });
  it('AI and desktop-only items', () => {
    const ai = TOP_ITEMS.find((i) => i.id === 'ai');
    expect(topItemAvailable(ai, { aiEnabled: false, desktop: true })).toBe(false);
    expect(topItemAvailable(TOP_ITEMS.find((i) => i.id === 'aiMenu'), { aiEnabled: true, desktop: false })).toBe(false);
  });
});

describe('normalizeList', () => {
  const known = ['a', 'b', 'c', 'd'];
  it('no saved list: defaults', () => expect(normalizeList(undefined, ['a', 'b'], known)).toEqual(['a', 'b']));
  it('drops unknown ids and duplicates, keeps spaces', () => {
    expect(normalizeList(['b', 'zzz', 'b', 'space', 'a', 'space', 42], ['a', 'b'], known, ['a', 'b'])).toEqual(['b', 'space', 'a', 'space']);
  });
  it('appends defaults added later, not those the user removed', () => {
    // user saved when a,b,c existed and removed b; d is a new default
    expect(normalizeList(['a', 'c'], ['a', 'b', 'd'], known, ['a', 'b', 'c'])).toEqual(['a', 'c', 'd']);
  });
  it('trims separators at the edges and doubled ones', () => {
    expect(normalizeList(['sep', 'a', 'sep', 'sep', 'b', 'sep'], [], known, known)).toEqual(['a', 'sep', 'b']);
  });
  it('toolbarPrefs round trip', () => {
    const p = toolbarPrefs(toolbarSettings({ top: ['compile', 'views'], format: ['undo', 'bui'], display: 'icon' }));
    expect(p.top).toEqual(['compile', 'views']);
    expect(p.format).toEqual(['undo', 'bui']);
    expect(p.display).toBe('icon');
    expect(toolbarPrefs({ display: 'bogus' }).display).toBe('iconText');
  });
});

describe('menu layout', () => {
  const cmd = (group, id, disabled = false) => ({ group, id, label: id, run: () => {}, disabled, key: '' });
  const list = [cmd('ai', 'irep'), cmd('ai', 'ai'), cmd('ai', 'aiSettings'), cmd('ai', 'aiResearchSel'), cmd('ai', 'aiDefineSel'), cmd('ai', 'aiBulkSynopsis'),
    cmd('file', 'save'), cmd('file', 'import'), cmd('file', 'importOpml'), cmd('format', 'styles'), cmd('window', 'fullScreen'), cmd('edit', 'findDoc'), cmd('view', 'viewEditor')];
  const commands = Object.fromEntries(list.map((c) => [c.id, c]));
  const item = (id) => ({ id, label: id, action: () => {} });
  const layout = buildMenuLayout(commands, { item, label: (k) => k, extras: { nav: [{ label: 'Parent', action: () => {} }] } });
  it('AI menu: panels first, selection submenu, settings last', () => {
    const ai = layout.find((m) => m.group === 'ai').items;
    expect(ai[0].id).toBe('ai');
    expect(ai[1].id).toBe('irep');
    expect(ai.find((x) => x.submenu)?.label).toBe('menu.aiSelection');
    expect(ai[ai.length - 1].id).toBe('aiSettings');
  });
  it('Format folds into Edit, Window into View; submenus group commands', () => {
    expect(layout.find((m) => m.group === 'format')).toBeUndefined();
    expect(layout.find((m) => m.group === 'edit').items.some((x) => x.label === 'group.format')).toBe(true);
    expect(layout.find((m) => m.group === 'view').items.some((x) => x.label === 'group.window')).toBe(true);
    expect(layout.find((m) => m.group === 'file').items.find((x) => x.label === 'menu.import').submenu.map((x) => x.id)).toEqual(['import', 'importOpml']);
  });
  it('native spec carries ids; extra actions get generated ids', () => {
    const { spec, actions } = nativeMenuSpec(layout);
    const nav = spec.find((m) => m.label === 'group.nav');
    expect(nav.items[0].id).toMatch(/^menu:/);
    expect(typeof actions[nav.items[0].id]).toBe('function');
    expect(spec.find((m) => m.label === 'group.file').items.find((x) => x.items).items[0].id).toBe('import');
  });
  it('AI-only list and submenu labels are translated', () => {
    expect(AI_ONLY_COMMANDS.has('irep')).toBe(false);
    expect(AI_ONLY_COMMANDS.has('aiSettings')).toBe(false);
    for (const defs of Object.values(SUBMENUS)) for (const [k] of defs) for (const l of ['ro', 'en']) expect(dictionaries[l][k], k).toBeTruthy();
  });
});
