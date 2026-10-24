// Automatic glossaries and print table of contents for the book flow.
// Pure module (no DOM, no Node APIs). Every builder returns { title, html, ... } where
// `html` is a TipTap-compatible document ready to be inserted into the binder.
//
//   Glosar_Alogeni_Indieni  intern, tehnic, tabel: termeni sanscriți / indieni
//                           (diacritice IAST ā ī ū ṛ ṣ ṇ ś …, termeni ALOGEN 'x', termeni scurți în italic)
//                           + sens românesc (***sens*** 'termen') + prima frază definitorie + trimiteri
//   Glosar_de_lectură       pentru cititor, fără tabele: termenii marcați de autor
//                           (<mark>, {{termen}}, opțiunea `marked`; nu sunt excluși niciodată) + termeni rari (frecvență)
//   Cuprins_de_tipar        din binder (Manuscris), numerotare pe secțiuni, ordinea canonică

const IAST = /[āīūṝṛḷḹṅñṭḍṇśṣḥṃĀĪŪṚṜḶṄÑṬḌṆŚṢḤṂ]/u;
const LETTER = '\\p{L}\\p{M}';
const WORD_RE = new RegExp(`[${LETTER}][${LETTER}'’-]*`, 'gu');

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const decode = (s) => String(s).replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENT[m]);
export const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (inner) => decode(String(inner).replace(/<span[^>]*data-annotation="[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ''));
const fold = (s) => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('ro');
const sortKey = (a, b) => fold(a).localeCompare(fold(b), 'ro') || a.localeCompare(b, 'ro');

function paragraphs(html) {
  const out = [];
  const re = /<(p|h[1-6]|li|blockquote)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html || ''))) out.push({ tag: m[1].toLowerCase(), html: m[2], text: plain(m[2]) });
  return out;
}

