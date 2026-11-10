import { commandItem, commandGroup, tidyMenuItems } from './commands.js';
import { labelTitleOf, statusTitleOf, noneLabel, noneStatus } from './projectSettings.js';

// ADL: the clicked object (or the explicit multi-selection) owns this menu.
// Grouping changes presentation, not the meaning or implementation of an action.
export function binderContext({ project, id, selectedIds = new Set() }) {
  const index = new Map();
  const visit = (nodes, parent = null, root = null) => {
    for (const node of nodes || []) {
      const owner = node.root || root;
      index.set(node.id, { node, parent, root: owner });
      visit(node.children, node, owner);
    }
  };
  visit(project.tree);
  const hit = index.get(id);
  if (!hit) return null;
  const ids = selectedIds.has(id) && selectedIds.size > 1 ? [...selectedIds] : [id];
  const hits = ids.map((x) => index.get(x)).filter(Boolean);
  const rootNode = Boolean(hit.node.root) || !hit.parent;
  const mutable = !rootNode && hits.every((x) => x.parent && !x.node.root);
  const inTrash = hit.root === 'trash';
  const allInTrash = hits.every((x) => x.root === 'trash');
  const noneInTrash = hits.every((x) => x.root !== 'trash');
  return { ...hit, id, ids, index, rootNode, mutable, inTrash, allInTrash, noneInTrash, multi: ids.length > 1 };
}

export function binderContextTitle(context, tr) {
  if (!context) return '';
  if (context.multi) return tr('ui.binder.selectionCaption', { n: context.ids.length });
  const kind = context.rootNode ? 'rootCaption' : context.inTrash ? 'trashItemCaption' : context.node.type === 'file' ? 'mediaCaption' : context.node.type === 'folder' ? 'folderCaption' : 'documentCaption';
  return tr(`ui.binder.${kind}`, { title: context.node.title || tr('ui.app.fara_titlu') });
}

