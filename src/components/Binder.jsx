import React, { useEffect, useMemo, useRef, useState } from 'react';
import { containerIds, dragIds, iconTint } from '../lib/panelsExtra.js';
import { binderNav, rangeIds, typeAhead, visibleRows } from '../lib/tree.js';
import { DocumentIcon, DraftIcon, FolderIcon, ResearchIcon, TrashIcon } from './Icons.jsx';

function iconFor(node) {
  if (node.root === 'trash') return <TrashIcon />;
  if (node.root === 'draft') return <DraftIcon />;
  if (node.root === 'research') return <ResearchIcon />;
  // Custom icon chosen in the Inspector (an emoji); Scrivener icon names fall through.
  if (node.icon && /\p{Extended_Pictographic}/u.test(node.icon)) return node.icon;
  if (node.type === 'file') {
    const mime = node.media?.mime || '';
    if (mime.startsWith('image/')) return '🖼';
    if (mime === 'application/pdf') return '📕';
    if (mime.startsWith('audio/')) return '🎵';
    if (mime.startsWith('video/')) return '🎬';
    return '📎';
  }
  if (node.children && node.type !== 'folder') return '📑';
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

export default function Binder({ project, docs, selectedId, selectedIds, onSelect, onAdd, onRename, onMove, onTrash, onEmptyTrash, onKeyMove, filterIds = null, filterTitle = '', binderEnter = null, binderDoubleClick = 'rename', onOpenItem, onQuickRef, onCopy, onMoveMany, labelTintIcons, revealId = null, onUndo, renameId = null, onRenameDone, onFocusEditor, onRangeSelect }) {
  const tintIcons = labelTintIcons ?? Boolean(project.labelTintIcons);
  // Behaviours from Options: Enter = 'rename' | 'newDoc' | 'open' ('edit' = 'open');
  // double-click = 'rename' | 'quickRef' | 'open' ('openQuickRef' = 'quickRef').
  const enterMode = binderEnter === 'edit' ? 'open' : binderEnter;
  const dblMode = binderDoubleClick === 'openQuickRef' ? 'quickRef' : binderDoubleClick || 'rename';
  const runBehaviour = (mode, id, isRootNode) => {
    if (!id) return false;
    if (mode === 'rename') {
      if (isRootNode) return false;
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
  const anchorRef = useRef(selectedId); // Shift range anchor
  const typed = useRef({ text: '', at: 0 });
  const renameOutcome = useRef(null); // 'commit' (Enter) | 'cancel' (Esc) | null (blur)
  const autoExpand = useRef({ id: null, timer: 0 });
  // New items arrive in rename mode (Scrivener): open the ancestors and edit the title.
  useEffect(() => {
    if (!renameId) return;
    const trail = [];
    const find = (ns, path) => (ns || []).some((n) => (n.id === renameId ? (trail.push(...path), true) : n.children ? find(n.children, [...path, n.id]) : false));
    find(project.tree, []);
    if (trail.length) setCollapsed((c) => ({ ...c, ...Object.fromEntries(trail.map((id) => [id, false])) }));
    setQuery('');
    setEditing(renameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renameId]);
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
      <span className={`icon ${tint ? 'tinted' : ''}`} style={tint ? { color: tint, '--icon-tint': tint } : undefined}>
        {iconFor(node)}
      </span>
    );
  };
  const [dropHint, setDropHint] = useState(null);

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

  const renderNode = (node, depth) => {
    if (!visible(node)) return null;
    const isOpen = query || !collapsed[node.id];
    const hint = dropHint && dropHint.id === node.id ? dropHint.pos : '';
    return (
      <li key={node.id}>
        <div
          className={`binder-row ${selectedId === node.id ? 'selected' : selectedIds.has(node.id) ? 'multi' : ''} ${hint ? `drop-${hint}` : ''} ${node.root ? 'root' : ''} ${hint && copying ? 'drop-copy' : ''} ${node.separator ? 'separator' : ''}`}
          data-node-id={node.id}
          style={{ paddingLeft: 8 + depth * 14 }}
          draggable={!node.root}
          onDragStart={(e) => {
            setDrag(dragIds(node.id, selectedIds));
            e.dataTransfer.effectAllowed = onCopy ? 'copyMove' : 'move';
          }}
          onDragEnd={() => {
            hoverExpand(node, null);
            setDrag(null);
            setDropHint(null);
            setCopying(false);
          }}
          onDragOver={(e) => {
            if (!drag || drag.includes(node.id)) return;
            e.preventDefault();
            const copy = Boolean(e.altKey && onCopy);
            e.dataTransfer.dropEffect = copy ? 'copy' : 'move';
            setCopying(copy);
            const pos = dropPosition(e, node);
            hoverExpand(node, pos);
            if (!dropHint || dropHint.id !== node.id || dropHint.pos !== pos) setDropHint({ id: node.id, pos });
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (drag) doDrop(drag, node.id, dropPosition(e, node), e.altKey);
            setDrag(null);
            setDropHint(null);
            setCopying(false);
          }}
          onClick={(e) => select(node.id, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey })}
          onDoubleClick={() => runBehaviour(dblMode, node.id, Boolean(node.root))}
        >
          {node.children ? (
            <button
              className="twisty"
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
          {editing === node.id ? (
            <input
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
                if (outcome === 'cancel') setTimeout(() => rootRef.current?.focus(), 0);
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
              {node.locked && <span className="badge" title="Blocat (doar citire)"> 🔒</span>}
              {node.favorite && <span className="badge" title="Favorit"> ★</span>}
            </span>
          )}
        </div>
        {node.children && isOpen && <ul>{node.children.map((c) => renderNode(c, depth + 1))}</ul>}
      </li>
    );
  };

  const selected = selectedId;
  const isRoot = project.tree.some((r) => r.id === selected);

  return (
    <aside
      ref={rootRef}
      className="binder"
      onKeyDown={(e) => {
        if (editing || e.target.tagName === 'INPUT') return;
        const mod = e.ctrlKey || e.metaKey;
        const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'outdent', ArrowRight: 'indent' };
        const key = e.key;
        if (mod && !e.altKey && !e.shiftKey && map[key]) {
          e.preventDefault();
          if (!filterIds) onKeyMove(map[key]);
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
        } else if (key === 'F2' && selected && !isRoot) {
          e.preventDefault();
          setEditing(selected);
        } else if ((key === 'Delete' || (key === 'Backspace' && mod)) && !e.altKey && selected && !isRoot) {
          // Delete / Ctrl+Delete: move the selection to the trash (no confirmation, it is undoable)
          e.preventDefault();
          onTrash();
          setTimeout(() => rootRef.current?.focus(), 0);
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
        <button onClick={() => onAdd('text')} title="Document nou (Ctrl+N)">+ Doc</button>
        <button onClick={() => onAdd('folder')} title="Dosar nou (Ctrl+Shift+N)">+ Dosar</button>
        <button disabled={!selected || isRoot} onClick={() => setEditing(selected)} title="Redenumește (F2 / dublu-clic)">✎</button>
        <button disabled={!selected || isRoot} onClick={() => onTrash()} title="Mută în coș (selecția)">🗑</button>
        <button onClick={() => setAllCollapsed(false)} title="Extinde tot">⊞</button>
        <button onClick={() => setAllCollapsed(true)} title="Restrânge tot">⊟</button>
      </div>
      <input className="search" type="search" placeholder="Caută în proiect…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p className="tip">Ctrl/Shift+clic: selecție multiplă · Alt+clic: panoul 2 · săgeți: navighează · Ctrl+săgeți: mută · F2: redenumește · Del: în coș · Ctrl+Z: anulează · Alt+tragere: copiază</p>
      {filterIds ? (
        <ul className="tree collection-list" aria-label={`Colecția ${filterTitle}`}>
          {filterIds.length === 0 && <li className="muted">Colecția e goală.</li>}
          {filterIds.map((id) => {
            let node = null;
            const find = (ns) => ns.forEach((n) => {
              if (n.id === id) node = n;
              if (n.children) find(n.children);
            });
            find(project.tree);
            if (!node) return null;
            return (
              <li key={id}>
                <div
                  className={`binder-row ${selectedId === id ? 'selected' : selectedIds.has(id) ? 'multi' : ''}`}
                  data-node-id={id}
                  onClick={(e) => select(id, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey })}
                >
                  {renderIcon(node)}
                  {labelColor[node.label] && <span className="label-dot" style={{ background: labelColor[node.label] }} />}
                  <span className="title">{node.title}</span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="tree">{project.tree.map((n) => renderNode(n, 0))}</ul>
      )}
      <button className="link" onClick={onEmptyTrash}>Golește coșul</button>
    </aside>
  );
}
