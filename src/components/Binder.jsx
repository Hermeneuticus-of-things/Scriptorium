import React, { useEffect, useMemo, useRef, useState } from 'react';
import { containerIds, dragIds, iconTint } from '../lib/panelsExtra.js';
import { binderNav, rangeIds, typeAhead, visibleRows } from '../lib/tree.js';
import { DocumentIcon, DraftIcon, FolderIcon, Icon, ResearchIcon, TemplatesIcon, TrashIcon } from './Icons.jsx';
import ContextMenu from './ContextMenu.jsx';
import { t as tr } from '../lib/i18n.js';
import { binderContext, binderContextTitle, buildBinderContextMenu } from '../lib/binderContextMenu.js';
import { ICONS } from './Inspector.jsx';
import { KEYWORD_MIME, keywordDropTargets } from '../lib/collections.js';
import { labelColorIn as labelColorInOf, labelTint } from '../lib/settingsDefaults.js';

function iconFor(node, templateFolderId) {
  // The Document Templates folder gets its own icon (Scrivener's "T" folder, §7.5.1).
  if (templateFolderId && node.id === templateFolderId) return <TemplatesIcon />;
  if (node.root === 'trash') return <TrashIcon />;
  if (node.root === 'draft') return <DraftIcon />;
  if (node.root === 'research') return <ResearchIcon />;
  // Custom icon chosen in the Inspector (an emoji); Scrivener icon names fall through.
  if (node.icon && /\p{Extended_Pictographic}/u.test(node.icon)) return node.icon;
  if (node.type === 'file') {
    const mime = node.media?.mime || '';
    if (mime.startsWith('image/')) return <Icon name="image" />;
    if (mime === 'application/pdf') return <Icon name="pdf" />;
    if (mime.startsWith('audio/')) return <Icon name="audio" />;
    if (mime.startsWith('video/')) return <Icon name="video" />;
    return <Icon name="attach" />;
  }
  if (node.children && node.type !== 'folder') return <Icon name="stack" />;
  return node.children ? <FolderIcon /> : <DocumentIcon />;
}

function matches(node, query, docs) {
  if (!query) return true;
  const q = query.toLocaleLowerCase('ro');
  if (node.title.toLocaleLowerCase('ro').includes(q)) return true;
  if ((node.synopsis || '').toLocaleLowerCase('ro').includes(q)) return true;
  if ((node.keywords || []).some((k) => k.toLocaleLowerCase('ro').includes(q))) return true;
  return (docs[node.id] || '').replace(/<[^>]+>/g, ' ').toLocaleLowerCase('ro').includes(q);
}

const rowDomId = (id) => `binder-node-${String(id).replace(/[^\w-]/g, '_')}`;

