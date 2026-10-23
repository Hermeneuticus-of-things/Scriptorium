'use strict';
// Local retrieval for the research panel (NotebookLM-style): chunked BM25 index over
// the project's docs, notes and research items. No AI is needed for retrieval; the
// optional "answer" step takes an injected run(prompt) function.
//
// - Index is incremental: chunks are cached per document by content hash, so a
//   rebuild only re-tokenizes what changed.
// - Query results are cached per "concept" (sorted, normalized query terms), so
//   "Andrei ochi" and "ochii lui Andrei" share one cache entry.
// - createQueue() serializes build/ask jobs and reports progress.
const crypto = require('crypto');

const STOP = new Set(
  ('a ai al ale alt am ar are as asa au avea c ca cand care ce cel cea cei cele ci cu cum da daca dar de deci din dintre' +
    ' doar dupa e ea el ei ele era este eu fi fie fost i iar il in inca insa intr intre isi la le lor lui m mai ma me mi mult' +
    ' n ne ni nici nu o or ori pe pentru prin s sa sau se si sunt s-a ta te ti tu un una unei unui unor va vor' +
    ' the and of to in is it that for on with as was at by an be this are from or').split(/\s+/),
);

function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Light Romanian/English stemming: strip common inflection endings so
// "ochii"/"ochi" and "personajele"/"personaj" meet.
function stem(t) {
  if (t.length <= 3) return t;
  for (const suf of ['urilor', 'ilor', 'elor', 'ului', 'ele', 'ile', 'uri', 'lor', 'ul', 'le', 'ii', 'ea', 'ing', 'es', 's', 'i', 'a', 'e']) {
    if (t.endsWith(suf) && t.length - suf.length >= 3) return t.slice(0, -suf.length);
  }
  return t;
}

function tokenize(text) {
  const out = [];
  for (const m of fold(text).matchAll(/[\p{L}\p{N}]+/gu)) {
    const w = m[0];
    if (w.length < 2 || STOP.has(w)) continue;
    out.push(stem(w));
  }
  return out;
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

// Splits text into passages of ~size words with overlap, keeping paragraph starts.
function chunkText(text, { size = 120, overlap = 30 } = {}) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const chunks = [];
  const step = Math.max(1, size - overlap);
  for (let i = 0; i < words.length; i += step) {
    chunks.push(words.slice(i, i + size).join(' '));
    if (i + size >= words.length) break;
  }
  return chunks;
}

const hash = (s) => crypto.createHash('sha1').update(s).digest('hex');

// sources: [{ id, title, kind: 'docs'|'notes'|'research', text }]
function createIndex() {
  const byDoc = new Map(); // key -> { hash, chunks: [{docId, kind, title, text, tf: Map, len}] }
  let stats = null;
  const queryCache = new Map();

  function computeStats() {
    const df = new Map();
    let n = 0;
    let total = 0;
    for (const entry of byDoc.values()) {
      for (const c of entry.chunks) {
        n++;
        total += c.len;
        for (const t of c.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
      }
    }
    stats = { df, n, avgLen: n ? total / n : 0 };
  }

  function update(sources, onProgress) {
    const seen = new Set();
    let changed = 0;
    sources.forEach((src, i) => {
      const key = `${src.kind || 'docs'}:${src.id}`;
      seen.add(key);
      const text = src.text || '';
      const h = hash(`${src.title}\n${text}`);
      const prev = byDoc.get(key);
      if (!prev || prev.hash !== h) {
        changed++;
        const chunks = chunkText(text).map((t, n) => {
          const toks = tokenize(`${n === 0 ? `${src.title || ''} ` : ''}${t}`);
          const tf = new Map();
          for (const tok of toks) tf.set(tok, (tf.get(tok) || 0) + 1);
          return { docId: src.id, kind: src.kind || 'docs', title: src.title || '', text: t, tf, len: toks.length, n };
        });
        byDoc.set(key, { hash: h, chunks });
      }
      if (onProgress) onProgress({ done: i + 1, total: sources.length });
    });
    for (const key of [...byDoc.keys()]) {
      if (!seen.has(key)) {
        byDoc.delete(key);
        changed++;
      }
    }
    if (changed || !stats) {
      computeStats();
      queryCache.clear();
    }
    return { docs: byDoc.size, chunks: stats.n, changed };
  }

  function concept(q) {
    return [...new Set(tokenize(q))].sort().join(' ');
  }

  function query(q, { k = 8, k1 = 1.2, b = 0.75, kinds } = {}) {
    if (!stats) computeStats();
    const terms = concept(q).split(' ').filter(Boolean);
    if (!terms.length) return [];
    const cacheKey = `${terms.join(' ')}|${k}|${(kinds || []).join(',')}`;
    if (queryCache.has(cacheKey)) return queryCache.get(cacheKey);
    const scored = [];
    for (const entry of byDoc.values()) {
      for (const c of entry.chunks) {
        if (kinds && !kinds.includes(c.kind)) continue;
        let score = 0;
        const matched = [];
        for (const t of terms) {
          const f = c.tf.get(t);
          if (!f) continue;
          const df = stats.df.get(t) || 0;
          const idf = Math.log(1 + (stats.n - df + 0.5) / (df + 0.5));
          score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * c.len) / (stats.avgLen || 1))));
          matched.push(t);
        }
        if (score > 0) scored.push({ docId: c.docId, kind: c.kind, title: c.title, text: c.text, chunk: c.n, score, matched });
      }
    }
    scored.sort((x, y) => y.score - x.score);
    const res = scored.slice(0, k).map((r) => ({ ...r, score: Math.round(r.score * 1000) / 1000 }));
    queryCache.set(cacheKey, res);
    return res;
  }

  return { update, query, concept, size: () => (stats ? stats.n : 0), cacheSize: () => queryCache.size };
}

// Serial async job queue; each job gets a progress(p) callback.
function createQueue(onEvent = () => {}) {
  let tail = Promise.resolve();
  let seq = 0;
  let pending = 0;
  return {
    push(label, fn) {
      const id = ++seq;
      pending++;
      onEvent({ id, label, state: 'queued', pending });
      const run = tail.then(async () => {
        onEvent({ id, label, state: 'running', pending });
        try {
          const value = await fn((p) => onEvent({ id, label, state: 'progress', pending, ...p }));
          onEvent({ id, label, state: 'done', pending: pending - 1 });
          return value;
        } catch (err) {
          onEvent({ id, label, state: 'error', pending: pending - 1, error: err.message || String(err) });
          throw err;
        } finally {
          pending--;
        }
      });
      tail = run.catch(() => {});
      return run;
    },
    get pending() {
      return pending;
    },
  };
}

function buildAskPrompt(question, passages) {
  const ctx = passages.map((p, i) => `[${i + 1}] (${p.title || p.docId})\n${p.text}`).join('\n\n');
  return {
    text: ctx,
    question:
      `Răspunde la întrebarea de mai jos folosind DOAR pasajele numerotate din proiect. ` +
      `Citează sursele ca [1], [2]. Dacă pasajele nu conțin răspunsul, spune asta.\n\nÎntrebare: ${question}`,
  };
}

// run({ text, question }) -> { text }
async function ask(index, question, run, { k = 6 } = {}) {
  const passages = index.query(question, { k });
  if (!passages.length) return { answer: 'Nu am găsit pasaje relevante în proiect.', passages };
  const res = await run(buildAskPrompt(question, passages));
  return { answer: res && res.text ? res.text : String(res || ''), passages };
}

module.exports = { tokenize, stem, fold, chunkText, htmlToText, createIndex, createQueue, buildAskPrompt, ask };
