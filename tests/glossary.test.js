import { describe, it, expect } from 'vitest';
import { buildAlogenGlossary, buildReadingGlossary, buildPrintToc, buildGlossaries } from '../src/lib/glossary.js';

const project = {
  title: 'Karma',
  tree: [
    { id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
      { id: 'c1', type: 'folder', title: 'Cap 1 Rădăcinile', children: [
        { id: 'd1', type: 'text', title: '1.1 Fapta' },
        { id: 'd2', type: 'text', title: '1.2 Depunerea' },
      ] },
      { id: 'c2', type: 'folder', title: 'Urmările', children: [{ id: 'd3', type: 'text', title: 'Lanțul' }, { id: 'dx', type: 'text', title: 'Exclus', includeInCompile: false }] },
    ] },
  ],
};
const html = {
  d1: "<p>Fapta lasă o urmă. Numim <strong><em>dispoziția de fond</em></strong> 'bhāva' tot ce rămâne după ea.</p><p>Cuvântul <em>saṃskāra</em> numește întipărirea. Apoi o <mark>întipărire</mark> devine obicei.</p>",
  d2: "<h2>Despre depunere</h2><p>Depunerea se adună în ***karmāśaya***. Termenul {{vāsanā}} apare rar, ca și extraordinarului.</p>",
  d3: '<p>Lanțul cauzal continuă prin <em>bhāva</em>.</p>',
};
const read = (id) => html[id] || '';

describe('Glosar_Alogeni_Indieni', () => {
  it('collects IAST, ALOGEN and italic terms with sense, definition and refs', async () => {
    const { docs } = await buildGlossaries(project, read);
    const g = buildAlogenGlossary(docs);
    const byTerm = Object.fromEntries(g.terms.map((t) => [t.term, t]));
    expect(byTerm['bhāva'].sense).toBe('dispoziția de fond');
    expect(byTerm['bhāva'].refs).toEqual(['1.1 Fapta', 'Lanțul']);
    expect(byTerm['bhāva'].definition).toMatch(/^Numim/);
    expect(byTerm['saṃskāra']).toBeTruthy();
    expect(g.html).toContain('<table>');
    expect(g.html).toContain('<h1>Glosar_Alogeni_Indieni</h1>');
    expect(g.terms.some((t) => t.refs.includes('Exclus'))).toBe(false);
  });
});

describe('Glosar_de_lectură', () => {
  it('includes marked and rare terms, no tables', async () => {
    const { docs, reading } = await buildGlossaries(project, read);
    const terms = reading.terms.map((t) => t.term);
    expect(terms).toContain('întipărire');
    expect(terms).toContain('vāsanā');
    expect(terms).toContain('extraordinarului');
    expect(terms).not.toContain('bhāva');
    expect(reading.html).not.toContain('<table');
    const none = buildReadingGlossary(docs, { rare: false });
    expect(none.terms.every((t) => t.source === 'marcat')).toBe(true);
  });
});

describe('Cuprins_de_tipar', () => {
  it('numbers sections from the binder, keeping canonical numbers', async () => {
    const { docs } = await buildGlossaries(project, read);
    const toc = buildPrintToc(project, { docs, includeHeadings: true });
    expect(toc.entries.map((e) => `${e.number} ${e.title}`)).toEqual(['1 Rădăcinile', '1.1 Fapta', '1.2 Depunerea', '1.2.1 Despre depunere', '2 Urmările', '2.1 Lanțul']);
    expect(toc.html).toContain('<h2>2. Urmările</h2>');
  });
});
