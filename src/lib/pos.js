// Lightweight part-of-speech guesser for Linguistic Focus (Romanian + English).
//
// How it works (three layers, no network, no dictionaries beyond the lists below):
// 1. Lexicon: closed classes (pronouns, articles, prepositions, conjunctions,
//    auxiliaries, numerals, common adverbs) are listed in full; frequent
//    open-class words (irregular verbs, common adjectives, tricky nouns) are
//    listed too. Romanian adjectives are expanded to their inflected forms.
// 2. Morphology: suffix rules (RO verb endings -ează/-esc/-ea/-se/-ră…, articled
//    nouns -ul/-lui/-ilor…, adjective suffixes -os/-bil/-esc…; EN -ly/-tion/-ous…).
// 3. Context: a left-to-right pass over neighbouring words (infinitive "a",
//    "să", auxiliaries + participle, copula + adjective, verb + adverb, clitic
//    "o" vs article "o", determiner + noun, modal/to + verb…).
//
// LIMITS — read before trusting it: this is still a heuristic, not a real tagger.
// On the hand-tagged literary gold set in tests/pos-accuracy.test.js it scores
// about 90–95% on the coarse classes; expect less on dialogue, poetry or jargon.
// Unknown words default to 'noun'. Proper names (capitalised mid-sentence) are
// tagged 'noun'. It is meant only to dim/highlight text while revising, never
// to change it.

export const POS_CLASSES = [
  ['noun', 'Substantive'],
  ['verb', 'Verbe'],
  ['adj', 'Adjective'],
  ['adv', 'Adverbe'],
  ['conj', 'Conjuncții'],
  ['pron', 'Pronume'],
];

const set = (...parts) => new Set(parts.join(' ').split(/\s+/).filter(Boolean));

// ---------------------------------------------------------------------------
// Romanian lexicon

// Masculine singular adjectives; inflected forms (-ă, -i, -e, -oasă…) are generated.
const RO_ADJ_BASE = `alb negru roșu verde galben albastru mare mic bun rău frumos urât nou vechi tânăr bătrân
  lung scurt înalt scund larg îngust gros subțire cald rece fierbinte ud uscat greu ușor ieftin scump plin gol
  întreg întunecos luminos liniștit trist vesel fericit nefericit singur sigur adânc limpede curat murdar dulce
  amar tare slab moale dur blând aspru sălbatic străin drag drept strâmb pustiu obosit adormit mort viu gri
  palid rotund lat ascuns deschis închis departe aproape bogat sărac cinstit harnic leneș mândru curajos
  timid cuminte iute încet grăbit adevărat fals straniu ciudat cunoscut necunoscut liber ocupat gata
  zbârcit ieftin rar des sec umed tăcut rece lucios mut orb surd șchiop gras subțire pur simplu întreg
  îndepărtat apropiat ultim următor anumit întreg mocnit stângaci prost deștept isteț tânăr`;
// Irregular or awkward inflected forms listed by hand.
const RO_ADJ_EXTRA = `grea grele grei roșie roșii pustie pustii vie vii veche vechi mari mică mici rea răi rele nouă noi noul
  albastră albaștri albastre negri negre multă multe mulți puțină puține puțini tânără tineri tinere bătrână
  bătrâni bătrâne lungi largi largă dragă dragi dulci moi seci uzi ude groasă groși groase sigură siguri sigure
  ultima ultimul ultimii primul prima întreagă întregi albă albi albe`;

function roAdjForms(base) {
  const forms = [base];
  if (/os$/.test(base)) {
    const s = base.slice(0, -2);
    forms.push(`${s}oasă`, `${s}oși`, `${s}oase`);
  } else if (/[bcdfghjklmnprstțvzș]$/.test(base)) {
    const pl = base.replace(/st$/, 'șt').replace(/t$/, 'ț').replace(/d$/, 'z').replace(/s$/, 'ș');
    forms.push(`${base}ă`, `${base}e`, `${pl}i`);
  }
  return forms;
}
const RO_ADJ = set(RO_ADJ_BASE.split(/\s+/).filter(Boolean).flatMap(roAdjForms).join(' '), RO_ADJ_EXTRA);

