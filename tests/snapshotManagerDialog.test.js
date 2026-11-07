// @vitest-environment jsdom
// P1 #26: componente Snapshots Manager — grupare pe document cu binder path, căutare
// (nume/text/dată, plain + regex), selecție multiplă (Ctrl/Shift), ștergere în masă cu
// confirmare, export, comparare prin aceeași vedere de diff ca în Inspector.
import { describe, it, expect, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import SnapshotManagerDialog from '../src/components/SnapshotManagerDialog.jsx';
import { setLanguage } from '../src/lib/i18n.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const TREE = [
  { id: 'r', title: 'Cartea', children: [
    { id: 'd1', title: 'Scena 1' },
    { id: 'd2', title: 'Scena 2' },
  ] },
];

// d1: beta (2026-03) și Alpha (2026-01) — sortările dată/titlu le ordonează diferit.
const ALL = [
  { id: 'd1', snaps: [
    { file: 'f2.json', name: 'beta', date: '2026-03-01T10:00:00.000Z' },
    { file: 'f1.json', name: 'Alpha', date: '2026-01-01T09:00:00.000Z' },
  ] },
  { id: 'd2', snaps: [
    { file: 'f3.json', name: 'Gamma', date: '2026-02-01T08:00:00.000Z' },
  ] },
];

const FULL = {
  d1: [
    { file: 'f2.json', name: 'beta', date: '2026-03-01T10:00:00.000Z', html: '<p>text beta</p>' },
    { file: 'f1.json', name: 'Alpha', date: '2026-01-01T09:00:00.000Z', html: '<p>text alpha</p>' },
  ],
  d2: [
    { file: 'f3.json', name: 'Gamma', date: '2026-02-01T08:00:00.000Z', html: '<p>text gamma</p>' },
  ],
};

function fakeApi(overrides = {}) {
  const all = JSON.parse(JSON.stringify(ALL));
  const full = JSON.parse(JSON.stringify(FULL));
  const current = { d1: '<p>textul curent unu</p>', d2: '<p>textul curent doi</p>' };
  return {
    listAllSnapshots: vi.fn(async () => JSON.parse(JSON.stringify(all))), // IPC: copie proaspătă la fiecare apel
    listSnapshots: vi.fn(async (_dir, id) => full[id] || []),
    readDoc: vi.fn(async (_dir, id) => current[id] || ''),
    searchSnapshots: vi.fn(async (_dir, q, { regex = false } = {}) => {
      const re = regex ? new RegExp(q, 'i') : null;
      const hit = (s) => (re ? re.test(s.name) : s.name.toLowerCase().includes(String(q).toLowerCase()));
      const out = [];
      for (const g of all) for (const s of g.snaps) if (hit(s)) out.push({ id: g.id, file: s.file, name: s.name, date: s.date, where: ['title'] });
      return out;
    }),
    deleteSnapshots: vi.fn(async (_dir, items) => {
      let n = 0;
      for (const it of items) {
        for (const g of all) {
          if (g.id !== it.id) continue;
          const before = g.snaps.length;
          g.snaps = g.snaps.filter((s) => s.file !== it.file);
          if (g.snaps.length < before) n += 1;
        }
      }
      return n;
    }),
    exportSnapshot: vi.fn(async () => '/tmp/exportat.html'),
    ...overrides,
  };
}

const flush = () => new Promise((r) => setTimeout(r, 30));
const settle = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 280)); }); };

let root, el;
afterEach(() => {
  act(() => root.unmount());
  el.remove();
  setLanguage('ro');
  vi.restoreAllMocks();
});

function mount(props = {}) {
  el = document.createElement('div');
  document.body.append(el);
  root = createRoot(el);
  const api = props.api || fakeApi();
  const base = {
    api,
    dir: 'D:/proj/P.scribner',
    project: { tree: TREE },
    docs: { d1: '<p>textul curent unu</p>', d2: '<p>textul curent doi</p>' },
    onChanged: () => {},
    onOpen: () => {},
    onReveal: () => {},
    onError: () => {},
    onClose: () => {},
    ...props,
  };
  act(() => root.render(React.createElement(SnapshotManagerDialog, base)));
  return api;
}

const rows = () => [...el.querySelectorAll('li[role="option"]')];
const rowByName = (name) => rows().find((r) => r.textContent.includes(name));
const click = (node, opts = {}) => act(() => node.dispatchEvent(new MouseEvent('click', { bubbles: true, ...opts })));
const type = (node, text) => act(() => {
  // React's value tracker must see the change: set through the native setter, then signal input.
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(node, text);
  node.dispatchEvent(new Event('input', { bubbles: true }));
});

