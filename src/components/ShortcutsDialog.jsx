import React, { useState } from 'react';
import { DEFAULT_KEYS, conflicts, keyFromEvent } from '../lib/commands.js';

const GROUPS = { file: 'Fișier', edit: 'Editare', view: 'Vizualizare', nav: 'Navigare', project: 'Proiect', document: 'Document', format: 'Format', tools: 'Unelte', window: 'Fereastră' };

// Keyboard shortcuts editor: click a field and press the new combination.
export default function ShortcutsDialog({ commands, settings, onSave, onClose }) {
  const [map, setMap] = useState({ ...(settings.shortcuts || {}) });
  const [recording, setRecording] = useState(null);
  const effective = { shortcuts: map };
  const bad = conflicts(commands.map((c) => c.id), effective);
  const keyOf = (id) => (map[id] !== undefined ? map[id] : DEFAULT_KEYS[id] || '');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label="Scurtături de tastatură" onClick={(e) => e.stopPropagation()}>
        <h2>Scurtături de tastatură</h2>
        <p className="muted">Clic pe o scurtătură, apoi apasă combinația nouă. Backspace o șterge, Esc renunță.</p>
        <div className="shortcut-table">
          {Object.entries(GROUPS).map(([g, title]) => {
            const list = commands.filter((c) => c.group === g);
            if (!list.length) return null;
            return (
              <section key={g}>
                <h4>{title}</h4>
                {list.map((c) => (
                  <div key={c.id} className={`shortcut-row ${bad.has(c.id) ? 'conflict' : ''}`}>
                    <span>{c.label}</span>
                    <input
                      readOnly
                      value={recording === c.id ? 'Apasă combinația…' : keyOf(c.id)}
                      onFocus={() => setRecording(c.id)}
                      onBlur={() => setRecording(null)}
                      onKeyDown={(e) => {
                        e.preventDefault();
                        if (e.key === 'Escape') return e.currentTarget.blur();
                        if (e.key === 'Backspace' || e.key === 'Delete') {
                          setMap((m) => ({ ...m, [c.id]: '' }));
                          return e.currentTarget.blur();
                        }
                        const combo = keyFromEvent(e);
                        if (!combo) return undefined;
                        setMap((m) => ({ ...m, [c.id]: combo }));
                        return e.currentTarget.blur();
                      }}
                    />
                    {map[c.id] !== undefined && (
                      <button className="link" onClick={() => setMap((m) => { const n = { ...m }; delete n[c.id]; return n; })} title="Revino la implicit">
                        implicit
                      </button>
                    )}
                  </div>
                ))}
              </section>
            );
          })}
        </div>
        {bad.size > 0 && <p className="warn">Scurtăturile marcate cu roșu se repetă. Doar prima comandă va răspunde.</p>}
        <div className="actions">
          <button onClick={() => setMap({})}>Toate la implicit</button>
          <span className="spacer" />
          <button onClick={onClose}>Anulează</button>
          <button className="primary" onClick={() => onSave(map)}>Salvează</button>
        </div>
      </div>
    </div>
  );
}