const RO = {
  pron: set(`eu tu el ea noi voi ei ele mă ma te se ne vă îl il îi ii le mi mie ți ție își isi îmi imi îți iti lui lor
    dânsul dânsa dânșii dânsele dumneata dumneavoastră dumnealui dumneaei mine tine sine acesta aceasta aceștia
    acestea acela aceea aceia acelea cine cineva ceva nimeni nimic oricine orice fiecare toți toate altcineva
    altceva totul toată tot amândoi amândouă însumi însuți însuși însăși înșine`),
  conj: set(`și si iar dar însă insa ci sau ori nici că ca deși desi fiindcă fiindca deoarece căci caci încât incat
    deci totuși totusi precum cum când cand dacă daca`),
  other: set(`a al ai ale alor un o unui unei niște niste cel cea cei cele meu mea mei mele tău tau ta tăi tale
    său sa săi sale nostru noastră noștri noastre vostru voastră voștri voastre acest această acești aceste acel
    acea acei acele ce care cât câtă câți câte alt altă alți alte în in pe la de cu din spre pentru prin fără fara
    sub peste între intre după dupa lângă langa către catre despre până pana asupra contra datorită printre
    dintre dinspre deasupra dedesubtul înaintea împotriva într dintr printr să sa unu una doi două trei patru
    cinci șase șapte opt zece unsprezece doisprezece douăzeci treizeci sută sute mie mii milion milioane
    câteva câțiva câtva`),
  adv: set(`nu foarte mai prea chiar doar numai încă inca deja acum atunci aici acolo astfel așa asa bine rău rau
    mult puțin putin mereu niciodată niciodata întotdeauna totdeauna uneori apoi azi astăzi ieri mâine curând
    curand repede încet incet aproape departe sus jos înainte inainte înapoi inapoi poate desigur abia iarăși
    iarasi oare afară înăuntru acasă devreme târziu deodată brusc tocmai atât atâta oricum altfel parcă
    cumva undeva nicăieri pretutindeni firește bineînțeles împreună dinainte odată iarăși alături degrabă`),
  // Auxiliaries and frequent irregular verb forms.
  verb: set(`este e sunt ești esti suntem sunteți era erai eram erați erau fost fi fie fiind fu fură fusese
    am are avem aveți au avea aveam aveai aveau avut avu va vor vom vei veți aș ar ați
    pot poți poate putem puteți putea puteau putut putu vreau vrei vrea vrem vreți voia voiau vrut vru vrură
    știu știi știe știm știți știa știau știut fac faci face facem faceți făcea făceau făcut făcu făcură
    zic zici zice zicem zicea zis zise spun spui spune spunem spunea spuneau spus dau dai dă dăm dădea dădu dat
    iau iei luăm luați lua luat luă luară stau stai stă stăm stătea stăteau stat stătu merg mergi merge mergem
    mergea mers vin vii vine venim veniți venea veneau venit veniră văd vezi vede vedem vedea vedeau văzut văzu
    cred crezi crede credea crezut țin ține ținea ținut pun pune punea pus duc duce ducea dus trebuie trebuia
    pare părea păreau părut rămâne rămânea rămase rămas devine devenea deveni aștepta așteaptă așteptam
    păstra lucra cânta purta arăta întreba căuta juca intra începe începu început simte simțea plânge plângea
    râde râdea scrie scria citește citea vorbește vorbea gândește gândea`),
  // Nouns that the suffix rules would get wrong.
  noun: set(`duminică muzică fabrică biserică frică cal val deal canal spital metal mal bal semnal ziar far pahar
    calendar cafea perdea stea măsea lalea curea vară scară țară ceară seară vreme lume oameni om case casă clasă
    rase oase timp loc an ani zi zile noapte nopți ochi mână mâini viață moarte dragoste inimă suflet carte cuvânt
    fată băiat copil copii mamă tată frate soră femeie bărbat bărbați domn doamnă drum oraș sat câmp pădure apă
    foc vânt cer soare lună pământ`),
};

