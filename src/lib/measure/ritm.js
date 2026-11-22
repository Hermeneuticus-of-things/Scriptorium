// Măsură, nu generare: distribuția ritmului unui text (port fidel din write-for-me/scripts/ritm.py).
// Semnale, nu respingeri: un text tehnic poate avea multe fraze lungi, unul publicitar multe scurte.
// Rezultatele apar în panoul de semnale (măsură), niciodată în chat-ul AI.

const SPLIT_FR = /(?<=[.!?…])\s+(?=[„"'A-ZĂÂÎȘȚ0-9])/;
const CUV = /[A-Za-zĂÂÎȘȚăâîșț0-9_]+(?:[-’'][A-Za-zĂÂÎȘȚăâîșț0-9_]+)*/g;

export function analiza(text) {
  const paras = String(text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('#'));
  const sents = []; // {nr cuvinte, index paragraf}
  paras.forEach((p, i) => {
    for (const s of p.split(SPLIT_FR)) {
      const n = (s.match(CUV) || []).length;
      if (n) sents.push([n, i]);
    }
  });
  const out = [];
  const N = sents.length;
  if (!N) return ['Text gol.'];
  const w = sents.map(([n]) => n);
  const medie = w.reduce((a, b) => a + b, 0) / N;
  out.push(`Fraze: ${N} · medie ${medie.toFixed(1)} cuvinte/frază`);
  const bins = [['1-5', 1, 5], ['6-10', 6, 10], ['11-18', 11, 18], ['19-28', 19, 28], ['29+', 29, Infinity]];
  out.push('Distribuție: ' + bins.map(([b, lo, hi]) => `${b} ${Math.round((100 * w.filter((x) => x >= lo && x <= hi).length) / N)}%`).join(' · '));
  if ((100 * w.filter((x) => x >= 25).length) / N > 25) out.push('SEMNAL: peste 25% fraze de 25+ cuvinte (densitate mare)');
  if ((100 * w.filter((x) => x < 10).length) / N > 35) out.push('SEMNAL: peste 35% fraze sub 10 cuvinte (fragmentare)');
  let run = 1;
  for (let k = 1; k < N; k++) {
    run = Math.abs(w[k] - w[k - 1]) <= 2 ? run + 1 : 1;
    if (run === 4) out.push(`SEMNAL: 4 fraze consecutive de lungime similară, de la fraza ${k - 2}`);
  }
  w.forEach((x, k) => {
    if (x > 45) out.push(`REVIZUIEȘTE: fraza ${k + 1} are ${x} cuvinte`);
    else if (x > 35) out.push(`VERIFICĂ: fraza ${k + 1} are ${x} cuvinte (poate fi împărțită?)`);
  });
  paras.forEach((p, i) => {
    const c = p.split(/\s+/).length;
    if (c > 120) out.push(`SEMNAL: paragraful ${i + 1} are ${c} cuvinte (două idei?)`);
  });
  return out;
}
