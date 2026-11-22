// Măsură, nu generare: semnale (NU verdicte) pentru un text românesc.
// Port din write-for-me/scripts/verifica.py, fără partea de doctrină — universal pentru orice carte.
// Regula de citire: detectorul propune, cititorul judecă. Rezultatele apar în panoul de semnale, nu în AI.
// Ieșire: [{linie, regula, citat, fix}] sortate pe linie, deduplicate.

const U = 'A-Za-zĂÂÎȘȚăâîșț0-9_'; // clasa de cuvinte românesc + latin

export function curata(text) {
  const lines = String(text || '').split('\n');
  const out = [];
  let inFm = lines.length && lines[0].trim() === '---';
  let inCode = false;
  lines.forEach((ln, i) => {
    const s = ln.trim();
    if (inFm) {
      if (i > 0 && s === '---') inFm = false;
      return;
    }
    if (s.startsWith('```')) { inCode = !inCode; return; }
    if (inCode || s.startsWith('#')) return;
    out.push([i + 1, ln]);
  });
  return out;
}

const SPLIT = new RegExp(`(?<=[.!?…])\\s+(?=[„"'(A-ZĂÂÎȘȚ0-9*])`);
export function fraze(linii) {
  const r = [];
  for (const [n, ln] of linii) {
    if (!ln.trim()) continue;
    for (const s of ln.trim().split(SPLIT)) if (s.trim()) r.push([n, s.trim()]);
  }
  return r;
}
const cuvinte = (s) => s.match(new RegExp(`[${U}]+(?:[-’'][${U}]+)*`, 'g')) || [];
// matchAll cere flagul global; regexurile modulelor îl primesc aici, la folosire
const g = (rx) => {
  // -ul JS nu vede diacriticele ca litere: înlocuim secvențele  cu granițe unicode (U = clasa românească).
  const src = rx.source.replace(/\\b/g, (m, off) => {
    const next = rx.source[off + 2] || '';
    const startsWord = next === '(' || /[A-Za-zĂÂÎȘȚăâîșț]/.test(next) || (next === '[' && rx.source[off + 3] !== '^');
    return startsWord ? `(?<![${U}])` : `(?![${U}])`;
  });
  return rx.flags.includes('g') ? new RegExp(src, rx.flags) : new RegExp(src, rx.flags + 'g');
};
const cit = (s, start, end, w = 45) => {
  const a = Math.max(0, start - Math.floor(w / 2));
  const b = Math.min(s.length, end + Math.floor(w / 2));
  return (a ? '…' : '') + s.slice(a, b).trim() + (b < s.length ? '…' : '');
};

// ---------- 1. caractere și numere ----------
const INVIZ = new Set('\u200B\u200C\u200D\u200E\u200F\u2060\uFEFF\u00AD\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069\u180E');
const SPATII = { '\u00A0': 'NBSP', '\u2009': 'spațiu subțire', '\u202F': 'NBSP îngust', '\u2002': 'spațiu en', '\u2003': 'spațiu em', '\u2007': 'spațiu cifră' };
const NUM_LIT = new RegExp(`\\b(zece|unsprezece|doisprezece|([a-zăâîșț]+)sprezece|douăzeci|treizeci|patruzeci|cincizeci|șaizeci|șaptezeci|optzeci|nouăzeci|o sută|două sute|trei sute|patru sute|cinci sute|șase sute|șapte sute|opt sute|nouă sute|o mie|două mii|trei mii|patru mii|cinci mii|șase mii|șapte mii|opt mii|nouă mii|un milion|două milioane|un miliard)\\b(?!\\s+de\\s+ori)`, 'i');
function mCaractere(linii, opt) {
  const r = [];
  for (const [n, ln] of linii) {
    for (const ch of ln) {
      if (INVIZ.has(ch)) r.push({ linie: n, regula: 'caractere/HARD', citat: `caracter invizibil U+${ch.codePointAt(0).toString(16).padStart(4, '0').toUpperCase()}`, fix: 'șterge-l (urmă de copy-paste)' });
    }
    for (const [ch, nume] of Object.entries(SPATII)) {
      if (ln.includes(ch)) r.push({ linie: n, regula: 'caractere/SOFT', citat: nume, fix: 'spațiu obișnuit, dacă nu e intenționat' });
    }
    for (const m of ln.matchAll(/[şţŞŢ]/g)) r.push({ linie: n, regula: 'caractere/HARD', citat: `sedilă «${m[0]}»`, fix: 'folosește ș/ț cu virgulă' });
    if (/[“”«»]/.test(ln) && /„/.test(ln)) r.push({ linie: n, regula: 'caractere/SOFT', citat: 'ghilimele amestecate', fix: 'alege un singur stil, „…"' });
    if (opt.emdash) {
      for (const m of ln.matchAll(/[—–]/g)) r.push({ linie: n, regula: 'caractere/PREFERINȚĂ', citat: cit(ln, m.index ?? 0, (m.index ?? 0) + 1), fix: 'virgulă, două puncte sau punct' });
    }
    for (const m of ln.matchAll(g(NUM_LIT))) r.push({ linie: n, regula: 'numere', citat: cit(ln, m.index ?? 0, (m.index ?? 0) + m[0].length), fix: 'cifre pentru numere exacte >= 10 (ex. 2.500 de ani); în proză literară «zece ani» poate rămâne' });
    for (const m of ln.matchAll(/\b(secolul|veacul|mileniul)\s+(al\s+)?(\d{1,2})\b/gi)) r.push({ linie: n, regula: 'numere', citat: cit(ln, m.index ?? 0, (m.index ?? 0) + m[0].length), fix: 'secol cu cifre romane: secolul al VI-lea' });
  }
  return r;
}

