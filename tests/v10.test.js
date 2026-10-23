import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildTimeline, parseWhen, parseDuration, synopsisFields } from '../src/lib/timeline.js';
import { buildRelations, forceLayout, guessNames } from '../src/lib/relations.js';
import { analyzePacing, analyzeText, dialogueWords } from '../src/lib/pacing.js';

const require = createRequire(import.meta.url);
const batch = require('../lib/aiBatch.cjs');
const registerV10 = require('../electron/v10Handlers.cjs');

const doc = (id, title, extra = {}) => ({ id, title, type: 'text', synopsis: '', ...extra });
const project = (children, extra = {}) => ({
  tree: [{ id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children }, { id: 'trash', root: 'trash', type: 'folder', children: [doc('t1', 'Șters')] }],
  ...extra,
});

describe('timeline', () => {
  it('parses dates, durations and synopsis fields', () => {
    expect(parseWhen('2024-05-01', '10:30') - parseWhen('2024-05-01')).toBe(630);
    expect(parseWhen('02.05.2024')).toBe(parseWhen('2024-05-02'));
    expect(parseWhen('Ziua 3')).toBe(3 * 1440);
    expect(parseWhen('cândva')).toBeNull();
    expect(parseDuration('1 zi 2h 30 min')).toBe(1440 + 120 + 30);
    expect(synopsisFields('Data: 2024-01-01\nPOV: Ana')).toEqual({ Data: '2024-01-01', POV: 'Ana' });
  });
  it('sorts by time, builds lanes, flags flashbacks, lists undated', () => {
    const p = project([
      doc('a', 'A', { custom: { Data: '2024-05-03', POV: 'Ana', Loc: 'Cluj' } }),
      doc('b', 'B', { synopsis: 'Data: 2024-05-01\nPOV: Ion' }),
      doc('c', 'C'),
    ]);
    const tl = buildTimeline(p);
    expect(tl.events.map((e) => e.id)).toEqual(['b', 'a']);
    expect(tl.lanes).toEqual(['Ana', 'Ion']);
    expect(tl.events[1].outOfOrder).toBe(true);
    expect(tl.undated.map((e) => e.id)).toEqual(['c']);
    expect(buildTimeline(p, { laneBy: 'location' }).lanes).toEqual(['Cluj', '—']);
  });
});

describe('relations', () => {
  const p = project([doc('s1', 'S1'), doc('s2', 'S2'), doc('s3', 'S3')], { characters: ['Ana', { name: 'Ion', aliases: ['Ionică'] }, 'Maria'] });
  const docs = { s1: '<p>Ana îl vede pe Ionică.</p>', s2: '<p>Mama Anei vorbește cu Ion.</p>', s3: '<p>Maria pleacă. Ana rămâne.</p>' };
  it('counts co-occurrence with inflection and aliases', () => {
    const r = buildRelations(p, docs);
    expect(r.nodes.find((n) => n.id === 'Ana').scenes).toBe(3);
    const e = r.edges.find((x) => x.a === 'Ana' && x.b === 'Ion');
    expect(e.weight).toBe(2);
    expect(r.edges.find((x) => x.a === 'Ana' && x.b === 'Maria').weight).toBe(1);
  });
  it('layout is deterministic and in bounds', () => {
    const r = buildRelations(p, docs);
    const l1 = forceLayout(r.nodes, r.edges, { width: 400, height: 300 });
    const l2 = forceLayout(r.nodes, r.edges, { width: 400, height: 300 });
    expect(l1).toEqual(l2);
    for (const { x, y } of Object.values(l1)) { expect(x).toBeGreaterThanOrEqual(30); expect(x).toBeLessThanOrEqual(370); expect(y).toBeLessThanOrEqual(280); }
  });
  it('guesses names from mid-sentence capitals', () => {
    expect(guessNames(['Apoi veni Radu acasă. Era seară.', 'Atunci Radu tăcu.'])).toEqual(['Radu']);
  });
});

