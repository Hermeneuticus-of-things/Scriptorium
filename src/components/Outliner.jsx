import React, { useEffect, useMemo, useRef, useState } from 'react';
import { binderNav } from '../lib/tree.js';
import { htmlToText } from '../lib/text.js';
import { DocumentIcon, FolderIcon } from './Icons.jsx';
import { t, uiLocale } from '../lib/i18n.js';
import { labelTint } from '../lib/settingsDefaults.js';
import { labelTitleOf, noneLabel, noneStatus, statusTitleOf } from '../lib/projectSettings.js';

// Columns the outline can show (Scrivener: Outliner > Columns).
const BASE_COLUMNS = (project) => ([
  { id: 'synopsis', label: t('ui.advancedSearchDialog.sinopsis') },
  { id: 'label', label: labelTitleOf(project, t) },
  { id: 'status', label: statusTitleOf(project, t) },
  { id: 'keywords', label: t('ui.advancedSearchDialog.cuvinte_cheie') },
  { id: 'sectionType', label: t('ui.inspector.tip_sectiune') },
  { id: 'include', label: t('ui.outliner.in_compile') },
  { id: 'words', label: t('ui.outliner.cuvinte'), num: true },
  { id: 'total', label: t('ui.outliner.total_cuvinte'), num: true },
  { id: 'chars', label: t('ui.historyDialog.caractere'), num: true },
  { id: 'target', label: t('ui.inspector.tinta'), num: true },
  { id: 'progress', label: t('ui.common.progres') },
  { id: 'created', label: t('ui.common.creat') },
  { id: 'modified', label: t('ui.common.modificat') },
]);
// The synopsis shows under the title by default; its own column stays available.
export const DEFAULT_COLUMNS = ['label', 'status'];

function loadShowSynopsis() {
  try {
    return localStorage.getItem('scribner-outline-synopsis') !== 'off';
  } catch {
    return true;
  }
}

function loadColumns() {
  try {
    return JSON.parse(localStorage.getItem('scribner-outline-columns')) || DEFAULT_COLUMNS;
  } catch {
    return DEFAULT_COLUMNS;
  }
}

