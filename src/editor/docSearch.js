// Find & replace inside one ProseMirror document. Matches run per text block, so a
// match can span bold/italic runs but never crosses a paragraph boundary.

/** A character without its diacritics (ă→a, ș→s, é→e), kept 1:1 so offsets stay valid. */
export function foldChar(c) {
  const f = c.normalize('NFD').replace(/\p{M}/gu, '');
  return f.length === c.length ? f : c;
}
/** Text without diacritics, same length as the input. */
export function foldText(text) {
  let out = '';
  for (let i = 0; i < text.length; i++) out += foldChar(text[i]);
  return out;
}

const LETTER = '[\\p{L}\\p{N}\\p{M}_]';

/**
 * Regex for the find bar. mode: 'contains' (anywhere), 'starts' (at the start of a word),
 * 'word' (whole word). ignoreDiacritics folds the query; findRanges folds the text with
 * { fold: true }. Returns null for an empty or invalid query.
 */
export function buildDocRegex({ query, mode = 'contains', caseSensitive = false, regex = false, ignoreDiacritics = false, wholeWord = false }) {
  if (!query) return null;
  const q = ignoreDiacritics ? foldText(query) : query;
  if (regex && (/\((?:[^()\\]|\\.)*[+*}](?:[^()\\]|\\.)*\)\s*[+*{]/.test(q) || q.length > 500)) return null;
  let src = regex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = wholeWord && mode === 'contains' ? 'word' : mode;
  if (m === 'starts' || m === 'word') src = `(?<!${LETTER})(?:${src})`;
  if (m === 'word') src += `(?!${LETTER})`;
  try {
    return new RegExp(src, `g${caseSensitive ? '' : 'i'}u`);
  } catch {
    return null;
  }
}

/** Keeps the ranges that lie inside scope {from, to} (search in selection). */
export function rangesWithin(ranges, scope) {
  if (!scope || scope.from >= scope.to) return ranges;
  return ranges.filter((r) => r.from >= scope.from && r.to <= scope.to);
}

// Returns [{from, to}] document ranges for every match of `re` (a /g regex).
// opts.fold: match against the text without diacritics (the regex must be folded too).
export function findRanges(doc, re, opts = {}) {
  const ranges = [];
  if (!re) return ranges;
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // Map each character of textContent to its document position.
    const map = [];
    let text = '';
    node.forEach((child, offset) => {
      if (child.isText) {
        for (let i = 0; i < child.text.length; i++) map.push(pos + 1 + offset + i);
        text += child.text;
      } else {
        // atoms (footnotes, images) count as one opaque character
        map.push(-1);
        text += '￼';
      }
    });
    if (opts.fold) text = foldText(text);
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m[0] === '') {
        re.lastIndex = m.index + (text.codePointAt(m.index) > 0xffff ? 2 : 1); // a whole character (u flag)
        continue;
      }
      const from = map[m.index];
      const to = map[m.index + m[0].length - 1];
      // A match that contains a footnote, image or annotation is skipped: replacing it would
      // delete the note (regex "." matches the placeholder character).
      if (map.slice(m.index, m.index + m[0].length).includes(-1)) continue;
      if (from >= 0 && to >= 0) ranges.push({ from, to: to + 1, match: m });
    }
    return false;
  });
  return ranges;
}

/**
 * Replacement text for one match. Groups ($1..$9, $&, $$) are expanded only in regex mode,
 * so a literal search can insert "$5"; a group the pattern does not have stays literal
 * (as in String.prototype.replace).
 */
export function expandReplacement(replacement, match, regex) {
  if (!regex || !match) return replacement;
  return replacement.replace(/\$(\$|&|\d)/g, (all, g) => {
    if (g === '$') return '$';
    if (g === '&') return match[0];
    const n = Number(g);
    return n >= 1 && n < match.length ? match[n] ?? '' : all;
  });
}

// Replaces the given ranges (from last to first so positions stay valid).
// With regex: true, `replacement` supports $1..$9 groups like the project-wide replace.
export function replaceRanges(editor, ranges, replacement, { regex = false } = {}) {
  if (!ranges.length) return 0;
  const { tr } = editor.state;
  for (const r of [...ranges].sort((a, b) => b.from - a.from)) {
    const text = expandReplacement(replacement, r.match, regex);
    // The formatting of the replaced text itself (bold, italic, comment), not of the text before it.
    const marks = editor.state.doc.nodeAt(r.from)?.marks ?? editor.state.doc.resolve(r.from).marks();
    if (text) tr.replaceWith(r.from, r.to, editor.schema.text(text, marks));
    else tr.delete(r.from, r.to);
  }
  editor.view.dispatch(tr);
  return ranges.length;
}

// Search history of the find bar (most recent first), kept in this browser profile.
const HISTORY_KEY = 'scribner-find-history';
export function loadFindHistory(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  try {
    const v = JSON.parse(storage?.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
/** Puts `query` first in the history (no duplicates, at most `max` entries) and saves it. */
export function pushFindHistory(query, storage = typeof localStorage !== 'undefined' ? localStorage : null, max = 20) {
  const q = String(query ?? '');
  const list = loadFindHistory(storage);
  if (!q.trim()) return list;
  const next = [q, ...list.filter((x) => x !== q)].slice(0, max);
  try {
    storage?.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* private window: history only for this session */
  }
  return next;
}
/** Forgets the search history. */
export function clearFindHistory(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  try {
    storage?.removeItem(HISTORY_KEY);
  } catch {
    /* nothing stored */
  }
  return [];
}
