// Pure helpers for the Project Settings dialog (no DOM). Every function returns a NEW
// project; inputs are never mutated.
import { getLanguage } from './i18n.js';

export const NONE = 'Fără';
// The stored "none" value is Romanian; show it in the UI language (option value stays NONE).
// Built-in default labels/statuses (lib/store.cjs, demo, tutorial) are stored in Romanian; in
// English mode only their display is translated. User-created names show as stored.
const BUILTIN_LABELS_EN = { Idee: 'Idea', Personaj: 'Character', Loc: 'Place' };
const BUILTIN_STATUSES_EN = { 'De făcut': 'To Do', 'Prima ciornă': 'First Draft', Revizuit: 'Revised', Final: 'Final' };
export const noneLabel = (name, t) => (name === NONE ? t('ui.corkboard.fara_eticheta') : (getLanguage() === 'en' && BUILTIN_LABELS_EN[name]) || name);
export const noneStatus = (name, t) => (name === NONE ? t('ui.corkboard.fara_status') : (getLanguage() === 'en' && BUILTIN_STATUSES_EN[name]) || name);
export const DEFAULT_LABEL_TITLE = 'Etichetă';
export const DEFAULT_STATUS_TITLE = 'Status';
// The names the writer gave the Label and Status fields (Project Settings); the defaults follow
// the interface language.
export const labelTitleOf = (project, tr) => (project?.labelTitle && project.labelTitle !== DEFAULT_LABEL_TITLE ? project.labelTitle : tr('ui.binder.eticheta'));
export const statusTitleOf = (project, tr) => (project?.statusTitle && project.statusTitle !== DEFAULT_STATUS_TITLE ? project.statusTitle : tr('ui.app.status'));
export const FIELD_TYPES = ['text', 'number', 'checkbox', 'list', 'date'];
export const FIELD_ALIGNS = ['left', 'center', 'right'];
// Binder levels that can get their own default section type (level 1 = directly under Draft).
export const SECTION_DEPTHS = 4;
export const PROJECT_PROPS = ['language', 'publisher', 'isbn', 'address', 'rights'];

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
// The Compile filters name labels / statuses too: kept in step with a rename or delete.
function compileFilter(out, key, from, to) {
  const list = out.compile && out.compile[key];
  if (!Array.isArray(list)) return;
  out.compile = { ...out.compile, [key]: to == null ? list.filter((x) => x !== from) : list.map((x) => (x === from ? to : x)) };
}
export function renameLabel(project, oldName, newName) {
  if (oldName === NONE || !newName || oldName === newName) return clone(project);
  const out = mapTree(project, (n) => { if (n.label === oldName) n.label = newName; });
  out.labels = (out.labels || []).map((l) => (l.name === oldName ? { ...l, name: newName } : l));
  if (out.defaultLabel === oldName) out.defaultLabel = newName;
  compileFilter(out, 'labels', oldName, newName);
  return out;
}
export function deleteLabel(project, name) {
  if (name === NONE) return clone(project);
  const out = mapTree(project, (n) => { if (n.label === name) n.label = NONE; });
  out.labels = (out.labels || []).filter((l) => l.name !== name);
  if (out.defaultLabel === name) out.defaultLabel = NONE;
  compileFilter(out, 'labels', name, null);
  return out;
}

