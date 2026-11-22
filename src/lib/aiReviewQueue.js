// Coada de revizuire editorială (PLAN-AI-DEDICAT Etapa 2, principii A2UI — varianta 1:
// principii + componente native, fără framework-ul A2UI/TS). Transformă rezultatul monolitic
// al unei corecturi/revizuiri AI în CARDURI PER SCHIMBARE, cu Accept/Respinge individual;
// aplicarea subsetului acceptat = o singură scriere + snapshot (protecțiile existente rămân).
//
// Principii A2UI aplicate: rezultate structurate pe componente potrivite conținutului; actions
// explicite cu rezultat verificabil; data binding prin stare (acceptedSet) — fără dubluri;
// securitate: cardurile sunt componente proprii React, modelul nu generează HTML/JS.
// Fallback: dacă segmentarea nu e posibilă, întoarce null → panoul arată diff-ul monolitic.

import { diffParts } from './aiSession.js';

/**
 * Segmentează un diff word-level în schimbări individuale.
 * Întoarce { changes: [{i, removed, added, before, after}], parts } sau null dacă nu se poate
 * segmenta (nu există schimbări, sau textul de plecare lipsește).
 * `before` e textul original, `result` textul propus de AI.
 */
export function diffSegments(before, result) {
  const parts = diffParts(before, result);
  if (!parts.length) return null;
  const changes = [];
  let cur = null; // {removed, added} acumulate din perechi adiacente
  let beforeBuf = '';
  let afterBuf = '';
  const flush = () => {
    if (cur && beforeBuf.trim() && afterBuf.trim()) {
      changes.push({ i: changes.length, removed: beforeBuf.trim(), added: afterBuf.trim(), before: beforeBuf, after: afterBuf });
    }
    cur = null; beforeBuf = ''; afterBuf = '';
  };
  for (const p of parts) {
    if (p.removed) { cur = cur || {}; beforeBuf += p.value; }
    else if (p.added) { cur = cur || {}; afterBuf += p.value; }
    else { flush(); }
  }
  flush();
  if (!changes.length) return null;
  return { changes, parts };
}

/**
 * Textul rezultat din aplicarea SUBSETULUI de schimbări acceptate.
 * Merge pe părțile diff-ului: pentru schimbarea k, dacă e acceptată scoate `after`, altfel
 * păstrează `before` (textul original rămâne neatins acolo unde nu ai acceptat).
 */
export function applySubset(before, result, acceptedSet) {
  const parts = diffParts(before, result);
  if (!parts.length) return before;
  // numerotarea schimbărilor trebuie să fie IDENTICA cu cea din diffSegments
  const seg = diffSegments(before, result);
  if (!seg) return before;
  const acceptedIdx = new Set(seg.changes.filter((c) => acceptedSet.has(c.i)).map((c) => c.i));
  let k = -1;
  let out = '';
  let inChange = false;
  const changeIdx = () => k;
  for (const p of parts) {
    if (p.removed || p.added) {
      if (!inChange) { k += 1; inChange = true; }
      if (acceptedIdx.has(k)) { if (p.added) out += p.value; /* removed: sărit */ }
      else if (p.removed) out += p.value; // neschimbat: păstrează originalul
    } else {
      inChange = false;
      out += p.value;
    }
  }
  return out;
}

/** Numără schimbările pentru etichete. */
export const countChanges = (before, result) => {
  const seg = diffSegments(before, result);
  return seg ? seg.changes.length : 0;
};

/** Fragment de context pentru card: vecinătățile schimbării din textul original. */
export function changeContext(before, removed, width = 40) {
  const i = before.indexOf(removed);
  if (i < 0) return { lead: '', trail: '' };
  const lead = before.slice(Math.max(0, i - width), i).trimStart();
  const trail = before.slice(i + removed.length, i + removed.length + width).trimEnd();
  return { lead: (lead ? '…' : '') + lead, trail: trail + (trail ? '…' : '') };
}

/**
 * Etapa 3 (PLAN-AI-DEDICAT): constatări individuale din rezultatele de tip „read"
 * (Critica/Consistența/analize). Parsare tolerantă: linii cu numerotare („1.", „1)"),
 * buline („•", „-"), coduri de regulă („R5", „R11:") sau „Probleme în …". Fallback: null
 * dacă nu se disting cel puțin 2 constatări (textul rămâne afișat ca analysis obișnuit).
 */
export function parseFindings(text) {
  const lines = String(text || '').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return null;
  const starts = /^(?:\d{1,2}[.))]\s+|[-•*]\s+|(?:R\d{1,2}|NANO|MICRO|MEZZO|MACRO|MAHA)[^a-zăâîșț]*[A-ZĂÂÎȘȚ„])/i;
  const items = [];
  for (const l of lines) {
    if (starts.test(l.trim())) items.push(l.trim());
    else if (items.length) items[items.length - 1] += ' ' + l.trim();
  }
  if (items.length < 2) return null;
  return items.map((t, i) => {
    const title = t.slice(0, 90);
    return { i, title, text: t };
  });
}
