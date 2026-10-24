import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const svc = require('../lib/services.cjs');
const tr = require('../lib/translate.cjs');

// Reversible fake of Electron safeStorage.
const safe = {
  isEncryptionAvailable: () => true,
  encryptString: (s) => Buffer.from(`X${[...s].reverse().join('')}`, 'utf8'),
  decryptString: (b) => [...b.toString('utf8').slice(1)].reverse().join(''),
};

describe('service accounts', () => {
  it('stores secrets encrypted, keeps non-secret fields readable, reports status without secrets', () => {
    let s = svc.setService({}, 'languagetool', { username: 'ana@ex.ro', apiKey: 'lt-secret' }, safe);
    s = svc.setService(s, 'deepl', { apiKey: 'abc:fx' }, safe);
    expect(JSON.stringify(s)).not.toContain('lt-secret');
    expect(JSON.stringify(s)).not.toContain('abc:fx');
    expect(svc.getService(s, 'languagetool', safe)).toEqual({ username: 'ana@ex.ro', apiKey: 'lt-secret' });
    const st = svc.serviceStatus(s, safe);
    expect(st.deepl.configured).toBe(true);
    expect(st.googleTranslate.configured).toBe(false);
    expect(st.languagetool.fields).toEqual([
      { id: 'username', label: 'E-mail cont', secret: false, set: true, value: 'ana@ex.ro' },
      { id: 'apiKey', label: 'Cheie API', secret: true, set: true, value: '' },
    ]);
    expect(JSON.stringify(st)).not.toContain('lt-secret');
  });
  it('an empty value deletes one field; deleting all fields removes the service', () => {
    let s = svc.setService({}, 'zotero', { userId: '123', apiKey: 'z' }, safe);
    s = svc.setService(s, 'zotero', { apiKey: '' }, safe);
    expect(svc.getService(s, 'zotero', safe)).toEqual({ userId: '123', apiKey: '' });
    s = svc.setService(s, 'zotero', { userId: '' }, safe);
    expect(s.services.zotero).toBeUndefined();
    expect(() => svc.setService({}, 'nope', {}, safe)).toThrow();
  });
  it('a key encrypted on another computer reads as missing, not as garbage', () => {
    const s = { services: { deepl: { apiKey: { enc: Buffer.from('broken').toString('base64') } } } };
    const bad = { ...safe, decryptString: () => { throw new Error('other profile'); } };
    expect(svc.getService(s, 'deepl', bad).apiKey).toBe('');
    expect(svc.serviceStatus(s, bad).deepl.configured).toBe(false);
  });
  it('other accounts: add, update keeping the password, list without passwords, delete', () => {
    let { settings: s, id } = svc.setAccount({}, { name: 'Editura X', url: 'https://portal.edx.ro', username: 'ana', password: 'p@ss' }, safe);
    expect(JSON.stringify(s)).not.toContain('p@ss');
    ({ settings: s } = svc.setAccount(s, { id, name: 'Editura X (portal)', url: 'https://portal.edx.ro', username: 'ana' }, safe));
    expect(svc.accountPassword(s, id, safe)).toBe('p@ss');
    expect(svc.listAccounts(s)).toEqual([{ id, name: 'Editura X (portal)', url: 'https://portal.edx.ro', username: 'ana', hasPassword: true }]);
    expect(() => svc.setAccount(s, { name: 'x', url: 'javascript:alert(1)' }, safe)).toThrow();
    expect(() => svc.setAccount(s, { name: ' ' }, safe)).toThrow();
    s = svc.deleteAccount(s, id);
    expect(svc.listAccounts(s)).toEqual([]);
  });
});

const fakeFetch = (status, body, seen) => async (url, init) => {
  seen.push({ url, init });
  return { ok: status < 400, status, json: async () => body };
};

