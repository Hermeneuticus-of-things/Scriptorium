// VKB2 (docs/VKB2.md) wiring: SEMNAL near repetitions in lint, round R8b, author text in prompts
// and autofix, the MODIFICARI_AUTOR journal (store, web and demo APIs).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { autofix, GENERIC_PROFILE, ROMANIAN_PROFILE, lint, repairPrompt, roundContext, roundPrompt, ROUNDS, summarize } from '../src/lib/editorial.js';
import { authorParagraphs, hashParagraphs, paragraphHash } from '../src/lib/authorText.js';
import { createWebApi, createMemoryKv } from '../src/lib/webApi.js';
import { createMockApi } from '../src/lib/mockApi.js';

const require = createRequire(import.meta.url);
const store = require('../lib/store.cjs');

const REP = '<p>Omul ridică scutul.</p><p>Scutul îl apără de lovituri.</p>';

describe('I-REP repetitionNear is a SEMNAL', () => {
  it('on in both profiles, one issue per group and line', () => {
    for (const profile of [ROMANIAN_PROFILE, GENERIC_PROFILE]) {
      const near = lint(REP, { profile }).filter((i) => i.rule === 'repetitionNear');
      expect(near.map((i) => [i.severity, i.round, i.message, i.paragraph, i.match])).toEqual([
        ['SEMNAL', 'R8b', '⚠ REP L1 «scutul» ×2', 0, 'scutul'],
        ['SEMNAL', 'R8b', '⚠ REP L2 «scutul» ×2', 1, 'Scutul'],
      ]);
    }
  });

  it('never blocking, never autofixed, never in the repair prompt', () => {
    const issues = lint(REP, { profile: ROMANIAN_PROFILE });
    const s = summarize(issues);
    expect(s.SEMNAL).toBe(2);
    expect(s.GRAVE + s.MEDIU).toBe(0);
    expect(autofix(REP)).toBe(REP);
    expect(repairPrompt('x', issues, 'mezzo')).not.toMatch(/REP L/);
    // attention decay never counts signals
    const tail = ['Vântul bate tare. Vântul tace.', 'Râul curge lin. Râul doarme.', 'Focul arde mocnit. Focul moare.'];
    const many = ['Liniște deplină.', 'Seara coboară.', 'Casa așteaptă.', 'Drumul urcă.', 'Lumina scade.', ...tail].map((x) => `<p>${x}</p>`).join('');
    const found = lint(many, { profile: ROMANIAN_PROFILE });
    expect(found.filter((i) => i.severity === 'SEMNAL').length).toBeGreaterThanOrEqual(3);
    expect(found.some((i) => i.rule === 'attentionDecay')).toBe(false);
  });

  it('can be switched off per project', () => {
    const profile = { ...ROMANIAN_PROFILE, rules: { ...ROMANIAN_PROFILE.rules, repetitionNear: false } };
    expect(lint(REP, { profile }).some((i) => i.rule === 'repetitionNear')).toBe(false);
  });
});

describe('round R8b „Cuvântul și litera” (S70)', () => {
  it('comes right after R8', () => {
    const ids = ROUNDS.map((r) => r.id);
    expect(ids.indexOf('R8b')).toBe(ids.indexOf('R8') + 1);
    expect(ROUNDS.find((r) => r.id === 'R8b')).toMatchObject({ title: 'Cuvântul și litera', protocols: 'S70' });
  });

  it('the D:repetitie_apropiata catalog goes only into R8b', () => {
    const ctx = roundContext('R8b', { html: REP });
    expect(ctx).toMatch(/D:repetitie_apropiata/);
    expect(ctx).toMatch(/S70/);
    expect(ctx).toMatch(/⚠ REP L1 «scutul» ×2\n⚠ REP L2 «scutul» ×2/);
    for (const r of ROUNDS.filter((x) => x.id !== 'R8b')) expect(roundContext(r, { html: REP, chapterContext: 'CTX' })).not.toMatch(/REP L|repetitie_apropiata/);
    expect(roundContext('R8b', { html: '<p>Nimic repetat.</p>' })).toBe('');
  });
});

