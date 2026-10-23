// Canonical index `Index_de_Lucru`: the book's macro skeleton (nodes N.N.N … N.N.N.N.N)
// with type, weight and dependencies. Pure module (no DOM, no Node APIs).
//
// FORMAT (one node per line or per table row, inside a binder document titled
// "Index_de_Lucru"; headings and other lines are ignored):
//
//   2.3.1 | Titlul nodului | tip | greutate | dep: 2.1, 2.3
//   | 2.3.1 | Titlul nodului | tip | greutate | 2.1, 2.3 |        (tabel Markdown / HTML)
//
//   - id:        numere separate prin punct, 1 până la 5 niveluri (Cap. N = „N”)
//   - titlu:     obligatoriu
//   - tip:       liber (ex. definiție, mecanism, exemplu, sinteză, ilustrație); implicit „—”
//   - greutate:  număr 1–10 (densitate CxCo); implicit 0 = nespecificat
//   - dep:       id-uri separate prin virgulă; prefixul „dep:” e opțional
//
// Coloanele 3–5 sunt opționale. Rândul de antet al unui tabel („Nod | Titlu | …”) și
// rândurile separator „|---|” sunt ignorate.

const ID_RE = /^\d+(?:\.\d+){0,4}$/;

function decode(s) {
  return String(s)
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

// HTML (TipTap) or plain text -> lines; table rows become "a | b | c".
export function indexLines(source) {
  const s = String(source || '');
  if (!/<[a-z][^>]*>/i.test(s)) return s.split(/\r?\n/);
  const rows = s
    .replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (a, inner) => `\n${[...inner.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => c[1].replace(/<[^>]+>/g, '').trim()).join(' | ')}\n`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|li|div|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decode(rows).split('\n');
}

export function parseCanonIndex(source) {
  const nodes = [];
  const errors = [];
  indexLines(source).forEach((raw, lineNo) => {
    const line = raw.trim().replace(/^\|/, '').replace(/\|$/, '').trim();
    if (!line || /^[-:|\s]+$/.test(line)) return;
    const cells = line.split('|').map((c) => c.trim());
    const id = cells[0].replace(/\.$/, '');
    if (!ID_RE.test(id)) return; // header or free text
    if (!cells[1]) {
      errors.push({ line: lineNo + 1, id, message: `Nodul ${id} nu are titlu` });
      return;
    }
    const weight = Number(String(cells[3] || '').replace(',', '.'));
    const deps = String(cells[4] || '')
      .replace(/^dep(endențe|endente)?\s*:?/i, '')
      .split(/[,;\s]+/)
      .map((d) => d.replace(/\.$/, ''))
      .filter((d) => ID_RE.test(d));
    nodes.push({ id, title: cells[1], type: cells[2] || '—', weight: Number.isFinite(weight) ? weight : 0, deps, level: id.split('.').length, line: lineNo + 1 });
  });
  return { nodes, errors };
}

export function parentId(id) {
  const parts = id.split('.');
  return parts.length > 1 ? parts.slice(0, -1).join('.') : null;
}

const cmpId = (a, b) => {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? -1) !== (y[i] ?? -1)) return (x[i] ?? -1) - (y[i] ?? -1);
  }
  return 0;
};
export const compareIds = cmpId;

/**
 * validateCanonIndex(nodes) -> problems[] {severity, id, message}
 * duplicates, missing dependencies, self dependency, cycles, missing parents,
 * weight outside 0–10, order (a node listed before its predecessor).
 */
export function validateCanonIndex(nodes) {
  const out = [];
  const byId = new Map();
  for (const n of nodes) {
    if (byId.has(n.id)) out.push({ severity: 'GRAVE', id: n.id, message: `Nod duplicat ${n.id}` });
    byId.set(n.id, n);
  }
  for (const n of nodes) {
    for (const d of n.deps) {
      if (d === n.id) out.push({ severity: 'GRAVE', id: n.id, message: `${n.id} depinde de el însuși` });
      else if (!byId.has(d)) out.push({ severity: 'GRAVE', id: n.id, message: `${n.id} depinde de ${d}, care lipsește din index` });
    }
    const p = parentId(n.id);
    if (p && !byId.has(p) && p.includes('.')) out.push({ severity: 'MEDIU', id: n.id, message: `${n.id} nu are nodul părinte ${p}` });
    if (n.weight < 0 || n.weight > 10) out.push({ severity: 'MINOR', id: n.id, message: `${n.id}: greutatea ${n.weight} e în afara intervalului 0–10` });
  }
  for (let i = 1; i < nodes.length; i++) {
    if (cmpId(nodes[i - 1].id, nodes[i].id) > 0) out.push({ severity: 'MINOR', id: nodes[i].id, message: `${nodes[i].id} apare după ${nodes[i - 1].id} (ordine necanonică)` });
  }
  // cycles (DFS, white/grey/black)
  const state = new Map();
  const reported = new Set();
  const visit = (id, stack) => {
    state.set(id, 1);
    stack.push(id);
    for (const d of byId.get(id)?.deps || []) {
      if (!byId.has(d) || d === id) continue;
      if (state.get(d) === 1) {
        const cyc = [...stack.slice(stack.indexOf(d)), d];
        const key = [...cyc].sort().join(',');
        if (!reported.has(key)) {
          reported.add(key);
          out.push({ severity: 'GRAVE', id: d, message: `Dependență circulară: ${cyc.join(' → ')}` });
        }
      } else if (!state.get(d)) visit(d, stack);
    }
    stack.pop();
    state.set(id, 2);
  };
  for (const n of nodes) if (!state.get(n.id)) visit(n.id, []);
  return out;
}

