// Research conversation (NotebookLM-like): prompt with history and budget, source scope,
// citation and follow-up parsing, persistence, the rag:chat handler, PDF text and the
// renderer's note/insert/copy HTML.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { visibleAnswer, turnToNoteHtml, turnToInsertHtml, turnToPlain, scopeChips, toggleScope, DEFAULT_SCOPE } from '../src/lib/researchChat.js';

const require = createRequire(import.meta.url);
const rc = require('../lib/researchChat.cjs');
const rag = require('../lib/rag.cjs');
const { pdfToText } = require('../lib/pdfText.cjs');
const register = require('../electron/ragHandlers.cjs');

const TREE = [
  { id: 'draft', root: 'draft', children: [
    { id: 'ch1', type: 'folder', title: 'Capitolul 1', children: [{ id: 's1', type: 'text', title: 'Scena 1' }] },
    { id: 'ch3', type: 'folder', title: 'Capitolul 3', children: [{ id: 's3', type: 'text', title: 'Scena 3' }] },
  ] },
  { id: 'research', root: 'research', children: [{ id: 'r1', type: 'text', title: 'Istoria orașului' }] },
  { id: 'trash', root: 'trash', children: [{ id: 't1', type: 'text', title: 'Șters' }] },
];
const SOURCES = [
  { id: 's1', title: 'Scena 1', kind: 'docs', text: 'Andrei are ochii verzi și privește marea.' },
  { id: 's3', title: 'Scena 3', kind: 'docs', text: 'În capitolul trei Andrei are ochii obosiți de drum.' },
  { id: 'r1', title: 'Istoria orașului', kind: 'research', text: 'Orașul a fost fondat în 1400 pe malul râului. Andrei e un nume frecvent.' },
  { id: 's1', title: 'Scena 1 (note)', kind: 'notes', text: 'Verifică ochii lui Andrei în scena 1.' },
];
const indexOf = () => {
  const idx = rag.createIndex();
  idx.update(SOURCES);
  return idx;
};

describe('prompt with history and budget', () => {
  const turns = Array.from({ length: 10 }, (_, i) => ({ q: `întrebarea ${i}`, answer: `răspunsul ${i} [1]` }));

  it('keeps the last N turns, oldest first, without old citation numbers', () => {
    const h = rc.trimHistory(turns, { maxTurns: 3, budgetTokens: 10000 });
    expect(h.map((t) => t.q)).toEqual(['întrebarea 7', 'întrebarea 8', 'întrebarea 9']);
    expect(h[2].answer).toBe('răspunsul 9');
  });

  it('drops older turns that exceed the token budget but always keeps the newest', () => {
    const long = [{ q: 'veche', answer: 'x'.repeat(4000) }, { q: 'nouă', answer: 'y'.repeat(4000) }];
    const h = rc.trimHistory(long, { maxTurns: 6, budgetTokens: 300 });
    expect(h.map((t) => t.q)).toEqual(['nouă']);
    expect(rc.estimateTokens(h[0].q + h[0].answer)).toBeLessThanOrEqual(300);
    expect(h[0].answer.endsWith('…')).toBe(true);
  });

  it('builds numbered passages, the conversation, the follow-up heading and the question', () => {
    const passages = [{ docId: 'a', title: 'A', text: 'pasaj a' }, { docId: 'b', title: 'B', text: 'pasaj b' }];
    const p = rc.buildChatPrompt('și în capitolul 3?', passages, [{ q: 'ce ochi are Andrei?', answer: 'Verzi [1].' }]);
    expect(p.text).toBe('[1] (A)\npasaj a\n\n[2] (B)\npasaj b');
    expect(p.question).toContain('Autor: ce ochi are Andrei?\nAsistent: Verzi.');
    expect(p.question).toContain(rc.FOLLOWUP_HEADING);
    expect(p.question.trim().endsWith('Întrebare: și în capitolul 3?')).toBe(true);
    expect(rc.buildChatPrompt('q', passages, []).question).not.toContain('Conversația de până acum');
  });

  it('retrieval uses the previous question for a follow-up', () => {
    expect(rc.retrievalQueries('și în capitolul 3?', [{ q: 'ochii lui Andrei' }])).toEqual(['și în capitolul 3?', 'și în capitolul 3? ochii lui Andrei']);
    const idx = indexOf();
    // "capitol trei" alone matches only s3; with the previous question Andrei's other passages follow.
    const res = rc.retrieve(idx, 'capitolul trei', [{ q: 'ochii lui Andrei' }], { k: 4 });
    expect(res[0].docId).toBe('s3');
    expect(res.length).toBeGreaterThan(1);
  });
});

