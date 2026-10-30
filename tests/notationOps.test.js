import { describe, it, expect } from 'vitest';
import { stripNotation, convertNotation, CONVERSIONS } from '../src/lib/notationOps.js';

// One paragraph carrying every notation kind, next to ordinary content that must survive.
const DOC =
  '<p>Textul rămâne <span data-comment="verifică sursa" class="comment">aici</span>, apoi' +
  ' <strong>continuă</strong><span data-annotation="de rescris" class="annotation">de rescris</span> mai departe.' +
  '<span data-footnote="nota din subsol" class="footnote"></span></p>' +
  '<p>Paragraf obișnuit cu <span style="color: red">text colorat</span> simplu.</p>';

const sum = (c) => c.annotations + c.comments + c.footnotes + c.linkedFootnotes + c.revisions;

describe('stripNotation (§18.4.1)', () => {
  it('removes every notation kind, keeps the text and the ordinary markup', () => {
    const { html, counts } = stripNotation(DOC);
    expect(counts).toEqual({ annotations: 1, comments: 1, footnotes: 1, linkedFootnotes: 0, revisions: 0 });
    // The comment unwrap keeps the anchored text; the annotation and footnote atoms are gone.
    expect(html).toContain('Textul rămâne aici, apoi <strong>continuă</strong> mai departe.');
    expect(html).not.toContain('data-annotation');
    expect(html).not.toContain('data-comment');
    expect(html).not.toContain('data-footnote');
    // Ordinary spans, styles and formatting are never touched.
    expect(html).toContain('<span style="color: red">text colorat</span>');
    expect(html).toContain('<p>Paragraf obișnuit');
  });

  it('strips linked footnotes to their anchor text', () => {
    const { html, counts } = stripNotation('<p>Un <span data-linked-footnote="nota legată" class="linked-footnote">cuvânt</span> ancorat.</p>');
    expect(counts.linkedFootnotes).toBe(1);
    expect(html).toBe('<p>Un cuvânt ancorat.</p>');
  });

  it('unwraps revision marks only when asked', () => {
    const doc = '<p>Text <span data-revision="2">revizuit</span> mai departe.</p>';
    expect(stripNotation(doc).html).toBe(doc);
    expect(stripNotation(doc).counts.revisions).toBe(0);
    const { html, counts } = stripNotation(doc, { revisions: true });
    expect(html).toBe('<p>Text revizuit mai departe.</p>');
    expect(counts.revisions).toBe(1);
  });

  it('leaves a kind intact when its opt is false', () => {
    const { html, counts } = stripNotation(DOC, { comments: false });
    expect(html).toContain('<span data-comment="verifică sursa" class="comment">aici</span>');
    expect(counts.comments).toBe(0);
    expect(counts.annotations).toBe(1);
    expect(counts.footnotes).toBe(1);
  });

  it('keeps a footnote kind intact when footnotes opt is false', () => {
    const { html, counts } = stripNotation(DOC, { footnotes: false });
    expect(html).toContain('data-footnote="nota din subsol"');
    expect(counts.footnotes).toBe(0);
    expect(counts.annotations).toBe(1);
  });

  it('returns the html unchanged with zero counts when there is no notation', () => {
    const plain = '<p>Doar text obișnuit, <strong>fără</strong> nicio notație.</p>';
    const { html, counts } = stripNotation(plain);
    expect(html).toBe(plain);
    expect(counts).toEqual({ annotations: 0, comments: 0, footnotes: 0, linkedFootnotes: 0, revisions: 0 });
    const empty = stripNotation('');
    expect(empty.html).toBe('');
    expect(sum(empty.counts)).toBe(0);
  });

  it('never wraps or corrupts entity text', () => {
    const doc = '<p>Tom &amp; Jerri <span data-annotation="nume" class="annotation">nume</span></p>';
    const { html, counts } = stripNotation(doc);
    expect(html).toBe('<p>Tom &amp; Jerri </p>');
    expect(counts.annotations).toBe(1);
  });
});

