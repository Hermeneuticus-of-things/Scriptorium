import { describe, it, expect } from 'vitest';
import fs from 'fs';
// T1 — navigarea panourilor din tastatură (docs/audit/scrivener3/implementation_plan.md).
import { FOCUS_TARGETS, visibleTargets, nextTarget, applyFocus } from '../src/lib/focusNav.js';

describe('focusNav — țintele vizibile', () => {
  it('ordinea ciclului = ordinea vizuală stânga→dreapta', () => {
    expect(FOCUS_TARGETS.map((t) => t.id)).toEqual(['binder', 'editor', 'split', 'inspector', 'ai']);
  });
  it('toate panourile deschise', () => {
    expect(visibleTargets({ hideBinder: false, splitOpen: true, showInspector: true, showAi: true }))
      .toEqual(['binder', 'editor', 'split', 'inspector', 'ai']);
  });
  it('binder ascuns și fără split/AI', () => {
    expect(visibleTargets({ hideBinder: true, splitOpen: false, showInspector: true, showAi: false }))
      .toEqual(['editor', 'inspector']);
  });
  it('stare implicită: binder + editor vizibile', () => {
    expect(visibleTargets({})).toEqual(['binder', 'editor']);
  });
  it('doar editorul', () => {
    expect(visibleTargets({ hideBinder: true })).toEqual(['editor']);
  });
});

describe('focusNav — ciclarea', () => {
  const st = { hideBinder: false, splitOpen: false, showInspector: true, showAi: true };
  it('înainte: editor → inspector → ai → binder → editor', () => {
    expect(nextTarget('editor', st, 1)).toBe('inspector');
    expect(nextTarget('inspector', st, 1)).toBe('ai');
    expect(nextTarget('ai', st, 1)).toBe('binder');
    expect(nextTarget('binder', st, 1)).toBe('editor');
  });
  it('înapoi', () => {
    expect(nextTarget('editor', st, -1)).toBe('binder');
    expect(nextTarget('binder', st, -1)).toBe('ai');
  });
  it('ținta curentă dispărută → capătul direcției', () => {
    expect(nextTarget('split', st, 1)).toBe('binder');
    expect(nextTarget('split', st, -1)).toBe('ai');
  });
  it('o singură țintă vizibilă → rămâne', () => {
    expect(nextTarget('editor', { hideBinder: true }, 1)).toBe('editor');
  });
});

describe('focusNav — applyFocus', () => {
  it('chemă open() și focusul pe [data-focus-pane]', () => {
    const opened = [];
    const el = { focus: () => {} };
    const root = { querySelector: (sel) => (sel === '[data-focus-pane="binder"]' ? el : null) };
    const ok = applyFocus('binder', { root, open: (t) => opened.push(t) });
    expect(ok).toBe(true);
    expect(opened).toEqual(['binder']);
  });
  it('țintă inexistentă → false, fără erori', () => {
    expect(applyFocus('nicăieri', { root: { querySelector: () => null }, open: () => {} })).toBe(false);
  });
});

describe('T1 — cablaj în aplicație', () => {
  const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  it('comenzile sunt înregistrate cu taste implicite', () => {
    const cmds = src('src/lib/commands.js');
    for (const [id, key] of [['focusCycle', 'F6'], ['focusCycleBack', 'Shift+F6'], ['focusEditor', 'Ctrl+Shift+1'], ['focusBinder', 'Ctrl+Shift+2'], ['focusInspector', 'Ctrl+Shift+3'], ['focusAi', 'Ctrl+Shift+4']]) {
      expect(cmds).toContain(`${id}: '${key}'`);
    }
  });
  it('tuples nav + submeniul Navigate ▸ Mută focusul + atributele panourilor', () => {
    const app = src('src/App.jsx');
    for (const id of ['focusCycle', 'focusCycleBack', 'focusEditor', 'focusBinder', 'focusInspector', 'focusAi']) {
      expect(app).toContain(`'${id}'`);
    }
    expect(app).toContain('data-focus-pane="binder"');
    expect(app).toContain('data-focus-pane="inspector"');
    expect(app).toContain('data-focus-pane="ai"');
    expect(src('src/lib/menuLayout.js')).toContain("['menu.focus', ['focusCycle'");
  });
});