describe('source scope', () => {
  it('defaults to research + notes and filters passages by kind', () => {
    const f = rc.scopeFilter(TREE, rc.DEFAULT_SCOPE);
    const res = indexOf().query('Andrei', { k: 10, filter: f });
    expect(new Set(res.map((r) => r.kind))).toEqual(new Set(['research', 'notes']));
  });

  it('a ticked folder allows the documents inside it', () => {
    const f = rc.scopeFilter(TREE, { kinds: [], ids: ['ch3'] });
    const res = indexOf().query('Andrei ochi', { k: 10, filter: f });
    expect(res.map((r) => r.docId)).toEqual(['s3']);
    expect(f({ docId: 's1', kind: 'docs' })).toBe(false);
    expect(f({ docId: 't1', kind: 'docs' })).toBe(false);
  });

  it('empty scope means everything; unknown kinds are dropped', () => {
    expect(rc.scopeFilter(TREE, { kinds: [], ids: [] })).toBeNull();
    expect(rc.normalizeScope({ kinds: ['docs', 'bogus', 'docs'], ids: ['a', '', 'a'] })).toEqual({ kinds: ['docs'], ids: ['a'] });
  });

  it('renderer chips and toggles', () => {
    const chips = scopeChips(DEFAULT_SCOPE, () => '', { research: 'Cercetare', notes: 'Note' });
    expect(chips.map((c) => c.label)).toEqual(['Cercetare', 'Note']);
    const s = toggleScope(toggleScope(DEFAULT_SCOPE, 'kind', 'notes'), 'id', 'ch3');
    expect(s).toEqual({ kinds: ['research'], ids: ['ch3'] });
    expect(DEFAULT_SCOPE.kinds).toEqual(['research', 'notes']);
    expect(scopeChips(s, (id) => (id === 'ch3' ? 'Capitolul 3' : ''), {})[1].label).toBe('Capitolul 3');
  });
});

describe('citations and follow-ups', () => {
  it('cited numbers in order of use, within range', () => {
    expect(rc.citedNumbers('A [2]. B [1, 3]. C [9]. D [2]', 3)).toEqual([2, 1, 3]);
    expect(rc.citedNumbers('fără citări', 3)).toEqual([]);
  });

  it('splits the follow-up section from the answer', () => {
    const r = rc.parseFollowups('Andrei are ochii verzi [1].\n\n### Întrebări de continuare\n- Ce culoare are părul lui?\n- Unde apare marea?\n- A treia?\n- A patra?');
    expect(r.answer).toBe('Andrei are ochii verzi [1].');
    expect(r.followups).toEqual(['Ce culoare are părul lui?', 'Unde apare marea?', 'A treia?']);
  });

  it('accepts variants of the heading and numbered lists; no heading means no follow-ups', () => {
    expect(rc.parseFollowups('Text.\n**Întrebări de continuare:**\n1. Unu?\n2) Doi?').followups).toEqual(['Unu?', 'Doi?']);
    expect(rc.parseFollowups('Answer.\n## Follow-up questions\n* One?').followups).toEqual(['One?']);
    expect(rc.parseFollowups('Doar răspuns [1].')).toEqual({ answer: 'Doar răspuns [1].', followups: [] });
  });

  it('streamed text hides the follow-up section and a half-written heading', () => {
    expect(visibleAnswer('Răspuns [1].\n\n### Întrebări de continuare\n- X?')).toBe('Răspuns [1].');
    expect(visibleAnswer('Răspuns [1].\n\n### Între')).toBe('Răspuns [1].');
    expect(visibleAnswer('Răspuns parțial')).toBe('Răspuns parțial');
  });
});

describe('askChat', () => {
  it('passes the history to the AI and returns the turn with follow-ups and citations', async () => {
    let seen;
    const run = async (p) => {
      seen = p;
      return { text: 'În capitolul 3 ochii sunt obosiți [1].\n### Întrebări de continuare\n- De ce?', provider: 'Test', model: 'm' };
    };
    const turn = await rc.askChat({ index: indexOf(), question: 'și în capitolul trei?', history: [{ q: 'ochii lui Andrei', answer: 'Verzi [1].' }], run });
    expect(seen.question).toContain('Autor: ochii lui Andrei');
    expect(turn.answer).toBe('În capitolul 3 ochii sunt obosiți [1].');
    expect(turn.followups).toEqual(['De ce?']);
    expect(turn.cited).toEqual([1]);
    expect(turn.passages[0]).toMatchObject({ docId: 's3', title: 'Scena 3' });
  });

  it('no passages: no AI call', async () => {
    let called = false;
    const turn = await rc.askChat({ index: indexOf(), question: 'zzzz', run: async () => { called = true; return { text: '' }; } });
    expect(called).toBe(false);
    expect(turn.passages).toEqual([]);
    expect(turn.answer).toMatch(/Nu am găsit/);
  });
});

