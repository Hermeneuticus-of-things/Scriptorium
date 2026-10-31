import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { MENU_GROUPS, MENU_TIERS, PROGRAM_COMMANDS, SUBMENUS, buildMenuLayout, tierOf } from '../src/lib/menuLayout.js';
import { readingLensItems, pageLookItems, zoomPresetItems } from '../src/lib/readingLenses.js';

// Menu reorg (owner GO 2026-10-31): APPLICATION / PROJECT / WORKFLOW tiers, never mixed;
// PROGRAM settings and PROJECT settings are different doors; View > Reading / Page / Zoom.
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const fb = fs.readFileSync(new URL('../src/components/FormatBar.jsx', import.meta.url), 'utf8');
const entries = [...app.matchAll(/^\s*\['([a-z]+)', '([A-Za-z0-9_]+)', tr\(/gm)].map((m) => ({ group: m[1], id: m[2] }));
const groupOf = (id) => entries.find((e) => e.id === id)?.group;

describe('menu tiers', () => {
  it('every menu belongs to exactly one tier', () => {
    const all = Object.values(MENU_TIERS).flat();
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual([...MENU_GROUPS].sort());
  });
  it('every registered command sits in a known menu', () => {
    expect(entries.length).toBeGreaterThan(100);
    for (const e of entries) expect(MENU_GROUPS, e.id).toContain(e.group);
  });
  it('program commands live only in the Program menu (APPLICATION tier)', () => {
    for (const id of PROGRAM_COMMANDS) expect(groupOf(id), id).toBe('app');
    expect(entries.filter((e) => e.group === 'app').map((e) => e.id).sort()).toEqual([...PROGRAM_COMMANDS].sort());
    expect(tierOf('app')).toBe('application');
  });
  it('project settings stay in the PROJECT tier, AI doors stay in AI, never the program door', () => {
    expect(tierOf(groupOf('projectSettings'))).toBe('project');
    expect(groupOf('aiSettings')).toBe('ai');
    expect(groupOf('aiProjectSettings')).toBe('ai');
    expect(app).toContain("['app', 'settings', tr('cmd.settings'), () => setDialog('settings')]");
    expect(app).not.toMatch(/\['app', 'projectSettings'/);
  });
  it('window and reading commands moved out of File and Tools', () => {
    expect(groupOf('newWindow')).toBe('window');
    expect(groupOf('dialogueFocus')).toBe('view');
  });
});

describe('View > Reading / Page / Zoom', () => {
  const t = (k, v) => (v ? `${k}:${JSON.stringify(v)}` : k);
  const commands = {};
  for (const [id, group] of [['dialogueFocus', 'view'], ['linguisticFocus', 'view'], ['pageFull', 'view'], ['zoomIn', 'view'], ['zoomOut', 'view'], ['settings', 'app']]) commands[id] = { id, group };
  const layout = buildMenuLayout(commands, {
    item: (id) => ({ id, label: id }),
    label: (k) => k,
    append: { 'menu.reading': readingLensItems({ t, view: {}, setView: () => {} }), 'menu.zoom': zoomPresetItems({ setZoom: () => {}, curZoom: () => 100 }) },
  });
  const view = layout.find((m) => m.group === 'view');
  it('Reading, Page and Zoom are submenus of View', () => {
    expect(SUBMENUS.view.map((d) => d[0])).toEqual(expect.arrayContaining(['menu.reading', 'menu.page', 'menu.zoom']));
    const reading = view.items.find((x) => x.label === 'menu.reading');
    expect(reading.submenu.map((x) => x.id || x.label)).toEqual(expect.arrayContaining(['dialogueFocus', 'linguisticFocus', 'ui.formatBar.focus_paragraph']));
    expect(reading.submenu.map((x) => x.id || x.label)).not.toContain('posNouns');
    expect(view.items.find((x) => x.label === 'menu.zoom').submenu.some((x) => x.label === 'V Zoom 100%')).toBe(true);
    expect(layout[0].group).toBe('app');
  });
  it('reading lenses carry no page, zoom, ruler or invisibles item', () => {
    const labels = readingLensItems({ t, view: {}, setView: () => {} }).filter((x) => x !== '-').map((x) => x.label).join('|');
    expect(labels).not.toMatch(/pageView|facing|ruler|invisibles|Zoom/);
    expect(pageLookItems({ t, view: {}, setView: () => {} }).map((x) => x.label).join('|')).toMatch(/facing/);
  });
  it('the FormatBar "Lectură" menu is the shared lens list only', () => {
    expect(fb).toContain('const viewItems = readingLensItems({ t: tr, view, setView });');
    const at = fb.indexOf('const viewItems');
    expect(fb.slice(at, at + 200)).not.toMatch(/facing|ruler|Zoom/);
  });
});