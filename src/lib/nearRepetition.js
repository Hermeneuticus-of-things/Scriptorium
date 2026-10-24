// I-REP near repetition (VKB2 docs/VKB2.md, cerința O13): the same content word (same lemma
// or same form) repeated in one sentence or in two neighbouring sentences, anadiplosis
// „…scutul. Scutul…” included. Deterministic and SOFT: it only signals (S70: „termenul nu se
// schimbă doar ca să nu se repete”), never proposes a change.
//
// Pure module (no DOM, no Node APIs).

import { guessLang, tagWord } from './pos.js';

const WORD_RE = /[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu;

// Diacritics-insensitive key: ş/ș, ţ/ț, ă/â/î/a all fold to their base letter.
export function fold(w) {
  return String(w || '').toLocaleLowerCase('ro').normalize('NFD').replace(/\p{M}/gu, '').replace(/’/g, "'");
}

const set = (s) => new Set(fold(s).split(/\s+/).filter(Boolean));

// Function words not always caught by the tagger (auxiliaries, copula forms, particles,
// grammatical adverbs, numerals, articles). Keys are folded.
const RO_FUNCTION = set(`
  a al ale ai alor unui unei unor un o niste cel cea cei cele celui celei celor lui lor
  am ai are au avem aveti aveam aveai avea aveau avut avand fi fost fiind fie este e sunt esti
  suntem sunteti era erai eram erati erau fusese fusesera fu fura sa s-a s-au m-am te-ai ne-am v-ati
  l-a i-a mi-a si-a le-a va vor vom veti voi vei ar as ati am-o
  nu mai foarte doar numai inca deja chiar tot toti toata toate atat atata atatea atatia asa cam prea
  iar si sau ori ca daca deci dar insa ci nici fiindca deoarece cand cum unde cat cate cati
  acum atunci aici acolo apoi mereu niciodata totusi oare ba da nu-i nu-l
  in pe la de cu din spre pentru prin fara sub peste intre dupa langa catre despre pana
  dintre dintr intr intr-o intr-un dintr-o dintr-un printre asupra contra conform
  unu doi doua trei patru cinci sase sapte opt noua zece suta sute mie mii milion milioane
  primul prima intai doilea doua treilea treia
  ce care cine ceva cineva nimic nimeni orice oricine fiecare fiecarui altul alta alti alte altele
  acest aceasta acesti aceste acestui acestei acestor acel acea acei acele acelui acelei acelor
  acesta aceea aceia acelea insusi insasi
  eu tu el ea noi voi ei ele ma te il o ne va le mi ti ii isi imi iti se si-l s-o
  meu mea mei mele tau ta tai tale sau sa sai sale nostru noastra nostri noastre vostru voastra
`);

const EN_FUNCTION = set(`
  a an the of to in on at by for from with without into onto over under about after before between through
  and or but nor so yet if then than as because while when where whether that which who whom whose what
  i you he she it we they me him her us them my your his its our their mine yours hers ours theirs
  this these those there here not no yes very just only also too still even again ever never always
  is are was were be been being am do does did done have has had having will would shall should can could
  may might must one two three four five six seven eight nine ten first second third hundred thousand
`);

// Locutions: their words are not counted (folded, longest first).
export const LOCUTIONS = {
  ro: [
    'în fața', 'în față', 'pe lângă', 'de-a lungul', 'în timp ce', 'din cauza', 'în loc de', 'în loc să',
    'de fapt', 'în schimb', 'cu toate acestea', 'de altfel', 'în sfârșit', 'de asemenea', 'în jurul',
    'în cele din urmă', 'până la urmă', 'pe de altă parte', 'pe de o parte', 'din când în când', 'de multe ori',
    'în primul rând', 'cel puțin', 'mai ales', 'de obicei', 'la fel', 'în cazul', 'în ciuda', 'în afara',
    'de-a dreptul', 'de îndată ce', 'față de', 'în raport cu', 'cu privire la', 'în funcție de', 'din nou',
    'în timpul', 'în mijlocul', 'de-a lungul', 'în vreme ce', 'după ce', 'înainte de', 'înainte să', 'pe loc',
    'în special', 'de exemplu', 'de pildă', 'în general', 'cu atât mai mult', 'cu adevărat', 'de aceea',
  ],
  en: [
    'in front of', 'because of', 'instead of', 'in spite of', 'as well as', 'at least', 'of course', 'in fact',
    'at all', 'each other', 'one another', 'as soon as', 'in order to', 'such as', 'at last', 'for example',
    'on the other hand', 'all the same', 'at once', 'in the end', 'in general',
  ],
};

// Reduplicates „pas cu pas”, „zi de zi”, „om după om”, „din loc în loc”: one occurrence.
const REDUP = new Set(['cu', 'de', 'dupa', 'la', 'in', 'by', 'after', 'to']);

// Light stemming: Romanian definite articles / case / plural, simple English inflection.
// Conservative: a short stem keeps its final vowel (canonicalised) so „mare” ≠ „măr”, „cale” ≠ „cal”.
const RO_SUFFIXES = [
  ['urilor', '', 2], ['urile', '', 2], ['ilor', 'i', 3], ['elor', 'e', 3], ['ului', '', 2], ['uri', '', 3],
  ['ele', 'e', 3], ['ul', '', 2], ['ei', 'e', 3], ['ii', 'i', 3], ['ea', 'e', 3], ['lui', '', 3], ['lor', '', 3],
];

export function lemma(word, lang = 'ro') {
  let k = fold(word);
  if (lang === 'en') {
    if (k.length > 5 && k.endsWith('ing')) return k.slice(0, -3);
    if (k.length > 4 && k.endsWith('ied')) return `${k.slice(0, -3)}y`;
    if (k.length > 4 && k.endsWith('ies')) return `${k.slice(0, -3)}y`;
    if (k.length > 4 && k.endsWith('ed')) return k.slice(0, -2);
    if (k.length > 4 && /(?:ss|sh|ch|x|z)es$/.test(k)) return k.slice(0, -2);
    if (k.length > 3 && k.endsWith('s') && !/(?:ss|us|is)$/.test(k)) return k.slice(0, -1);
    return k;
  }
  for (const [suf, rep, min] of RO_SUFFIXES) {
    if (k.length - suf.length >= min && k.endsWith(suf)) {
      k = k.slice(0, -suf.length) + rep;
      break;
    }
  }
  if (/[aeiu]$/.test(k)) k = k.length - 1 >= 4 ? k.slice(0, -1) : `${k.slice(0, -1)}e`;
  return k;
}

function isFunctionWord(w, lang, prev) {
  const f = fold(w);
  if (/^\p{N}/u.test(w) || (/^[IVXLCDM]+$/.test(w) && w.length > 1)) return true;
  if (f.length < 2) return true;
  if ((lang === 'en' ? EN_FUNCTION : RO_FUNCTION).has(f)) return true;
  if (lang === 'ro' && /^(?:al|a|ai|ale)-?(?:doilea|treilea|patrulea|cincilea|saselea|saptelea|optulea|noualea|zecelea|doua|treia|patra|cincea|sasea|saptea|opta|noua|zecea)$/.test(f)) return true;
  if (lang === 'ro' && /^(?:a|al)$/.test(prev || '') && /(?:lea|ea|a)$/.test(f) && /^(?:doi|trei|patr|cinc|sase|sapt|opt|nou|zec|unspr|douazec)/.test(f)) return true;
  if (lang === 'en' && /^\d+(?:st|nd|rd|th)$/.test(f)) return true;
  const tag = tagWord(w, lang, prev || '');
  return tag === 'pron' || tag === 'conj' || tag === 'other';
}

// Sentences of a paragraph with offsets.
function sentenceSpans(text) {
  const out = [];
  const re = /[.!?…]+[»”"'’)]*(?=\s|$)/gu;
  let start = 0;
  let m;
  while ((m = re.exec(text))) {
    const end = m.index + m[0].length;
    if (text.slice(start, end).trim()) out.push([start, end]);
    start = end;
  }
  if (text.slice(start).trim()) out.push([start, text.length]);
  return out;
}

function locutionMask(text, lang) {
  const mask = new Uint8Array(text.length);
  const ft = fold(text);
  for (const loc of LOCUTIONS[lang] || []) {
    const fl = fold(loc).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${fl}(?![\\p{L}\\p{N}])`, 'gu');
    for (const m of ft.matchAll(re)) mask.fill(1, m.index, m.index + m[0].length);
  }
  return mask;
}

/**
 * detectNearRepetitions(paragraphs, {lang}) -> groups
 * paragraphs: array of plain-text strings (one per document line/paragraph, 1-based in output).
 * group: { lemma, form, k, occurrences: [{ para, sentence, start, end, text }] }
 */
export function detectNearRepetitions(paragraphs, opts = {}) {
  const paras = (paragraphs || []).map((p) => String(p ?? ''));
  const lang = opts.lang === 'en' || opts.lang === 'ro' ? opts.lang : guessLang(paras.join(' '));
  const tokens = [];
  let sentence = 0;
  paras.forEach((text, pi) => {
    const mask = locutionMask(text, lang);
    for (const [s0, s1] of sentenceSpans(text)) {
      const seg = text.slice(s0, s1);
      const words = [...seg.matchAll(WORD_RE)].map((m) => ({ w: m[0], start: s0 + m.index, end: s0 + m.index + m[0].length }));
      let prev = '';
      for (let i = 0; i < words.length; i++) {
        const t = words[i];
        const p = prev;
        prev = fold(t.w);
        if (mask[t.start]) continue;
        // Reduplicate „X cu X”: the second X is the same occurrence.
        if (i >= 2 && REDUP.has(fold(words[i - 1].w)) && fold(words[i - 2].w) === fold(t.w)) continue;
        if (isFunctionWord(t.w, lang, p)) continue;
        tokens.push({ para: pi + 1, sentence, start: t.start, end: t.end, text: t.w, key: lemma(t.w, lang) });
      }
      sentence++;
    }
  });
  const byKey = new Map();
  for (const t of tokens) {
    if (!byKey.has(t.key)) byKey.set(t.key, []);
    byKey.get(t.key).push(t);
  }
  const groups = [];
  for (const [key, list] of byKey) {
    let chain = [list[0]];
    const flush = () => {
      if (chain.length >= 2) {
        groups.push({
          lemma: key,
          form: chain[0].text,
          k: chain.length,
          occurrences: chain.map(({ para, sentence: s, start, end, text }) => ({ para, sentence: s, start, end, text })),
        });
      }
    };
    for (let i = 1; i < list.length; i++) {
      if (list[i].sentence - chain[chain.length - 1].sentence <= 1) chain.push(list[i]);
      else {
        flush();
        chain = [list[i]];
      }
    }
    flush();
  }
  groups.sort((a, b) => a.occurrences[0].para - b.occurrences[0].para || a.occurrences[0].start - b.occurrences[0].start);
  return groups;
}

// One line per text line where a group has occurrences: `⚠ REP L<n> «formă» ×k`.
export function formatRepLines(groups) {
  const rows = [];
  for (const g of groups || []) {
    const seen = new Set();
    for (const o of g.occurrences) {
      if (seen.has(o.para)) continue;
      seen.add(o.para);
      rows.push({ para: o.para, start: o.start, line: `⚠ REP L${o.para} «${g.form}» ×${g.k}` });
    }
  }
  return rows.sort((a, b) => a.para - b.para || a.start - b.start).map((r) => r.line);
}
