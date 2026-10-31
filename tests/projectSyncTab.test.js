// @vitest-environment jsdom
// P8 (2026-10-31): Project Settings › Sync tab writes syncAuto / syncFormat / syncNotesFormat / syncIncludeNotes.
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import ProjectSettingsDialog from '../src/components/ProjectSettingsDialog.jsx';
import { makeSyncDraft, applySyncDraft, syncFormatOptions, SYNC_KEYS } from '../src/lib/projectSync.js';
import { setLanguage } from '../src/lib/i18n.js';
import { uiRo, uiEn } from '../src/lib/i18n-ui.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const folderSync = require('../lib/folderSync.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const project = (extra = {}) => ({
  title: 'Carte',
  labels: [{ name: 'Fără etichetă', color: '' }],
  statuses: ['Fără status'],
  customFields: [],
  sectionTypes: [],
  tree: [{ id: 'draft', root: 'draft', type: 'folder', children: [] }],
  syncFolder: 'C:/sync/carte',
  ...extra,
});

let root; let host;
afterEach(() => { act(() => root && root.unmount()); host?.remove(); root = null; setLanguage('ro'); });

async function render(p, onSave) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(React.createElement(ProjectSettingsDialog, { project: p, folders: [], onSave, onClose: () => {}, api: {}, dir: '/p', initialTab: 'sincronizare' }));
  });
  return host;
}
const setSelect = async (el, value) => {
  const proto = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value');
  await act(async () => { proto.set.call(el, value); el.dispatchEvent(new Event('change', { bubbles: true })); });
};

describe('projectSync helpers', () => {
  it('draft from an unset project inherits everything', () => {
    expect(makeSyncDraft({})).toEqual({ auto: false, format: '', notesFormat: '', includeNotes: '' });
    expect(applySyncDraft({ title: 'X', syncFolder: '/f' }, makeSyncDraft({}))).toEqual({ title: 'X', syncFolder: '/f' });
  });
  it('round-trips the four keys and drops inherited ones', () => {
    const p = { syncFolder: '/f', syncAuto: true, syncFormat: 'md', syncNotesFormat: 'txt', syncIncludeNotes: false };
    const out = applySyncDraft(p, makeSyncDraft(p));
    expect(out).toEqual(p);
    const cleared = applySyncDraft(p, { auto: false, format: '', notesFormat: '', includeNotes: '' });
    for (const k of SYNC_KEYS) expect(k in cleared).toBe(false);
    expect(cleared.syncFolder).toBe('/f');
    expect(applySyncDraft({}, { includeNotes: 'yes' }).syncIncludeNotes).toBe(true);
  });
  it('keeps a stored format outside the standard list', () => {
    expect(syncFormatOptions('fdx')).toEqual(['rtf', 'txt', 'md', 'fdx']);
    expect(syncFormatOptions('md')).toEqual(['rtf', 'txt', 'md']);
  });
  it('saved keys are what folderSync reads', () => {
    const out = applySyncDraft({ syncFolder: '/f' }, { auto: true, format: 'md', notesFormat: 'txt', includeNotes: 'no' });
    expect(folderSync.syncOptions(out)).toMatchObject({ format: 'md', notesFormat: 'txt', includeNotes: false });
    expect(folderSync.autoSyncAction(out, 'close')).toBe('out');
  });
});

describe('Project Settings › Sync tab', () => {
  it('saves the four per-project sync keys and keeps syncFolder', async () => {
    let saved = null;
    const el = await render(project(), (p) => { saved = p; });
    expect(el.querySelector('#ps-tab-sincronizare')).toBeTruthy();
    expect(el.querySelector('.ps-sync-folder').textContent).toContain('C:/sync/carte');
    await act(async () => { el.querySelector('.ps-sync-auto').click(); });
    await setSelect(el.querySelector('.ps-sync-format'), 'md');
    await setSelect(el.querySelector('.ps-sync-notes-format'), 'txt');
    await setSelect(el.querySelector('.ps-sync-include-notes'), 'no');
    await act(async () => { el.querySelector('.actions .primary').click(); });
    expect(saved).toMatchObject({ syncAuto: true, syncFormat: 'md', syncNotesFormat: 'txt', syncIncludeNotes: false, syncFolder: 'C:/sync/carte' });
  });
  it('loads stored values and "inherit" removes them on save', async () => {
    let saved = null;
    const el = await render(project({ syncAuto: true, syncFormat: 'rtf', syncNotesFormat: 'md', syncIncludeNotes: true }), (p) => { saved = p; });
    expect(el.querySelector('.ps-sync-auto').checked).toBe(true);
    expect(el.querySelector('.ps-sync-format').value).toBe('rtf');
    expect(el.querySelector('.ps-sync-notes-format').value).toBe('md');
    expect(el.querySelector('.ps-sync-include-notes').value).toBe('yes');
    await act(async () => { el.querySelector('.ps-sync-auto').click(); });
    await setSelect(el.querySelector('.ps-sync-format'), '');
    await setSelect(el.querySelector('.ps-sync-notes-format'), '');
    await setSelect(el.querySelector('.ps-sync-include-notes'), '');
    await act(async () => { el.querySelector('.actions .primary').click(); });
    for (const k of ['syncAuto', 'syncFormat', 'syncNotesFormat', 'syncIncludeNotes']) expect(k in saved).toBe(false);
    expect(saved.syncFolder).toBe('C:/sync/carte');
  });
  it('has RO and EN labels for every sync key', () => {
    const keys = Object.keys(uiRo).filter((k) => k === 'ui.ps.sincronizare' || k.startsWith('ui.ps.sync_'));
    expect(keys.length).toBe(12);
    for (const k of keys) expect(uiEn[k]).toBeTruthy();
  });
});
