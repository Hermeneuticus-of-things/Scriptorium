// Lightweight part-of-speech guesser for Linguistic Focus (Romanian + English).
//
// LIMITS — read before trusting it: this is a heuristic, not a real tagger.
// - No context/disambiguation beyond one previous word: "cântec" vs "cântă",
//   "run" (noun) vs "run" (verb) are guessed from suffixes and closed-class lists.
// - Closed classes (pronouns, prepositions, conjunctions, articles, auxiliaries,
//   common adverbs) come from small hand-written lists and are fairly reliable.
// - Open classes (noun/verb/adjective/adverb) come from suffix rules; anything
//   unmatched defaults to 'noun'. Expect roughly 60–75% accuracy on prose.
// - Romanian adjectives and adverbs often share forms ("frumos"); the guess
//   is 'adj' unless the previous word is a verb.
// - Proper names (capitalised mid-sentence) are tagged 'noun'.
// It is meant only to dim/highlight text while revising, never to change it.

export const POS_CLASSES = [
  ['noun', 'Substantive'],
  ['verb', 'Verbe'],
  ['adj', 'Adjective'],
  ['adv', 'Adverbe'],
  ['conj', 'Conjuncții'],
  ['pron', 'Pronume'],
];

const set = (s) => new Set(s.split(/\s+/).filter(Boolean));

const CLOSED = {
  ro: {
    pron: set('eu tu el ea noi voi ei ele mă ma te se ne vă îl il îi ii le mi mie ți ti ție tie își isi îmi imi îți iti lui lor dânsul dânsa dânșii dânsele dumneata dumneavoastră dumnealui dumneaei mine tine sine meu mea mei mele tău tau tăi tale său săi sale nostru noastră noștri noastre vostru voastră voștri voastre acesta aceasta aceștia acestea acela aceea aceia acelea cine cineva ceva nimeni nimic oricine orice fiecare toți toate altcineva altceva'),
    conj: set('și si iar dar însă insa ci sau ori nici că ca să sa dacă daca deși desi fiindcă fiindca deoarece căci caci încât incat ca deci totuși totusi precum cum când cand până pana'),
    other: set('a al ai ale alor un o unui unei niște niste cel cea cei cele lui lor ei el ea ele eu tu noi voi ei mă ma te se ne vă va îl il o îi ii le mi ți ti și-a îmi imi îți iti își isi meu mea mei mele tău tau ta tăi tale său sau sa săi sale nostru noastră voastră acest această acesta aceasta aceștia acestea acel acea acela aceea aceia acelea ce care cine cât cat câtă câți câte orice oricine nimic nimeni tot toată toți toate fiecare alt altă alți alte în in pe la de cu din spre pentru prin fără fara sub peste între intre după dupa lângă langa către catre despre până asupra contra datorită'),
    adv: set('nu foarte mai prea chiar doar numai tot încă inca deja acum atunci aici acolo astfel așa asa bine rău rau mult puțin putin mereu niciodată niciodata întotdeauna totdeauna uneori apoi azi astăzi ieri mâine mâine curând curand repede încet incet aproape departe sus jos înainte inainte înapoi inapoi poate desigur abia iarăși iarasi oare'),
    verb: set('este e sunt ești esti suntem sunteți era erau eram fost fi fie va vor vom voi vei am ai are avem aveți au avea aveau aș ar ați ați poate pot putea trebuie'),
  },
  en: {
    pron: set('i you he she it we they me him her us them myself yourself himself herself itself ourselves yourselves themselves mine yours hers ours theirs who whom whoever someone somebody something anyone anybody anything everyone everybody everything nobody nothing none one'),
    conj: set('and but or nor so yet for because although though while whereas if unless since that whether than as when whenever where after before until once'),
    other: set('the a an this that these those i you he she it we they me him her us them my your his its our their mine yours hers ours theirs who whom whose which what in on at by with from to of into onto over under about above below between through during without within against among upon off up down out some any no every each all both either neither many much few several'),
    adv: set('not very too also just only still already now then here there soon never always often sometimes again quite rather almost even ever yet perhaps maybe well away back today yesterday tomorrow'),
    verb: set('is are was were be been being am do does did done have has had having will would shall should can could may might must go goes went gone get got say said make made know knew see saw come came take took think thought'),
  },
};

