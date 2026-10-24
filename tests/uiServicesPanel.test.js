// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ServicesPanel from '../src/components/ServicesPanel.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, el;
afterEach(() => { act(() => root.unmount()); el.remove(); });
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

const api = (over = {}) => ({
  servicesStatus: async () => ({
    services: { deepl: { label: 'DeepL', configured: true, fields: [{ id: 'apiKey', label: 'Key', secret: true, set: true, value: '' }] } },
    accounts: [{ id: 'a1', name: 'Portal', username: 'ana', hasPassword: true }],
  }),
  setService: async () => ({}),
  deleteAccount: async () => { throw new Error('disk full'); },
  ...over,
});
async function mount(a) {
  el = document.createElement('div'); document.body.append(el);
  root = createRoot(el);
  await act(async () => root.render(React.createElement(ServicesPanel, { api: a })));
  await flush();
}

describe('ServicesPanel', () => {
  it('secret inputs opt out of password-manager autofill', async () => {
    await mount(api());
    const pw = el.querySelector('.service-row input[type=password]');
    expect(pw.getAttribute('autocomplete')).toBe('new-password');
    expect(pw.value).toBe('');
  });
  it('a failed account delete shows the error instead of an unhandled rejection', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await mount(api());
    const del = [...el.querySelectorAll('.accounts button')].find((b) => /terge|Delete/.test(b.textContent));
    await act(async () => del.click());
    await flush();
    expect(el.textContent).toContain('disk full');
  });
  it('a failed key removal shows the error', async () => {
    await mount(api({ setService: async () => { throw new Error('locked'); } }));
    const del = [...el.querySelectorAll('.service-row button')].find((b) => /terge|Delete|Remove/.test(b.textContent));
    await act(async () => del.click());
    await flush();
    expect(el.textContent).toContain('locked');
  });
});
