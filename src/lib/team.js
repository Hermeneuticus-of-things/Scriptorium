// Team work on one project from several computers (ROADMAP §9, transport 1: a shared folder on a
// NAS, OneDrive, Dropbox or Google Drive). Pure: the storage is the api passed in, so the same code
// runs in the desktop app, the web build and the tests.
//
// Files, in <project>/team/, one per computer so a sync client never has two writers on one file:
//   log-<machine>.jsonl      who changed which document and when (append-only)
//   presence-<machine>.json  who is working now, on which document, and the documents they locked
//
// Team work is on only when the writer has a name (Settings → Sharing → Team); projects of a writer
// with no name are left exactly as before.

export const PRESENCE_EVERY_MS = 20000;
// A computer not heard of for this long is no longer "working now"; its locks lapse later
// (a crash or a closed laptop must not lock a document for ever).
export const PRESENCE_STALE_MS = 2 * 60 * 1000;
export const LOCK_STALE_MS = 30 * 60 * 1000;
export const TEAM_FILE = /^(log|presence)-[A-Za-z0-9-]{1,64}\.(jsonl|json)$/;
export const AGENT = 'agent';

const COLORS = ['#2e7dd7', '#d9822b', '#2e9d57', '#b84fb8', '#c94040', '#1f9e9e', '#8a6d3b', '#5c6bc0'];

/** Machine id: random, kept in the settings of this installation. */
export function newMachineId(rand = Math.random) {
  let s = '';
  for (let i = 0; i < 10; i++) s += Math.floor(rand() * 36).toString(36);
  return `pc-${s}`;
}

export const cleanMachine = (m) => String(m || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 64);

/** The team identity of this installation from the settings, or null when team work is off. */
export function teamIdentity(settings) {
  const t = settings?.team || {};
  const name = String(t.name || '').trim().slice(0, 60);
  const machine = cleanMachine(t.machine);
  if (!name || !machine) return null;
  return { name, color: /^#[0-9a-f]{6}$/i.test(t.color || '') ? t.color : colorFor(name), machine };
}

/** A stable color for a name (used when the writer did not pick one). */
export function colorFor(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

// ---- change log ----

const words = (text) => String(text || '').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [];

/** Words added and removed between two texts (as multisets: moved words count as neither). */
export function wordDelta(before, after) {
  const count = new Map();
  for (const w of words(before)) count.set(w, (count.get(w) || 0) + 1);
  let added = 0;
  for (const w of words(after)) {
    const n = count.get(w) || 0;
    if (n > 0) count.set(w, n - 1);
    else added++;
  }
  let removed = 0;
  for (const n of count.values()) removed += n;
  return { added, removed };
}

/** One log row for a document edit; `chunks` are the changed paragraphs ({old, new}). */
export function logRow({ who, doc, title, chunks = [], time = new Date().toISOString() }) {
  const { added, removed } = wordDelta(chunks.map((c) => c.old).join('\n'), chunks.map((c) => c.new).join('\n'));
  const sample = chunks.map((c) => c.new || c.old).find((x) => String(x).trim()) || '';
  return {
    doc: String(doc),
    title: String(title || '').slice(0, 200),
    who: who.name,
    color: who.color,
    machine: who.machine,
    time,
    added,
    removed,
    paragraphs: chunks.length,
    sample: String(sample).replace(/\s+/g, ' ').trim().slice(0, 140),
  };
}

/** Rows of a .jsonl text; a damaged line (crash while appending, a sync clash) is skipped. */
export function parseLog(text) {
  const out = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (r && typeof r === 'object' && r.doc && r.time) out.push(r);
    } catch {
      /* skipped */
    }
  }
  return out;
}

