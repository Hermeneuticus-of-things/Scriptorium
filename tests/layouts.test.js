import { describe, it, expect } from 'vitest';
import { normalizeLayouts, normalizePayload, nextLayoutName, summaryOf } from '../src/lib/layouts.js';

const payload = { view: 'corkboard', widths: { binder: 300, side: 260 }, showInspector: false, showBinder: true, splitId: 'd7', composition: false };

describe('normalizePayload', () => {
  it('keeps the six layout keys with sane types', () => {
    expect(normalizePayload(payload)).toEqual(payload);
  });
  it('fills defaults so applying always sets every captured value', () => {
    expect(normalizePayload({ view: 'outline' })).toEqual({
      view: 'outline', showInspector: true, showBinder: true, splitId: null, composition: false,
    });
  });
  it('drops junk payloads (no view, no widths)', () => {
    expect(normalizePayload(null)).toBeNull();
    expect(normalizePayload('x')).toBeNull();
    expect(normalizePayload({ name: 'empty' })).toBeNull();
    expect(normalizePayload({ widths: { binder: 'wide' } })).toBeNull();
  });
  it('migrates the legacy flat shape (hideBinder → inverted showBinder)', () => {
    const legacy = { name: 'Old', view: 'editor', hideBinder: true, widths: { binder: 200, side: 340 }, split: true, showAi: true };
    expect(normalizePayload(legacy)).toEqual({
      view: 'editor', widths: { binder: 200, side: 340 }, showInspector: true, showBinder: false, splitId: null, composition: false,
    });
  });
});

describe('normalizeLayouts', () => {
  it('returns a valid array for anything stored', () => {
    expect(normalizeLayouts(undefined)).toEqual([]);
    expect(normalizeLayouts('nope')).toEqual([]);
    expect(normalizeLayouts([null, 5, { name: 'A', payload }])).toEqual([{ name: 'A', payload }]);
  });
  it('accepts the legacy flat entry shape', () => {
    const layouts = normalizeLayouts([{ name: 'Old', view: 'editor', hideBinder: true }]);
    expect(layouts).toHaveLength(1);
    expect(layouts[0].payload.showBinder).toBe(false);
  });
  it('rejects empty names by generating unique defaults', () => {
    const layouts = normalizeLayouts([{ name: '   ', payload }, { payload: { view: 'outline' } }, { name: '', payload: { view: 'timeline' } }]);
    expect(layouts.map((l) => l.name)).toEqual(['Layout', 'Layout 2', 'Layout 3']);
  });
  it('dedupes names, first occurrence wins', () => {
    const layouts = normalizeLayouts([
      { name: 'A', payload: { view: 'editor' } },
      { name: 'A', payload: { view: 'corkboard' } },
      { name: 'B', payload: { view: 'outline' } },
      { name: 'A', payload: { view: 'timeline' } },
    ]);
    expect(layouts.map((l) => l.name)).toEqual(['A', 'B']);
    expect(layouts[0].payload.view).toBe('editor');
  });
  it('trims name whitespace', () => {
    expect(normalizeLayouts([{ name: '  Scris  ', payload }])[0].name).toBe('Scris');
  });
  it('is idempotent (round-trip through JSON keeps the list)', () => {
    const list = [
      { name: 'Scris', payload },
      { name: 'Nou aranjament', payload: { view: 'outline', widths: { binder: 260, side: 320 } } },
    ];
    const once = normalizeLayouts(list);
    const twice = normalizeLayouts(JSON.parse(JSON.stringify(once)));
    expect(twice).toEqual(once);
  });
});

describe('nextLayoutName', () => {
  it('returns the base name when free', () => {
    expect(nextLayoutName([], 'Nou aranjament')).toBe('Nou aranjament');
  });
  it('appends the first free counter', () => {
    const list = [{ name: 'Nou aranjament' }, { name: 'Nou aranjament 2' }, { name: 'X' }];
    expect(nextLayoutName(list, 'Nou aranjament')).toBe('Nou aranjament 3');
    expect(nextLayoutName([{ name: 'Layout' }], 'Layout')).toBe('Layout 2');
  });
  it('is used by normalizeLayouts for unnamed entries', () => {
    expect(normalizeLayouts([{ payload }, { name: 'Layout 2', payload }])[0].name).toBe('Layout');
  });
});

describe('summaryOf', () => {
  it('always names the view, then only deviations from the default arrangement', () => {
    expect(summaryOf({ view: 'corkboard' })).toEqual(['corkboard']);
    expect(summaryOf({ view: 'editor', showBinder: true, showInspector: true, splitId: null, composition: false })).toEqual(['editor']);
    expect(summaryOf({ view: 'editor', showBinder: false, showInspector: false, splitId: 'd1', composition: true })).toEqual([
      'editor', 'binderOff', 'inspectorOff', 'split', 'composition',
    ]);
    expect(summaryOf(null)).toEqual(['editor']);
  });
});
