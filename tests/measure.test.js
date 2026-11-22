import { describe, it, expect } from 'vitest';
// Calibrarea modulelor de măsură (port din write-for-me/scripts/verifica.py + ritm.py):
// fraza proastă TREBUIE prinsă, cea bună NU. Semnale, nu verdicte.
import { analiza } from '../src/lib/measure/ritm.js';
import { verifica, curata, fraze } from '../src/lib/measure/verifica.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const aiRules = require('../lib/aiRules.cjs');
const engine = require('../lib/writingEngine.cjs');

// (modul, text, trebuie prins) — din PROBE din verifica.py
const PROBE = [
  ['calcuri', 'În cazul în care întârzii, pierdem.', true],
  ['calcuri', 'Dacă întârzii, pierdem.', false],
  ['calcuri', 'Asta face sens.', true],
  ['calcuri', 'Asta are sens.', false],
  ['calcuri', 'În cele ce urmează trecem prin pași.', true],
  ['turnuri', 'Inima celui care îl făcea s-a oprit.', true],
  ['turnuri', 'Inima omului care îl făcea s-a oprit.', false],
  ['turnuri', 'Odată ce s-a închis intrarea, nu mai putea ieși.', true],
  ['turnuri', 'După ce s-a închis intrarea, nu mai putea ieși.', false],
  ['turnuri', 'Schimbă felul în care omul vede lumea.', true],
  ['turnuri', 'Transformă tot în felul în care simțim.', false], // nominal, după prepoziție
  ['respiratie', 'Omul care a venit, care știa că poate, care spunea că trebuie, a plecat fiindcă nu mai avea timp deși voia să rămână până când se făcea dimineață aici.', true],
  ['respiratie', 'A venit târziu și a plecat devreme, iar noaptea a rămas în urma lui ca o întrebare pe care nimeni nu o mai pusese cu glas tare în casa aceea veche.', false],
  ['calcuri', 'În concluzie, a investi înseamnă viitor.', true],
  ['calcuri', 'Am investit și am câștigat.', false],
  ['calcuri', 'Nu este doar un avantaj, ci o necesitate.', true],
  ['calcuri', 'Nu este scump, dar nici ieftin nu e.', false],
  ['pasiv', 'Verificarea documentelor este realizată de către personal.', true],
  ['pasiv', 'Personalul verifică documentele.', false],
  ['pasiv', 'Era obosit și a plecat.', false],
  ['pasiv', '- **Claritate:** mesajul trebuie să fie simplu.', true],
  ['pasiv', '- claritate: mesajul trebuie să fie simplu.', false],
  ['lexic', 'Acest aspect al problemei ține de un alt nivel.', true],
  ['lexic', 'Prețul urcă, iar clienții pleacă.', false],
  ['lexic', 'De aici vine nevoia de calm.', true],
  ['lexic', 'Calmul vine din somn.', false],
  ['lexic', 'Cu cât mergi mai departe, cu atât vezi mai mult.', true],
  ['lexic', 'Mergi departe și vezi mult.', false],
  ['lexic', 'Omul care a venit, care știa și care tăcea, plecă fără să spună nimic nimănui acolo.', true],
  ['lexic', 'Omul care a venit a plecat.', false],
  ['repetitie', 'Mintea hotărăște repede. Mintea alege apoi.', true],
  ['repetitie', 'Saṃsāra nu se oprește. Saṃsāra continuă.', false],
  ['repetitie', 'El a cunoscut pe Mahavira. Apoi Mahavira a plecat.', false],
  ['repetitie', 'Mintea hotărăște repede. Gândul alege apoi.', false],
];

describe('measure/verifica — calibrare (port din verifica.py)', () => {
  for (const [mod, txt, trebuie] of PROBE) {
    it(`[${mod}] ${trebuie ? 'prinde' : 'lasă'}: ${txt.slice(0, 50)}`, () => {
      const got = verifica(txt, { module: [mod] });
      expect(Boolean(got.length)).toBe(trebuie);
    });
  }
  it('curata sărăcește frontmatter, titluri și cod', () => {
    const l = curata('---\nfm: 1\n---\n# Titlu\nText bun.\n```py\ncod\n```');
    expect(l).toEqual([[5, 'Text bun.']]);
  });
  it('fraze se sparge pe . ! ? …', () => {
    expect(fraze(curata('Una. Două? Trei… Patru!'))).toHaveLength(4);
  });
  it('caractere: sedilele și invizibilele sunt HARD', () => {
    const r = verifica('Sunt şţi vă\u200B spun.', { module: ['caractere'] });
    expect(r.some((x) => x.regula === 'caractere/HARD')).toBe(true);
  });
});

describe('measure/ritm — distribuția frazelor', () => {
  it('raportează fraze, medie și distribuție', () => {
    const out = analiza('O frază scurtă. Aceasta e o frază ceva mai lungă, cu virgulă și tot restul.');
    expect(out[0]).toMatch(/^Fraze: 2 · medie /);
    expect(out[1]).toMatch(/^Distribuție:/);
  });
  it('semnalează patru fraze consecutive de lungime similară', () => {
    const out = analiza('Azi plouă foarte mult. Mâine bate vântul. Poimâine ninsoarea vine. Ultima zi rămasă goală.');
    expect(out.some((l) => l.includes('fraze consecutive de lungime similară'))).toBe(true);
  });
  it('text gol', () => {
    expect(analiza('')).toEqual(['Text gol.']);
  });
});

describe('writingEngine + bookPackage (motor universal, pachet de carte)', () => {
  it('metoda universală se alătură system promptului', () => {
    const s = engine.withEngine('SYS');
    expect(s.startsWith('SYS')).toBe(true);
    expect(s).toContain('<metoda_scriere>');
    expect(s).toContain('Doza de intervenție');
    expect(s).not.toContain('Karma'); // universal: nimic specific unei cărți
  });
  it('pachetul cărții: fraze fixate + formule oprite, peste reguli', () => {
    const p = { editorialProfile: { aiRules: 'R.', fixedPhrases: 'Fraza fixată\nA doua', bannedFormulas: 'nu X, ci Y' } };
    const out = aiRules.readRules({ loadProject: () => p }, 'D');
    expect(out).toContain('<reguli_proiect>');
    expect(out).toContain('<pachet_carte>');
    expect(out).toContain('Fraza fixată');
    expect(out).toContain('A doua');
    expect(out).toContain('nu X, ci Y');
    expect(out).toContain('NU se ating');
  });
  it('fără pachet, comportamentul rămâne cel de dinainte', () => {
    const out = aiRules.readRules({ loadProject: () => ({ editorialProfile: { aiRules: 'R.' } }) }, 'D');
    expect(out).not.toContain('<pachet_carte>');
    expect(out).toContain('R.');
  });
});
