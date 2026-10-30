import React from 'react';
import { t as tr, has } from '../lib/i18n.js';
import { nextLayoutName, summaryOf } from '../lib/layouts.js';

// Saved window arrangements (Scrivener 3 §12.3): save the current layout under a name,
// then apply / rename / delete saved ones. Stored at application level (settings.layouts),
// so every layout is offered in every project. App supplies the current state as snapshot()
// and applies a payload back through apply().
const CSS = `
.layouts-list { list-style: none; margin: 10px 0; padding: 0; max-height: 50vh; overflow: auto; }
.layouts-list li { display: flex; align-items: center; gap: 8px; padding: 6px 4px; border-bottom: 1px solid var(--line); }
.layouts-info { flex: 1; min-width: 0; }
.layouts-info strong { display: block; font-weight: 600; }
.layouts-info small { color: var(--muted); }
`;

const sumPart = (token) => (has(`ui.layouts.sum.${token}`) ? tr(`ui.layouts.sum.${token}`) : token);

export default function LayoutsDialog({ layouts, snapshot, apply, onChange, onClose }) {
  const saveCurrent = () => {
    const name = window.prompt(tr('ui.layouts.namePrompt'), nextLayoutName(layouts, tr('ui.layouts.defaultName')));
    if (!name || !name.trim()) return;
    onChange([...layouts, { name: name.trim(), payload: snapshot() }]);
  };
  const rename = (entry) => {
    const name = window.prompt(tr('ui.layouts.namePrompt'), entry.name);
    if (!name || !name.trim() || name.trim() === entry.name) return;
    if (layouts.some((l) => l.name === name.trim())) return;
    onChange(layouts.map((l) => (l === entry ? { ...l, name: name.trim() } : l)));
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={tr('ui.layouts.title')} onClick={(e) => e.stopPropagation()}>
        <style>{CSS}</style>
        <h2>{tr('ui.layouts.title')}</h2>
        {layouts.length === 0 && <p className="muted">{tr('ui.layouts.empty')}</p>}
        <ul className="layouts-list">
          {layouts.map((l) => (
            <li key={l.name}>
              <span className="layouts-info">
                <strong>{l.name}</strong>
                <small>{summaryOf(l.payload).map(sumPart).join(' · ')}</small>
              </span>
              <button onClick={() => apply(l.payload)}>{tr('ui.layouts.apply')}</button>
              <button onClick={() => rename(l)}>{tr('ui.layouts.rename')}</button>
              <button onClick={() => onChange(layouts.filter((x) => x !== l))}>{tr('ui.layouts.delete')}</button>
            </li>
          ))}
        </ul>
        <div className="row-actions">
          <button onClick={onClose}>{tr('btn.close')}</button>
          <button className="primary" onClick={saveCurrent}>{tr('ui.layouts.saveCurrent')}</button>
        </div>
      </div>
    </div>
  );
}
