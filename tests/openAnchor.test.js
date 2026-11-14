// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { openAnchorCounts, sumWords } from '../src/lib/openAnchor.js';

const mk = (id, title, extra = {}) => ({ id, title, type: 'text', includeInCompile: true, ...extra });
const words = (n) => `<p>${Array.from({ length: n }, (_, i) => `w${i}`).join(' ')}</p>`;

describe('openAnchorCounts — ancorarea istoricului la deschidere', () => {
  const manuscript = {
    id: 'ms', root: 'manuscript', title: 'Manuscris', type: 'folder',
    children: [mk('a', 'Cap 1'), mk('b', 'Cap 2'), mk('c', 'Notă', { includeInCompile: false })],
  };
  const trash = {
    id: 'trash', root: 'trash', title: 'Coș', type: 'folder',
    children: [mk('x', 'Șters')],
  };
  const docs = { a: words(500), b: words(300), c: words(50), x: words(99) };

  it('draft = manuscrisul cu includeInCompile; total = toate documentele, fără Coș', () => {
    const r = openAnchorCounts(manuscript, trash, docs);
    expect(r.draft).toBe(800);
    expect(r.total).toBe(850); // 500 + 300 + 50 (nota e în total, Coșul nu)
    expect(r.counts.a).toBe(500);
  });

  it('sumWords nu numără documentele scoase din compilare și nici copiii lor', () => {
    const skipped = { id: 's', title: 'S', type: 'folder', includeInCompile: false, children: [mk('s1', 'Sub')] };
    expect(sumWords(skipped, { s1: 10 })).toBe(0);
    expect(sumWords(manuscript, docs ? { a: 1, b: 2, c: 3 } : {})).toBe(3);
  });

  it('fără documente: zero peste tot, fără excepții', () => {
    const r = openAnchorCounts(manuscript, trash, {});
    expect(r.draft).toBe(0);
    expect(r.total).toBe(0);
  });
});
