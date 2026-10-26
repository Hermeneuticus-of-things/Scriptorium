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

/** Direct synonyms for `word` from a sinonimul.ro page body, in order, deduped, without the word itself. */
function parseSynonyms(html, word = '') {
  const out = [];
  const seen = new Set();
  const skip = (s) => seen.has(s.toLowerCase());
  const add = (s) => {
    const v = decode(s).replace(/\s+/g, ' ').trim();
    if (!v || skip(v) || v.toLowerCase() === String(word).trim().toLowerCase()) return;
    // A synonym is a word or short phrase of letters, spaces, hyphens and apostrophes.
    if (!/^[\p{L}][\p{L} '’-]*$/u.test(v) || v.length > 40) return;
    seen.add(v.toLowerCase());
    out.push(v);
  };
  const re = /<li[^>]*font-size\s*:\s*22px[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = re.exec(html))) {
    const text = m[1].replace(/<[^>]+>/g, '');
    for (const piece of text.split(',')) add(piece);
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
  if (!synonyms.length) throw new Error(`Nu am găsit sinonime pentru „${w}”.`);
  return { word: w, synonyms };
}

module.exports = { fetchSynonyms, parseSynonyms, UA };