describe('pacing', () => {
  it('measures dialogue and sentences', () => {
    expect(dialogueWords('— Vino aici, zise ea.\nEl tăcu. „Bine”, spuse.')).toBe(5);
    const a = analyzeText('Unu doi trei. Patru cinci.\nȘase.');
    expect(a).toMatchObject({ words: 6, sentences: 3, paragraphs: 2, avgSentence: 2, avgParagraph: 3 });
  });
  it('computes variance and flags outliers', () => {
    const kids = Array.from({ length: 8 }, (_, i) => doc(`d${i}`, `D${i}`));
    const docs = Object.fromEntries(kids.map((k, i) => [k.id, `<p>${'cuvânt '.repeat(i === 7 ? 1000 : 100)}</p>`]));
    const r = analyzePacing(project(kids), docs);
    expect(r.summary.count).toBe(8);
    expect(r.scenes[7].flags).toContain('lung');
    expect(r.summary.stdDev).toBeGreaterThan(0);
  });
});

describe('aiBatch', () => {
  const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'scribner-ai-'));
  it('parseJson tolerates fences and chatter', () => {
    expect(batch.parseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(batch.parseJson('Iată: {"a":"}"} gata')).toEqual({ a: '}' });
    expect(() => batch.parseJson('nimic')).toThrow();
  });
  it('bulkSynopsis respects concurrency, reports progress, uses disk cache', async () => {
    let inFlight = 0; let peak = 0; let calls = 0;
    const run = async ({ prompt }) => { calls++; inFlight++; peak = Math.max(peak, inFlight); await new Promise((r) => setTimeout(r, 5)); inFlight--; return `Sinopsis ${prompt.length}`; };
    const docs = Array.from({ length: 6 }, (_, i) => ({ id: `d${i}`, title: `D${i}`, text: `text ${i}` }));
    const file = path.join(tmp(), 'c.json');
    const prog = [];
    const r1 = await batch.bulkSynopsis({ docs, run, cache: batch.createCache(file), concurrency: 2, onProgress: (p) => prog.push(p) });
    expect(Object.keys(r1.results)).toHaveLength(6);
    expect(peak).toBe(2);
    expect(prog.at(-1)).toMatchObject({ done: 6, total: 6 });
    const r2 = await batch.bulkSynopsis({ docs, run, cache: batch.createCache(file) });
    expect(calls).toBe(6);
    expect(r2.cachedCount).toBe(6);
    expect(r2.results).toEqual(r1.results);
  });
  it('bulkSynopsis isolates per-doc errors', async () => {
    const run = async ({ prompt }) => { if (prompt.includes('rău')) throw new Error('boom'); return 'ok'; };
    const r = await batch.bulkSynopsis({ docs: [{ id: 'a', text: 'bun' }, { id: 'b', text: 'rău' }], run });
    expect(r.results).toEqual({ a: 'ok' });
    expect(r.errors.b).toBe('boom');
  });
  it('living sheets merge incrementally and re-merge replaces a doc', () => {
    let s = batch.mergeSheets(null, 'd1', { characters: [{ name: 'Ana', attributes: { ochi: 'verzi' }, facts: ['e medic'] }], facts: ['Cluj, 1990'] }, 'h1');
    s = batch.mergeSheets(s, 'd2', { characters: [{ name: 'Anuța', aliases: ['Ana'], attributes: { Ochi: 'albaștri' } }] }, 'h2');
    expect(Object.keys(s.characters)).toEqual(['Ana']);
    expect(s.characters.Ana.aliases).toContain('Anuța');
    expect(batch.localConflicts(s)).toHaveLength(1);
    s = batch.mergeSheets(s, 'd2', { characters: [{ name: 'Ana', attributes: { ochi: 'verzi' } }] }, 'h3');
    expect(batch.localConflicts(s)).toHaveLength(0);
    expect(s.characters.Ana.attributes.ochi[0].docs).toEqual(['d1', 'd2']);
    expect(batch.removeDoc(s, 'd1').facts).toEqual([]);
  });
  it('bookConsistency extracts, skips unchanged docs, cross-checks', async () => {
    const seen = [];
    const run = async ({ prompt }) => {
      seen.push(prompt.includes('<fise>') ? 'check' : 'extract');
      if (prompt.includes('<fise>')) return '{"findings":[{"severity":"grav","issue":"ochi diferiți"}]}';
      const eyes = prompt.includes('verzi') ? 'verzi' : 'albaștri';
      return JSON.stringify({ characters: [{ name: 'Ana', attributes: { ochi: eyes } }], facts: [] });
    };
    const docs = [{ id: 'a', title: 'A', text: 'Ana are ochi verzi.' }, { id: 'b', title: 'B', text: 'Ana are ochi albaștri.' }];
    const r = await batch.bookConsistency({ docs, run });
    expect(r.conflicts).toHaveLength(1);
    expect(r.findings[0].severity).toBe('GRAVE');
    seen.length = 0;
    const r2 = await batch.bookConsistency({ docs: docs.slice(0, 1), run, sheets: r.sheets, crossCheck: false });
    expect(seen).toEqual([]); // unchanged doc not re-sent
    expect(r2.conflicts).toHaveLength(0); // removed doc b dropped from sheets
  });
  it('multiZoomReview builds units per level and normalizes findings', async () => {
    const run = async ({ prompt }) => {
      const sev = prompt.includes('NANO') ? 'minor' : prompt.includes('MAHA') ? 'GRAVE' : 'MEDIU';
      return JSON.stringify({ findings: [{ severity: sev, quote: 'x', issue: 'i', suggestion: 's' }] });
    };
    const docs = [{ id: 'a', title: 'A', text: 'ta', chapter: 'Cap 1' }, { id: 'b', title: 'B', text: 'tb', chapter: 'Cap 1' }, { id: 'c', title: 'C', text: 'tc', chapter: 'Cap 2' }];
    const r = await batch.multiZoomReview({ docs, run });
    // Maha 1 + Macro 2 + Mezzo/Micro/Nano 3 each
    expect(r.findings).toHaveLength(1 + 2 + 9);
    expect(r.findings[0]).toMatchObject({ level: 'Maha', severity: 'GRAVE' });
    expect(r.counts).toEqual({ GRAVE: 1, MEDIU: 8, MINOR: 3 });
    await expect(batch.multiZoomReview({ docs, run, levels: ['Giga'] })).rejects.toThrow();
  });
});