describe('Snapshots Manager: listă grupată pe document', () => {
  it('shows every snapshot grouped by document, with the binder path and counts', async () => {
    mount();
    await act(flush);
    const groups = [...el.querySelectorAll('li.snap-group')];
    expect(groups.map((g) => g.querySelector('.snap-group-title').textContent)).toEqual(['Scena 1', 'Scena 2']);
    expect(groups[0].querySelector('.snap-group-path').textContent).toBe('Cartea');
    expect(groups[0].querySelector('.snap-group-count').textContent).toBe('2');
    expect(rows().map((r) => r.querySelector('.snap-title').textContent)).toEqual(['beta', 'Alpha', 'Gamma']); // dată desc în fiecare grup
    expect(el.textContent).not.toMatch(/ui\.snap\./);
  });
  it('keeps snapshots of deleted documents visible as orphans, translated', async () => {
    mount({ project: { tree: [{ id: 'r', title: 'Cartea', children: [{ id: 'd1', title: 'Scena 1' }] }] } });
    await act(flush);
    const groups = [...el.querySelectorAll('li.snap-group')];
    expect(groups[1].querySelector('.snap-group-title').textContent).toBe('(fără titlu)');
    expect(groups[1].querySelector('.snap-group-path').textContent).toBe('');
  });
  it('sorts rows by title or date from the column headers (aria-sort)', async () => {
    mount();
    await act(flush);
    act(() => el.querySelector('.snap-head button.sm-sort-title').click());
    await act(flush);
    expect(rows().map((r) => r.querySelector('.snap-title').textContent)).toEqual(['Alpha', 'beta', 'Gamma']);
    expect(el.querySelector('button.sm-sort-title').closest('[aria-sort]').getAttribute('aria-sort')).toBe('ascending');
  });
});

describe('Snapshots Manager: căutare', () => {
  it('filters project-wide by snapshot title and shows the result counter', async () => {
    const api = mount();
    await act(flush);
    type(el.querySelector('input.snap-search'), 'gamma');
    await settle();
    expect(api.searchSnapshots).toHaveBeenCalledWith('D:/proj/P.scribner', 'gamma', { regex: false });
    expect(rows().map((r) => r.querySelector('.snap-title').textContent)).toEqual(['Gamma']);
    expect(el.querySelector('.snap-search-count').textContent).toBe('1 din 3 snapshot-uri');
    expect(rowByName('Gamma').querySelector('.snap-where').textContent).toContain('titlu');
  });
  it('searches in the text too (backend decides) and resets when cleared', async () => {
    const api = mount({
      api: fakeApi({
        searchSnapshots: vi.fn(async (_d, q) => (q === 'gamma-text' ? [{ id: 'd2', file: 'f3.json', name: 'Gamma', date: ALL[1].snaps[0].date, where: ['text'] }] : [])),
      }),
    });
    await act(flush);
    type(el.querySelector('input.snap-search'), 'gamma-text');
    await settle();
    expect(rows().map((r) => r.querySelector('.snap-title').textContent)).toEqual(['Gamma']);
    expect(rowByName('Gamma').querySelector('.snap-where').textContent).toContain('text');
    type(el.querySelector('input.snap-search'), '');
    await settle();
    expect(rows()).toHaveLength(3);
    expect(el.querySelector('.snap-search-count').textContent).toBe('3 din 3 snapshot-uri');
    // clearing the query never needs the backend: the full list is already loaded
    expect(api.searchSnapshots).toHaveBeenCalledTimes(1);
  });
  it('passes the regex flag on and flags an invalid regex instead of crashing', async () => {
    const api = mount();
    await act(flush);
    const search = el.querySelector('input.snap-search');
    act(() => el.querySelector('.snap-regex input').click());
    type(search, '^[bg]');
    await settle();
    expect(api.searchSnapshots).toHaveBeenLastCalledWith('D:/proj/P.scribner', '^[bg]', { regex: true });
    expect(rows().map((r) => r.querySelector('.snap-title').textContent)).toEqual(['beta', 'Gamma']);
    type(search, '[bad');
    await settle();
    expect(search.className).toContain('invalid');
    expect(el.textContent).toContain('Regex invalid');
    expect(el.textContent).toContain('Nicio potrivire.');
  });
});

