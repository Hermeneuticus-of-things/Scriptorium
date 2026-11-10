// Structura de teză academică (directivă autor 2026-11-10, ca în Scrivener 3):
// FrontMatter / Body / BackMatter; niveluri structurale Partea → Capitolul → Subcapitolul →
// Secțiunea → Subsecțiunea (max 4 recomandat; mai adânc = paragraf/alineat/punct, conținut);
// numerotarea SE DERIVEAZĂ din poziție; paginile NU sunt noduri (se generează la layout);
// cuprinsul se generează din arbore; anexele au numerotare separată.
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const flat = (ns, out = []) => { for (const n of ns || []) { out.push(n); flat(n.children, out); } return out; };
const isFolder = (n) => n.type === 'folder' || (!n.type && n.children);

// Body-ul poate veni ca nod-singur (wrapper) sau direct ca listă de copii — ambele acceptate.
const unwrapBody = (tree) =>
  (Array.isArray(tree) && tree.length === 1 && isFolder(tree[0]) && /^body$/i.test(tree[0].title || '')) ? tree[0].children : tree;

/** Numerotarea derivată din poziție: rolul vine din titlu (Partea/Capitolul/Subcapitolul/
 * Secțiunea/Subsecțiunea), cifrele din poziție; secțiunile fără rol (Introducere, Concluzii,
 * elementele din FrontMatter/BackMatter) rămân fără etichetă. Capitolele continuă între părți. */
function numberingOf(tree) {
  const out = [];
  const ctx = { part: 0, chap: 0, sub: 0, sec: 0, ssec: 0 };
  const walk = (ns) => {
    for (const n of ns || []) {
      if (!isFolder(n)) { out.push({ id: n.id, title: n.title, label: '' }); continue; }
      const t = String(n.title || '');
      let label = '';
      if (/^parte/i.test(t)) { ctx.part += 1; label = 'Partea ' + (ROMAN[ctx.part - 1] || ctx.part); }
      else if (/^capitol/i.test(t)) { ctx.chap += 1; ctx.sub = 0; ctx.sec = 0; ctx.ssec = 0; label = 'Capitolul ' + ctx.chap; }
      else if (/^subcapitol/i.test(t)) { ctx.sub += 1; ctx.sec = 0; ctx.ssec = 0; label = 'Subcapitolul ' + ctx.chap + '.' + ctx.sub; }
      else if (/^sec[ițt]iune/i.test(t)) { ctx.sec += 1; ctx.ssec = 0; label = 'Secțiunea ' + ctx.chap + '.' + ctx.sub + '.' + ctx.sec; }
      else if (/^subsec[ițt]iune/i.test(t)) { ctx.ssec += 1; label = 'Subsecțiunea ' + ctx.chap + '.' + ctx.sub + '.' + ctx.sec + '.' + ctx.ssec; }
      out.push({ id: n.id, title: n.title, label });
      walk(n.children);
    }
  };
  walk(unwrapBody(tree));
  return out;
}

/** Anexele au numerotare separată: Anexa 1, Anexa 2 … (sub folderul Anexe). */
function annexNumbering(tree) {
  const anexe = flat(unwrapBody(tree)).find((n) => isFolder(n) && /^anexe/i.test(n.title));
  const out = [];
  let i = 0;
  for (const c of anexe?.children || []) out.push({ id: c.id, title: c.title, label: 'Anexa ' + (++i) });
  return out;
}

/** Validarea structurală (regulile din specificație). */
function validateThesis(tree) {
  const issues = [];
  const seen = new Set();
  const body = unwrapBody(tree);
  const all = flat(tree);
  for (const n of all) {
    // Nodurile din șabloane nu au id încă (se atribuie la creare) — duplicatul se verifică doar cu id.
    if (n.id) {
      if (seen.has(n.id)) issues.push('Nod duplicat (ciclul/parinte dublu): ' + (n.title || n.id));
      seen.add(n.id);
    }
    if (!String(n.title || '').trim()) issues.push('Titlu gol: ' + n.id);
  }
  // Fără numerotare duplicată (etichetele derivate din poziție trebuie să fie unice).
  const counts = new Map();
  for (const { label, id } of numberingOf(body)) {
    if (!label) continue;
    counts.set(label, (counts.get(label) || 0) + 1);
    if (counts.get(label) > 1) issues.push('Numerotare duplicată: ' + label + ' (' + id + ')');
  }
  // Adâncime recomandată: max 4 niveluri structurale sub Body (peste — paragraf/alineat/punct).
  // Partea e grupare opțională — NU se numără la adâncimea structurală (Capitolul=1 … Subsecțiunea=4).
  const depth = (ns, dd = 0) => {
    let m = dd;
    for (const n of ns || []) {
      const next = isFolder(n) ? (/^parte/i.test(n.title || '') ? dd : dd + 1) : dd;
      m = Math.max(m, isFolder(n) ? depth(n.children, next) : dd);
    }
    return m;
  };
  const d = depth(body);
  if (d > 4) issues.push('Adâncime peste 4 niveluri structurale: ' + d + ' (folosește paragraf/alineat/punct).');
  // Paginile nu sunt noduri ale arborelui (se generează la layout).
  if (all.some((n) => /^pagina\s/i.test(n.title || '') && isFolder(n))) issues.push('Pagina nu e nod structural — se generează la layout.');
  // Referințele (wiki-linkuri) trebuie rezolvabile către noduri existente.
  for (const n of all) {
    for (const m of String(n.title || '').matchAll(/\[\[([^\]]+)\]\]/g)) {
      const target = all.find((x) => x.title === m[1]);
      if (!target) issues.push('Referință nerezolvabilă în „' + n.title + '": [[' + m[1] + ']]');
    }
  }
  return issues;
}

/** Cuprinsul se generează din arbore (nu manual) — liniile de cuprins cu eticheta derivată. */
function tocFromStructure(tree) {
  return numberingOf(tree).filter((x) => x.label).map((x) => ({ id: x.id, label: x.label, title: x.title }));
}

module.exports = { validateThesis, numberingOf, annexNumbering, tocFromStructure, isFolder, unwrapBody };
