// Three-way merge of project.json (binder tree + project metadata).
//
// base   = the version both sides started from
// mine   = what this writer wants to save (the app window, a browser tab)
// theirs = what is on disk now (written meanwhile by an MCP agent, a sync client,
//          another tab)
//
// Rules: a field / placement / list order changed by only one side wins; when both
// changed the same thing, mine wins. A node deleted by one side stays deleted only if
// the other side did not touch it (no silent loss of edits). Nodes added by either
// side are kept. Pure, no dependencies: used by the Electron main process (project:save)
// and by the web build (src/lib/webApi.js).

const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);

function pick3(base, mine, theirs) {
  return same(mine, base) ? theirs : mine;
}

function index(tree) {
  const nodes = new Map(); // id -> { node, parent }
  const lists = new Map(); // parent id (null = top level) -> [ids]
  const visit = (list, parent) => {
    lists.set(parent, list.map((n) => n.id));
    for (const n of list) {
      nodes.set(n.id, { node: n, parent });
      if (Array.isArray(n.children)) visit(n.children, n.id);
    }
  };
  visit(Array.isArray(tree) ? tree : [], null);
  return { nodes, lists };
}

const fieldsOf = (n) => {
  const { children, ...rest } = n || {};
  return rest;
};

function mergeFields(b, m, t) {
  const out = {};
  for (const k of new Set([...Object.keys(m), ...Object.keys(t), ...Object.keys(b || {})])) { // b: absent when both sides added the node
    const v = b ? pick3(b[k], m[k], t[k]) : m[k] !== undefined ? m[k] : t[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export function mergeTree(baseTree, mineTree, theirsTree) {
  const B = index(baseTree);
  const M = index(mineTree);
  const T = index(theirsTree);
  const changed = (side, id) => {
    const b = B.nodes.get(id);
    const s = side.nodes.get(id);
    return !b || !s || !same(fieldsOf(b.node), fieldsOf(s.node)) || b.parent !== s.parent;
  };

  // 1. Which nodes survive, with merged fields and parent.
  const kept = new Map(); // id -> { fields, parent, hasChildren }
  for (const id of new Set([...M.nodes.keys(), ...T.nodes.keys()])) {
    const b = B.nodes.get(id);
    const m = M.nodes.get(id);
    const t = T.nodes.get(id);
    if (!m && b && !changed(T, id)) continue; // deleted here, untouched there
    if (!t && b && !changed(M, id)) continue; // deleted there, untouched here
    const fields = m && t ? mergeFields(b && fieldsOf(b.node), fieldsOf(m.node), fieldsOf(t.node)) : fieldsOf((m || t).node);
    let parent;
    if (m && t) parent = b && m.parent !== b.parent ? m.parent : t.parent;
    else parent = (m || t).parent;
    const hasChildren = [b, m, t].some((x) => x && Array.isArray(x.node.children));
    kept.set(id, { fields, parent, hasChildren });
  }
  // A parent that no longer exists: fall back to the other side's parent, then to the top.
  for (const [id, k] of kept) {
    if (k.parent === null || kept.has(k.parent)) continue;
    const alt = [T.nodes.get(id), M.nodes.get(id)].find((x) => x && (x.parent === null || kept.has(x.parent)));
    if (alt) {
      k.parent = alt.parent;
      continue;
    }
    // Its folder was deleted on the other side: the nearest folder above it that survives,
    // else the Draft, never the top level next to Draft and Trash.
    let up = k.parent;
    while (up && !kept.has(up)) up = B.nodes.get(up)?.parent;
    k.parent = up || [...kept].find(([, x]) => x.fields.root === 'draft')?.[0] || null;
  }

  // 2. Order of each child list.
  const members = new Map();
  for (const [id, k] of kept) {
    if (!members.has(k.parent)) members.set(k.parent, new Set());
    members.get(k.parent).add(id);
  }
  const orderOf = (parent) => {
    const set = members.get(parent) || new Set();
    const mineList = M.lists.get(parent) || [];
    const theirsList = T.lists.get(parent) || [];
    const mineMoved = !same(mineList, B.lists.get(parent) || []);
    const [primary, secondary] = mineMoved ? [mineList, theirsList] : [theirsList, mineList];
    const out = primary.filter((id) => set.has(id));
    const placeFrom = (list) => {
      list.forEach((id, i) => {
        if (!set.has(id) || out.includes(id)) return;
        let at = 0;
        for (let j = i - 1; j >= 0; j--) {
          const p = out.indexOf(list[j]);
          if (p >= 0) {
            at = p + 1;
            break;
          }
        }
        out.splice(at, 0, id);
      });
    };
    placeFrom(secondary);
    placeFrom([...set]);
    return out;
  };

  // 3. Rebuild; nodes caught in a move cycle (A into B here, B into A there) go to the first root.
  const placed = new Set();
  const build = (id) => {
    placed.add(id);
    const k = kept.get(id);
    const node = { ...k.fields };
    const kids = orderOf(id).filter((c) => !placed.has(c));
    if (k.hasChildren || kids.length) node.children = kids.map(build);
    return node;
  };
  const top = orderOf(null).map(build);
  const lost = [...kept.keys()].filter((id) => !placed.has(id));
  if (lost.length) {
    // When every node is in the cycle there is no root to host them: they go to the top level.
    for (const id of lost) {
      if (placed.has(id)) continue;
      const host = top.find((n) => n.children) || top[0];
      if (host) (host.children ||= []).push(build(id));
      else top.push(build(id));
    }
  }
  return top;
}

export function mergeProject(base, mine, theirs) {
  if (!base || !theirs) return mine;
  if (same(theirs, base)) return mine;
  if (same(mine, base)) return theirs;
  const out = {};
  for (const k of new Set([...Object.keys(mine), ...Object.keys(theirs)])) {
    if (k === 'tree') continue;
    const v = pick3(base[k], mine[k], theirs[k]);
    if (v !== undefined) out[k] = v;
  }
  out.tree = mergeTree(base.tree, mine.tree, theirs.tree);
  return out;
}
