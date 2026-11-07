// P1 #30 — Print formats: fișe index (index cards) și schiță (outline) pentru Page Setup.
// Modulul pur lib/printFormats.cjs: tree + readDoc + opțiuni → HTML complet de printat.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pf = require('../lib/printFormats.cjs');

const project = {
  title: 'Carte & <Diplomă>',
  labels: [
    { name: 'Fără', color: '' },
    { name: 'Idee', color: '#e8b04a' },
  ],
  tree: [
    {
      id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
        {
          id: 'c1', type: 'folder', title: 'Plecarea', label: 'Idee', includeInCompile: true, children: [
            { id: 's1', type: 'text', title: 'Gara', synopsis: 'Era o dimineață de octombrie.', label: 'Idee', includeInCompile: true },
            { id: 's2', type: 'text', title: 'Trenul', synopsis: '', includeInCompile: true },
            { id: 'sx', type: 'text', title: 'Exclus', synopsis: 'nu', includeInCompile: false },
          ],
        },
        { id: 's3', type: 'text', title: 'Sosirea', synopsis: 'Ultima scenă.', includeInCompile: true },
        { id: 'm1', type: 'file', title: 'Schema', media: { file: 's.png', mime: 'image/png' }, synopsis: 'imagine' },
      ],
    },
    { id: 'research', root: 'research', type: 'folder', title: 'Cercetare', children: [{ id: 'r1', type: 'text', title: 'Notă research', synopsis: 'în afara Draft-ului' }] },
  ],
};
const docs = {
  s2: '<p>Primele cuvinte din tren. Încă ceva.</p>',
  s3: '<p>Ultima scenă are și text propriu.</p>',
};
const read = (id) => docs[id] || '';

describe('fișe index (index cards)', () => {
  it('adună documentele text din Draft în ordinea binder-ului; folderele se expandează, exclus/media sar', () => {
    const cards = pf.collectCards(project, read);
    expect(cards.map((c) => c.title)).toEqual(['Gara', 'Trenul', 'Sosirea']);
    expect(cards[0].body).toBe('Era o dimineață de octombrie.');
    // fără synopsis → începutul textului documentului (fallback)
    expect(cards[1].body).toContain('Primele cuvinte din tren');
    // culoarea etichetei
    expect(cards[0].color).toBe('#e8b04a');
    expect(cards[2].color).toBe('');
  });

  it('ids: folderul selectat se expandează la descendenți; documentul selectat dă o singură fișă', () => {
    expect(pf.collectCards(project, read, { ids: ['c1'] }).map((c) => c.title)).toEqual(['Gara', 'Trenul']);
    expect(pf.collectCards(project, read, { ids: ['s3', 's1'] }).map((c) => c.title)).toEqual(['Gara', 'Sosirea']);
    expect(pf.collectCards(project, read, { ids: [] }).length).toBe(3);
  });

  it('HTML complet cu grilă de 2 coloane, carduri de dimensiune fixă, cutting guides și etichete', () => {
    const html = pf.indexCardsHtml(project, read, { setup: { cardWidthCm: 10, cardHeightCm: 15 } });
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain('</html>');
    expect(html).toContain('grid-template-columns:repeat(2,1fr)');
    expect(html).toContain('height:15cm');
    expect(html).toContain('break-inside:avoid');
    expect(html).toContain('overflow:hidden'); // trunchierea corpului la ce încap
    expect(html).toContain('dashed'); // cutting guides
    expect((html.match(/class="card"/g) || []).length).toBe(3);
    expect(html).toContain('Era o dimineață de octombrie.');
    expect(html).toContain('border-top:4px solid #e8b04a');
    // titlul proiectului escapat
    expect(html).toContain('Carte &amp; &lt;Diplomă&gt;');
    expect(html).not.toContain('<Diplomă>');
  });

  it('cutLines: false → bordură continuă; înălțimea cardului vine din opțiuni', () => {
    const html = pf.indexCardsHtml(project, read, { setup: { cardHeightCm: 9 }, cutLines: false });
    expect(html).toContain('height:9cm');
    expect(html).not.toContain('dashed');
  });
});