// ---------------------------------------------------------------------------
// English lexicon

const EN_IRREGULAR = `was were been being am is are be do does did done have has had having
  went gone stood felt sat gave given began begun came took taken saw seen said told found thought brought
  bought caught taught fought sought kept slept lost held heard met ran wrote written spoke spoken broke
  broken chose chosen rose risen fell fallen drove driven rode knew known grew grown threw thrown flew drew
  drawn wore worn tore torn ate eaten drank drunk sang sung rang swam sank forgot forgotten got gotten lay
  lain laid paid sent spent built lent bent meant led fled bled fed stuck struck hung swung dug shook shaken
  woke woken stole stolen froze frozen hid hidden bit bitten became understood wept crept knelt dreamt burnt
  spat slid sprang made goes says makes knows`;

const EN = {
  pron: set(`i you he she it we they me him her us them myself yourself himself herself itself ourselves
    yourselves themselves mine yours hers ours theirs who whom whoever someone somebody something anyone
    anybody anything everyone everybody everything nobody nothing none`),
  conj: set(`and but or nor so yet for because although though while whereas if unless since that whether than
    as when whenever where wherever after before until once`),
  other: set(`the a an this that these those my your his its our their whose which what in on at by with from to of
    into onto over under about above below between through during without within against among upon off up
    down out some any no every each all both either neither many much few several one two three four five six
    seven eight nine ten hundred thousand toward towards beside besides behind across along around beyond
    near past throughout underneath beneath despite except like via per inside outside`),
  adv: set(`not never very too also just only still already now then here there soon always often sometimes again
    quite rather almost even ever perhaps maybe well away back today yesterday tomorrow somehow somewhere
    anywhere everywhere nowhere instead indeed together later once twice home ahead`),
  verbStrong: set(EN_IRREGULAR, `will would shall should can could may might must`),
  // Base forms that are usually verbs but can be nouns ("a walk", "the rise").
  verbWeak: set(`go get say make know see come take think tell find give stand feel sit begin bring keep hold hear
    meet run write speak break choose rise fall drive ride grow throw fly draw wear eat drink sing forget lie
    pay send spend build mean lead shake wake steal freeze hide become understand weep walk look turn want need
    try ask call seem help show move live believe happen remember follow close watch wait wish hope love like
    leave let put set cut shut hit stay smile laugh cry whisper answer reply`),
  adj: set(`old young new good bad great big small little large long short high low tall cold warm hot cool wet
    dry soft hard dark bright pale quiet loud kind cruel gentle strange familiar sure certain ready alone afraid
    alive dead empty full open whole upper lower inner outer elderly lonely lovely friendly ugly silly early
    likely holy heavy thin thick deep wide narrow sharp sweet bitter clean dirty rich poor free happy sad angry
    tired sick strong weak fine clear real true false black white red green blue grey gray brown yellow golden
    silent fresh rough smooth calm wild proud brave late own other same last next first second best worst
    better worse whole private honest modest`),
  noun: set(`evening morning thing nothing building ceiling feeling king ring spring wing string family belly
    animal hospital festival signal metal capital chocolate plate gate state fate garden children kitchen women
    heaven water letter paper father mother brother sister daughter corner winter summer river finger number
    dinner flower power tower order matter forest interest wedding ending beginning painting meeting
    handwriting clothing`),
};

// ---------------------------------------------------------------------------
// Morphology

const RO_PARTICIPLE = /(?:at|ată|ate|ați|it|ită|ite|iți|ut|ută|ute|uți|ât|âtă|âte|âți)$/;
const RO_ARTICLED = /(?:ul|le|lui|lor|ua)$/;
const RO_GENITIVE = /(?:ului|ilor|elor|ei|ii)$/;

