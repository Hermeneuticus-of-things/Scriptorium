import { describe, it, expect } from 'vitest';
import { TEMPLATES } from '../lib/templates.cjs';
import { validateThesis, numberingOf, annexNumbering, tocFromStructure } from '../lib/thesisStructure.cjs';
import { buildTocText } from '../src/lib/toc.js';

// Șablonul „Teză academică" (directivă autor 2026-11-10, ca în Scrivener 3).
const draft = () => TEMPLATES.thesis.draft;
const research = () => TEMPLATES.thesis.research;

describe('șablonul Teză academică — structura exactă din specificație', () => {
  it('Body: Introducere, Partea I → lanțul complet de 4 niveluri, Partea II, Concluzii', () => {
    const titles = draft().map((n) => n.title);
    expect(titles).toEqual(['Introducere', 'Partea I', 'Partea II', 'Concluzii']);
    const partI = draft()[1];
    expect(partI.children[0].title).toBe('Capitolul 1');
    const cap = partI.children[0];
    const sub = cap.children.find((c) => c.title === 'Subcapitolul 1.1');
    const sec = sub.children[0];
    expect(sec.title).toBe('Secțiunea 1.1.1');
    const ssec = sec.children[0];
    expect(ssec.title).toBe('Subsecțiunea 1.1.1.1');
    // Mai adânc de 4 niveluri = conținut (paragraf), nu folder.
    expect(ssec.children[0].type).not.toBe('folder');
    expect(ssec.children[0].title).toContain('Paragraf');
  });
  it('FrontMatter: copertă, declarație, rezumat, cuprins generat, cele trei liste', () => {
    const fm = research().find((n) => n.title === 'FrontMatter');
    expect(fm.children.map((c) => c.title)).toEqual([
      'Copertă / Pagină de titlu', 'Declarație de originalitate', 'Rezumat / Abstract + cuvinte-cheie',
      'Cuprins (generat din arbore)', 'Lista abrevierilor', 'Lista figurilor', 'Lista tabelelor',
    ]);
  });
  it('BackMatter: Bibliografie, Anexe cu numerotare separată, Glosar, Index', () => {
    const bm = research().find((n) => n.title === 'BackMatter');
    expect(bm.children.map((c) => c.title)).toEqual(['Anexe', 'Bibliografie / Referințe', 'Glosar', 'Index']);
    expect(bm.children[0].children.map((c) => c.title)).toEqual(['Anexa 1', 'Anexa 2']);
  });
  it('paginile NU sunt noduri ale arborelui (se generează la layout)', () => {
    expect(research().some((n) => /^Pagina$/i.test(n.title))).toBe(false);
    expect(draft().some((n) => /^Pagina$/i.test(n.title))).toBe(false);
  });
});

describe('numerotarea derivată din poziție', () => {
  const specTree = [
    { id: 'body', type: 'folder', title: 'Body', children: [
      { id: 'p1', type: 'folder', title: 'Partea I', children: [
        { id: 'c1', type: 'folder', title: 'Capitolul 1', children: [
          { id: 's11', type: 'folder', title: 'Subcapitolul 1.1', children: [
            { id: 's111', type: 'folder', title: 'Secțiunea 1.1.1', children: [
              { id: 's1111', type: 'folder', title: 'Subsecțiunea 1.1.1.1', children: [{ id: 'par', type: 'text', title: 'Paragraf' }] },
            ] },
          ] },
        ] },
      ] },
      { id: 'p2', type: 'folder', title: 'Partea II', children: [
        { id: 'c2', type: 'folder', title: 'Capitolul 2', children: [] },
      ] },
    ] },
  ];
  it('Partea I/II (roman), Capitolul 1→2, Subcapitolul 1.1, Secțiunea 1.1.1, Subsecțiunea 1.1.1.1', () => {
    const labels = new Map(numberingOf(specTree).map((x) => [x.id, x.label]));
    expect(labels.get('p1')).toBe('Partea I');
    expect(labels.get('c1')).toBe('Capitolul 1');
    expect(labels.get('s11')).toBe('Subcapitolul 1.1');
    expect(labels.get('s111')).toBe('Secțiunea 1.1.1');
    expect(labels.get('s1111')).toBe('Subsecțiunea 1.1.1.1');
    expect(labels.get('p2')).toBe('Partea II');
    expect(labels.get('c2')).toBe('Capitolul 2');
    expect(labels.get('par')).toBe('');
  });
  it('Partea opțională: fără părți, capitolele merg direct sub Body (ordinea relativă se păstrează)', () => {
    const noParts = [{ id: 'body', type: 'folder', title: 'Body', children: [
      { id: 'c1', type: 'folder', title: 'Capitolul 1', children: [] },
      { id: 'c2', type: 'folder', title: 'Capitolul 2', children: [] },
    ] }];
    const labels = new Map(numberingOf(noParts).map((x) => [x.id, x.label]));
    expect(labels.get('c1')).toBe('Capitolul 1');
    expect(labels.get('c2')).toBe('Capitolul 2');
  });
  it('Anexele au numerotare separată (Anexa 1, Anexa 2)', () => {
    const tree = [{ id: 'back', type: 'folder', title: 'BackMatter', children: [
      { id: 'anexe', type: 'folder', title: 'Anexe', children: [{ id: 'a1', type: 'text', title: 'Anexa 1' }, { id: 'a2', type: 'text', title: 'Anexa 2' }] },
    ] }];
    expect(annexNumbering(tree).map((x) => x.label)).toEqual(['Anexa 1', 'Anexa 2']);
  });
});

