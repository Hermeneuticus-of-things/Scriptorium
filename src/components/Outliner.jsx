import React, { useMemo, useState } from 'react';

// Columns the outline can show (Scrivener: Outliner > Columns).
const BASE_COLUMNS = [
  { id: 'synopsis', label: 'Sinopsis' },
  { id: 'label', label: 'Etichetă' },
  { id: 'status', label: 'Status' },
  { id: 'keywords', label: 'Cuvinte cheie' },
  { id: 'sectionType', label: 'Tip secțiune' },
  { id: 'include', label: 'În Compile' },
  { id: 'words', label: 'Cuvinte', num: true },
  { id: 'total', label: 'Total cuvinte', num: true },
  { id: 'target', label: 'Țintă', num: true },
  { id: 'progress', label: 'Progres' },
  { id: 'created', label: 'Creat' },
  { id: 'modified', label: 'Modificat' },
];
const DEFAULT_COLUMNS = ['synopsis', 'label', 'status', 'include', 'words'];

function loadColumns() {
  try {
    return JSON.parse(localStorage.getItem('scribner-outline-columns')) || DEFAULT_COLUMNS;
  } catch {
    return DEFAULT_COLUMNS;
  }
}

export default function Outliner({ project, root, counts, onOpen, onPatch, onMove }) {
  const [columns, setColumns] = useState(loadColumns);
  const [collapsed, setCollapsed] = useState({});
  const [sort, setSort] = useState(null); // {col, dir}
  const [drag, setDrag] = useState(null);
  const [editing, setEditing] = useState(null);
  const fields = project.customFields || [];
  const allColumns = [...BASE_COLUMNS, ...fields.map((f) => ({ id: `custom:${f.title}`, label: f.title }))];

  const saveColumns = (next) => {
    setColumns(next);
    try {
      localStorage.setItem('scribner-outline-columns', JSON.stringify(next));
    } catch {
      /* not critical */
    }
  };

  const total = (n) => (counts[n.id] || 0) + (n.children || []).reduce((s, c) => s + total(c), 0);
  const value = (n, col) => {
    if (col === 'words') return counts[n.id] || 0;
    if (col === 'total') return total(n);
    if (col === 'target') return n.target || 0;
    if (col === 'progress') return n.target ? Math.min(1, (counts[n.id] || 0) / n.target) : -1;
    if (col === 'keywords') return (n.keywords || []).join(', ');
    if (col === 'include') return n.includeInCompile !== false ? 1 : 0;
    if (col.startsWith('custom:')) return String((n.custom || {})[col.slice(7)] ?? '');
    return n[col] || '';
  };

  const rows = useMemo(() => {
    const out = [];
    const visit = (nodes, depth) => {
      let list = nodes;
      if (sort) {
        list = [...nodes].sort((a, b) => {
          const va = value(a, sort.col);
          const vb = value(b, sort.col);
          const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'ro', { numeric: true });
          return sort.dir === 'asc' ? r : -r;
        });
      }
      for (const n of list) {
        out.push({ n, depth });
        if (n.children && !collapsed[n.id]) visit(n.children, depth + 1);
      }
    };
    visit(root.children || [], 0);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, collapsed, sort, counts]);

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('ro-RO') : '');
  const setAll = (open) => {
    const next = {};
    const walk = (nodes) => nodes.forEach((n) => {
      if (n.children) {
        next[n.id] = !open;
        walk(n.children);
      }
    });
    walk(root.children || []);
    setCollapsed(next);
  };

  const cell = (n, col) => {
    switch (col) {
      case 'synopsis':
        return (
          <textarea
            className="cell-edit"
            rows={1}
            defaultValue={n.synopsis || ''}
            onBlur={(e) => e.target.value !== (n.synopsis || '') && onPatch(n.id, { synopsis: e.target.value })}
          />
        );
      case 'label':
        return (
          <select value={n.label} onChange={(e) => onPatch(n.id, { label: e.target.value })}>
            {project.labels.map((l) => (
              <option key={l.name}>{l.name}</option>
            ))}
          </select>
        );
      case 'status':
        return (
          <select value={n.status} onChange={(e) => onPatch(n.id, { status: e.target.value })}>
            {project.statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        );
      case 'include':
        return <input type="checkbox" checked={n.includeInCompile !== false} onChange={(e) => onPatch(n.id, { includeInCompile: e.target.checked })} />;
      case 'words':
      case 'total':
        return value(n, col).toLocaleString('ro-RO');
      case 'target':
        return (
          <input
            className="cell-num"
            type="number"
            min="0"
            step="100"
            defaultValue={n.target || ''}
            onBlur={(e) => Number(e.target.value || 0) !== (n.target || 0) && onPatch(n.id, { target: Number(e.target.value) || 0 })}
          />
        );
      case 'progress': {
        const v = value(n, col);
        return v < 0 ? '' : <meter min="0" max="1" value={v} title={`${Math.round(v * 100)}%`} />;
      }
      case 'created':
      case 'modified':
        return fmtDate(n[col]);
      default:
        return value(n, col);
    }
  };

  const shown = allColumns.filter((c) => columns.includes(c.id));
  const sumTotal = (root.children || []).reduce((s, c) => s + total(c), 0);

  return (
    <div className="outliner">
      <div className="outline-head">
        <h2>{root.title}</h2>
        <span className="muted">{sumTotal.toLocaleString('ro-RO')} cuvinte</span>
        <span className="spacer" />
        <button onClick={() => setAll(true)}>Extinde tot</button>
        <button onClick={() => setAll(false)}>Restrânge tot</button>
        {sort && <button onClick={() => setSort(null)} title="Revino la ordinea din binder">Ordinea din binder</button>}
        <details className="col-chooser">
          <summary>Coloane</summary>
          <div className="col-list">
            {allColumns.map((c) => (
              <label key={c.id} className="check">
                <input
                  type="checkbox"
                  checked={columns.includes(c.id)}
                  onChange={(e) => saveColumns(e.target.checked ? [...columns, c.id] : columns.filter((x) => x !== c.id))}
                />
                {c.label}
              </label>
            ))}
          </div>
        </details>
      </div>
      <table>
        <thead>
          <tr>
            <th onClick={() => setSort(sort && sort.col === 'title' && sort.dir === 'asc' ? { col: 'title', dir: 'desc' } : { col: 'title', dir: 'asc' })}>
              Titlu {sort?.col === 'title' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
            </th>
            {shown.map((c) => (
              <th key={c.id} className={c.num ? 'num' : ''} onClick={() => setSort(sort && sort.col === c.id && sort.dir === 'asc' ? { col: c.id, dir: 'desc' } : { col: c.id, dir: 'asc' })}>
                {c.label} {sort?.col === c.id ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ n, depth }) => (
            <tr
              key={n.id}
              draggable={!sort}
              onDragStart={() => setDrag(n.id)}
              onDragOver={(e) => drag && drag !== n.id && e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (drag && drag !== n.id) {
                  const r = e.currentTarget.getBoundingClientRect();
                  onMove(drag, n.id, e.clientY - r.top < r.height / 2 ? 'before' : 'after');
                }
                setDrag(null);
              }}
              className={drag === n.id ? 'dragging' : ''}
            >
              <td style={{ paddingLeft: 8 + depth * 16 }} className="title-cell">
                {n.children ? (
                  <button className="twisty" onClick={() => setCollapsed((c) => ({ ...c, [n.id]: !c[n.id] }))}>
                    {collapsed[n.id] ? '▸' : '▾'}
                  </button>
                ) : (
                  <span className="twisty" />
                )}
                {editing === n.id ? (
                  <input
                    autoFocus
                    defaultValue={n.title}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value !== n.title) onPatch(n.id, { title: e.target.value.trim() });
                      setEditing(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur();
                      if (e.key === 'Escape') setEditing(null);
                    }}
                  />
                ) : (
                  <button className="link" onClick={() => onOpen(n.id)} onDoubleClick={() => setEditing(n.id)} title="Clic: deschide · Dublu-clic: redenumește">
                    {n.children ? '📁 ' : ''}
                    {n.title}
                  </button>
                )}
              </td>
              {shown.map((c) => (
                <td key={c.id} className={`${c.num ? 'num' : ''} ${c.id === 'synopsis' ? 'syn' : ''}`}>{cell(n, c.id)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
