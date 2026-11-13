import { describe, it, expect } from 'vitest';
import { quickSearchProject, foldText } from '../src/lib/quickSearch.js';

// Cache-ul de text-plain: căutările repetitive nu trebuie să re-parseze HTML-ul
// documentelor neschimbate (root cause: 2358 parse-uri DOM per tastă pe cărți mari).
describe('quickSearchProject: cache de text-plain per document', () => {
  const mk = (id, title, html) => ({ id, title, synopsis: '', type: 'text' });
  const project = { tree: [mk('a', 'Alfa'), mk('b', 'Beta'), mk('c', 'Gama')] };
  let parses = 0;
  const countingHtmlToText = (html) => { parses += 1; return (html || '').replace(/<[^>]+>/g, ' '); };
  const docsA = { a: '<p>un text despre karma</p>', b: '<p>alt continut</p>', c: '<p>al treilea</p>' };

  it('prima căutare parsează fiecare document o singură dată', () => {
    parses = 0;
    quickSearchProject(project, docsA, { query: 'karma', htmlToText: countingHtmlToText });
    expect(parses).toBe(3);
  });

  it('a doua căutare (altă interogare, aceleași documente) nu re-parsează nimic', () => {
    parses = 0;
    quickSearchProject(project, docsA, { query: 'beta', htmlToText: countingHtmlToText });
    expect(parses).toBe(0);
  });

  it('doar documentul schimbat se re-parsează', () => {
    const docsB = { ...docsA, b: '<p>continut schimbat karma</p>' };
    parses = 0;
    const r = quickSearchProject(project, docsB, { query: 'karma', htmlToText: countingHtmlToText });
    expect(parses).toBe(1);
    expect(r.texts.some((t) => t.node.id === 'b')).toBe(true);
  });

  it('documentul nou-adăugat se parsează o singură dată, celelalte nu', () => {
    const docsB = { ...docsA, b: '<p>continut schimbat karma</p>' };
    quickSearchProject(project, docsB, { query: 'karma', htmlToText: countingHtmlToText });
    const docsC = { ...docsB, d: '<p>karma in document nou</p>' };
    const project2 = { tree: [...project.tree, mk('d', 'Delta')] };
    parses = 0;
    const r = quickSearchProject(project2, docsC, { query: 'karma', htmlToText: countingHtmlToText });
    expect(parses).toBe(1);
    expect(r.texts.some((t) => t.node.id === 'd')).toBe(true);
  });

  it('metadatele (titlu/sinopsis) se fold-ează o dată per versiune, nu per interogare', () => {
    let folds = 0;
    const countingFold = (s) => { folds += 1; return String(s || '').toLowerCase(); };
    const freshTree = [mk('a', 'Alfa'), mk('b', 'Beta'), mk('c', 'Gama')]; // arbore nou: cache-ul WeakMap nu e populat
    const freshProject = { tree: freshTree };
    quickSearchProject(freshProject, docsA, { query: 'karma', htmlToText: countingHtmlToText, foldText: countingFold });
    expect(folds).toBeGreaterThan(0); // injecția e folosită efectiv (roșu dacă criteria.foldText nu e citit)
    const afterFirst = folds;
    quickSearchProject(freshProject, docsA, { query: 'beta', htmlToText: countingHtmlToText, foldText: countingFold });
    // a doua interogare pe același arbore: 0 fold-uri noi pentru titluri/sinopse
    expect(folds).toBe(afterFirst);
  });

  it('contextul potrivit pe text cu diacritice: pozițiile din folded sunt valide în plain', () => {
    // foldText (NFD) schimbă lungimea string-ului; poziția din varianta foldată
    // nu trebuie să taie contextul din textul original (text românesc).
    const html = '<p>Șterse îmbrăcăminte ștearsă karmapunct și încă ceva după potrivire</p>';
    const p = { tree: [mk('r', 'Rând')] };
    const r = quickSearchProject(p, { r: html }, { query: 'karma', htmlToText: countingHtmlToText });
    expect(r.texts).toHaveLength(1);
    const t = r.texts[0];
    expect(t.match).toBe('karma');
    expect((t.before + t.match + t.after).replace(/…/g, '')).toContain('Șterse');
    expect(t.after).toContain('după');
  });
});