// ---- statuses ----
export function renameStatus(project, oldName, newName) {
  if (oldName === NONE || !newName || oldName === newName) return clone(project);
  const out = mapTree(project, (n) => { if (n.status === oldName) n.status = newName; });
  out.statuses = (out.statuses || []).map((s) => (s === oldName ? newName : s));
  if (out.defaultStatus === oldName) out.defaultStatus = newName;
  compileFilter(out, 'statuses', oldName, newName);
  return out;
}
export function deleteStatus(project, name) {
  if (name === NONE) return clone(project);
  const out = mapTree(project, (n) => { if (n.status === name) n.status = NONE; });
  out.statuses = (out.statuses || []).filter((s) => s !== name);
  if (out.defaultStatus === name) out.defaultStatus = NONE;
  compileFilter(out, 'statuses', name, null);
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
  for (const lv of out.sectionTypeDepths || []) {
    for (const k of Object.keys(lv || {})) if (removed.includes(lv[k])) lv[k] = null;
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
      align: FIELD_ALIGNS.includes(f.align) ? f.align : (f.type === 'number' ? 'right' : 'left'),
      ...Object.fromEntries(Object.entries(f).filter(([k]) => !['id', 'title', 'type', 'options', 'default', 'wraps', 'align'].includes(k))),
      orig: f.title,
    })),
    sectionTypes: (p.sectionTypes || []).map((t) => ({ id: t.id, title: t.title, orig: t.title })),
    sectionTypeLevels: { folders: null, containers: null, files: null, ...(p.sectionTypeLevels || {}) },
    sectionTypeDepths: Array.from({ length: SECTION_DEPTHS }, (_, i) => ({ folders: null, containers: null, files: null, ...((p.sectionTypeDepths || [])[i] || {}) })),
    templateFolder: p.templateFolder ?? null,
    defaultLabel: (p.labels || []).some((l) => l.name === p.defaultLabel) ? p.defaultLabel : NONE,
    defaultStatus: (p.statuses || []).includes(p.defaultStatus) ? p.defaultStatus : NONE,
    ...Object.fromEntries(PROJECT_PROPS.map((k) => [k, p[k] || ''])),
    customIcons: (p.customIcons || []).map((i) => ({ ...i })),
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
    items = items.map((i) => (typeof i[key] === 'string' ? { ...i, [key]: i[key].trim() } : i));
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
    if (out.type === 'number') out.default = parseNumberField(out.default);
    if (out.type !== 'text') delete out.wraps;
    out.align = FIELD_ALIGNS.includes(out.align) ? out.align : 'left';
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
  const depths = (d.sectionTypeDepths || []).map((x) => Object.fromEntries(['folders', 'containers', 'files'].map((k) => [k, valid.has(x?.[k]) ? x[k] : null])));
  while (depths.length && Object.values(depths[depths.length - 1]).every((v) => v == null)) depths.pop();
  p.sectionTypeDepths = depths;

  for (const k of ['title', 'subtitle', 'author', 'authorFirst', 'authorLast', 'titleAbbreviation']) p[k] = (d[k] ?? '').toString();
  p.labelTitle = (d.labelTitle || '').trim() || DEFAULT_LABEL_TITLE;
  p.statusTitle = (d.statusTitle || '').trim() || DEFAULT_STATUS_TITLE;
  p.templateFolder = d.templateFolder || null;
  // The default follows a rename made in the same dialog session (the draft keeps the old name).
  const lblRen = d.labels.find((l) => l.orig && l.orig !== NONE && l.orig === d.defaultLabel);
  const dl = lblRen ? lblRen.name.trim() : d.defaultLabel;
  p.defaultLabel = p.labels.some((l) => l.name === dl) ? dl : NONE;
  const stRen = d.statuses.find((s) => s.orig && s.orig !== NONE && s.orig === d.defaultStatus);
  const ds = stRen ? stRen.name.trim() : d.defaultStatus;
  p.defaultStatus = p.statuses.includes(ds) ? ds : NONE;
  for (const k of PROJECT_PROPS) p[k] = (d[k] ?? '').toString().trim();
  const keptIcons = new Set((d.customIcons || []).map((i) => i?.id));
  for (const i of p.customIcons || []) if (!keptIcons.has(i.id)) p = deleteCustomIcon(p, i.id);
  p.customIcons = (d.customIcons || []).filter((i) => i && i.id && i.file).map((i) => ({ id: i.id, name: (i.name || '').trim() || i.id, file: i.file }));
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

/** Move the item at `from` so it lands at index `to` (drag and drop reordering). */
export function moveTo(arr, from, to) {
  if (from === to || from < 0 || from >= arr.length || to < 0 || to >= arr.length) return arr;
  const out = arr.slice();
  const [it] = out.splice(from, 1);
  out.splice(to, 0, it);
  return out;
}

// ---- new documents --------------------------------------------------------------------------

/** Values a NEW binder item starts with: default label/status and custom-field defaults. */
export function newNodeDefaults(project) {
  const out = {};
  if (project?.defaultLabel && project.defaultLabel !== NONE && (project.labels || []).some((l) => l.name === project.defaultLabel)) out.label = project.defaultLabel;
  if (project?.defaultStatus && project.defaultStatus !== NONE && (project.statuses || []).includes(project.defaultStatus)) out.status = project.defaultStatus;
  const custom = {};
  for (const f of project?.customFields || []) {
    if (f.type === 'checkbox') {
      if (f.default === true) custom[f.title] = true;
    } else if (f.default !== '' && f.default != null) custom[f.title] = f.type === 'number' ? Number(f.default) : f.default;
  }
  if (Object.keys(custom).length) out.custom = custom;
  return out;
}

/**
 * The section type id a binder item gets when none is set on it: the rule for its level (1 =
 * directly under the Draft) and kind (folder / document with subdocuments / text), falling back
 * to the rule for "every other level".
 */
export function sectionTypeIdFor(project, node, depth = 1) {
  if (!node) return null;
  const kind = node.type === 'folder' ? 'folders' : node.children && node.children.length ? 'containers' : 'files';
  const byDepth = (project?.sectionTypeDepths || [])[depth - 1];
  return (byDepth && byDepth[kind]) || (project?.sectionTypeLevels || {})[kind] || null;
}

// ---- template sheets ------------------------------------------------------------------------