describe('chat persistence', () => {
  const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'rchat-'));

  it('adds turns, keeps the newest chat first and survives a reload from disk', () => {
    const dir = tmp();
    let data = rc.readChats(dir);
    expect(data.chats).toEqual([]);
    const a = rc.addTurn(data, null, { q: 'prima', answer: 'r1', at: '2026-01-01T00:00:00Z' }, { kinds: ['notes'] });
    const b = rc.addTurn(a.data, null, { q: 'altă conversație', answer: 'r', at: '2026-01-02T00:00:00Z' });
    const c = rc.addTurn(b.data, a.chat.id, { q: 'continuare', answer: 'r2', at: '2026-01-03T00:00:00Z' });
    rc.writeChats(dir, c.data);
    data = rc.readChats(dir);
    expect(data.chats.map((x) => x.title)).toEqual(['prima', 'altă conversație']);
    expect(data.chats[0].turns.map((t) => t.q)).toEqual(['prima', 'continuare']);
    expect(data.chats[0].scope).toEqual({ kinds: ['notes'], ids: [] });
    expect(rc.deleteChat(data, a.chat.id).chats.map((x) => x.title)).toEqual(['altă conversație']);
  });

  it('a damaged file reads as empty', () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, rc.CHATS_FILE), '{nu e json');
    expect(rc.readChats(dir).chats).toEqual([]);
  });

  it('rag:chat handler: follow-up gets history, streams deltas, saves the chat', async () => {
    const dir = tmp();
    const handlers = {};
    const docs = { s1: '<p>Andrei are ochii verzi.</p>', s3: '<p>În capitolul trei Andrei e obosit.</p>', r1: '<p>Andrei, nume frecvent.</p>' };
    const store = {
      loadProject: () => ({ tree: TREE }),
      walk: (nodes, fn) => {
        const v = (ns) => ns.forEach((n) => { fn(n); v(n.children || []); });
        v(nodes);
      },
      readDoc: (_d, id, kind) => (kind === 'docs' ? docs[id] || '' : ''),
    };
    const sent = [];
    const prompts = [];
    const e = { sender: { id: 7, isDestroyed: () => false, send: (ch, p) => sent.push([ch, p]) } };
    register({
      handle: (ch, fn) => (handlers[ch] = fn),
      store,
      assertOpened: () => {},
      getSettings: () => ({}),
      getApiKey: () => 'k',
      ai: {},
      makeRun: ({ onDelta }) => async (p) => {
        prompts.push(p);
        if (onDelta) onDelta('Răs');
        return { text: `Răspuns ${prompts.length} [1].\n### Întrebări de continuare\n- Altceva?` };
      },
    });
    const scope = { kinds: [], ids: ['draft'] };
    const one = await handlers['rag:chat'](e, dir, 'ochii lui Andrei', { scope, runId: 'r1' });
    expect(one.turn.followups).toEqual(['Altceva?']);
    expect(sent.some(([ch, p]) => ch === 'ai:delta' && p.runId === 'r1' && p.delta === 'Răs')).toBe(true);
    const two = await handlers['rag:chat'](e, dir, 'și în capitolul trei?', { chatId: one.chat.id, scope });
    expect(prompts[1].question).toContain('Autor: ochii lui Andrei');
    expect(two.chat.turns).toHaveLength(2);
    expect(two.turn.passages.every((p) => p.kind === 'docs')).toBe(true);
    const saved = await handlers['rag:chats'](e, dir);
    expect(saved[0].turns.map((t) => t.q)).toEqual(['ochii lui Andrei', 'și în capitolul trei?']);
    await handlers['rag:chatDelete'](e, dir, one.chat.id);
    expect(await handlers['rag:chats'](e, dir)).toEqual([]);
    // rag:query honours the same scope (only research)
    const q = await handlers['rag:query'](e, dir, 'Andrei', { scope: { kinds: ['research'], ids: [] } });
    expect(q.map((r) => r.docId)).toEqual(['r1']);
  });

  it('rag:chat refuses with AI off', async () => {
    const handlers = {};
    register({ handle: (ch, fn) => (handlers[ch] = fn), store: {}, assertOpened: () => {}, getSettings: () => ({ aiEnabled: false }), getApiKey: () => '', ai: {} });
    await expect(handlers['rag:chat']({ sender: { id: 1 } }, '/p', 'x', {})).rejects.toThrow(/oprite/);
  });
});