const SUFFIX = {
  ro: [
    ['adv', /(?:ește|este|mente)$/],
    ['verb', /(?:ează|eaza|ăm|ați|ati|esc|ești|ești|ește|ește|ind|ând|and|ească|easca|ise|ase|ată|ară|aseră|iseră|eam|eai|ează|ezi|ez|are|ire|ere|âre)$/],
    ['verb', /(?:a|i|ă|î)t?u?$/, (w, prev) => prev && /^(?:a|să|sa|nu|se|mă|ma|te|îl|il|o|le|l-|s-|ne|vă|va|vor|va|ar|aș|am|ai|au|poate|pot|trebuie)$/.test(prev)],
    ['adj', /(?:os|oasă|oasa|oși|oase|abil|ibil|bilă|bila|esc|ească|ian|iană|ist|istă|al|ală|ar|ară|iv|ivă|ent|entă|ant|antă|ic|ică|ice|ici)$/],
    ['noun', /(?:ție|tie|ții|ere|ură|ura|tate|tăți|ism|ist|ment|mente|or|oare|ime|ință|inta|eală|ul|ului|ilor|elor|ii|ia|ea)$/],
  ],
  en: [
    ['adv', /ly$/],
    ['verb', /(?:ing|ed|ise|ize|ises|izes|ised|ized|ify|ifies|ate|ates|en)$/],
    ['adj', /(?:ous|ful|less|able|ible|al|ive|ic|ical|ish|ary|est|er)$/, (w) => w.length > 4],
    ['noun', /(?:tion|sion|ment|ness|ity|ism|ist|ship|hood|ance|ence|er|or|age|ery|dom)$/],
  ],
};

const norm = (w) => w.toLocaleLowerCase().replace(/[’']/g, "'");

// Tag one word. prev = previous word (lower case) or ''. Returns
// 'noun' | 'verb' | 'adj' | 'adv' | 'conj' | 'other'.
export function tagWord(word, lang = 'ro', prev = '') {
  const L = lang === 'en' ? 'en' : 'ro';
  const w = norm(word);
  if (!/\p{L}/u.test(w)) return 'other';
  const c = CLOSED[L];
  if (c.conj.has(w)) return 'conj';
  if (c.pron.has(w)) return 'pron';
  if (c.verb.has(w)) return 'verb';
  if (c.adv.has(w)) return 'adv';
  if (c.other.has(w)) return 'other';
  // Romanian: after an infinitive/subjunctive marker the word is a verb.
  if (L === 'ro' && /^(?:a|să|sa|vor|va|ar|aș|as)$/.test(prev) && w.length > 2 && !/(?:ul|ului|ilor|elor)$/.test(w)) return 'verb';
  if (L === 'en' && /^(?:to|will|would|can|could|should|must|may|might|did|do|does)$/.test(prev)) return 'verb';
  if (L === 'en' && /^(?:the|a|an|my|your|his|her|its|our|their|this|that)$/.test(prev) && !/ly$/.test(w)) {
    return /(?:ous|ful|less|able|ible|ive|ish)$/.test(w) ? 'adj' : 'noun';
  }
  for (const [tag, re, cond] of SUFFIX[L]) {
    if (re.test(w) && (!cond || cond(w, prev))) {
      if (L === 'ro' && tag === 'adj' && prev && c.verb.has(prev)) return 'adv';
      return tag;
    }
  }
  return 'noun';
}

const WORD_RE = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;

// Tag all words of a text: [{ from, to, word, tag }] with character offsets.
export function tagText(text, lang = 'ro') {
  const out = [];
  let prev = '';
  for (const m of String(text || '').matchAll(WORD_RE)) {
    const tag = tagWord(m[0], lang, prev);
    out.push({ from: m.index, to: m.index + m[0].length, word: m[0], tag });
    prev = norm(m[0]);
  }
  return out;
}

// Rough language guess for a text, used when the project has no language set.
export function guessLang(text) {
  const t = ` ${String(text || '').toLowerCase()} `;
  const ro = (t.match(/ (?:și|în|că|să|nu|este|pe|la|cu|un|o|care) /g) || []).length + (t.match(/[ăâîșțşţ]/g) || []).length;
  const en = (t.match(/ (?:the|and|of|to|is|in|that|it|was|with) /g) || []).length;
  return en > ro ? 'en' : 'ro';
}