// charCounts {id: n} or docs {id: html} (optional) feed the Characters column.
export default function Outliner({ project, root, counts, onOpen, onPatch, onMove, charCounts = null, docs = null, labelColorIn = null, onSelectItem, enterMode = 'edit', tabMode = 'indent', onAddAfter }) {
  const [showSynopsis, setShowSynopsis] = useState(loadShowSynopsis);
  const toggleSynopsis = (on) => {
    setShowSynopsis(on);
    try {
      localStorage.setItem('scribner-outline-synopsis', on ? 'on' : 'off');
    } catch {
      /* not critical */
    }
  };
  const labelColors = Object.fromEntries((project.labels || []).map((l) => [l.name, l.color]));
  const rowTint = (n) => (labelColorIn?.outliner && n.label ? labelTint(labelColors[n.label]) : '');
  const charsOf = (n) => (charCounts ? charCounts[n.id] || 0 : docs && docs[n.id] ? htmlToText(docs[n.id]).length : 0);
  const [columns, setColumns] = useState(loadColumns);
  const [collapsed, setCollapsed] = useState({});
  const [sort, setSort] = useState(null); // {col, dir}
  const [drag, setDrag] = useState(null);
  const [editing, setEditing] = useState(null);
  const [sel, setSel] = useState(null);
  // Options › Navigation: the chosen row is shown in the binder too.
  useEffect(() => {
    if (sel) onSelectItem?.(sel);
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  const [dropHint, setDropHint] = useState(null);
  const bodyRef = useRef(null);
  const fields = project.customFields || [];
  const allColumns = [...BASE_COLUMNS(project), ...fields.map((f) => ({ id: `custom:${f.title}`, label: f.title }))];

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
    if (col === 'chars') return charsOf(n);
    if (col === 'target') return n.target || 0;
    if (col === 'progress') return n.target ? Math.min(1, (counts[n.id] || 0) / n.target) : -1;
    if (col === 'keywords') return (n.keywords || []).join(', ');
    if (col === 'include') return n.includeInCompile !== false ? 1 : 0;
    // Label and status sort in the project's own list order, not alphabetically.
    if (col === 'label') return (project.labels || []).findIndex((l) => l.name === n.label);
    if (col === 'status') return (project.statuses || []).indexOf(n.status);
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
  }, [root, collapsed, sort, counts, charCounts, docs]);

  const focusRow = (id) => setTimeout(() => bodyRef.current?.querySelector(`tr[data-row-id="${CSS.escape(id)}"]`)?.focus(), 0);
  // Keyboard on a focused row: ↑/↓/Home/End move, ←/→ collapse/expand, Enter / F2 edit the
  // title, Ctrl+Enter opens the document (Scrivener outliner).
  const onRowKey = (e, n) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onOpen(n.id);
      return;
    }
    // Options › Navigation: Enter adds a row after this one, or edits the title (F2 always edits).
    if (e.key === 'Enter' && !e.shiftKey && enterMode === 'newRow' && onAddAfter) {
      e.preventDefault();
      const node = onAddAfter(n.id);
      if (node?.id) {
        setEditing(node.id);
        setSel(node.id);
      }
      return;
    }
    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      setEditing(n.id);
      return;
    }
    // Tab moves the row right (into the row above), Shift+Tab back out to the parent's level.
    if (e.key === 'Tab' && tabMode === 'indent' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const i = rows.findIndex((r) => r.n.id === n.id);
      const depth = rows[i]?.depth ?? 0;
      if (e.shiftKey) {
        const parent = [...rows.slice(0, i)].reverse().find((r) => r.depth < depth);
        if (!parent) return;
        e.preventDefault();
        onMove(n.id, parent.n.id, 'after');
      } else {
        const prev = [...rows.slice(0, i)].reverse().find((r) => r.depth === depth);
        if (!prev || prev.n.type === 'file') return;
        e.preventDefault();
        onMove(n.id, prev.n.id, 'inside');
      }
      focusRow(n.id);
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const list = rows.map(({ n: x }) => ({ id: x.id, parentId: null, container: Boolean(x.children && x.children.length), open: Boolean(x.children) && !collapsed[x.id] }));
    // parent ids for ← on a closed row
    const parents = {};
    const stack = [];
    rows.forEach(({ n: x, depth }) => {
      stack[depth] = x.id;
      parents[x.id] = depth ? stack[depth - 1] : null;
    });
    list.forEach((r) => (r.parentId = parents[r.id]));
    const r = binderNav(list, n.id, e.key);
    if (!r.select && !r.expand && !r.collapse) return;
    e.preventDefault();
    if (r.expand) setCollapsed((c) => ({ ...c, [r.expand]: false }));
    if (r.collapse) setCollapsed((c) => ({ ...c, [r.collapse]: true }));
    if (r.select) {
      setSel(r.select);
      focusRow(r.select);
    }
  };

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(uiLocale()) : '');
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
            aria-label={cellLabel(n, col)}
            key={n.synopsis || ''}
            defaultValue={n.synopsis || ''}
            onBlur={(e) => e.target.value !== (n.synopsis || '') && onPatch(n.id, { synopsis: e.target.value })}
          />
        );
      case 'label':
        return (
          <select aria-label={cellLabel(n, col)} value={n.label} onChange={(e) => onPatch(n.id, { label: e.target.value })}>
            {project.labels.map((l) => (
              <option key={l.name} value={l.name}>{noneLabel(l.name, t)}</option>
            ))}
          </select>
        );
      case 'status':
        return (
          <select aria-label={cellLabel(n, col)} value={n.status} onChange={(e) => onPatch(n.id, { status: e.target.value })}>
            {project.statuses.map((s) => (
              <option key={s} value={s}>{noneStatus(s, t)}</option>
            ))}
          </select>
        );
      case 'include':
        return <input type="checkbox" aria-label={cellLabel(n, col)} checked={n.includeInCompile !== false} onChange={(e) => onPatch(n.id, { includeInCompile: e.target.checked })} />;
      case 'words':
      case 'total':
      case 'chars':
        return value(n, col).toLocaleString(uiLocale());
      case 'target':
        return (
          <input
            className="cell-num"
            aria-label={cellLabel(n, col)}
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

  // Sortable column header: clickable and keyboard operable, exposes the sort to assistive tech.
  const sortHeader = (col) => {
    const toggle = () => setSort(sort && sort.col === col && sort.dir === 'asc' ? { col, dir: 'desc' } : { col, dir: 'asc' });
    return {
      tabIndex: 0,
      'aria-sort': sort?.col === col ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none',
      onClick: toggle,
      onKeyDown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      },
    };
  };
  const cellLabel = (n, col) => `${(allColumns.find((c) => c.id === col) || {}).label || col}: ${n.title || ''}`;
  const shown = allColumns.filter((c) => columns.includes(c.id));
  const sumTotal = (root.children || []).reduce((s, c) => s + total(c), 0);

  return (
    <div className="outliner">
      <div className="outline-head">
        <h2>{root.title}</h2>
        <span className="muted">{sumTotal.toLocaleString(uiLocale())} {t('ui.inspector.cuvinte')}</span>
        <span className="spacer" />
        <button onClick={() => setAll(true)}>{t('ui.binder.extinde_tot')}</button>
        <button onClick={() => setAll(false)}>{t('ui.binder.restrange_tot')}</button>
        {sort && <button onClick={() => setSort(null)} title={t('ui.outliner.revino_la_ordinea_din_binder')}>{t('ui.outliner.ordinea_din_binder')}</button>}
        <details className="col-chooser">
          <summary>Coloane</summary>
          <div className="col-list">
            <label className="check">
              <input type="checkbox" checked={showSynopsis} onChange={(e) => toggleSynopsis(e.target.checked)} />
              {t('ui.outliner.arata_sinopsisul')}
            </label>
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
      <table role="treegrid" aria-label={t('ui.outliner.outline_x', { title: root.title || '' })} aria-rowcount={rows.length + 1}>
        <thead>
          <tr>
            <th scope="col" {...sortHeader('title')}>
              {t('ui.advancedSearchDialog.titlu')} {sort?.col === 'title' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
            </th>
            {shown.map((c) => (
              <th key={c.id} scope="col" className={c.num ? 'num' : ''} {...sortHeader(c.id)}>
                {c.label} {sort?.col === c.id ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={bodyRef}>
          {rows.length === 0 && (
            <tr>
              <td colSpan={shown.length + 1} className="muted">„{root.title}{t('ui.outliner.nu_are_sub_documente_selecteaza')}</td>
            </tr>
          )}
          {rows.map(({ n, depth }) => (
            <tr
              key={n.id}
              draggable={!sort}
              data-row-id={n.id}
              tabIndex={0}
              aria-selected={sel === n.id}
              aria-level={depth + 1}
              aria-expanded={n.children ? !collapsed[n.id] : undefined}
              onFocus={(e) => e.target === e.currentTarget && setSel(n.id)}
              onMouseDown={(e) => !e.target.closest('input, textarea, select') && setSel(n.id)}
              onKeyDown={(e) => onRowKey(e, n)}
              onDoubleClick={(e) => !e.target.closest('input, textarea, select, .twisty') && onOpen(n.id)}
              onDragStart={(e) => {
                setDrag(n.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                setDrag(null);
                setDropHint(null);
              }}
              onDragOver={(e) => {
                if (!drag || drag === n.id) return;
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                const pos = e.clientY - r.top < r.height / 2 ? 'before' : 'after';
                if (!dropHint || dropHint.id !== n.id || dropHint.pos !== pos) setDropHint({ id: n.id, pos });
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (drag && drag !== n.id) {
                  const r = e.currentTarget.getBoundingClientRect();
                  onMove(drag, n.id, e.clientY - r.top < r.height / 2 ? 'before' : 'after');
                }
                setDrag(null);
                setDropHint(null);
              }}
              className={`${drag === n.id ? 'dragging' : ''} ${sel === n.id ? 'selected' : ''} ${dropHint && dropHint.id === n.id ? `drop-${dropHint.pos}` : ''} ${rowTint(n) ? 'tinted' : ''}`}
              style={{
                ...(rowTint(n) ? { '--row-tint': rowTint(n) } : null),
                ...(dropHint && dropHint.id === n.id ? { boxShadow: `inset 0 ${dropHint.pos === 'before' ? 2 : -2}px 0 var(--accent, #3b82f6)` } : null),
              }}
            >
              <td style={{ paddingLeft: 8 + depth * 16 }} className="title-cell">
                {n.children ? (
                  <button className="twisty" tabIndex={-1} aria-label={collapsed[n.id] ? t('ui.outliner.extinde') : t('ui.outliner.restrange')} onClick={() => setCollapsed((c) => ({ ...c, [n.id]: !c[n.id] }))}>
                    {collapsed[n.id] ? '▸' : '▾'}
                  </button>
                ) : (
                  <span className="twisty" />
                )}
                {editing === n.id ? (
                  <input
                    autoFocus
                    defaultValue={n.title}
                    onFocus={(e) => e.target.select()}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value !== n.title) onPatch(n.id, { title: e.target.value.trim() });
                      setEditing(null);
                      focusRow(n.id);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') e.target.blur();
                      if (e.key === 'Escape') {
                        e.target.value = n.title;
                        e.target.blur();
                      }
                    }}
                  />
                ) : (
                  <button className="link" tabIndex={-1} onClick={() => { setSel(n.id); focusRow(n.id); }} onDoubleClick={(e) => { e.stopPropagation(); onOpen(n.id); }} title={t('ui.outliner.clic_selecteaza_dublu_clic_deschide')}>
                    {n.children ? <FolderIcon /> : <DocumentIcon />}
                    {n.title}
                  </button>
                )}
                {showSynopsis && !columns.includes('synopsis') && (n.synopsis || sel === n.id) && (
                  <textarea
                    className="outline-syn"
                    rows={1}
                    aria-label={cellLabel(n, 'synopsis')}
                    placeholder={t('ui.corkboard.sinopsis')}
                    key={`syn-${n.synopsis || ''}`}
                    defaultValue={n.synopsis || ''}
                    onKeyDown={(e) => e.stopPropagation()}
                    onBlur={(e) => e.target.value !== (n.synopsis || '') && onPatch(n.id, { synopsis: e.target.value })}
                  />
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
