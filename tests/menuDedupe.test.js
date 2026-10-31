import { describe, it, expect } from 'vitest';
import { buildMenuLayout, SUBMENUS } from '../src/lib/menuLayout.js';
import { readingLensItems } from '../src/lib/readingLenses.js';

describe('menu dedupe Soft UI', () => {
  it('menu.reading SUBMENUS no longer lists posNouns/posVerbs/posOff', () => {
    const reading = SUBMENUS.view.find((d) => d[0] === 'menu.reading');
    expect(reading[1]).toEqual(['dialogueFocus', 'linguisticFocus']);
    expect(reading[1]).not.toContain('posNouns');
  });

  it('reading submenu labels: Focus lingvistic substantive/verbe appear once from lenses', () => {
    const t = (k, vars) => {
      if (k === 'ui.formatBar.posFocus') return `Focus lingvistic: ${vars.name}`;
      if (k === 'ui.formatBar.pos.noun') return 'substantive';
      if (k === 'ui.formatBar.pos.verb') return 'verbe';
      return k;
    };
    const lenses = readingLensItems({ t, view: {}, setView: () => {} });
    const labels = lenses.map((x) => x.label).filter(Boolean);
    const nouns = labels.filter((l) => /substantive/i.test(l));
    const verbs = labels.filter((l) => /verbe|verbs/i.test(l));
    expect(nouns.length).toBe(1);
    expect(verbs.length).toBe(1);
  });

  it('appendSelection only in edit; split only in document', () => {
    const commands = {
      appendSelection: { id: 'appendSelection', group: 'edit', label: 'Adauga selectia la document.', run: () => {} },
      split: { id: 'split', group: 'document', label: 'Imparte documentul la cursor', run: () => {} },
      dialogueFocus: { id: 'dialogueFocus', group: 'view', label: 'Dialog', run: () => {} },
      linguisticFocus: { id: 'linguisticFocus', group: 'view', label: 'Focus lingvistic.', run: () => {} },
    };
    const layout = buildMenuLayout(commands, {
      item: (id) => ({ id, label: commands[id].label, action: commands[id].run }),
      label: (k) => k,
      append: { 'menu.reading': readingLensItems({ t: (k, v) => (k === 'ui.formatBar.posFocus' ? `Focus lingvistic: ${v.name}` : k), view: {}, setView: () => {} }) },
    });
    const flat = (items, acc = []) => {
      for (const it of items || []) {
        if (it === '-') continue;
        if (it.submenu) flat(it.submenu, acc);
        else if (it.label) acc.push(it.label);
      }
      return acc;
    };
    const byGroup = Object.fromEntries(layout.map((m) => [m.group, flat(m.items)]));
    const all = layout.flatMap((m) => flat(m.items));
    expect(all.filter((l) => l === 'Adauga selectia la document.').length).toBe(1);
    expect(byGroup.edit || []).toContain('Adauga selectia la document.');
    expect(byGroup.document || []).not.toContain('Adauga selectia la document.');
    expect(all.filter((l) => l === 'Imparte documentul la cursor').length).toBe(1);
    expect(byGroup.document || []).toContain('Imparte documentul la cursor');
    expect(byGroup.view || []).not.toContain('Imparte documentul la cursor');
  });
});