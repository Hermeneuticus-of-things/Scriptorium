import React, { useState } from 'react';
import { DEFAULT_KEYS, conflicts, keyFromEvent } from '../lib/commands.js';
import { t, groupLabel } from '../lib/i18n.js';

const GROUPS = () => Object.fromEntries(['file', 'edit', 'view', 'nav', 'project', 'document', 'format', 'tools', 'window'].map((g) => [g, groupLabel(g)]));

// Keyboard shortcuts editor: click a field and press the new combination.
export default function ShortcutsDialog({ commands, settings, onSave, onClose }) {
  const [map, setMap] = useState({ ...(settings.shortcuts || {}) });
  const [recording, setRecording] = useState(null);
  const effective = { shortcuts: map };
  const bad = conflicts(commands.map((c) => c.id), effective);
  const keyOf = (id) => (map[id] !== undefined ? map[id] : DEFAULT_KEYS[id] || '');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label={t('ui.shortcutsDialog.scurtaturi_de_tastatura')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.shortcutsDialog.scurtaturi_de_tastatura')}</h2>
        <p className="muted">{t('ui.shortcutsDialog.clic_pe_o_scurtatura_apoi')}</p>
        <div className="shortcut-table">
          {Object.entries(GROUPS()).map(([g, title]) => {
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
                      aria-label={`${c.label}: ${t('ui.stylesDialog.scurtatura')}`}
                      value={recording === c.id ? t('ui.shortcutsDialog.apasa_combinatia') : keyOf(c.id)}
                      onFocus={() => setRecording(c.id)}
                      onBlur={() => setRecording(null)}
                      onKeyDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation(); // recording a shortcut must not also run it
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
                      <button className="link" onClick={() => setMap((m) => { const n = { ...m }; delete n[c.id]; return n; })} title={t('ui.shortcutsDialog.revino_la_implicit')}>
                        {t('ui.shortcutsDialog.implicit')}
                      </button>
                    )}
                  </div>
                ))}
              </section>
            );
          })}
        </div>
        {bad.size > 0 && <p className="warn">{t('ui.shortcutsDialog.scurtaturile_marcate_cu_rosu_se')}</p>}
        <div className="actions">
          <button onClick={() => setMap({})}>{t('ui.shortcutsDialog.toate_la_implicit')}</button>
          <span className="spacer" />
          <button onClick={onClose}>{t('btn.cancel')}</button>
          <button className="primary" onClick={() => onSave(map)}>{t('btn.save')}</button>
        </div>
      </div>
    </div>
  );
}
