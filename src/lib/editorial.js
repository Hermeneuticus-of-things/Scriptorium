// Editorial engine: I-REP (repair + re-verify loops) and I-EDIT (editorial rounds).
// Pure module (no DOM, no Node APIs): used by the UI and by the MCP server.
//
// The default profile encodes the "karma-book-engine" rules (Blackbox P1, R0–R11,
// P1–P13, ALOGEN, DOOM III). Profiles are plain JSON stored in project.json, so a
// different book can switch rules off or edit the word lists.

import { canonContext, nodeIdFromTitle } from './canonIndex.js';

export const SEVERITY = { GRAVE: 'GRAVE', MEDIU: 'MEDIU', MINOR: 'MINOR' };

export const ROUNDS = [
  { id: 'R0', title: 'Structură canonică', protocols: 'P1', prompt: 'Verifică structura canonică internă. Titlul intern conține doar titlul scurt. Nota de subsol editorială în formatul canonic. Corelat cu indexul de lucru.' },
  { id: 'R1', title: 'Completitudine vs. index', protocols: 'P1 · P2', prompt: 'Verifică ce s-a omis față de indexul de lucru și sinopsis. Completează și corectează față de structura canonică. Elimină ce ține de alte subcapitole.' },
  { id: 'R1b', title: 'Vocea de bază', protocols: 'P8', prompt: 'Vocea intelectualului român cultivat: cald, clar, elegant, natural, viu. Lexicul forțat se elimină. Familia lexicală firească se stabilește înainte de prima frază.' },
  { id: 'R1c', title: 'Lexic viu românesc', protocols: 'P3 · P8', prompt: 'Familia lexicală firească: „faptă” nu „gest”, „depunere” nu „urmă”, „rânduiala lumii” nu „logica internă”, „deprinderea veche” nu „tiparul înnăscut”. Termenii din familii străine (IT, matematic, managerial, juridic, psihologie modernă) trec în forma uzuală românească.' },
  { id: 'R2', title: 'Familii forțate și stil academic', protocols: 'P3 · P13', prompt: 'Identifică toate familiile forțate înainte de intervenție. Elimină lexicul academic interzis, numerotarea, subtitlurile, propozițiile pasive, tonul solemn și semnele structural-separatoare (două puncte, paranteze, liniuță, săgeată, em-dash).' },
  { id: 'R3', title: 'Afirmativ și erori logice', protocols: 'P2 · P4', prompt: 'Construcție afirmativă. Identifică erorile logice reale. Elimină teleologia: mecanismul karmic este cauzal, nu finalist. Premisa pozitivă deschide enunțul. Construcțiile binare „X nu este Y, ci Z” și orice „ci”/„dar” precedat de negație se rescriu afirmativ.' },
  { id: 'R4', title: 'Vocea personală a cărții', protocols: 'P8', prompt: 'Persoana I plural prin terminația -m, maxim un „noi” explicit per document, distribuție asimetrică în 3–4 momente. Vocea primară caldă participativă 60–70%, vocea secundară caldă impersonală 30–40%, fuziune invizibilă. Respirație pentru cititor, privire complice, ancorare în concret, fără meta-comentariu.' },
  { id: 'R4b', title: 'Rafinare lexicală și ritmică', protocols: 'P5 · P6', prompt: 'Diversitate lexicală (sinonime, parafraze, perifraze, reformulări contextuale) și diversitate structurală la nivel de frază și paragraf (ordine, nominalizare/verbalizare, comprimare/expandare, efect în loc de cauză).' },
  { id: 'R5', title: 'Anti-metronom și densitate', protocols: 'P1 · P10', prompt: 'Calibrează densitatea: zero umplere, expansiune doar prin spiralizare. Anti-simetrie ±15% între fraze și paragrafe. Zero metronom, zero meta-structură. Ancorare la fiecare paragraf nou.' },
  { id: 'R6', title: 'Anti-redundanță', protocols: 'P5 · P6', prompt: 'Elimină redundanța micro (în frază și paragraf), mezzo (în document) și macro (față de celelalte documente ale capitolului primite în context).' },
  { id: 'R7', title: 'Eliminare autoreferințe', protocols: 'P3', prompt: 'Elimină trimiterile la structură („tratate în 2.9.3”, „Cap. 7”, „în această secțiune”, „în subcapitolul următor”, „detaliat mai jos”). Tranziția se face prin conținut.' },
  { id: 'R8', title: 'Protocol ALOGEN', protocols: 'P7', prompt: 'Listează termenii alogeni. Prima apariție: ***sens românesc complet*** \'termen\'. A doua: ***sens scurt*** \'termen\'. Ulterior: ***sens românesc*** fără termen. Termenul sanscrit rămâne în forma de bază („al lui Ātman”, nu „Ātmanului”). Rădăcinile între apostrofuri, etimologia intră în proză înainte de termen. Anti-dublaj.' },
  { id: 'R9', title: 'Verificare finală', protocols: 'P3', prompt: 'Verificare P3: reziduuri LLM, semne de decay. P3 punctat obligatoriu pe ultimele două paragrafe înainte de nota de subsol.' },
  { id: 'R10', title: 'Audit micro', protocols: 'P3 · P5 · P9 · P10', prompt: 'Frază cu frază: formule prefabricate și rigidități de asistent, dublaje lexicale locale, secvențe cu aceeași lungime și structură, registrul „termen = definiție” (mecanismul deschide paragraful). Sudură organică a tranzițiilor.' },
  { id: 'R11', title: 'DOOM III + anti-LLM final', protocols: 'P3 · P13', prompt: 'Tipografie zero-toleranță: zero em-dash, zero paranteze, zero două puncte structurale, zero bold stilistic, zero liste sau numerotare. Excepție: ***italic+bold*** exclusiv pe sensul românesc ALOGEN. Fiecare paragraf începe cu majusculă. Ghilimele românești „…”.' },
];