export function createNode(nodes, { id, parent, title, type = '—', weight = 0, deps = [] }) {
  let nid = id;
  if (!nid) {
    const kids = nodes.filter((n) => parentId(n.id) === (parent || null) && (parent || n.level === 1));
    const last = kids.map((n) => Number(n.id.split('.').pop())).reduce((a, b) => Math.max(a, b), 0);
    nid = parent ? `${parent}.${last + 1}` : String(last + 1);
  }
  if (!ID_RE.test(nid)) throw new Error(`Id de nod invalid: ${nid}`);
  if (nodes.some((n) => n.id === nid)) throw new Error(`Nodul ${nid} există deja`);
  const node = { id: nid, title: title || 'Nod nou', type, weight: Number(weight) || 0, deps: [...deps], level: nid.split('.').length };
  return [...nodes, node].sort((a, b) => cmpId(a.id, b.id));
}

export function serializeCanonIndex(nodes, { html = false } = {}) {
  const sorted = [...nodes].sort((a, b) => cmpId(a.id, b.id));
  if (!html) {
    return ['| Nod | Titlu | Tip | Greutate | Dependențe |', '|---|---|---|---|---|', ...sorted.map((n) => `| ${n.id} | ${n.title} | ${n.type} | ${n.weight || ''} | ${n.deps.join(', ')} |`)].join('\n');
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<table><tbody><tr><th><p>Nod</p></th><th><p>Titlu</p></th><th><p>Tip</p></th><th><p>Greutate</p></th><th><p>Dependențe</p></th></tr>${sorted
    .map((n) => `<tr><td><p>${n.id}</p></td><td><p>${esc(n.title)}</p></td><td><p>${esc(n.type)}</p></td><td><p>${n.weight || ''}</p></td><td><p>${n.deps.join(', ')}</p></td></tr>`)
    .join('')}</tbody></table>`;
}

// "Sub 2.3" / "2.3.1 Titlu" / "Cap 2" / "Cap. 2 / Secț. 1 / Subcap. 2.3" -> "2.3.1" | "2" | null
export function nodeIdFromTitle(title) {
  const t = String(title || '');
  const sub = /Subcap\.?\s*(\d+(?:\.\d+){1,4})/i.exec(t) || /(?:^|[\s/])Sub\s*(\d+(?:\.\d+){1,4})/i.exec(t) || /(?:^|[\s/\]])(\d+(?:\.\d+){1,4})(?![\d.]*\d)/.exec(t);
  if (sub) return sub[1];
  const cap = /Cap\.?\s*(\d+)/i.exec(t);
  return cap ? cap[1] : null;
}

export function findCanonDoc(tree, title = 'Index_de_Lucru') {
  const want = title.toLocaleLowerCase('ro').replace(/[\s_]+/g, '');
  let hit = null;
  const walk = (ns) => {
    for (const n of ns || []) {
      if (hit) return;
      if (n.root !== 'trash' && String(n.title || '').toLocaleLowerCase('ro').replace(/\.md$/, '').replace(/[\s_]+/g, '') === want) hit = n;
      else walk(n.children);
    }
  };
  walk(tree);
  return hit;
}

const line = (n) => `${n.id} ${n.title}${n.type && n.type !== '—' ? ` [${n.type}]` : ''}${n.weight ? ` · greutate ${n.weight}` : ''}${n.deps.length ? ` · dep. ${n.deps.join(', ')}` : ''}`;

/**
 * Context for editorial rounds.
 *   R1 (completitudine): the node, its whole subtree (what must be covered) and dependencies (what is assumed known).
 *   R6 (anti-redundanță macro): the nodes outside this subtree, which own their own content and must not be repeated.
 * Returns '' when the node is unknown.
 */
export function canonContext(nodes, nodeId, roundId) {
  if (!nodes || !nodes.length || !nodeId) return '';
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return '';
  const inside = (n) => n.id === nodeId || n.id.startsWith(`${nodeId}.`);
  if (roundId === 'R1') {
    const sub = nodes.filter(inside);
    const deps = node.deps.map((d) => nodes.find((n) => n.id === d)).filter(Boolean);
    return [
      `Nodul curent din Index_de_Lucru și conținutul obligatoriu (nimic omis, nimic din alte noduri):`,
      ...sub.map((n) => `${'  '.repeat(n.level - node.level)}${line(n)}`),
      deps.length ? `Presupuse deja tratate (dependențe, nu se reiau):\n${deps.map(line).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (roundId === 'R6') {
    const chapter = nodeId.split('.')[0];
    const others = nodes.filter((n) => !inside(n) && n.id !== parentId(nodeId) && (n.id.split('.')[0] === chapter ? n.level <= node.level + 1 : n.level <= 2));
    return `Noduri care își au propriul loc în Index_de_Lucru (conținutul lor nu se repetă aici):\n${others.map(line).join('\n')}`;
  }
  return '';
}