const SUFFIX = {
  ro: [
    ['adv', /(?:enește|ănește|ărește|ețește|ățește|icește|mente)$/],
    ['noun', /(?:ului|ilor|elor|ul|tate|tăți|ție|ții|ism|ment|ință|eală|ură|ime|are|ire|ere|âre|ure)$/, (w) => w.length > 5 || /(?:ul|ului)$/.test(w)],
    ['verb', /(?:ează|eaza|ezi|ez|esc|ești|ește|ăsc|ăști|ăște|ind|ând|ească|ăm|eam|eai|eau|eați|seră|aseră|iseră|useră)$/],
    // Pluperfect -se (coborâse, plecase, întorsese); short words are nouns (case, rase).
    ['verb', /(?:ase|ise|use|âse|sese)$/, (w) => w.length > 5],
    // Past simple plural -ară/-iră/-ură (intrară, plecară); not -oară (comoară).
    ['verb', /(?:ară|iră|ură|âră)$/, (w) => w.length > 5 && !/oară$/.test(w)],
    // Imperfect -ea (stătea, privea, bătea).
    ['noun', /(?:area|erea|irea|ârea|urea)$/],
    ['verb', /[^ei]ea$/, (w) => w.length > 4],
    // Past simple -u (tăcu, căzu); not -ru/-iu or vowel + u (codru, birou).
    ['verb', /[^aeiouăâîr]u$/, (w) => w.length > 3],
    ['adj', /(?:os|oasă|oși|oase|abil|ibil|abilă|ibilă|abili|ibili|esc|ească|ești|ian|iană|al|ală|ali|ale|iv|ivă|ivi|ive|ic|ică|ici|ice)$/, (w) => w.length > 4],
    ['noun', /(?:or|oare|ist|istă|ii|ia|ea|a|ă|e|i)$/],
  ],
  en: [
    ['adv', /ly$/],
    ['noun', /(?:tion|sion|ment|ness|ity|ism|ist|ship|hood|ance|ence|age|ery|dom|er|or)$/, (w) => w.length > 4],
    ['verb', /(?:ing|ed|ise|ize|ises|izes|ised|ized|ify|ifies|ified)$/, (w) => w.length > 4],
    ['adj', /(?:ous|ful|less|able|ible|al|ive|ic|ical|ish|ary|est|ent|ant|y)$/, (w) => w.length > 4],
    ['verb', /(?:ate|ates)$/, (w) => w.length > 5],
  ],
};

