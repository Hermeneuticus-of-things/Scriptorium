import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { rtfToHtml, rtfToText } = require('../lib/rtf.cjs');

const H = String.raw`{\rtf1\ansi\ansicpg1252\cocoartf2639
{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;\red0\green0\blue0;\red200\green30\blue30;\red255\green240\blue0;}
{\*\expandedcolortbl;;}
\pard\tx560\pardirnatural\partightenfactor0
\f0\fs24 \cf2 `;

describe('rtfToHtml v2', () => {
  it('alignment, strike, super/sub, colors, highlight', () => {
    const html = rtfToHtml(H + String.raw`\qc Centru\par
\pard\ql \strike t\strike0  x\super 2\nosupersub  H\sub 2\nosupersub O \cf3 roșu\cf2  \cb4 marcat\cb0 .}`);
    expect(html).toContain('<p style="text-align: center">Centru</p>');
    expect(html).toContain('<s>t</s>');
    expect(html).toContain('<sup>2</sup>');
    expect(html).toContain('<sub>2</sub>');
    expect(html).toContain('<span style="color: #c81e1e">ro');
    expect(html).toContain('background-color: #fff000');
  });

  it('linked comments and footnotes via scrivcmt:// with content.comments', () => {
    const rtf = H + String.raw`Text {\field{\*\fldinst{HYPERLINK "scrivcmt://AAAA-1"}}{\fldrslt comentat}} și {\field{\*\fldinst{HYPERLINK "scrivcmt://BBBB-2"}}{\fldrslt nota}}.}`;
    const html = rtfToHtml(rtf, {
      comments: {
        'AAAA-1': { text: 'Verifică data', footnote: false, author: 'Ed', color: '#ffd666' },
        'BBBB-2': { text: 'Sursa: arhiva', footnote: true },
        'CCCC-3': { text: 'Fără ancoră', footnote: false },
      },
    });
    expect(html).toContain('<span data-comment="Verifică data" data-color="#ffd666" data-author="Ed" class="comment">comentat</span>');
    expect(html).toContain('nota<span data-footnote="Sursa: arhiva" class="footnote"></span>');
    expect(html).toContain('data-annotation="Fără ancoră"');
  });

  it('inline footnotes and inline annotations', () => {
    const html = rtfToHtml(H + String.raw`Frază{\Scrv_fn=nota inline\end_Scrv_fn} și {\Scrv_annot \color={\R=0\G=0\B=1}\text=de rescris\end_Scrv_annot} gata.}`);
    expect(html).toContain('Frază<span data-footnote="nota inline" class="footnote"></span>');
    expect(html).toContain('<span data-annotation="de rescris" class="annotation"></span>');
    expect(html).not.toContain('Scrv');
  });

  it('Scrivener links and external links', () => {
    const rtf = H + String.raw`{\field{\*\fldinst{HYPERLINK "scrivlnk://1A2B3C4D-1111-2222-3333-444455556666"}}{\fldrslt Capitolul 2}} și {\field{\*\fldinst{HYPERLINK "https://ex.ro/a"}}{\fldrslt site}}}`;
    const html = rtfToHtml(rtf, { linkFor: (u) => (u.startsWith('1A2B') ? 'scriptorium://doc/NEW' : null) });
    expect(html).toContain('<a href="scriptorium://doc/NEW" class="internal-link">Capitolul 2</a>');
    expect(html).toContain('<a href="https://ex.ro/a">site</a>');
  });

  it('lists, tables, page breaks', () => {
    const rtf = H + String.raw`\pard\ls1\ilvl0{\listtext	\uc0舦 	}Unu\par
{\listtext	\uc0舦 	}Doi\par
\pard Normal\page
\trowd\cellx1000\cellx2000
\pard\intbl A\cell B\cell\row
\pard Final}`;
    const html = rtfToHtml(rtf);
    expect(html).toContain('<ul><li><p>Unu</p></li><li><p>Doi</p></li></ul>');
    expect(html).toContain('<hr class="page-break">');
    expect(html).toContain('<table><tbody><tr><td><p>A</p></td><td><p>B</p></td></tr></tbody></table>');
    expect(html).toContain('<p>Final</p>');
  });

  it('embedded PNG and unsupported EMF are kept', () => {
    const png = '89504e470d0a1a0a';
    const html = rtfToHtml(H + `{\\pict\\pngblip\\picwgoal1500 ${png}}{\\pict\\emfblip 0100000002000000}}`);
    expect(html).toContain('<img src="data:image/png;base64,iVBORw0KGgo=" width="100">');
    expect(html).toContain('data-unsupported-image="data:image/emf;base64,');
  });

  it('named style markers and stylesheet headings', () => {
    const rtf = String.raw`{\rtf1\ansi{\stylesheet{\s1 Heading 1;}{\s2 Block Quote;}}\pard\s1 Titlu\par\pard\s2 Citat\par\pard <$Scr_Ps::0>Sub<!$Scr_Ps::0>\par\pard x <$Scr_Cs::1>acc<!$Scr_Cs::1> y}`;
    const html = rtfToHtml(rtf, { styleNames: { 0: 'Heading 2', 1: 'Emphasis' } });
    expect(html).toContain('<h1>Titlu</h1>');
    expect(html).toContain('<blockquote><p>Citat</p></blockquote>');
    expect(html).toContain('<h2>Sub</h2>');
    expect(html).toContain('x <em>acc</em> y');
  });

  it('keeps <$placeholders> and astral unicode', () => {
    const html = rtfToHtml(H + 'Capitolul <$n> ' + '\\' + 'uc0' + '\\' + 'u55357 ' + '\\' + 'u56842 }');
    expect(html).toContain('Capitolul &lt;$n&gt; 😊');
    expect(rtfToText(H + 'a\\par b}')).toBe('a\nb');
  });
});