describe('author text in prompts and autofix', () => {
  const html = '<p>un paragraf al autorului cu "ghilimele"  duble.</p><p>alt paragraf  "liber".</p>';
  const H = new Set([hashParagraphs(html)[0].hash]);
  it('autofix skips author paragraphs', () => {
    const out = autofix(html, { skip: (p) => H.has(paragraphHash(p)) });
    expect(out).toBe('<p>un paragraf al autorului cu "ghilimele"  duble.</p><p>Alt paragraf „liber”.</p>');
  });

  it('prompts carry „TEXT AL AUTORULUI (doar semnalezi)” and the neighbour note', () => {
    const authorText = authorParagraphs(html, H);
    const rp = repairPrompt('md', [{ severity: 'GRAVE', round: 'R11', message: 'm', note: 'leagă de textul autorului, fără să-l schimbi' }], 'mezzo', { authorText });
    expect(rp).toMatch(/TEXT AL AUTORULUI \(doar semnalezi\)/);
    expect(rp).toMatch(/L1: un paragraf al autorului/);
    expect(rp).toMatch(/\(leagă de textul autorului, fără să-l schimbi\)/);
    expect(roundPrompt(ROUNDS[0], 'md', '', { authorText })).toMatch(/TEXT AL AUTORULUI/);
    expect(roundPrompt(ROUNDS[0], 'md', '')).not.toMatch(/TEXT AL AUTORULUI/);
  });
});

describe('MODIFICARI_AUTOR.jsonl journal', () => {
  const row = { doc: 'abc123', title: 'Scena', line: 2, old: 'Vechi.', new: 'Nou.', time: '2026-10-24T10:00:00.000Z', hashOld: 'h1', hashNew: 'h2' };

  it('store appends one JSON row per chunk under editorial/', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scribner-aj-'));
    try {
      expect(store.appendAuthorJournal(dir, [row, { ...row, line: 5 }, { ...row, new: row.old }])).toBe(2);
      expect(store.appendAuthorJournal(dir, row)).toBe(1);
      const file = path.join(dir, 'editorial', 'MODIFICARI_AUTOR.jsonl');
      const lines = fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
      expect(lines).toEqual([row, { ...row, line: 5 }, row]);
      fs.appendFileSync(file, '{"broken');
      expect(store.readAuthorJournal(dir, { doc: 'abc123' })).toHaveLength(3);
      expect(store.readAuthorJournal(dir, { doc: 'other' })).toEqual([]);
      expect(() => store.appendAuthorJournal(dir, [{ ...row, doc: '../x' }])).toThrow();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('web and demo APIs keep the rows', async () => {
    const kv = createMemoryKv();
    const web = createWebApi({ kv, channel: null });
    expect(await web.appendAuthorJournal('web:1', [row, { ...row, new: row.old }])).toBe(1);
    expect(await kv.get('aj:web:1')).toEqual([row]);
    const mock = createMockApi();
    expect(await mock.appendAuthorJournal('/demo/x', [row])).toBe(1);
    expect(await mock.readAuthorJournal('/demo/x')).toEqual([row]);
  });

  it('the IPC channel is owner-only and exposed by preload', () => {
    const main = fs.readFileSync(path.resolve('electron/main.cjs'), 'utf8');
    expect(main).toMatch(/handle\('editorial:appendAuthorJournal', \(e, dir, rows\) => \{\s*assertOpened\(dir\);\s*assertOwner\(e\.sender, dir\);/);
    expect(fs.readFileSync(path.resolve('electron/preload.cjs'), 'utf8')).toMatch(/appendAuthorJournal: \(dir, rows\) => call\('editorial:appendAuthorJournal', dir, rows\)/);
  });
});
