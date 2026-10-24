// I-EDIT author text (VKB2 docs/VKB2.md, §H109/§H117/§H123–§H124).
// What the writer changed by hand is a decision: the repair loop and the rounds never rewrite
// it (HARD gate `fraza_autor_atinsa`), issues that fall on it go to the author (COADA_AUTOR),
// issues on neighbouring paragraphs go to the writer with a note.
//
// Pure module (no DOM, no Node APIs). Lines are 1-based paragraph numbers in the document
// (same numbering as htmlToParagraphs and the I-REP `⚠ REP L<n>` lines).

import { htmlToParagraphs } from './editorial.js';

export const NEIGHBOUR_NOTE = 'leagă de textul autorului, fără să-l schimbi';
export const AUTHOR_HASH_CAP = 2000;

const norm = (s) => String(s ?? '').normalize('NFC').replace(/[\s ]+/g, ' ').trim();

// Stable 53-bit hash (cyrb53) of a normalized string, base 36.
export function hashText(s) {
  const str = norm(s);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// Paragraph hash: the visible text with its emphasis markers (***x***, *x*, [^note]), so a
// changed word or a removed italic both count as a change; comment spans do not.
export const paragraphHash = (p) => hashText(p.md ?? p.plain ?? p);

const parasOf = (htmlOrParas) => (Array.isArray(htmlOrParas) ? htmlOrParas : htmlToParagraphs(htmlOrParas || ''));

/** [{line, text, md, hash}] for every non-empty paragraph (empty ones carry hash ''). */
export function hashParagraphs(htmlOrParas) {
  return parasOf(htmlOrParas).map((p, i) => {
    const md = p.md ?? String(p);
    return { line: i + 1, text: p.plain ?? md, md, hash: norm(md) ? paragraphHash(p) : '' };
  });
}

// LCS of two hash sequences after trimming the common prefix/suffix. Returns matched index pairs.
function matchPairs(a, b) {
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const pairs = [];
  for (let i = 0; i < pre; i++) pairs.push([i, i]);
  const A = a.slice(pre, a.length - suf);
  const B = b.slice(pre, b.length - suf);
  if (A.length && B.length) {
    if (A.length * B.length > 4e6) {
      // Too big for a table: greedy in-order matching (still correct for the gate's purposes).
      let j = 0;
      for (let i = 0; i < A.length; i++) {
        const k = B.indexOf(A[i], j);
        if (k >= 0) {
          pairs.push([pre + i, pre + k]);
          j = k + 1;
        }
      }
    } else {
      const n = A.length;
      const m = B.length;
      const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
      for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      for (let i = 0, j = 0; i < n && j < m; ) {
        if (A[i] === B[j]) {
          pairs.push([pre + i, pre + j]);
          i++;
          j++;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
        else j++;
      }
    }
  }
  for (let i = 0; i < suf; i++) pairs.push([a.length - suf + i, b.length - suf + i]);
  return pairs;
}

/**
 * diffParagraphs(oldHtml, newHtml) -> chunks [{line, oldLine, old, new, hashOld, hashNew, oldLines, newLines, newHashes}]
 * A chunk is a run of paragraphs replaced, inserted or deleted between two unchanged ones.
 * `line` is the first line in the new text (for a deletion: where the text was, in the new text).
 */
export function diffParagraphs(oldHtml, newHtml) {
  const a = hashParagraphs(oldHtml);
  const b = hashParagraphs(newHtml);
  const key = (p) => p.hash || '∅';
  const pairs = matchPairs(a.map(key), b.map(key));
  const chunks = [];
  let pi = 0;
  let pj = 0;
  const emit = (i1, j1) => {
    const olds = a.slice(pi, i1);
    const news = b.slice(pj, j1);
    if (olds.some((p) => p.hash) || news.some((p) => p.hash)) {
      const old = olds.map((p) => p.text).join('\n');
      const neu = news.map((p) => p.text).join('\n');
      chunks.push({
        line: pj + 1,
        oldLine: pi + 1,
        old,
        new: neu,
        hashOld: old ? hashText(old) : '',
        hashNew: neu ? hashText(neu) : '',
        oldLines: olds.map((p) => p.line),
        newLines: news.map((p) => p.line),
        newHashes: news.map((p) => p.hash).filter(Boolean),
      });
    }
  };
  for (const [i, j] of pairs) {
    emit(i, j);
    pi = i + 1;
    pj = j + 1;
  }
  emit(a.length, b.length);
  return chunks;
}

/**
 * HARD gate `fraza_autor_atinsa`: every author paragraph of `before` must appear unchanged,
 * in the same relative order, in `after`. -> {ok, violations: [{line, text, kind}]}
 * kind: 'changed' (rewritten in place), 'moved' (still there, out of order), 'deleted'.
 */
export function authorGate(beforeHtml, afterHtml, authorHashes) {
  const H = authorHashes instanceof Set ? authorHashes : new Set(authorHashes || []);
  if (!H.size) return { ok: true, violations: [] };
  const before = hashParagraphs(beforeHtml);
  const afterHashes = hashParagraphs(afterHtml).map((p) => p.hash);
  const chunks = diffParagraphs(beforeHtml, afterHtml);
  const violations = [];
  let j = 0;
  for (const p of before) {
    if (!p.hash || !H.has(p.hash)) continue;
    const k = afterHashes.indexOf(p.hash, j);
    if (k >= 0) {
      j = k + 1;
      continue;
    }
    let kind = 'deleted';
    if (afterHashes.includes(p.hash)) kind = 'moved';
    else {
      const c = chunks.find((x) => x.oldLines.includes(p.line));
      if (c && c.newLines.length) kind = 'changed';
    }
    violations.push({ line: p.line, text: p.text, kind });
  }
  return { ok: violations.length === 0, violations };
}

/** Lines (1-based) of the author paragraphs in a text. */
export function authorLines(htmlOrParas, authorHashes) {
  const H = authorHashes instanceof Set ? authorHashes : new Set(authorHashes || []);
  return hashParagraphs(htmlOrParas).filter((p) => p.hash && H.has(p.hash)).map((p) => p.line);
}

/** Author paragraphs as {line, text} (manuscript markers kept) for the prompts. */
export function authorParagraphs(htmlOrParas, authorHashes) {
  const H = authorHashes instanceof Set ? authorHashes : new Set(authorHashes || []);
  return hashParagraphs(htmlOrParas).filter((p) => p.hash && H.has(p.hash)).map((p) => ({ line: p.line, text: p.md }));
}

/**
 * splitIssues(issues, paragraphs, authorHashes) -> {toWriter, toAuthor, neighbours}
 * issue.paragraph is the 0-based paragraph index (lint()). Issues on author paragraphs go to the
 * author (COADA_AUTOR); issues on the paragraph right before/after one go to the writer with
 * NEIGHBOUR_NOTE; the rest go to the writer unchanged.
 */
export function splitIssues(issues, paragraphs, authorHashes) {
  const author = new Set(authorLines(paragraphs, authorHashes).map((l) => l - 1));
  const out = { toWriter: [], toAuthor: [], neighbours: [] };
  for (const i of issues || []) {
    const p = Number(i.paragraph);
    if (author.has(p)) out.toAuthor.push(i);
    else if (author.has(p - 1) || author.has(p + 1)) out.neighbours.push({ ...i, note: NEIGHBOUR_NOTE });
    else out.toWriter.push(i);
  }
  return out;
}

/**
 * New author hash list after a hand edit: hashes that no longer exist in the text are pruned,
 * `added` are appended, the list is capped (oldest dropped first).
 */
export function updateAuthorHashes(prev, html, added = [], cap = AUTHOR_HASH_CAP) {
  const present = new Set(hashParagraphs(html).map((p) => p.hash).filter(Boolean));
  const out = [];
  const seen = new Set();
  for (const h of [...(prev || []), ...added]) {
    if (!present.has(h) || seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out.length > cap ? out.slice(out.length - cap) : out;
}

/** Journal rows (MODIFICARI_AUTOR.jsonl), one per chunk. */
export function journalRows(doc, title, chunks, time = new Date().toISOString()) {
  return (chunks || []).map((c) => ({ doc, title: title || '', line: c.line, old: c.old, new: c.new, time, hashOld: c.hashOld, hashNew: c.hashNew }));
}
