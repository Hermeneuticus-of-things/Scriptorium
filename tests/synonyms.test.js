import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { parseSynonyms, parseRelated, fetchSynonyms } = require('../lib/synonyms.cjs');

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
    expect(res).toMatchObject({ word: 'frumos', synonyms: ['plăcut', 'splendid'] });
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


describe('parseRelated (Sinonime Apropiate)', () => {
  const html = `<h2>Sinonime Apropiate</h2><ul><li><a href='x'><b>percepe</b></a> - a simți, a sesiza, a observa<li><a href='y'><b>prescrie</b></a> - a indica, a anula</ul><h2>Altceva</h2>`;
  it('extrage cuvintele apropiate cu listele lor', () => {
    const rel = parseRelated(html);
    expect(rel.map((r) => r.word)).toEqual(['percepe', 'prescrie']);
    expect(rel[0].synonyms).toContain('a simți');
  });
  it('fără secțiune → listă goală', () => {
    expect(parseRelated('<p>nimic</p>')).toEqual([]);
  });
});