export function buildBinderContextMenu(options) {
  const { project, tr, callbacks: cb = {}, templates = [], collections = [], activeCollectionId, filterIds, icons = [] } = options;
  const c = binderContext(options);
  if (!c) return [];
  const { node, ids, id, mutable, rootNode, multi, noneInTrash, allInTrash } = c;
  const editable = mutable && noneInTrash;
  const single = !multi;
  const hasChildren = Boolean(node.children?.length);
  const item = (commandId, label, action, extra = {}, scope = 'binder.selection') => commandItem(commandId, { label, action, scope, payload: { ids: [...ids], targetId: id }, ...extra });
  const group = (groupId, key, items) => commandGroup(groupId, tr(key), items);
  const out = [];

  if (!c.inTrash && cb.add) {
    const add = [
      item('newText', tr('cmd.newText'), () => cb.add('text'), { shortcut: 'Ctrl+N' }),
      item('newFolder', tr('cmd.newFolder'), () => cb.add('folder'), { shortcut: 'Ctrl+Shift+N' }),
    ];
    // Nesting as in Scrivener 3: on a document WITHOUT children the default add places a
    // sibling, so the explicit "inside" variants live in a nested submenu (top-level density
    // unchanged). On a document with children the default add already goes inside.
    if (cb.addInside && single && node.type === 'text' && !hasChildren) add.push(group('binder.addInside', 'ui.binder.addInside', [
      item('newTextInside', tr('cmd.newText'), () => cb.addInside('text'), { payload: { ids: [...ids], targetId: id, inside: true } }),
      item('newFolderInside', tr('cmd.newFolder'), () => cb.addInside('folder'), { payload: { ids: [...ids], targetId: id, inside: true } }),
    ]));
    if (cb.newFromTemplate && templates.length) add.push(group('binder.templates', 'cmd.newFromTemplate', templates.map((t) => item('newFromTemplate', t.title || tr('ui.app.fara_titlu'), () => cb.newFromTemplate(t.id, node.children || node.type === 'text' ? id : c.parent?.id), { payload: { templateId: t.id, targetId: node.children || node.type === 'text' ? id : c.parent?.id } }))));
    out.push(group('binder.add', 'btn.add', add));
  }
  if (editable && single && cb.rename) out.push(item('rename', tr('set.binderDbl.rename'), () => cb.rename(id), { shortcut: 'F2' }));
  if (editable && (cb.copy || cb.duplicate)) {
    const duplicate = () => cb.copy ? cb.copy(ids, ids[ids.length - 1], 'after') : cb.duplicate(id, true);
    if (single && hasChildren && cb.duplicate) out.push(group('binder.duplicate', 'cmd.duplicate', [
      item('duplicate', tr('ui.binder.duplicateWithChildren'), duplicate, { payload: { ids: [...ids], targetId: id, includeChildren: true } }),
      item('duplicate', tr('ui.binder.duplicateOnlyItem'), () => cb.duplicate(id, false), { payload: { ids: [...ids], targetId: id, includeChildren: false } }),
    ]));
    else out.push(item('duplicate', tr('cmd.duplicate'), duplicate, { shortcut: 'Ctrl+D' }));
  }

  // Build an index once, and a set of excluded descendants once: linear tree traversal.
  if (editable && cb.drop) {
    const excluded = new Set();
    const mark = (n) => { excluded.add(n.id); for (const child of n.children || []) mark(child); };
    for (const x of ids) { const h = c.index.get(x); if (h) mark(h.node); }
    const targets = [];
    const visit = (nodes, depth = 0, inTrash = false) => {
      for (const n of nodes || []) {
        const trash = inTrash || n.root === 'trash';
        if (trash || excluded.has(n.id)) continue;
        if (n.children) targets.push(item('moveTo', `${'\u2002'.repeat(depth)}${n.title}`, () => cb.drop(ids, n.id, 'inside', false), { payload: { ids: [...ids], targetId: n.id } }));
        visit(n.children, depth + 1, trash);
      }
    };
    visit(project.tree);
    if (targets.length) out.push(group('binder.move', 'ui.binder.muta_in', targets));
  }
  if (editable && cb.trash) out.push(item('trash', tr('ui.binder.muta_in_cos'), () => cb.trash(ids), { shortcut: 'Del' }));
  if (mutable && allInTrash && cb.restore) out.push(item('restoreTrash', tr('ui.binder.restoreFromTrash'), () => cb.restore(ids)));

  if (editable && cb.patch) {
    const property = [];
    const same = (key, value) => ids.every((x) => (c.index.get(x)?.node[key] || '') === value);
    if (project.labels?.length) property.push(commandGroup('binder.label', labelTitleOf(project, tr), project.labels.map((l) => item('setLabel', noneLabel(l.name, tr), () => cb.patch(ids, { label: l.name }), { checked: same('label', l.name), payload: { ids: [...ids], label: l.name } }))));
    if (project.statuses?.length) property.push(commandGroup('binder.status', statusTitleOf(project, tr), project.statuses.map((s) => { const name = typeof s === 'string' ? s : s.name; return item('setStatus', noneStatus(name, tr), () => cb.patch(ids, { status: name }), { checked: same('status', name), payload: { ids: [...ids], status: name } }); })));
    if (ids.every((x) => c.index.get(x)?.node.type !== 'file')) property.push(item('includeInCompile', tr('ui.binder.include_in_compile'), () => cb.patch(ids, { includeInCompile: node.includeInCompile === false }), { checked: ids.every((x) => c.index.get(x)?.node.includeInCompile !== false) }));
    property.push(item('favorite', tr('ui.binder.favorit'), () => cb.patch(ids, { favorite: !node.favorite }), { checked: ids.every((x) => Boolean(c.index.get(x)?.node.favorite)) }));
    const custom = node.icon && /\p{Extended_Pictographic}/u.test(node.icon) ? node.icon : '';
    if (icons.length) property.push(group('binder.icon', 'ui.binder.schimba_iconita', [item('setIcon', tr('ui.binder.iconita_implicita'), () => cb.patch(ids, { icon: null }), { checked: !custom }), '-', ...icons.map((icon) => item('setIcon', icon, () => cb.patch(ids, { icon }), { checked: custom === icon, payload: { ids: [...ids], icon } }))]));
    if (project.sectionTypes?.length && ids.every((x) => c.index.get(x)?.node.type !== 'file')) property.push(group('binder.sectionType', 'ui.inspector.tip_sectiune', [item('setSectionType', tr('ui.inspector.dupa_nivel'), () => cb.patch(ids, { sectionType: null }), { checked: !node.sectionType }), '-', ...project.sectionTypes.map((ty) => item('setSectionType', ty.title, () => cb.patch(ids, { sectionType: ty.title }), { checked: node.sectionType === ty.title, payload: { ids: [...ids], sectionType: ty.title } }))]));
    if (single && node.children && cb.setTemplateFolder) property.push(item('setTemplateFolder', tr('ui.binder.dosar_de_sabloane'), () => cb.setTemplateFolder(project.templateFolder === id ? null : id), { checked: project.templateFolder === id }));
    out.push(group('binder.properties', 'ui.binder.properties', property));
  }

  const collectionActions = [];
  const manual = collections.filter((x) => x.type !== 'search');
  if (editable && cb.addToCollection && (manual.length || cb.newCollection)) {
    const add = manual.map((col) => item('addToCollection', col.title, () => cb.addToCollection(col.id, ids), { checked: ids.every((x) => (col.ids || []).includes(x)), payload: { ids: [...ids], collectionId: col.id } }));
    if (cb.newCollection) add.push(...(add.length ? ['-'] : []), item('newCollection', tr(multi ? 'ui.binder.newCollectionSelection' : 'ui.binder.newCollectionItem'), () => cb.newCollection(ids)));
    collectionActions.push(group('binder.collectionAdd', multi ? 'ui.binder.addSelectionCollection' : 'ui.binder.addItemCollection', add));
  }
  const active = collections.find((x) => x.id === activeCollectionId);
  if (editable && cb.removeFromCollection && active && active.type !== 'search' && filterIds) collectionActions.push(item('removeFromCollection', tr(multi ? 'ui.binder.removeSelectionCollection' : 'ui.binder.removeItemCollection'), () => cb.removeFromCollection(active.id, ids)));
  if (collectionActions.length) out.push(group('binder.collections', 'ui.binder.collections', collectionActions));

  const organize = [];
  if (editable && cb.convert && ids.every((x) => c.index.get(x)?.node.type !== 'file')) {
    if (ids.some((x) => c.index.get(x)?.node.type !== 'folder')) organize.push(item('convertFolder', tr('ui.app.converteste_in_dosar'), () => cb.convert(ids, 'folder')));
    if (ids.some((x) => c.index.get(x)?.node.type === 'folder')) organize.push(item('convertText', tr('ui.app.converteste_in_document_text'), () => cb.convert(ids, 'text')));
  }
  if (editable && cb.group && !filterIds) organize.push(item('groupDocuments', tr('ui.binder.grupeaza'), () => cb.group(ids), { shortcut: 'Ctrl+Alt+G' }));
  if (organize.length) out.push(group('binder.organize', 'ui.binder.organize', organize));
  const open = [];
  if (mutable && single && node.type === 'text' && cb.quickRef) open.push(item('quickRef', tr('ui.binder.deschide_in_quick_reference'), () => cb.quickRef(id)));
  if (mutable && single && !node.children && cb.select) open.push(item('openInOtherPane', tr('ui.binder.deschide_in_panoul_2'), () => cb.select(id, { alt: true })));
  if (open.length) out.push(group('binder.open', 'ui.binder.open', open));
  const tools = [];
  if (mutable && single && cb.copyLink) tools.push(item('copyDocumentLink', tr('ui.binder.copiaza_legatura'), () => cb.copyLink(id)));
  if (editable && cb.snapshot && ids.some((x) => c.index.get(x)?.node.type === 'text')) tools.push(item('snapshot', tr('ui.binder.snapshot'), () => cb.snapshot(ids)));
  if (mutable && single && cb.showInExplorer) tools.push(item('showInExplorer', tr('ui.binder.arata_in_explorer'), () => cb.showInExplorer(id)));
  if (tools.length) out.push(group('binder.tools', 'ui.binder.tools', tools));
  const tree = [];
  if (node.children) {
    if (!c.inTrash && cb.sortChildren && node.children.length >= 2) tree.push(group('binder.sort', 'ui.binder.sorteaza_copiii', [item('sortChildren', tr('ui.binder.sort_az'), () => cb.sortChildren(id, false), { payload: { targetId: id, descending: false } }), item('sortChildren', tr('ui.binder.sort_za'), () => cb.sortChildren(id, true), { payload: { targetId: id, descending: true } })]));
    if (cb.setAllCollapsed) tree.push(item('expandAll', tr('ui.binder.extinde_tot'), () => cb.setAllCollapsed(false), {}, 'binder.tree'), item('collapseAll', tr('ui.binder.restrange_tot'), () => cb.setAllCollapsed(true), {}, 'binder.tree'));
  }
  if (tree.length) out.push(group('binder.tree', 'ui.binder.tree', tree));
  if (node.root === 'trash' && hasChildren && cb.emptyTrash) out.push(item('emptyTrash', tr('ui.binder.goleste_cosul'), () => cb.emptyTrash(), {}, 'project'));
  return tidyMenuItems(out);
}

