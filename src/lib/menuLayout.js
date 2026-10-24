// Menu bar layout (Scrivener 3 order): which command goes in which menu and submenu.
// Shared by the in-app menu bar (browser) and the native application menu (desktop).

export const MENU_GROUPS = ['file', 'edit', 'view', 'project', 'document', 'nav', 'tools', 'ai', 'help'];

// Commands that need Claude: left out of every menu (and shortcut) while AI is off.
// I-REP, NotebookLM and "AI settings" (to turn AI back on) stay.
export const AI_ONLY_COMMANDS = new Set([
  'ai', 'mcpConnect', 'aiBulkSynopsis', 'aiConsistency', 'aiZoomReview',
  'aiResearchSel', 'aiDefineSel', 'aiTranslateSel', 'aiProofreadSel', 'researchAskSel',
]);

// Submenus per menu: [label key, command ids]. A submenu takes the place of its first command.
export const SUBMENUS = {
  file: [
    ['menu.import', ['import', 'importFiles', 'importOpml', 'importWeb', 'importZotero', 'importBib', 'importBundle']],
    ['menu.export', ['exportFiles', 'exportScriv', 'exportLatex', 'exportPandoc', 'exportMmd', 'exportFdx', 'exportFountain', 'exportBundle', 'editorPackage', 'saveTemplate']],
    ['menu.sync', ['syncOut', 'syncIn']],
    ['menu.print', ['pageSetup', 'printPreview', 'print']],
  ],
  edit: [['menu.select', ['selectWord', 'selectSentence', 'selectParagraph']]],
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

// Menus folded into another one as a submenu (keeps the bar short): Format → Edit, Window → View.
const FOLDED = { format: 'edit', window: 'view' };

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
 * @returns [{group, label, items}] (items: '-', {id,label,action,...} or {label, submenu})
 */
export function buildMenuLayout(commands, { item, label, extras = {} }) {
  const ids = (g) => Object.values(commands).filter((c) => c.group === g).map((c) => c.id);
  const groupItems = (g, order) => {
    const defs = SUBMENUS[g] || [];
    const done = new Set();
    const out = [];
    for (const id of order || ids(g)) {
      if (id === '-') { out.push('-'); continue; }
      if (done.has(id) || !commands[id] || commands[id].group !== g) continue;
      const def = defs.find(([, members]) => members.includes(id));
      if (!def) { out.push(item(id)); done.add(id); continue; }
      const members = def[1].filter((m) => commands[m] && commands[m].group === g);
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
    for (const [from, into] of Object.entries(FOLDED)) {
      const sub = groupItems(from);
      if (into === g && sub.length) items = [...items, '-', { label: label(`group.${from}`), submenu: sub }];
    }
    return { group: g, label: label(`group.${g}`), items: tidy(items) };
  }).filter((m) => m.items.length);
}

/** Native menu spec: command items carry their id; other actions get a generated one. */
export function nativeMenuSpec(layout) {
  const actions = {};
  let n = 0;
  const conv = (items) =>
    items.map((it) => {
      if (it === '-') return '-';
      if (it.submenu) return { label: it.label, items: conv(it.submenu) };
      let id = it.id;
      if (!id) {
        id = `menu:${n++}`;
        actions[id] = it.action;
      }
      return { id, label: it.label, key: it.shortcut, disabled: it.disabled };
    });
  return { spec: layout.map((m) => ({ label: m.label, items: conv(m.items) })), actions };
}
