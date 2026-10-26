// Pure statistics helpers for Pneuma Sofer (no DOM, no Node APIs).

const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

/** Common Romanian function words (lowercase, with diacritics). */
export const ROMANIAN_STOPWORDS = new Set(`
și în că pe la cu de nu se un o din care este sunt mai ce ca lui lor dar sau iar fi fost acest această aceasta acesta aceste acești
aceea acela aceia acelea acel acea acei acele ăsta asta ăștia astea ăla aia ăia alea
a al ai ale am ai are avem aveți au avea avut aș ar ați
eu tu el ea noi voi ei ele mă te îl o ne vă îi le mi ți îi ni vi li
meu mea mei mele tău ta tăi tale său sa săi sale nostru noastră noștri noastre vostru voastră voștri voastre
lor dumneavoastră dânsul dânsa
fie era erau eram ești este e sunteți suntem fiind voi va vom veți vor
să s-a s-au nici chiar doar încă deja tot toată toți toate totul
foarte prea mult multă mulți multe puțin cât câtă câți câte atât atâta
unde când cum cine cui ceva cineva nimic nimeni orice oricine fiecare niciun nicio
după până pentru prin spre sub peste lângă între fără despre asupra contra către dintre dintr printre pentru
într într-o într-un dintr-o dintr-un pe-o
deci însă ci ori fiindcă deoarece pentru că dacă decât precum astfel așa aici acolo acum atunci apoi azi
da ba nu mai iar un unei unui unor niște
sine sinea însuși însăși înșiși
fi-va fi-vor poate pot poți putea
le-a l-a i-a mi-a ți-a ne-a v-a
alt altă alți alte altceva altcineva
ceea cea cel cei cele
`.trim().split(/\s+/));

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    const k = e.toLowerCase();
    if (k in ENTITIES) return ENTITIES[k];
    if (k.startsWith('#x')) return String.fromCodePoint(parseInt(k.slice(2), 16));
    if (k.startsWith('#')) return String.fromCodePoint(parseInt(k.slice(1), 10));
    return m;
  });
}

/** Removes `<span data-footnote|data-annotation ...>...</span>` incl. nested spans. */
function stripSkippedSpans(html) {
  const open = /<span\b[^>]*\bdata-(?:footnote|annotation)\b[^>]*>/i;
  let out = html;
  for (let m = open.exec(out); m; m = open.exec(out)) {
    let depth = 1;
    const tag = /<(\/?)span\b[^>]*>/gi;
    tag.lastIndex = m.index + m[0].length;
    let end = out.length;
    for (let t = tag.exec(out); t; t = tag.exec(out)) {
      depth += t[1] ? -1 : 1;
      if (depth === 0) { end = t.index + t[0].length; break; }
    }
    out = out.slice(0, m.index) + out.slice(end);
  }
  return out;
}

/**
 * Converts editor HTML to plain text without the DOM.
 * Footnote and annotation spans are skipped; block boundaries become newlines.
 * @param {string} html
 * @returns {string}
 */
export function htmlToPlain(html) {
  if (!html) return '';
  let s = String(html).replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
  s = stripSkippedSpans(s);
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/?(p|div|h[1-6]|li|ul|ol|blockquote|pre|tr|table|section|article|hr)\b[^>]*>/gi, '\n');
  s = s.replace(/<[^>]+>/g, '');
  s = decodeEntities(s);
  // Trailing blanks per line, trimmed without a regex: /[ \t\u00a0]+\n/ is quadratic on long runs.
  const lines = s.split('\n').map((l) => {
    let e = l.length;
    while (e > 0 && (l[e - 1] === ' ' || l[e - 1] === '\t' || l[e - 1] === '\u00a0')) e--;
    return l.slice(0, e);
  });
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Counts words, characters, sentences and paragraphs in plain text.
 * @param {string} text
 * @returns {{words:number, chars:number, charsNoSpaces:number, sentences:number, paragraphs:number}}
 */