/** Every computer's log, oldest first. `files` = { name: text } of the team folder. */
export function readLogs(files) {
  const rows = [];
  for (const [name, text] of Object.entries(files || {})) if (/^log-.+\.jsonl$/.test(name)) rows.push(...parseLog(text));
  return rows.sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

/** Rows filtered by document, person and period ('day' | 'week' | 'month' | '' = all). */
export function filterLog(rows, { doc, who, period, now = Date.now() } = {}) {
  const span = { day: 864e5, week: 7 * 864e5, month: 30 * 864e5 }[period] || 0;
  return rows.filter((r) => (!doc || r.doc === doc) && (!who || r.who === who) && (!span || now - Date.parse(r.time) <= span));
}

/** The people in the log, with their color and the time of their last change (newest first). */
export function people(rows) {
  const by = new Map();
  for (const r of rows) by.set(r.who, { name: r.who, color: r.color || colorFor(r.who), last: r.time, agent: r.who === AGENT });
  return [...by.values()].sort((a, b) => String(b.last).localeCompare(String(a.last)));
}

/** Last change of each document: { docId: row }, for "modified by X at …" in the binder. */
export function lastChanges(rows) {
  const out = {};
  for (const r of rows) out[r.doc] = r;
  return out;
}

// ---- presence and locks ----

export function presenceOf(who, { doc = '', locks = [], now = Date.now() } = {}) {
  return { who: who.name, color: who.color, machine: who.machine, doc: String(doc || ''), locks: [...new Set(locks)].slice(0, 200), time: new Date(now).toISOString() };
}

/** The other computers from the presence files: { live, locks: { docId: presence } }. */
export function readPeers(files, { self, now = Date.now() } = {}) {
  const live = [];
  const locks = {};
  for (const [name, text] of Object.entries(files || {})) {
    if (!/^presence-.+\.json$/.test(name)) continue;
    let p;
    try {
      p = JSON.parse(text);
    } catch {
      continue;
    }
    if (!p || !p.who || (self && p.machine === self)) continue;
    const age = now - Date.parse(p.time);
    if (!(age >= -60000)) continue; // unreadable time
    if (age <= PRESENCE_STALE_MS) live.push(p);
    // Several computers locked the same document: the smallest machine id keeps it (lockFor).
    if (age <= LOCK_STALE_MS) for (const id of p.locks || []) if (!locks[id] || String(p.machine) < String(locks[id].machine)) locks[id] = p;
  }
  live.sort((a, b) => String(a.who).localeCompare(String(b.who)));
  return { live, locks };
}

/**
 * Presence files with their times replaced by when this computer saw each one change (`seen`:
 * machine -> {stamp, at}), so a computer whose clock runs ahead or behind is judged by this one's
 * clock. The first time a file is seen its own time counts, but never later than now.
 */
export function seenTimes(files, seen, now = Date.now()) {
  const out = {};
  for (const [name, text] of Object.entries(files || {})) {
    if (!/^presence-.+\.json$/.test(name)) {
      out[name] = text;
      continue;
    }
    let p;
    try {
      p = JSON.parse(text);
    } catch {
      continue;
    }
    if (!p || !p.machine) continue;
    const prev = seen.get(p.machine);
    let at;
    if (prev && prev.stamp === p.time) at = prev.at;
    else if (prev) at = now; // it changed since the last look: it is alive now
    else at = Math.min(now, Date.parse(p.time) || 0);
    seen.set(p.machine, { stamp: p.time, at });
    out[name] = JSON.stringify({ ...p, time: new Date(at).toISOString() });
  }
  return out;
}

/**
 * The lock that makes document `id` read-only here, or null. When two computers locked the same
 * document (both clicked within one sync delay), the smaller machine id keeps it, so exactly one
 * of them can write and the other still sees its own lock button to give it up.
 */
export function lockFor(peerLocks, myLocks, who, id) {
  const p = peerLocks?.[id];
  if (!p) return null;
  if (who && (myLocks || []).includes(id) && String(who.machine) < String(p.machine)) return null;
  return p;
}

// ---- storage through the api (teamFiles / teamWrite) ----

export async function appendLog(api, dir, who, rows) {
  if (!api.teamWrite || !rows.length) return 0;
  await api.teamWrite(dir, `log-${who.machine}.jsonl`, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', { append: true });
  return rows.length;
}

export async function publishPresence(api, dir, who, state) {
  if (!api.teamWrite) return;
  await api.teamWrite(dir, `presence-${who.machine}.json`, JSON.stringify(presenceOf(who, state)));
}

export async function teamFiles(api, dir) {
  return api.teamFiles ? (await api.teamFiles(dir)) || {} : {};
}

// ---- three-way merge of one document by paragraphs ----

const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'col', 'source', 'wbr', 'area', 'base', 'embed', 'param', 'track']);

