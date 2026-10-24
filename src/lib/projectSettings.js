// Pure helpers for the Project Settings dialog (no DOM). Every function returns a NEW
// project; inputs are never mutated.

export const NONE = 'Fără';
export const DEFAULT_LABEL_TITLE = 'Etichetă';
export const DEFAULT_STATUS_TITLE = 'Status';
export const FIELD_TYPES = ['text', 'checkbox', 'list', 'date'];

const clone = (x) => structuredClone(x);

/** Visit every node of a tree (nested children) and call fn(node). Mutates the given tree. */
export function walkTree(tree, fn) {
  for (const node of tree || []) {
    fn(node);
    if (Array.isArray(node.children)) walkTree(node.children, fn);
  }
}

/** Generate an id not present in `taken` (Set or array). */
export function uniqueId(prefix, taken) {
  const set = taken instanceof Set ? taken : new Set(taken || []);
  let i = 1;
  while (set.has(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}

/** Make `name` unique among `names` by appending " 2", " 3"... */
export function uniqueName(name, names) {
  const set = new Set(names);
  if (!set.has(name)) return name;
  let i = 2;
  while (set.has(`${name} ${i}`)) i++;
  return `${name} ${i}`;
}

function mapTree(project, fn) {
  const out = clone(project);
  walkTree(out.tree, fn);
  return out;
}

// ---- labels ----
export function renameLabel(project, oldName, newName) {
  if (oldName === NONE || !newName || oldName === newName) return clone(project);
  const out = mapTree(project, (n) => { if (n.label === oldName) n.label = newName; });
  out.labels = (out.labels || []).map((l) => (l.name === oldName ? { ...l, name: newName } : l));
  return out;
}
export function deleteLabel(project, name) {
  if (name === NONE) return clone(project);
  const out = mapTree(project, (n) => { if (n.label === name) n.label = NONE; });
  out.labels = (out.labels || []).filter((l) => l.name !== name);
  return out;
}

// ---- statuses ----
export function renameStatus(project, oldName, newName) {
  if (oldName === NONE || !newName || oldName === newName) return clone(project);
  const out = mapTree(project, (n) => { if (n.status === oldName) n.status = newName; });
  out.statuses = (out.statuses || []).map((s) => (s === oldName ? newName : s));
  return out;
}
export function deleteStatus(project, name) {
  if (name === NONE) return clone(project);
  const out = mapTree(project, (n) => { if (n.status === name) n.status = NONE; });
  out.statuses = (out.statuses || []).filter((s) => s !== name);
  return out;
}

// ---- custom fields (node.custom keyed by field title) ----
export function renameCustomField(project, oldTitle, newTitle) {
  if (!newTitle || oldTitle === newTitle) return clone(project);
  const out = mapTree(project, (n) => {
    if (n.custom && Object.prototype.hasOwnProperty.call(n.custom, oldTitle)) {
      n.custom[newTitle] = n.custom[oldTitle];
      delete n.custom[oldTitle];
    }
  });
  out.customFields = (out.customFields || []).map((f) => (f.title === oldTitle ? { ...f, title: newTitle } : f));
  return out;
}
export function deleteCustomField(project, title) {
  const out = mapTree(project, (n) => { if (n.custom) delete n.custom[title]; });
  out.customFields = (out.customFields || []).filter((f) => f.title !== title);
  return out;
}

// ---- section types (node.sectionType stores the title) ----
export function renameSectionType(project, oldTitle, newTitle) {
  if (!newTitle || oldTitle === newTitle) return clone(project);
  const out = mapTree(project, (n) => { if (n.sectionType === oldTitle) n.sectionType = newTitle; });
  out.sectionTypes = (out.sectionTypes || []).map((t) => (t.title === oldTitle ? { ...t, title: newTitle } : t));
  return out;
}
export function deleteSectionType(project, title) {
  const out = mapTree(project, (n) => { if (n.sectionType === title) delete n.sectionType; });
  const removed = (out.sectionTypes || []).filter((t) => t.title === title).map((t) => t.id);
  out.sectionTypes = (out.sectionTypes || []).filter((t) => t.title !== title);
  if (out.sectionTypeLevels) {
    for (const k of Object.keys(out.sectionTypeLevels)) if (removed.includes(out.sectionTypeLevels[k])) out.sectionTypeLevels[k] = null;
  }
  return out;
}

/**
 * Build the editable draft the dialog works on. Each list item remembers its original
 * name in `orig` (null for newly added items) so renames can be propagated on save.
 */
export function makeDraft(project) {
  const p = clone(project || {});
  const labels = (p.labels && p.labels.length ? p.labels : [{ name: NONE, color: '' }]).map((l) => ({ name: l.name, color: l.color || '', orig: l.name }));
  if (labels[0].name !== NONE) labels.unshift({ name: NONE, color: '', orig: null });
  const statusesRaw = p.statuses && p.statuses.length ? p.statuses : [NONE];
  const statuses = statusesRaw.map((s) => ({ name: s, orig: s }));
  if (statuses[0].name !== NONE) statuses.unshift({ name: NONE, orig: null });
  return {
    title: p.title || '',
    author: p.author || '',
    authorFirst: p.authorFirst || '',
    authorLast: p.authorLast || '',
    titleAbbreviation: p.titleAbbreviation || '',
    subtitle: p.subtitle || '',
    labelTitle: p.labelTitle || DEFAULT_LABEL_TITLE,
    statusTitle: p.statusTitle || DEFAULT_STATUS_TITLE,
    labels,
    statuses,
    customFields: (p.customFields || []).map((f) => ({
      id: f.id, title: f.title, type: FIELD_TYPES.includes(f.type) ? f.type : 'text',
      options: (f.options || []).map((o) => ({ ...o })), default: f.default ?? '', wraps: Boolean(f.wraps),
      ...Object.fromEntries(Object.entries(f).filter(([k]) => !['id', 'title', 'type', 'options', 'default', 'wraps'].includes(k))),
      orig: f.title,
    })),
    sectionTypes: (p.sectionTypes || []).map((t) => ({ id: t.id, title: t.title, orig: t.title })),
    sectionTypeLevels: { folders: null, containers: null, files: null, ...(p.sectionTypeLevels || {}) },
    templateFolder: p.templateFolder ?? null,
  };
}

/** Validate a draft; returns an array of Romanian error messages (empty = OK). */
export function validateDraft(d) {
  const errs = [];
  const dup = (arr, what) => {
    const seen = new Set();
    for (const x of arr) {
      const n = (x || '').trim();
      if (!n) errs.push(`${what}: numele nu poate fi gol.`);
      else if (seen.has(n)) errs.push(`${what}: numele „${n}” apare de mai multe ori.`);
      seen.add(n);
    }
  };
  dup(d.labels.map((l) => l.name), 'Etichete');
  dup(d.statuses.map((s) => s.name), 'Statusuri');
  dup(d.customFields.map((f) => f.title), 'Metadate');
  dup(d.sectionTypes.map((t) => t.title), 'Tipuri de secțiune');
  if (d.labels[0]?.name !== NONE) errs.push(`Prima etichetă trebuie să fie „${NONE}”.`);
  if (d.statuses[0]?.name !== NONE) errs.push(`Primul status trebuie să fie „${NONE}”.`);
  return errs;
}

/**
 * Apply a dialog draft to the project: deletes, renames (propagated into every binder
 * node), new order, and scalar settings. Returns a NEW project.
 */
export function applyProjectSettings(project, draft) {
  let p = clone(project);
  const d = clone(draft);
  // Protect 'Fără'
  d.labels = d.labels.map((l) => (l.orig === NONE ? { ...l, name: NONE } : l));
  d.statuses = d.statuses.map((s) => (s.orig === NONE ? { ...s, name: NONE } : s));
  if (!d.labels.some((l) => l.name === NONE)) d.labels.unshift({ name: NONE, color: '', orig: NONE });
  if (!d.statuses.some((s) => s.name === NONE)) d.statuses.unshift({ name: NONE, orig: NONE });
  d.labels = [...d.labels.filter((l) => l.name === NONE).slice(0, 1), ...d.labels.filter((l) => l.name !== NONE)];
  d.statuses = [...d.statuses.filter((s) => s.name === NONE).slice(0, 1), ...d.statuses.filter((s) => s.name !== NONE)];

  // Generic delete + rename via temporary unique tokens (handles swaps like A<->B).
  const propagate = (origList, items, del, ren, key = 'name') => {
    const kept = new Set(items.map((i) => i.orig).filter((o) => o != null));
    for (const o of origList) if (!kept.has(o) && o !== NONE) p = del(p, o);
    const renames = items.filter((i) => i.orig != null && i.orig !== i[key]);
    const tmp = renames.map((r, k) => `\u0000tmp${k}\u0000`);
    renames.forEach((r, k) => { p = ren(p, r.orig, tmp[k]); });
    renames.forEach((r, k) => { p = ren(p, tmp[k], r[key]); });
  };
  propagate((p.labels || []).map((l) => l.name), d.labels, deleteLabel, renameLabel);
  propagate(p.statuses || [], d.statuses, deleteStatus, renameStatus);
  propagate((p.customFields || []).map((f) => f.title), d.customFields, deleteCustomField, renameCustomField, 'title');
  propagate((p.sectionTypes || []).map((t) => t.title), d.sectionTypes, deleteSectionType, renameSectionType, 'title');

  p.labels = d.labels.map((l) => ({ name: l.name.trim(), color: l.color || '' }));
  p.statuses = d.statuses.map((s) => s.name.trim());
  const fieldIds = new Set(d.customFields.map((f) => f.id).filter(Boolean));
  p.customFields = d.customFields.map(({ orig, ...f }) => {
    const id = f.id || uniqueId('field', fieldIds);
    fieldIds.add(id);
    const out = { ...f, id, title: f.title.trim() };
    if (out.type === 'list') {
      const optIds = new Set((out.options || []).map((o) => o.id).filter(Boolean));
      out.options = (out.options || []).map((o) => { const oid = o.id || uniqueId('opt', optIds); optIds.add(oid); return { id: oid, title: o.title }; });
    } else out.options = [];
    if (out.type === 'checkbox') out.default = out.default === true || out.default === 'Yes' || out.default === 'true';
    return out;
  });
  const typeIds = new Set(d.sectionTypes.map((t) => t.id).filter(Boolean));
  p.sectionTypes = d.sectionTypes.map(({ orig, ...t }) => {
    const id = t.id || uniqueId('st', typeIds);
    typeIds.add(id);
    return { id, title: t.title.trim() };
  });
  const valid = new Set(p.sectionTypes.map((t) => t.id));
  const lv = d.sectionTypeLevels || {};
  p.sectionTypeLevels = Object.fromEntries(['folders', 'containers', 'files'].map((k) => [k, valid.has(lv[k]) ? lv[k] : null]));

  for (const k of ['title', 'subtitle', 'author', 'authorFirst', 'authorLast', 'titleAbbreviation']) p[k] = (d[k] ?? '').toString();
  p.labelTitle = (d.labelTitle || '').trim() || DEFAULT_LABEL_TITLE;
  p.statusTitle = (d.statusTitle || '').trim() || DEFAULT_STATUS_TITLE;
  p.templateFolder = d.templateFolder || null;
  return p;
}

/** Move item at index i by delta within arr (returns new array). Index 0 stays pinned if `pinFirst`. */
export function moveItem(arr, i, delta, pinFirst = false) {
  const j = i + delta;
  if (j < 0 || j >= arr.length) return arr;
  if (pinFirst && (i === 0 || j === 0)) return arr;
  const out = arr.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
