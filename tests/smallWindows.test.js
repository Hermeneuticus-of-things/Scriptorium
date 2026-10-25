// P11: small windows — history (gross words, range, delete), statistics helpers, scratchpad notes,
// session across projects, layouts, name generator filters, linguistic focus classes.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import {
  filterHistoryRange, historyTotals, historyCsv, sortFrequency, frequencyCsv, quickTextStats,
  noteHtml, noteFileName, noteFromFile, noteToFileHtml, publishSession, unpublishSession, combinedSession,
  sessionDelta, progressPct, SESSION_FRESH_MS,
} from '../src/lib/smallWindows.js';
import { captureLayout, layoutToFile, layoutFromFile, layoutThumbnail, upsertLayout } from '../src/lib/layouts.js';
import { generateNames, parseNameList, customCultures } from '../src/lib/nameGenerator.js';
import { isPreposition, tagText } from '../src/lib/pos.js';
import { matchesClass } from '../src/extensions/LinguisticFocus.js';
import { createMockApi } from '../src/lib/mockApi.js';
import { sortManagerRows } from '../src/components/SnapshotManagerDialog.jsx';

const require = createRequire(import.meta.url);
const history = require('../lib/history.cjs');

function memStorage() {
  const m = new Map();
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

describe('writing history: gross words, range, delete', () => {
  it('records words added and deleted separately within a day', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p11-hist-'));
    const d = new Date(2026, 9, 20, 10);
    history.recordHistory(dir, { draft: 100, total: 100 }, d);
    history.recordHistory(dir, { draft: 160, total: 160 }, d);
    history.recordHistory(dir, { draft: 130, total: 130 }, d);
    history.recordHistory(dir, { draft: 150, total: 150 }, d);
    const [row] = history.summarize(history.readHistory(dir));
    expect(row.draft).toBe(50);
    expect(row.draftAdded).toBe(80);
    expect(row.draftDeleted).toBe(30);
  });
  it('the first recording of a new day counts from the previous day', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p11-hist-'));
    history.recordHistory(dir, { draft: 100, total: 100 }, new Date(2026, 9, 20, 10));
    history.recordHistory(dir, { draft: 90, total: 90 }, new Date(2026, 9, 21, 10));
    const rows = history.summarize(history.readHistory(dir));
    expect(rows[1]).toMatchObject({ date: '2026-10-21', draft: -10, draftDeleted: 10 });
  });
  it('deletes chosen days or everything', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p11-hist-'));
    for (const day of [20, 21, 22]) history.recordHistory(dir, { draft: day, total: day }, new Date(2026, 9, day, 10));
    expect(history.deleteHistory(dir, ['2026-10-21'])).toBe(2);
    expect(history.summarize(history.readHistory(dir)).map((r) => r.date)).toEqual(['2026-10-20', '2026-10-22']);
    expect(history.deleteHistory(dir, null)).toBe(0);
  });
  it('range, totals and CSV', () => {
    const rows = [
      { date: '2026-10-01', draft: 100, draftAdded: 120, draftDeleted: 20, total: 100 },
      { date: '2026-10-02', draft: 0, total: 0 },
      { date: '2026-10-03', draft: 50, total: 60 },
    ];
    expect(filterHistoryRange(rows, '2026-10-02', '').map((r) => r.date)).toEqual(['2026-10-02', '2026-10-03']);
    expect(filterHistoryRange(rows, '', '2026-10-01')).toHaveLength(1);
    const tot = historyTotals(rows);
    expect(tot).toMatchObject({ net: 150, added: 170, deleted: 20, days: 2, streak: 1 });
    const csv = historyCsv(rows).split('\n');
    expect(csv[0]).toMatch(/^date,manuscript_net,manuscript_added,manuscript_deleted/);
    expect(csv[1]).toBe('2026-10-01,100,120,20,100,,');
  });
  it('mock api: gross words and deleting days', async () => {
    const api = createMockApi();
    await api.recordHistory('d', { draft: 10, total: 10 });
    await api.recordHistory('d', { draft: 30, total: 30 });
    await api.recordHistory('d', { draft: 25, total: 25 });
    const [row] = await api.getHistory('d');
    expect(row).toMatchObject({ draft: 15, draftAdded: 20, draftDeleted: 5 });
    await api.deleteHistory('d', [row.date]);
    expect(await api.getHistory('d')).toEqual([]);
  });
});

