import React, { useRef, useState } from 'react';
import { sanitizeHtml } from '../lib/sanitize.js';
import { Notes } from './Inspector.jsx';
import { t } from '../lib/i18n.js';
import { noneStatus } from '../lib/projectSettings.js';

// Floating Inspector for composition (full-screen) mode: a small draggable panel
// with synopsis, document notes, label and status of the current document.
// Props: node, project ({labels, statuses}), notesHtml?, onPatch(patch),
// onNotesChange?(html) (omit to show notes read-only), onClose.
export default function FloatingInspector({ node, project, notesHtml = '', onPatch, onNotesChange, onClose, initial = { x: 40, y: 80 } }) {
  const [pos, setPos] = useState(initial);
  const drag = useRef(null);
  if (!node) return null;

  const down = (e) => {
    if (e.button !== 0) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    const move = (ev) => {
      const d = drag.current;
      if (!d) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 120, ev.clientX - d.dx)),
        y: Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - d.dy)),
      });
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <div className="floating-inspector" role="dialog" aria-label="Inspector" style={{ left: pos.x, top: pos.y }}>
      <div className="fi-head" onMouseDown={down}>
        <strong>{node.title}</strong>
        <span className="spacer" />
        <button onMouseDown={(e) => e.stopPropagation()} onClick={onClose} aria-label={t('btn.close')}>×</button>
      </div>
      <div className="fields">
        <label>
          {t('ui.advancedSearchDialog.sinopsis')}
          <textarea key={`s-${node.id}`} rows={4} defaultValue={node.synopsis || ''} onBlur={(e) => e.target.value !== (node.synopsis || '') && onPatch({ synopsis: e.target.value })} />
        </label>
        <div className="row">
          <label>
            {t('ui.binder.eticheta')}
            <select value={node.label || ''} onChange={(e) => onPatch({ label: e.target.value })}>
              {(project?.labels || []).map((l) => (
                <option key={l.name}>{l.name}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={node.status || ''} onChange={(e) => onPatch({ status: e.target.value })}>
              {(project?.statuses || []).map((s) => (
                <option key={s} value={s}>{noneStatus(s, t)}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="fi-notes">
          <span>{t('ui.floatingInspector.note_document')}</span>
          {onNotesChange ? (
            <Notes key={`n-${node.id}`} initial={notesHtml} onChange={onNotesChange} placeholder={t('ui.floatingInspector.note_pentru_document')} />
          ) : (
            <div className="notes prose" dangerouslySetInnerHTML={{ __html: sanitizeHtml(notesHtml) }} />
          )}
        </div>
      </div>
    </div>
  );
}
