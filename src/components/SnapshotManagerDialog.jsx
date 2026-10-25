// Snapshots Manager: every document of the project that has snapshots (title, count, last date);
// picking one shows its snapshots with the same actions as the Inspector pane.
import React, { useEffect, useMemo, useState } from 'react';
import { t as tr, uiLocale } from '../lib/i18n.js';
import { documentsWithSnapshots } from '../lib/snapshotList.js';
import SnapshotsPane from './SnapshotsPane.jsx';

export default function SnapshotManagerDialog({ api, dir, project, counts, docs, canRestore, flush, onRestore, onChanged, onOpen, onError, onClose }) {
  const list = useMemo(() => documentsWithSnapshots(project.tree, counts), [project, counts]);
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
                <span role="columnheader">{tr('ui.snap.col_document')}</span>
                <span role="columnheader">{tr('ui.snap.col_count')}</span>
                <span role="columnheader">{tr('ui.snap.col_last')}</span>
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