describe('validarea structurală (regulile din specificație)', () => {
  it('șablonul validate: fără cicluri, fără titluri goale, fără numerotare duplicată', () => {
    expect(validateThesis([{ id: 'body', type: 'folder', title: 'Body', children: draft() }])).toEqual([]);
    expect(validateThesis([{ id: 'research', type: 'folder', title: 'Cercetare', children: research() }])).toEqual([]);
  });
  it('titluri goale + noduri duplicate (parinte invalid/ciclu) + numerotare duplicată', () => {
    const bad = [{ id: 'b', type: 'folder', title: 'Body', children: [
      { id: 'c1', type: 'folder', title: '', children: [] },
      { id: 'c2', type: 'folder', title: 'Capitolul 1', children: [
        { id: 'dup', type: 'folder', title: 'Duplicat', children: [] },
        { id: 'dup', type: 'folder', title: 'Duplicat', children: [] },
      ] },
    ] }];
    const issues = validateThesis(bad);
    expect(issues.some((x) => x.includes('Titlu gol'))).toBe(true);
    expect(issues.some((x) => x.includes('Nod duplicat'))).toBe(true);
    // Numerotarea derivată din poziție nu poate fi duplicată prin construcție (regulă satisfăcută
    // prin design): etichetele derivate sunt unice în arbore.
    const labels = numberingOf(bad).map((x) => x.label).filter(Boolean);
    expect(new Set(labels).size).toBe(labels.length);
  });
  it('adâncime peste 4 niveluri structurale → avertisment', () => {
    const deep = [{ id: 'b', type: 'folder', title: 'Body', children: [
      { id: 'l1', type: 'folder', title: 'Capitolul 1', children: [
        { id: 'l2', type: 'folder', title: 'Subcapitolul 1.1', children: [
          { id: 'l3', type: 'folder', title: 'Secțiunea 1.1.1', children: [
            { id: 'l4', type: 'folder', title: 'Subsecțiunea 1.1.1.1', children: [
              { id: 'l5', type: 'folder', title: 'Subsecțiunea 1.1.1.1.1', children: [] },
            ] },
          ] },
        ] },
      ] },
    ] }];
    expect(validateThesis(deep).some((x) => x.includes('Adâncime'))).toBe(true);
  });
  it('referințele trebuie rezolvabile către noduri existente', () => {
    const tree = [{ id: 'b', type: 'folder', title: 'Body', children: [
      { id: 'c', type: 'text', title: 'Vezi [[Bibliografie / Referințe]] și [[Lipsă]]' },
    ] }];
    const issues = validateThesis([{ id: 'bm', type: 'folder', title: 'BackMatter', children: [{ id: 'bib', type: 'text', title: 'Bibliografie / Referințe' }, ...tree[0].children] }]);
    expect(issues.some((x) => x.includes('[[Lipsă]]'))).toBe(true);
    expect(issues.some((x) => x.includes(': [[Lipsă]]'))).toBe(true);
  });
});

describe('cuprinsul se generează din arbore (nu manual)', () => {
  it('ToC pe șablonul de teză produce liniile cu numerotarea derivată', () => {
    const tree = [{ id: 'body', type: 'folder', title: 'Body', children: draft() }];
    console.log('DEBUG draft len:', draft().length, '| tree children:', tree[0].children.length, '| unwrap:', require === undefined ? 'esm' : 'cjs', JSON.stringify(tocFromStructure(tree).map(x=>x.label)));
    const toc = tocFromStructure(tree);
    expect(toc.map((x) => x.label)).toContain('Partea I');
    expect(toc.map((x) => x.label)).toContain('Subsecțiunea 1.1.1.1');
    const text = buildTocText([{ id: 'n', type: 'folder', title: 'Manuscris', children: [{ id: 'p1', type: 'folder', title: 'Partea I', includeInCompile: true, children: [{ id: 'c1', type: 'text', title: 'Capitolul 1', includeInCompile: true }] }] }], { ids: ['p1', 'c1'] });
    expect(text).toContain('Partea I');
    expect(text).toContain('Capitolul 1');
  });
});