// ---------- 2. turnuri de «carte tradusă» ----------
const TURNURI = [
  ['c1 perifrază cel-care', /\b(cel|cea|cei|cele|celui|celei|celor)\s+(ce|care)\b/i, 'numește persoana/lucrul: «omul care…»'],
  ['c3 adverb în cap + reflexiv', /(?:^|[.!?]\s+)(Așa|Astfel|Aici|Acolo|Atunci)\s+se\s+\w+/, '«De aici…», «Așa apare…» sau subiect concret'],
  ['c4 «Odată ce» în cap', /(?:^|[.!?]\s+)(Odată ce|În clipa în care|De îndată ce)\b/, '«După ce…», «Când…»'],
  ['c5 poartă numele', /\bpoart[ăa]\s+(numele|denumirea|titlul)\s+de\b|\bpurta\s+(numele|denumirea)\s+de\b/i, '«i se spune X», «se numește X»'],
  ['c6 pasiv cu agent-perifrază', /\b(este|e|a fost|sunt|era|erau)\s+\w+(at|it|ut|s)\s+de\s+(aceeași|același|o|un)\s+(mână|pană|voce|minte|gură)\b/i, 'activ: «le-a scris același om»'],
  ['c7 nominalizare subiect', /(?:^|[.!?]\s+)\w+(rea|area|irea|ârea|erea)\s+(atinge|produce|face|dă|cere|aduce|scoate|duce)\b/, 'subiect concret + verb: «stocul se dizolvă»'],
  ['c8 cu putință', /\bcu\s+(ne)?putință\b/i, '«cel mai repede»'],
  ['c10 nu…decât', /\bnu\s+[^.;]{1,40}\bdecât\b/i, 'afirmație: «rămâne să…», «doar»'],
  ['c11 pasiv inutil', /\b(este|e|sunt|a fost|au fost|era|erau)\s+(numit|numită|purtat|purtată|considerat|considerată|socotit|socotită)\b/i, 'activ sau verb direct'],
  ['c14 «ce» relativ după substantiv', /\b(Conștiința|omul|mintea|fapta|urma|starea|reacția|forma|legea|clipa)\s+ce\s+(o|îl|le|se|nu)\b/, '«care»'],
  ['m1 potențial pasiv fără agent', /\b(nu\s+)?se\s+(lasă|cere|cer|face|fac)\s+(mai\s+\w+\s+)?\w+(at|ată|ați|ate|it|ită|iți|ite|ut|ută|uți|ute)\b/i, 'agent: «poți să…», «cineva o poate…»'],
  ['a7 «adică»/«și anume»', /,\s*(adică|și anume)\b/i, 'propoziție separată sau topește sensul în frază'],
  ['a8 umplutură', /\b(pur și simplu|cu adevărat|propriu-zis|nimic altceva decât|tocmai|de fapt)\b/i, 'taie dacă nu pierzi nimic'],
  ['felul/modul în care', /\b(felul|modul|chipul)\s+în\s+care\b/i, 'adesea «cum» (nu după prepoziție, acolo e nominal și rămâne)'],
];
function mTurnuri(linii) {
  const r = [];
  for (const [n, s] of fraze(linii)) {
    for (const [nume, rx, fix] of TURNURI) {
      for (const m of s.matchAll(g(rx))) {
        if (nume.startsWith('felul') && new RegExp(`(?:[^A-Za-zĂÂÎȘȚăâîșț]|^)(în|de|ca|la|prin|din|pe|cu|după|spre|către|asupra|pentru|despre)\\s+$`, 'i').test(s.slice(0, m.index ?? 0))) continue;
        r.push({ linie: n, regula: 'turnuri/' + nume, citat: cit(s, m.index ?? 0, (m.index ?? 0) + m[0].length), fix });
      }
    }
    for (const m of s.matchAll(/\(([^)]{45,})\)/g)) r.push({ linie: n, regula: 'turnuri/a7 paranteză lungă', citat: cit(s, m.index ?? 0, (m.index ?? 0) + m[0].length, 60), fix: 'digresiune: propoziție proprie sau taie' });
  }
  return r;
}

