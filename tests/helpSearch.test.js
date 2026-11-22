import { describe, it, expect } from 'vitest';
// Smart Help Search (PS-HELP-001 §4): nivelurile de căutare + intenția + contextul.
import { helpSearch, intentOf, relatedArticles } from '../src/lib/help/search.js';

const ART = (over = {}) => ({
  id: 'help.binder.reorder', title: 'Cum reordonezi documentele în Binder',
  summary: 'Trage documentul la locul dorit sau cu Ctrl+←/→.', category: 'organizare',
  contentType: 'procedure', difficulty: 'beginner', keywords: ['reordonez', 'mut', 'drag', 'binder'],
  synonyms: ['schimb ordinea', 'deplasez capitol'], searchTerms: ['cum mut un capitol', 'cum schimb ordinea documentelor'],
  commandIds: ['revealBinder'], uiComponentIds: ['binder'], ...over,
});
const BASE = [
  ART(),
  ART({ id: 'help.export.pdf', title: 'Export în PDF', keywords: ['export', 'pdf'], commandIds: ['exportFiles'], uiComponentIds: ['export'], searchTerms: ['cum export manuscrisul în pdf'] }),
  ART({ id: 'help.snapshot.restore', title: 'Revino la o versiune anterioară (snapshot)', keywords: ['snapshot', 'versiune', 'istoric'], searchTerms: ['cum revin la o versiune anterioara'], uiComponentIds: ['inspector'] }),
];

describe('helpSearch — nivelurile §4.3', () => {
  it('A. potrivire exactă: titlu, keyword, comandă', () => {
    expect(helpSearch('Export în PDF', BASE).results[0].id).toBe('help.export.pdf');
    expect(helpSearch('snapshot', BASE).results[0].id).toBe('help.snapshot.restore');
  });
  it('B. fuzzy: greșeli de tastare', () => {
    const r = helpSearch('export in PDDF', BASE).results;
    expect(r[0].id).toBe('help.export.pdf');
  });
  it('C. sinonime', () => {
    expect(helpSearch('deplasez capitol', BASE).results[0].id).toBe('help.binder.reorder');
  });
  it('D. limbaj natural', () => {
    expect(helpSearch('Cum mut un capitol?', BASE).results[0].id).toBe('help.binder.reorder');
    expect(helpSearch('cum revin la o versiune anterioara', BASE).results[0].id).toBe('help.snapshot.restore');
  });
  it('G. context-aware: boost fără excludere', () => {
    const plain = helpSearch('versiune', BASE).results.map((r) => r.id);
    const ctx = helpSearch('versiune', BASE, { context: 'inspector' }).results.map((r) => r.id);
    expect(ctx[0]).toBe('help.snapshot.restore');
    expect(plain).toEqual(ctx.sort(() => 0) || plain); // același set, altă ordine
    expect(new Set(ctx)).toEqual(new Set(plain));
  });
  it('interogarea vidă respectă contractul de obiect (fără crash la montare)', () => {
    const r = helpSearch('', BASE);
    expect(r).toEqual({ results: [], weak: false, intent: 'run' });
    expect(() => r.results.filter(Boolean)).not.toThrow();
  });
  it('E/§4.5 fără rezultate: semnal slab, fără inventare', () => {
    const r = helpSearch('kumquat quantum', BASE);
    expect(r.results).toHaveLength(0);
    expect(r.weak).toBe(true);
  });
  it('rezultatul poartă titlu/categorie/tip/dificultate/acțiune (§4.4)', () => {
    const r = helpSearch('cum mut un capitol', BASE).results[0];
    expect(r).toMatchObject({ category: 'organizare', contentType: 'procedure', difficulty: 'beginner' });
    expect(r.commandIds).toContain('revealBinder');
  });
});

describe('intentOf — learn vs run (§5.4)', () => {
  it('întrebări = learn', () => {
    expect(intentOf('Cum creez o carte nouă?')).toBe('learn');
    expect(intentOf('Ce face Inspectorul?')).toBe('learn');
  });
  it('nume de comandă = run', () => {
    expect(intentOf('export')).toBe('run');
    expect(intentOf('Show Inspector')).toBe('run');
  });
});

describe('relatedArticles (§4.3.I)', () => {
  it('leagă prin keywords și comenzi', () => {
    const rel = relatedArticles(ART({ keywords: ['export', 'binder'], commandIds: ['exportFiles'] }), BASE);
    expect(rel.map((a) => a.id)).toContain('help.export.pdf');
  });
  it('fără legături = listă goală', () => {
    expect(relatedArticles(ART({ keywords: ['zzz'], commandIds: [] }), BASE)).toEqual([]);
  });
});