describe('translation and grammar services', () => {
  it('DeepL: free key -> api-free endpoint, auth header, EN target variant, source language', async () => {
    const seen = [];
    const r = await tr.deeplTranslate({ apiKey: 'k:fx', text: 'Bună dimineața', from: 'ro', to: 'en', fetchImpl: fakeFetch(200, { translations: [{ text: 'Good morning', detected_source_language: 'RO' }] }, seen) });
    expect(r).toEqual({ text: 'Good morning', detected: 'ro', service: 'DeepL' });
    expect(seen[0].url).toBe('https://api-free.deepl.com/v2/translate');
    expect(seen[0].init.headers.Authorization).toBe('DeepL-Auth-Key k:fx');
    expect(JSON.parse(seen[0].init.body)).toMatchObject({ text: ['Bună dimineața'], target_lang: 'EN-GB', source_lang: 'RO' });
    expect(tr.deeplEndpoint('pro-key')).toBe('https://api.deepl.com/v2/translate');
  });
  it('DeepL: friendly errors for a wrong key and for the monthly quota', async () => {
    await expect(tr.deeplTranslate({ apiKey: 'k', text: 'x', fetchImpl: fakeFetch(403, {}, []) })).rejects.toThrow(/cheia nu e acceptată/);
    await expect(tr.deeplTranslate({ apiKey: 'k', text: 'x', fetchImpl: fakeFetch(456, {}, []) })).rejects.toThrow(/limita de caractere/);
    await expect(tr.deeplTranslate({ apiKey: '', text: 'x' })).rejects.toThrow(/Setări/);
    await expect(tr.deeplTranslate({ apiKey: 'k', text: '   ' })).rejects.toThrow(/niciun text/);
  });
  it('Google: key in the query, entities decoded', async () => {
    const seen = [];
    const r = await tr.googleTranslate({ apiKey: 'g k', text: 'Hello', to: 'ro', fetchImpl: fakeFetch(200, { data: { translations: [{ translatedText: 'Ce &quot;zi&quot; &#539;i-a', detectedSourceLanguage: 'en' }] } }, seen) });
    expect(r.text).toBe('Ce "zi" ți-a');
    expect(seen[0].url).toContain('key=g%20k');
  });
  it('LanguageTool: free endpoint without an account, Premium with one; matches carry the found text', async () => {
    const seen = [];
    const body = { language: { name: 'Romanian' }, matches: [{ offset: 4, length: 2, message: 'Diacritice', replacements: [{ value: 'și' }], rule: { id: 'R' } }] };
    const r = await tr.languageToolCheck({ text: 'Ana si Ion', language: 'ro-RO', fetchImpl: fakeFetch(200, body, seen) });
    expect(seen[0].url).toBe('https://api.languagetool.org/v2/check');
    expect(r.matches[0]).toMatchObject({ found: 'si', replacements: ['și'] });
    await tr.languageToolCheck({ username: 'u', apiKey: 'k', text: 'x', fetchImpl: fakeFetch(200, { matches: [] }, seen) });
    expect(seen[1].url).toBe('https://api.languagetoolplus.com/v2/check');
    expect(seen[1].init.body).toContain('apiKey=k');
  });
});

describe('Speechify text to speech', () => {
  it('cuts long text at sentence ends and asks for each piece with the chosen voice', async () => {
    const seen = [];
    const text = `${'Prima frază e scurtă. '.repeat(120)}Ultima.`;
    const r = await tr.speechifySpeak({ apiKey: 'sk', voiceId: 'ana', text, fetchImpl: fakeFetch(200, { audio_data: 'QUJD' }, seen) });
    expect(seen.length).toBe(tr.speechChunks(text).length);
    expect(seen.length).toBeGreaterThan(1);
    expect(seen[0].url).toBe('https://api.sws.speechify.com/v1/audio/speech');
    expect(seen[0].init.headers.Authorization).toBe('Bearer sk');
    expect(JSON.parse(seen[0].init.body)).toMatchObject({ voice_id: 'ana', audio_format: 'mp3' });
    expect(r).toEqual({ format: 'mp3', chunks: seen.map(() => 'QUJD') });
    for (const c of tr.speechChunks(text)) expect(c.length).toBeLessThanOrEqual(1800);
    expect(tr.speechChunks(text).join(' ')).toBe(text);
  });
  it('without a key or text: clear messages', async () => {
    await expect(tr.speechifySpeak({ apiKey: '', text: 'x' })).rejects.toThrow(/Setări/);
    await expect(tr.speechifySpeak({ apiKey: 'k', text: '  ' })).rejects.toThrow(/niciun text/);
    await expect(tr.speechifySpeak({ apiKey: 'k', text: 'x', fetchImpl: fakeFetch(401, {}, []) })).rejects.toThrow(/cheia nu e acceptată/);
  });
});
