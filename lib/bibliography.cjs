'use strict';
// Bibliography support (Zotero exports): BibTeX / BibLaTeX and CSL-JSON → normalized entries,
// citation + reference-list formatting (APA 7, Chicago author-date, MLA 9, simple),
// and [@key] citation discovery in document HTML.
//
// Normalized entry:
//   { key, type, title, authors:[{family, given}], editors:[...], year, container, publisher,
//     place, volume, issue, pages, doi, url, edition }

// ---------------------------------------------------------------- BibTeX
const LATEX_ACCENTS = { '`': '̀', "'": '́', '^': '̂', '"': '̈', '~': '̃', '=': '̄', '.': '̇', u: '̆', v: '̌', H: '̋', c: '̧', k: '̨', r: '̊' };
const LATEX_SYMBOLS = { ss: 'ß', ae: 'æ', AE: 'Æ', oe: 'œ', OE: 'Œ', o: 'ø', O: 'Ø', l: 'ł', L: 'Ł', aa: 'å', AA: 'Å', i: 'ı' };

function delatex(s) {
  return String(s ?? '')
    .replace(/\\([`'^"~=.])\s*\{?\\?([A-Za-z])\}?/g, (_, a, ch) => (ch + LATEX_ACCENTS[a]).normalize('NFC'))
    .replace(/\\([uvHckr])\s*\{\\?([A-Za-z])\}/g, (_, a, ch) => (ch + LATEX_ACCENTS[a]).normalize('NFC'))
    .replace(/\\([uvHckr]) ([A-Za-z])/g, (_, a, ch) => (ch + LATEX_ACCENTS[a]).normalize('NFC'))
    .replace(/\{?\\(ss|ae|AE|oe|OE|aa|AA|o|O|l|L|i)\}?(?![A-Za-z])/g, (_, k) => LATEX_SYMBOLS[k])
    .replace(/\\&/g, '&')
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$')
    .replace(/\\_/g, '_')
    .replace(/--/g, '–')
    .replace(/\\(textit|emph|textbf|textsc|mkbibemph)\{/g, '{')
    .replace(/[{}]/g, '')
    .replace(/~/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitNames(s) {
  if (!s) return [];
  // split on " and " at brace depth 0
  const parts = [];
  let depth = 0;
  let cur = '';
  const str = String(s);
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth === 0 && /^\s+and\s+/i.test(str.slice(i)) && /\s/.test(ch)) {
      parts.push(cur);
      cur = '';
      i += str.slice(i).match(/^\s+and\s+/i)[0].length - 1;
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean).map(parseName);
}

function parseName(raw) {
  if (/^\{.*\}$/.test(raw)) return { literal: delatex(raw), family: delatex(raw), given: '' };
  if (raw.includes(',')) {
    const [family, ...rest] = raw.split(',');
    return { family: delatex(family), given: delatex(rest.join(',')) };
  }
  const words = delatex(raw).split(' ');
  if (words.length === 1) return { family: words[0], given: '' };
  // particles (van, de, von...) start the family name
  let idx = words.findIndex((w, i) => i > 0 && i < words.length - 1 && /^[a-z]/.test(w));
  if (idx < 0) idx = words.length - 1;
  return { family: words.slice(idx).join(' '), given: words.slice(0, idx).join(' ') };
}

function parseBibtex(src) {
  const entries = [];
  const text = String(src || '');
  const re = /@(\w+)\s*([{(])/g;
  let m;
  while ((m = re.exec(text))) {
    const type = m[1].toLowerCase();
    const close = m[2] === '{' ? '}' : ')';
    let depth = 1;
    let i = re.lastIndex;
    const start = i;
    let inQuote = false;
    for (; i < text.length && depth > 0; i++) {
      const ch = text[i];
      if (ch === '"' && text[i - 1] !== '\\' && depth === 1) inQuote = !inQuote;
      else if (!inQuote && (ch === '{' || (close === ')' && ch === '('))) depth++;
      else if (!inQuote && (ch === '}' || ch === close)) depth--;
    }
    const body = text.slice(start, i - 1);
    re.lastIndex = i;
    if (type === 'comment' || type === 'preamble' || type === 'string') continue;
    const comma = body.indexOf(',');
    if (comma < 0) continue;
    const key = body.slice(0, comma).trim();
    const fields = parseFields(body.slice(comma + 1));
    entries.push(fromBibtex(type, key, fields));
  }
  return entries;
}

function parseFields(s) {
  const fields = {};
  let i = 0;
  while (i < s.length) {
    const nm = /^[\s,]*([A-Za-z][\w-]*)\s*=\s*/.exec(s.slice(i));
    if (!nm) break;
    i += nm[0].length;
    const name = nm[1].toLowerCase();
    let value = '';
    // value: concatenation of {..}, "..", numbers/macros with #
    for (;;) {
      while (/\s/.test(s[i] || '')) i++;
      if (s[i] === '{') {
        let d = 0;
        const st = i;
        for (; i < s.length; i++) {
          if (s[i] === '{') d++;
          else if (s[i] === '}' && --d === 0) break;
        }
        value += s.slice(st + 1, i);
        i++;
      } else if (s[i] === '"') {
        let d = 0;
        const st = ++i;
        for (; i < s.length; i++) {
          if (s[i] === '{') d++;
          else if (s[i] === '}') d--;
          else if (s[i] === '"' && d === 0) break;
        }
        value += s.slice(st, i);
        i++;
      } else {
        const w = /^[^,#\s}]+/.exec(s.slice(i));
        if (w) {
          value += w[0];
          i += w[0].length;
        }
      }
      while (/\s/.test(s[i] || '')) i++;
      if (s[i] === '#') {
        i++;
        continue;
      }
      break;
    }
    fields[name] = value;
  }
  return fields;
}

const BIB_TYPES = { article: 'article-journal', book: 'book', incollection: 'chapter', inbook: 'chapter', inproceedings: 'paper-conference', conference: 'paper-conference', phdthesis: 'thesis', mastersthesis: 'thesis', thesis: 'thesis', techreport: 'report', report: 'report', online: 'webpage', misc: 'document', unpublished: 'manuscript' };

function fromBibtex(type, key, f) {
  const year = (/\d{4}/.exec(f.year || f.date || '') || [])[0] || '';
  return {
    key,
    type: BIB_TYPES[type] || 'document',
    title: delatex(f.title),
    authors: splitNames(f.author),
    editors: splitNames(f.editor),
    year,
    container: delatex(f.journal || f.journaltitle || f.booktitle || ''),
    publisher: delatex(f.publisher || f.institution || f.school || ''),
    place: delatex(f.address || f.location || ''),
    volume: delatex(f.volume),
    issue: delatex(f.number || f.issue),
    pages: delatex(f.pages).replace(/-+/g, '–'),
    edition: delatex(f.edition),
    doi: delatex(f.doi),
    url: (f.url || '').trim(),
  };
}

// ---------------------------------------------------------------- CSL-JSON
function parseCslJson(src) {
  const data = typeof src === 'string' ? JSON.parse(src) : src;
  const list = Array.isArray(data) ? data : data && Array.isArray(data.items) ? data.items : [data];
  const names = (arr) => (arr || []).map((n) => (n.literal ? { literal: n.literal, family: n.literal, given: '' } : { family: [n['non-dropping-particle'], n.family].filter(Boolean).join(' '), given: n.given || '' }));
  return list.filter(Boolean).map((it) => {
    const dp = it.issued && (it.issued['date-parts'] || [])[0];
    return {
      key: String(it['citation-key'] || it.citationKey || it.id || ''),
      type: it.type || 'document',
      title: it.title || '',
      authors: names(it.author),
      editors: names(it.editor),
      year: dp ? String(dp[0] || '') : (/\d{4}/.exec((it.issued && (it.issued.raw || it.issued.literal)) || '') || [''])[0],
      container: it['container-title'] || '',
      publisher: it.publisher || '',
      place: it['publisher-place'] || '',
      volume: it.volume ? String(it.volume) : '',
      issue: it.issue ? String(it.issue) : '',
      pages: it.page ? String(it.page).replace(/-+/g, '–') : '',
      edition: it.edition ? String(it.edition) : '',
      doi: it.DOI || '',
      url: it.URL || '',
    };
  });
}

/** Auto-detect BibTeX vs CSL-JSON. */
function parseBibliography(text) {
  const t = String(text || '').trim();
  if (t.startsWith('[') || t.startsWith('{')) return parseCslJson(t);
  return parseBibtex(t);
}

// ---------------------------------------------------------------- formatting
const STYLES = ['apa', 'chicago', 'mla', 'simple'];
const initials = (given) =>
  String(given || '')
    .split(/[\s]+/)
    .filter(Boolean)
    .map((g) => g.split('-').map((p) => `${p[0].toUpperCase()}.`).join('-'))
    .join(' ');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const end = (s) => (/[.?!]$/.test(s) ? s : `${s}.`);

function authorList(entry, style) {
  const a = entry.authors.length ? entry.authors : entry.editors;
  if (!a.length) return '';
  const inv = (n) => (n.literal ? n.literal : style === 'apa' ? `${n.family}${n.given ? `, ${initials(n.given)}` : ''}` : `${n.family}${n.given ? `, ${n.given}` : ''}`);
  const fwd = (n) => (n.literal ? n.literal : `${n.given ? `${n.given} ` : ''}${n.family}`);
  let s;
  if (style === 'apa') {
    const names = a.map(inv);
    if (names.length === 1) s = names[0];
    else if (names.length <= 20) s = `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`;
    else s = `${names.slice(0, 19).join(', ')}, … ${names[names.length - 1]}`;
  } else if (style === 'mla') {
    if (a.length === 1) s = inv(a[0]);
    else if (a.length === 2) s = `${inv(a[0])}, and ${fwd(a[1])}`;
    else s = `${inv(a[0])}, et al`;
  } else if (style === 'chicago') {
    if (a.length === 1) s = inv(a[0]);
    else if (a.length <= 10) s = `${inv(a[0])}, ${a.slice(1, -1).map(fwd).map((x) => `${x}, `).join('')}and ${fwd(a[a.length - 1])}`;
    else s = `${inv(a[0])}, ${a.slice(1, 7).map(fwd).join(', ')}, et al`;
  } else {
    s = a.map(fwd).join(', ');
  }
  if (!entry.authors.length) s += style === 'apa' ? ` (Ed${a.length > 1 ? 's' : ''}.)` : `, ed${a.length > 1 ? 's' : ''}`;
  return s;
}

const isPart = (e) => ['article-journal', 'article-magazine', 'article-newspaper', 'chapter', 'paper-conference', 'webpage'].includes(e.type) && e.container;

/** One reference-list entry as HTML (titles of standalone works in <em>). */
function formatReference(e, style = 'apa') {
  const authors = authorList(e, style);
  const link = e.doi ? `https://doi.org/${e.doi.replace(/^https?:\/\/doi\.org\//, '')}` : e.url;
  const part = isPart(e);
  const vol = e.volume ? `${e.volume}${e.issue ? `(${e.issue})` : ''}` : '';
  let out;
  if (style === 'apa') {
    const title = part ? esc(e.title) : `<em>${esc(e.title)}</em>`;
    const head = `${authors ? `${end(esc(authors))} ` : ''}(${e.year || 'n.d.'}). ${end(title)}`;
    if (part && e.type === 'chapter') out = `${head} In <em>${esc(e.container)}</em>${e.pages ? ` (pp. ${esc(e.pages)})` : ''}.${e.publisher ? ` ${esc(e.publisher)}.` : ''}`;
    else if (part) out = `${head} <em>${esc(e.container)}${vol ? `, ${esc(e.volume)}` : ''}</em>${e.issue ? `(${esc(e.issue)})` : ''}${e.pages ? `, ${esc(e.pages)}` : ''}.`;
    else out = `${head}${e.publisher ? ` ${esc(e.publisher)}.` : ''}`;
    if (link) out += ` ${esc(link)}`;
  } else if (style === 'chicago') {
    const title = part ? `“${esc(end(e.title))}”` : `<em>${esc(end(e.title))}</em>`;
    out = `${authors ? `${end(esc(authors))} ` : ''}${e.year || 'n.d.'}. ${title}`;
    if (part && e.type === 'chapter') out += ` In <em>${esc(e.container)}</em>${e.pages ? `, ${esc(e.pages)}` : ''}.${e.place || e.publisher ? ` ${esc([e.place, e.publisher].filter(Boolean).join(': '))}.` : ''}`;
    else if (part) out += ` <em>${esc(e.container)}</em>${e.volume ? ` ${esc(e.volume)}` : ''}${e.issue ? ` (${esc(e.issue)})` : ''}${e.pages ? `: ${esc(e.pages)}` : ''}.`;
    else if (e.place || e.publisher) out += ` ${esc([e.place, e.publisher].filter(Boolean).join(': '))}.`;
    if (link) out += ` ${esc(link)}.`;
  } else if (style === 'mla') {
    const title = part ? `“${esc(end(e.title))}”` : `<em>${esc(e.title)}</em>.`;
    out = `${authors ? `${end(esc(authors))} ` : ''}${title}`;
    if (part) {
      const bits = [`<em>${esc(e.container)}</em>`];
      if (e.volume) bits.push(`vol. ${esc(e.volume)}`);
      if (e.issue) bits.push(`no. ${esc(e.issue)}`);
      if (e.publisher && e.type === 'chapter') bits.push(esc(e.publisher));
      if (e.year) bits.push(esc(e.year));
      if (e.pages) bits.push(`${/[–-]/.test(e.pages) ? 'pp.' : 'p.'} ${esc(e.pages)}`);
      out += ` ${bits.join(', ')}.`;
    } else {
      out += ` ${[e.publisher, e.year].filter(Boolean).map(esc).join(', ')}${e.publisher || e.year ? '.' : ''}`;
    }
    if (link) out += ` ${esc(link.replace(/^https?:\/\//, ''))}.`;
  } else {
    out = `${authors ? `${esc(authors)}. ` : ''}${esc(end(e.title))}${e.container ? ` ${esc(e.container)}.` : ''}${e.publisher ? ` ${esc(e.publisher)}.` : ''}${e.year ? ` ${esc(e.year)}.` : ''}`;
  }
  return out.replace(/\s+/g, ' ').replace(/\.\./g, '.').trim();
}

/** In-text citation, e.g. (Smith & Jones, 2020, p. 4) / (Smith 2020, 4) / (Smith 4). */
function formatCitation(e, style = 'apa', locator = '') {
  const a = e.authors.length ? e.authors : e.editors;
  const fam = (n) => n.family || n.literal || '';
  let who = '';
  if (a.length === 1) who = fam(a[0]);
  else if (a.length === 2) who = style === 'apa' ? `${fam(a[0])} & ${fam(a[1])}` : `${fam(a[0])} and ${fam(a[1])}`;
  else if (a.length > 2) who = style === 'chicago' && a.length === 3 ? `${fam(a[0])}, ${fam(a[1])}, and ${fam(a[2])}` : `${fam(a[0])} et al.`;
  else who = e.title;
  const year = e.year || 'n.d.';
  if (style === 'apa') return `(${who}, ${year}${locator ? `, ${/^\d/.test(locator) ? 'p. ' : ''}${locator}` : ''})`;
  if (style === 'chicago') return `(${who} ${year}${locator ? `, ${locator}` : ''})`;
  if (style === 'mla') return `(${who}${locator ? ` ${locator}` : ''})`;
  return `[${who} ${year}${locator ? `, ${locator}` : ''}]`;
}

function sortKey(e) {
  const a = e.authors[0] || e.editors[0];
  return `${(a ? a.family || a.literal : e.title).toLowerCase()} ${e.year} ${e.title.toLowerCase()}`;
}

function formatBibliography(entries, style = 'apa') {
  const heading = { apa: 'References', chicago: 'References', mla: 'Works Cited', simple: 'Bibliografie' }[style] || 'Bibliografie';
  const sorted = [...entries].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  return { heading, items: sorted.map((e) => formatReference(e, style)), html: `<h2>${heading}</h2>${sorted.map((e) => `<p class="reference">${formatReference(e, style)}</p>`).join('')}` };
}

// ---------------------------------------------------------------- citation keys
// Pandoc-style: [@key], [@key, p. 4], [see @a; @b], also bare @key inside brackets only.
const CITE_GROUP = /\[([^\[\]]*?@[\w:.#$%&\-+?<>~/]+[^\[\]]*?)\]/g;
const CITE_KEY = /(-?)@([\w:.#$%&\-+?<>~/]*[\w])(?:,\s*([^;\]]+))?/g;

function findCitations(html) {
  const text = String(html || '').replace(/<[^>]+>/g, '');
  const found = [];
  let g;
  CITE_GROUP.lastIndex = 0;
  while ((g = CITE_GROUP.exec(text))) {
    let k;
    CITE_KEY.lastIndex = 0;
    while ((k = CITE_KEY.exec(g[1]))) found.push({ key: k[2], locator: (k[3] || '').trim(), suppressAuthor: k[1] === '-', raw: g[0] });
  }
  return found;
}

/**
 * Replace [@key] in HTML with formatted citations and build the references list.
 * @returns {{html, references:{heading, items, html}, missing:string[], used:string[]}}
 */
function buildReferences(html, entries, style = 'apa') {
  const byKey = new Map(entries.map((e) => [e.key, e]));
  const used = [];
  const missing = [];
  const out = String(html || '').replace(CITE_GROUP, (whole, inner) => {
    if (/<[^>]+>/.test(inner)) return whole;
    const parts = [];
    let k;
    CITE_KEY.lastIndex = 0;
    while ((k = CITE_KEY.exec(inner))) {
      const e = byKey.get(k[2]);
      if (!e) {
        if (!missing.includes(k[2])) missing.push(k[2]);
        parts.push(null);
        continue;
      }
      if (!used.includes(k[2])) used.push(k[2]);
      parts.push(formatCitation(e, style, (k[3] || '').trim()));
    }
    if (!parts.length || parts.some((p) => p === null)) return whole;
    if (parts.length === 1) return esc(parts[0]).replace(/&amp;/g, '&amp;');
    const open = parts[0][0];
    const close = parts[0][parts[0].length - 1];
    return esc(open + parts.map((p) => p.slice(1, -1)).join('; ') + close);
  });
  const references = formatBibliography(used.map((k) => byKey.get(k)), style);
  return { html: out, references, missing, used };
}

module.exports = { parseBibtex, parseCslJson, parseBibliography, formatReference, formatCitation, formatBibliography, findCitations, buildReferences, delatex, STYLES };
