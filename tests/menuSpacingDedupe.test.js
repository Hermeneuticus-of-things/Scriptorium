import { describe, it, expect } from 'vitest';
import { editorMenus, LINE_SPACINGS } from '../src/lib/editorMenus.js';

// Audit UI P0-1 (2026-11-10): valorile de spațiere între rânduri trăiesc DOAR în butonul rapid
// de pe bară (FormatBar.spacingItems). Meniul Paragraf (editorMenus) nu le mai repetă.
const t = (k) => k;
const m = editorMenus({
  t,
  handle: () => ({ editor: { commands: {}, state: {} }, focus: () => {} }),
  view: {},
  setView() {}, setSettings() {}, settings: {}, styles: [], run() {}, desktop: false,
});

const flatten = (items, out = []) => {
  for (const item of items || []) {
    if (item === '-') continue;
    out.push(item);
    if (item.submenu) flatten(item.submenu, out);
  }
  return out;
};

describe('audit UI P0-1: spațierea nu se duplică în meniul Paragraf', () => {
  it('meniul Format nu mai conține niciun item de spațiere (setLineSpacing)', () => {
    const all = flatten(m.format);
    expect(all.filter((i) => i.commandId === 'setLineSpacing' || /lineSpacing/.test(String(i.label)))).toEqual([]);
  });
  it('submeniul Paragraf păstrează cele 4 alinieri', () => {
    const para = m.format.find((x) => x.label === 'ui.menu.paragraph').submenu;
    const labels = para.filter((x) => x !== '-').map((x) => String(x.label));
    for (const key of ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify']) {
      expect(labels.some((l) => l.includes(key))).toBe(true);
    }
  });
  it('butonul rapid păstrează valorile — LINE_SPACINGS rămâne exportat', () => {
    expect(LINE_SPACINGS).toEqual([1, 1.15, 1.2, 1.5, 2, 2.5, 3]);
  });
});
