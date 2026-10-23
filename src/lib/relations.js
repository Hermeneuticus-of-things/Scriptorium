// Relationship map (Hartă de relații): co-occurrence of character names across scenes,
// laid out with a deterministic force-directed algorithm. Pure module.
import { sceneNodes, scenePlain } from './scenes.js';
import { ROMANIAN_STOPWORDS } from './stats.js';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Capitalized words not at sentence start, seen in >= minCount documents. */
export function guessNames(texts, { minDocs = 2, limit = 40 } = {}) {
  const docCount = new Map();
  const lowerSeen = new Set();
  for (const t of texts) {
    const seen = new Set();
    const re = /(^|[.!?…„"«]\s*|\n\s*)?(\p{Lu}[\p{Ll}]{2,})/gu;
    let m;
    while ((m = re.exec(t))) {
      if (m[1] !== undefined) continue; // sentence start: ambiguous
      seen.add(m[2]);
    }
    for (const w of t.match(/\b\p{Ll}[\p{L}]{2,}/gu) || []) lowerSeen.add(w);
    for (const w of seen) docCount.set(w, (docCount.get(w) || 0) + 1);
  }
  return [...docCount.entries()]
    .filter(([w, c]) => c >= minDocs && !lowerSeen.has(w.toLocaleLowerCase('ro-RO')) && !ROMANIAN_STOPWORDS.has(w.toLocaleLowerCase('ro-RO')))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ro'))
    .slice(0, limit)
    .map(([w]) => w);
}

/** Character list from project.characters (strings or {name, aliases}) or the Characters binder folder. */
export function projectCharacters(project) {
  const list = project?.characters;
  if (Array.isArray(list) && list.length) {
    return list.map((c) => (typeof c === 'string' ? { name: c, aliases: [] } : { name: c.name, aliases: c.aliases || [] })).filter((c) => c.name);
  }
  const out = [];
  const walk = (nodes, inChars) => {
    for (const n of nodes || []) {
      const isChars = /^(personaje|characters)$/i.test(String(n.title || '').trim());
      // Character sheets: anything inside a "Personaje" folder, or a document titled "Personaj: Nume".
      const prefixed = /^(?:personaj|character)\s*:\s*(.+)$/i.exec(String(n.title || '').trim());
      if (prefixed) out.push({ name: prefixed[1].trim(), aliases: [] });
      else if (inChars && n.type !== 'folder' && !n.children?.length) out.push({ name: n.title, aliases: [] });
      walk(n.children, inChars || isChars);
    }
  };
  walk(project?.tree, false);
  return out;
}

function nameRegex(c) {
  const base = [c.name, ...(c.aliases || [])].filter(Boolean);
  // Romanian inflection: "Ion" -> "Ionului"; "Ana" -> "Anei", "Maria" -> "Mariei".
  const forms = base.flatMap((f) => (/a$/.test(f) && f.length > 2 ? [esc(f), `${esc(f.slice(0, -1))}ei`] : [`${esc(f)}(?:ului|ul|ei|ii)?`]));
  return new RegExp(`(?<![\\p{L}])(?:${forms.join('|')})(?![\\p{L}])`, 'u');
}

/**
 * @returns {{nodes:{id,name,scenes:number}[], edges:{a,b,weight,scenes:string[]}[], scenesByName:Record<string,string[]>}}
 */
export function buildRelations(project, docs, { characters, minWeight = 1, scope = 'draft' } = {}) {
  const scenes = sceneNodes(project, { scope }).map(({ node }) => ({ id: node.id, title: node.title, text: scenePlain(docs, node.id) }));
  let chars = characters || projectCharacters(project);
  if (!chars.length) chars = guessNames(scenes.map((s) => s.text)).map((name) => ({ name, aliases: [] }));
  const regs = chars.map((c) => [c.name, nameRegex(c)]);
  const scenesByName = {};
  const pair = new Map();
  for (const s of scenes) {
    const present = regs.filter(([, re]) => re.test(s.text)).map(([n]) => n);
    for (const n of present) (scenesByName[n] ||= []).push(s.id);
    for (let i = 0; i < present.length; i++) {
      for (let j = i + 1; j < present.length; j++) {
        const [a, b] = [present[i], present[j]].sort();
        const k = `${a}\u0000${b}`;
        if (!pair.has(k)) pair.set(k, { a, b, weight: 0, scenes: [] });
        const e = pair.get(k);
        e.weight++;
        e.scenes.push(s.id);
      }
    }
  }
  const nodes = chars.filter((c) => scenesByName[c.name]).map((c) => ({ id: c.name, name: c.name, scenes: scenesByName[c.name].length }));
  const edges = [...pair.values()].filter((e) => e.weight >= minWeight).sort((x, y) => y.weight - x.weight);
  return { nodes, edges, scenesByName };
}

/**
 * Deterministic Fruchterman-Reingold layout (initial positions on a circle, no randomness).
 * @returns {Record<string,{x:number,y:number}>}
 */
export function forceLayout(nodes, edges, { width = 800, height = 600, iterations = 300 } = {}) {
  const n = nodes.length;
  const pos = {};
  if (!n) return pos;
  const cx = width / 2;
  const cy = height / 2;
  const r0 = Math.min(width, height) * 0.35;
  nodes.forEach((nd, i) => {
    const a = (2 * Math.PI * i) / n;
    pos[nd.id] = { x: cx + r0 * Math.cos(a), y: cy + r0 * Math.sin(a) };
  });
  if (n === 1) return { [nodes[0].id]: { x: cx, y: cy } };
  const k = Math.sqrt((width * height) / n) * 0.6;
  const maxW = Math.max(1, ...edges.map((e) => e.weight));
  let temp = width / 8;
  for (let it = 0; it < iterations; it++) {
    const disp = Object.fromEntries(nodes.map((nd) => [nd.id, { x: 0, y: 0 }]));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const p = pos[nodes[i].id];
        const q = pos[nodes[j].id];
        let dx = p.x - q.x;
        let dy = p.y - q.y;
        let d = Math.hypot(dx, dy);
        if (d < 0.01) { dx = 0.01 * (i + 1); dy = 0.01 * (j + 1); d = Math.hypot(dx, dy); }
        const f = (k * k) / d;
        disp[nodes[i].id].x += (dx / d) * f; disp[nodes[i].id].y += (dy / d) * f;
        disp[nodes[j].id].x -= (dx / d) * f; disp[nodes[j].id].y -= (dy / d) * f;
      }
    }
    for (const e of edges) {
      const p = pos[e.a];
      const q = pos[e.b];
      if (!p || !q) continue;
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const d = Math.max(0.01, Math.hypot(dx, dy));
      const f = ((d * d) / k) * (0.5 + e.weight / maxW);
      disp[e.a].x -= (dx / d) * f; disp[e.a].y -= (dy / d) * f;
      disp[e.b].x += (dx / d) * f; disp[e.b].y += (dy / d) * f;
    }
    for (const nd of nodes) {
      const p = pos[nd.id];
      const dv = disp[nd.id];
      // gentle gravity keeps disconnected nodes on screen
      dv.x += (cx - p.x) * 0.05 * k / 100; dv.y += (cy - p.y) * 0.05 * k / 100;
      const d = Math.max(0.01, Math.hypot(dv.x, dv.y));
      p.x = Math.min(width - 30, Math.max(30, p.x + (dv.x / d) * Math.min(d, temp)));
      p.y = Math.min(height - 20, Math.max(20, p.y + (dv.y / d) * Math.min(d, temp)));
    }
    temp = Math.max(0.5, temp * 0.98);
  }
  for (const id of Object.keys(pos)) pos[id] = { x: Math.round(pos[id].x * 10) / 10, y: Math.round(pos[id].y * 10) / 10 };
  return pos;
}