describe('Snapshots Manager: selecție multiplă și ștergere în masă', () => {
  it('ctrl+click adds rows, shift+click selects a range', async () => {
    mount();
    await act(flush);
    click(rowByName('Alpha')); // index 1
    expect(rowByName('Alpha').getAttribute('aria-selected')).toBe('true');
    click(rowByName('Gamma'), { ctrlKey: true }); // index 2
    expect(rowByName('Alpha').getAttribute('aria-selected')).toBe('true');
    expect(rowByName('Gamma').getAttribute('aria-selected')).toBe('true');
    click(rowByName('beta'), { shiftKey: true }); // index 0 → intervalul întreg
    expect(rows().every((r) => r.getAttribute('aria-selected') === 'true')).toBe(true);
    click(rowByName('Alpha'), { ctrlKey: true });
    expect(rowByName('Alpha').getAttribute('aria-selected')).toBe('false');
    expect(rowByName('beta').getAttribute('aria-selected')).toBe('true');
    expect(rowByName('Gamma').getAttribute('aria-selected')).toBe('true');
  });
  it('Delete key asks for confirmation and mass-deletes the selected pairs', async () => {
    const onChanged = vi.fn();
    const api = mount({ onChanged });
    await act(flush);
    click(rowByName('Alpha'));
    click(rowByName('beta'), { ctrlKey: true });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    act(() => rows()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })));
    await act(flush);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0]).toContain('2');
    expect(api.deleteSnapshots).toHaveBeenCalledWith('D:/proj/P.scribner', [
      { id: 'd1', file: 'f1.json' },
      { id: 'd1', file: 'f2.json' },
    ]);
    expect(api.listAllSnapshots).toHaveBeenCalledTimes(2); // reîncărcare după ștergere
    expect(onChanged).toHaveBeenCalled();
    expect(rows()).toHaveLength(1);
  });
  it('cancelling the confirmation deletes nothing', async () => {
    const api = mount();
    await act(flush);
    click(rowByName('Alpha'));
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    act(() => rows()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })));
    await act(flush);
    expect(api.deleteSnapshots).not.toHaveBeenCalled();
    expect(rows()).toHaveLength(3);
  });
  it('Ctrl+A selects every visible row, Șterge button deletes with confirmation', async () => {
    const api = mount();
    await act(flush);
    act(() => rows()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true })));
    expect(rows().every((r) => r.getAttribute('aria-selected') === 'true')).toBe(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    act(() => el.querySelector('button.snap-del').click());
    await act(flush);
    expect(api.deleteSnapshots.mock.calls[0][1]).toHaveLength(3);
  });
});

describe('Snapshots Manager: export și comparare', () => {
  it('exports exactly one selected snapshot with its document title, then shows the path', async () => {
    const api = mount();
    await act(flush);
    const btn = () => el.querySelector('button.snap-export');
    expect(btn().disabled).toBe(true);
    click(rowByName('Gamma'));
    expect(btn().disabled).toBe(false);
    act(() => btn().click());
    await act(flush);
    expect(api.exportSnapshot).toHaveBeenCalledWith('D:/proj/P.scribner', 'd2', 'f3.json', 'Scena 2');
    expect(el.textContent).toContain('Exportat: /tmp/exportat.html');
    click(rowByName('Alpha'), { ctrlKey: true });
    expect(btn().disabled).toBe(true); // două selectate → exportul nu e disponibil
  });
  it('compares two selected snapshots (older → newer) in the same diff view as the Inspector', async () => {
    mount();
    await act(flush);
    click(rowByName('Alpha'));
    click(rowByName('beta'), { ctrlKey: true });
    act(() => el.querySelector('button.snap-compare').click());
    await act(flush);
    const pane = el.querySelector('.snap-compare-pane');
    expect(pane).not.toBeNull();
    expect(pane.textContent).toContain('beta');
    expect(pane.querySelectorAll('ins, del').length).toBeGreaterThan(0);
    expect(pane.querySelector('.snap-count')).not.toBeNull();
    expect(pane.querySelector('.diff-level select')).not.toBeNull();
  });
  it('compares one selected snapshot against the current text of its document', async () => {
    mount();
    await act(flush);
    click(rowByName('Gamma'));
    act(() => el.querySelector('button.snap-compare').click());
    await act(flush);
    const pane = el.querySelector('.snap-compare-pane');
    expect(pane.textContent).toContain('Gamma');
    expect(pane.textContent).toContain('textul curent');
    expect(pane.textContent).toContain('gamma');
  });
  it('shows the read-only preview of the single selected snapshot', async () => {
    mount();
    await act(flush);
    click(rowByName('Gamma'));
    await act(flush);
    const preview = el.querySelector('.snap-manager-detail .snap-preview.prose');
    expect(preview).not.toBeNull();
    expect(preview.innerHTML).toContain('text gamma');
  });
});

describe('Snapshots Manager: închidere', () => {
  it('closes from the Închide button', async () => {
    let closed = 0;
    mount({ onClose: () => { closed += 1; } });
    await act(flush);
    act(() => [...el.querySelectorAll('.actions button')].pop().click());
    expect(closed).toBe(1);
  });
});
