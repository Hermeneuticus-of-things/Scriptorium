import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { ARTICLES } from '../src/lib/help/articles.js';
import { helpSearch } from '../src/lib/help/search.js';

// Integritatea bazei de articole (PS-HELP-001 REGULA ZERO): documentația descrie numai
// funcții reale. Fiecare commandId trebuie să existe în registrul de comenzi al aplicației
// (tuples ['grup','id',...] în src/App.jsx); fiecare articol are schema completă.

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const registered = new Set([...app.matchAll(/\['[a-z]+',\s*'([A-Za-z0-9]+)'/g)].map((m) => m[1]));

describe('baza de articole Help — integritate', () => {
  it('fiecare commandId există în registrul real de comenzi', () => {
    const dead = ARTICLES.flatMap((a) => (a.commandIds || []).filter((c) => !registered.has(c)).map((c) => `${a.id}: ${c}`));
    expect(dead, `comenzi inexistente: ${dead.join(', ')}`).toEqual([]);
  });
  it('schema obligatorie: id/titlu/sumar/categorie/tip/dificultate/status', () => {
    for (const a of ARTICLES) {
      expect(a.id, 'id').toMatch(/^help\.[a-z0-9.-]+$/);
      for (const f of ['title', 'summary', 'category', 'contentType', 'difficulty', 'status', 'lastVerified']) {
        expect(a[f], `${a.id}.${f}`).toBeTruthy();
      }
    }
  });
  it('ID-uri unice', () => {
    expect(new Set(ARTICLES.map((a) => a.id)).size).toBe(ARTICLES.length);
  });
  it('toate articolele se lasă găsite măcar de titlul lor', () => {
    for (const a of ARTICLES) {
      const r = helpSearch(a.title, ARTICLES).results;
      expect(r[0]?.id, `negăsit: ${a.id}`).toBe(a.id);
    }
  });
  it('întrebările naturale din searchTerms găsesc articolul', () => {
    for (const a of ARTICLES) {
      for (const q of a.searchTerms || []) {
        expect(helpSearch(q, ARTICLES).results[0]?.id, `«${q}» nu găsește ${a.id}`).toBe(a.id);
      }
    }
  });
});
