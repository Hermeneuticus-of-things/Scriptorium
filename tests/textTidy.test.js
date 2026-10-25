import { describe, it, expect } from 'vitest';
import { collapseSpaces, stripLeadingTabs, collapseBlankLines, editorMenus } from '../src/lib/editorMenus.js';
import { dictionaries } from '../src/lib/i18n.js';

describe('text tidying transforms (pure)', () => {
  it('collapses runs of spaces/tabs to a single space', () => {
    expect(collapseSpaces('a   b\t\tc')).toBe('a b c');
    expect(collapseSpaces('one two')).toBe('one two'); // single spaces untouched
  });
  it('strips tabs at the start of each line only', () => {
    expect(stripLeadingTabs('\t\talfa\nbeta\n\tgama')).toBe('alfa\nbeta\ngama');
    expect(stripLeadingTabs('mid\tdle')).toBe('mid\tdle'); // inner tab kept
  });
  it('removes empty lines between paragraphs, keeping one break', () => {
    expect(collapseBlankLines('unu\n\n\ndoi')).toBe('unu\ndoi');
    expect(collapseBlankLines('unu\n \ndoi\ntrei')).toBe('unu\ndoi\ntrei');
    expect(collapseBlankLines('unu\ndoi')).toBe('unu\ndoi'); // single break untouched
  });
});

describe('Tidy text menu wiring', () => {
  const build = () => {
    let inserted = null;
    const editor = {
      isDestroyed: false,
      state: { selection: { from: 1, to: 9, empty: false }, doc: { textBetween: () => 'a   b\t\tc' } },
      chain() { return this; }, focus() { return this; },
      insertContentAt(range, out) { inserted = out; return this; },
      setTextSelection() { return this; }, run() {},
    };
    const t = (k) => k; // identity: assert on keys
    return { menus: editorMenus({ t, handle: () => ({ editor }), setView() {}, setSettings() {}, run() {} }), get inserted() { return inserted; } };
  };
  it('adds a Tidy text submenu with three actions after Transformations', () => {
    const { menus } = build();
    const tidy = menus.editAfter.find((x) => x.label === 'ui.menu.textTidy');
    expect(tidy).toBeTruthy();
    expect(tidy.submenu.map((x) => x.label)).toEqual(['ui.menu.tidySpaces', 'ui.menu.tidyBlankLines', 'ui.menu.tidyLeadingTabs']);
  });
  it('the "multiple spaces" action rewrites the selection', () => {
    const b = build();
    b.menus.editAfter.find((x) => x.label === 'ui.menu.textTidy').submenu[0].action();
    expect(b.inserted).toBe('a b c');
  });
  it('labels exist in both ro and en', () => {
    for (const lang of ['ro', 'en']) {
      for (const k of ['ui.menu.textTidy', 'ui.menu.tidySpaces', 'ui.menu.tidyBlankLines', 'ui.menu.tidyLeadingTabs']) {
        expect(dictionaries[lang][k], `${lang}:${k}`).toBeTruthy();
      }
    }
  });
});