export function countText(text) {
  const t = text || '';
  const words = (t.match(WORD_RE) || []).length;
  return {
    words,
    chars: [...t.replace(/\n/g, '')].length,
    charsNoSpaces: [...t.replace(/\s/g, '')].length,
    sentences: splitSentences(t).length,
    paragraphs: t.split(/\n+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length,
  };
}

function splitSentences(text) {
  return (text || '')
    .split(/(?<=[.!?…])\s+|\n+/u)
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

function collectIds(project, docs, { scope = 'draft', selectionIds } = {}) {
  const tree = project?.tree || [];
  const sel = selectionIds && selectionIds.length ? new Set(selectionIds) : null;
  const ids = [];
  const walk = (nodes, ctx) => {
    for (const n of nodes || []) {
      const c = {
        trash: ctx.trash || n.root === 'trash',
        included: ctx.included && n.includeInCompile !== false,
        selected: ctx.selected || (sel ? sel.has(n.id) : true),
      };
      let ok = !c.trash && c.selected && n.type === 'text';
      if (scope === 'compile') ok = ok && c.included;
      if (ok) ids.push(n.id);
      walk(n.children, c);
    }
  };
  const roots = scope === 'all' ? tree : tree.slice(0, 1);
  walk(roots, { trash: false, included: true, selected: !sel });
  return ids;
}

/**
 * Aggregated statistics for a project scope.
 * @param {object} project - project with `tree`.
 * @param {Record<string,string>} docs - id -> HTML.
 * @param {{scope?:'draft'|'compile'|'all', selectionIds?:string[]}} [opts]
 */
export function projectStats(project, docs, opts = {}) {
  const ids = collectIds(project, docs, opts);
  const acc = { words: 0, chars: 0, charsNoSpaces: 0, sentences: 0, paragraphs: 0 };
  for (const id of ids) {
    const c = countText(htmlToPlain(docs?.[id] || ''));
    for (const k of Object.keys(acc)) acc[k] += c[k];
  }
  return {
    ...acc,
    documents: ids.length,
    pagesPaperback: Math.ceil(acc.words / 300),
    pagesPrinted: Math.ceil(acc.chars / 1800),
    readingMinutes: Math.ceil(acc.words / 230),
  };
}

/** Plain text of the docs in a scope, joined by blank lines. */
export function projectText(project, docs, opts = {}) {
  return collectIds(project, docs, opts).map((id) => htmlToPlain(docs?.[id] || '')).join('\n\n');
}

/**
 * Word frequency table, lowercase (Romanian locale).
 * @param {string} text
 * @param {{minLength?:number, stopwords?:Set<string>|null, limit?:number}} [opts]
 * @returns {{word:string, count:number, percent:number}[]}
 */
export function wordFrequency(text, { minLength = 4, stopwords = ROMANIAN_STOPWORDS, limit = 100 } = {}) {
  const all = (text || '').match(WORD_RE) || [];
  const map = new Map();
  for (const raw of all) {
    const w = raw.toLocaleLowerCase('ro-RO').replace(/['’-]+$/u, '').replace(/ş/g, 'ș').replace(/ţ/g, 'ț');
    if ([...w].length < minLength || (stopwords && stopwords.has(w))) continue;
    map.set(w, (map.get(w) || 0) + 1);
  }
  const total = all.length || 1;
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ro'))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count, percent: Math.round((count / total) * 10000) / 100 }));
}

const BUCKETS = [[1, 5], [6, 10], [11, 15], [16, 20], [21, 30], [31, 40], [41, Infinity]];

/**
 * Sentence length distribution (in words).
 * @param {string} text
 * @returns {{average:number, longest:number, shortest:number, histogram:{range:string,count:number}[]}}
 */
export function sentenceLengths(text) {
  const lens = splitSentences(text).map((s) => (s.match(WORD_RE) || []).length).filter((n) => n > 0);
  const histogram = BUCKETS.map(([a, b]) => ({
    range: b === Infinity ? `${a}+` : `${a}-${b}`,
    count: lens.filter((n) => n >= a && n <= b).length,
  }));
  if (!lens.length) return { average: 0, longest: 0, shortest: 0, histogram };
  return {
    average: Math.round((lens.reduce((s, n) => s + n, 0) / lens.length) * 10) / 10,
    longest: Math.max(...lens),
    shortest: Math.min(...lens),
    histogram,
  };
}

// Readability signals for self-editing. The two actionable ones for long-form prose are
// words-per-sentence and the share of over-long sentences; plain-language guidance puts a
// sentence "long" past ~25 words. The grade is an Automated Readability Index value — it uses
// only characters and words (no syllables), so it degrades gracefully to languages other than
// English, but its constants are English-tuned, so treat it as a heuristic, not a verdict.
const LONG_SENTENCE_WORDS = 25;
const LONG_WORD_CHARS = 14;

/**
 * Heuristic readability signals (language-neutral; no DOM).
 * @param {string} text
 * @param {{longSentence?:number, longWord?:number}} [opts]
 * @returns {{words:number, sentences:number, charsPerWord:number, wordsPerSentence:number,
 *   longSentences:number, longSentencePct:number, longWords:number, longWordPct:number,
 *   grade:number, band:'na'|'easy'|'medium'|'hard'|'veryHard'}}
 */
export function readability(text, { longSentence = LONG_SENTENCE_WORDS, longWord = LONG_WORD_CHARS } = {}) {
  const words = (text || '').match(WORD_RE) || [];
  const sentences = splitSentences(text);
  const nW = words.length;
  const nS = sentences.length;
  const empty = { words: nW, sentences: nS, charsPerWord: 0, wordsPerSentence: 0, longSentences: 0, longSentencePct: 0, longWords: 0, longWordPct: 0, grade: 0, band: 'na' };
  if (!nW || !nS) return empty;
  const letters = words.reduce((s, w) => s + [...w].length, 0);
  const charsPerWord = letters / nW;
  const wordsPerSentence = nW / nS;
  const longSentences = sentences.filter((s) => (s.match(WORD_RE) || []).length > longSentence).length;
  const longWords = words.filter((w) => [...w].length >= longWord).length;
  const grade = 4.71 * charsPerWord + 0.5 * wordsPerSentence - 21.43;
  const g = Math.max(1, grade);
  const band = g < 9 ? 'easy' : g < 12 ? 'medium' : g < 15 ? 'hard' : 'veryHard';
  const r1 = (n) => Math.round(n * 10) / 10;
  return {
    words: nW,
    sentences: nS,
    charsPerWord: r1(charsPerWord),
    wordsPerSentence: r1(wordsPerSentence),
    longSentences,
    longSentencePct: r1((longSentences / nS) * 100),
    longWords,
    longWordPct: r1((longWords / nW) * 100),
    grade: r1(grade),
    band,
  };
}

function parseLocalDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/**
 * Plan to reach the draft target by the deadline.
 * @param {{draft?:number, deadline?:string, writingDays?:number[]}} targets
 * @param {number} currentDraftWords
 * @param {Date} [today]
 * @returns {null|{remaining:number, daysLeft:number, perDay:number, overdue:boolean}}
 */
export function deadlinePlan(targets, currentDraftWords, today = new Date()) {
  const end = parseLocalDate(targets?.deadline);
  if (!end) return null;
  const remaining = Math.max(0, (Number(targets.draft) || 0) - (Number(currentDraftWords) || 0));
  const wd = targets.writingDays && targets.writingDays.length ? new Set(targets.writingDays) : null;
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const overdue = d > end && remaining > 0;
  let daysLeft = 0;
  for (; d <= end; d.setDate(d.getDate() + 1)) if (!wd || wd.has(d.getDay())) daysLeft++;
  const perDay = remaining === 0 ? 0 : daysLeft ? Math.ceil(remaining / daysLeft) : remaining;
  return { remaining, daysLeft, perDay, overdue };
}
