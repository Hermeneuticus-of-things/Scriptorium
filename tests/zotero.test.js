import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const z = require('../lib/zotero.cjs');

const item = (id, family, year, extra = {}) => ({ id, type: 'book', title: `Carte ${id}`, author: [{ family, given: 'Ana' }], issued: { 'date-parts': [[year]] }, ...extra });
const fakeFetch = (pages, seen = []) => async (url, init) => {
  seen.push({ url, init });
  const start = Number(new URL(url).searchParams.get('start'));
  const items = pages[start / 100] || [];
  return { ok: true, status: 200, json: async () => ({ items }), headers: { get: (h) => (h === 'Total-Results' ? String(pages.flat().length) : null) } };
};

describe('Zotero import', () => {
  it('reads every page with the key header and builds readable, unique citation keys', async () => {
    const seen = [];
    const page1 = Array.from({ length: 100 }, (_, i) => item(`1/A${i}`, i % 2 ? 'Popescu' : 'Ionescu', 2000 + (i % 3)));
    const page2 = [item('1/B1', 'Țăranu', 1999), item('1/B2', 'X', 2010, { 'citation-key': 'clasic:2010' })];
    const r = await z.fetchZoteroLibrary({ userId: '1234', apiKey: 'k', fetchImpl: fakeFetch([page1, page2], seen) });
    expect(seen.length).toBe(2);
    expect(seen[0].url).toBe('https://api.zotero.org/users/1234/items/top?format=csljson&limit=100&start=0');
    expect(seen[0].init.headers['Zotero-API-Key']).toBe('k');
    expect(r.length).toBe(102);
    expect(new Set(r.map((e) => e.key)).size).toBe(102);
    expect(r.find((e) => e.title === 'Carte 1/B1').key).toBe('Taranu1999');
    expect(r.find((e) => e.title === 'Carte 1/B2').key).toBe('clasic:2010');
  });
  it('a collection, and clear errors for a wrong id, key or missing settings', async () => {
    const seen = [];
    await z.fetchZoteroLibrary({ userId: '1', apiKey: 'k', collection: 'ABC 1', fetchImpl: fakeFetch([[]], seen) });
    expect(seen[0].url).toContain('/users/1/collections/ABC%201/items/top');
    const status = (s) => async () => ({ ok: false, status: s, json: async () => ({}) });
    await expect(z.fetchZoteroLibrary({ userId: '1', apiKey: 'k', fetchImpl: status(403) })).rejects.toThrow(/acces/);
    await expect(z.fetchZoteroLibrary({ userId: '1', apiKey: 'k', fetchImpl: status(404) })).rejects.toThrow(/nu există/);
    await expect(z.fetchZoteroLibrary({ userId: 'ana', apiKey: 'k' })).rejects.toThrow(/Setări/);
    await expect(z.fetchZoteroLibrary({ userId: '1', apiKey: '' })).rejects.toThrow(/Setări/);
  });
  it('merging replaces entries with the same key and keeps the rest in order', () => {
    const merged = z.mergeBibliography([{ key: 'a', title: 'vechi' }, { key: 'b', title: 'B' }], [{ key: 'a', title: 'nou' }, { key: 'c', title: 'C' }]);
    expect(merged.map((e) => `${e.key}:${e.title}`)).toEqual(['a:nou', 'b:B', 'c:C']);
  });
});
