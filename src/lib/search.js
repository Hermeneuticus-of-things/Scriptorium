// Project-wide find & replace on editor HTML. Matching runs on text between
// tags, so markup is never touched (a match cannot span formatting changes), but the text around
// a piece inside the same paragraph is visible to whole-word checks and ^/$.

export function buildRegex({ query, regex, caseSensitive, wholeWord }) {
  if (!query) return null;
  let src = regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (wholeWord) src = `(?<![\\p{L}\\p{N}\\p{M}_])(?:${src})(?![\\p{L}\\p{N}\\p{M}_])`;
  try {
    return new RegExp(src, `g${caseSensitive ? '' : 'i'}u`);
  } catch {
    return null;
  }
}

// Named character references worth decoding (HTML5 names, the common typographic subset).
const NAMED = {
  lt: '<', gt: '>', quot: '"', apos: "'",
  mdash: '—', ndash: '–', hellip: '…', laquo: '«', raquo: '»', bdquo: '„', ldquo: '“', rdquo: '”',
  lsquo: '‘', rsquo: '’', sbquo: '‚', lsaquo: '‹', rsaquo: '›', copy: '©', reg: '®', trade: '™',
  deg: '°', middot: '·', bull: '•', sect: '§', para: '¶', times: '×', divide: '÷', plusmn: '±',
  minus: '−', shy: '­', thinsp: ' ', ensp: ' ', emsp: ' ', zwj: '‍',
  zwnj: '‌', euro: '€', pound: '£', yen: '¥', cent: '¢', dagger: '†', Dagger: '‡', prime: '′',
  Prime: '″', iexcl: '¡', iquest: '¿', ordm: 'º', ordf: 'ª', frac12: '½', frac14: '¼', frac34: '¾',
  sup1: '¹', sup2: '²', sup3: '³', micro: 'µ', larr: '←', rarr: '→', uarr: '↑', darr: '↓',
};

function decode(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    // Named references (&lt; &mdash; &laquo; …; pasted/imported HTML) must become text too, or a
    // replace re-encodes them as "&amp;mdash;". Unknown names stay literal; &amp; goes last.
    .replace(/&([A-Za-z][A-Za-z0-9]*);/g, (ref, name) => (name !== 'amp' && NAMED[name] !== undefined ? NAMED[name] : ref))
    .replace(/&#39;/g, "'")
    // Numeric references (imported HTML: &#8217; &#x2019;) must become text, or a replace
    // re-encodes them as "&amp;#8217;" and matches inside them ("x" in "&#x2019;").
    .replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (ref, h, d) => {
      const cp = h ? parseInt(h, 16) : Number(d);
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ref;
    })
    .replace(/&amp;/g, '&');
}

function encode(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;');
}

// Splits html into [{tag:true, s}] / [{tag:false, s(decoded), prev, next}]. prev/next: the text
// around the piece inside the same paragraph (across bold, italic, links…), so "whole word" and
// ^/$ see the real neighbours ("pre<strong>fix</strong>" is not the word "fix").
const INLINE = /^<\/?(strong|b|em|i|u|s|span|a|sub|sup|mark|code|small|del|ins)\b/i;
const CONTEXT = 32;
function segments(html) {
  const out = [];
  const re = /(<[^>]*>)|([^<]+)/g;
  let m;
  while ((m = re.exec(html || ''))) out.push(m[1] ? { tag: true, s: m[1] } : { tag: false, s: decode(m[2]) });
  let run = '';
  for (const seg of out) {
    if (seg.tag) {
      if (!INLINE.test(seg.s)) run = '';
      continue;
    }
    seg.prev = run.slice(-CONTEXT);
    run += seg.s;
  }
  run = '';
  for (let i = out.length - 1; i >= 0; i--) {
    const seg = out[i];
    if (seg.tag) {
      if (!INLINE.test(seg.s)) run = '';
      continue;
    }
    seg.next = run.slice(0, CONTEXT);
    run = seg.s + run;
  }
  return out;
}

// Matches of re inside seg.s, with the neighbours visible to lookbehind/lookahead and ^/$.
function matchesIn(seg, re) {
  const text = seg.prev + seg.s + seg.next;
  const from = seg.prev.length;
  const to = from + seg.s.length;
  const found = [];
  re.lastIndex = from;
  let m;
  while ((m = re.exec(text))) {
    if (m.index >= to) break;
    if (m[0] === '') {
      re.lastIndex++;
      continue;
    }
    if (m.index + m[0].length <= to) found.push({ index: m.index - from, m });
    else re.lastIndex = m.index + 1;
  }
  re.lastIndex = 0;
  return found;
}

export function findInHtml(html, re, context = 40) {
  if (!re) return [];
  const results = [];
  for (const seg of segments(html)) {
    if (seg.tag) continue;
    for (const { index, m } of matchesIn(seg, re)) {
      const start = Math.max(0, index - context);
      results.push({
        before: (start > 0 ? '…' : '') + seg.s.slice(start, index),
        match: m[0],
        after: seg.s.slice(index + m[0].length, index + m[0].length + context) + (index + m[0].length + context < seg.s.length ? '…' : ''),
      });
    }
  }
  return results;
}

export function replaceInHtml(html, re, replacement) {
  if (!re) return { html, count: 0 };
  let count = 0;
  // Number of capture groups: $N beyond it stays literal (args after the groups are offset/input).
  const groups = new RegExp(`${re.source}|`, re.flags).exec('').length - 1;
  const expand = (args) =>
    replacement.replace(/\$(\$|&|\d\d?)/g, (tok, k) => {
      if (k === '$') return '$';
      if (k === '&') return args[0];
      let n = Number(k);
      if (n > groups && k.length === 2 && Number(k[0]) <= groups) return (args[Number(k[0])] ?? '') + k[1];
      if (n < 1 || n > groups) return tok;
      return args[n] ?? '';
    });
  const out = segments(html)
    .map((seg) => {
      if (seg.tag) return seg.s;
      let res = '';
      let at = 0;
      for (const { index, m } of matchesIn(seg, re)) {
        count++;
        res += seg.s.slice(at, index) + expand([...m]);
        at = index + m[0].length;
      }
      return encode(res + seg.s.slice(at));
    })
    .join('');
  return { html: out, count };
}