export const KARMA_PROFILE = {
  // Internal id stays 'karma' so existing projects keep their choice; shown to the user as "Română".
  id: 'karma',
  name: 'Română (DOOM III, P1–P13, R0–R11, termeni străini)',
  // Names of generated documents and of the editor package for this profile.
  names: { foreign: 'Glosar_Alogeni_Indieni', reading: 'Glosar_de_lectură', toc: 'Cuprins_de_tipar', packageFolder: '📤 PENTRU EDITOR {date}' },
  canvasWordLimit: 3000,
  maxExplicitNoi: 1,
  rules: {
    emDash: true,
    parentheses: true,
    structuralColon: true,
    boldOutsideAlogen: true,
    lists: true,
    numbering: true,
    capitalStart: true,
    asciiQuotes: true,
    binary: true,
    passive: true,
    explicitNoi: true,
    bannedAcademic: true,
    bannedTransitions: true,
    selfReference: true,
    llmResidue: true,
    alogen: true,
    metronome: true,
    repetitionMicro: true,
    repetitionMezzo: true,
    repetitionMacro: true,
    canvasLimit: true,
    canvasHeader: false,
    canvasFooter: false,
    attentionDecay: true,
    teleology: true,
  },
  bannedAcademic: [
    'taxonomie', 'epistemică', 'epistemic', 'epistemologică', 'epistemologic', 'sensul ontologic', 'perspectiva teleologică',
    'câmp foarte larg', 'despărțiri de fond', 'ontologie materială', 'fluxul condițional al devenirii', 'convergență',
    'genealogia termenului', 'sincretism funcțional', 'paradigmă', 'paradigmatic', 'holistic', 'implementare',
    'optimizare', 'feedback', 'input', 'output', 'framework', 'logica internă', 'tiparul înnăscut',
  ],
  bannedTransitions: [
    'deci', 'așadar', 'prin urmare', 'în concluzie', 'de asemenea', 'totodată', 'astfel', 'în continuare',
    'după cum am văzut', 'vom vedea', 'iată de ce', 'cu alte cuvinte', 'pe de altă parte', 'în primul rând', 'în al doilea rând',
  ],
  selfReference: [
    'în această secțiune', 'în acest capitol', 'în acest subcapitol', 'în subcapitolul următor', 'în capitolul următor',
    'detaliat mai jos', 'mai sus', 'mai jos', 'după cum vom vedea', 'tratate în', 'tratată în', 'tratat în', 'am arătat anterior',
  ],
  llmResidue: [
    'desigur', 'cu siguranță', 'bineînțeles', 'este important să', 'este esențial să', 'merită menționat', 'merită subliniat',
    'joacă un rol crucial', 'joacă un rol esențial', 'în esență', 'fascinant', 'hai să', 'să explorăm', 'să aprofundăm',
    'în lumea de astăzi', 'nu în ultimul rând', 'în cele din urmă', 'un aspect important', 'complex și nuanțat',
    'o călătorie', 'tapiseria', 'pe scurt', 'în rezumat',
  ],
  passive: ['se observă', 'se produce', 'se constată', 'se poate observa', 'se poate constata', 'este observat', 'este considerat'],
  teleology: ['pentru a ajunge la', 'cu scopul de', 'în vederea', 'menit să', 'are drept scop', 'scopul karmei'],
};

export const GENERIC_PROFILE = {
  ...KARMA_PROFILE,
  id: 'generic',
  name: 'Generic: orice text (tipografie și reziduuri LLM)',
  names: { foreign: 'Glosar de termeni', reading: 'Glosar de lectură', toc: 'Cuprins de tipar', packageFolder: 'Pachet pentru editor {date}' },
  canvasWordLimit: 0,
  rules: Object.fromEntries(Object.keys(KARMA_PROFILE.rules).map((k) => [k, ['asciiQuotes', 'capitalStart', 'llmResidue', 'repetitionMicro', 'repetitionMezzo', 'metronome', 'attentionDecay'].includes(k)])),
};

