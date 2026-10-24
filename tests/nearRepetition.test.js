import { describe, it, expect } from 'vitest';
import { detectNearRepetitions as detect, formatRepLines, lemma } from '../src/lib/nearRepetition.js';

const forms = (paras, lang = 'ro') => detect(paras, { lang }).map((g) => [g.lemma, g.k]);

describe('I-REP near repetition (VKB2 O13)', () => {
  it('anadiplosis across a paragraph boundary', () => {
    const g = detect(['Omul ridică scutul.', 'Scutul îl apără de lovituri.'], { lang: 'ro' });
    expect(g).toHaveLength(1);
    expect(g[0].form).toBe('scutul');
    expect(g[0].k).toBe(2);
    expect(g[0].occurrences.map((o) => [o.para, o.text])).toEqual([[1, 'scutul'], [2, 'Scutul']]);
    expect(g[0].occurrences[1]).toMatchObject({ start: 0, end: 6 });
  });

  it('same sentence and neighbouring sentences, chained', () => {
    expect(forms(['Fapta rămâne, iar fapta se întoarce.'])).toEqual([['fapt', 2]]);
    expect(forms(['Fapta rămâne. Apoi fapta se întoarce. Fapta urcă.'])).toEqual([['fapt', 3]]);
  });

  it('two sentences apart is not grouped', () => {
    expect(forms(['Fapta rămâne. Vântul tace azi. Fapta se întoarce.'])).toEqual([]);
  });

  it('function words, numerals and auxiliaries are not counted', () => {
    expect(forms(['El a venit și el a plecat cu ea, cu doi oameni și doi câini.'])).toEqual([]);
    expect(forms(['Au fost 3 zile și 3 nopți, a doua oară, a treia oară.'])).toEqual([['oare', 2]]);
    expect(forms(['He was here and he was there, with them.'], 'en')).toEqual([]);
  });

  it('locutions are not counted', () => {
    expect(forms(['Stă în fața casei, apoi în fața porții.'])).toEqual([]);
    expect(forms(['Merge de-a lungul râului și de-a lungul drumului.'])).toEqual([]);
    expect(forms(['Pe lângă casă, pe lângă gard.'])).toEqual([]);
  });

  it('reduplicates count as one occurrence', () => {
    expect(forms(['Urcă pas cu pas, zi de zi.'])).toEqual([]);
    expect(forms(['Urcă pas cu pas. Fiecare pas doare.'])).toEqual([['pas', 2]]);
  });

  it('book terms are counted (faptă, pădure, urmă)', () => {
    expect(forms(['Pădurea tace. Pădurea nu uită.'])).toEqual([['padur', 2]]);
    expect(forms(['Urma rămâne. Urmele cresc.'])).toEqual([['urme', 2]]);
    expect(forms(['Fapta e grea, faptele cântăresc.'])).toEqual([['fapt', 2]]);
  });

  it('Romanian inflection merges, diacritics-insensitive', () => {
    for (const set of [['scutul', 'scut', 'scuturile', 'scutului'], ['faptă', 'fapta', 'faptele', 'faptelor', 'faptei', 'fapte'], ['lume', 'lumea', 'lumii'], ['pădurea', 'pădurii']]) {
      expect(new Set(set.map((w) => lemma(w))).size).toBe(1);
    }
    expect(lemma('faptă')).toBe(lemma('fapta'));
    expect(lemma('ţară')).toBe(lemma('țară'));
  });

  it('does not over-merge different words', () => {
    expect(lemma('mare')).not.toBe(lemma('măr'));
    expect(lemma('cale')).not.toBe(lemma('cal'));
    expect(lemma('calea')).not.toBe(lemma('calul'));
    expect(lemma('casă')).not.toBe(lemma('cas'));
    expect(forms(['Calul trage. Calea e lungă.'])).toEqual([]);
    expect(forms(['Mărul cade. Marele om tace.'])).toEqual([]);
  });

  it('English inflection', () => {
    expect(lemma('walked', 'en')).toBe('walk');
    expect(lemma('walking', 'en')).toBe('walk');
    expect(lemma('walks', 'en')).toBe('walk');
    expect(lemma('glass', 'en')).toBe('glass');
    expect(forms(['She walked home. Walking was easy.'], 'en')).toEqual([['walk', 2]]);
  });

  it('formatRepLines: one line per paragraph line with occurrences', () => {
    const g = detect(['Omul ridică scutul. Scutul cade.', 'Scutul rămâne jos.', 'Altceva aici.'], { lang: 'ro' });
    expect(formatRepLines(g)).toEqual(['⚠ REP L1 «scutul» ×3', '⚠ REP L2 «scutul» ×3']);
    expect(formatRepLines([])).toEqual([]);
  });
});