// ---------- 3. calcuri, verbe goale, schelă ----------
const CALCURI = [
  [/\b(face|fac|făcea|a face)\s+sens\b/i, 'are sens'],
  [/\b(are|au|avea|a avea)\s+(un\s+)?impact\b/i, 'influențează / se resimt / are efect'],
  [/\b(ia|iau|a luat|a lua)\s+loc\b/i, 'are loc / se petrece'],
  [/\b(are|au|avea)\s+capacitatea\s+de\s+a\b/i, 'poate'],
  [/\b(este|e|sunt|era|a fost)\s+nevoit(ă|i|e)?\s+să\b/i, 'trebuie să'],
  [/\bîn\s+momentul\s+în\s+care\b/i, 'când'],
  [/\bîn\s+cazul\s+în\s+care\b/i, 'dacă'],
  [/\bdatorită\s+faptului\s+că\b/i, 'fiindcă / deoarece'],
  [/\bîn\s+ciuda\s+faptului\s+că\b/i, 'deși'],
  [/\bîn\s+mod\s+(clar|evident|real|direct|automat)\b/i, 'adverbul simplu: limpede, evident, real…'],
  [/\bîn\s+ceea\s+ce\s+privește\b/i, 'cât despre / despre'],
  [/\bîn\s+termeni\s+de\b/i, 'din punctul de vedere al'],
  [/\bbazat(ă|ți|e)?\s+pe\b/i, 'întemeiat pe / pornind de la'],
  [/\bîn\s+scopul\s+de\s+a\b/i, 'pentru a'],
  [/\bla\s+momentul\s+actual\b/i, 'acum / în prezent'],
  [/\bprin\s+intermediul\b/i, 'prin'],
  [/\bîn\s+cadrul\b/i, 'în / la'],
  [/\bla\s+nivelul\b/i, 'în / la'],
  [/\bîn\s+vederea\b/i, 'pentru'],
  [/\baplica(ți|m|)\s+pentru\b/i, 'a candida'],
  [/\ba\s+realiza\s+o\s+decizie\b|\brealizat\s+o\s+decizie\b/i, 'a lua o decizie'],
];
const SCHELA = [
  [/\b(Le|O|Îi)?\s*Luăm(-o)?\s+(pe rând|în ordine|în ordinea|în două|una câte una)/i, 'anunț de structură'],
  [/\bCu\s+(asta|acesta|aceasta|primul|ultimul)\s+se\s+(închid|termin|sfârșesc|opresc)/i, 'anunț de închidere'],
  [/\b(Trecem la|Ajungem (acum )?la|Urmează să vedem|În cele ce urmează|Ne întoarcem (acum )?la|Vom vedea (mai )?(încolo|târziu|jos))\b/i, 'meta-navigație'],
  [/\b(Rămâne întrebarea|Se pune întrebarea|Apare (acum )?întrebarea)\b/i, 'întrebare-schelă'],
  [/\b(aici vedem|astfel se înțelege|cu alte cuvinte|cu alte vorbe|putem spune că|se poate spune că)\b/i, 'rezumat de eseu: arată, nu anunța'],
  [/\b(am (văzut|vorbit|spus) deja|știm deja (din|că)|așa cum am (promis|spus|văzut)|după cum am (insistat|spus))\b/i, 'autojustificare/auto-referință (navigația «am arătat la cap. 3» rămâne)'],
  [/\b(în lumea de azi|în era digitală|este important de menționat că|în acest articol vom|să ne scufundăm)\b/i, 'deschidere generică'],
  [/\b(în concluzie|în încheiere|nu ezita(ți)? să|sperăm că (acest|această)|ne face plăcere să|iată câteva|aspecte cheie|piatra de temelie|peisajul (digital|actual)|într-o lume (în care|în continuă))/i, 'formulă stoc de text generat / închidere de chat'],
  [/\bnu\s+(este|e|sunt|înseamnă)\s+(vorba\s+)?(doar|numai)\b[^.;]{0,60},\s*ci\b/i, '«nu doar X, ci Y»: spune direct Y'],
];
function mCalcuri(linii) {
  const r = [];
  for (const [n, s] of fraze(linii)) {
    for (const [rx, fix] of CALCURI) for (const m of s.matchAll(g(rx))) r.push({ linie: n, regula: 'calcuri', citat: cit(s, m.index ?? 0, (m.index ?? 0) + m[0].length), fix });
    for (const [rx, fix] of SCHELA) for (const m of s.matchAll(g(rx))) r.push({ linie: n, regula: 'schelă', citat: cit(s, m.index ?? 0, (m.index ?? 0) + m[0].length), fix });
  }
  return r;
}

