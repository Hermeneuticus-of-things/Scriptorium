// Existing bibliography + imported entries: same key → replaced by the newer one, order kept.
// Shared by the window (Zotero import) and lib/zotero.cjs.
export function mergeBibliography(existing, incoming) {
  const out = [...(existing || [])];
  const at = new Map(out.map((e, i) => [e.key, i]));
  for (const e of incoming || []) {
    if (at.has(e.key)) out[at.get(e.key)] = e;
    else {
      at.set(e.key, out.length);
      out.push(e);
    }
  }
  return out;
}
