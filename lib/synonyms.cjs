'use strict';
// Synonyms read in-app from sinonimul.ro: fetch a word's page and read the comma-separated lists it
// shows. Called from the main process (only HTTP(S) leaves the app); `fetch` is injected for tests.
// The direct synonyms are the comma lists inside the <li style='font-size:22px'>…</li> blocks (one
// block per sense); the later <li> items are related words (they link elsewhere) and are skipped.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#8217': '’' };
function decode(s) {
  return String(s).replace(/&(#?\w+);/g, (m, e) => (e in ENTITIES ? ENTITIES[e] : /^#\d+$/.test(e) ? String.fromCodePoint(Number(e.slice(1))) : m));
}

/** Direct synonyms for `word` — v2: the page now carries the full comma list in the
 * <meta name="description"> („Sinonimele cuvântului X sunt: …”), one per sense block. */
function parseSynonyms(html, word = '') {
  const out = [];
  const seen = new Set();
  const add = (s) => {
    const v = decode(s).replace(/\s+/g, ' ').trim();
    if (!v || seen.has(v.toLowerCase()) || v.toLowerCase() === String(word).trim().toLowerCase()) return;
    if (v.includes(' - ')) return; // related-row artifact
    if (!/^[\p{L}][\p{L} '’-]*$/u.test(v) || v.length > 40) return;
    seen.add(v.toLowerCase());
    out.push(v);
  };
  const meta = /<meta\s+(?:name="description"\s+content="|property="og:description"\s+content=")([^"]+)"/i.exec(html);
  if (meta) {
    const list = /sunt\s*:\s*(.+)$/i.exec(meta[1]);
    for (const piece of (list ? list[1] : meta[1]).split(',')) add(piece);
  }
  // Body: the full list is plain <li>word</li> items before the "Sinonime Apropiate" heading.
  // Keep only the longest consecutive run of pure-word <li> items (skips script/lang junk).
  const i = html.search(/Sinonime\s*Apropiate/i);
  const direct = i > 0 ? html.slice(0, i) : html;
  const items = [...direct.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => ({ text: m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(), start: m.index, end: m.index + m[0].length }))
    .map((x) => ({ ...x, word: !x.text.includes(' - ') && /^[\p{L}][\p{L} '’-]*$/u.test(x.text) && x.text.length <= 40 ? x.text : null }));
  // Runs of pure-word <li> items, broken by big gaps (separate menus/nav between lists).
  let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0, curEnd = -1;
  items.forEach((x, idx) => {
    const brk = curStart >= 0 && x.start - curEnd > 80;
    if (x.word !== null && !brk) { if (curStart < 0) curStart = idx; curLen++; curEnd = x.end; if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; } }
    else { curStart = -1; curLen = 0; }
  });
  if (bestLen) for (let k = bestStart; k < bestStart + bestLen; k++) add(items[k].word);
  return out;
}

/** Related words from the "Sinonime Apropiate" section: [{word, synonyms}] — the page links each
 * related word to its own page and lists its synonyms after a dash. */
function parseRelated(html) {
  const out = [];
  const i = html.search(/Sinonime\s*Apropiate/i);
  if (i < 0) return out;
  const section = html.slice(i);
  const stop = section.search(/<h[23][^>]*>/i); // next heading ends the section
  const seg = stop > 0 ? section.slice(0, stop) : section;
  const re = /<li><a[^>]*><b>([^<]+)<\/b><\/a>\s*-\s*([\s\S]*?)(?=<li><a|$)/gi;
  let m;
  while ((m = re.exec(seg))) {
    const word = decode(m[1]).trim();
    const syn = m[2].replace(/<[^>]+>/g, '').split(',').map((x) => decode(x).replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 8);
    if (word && syn.length) out.push({ word, synonyms: syn });
  }
  return out;
}

async function fetchSynonyms({ word, fetchImpl = fetch, signal } = {}) {
  const w = String(word || '').trim();
  if (!w) throw new Error('Niciun cuvânt pentru sinonime.');
  if (/\s/.test(w)) throw new Error('Sinonimele se caută pentru un singur cuvânt.');
  const res = await fetchImpl(`https://sinonimul.ro/${encodeURIComponent(w)}`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'ro,en;q=0.8' },
    signal,
  });
  // sinonimul.ro keeps only base forms (lemmas): an inflected form (e.g. "frumoasă", "mergeam")
  // redirects to its 404 page. Say so instead of showing a raw error.
  if (res.status === 404 || /\/404\.php(?:$|[?#])/.test(res.url || '')) {
    throw new Error(`„${w}” nu e pe sinonimul.ro — încearcă forma de bază a cuvântului (ex. „frumos" în loc de „frumoasă").`);
  }
  if (!res.ok) throw new Error(`sinonimul.ro: eroare ${res.status}.`);
  const html = await res.text();
  const synonyms = parseSynonyms(html, w);
  const related = parseRelated(html);
  if (!synonyms.length && !related.length) throw new Error(`Nu am găsit sinonime pentru „${w}”.`);
  return { word: w, synonyms, related };
}

module.exports = { fetchSynonyms, parseSynonyms, parseRelated, UA };
