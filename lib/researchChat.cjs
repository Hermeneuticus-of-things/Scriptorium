'use strict';
// Research conversation (NotebookLM-style) over the project's own sources:
// - source scope: which kinds (manuscript / research / notes) and which folders or documents
//   the AI may use;
// - follow-ups: the last turns of the conversation go into the prompt (token-budgeted) and the
//   previous question helps retrieval, so „și în capitolul 3?” works;
// - suggested follow-up questions come in the same AI answer, after a marked heading;
// - conversations are saved per project in research-chats.json (next to project.json).
// Pure functions except readChats/writeChats/fileToSource (disk); the AI call is injected.
const fs = require('fs');
const path = require('path');

const CHATS_FILE = 'research-chats.json';
const MAX_CHATS = 30;
const MAX_TURNS = 100;
const FOLLOWUP_HEADING = '### Întrebări de continuare';
const FOLLOWUP_RE = /^[ \t]*(?:#{1,4}[ \t]*)?\**[ \t]*(?:Întrebări de continuare|Intrebari de continuare|Follow-up questions|Suggested questions)[ \t]*\**[ \t]*:?[ \t]*\**[ \t]*$/im;
const DEFAULT_SCOPE = Object.freeze({ kinds: ['research', 'notes'], ids: [] });

const estimateTokens = (s) => Math.ceil(String(s || '').length / 4);

/** Normalized scope: known kinds, string ids; an empty scope means the whole project. */
function normalizeScope(scope) {
  const s = scope || DEFAULT_SCOPE;
  const kinds = [...new Set((Array.isArray(s.kinds) ? s.kinds : []).filter((k) => ['docs', 'research', 'notes'].includes(k)))];
  const ids = [...new Set((Array.isArray(s.ids) ? s.ids : []).map(String).filter(Boolean))].slice(0, 500);
  return { kinds, ids };
}

/** docId -> ids of its ancestor folders (and itself), from the binder tree. */
function ancestorMap(tree) {
  const map = new Map();
  const visit = (nodes, trail) => {
    for (const n of nodes || []) {
      if (n.root === 'trash') continue;
      const own = [...trail, n.id];
      map.set(n.id, own);
      visit(n.children, own);
    }
  };
  visit(tree, []);
  return map;
}

/**
 * Predicate over index passages ({ docId, kind }) for a scope. A passage is allowed when its kind
 * is ticked, or when its document (or a folder above it) is ticked. Notes of a ticked document
 * count as that document. Empty scope: everything.
 */
function scopeFilter(tree, scope) {
  const { kinds, ids } = normalizeScope(scope);
  if (!kinds.length && !ids.length) return null;
  const anc = ancestorMap(tree);
  const idSet = new Set(ids);
  return (p) => {
    if (kinds.includes(p.kind)) return true;
    if (!idSet.size) return false;
    return (anc.get(p.docId) || [p.docId]).some((id) => idSet.has(id));
  };
}
const scopeKey = (scope) => {
  const { kinds, ids } = normalizeScope(scope);
  return `${kinds.sort().join(',')}|${ids.sort().join(',')}`;
};

/** Retrieval text for a follow-up: the new question plus the previous one for context. */
function retrievalQueries(question, history = []) {
  const prev = history.length ? history[history.length - 1].q : '';
  const q = String(question || '').trim();
  return prev ? [q, `${q} ${prev}`] : [q];
}

/** Passages for a question: the question's own hits first, then hits with the previous question. */
function retrieve(index, question, history, { k = 6, filter = null, filterKey = '' } = {}) {
  const seen = new Set();
  const out = [];
  for (const q of retrievalQueries(question, history)) {
    for (const p of index.query(q, { k: k * 2, filter, filterKey })) {
      const key = `${p.kind}:${p.docId}:${p.chunk}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    if (out.length >= k) break;
  }
  return out.slice(0, k);
}

const stripCites = (s) => String(s || '').replace(/\s?\[\d+(?:\s*[,;]\s*\d+)*\]/g, '');

/**
 * The last turns that fit the budget, oldest first. The newest turn is always kept (its answer
 * shortened if needed) so a follow-up never loses its immediate context.
 */
function trimHistory(turns, { maxTurns = 6, budgetTokens = 3000 } = {}) {
  const src = (turns || []).filter((t) => t && t.q).slice(-maxTurns);
  const out = [];
  let used = 0;
  for (let i = src.length - 1; i >= 0; i--) {
    const q = String(src[i].q);
    let a = stripCites(src[i].answer);
    const cost = estimateTokens(q) + estimateTokens(a) + 8;
    if (used + cost > budgetTokens) {
      if (out.length) break;
      const room = Math.max(0, (budgetTokens - estimateTokens(q) - 8) * 4);
      a = room > 20 ? `${a.slice(0, room - 1)}…` : '';
    }
    used += estimateTokens(q) + estimateTokens(a) + 8;
    out.unshift({ q, answer: a });
  }
  return out;
}

/**
 * { text, question } for lib/ai.cjs runAction('ask'): numbered passages as text, instructions,
 * the trimmed conversation, the follow-up heading and the question.
 */
function buildChatPrompt(question, passages, history = [], { maxTurns = 6, budgetTokens = 3000, followups = true } = {}) {
  const ctx = passages.map((p, i) => `[${i + 1}] (${p.title || p.docId})\n${p.text}`).join('\n\n');
  const past = trimHistory(history, { maxTurns, budgetTokens });
  const parts = [
    'Răspunde la întrebarea autorului folosind DOAR pasajele numerotate din proiect. ' +
      'Citează sursele ca [1], [2] imediat după afirmația pe care o susțin. Dacă pasajele nu conțin răspunsul, spune asta.',
  ];
  if (past.length) {
    parts.push(
      'Conversația de până acum (doar pentru context; numerele de citare de atunci nu mai sunt valabile, citează numai pasajele de acum):\n' +
        past.map((t) => `Autor: ${t.q}\nAsistent: ${t.answer}`).join('\n\n'),
    );
  }
  if (followups) {
    parts.push(`La sfârșit, pe un rând separat, scrie exact „${FOLLOWUP_HEADING}” și dedesubt 2-3 întrebări scurte de continuare, câte una pe rând, fiecare începând cu „- ”.`);
  }
  parts.push(`Întrebare: ${String(question || '').trim()}`);
  return { text: ctx, question: parts.join('\n\n'), history: past };
}

/** Splits the AI text into the answer and the suggested follow-up questions (max 3). */
function parseFollowups(text) {
  const s = String(text || '');
  const m = FOLLOWUP_RE.exec(s);
  if (!m) return { answer: s.trim(), followups: [] };
  const answer = s.slice(0, m.index).replace(/\n[-*_\s]*$/, '').trim();
  const followups = [];
  for (const line of s.slice(m.index + m[0].length).split('\n')) {
    const item = line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
    if (!item || item === line.trim() && !/[?]$/.test(item)) continue;
    if (!followups.includes(item)) followups.push(item.slice(0, 200));
    if (followups.length === 3) break;
  }
  return { answer, followups };
}

/** Passage numbers cited in the answer, in order of first use, within 1..count. */
function citedNumbers(answer, count) {
  const out = [];
  for (const m of String(answer || '').matchAll(/\[(\d+(?:\s*[,;]\s*\d+)*)\]/g)) {
    for (const x of m[1].split(/[,;]/)) {
      const n = Number(x.trim());
      if (n >= 1 && n <= count && !out.includes(n)) out.push(n);
    }
  }
  return out;
}

const NO_PASSAGES = 'Nu am găsit pasaje relevante în sursele alese. Bifează mai multe surse sau reformulează întrebarea.';

/**
 * One conversation turn. run({ text, question }) -> { text, provider?, model? }.
 * Returns the turn to save: { q, answer, followups, passages, cited, at, provider, model }.
 */
async function askChat({ index, question, history = [], run, k = 6, filter = null, filterKey = '', maxTurns, budgetTokens }) {
  const q = String(question || '').trim();
  const passages = retrieve(index, q, history, { k, filter, filterKey });
  const base = { q, at: new Date().toISOString() };
  if (!passages.length) return { ...base, answer: NO_PASSAGES, followups: [], passages: [], cited: [] };
  const res = await run(buildChatPrompt(q, passages, history, { maxTurns, budgetTokens }));
  const raw = res && typeof res.text === 'string' ? res.text : String(res || '');
  const { answer, followups } = parseFollowups(raw);
  return {
    ...base,
    answer,
    followups,
    passages: passages.map((p) => ({ docId: p.docId, title: p.title, kind: p.kind, chunk: p.chunk, text: p.text.slice(0, 1200) })),
    cited: citedNumbers(answer, passages.length),
    provider: (res && res.provider) || '',
    model: (res && res.model) || '',
  };
}

// --- persistence (one JSON file per project) ---

const chatsFile = (dir) => path.join(dir, CHATS_FILE);

function readChats(dir) {
  try {
    const data = JSON.parse(fs.readFileSync(chatsFile(dir), 'utf8'));
    return { version: 1, chats: Array.isArray(data.chats) ? data.chats.filter((c) => c && c.id && Array.isArray(c.turns)) : [] };
  } catch {
    return { version: 1, chats: [] };
  }
}

function writeChats(dir, data) {
  const file = chatsFile(dir);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ version: 1, chats: data.chats || [] }, null, 1));
  fs.renameSync(tmp, file);
  return file;
}

const newChatId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Adds a turn to chat `chatId` (or a new chat); newest chat first; caps chats and turns. */
function addTurn(data, chatId, turn, scope) {
  const chats = [...(data.chats || [])];
  let i = chatId ? chats.findIndex((c) => c.id === chatId) : -1;
  const now = turn.at || new Date().toISOString();
  let chat;
  if (i < 0) {
    chat = { id: chatId || newChatId(), title: String(turn.q).slice(0, 80), created: now, turns: [] };
  } else {
    chat = { ...chats[i], turns: [...chats[i].turns] };
    chats.splice(i, 1);
  }
  chat.turns.push(turn);
  if (chat.turns.length > MAX_TURNS) chat.turns = chat.turns.slice(-MAX_TURNS);
  chat.updated = now;
  if (scope) chat.scope = normalizeScope(scope);
  chats.unshift(chat);
  return { data: { version: 1, chats: chats.slice(0, MAX_CHATS) }, chat };
}

function deleteChat(data, chatId) {
  return { version: 1, chats: (data.chats || []).filter((c) => c.id !== chatId) };
}

// --- importing files as sources ---

const SOURCE_EXTS = ['.pdf', '.docx', '.txt', '.md', '.markdown', '.html', '.htm', '.rtf', '.odt'];
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Plain text -> paragraphs (blank lines separate paragraphs, single newlines become <br>). */
function textToSourceHtml(text) {
  const paras = String(text || '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return paras.map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('') || '<p></p>';
}

/** { title, html, empty } for one file; PDF via lib/pdfText.cjs, the rest via the importers. */
async function fileToSource(file) {
  const ext = path.extname(file).toLowerCase();
  const title = path.basename(file).replace(/\.[^.]+$/, '');
  if (ext === '.pdf') {
    const text = require('./pdfText.cjs').pdfToText(fs.readFileSync(file));
    return { title, html: textToSourceHtml(text), empty: !text.trim() };
  }
  const html = await require('./importers.cjs').fileToHtml(file);
  return { title, html, empty: !String(html).replace(/<[^>]+>/g, '').trim() };
}

module.exports = {
  CHATS_FILE,
  FOLLOWUP_HEADING,
  DEFAULT_SCOPE,
  SOURCE_EXTS,
  estimateTokens,
  normalizeScope,
  ancestorMap,
  scopeFilter,
  scopeKey,
  retrievalQueries,
  retrieve,
  trimHistory,
  buildChatPrompt,
  parseFollowups,
  citedNumbers,
  askChat,
  readChats,
  writeChats,
  addTurn,
  deleteChat,
  textToSourceHtml,
  fileToSource,
};
