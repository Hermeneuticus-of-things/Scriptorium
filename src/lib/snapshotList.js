// Snapshot list helpers for the Inspector pane and the Snapshots Manager (pure, unit-tested).

// Sorts snapshots by 'date' or 'name'; newest first is the default.
export function sortSnapshots(list, key = 'date', dir = 'desc') {
  const sign = dir === 'asc' ? 1 : -1;
  const val = (s) => (key === 'name' ? String(s.name || '') : Date.parse(s.date) || 0);
  return [...(list || [])].sort((a, b) => {
    const x = val(a);
    const y = val(b);
    const c = key === 'name' ? x.localeCompare(y, undefined, { sensitivity: 'base', numeric: true }) : x - y;
    return c ? c * sign : String(a.file).localeCompare(String(b.file)) * sign;
  });
}

// Clicking a column header: same column flips the direction, another column starts at its natural order.
export function toggleSort(current, key) {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: key === 'date' ? 'desc' : 'asc' };
}

// Selection with Ctrl+click: at most two snapshots (the pair being compared).
export function selectSnapshot(selected, file, additive) {
  if (!additive) return [file];
  if (selected.includes(file)) return selected.filter((f) => f !== file);
  return [...selected, file].slice(-2);
}

// Indices (in the diff parts) where a change starts; an adjacent removed+added pair is one change.
export function changeStarts(parts) {
  const out = [];
  (parts || []).forEach((p, i) => {
    if (!(p.added || p.removed)) return;
    const prev = parts[i - 1];
    if (prev && (prev.added || prev.removed)) return;
    out.push(i);
  });
  return out;
}

// Next / previous change from the current one (-1 = none yet), wrapping around.
export function stepChange(count, current, delta) {
  if (!count) return -1;
  if (current < 0) return delta > 0 ? 0 : count - 1;
  return (((current + delta) % count) + count) % count;
}

// Documents with snapshots for the manager: [{id, title, count, last}], newest activity first.
export function documentsWithSnapshots(nodes, counts) {
  const out = [];
  const walk = (list) => {
    for (const n of list || []) {
      const c = counts && counts[n.id];
      if (c && c.count) out.push({ id: n.id, title: n.title, count: c.count, last: c.last || null });
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return out.sort((a, b) => (Date.parse(b.last) || 0) - (Date.parse(a.last) || 0));
}
