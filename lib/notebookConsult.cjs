'use strict';
// NotebookLM interrogation for the editorial / assistant layer.
//
// Models the `karma-nlm-doctrina` agent: when the editor hits a question only the real sources
// can settle ("is «karma se depune» literal doctrine, kept, or ornament to thin out?"), we open
// the project's configured NotebookLM notebook and ask FOLLOW-UP questions until we get a usable
// answer, then use that answer for a doctrinal / consistency verdict.
//
// Pure and injectable: the actual notebook call is `ask({ notebook, question, conversationId,
// sourceIds, signal }) -> { answer, references?, conversationId? }`. Production builds `ask` on
// the notebooklm-mcp client (chat_start + chat_status polling); tests pass a fake. Results are
// cached by content hash so an unchanged question is never paid for twice.
const { hash, createCache, mapLimit } = require('./aiBatch.cjs');

// Phrases a NotebookLM answer uses when it has nothing to say: we treat these as "not answered"
// and either follow up or stop honestly (never invent, exactly like the Karma agent's guard).
const EMPTY_ANSWER = [
  /nu (am|există) (găsit|informați|surse)/i,
  /nu (pot|poate) (răspunde|determina)/i,
  /surse(le)? (nu|nu conțin)/i,
  /\bno (relevant )?(information|sources|answer)\b/i,
  /\bcan('|no)?t (find|answer|determine)\b/i,
  /\bunable to (find|answer|determine)\b/i,
  /\bi (don('|no)?t|do not) (have|know)\b/i,
];

const isEmptyAnswer = (a) => {
  const s = String(a || '').trim();
  return !s || s.length < 3 || EMPTY_ANSWER.some((re) => re.test(s));
};

// Default follow-ups when the first answer is thin: ask the notebook to be concrete and cite.
const DEFAULT_FOLLOWUPS = [
  'Caută în orice sursă din notebook, chiar și o mențiune parțială, și citează pasajul exact.',
  'Dacă sursele chiar nu tratează acest punct, spune clar „sursele nu tranșează acest punct”.',
];

/**
 * Asks a notebook a question and keeps asking follow-ups (in the same conversation) until the
 * answer is usable or the rounds run out. Never fabricates: an exhausted loop returns the last
 * answer with `answered:false`.
 *
 * @param {{ask, notebook, question, followups?, maxRounds?, isAnswered?, sourceIds?, signal?}} o
 * @returns {Promise<{answer, references, conversationId, rounds, answered, history}>}
 */
async function interrogate({ ask, notebook, question, followups, maxRounds = 4, isAnswered, sourceIds, signal } = {}) {
  if (typeof ask !== 'function') throw new Error('interrogate: `ask` lipsește.');
  if (!notebook) throw new Error('interrogate: `notebook` lipsește.');
  if (!String(question || '').trim()) throw new Error('interrogate: `question` lipsește.');
  const answered = isAnswered || ((a) => !isEmptyAnswer(a));
  const queue = (followups && followups.length ? followups : DEFAULT_FOLLOWUPS).slice();
  const history = [];
  let conversationId;
  let last = { answer: '', references: [] };
  let q = question;
  // Round 1 is the question itself; later rounds are follow-ups, capped by maxRounds and the queue.
  for (let round = 1; round <= Math.max(1, maxRounds); round++) {
    if (signal && signal.aborted) break;
    const res = (await ask({ notebook, question: q, conversationId, sourceIds, signal })) || {};
    const answer = String(res.answer || '').trim();
    const references = res.references || [];
    if (res.conversationId) conversationId = res.conversationId;
    history.push({ question: q, answer, references });
    last = { answer, references };
    if (answered(answer)) return { answer, references, conversationId, rounds: round, answered: true, history };
    if (!queue.length) break;
    q = queue.shift();
  }
  return { answer: last.answer, references: last.references, conversationId, rounds: history.length, answered: false, history };
}

// ---------------------------------------------------------------------------
// Doctrinal / consistency consult (the karma-nlm-doctrina job)

const VERDICTS = ['DOCTRINA', 'ORNAMENT', 'INEXACT', 'INCERT'];

function normVerdict(s) {
  const u = String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (u.startsWith('DOCTRIN')) return 'DOCTRINA';
  if (u.startsWith('ORNAMENT')) return 'ORNAMENT';
  if (u.startsWith('INEXACT') || u.startsWith('GRESIT') || u.startsWith('CONTRAZIC')) return 'INEXACT';
  return 'INCERT';
}

const termOf = (item) => String((item && (item.term || item.expression || item.text)) || '').trim();
const ctxOf = (item) => String((item && (item.context || item.passage)) || '').trim();

/** Precise, source-anchored question for one flagged expression (Karma-agent phrasing). */
function doctrineQuestion(item) {
  const term = termOf(item);
  const ctx = ctxOf(item);
  return [
    `În doctrina surselor din notebook, expresia «${term}» descrie mecanismul real / literal al tradiției, sau este doar o imagine literară (ornament)?`,
    ctx ? `Context în care apare: „${ctx}”.` : '',
    'Răspunde cu una dintre: DOCTRINĂ (sursele o confirmă ca mecanism real, se păstrează) / ORNAMENT (sursele nu o susțin ca mecanism, e doar imagine) / INEXACT (formularea contrazice sursele) / INCERT (sursele nu tranșează).',
    'Apoi, într-o propoziție, motivul pe baza sursei, cu citat scurt.',
  ].filter(Boolean).join(' ');
}

// Consult types. Each knows how to turn a flagged item into a source question and how to read the
// answer into a result. `doctrine` gives a keep/thin/fix verdict (the karma-nlm-doctrina job);
// `fact` and `consistency` return the notebook's answer itself for the editor to use.
const CONSULT_TYPES = {
  doctrine: {
    question: doctrineQuestion,
    read: (res) => classifyAnswer(res.answer), // { verdict, reason }
  },
  fact: {
    question: (item) => {
      const q = termOf(item) || String((item && item.question) || '').trim();
      const ctx = ctxOf(item);
      return `Pe baza surselor din notebook, răspunde la: ${q}.${ctx ? ` Context: „${ctx}”.` : ''} Citează pasajul exact; dacă sursele nu conțin răspunsul, spune clar.`;
    },
    read: (res) => ({ answer: res.answer }),
  },
  consistency: {
    question: (item) => {
      const claim = termOf(item) || String((item && item.claim) || '').trim();
      const ctx = ctxOf(item);
      return [
        `Afirmația din manuscris: „${claim}”.${ctx ? ` Context: „${ctx}”.` : ''}`,
        'Este consistentă cu sursele din notebook? Răspunde cu CONSISTENT / CONTRAZICE / INCERT, apoi motivul pe sursă cu citat scurt.',
      ].join(' ');
    },
    read: (res) => {
      const m = String(res.answer || '').match(/\b(CONSISTENT|CONTRAZICE|CONTRADICT|INCERT|INEXACT)\b/i);
      const u = (m ? m[1] : '').toUpperCase();
      const verdict = /^CONSIST/.test(u) ? 'CONSISTENT' : /^CONTRA/.test(u) ? 'CONTRAZICE' : 'INCERT';
      return { verdict, reason: String(res.answer || '').slice(0, 600) };
    },
  },
};

/** Pulls a verdict + reason out of the notebook's free-text answer (first VERDICT word wins). */
function classifyAnswer(answer) {
  const s = String(answer || '');
  const m = s.match(/\b(DOCTRIN[ĂA]?|ORNAMENT|INEXACT|INCERT)\b/i);
  const verdict = m ? normVerdict(m[1]) : 'INCERT';
  // Reason: the sentence after the verdict word, else the whole answer, trimmed.
  let reason = s;
  if (m) reason = s.slice(m.index + m[0].length).replace(/^[\s:.\-–—]+/, '').trim() || s.trim();
  return { verdict, reason: reason.slice(0, 600) };
}

/**
 * Consults the notebook for a batch of flagged, in-context items using the follow-up loop and the
 * content-hash cache. `type` picks what is asked and how the answer is read:
 *   'doctrine'    -> { verdict: DOCTRINA|ORNAMENT|INEXACT|INCERT, reason }
 *   'fact'        -> { answer }
 *   'consistency' -> { verdict: CONSISTENT|CONTRAZICE|INCERT, reason }
 * Each result also carries { term, references, rounds, answered }. An unanswered consult never
 * fabricates a verdict (it falls back to INCERT / empty).
 *
 * @param {{type?, items:{term?,question?,claim?,context?}[], ask, notebook, cache?, maxRounds?,
 *          sourceIds?, concurrency?, onProgress?, signal?, cacheTag?}} o
 * @returns {Promise<{results:[], verdicts:[], errors, cachedCount}>} `verdicts` aliases `results`.
 */
async function consult({ type = 'doctrine', items, ask, notebook, cache, maxRounds = 4, sourceIds, concurrency = 2, onProgress, signal, cacheTag = '' }) {
  const spec = CONSULT_TYPES[type];
  if (!spec) throw new Error(`Tip de consult necunoscut: ${type}`);
  const list = (items || []).filter((it) => it && (termOf(it) || String((it && (it.question || it.claim)) || '').trim()));
  const results = new Array(list.length);
  const errors = {};
  let done = 0;
  let cachedCount = 0;
  if (onProgress && list.length) onProgress({ job: 'nlmConsult', type, done: 0, total: list.length });
  await mapLimit(list, concurrency, async (item, i) => {
    const term = termOf(item) || String((item.question || item.claim) || '').trim();
    // Cache key: type + notebook + term + context + follow-up budget (+ a tag for the notebook id).
    const key = hash('nlmConsult', type, String(notebook), term, ctxOf(item), String(maxRounds), cacheTag);
    try {
      const hit = cache && cache.get(key);
      if (hit !== undefined) {
        results[i] = hit;
        cachedCount++;
      } else {
        const res = await interrogate({ ask, notebook, question: spec.question(item), maxRounds, sourceIds, signal });
        const read = res.answered ? spec.read(res) : { verdict: 'INCERT', reason: '', answer: res.answer };
        results[i] = { term, ...read, references: res.references || [], rounds: res.rounds, answered: res.answered };
        if (cache) cache.set(key, results[i]);
      }
    } catch (err) {
      if (signal && signal.aborted) return;
      errors[term] = err.message || String(err);
      results[i] = { term, verdict: 'INCERT', reason: '', answer: '', references: [], rounds: 0, answered: false, error: errors[term] };
    }
    done++;
    if (onProgress) onProgress({ job: 'nlmConsult', type, done, total: list.length, term });
  }, signal, { stopOnAbort: true });
  const out = results.filter(Boolean);
  return { results: out, verdicts: out, errors, cachedCount, cancelled: Boolean(signal && signal.aborted) };
}

/** The karma-nlm-doctrina job: a doctrinal keep/thin/fix verdict per flagged expression. */
function consultDoctrine(opts) {
  return consult({ ...opts, type: 'doctrine' });
}

// ---------------------------------------------------------------------------
// Production `ask`: drives the notebooklm-mcp chat loop through an MCP client.
//
// `client` is a lib/notebookLmClient.cjs client (callTool). Large notebooks take 1–3 minutes, so
// we use the detached pattern: chat_start returns a task_id, then we poll chat_status until the
// task completes. One `ask` call = one notebook turn; `interrogate` chains them with follow-ups.

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  if (signal && signal.aborted) return reject(new Error('Operație anulată.'));
  const t = setTimeout(resolve, ms);
  if (signal) signal.addEventListener('abort', () => { clearTimeout(t); reject(new Error('Operație anulată.')); }, { once: true });
});

/**
 * @param {{client, pollMs?, maxWaitMs?}} o - client from lib/notebookLmClient.cjs.
 * @returns ask(...) suitable for interrogate / consultDoctrine.
 */
function makeAsk({ client, pollMs = 4000, maxWaitMs = 5 * 60 * 1000 } = {}) {
  if (!client || typeof client.callTool !== 'function') throw new Error('makeAsk: client MCP lipsește.');
  return async ({ notebook, question, conversationId, sourceIds, signal }) => {
    const startArgs = { notebook, question };
    if (conversationId) startArgs.conversation_id = conversationId;
    if (sourceIds && sourceIds.length) startArgs.source_ids = sourceIds;
    const started = await client.callTool('chat_start', startArgs);
    const taskId = started && (started.task_id || started.taskId);
    // Some servers answer chat_start inline (already a payload with an answer): use it directly.
    if (!taskId) return toAnswer(started, conversationId);
    const deadline = Date.now() + maxWaitMs;
    for (;;) {
      if (signal && signal.aborted) throw new Error('Operație anulată.');
      const st = await client.callTool('chat_status', { task_id: taskId });
      const task = Array.isArray(st && st.tasks) ? st.tasks[0] : st;
      const status = task && task.status;
      if (status === 'completed') return toAnswer(task, conversationId);
      if (status === 'failed') throw new Error((task.error && task.error.message) || 'Întrebarea către notebook a eșuat.');
      if (status === 'unknown') throw new Error('Întrebarea către notebook a expirat.');
      if (Date.now() > deadline) throw new Error('Notebook-ul nu a răspuns la timp.');
      await sleep(pollMs, signal);
    }
  };
}

function toAnswer(payload, conversationId) {
  if (payload == null) return { answer: '', references: [], conversationId };
  if (typeof payload === 'string') return { answer: payload, references: [], conversationId };
  return {
    answer: String(payload.answer || ''),
    references: payload.references || payload.citations || [],
    conversationId: payload.conversation_id || payload.conversationId || conversationId,
  };
}

module.exports = {
  VERDICTS,
  CONSULT_TYPES,
  isEmptyAnswer,
  normVerdict,
  classifyAnswer,
  doctrineQuestion,
  interrogate,
  consult,
  consultDoctrine,
  makeAsk,
  createCache, // re-export for handlers
};
