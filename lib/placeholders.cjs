'use strict';
// Compile placeholders (<$name>, <$name:format>, <$n#counter>): values filled in when the
// manuscript is compiled — in section titles, prefixes/suffixes, the text itself, the running
// header/footer and the title page. Own implementation.
//
// Syntax:
//   <$name>            plain value
//   <$name:fmt>        value with a format (numbers: R r w W WORDS a A; dates: yyyy-MM-dd …;
//                      custom:Field names a custom metadata field; include:Title names a document)
//   <$n#name>          a separately named counter, advanced each time it is met
//   <$n#name:R>        the same counter shown in roman numerals
// Unknown placeholders stay as typed. <$p> and <$pagecount> are page fields: kept in the text
// for the writer (DOCX PAGE/NUMPAGES fields, CSS counters in PDF).

const PLACEHOLDER = /<\$([A-Za-z_]+)(?:#([\p{L}\p{N}_-]+))?(?::([^<>]+?))?>/gu;

// ---- numbers ---------------------------------------------------------------------------

function toRoman(n) {
  if (!(n > 0 && n < 4000)) return String(n);
  const t = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, r] of t) while (n >= v) { out += r; n -= v; }
  return out;
}

// Romanian cardinal numbers in the counting form used after a noun ("Capitolul unu").
const UNITS = ['zero', 'unu', 'doi', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă'];
const TEENS = ['zece', 'unsprezece', 'doisprezece', 'treisprezece', 'paisprezece', 'cincisprezece', 'șaisprezece', 'șaptesprezece', 'optsprezece', 'nouăsprezece'];
const TENS = ['', '', 'douăzeci', 'treizeci', 'patruzeci', 'cincizeci', 'șaizeci', 'șaptezeci', 'optzeci', 'nouăzeci'];
function below100(n) {
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  const t = TENS[Math.floor(n / 10)];
  return n % 10 ? `${t} și ${UNITS[n % 10]}` : t;
}
function countOf(n, one, many) {
  if (n === 1) return one;
  const w = n === 2 ? 'două' : n === 12 ? 'douăsprezece' : below1000(n);
  return n % 100 >= 20 || (n % 100 === 0 && n >= 100) ? `${w} de ${many}` : `${w} ${many}`;
}
function below1000(n) {
  if (n < 100) return below100(n);
  const head = countOf(Math.floor(n / 100), 'o sută', 'sute');
  return n % 100 ? `${head} ${below100(n % 100)}` : head;
}
function romanianWords(n) {
  n = Math.floor(Number(n));
  if (!Number.isFinite(n) || n < 0 || n >= 1e6) return String(n);
  if (n < 1000) return below1000(n);
  const head = countOf(Math.floor(n / 1000), 'o mie', 'mii');
  return n % 1000 ? `${head} ${below1000(n % 1000)}` : head;
}

// English cardinal numbers ("Chapter One"), for projects whose language is English.
const EN_UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function englishWords(n) {
  n = Math.floor(Number(n));
  if (!Number.isFinite(n) || n < 0 || n >= 1e6) return String(n);
  const b100 = (x) => (x < 20 ? EN_UNITS[x] : EN_TENS[Math.floor(x / 10)] + (x % 10 ? `-${EN_UNITS[x % 10]}` : ''));
  const b1000 = (x) => (x < 100 ? b100(x) : `${EN_UNITS[Math.floor(x / 100)]} hundred${x % 100 ? ` ${b100(x % 100)}` : ''}`);
  if (n < 1000) return b1000(n);
  return `${b1000(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${b1000(n % 1000)}` : ''}`;
}

function letters(n) {
  n = Math.max(1, Math.floor(n));
  let s = '';
  while (n > 0) {
    n--;
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

const isEnglish = (lang) => /^en\b/i.test(String(lang || ''));

/** n in a format: R/roman, r/lroman, w/words, W/Words, WORDS, a/alpha, A/ALPHA; null for an unknown format. */
function formatNumber(n, fmt, lang = 'ro') {
  if (!fmt) return String(n);
  const words = isEnglish(lang) ? englishWords : romanianWords;
  switch (fmt) {
    case 'roman':
    case 'R':
      return toRoman(n);
    case 'lroman':
    case 'r':
      return toRoman(n).toLowerCase();
    case 'words':
    case 'w':
      return words(n);
    case 'Words':
    case 'W': {
      const w = words(n);
      return w.charAt(0).toUpperCase() + w.slice(1);
    }
    case 'WORDS':
      return words(n).toUpperCase();
    case 'a':
    case 'alpha':
      return letters(n);
    case 'A':
    case 'ALPHA':
      return letters(n).toUpperCase();
    case '0':
    case '00':
    case '000':
      return String(n).padStart(fmt.length, '0');
    default:
      return null;
  }
}

// ---- word counts (Compile > Statistics) ------------------------------------------------

/** Rounds a word count as the format's statistics settings say: 0 (exact), 100, 500 or 1000. */
function roundWords(n, to) {
  const step = Number(to) || 0;
  if (!step) return n;
  return Math.max(step, Math.round(n / step) * step);
}
function formatCount(n, lang) {
  return Number(n || 0).toLocaleString(isEnglish(lang) ? 'en-US' : 'ro-RO');
}

// ---- dates -------------------------------------------------------------------------

const MONTHS_RO = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** Date with tokens yyyy yy MMMM MMM MM M dd d HH mm (anything else is kept). */
function formatDate(d, fmt, lang = 'ro') {
  if (!fmt) return d.toLocaleDateString(isEnglish(lang) ? 'en-GB' : 'ro-RO');
  const months = isEnglish(lang) ? MONTHS_EN : MONTHS_RO;
  const pad = (x) => String(x).padStart(2, '0');
  return fmt.replace(/yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|mm/g, (tok) => {
    switch (tok) {
      case 'yyyy': return String(d.getFullYear());
      case 'yy': return String(d.getFullYear()).slice(-2);
      case 'MMMM': return months[d.getMonth()];
      case 'MMM': return months[d.getMonth()].slice(0, 3);
      case 'MM': return pad(d.getMonth() + 1);
      case 'M': return String(d.getMonth() + 1);
      case 'dd': return pad(d.getDate());
      case 'd': return String(d.getDate());
      case 'HH': return pad(d.getHours());
      case 'mm': return pad(d.getMinutes());
      default: return tok;
    }
  });
}

// ---- values ------------------------------------------------------------------------

function authorParts(project) {
  const full = String(project.author || '').trim();
  const parts = full.split(/\s+/).filter(Boolean);
  return {
    forename: project.authorFirst || (parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] || ''),
    surname: project.authorLast || (parts.length > 1 ? parts[parts.length - 1] : parts[0] || ''),
  };
}

function customValue(project, node, field) {
  if (!node || !field) return '';
  const want = String(field).trim().toLowerCase();
  const def = (project.customFields || project.customMetadata || []).find((f) => f && (String(f.id || '').toLowerCase() === want || String(f.title || f.name || '').toLowerCase() === want));
  const meta = node.custom || node.customMeta || node.metadata || {};
  const v = def ? (meta[def.id] ?? meta[def.title] ?? meta[def.name]) : meta[field];
  if (v == null) return '';
  if (typeof v === 'boolean') return v ? '✓' : '';
  return String(v);
}

function rightsOf(project, now) {
  if (project.rights) return String(project.rights);
  return project.author ? `© ${now.getFullYear()} ${project.author}` : '';
}

/**
 * Value of one placeholder, or null to keep it as typed.
 * ctx: { project, node, n, title, wc, stats:{round, lang}, now, counters (named counters, mutated),
 *        includeDoc(title) -> text, keepPage (leave <$p>/<$pagecount> for the writer) }
 */
function placeholderValue(name, fmt, ctx, counter) {
  const p = ctx.project || {};
  const now = ctx.now || new Date();
  const lang = p.language || (ctx.stats && ctx.stats.lang) || 'ro';
  const node = ctx.node || null;
  switch (name) {
    case 'n':
    case 'sn':
      if (counter) {
        const c = (ctx.counters = ctx.counters || {});
        c[counter] = (c[counter] || 0) + 1;
        return formatNumber(c[counter], fmt, lang) ?? String(c[counter]);
      }
      return ctx.n == null ? null : formatNumber(ctx.n, fmt, lang);
    case 'nc': // the current value of a named counter, without advancing it
      if (!counter) return null;
      return formatNumber((ctx.counters || {})[counter] || 0, fmt, lang);
    case 'r':
    case 'R':
      return ctx.n == null ? null : name === 'R' ? toRoman(ctx.n) : toRoman(ctx.n).toLowerCase();
    case 'w':
    case 'W':
      return ctx.n == null ? null : formatNumber(ctx.n, name, lang);
    case 't':
    case 'title':
      return ctx.title == null ? null : fmt === 'upper' ? String(ctx.title).toLocaleUpperCase() : fmt === 'lower' ? String(ctx.title).toLocaleLowerCase() : ctx.title;
    case 'wc':
    case 'wordcount': {
      const st = ctx.stats || {};
      const v = roundWords(ctx.wc || 0, fmt && /^\d+$/.test(fmt) ? Number(fmt) : st.round);
      return formatCount(v, lang);
    }
    case 'wc100':
      return formatCount(roundWords(ctx.wc || 0, 100), lang);
    case 'wc1000':
      return formatCount(roundWords(ctx.wc || 0, 1000), lang);
    case 'cc':
    case 'charcount':
      return formatCount(ctx.cc || 0, lang);
    case 'projecttitle':
      return p.title || '';
    case 'abbr_title':
    case 'shorttitle':
      return p.titleAbbreviation || p.title || '';
    case 'author':
    case 'fullname':
      return p.author || '';
    case 'subtitle':
      return p.subtitle || '';
    case 'surname':
    case 'lastname':
      return authorParts(p).surname;
    case 'forename':
    case 'firstname':
      return authorParts(p).forename;
    case 'date':
    case 'compiledate':
      return formatDate(now, fmt, lang);
    case 'time':
      return formatDate(now, fmt || 'HH:mm', lang);
    case 'year':
      return String(now.getFullYear());
    case 'label':
      return node ? String(node.label || '') : '';
    case 'status':
      return node ? String(node.status || '') : '';
    case 'keywords':
      return node ? (node.keywords || []).join(', ') : '';
    case 'synopsis':
      return node ? String(node.synopsis || '') : '';
    case 'custom':
      return customValue(p, node, fmt);
    case 'publisher':
      return p.publisher || '';
    case 'isbn':
      return p.isbn || '';
    case 'address':
      return p.address || '';
    case 'rights':
    case 'copyright':
      return rightsOf(p, now);
    case 'language':
      return p.language || 'ro';
    case 'series':
      return p.series || (ctx.meta && ctx.meta.series) || '';
    case 'seriesnum':
      return String(p.seriesNumber || (ctx.meta && ctx.meta.seriesNumber) || '');
    case 'include': {
      if (!fmt || typeof ctx.includeDoc !== 'function') return null;
      const text = ctx.includeDoc(fmt.trim());
      return text == null ? null : text;
    }
    case 'p':
    case 'pagecount':
    case 'P':
      return null; // page fields: filled in by the writer
    default:
      return null;
  }
}

function replacePlaceholders(text, ctx = {}) {
  if (!text || typeof text !== 'string' || text.indexOf('<$') < 0) return text;
  return text.replace(PLACEHOLDER, (all, name, counter, fmt) => {
    if (name === 'img') return all; // images are resolved on the HTML (resolveImagePlaceholders)
    const v = placeholderValue(name, fmt, ctx, counter);
    return v == null ? all : v;
  });
}

// ---- the list shown in the menu and in Help ------------------------------------------------

// group: numbering | text | project | stats | page | doc
const PLACEHOLDERS = [
  { code: '<$n>', group: 'numbering', ro: 'Numărul secțiunii (1, 2, 3) pe tipul ei', en: 'Section number (1, 2, 3) for its type' },
  { code: '<$n:R>', group: 'numbering', ro: 'Numărul în cifre romane mari (I, II, III)', en: 'Number in upper-case roman numerals (I, II, III)' },
  { code: '<$n:r>', group: 'numbering', ro: 'Numărul în cifre romane mici (i, ii, iii)', en: 'Number in lower-case roman numerals (i, ii, iii)' },
  { code: '<$n:w>', group: 'numbering', ro: 'Numărul în litere (unu, doi)', en: 'Number in words (one, two)' },
  { code: '<$n:W>', group: 'numbering', ro: 'Numărul în litere, cu majusculă (Unu, Doi)', en: 'Number in words, capitalised (One, Two)' },
  { code: '<$n:WORDS>', group: 'numbering', ro: 'Numărul în litere mari (UNU, DOI)', en: 'Number in capitals (ONE, TWO)' },
  { code: '<$n:a>', group: 'numbering', ro: 'Numărul ca literă (a, b, c)', en: 'Number as a letter (a, b, c)' },
  { code: '<$n:A>', group: 'numbering', ro: 'Numărul ca literă mare (A, B, C)', en: 'Number as a capital letter (A, B, C)' },
  { code: '<$n#nume>', group: 'numbering', ro: 'Contor separat „nume”, crește la fiecare apariție', en: 'Separate counter "nume", advanced at each occurrence' },
  { code: '<$nc#nume>', group: 'numbering', ro: 'Valoarea curentă a contorului „nume”, fără să crească', en: 'Current value of counter "nume", without advancing it' },
  { code: '<$t>', group: 'text', ro: 'Titlul documentului (în antet: titlul capitolului curent)', en: 'Document title (in a header: the current chapter title)' },
  { code: '<$label>', group: 'doc', ro: 'Eticheta documentului', en: 'Label of the document' },
  { code: '<$status>', group: 'doc', ro: 'Statusul documentului', en: 'Status of the document' },
  { code: '<$keywords>', group: 'doc', ro: 'Cuvintele-cheie ale documentului', en: 'Keywords of the document' },
  { code: '<$synopsis>', group: 'doc', ro: 'Sinopsisul documentului', en: 'Synopsis of the document' },
  { code: '<$custom:Câmp>', group: 'doc', ro: 'Valoarea câmpului de metadate proprii „Câmp”', en: 'Value of the custom metadata field "Câmp"' },
  { code: '<$include:Titlu>', group: 'doc', ro: 'Textul documentului cu titlul „Titlu” (din binder)', en: 'Text of the document titled "Titlu" (from the binder)' },
  { code: '<$img:Nume>', group: 'doc', ro: 'Imaginea „Nume” din proiect', en: 'The image "Nume" from the project' },
  { code: '<$projecttitle>', group: 'project', ro: 'Titlul proiectului', en: 'Project title' },
  { code: '<$abbr_title>', group: 'project', ro: 'Titlul prescurtat', en: 'Abbreviated title' },
  { code: '<$subtitle>', group: 'project', ro: 'Subtitlul proiectului', en: 'Project subtitle' },
  { code: '<$author>', group: 'project', ro: 'Numele autorului', en: 'Author name' },
  { code: '<$forename>', group: 'project', ro: 'Prenumele autorului', en: 'Author first name' },
  { code: '<$surname>', group: 'project', ro: 'Numele de familie al autorului', en: 'Author surname' },
  { code: '<$publisher>', group: 'project', ro: 'Editura', en: 'Publisher' },
  { code: '<$isbn>', group: 'project', ro: 'ISBN', en: 'ISBN' },
  { code: '<$address>', group: 'project', ro: 'Adresa autorului', en: 'Author address' },
  { code: '<$rights>', group: 'project', ro: 'Drepturile (implicit „© an autor”)', en: 'Rights (default "© year author")' },
  { code: '<$language>', group: 'project', ro: 'Limba proiectului', en: 'Project language' },
  { code: '<$date>', group: 'project', ro: 'Data compilării', en: 'Compile date' },
  { code: '<$date:d MMMM yyyy>', group: 'project', ro: 'Data compilării cu format (yyyy, MM, MMMM, dd, HH, mm)', en: 'Compile date with a format (yyyy, MM, MMMM, dd, HH, mm)' },
  { code: '<$year>', group: 'project', ro: 'Anul compilării', en: 'Compile year' },
  { code: '<$wc>', group: 'stats', ro: 'Numărul de cuvinte (rotunjit după tabul Statistici)', en: 'Word count (rounded as the Statistics tab says)' },
  { code: '<$wc100>', group: 'stats', ro: 'Cuvinte rotunjite la sută', en: 'Words rounded to the nearest hundred' },
  { code: '<$wc1000>', group: 'stats', ro: 'Cuvinte rotunjite la mie', en: 'Words rounded to the nearest thousand' },
  { code: '<$cc>', group: 'stats', ro: 'Numărul de caractere', en: 'Character count' },
  { code: '<$p>', group: 'page', ro: 'Numărul paginii curente (antet/subsol)', en: 'Current page number (header/footer)' },
  { code: '<$pagecount>', group: 'page', ro: 'Numărul total de pagini (antet/subsol)', en: 'Total number of pages (header/footer)' },
];

/** The value a placeholder would get, for the preview in the dialogs (sample project/node). */
function previewPlaceholders(text, project = {}, sample = {}) {
  const ctx = { project, n: 3, title: sample.title || project.title || '', wc: sample.wc ?? 81234, cc: sample.cc ?? 456789, node: sample.node || { label: 'Ana', status: 'Prima versiune', keywords: ['mare', 'noapte'], synopsis: '…' }, stats: sample.stats || {}, now: sample.now };
  return replacePlaceholders(String(text || ''), ctx).replace(/<\$p>/g, '7').replace(/<\$pagecount>/g, '312');
}

module.exports = {
  PLACEHOLDER,
  PLACEHOLDERS,
  placeholderValue,
  replacePlaceholders,
  previewPlaceholders,
  formatNumber,
  formatDate,
  roundWords,
  toRoman,
  romanianWords,
  englishWords,
  letters,
  authorParts,
};
