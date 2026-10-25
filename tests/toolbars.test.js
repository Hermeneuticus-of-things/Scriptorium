import { describe, it, expect } from 'vitest';
import { normalizeList, toolbarPrefs, toolbarSettings, TOP_ITEMS, TOP_DEFAULT, FORMAT_ITEMS, FORMAT_DEFAULT, topItemAvailable } from '../src/lib/toolbars.js';
import { buildMenuLayout, nativeMenuSpec, AI_ONLY_COMMANDS, SUBMENUS, MENU_GROUPS, gotoItems } from '../src/lib/menuLayout.js';
import { editorMenus, stepSize, curlyQuotes } from '../src/lib/editorMenus.js';
import { DEFAULT_KEYS, conflicts } from '../src/lib/commands.js';
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
  it('Format and Window are menus of their own, in the bar order; submenus group commands', () => {
    expect(MENU_GROUPS).toEqual(['file', 'edit', 'insert', 'view', 'nav', 'project', 'document', 'format', 'window', 'tools', 'ai', 'help']);
    expect(layout.map((m) => m.group)).toEqual(['file', 'edit', 'view', 'nav', 'format', 'window', 'ai']);
    expect(layout.find((m) => m.group === 'format').items[0].id).toBe('styles');
    expect(layout.find((m) => m.group === 'edit').items.some((x) => x.label === 'group.format')).toBe(false);
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

describe('menu layout: Find submenu, Go To binder tree, appended items, native roles', () => {
  const cmd = (group, id) => ({ group, id, label: id, run: () => {}, disabled: false, key: '' });
  const commands = Object.fromEntries(['findDoc', 'findNext', 'findPrev', 'findProject', 'selectWord'].map((id) => [id, cmd('edit', id)]).concat([['scriptOff', cmd('format', 'scriptOff')], ['script_a', cmd('format', 'script_a')], ['goto', cmd('nav', 'goto')]]));
  const item = (id) => ({ id, label: id, action: () => {} });
  const tree = [
    { id: 'd', root: 'draft', title: 'Manuscris', children: [{ id: 'c1', title: 'Cap 1', children: [{ id: 's1', title: 'Scena', favorite: true }] }] },
    { id: 'r', root: 'research', title: 'Cercetare', children: [{ id: 'n', title: 'Notițe' }] },
    { id: 't', root: 'trash', title: 'Coș', children: [{ id: 'x', title: 'Șters' }] },
  ];
  const went = [];
  const layout = buildMenuLayout(commands, {
    item, label: (k) => k,
    extras: { insert: [{ label: 'Comentariu', action: () => {} }], window: [{ label: 'Min', role: 'minimize', hidden: true, action: () => {} }] },
    after: { edit: [{ label: 'Transformări', submenu: [{ label: 'MAJ', action: () => {} }] }] },
    goto: { tree, go: (id) => went.push(id) },
  });
  it('Find commands in one submenu, Edit ends with the appended items; scripts grouped', () => {
    const edit = layout.find((m) => m.group === 'edit').items;
    expect(edit[0].label).toBe('menu.find');
    expect(edit[0].submenu.map((x) => x.id)).toEqual(['findDoc', 'findNext', 'findPrev', 'findProject']);
    expect(edit[edit.length - 1].label).toBe('Transformări');
    expect(layout.find((m) => m.group === 'format').items[0].submenu.map((x) => x.id)).toEqual(['scriptOff', 'script_a']);
    expect(layout.find((m) => m.group === 'insert').items[0].label).toBe('Comentariu');
  });
  it('Navigate › Go To: favorites first, then Draft and Research with their children; no trash', () => {
    const nav = layout.find((m) => m.group === 'nav').items;
    expect(nav[0].label).toBe('menu.goTo');
    const labels = nav[0].submenu.map((x) => (x === '-' ? '-' : x.label.trim()));
    expect(labels).toEqual(['★ Scena', '-', 'Manuscris', 'Cap 1', 'Scena', '-', 'Cercetare', 'Notițe']);
    nav[0].submenu[3].action();
    expect(went).toEqual(['c1']);
    expect(gotoItems([{ id: 'r', root: 'draft', title: 'R', children: Array.from({ length: 500 }, (_, i) => ({ id: `n${i}`, title: `N${i}` })) }], { go: () => {} }).length).toBeLessThanOrEqual(201);
  });
  it('native spec keeps roles and drops hidden items', () => {
    const { spec } = nativeMenuSpec(buildMenuLayout(commands, { item, label: (k) => k, extras: { window: [{ label: 'Min', role: 'minimize', action: () => {} }, { label: 'Ascuns', hidden: true, action: () => {} }] } }));
    const win = spec.find((m) => m.label === 'group.window');
    expect(win.items).toEqual([expect.objectContaining({ label: 'Min', role: 'minimize' })]);
  });
});

describe('default shortcuts', () => {
  it('no two commands share a key; Ctrl+G finds next, Go To dialog on Ctrl+Alt+G', () => {
    expect([...conflicts(Object.keys(DEFAULT_KEYS), {})]).toEqual([]);
    expect(DEFAULT_KEYS.findNext).toBe('Ctrl+G');
    expect(DEFAULT_KEYS.findPrev).toBe('Ctrl+Shift+G');
    expect(DEFAULT_KEYS.goto).toBe('Ctrl+Alt+G');
    // Menu-only labels (editor keys) are not registry shortcuts, so they never run twice.
    for (const k of ['Ctrl+B', 'Ctrl+I', 'Ctrl+U', 'Ctrl+Shift+V', 'Ctrl+Z', 'Ctrl+Y']) expect(Object.values(DEFAULT_KEYS)).not.toContain(k);
  });
});

describe('editor menus (Edit, Insert, Format, View, Window)', () => {
  const t = (k) => k;
  const calls = [];
  const settingsPatches = [];
  const m = editorMenus({ t, handle: () => ({ addComment: () => calls.push('comment'), addFootnote: () => calls.push('fn'), addInlineFootnote: () => calls.push('ifn'), addAnnotation: () => calls.push('ann') }), view: { revision: 2 }, setView: (v) => calls.push(v), settings: {}, setSettings: (p) => settingsPatches.push(p), styles: [], run: () => {}, desktop: false });
  const labels = (list) => list.filter((x) => x !== '-').map((x) => x.label);
  it('Insert has the notes, image, date, placeholders, special characters and table', () => {
    expect(labels(m.insert)).toEqual(['ui.menu.comment', 'ui.menu.footnote', 'ui.menu.annotation', 'ui.menu.inlineFootnote', 'ui.menu.image', 'ui.menu.dateTime', 'ui.menu.placeholder', 'ui.menu.specialChars', 'ui.menu.pageBreak', 'ui.menu.table']);
    m.insert[0].action(); m.insert[1].action(); m.insert[2].action(); m.insert[3].action();
    expect(calls).toEqual(['comment', 'fn', 'ann', 'ifn']);
  });
  it('Format: B/I/U only show their keys (no registry shortcut), revision levels are checked', () => {
    const font = m.format.find((x) => x.label === 'ui.menu.font').submenu;
    expect(font.slice(0, 3).map((x) => x.shortcut)).toEqual(['Ctrl+B', 'Ctrl+I', 'Ctrl+U']);
    expect(font.every((x) => x === '-' || !x.id)).toBe(true);
    const rev = m.format.find((x) => x.label === 'ui.menu.revisionMode').submenu;
    expect(rev.filter((x) => x !== '-' && x.label.startsWith('✓')).length).toBe(1);
    rev[0].action();
    expect(calls.at(-1)).toEqual({ revision: 0 });
  });
  it('View: label color toggles are stored in settings.labelColorIn with the defaults', () => {
    const sub = m.view.find((x) => x.label === 'ui.menu.labelColorIn').submenu;
    expect(sub.map((x) => x.label.startsWith('✓'))).toEqual([false, true, false, true]);
    sub[0].action();
    expect(settingsPatches.at(-1)).toEqual({ labelColorIn: { binder: true, cards: true, outliner: false, icons: true } });
  });
  it('Edit: clipboard items carry native roles; Window items hidden in the browser', () => {
    expect(m.edit.filter((x) => x.role).map((x) => x.role)).toEqual(['cut', 'copy', 'paste', 'pasteAndMatchStyle']);
    expect(m.window.every((x) => x.hidden)).toBe(true);
    expect(stepSize('12pt', 1)).toBe('13pt');
    expect(stepSize('', -1)).toBe('11pt');
    expect(curlyQuotes('a "b" c')).toBe('a „b” c');
  });
});

describe('normalizeList separators (bug: doubled trailing separator survived)', () => {
  it('drops a doubled separator at the end and after removed ids', () => {
    const known = ['a', 'b'];
    expect(normalizeList(['a', 'sep', 'sep'], [], known, known)).toEqual(['a']);
    expect(normalizeList(['a', 'sep', 'gone', 'sep'], [], known, known)).toEqual(['a']);
    expect(normalizeList(['sep', 'a', 'sep', 'sep', 'b'], [], known, known)).toEqual(['a', 'sep', 'b']);
  });
});
