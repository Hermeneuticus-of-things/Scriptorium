// Echivalența textCore: implementarea unică (lib/textCore.cjs) trebuie să dea exact
// ce dădeau cele două clone dinainte — store.cjs (lista scurtă de tag-uri) și rag.cjs
// (lista cu |div). Diferența de newline între liste nu schimbă numărul de cuvinte.
import { describe, it, expect } from 'vitest';
import { htmlToText, wordCount } from '../lib/textCore.cjs';

function storeClone(html) {
  return (html || '')
    .replace(/<\/(p|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function ragClone(html) {
  return String(html || '')
    .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

const CASES = [
  '<p>doi trei</p>',
  '<p>unu</p><div>doi</div><li>trei</li><blockquote>patru</blockquote><pre>cinci</pre>',
  '<p>entități: &amp; &lt; &quot; &#39; &nbsp;</p>',
  '<h2>Titlu</h2><p>Ștefan și Mărioara, ă â î ș ț</p>',
  '<span>span fără newline</span><td>celulă</td>',
  '',
];

describe('textCore — implementarea unică pentru procesul main', () => {
  // Tag-urile comune ambelor clone vechi: echivalență exactă (text ȘI număr).
  const COMMON = [
    '<p>doi trei</p>',
    '<p>unu</p><li>trei</li><blockquote>patru</blockquote>',
    '<p>entități: &amp; &lt; &quot; &#39; &nbsp;</p>',
    '<h2>Titlu</h2><p>Ștefan și Mărioara, ă â î ș ț</p>',
    '<span>span fără newline</span>',
    '',
  ];

  it('echivalență exactă cu ambele clone pe tag-urile comune', () => {
    for (const html of COMMON) {
      expect(htmlToText(html)).toBe(storeClone(html));
      expect(htmlToText(html)).toBe(ragClone(html));
      expect(wordCount(html)).toBe(wordCount(storeClone(html)));
      expect(wordCount(html)).toBe(wordCount(ragClone(html)));
    }
  });

  // Lista union adaugă div/td/th/tr/pre/dt/dd/figcaption ca separatoare — îmbunătățire
  // intenționată: vechea clonă din store lepea cuvintele la limita de tag („patrucinci").
  it('comportament union: tag-urile extinse separă cuvintele corect', () => {
    expect(wordCount('<p>patru</p><pre>cinci</pre>')).toBe(2);
    expect(wordCount('<td>șase</td><p>șapte</p>')).toBe(2);
    expect(htmlToText('<p>a</p><div>b</div><pre>c</pre>').split('\n').filter(Boolean)).toEqual(['a', 'b', 'c']);
  });

  it('numărare pe diacritice și apostrof', () => {
    expect(wordCount('<p>Ștefan-aând și-n copilărie</p>')).toBe(3);
  });
});