describe('schiță (outline)', () => {
  it('rânduri ierarhice: adâncime pe structura binder, titlu, synopsis, număr de cuvinte', () => {
    const rows = pf.collectOutline(project, read);
    expect(rows.map((r) => [r.title, r.depth, r.kind])).toEqual([
      ['Plecarea', 0, 'folder'],
      ['Gara', 1, 'text'],
      ['Trenul', 1, 'text'],
      ['Sosirea', 0, 'text'],
    ]);
    // numărul de cuvinte al dosarului = suma descendenților; Gara are text gol → 0
    expect(rows[0].words).toBe(6);
    expect(rows[1].words).toBe(0);
    expect(rows[3].words).toBe(6);
  });

  it('ids: documentul păstrează strămoșii ca context; folderul selectat include tot subarborele', () => {
    expect(pf.collectOutline(project, read, { ids: ['s2'] }).map((r) => r.title)).toEqual(['Plecarea', 'Trenul']);
    expect(pf.collectOutline(project, read, { ids: ['c1'] }).map((r) => r.title)).toEqual(['Plecarea', 'Gara', 'Trenul']);
  });

  it('HTML complet: listă imbricată, titluri bold, synopsis dedesubt, cuvinte cu separator de mii', () => {
    const big = { ...project, tree: [{ id: 'draft', root: 'draft', type: 'folder', title: 'M', children: [{ id: 'long', type: 'text', title: 'Lung', synopsis: 'Sinopsisul lui Lung.', includeInCompile: true }] }] };
    const html = pf.outlineHtml(big, () => `<p>${'cuvânt '.repeat(1200)}</p>`);
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain('</html>');
    expect(html).toContain('font-weight:bold');
    expect(html).toContain('Sinopsisul lui Lung.');
    expect(html).toContain('1.200 cuvinte'); // separator de mii deterministic
    expect(html).toContain('padding-left'); // indentare pe nivel
    expect(html).toContain('Carte &amp; &lt;Diplomă&gt;');
  });

  it('counts: false → fără numere de cuvinte', () => {
    const html = pf.outlineHtml(project, read, { counts: false });
    expect(html).not.toContain('cuvinte');
  });
});

describe('formatHtml (dispatch după pageSetup.format)', () => {
  it('manuscris / format necunoscut → null (pipeline-ul vechi rămâne)', () => {
    expect(pf.formatHtml({ format: 'manuscript' }, project, read, {})).toBe(null);
    expect(pf.formatHtml({}, project, read, {})).toBe(null);
    expect(pf.formatHtml({ format: ' carte' }, project, read, {})).toBe(null);
  });

  it('fișe index / outline → document complet, cu titlul proiectului escapat', () => {
    const cards = pf.formatHtml({ format: 'indexCards', cardHeightCm: 12 }, project, read, { ids: ['s1'] });
    expect(cards).toContain('data-format="index-cards"');
    expect(cards).toContain('height:12cm');
    expect((cards.match(/class="card"/g) || []).length).toBe(1);
    const outline = pf.formatHtml({ format: 'outline' }, project, read, {});
    expect(outline).toContain('data-format="outline"');
    expect(outline).toContain('Plecarea');
  });

  it('ids se propagă din opțiuni în ambele formate', () => {
    const cards = pf.formatHtml({ format: 'indexCards' }, project, read, { ids: ['s3'] });
    expect((cards.match(/class="card"/g) || []).length).toBe(1);
    expect(cards).toContain('Sosirea');
    const outline = pf.formatHtml({ format: 'outline' }, project, read, { ids: ['s1'] });
    expect(outline).toContain('Plecarea');
    expect(outline).toContain('Gara');
    expect(outline).not.toContain('Sosirea');
  });
});