describe('importing sources', () => {
  const makePdf = (content, flate = true) => {
    const data = flate ? zlib.deflateSync(Buffer.from(content, 'latin1')) : Buffer.from(content, 'latin1');
    return Buffer.concat([
      Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Length ${data.length}${flate ? ' /Filter /FlateDecode' : ''} >>\nstream\n`, 'latin1'),
      data,
      Buffer.from('\nendstream\nendobj\n%%EOF\n', 'latin1'),
    ]);
  };

  it('extracts text from a compressed PDF content stream', () => {
    const pdf = makePdf('BT /F1 12 Tf 72 700 Td (Orasul a fost fondat) Tj 0 -14 Td [(in anul ) -300 (1400.)] TJ ET');
    expect(pdfToText(pdf)).toBe('Orasul a fost fondat\nin anul 1400.');
  });

  it('handles escapes, hex strings and uncompressed streams; non-PDF gives empty text', () => {
    expect(pdfToText(makePdf('BT (a\\(b\\) c\\101) Tj <0048006900> Tj ET', false))).toBe('a(b) cAHi');
    expect(pdfToText(Buffer.from('nu e pdf'))).toBe('');
  });

  it('fileToSource: PDF, text and markdown files become research documents', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsrc-'));
    fs.writeFileSync(path.join(dir, 'Carte.pdf'), makePdf('BT (Text din PDF) Tj ET'));
    fs.writeFileSync(path.join(dir, 'Note.txt'), 'Primul paragraf.\n\nAl doilea.');
    fs.writeFileSync(path.join(dir, 'Gol.pdf'), makePdf('q 1 0 0 1 0 0 cm Q'));
    const pdf = await rc.fileToSource(path.join(dir, 'Carte.pdf'));
    expect(pdf).toEqual({ title: 'Carte', html: '<p>Text din PDF</p>', empty: false });
    const txt = await rc.fileToSource(path.join(dir, 'Note.txt'));
    expect(txt.title).toBe('Note');
    expect(txt.html).toContain('Al doilea');
    expect((await rc.fileToSource(path.join(dir, 'Gol.pdf'))).empty).toBe(true);
    expect(rc.textToSourceHtml('a <b>\nc\n\nd')).toBe('<p>a &lt;b&gt;<br>c</p><p>d</p>');
  });
});

describe('using answers (renderer HTML)', () => {
  const turn = {
    q: 'Ce ochi are Andrei?',
    answer: 'Verzi [1], obosiți mai târziu [2].\n\nAltă idee [1, 2] și [7].',
    passages: [{ docId: 's1', title: 'Scena 1', text: 'Andrei are ochii verzi.' }, { docId: 's3', title: 'Scena <3>', text: 'obosiți' }],
  };

  it('note: question, answer with document links, sources list', () => {
    const html = turnToNoteHtml(turn);
    expect(html.startsWith('<h2>Ce ochi are Andrei?</h2><p>Verzi <a href="scribner://doc/s1">[1]</a>')).toBe(true);
    expect(html).toContain('<a href="scribner://doc/s1">[1]</a><a href="scribner://doc/s3">[2]</a>');
    expect(html).toContain('[7]'); // out of range stays as text
    expect(html).toContain('<h3>Surse</h3><ol><li><a href="scribner://doc/s1">Scena 1</a> — „Andrei are ochii verzi.”</li>');
    expect(html).toContain('Scena &lt;3&gt;');
  });

  it('insert: citations as footnotes or links', () => {
    const fn = turnToInsertHtml(turn);
    expect(fn).toContain('<span class="footnote" data-footnote="Scena 1: „Andrei are ochii verzi.”"></span>');
    expect(fn.match(/data-footnote/g)).toHaveLength(4);
    expect(turnToInsertHtml(turn, 'links')).toContain('<a href="scribner://doc/s3">[2]</a>');
  });

  it('copy: answer then numbered sources', () => {
    expect(turnToPlain(turn)).toBe(`${turn.answer}\n\nSurse:\n[1] Scena 1\n[2] Scena <3>`);
  });
});
