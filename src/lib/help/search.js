// Smart Help Search (PS-HELP-001 §4): căutare unificată în baza de articole Help.
// Niveluri: exact → aproximativ (fuzzy) → sinonime/întrebări naturale. Pur, offline;
// fără servicii AI externe — funcția elementară de Help nu depinde de internet (§17).
// Clasificarea intenției (§5.4): 'learn' (vreau să aflu) vs 'run' (vreau comanda).

const norm = (s) => String(s || '').toLowerCase().replace(/[șş]/g, 's').replace(/țţ/g, 't')
  .replace(/ă/g, 'a').replace(/â/g, 'a').replace(/î/g, 'i').replace(/\s+/g, ' ').trim();

const STOP = new Set(['cum', 'pot', 'sa', 'să', 'un', 'o', 'unei', 'unui', 'the', 'de', 'la', 'în', 'in', 'si', 'și', ' sau ', 'nu', 'mi', 'ma', 'mă', 'meu', 'mea', 'mele', 'acest', 'aceasta', 'asta', 'este', 'e', 'fac', 'face', 'folosesc', 'folosesc', 'trebuie'].map((w) => w.trim()));

// Distanță Levenshtein cu prag timpuriu (cuvinte scurte; textele sunt mici).
function editDistance(a, b, max = 3) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const v = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = v[0];
    v[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = v[j];
      v[j] = Math.min(v[j] + 1, v[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return v[b.length];
}

const fuzzy = (q, text) => {
  if (!q || !text) return 0;
  const qw = norm(q).split(' ').filter((w) => w && !STOP.has(w));
  const tw = norm(text).split(' ');
  let score = 0;
  for (const w of qw) {
    if (tw.includes(w)) score += 2; // cuvânt întreg
    else if (tw.some((t) => t.startsWith(w.slice(0, Math.max(3, w.length - 1))))) score += 1.5; // prefix
    else {
      const d = tw.filter((t) => Math.abs(t.length - w.length) <= 2)
        .map((t) => editDistance(w, t)).sort((a, b) => a - b)[0];
      if (d === 1) score += 1; // greșeală de tastare
      else if (d === 2 && w.length >= 6) score += 0.5;
    }
  }
  return score;
};

// Potrivire pe un articol: nivel 1 exact (titlu/comandă/keyword), 2 fuzzy, 3 sinonime + searchTerms.
function scoreArticle(q, art) {
  const nq = norm(q);
  if (!nq) return { score: 0 };
  let score = 0;
  const title = norm(art.title);
  if (title === nq || (art.commandIds || []).some((c) => norm(c) === nq)) score += 12;
  // Întrebarea naturală, formulată exact ca în searchTerms, câștigă categoric.
  if ((art.searchTerms || []).some((st) => norm(st) === nq)) score += 10;
  if (title.includes(nq)) score += 8;
  if ((art.keywords || []).some((k) => norm(k).includes(nq) || nq.includes(norm(k)))) score += 5;
  score += fuzzy(q, art.title) * 2;
  score += fuzzy(q, (art.keywords || []).join(' '));
  score += fuzzy(q, (art.synonyms || []).join(' ')) * 1.5;
  score += fuzzy(q, (art.searchTerms || []).join(' ')) * 1.5; // întrebări naturale
  score += fuzzy(q, art.summary) * 0.5;
  return { score };
}

// Căutare în articole; rezultate sortate, cu tip, dificultate și acțiune asociată (§4.4).
export function helpSearch(query, articles, { context = '', limit = 12 } = {}) {
  const q = String(query || '').trim();
  if (!q) return [];
  const out = [];
  for (const art of articles) {
    const { score } = scoreArticle(q, art);
    if (score <= 0.5) continue;
    // Context-aware (§4.3.G): articolul din zona deschisă urcă, fără să excludă restul.
    const boost = context && (art.uiComponentIds || []).includes(context) ? 3 : 0;
    out.push({
      id: art.id, title: art.title, summary: art.summary, category: art.category,
      contentType: art.contentType, difficulty: art.difficulty,
      commandIds: art.commandIds || [], score: score + boost,
    });
  }
  out.sort((a, b) => b.score - a.score);
  const results = out.slice(0, limit);
  // Sugestii de reformulare când rezultatele sunt slabe (§4.5) — fără rezultate inventate.
  const weak = results.length === 0 || results[0].score < 4;
  return { results, weak, intent: intentOf(q) };
}

// Clasificarea intenției (§5.4): întrebare/how-to vs nume de comandă.
export function intentOf(q) {
  const nq = ' ' + norm(q) + ' ';
  const learn = [' cum ', ' ce ', ' de ce ', ' unde ', ' când ', ' care ', ' explica', ' diferen'];
  if (learn.some((w) => nq.includes(w))) return 'learn';
  return 'run';
}

// Căutări conexe (§4.3.I): articole care împart keywords/comenzi cu articolul dat.
export function relatedArticles(art, articles, limit = 5) {
  const keys = new Set((art.keywords || []).map(norm));
  const cmds = new Set(art.commandIds || []);
  return articles
    .filter((a) => a.id !== art.id)
    .map((a) => ({
      a,
      s: (a.keywords || []).filter((k) => keys.has(norm(k))).length
        + (a.commandIds || []).filter((c) => cmds.has(c)).length * 2,
    }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s)
    .slice(0, limit)
    .map((x) => x.a);
}
