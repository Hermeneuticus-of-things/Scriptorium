// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AboutDialog from '../src/components/AboutDialog.jsx';
import { ABOUT_LICENSES, REPO_URL } from '../src/lib/aboutInfo.js';
import { setLanguage } from '../src/lib/i18n.js';
import pkg from '../package.json';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, el;
afterEach(() => { act(() => root.unmount()); el.remove(); setLanguage('ro'); });
function mount(onClose = () => {}) {
  el = document.createElement('div'); document.body.append(el);
  root = createRoot(el);
  act(() => root.render(React.createElement(AboutDialog, { onClose })));
}

describe('About dialog', () => {
  it('shows version, repo link, D&TED note and every licence row', () => {
    mount();
    const txt = el.textContent;
    expect(txt).toContain(pkg.version);
    expect(el.querySelector(`a[href="${REPO_URL}"]`)).not.toBeNull();
    expect(txt).toContain('D&TED');
    expect(el.querySelectorAll('tbody tr:not(.about-group)').length).toBe(ABOUT_LICENSES.length);
    expect(txt).toContain('CC-BY-NC-4.0');
    expect(txt).toContain('licence not found in tree');
  });
  it('flags non-MIT licences and has English text', () => {
    setLanguage('en');
    mount();
    expect(el.textContent).toContain('non-commercial');
    expect(el.textContent).not.toMatch(/ui\.about\./);
    expect(el.querySelectorAll('.about-flag').length).toBe(ABOUT_LICENSES.filter((l) => l.flag).length);
  });
  it('closes from the button', () => {
    let closed = 0;
    mount(() => closed++);
    act(() => el.querySelector('.modal-actions button').click());
    expect(closed).toBe(1);
  });
});
