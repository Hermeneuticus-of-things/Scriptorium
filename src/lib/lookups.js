// Online lookups for selected text: dictionaries, translation and research sites.
// Shared by the renderer (menu commands, web build) and the Electron context menu.

// DeepL reads the text from the URL fragment; '/' and '|' separate its fields, so they are escaped.
const deeplText = (s) => encodeURIComponent(s.replace(/\\/g, '\\\\').replace(/\//g, '\\/').replace(/\|/g, '\\|'));

const LINGUEE = { en: 'english', ro: 'romanian', fr: 'french', de: 'german', it: 'italian', es: 'spanish', pt: 'portuguese', hu: 'hungarian', ru: 'russian', pl: 'polish', nl: 'dutch' };
// Linguee pairs are "<source>-<target>"; 'auto' and unknown languages fall back to English.
function lingueePair(o) {
  const from = LINGUEE[o.from] || 'english';
  const to = LINGUEE[o.to] || 'romanian';
  return from === to ? `english-${to === 'english' ? 'romanian' : to}` : `${from}-${to}`;
}

export const LOOKUPS = {
  dictionary: { group: 'dict', label: 'Dicționar (dexonline)', word: true, url: (q) => `https://dexonline.ro/definitie/${encodeURIComponent(q)}` },
  synonyms: { group: 'dict', label: 'Sinonime (dexonline)', word: true, url: (q) => `https://dexonline.ro/definitie/${encodeURIComponent(q)}/sinonime` },
  wiktionary: { group: 'dict', label: 'Wiktionary', word: true, url: (q) => `https://en.wiktionary.org/wiki/${encodeURIComponent(q.replace(/ /g, '_'))}` },
  cambridge: { group: 'dict', label: 'Cambridge Dictionary (EN)', word: true, url: (q) => `https://dictionary.cambridge.org/search/direct/?datasetsearch=english&q=${encodeURIComponent(q)}` },
  merriam: { group: 'dict', label: 'Merriam-Webster (EN)', word: true, url: (q) => `https://www.merriam-webster.com/dictionary/${encodeURIComponent(q)}` },
  linguee: { group: 'dict', label: 'Linguee (exemple traduse)', word: true, url: (q, o) => `https://www.linguee.com/${lingueePair(o)}/search?query=${encodeURIComponent(q)}` },
  iate: { group: 'dict', label: 'IATE (terminologie UE)', word: true, url: (q, o) => `https://iate.europa.eu/search/result?query=${encodeURIComponent(q)}&sourceLanguage=${!o.from || o.from === 'auto' ? 'en' : o.from}&targetLanguages=${o.to || 'ro'}` },
  deepl: { group: 'translate', label: 'DeepL', url: (q, o) => `https://www.deepl.com/translator#${o.from || 'auto'}/${o.to || 'ro'}/${deeplText(q)}` },
  googleTranslate: { group: 'translate', label: 'Google Translate', url: (q, o) => `https://translate.google.com/?sl=${o.from || 'auto'}&tl=${o.to || 'ro'}&op=translate&text=${encodeURIComponent(q)}` },
  wikipedia: { group: 'research', label: 'Wikipedia', url: (q) => `https://ro.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}` },
  scholar: { group: 'research', label: 'Google Scholar', url: (q) => `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}` },
  google: { group: 'research', label: 'Google', url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
};

// Lookups of single terms stop at a short phrase; translation takes a paragraph-sized excerpt.
export const MAX_WORD = 80;
export const MAX_TRANSLATE = 5000;

/** URL for `kind` on `text`, or '' when the text does not fit that lookup. opts: { from, to, pair } */
export function lookupUrl(kind, text, opts = {}) {
  const def = LOOKUPS[kind];
  const q = String(text || '').trim().replace(/\s+/g, ' ');
  if (!def || !q) return '';
  if (def.word && q.length > MAX_WORD) return '';
  return def.url(def.group === 'translate' ? String(text).trim().slice(0, MAX_TRANSLATE) : q, opts);
}

/** Lookups that apply to `text`, grouped for a menu: { dict: [...], translate: [...], research: [...] } */
export function lookupGroups(text, opts = {}) {
  const out = { translate: [], dict: [], research: [] };
  for (const [kind, def] of Object.entries(LOOKUPS)) {
    const url = lookupUrl(kind, text, opts);
    if (url) out[def.group].push({ kind, label: def.label, url });
  }
  return out;
}

// Target languages offered for translation (DeepL / Google codes) and their names for the AI prompt.
export const LANG_NAMES = { ro: 'română', en: 'engleză', fr: 'franceză', de: 'germană', it: 'italiană', es: 'spaniolă', pt: 'portugheză', hu: 'maghiară', ru: 'rusă', uk: 'ucraineană', pl: 'poloneză', nl: 'neerlandeză' };
