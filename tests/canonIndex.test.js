import { describe, it, expect } from 'vitest';
import { parseCanonIndex, validateCanonIndex, createNode, serializeCanonIndex, canonContext, nodeIdFromTitle, findCanonDoc } from '../src/lib/canonIndex.js';
import { roundContext, lint, applyLists, KARMA_PROFILE, profileFor, systemPrompt } from '../src/lib/editorial.js';

const TEXT = `# Index_de_Lucru
| Nod | Titlu | Tip | Greutate | Dependențe |
|---|---|---|---|---|
| 1 | Karma | capitol | 8 | |
| 1.1 | Fapta | definiție | 6 | |
| 1.1.1 | Fapta și urma | mecanism | 7 | 1.1 |
2 | Depunerea | capitol | 5 | dep: 1.1
2.1 | Lanțul | mecanism | 9 | 2.2, 9.9
2.2 | Ruptura | mecanism | 4 | 2.1`;

describe('canonIndex', () => {
  it('parses table rows and pipe lines', () => {
    const { nodes, errors } = parseCanonIndex(TEXT);
    expect(errors).toEqual([]);
    expect(nodes.map((n) => n.id)).toEqual(['1', '1.1', '1.1.1', '2', '2.1', '2.2']);
    expect(nodes[2]).toMatchObject({ title: 'Fapta și urma', type: 'mecanism', weight: 7, deps: ['1.1'], level: 3 });
    expect(nodes[3].deps).toEqual(['1.1']);
  });
  it('parses HTML tables from the binder', () => {
    const html = serializeCanonIndex(parseCanonIndex(TEXT).nodes, { html: true });
    expect(parseCanonIndex(`<h1>Index</h1>${html}`).nodes).toHaveLength(6);
  });
  it('validates missing deps and cycles', () => {
    const v = validateCanonIndex(parseCanonIndex(TEXT).nodes);
    expect(v.some((p) => /9\.9.*lipsește/.test(p.message))).toBe(true);
    expect(v.some((p) => /circulară/.test(p.message))).toBe(true);
  });
  it('creates nodes with the next free number', () => {
    const { nodes } = parseCanonIndex(TEXT);
    const n = createNode(nodes, { parent: '1.1', title: 'Nou' });
    expect(n.find((x) => x.title === 'Nou').id).toBe('1.1.2');
    expect(createNode(nodes, { title: 'Cap nou' }).find((x) => x.title === 'Cap nou').id).toBe('3');
    expect(() => createNode(nodes, { id: '1.1' })).toThrow();
  });
  it('maps titles to node ids and finds the doc', () => {
    expect(nodeIdFromTitle('Sub 2.3')).toBe('2.3');
    expect(nodeIdFromTitle('3/Cap 2/Sub 2.1')).toBe('2.1');
    expect(nodeIdFromTitle('1.1.1 Fapta')).toBe('1.1.1');
    expect(nodeIdFromTitle('Cap 4')).toBe('4');
    expect(findCanonDoc([{ id: 'r', children: [{ id: 'x', title: 'Index de Lucru' }] }]).id).toBe('x');
  });
  it('feeds rounds R1 and R6', () => {
    const { nodes } = parseCanonIndex(TEXT);
    const r1 = canonContext(nodes, '1.1', 'R1');
    expect(r1).toContain('1.1.1 Fapta și urma');
    const r6 = canonContext(nodes, '2.1', 'R6');
    expect(r6).toContain('2.2 Ruptura');
    expect(r6).not.toContain('2.1 Lanțul');
    expect(roundContext({ id: 'R1' }, { canonNodes: nodes, title: '1.1 Fapta', chapterContext: 'CTX' })).toMatch(/<index_de_lucru>[\s\S]*CTX$/);
    expect(roundContext({ id: 'R4' }, { canonNodes: nodes, title: '1.1 Fapta', chapterContext: 'CTX' })).toBe('');
    const issues = lint('<p>Text.</p>', { canon: { nodes }, title: '7.7 Altceva' });
    expect(issues.some((i) => i.rule === 'canonMissing')).toBe(true);
  });
});

describe('editorial word lists', () => {
  it('flags forbidden/preferred, disables built-ins, per profile', () => {
    const lists = { karma: { forbidden: [{ word: 'gest', replacement: 'faptă' }], preferred: [{ word: 'rânduiala lumii', replacement: 'ordinea cosmică' }], builtins: { bannedTransitions: false }, disabledWords: ['desigur'] } };
    const p = applyLists(KARMA_PROFILE, lists);
    const r = lint('<p>Un gest în ordinea cosmică. Astfel, desigur, merge.</p>', { profile: p });
    expect(r.find((i) => i.rule === 'forbidden').suggestion).toBe('faptă');
    expect(r.find((i) => i.rule === 'preferred').suggestion).toBe('rânduiala lumii');
    expect(r.some((i) => i.rule === 'transition' || /desigur/.test(i.message))).toBe(false);
    expect(profileFor({ editorialProfile: { base: 'generic' } }, { editorialLists: lists }).forbidden).toBeUndefined();
    expect(systemPrompt(p)).toContain('„gest” → „faptă”');
  });
});