export const PROFILES = [KARMA_PROFILE, GENERIC_PROFILE];

export function profileFor(project, settings) {
  const p = project && project.editorialProfile;
  // Any kind of text by default; the Karma profile is chosen explicitly per project.
  let out = GENERIC_PROFILE;
  if (p) {
    const base = PROFILES.find((x) => x.id === p.base) || GENERIC_PROFILE;
    out = { ...base, ...p, id: base.id, rules: { ...base.rules, ...(p.rules || {}) } };
  }
  return settings && settings.editorialLists ? applyLists(out, settings.editorialLists) : out;
}

// ---------------------------------------------------------------------------
// User word lists (Setări → Editorial). Stored in settings.editorialLists:
//   { forbidden: [{word, replacement?, note?}], preferred: [{word, replacement?, note?}],
//     builtins: {bannedAcademic: false, ...}, disabledWords: ['astfel'] }
// either flat (applies to every profile) or per profile: { karma: {...}, generic: {...} }.
// forbidden: `word` is flagged; `replacement` is the suggestion.
// preferred: `word` is the form to use; `replacement` (or `instead`) lists the
// variants to avoid (comma separated), which are flagged with `word` as suggestion.

export const BUILTIN_LISTS = ['bannedAcademic', 'bannedTransitions', 'selfReference', 'llmResidue', 'passive', 'teleology'];

export function listsFor(editorialLists, profileId) {
  if (!editorialLists) return null;
  const per = editorialLists[profileId];
  if (per && typeof per === 'object' && !Array.isArray(per)) return per;
  return editorialLists.forbidden || editorialLists.preferred || editorialLists.builtins || editorialLists.disabledWords ? editorialLists : null;
}

const cleanEntries = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((e) => (typeof e === 'string' ? { word: e } : e))
    .filter((e) => e && String(e.word || '').trim())
    .map((e) => ({ word: String(e.word).trim(), replacement: e.replacement ? String(e.replacement).trim() : e.instead ? [].concat(e.instead).join(', ') : '', note: e.note ? String(e.note) : '' }));

export function applyLists(profile, editorialLists) {
  const l = listsFor(editorialLists, profile.id);
  if (!l) return profile;
  const off = new Set((l.disabledWords || []).map((w) => String(w).toLocaleLowerCase('ro').trim()));
  const out = { ...profile, rules: { ...profile.rules } };
  for (const k of BUILTIN_LISTS) {
    if (l.builtins && l.builtins[k] === false) out[k] = [];
    else out[k] = (profile[k] || []).filter((w) => !off.has(w.toLocaleLowerCase('ro')));
  }
  out.forbidden = cleanEntries(l.forbidden);
  out.preferred = cleanEntries(l.preferred);
  return out;
}

// ---------------------------------------------------------------------------
// HTML <-> "manuscript markdown" (the markers the book uses: ***x***, *x*, „…”)

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const decode = (s) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENT[m]);
const encode = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Paragraph list: [{tag, text(markdown-ish), plain, html}]
export function htmlToParagraphs(html) {
  const out = [];
  const re = /<(p|h[1-6]|li|blockquote|pre)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let m;
  const src = (html || '')
    .replace(/<blockquote>\s*<p([^>]*)>([\s\S]*?)<\/p>\s*<\/blockquote>/gi, '<blockquote$1>$2</blockquote>')
    .replace(/<li>\s*<p([^>]*)>([\s\S]*?)<\/p>\s*<\/li>/gi, '<li$1>$2</li>');
  while ((m = re.exec(src))) {
    const tag = m[1].toLowerCase();
    const inner = m[3];
    out.push({ tag, attrs: m[2] || '', html: inner, md: inlineToMd(inner), plain: inlineToPlain(inner) });
  }
  return out;
}

export function inlineToMd(inner) {
  return decode(
    inner
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<strong>\s*<em>([\s\S]*?)<\/em>\s*<\/strong>/gi, '***$1***')
      .replace(/<em>\s*<strong>([\s\S]*?)<\/strong>\s*<\/em>/gi, '***$1***')
      .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
      .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
      .replace(/<span[^>]*data-footnote="([^"]*)"[^>]*><\/span>/gi, (a, t) => `[^${decode(t)}]`)
      .replace(/<span[^>]*data-annotation="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi, '')
      .replace(/<[^>]+>/g, ''),
  );
}

export function inlineToPlain(inner) {
  return decode(
    inner
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<span[^>]*data-annotation="[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
      .replace(/<[^>]+>/g, ''),
  );
}

export function htmlToManuscript(html) {
  return htmlToParagraphs(html)
    .map((p) => (/^h[1-6]$/.test(p.tag) ? `${'#'.repeat(Number(p.tag[1]))} ${p.md}` : p.tag === 'blockquote' ? `> ${p.md}` : p.md))
    .join('\n\n');
}