const norm = (w) => w.toLocaleLowerCase().replace(/[’']/g, "'");

/**
 * Lexicon + morphology + one-word-left context.
 * Returns { tag, strong } — strong = from a lexicon or a reliable rule,
 * so the context pass in tagText leaves it alone.
 */
function classify(w, L, prev) {
  const lex = L === 'en' ? EN : RO;
  if (!/\p{L}/u.test(w)) return { tag: 'other', strong: true };
  if (lex.conj.has(w)) return { tag: 'conj', strong: true };
  if (lex.pron.has(w)) return { tag: 'pron', strong: true };
  if (L === 'ro') {
    if (RO.verb.has(w)) return { tag: 'verb', strong: true };
    if (RO.adv.has(w)) return { tag: 'adv', strong: true };
    if (RO.other.has(w)) return { tag: 'other', strong: true };
    if (RO_ADJ.has(w)) return { tag: 'adj', strong: true };
    if (RO.noun.has(w)) return { tag: 'noun', strong: true };
    if (w.includes('-')) return classifyHyphen(w, L, prev);
    // Infinitive "a", subjunctive "să", future/conditional auxiliaries -> verb.
    if (/^(?:a|să|sa|vor|va|vom|vei|ar|aș|as|veți)$/.test(prev) && w.length > 2 && !RO_ARTICLED.test(w)) return { tag: 'verb', strong: false };
  } else {
    if (EN.verbStrong.has(w)) return { tag: 'verb', strong: true };
    if (EN.adv.has(w)) return { tag: 'adv', strong: true };
    if (EN.other.has(w)) return { tag: 'other', strong: true };
    if (EN.adj.has(w)) return { tag: 'adj', strong: true };
    if (EN.noun.has(w)) return { tag: 'noun', strong: true };
    if (/'s$/.test(w)) return { tag: 'noun', strong: true };
    if (/^(?:to|will|would|can|could|should|must|may|might|did|do|does|shall)$/.test(prev)) return { tag: 'verb', strong: false };
    if (/^(?:the|a|an|my|your|his|her|its|our|their|this|that)$/.test(prev) && !/ly$/.test(w)) {
      return { tag: /(?:ous|ful|less|able|ible|ive|ish)$/.test(w) ? 'adj' : 'noun', strong: false };
    }
    if (EN.verbWeak.has(w)) return { tag: 'verb', strong: false };
    // Regular forms of known verbs: walks, walked, walking.
    const stem = w.replace(/(?:ing|ed|es|s|d)$/, '');
    if (stem !== w && (EN.verbWeak.has(stem) || EN.verbWeak.has(`${stem}e`))) return { tag: 'verb', strong: false };
  }
  for (const [tag, re, cond] of SUFFIX[L]) {
    if (re.test(w) && (!cond || cond(w, prev))) return { tag, strong: false };
  }
  return { tag: 'noun', strong: false };
}

// "s-a", "într-o", "duce-l", "mi-a"...
function classifyHyphen(w, L, prev) {
  const parts = w.split('-');
  const last = parts[parts.length - 1];
  if (/^(?:a|au|am|ai|ar|aș|ați)$/.test(last)) return { tag: 'verb', strong: true };
  if (/^(?:o|un|l|i|le|mi|ți|și|ne|vă|se|s|mă|te|ți)$/.test(last)) {
    const head = classify(parts[0], L, prev);
    return head.tag === 'pron' ? { tag: 'pron', strong: true } : head;
  }
  return classify(last, L, prev);
}

// Tag one word. prev = previous word (lower case) or ''. Returns
// 'noun' | 'verb' | 'adj' | 'adv' | 'conj' | 'pron' | 'other'.
export function tagWord(word, lang = 'ro', prev = '') {
  return classify(norm(word), lang === 'en' ? 'en' : 'ro', prev).tag;
}

// ---------------------------------------------------------------------------
// Context pass

const RO_AUX = /^(?:am|ai|a|au|ați|fost|fi|s-a|s-au|m-am|te-ai|ne-am|v-ați|l-a|i-a|mi-a|și-a|le-a)$/;
const RO_COPULA = /^(?:este|e|sunt|ești|suntem|sunteți|era|erau|eram|erai|fi|fie|fost|pare|părea|păreau|părut|rămâne|rămânea|rămase|devine|devenea|deveni|părură|păru)$/;
const RO_SUBJECT_PRON = /^(?:eu|tu|el|ea|noi|voi|ei|ele|care|cine|nimeni|cineva)$/;
const RO_CLITIC = /^(?:se|îl|îi|le|mă|te|ne|vă|își|îmi|îți|mi|ți|nu)$/;
const RO_PREP_OR_VERB_BEFORE_ARTICLE = /^(?:în|pe|la|de|cu|din|spre|pentru|prin|fără|sub|peste|între|după|lângă|către|despre|până|și|sau|iar|dar|că)$/;

function contextRo(items) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const prev = !it.brk && i > 0 ? items[i - 1] : null;
    const next = i + 1 < items.length && !items[i + 1].brk ? items[i + 1] : null;
    const w = it.w;

    // "o": article ("o umbră") vs clitic pronoun ("nu o ascultă", "Băiatul o îmbrățișă").
    if (w === 'o' && next) {
      const clitic = prev && !RO_PREP_OR_VERB_BEFORE_ARTICLE.test(prev.w) && prev.tag !== 'verb'
        && (prev.tag === 'noun' || prev.tag === 'pron' || prev.w === 'nu');
      if (clitic) {
        it.tag = 'pron';
        if (!next.strong) { next.tag = 'verb'; next.ctx = true; }
      } else if (!next.strong && next.tag === 'verb' && /[ăe]$/.test(next.w)) {
        next.tag = 'noun';
      }
      continue;
    }

    // "a"/"ai": auxiliary before a participle ("a primit"), otherwise infinitive/genitive marker.
    if ((w === 'a' || w === 'ai') && next && RO_PARTICIPLE.test(next.w) && next.w.length > 3 && !RO.noun.has(next.w)) {
      it.tag = 'verb';
      continue;
    }

    if (!prev || it.tag === 'conj' || it.tag === 'pron' || it.tag === 'other' || it.tag === 'adv' || it.ctx) continue;

    // Participles and adjective-like forms: aux -> verb, copula -> adj, after a verb -> adverb.
    const participle = RO_PARTICIPLE.test(w) && w.length > 3 && !RO.noun.has(w);
    if (participle && (RO_AUX.test(prev.w) || (prev.w === 'a' && prev.tag === 'verb'))) { it.tag = 'verb'; continue; }
    if ((participle || it.tag === 'adj') && RO_COPULA.test(prev.w)) { it.tag = 'adj'; continue; }
    const mascSg = !/[ăeiu]$/.test(w);
    if ((participle || it.tag === 'adj') && prev.tag === 'verb' && !RO_AUX.test(prev.w) && !RO_COPULA.test(prev.w)) {
      if (mascSg) { it.tag = 'adv'; continue; }
      it.tag = 'adj';
      continue;
    }
    if (participle && prev.tag === 'noun' && !it.strong) { it.tag = 'adj'; continue; }

    // Unknown word right after a subject (articled noun, subject pronoun, clitic, "nu") is a verb:
    // "Câinele lătră", "care trecea", "se ivi", "nu vorbi".
    if (!it.strong && (it.tag === 'noun' || (it.tag === 'adj' && !participle)) && !RO_GENITIVE.test(w) && !RO_ARTICLED.test(w)) {
      const subj = (prev.tag === 'noun' && RO_ARTICLED.test(prev.w))
        || RO_SUBJECT_PRON.test(prev.w) || RO_CLITIC.test(prev.w) || (prev.w === 'o' && prev.tag === 'pron');
      if (subj) { it.tag = 'verb'; continue; }
    }
    // Weak verb guess right after an article/preposition is really a noun ("o umbră", "pe masă").
    if (!it.strong && it.tag === 'verb' && prev.tag === 'other' && !/^(?:a|să|sa|ce|care)$/.test(prev.w)) it.tag = 'noun';
  }
}

const EN_DET = /^(?:the|a|an|my|your|his|her|its|our|their|this|that|these|those|every|each|some|any|no|another|whose)$/;
const EN_MODAL = /^(?:to|will|would|can|could|should|must|may|might|did|do|does|shall|didn't|don't|doesn't|won't|can't|couldn't|wouldn't|shouldn't)$/;
const EN_SUBJECT = /^(?:i|you|he|she|we|they)$/;
const EN_COPULA = /^(?:is|are|was|were|be|been|being|am|seem|seems|seemed|feel|feels|felt|look|looks|looked|become|becomes|became|grew|remain|remained|stay|stayed|sounded|appeared)$/;
const EN_ADV_PREP = /^(?:inside|outside|behind|around|along|across|above|below|beneath|underneath|within|nearby|before|after|off|up|down|out|over|through)$/;

function contextEn(items) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const next = i + 1 < items.length && !items[i + 1].brk ? items[i + 1] : null;
    // Look back over adverbs ("could not remember", "will never go").
    let j = i - 1;
    let brk = it.brk;
    while (j >= 0 && !brk && items[j].tag === 'adv') { brk = items[j].brk; j--; }
    const prev = !it.brk && i > 0 ? items[i - 1] : null;
    const head = !brk && j >= 0 ? items[j] : null;

    // Prepositions with no object are adverbs ("singing inside.", "Outside, the wind").
    if (EN_ADV_PREP.test(it.w) && !next && /^(?:inside|outside|behind|around|nearby|underneath|below|above)$/.test(it.w)) { it.tag = 'adv'; continue; }
    if (it.tag === 'conj' || it.tag === 'pron' || it.tag === 'other' || it.tag === 'adv') continue;
    if (it.cap && i > 0 && !it.brkStrong && !it.lexical) { it.tag = 'noun'; continue; }

    if (head && EN_MODAL.test(head.w) && !(it.strong && it.tag !== 'verb' && it.tag !== 'noun')) { it.tag = 'verb'; continue; }
    if (prev && EN_DET.test(prev.w) || (prev && prev.tag === 'adj' && i > 1 && EN_DET.test(items[i - 2].w))) {
      if (it.tag === 'adj' && next && (next.tag === 'noun' || !next.strong)) continue;
      if (it.tag === 'adj' && !next) continue;
      if (!it.strong || /ing$/.test(it.w)) {
        it.tag = /(?:ous|ful|less|able|ible|ive|ish)$/.test(it.w) && next ? 'adj' : 'noun';
      }
      continue;
    }
    if (head && EN_COPULA.test(head.w) && it.tag !== 'verb') { it.tag = 'adj'; continue; }
    if (head && EN_COPULA.test(head.w) && !it.strong && !/(?:ing|ed)$/.test(it.w)) { it.tag = 'adj'; continue; }
    if (prev && EN_SUBJECT.test(prev.w) && !it.strong && it.tag !== 'adj') { it.tag = 'verb'; continue; }
  }
}