describe('convertNotation (§18.4.5)', () => {
  it('converts inline annotations to comments anchored on the word before', () => {
    const doc = '<p>Un cuvânt<span data-annotation="verifică" class="annotation">verifică</span> important.</p>';
    const { html, count } = convertNotation(doc, 'inline-annotation', 'comment');
    expect(count).toBe(1);
    expect(html).toBe('<p>Un <span data-comment="verifică" class="comment">cuvânt</span> important.</p>');
  });

  it('converts comments to inline annotations placed after the anchored text', () => {
    const doc = '<p>Un <span data-comment="verifică" class="comment">cuvânt</span> simplu.</p>';
    const { html, count } = convertNotation(doc, 'comment', 'inline-annotation');
    expect(count).toBe(1);
    expect(html).toBe('<p>Un cuvânt<span data-annotation="verifică" class="annotation">verifică</span> simplu.</p>');
  });

  it('converts inline footnotes to linked footnotes', () => {
    const doc = '<p>Un cuvânt<span data-footnote="nota" class="footnote"></span> aici.</p>';
    const { html, count } = convertNotation(doc, 'inline-footnote', 'linked-footnote');
    expect(count).toBe(1);
    expect(html).toBe('<p>Un <span data-linked-footnote="nota" class="linked-footnote">cuvânt</span> aici.</p>');
  });

  it('converts linked footnotes to inline footnotes', () => {
    const doc = '<p>Un <span data-linked-footnote="nota" class="linked-footnote">cuvânt</span> aici.</p>';
    const { html, count } = convertNotation(doc, 'linked-footnote', 'inline-footnote');
    expect(count).toBe(1);
    expect(html).toBe('<p>Un cuvânt<span data-footnote="nota" class="footnote"></span> aici.</p>');
  });

  it('falls back to the word after when the atom starts its block', () => {
    const doc = '<p><span data-footnote="nota" class="footnote"></span> Cuvânt rămâne.</p>';
    const { html, count } = convertNotation(doc, 'inline-footnote', 'linked-footnote');
    expect(count).toBe(1);
    // The space that separated the atom from the word stays where it was.
    expect(html).toBe('<p> <span data-linked-footnote="nota" class="linked-footnote">Cuvânt</span> rămâne.</p>');
  });

  it('leaves the html unchanged when no anchor word exists in the block', () => {
    const doc = '<p><span data-annotation="nume" class="annotation">nume</span></p>';
    const { html, count } = convertNotation(doc, 'inline-annotation', 'comment');
    expect(count).toBe(0);
    expect(html).toBe(doc);
  });

  it('does not anchor inside entities', () => {
    const doc = '<p>Tom &amp; <span data-footnote="nota" class="footnote"></span></p>';
    const { html, count } = convertNotation(doc, 'inline-footnote', 'linked-footnote');
    expect(count).toBe(0);
    expect(html).toBe(doc);
  });

  it('converts several notes and keeps the count', () => {
    const doc = '<p>Un <span data-annotation="a" class="annotation">a</span> doi <span data-annotation="b" class="annotation">b</span> trei.</p>';
    const { html, count } = convertNotation(doc, 'inline-annotation', 'comment');
    expect(count).toBe(2);
    expect(html).toContain('data-comment="a"');
    expect(html).toContain('data-comment="b"');
    expect(html).not.toContain('data-annotation');
  });

  it('rejects pairs the data model does not support', () => {
    expect(() => convertNotation('<p>x</p>', 'inline-annotation', 'inline-footnote')).toThrow(/Unsupported/);
    expect(() => convertNotation('<p>x</p>', 'comment', 'linked-footnote')).toThrow(/Unsupported/);
    expect(CONVERSIONS).toEqual([
      ['inline-annotation', 'comment'],
      ['comment', 'inline-annotation'],
      ['inline-footnote', 'linked-footnote'],
      ['linked-footnote', 'inline-footnote'],
    ]);
  });

  it('returns zero count and unchanged html when there is nothing to convert', () => {
    const plain = '<p>Nicio notație aici.</p>';
    for (const [from, to] of CONVERSIONS) {
      const { html, count } = convertNotation(plain, from, to);
      expect(count).toBe(0);
      expect(html).toBe(plain);
    }
  });
});
