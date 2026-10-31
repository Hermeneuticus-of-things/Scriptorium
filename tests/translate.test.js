// Translation services: DeepL / Google with a key, and the no-key gtx fallback (mocked fetch).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { deeplTranslate, googleTranslate, gtxTranslate, deeplEndpoint } = require('../lib/translate.cjs');

const okJson = (body) => ({ ok: true, status: 200, json: async () => body });

describe('deeplEndpoint', () => {
  it('cheile free (:fx) merg pe api-free', () => {
    expect(deeplEndpoint('ABCD:fx')).toBe('https://api-free.deepl.com/v2/translate');
    expect(deeplEndpoint('ABCD')).toBe('https://api.deepl.com/v2/translate');
  });
});

describe('deeplTranslate', () => {
  it('trimite target_lang și citește traducerea', async () => {
    let sent = null;
    const r = await deeplTranslate({
      apiKey: 'K', text: 'Bună', from: 'auto', to: 'en',
      fetchImpl: async (url, opts) => { sent = { url, body: JSON.parse(opts.body) }; return okJson({ translations: [{ text: 'Hi', detected_source_language: 'RO' }] }); },
    });
    expect(r).toMatchObject({ text: 'Hi', service: 'DeepL' });
    expect(sent.body.target_lang).toBe('EN-GB');
    expect(sent.url).toContain('api.deepl.com');
  });
  it('fără cheie → mesaj clar', async () => {
    await expect(deeplTranslate({ apiKey: '', text: 'x' })).rejects.toThrow(/Pune cheia DeepL/);
  });
});

describe('googleTranslate', () => {
  it('necesită cheie', async () => {
    await expect(googleTranslate({ apiKey: '', text: 'x', to: 'ro' })).rejects.toThrow(/cheia Google Cloud Translation/);
  });
  it('decodifică entitățile HTML din răspuns', async () => {
    const r = await googleTranslate({
      apiKey: 'K', text: 'a & b', to: 'ro',
      fetchImpl: async () => okJson({ data: { translations: [{ translatedText: 'x &amp; y &#39;z&#39;' }] } }),
    });
    expect(r.text).toBe("x & y 'z'");
  });
});

describe('gtxTranslate (fără cheie)', () => {
  it('unește segmentele și citește limba detectată', async () => {
    const r = await gtxTranslate({
      text: 'Bună ziua', to: 'en',
      fetchImpl: async () => okJson([[['Hello there', 'src', null, null]], null, 'ro']),
    });
    expect(r).toMatchObject({ text: 'Hello there', detected: 'ro', service: 'Google (fără cheie)' });
  });
  it('răspuns gol → eroare clară', async () => {
    await expect(gtxTranslate({ text: 'x', to: 'ro', fetchImpl: async () => okJson([[]]) })).rejects.toThrow(/nu a întors/);
  });
});
