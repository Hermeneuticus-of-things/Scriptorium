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
    // Footnote="Yes" entry = Scrivener linked footnote: kept as a mark over its anchor
    expect(html).toContain('<span data-linked-footnote="Sursa: arhiva" class="linked-footnote">nota</span>');
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
    const html = rtfToHtml(rtf, { linkFor: (u) => (u.startsWith('1A2B') ? 'scribner://doc/NEW' : null) });
    expect(html).toContain('<a href="scribner://doc/NEW" class="internal-link">Capitolul 2</a>');
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
    // a character style is kept by name, not guessed into <em>
    expect(html).toContain('x <span data-char-style="emphasis">acc</span> y');
  });

  it('named paragraph/character styles keep their names (stylesheet and Scrivener markers)', () => {
    const rtf = String.raw`{\rtf1\ansi{\stylesheet{\s0 Normal;}{\s3 Motto;}{\*\cs4 Accent;}{\*\cs5 Code Span;}}\pard\s3 Sus\par\pard\plain Normal {\cs4 tare} și {\cs5 cod}\par\pard <$Scr_Ps::2>Scris<!$Scr_Ps::2>\par}`;
    const seen = [];
    const html = rtfToHtml(rtf, { styleNames: { 2: 'Scrisoare' }, styleId: (name, kind) => (seen.push([name, kind]), name === 'Accent' ? 'accent-x' : name.toLowerCase().replace(/ /g, '-')) });
    expect(html).toBe('<p data-style="motto">Sus</p><p>Normal <span data-char-style="accent-x">tare</span> și <span data-char-style="code-span">cod</span></p><p data-style="scrisoare">Scris</p>');
    expect(seen).toEqual(expect.arrayContaining([['Motto', 'para'], ['Accent', 'char'], ['Code Span', 'char'], ['Scrisoare', 'para']]));
  });

  it('inline note groups scope \\uc: no stray "?" after a footnote or annotation (as Scrivener writes them)', () => {
    // Scrivener 3 content.rtf: \uc0 is set inside the note group; after the group the outer \uc1 applies again
    const fn = rtfToHtml(String.raw`{\rtf1\ansi\ansicpg1252\uc1 a{\Scrv_fn=\uc0 not\u259 \end_Scrv_fn} \u259?b\u351?\par}`);
    expect(fn).toBe('<p>a<span data-footnote="notă" class="footnote"></span> ăbş</p>');
    const an = rtfToHtml(String.raw`{\rtf1\ansi\uc1 x{\Scrv_annot \color={\R=0\G=0\B=1}\text=de \u351?ters\end_Scrv_annot} \u259?\par}`);
    expect(an).toBe('<p>x<span data-annotation="de şters" class="annotation"></span> ă</p>');
    // a note right after \uN must not be eaten by the fallback skip
    expect(rtfToHtml(String.raw`{\rtf1\ansi\uc1 \u259?{\Scrv_fn=n\end_Scrv_fn}\par}`)).toBe('<p>ă<span data-footnote="n" class="footnote"></span></p>');
  });

  it('nested lists from \\ilvl, \\pnlvl and indentation', () => {
    const cocoa = String.raw`{\rtf1\ansi\pard\li720\fi-720\ls1\ilvl0{\listtext\uc0\u8226 }A\par
\pard\li1440\fi-720\ls1\ilvl1{\listtext 1.}B\par
{\listtext 2.}C\par
\pard\li720\fi-720\ls1\ilvl0{\listtext\uc0\u8226 }D\par
\pard After\par}`;
    expect(rtfToHtml(cocoa)).toBe('<ul><li><p>A</p><ol><li><p>B</p></li><li><p>C</p></li></ol></li><li><p>D</p></li></ul><p>After</p>');
    const word = String.raw`{\rtf1\ansi{\pntext a}\pard{\*\pn\pnlvlblt}\pnlvl1 X\par{\pntext b}\pard\pnlvl2 Y\par}`;
    expect(rtfToHtml(word)).toBe('<ul><li><p>X</p><ul><li><p>Y</p></li></ul></li></ul>');
    const indentOnly = String.raw`{\rtf1\ansi\pard\li720\ls1{\listtext -}P\par\pard\li1440\ls1{\listtext -}Q\par}`;
    expect(rtfToHtml(indentOnly)).toBe('<ul><li><p>P</p><ul><li><p>Q</p></li></ul></li></ul>');
  });

  it('table header rows (\\trhdr) become th', () => {
    const rtf = String.raw`{\rtf1\ansi\trowd\trhdr\cellx1000\cellx2000\pard\intbl Nume\cell Rol\cell\row\trowd\cellx1000\cellx2000\pard\intbl Ana\cell Erou\cell\row}`;
    expect(rtfToHtml(rtf)).toBe('<table><tbody><tr><th><p>Nume</p></th><th><p>Rol</p></th></tr><tr><td><p>Ana</p></td><td><p>Erou</p></td></tr></tbody></table>');
  });

  it('small caps and all caps keep the text as typed', () => {
    const html = rtfToHtml(String.raw`{\rtf1\ansi a {\scaps Mic} b {\caps Mare}\par}`);
    expect(html).toBe('<p>a <span data-caps="small">Mic</span> b <span data-caps="all">Mare</span></p>');
  });

  it('comment dates are kept', () => {
    const rtf = String.raw`{\rtf1\ansi {\field{\*\fldinst HYPERLINK "scrivcmt://C1"}{\fldrslt x}}\par}`;
    expect(rtfToHtml(rtf, { comments: { C1: { text: 'n', footnote: false, date: '2024-03-04T05:06:07.000Z' } } })).toBe('<p><span data-comment="n" data-comment-date="2024-03-04T05:06:07.000Z" class="comment">x</span></p>');
  });

  it('keeps <$placeholders> and astral unicode', () => {
    const html = rtfToHtml(H + 'Capitolul <$n> ' + '\\' + 'uc0' + '\\' + 'u55357 ' + '\\' + 'u56842 }');
    expect(html).toContain('Capitolul &lt;$n&gt; 😊');
    expect(rtfToText(H + 'a\\par b}')).toBe('a\nb');
  });
});