export default function Binder({ project, docs, selectedId, selectedIds, onSelect, onAdd, onAi, onAddInside, onRename, onMove, onTrash, onEmptyTrash, onKeyMove, filterIds = null, filterTitle = '', binderEnter = null, binderDoubleClick = 'rename', onOpenItem, onQuickRef, onCopy, onMoveMany, labelTintIcons, revealId = null, onUndo, renameId = null, onRenameDone, onFocusEditor, onRangeSelect, onPatchItems, onSetTemplateFolder, labelColorIn = null, collections = null, activeCollectionId = null, onAddToCollection, onNewCollection, onRemoveFromCollection, onConvert, onSortChildren, onGroup, onCopyLink, onSnapshot, onDuplicate, onShowInExplorer, onDropKeyword, snapCounts = null, templates = null, onNewFromTemplate, onRestore }) {
  const colorIn = labelColorInOf({ labelColorIn });
  const tintIcons = labelTintIcons ?? (labelColorIn ? colorIn.icons : Boolean(project.labelTintIcons));
  const rowTint = (node) => (colorIn.binder && node.label && labelColor[node.label] ? labelTint(labelColor[node.label]) : '');
  const selectionFor = (id) => (selectedIds.has(id) && selectedIds.size > 1 ? [...selectedIds] : [id]);
  // A keyword dragged from the Keywords window: added to the row (or the whole selection it belongs to).
  const keywordDrag = (e) => onDropKeyword && [...(e.dataTransfer?.types || [])].includes(KEYWORD_MIME);
  const keywordDrop = (e, id) => {
    const name = e.dataTransfer.getData(KEYWORD_MIME);
    if (name) onDropKeyword(keywordDropTargets(id, [...selectedIds]), name);
  };
  // Behaviours from Options: Enter = 'rename' | 'newDoc' | 'open' ('edit' = 'open');
  // double-click = 'rename' | 'quickRef' | 'open' ('openQuickRef' = 'quickRef').
  const enterMode = binderEnter === 'edit' ? 'open' : binderEnter;
  const dblMode = binderDoubleClick === 'openQuickRef' ? 'quickRef' : binderDoubleClick || 'rename';
  const runBehaviour = (mode, id, isRootNode) => {
    if (!id) return false;
    if (mode === 'rename') {
      const context = binderContext({ project, id, selectedIds: new Set([id]) });
      if (isRootNode || !context?.mutable || !context.noneInTrash) return false;
      setEditing(id);
    } else if (mode === 'newDoc') onAdd('text');
    else if (mode === 'open') {
      if (onOpenItem) onOpenItem(id);
      else onSelect(id, {});
      // "Edit document": the cursor goes into the editor (Scrivener)
      onFocusEditor?.(id);
    } else if (mode === 'quickRef') {
      if (isRootNode || !onQuickRef) return false;
      onQuickRef(id);
    } else return false;
    return true;
  };
  const [collapsed, setCollapsed] = useState({});
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [drag, setDrag] = useState(null); // array of dragged ids
  const [copying, setCopying] = useState(false);
  const rootRef = useRef(null);
  const treeRef = useRef(null); // the role=tree list: holds focus, aria-activedescendant follows the selection
  const anchorRef = useRef(selectedId); // Shift range anchor
  const typed = useRef({ text: '', at: 0 });
  const renameOutcome = useRef(null); // 'commit' (Enter) | 'cancel' (Esc) | null (blur)
  const autoExpand = useRef({ id: null, timer: 0 });
  // New items arrive in rename mode (Scrivener): open the ancestors and edit the title.
  useEffect(() => {
    if (!renameId) return;
    const trail = [];
    const find = (ns, path) => (ns || []).some((n) => (n.id === renameId ? (trail.push(...path), true) : n.children ? find(n.children, [...path, n.id]) : false));
    if (!find(project.tree, [])) { setEditing(null); onRenameDone?.(renameId, false); return; }
    if (trail.length) setCollapsed((c) => ({ ...c, ...Object.fromEntries(trail.map((id) => [id, false])) }));
    setQuery('');
    setEditing(renameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renameId, project.tree]);
  // Keep the keyboard-selected row visible.
  useEffect(() => {
    if (!selectedId || !rootRef.current || !rootRef.current.contains(document.activeElement)) return;
    rootRef.current.querySelector(`[data-node-id="${CSS.escape(selectedId)}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedId]);
  useEffect(() => () => clearTimeout(autoExpand.current.timer), []);
  // Reveal in Binder: open every ancestor of revealId, then scroll its row into view.
  useEffect(() => {
    if (!revealId) return;
    const path = [];
    const find = (ns, trail) => (ns || []).some((n) => {
      if (n.id === revealId) return path.push(...trail), true;
      return n.children ? find(n.children, [...trail, n.id]) : false;
    });
    if (!find(project.tree, [])) return;
    if (path.length) setCollapsed((c) => ({ ...c, ...Object.fromEntries(path.map((id) => [id, false])) }));
    const t = setTimeout(() => {
      const el = rootRef.current?.querySelector(`[data-node-id="${CSS.escape(revealId)}"]`);
      el?.scrollIntoView?.({ block: 'nearest' });
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealId]);
  const setAllCollapsed = (value) => setCollapsed(value ? Object.fromEntries(containerIds(project.tree).filter((id) => !project.tree.some((r) => r.id === id)).map((id) => [id, true])) : {});
  const doDrop = (ids, targetId, pos, copy) => {
    const list = ids.filter((id) => id !== targetId);
    if (!list.length) return;
    if (copy && onCopy) return onCopy(list, targetId, pos);
    if (list.length > 1 && onMoveMany) return onMoveMany(list, targetId, pos);
    // 'after' keeps the original order by inserting in reverse.
    (pos === 'after' ? [...list].reverse() : list).forEach((id) => onMove(id, targetId, pos));
  };
  const renderIcon = (node) => {
    const tint = iconTint(node.iconColor, labelColor[node.label], tintIcons);
    return (
      <span className={`icon ${tint ? 'tinted' : ''}${snapCounts?.[node.id]?.count ? ' has-snapshots' : ''}`} style={tint ? { color: tint, '--icon-tint': tint } : undefined}>
        {iconFor(node, project.templateFolder)}
      </span>
    );
  };
  const [dropHint, setDropHint] = useState(null);
  const [ctx, setCtx] = useState(null); // { x, y, id }
  const findById = (id) => {
    let hit = null;
    const walk = (ns, parent) => (ns || []).some((n) => (n.id === id ? ((hit = { node: n, parent }), true) : walk(n.children, n)));
    walk(project.tree, null);
    return hit;
  };
  // Right-click (or the Menu key / Shift+F10): select the row unless it is already part of the selection.
  const openContext = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (editing) return;
    if (id !== selectedId && !selectedIds.has(id)) select(id);
    let { clientX: x, clientY: y } = e;
    if (!x && !y) {
      const r = rootRef.current?.querySelector(`[data-node-id="${CSS.escape(id)}"]`)?.getBoundingClientRect();
      if (r) [x, y] = [r.left + 24, r.bottom];
    }
    setCtx({ x, y, id });
  };
  const contextItems = (id) => buildBinderContextMenu({
    project, id, selectedIds, tr, templates: templates || [], collections: collections || [], activeCollectionId, filterIds, icons: ICONS,
    callbacks: {
      add: onAdd, ai: onAi, addInside: onAddInside, newFromTemplate: onNewFromTemplate, rename: setEditing, copy: onCopy,
      add: onAdd, addInside: onAddInside, newFromTemplate: onNewFromTemplate, rename: setEditing, copy: onCopy,
      drop: doDrop, trash: onTrash, restore: onRestore, patch: onPatchItems,
      addToCollection: onAddToCollection, newCollection: onNewCollection, removeFromCollection: onRemoveFromCollection,
      convert: onConvert, sortChildren: onSortChildren, group: onGroup, copyLink: onCopyLink,
      snapshot: onSnapshot, duplicate: onDuplicate, showInExplorer: onShowInExplorer,
      quickRef: onQuickRef, select: onSelect, setAllCollapsed, setTemplateFolder: onSetTemplateFolder, emptyTrash: onEmptyTrash,
    },
  });

  const labelColor = useMemo(() => Object.fromEntries(project.labels.map((l) => [l.name, l.color])), [project.labels]);

  const visible = (node) => {
    if (!query) return true;
    if (matches(node, query, docs)) return true;
    return (node.children || []).some(visible);
  };

  const rows = () =>
    filterIds
      ? filterIds.map((id) => ({ id, depth: 0, parentId: null, container: false, open: false }))
      : visibleRows(project.tree, (n) => Boolean(query) || !collapsed[n.id], visible);
  const titleOf = (id) => {
    let t = '';
    const find = (ns) => (ns || []).some((n) => (n.id === id ? ((t = n.title), true) : find(n.children)));
    find(project.tree);
    return t;
  };
  const select = (id, { ctrl = false, shift = false, alt = false } = {}) => {
    if (shift && !ctrl && !alt && onRangeSelect) {
      onRangeSelect(rangeIds(rows(), anchorRef.current || selectedId || id, id), id);
      return;
    }
    if (!ctrl && !alt) anchorRef.current = id;
    onSelect(id, { ctrl, shift, alt });
  };
  // Hovering a closed container during a drag opens it after a short delay (Scrivener).
  const hoverExpand = (node, pos) => {
    const a = autoExpand.current;
    const wants = node.children && node.children.length && collapsed[node.id] && pos === 'inside';
    if (!wants) {
      if (a.id) clearTimeout(a.timer);
      a.id = null;
      return;
    }
    if (a.id === node.id) return;
    clearTimeout(a.timer);
    a.id = node.id;
    a.timer = setTimeout(() => {
      setCollapsed((c) => ({ ...c, [node.id]: false }));
      a.id = null;
    }, 700);
  };

  const dropPosition = (e, node) => {
    const r = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height;
    if ((node.children || node.type === 'text') && y > 0.25 && y < 0.75) return 'inside';
    if (node.root) return 'inside';
    return y < 0.5 ? 'before' : 'after';
  };

  // One title/editor renderer: tree rows and collection rows must behave identically.
  const renderTitle = (node) => (
editing === node.id ? (
            <input
              aria-label={tr('ui.binder.itemTitle')}
              autoFocus
              defaultValue={node.title}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.target.select()}
              onBlur={(e) => {
                const outcome = renameOutcome.current;
                renameOutcome.current = null;
                if (outcome !== 'cancel') onRename(node.id, e.target.value.trim() || node.title);
                setEditing(null);
                onRenameDone?.(node.id, outcome === 'commit');
                // back to the binder after Esc so arrow keys keep working
                if (outcome === 'cancel') setTimeout(() => (treeRef.current || rootRef.current)?.focus(), 0);
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  renameOutcome.current = 'commit';
                  e.target.blur();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  renameOutcome.current = 'cancel';
                  e.target.blur();
                }
              }}
            />
          ) : (
            node.separator ? (
              <span className="title separator-title" title={node.title}>
                <span className="separator-rule" aria-hidden="true" />
                {node.title && <span className="separator-label">{node.title.replace(/^[─—-]+\s*/, '')}</span>}
                <span className="separator-rule" aria-hidden="true" />
              </span>
            ) : <span className={`title ${node.includeInCompile === false ? 'excluded' : ''}`}>
              {node.title}
              {node.locked && <span className="badge" title={tr('ui.binder.blocat_doar_citire')} aria-label={tr('ui.binder.blocat_doar_citire')}><Icon name="lock" size={11} /></span>}
              {node.favorite && <span className="badge" title={tr('ui.binder.favorit')} aria-label={tr('ui.binder.favorit')}><Icon name="star" size={11} /></span>}
            </span>
          )
  );

  const renderNode = (node, depth) => {
    if (!visible(node)) return null;
    const isOpen = query || !collapsed[node.id];
    const hint = dropHint && dropHint.id === node.id ? dropHint.pos : '';
    return (
      <li key={node.id} role="none">
        <div
          role="treeitem"
          id={rowDomId(node.id)}
          aria-level={depth + 1}
          aria-selected={selectedId === node.id || selectedIds.has(node.id)}
          aria-expanded={node.children ? Boolean(isOpen) : undefined}
          aria-label={node.title || tr('ui.app.fara_titlu')}
          className={`binder-row ${selectedId === node.id ? 'selected' : selectedIds.has(node.id) ? 'multi' : ''} ${hint ? `drop-${hint}` : ''} ${node.root ? 'root' : ''} ${hint && copying ? 'drop-copy' : ''} ${node.separator ? 'separator' : ''} ${rowTint(node) ? 'tinted' : ''}`}
          data-node-id={node.id}
          style={{ paddingLeft: 8 + depth * 14, ...(rowTint(node) ? { '--row-tint': rowTint(node) } : null) }}
          draggable={!node.root}
          onDragStart={(e) => {
            const ids = dragIds(node.id, selectedIds);
            setDrag(ids);
            e.dataTransfer.effectAllowed = onCopy ? 'copyMove' : 'move';
            // lets other panes (collection tabs) receive the dragged documents
            try { e.dataTransfer.setData('text/x-pneuma-ids', JSON.stringify(ids)); } catch { /* not supported */ }
          }}
          onDragEnd={() => {
            hoverExpand(node, null);
            setDrag(null);
            setDropHint(null);
            setCopying(false);
          }}
          onDragOver={(e) => {
            if (!drag && keywordDrag(e) && !node.root) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              if (!dropHint || dropHint.id !== node.id || dropHint.pos !== 'keyword') setDropHint({ id: node.id, pos: 'keyword' });
              return;
            }
            if (!drag || drag.includes(node.id)) return;
            e.preventDefault();
            const copy = Boolean(e.altKey && onCopy);
            e.dataTransfer.dropEffect = copy ? 'copy' : 'move';
            setCopying(copy);
            const pos = dropPosition(e, node);
            hoverExpand(node, pos);
            if (!dropHint || dropHint.id !== node.id || dropHint.pos !== pos) setDropHint({ id: node.id, pos });
          }}
          onDragLeave={() => dropHint?.pos === 'keyword' && dropHint.id === node.id && setDropHint(null)}
          onDrop={(e) => {
            e.preventDefault();
            if (!drag && keywordDrag(e) && !node.root) keywordDrop(e, node.id);
            else if (drag) doDrop(drag, node.id, dropPosition(e, node), e.altKey);
            setDrag(null);
            setDropHint(null);
            setCopying(false);
          }}
          onClick={(e) => select(node.id, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey })}
          onDoubleClick={() => runBehaviour(dblMode, node.id, Boolean(node.root))}
          onContextMenu={(e) => openContext(e, node.id)}
        >
          {node.children ? (
            <button
              className="twisty"
              tabIndex={-1}
              aria-hidden="true"
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed((c) => ({ ...c, [node.id]: !c[node.id] }));
              }}
            >
              {isOpen ? '▾' : '▸'}
            </button>
          ) : (
            <span className="twisty" />
          )}
          {renderIcon(node)}
          {labelColor[node.label] && <span className="label-dot" style={{ background: labelColor[node.label] }} />}
          {renderTitle(node)}
        </div>
        {node.children && isOpen && <ul role="group">{node.children.map((c) => renderNode(c, depth + 1))}</ul>}
      </li>
    );
  };

  const selected = selectedId;
  const actionContext = useMemo(() => binderContext({ project, id: selected, selectedIds }), [project.tree, selected, selectedIds]);
  const isRoot = project.tree.some((r) => r.id === selected);

  return (
    <aside
      ref={rootRef}
      className="binder"
      aria-label={tr('ui.binder.binder')}
      onKeyDown={(e) => {
        if (editing || e.target.tagName === 'INPUT') return;
        const mod = e.ctrlKey || e.metaKey;
        const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'outdent', ArrowRight: 'indent' };
        const key = e.key;
        if (mod && e.altKey && !e.shiftKey && (key === 'g' || key === 'G') && onGroup && !filterIds && selected && !isRoot && actionContext?.mutable && actionContext.noneInTrash) {
          e.preventDefault();
          e.stopPropagation();
          onGroup(selectionFor(selected));
        } else if (mod && !e.altKey && !e.shiftKey && map[key]) {
          e.preventDefault();
          if (!filterIds && actionContext?.mutable && actionContext.noneInTrash) onKeyMove(map[key]);
        } else if (mod && !e.altKey && (key === 'z' || key === 'Z' || key === 'y' || key === 'Y')) {
          // Undo / redo of binder structure (Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z)
          e.preventDefault();
          e.stopPropagation();
          onUndo?.(key.toLowerCase() === 'y' || e.shiftKey);
        } else if (!mod && !e.altKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
          e.preventDefault();
          const list = rows();
          const r = binderNav(list, selected, key);
          if (r.expand) setCollapsed((c) => ({ ...c, [r.expand]: false }));
          if (r.collapse) setCollapsed((c) => ({ ...c, [r.collapse]: true }));
          if (r.select) select(r.select, { shift: e.shiftKey && (key === 'ArrowUp' || key === 'ArrowDown' || key === 'Home' || key === 'End') });
        } else if ((key === 'ContextMenu' || (key === 'F10' && e.shiftKey)) && selected) {
          openContext(e, selected);
        } else if (key === 'F2' && selected && !isRoot && actionContext?.mutable && actionContext.noneInTrash && !actionContext.multi) {
          e.preventDefault();
          setEditing(selected);
        } else if ((key === 'Delete' || (key === 'Backspace' && mod)) && !e.altKey && selected && !isRoot && actionContext?.mutable && actionContext.noneInTrash) {
          // Delete / Ctrl+Delete: move the selection to the trash (no confirmation, it is undoable)
          e.preventDefault();
          onTrash();
          setTimeout(() => (treeRef.current || rootRef.current)?.focus(), 0);
        } else if (key === 'Enter' && !mod && enterMode && runBehaviour(enterMode, selected, isRoot)) {
          e.preventDefault();
        } else if (key === 'Escape' && onFocusEditor) {
          e.preventDefault();
          onFocusEditor(selected);
        } else if (!mod && !e.altKey && key.length === 1 && key !== ' ') {
          // type-ahead: jump to the row whose title starts with the typed letters
          const now = Date.now();
          const t = typed.current;
          t.text = now - t.at < 700 ? t.text + key : key;
          t.at = now;
          const hit = typeAhead(rows(), titleOf, selected, t.text);
          if (hit) {
            e.preventDefault();
            select(hit);
          }
        }
      }}
      tabIndex={-1}
    >
      <div className="binder-tools">
        {!actionContext?.inTrash && <button data-command-id="newText" onClick={() => onAdd('text')} title={tr('ui.binder.document_nou_ctrl_n')}>+ Doc</button>}
        {!actionContext?.inTrash && <button data-command-id="newFolder" onClick={() => onAdd('folder')} title={tr('ui.binder.dosar_nou_ctrl_shift_n')}>{tr('ui.binder.dosar')}</button>}
        {actionContext?.mutable && !actionContext.inTrash && !actionContext.multi && <button data-command-id="rename" onClick={() => setEditing(selected)} title={tr('ui.binder.redenumeste_f2_dublu_clic')} aria-label={tr('ui.binder.redenumeste_f2_dublu_clic')}><Icon name="pencil" size={14} /></button>}
        {actionContext?.mutable && actionContext.noneInTrash && <button data-command-id="trash" onClick={() => onTrash()} title={tr('ui.binder.muta_in_cos_selectia')} aria-label={tr('ui.binder.muta_in_cos_selectia')}><Icon name="trash" size={14} /></button>}
        <button data-command-id="expandAll" onClick={() => setAllCollapsed(false)} title={tr('ui.binder.extinde_tot')} aria-label={tr('ui.binder.extinde_tot')}><Icon name="expandAll" size={14} /></button>
        <button data-command-id="collapseAll" onClick={() => setAllCollapsed(true)} title={tr('ui.binder.restrange_tot')} aria-label={tr('ui.binder.restrange_tot')}><Icon name="collapseAll" size={14} /></button>
      </div>
      <input className="search" type="search" aria-label={tr('ui.binder.cauta_in_proiect')} placeholder={tr('ui.binder.cauta_in_proiect')} title={tr('ui.binder.ctrl_shift_clic_selectie_multipla')} value={query} onChange={(e) => setQuery(e.target.value)} />
      {filterIds ? (
        <ul className="tree collection-list" role="listbox" aria-multiselectable="true" tabIndex={0} ref={treeRef} aria-activedescendant={selected && filterIds.includes(selected) ? rowDomId(selected) : undefined} aria-label={tr('ui.binder.colectia_x', { filterTitle: filterTitle })}>
          {filterIds.length === 0 && <li className="muted" role="presentation">{tr('ui.binder.colectia_e_goala')}</li>}
          {filterIds.map((id) => {
            let node = null;
            const find = (ns) => ns.forEach((n) => {
              if (n.id === id) node = n;
              if (n.children) find(n.children);
            });
            find(project.tree);
            if (!node) return null;
            return (
              <li key={id} role="none">
                <div
                  role="option"
                  id={rowDomId(id)}
                  aria-selected={selectedId === id || selectedIds.has(id)}
                  className={`binder-row ${selectedId === id ? 'selected' : selectedIds.has(id) ? 'multi' : ''} ${rowTint(node) ? 'tinted' : ''} ${dropHint && dropHint.id === id && dropHint.pos === 'keyword' ? 'drop-keyword' : ''}`}
                  style={rowTint(node) ? { '--row-tint': rowTint(node) } : undefined}
                  data-node-id={id}
                  onDragOver={(e) => {
                    if (!keywordDrag(e)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    if (!dropHint || dropHint.id !== id) setDropHint({ id, pos: 'keyword' });
                  }}
                  onDragLeave={() => setDropHint(null)}
                  onDrop={(e) => {
                    if (!keywordDrag(e)) return;
                    e.preventDefault();
                    keywordDrop(e, id);
                    setDropHint(null);
                  }}
                  onClick={(e) => select(id, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey })}
                  onContextMenu={(e) => openContext(e, id)}
                  onDoubleClick={(e) => { if (e.target.tagName === 'INPUT') return; e.preventDefault(); e.stopPropagation(); runBehaviour(dblMode, id, Boolean(node.root)); }}
                >
                  {renderIcon(node)}
                  {labelColor[node.label] && <span className="label-dot" style={{ background: labelColor[node.label] }} />}
                  {renderTitle(node)}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul
          className="tree"
          role="tree"
          ref={treeRef}
          tabIndex={0}
          aria-label={tr('ui.binder.binder')}
          aria-multiselectable="true"
          aria-activedescendant={selected ? rowDomId(selected) : undefined}
        >
          {project.tree.map((n) => renderNode(n, 0))}
        </ul>
      )}
      {ctx && <ContextMenu x={ctx.x} y={ctx.y} title={binderContextTitle(binderContext({ project, id: ctx.id, selectedIds }), tr)} items={contextItems(ctx.id)} onClose={() => setCtx(null)} />}
    </aside>
  );
}
