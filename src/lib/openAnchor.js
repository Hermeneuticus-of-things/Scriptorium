// Ancorarea istoricului la deschiderea proiectului: câte cuvinte erau scrise la momentul
// deschiderii (draft = manuscrisul cu includeInCompile) și totalul tuturor documentelor
// (fără Coș). Pur — fără React, fără IPC — ca să fie testabil și apelabil amânat pe idle
// din App: pe cărți mari numărarea cuvintelor din toate documentele domina deschiderea
// (profilat cu CPU profiler: countWords + htmlToText ≈ 40% din stall).
import { flatten } from './tree.js';
import { wordCount } from './text.js';

export function sumWords(node, counts) {
  if (!node.includeInCompile && !node.root) return 0;
  let total = counts[node.id] || 0;
  for (const c of node.children || []) total += sumWords(c, counts);
  return total;
}

export function openAnchorCounts(manuscriptRoot, trashRoot, docs) {
  const counts = {};
  for (const [id, html] of Object.entries(docs || {})) counts[id] = wordCount(html);
  const draft = sumWords(manuscriptRoot, counts);
  const trash = new Set(flatten(trashRoot?.children || []).map((n) => n.id));
  let total = 0;
  for (const [id, c] of Object.entries(counts)) if (!trash.has(id)) total += c;
  return { draft, total, counts };
}
