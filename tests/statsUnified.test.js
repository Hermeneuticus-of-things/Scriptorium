// @vitest-environment jsdom
// P10 (owner X6, 2026-10-31): one Proiect › Statistici… entry; the live selection window opens from the dialog.
import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import StatisticsDialog from '../src/components/StatisticsDialog.jsx';
import { setLanguage } from '../src/lib/i18n.js';
import { uiRo, uiEn } from '../src/lib/i18n-ui.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const project = { title: 'Carte', tree: [{ id: 'draft', root: 'draft', type: 'folder', children: [{ id: 'a', type: 'text' }] }] };
const docs = { a: '<p>Ana are mere.</p>' };
let root; let host;
afterEach(() => { act(() => root && root.unmount()); host?.remove(); root = null; setLanguage('ro'); });
const mount = (props) => {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(React.createElement(StatisticsDialog, { project, docs, selectionIds: [], onClose: () => {}, ...props })));
};

describe('StatisticsDialog live window door', () => {
  it('shows the live window button and calls onLiveText', () => {
    const onLiveText = vi.fn();
    mount({ onLiveText });
    const b = host.querySelector('button.stats-live-text');
    expect(b).toBeTruthy();
    expect(b.textContent).toBe(uiRo['ui.stats.live_open']);
    act(() => b.click());
    expect(onLiveText).toHaveBeenCalledTimes(1);
  });
  it('hides the button when no live window handler is given', () => {
    mount({});
    expect(host.querySelector('button.stats-live-text')).toBeNull();
  });
  it('labels exist in ro + en and the live window title no longer clashes with the dialog section', () => {
    for (const d of [uiRo, uiEn]) for (const k of ['ui.stats.live_open', 'ui.stats.live_hint']) expect(d[k]).toBeTruthy();
    expect(uiRo['ui.p11.ts_title']).not.toBe(uiRo['ui.statisticsDialog.statistici_de_text']);
    expect(uiEn['ui.p11.ts_title']).not.toBe(uiEn['ui.statisticsDialog.statistici_de_text']);
  });
});
