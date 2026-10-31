// Menu bar layout: which command goes in which menu and submenu.
// Shared by the in-app menu bar (browser) and the native application menu (desktop).

// Three tiers (menu reorg 2026-10-31), never mixed:
//   APPLICATION: Program (program settings, shortcuts, toolbar), Window, Help - the program itself.
//   PROJECT:     File, Project - the open book: files, import/export, project settings.
//   WORKFLOW:    Edit, Insert, Format, Documents, View, Navigate, Tools, AI - working on the text.
// PROGRAM settings (Program > Program settings…, AI > AI settings (program)…) and PROJECT settings
// (Project > Project settings…, AI > AI settings (project)…) are always different doors.
export const MENU_TIERS = {
  application: ['app', 'window', 'help'],
  project: ['file', 'project'],
  workflow: ['edit', 'insert', 'format', 'document', 'view', 'nav', 'tools', 'ai'],
};
// Menu bar order: Program, File, Project, Edit, Insert, Format, Documents, View, Navigate, Tools, AI, Window, Help.
export const MENU_GROUPS = ['app', 'file', 'project', 'edit', 'insert', 'format', 'document', 'view', 'nav', 'tools', 'ai', 'window', 'help'];
// Commands that configure the PROGRAM (not a project, not the text): only in the Program menu.
export const PROGRAM_COMMANDS = ['settings', 'shortcuts', 'customizeToolbar'];
export const tierOf = (group) => Object.keys(MENU_TIERS).find((k) => MENU_TIERS[k].includes(group)) || null;

// Commands that need Claude: left out of every menu (and shortcut) while AI is off.
// I-REP, NotebookLM and "AI settings" (to turn AI back on) stay.
export const AI_ONLY_COMMANDS = new Set([
  'ai', 'mcpConnect', 'aiBulkSynopsis', 'aiConsistency', 'aiZoomReview',
  'aiResearchSel', 'aiDefineSel', 'aiTranslateSel', 'aiProofreadSel', 'researchAskSel', 'iedit',
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
    // View > Reading (lenses: how the text is read), View > Page, View > Zoom (B2/B3 2026-10-31).
    // The FormatBar "Lectură" menu shows the same lenses (src/lib/readingLenses.js) and nothing else.
    ['menu.reading', ['dialogueFocus', 'linguisticFocus']], // pos* come only from readingLensItems (append) — avoid duplicate Focus lingvistic labels
    ['menu.page', ['pageViewSetup', 'pageFull']],
    ['menu.zoom', ['zoomIn', 'zoomOut', 'zoomReset']],
    ['menu.scrivenings', ['scrivSelection', 'scrivCollection', 'scrivTitles', 'scrivSeparators']],
    ['menu.textLook', ['toggleFormatBar', 'toggleComments', 'toggleRevisions']],
  ],
  tools: [
    ['menu.lookup', ['lookupDict', 'lookupSyn', 'lookupWiki', 'lookupGoogle', 'selWiktionary', 'selScholar']],
    ['menu.translate', ['deeplInApp', 'googleInApp', 'selDeepl', 'selGoogleTranslate', 'selLinguee', 'selIate']],
    ['menu.inProject', ['findSel', 'researchSel', 'glossaryAdd']],
    // NotebookLM moved to the AI menu (AI isolation 2026-10-27).
  ],
  ai: [
    ['menu.aiSelection', ['aiResearchSel', 'aiDefineSel', 'aiProofreadSel', 'aiTranslateSel', 'researchAskSel']],
    ['menu.aiBook', ['aiBulkSynopsis', 'aiConsistency', 'aiZoomReview']],
    ['menu.notebookLm', ['nlmExport', 'nlmOpen', 'nlmAskSel', 'nlmConsultSel']],
  ],
};

// Fixed order of the AI menu ('-' = separator; a submenu is named by its first command).
// AI isolation (2026-10-27): the ONLY door to AI commands and AI settings.
const AI_ORDER = ['ai', 'irep', 'iedit', '-', 'aiResearchSel', 'aiBulkSynopsis', 'aiCancelJob', 'nlmExport', '-', 'aiSettings', 'aiProjectSettings', 'mcpConnect'];

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
 * @param opts.append {submenu label key: items[]}: extra items added to the end of that submenu
 * @returns [{group, label, items}] (items: '-', {id,label,action,...} or {label, submenu})
 */
export function buildMenuLayout(commands, { item, label, extras = {}, after = {}, goto = null, append = {} }) {
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
      const add = (append[def[0]] || []).filter(Boolean);
      if (members.length === 1 && !add.length) out.push(item(members[0]));
      else out.push({ label: label(def[0]), submenu: tidy([...add, ...(add.length ? ['-'] : []), ...members.map(item)]) });
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
