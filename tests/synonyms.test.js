import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { parseSynonyms, parseRelated, fetchSynonyms } = require('../lib/synonyms.cjs');

const ok = (url, html) => ({ ok: true, status: 200, url, text: async () => html });

describe('sinonimul.ro synonyms (structura nouă: meta + <li> simple)', () => {
  it('lista completă din <li> simple, dedup, fără cuvântul însuși; meniurile (goluri mari) sunt sărite', () => {
    const html = `<meta name="description" content="Sinonimele cuvântului frumos sunt: arătos, plăcut">
      <ul><li>arătos</li><li>plăcut</li><li>frumos</li><li>arătos</li></ul><ul><li>senin</li><li>luminos</li></ul>
      <div class="socials"><span style='padding-right:10px'><a rel="nofollow" href='javascript:;'><img data-toggle='tooltip' src='https://sinonimul.ro/assets/images/socials/favorite.png'></a></span><span style='padding-right:10px'><a rel="nofollow" href='javascript:;' onclick='showReport()'><img src='https://sinonimul.ro/assets/images/socials/bug.png'></a></span></div><li>Învață</li><li>Contact</li>
      <li><a href='https://sinonimul.ro/aspectuos'><b>aspectuos</b></a> - arătos, plăcut</li>`;
    // listele alăturate intră; meniul (după golul socials > 80) e sărit; aspectuos e rând apropiat
    expect(parseSynonyms(html, 'frumos')).toEqual(['arătos', 'plăcut', 'senin', 'luminos']);
  });

  it('fetches a lemma and returns its synonyms + related', async () => {
    const res = await fetchSynonyms({ word: 'frumos', fetchImpl: async (url) => ok(url, '<meta name="description" content="Sinonimele cuvântului frumos sunt: plăcut, splendid"><h2>Sinonime Apropiate</h2><li><a href="x"><b>aspectuos</b></a> - arătos</li>') });
    expect(res).toMatchObject({ word: 'frumos', synonyms: ['plăcut', 'splendid'] });
    expect(res.related.length).toBe(1);
  });

  it('percent-encodes diacritics in the URL (the server needs the encoded form)', async () => {
    let seen = '';
    await fetchSynonyms({ word: 'mâncare', fetchImpl: async (url) => { seen = url; return ok(url, '<meta name="description" content="Sinonimele cuvântului mâncare sunt: hrană, bucate">'); } });
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
