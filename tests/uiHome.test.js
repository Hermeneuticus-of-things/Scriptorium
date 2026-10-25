// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { createRequire } from 'module';
import Home from '../src/components/Home.jsx';
import { setLanguage } from '../src/lib/i18n.js';
const require = createRequire(import.meta.url);
const store = require('../lib/store.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const RO = /[ăâîșțĂÂÎȘȚ]|Recente|interactiv|Manualul/;
let root; let host;
afterEach(() => { act(() => root && root.unmount()); host?.remove(); setLanguage('ro'); });

async function render(props) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  const api = { setSettings: async () => {}, listTemplates: async () => [{ id: 'novel', name: 'Novel' }], newProject: async (t) => ({ t }), openProject: async () => null, importScriv: async () => null, ...props.api };
  await act(async () => { root.render(React.createElement(Home, { onOpen: () => {}, onError: (e) => { throw e; }, onSettings: () => {}, onHelp: () => {}, onTutorial: () => {}, ...props, api })); });
  return host;
}
async function openRecent(el) {
  const b = [...el.querySelectorAll('button[aria-haspopup]')].find((x) => /recent/i.test(x.textContent));
  await act(async () => { b.click(); });
  return el;
}

describe('Home screen', () => {
  it('has no Romanian in English mode', async () => {
    setLanguage('en');
    const el = await render({ settings: { recent: [{ dir: '/a', title: 'Book' }] } });
    const text = el.textContent.replace('Book', '');
    expect(text).not.toMatch(RO);
    expect(text).toMatch(/Recent/);
  });
  it('offers "clear list" when unpinned recents exist even if a pin points to a vanished entry', async () => {
    const el = await openRecent(await render({ settings: { recent: [{ dir: '/a', title: 'A' }], recentPinned: ['/gone', '/other'] } }));
    expect([...el.querySelectorAll('button')].some((b) => /Golește lista/.test(b.textContent))).toBe(true);
  });
  it('marks recent projects whose folder is missing', async () => {
    const el = await openRecent(await render({ settings: { recent: [{ dir: '/a', title: 'A', missing: true }, { dir: '/b', title: 'B' }] } }));
    const items = el.querySelectorAll('ul.recent li');
    expect(items[0].classList.contains('missing')).toBe(true);
    expect(items[0].textContent).toMatch(/lipsește/i);
    expect(items[1].classList.contains('missing')).toBe(false);
  });
  it('Enter in the title field creates the project', async () => {
    let made = null;
    const el = await render({ settings: { recent: [] }, api: { newProject: async (t, tpl) => { made = [t, tpl]; return null; } } });
    const input = el.querySelector('input');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'Carte nouă');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    expect(made).toEqual(['Carte nouă', 'novel']);
  });
});

describe('opening a recent project whose folder is gone', () => {
  it('gives a clear message instead of a raw ENOENT', () => {
    expect(() => store.checkProjectDir('/nu/exista.scribner')).toThrow(/nu mai există/);
    expect(() => store.checkProjectDir('/nu/exista.scribner', 'en')).toThrow(/no longer exists/);
  });
});
