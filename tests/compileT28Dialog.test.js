// @vitest-environment jsdom
// P1 #29 — the Compile > Contents view filters: by item type (toate / doar text / text+foldere)
// and by label, the excluded-folder cascade shown in the list, and the settings persisted on the
// project (compile.contentFilter / compile.contentLabel).
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
    labels: [{ name: 'Idee', color: '#3884' }, { name: 'Fără', color: '#888' }],
    tree: [
      {
        id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
          { id: 'c1', type: 'folder', title: 'Plecarea', label: 'Idee', children: [
            { id: 's1', type: 'text', title: 'Gara', label: 'Idee' },
            { id: 's2', type: 'text', title: 'Trenul' },
          ] },
          { id: 'm1', type: 'file', title: 'Schema', media: { file: 's.png', mime: 'image/png' } },
        ],
      },
    ],
    ...extra,
  };
}

const api = { exportCompiled: async () => 'carte.docx' };

let root, el;
const flushMount = async (project, onProjectChange, selectionIds = []) => {
  el = document.createElement('div');
  document.body.append(el);
  root = createRoot(el);
  await act(async () => root.render(React.createElement(CompileDialog, { api, dir: 'X:/p', project, selectionIds, onProjectChange, onClose: () => {}, onError: (e) => { throw e; } })));
  await flush();
};
afterEach(() => { try { act(() => root.unmount()); } catch { /* not mounted */ } el.remove(); setLanguage('ro'); });

const rows = () => [...el.querySelectorAll('.cd-contents tbody tr')];
const rowTitles = () => rows().map((r) => r.querySelectorAll('td')[1].textContent.trim());
const filterButtons = () => [...el.querySelectorAll('.cd-content-filter .seg button')];
const click = async (b) => act(async () => b.click());

describe('Compile > Contents: view filters (P1 #29)', () => {
  it('„doar text” shows only text documents; „text + foldere” hides media; „toate” restores', async () => {
    await flushMount(makeProject(), () => {});
    expect(rowTitles()).toEqual(['Plecarea', 'Gara', 'Trenul', 'Schema']); // default: all

    await click(filterButtons().find((b) => b.textContent === 'doar text'));
    expect(rowTitles()).toEqual(['Gara', 'Trenul']);
    expect(filterButtons().find((b) => b.textContent === 'doar text').getAttribute('aria-pressed')).toBe('true');

    await click(filterButtons().find((b) => b.textContent === 'text + foldere'));
    expect(rowTitles()).toEqual(['Plecarea', 'Gara', 'Trenul']); // the media attachment is gone

    await click(filterButtons().find((b) => b.textContent === 'toate'));
    expect(rowTitles()).toEqual(['Plecarea', 'Gara', 'Trenul', 'Schema']);
  });

  it('the label filter narrows the list to that label', async () => {
    await flushMount(makeProject(), () => {});
    const sel = el.querySelector('.cd-content-filter select');
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(sel), 'value').set.call(sel, 'Idee');
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    expect(rowTitles()).toEqual(['Plecarea', 'Gara']);
  });

  it('a folder excluded from compile dims its children (the cascade the compile applies)', async () => {
    await flushMount(makeProject({
      tree: [{
        id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
          { id: 'c1', type: 'folder', title: 'Plecarea', includeInCompile: false, children: [
            { id: 's1', type: 'text', title: 'Gara' },
          ] },
          { id: 's9', type: 'text', title: 'Alone' },
        ],
      }],
    }), () => {});
    const rowsAll = rows();
    const gara = rowsAll.find((r) => r.textContent.includes('Gara'));
    const alone = rowsAll.find((r) => r.textContent.includes('Alone'));
    expect(gara.className).toContain('cd-excluded');
    expect(alone.className).not.toContain('cd-excluded');
    const cb = gara.querySelector('input[type="checkbox"]');
    expect(cb.disabled).toBe(true);
    expect(cb.checked).toBe(false);
    expect(cb.title).toContain('exclus din compilare');
    // the folder's own checkbox stays editable
    const folderCb = rowsAll.find((r) => r.textContent.includes('Plecarea')).querySelector('input[type="checkbox"]');
    expect(folderCb.disabled).toBe(false);
    expect(folderCb.checked).toBe(false);
  });

  it('an explicit scope (selection) does not cascade the exclusion to the children', async () => {
    const project = makeProject({
      compile: { scope: 'selection' },
      tree: [{
        id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
          { id: 'c1', type: 'folder', title: 'Plecarea', includeInCompile: false, children: [
            { id: 's1', type: 'text', title: 'Gara' },
          ] },
          { id: 's9', type: 'text', title: 'Alone' },
        ],
      }],
    });
    // the selection covers the excluded folder and its child: the compile takes them as given,
    // so the list shows neither dimmed
    await flushMount(project, () => {}, ['c1', 's1']);
    const gara = rows().find((r) => r.textContent.includes('Gara'));
    expect(gara).toBeTruthy();
    expect(gara.className).not.toContain('cd-excluded');
    expect(gara.querySelector('input[type="checkbox"]').disabled).toBe(false);
    expect(rowTitles()).toEqual(['Plecarea', 'Gara']); // 'Alone' is outside the selection
  });

  it('the filter choice is persisted in project.compile (contentFilter / contentLabel)', async () => {
    const saved = [];
    await flushMount(makeProject(), (next) => saved.push(next));
    await click(filterButtons().find((b) => b.textContent === 'doar text'));
    // any project change persists the whole compile settings, filter included
    const cb = rows()[0].querySelector('input[type="checkbox"]');
    await act(async () => cb.click());
    const last = saved[saved.length - 1];
    expect(last.compile.contentFilter).toBe('text');
    expect(last.compile.contentLabel).toBe('');
    expect(last.tree[0].children[0].children[0].includeInCompile).toBe(false);
  });
});
