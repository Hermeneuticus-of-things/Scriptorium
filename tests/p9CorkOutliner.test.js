// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Corkboard, { CORK_DEFAULTS, corkOptions, snapPos, cardWords, stackCards, corkClass } from '../src/components/Corkboard.jsx';
import Outliner, { subtreeSum, moveColumn } from '../src/components/Outliner.jsx';
import CorkboardPane from '../src/components/CorkboardPane.jsx';
import { uiRo, uiEn } from '../src/lib/i18n-ui.js';

const project = { labels: [{ name: 'Fără', color: '' }, { name: 'Idee', color: '#ff0000' }], statuses: ['Fără', 'Schiță'], keywordDefs: [] };
const folder = (cork) => ({
  id: 'f', title: 'Dosar', cork,
  children: [
    { id: 'a', title: 'Unu', label: 'Idee', status: 'Schiță', synopsis: 'text', target: 100 },
    { id: 'b', title: 'Doi', label: 'Fără', status: 'Fără', icon: '🌙', synopsisImage: 'data:image/png;base64,AAA' },
  ],
});
const noop = () => {};
const board = (cork, extra = {}) => renderToStaticMarkup(React.createElement(Corkboard, { project, folder: folder(cork), onOpen: noop, onPatch: noop, onAdd: noop, onMove: noop, onReorder: noop, counts: { a: 40, b: 7 }, ...extra }));

describe('P9 corkboard options', () => {
  it('global defaults sit under the folder’s own choices', () => {
    const c = corkOptions({ size: 'mare', statusStamp: false }, { size: 'mic' });
    expect(c.size).toBe('mic');
    expect(c.statusStamp).toBe(false);
    expect(c.ratio).toBe(CORK_DEFAULTS.ratio);
  });
  it('snaps freeform positions to the grid only when asked', () => {
    expect(snapPos({ x: 37, y: 13 }, { snapGrid: false })).toEqual({ x: 37, y: 13 });
    expect(snapPos({ x: 37, y: 13 }, { snapGrid: true, gridSize: 20 })).toEqual({ x: 40, y: 20 });
  });
  it('counts a folder card over its subtree', () => {
    expect(cardWords({ id: 'x', target: 200, children: [{ id: 'y' }, { id: 'z', children: [{ id: 'w' }] }] }, { x: 10, y: 20, w: 70 })).toEqual({ words: 100, target: 200, progress: 0.5 });
  });
  it('stacks several folders one after another', () => {
    const m = stackCards([{ title: 'A', children: [{ id: 1 }] }, { title: 'B', children: [{ id: 2 }] }], 'continuous');
    expect(m.children.map((x) => x.id)).toEqual([1, 2]);
    expect(stackCards([], 'grouped')).toBeNull();
  });
  it('vertical lines get their own class', () => {
    expect(corkClass({ mode: 'lines', linesDir: 'columns' })).toContain('lines-vertical');
    expect(corkClass({})).toBe('corkboard cards-rounded');
  });
  it('renders stamp opacity, label band, type icon, words and image synopsis', () => {
    const html = board({ labelStyle: 'band', stampOpacity: 30, showIcon: true, showWords: true, synopsisLines: 2 });
    expect(html).toContain('card-label-band');
    expect(html).toMatch(/class="stamp" style="opacity:0.3"/);
    expect(html).toContain('card-type-icon');
    expect(html).toContain('🌙');
    expect(html).toContain('card-words');
    expect(html).toContain('--syn-lines:2');
    expect(html).toContain('src="data:image/png;base64,AAA"');
  });
  it('can hide the stamp and show the synopsis instead of the image', () => {
    const html = board({ statusStamp: false, showImages: false });
    expect(html).not.toContain('class="stamp"');
    expect(html).not.toContain('card-image');
  });
  it('label as a coloured pin', () => {
    expect(board({ labelStyle: 'pin' })).toMatch(/card-pin" style="background:#ff0000"/);
  });
  it('freeform board without grid', () => {
    expect(board({ mode: 'free', showGrid: false, gridSize: 40 })).toMatch(/freeform no-grid/);
  });
  it('options pane renders every default', () => {
    const html = renderToStaticMarkup(React.createElement(CorkboardPane, { value: { snapGrid: true }, onChange: noop }));
    expect(html).toContain('cork-pane');
    expect((html.match(/<fieldset/g) || []).length).toBe(3);
  });
});

describe('P9 outliner', () => {
  it('sums targets over the subtree', () => {
    expect(subtreeSum({ target: 5, children: [{ target: 10 }, { children: [{ target: 1 }] }] }, (n) => n.target)).toBe(16);
  });
  it('moves a column by drag', () => {
    expect(moveColumn(['a', 'b', 'c'], 'c', 'a', 'before')).toEqual(['c', 'a', 'b']);
    expect(moveColumn(['a', 'b', 'c'], 'a', 'c', 'after')).toEqual(['b', 'c', 'a']);
    expect(moveColumn(['a', 'b'], 'x', 'a')).toEqual(['a', 'b']);
  });
  it('renders the new columns with resize handles', () => {
    localStorage.setItem('scribner-outline-columns', JSON.stringify(['snapCount', 'totalTarget', 'pageBreak']));
    const root = { id: 'r', title: 'R', children: [{ id: 'a', title: 'A', target: 10, pageBreakBefore: true, children: [{ id: 'b', title: 'B', target: 5 }] }] };
    const html = renderToStaticMarkup(React.createElement(Outliner, { project, root, counts: {}, onOpen: noop, onPatch: noop, onMove: noop, snapCounts: { a: { count: 3, last: '2026-01-01' } } }));
    localStorage.removeItem('scribner-outline-columns');
    const heads = [...html.matchAll(/data-col="([^"]+)"/g)].map((m) => m[1]);
    expect(heads).toEqual(['snapCount', 'totalTarget', 'pageBreak']);
    expect(html).toContain('col-resize');
    expect(html).toContain('>15<');
    expect(html).toContain('>3<');
  });
});

describe('P9 strings', () => {
  it('every new key exists in both languages', () => {
    const keys = Object.keys(uiRo).filter((k) => k.startsWith('ui.cork2.') || k.startsWith('ui.out2.'));
    expect(keys.length).toBeGreaterThan(30);
    for (const k of keys) expect(uiEn[k], k).toBeTruthy();
  });
});
