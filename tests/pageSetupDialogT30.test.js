// @vitest-environment jsdom
// P1 #30 — selectorul de format (manuscris / fișe index / schiță) în Page Setup, dimensiunile
// cardului vizibile doar la fișe index, salvarea prin fluxul existent și eticheta formatului
// în Print Preview.
import { describe, it, expect, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import PageSetupDialog from '../src/components/PageSetupDialog.jsx';
import PrintPreviewDialog from '../src/components/PrintPreviewDialog.jsx';
import { setLanguage } from '../src/lib/i18n.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

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

const select = () => el.querySelector('[data-testid="print-format"]');
const choose = async (v) => act(async () => {
  const s = select();
  s.value = v;
  s.dispatchEvent(new Event('change', { bubbles: true }));
});

describe('Page Setup: format de printare (P1 #30)', () => {
  it('dropdown-ul are cele trei formate, implicit „Manuscris”; câmpurile de card apar doar la fișe index', async () => {
    await mount(React.createElement(PageSetupDialog, {
      api: { getPageSetup: async () => null, setPageSetup: async (v) => v },
      project: { title: 'Carte' },
      onClose: () => {},
      onError: (e) => { throw e; },
    }));
    expect(select()).not.toBeNull();
    expect(select().value).toBe('manuscript');
    expect([...select().options].map((o) => o.value)).toEqual(['manuscript', 'indexCards', 'outline']);
    expect(el.textContent).toContain('Manuscris');
    expect(el.querySelector('[data-testid="card-width"]')).toBeNull();

    await choose('indexCards');
    expect(el.querySelector('[data-testid="card-width"]').value).toBe('10');
    expect(el.querySelector('[data-testid="card-height"]').value).toBe('15');

    await choose('outline');
    expect(el.querySelector('[data-testid="card-width"]')).toBeNull();
  });

  it('formatul și dimensiunile cardului se salvează prin api.setPageSetup + onSave', async () => {
    let projectSaved = null;
    await mount(React.createElement(PageSetupDialog, {
      api: { getPageSetup: async () => null, setPageSetup: async (v) => v },
      project: { title: 'Carte' },
      onSave: (s) => { projectSaved = s; },
      onClose: () => {},
      onError: (e) => { throw e; },
    }));
    await choose('indexCards');
    const w = el.querySelector('[data-testid="card-width"]');
    await act(async () => {
      // setterul nativ ocolește value tracker-ul React (altfel evenimentul e ignorat)
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(w, '8');
      w.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const saveBtn = [...el.querySelectorAll('.actions button')].find((b) => b.className.includes('primary'));
    await act(async () => saveBtn.click());
    await flush();
    expect(projectSaved.format).toBe('indexCards');
    expect(projectSaved.cardWidthCm).toBe(8);
    expect(projectSaved.cardHeightCm).toBe(15);
  });

  it('pageSetup existent din proiect preîncarcă formatul', async () => {
    await mount(React.createElement(PageSetupDialog, {
      api: { setPageSetup: async (v) => v },
      project: { title: 'Carte', pageSetup: { format: 'outline' } },
      onClose: () => {},
      onError: (e) => { throw e; },
    }));
    expect(select().value).toBe('outline');
  });

  it('Print Preview arată eticheta formatului din setup-ul primit', async () => {
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => 'blob:preview';
    URL.revokeObjectURL = () => {};
    try {
      const api = {
        printPreview: async () => ({
          token: 'p1',
          data: new Uint8Array([37, 80, 68, 70]),
          pageCount: 1,
          pageSize: { width: 595, height: 842 },
          setup: { format: 'indexCards', cardHeightCm: 15 },
        }),
      };
      await mount(React.createElement(PrintPreviewDialog, {
        api, dir: 'X:/p', project: { title: 'Carte' }, options: {}, onClose: () => {}, onError: (e) => { throw e; },
      }));
      const label = el.querySelector('[data-testid="print-preview-format"]');
      expect(label).not.toBeNull();
      expect(label.textContent).toBe('Format: Fișe index');
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
  });

  it('Print Preview fără format în setup nu arată eticheta', async () => {
    URL.createObjectURL = () => 'blob:preview';
    URL.revokeObjectURL = () => {};
    try {
      const api = {
        printPreview: async () => ({ token: 'p1', data: new Uint8Array([37, 80, 68, 70]), pageCount: 1, pageSize: { width: 595, height: 842 }, setup: {} }),
      };
      await mount(React.createElement(PrintPreviewDialog, {
        api, dir: 'X:/p', project: { title: 'Carte' }, options: {}, onClose: () => {}, onError: (e) => { throw e; },
      }));
      expect(el.querySelector('[data-testid="print-preview-format"]')).toBeNull();
    } finally {
      delete URL.createObjectURL;
      delete URL.revokeObjectURL;
    }
  });
});
