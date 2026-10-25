// @vitest-environment jsdom
// Q10: in-app confirmations / prompts replace window.confirm / prompt (labelled buttons,
// „Nu mai întreba” kept in settings), plus the status-bar message channel.
import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import fs from 'node:fs';
import path from 'node:path';
import AppDialogHost, { StatusMessage } from '../src/components/AppDialogHost.jsx';
import { confirmDialog, promptDialog, statusMessage, resetDontAsk, dontAskCount } from '../src/lib/appDialog.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let div;
async function mount(el) {
  div = document.createElement('div');
  document.body.appendChild(div);
  root = createRoot(div);
  await act(async () => root.render(el));
}
afterEach(() => {
  act(() => root?.unmount());
  div?.remove();
  root = null;
});
const click = (sel) => act(async () => document.querySelector(sel).click());

describe('confirmDialog / promptDialog', () => {
  it('shows the verb on the button and resolves true / false', async () => {
    await mount(React.createElement(AppDialogHost, { settings: {}, onSettings: () => {} }));
    let p;
    await act(async () => { p = confirmDialog({ message: 'Golești coșul?', okLabel: 'Golește coșul', danger: true }); });
    expect(document.querySelector('.app-dialog-msg').textContent).toBe('Golești coșul?');
    expect(document.querySelector('.app-dialog-ok').textContent).toBe('Golește coșul');
    expect(document.querySelector('.app-dialog').closest('.modal-backdrop')).not.toBeNull(); // DialogA11y markup
    await click('.app-dialog-ok');
    await expect(p).resolves.toBe(true);
    await act(async () => { p = confirmDialog({ message: 'x' }); });
    await click('.app-dialog-cancel');
    await expect(p).resolves.toBe(false);
    expect(document.querySelector('.app-dialog')).toBeNull();
  });

  it('prompt returns the typed text, or null on cancel', async () => {
    await mount(React.createElement(AppDialogHost, { settings: {}, onSettings: () => {} }));
    let p;
    await act(async () => { p = promptDialog({ message: 'Nume', value: 'Implicit' }); });
    expect(document.querySelector('.app-dialog-input').value).toBe('Implicit');
    await act(async () => document.querySelector('.app-dialog').requestSubmit());
    await expect(p).resolves.toBe('Implicit');
    await act(async () => { p = promptDialog({ message: 'Nume' }); });
    await click('.app-dialog-cancel');
    await expect(p).resolves.toBeNull();
  });

  it('„Nu mai întreba” is stored in settings, skips the next time and can be reset', async () => {
    let settings = {};
    const onSettings = vi.fn((patch) => { settings = { ...settings, ...patch }; });
    await mount(React.createElement(AppDialogHost, { settings, onSettings }));
    let p;
    await act(async () => { p = confirmDialog({ message: 'Unești?', dontAskAgainKey: 'merge' }); });
    await click('.app-dialog-dontask input');
    await click('.app-dialog-ok');
    await expect(p).resolves.toBe(true);
    expect(settings.dontAsk).toEqual({ merge: true });
    await act(async () => root.render(React.createElement(AppDialogHost, { settings, onSettings })));
    expect(dontAskCount()).toBe(1);
    await expect(confirmDialog({ message: 'Unești?', dontAskAgainKey: 'merge' })).resolves.toBe(true);
    expect(document.querySelector('.app-dialog')).toBeNull();
    resetDontAsk();
    expect(settings.dontAsk).toEqual({});
  });

  it('falls back to window.confirm without a host', async () => {
    window.confirm = vi.fn(() => true);
    await expect(confirmDialog('ok?')).resolves.toBe(true);
    expect(window.confirm).toHaveBeenCalledWith('ok?');
  });
});

describe('status messages', () => {
  it('show in the status-bar slot and clear themselves', async () => {
    vi.useFakeTimers();
    await mount(React.createElement(StatusMessage));
    act(() => statusMessage('3 documente mutate în coș'));
    expect(div.textContent).toBe('3 documente mutate în coș');
    act(() => vi.advanceTimersByTime(4100));
    expect(div.textContent).toBe('');
    vi.useRealTimers();
  });
});

describe('no browser confirm()/prompt() left in the UI', () => {
  it('src/ uses the in-app dialog', () => {
    const files = [];
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.jsx?$/.test(e.name) && files.push(path.join(d, e.name))));
    walk(path.join(__dirname, '../src'));
    const hits = files.filter((f) => !f.endsWith('appDialog.js')).flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').filter((l) => /(^|[^\w.])(window\.)?(confirm|prompt)\(/.test(l)).map((l) => `${path.basename(f)}: ${l.trim()}`));
    expect(hits).toEqual([]);
  });
});