const pad = (n) => String(n).padStart(2, '0');
/**
 * Placeholders resolved when a document is created from a template:
 * <$date> 2026-10-25, <$time> 14:05, <$year>, <$n> (number of the new item among its siblings
 * made from the same template), <$title> (the template's title), <$author>.
 */
export function resolveTemplatePlaceholders(text, ctx = {}) {
  if (typeof text !== 'string' || !/(<|&lt;)\$/.test(text)) return text;
  const now = ctx.now ? new Date(ctx.now) : new Date();
  const map = {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    year: String(now.getFullYear()),
    n: String(ctx.n ?? 1),
    title: ctx.title ?? '',
    author: ctx.author ?? '',
  };
  // In HTML the brackets arrive escaped.
  return text.replace(/(?:<|&lt;)\$(date|time|year|n|title|author)(?:>|&gt;)/gi, (_, k) => map[k.toLowerCase()]);
}

/**
 * Fields of a new item made from a template sheet: title and synopsis with placeholders
 * resolved; label, status, keywords, custom metadata, icon and section type copied.
 * `siblings` = the items next to the new one (for <$n>).
 */
export function nodeFromTemplate(tpl, { siblings = [], now, author } = {}) {
  const n = siblings.filter((s) => s.fromTemplate === tpl.id).length + 1;
  const ctx = { now, n, title: tpl.title || '', author };
  const out = {
    title: resolveTemplatePlaceholders(tpl.title || '', ctx),
    synopsis: resolveTemplatePlaceholders(tpl.synopsis || '', ctx),
    label: tpl.label || NONE,
    status: tpl.status || NONE,
    keywords: [...(tpl.keywords || [])],
    fromTemplate: tpl.id,
    includeInCompile: true,
  };
  if (tpl.custom) out.custom = clone(tpl.custom);
  for (const k of ['icon', 'iconColor', 'sectionType', 'target', 'targetType']) if (tpl[k]) out[k] = tpl[k];
  return { fields: out, ctx };
}

/** The template a folder gives to the new documents made inside it, if it still exists. */
export function defaultTemplateFor(project, parent) {
  if (!parent?.defaultTemplate || !project?.templateFolder) return null;
  const folder = findIn(project.tree, project.templateFolder);
  return (folder?.children || []).find((t) => t.id === parent.defaultTemplate) || null;
}
function findIn(tree, id) {
  let hit = null;
  walkTree(tree, (n) => { if (!hit && n.id === id) hit = n; });
  return hit;
}

// ---- synopsis from text ---------------------------------------------------------------------

