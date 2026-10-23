// Small local text helpers: auto-synopsis (no AI) and Writing Tools lookup URLs.

// First sentences of a text, up to maxSentences and roughly maxChars.
export function autoSynopsis(text, { maxSentences = 2, maxChars = 280 } = {}) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const sentences = clean.match(/[^.!?…]+(?:[.!?…]+["”»’)]*|$)/g) || [clean];
  let out = '';
  for (const s of sentences.slice(0, maxSentences)) {
    const next = (out ? `${out} ` : '') + s.trim();
    if (out && next.length > maxChars) break;
    out = next;
  }
  if (out.length > maxChars) out = `${out.slice(0, maxChars).replace(/\s+\S*$/, '')}…`;
  return out;
}

const LOOKUPS = {
  dictionary: (q) => `https://dexonline.ro/definitie/${q}`,
  synonyms: (q) => `https://dexonline.ro/definitie/${q}/sinonime`,
  wikipedia: (q) => `https://ro.wikipedia.org/w/index.php?search=${q}`,
  google: (q) => `https://www.google.com/search?q=${q}`,
};

// URL for a Writing Tools lookup ('dictionary' | 'synonyms' | 'wikipedia' | 'google').
export function lookupUrl(kind, word) {
  const w = String(word || '').trim();
  if (!w || !LOOKUPS[kind]) return '';
  return LOOKUPS[kind](encodeURIComponent(w));
}
