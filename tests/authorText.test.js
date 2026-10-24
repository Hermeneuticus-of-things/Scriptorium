import { describe, it, expect } from 'vitest';
import { authorGate, authorParagraphs, diffParagraphs, hashParagraphs, hashText, journalRows, NEIGHBOUR_NOTE, splitIssues, updateAuthorHashes } from '../src/lib/authorText.js';
import { htmlToParagraphs } from '../src/lib/editorial.js';

const doc = (...ps) => ps.map((p) => `<p>${p}</p>`).join('');
const hashesOf = (html, ...lines) => hashParagraphs(html).filter((p) => lines.includes(p.line)).map((p) => p.hash);

describe('I-EDIT author text: hashing and diff', () => {
  it('stable hash of normalized text', () => {
    expect(hashText('Ana  are\nmere ')).toBe(hashText('Ana are mere'));
    expect(hashText('Ana are mere')).not.toBe(hashText('Ana are pere'));
    const [a] = hashParagraphs('<p>Un <em>cuvânt</em> ales.</p>');
    const [b] = hashParagraphs('<p>Un cuvânt ales.</p>');
    expect(a.hash).not.toBe(b.hash); // emphasis is part of the author's text
    expect(hashParagraphs('<p><span data-comment="x" class="comment">Același</span> text.</p>')[0].hash).toBe(hashParagraphs('<p>Același text.</p>')[0].hash);
  });

  it('diffParagraphs: changed, inserted and deleted chunks with lines', () => {
    const before = doc('Unu.', 'Doi.', 'Trei.', 'Patru.');
    const after = doc('Unu.', 'Doi schimbat.', 'Trei.', 'Nou.', 'Patru.');
    const ch = diffParagraphs(before, after);
    expect(ch.map((c) => [c.line, c.old, c.new])).toEqual([[2, 'Doi.', 'Doi schimbat.'], [4, '', 'Nou.']]);
    expect(ch[0].hashOld).toBe(hashText('Doi.'));
    expect(ch[0].hashNew).toBe(hashText('Doi schimbat.'));
    expect(diffParagraphs(before, doc('Unu.', 'Trei.', 'Patru.')).map((c) => [c.line, c.old, c.new])).toEqual([[2, 'Doi.', '']]);
    expect(diffParagraphs(before, before)).toEqual([]);
    expect(diffParagraphs(before, before + '<p></p>')).toEqual([]); // an empty paragraph is no change
  });

  it('journalRows: one row per chunk with the VKB2 fields', () => {
    const rows = journalRows('d1', 'Scena', diffParagraphs(doc('A.'), doc('B.')), 'T');
    expect(rows).toEqual([{ doc: 'd1', title: 'Scena', line: 1, old: 'A.', new: 'B.', time: 'T', hashOld: hashText('A.'), hashNew: hashText('B.') }]);
  });
});

describe('HARD gate fraza_autor_atinsa', () => {
  const before = doc('Primul.', 'Al doilea, scris de autor.', 'Al treilea.', 'Al patrulea, tot al autorului.');
  const H = hashesOf(before, 2, 4);

  it('ok when author paragraphs stay unchanged and in order (others may change)', () => {
    const after = doc('Primul, reparat.', 'Al doilea, scris de autor.', 'Nou.', 'Al patrulea, tot al autorului.');
    expect(authorGate(before, after, H)).toEqual({ ok: true, violations: [] });
    expect(authorGate(before, doc('x'), [])).toEqual({ ok: true, violations: [] });
  });

  it('changed', () => {
    const r = authorGate(before, doc('Primul.', 'Al doilea, rescris de model.', 'Al treilea.', 'Al patrulea, tot al autorului.'), H);
    expect(r.ok).toBe(false);
    expect(r.violations).toEqual([{ line: 2, text: 'Al doilea, scris de autor.', kind: 'changed' }]);
  });

  it('moved', () => {
    const r = authorGate(before, doc('Primul.', 'Al patrulea, tot al autorului.', 'Al treilea.', 'Al doilea, scris de autor.'), H);
    expect(r.ok).toBe(false);
    expect(r.violations.map((v) => v.kind)).toContain('moved');
  });

  it('deleted', () => {
    const r = authorGate(before, doc('Primul.', 'Al treilea.', 'Al patrulea, tot al autorului.'), H);
    expect(r.violations).toEqual([{ line: 2, text: 'Al doilea, scris de autor.', kind: 'deleted' }]);
  });
});

describe('splitIssues and author hash upkeep', () => {
  const html = doc('Unu.', 'Doi al autorului.', 'Trei.', 'Patru.', 'Cinci.');
  const H = hashesOf(html, 2);
  it('author paragraph -> COADA_AUTOR, neighbours -> writer with note, rest -> writer', () => {
    const issues = [0, 1, 2, 3, 4].map((p) => ({ id: `i${p}`, paragraph: p, severity: 'GRAVE' }));
    const r = splitIssues(issues, htmlToParagraphs(html), H);
    expect(r.toAuthor.map((i) => i.id)).toEqual(['i1']);
    expect(r.neighbours.map((i) => [i.id, i.note])).toEqual([['i0', NEIGHBOUR_NOTE], ['i2', NEIGHBOUR_NOTE]]);
    expect(r.toWriter.map((i) => i.id)).toEqual(['i3', 'i4']);
    expect(splitIssues(issues, html, []).toWriter).toHaveLength(5);
  });

  it('authorParagraphs gives line and text', () => {
    expect(authorParagraphs(html, H)).toEqual([{ line: 2, text: 'Doi al autorului.' }]);
  });

  it('updateAuthorHashes prunes vanished hashes, dedupes and caps', () => {
    const next = updateAuthorHashes([...H, 'gone', ...H], html, hashesOf(html, 4));
    expect(next).toEqual([...H, ...hashesOf(html, 4)]);
    const capped = updateAuthorHashes(hashesOf(html, 1, 2, 3), html, [], 2);
    expect(capped).toEqual(hashesOf(html, 2, 3));
  });
});
