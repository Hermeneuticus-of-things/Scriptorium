// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import SpeechBar from '../src/components/SpeechBar.jsx';
import { setLanguage } from '../src/lib/i18n.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, el, plays, resolveSpeak;
beforeEach(() => {
  plays = 0;
  globalThis.Audio = class { constructor() { this.playbackRate = 1; } play() { plays++; return Promise.resolve(); } pause() {} };
  window.speechSynthesis = { getVoices: () => [], pause: vi.fn(), resume: vi.fn(), cancel: vi.fn(), speak: vi.fn(), addEventListener() {} };
});
afterEach(() => { try { act(() => root.unmount()); } catch {} el.remove(); setLanguage('ro'); });
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const api = () => ({
  servicesStatus: async () => ({ services: { speechify: { configured: true } } }),
  speakCloud: () => new Promise((r) => { resolveSpeak = () => r({ chunks: ['AAA', 'BBB'], format: 'mp3' }); }),
});
async function mount() {
  el = document.createElement('div'); document.body.append(el);
  root = createRoot(el);
  await act(async () => root.render(React.createElement(SpeechBar, { api: api(), getText: () => 'Un text.', onInsertText: () => {}, onClose: () => {} })));
  await flush();
}
const btn = (re) => [...el.querySelectorAll('button')].find((b) => re.test(b.textContent));

describe('SpeechBar with Speechify', () => {
  it('Stop while the audio is being fetched cancels playback', async () => {
    await mount();
    expect(el.querySelector('select').value).toBe('speechify');
    await act(async () => btn(/Citește/).click());
    await act(async () => btn(/Oprește/).click());
    await act(async () => resolveSpeak());
    await flush();
    expect(plays).toBe(0);
    expect(btn(/Oprește/).disabled).toBe(true);
  });
  it('closing the bar while fetching does not start audio afterwards', async () => {
    await mount();
    await act(async () => btn(/Citește/).click());
    act(() => root.unmount());
    resolveSpeak();
    await new Promise((r) => setTimeout(r, 0));
    expect(plays).toBe(0);
  });
  it('switching engine mid-fetch cancels the Speechify playback', async () => {
    await mount();
    await act(async () => btn(/Citește/).click());
    const sel = el.querySelector('select');
    await act(async () => { sel.value = 'system'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
    await act(async () => resolveSpeak());
    await flush();
    expect(plays).toBe(0);
  });
  it('Pause is not offered before the audio arrives (would pause the system voice)', async () => {
    await mount();
    await act(async () => btn(/Citește/).click());
    expect(btn(/Pauză/).disabled).toBe(true);
    await act(async () => resolveSpeak());
    await flush();
    expect(plays).toBe(1);
    expect(btn(/Pauză/).disabled).toBe(false);
  });
  it('has no Romanian left in English', async () => {
    setLanguage('en');
    await mount();
    expect(el.textContent).not.toMatch(/Dictare|Citește/);
    expect([...el.querySelectorAll('[title]')].map((e) => e.title).join(' ')).not.toMatch(/Dictare|Voce\b/);
  });
});
