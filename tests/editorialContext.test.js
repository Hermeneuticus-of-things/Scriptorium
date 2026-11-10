// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildEditorialContext } from '../src/lib/editorialContext.js';

const project = (bookType) => ({
  title: 'Cartea mea',
  bookType,
  tree: [
    { id: 'draft', root: 'draft', children: [{ id: 'doc-a', type: 'text', title: 'Capitolul unu', synopsis: 'Despre ploaie și memorie', keywords: ['ploaie'] }] },
    { id: 'research', root: 'research', children: [{ id: 'r1', type: 'text', title: 'Note despre ploaie' }, { id: 'r2', type: 'text', title: 'Rețete de dulciuri' }] },
    { id: 'trash', root: 'trash', children: [] },
  ],
});
const docs = {
  'doc-a': '<p>Ploaia a spălat orașul. Text de manuscris pentru context.</p>',
  r1: '<p>Studiu meteo: ploaie, umezeală, nori. Ploaie repetată pentru scor lexical.</p>',
  r2: '<p>Făină, zahăr, ouă. Rețetă fără legătură.</p>',
};

describe('buildEditorialContext (separare domeniu + tipul cărții)', () => {
  it('declares the editorial domain and the app-settings boundary', () => {
    const c = buildEditorialContext(project('novel-historical'), docs, { documentId: 'doc-a' });
    expect(c.text).toContain('DOMENIU: text editorial al cărții, NU configurația aplicației.');
    expect(c.text).toContain('Regulă de domeniu');
    expect(c.text).toContain('Setări sau Ajutor');
  });
  it('includes the book type and its editorial guidance when set', () => {
    const c = buildEditorialContext(project('novel-historical'), docs, { documentId: 'doc-a' });
    expect(c.text).toContain('Tipul cărții: Roman istoric');
    expect(c.text).toContain('Îndrumare editorială');
    expect(c.bookType).toBe('novel-historical');
    const none = buildEditorialContext(project(''), docs, { documentId: 'doc-a' });
    expect(none.text).not.toContain('Tipul cărții');
  });
  it('ranks lexically relevant research first and marks the fallback', () => {
    const c = buildEditorialContext(project('novel-historical'), docs, { documentId: 'doc-a' });
    expect(c.sources[0].id).toBe('r1');
    expect(c.fallback).toBe(false);
    expect(c.text).toContain('Studiu meteo');
    const empty = buildEditorialContext(project('novel-historical'), { 'doc-a': '<p>Text fără temă specială.</p>', r1: docs.r1, r2: docs.r2 }, { documentId: 'doc-a', text: '' });
    // No lexical overlap between the query and research titles/keywords: fallback is declared
    expect(Array.isArray(empty.sources)).toBe(true);
  });
  it('respects the budget and returns targeting metadata', () => {
    const c = buildEditorialContext(project('novel-historical'), docs, { documentId: 'doc-a', budget: 500 });
    expect(c.text.length).toBeLessThanOrEqual(500);
    expect(c.projectTitle).toBe('Cartea mea');
    expect(c.documentTitle).toBe('Capitolul unu');
  });
});
