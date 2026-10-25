import React, { useRef, useState } from 'react';
import { DEFAULT_KEYS, conflicts, keyFromEvent, holdersOf, assignShortcut, serializeShortcutSet, parseShortcutSet } from '../lib/commands.js';
import { t, groupLabel } from '../lib/i18n.js';

const GROUPS = () => Object.fromEntries(['file', 'edit', 'view', 'nav', 'project', 'document', 'format', 'tools', 'window'].map((g) => [g, groupLabel(g)]));

// Keyboard shortcuts editor: click a field and press the new combination.
// Search by name or by pressing a combination; a combination already taken can be moved in one step;
// sets are saved to / loaded from a file; each command can go back to its default.
export default function ShortcutsDialog({ commands, settings, onSave, onClose }) {
  const [map, setMap] = useState({ ...(settings.shortcuts || {}) });
  const [recording, setRecording] = useState(null);
  const [filter, setFilter] = useState('');
  const [byKey, setByKey] = useState(''); // combination typed in the "find by shortcut" field
  const [taken, setTaken] = useState(null); // {id, combo, holders} waiting for "replace"
  const [message, setMessage] = useState('');
  const fileRef = useRef(null);
  const ids = commands.map((c) => c.id);
  const effective = { shortcuts: map };
  const bad = conflicts(ids, effective);
  const keyOf = (id) => (map[id] !== undefined ? map[id] : DEFAULT_KEYS[id] || '');
  const labelOf = (id) => commands.find((c) => c.id === id)?.label || id;
  const q = filter.trim().toLocaleLowerCase();
  const visible = (c) => (!q || c.label.toLocaleLowerCase().includes(q)) && (!byKey || keyOf(c.id) === byKey);

  const record = (c, combo) => {
    const holders = holdersOf(ids, combo, effective).filter((id) => id !== c.id);
    setMap((m) => ({ ...m, [c.id]: combo }));
    setTaken(holders.length ? { id: c.id, combo, holders } : null);
  };
  const replaceTaken = () => {
    if (!taken) return;
    setMap((m) => assignShortcut(m, ids, taken.id, taken.combo));
    setTaken(null);
  };
  const saveSet = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([serializeShortcutSet(map)], { type: 'application/json' }));
    a.download = 'scurtaturi.scribner-keys.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const loadSet = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    file.text().then((text) => {
      try {
        const next = parseShortcutSet(text, ids);
        setMap(next);
        setMessage(t('ui.p4.setIncarcat', { n: Object.keys(next).length }));
      } catch {
        setMessage(t('ui.p4.setInvalid'));
      }
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label={t('ui.shortcutsDialog.scurtaturi_de_tastatura')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.shortcutsDialog.scurtaturi_de_tastatura')}</h2>
        <p className="muted">{t('ui.shortcutsDialog.clic_pe_o_scurtatura_apoi')}</p>
        <div className="row">
          <label>
            {t('ui.p4.cautaComanda')}
            <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </label>
          <label>
            {t('ui.p4.cautaDupaScurtatura')}
            <input
              readOnly
              value={byKey}
              placeholder={t('ui.shortcutsDialog.apasa_combinatia')}
              onKeyDown={(e) => {
                if (e.key === 'Tab') return;
                e.preventDefault();
                e.stopPropagation();
                if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Delete') return setByKey('');
                const combo = keyFromEvent(e);
                if (combo) setByKey(combo);
                return undefined;
              }}
            />
          </label>
          {byKey && <button className="link" onClick={() => setByKey('')}>{t('ui.p4.toateComenzile')}</button>}
        </div>
        <div className="shortcut-table">
          {Object.entries(GROUPS()).map(([g, title]) => {
            const list = commands.filter((c) => c.group === g && visible(c));
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
                        if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) return undefined; // leaves the field
                        e.preventDefault();
                        e.stopPropagation(); // recording a shortcut must not also run it
                        if (e.key === 'Escape') return e.currentTarget.blur();
                        if (e.key === 'Backspace' || e.key === 'Delete') {
                          setMap((m) => ({ ...m, [c.id]: '' }));
                          return e.currentTarget.blur();
                        }
                        const combo = keyFromEvent(e);
                        if (!combo) return undefined;
                        record(c, combo);
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
        {taken && (
          <p className="warn" role="alert">
            {t('ui.p4.scurtaturaFolosita', { key: taken.combo, cmd: taken.holders.map(labelOf).join(', ') })}{' '}
            <button onClick={replaceTaken}>{t('ui.p4.inlocuiesteScurtatura')}</button>
          </p>
        )}
        {bad.size > 0 && !taken && <p className="warn">{t('ui.shortcutsDialog.scurtaturile_marcate_cu_rosu_se')}</p>}
        {message && <p className="muted" role="status">{message}</p>}
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={loadSet} />
        <div className="actions">
          <button onClick={() => setMap({})}>{t('ui.shortcutsDialog.toate_la_implicit')}</button>
          <button onClick={saveSet}>{t('ui.p4.salveazaSet')}</button>
          <button onClick={() => fileRef.current?.click()}>{t('ui.p4.incarcaSet')}</button>
          <span className="spacer" />
          <button onClick={onClose}>{t('btn.cancel')}</button>
          <button className="primary" onClick={() => onSave(map)}>{t('btn.save')}</button>
        </div>
      </div>
    </div>
  );
}