const WORD_RE = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;

// Tag all words of a text: [{ from, to, word, tag }] with character offsets.
export function tagText(text, lang = 'ro') {
  const L = lang === 'en' ? 'en' : 'ro';
  const src = String(text || '');
  const items = [];
  let prev = '';
  let lastEnd = 0;
  for (const m of src.matchAll(WORD_RE)) {
    const gap = src.slice(lastEnd, m.index);
    const brk = /[.,;:!?…—–()"«»„”“\n￼]/.test(gap);
    const brkStrong = items.length === 0 || /[.!?…\n"«»„”“—–]/.test(gap);
    const w = norm(m[0]);
    const c = classify(w, L, brk ? '' : prev);
    items.push({
      from: m.index, to: m.index + m[0].length, word: m[0], w, tag: c.tag, strong: c.strong, brk, brkStrong,
      cap: /^\p{Lu}/u.test(m[0]), lexical: c.strong,
    });
    prev = w;
    lastEnd = m.index + m[0].length;
  }
  if (L === 'ro') contextRo(items);
  else contextEn(items);
  return items.map(({ from, to, word, tag }) => ({ from, to, word, tag }));
}

// Rough language guess for a text, used when the project has no language set.
export function guessLang(text) {
  const t = ` ${String(text || '').toLowerCase()} `;
  const ro = (t.match(/ (?:și|în|că|să|nu|este|pe|la|cu|un|o|care) /g) || []).length + (t.match(/[ăâîșțşţ]/g) || []).length;
  const en = (t.match(/ (?:the|and|of|to|is|in|that|it|was|with) /g) || []).length;
  return en > ro ? 'en' : 'ro';
}

// Prepositions (Linguistic Focus: "prep"). The tagger files them under 'other' with the articles
// and determiners; this list picks them out of that class without changing the tagger's output.
export const PREPOSITIONS = {
  ro: set(`în in pe la de cu din spre pentru prin fără fara sub peste între intre după dupa lângă langa către catre
    despre până pana asupra contra datorită datorita printre dintre dinspre înspre inspre deasupra dedesubtul
    împotriva impotriva înaintea inaintea înapoia inapoia alături alaturi conform potrivit grație gratie față fata
    lângă dinaintea dinapoia întru intru`),
  en: set(`in on at by with from to of into onto over under about above below between through during without
    within against among upon off toward towards beside besides behind across along around beyond near past
    since until till via per amid amidst beneath underneath inside outside throughout despite except like unlike`),
};

/** True when `word` (any case) is a preposition in `lang` ('ro' | 'en'). */
export function isPreposition(word, lang = 'ro') {
  const w = String(word || '').toLocaleLowerCase();
  return (PREPOSITIONS[lang] || PREPOSITIONS.ro).has(w);
}
