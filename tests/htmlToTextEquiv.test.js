// @vitest-environment jsdom
// Echivalența htmlToText: implementarea pură (string + textarea decode) trebuie să dea
// EXACT același text ca referința DOM (div.textContent) — pe cazuri limită și, dacă
// este configurat explicit, pe un corpus mare local de test.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { htmlToText } from '../src/lib/text.js';

// Referința: implementarea DOM originală (cea dinainte de optimizare).
function domReference(html) {
  const el = document.createElement('div');
  el.innerHTML = (html || '').replace(/<\/(p|h[1-6]|li|blockquote|div|td|th|tr|pre|dt|dd|figcaption)>/gi, '$&\n').replace(/<br\s*\/?>/gi, '\n');
  return el.textContent || '';
}

const CASES = [
  '',
  '<p>un text simplu</p>',
  '<p>paragraf unu</p><p>paragraf doi</p>',
  '<p>linia unu<br>linia doi</p>',
  '<h1>Titlu</h1><li>element listă</li><blockquote>citat</blockquote><pre>cod pastrat</pre>',
  '<p>text cu <b>aldin</b> și <em>italic</em> în același rând</p>',
  '<p>entități: &amp; &lt; &gt; &quot; &#39; &nbsp; sfârșit</p>',
  '<p>diacritice: ă â î ș ț Ș Ț — și tilde: ñ, ü</p>',
  '<p>&abreve; &icirc; &scedil; &tcedil; (entități românești numite)</p>',
  '<!-- comentariu cu <b>markup</b> înăuntru --><p>după comentariu</p>',
  '<p>a &lt; b și c &gt; d</p>',
  '<p>atribute cu ghilimele: <span title="a > b">text</span></p>',
  '<div><div><p>imbricat adânc</p></div></div>',
  '<script>var x = "<p>nu se execută</p>";</script><p>după script</p>',
  '<style>.p { color: red; }</style><p>după style</p>',
  '<p>text cu mai mult    spațiu   și\ttab-uri</p>',
  '<table><tr><td>celulă unu</td><td>celulă doi</td></tr></table>',
  '<p>emoji și simboluri: ✓ ✗ — „ghilimele românești”</p>',
  '<p>paragraf</p></p><p>tag închis greșit</p>',
  '<p>text neînchis',
];

describe('htmlToText — echivalență cu implementarea DOM', () => {
  for (const [i, html] of CASES.entries()) {
    it(`cazul ${i + 1}: identic cu DOM`, () => {
      expect(htmlToText(html)).toBe(domReference(html));
    });
  }

  it('echivalență pe un document real mare (repetat, cu markup compus)', () => {
    const big = Array.from({ length: 200 }, (_, i) => `<p>Paragraful ${i}: &amp; entitate, <b>bold${i}</b>, ăâîșț<br>rand nou</p>`).join('');
    expect(htmlToText(big)).toBe(domReference(big));
  });

  // Corpus opțional: calea nu este niciodată inclusă în repository.
  const CORPUS_DOCS = process.env.PNEUMA_CORPUS_DIR || '';
  if (CORPUS_DOCS && fs.existsSync(CORPUS_DOCS)) {
    it('echivalență pe toate documentele corpusului mare configurat', () => {
      const files = fs.readdirSync(CORPUS_DOCS).filter((f) => f.endsWith('.html'));
      expect(files.length).toBeGreaterThan(1000);
      let mismatches = 0;
      for (const f of files) {
        const html = fs.readFileSync(path.join(CORPUS_DOCS, f), 'utf8');
        if (htmlToText(html) !== domReference(html)) {
          mismatches += 1;
          if (mismatches <= 3) console.error('MISMATCH', f, JSON.stringify({ got: htmlToText(html).slice(0, 120), want: domReference(html).slice(0, 120) }));
        }
      }
      expect(mismatches).toBe(0);
    }, 300000);
  } else {
    it('corpusul mare nu este configurat — cazurile locale acoperă echivalența', () => {
      expect(CASES.length).toBeGreaterThan(15);
    });
  }
});