// ---------- 4. respirație ----------
const SUBORD = /\b(care|cărui|căreia|cărora|că|să|când|dacă|fiindcă|deoarece|deși|încât|unde|cum|precum|după ce|înainte să|pentru că|ca să)\b/gi;
function mRespiratie(linii) {
  const r = [];
  const F = fraze(linii);
  for (const [n, s] of F) {
    const w = cuvinte(s).length;
    const subs = [...new Set([...s.matchAll(SUBORD)].map((m) => m[0].toLowerCase()))];
    if (w > 28 && subs.length >= 3) r.push({ linie: n, regula: 'respirație/lanț', citat: `${w} cuvinte, subordonatori diferiți: ${subs.sort().join(', ')}`, fix: 'desface în două fraze' });
    else if (w > 28 && (s.match(/\bcare\b/gi) || []).length >= 2 && !/\bcare\b[^,]{0,60}\b(și|iar|sau|ori)\s+care\b/i.test(s)) r.push({ linie: n, regula: 'respirație/care încuibate', citat: `${w} cuvinte, ≥2 «care»`, fix: 'nominalizează sau desface' });
  }
  const par = new Map();
  for (const [n, ln] of linii) if (ln.trim() && !par.has(n)) par.set(n, ln.trim());
  for (const [n, p] of par) {
    const fs = p.split(SPLIT).filter((x) => cuvinte(x).length >= 3);
    const L = fs.map((x) => cuvinte(x).length);
    if (fs.length >= 4 && Math.max(...L) <= 20) {
      const medie = L.reduce((a, b) => a + b, 0) / L.length;
      const cv = Math.sqrt(L.reduce((a, x) => a + (x - medie) ** 2, 0) / L.length) / medie;
      if (cv < 0.30) r.push({ linie: n, regula: 'respirație/staccato', citat: `paragraf de ${fs.length} fraze, toate ≤20 cuvinte, lungimi uniforme (cv ${cv.toFixed(2)})`, fix: 'una mai lungă, cu coordonare, care duce un termen' });
    }
  }
  for (let i = 1; i < F.length; i++) {
    const a = cuvinte(F[i - 1][1]);
    const b = cuvinte(F[i][1]);
    if (a.length >= 3 && b.length >= 3 && a[0].toLowerCase() === b[0].toLowerCase() && a[1].toLowerCase() === b[1].toLowerCase()) r.push({ linie: F[i][0], regula: 'respirație/anaforă', citat: `«${b.slice(0, 2).join(' ')}…» ×2`, fix: 'voită (retorică) sau tic?' });
  }
  for (let i = 2; i < F.length; i++) {
    const l = [0, 1, 2].map((k) => cuvinte(F[i - k][1]).length);
    if (Math.min(...l) >= 5 && Math.max(...l) - Math.min(...l) <= 2) r.push({ linie: F[i][0], regula: 'respirație/izocolon', citat: `3 fraze vecine de ${l.join('/')} cuvinte`, fix: 'variază lungimea' });
  }
  return r;
}

