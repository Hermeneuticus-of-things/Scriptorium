import { describe, it, expect } from 'vitest';
import { htmlToPlain, countText, projectStats, wordFrequency, ROMANIAN_STOPWORDS, sentenceLengths, deadlinePlan, readability } from '../src/lib/stats.js';

describe('htmlToPlain', () => {
  it('decodes entities, splits blocks, skips footnotes, keeps annotations-free text', () => {
    const html = '<h1>Capitolul&nbsp;1</h1><p>Țara &amp; oamenii<span data-footnote="1">notă <span>ascunsă</span></span> au &lt;tăcut&gt;.</p><p>Linia&#39;unu<br>doi &quot;trei&quot;</p><!-- c --><ul><li>a</li><li>b<span data-annotation>x</span></li></ul>';
    expect(htmlToPlain(html)).toBe('Capitolul 1\n\nȚara & oamenii au <tăcut>.\n\nLinia\'unu\ndoi "trei"\n\na\n\nb');
  });
  it('handles empty input', () => expect(htmlToPlain('')).toBe(''));
});

describe('countText', () => {
  it('counts Romanian words with diacritics and apostrophes', () => {
    const c = countText('Într-o zi, fata și-a pierdut cățelul. S-a întors acasă!\nA doua zi?');
    expect(c.words).toBe(12);
    expect(c.sentences).toBe(3);
    expect(c.paragraphs).toBe(2);
    expect(c.charsNoSpaces).toBe(c.chars - 10);
  });
});

const project = {
  tree: [
    { id: 'd', title: 'Manuscris', type: 'folder', root: 'draft', children: [
      { id: 'c1', type: 'text', title: 'Unu' },
      { id: 'f', type: 'folder', includeInCompile: false, children: [{ id: 'c2', type: 'text' }] },
      { id: 'c3', type: 'text', includeInCompile: false },
    ] },
    { id: 'r', type: 'folder', root: 'research', children: [{ id: 'n1', type: 'text' }] },
    { id: 't', type: 'folder', root: 'trash', children: [{ id: 'x', type: 'text' }] },
  ],
};
const docs = {
  c1: '<p>Ana are mere și pere.</p>',
  c2: '<p>Ion citește o carte<span data-footnote>foarte multe cuvinte aici</span>.</p>',
  c3: '<p>Trei cuvinte aici.</p>',
  n1: '<p>Notă de cercetare.</p>',
  x: '<p>Șters complet din proiect.</p>',
};

describe('projectStats', () => {
  it('draft scope', () => {
    const s = projectStats(project, docs, { scope: 'draft' });
    expect(s.words).toBe(5 + 4 + 3);
    expect(s.documents).toBe(3);
    expect(s.pagesPaperback).toBe(1);
    expect(s.readingMinutes).toBe(1);
    expect(s.pagesPrinted).toBe(1);
  });
  it('compile scope excludes excluded ancestors', () => {
    const s = projectStats(project, docs, { scope: 'compile' });
    expect(s.documents).toBe(1);
    expect(s.words).toBe(5);
  });
  it('all scope skips trash', () => {
    expect(projectStats(project, docs, { scope: 'all' }).words).toBe(15);
  });
  it('selection includes descendants', () => {
    expect(projectStats(project, docs, { scope: 'draft', selectionIds: ['f'] }).words).toBe(4);
    expect(projectStats(project, docs, { scope: 'all', selectionIds: ['x'] }).words).toBe(0);
  });
});

describe('wordFrequency', () => {
  it('lowercases with ro locale and drops stopwords', () => {
    const f = wordFrequency('Ștefan și ȘTEFAN merg la pădure. Pădurea este deasă, ștefan!', { minLength: 4 });
    expect(f[0]).toEqual({ word: 'ștefan', count: 3, percent: 30 });
    expect(f.find((x) => x.word === 'este')).toBeUndefined();
    expect(wordFrequency('este este', { stopwords: null })[0].count).toBe(2);
  });
  it('stopword set is large and has diacritics', () => {
    expect(ROMANIAN_STOPWORDS.size).toBeGreaterThanOrEqual(120);
    for (const w of ['și', 'în', 'că', 'această', 'fost']) expect(ROMANIAN_STOPWORDS.has(w)).toBe(true);
  });
});

describe('sentenceLengths', () => {
  it('computes stats and histogram', () => {
    const s = sentenceLengths('Plouă. Copiii s-au jucat în curte toată ziua lungă de vară! Mama a gătit ciorbă?');
    expect(s.shortest).toBe(1);
    expect(s.longest).toBe(10);
    expect(s.average).toBe(5);
    expect(s.histogram[0]).toEqual({ range: '1-5', count: 2 });
    expect(s.histogram[1]).toEqual({ range: '6-10', count: 1 });
  });
  it('empty', () => expect(sentenceLengths('').average).toBe(0));
});

describe('readability', () => {
  it('empty text -> na band, zeros', () => {
    const r = readability('');
    expect(r.band).toBe('na');
    expect(r).toMatchObject({ words: 0, sentences: 0, wordsPerSentence: 0, grade: 0 });
  });
  it('short plain sentences read as easy', () => {
    const r = readability('Plouă azi. Copiii stau în casă. Mama face ceai.');
    expect(r.words).toBe(9);
    expect(r.sentences).toBe(3);
    expect(r.wordsPerSentence).toBe(3);
    expect(r.longSentences).toBe(0);
    expect(r.longSentencePct).toBe(0);
    expect(r.band).toBe('easy');
  });
  it('flags over-long sentences and counts long words', () => {
    const long = Array.from({ length: 30 }, (_, i) => `cuvant${i}`).join(' ') + '.';
    const r = readability(`${long} Scurt.`);
    expect(r.sentences).toBe(2);
    expect(r.longSentences).toBe(1);
    expect(r.longSentencePct).toBe(50);
    // "cuvant10".."cuvant29" are 8 chars; raise the word threshold to catch a genuinely long word.
    const r2 = readability('neconstituționalitatea aici.', { longWord: 14 });
    expect(r2.longWords).toBe(1);
    expect(r2.longWordPct).toBe(50);
  });
  it('bands climb with sentence and word length', () => {
    const dense = 'Interdependența fenomenologică a structurilor epistemologice fundamentează problematizarea ontologică a conceptualizărilor metafizice contemporane subsecvente.';
    expect(['hard', 'veryHard']).toContain(readability(dense).band);
  });
});

describe('deadlinePlan', () => {
  const t = { draft: 10000, deadline: '2026-10-27', writingDays: [1, 2, 3, 4, 5] };
  it('null without deadline', () => expect(deadlinePlan({ draft: 5 }, 0)).toBeNull());
  it('counts only weekdays across a weekend (Fri 23 Oct -> Tue 27 Oct)', () => {
    const p = deadlinePlan(t, 4000, new Date(2026, 9, 23));
    expect(p).toEqual({ remaining: 6000, daysLeft: 3, perDay: 2000, overdue: false });
  });
  it('today excluded on a weekend', () => {
    expect(deadlinePlan(t, 4000, new Date(2026, 9, 24)).daysLeft).toBe(2);
  });
  it('empty writingDays = every day', () => {
    expect(deadlinePlan({ ...t, writingDays: [] }, 4000, new Date(2026, 9, 23)).daysLeft).toBe(5);
  });
  it('done and overdue', () => {
    expect(deadlinePlan(t, 12000, new Date(2026, 9, 23)).perDay).toBe(0);
    const o = deadlinePlan(t, 1000, new Date(2026, 10, 2));
    expect(o.overdue).toBe(true);
    expect(o.daysLeft).toBe(0);
  });
});
