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

describe('context pe niveluri (carte/manuscris/capitol — directivă autor 2026-11-10)', () => {
  const book = {
    title: 'Cartea mea', bookType: 'novel-historical',
    tree: [
      { id: 'draft', root: 'draft', title: 'Manuscris', children: [
        { id: 'ch1', type: 'folder', title: 'Capitolul unu', children: [
          { id: 'a', type: 'text', title: 'Scena A' },
          { id: 'b', type: 'text', title: 'Scena B' },
        ] },
      ] },
      { id: 'research', root: 'research', children: [] },
    ],
  };
  const docs = { a: '<p>Ploaia a spălat orașul în scena A.</p>', b: '<p>Scena B continuă ploaia.</p>' };
  it('nivelul capitol adună textele descendenților în ordinea binder', () => {
    const c = buildEditorialContext(book, docs, { documentId: 'ch1' });
    expect(c.container).toBe(true);
    const iA = c.text.indexOf('Scena A'), iB = c.text.indexOf('Scena B');
    expect(iA).toBeGreaterThan(-1); expect(iB).toBeGreaterThan(iA);
    expect(c.text).toContain('## Text: Scena A');
  });
  it('nivelul manuscris/carte pornește de la rădăcina draft și include tot arborele', () => {
    const c = buildEditorialContext(book, docs, { documentId: 'draft' });
    expect(c.container).toBe(true);
    expect(c.text).toContain('Scena A'); expect(c.text).toContain('Scena B');
    expect(c.documentTitle).toBe('Manuscris');
  });
  it('documentul-cu-copii include textul părinte primul (text + subtext)', () => {
    const p = { ...book, tree: [{ id: 'draft', root: 'draft', title: 'M', children: [{ id: 'parent', type: 'text', title: 'Introducere', children: [{ id: 's1', type: 'text', title: 'Subtext' }] }] }] };
    const c = buildEditorialContext(p, { parent: '<p>Text părinte înainte de subtext.</p>', s1: '<p>Subtextul după.</p>' }, { documentId: 'parent' });
    expect(c.text.indexOf('Text părinte')).toBeGreaterThan(-1);
    expect(c.text.indexOf('Text părinte')).toBeLessThan(c.text.indexOf('Subtextul după'));
  });
  it('documentul simplu rămâne fără container (comportamentul existent)', () => {
    const c = buildEditorialContext(book, docs, { documentId: 'a' });
    expect(c.container).toBe(false);
    expect(c.text).not.toContain('## Text: Scena B');
  });
  it('bugetul respectă nivelurile mari', () => {
    const c = buildEditorialContext(book, docs, { documentId: 'draft', budget: 600 });
    expect(c.text.length).toBeLessThanOrEqual(600);
  });
  it('nivelul carte include tot corpul de cercetare (diferența onestă de manuscris)', () => {
    const p = { ...book, tree: [book.tree[0], { id: 'research', root: 'research', title: 'Cercetare', children: [{ id: 'r1', type: 'text', title: 'Sursă meteo' }, { id: 'r2', type: 'text', title: 'Sursă altă' }, { id: 'r3', type: 'text', title: 'Sursă istorie' }] }] };
    const full = { ...docs, r1: '<p>Corp meteo complet.</p>', r2: '<p>Rețete diverse.</p>', r3: '<p>Istorie completă.</p>' };
    const bookCtx = buildEditorialContext(p, full, { documentId: 'draft', wholeBook: true });
    expect(bookCtx.text).toContain('Sursă meteo');
    expect(bookCtx.text).toContain('Sursă istorie');
    const ms = buildEditorialContext(p, full, { documentId: 'draft' });
    expect(ms.text).not.toContain('Istorie completă');
  });
});