const ENT = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
/** The opening sentences of a document's text (no AI), at most `max` characters. */
export function synopsisFromText(html, max = 300) {
  const text = String(html || '')
    .replace(/<(sup|span)[^>]*data-footnote[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|h[1-6]|li|blockquote|div)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (m) => ENT[m])
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ');
  if (text.length <= max) return text;
  const sentences = text.match(/[^.!?…]+[.!?…]+["”»]?\s*/g) || [];
  let out = '';
  for (const s of sentences) {
    if ((out + s).length > max) break;
    out += s;
  }
  if (out.trim()) return out.trim();
  const cut = text.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > 0 ? cut.slice(0, sp) : cut).trim()}…`;
}

// ---- custom metadata values -----------------------------------------------------------------

/** Order two values of one custom field: numbers as numbers, text naturally, empty last. */
export function compareCustomValues(field, a, b) {
  const empty = (v) => v === '' || v == null;
  if (empty(a) || empty(b)) return empty(a) === empty(b) ? 0 : empty(a) ? 1 : -1;
  if (field?.type === 'number') return Number(a) - Number(b);
  if (field?.type === 'checkbox') return (a ? 1 : 0) - (b ? 1 : 0);
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}
/** The value of a "number" field typed as text: a Number, or '' when it is not a number. */
export function parseNumberField(text) {
  if (typeof text === 'number') return Number.isFinite(text) ? text : '';
  const s = String(text ?? '').trim().replace(',', '.');
  if (!s) return '';
  const n = Number(s);
  return Number.isFinite(n) ? n : '';
}

// ---- export / import of labels, statuses, metadata, section types ---------------------------

export const META_EXPORT_KIND = 'scribner-project-meta';
/** The part of the settings another project can import (no values from the binder). */
export function exportMetaSettings(project) {
  return {
    kind: META_EXPORT_KIND,
    version: 1,
    labelTitle: project.labelTitle || DEFAULT_LABEL_TITLE,
    statusTitle: project.statusTitle || DEFAULT_STATUS_TITLE,
    labels: (project.labels || []).map((l) => ({ name: l.name, color: l.color || '' })),
    statuses: [...(project.statuses || [])],
    defaultLabel: project.defaultLabel || NONE,
    defaultStatus: project.defaultStatus || NONE,
    customFields: (project.customFields || []).map(({ id, ...f }) => ({ ...clone(f), options: (f.options || []).map((o) => ({ title: o.title })) })),
    sectionTypes: (project.sectionTypes || []).map((t) => t.title),
  };
}

/**
 * Merge an exported file into a dialog draft: items with a new name are added; existing names
 * stay (a label's colour and a field's definition are updated). Field titles are taken too.
 * Throws Error('not-meta') for a file of another kind.
 */
export function importMetaSettings(draft, data) {
  if (!data || data.kind !== META_EXPORT_KIND) throw new Error('not-meta');
  const d = clone(draft);
  if (data.labelTitle) d.labelTitle = data.labelTitle;
  if (data.statusTitle) d.statusTitle = data.statusTitle;
  for (const l of data.labels || []) {
    if (!l?.name || l.name === NONE) continue;
    const have = d.labels.find((x) => x.name === l.name);
    if (have) have.color = l.color || have.color;
    else d.labels.push({ name: l.name, color: l.color || '', orig: null });
  }
  for (const s of data.statuses || []) {
    if (typeof s === 'string' && s && s !== NONE && !d.statuses.some((x) => x.name === s)) d.statuses.push({ name: s, orig: null });
  }
  for (const f of data.customFields || []) {
    if (!f?.title) continue;
    const type = FIELD_TYPES.includes(f.type) ? f.type : 'text';
    const def = { type, options: type === 'list' ? (f.options || []).map((o) => ({ id: '', title: o.title })) : [], default: f.default ?? '', wraps: Boolean(f.wraps), align: FIELD_ALIGNS.includes(f.align) ? f.align : 'left' };
    const have = d.customFields.find((x) => x.title === f.title);
    if (have) {
      const opts = (have.options || []).slice();
      for (const o of def.options) if (!opts.some((x) => x.title === o.title)) opts.push(o);
      Object.assign(have, def, { options: type === 'list' ? opts : [] });
    } else d.customFields.push({ id: '', title: f.title, ...def, orig: null });
  }
  for (const t of data.sectionTypes || []) {
    if (typeof t === 'string' && t && !d.sectionTypes.some((x) => x.title === t)) d.sectionTypes.push({ id: '', title: t, orig: null });
  }
  if (data.defaultLabel && d.labels.some((l) => l.name === data.defaultLabel)) d.defaultLabel = data.defaultLabel;
  if (data.defaultStatus && d.statuses.some((s) => s.name === data.defaultStatus)) d.defaultStatus = data.defaultStatus;
  return d;
}

// ---- custom icons ---------------------------------------------------------------------------
export const CUSTOM_ICON_PREFIX = 'icon:';
/** The project icon an item's `icon` refers to ("icon:<id>"), or null. */
export const customIconOf = (project, icon) => (typeof icon === 'string' && icon.startsWith(CUSTOM_ICON_PREFIX)
  ? (project?.customIcons || []).find((i) => i.id === icon.slice(CUSTOM_ICON_PREFIX.length)) || null
  : null);
/** Remove a project icon; items that used it go back to the default icon. */
export function deleteCustomIcon(project, id) {
  const out = mapTree(project, (n) => { if (n.icon === `${CUSTOM_ICON_PREFIX}${id}`) n.icon = null; });
  out.customIcons = (out.customIcons || []).filter((i) => i.id !== id);
  return out;
}

// ---- default formatting ---------------------------------------------------------------------
export const FORMAT_KEYS = ['font', 'size', 'lineHeight', 'firstIndent', 'indentLeft', 'indentRight', 'spaceBefore', 'spaceAfter', 'align', 'notesFont', 'notesSize', 'footnoteFont', 'footnoteSize'];
const TEXT_KEYS = new Set(['font', 'align', 'notesFont', 'footnoteFont']);
/** Draft (all strings) for the default formatting pane; old `spacing` becomes spaceAfter. */
export function formatDraft(f) {
  const src = { ...(f || {}) };
  if (src.spaceAfter == null && src.spacing != null) src.spaceAfter = src.spacing;
  return Object.fromEntries(FORMAT_KEYS.map((k) => [k, src[k] ?? '']));
}
/** Clean a default-formatting draft for saving; null = the project uses the global setting. */
export function cleanDefaultFormatting(f, useGlobal = false) {
  if (useGlobal || !f) return null;
  const out = {};
  for (const k of FORMAT_KEYS) {
    const v = f[k];
    if (v === '' || v == null) continue;
    if (TEXT_KEYS.has(k)) out[k] = String(v);
    else if (Number.isFinite(Number(v))) out[k] = Number(v);
  }
  if (out.spaceAfter != null) out.spacing = out.spaceAfter; // older readers
  return Object.keys(out).length ? out : null;
}