describe('statistics helpers', () => {
  const rows = [{ word: 'mare', count: 3, percent: 30 }, { word: 'casa', count: 5, percent: 50 }, { word: 'brad', count: 3, percent: 30 }];
  it('sorts the frequency table by any column', () => {
    expect(sortFrequency(rows, 'word', 'asc').map((r) => r.word)).toEqual(['brad', 'casa', 'mare']);
    expect(sortFrequency(rows, 'count', 'desc').map((r) => r.word)).toEqual(['casa', 'brad', 'mare']);
    expect(sortFrequency(rows, 'count', 'asc')[0].word).toBe('brad');
  });
  it('exports the frequency table as CSV', () => {
    expect(frequencyCsv(rows).split('\n')).toEqual(['word,count,percent', 'mare,3,30.00', 'casa,5,50.00', 'brad,3,30.00']);
  });
  it('quick text statistics for a selection', () => {
    const s = quickTextStats('Ana are mere. Ion are pere!\n\nAlt paragraf aici.');
    expect(s).toMatchObject({ words: 9, sentences: 3, paragraphs: 2, averageSentence: 3 });
    expect(quickTextStats('').words).toBe(0);
  });
});

describe('scratchpad notes', () => {
  it('older plain-text notes get HTML; formatted ones keep theirs', () => {
    expect(noteHtml({ text: 'a <b>\nb' })).toBe('<p>a &lt;b&gt;</p><p>b</p>');
    expect(noteHtml({ html: '<p><strong>x</strong></p>' })).toBe('<p><strong>x</strong></p>');
  });
  it('file names are safe and fall back to the id', () => {
    expect(noteFileName('Idei: capitolul 3?', 'n1')).toBe('Idei capitolul 3');
    expect(noteFileName('..', 'n1')).toBe('n1');
    expect(noteFileName('', 'n2')).toBe('n2');
  });
  it('imports .txt and .html files and writes a full HTML file', () => {
    const t = noteFromFile('scena.txt', 'unu\ndoi');
    expect(t).toMatchObject({ title: 'scena', html: '<p>unu</p><p>doi</p>' });
    const h = noteFromFile('n.html', '<html><body><p><em>x</em></p></body></html>');
    expect(h.html).toBe('<p><em>x</em></p>');
    expect(noteToFileHtml({ title: 'A & B', html: '<p>x</p>' })).toContain('<title>A &amp; B</title>');
  });
  it('mock api keeps the notes folder in memory', async () => {
    const api = createMockApi();
    expect(await api.scratchReadFolder()).toBeNull();
    expect(await api.scratchChooseFolder()).toBeTruthy();
    await api.scratchWriteFolder([{ file: 'Idee.html', content: '<html><body><p>a</p></body></html>' }, { file: 'bad.txt', content: 'x' }]);
    const notes = await api.scratchReadFolder();
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ title: 'Idee', html: '<p>a</p>' });
    expect(await api.scratchOpenWindow()).toBe(false);
  });
});

describe('session targets', () => {
  it('negative counts only when allowed', () => {
    expect(sessionDelta(80, 100, false)).toBe(0);
    expect(sessionDelta(80, 100, true)).toBe(-20);
    expect(sessionDelta(130, 100, false)).toBe(30);
  });
  it('sums the session of the projects open in other windows (fresh entries only)', () => {
    const st = memStorage();
    const now = 1_000_000;
    publishSession(st, '/a', 100, now);
    publishSession(st, '/b', 40, now);
    publishSession(st, '/c', 999, now - SESSION_FRESH_MS - 1);
    expect(combinedSession(st, '/a', 100, now)).toBe(140);
    unpublishSession(st, '/b');
    expect(combinedSession(st, '/a', 100, now)).toBe(100);
  });
  it('progress percent', () => {
    expect(progressPct(50, 200)).toBe(25);
    expect(progressPct(500, 200)).toBe(100);
    expect(progressPct(5, 0)).toBe(0);
  });
});

