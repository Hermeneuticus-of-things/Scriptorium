import React, { useMemo, useState } from 'react';
import { dialogueFocus } from '../lib/dialogueFocus.js';
import { flatten } from '../lib/tree.js';
import { t } from '../lib/i18n.js';

// Dialogue Focus (Scrivener 3 §20.3.2): proofing view listing only the dialogue
// lines, grouped by document. Clicking a line opens its document.
export default function DialogueFocusDialog({ project, docs, onOpen, onClose }) {
  const [expanded, setExpanded] = useState(() => new Set());

  const focus = useMemo(() => dialogueFocus(docs), [docs]);
  const titles = useMemo(() => {
    const m = new Map();
    for (const n of flatten(project.tree || [])) m.set(n.id, n.title);
    return m;
  }, [project.tree]);

  const ordered = useMemo(
    () => flatten(project.tree || []).filter((n) => focus[n.id]),
    [project.tree, focus],
  );
  const total = ordered.reduce((s, n) => s + focus[n.id].count, 0);

  const toggle = (id) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label={t('ui.dialogueFocus.aria')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.dialogueFocus.title')}</h2>
        <p className="muted">{t('ui.dialogueFocus.x_replci_in_x_documente', { total, length: ordered.length })}</p>
        <div className="results">
          {!ordered.length && <p className="muted">{t('ui.dialogueFocus.nicio_replica')}</p>}
          {ordered.map((n) => {
            const open = expanded.has(n.id);
            return (
              <div key={n.id} className="result">
                <button className="link" onClick={() => toggle(n.id)}>
                  <strong>{titles.get(n.id) || n.title}</strong>
                </button>{' '}
                <small className="muted">{focus[n.id].count}</small>
                {(open || ordered.length === 1) &&
                  focus[n.id].lines.map((l, i) => (
                    <div key={i} className="snippet">
                      <button className="link" onClick={() => onOpen(n.id)}>
                        {l.quote}
                      </button>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
        <div className="actions">
          <button onClick={onClose}>{t('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}