// ---------- 5. repetiție apropiată ----------
const STOP = new Set('si sau dar iar ci ca ce cu de din la pe in prin pentru spre catre fara intre dupa pana asupra despre sub peste langa este sunt era erau fi fost fiind are au avea avut va vor ar am ai ati poate pot putea trebuie vrea face fac facut mai tot toate toti toata acest aceasta acesta aceste acestei acestui acel acea aceia care cine cat cata cati cate cand unde cum daca deci asa astfel doar numai chiar inca deja foarte prea mult multe multa putin cel cea cei cele unui unei unor lui ei lor sa se si nu nici fie atunci apoi aici acolo oricare orice fiecare unul una unii unele altul alta altele alt alte alti nimic ceva cineva niciun nicio'.split(' '));
const norm = (w) => w.toLowerCase().replace(/ă/g, 'a').replace(/â/g, 'a').replace(/î/g, 'i').replace(/ș/g, 's').replace(/ş/g, 's').replace(/ț/g, 't').replace(/ţ/g, 't');
const radacina = (w) => {
  w = norm(w);
  for (const suf of ['ilor', 'elor', 'ului', 'ile', 'iei', 'ele', 'ul', 'ii', 'ea', 'le', 'ei', 'a', 'e', 'i', 'u']) {
    if (w.length - suf.length >= 4 && w.endsWith(suf)) return w.slice(0, -suf.length);
  }
  return w;
};
function mRepetitie(linii) {
  const r = [];
  const F = fraze(linii);
  const toks = [];
  F.forEach(([n, s], idx) => {
    let pos = 0;
    for (const w of cuvinte(s)) {
      const nw = norm(w);
      if (pos > 0 && /[A-ZĂÂÎȘȚ]/.test(w[0])) { pos += 1; continue; }
      if (nw.length >= 4 && !STOP.has(nw) && !/[0-9]/.test(w[0])) toks.push([idx, n, radacina(w), w]);
      pos += 1;
    }
  });
  const by = new Map();
  for (const t of toks) {
    if (!by.has(t[2])) by.set(t[2], []);
    by.get(t[2]).push(t);
  }
  const seen = new Set();
  const raport = (grup) => {
    if ((grup.length >= 3 || (grup.length >= 2 && norm(grup[0][3]).length >= 6)) && !seen.has(`${grup[0][1]}|${radacina(grup[0][3])}`)) {
      seen.add(`${grup[0][1]}|${radacina(grup[0][3])}`);
      r.push({ linie: grup[0][1], regula: 'repetiție', citat: `«${grup[0][3].toLowerCase()}» ×${grup.length} în fraze vecine`, fix: 'voită (termen-cheie) sau neglijentă? Fără rotație mecanică de sinonime' });
    }
  };
  for (const ts of by.values()) {
    let grup = [ts[0]];
    for (const t of ts.slice(1)) {
      if (t[0] - grup[grup.length - 1][0] <= 1) grup.push(t);
      else { raport(grup); grup = [t]; }
    }
    raport(grup);
  }
  return r;
}

