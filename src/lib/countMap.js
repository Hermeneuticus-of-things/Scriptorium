// Numărătoarea de cuvinte per document pentru toată cartea, într-un singur trecere,
// cu cache per document (invalidat pe conținut). Pur — fără React, fără IPC.
// Consumată progresiv din App (pe idle la deschidere: pe cărți mari numărătoarea
// sincron domina deschiderea — profilat în ciclul 2).
import { wordCount } from './text.js';

export function countMap(docs, cache, wc = wordCount) {
  const map = {};
  for (const [id, html] of Object.entries(docs || {})) {
    const hit = cache?.get(id);
    if (hit && hit.html === html) {
      map[id] = hit.n;
    } else {
      map[id] = wc(html);
      cache?.set(id, { html, n: map[id] });
    }
  }
  return map;
}
