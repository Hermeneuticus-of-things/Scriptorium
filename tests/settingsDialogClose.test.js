// @vitest-environment jsdom
// Regresie: „A apărut o problemă" la fiecare Aplică/Anulează din Setările programului —
// dialogul apela onClose() fără să îl primească între props (ReferenceError, v1.2.6→1.4.1).
// Salvează/Anulează trebuie să închidă dialogul prin onClose, fără eroare.
import { describe, it, expect, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import SettingsDialog from '../src/components/SettingsDialog.jsx';
import { setLanguage } from '../src/lib/i18n.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

const SETTINGS = {
  autosaveSec: 2, fontSize: 18, lineHeight: 1.6, pageWidth: 56, binderFontSize: 14,
  spellLanguages: ['ro'], autoReplacements: [], paragraphIndentCm: 0.7, paragraphSpacing: 0.6,
  autoUpdateCheck: true, reopenLastProject: false, alwaysOnTop: false, authorName: '',
  notesDir: '', desktopShortcut: true, globalShortcutN: true, theme: 'dark', language: 'ro',
};

const apiStub = () => ({
  setSettings: vi.fn(async (patch) => patch),
  updateConfigure: vi.fn(async () => true),
  onUpdateAvailable: vi.fn(() => () => {}),
  onDtedEvent: vi.fn(() => () => {}),
  onWhisperProgress: vi.fn(() => () => {}),
  dtedStatus: vi.fn(async () => ({ found: false })),
  dictationStats: vi.fn(async () => null),
  listDictionaryWords: vi.fn(async () => []),
  mcpInfo: vi.fn(async () => null),
});

let root, el;
const mount = async (comp) => {
  el = document.createElement('div');
  document.body.append(el);
  root = createRoot(el);
  await act(async () => root.render(comp));
  await flush();
};
afterEach(() => {
  try { act(() => root.unmount()); } catch { /* not mounted */ }
  if (el) el.remove();
  setLanguage('ro');
});

const btn = (name) => [...el.querySelectorAll('.actions button')].find((b) => b.textContent === name);

describe('SettingsDialog: Salvează/Anulează închid dialogul (regresie onClose)', () => {
  it('„Salvează setările programului" salvează și apelează onClose, fără onError', async () => {
    const api = apiStub();
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const onError = vi.fn((e) => { throw e; });
    await mount(React.createElement(SettingsDialog, {
      api, settings: SETTINGS, project: null, onClose, onSaved, onError,
    }));
    expect(btn('Anulează')).toBeTruthy();
    await act(async () => btn('Salvează setările programului').click());
    await flush(); await flush();
    expect(api.setSettings).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });
  it('„Anulează" apelează onClose fără să salveze', async () => {
    const api = apiStub();
    const onClose = vi.fn();
    await mount(React.createElement(SettingsDialog, {
      api, settings: SETTINGS, project: null, onClose, onError: vi.fn(),
    }));
    await act(async () => btn('Anulează').click());
    await flush(); await flush();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(api.setSettings).not.toHaveBeenCalled();
  });
});