// ---------- 6. pasiv + etichete ----------
const PASIV = [
  [/\b(este|sunt|era|erau|a fost|au fost|fiind)\s+(\w+\s+)?([A-Za-zăâîșț]{3,}(at|ată|ați|ate|it|ită|iți|ite|ut|ută|uți|ute)\s+de\s+către|(realiz|efectu|aplic|implement|desfășur|asigur|verific|monitoriz|stabil|utiliz|analiz|evalu|elabor|emis|efectuat|făcut|luat|desemn|întreprins|adopt|transmis)\w*)\b/i, 'pasiv cu «a fi»: agent concret, verb activ'],
  [/^\W*(Efectuarea|Realizarea|Implementarea|Desfășurarea|Aplicarea|Asigurarea|Verificarea|Monitorizarea)\b[^.]{0,80}\b(este|sunt)\b/, 'nominalizare ca subiect + «este»: cine face?'],
  [/\bse\s+impune\b|\bfiind\s+luat\s+în\s+considerare\b|\bîn\s+conformitate\s+cu\s+prevederile\b/i, 'birocratism: spune cine, ce, când'],
];
function mPasiv(linii) {
  const r = [];
  for (const [n, s] of fraze(linii)) {
    for (const [rx, fix] of PASIV) for (const m of s.matchAll(g(rx))) r.push({ linie: n, regula: 'pasiv', citat: cit(s, m.index ?? 0, (m.index ?? 0) + m[0].length), fix });
  }
  for (const [n, s] of linii) {
    if (/^\s*[-*•]\s+\*\*[^*]{2,40}\*\*/.test(s)) r.push({ linie: n, regula: 'etichetă bold', citat: s.trim().slice(0, 50), fix: 'listă cu etichetă bold = tipar de chat; proză sau listă simplă' });
  }
  return r;
}

// ---------- 7. lexic ----------
const UMBRELA = /\b(lucru|lucruri|lucrul|aspect|aspecte|aspectul|element|elemente|elementul|problemă|probleme|situație|situații|proces|procese|fenomen|fenomene|structură|structuri|nivel|niveluri|formă|forme|mecanism|mecanisme|dimensiune|dimensiuni|problematică|paradigmă)\b/gi;
const ACADEMIC = /\b(în cadrul|la nivelul|în ceea ce privește|are loc|se produce|se constituie|se configurează|problematica|paradigma)\b/gi;
const ARHAIC = /(^|[.!?…]\s+)(De aici (vine|pornește|rezultă|urmează)|De aceea|Acolo unde|Tot de aici)\b/;
const BINAR = /\bCu cât\b[^.;]{3,80}\bcu atât|\bUna\b[^.;]{3,80}\b(Cealaltă|Cealaltă)|Pe de o parte\b[^.;]{3,100}\bpe de altă parte/;
function mLexic(linii) {
  const r = [];
  for (const [n, s] of fraze(linii)) {
    const um = [...s.matchAll(UMBRELA)];
    if (um.length >= 2) r.push({ linie: n, regula: 'lexic/umbrelă', citat: cit(s, um[0].index ?? 0, (um[0].index ?? 0) + um[0][0].length, 60), fix: `${um.length} substantive-umbrelă într-o frază: numește lucrul concret` });
    for (const m of s.matchAll(ACADEMIC)) r.push({ linie: n, regula: 'lexic/academic', citat: cit(s, m.index ?? 0, (m.index ?? 0) + m[0].length), fix: 'verb precis, nu construcție academică' });
    for (const m of s.matchAll(g(ARHAIC))) r.push({ linie: n, regula: 'lexic/conector arhaic', citat: cit(s, m.index ?? 0, (m.index ?? 0) + m[0].length), fix: 'leagă prin conținut, nu prin «de aici vine / de aceea»' });
    for (const m of s.matchAll(g(BINAR))) r.push({ linie: n, regula: 'lexic/paralelism binar', citat: cit(s, m.index ?? 0, (m.index ?? 0) + m[0].length, 60), fix: 'ritm de schemă: spune o dată, concret' });
    const care = (s.match(/\b[Cc]are\b/g) || []).length;
    if (care >= 3 || (care >= 2 && cuvinte(s).length > 28)) r.push({ linie: n, regula: 'lexic/lanț de «care»', citat: s.slice(0, 60) + '…', fix: '2-3 «care» în frază lungă: desface' });
  }
  return r;
}

const MODULE = { caractere: mCaractere, turnuri: mTurnuri, calcuri: mCalcuri, respiratie: mRespiratie, repetitie: mRepetitie, pasiv: mPasiv, lexic: mLexic };

// Toate modulele pe un text; deduplicate pe (linie, regulă, fix), sortate pe linie.
export function verifica(text, { emdash = false, module = null } = {}) {
  const opt = { emdash };
  const linii = curata(text);
  const nume = module || Object.keys(MODULE);
  const out = [];
  for (const n of nume) out.push(...MODULE[n](linii, opt));
  const seen = new Set();
  return out
    .sort((a, b) => a.linie - b.linie)
    .filter((x) => {
      const k = `${x.linie}|${x.regula}|${x.fix}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}
