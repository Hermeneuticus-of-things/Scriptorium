import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const consult = require('../lib/notebookConsult.cjs');
const batch = require('../lib/aiBatch.cjs');

describe('isEmptyAnswer / classifyAnswer / normVerdict', () => {
  it('treats blanks and "no information" phrases as empty', () => {
    expect(consult.isEmptyAnswer('')).toBe(true);
    expect(consult.isEmptyAnswer('Nu am găsit informații în surse.')).toBe(true);
    expect(consult.isEmptyAnswer('No relevant information in the sources.')).toBe(true);
    expect(consult.isEmptyAnswer("I don't know.")).toBe(true);
    expect(consult.isEmptyAnswer('În jainism, karma este substanță fizică (pudgala).')).toBe(false);
  });

  it('classifies the first verdict word and keeps the reason', () => {
    const c = consult.classifyAnswer('DOCTRINĂ. Sursa confirmă pudgala ca substanță fizică.');
    expect(c.verdict).toBe('DOCTRINA');
    expect(c.reason).toMatch(/pudgala/);
    expect(consult.classifyAnswer('ORNAMENT — doar imagine literară').verdict).toBe('ORNAMENT');
    expect(consult.classifyAnswer('Formularea e INEXACTĂ față de sursă').verdict).toBe('INEXACT');
    expect(consult.classifyAnswer('un răspuns fără etichetă').verdict).toBe('INCERT');
  });
});

describe('interrogate (follow-up loop)', () => {
  it('returns on the first usable answer, round 1', async () => {
    let n = 0;
    const ask = async () => { n++; return { answer: 'Un răspuns clar din surse.', references: [{ source_id: 's1' }], conversationId: 'c1' }; };
    const r = await consult.interrogate({ ask, notebook: 'N', question: 'q?' });
    expect(r.answered).toBe(true);
    expect(r.rounds).toBe(1);
    expect(n).toBe(1);
    expect(r.conversationId).toBe('c1');
  });

  it('asks follow-ups in the same conversation until answered', async () => {
    const seen = [];
    let turn = 0;
    const ask = async ({ question, conversationId }) => {
      seen.push({ question, conversationId });
      turn++;
      if (turn < 3) return { answer: 'Nu am găsit informații.', conversationId: 'c9' };
      return { answer: 'Da: sursele confirmă.', conversationId: 'c9' };
    };
    const r = await consult.interrogate({ ask, notebook: 'N', question: 'prima?', followups: ['a doua?', 'a treia?'], maxRounds: 4 });
    expect(r.answered).toBe(true);
    expect(r.rounds).toBe(3);
    expect(seen[0].question).toBe('prima?');
    expect(seen[1].question).toBe('a doua?');
    // follow-ups continue the same conversation id returned by round 1
    expect(seen[1].conversationId).toBe('c9');
  });

  it('never invents: exhausted loop returns answered:false with the last answer', async () => {
    const ask = async () => ({ answer: 'Nu pot răspunde din surse.' });
    const r = await consult.interrogate({ ask, notebook: 'N', question: 'q?', followups: ['f1'], maxRounds: 3 });
    expect(r.answered).toBe(false);
    expect(r.answer).toMatch(/Nu pot/);
  });

  it('honours a custom isAnswered predicate', async () => {
    let n = 0;
    const ask = async () => { n++; return { answer: n < 2 ? 'scurt' : 'răspuns lung și complet pe surse' }; };
    const r = await consult.interrogate({ ask, notebook: 'N', question: 'q?', followups: ['f1'], isAnswered: (a) => a.length > 10 });
    expect(r.answered).toBe(true);
    expect(n).toBe(2);
  });

  it('stops on an aborted signal', async () => {
    const ask = async () => ({ answer: 'nu' });
    const r = await consult.interrogate({ ask, notebook: 'N', question: 'q?', signal: { aborted: true } });
    expect(r.answered).toBe(false);
    expect(r.rounds).toBe(0);
  });

  it('validates its inputs', async () => {
    await expect(consult.interrogate({ notebook: 'N', question: 'q' })).rejects.toThrow(/ask/);
    await expect(consult.interrogate({ ask: () => {}, question: 'q' })).rejects.toThrow(/notebook/);
    await expect(consult.interrogate({ ask: () => {}, notebook: 'N' })).rejects.toThrow(/question/);
  });
});

