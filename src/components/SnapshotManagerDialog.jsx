// Snapshots Manager: every document of the project that has snapshots (title, count, last date);
// picking one shows its snapshots with the same actions as the Inspector pane.
import React, { useEffect, useMemo, useState } from 'react';
import { t as tr, uiLocale } from '../lib/i18n.js';
import { documentsWithSnapshots } from '../lib/snapshotList.js';
import SnapshotsPane from './SnapshotsPane.jsx';

const SORTERS = {
  title: (a, b) => a.title.localeCompare(b.title),
  count: (a, b) => a.count - b.count,
  last: (a, b) => (Date.parse(a.last || 0) || 0) - (Date.parse(b.last || 0) || 0),
};
/** Sorts the manager's document rows by 'title' | 'count' | 'last' (null = binder order). */
export function sortManagerRows(rows, sort) {
  if (!sort || !SORTERS[sort.key]) return rows;
  const k = sort.dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => SORTERS[sort.key](a, b) * k || a.title.localeCompare(b.title));
}

export default function SnapshotManagerDialog({ api, dir, project, counts, docs, canRestore, flush, onRestore, onChanged, onOpen, onReveal, onError, onClose }) {
  const [sort, setSort] = useState(null); // {key, dir}; null = binder order
  const list = useMemo(() => sortManagerRows(documentsWithSnapshots(project.tree, counts), sort), [project, counts, sort]);
  const sortBy = (key) => setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: key === 'title' ? 'asc' : 'desc' }));
  const ariaSort = (key) => (sort?.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
  const arrow = (key) => (sort?.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '');
  const [docId, setDocId] = useState(null);
  useEffect(() => {
    if (!docId && list.length) setDocId(list[0].id);
  }, [docId, list]);
  const current = list.find((d) => d.id === docId) || null;
  const moveKey = (e) => {
    const i = list.findIndex((d) => d.id === docId);
    const to = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : null;
    if (to === null) return;
    e.preventDefault();
    const d = list[Math.max(0, Math.min(list.length - 1, to))];
    if (!d) return;
    setDocId(d.id);
    e.currentTarget.querySelector(`[data-doc="${CSS.escape(d.id)}"]`)?.focus();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal snap-manager" role="dialog" aria-label={tr('cmd.snapshotManager')} onClick={(e) => e.stopPropagation()}>
        <h2>{tr('cmd.snapshotManager')}</h2>
        {!list.length ? (
          <p className="muted">{tr('ui.snap.manager_empty')}</p>
        ) : (
          <div className="snap-manager-body">
            <div className="snap-manager-docs">
              <div className="snap-head snap-head-3" role="row">
                <span role="columnheader" aria-sort={ariaSort('title')}><button className="link sm-sort-title" onClick={() => sortBy('title')}>{tr('ui.snap.col_document')}{arrow('title')}</button></span>
                <span role="columnheader" aria-sort={ariaSort('count')}><button className="link sm-sort-count" onClick={() => sortBy('count')}>{tr('ui.snap.col_count')}{arrow('count')}</button></span>
                <span role="columnheader" aria-sort={ariaSort('last')}><button className="link sm-sort-last" onClick={() => sortBy('last')}>{tr('ui.snap.col_last')}{arrow('last')}</button></span>
              </div>
              <ul role="listbox" aria-label={tr('ui.snap.col_document')} onKeyDown={moveKey}>
                {list.map((d) => (
                  <li
                    key={d.id}
                    data-doc={d.id}
                    role="option"
                    aria-selected={d.id === docId}
                    tabIndex={d.id === docId ? 0 : -1}
                    className={d.id === docId ? 'selected' : ''}
                    onClick={() => setDocId(d.id)}
                    onDoubleClick={() => { onOpen?.(d.id); onClose(); }}
                  >
                    <strong>{d.title}</strong>
                    <span>{d.count}</span>
                    <small>{d.last ? new Date(d.last).toLocaleString(uiLocale()) : ''}</small>
                  </li>
                ))}
              </ul>
              {onReveal && <button className="sm-reveal link" disabled={!current} onClick={() => { onReveal(current.id); onClose(); }}>{tr('ui.p11.sn_reveal')}</button>}
            </div>
            <div className="snap-manager-pane">
              {current && (
                <SnapshotsPane
                  key={current.id}
                  api={api}
                  dir={dir}
                  node={{ id: current.id, title: current.title }}
                  html={docs[current.id] || ''}
                  canRestore={canRestore(current.id)}
                  flush={flush}
                  onRestore={(html) => onRestore(current.id, html)}
                  onError={onError}
                  onChanged={onChanged}
                />
              )}
            </div>
          </div>
        )}
        <div className="actions">
          <button onClick={onClose}>{tr('ui.snap.close')}</button>
        </div>
      </div>
    </div>
  );
}
