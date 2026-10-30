// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import CompileDialog from '../src/components/CompileDialog.jsx';
import { setLanguage } from '../src/lib/i18n.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

function makeProject(extra = {}) {
  return {
    title: 'Carte',
    tree: [{ id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [{ id: 's1', type: 'text', title: 'Scena', includeInCompile: true }] }],
    ...extra,
  };
}

const api = { exportCompiled: async () => 'carte.docx' };

let root, el;
const flushMount = async (project, onProjectChange) => {
  el = document.createElement('div');
  document.body.append(el);
  root = createRoot(el);
  await act(async () => root.render(React.createElement(CompileDialog, { api, dir: 'X:/p', project, selectionIds: [], onProjectChange, onClose: () => {}, onError: (e) => { throw e; } })));
  await flush();
};
afterEach(() => { try { act(() => root.unmount()); } catch { /* not mounted */ } el.remove(); setLanguage('ro'); });

const buttons = (re, enabled = true) => [...el.querySelectorAll('button')].filter((b) => re.test(b.textContent) && b.disabled === !enabled);
const click = async (b) => act(async () => b.click());
const setInput = (input, value) => {
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
const byLabel = (label, scope = el) => [...scope.querySelectorAll(`input[aria-label="${label}"]`)];

describe('Compile dialog: project replacements editor', () => {
  it('adds, edits, reorders, disables entries and persists them on the project root', async () => {
    const saved = [];
    await flushMount(makeProject(), (next) => saved.push(next));
    await click(buttons(/Înlocuiri$/)[0]); // tab
    expect(el.textContent).toContain('Înlocuiri la nivel de proiect');
    expect(el.textContent).toContain('Se aplică înainte de înlocuirile formatului, de sus în jos.');

    await click(buttons(/^Adaugă înlocuire$/)[0]);
    await click(buttons(/^Adaugă înlocuire$/)[0]);
    const rows = () => [...el.querySelectorAll('tbody')[0].querySelectorAll('tr')];
    expect(rows().length).toBe(2);
    setInput(byLabel('Caută', rows()[0])[0], 'primul');
    setInput(byLabel('Înlocuiește cu', rows()[0])[0], 'P');
    setInput(byLabel('Caută', rows()[1])[0], 'aldoilea');
    setInput(byLabel('Înlocuiește cu', rows()[1])[0], 'A');
    await click(byLabel('Cuvânt întreg', rows()[0])[0]);
    await click(byLabel('Activă', rows()[1])[0]); // disable the second entry

    // reorder: first row moves down
    expect(rows()[0].querySelector('td:last-child button').disabled).toBe(true); // ↑ at top
    await click(rows()[0].querySelector('td:last-child button:nth-child(2)')); // ↓
    expect(byLabel('Caută', rows()[0])[0].value).toBe('aldoilea');

    await click(buttons(/Salvează setările/)[0]);
    expect(saved.length).toBe(1);
    const reps = saved[0].replacements;
    expect(reps.map((r) => r.find)).toEqual(['aldoilea', 'primul']);
    expect(reps[1]).toMatchObject({ replace: 'P', wholeWord: true, regex: false, caseSensitive: false, enabled: true });
    expect(typeof reps[0].id).toBe('string');
    expect(reps[0].enabled).toBe(false);
  });

  it('an untouched empty list stays absent on save (feature off by default)', async () => {
    const saved = [];
    await flushMount(makeProject(), (next) => saved.push(next));
    await click(buttons(/Salvează setările/)[0]);
    expect(saved.length).toBe(1);
    expect('replacements' in saved[0]).toBe(false);
    expect(JSON.stringify(saved[0])).not.toContain('replacements');
  });

  it('project list stays editable for built-in formats, the format editor does not', async () => {
    const saved = [];
    await flushMount(makeProject({ replacements: [{ id: 'r1', find: 'a', replace: 'b', regex: false, wholeWord: false, caseSensitive: false, enabled: true }] }), (next) => saved.push(next));
    await click(buttons(/Înlocuiri$/)[0]);
    const tables = [...el.querySelectorAll('table.cd-table')];
    expect(tables.length).toBe(2);
    expect(tables[0].closest('fieldset').disabled).toBe(false);
    expect(tables[1].closest('fieldset').disabled).toBe(true);
    setInput(byLabel('Înlocuiește cu', tables[0])[0], 'B');
    await click(buttons(/Salvează setările/)[0]);
    expect(saved[0].replacements[0]).toMatchObject({ find: 'a', replace: 'B' });
  });
});