describe('layouts', () => {
  const state = { view: 'outline', showInspector: true, widths: { binder: 260, side: 320 }, editorView: { splitHorizontal: true }, splitId: 'd2', outlinerColumns: ['synopsis', 'words'], cork: { folderId: 'f1', mode: 'free' } };
  it('keeps outliner columns, board mode and the split', () => {
    const l = captureLayout('Revizie', state);
    expect(l).toMatchObject({ name: 'Revizie', view: 'outline', split: true, splitId: 'd2', splitHorizontal: true, outlinerColumns: ['synopsis', 'words'], cork: { folderId: 'f1', mode: 'free' } });
  });
  it('exports and imports a layout file', () => {
    const l = captureLayout('Revizie', state);
    const back = layoutFromFile(layoutToFile(l));
    expect(back.name).toBe('Revizie');
    expect(back.outlinerColumns).toEqual(['synopsis', 'words']);
    expect(() => layoutFromFile('{"a":1}')).toThrow();
    expect(() => layoutFromFile('nope')).toThrow();
    expect(upsertLayout([{ name: 'Revizie', view: 'editor' }, { name: 'X' }], back).map((x) => x.name)).toEqual(['X', 'Revizie']);
  });
  it('thumbnail: binder, split panes and the side panel', () => {
    const kinds = layoutThumbnail({ view: 'editor', split: true, showInspector: true }).map((r) => r.kind);
    expect(kinds).toEqual(['binder', 'editor', 'split', 'inspector']);
    const noSide = layoutThumbnail({ view: 'corkboard', hideBinder: true, showInspector: false });
    expect(noSide).toEqual([{ kind: 'corkboard', x: 0, y: 0, w: 100, h: 60 }]);
  });
});

describe('name generator: starting letter and custom lists', () => {
  it('names start with the chosen letter (diacritics folded)', () => {
    const names = generateNames({ firstOrigins: ['ro'], lastOrigins: ['ro'], count: 10, seed: 1, startsWith: 's' });
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(n.first[0].normalize('NFD')[0].toLowerCase()).toBe('s');
    const last = generateNames({ firstOrigins: ['ro'], count: 5, seed: 2, lastOnly: true, startsWith: 'P' });
    for (const n of last) expect(n.last[0]).toBe('P');
    expect(generateNames({ firstOrigins: ['ro'], count: 5, seed: 1, startsWith: 'qx' })).toEqual([]);
  });
  it('parses a custom list and generates from it', () => {
    const parsed = parseNameList('# lista\nm: Zorel\nf: Zamfira\nn: Zăbavă\nZenovie', 'm');
    expect(parsed).toEqual({ m: ['Zorel', 'Zenovie'], f: ['Zamfira'], last: ['Zăbavă'] });
    const extra = customCultures([{ id: 'z', label: 'Z', ...parsed }]);
    const names = generateNames({ firstOrigins: ['custom:z'], lastOrigins: ['custom:z'], count: 3, seed: 3, extraCultures: extra });
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(n.last).toBe('Zăbavă');
  });
});

describe('linguistic focus: pronouns and prepositions', () => {
  it('prepositions are picked out of the tagger\'s "other" class', () => {
    expect(isPreposition('Pentru', 'ro')).toBe(true);
    expect(isPreposition('casa', 'ro')).toBe(false);
    const words = tagText('El merge pe drum cu ea.', 'ro');
    const preps = words.filter((w) => matchesClass(w, 'prep', 'ro')).map((w) => w.word);
    expect(preps).toEqual(['pe', 'cu']);
    const prons = words.filter((w) => matchesClass(w, 'pron', 'ro')).map((w) => w.word);
    expect(prons).toEqual(expect.arrayContaining(['El', 'ea']));
  });
});

describe('snapshot manager sorting', () => {
  const rows = [{ title: 'B', count: 1, last: '2026-01-02' }, { title: 'A', count: 3, last: '2026-01-01' }];
  it('sorts by title, count and last date; null keeps binder order', () => {
    expect(sortManagerRows(rows, { key: 'title', dir: 'asc' }).map((r) => r.title)).toEqual(['A', 'B']);
    expect(sortManagerRows(rows, { key: 'count', dir: 'desc' }).map((r) => r.title)).toEqual(['A', 'B']);
    expect(sortManagerRows(rows, { key: 'last', dir: 'desc' }).map((r) => r.title)).toEqual(['B', 'A']);
    expect(sortManagerRows(rows, null)).toBe(rows);
  });
});