function sentences(text) {
  return text.split(/(?<=[.!?…])\s+(?=[\p{Lu}„«'])/u).map((s) => s.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Book traversal

/** walk the Draft (or opts.root) folder; returns [{id, title, depth, type, path}] in binder order */
export function bookNodes(project, opts = {}) {
  const rootId = opts.root || 'draft';
  const out = [];
  const root = (project.tree || []).find((n) => n.root === rootId || n.id === rootId);
  const walk = (nodes, depth, trail) => {
    for (const n of nodes || []) {
      if (opts.compileOnly !== false && n.includeInCompile === false) continue;
      const path = [...trail, n.title];
      out.push({ id: n.id, title: n.title || '', type: n.type, depth, path, node: n });
      if (n.children) walk(n.children, depth + 1, path);
    }
  };
  if (root) walk(root.children, 0, []);
  return out;
}

/** readDoc(id) may be sync (main process) or async (renderer api). */
export async function collectBookDocs(project, readDoc, opts = {}) {
  const nodes = bookNodes(project, opts).filter((n) => n.type !== 'file');
  const docs = [];
  for (const n of nodes) docs.push({ ...n, html: (await readDoc(n.id)) || '' });
  return docs;
}

// ---------------------------------------------------------------------------
// Glosar_Alogeni_Indieni

const isForeign = (term) => IAST.test(term);

/**
 * buildAlogenGlossary(docs, opts) -> { title, terms:[{term, sense, definition, refs:[title]}], html }
 * opts.italic (default true): short italic terms (≤ opts.maxItalicWords, no Romanian-only
 *   words) also count; opts.extra: [{term, sense?, definition?}] always included.
 */
export function buildAlogenGlossary(docs, opts = {}) {
  const title = opts.title || 'Glosar_Alogeni_Indieni';
  const maxItalic = opts.maxItalicWords || 3;
  const terms = new Map();
  const touch = (raw, doc, sentence, sense) => {
    const term = raw.trim().replace(/^[„"'«]+|[”"'»,.;:!?]+$/g, '');
    if (!term || term.length < 2 || term.split(/\s+/).length > 4) return;
    const key = fold(term);
    let t = terms.get(key);
    if (!t) {
      t = { term, sense: '', definition: '', refs: [] };
      terms.set(key, t);
    }
    if (!t.sense && sense) t.sense = sense;
    if (!t.definition && sentence) t.definition = sentence;
    if (doc && !t.refs.includes(doc.title)) t.refs.push(doc.title);
  };

  for (const doc of docs) {
    for (const p of paragraphs(doc.html)) {
      if (/^h[1-6]$/.test(p.tag)) continue;
      const sents = sentences(p.text);
      const sentenceOf = (needle) => sents.find((s) => s.includes(needle)) || '';
      // 1. ALOGEN pattern ***sens*** 'termen' (sense anchors the term)
      for (const m of p.html.matchAll(/<strong>\s*<em>([\s\S]*?)<\/em>\s*<\/strong>([^<']{0,60})'([^'<\n]{1,40})'|<em>\s*<strong>([\s\S]*?)<\/strong>\s*<\/em>([^<']{0,60})'([^'<\n]{1,40})'/g)) {
        const sense = plain(m[1] || m[4]).trim();
        const term = decode(m[3] || m[6]);
        if (isForeign(term) || /^\p{Lu}/u.test(term) || term.split(/\s+/).length === 1) touch(term, doc, sentenceOf(term), sense);
      }
      // 2. any 'quoted' foreign term
      for (const m of p.text.matchAll(/'([^'\n]{1,40})'/g)) if (isForeign(m[1])) touch(m[1], doc, sentenceOf(m[1]));
      // 3. bare words with IAST diacritics
      for (const m of p.text.matchAll(WORD_RE)) if (isForeign(m[0])) touch(m[0].replace(/['’-]+$/, ''), doc, sentenceOf(m[0]));
      // 4. short italic terms (not ***sense***, not italic illustrations in quotes)
      if (opts.italic !== false) {
        for (const m of p.html.matchAll(/(?<!<strong>\s*)<em>([^<]{2,60})<\/em>(?!\s*<\/strong>)/g)) {
          const t = decode(m[1]).trim();
          if (/[„”"]/.test(t) || t.split(/\s+/).length > maxItalic) continue;
          if (!isForeign(t) && !/^[\p{Ll}\p{Lu}-]+$/u.test(t.replace(/\s/g, ''))) continue;
          if (!isForeign(t) && /[ăâîșțşţ]/i.test(t)) continue; // Romanian italic emphasis
          touch(t, doc, sentenceOf(t));
        }
      }
    }
  }
  for (const e of opts.extra || []) touch(e.term, null, e.definition || '', e.sense || '');
  const list = [...terms.values()].sort((a, b) => sortKey(a.term, b.term));
  const html = [
    `<h1>${escapeHtml(title)}</h1>`,
    `<p>${list.length} termeni. Generat automat${opts.date ? ` la ${escapeHtml(opts.date)}` : ''}; sensul românesc vine din ancora ALOGEN, definiția din prima frază în care apare termenul.</p>`,
    '<table><tbody>',
    '<tr><th><p>Termen</p></th><th><p>Sens românesc</p></th><th><p>Prima definiție</p></th><th><p>Trimiteri</p></th></tr>',
    ...list.map((t) => `<tr><td><p>${escapeHtml(t.term)}</p></td><td><p>${escapeHtml(t.sense)}</p></td><td><p>${escapeHtml(t.definition)}</p></td><td><p>${escapeHtml(t.refs.join('; '))}</p></td></tr>`),
    '</tbody></table>',
  ].join('');
  return { title, terms: list, html };
}

// ---------------------------------------------------------------------------
// Glosar_de_lectură

const STOP = new Set(
  'care este sunt acest această aceste acestei acestor unde când pentru despre asupra între după până într dintr printre fiecare toate toată totul orice nimic astfel decât foarte doar încă poate prin fără sale său sau iar însă ceea cele cel cea cei unei unui unor lui lor dacă atât atunci acum aici acolo aceasta acesta acel acea acei acele'.split(' '),
);

/**
 * buildReadingGlossary(docs, opts) -> { title, terms:[{term, definition, refs, source:'marcat'|'rar'}], html }
 * Marked terms: <mark>term</mark>, {{term}} or opts.marked: ['term'].
 * Rare terms: words of ≥ opts.minLength (10) letters occurring ≤ opts.maxFreq (2) times
 * in the whole book, at most opts.maxRare (30), longest first. opts.exclude: words to skip
 * (e.g. the terms already in Glosar_Alogeni_Indieni). opts.rare=false disables them.
 */
export function buildReadingGlossary(docs, opts = {}) {
  const title = opts.title || 'Glosar_de_lectură';
  const minLength = opts.minLength || 10;
  const maxFreq = opts.maxFreq || 2;
  const exclude = new Set((opts.exclude || []).map(fold));
  const marked = new Map();
  const firstSentence = new Map();
  const refs = new Map();
  const freq = new Map();
  const mark = (term, doc, sentence) => {
    const k = fold(term);
    if (!term) return;
    if (!marked.has(k)) marked.set(k, { term, definition: sentence || '', refs: [], source: 'marcat' });
    const e = marked.get(k);
    if (!e.definition && sentence) e.definition = sentence;
    if (doc && !e.refs.includes(doc.title)) e.refs.push(doc.title);
  };
  for (const term of opts.marked || []) mark(String(term).trim(), null, '');

  for (const doc of docs) {
    for (const p of paragraphs(doc.html)) {
      if (/^h[1-6]$/.test(p.tag)) continue;
      const text = p.text.replace(/\{\{([^}]+)\}\}/g, '$1');
      const sents = sentences(text);
      const sentenceOf = (needle) => sents.find((s) => s.includes(needle)) || '';
      for (const m of p.html.matchAll(/<mark[^>]*>([\s\S]*?)<\/mark>/g)) mark(plain(m[1]).trim(), doc, sentenceOf(plain(m[1]).trim()));
      for (const m of p.text.matchAll(/\{\{([^}]+)\}\}/g)) mark(m[1].trim(), doc, sentenceOf(m[1].trim()));
      for (const w of text.match(WORD_RE) || []) {
        const lw = w.toLocaleLowerCase('ro').replace(/['’-]+$/, '');
        freq.set(lw, (freq.get(lw) || 0) + 1);
        if (!firstSentence.has(lw)) firstSentence.set(lw, sentenceOf(w));
        if (!refs.has(lw)) refs.set(lw, []);
        if (!refs.get(lw).includes(doc.title)) refs.get(lw).push(doc.title);
      }
    }
  }
  // marked terms from opts.marked: find a definition
  for (const e of marked.values()) {
    if (!e.definition) e.definition = firstSentence.get(e.term.toLocaleLowerCase('ro')) || '';
    if (!e.refs.length) e.refs = refs.get(e.term.toLocaleLowerCase('ro')) || [];
  }
  const rare = [];
  if (opts.rare !== false) {
    for (const [w, n] of freq) {
      if (n > maxFreq || [...w].length < minLength || STOP.has(w) || exclude.has(fold(w)) || marked.has(fold(w)) || IAST.test(w) || /\d/.test(w)) continue;
      rare.push({ term: w, definition: firstSentence.get(w) || '', refs: refs.get(w) || [], source: 'rar' });
    }
    rare.sort((a, b) => [...b.term].length - [...a.term].length || sortKey(a.term, b.term));
  }
  const list = [...marked.values(), ...rare.slice(0, opts.maxRare ?? 30)].sort((a, b) => sortKey(a.term, b.term));
  const html = [
    `<h1>${escapeHtml(title)}</h1>`,
    ...list.map((t) => `<p><strong>${escapeHtml(t.term)}</strong>. ${escapeHtml(t.definition || '…')}</p>`),
  ].join('');
  return { title, terms: list, html };
}

// ---------------------------------------------------------------------------
// Cuprins_de_tipar

const NUM_PREFIX = /^\s*(?:(?:Cap\.?|Capitolul|Sub(?:cap)?\.?)\s*)?(\d+(?:\.\d+){0,4})[.)]?\s+/i;

/**
 * buildPrintToc(project, opts) -> { title, entries:[{number, title, depth, id}], html }
 * Numbering follows the binder (1, 1.1, 1.1.1 …). A title that already starts with a
 * canonical number ("2.3 Titlu", "Cap 2 Titlu") keeps it (opts.useTitleNumbers, default true)
 * and the counters continue from it. opts.docs (from collectBookDocs) + opts.includeHeadings
 * adds the <h1>–<h3> headings inside documents as sub-entries. opts.maxDepth limits depth.
 */
export function buildPrintToc(project, opts = {}) {
  const title = opts.title || 'Cuprins_de_tipar';
  const nodes = bookNodes(project, opts).filter((n) => n.type !== 'file');
  const htmlById = new Map((opts.docs || []).map((d) => [d.id, d.html]));
  const counters = [];
  const entries = [];
  const push = (depth, rawTitle, id) => {
    if (opts.maxDepth && depth + 1 > opts.maxDepth) return;
    const m = opts.useTitleNumbers !== false ? NUM_PREFIX.exec(rawTitle) : null;
    let number;
    if (m) {
      number = m[1];
      const parts = number.split('.').map(Number);
      counters.length = depth + 1;
      for (let i = 0; i <= depth; i++) counters[i] = parts[i] ?? parts[parts.length - 1];
    } else {
      counters.length = depth + 1;
      for (let i = 0; i < depth; i++) counters[i] = counters[i] || 1;
      counters[depth] = (counters[depth] || 0) + 1;
      number = counters.slice(0, depth + 1).join('.');
    }
    entries.push({ number, title: (m ? rawTitle.slice(m[0].length) : rawTitle).trim(), depth, id });
  };
  for (const n of nodes) {
    push(n.depth, n.title, n.id);
    if (opts.includeHeadings && htmlById.has(n.id)) {
      const hs = paragraphs(htmlById.get(n.id)).filter((p) => /^h[1-3]$/.test(p.tag) && p.text.trim() && p.text.trim() !== n.title.trim());
      const top = Math.min(...hs.map((h) => Number(h.tag[1])));
      for (const h of hs) {
        push(n.depth + 1 + Number(h.tag[1]) - top, h.text.trim(), n.id);
      }
    }
  }
  const html = [
    `<h1>${escapeHtml(title)}</h1>`,
    ...entries.map((e) => (e.depth === 0 ? `<h2>${escapeHtml(e.number)}. ${escapeHtml(e.title)}</h2>` : `<p>${' '.repeat(e.depth - 1)}${escapeHtml(e.number)} ${escapeHtml(e.title)}</p>`)),
  ].join('');
  return { title, entries, html };
}

/** All three at once. readDoc may be sync or async. Returns {docs, alogen, reading, toc}. */
export async function buildGlossaries(project, readDoc, opts = {}) {
  const docs = opts.docs || (await collectBookDocs(project, readDoc, opts));
  const t = opts.titles || {};
  const alogen = buildAlogenGlossary(docs, { title: t.foreign, ...(opts.alogen || { date: opts.date }) });
  const reading = buildReadingGlossary(docs, { title: t.reading, exclude: alogen.terms.map((x) => x.term), ...(opts.reading || {}) });
  const toc = buildPrintToc(project, { docs, title: t.toc, ...(opts.toc || {}) });
  return { docs, alogen, reading, toc };
}

// ---------------------------------------------------------------------------
// Translator's glossary ("Adaugă în glosar"): one paragraph per term, "<strong>term</strong> — definition",
// in the first Research text document whose title starts with "Glosar" / "Glossary".

const GLOSSARY_TITLE = /^(glosar|glossary)\b/i;

/** { research, node }: the research root and the glossary document (node null when missing). */
export function findGlossaryDoc(project) {
  const research = (project.tree || []).find((n) => n.root === 'research') || (project.tree || [])[1];
  let node = null;
  const walk = (list) => {
    for (const n of list || []) {
      if (!node && n.type === 'text' && GLOSSARY_TITLE.test(n.title || '')) node = n;
      walk(n.children);
    }
  };
  walk(research ? research.children : []);
  return { research, node };
}

/** The paragraph appended for a new term (definition optional, filled in later by the author). */
export function glossaryEntryHtml(term, definition = '') {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<p><strong>${esc(term)}</strong> — ${esc(definition)}</p>`;
}

/** Entries of a glossary document: [{term, definition}] (paragraphs of the form "term — definition"). */
export function glossaryEntries(html) {
  return paragraphs(html)
    .map((p) => /^\s*(.+?)\s+—\s*([\s\S]*)$/.exec(p.text))
    .filter(Boolean)
    .map((m) => ({ term: m[1].trim(), definition: m[2].trim() }));
}

/** True when the glossary already has `term` (case-insensitive). */
export function glossaryHasTerm(html, term) {
  const t = String(term).trim().toLowerCase();
  return paragraphs(html).some((p) => p.text.trim().toLowerCase().startsWith(`${t} —`));
}