/** Top-level blocks of an HTML fragment (paragraphs, headings, lists, tables…), as strings. */
export function splitBlocks(html) {
  const s = String(html || '');
  const out = [];
  const re = /<!--[\s\S]*?-->|<(\/?)([A-Za-z][A-Za-z0-9-]*)\b[^>]*?(\/?)>/g;
  let depth = 0;
  let start = 0;
  let m;
  while ((m = re.exec(s))) {
    if (m[0].startsWith('<!--')) continue;
    const name = m[2].toLowerCase();
    if (m[1]) depth = Math.max(0, depth - 1);
    else if (!m[3] && !VOID.has(name)) depth++;
    if (depth === 0) {
      const piece = s.slice(start, re.lastIndex).trim();
      if (piece) out.push(piece);
      start = re.lastIndex;
    }
  }
  const rest = s.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

// Longest common subsequence of two block lists: pairs [i, j] of equal blocks, in order.
function lcsPairs(a, b) {
  const n = a.length;
  const m = b.length;
  if (n * m > 4e6) return null;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const pairs = [];
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);

/**
 * Three-way merge of a document: `base` is the text both computers started from, `mine` the text
 * here, `theirs` the text that arrived. Paragraphs changed on one side only are taken from that
 * side; a paragraph changed differently on both keeps this computer's text and counts as a
 * conflict (the caller keeps their whole version as a snapshot, so nothing is lost).
 * Returns { html, conflicts }.
 */
// x is a subsequence of y (same blocks, in order, others may sit between them).
function isSub(x, y) {
  let j = 0;
  for (const v of y) if (j < x.length && v === x[j]) j++;
  return j === x.length;
}

export function mergeDoc(base, mine, theirs) {
  if (mine === theirs) return { html: mine, conflicts: 0, pieces: [mine] };
  if (base === theirs) return { html: mine, conflicts: 0, pieces: [mine] };
  if (base === mine) return { html: theirs, conflicts: 0, pieces: [theirs] };
  const B = splitBlocks(base);
  const A = splitBlocks(mine);
  const T = splitBlocks(theirs);
  const pa = lcsPairs(B, A);
  const pt = lcsPairs(B, T);
  if (!pa || !pt) return { html: mine, conflicts: 1, pieces: [{ mine: A, theirs: T }] };
  const inA = new Map(pa);
  const inT = new Map(pt);
  // Base blocks kept unchanged on both sides anchor the merge.
  const anchors = B.map((_, i) => i).filter((i) => inA.has(i) && inT.has(i));
  // Settled blocks as strings; each clash as { mine: [...], theirs: [...] } (see resolveMerge).
  const pieces = [];
  let conflicts = 0;
  let bi = 0;
  let ai = 0;
  let ti = 0;
  const clash = (a, t) => {
    pieces.push({ mine: a, theirs: t });
    conflicts++;
  };
  const chunk = (bEnd, aEnd, tEnd) => {
    const b = B.slice(bi, bEnd);
    const a = A.slice(ai, aEnd);
    const t = T.slice(ti, tEnd);
    if (same(a, b)) pieces.push(...t);
    else if (same(t, b) || same(a, t)) pieces.push(...a);
    else if (a.length === b.length && t.length === b.length) {
      // Neighbouring paragraphs edited in place on both sides: decided one paragraph at a time.
      b.forEach((x, i) => {
        if (a[i] === x) pieces.push(t[i]);
        else if (t[i] === x || t[i] === a[i]) pieces.push(a[i]);
        else clash([a[i]], [t[i]]);
      });
    } else if (!inPlaceOver(a, t, b) && !inPlaceOver(t, a, b, true)) clash(a, t);
  };
  // One side only inserted or deleted paragraphs (b is a subsequence of `grown`, or `grown` of b)
  // and the other edited paragraphs in place (`edited` has b's length): both apply, no clash.
  // `flip`: `grown` is theirs, so a deleted paragraph the other side edited stays theirs.
  const inPlaceOver = (grown, edited, b, flip = false) => {
    if (edited.length !== b.length) return false;
    const out = [];
    if (isSub(b, grown)) {
      let j = 0;
      for (const x of grown) {
        if (j < b.length && x === b[j]) out.push(edited[j++]);
        else out.push(x);
      }
      pieces.push(...out);
      return true;
    }
    if (isSub(grown, b)) {
      let j = 0;
      for (let i = 0; i < b.length; i++) {
        if (j < grown.length && grown[j] === b[i]) {
          out.push(edited[i]);
          j++;
        } else if (edited[i] !== b[i]) {
          // deleted on one side, edited on the other: the writer decides
          pieces.push(...out.splice(0));
          if (flip) clash([edited[i]], []);
          else clash([], [edited[i]]);
        }
      }
      pieces.push(...out);
      return true;
    }
    return false;
  };
  for (const k of anchors) {
    const ak = inA.get(k);
    const tk = inT.get(k);
    if (ak < ai || tk < ti) continue;
    chunk(k, ak, tk);
    pieces.push(B[k]);
    bi = k + 1;
    ai = ak + 1;
    ti = tk + 1;
  }
  chunk(B.length, A.length, T.length);
  return { html: resolveMerge(pieces), conflicts, pieces };
}

/**
 * The document from merge pieces and the writer's choices for the clashes, in order:
 * 'mine' (default), 'theirs' or 'both' (mine, then theirs).
 */
export function resolveMerge(pieces, choices = []) {
  let k = 0;
  return pieces
    .map((p) => {
      if (typeof p === 'string') return p;
      const c = choices[k++] || 'mine';
      return (c === 'theirs' ? p.theirs : c === 'both' ? [...p.mine, ...p.theirs] : p.mine).join('');
    })
    .join('');
}
