// Menu bar layout: which command goes in which menu and submenu.
// Shared by the in-app menu bar (browser) and the native application menu (desktop).

// Menu bar order: File, Edit, Insert, View, Navigate, Project, Documents, Format, Window, Tools, AI, Help.
export const MENU_GROUPS = ['file', 'edit', 'insert', 'view', 'nav', 'project', 'document', 'format', 'window', 'tools', 'ai', 'help'];

// Commands that need Claude: left out of every menu (and shortcut) while AI is off.
// I-REP, NotebookLM and "AI settings" (to turn AI back on) stay.
export const AI_ONLY_COMMANDS = new Set([
  'ai', 'mcpConnect', 'aiBulkSynopsis', 'aiConsistency', 'aiZoomReview',
  'aiResearchSel', 'aiDefineSel', 'aiTranslateSel', 'aiProofreadSel', 'researchAskSel',
]);

// Submenus per menu: [label key, command ids]. A submenu takes the place of its first command.
export const SUBMENUS = {
  file: [
    ['menu.import', ['import', 'importFiles', 'importOpml', 'importWeb', 'transcribeAudio', 'importZotero', 'importBib', 'importBundle']],
    ['menu.export', ['exportFiles', 'exportScriv', 'exportLatex', 'exportPandoc', 'exportMmd', 'exportFdx', 'exportFountain', 'exportBundle', 'editorPackage']], // saveTemplate: top level of File (G4)
    ['menu.sync', ['syncOut', 'syncIn']],
    ['menu.print', ['pageSetup', 'printPreview', 'print']],
  ],
  document: [['menu.snapshots', ['snapshot', 'snapshotTitled', 'snapshotSelection', 'snapshotManager']]],
  edit: [
    ['menu.select', ['selectWord', 'selectSentence', 'selectParagraph']],
    ['menu.find', ['findDoc', 'findNext', 'findPrev', 'findUseSel', 'findProject', 'findFormat', 'advSearch']],
  ],
  // Script modes: the ids are generated (script_<format>), matched by prefix.
  format: [['menu.scriptMode', ['scriptOff'], (id) => id.startsWith('script_')], ['menu.styles', ['styles', 'stylesPanel']]],
  view: [
    ['menu.bookViews', ['viewTimeline', 'viewRelations', 'viewPacing']],
    ['menu.posFocus', ['posNouns', 'posVerbs', 'posOff']],
    ['menu.scrivenings', ['scrivSelection', 'scrivCollection', 'scrivTitles', 'scrivSeparators']],
    ['menu.textLook', ['toggleFormatBar', 'toggleComments', 'toggleRevisions']],
  ],
  tools: [
    ['menu.lookup', ['lookupDict', 'lookupSyn', 'lookupWiki', 'lookupGoogle', 'selWiktionary', 'selScholar']],
    ['menu.translate', ['deeplInApp', 'googleInApp', 'selDeepl', 'selGoogleTranslate', 'selLinguee', 'selIate']],
    ['menu.inProject', ['findSel', 'researchSel', 'glossaryAdd']],
    ['menu.notebookLm', ['nlmExport', 'nlmOpen', 'nlmAskSel']],
  ],
  ai: [
    ['menu.aiSelection', ['aiResearchSel', 'aiDefineSel', 'aiProofreadSel', 'aiTranslateSel', 'researchAskSel']],
    ['menu.aiBook', ['aiBulkSynopsis', 'aiConsistency', 'aiZoomReview']],
    ['menu.notebookLm', ['nlmExport', 'nlmOpen', 'nlmAskSel']],
  ],
};

// Fixed order of the AI menu ('-' = separator; a submenu is named by its first command).
const AI_ORDER = ['ai', 'irep', '-', 'aiResearchSel', 'aiBulkSynopsis', 'nlmExport', '-', 'aiSettings', 'mcpConnect'];

