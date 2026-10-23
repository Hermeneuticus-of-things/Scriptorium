import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const rag = require('../lib/rag.cjs');
const register = require('../electron/ragHandlers.cjs');

const SOURCES = [
  { id: 'a', title: 'Începutul', kind: 'docs', text: 'Era o dimineață rece de octombrie când Andrei și-a închis ușa.' },
  { id: 'b', title: 'Personaj: Andrei', kind: 'research', text: 'Andrei are ochii verzi și a fost profesor de istorie.' },
  { id: 'c', title: 'Drumul', kind: 'docs', text: 'Drumul spre munte era plin de frunze galbene. Un bătrân îi dă o hartă.' },
];

describe('rag', () => {
  it('tokenizes without diacritics, stopwords, with light stemming', () => {
    expect(rag.tokenize('Ochii lui Andrei și ochi')).toEqual(['och', 'andre', 'och']);
  });

  it('ranks the most relevant passage first', () => {
    const idx = rag.createIndex();
    const info = idx.update(SOURCES);
    expect(info.docs).toBe(3);
    const res = idx.query('ochi verzi Andrei');
    expect(res[0].docId).toBe('b');
    expect(res.map((r) => r.docId)).toContain('a');
    expect(idx.query('hartă bătrân')[0].docId).toBe('c');
    expect(idx.query('si de la')).toEqual([]);
  });

  it('filters by kind and caches per concept', () => {
    const idx = rag.createIndex();
    idx.update(SOURCES);
    expect(idx.query('Andrei', { kinds: ['docs'] }).every((r) => r.kind === 'docs')).toBe(true);
    const r1 = idx.query('ochii lui Andrei');
    const r2 = idx.query('Andrei ochi');
    expect(r2).toBe(r1);
  });

  it('rebuild is incremental and drops removed docs', () => {
    const idx = rag.createIndex();
    idx.update(SOURCES);
    expect(idx.update(SOURCES).changed).toBe(0);
    const out = idx.update([SOURCES[0], { ...SOURCES[2], text: 'Altceva acum.' }]);
    expect(out.changed).toBe(2);
    expect(idx.query('verzi')).toEqual([]);
  });

  it('chunks long text with overlap', () => {
    const text = Array.from({ length: 300 }, (_, i) => `w${i}`).join(' ');
    const chunks = rag.chunkText(text, { size: 120, overlap: 30 });
    expect(chunks.length).toBe(3);
    expect(chunks[1].startsWith('w90 ')).toBe(true);
  });

  it('queue runs jobs serially with progress events', async () => {
    const events = [];
    const q = rag.createQueue((e) => events.push(e.state));
    const order = [];
    const a = q.push('a', async (p) => {
      p({ done: 1, total: 1 });
      await new Promise((r) => setTimeout(r, 10));
      order.push('a');
    });
    const b = q.push('b', async () => order.push('b'));
    await Promise.all([a, b]);
    expect(order).toEqual(['a', 'b']);
    expect(events).toContain('progress');
    expect(events.filter((e) => e === 'done').length).toBe(2);
  });

  it('ask injects passages into run()', async () => {
    const idx = rag.createIndex();
    idx.update(SOURCES);
    const run = vi.fn(async ({ text, question }) => ({ text: `ok ${text.includes('verzi')} ${question.includes('[1]')}` }));
    const res = await rag.ask(idx, 'ce ochi are Andrei', run);
    expect(res.answer).toBe('ok true true');
    expect(res.passages[0].docId).toBe('b');
  });

  it('handlers build, query and ask over a store', async () => {
    const handlers = {};
    const docs = { a: '<p>Andrei are ochii verzi.</p>', b: '<p>Munte și frunze.</p>' };
    const store = {
      loadProject: () => ({
        tree: [
          { id: 'draft', root: 'draft', children: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }] },
          { id: 'trash', root: 'trash', children: [{ id: 'x', title: 'X' }] },
        ],
      }),
      walk: (nodes, fn) => nodes.forEach((n) => fn(n)),
      readDoc: (_d, id, kind) => (kind === 'docs' ? docs[id] || '' : ''),
    };
    const sent = [];
    const e = { sender: { isDestroyed: () => false, send: (ch, p) => sent.push([ch, p]) } };
    register({
      handle: (ch, fn) => (handlers[ch] = fn),
      store,
      assertOpened: () => {},
      getSettings: () => ({}),
      getApiKey: () => 'k',
      ai: { runAction: async ({ text }) => ({ text: `R:${text.length > 0}` }) },
    });
    const res = await handlers['rag:query'](e, '/p', 'ochi verzi');
    expect(res[0].docId).toBe('a');
    expect(sent.some(([ch, p]) => ch === 'rag:progress' && p.phase === 'done')).toBe(true);
    const ans = await handlers['rag:ask'](e, '/p', 'ochi');
    expect(ans.answer).toBe('R:true');
  });
});
