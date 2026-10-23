import React, { useMemo, useState } from 'react';

function iconFor(node) {
  if (node.root === 'trash') return '🗑';
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
  return node.children ? '📁' : '📄';
}

function matches(node, query, docs) {
  if (!query) return true;
  const q = query.toLocaleLowerCase('ro');
  if (node.title.toLocaleLowerCase('ro').includes(q)) return true;
  if ((node.synopsis || '').toLocaleLowerCase('ro').includes(q)) return true;
  if ((node.keywords || []).some((k) => k.toLocaleLowerCase('ro').includes(q))) return true;
  return (docs[node.id] || '').replace(/<[^>]+>/g, ' ').toLocaleLowerCase('ro').includes(q);
}

export default function Binder({ project, docs, selectedId, selectedIds, onSelect, onAdd, onRename, onMove, onTrash, onEmptyTrash, onKeyMove, width }) {
  const [collapsed, setCollapsed] = useState({});
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [drag, setDrag] = useState(null);
  const [dropHint, setDropHint] = useState(null);

  const labelColor = useMemo(() => Object.fromEntries(project.labels.map((l) => [l.name, l.color])), [project.labels]);

  const visible = (node) => {
    if (!query) return true;
    if (matches(node, query, docs)) return true;
    return (node.children || []).some(visible);
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
          className={`binder-row ${selectedId === node.id ? 'selected' : selectedIds.has(node.id) ? 'multi' : ''} ${hint ? `drop-${hint}` : ''} ${node.root ? 'root' : ''}`}
          style={{ paddingLeft: 8 + depth * 14 }}
          draggable={!node.root}
          onDragStart={(e) => {
            setDrag(node.id);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={() => {
            setDrag(null);
            setDropHint(null);
          }}
          onDragOver={(e) => {
            if (!drag || drag === node.id) return;
            e.preventDefault();
            setDropHint({ id: node.id, pos: dropPosition(e, node) });
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (drag) onMove(drag, node.id, dropPosition(e, node));
            setDrag(null);
            setDropHint(null);
          }}
          onClick={(e) => onSelect(node.id, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey })}
          onDoubleClick={() => !node.root && setEditing(node.id)}
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
          <span className="icon">{iconFor(node)}</span>
          {labelColor[node.label] && <span className="label-dot" style={{ background: labelColor[node.label] }} />}
          {editing === node.id ? (
            <input
              autoFocus
              defaultValue={node.title}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                onRename(node.id, e.target.value.trim() || node.title);
                setEditing(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.target.blur();
                if (e.key === 'Escape') setEditing(null);
              }}
            />
          ) : (
            <span className={`title ${node.includeInCompile === false ? 'excluded' : ''}`}>
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
      className="binder"
      style={{ width }}
      onKeyDown={(e) => {
        if (editing || e.target.tagName === 'INPUT') return;
        const mod = e.ctrlKey || e.metaKey;
        const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'outdent', ArrowRight: 'indent' };
        if (mod && map[e.key]) {
          e.preventDefault();
          onKeyMove(map[e.key]);
        } else if (e.key === 'F2' && selected && !isRoot) {
          setEditing(selected);
        }
      }}
      tabIndex={-1}
    >
      <div className="binder-tools">
        <button onClick={() => onAdd('text')} title="Document nou (Ctrl+N)">+ Doc</button>
        <button onClick={() => onAdd('folder')} title="Dosar nou (Ctrl+Shift+N)">+ Dosar</button>
        <button disabled={!selected || isRoot} onClick={() => setEditing(selected)} title="Redenumește (F2 / dublu-clic)">✎</button>
        <button disabled={!selected || isRoot} onClick={() => onTrash()} title="Mută în coș (selecția)">🗑</button>
      </div>
      <input className="search" type="search" placeholder="Caută în proiect…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p className="tip">Ctrl/Shift+clic: selecție multiplă · Alt+clic: deschide în panoul 2 · Ctrl+săgeți: mută</p>
      <ul className="tree">{project.tree.map((n) => renderNode(n, 0))}</ul>
      <button className="link" onClick={onEmptyTrash}>Golește coșul</button>
    </aside>
  );
}