describe('consultDoctrine (verdicts + cache + errors)', () => {
  it('produces a verdict per term and caches by content hash', async () => {
    let asks = 0;
    const ask = async ({ question }) => {
      asks++;
      if (/pudgala|depune/.test(question)) return { answer: 'DOCTRINĂ. Sursa: karma e pudgala fizică.', references: [{ source_id: 's1' }] };
      return { answer: 'ORNAMENT, doar imagine.' };
    };
    const cache = batch.createCache(null);
    const items = [{ term: 'karma se depune' }, { term: 'tapiserie' }];
    const first = await consult.consultDoctrine({ items, ask, notebook: 'N', cache });
    expect(first.verdicts.map((v) => v.verdict)).toEqual(['DOCTRINA', 'ORNAMENT']);
    expect(first.verdicts[0].references).toHaveLength(1);
    expect(first.cachedCount).toBe(0);
    const asksAfterFirst = asks;
    const second = await consult.consultDoctrine({ items, ask, notebook: 'N', cache });
    expect(second.cachedCount).toBe(2);
    expect(asks).toBe(asksAfterFirst); // nothing re-asked
  });

  it('marks unanswered consults INCERT (never fabricates a verdict)', async () => {
    const ask = async () => ({ answer: 'Nu am găsit informații în surse.' });
    const { verdicts } = await consult.consultDoctrine({ items: [{ term: 'x' }], ask, notebook: 'N', maxRounds: 2 });
    expect(verdicts[0].verdict).toBe('INCERT');
    expect(verdicts[0].answered).toBe(false);
  });

  it('records per-term errors without failing the batch', async () => {
    const ask = async ({ question }) => { if (/bad/.test(question)) throw new Error('offline'); return { answer: 'DOCTRINĂ, confirmat.' }; };
    const { verdicts, errors } = await consult.consultDoctrine({ items: [{ term: 'bad' }, { term: 'good' }], ask, notebook: 'N', concurrency: 1 });
    expect(errors.bad).toBe('offline');
    expect(verdicts.find((v) => v.term === 'good').verdict).toBe('DOCTRINA');
  });
});

describe('consult (all types, contextual)', () => {
  it('fact: returns the notebook answer and passes context into the question', async () => {
    let asked = '';
    const ask = async ({ question }) => { asked = question; return { answer: 'Anul este 1203, conform sursei.' }; };
    const { results } = await consult.consult({ type: 'fact', items: [{ question: 'În ce an?', context: 'capitolul despre dinastie' }], ask, notebook: 'N' });
    expect(results[0].answer).toMatch(/1203/);
    expect(asked).toMatch(/capitolul despre dinastie/);
  });

  it('consistency: classifies CONSISTENT / CONTRAZICE / INCERT', async () => {
    const ask = async ({ question }) => {
      if (/ochi albaștri/.test(question)) return { answer: 'CONTRAZICE: sursa spune ochi căprui.' };
      return { answer: 'CONSISTENT, se potrivește cu sursa.' };
    };
    const { results } = await consult.consult({
      type: 'consistency', ask, notebook: 'N', concurrency: 1,
      items: [{ claim: 'personajul are ochi albaștri' }, { claim: 'acțiunea e în iarnă' }],
    });
    expect(results[0].verdict).toBe('CONTRAZICE');
    expect(results[1].verdict).toBe('CONSISTENT');
  });

  it('rejects an unknown type', async () => {
    await expect(consult.consult({ type: 'nope', items: [{ term: 'x' }], ask: async () => ({ answer: 'a' }), notebook: 'N' })).rejects.toThrow(/necunoscut/);
  });

  it('results alias verdicts for back-compat', async () => {
    const r = await consult.consult({ items: [{ term: 'x' }], ask: async () => ({ answer: 'DOCTRINĂ, da.' }), notebook: 'N' });
    expect(r.verdicts).toBe(r.results);
  });
});

describe('makeAsk (notebooklm-mcp chat loop)', () => {
  it('uses an inline chat_start answer when there is no task_id', async () => {
    const client = { callTool: async (name) => (name === 'chat_start' ? { answer: 'direct', references: [], conversation_id: 'c1' } : null) };
    const ask = consult.makeAsk({ client });
    const r = await ask({ notebook: 'N', question: 'q' });
    expect(r).toEqual({ answer: 'direct', references: [], conversationId: 'c1' });
  });

  it('polls chat_status for a detached task until completed', async () => {
    let polls = 0;
    const client = {
      callTool: async (name, args) => {
        if (name === 'chat_start') { expect(args.notebook).toBe('N'); return { status: 'started', task_id: 't1' }; }
        polls++;
        if (polls < 2) return { tasks: [{ status: 'pending' }] };
        return { tasks: [{ status: 'completed', answer: 'gata', references: [{ source_id: 's1' }], conversation_id: 'c2' }] };
      },
    };
    const ask = consult.makeAsk({ client, pollMs: 1 });
    const r = await ask({ notebook: 'N', question: 'q' });
    expect(r.answer).toBe('gata');
    expect(r.conversationId).toBe('c2');
    expect(polls).toBe(2);
  });

  it('throws on a failed task', async () => {
    const client = {
      callTool: async (name) => (name === 'chat_start' ? { task_id: 't1' } : { tasks: [{ status: 'failed', error: { message: 'quota' } }] }),
    };
    const ask = consult.makeAsk({ client, pollMs: 1 });
    await expect(ask({ notebook: 'N', question: 'q' })).rejects.toThrow('quota');
  });

  it('passes source_ids and conversation_id through to chat_start', async () => {
    let startArgs;
    const client = { callTool: async (name, args) => { if (name === 'chat_start') { startArgs = args; return { answer: 'ok' }; } } };
    const ask = consult.makeAsk({ client });
    await ask({ notebook: 'N', question: 'q', conversationId: 'c1', sourceIds: ['s1', 's2'] });
    expect(startArgs).toMatchObject({ notebook: 'N', question: 'q', conversation_id: 'c1', source_ids: ['s1', 's2'] });
  });
});