function mdInline(s) {
  return encode(s)
    .replace(/\[\^([^\]]+)\]/g, (a, t) => `<span data-footnote="${t.replace(/"/g, '&quot;')}" class="footnote"></span>`)
    .replace(/\*\*\*([^*]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

export function manuscriptToHtml(md) {
  return String(md || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}|\n(?=#{1,3} )/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((b) => {
      const h = /^(#{1,3})\s+(.*)$/s.exec(b);
      if (h) return `<h${h[1].length}>${mdInline(h[2])}</h${h[1].length}>`;
      if (b.startsWith('> ')) return `<blockquote><p>${mdInline(b.slice(2))}</p></blockquote>`;
      return `<p>${mdInline(b)}</p>`;
    })
    .join('');
}

// ---------------------------------------------------------------------------
// Detection

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
const words = (s) => s.match(WORD) || [];

function phraseRegex(list) {
  const alts = list
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+').replace(/[șş]/g, '[șş]').replace(/[ȘŞ]/g, '[ȘŞ]').replace(/[țţ]/g, '[țţ]').replace(/[ȚŢ]/g, '[ȚŢ]'))
    .sort((a, b) => b.length - a.length);
  return alts.length ? new RegExp(`(?<![\\p{L}\\p{N}])(${alts.join('|')})(?![\\p{L}\\p{N}])`, 'giu') : null;
}

function sentences(text) {
  return text.split(/(?<=[.!?…])\s+(?=[\p{Lu}„«])/u).map((s) => s.trim()).filter(Boolean);
}

const STOP = new Set('care este sunt acest această aceste acestei acestor unde când pentru despre asupra între după până într dintr printre fiecare toate toată totul orice nimic astfel decât foarte doar încă poate prin fără între sale său sau iar însă ceea cele cel cea cei unei unui unor lui lor dacă atât atunci acum aici acolo aceasta acesta acel acea acei acele'.split(' '));

/**
 * lint(html, ctx) -> issues[]
 * ctx: { profile, title, otherDocs: [{title, html}] (for macro redundancy) }
 * issue: { id, round, rule, severity, message, excerpt, paragraph, suggestion?, autofix? }
 */
export function lint(html, ctx = {}) {
  const profile = ctx.profile || KARMA_PROFILE;
  const r = profile.rules;
  const paras = htmlToParagraphs(html);
  const issues = [];
  let n = 0;
  const add = (round, rule, severity, message, paragraph, excerpt, extra = {}) =>
    issues.push({ id: `${rule}-${n++}`, round, rule, severity, message, paragraph, excerpt: (excerpt || '').slice(0, 160), ...extra });

  const bodyParas = paras.map((p, idx) => ({ ...p, idx })).filter((p) => !/^h[1-6]$/.test(p.tag));
  const reAcademic = r.bannedAcademic && phraseRegex(profile.bannedAcademic);
  const reTrans = r.bannedTransitions && phraseRegex(profile.bannedTransitions);
  const reSelf = r.selfReference && phraseRegex(profile.selfReference);
  const reLlm = r.llmResidue && phraseRegex(profile.llmResidue);
  const rePassive = r.passive && phraseRegex(profile.passive);
  const reTeleo = r.teleology && phraseRegex(profile.teleology);
  const scan = (re, p, round, rule, severity, msg) => {
    if (!re) return;
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(p.plain))) add(round, rule, severity, `${msg}: „${m[1]}”`, p.idx, context(p.plain, m.index, m[0].length), { match: m[0] });
  };

  // User lists: forbidden words and avoided variants of preferred words.
  const userHits = [];
  for (const e of profile.forbidden || []) userHits.push({ phrase: e.word, rule: 'forbidden', msg: `Cuvânt interzis${e.note ? ` (${e.note})` : ''}`, suggestion: e.replacement });
  for (const e of profile.preferred || []) {
    for (const v of (e.replacement || '').split(/[,;]/).map((x) => x.trim()).filter(Boolean)) {
      userHits.push({ phrase: v, rule: 'preferred', msg: `Formă evitată, preferat „${e.word}”${e.note ? ` (${e.note})` : ''}`, suggestion: e.word });
    }
  }
  const reUser = phraseRegex(userHits.map((h) => h.phrase));
  const userMap = new Map(userHits.map((h) => [h.phrase.toLocaleLowerCase('ro').replace(/\s+/g, ' '), h]));

  let noiCount = 0;
  for (const p of bodyParas) {
    const t = p.plain;
    if (!t.trim()) continue;
    if (r.emDash) for (const m of t.matchAll(/\s[—–]\s|—/g)) add('R11', 'emDash', 'GRAVE', 'Em-dash în corpul textului (DOOM III)', p.idx, context(t, m.index, 1));
    if (r.parentheses) for (const m of t.matchAll(/\([^)]*\)/g)) add('R11', 'parentheses', 'GRAVE', 'Paranteze în corpul textului', p.idx, m[0]);
    if (r.structuralColon) for (const m of t.matchAll(/(?<!\d):(?!\d)/g)) add('R11', 'colon', 'MEDIU', 'Două puncte structurale', p.idx, context(t, m.index, 1));
    if (r.boldOutsideAlogen) {
      for (const m of p.md.matchAll(/(?<!\*)\*\*(?!\*)([^*]+)\*\*(?!\*)/g)) add('R11', 'bold', 'GRAVE', 'Bold stilistic (permis doar ***italic+bold*** pe sensul ALOGEN)', p.idx, m[1]);
    }
    if (r.lists && p.tag === 'li') add('R11', 'list', 'GRAVE', 'Listă în corpul textului', p.idx, t);
    if (r.numbering && /^\s*(\d+|[ivxlc]+|[a-z])[.)]\s/i.test(t)) add('R11', 'numbering', 'GRAVE', 'Numerotare la început de paragraf', p.idx, t.slice(0, 40));
    if (r.capitalStart) {
      const first = t.replace(/^[\s„«"'* ]+/, '')[0];
      if (first && /\p{Ll}/u.test(first)) add('R11', 'capital', 'GRAVE', 'Paragraful nu începe cu majusculă', p.idx, t.slice(0, 40), { autofix: 'capital' });
    }
    if (r.asciiQuotes && /"/.test(t)) add('R11', 'asciiQuotes', 'MEDIU', 'Ghilimele ASCII în loc de „…”', p.idx, context(t, t.indexOf('"'), 1), { autofix: 'quotes' });
    if (/ {2,}/.test(t)) add('R11', 'doubleSpace', 'MINOR', 'Spații duble', p.idx, context(t, t.search(/ {2,}/), 2), { autofix: 'spaces' });
    if (r.binary) {
      for (const s of sentences(t)) {
        if (/(?<![\p{L}])(nu|n-|nici|niciodată)(?![\p{L}])[\s\S]{0,140}?(?<![\p{L}])(ci|dar)(?![\p{L}])/iu.test(s)) {
          add('R3', 'binary', 'GRAVE', 'Construcție binară (negație urmată de „ci”/„dar”)', p.idx, s);
        }
      }
    }
    scan(reAcademic, p, 'R2', 'academic', 'MEDIU', 'Familie forțată / stil academic');
    scan(reTrans, p, 'R10', 'transition', 'MEDIU', 'Tranziție de formă (P9)');
    scan(reSelf, p, 'R7', 'selfReference', 'GRAVE', 'Autoreferință la structură');
    scan(reLlm, p, 'R9', 'llm', 'GRAVE', 'Reziduu LLM (P3)');
    scan(rePassive, p, 'R2', 'passive', 'MEDIU', 'Construcție pasivă / impersonală interzisă');
    scan(reTeleo, p, 'R3', 'teleology', 'MEDIU', 'Formulare teleologică (karma e cauzală, nu finalistă)');
    if (reUser) {
      reUser.lastIndex = 0;
      let m;
      while ((m = reUser.exec(t))) {
        const h = userMap.get(m[1].toLocaleLowerCase('ro').replace(/\s+/g, ' '));
        if (!h) continue;
        add('R1c', h.rule, h.rule === 'forbidden' ? 'MEDIU' : 'MINOR', `${h.msg}: „${m[1]}”${h.suggestion ? ` → „${h.suggestion}”` : ''}`, p.idx, context(t, m.index, m[0].length), { match: m[0], ...(h.suggestion ? { suggestion: h.suggestion } : {}) });
      }
    }
    if (r.explicitNoi) {
      for (const m of t.matchAll(/(?<![\p{L}])noi(?![\p{L}])/giu)) {
        noiCount++;
        if (noiCount > profile.maxExplicitNoi) add('R4', 'noi', 'MEDIU', `„noi” explicit de ${noiCount} ori (maxim ${profile.maxExplicitNoi} per document)`, p.idx, context(t, m.index, 3));
      }
    }
    if (r.metronome) {
      const lens = sentences(t).map((s) => words(s).length);
      for (let i = 2; i < lens.length; i++) {
        const [a, b, c] = [lens[i - 2], lens[i - 1], lens[i]];
        const avg = (a + b + c) / 3;
        if (avg > 6 && [a, b, c].every((x) => Math.abs(x - avg) / avg <= 0.15)) {
          add('R5', 'metronome', 'MINOR', 'Metronom: trei fraze consecutive cu aceeași lungime (±15%)', p.idx, sentences(t)[i - 2]);
          break;
        }
      }
    }
    if (r.repetitionMicro) {
      const ws = words(t.toLocaleLowerCase('ro'));
      const seen = new Map();
      ws.forEach((w, i) => {
        if (w.length < 5 || STOP.has(w)) return;
        const stem = w.slice(0, Math.max(5, w.length - 3));
        const prev = seen.get(stem);
        if (prev !== undefined && i - prev <= 30) add('R6', 'repetitionMicro', 'MINOR', `Repetiție apropiată: „${w}”`, p.idx, w, { match: w });
        seen.set(stem, i);
      });
    }
  }

  // ALOGEN (R8): 'term' occurrences with ***sense*** anchors
  if (r.alogen) {
    const counts = new Map();
    for (const p of bodyParas) {
      for (const m of p.md.matchAll(/'([^'\s][^'\n]{0,40}?)'([\p{L}-]*)/gu)) {
        const term = m[1];
        if (!/[āīūṛṝḷṅñṭḍṇśṣḥṃ]|^[A-Z]/u.test(term) && term.split(' ').length > 2) continue;
        const k = term.toLocaleLowerCase('ro');
        const count = (counts.get(k) || 0) + 1;
        counts.set(k, count);
        const before = p.md.slice(Math.max(0, m.index - 80), m.index);
        const anchored = /\*\*\*[^*]+\*\*\*[,\s\p{L}]*$/u.test(before);
        if (m[2]) add('R8', 'alogenSuffix', 'GRAVE', `Termen alogen cu terminație românească: '${term}'${m[2]} (folosește „al lui ${term}”)`, p.idx, m[0]);
        if (count <= 2 && !anchored) add('R8', 'alogenAnchor', 'GRAVE', `ALOGEN: apariția ${count} a lui '${term}' fără ***sens românesc*** înainte`, p.idx, context(p.md, m.index, m[0].length));
        if (count >= 3) add('R8', 'alogenRepeat', 'MEDIU', `ALOGEN: '${term}' apare a ${count}-a oară; după a doua apariție rămâne doar sensul românesc`, p.idx, m[0]);
      }
    }
  }

  // Mezzo repetition: 4-grams repeated within the document
  if (r.repetitionMezzo) {
    const grams = new Map();
    bodyParas.forEach((p) => {
      const ws = words(p.plain.toLocaleLowerCase('ro')).filter((w) => !STOP.has(w));
      for (let i = 0; i + 4 <= ws.length; i++) {
        const g = ws.slice(i, i + 4).join(' ');
        if (g.length < 18) continue;
        if (grams.has(g) && grams.get(g) !== p.idx) add('R6', 'repetitionMezzo', 'MEDIU', `Formulare repetată în document: „${g}”`, p.idx, g);
        else grams.set(g, p.idx);
      }
    });
  }

  // Macro repetition across other documents of the chapter/book
  if (r.repetitionMacro && ctx.otherDocs && ctx.otherDocs.length) {
    const other = new Map();
    for (const d of ctx.otherDocs) {
      const ws = words(htmlToParagraphs(d.html).map((p) => p.plain).join(' ').toLocaleLowerCase('ro')).filter((w) => !STOP.has(w));
      for (let i = 0; i + 5 <= ws.length; i++) other.set(ws.slice(i, i + 5).join(' '), d.title);
    }
    const reported = new Set();
    bodyParas.forEach((p) => {
      const ws = words(p.plain.toLocaleLowerCase('ro')).filter((w) => !STOP.has(w));
      for (let i = 0; i + 5 <= ws.length; i++) {
        const g = ws.slice(i, i + 5).join(' ');
        if (other.has(g) && !reported.has(g)) {
          reported.add(g);
          add('R6', 'repetitionMacro', 'MEDIU', `Redundanță macro: apare și în „${other.get(g)}”`, p.idx, g);
        }
      }
    });
  }

  // Canvas rules
  const total = bodyParas.reduce((s, p) => s + words(p.plain).length, 0);
  if (r.canvasLimit && profile.canvasWordLimit && total > profile.canvasWordLimit) {
    add('R0', 'canvasLimit', 'MEDIU', `Canvas de ${total} cuvinte: peste limita de ${profile.canvasWordLimit}. Propune împărțirea pe noduri inferioare.`, 0, '');
  }
  if (r.canvasHeader && paras[0] && !/^Cap\.\s*\d+\s*\/\s*Secț\.\s*\d+\s*\/\s*Subcap\.\s*[\d.]+/.test(paras[0].plain)) {
    add('R0', 'canvasHeader', 'MEDIU', 'Prima linie nu are formatul „Cap. N / Secț. N / Subcap. N”', 0, paras[0].plain.slice(0, 60));
  }
  if (r.canvasFooter) {
    const last = paras[paras.length - 1];
    if (!last || !/^¹\s*Cap\.\s*\d+/.test(last.plain)) add('R0', 'canvasFooter', 'MEDIU', 'Ultima linie nu are nota canonică „¹ Cap. N / Subcap. N.N · Seg. … · ← anterior · → următor”', paras.length - 1, last ? last.plain.slice(0, 60) : '');
  }

  // Canonical index (Index_de_Lucru): the document must have a node (R0/R1).
  if (ctx.canon && ctx.canon.nodes && ctx.canon.nodes.length) {
    const nid = ctx.canon.nodeId || nodeIdFromTitle(ctx.title);
    if (!nid) add('R0', 'canonMissing', 'MINOR', 'Documentul nu are număr de nod (N.N.N) în titlu; nu poate fi poziționat în Index_de_Lucru', 0, ctx.title || '');
    else if (!ctx.canon.nodes.some((x) => x.id === nid)) add('R0', 'canonMissing', 'MEDIU', `Nodul ${nid} nu există în Index_de_Lucru`, 0, ctx.title || '');
  }

  // Attention decay: density of issues at the end vs the beginning
  if (r.attentionDecay && bodyParas.length >= 6) {
    const firstIdx = new Set(bodyParas.slice(0, 3).map((p) => p.idx));
    const lastIdx = new Set(bodyParas.slice(-3).map((p) => p.idx));
    const weigh = (set) => issues.filter((i) => set.has(i.paragraph) && i.severity !== 'MINOR').length;
    const a = weigh(firstIdx);
    const b = weigh(lastIdx);
    if (b > a + 1) add('R9', 'attentionDecay', 'GRAVE', `Attention decay: ${b} probleme în ultimele 3 paragrafe față de ${a} în primele 3`, bodyParas[bodyParas.length - 1].idx, '');
  }

  return issues;
}

function context(text, index, len, pad = 40) {
  const start = Math.max(0, index - pad);
  return (start > 0 ? '…' : '') + text.slice(start, index + len + pad) + (index + len + pad < text.length ? '…' : '');
}

export function summarize(issues) {
  const s = { GRAVE: 0, MEDIU: 0, MINOR: 0, total: issues.length, byRound: {} };
  for (const i of issues) {
    s[i.severity]++;
    s.byRound[i.round] = (s.byRound[i.round] || 0) + 1;
  }
  return s;
}

// Deterministic, safe fixes (no AI): quotes, spaces, capital at paragraph start.
export function autofix(html) {
  return html.replace(/(<(p|h[1-6]|li)(\s[^>]*)?>)([\s\S]*?)(<\/\2>)/gi, (all, open, tag, attrs, inner, close) => {
    // only touch text between tags
    let first = true;
    const fixed = inner.replace(/(<[^>]+>)|([^<]+)/g, (m, t, text) => {
      if (t) return t;
      let s = text;
      s = s.replace(/ {2,}/g, ' ');
      // straight double quotes -> „…” (opening after start/space/(, closing otherwise)
      s = s.replace(/(^|[\s(\[ ])"/g, '$1„').replace(/"/g, '”');
      s = s.replace(/&quot;/g, '”');
      if (first && /\S/.test(s)) {
        s = s.replace(/^([\s„«* ]*)(\p{Ll})/u, (x, pre, ch) => pre + ch.toLocaleUpperCase('ro'));
        first = false;
      }
      return s;
    });
    return open + fixed + close;
  });
}

// ---------------------------------------------------------------------------
// Prompts for AI repair (I-REP) and rounds (I-EDIT)

export function systemPrompt(profile) {
  return [
    `Ești editorul doctrinar al cărții, nu un asistent general. Profil editorial: ${profile.name}.`,
    'Lucrezi pe textul autorului în română. Livrezi doar textul final, fără meta-comentarii, fără explicații, fără titluri adăugate.',
    'Formatul textului: paragrafe separate prin rând gol; ***italic+bold*** exclusiv pentru sensul românesc ALOGEN; *italic* + „…” pentru ilustrații; [^text] pentru note de subsol. Păstrezi exact aceste marcaje și notele de subsol existente.',
    'Reguli permanente: fără em-dash, paranteze, două puncte structurale, bold stilistic, liste sau numerotare în corpul textului; fiecare paragraf începe cu majusculă; ghilimele „…”; fără construcții binare (negație urmată de „ci”/„dar”), rescrise afirmativ; fără pasive de tip „se observă”; maxim un „noi” explicit; tranziții de fond, nu de formă; fără autoreferințe la structură; mecanismul karmic este cauzal, nu finalist.',
    'Attention decay activ: ultimele paragrafe au aceeași calitate ca primele. P3 (sterilizator stil LLM) se aplică la final ca ultimă vamă.',
    (profile.forbidden || []).length ? `Cuvinte interzise de autor: ${profile.forbidden.map((e) => (e.replacement ? `„${e.word}” → „${e.replacement}”` : `„${e.word}”`)).join('; ')}.` : '',
    (profile.preferred || []).length ? `Forme preferate de autor: ${profile.preferred.map((e) => (e.replacement ? `„${e.word}” în loc de „${e.replacement}”` : `„${e.word}”`)).join('; ')}.` : '',
  ].filter(Boolean).join('\n');
}

export function repairPrompt(manuscript, issues, level) {
  const list = issues
    .slice(0, 120)
    .map((i) => `- [${i.severity}] ${i.round} ${i.message}${i.excerpt ? ` — „${i.excerpt}”` : ''}`)
    .join('\n');
  return [
    `I-REP (${level}): repară exact problemele de mai jos, fără să schimbi altceva în text. Păstrezi sensul, vocea, ordinea ideilor, notele de subsol și marcajele.`,
    '<probleme>',
    list,
    '</probleme>',
    '<text>',
    manuscript,
    '</text>',
    'Întoarce textul complet reparat.',
  ].join('\n');
}

export function roundPrompt(round, manuscript, context) {
  return [
    `I-EDIT · runda ${round.id} ${round.title} (${round.protocols}).`,
    round.prompt,
    context ? `<context_capitol>\n${context}\n</context_capitol>` : '',
    '<text>',
    manuscript,
    '</text>',
    'Aplici integral runda, fără omisiuni și fără improvizații. Întoarce textul complet.',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Context for a round: R1 and R6 get the canonical index (Index_de_Lucru) for the
 * document's node plus the chapter text (macro). Other rounds get nothing.
 * opts: { chapterContext, canonNodes, nodeId, title }
 */
export function roundContext(round, opts = {}) {
  const id = typeof round === 'string' ? round : round.id;
  if (id !== 'R1' && id !== 'R6') return '';
  const nid = opts.nodeId || nodeIdFromTitle(opts.title);
  const canon = canonContext(opts.canonNodes, nid, id);
  return [canon ? `<index_de_lucru>\n${canon}\n</index_de_lucru>` : '', opts.chapterContext || ''].filter(Boolean).join('\n\n');
}

// Strip accidental wrappers the model may add (<text>…</text>, ``` fences).
export function cleanModelText(s) {
  // Trim first, then anchor on the ends: /\s*<\/text>\s*$/ tried at every whitespace
  // position is quadratic on long whitespace runs.
  let t = String(s || '').trim().replace(/^```[a-z]*\n?/, '');
  if (t.endsWith('```')) t = t.slice(0, -3);
  t = t.trim().replace(/^<text>/, '');
  t = t.trim();
  if (t.endsWith('</text>')) t = t.slice(0, -7);
  return t.trim();
}

// After an AI pass the text comes back as manuscript markdown, which cannot carry
// comments, inline annotations or paragraph alignment. Re-attach them: comments by
// their covered text, annotations and alignment by paragraph position.
export function reattach(oldHtml, newHtml) {
  let html = newHtml;
  const lost = [];
  for (const m of (oldHtml || '').matchAll(/<span([^>]*data-comment="[^"]*"[^>]*)>([\s\S]*?)<\/span>/g)) {
    const covered = m[2];
    const plainCovered = covered.replace(/<[^>]+>/g, '');
    if (!plainCovered.trim()) continue;
    const idx = html.indexOf(covered);
    const pidx = idx >= 0 ? idx : html.indexOf(plainCovered);
    const target = idx >= 0 ? covered : plainCovered;
    if (pidx >= 0 && !/<[^>]*$/.test(html.slice(0, pidx))) {
      html = html.slice(0, pidx) + `<span${m[1]}>${target}</span>` + html.slice(pidx + target.length);
    } else {
      lost.push(m[0]);
    }
  }
  const oldParas = htmlToParagraphs(oldHtml);
  const annotations = oldParas.map((p) => [...p.html.matchAll(/<span[^>]*data-annotation="[^"]*"[^>]*>[\s\S]*?<\/span>/g)].map((x) => x[0]));
  const aligns = oldParas.map((p) => (/style="text-align:\s*(\w+)"/.exec(p.attrs) || [])[1] || null);
  let i = -1;
  html = html.replace(/<(p|h[1-6])>([\s\S]*?)<\/\1>/g, (all, tag, inner) => {
    i++;
    const extra = (annotations[i] || []).join('');
    const style = aligns[i] ? ` style="text-align: ${aligns[i]}"` : '';
    return `<${tag}${style}>${inner}${extra}</${tag}>`;
  });
  // Anything that could not be placed is appended so nothing is lost.
  for (let k = i + 1; k < annotations.length; k++) if (annotations[k].length) lost.push(...annotations[k]);
  if (lost.length) html += `<p>${lost.map((x) => (x.includes('data-comment') ? x : x)).join(' ')}</p>`;
  return html;
}

/**
 * True when an AI proposal no longer matches the document it was computed from
 * (the user edited the document, or moved the selection, while the model was working).
 * Applying it would silently overwrite those edits.
 */
export function proposalIsStale(p, currentHtml, currentSelText) {
  if (p.selection) return (p.base !== undefined && p.base !== currentHtml) || (p.selText !== undefined && p.selText !== currentSelText);
  return p.before !== currentHtml;
}
