import { describe, it, expect } from 'vitest';
import { buildTocText, evalPagePlaceholders } from '../src/lib/toc.js';

// Binder like the parity examples (Scrivener §22.1–22.2): a Draft with chapters and scenes.
const TREE = [
  { id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
    { id: 'c1', type: 'folder', title: 'Plecarea', children: [
      { id: 's1', type: 'text', title: 'Gara' },
      { id: 's2', type: 'text', title: 'Trenul' },
    ] },
    { id: 'c2', type: 'folder', title: 'Sosirea', children: [
      { id: 's3', type: 'text', title: '' },
    ] },
    { id: 'm1', type: 'file', title: 'Copertă', media: { file: 'a.png', mime: 'image/png' } },
  ] },
  { id: 'research', root: 'research', type: 'folder', title: 'Cercetare', children: [] },
  { id: 'trash', root: 'trash', type: 'folder', title: 'Coș', children: [
    { id: 't1', type: 'text', title: 'Aruncat' },
  ] },
];

describe('buildTocText — „Copy Documents as ToC" (P1 #28)', () => {
  it('a selected folder copies its whole subtree, the folder first at depth 0', () => {
    const out = buildTocText(TREE, { ids: ['c1'] });
    expect(out).toBe('Plecarea\n\tGara\t<$p>\n\tTrenul\t<$p>');
  });

  it('a selected text document copies itself alone', () => {
    expect(buildTocText(TREE, { ids: ['s2'] })).toBe('Trenul\t<$p>');
  });

  it('folders have no page placeholder; empty titles become —', () => {
    const out = buildTocText(TREE, { ids: ['c2'] });
    expect(out).toBe('Sosirea\n\t—\t<$p>');
  });

  it('multiple selected nodes keep the given order, each as its own root', () => {
    const out = buildTocText(TREE, { ids: ['s1', 'c2'] });
    expect(out).toBe('Gara\t<$p>\nSosirea\n\t—\t<$p>');
  });

  it('skips trash-rooted nodes, media attachments and unknown ids', () => {
    expect(buildTocText(TREE, { ids: ['t1'] })).toBe('');
    expect(buildTocText(TREE, { ids: ['m1'] })).toBe('');
    expect(buildTocText(TREE, { ids: ['nope'] })).toBe('');
  });

  it('pagePlaceholder=false leaves the titles bare', () => {
    expect(buildTocText(TREE, { ids: ['c1'], pagePlaceholder: false })).toBe('Plecarea\n\tGara\n\tTrenul');
  });

  it('no selection → empty text', () => {
    expect(buildTocText(TREE, { ids: [] })).toBe('');
    expect(buildTocText(TREE, {})).toBe('');
  });
});

describe('evalPagePlaceholders — the <$p> page field in titles', () => {
  it('replaces a bare <$p>', () => {
    expect(evalPagePlaceholders('Capitolul 1\t<$p>', 7)).toBe('Capitolul 1\t7');
  });

  it('replaces every occurrence, with prefixes and suffixes around it', () => {
    expect(evalPagePlaceholders('<$p>–<$p>', 12)).toBe('12–12');
    expect(evalPagePlaceholders('Pagina <$p> din <$pagecount>', 3)).toBe('Pagina 3 din <$pagecount>'); // only <$p>
  });

  it('keeps the text without placeholders unchanged and handles non-strings', () => {
    expect(evalPagePlaceholders('Fără placeholder', 4)).toBe('Fără placeholder');
    expect(evalPagePlaceholders('', 4)).toBe('');
    expect(evalPagePlaceholders(null, 4)).toBe(null);
  });

  it('<$p:fmt> resolves only through fmtFn; unknown formats stay as typed', () => {
    expect(evalPagePlaceholders('Capitol <$p:R>', 3)).toBe('Capitol <$p:R>');
    const roman = (n, fmt) => (fmt === 'R' ? toRomanLike(n) : null);
    function toRomanLike(n) { return ['I', 'II', 'III', 'IV'][n - 1] || String(n); }
    expect(evalPagePlaceholders('Capitol <$p:R>', 3, roman)).toBe('Capitol III');
    expect(evalPagePlaceholders('Capitol <$p:x>', 3, roman)).toBe('Capitol <$p:x>'); // fmtFn returns null
    expect(evalPagePlaceholders('Ambele <$p> și <$p:R>', 2, roman)).toBe('Ambele 2 și II');
  });
});
