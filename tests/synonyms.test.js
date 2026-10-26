import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { parseSynonyms, fetchSynonyms } = require('../lib/synonyms.cjs');

const ok = (url, html) => ({ ok: true, status: 200, url, text: async () => html });

describe('sinonimul.ro synonyms', () => {
  it('parses the comma lists, dedupes and drops the word itself and related-word rows', () => {
    const html = `<ol>
      <li style='font-size:22px'>arătos, plăcut, frumos, arătos</li>
      <li style='font-size:22px'>senin, luminos</li>
    </ol>
    <li><a href='https://sinonimul.ro/aspectuos'><b>aspectuos</b></a> - arătos, plăcut</li>`;
    expect(parseSynonyms(html, 'frumos')).toEqual(['arătos', 'plăcut', 'senin', 'luminos']);
  });

  it('fetches a lemma and returns its synonyms', async () => {
    const res = await fetchSynonyms({ word: 'frumos', fetchImpl: async (url) => ok(url, "<ol><li style='font-size:22px'>plăcut, splendid</li></ol>") });
    expect(res).toEqual({ word: 'frumos', synonyms: ['plăcut', 'splendid'] });
  });

  it('percent-encodes diacritics in the URL (the server needs the encoded form)', async () => {
    let seen = '';
    await fetchSynonyms({ word: 'mâncare', fetchImpl: async (url) => { seen = url; return ok(url, "<ol><li style='font-size:22px'>hrană, bucate</li></ol>"); } });
    expect(seen).toBe('https://sinonimul.ro/m%C3%A2ncare');
  });

  it('gives a clear message when the word is not a lemma (sinonimul.ro 404)', async () => {
    const fetchImpl = async () => ({ ok: false, status: 404, url: 'https://sinonimul.ro/404.php', text: async () => '' });
    await expect(fetchSynonyms({ word: 'frumoasă', fetchImpl })).rejects.toThrow(/forma de bază/);
  });

  it('refuses a multi-word selection (synonyms are per word)', async () => {
    await expect(fetchSynonyms({ word: 'foc de tabără' })).rejects.toThrow(/un singur cuvânt/);
  });
});