describe('v10Handlers', () => {
  const setup = (aiEnabled) => {
    const h = {};
    registerV10({ handle: (c, fn) => { h[c] = fn; }, getSettings: () => ({ aiEnabled }), getApiKey: () => 'k', makeRun: () => async () => 'Sinopsis.' });
    const sent = [];
    const e = { sender: { send: (ch, p) => sent.push([ch, p]), isDestroyed: () => false } };
    return { h, e, sent };
  };
  it('refuses when AI is off', async () => {
    const { h, e } = setup(false);
    expect(Object.keys(h)).toEqual(['ai:bulkSynopsis', 'ai:consistency', 'ai:zoomReview']);
    await expect(h['ai:bulkSynopsis'](e, null, [{ id: 'a', text: 'x' }])).rejects.toThrow(/oprite/);
    await expect(h['ai:zoomReview'](e, null, [], ['Nano'])).rejects.toThrow(/oprite/);
  });
  it('sends progress events', async () => {
    const { h, e, sent } = setup(true);
    const r = await h['ai:bulkSynopsis'](e, null, [{ id: 'a', title: 'A', text: 'x' }]);
    expect(r.results.a).toBe('Sinopsis.');
    expect(sent[0][0]).toBe('ai:progress');
  });
});

describe('relations: character sheets titled "Personaj: Nume"', () => {
  it('are recognised anywhere in the binder', async () => {
    const { projectCharacters } = await import('../src/lib/relations.js');
    const project = { tree: [{ id: 'd', type: 'folder', children: [] }, { id: 'r', type: 'folder', children: [{ id: 'p', type: 'text', title: 'Personaj: Andrei' }] }] };
    expect(projectCharacters(project).map((c) => c.name)).toEqual(['Andrei']);
  });
});