// Navigate › Go To: the binder as one submenu (favorites first, then each top folder), indented by depth.
const GOTO_MAX_DEPTH = 4;
const GOTO_MAX_ITEMS = 200;
export function gotoItems(tree, { go, favorite = '★', skip = () => false } = {}) {
  const out = [];
  const all = [];
  const walk = (nodes, depth) => {
    for (const n of nodes || []) {
      if (skip(n)) continue;
      all.push(n);
      if (out.length < GOTO_MAX_ITEMS) out.push({ label: `${'\u2003'.repeat(depth)}${n.title || '—'}`, action: () => go(n.id) });
      if (depth < GOTO_MAX_DEPTH) walk(n.children, depth + 1);
    }
  };
  for (const root of tree || []) {
    if (root.root === 'trash' || skip(root)) continue;
    if (out.length) out.push('-');
    out.push({ label: root.title, action: () => go(root.id) });
    walk(root.children, 1);
  }
  const favs = all.filter((n) => n.favorite).slice(0, 30).map((n) => ({ label: `${favorite} ${n.title}`, action: () => go(n.id) }));
  return favs.length ? [...favs, '-', ...out] : out;
}

function tidy(items) {
  const out = [];
  for (const it of items) {
    if (it === '-' && (!out.length || out[out.length - 1] === '-')) continue;
    out.push(it);
  }
  while (out[out.length - 1] === '-') out.pop();
  return out;
}

/**
 * @param commands {id: {group, id, label, run, disabled, key}} in registry order
 * @param opts.item (id) => menu item; opts.label (key) => text; opts.extras {group: items[]}
 * @param opts.after {group: items[]}: appended after the group's commands
 * @param opts.goto {tree, go, skip?}: Navigate › Go To submenu with the whole binder (first in Navigate)
 * @returns [{group, label, items}] (items: '-', {id,label,action,...} or {label, submenu})
 */
export function buildMenuLayout(commands, { item, label, extras = {}, after = {}, goto = null }) {
  const ids = (g) => Object.values(commands).filter((c) => c.group === g).map((c) => c.id);
  const groupItems = (g, order) => {
    const defs = SUBMENUS[g] || [];
    const done = new Set();
    const out = [];
    for (const id of order || ids(g)) {
      if (id === '-') { out.push('-'); continue; }
      if (done.has(id) || !commands[id] || commands[id].group !== g) continue;
      const def = defs.find(([, members, match]) => members.includes(id) || (match && match(id)));
      if (!def) { out.push(item(id)); done.add(id); continue; }
      const extra = def[2] ? ids(g).filter((m) => def[2](m) && !def[1].includes(m)) : [];
      const members = [...def[1], ...extra].filter((m) => commands[m] && commands[m].group === g);
      members.forEach((m) => done.add(m));
      if (members.length === 1) out.push(item(members[0]));
      else out.push({ label: label(def[0]), submenu: members.map(item) });
    }
    return out;
  };
  return MENU_GROUPS.map((g) => {
    let items = g === 'ai' ? groupItems('ai', AI_ORDER) : groupItems(g);
    if (extras[g]) {
      const seen = new Set(extras[g].filter((x) => x !== '-').map((x) => x.label));
      items = [...extras[g], '-', ...items.filter((x) => x === '-' || !seen.has(x.label))];
    }
    if (after[g]) items = [...items, '-', ...after[g]];
    if (g === 'nav' && goto) {
      const sub = gotoItems(goto.tree, goto);
      if (sub.length) items = [{ label: label('menu.goTo'), submenu: sub }, ...items];
    }
    return { group: g, label: label(`group.${g}`), items: tidy(items) };
  }).filter((m) => m.items.length);
}

/** Native menu spec: command items carry their id; other actions get a generated one. */
export function nativeMenuSpec(layout) {
  const actions = {};
  let n = 0;
  const conv = (items) =>
    items.filter((it) => it === '-' || !it.hidden).map((it) => {
      if (it === '-') return '-';
      if (it.submenu) return { label: it.label, items: conv(it.submenu) };
      let id = it.id;
      if (!id) {
        id = `menu:${n++}`;
        actions[id] = it.action;
      }
      // role: a native window/edit action (minimize, paste…) the desktop menu does itself.
      return { id, label: it.label, key: it.shortcut, disabled: it.disabled, ...(it.role ? { role: it.role } : {}) };
    });
  return { spec: layout.map((m) => ({ label: m.label, items: conv(m.items) })), actions };
}
