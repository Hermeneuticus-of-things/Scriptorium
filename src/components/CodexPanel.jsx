import React, { useMemo, useState } from 'react';
import { t } from '../lib/i18n.js';
import { CODEX_TYPES, codexEntity } from '../lib/codex.js';

// Codex pentru cărți (directivă 14 nov — direcția B): entități structurate ale cărții
// (Personaj/Locație/Termen/Obiect/Altfel) cu descriere și aliasuri. Contextul AI le
// injectează automat când sunt menționate în text (buildEditorialContext → codexMatches).
// ADL: suprafață panel.codex, modal cu focus prins, ≤1 buton primar per rând de editare.
export default function CodexPanel({ codex = [], onChange, onClose }) {
  const [editing, setEditing] = useState(null); // null | {id?, name, type, description, aliases}
  const [query, setQuery] = useState('');
  const list = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ro');
    return codex.filter((e) => !q || (e.name + ' ' + (e.description || '') + ' ' + (e.aliases || []).join(' ')).toLocaleLowerCase('ro').includes(q));
  }, [codex, query]);
  const byType = useMemo(() => {
    const g = {};
    for (const e of list) (g[e.type || 'Altfel'] = g[e.type || 'Altfel'] || []).push(e);
    return CODEX_TYPES.filter((t) => g[t]?.length).map((t) => [t, g[t]]);
  }, [list]);

  const save = (entity) => {
    const clean = codexEntity({ ...entity, aliases: String(entity.aliasesText || '').split(/[;,\n]/).map((x) => x.trim()).filter(Boolean) });
    if (!clean.name.trim()) return;
    const next = entity.id ? codex.map((x) => (x.id === entity.id ? { ...x, ...clean } : x)) : [...codex, { ...clean, id: crypto.randomUUID() }];
    onChange(next);
    setEditing(null);
  };
  const remove = (id) => { onChange(codex.filter((x) => x.id !== id)); setEditing(null); };

  return (
    <div className="codex-panel" role="tabpanel" aria-label={t('ui.codex.title')}>
      <h2>{t('ui.codex.title')}</h2>
      <p className="muted small">{t('ui.codex.hint')}</p>
      <div className="codex-toolbar">
        <input
          type="search"
          aria-label={t('ui.codex.search')}
          placeholder={t('ui.codex.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="primary" onClick={() => setEditing({ name: '', type: 'Personaj', description: '', aliasesText: '' })}>
          {t('ui.codex.add')}
        </button>
      </div>
      {byType.map(([type, items]) => (
        <section key={type} className="codex-group">
          <h3>{type} <small>({items.length})</small></h3>
          <ul className="codex-list">
            {items.map((e) => (
              <li key={e.id} className="codex-item">
                {editing?.id === e.id ? (
                  <CodexForm entity={{ ...e, aliasesText: (e.aliases || []).join(', ') }} onSave={save} onCancel={() => setEditing(null)} />
                ) : (
                  <>
                    <strong>{e.name}</strong>
                    {e.aliases?.length ? <small className="muted"> ({e.aliases.join(', ')})</small> : null}
                    {e.description ? <p className="codex-desc">{e.description}</p> : <p className="codex-desc muted small">{t('ui.codex.noDescription')}</p>}
                    <div className="codex-item-actions">
                      <button type="button" onClick={() => setEditing({ ...e, aliasesText: (e.aliases || []).join(', ') })}>{t('ui.codex.edit')}</button>
                      <button type="button" onClick={() => remove(e.id)}>{t('ui.codex.delete')}</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!list.length && <p className="muted">{t('ui.codex.empty')}</p>}
      {editing && !editing.id && (
        <div className="codex-add">
          <h3>{t('ui.codex.add')}</h3>
          <CodexForm entity={editing} onSave={save} onCancel={() => setEditing(null)} />
        </div>
      )}
      <div className="actions">
        <button type="button" className="primary" onClick={onClose}>{t('ui.codex.close')}</button>
      </div>
    </div>
  );
}

function CodexForm({ entity, onSave, onCancel }) {
  const [name, setName] = useState(entity.name);
  const [type, setType] = useState(entity.type);
  const [description, setDescription] = useState(entity.description);
  const [aliasesText, setAliasesText] = useState(entity.aliasesText || '');
  return (
    <form className="codex-form" onSubmit={(e) => { e.preventDefault(); onSave({ ...entity, name, type, description, aliasesText }); }}>
      <label>
        {t('ui.codex.name')}
        <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </label>
      <label>
        {t('ui.codex.type')}
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {CODEX_TYPES.map((t2) => <option key={t2} value={t2}>{t2}</option>)}
        </select>
      </label>
      <label>
        {t('ui.codex.description')}
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label>
        {t('ui.codex.aliases')}
        <input value={aliasesText} onChange={(e) => setAliasesText(e.target.value)} placeholder={t('ui.codex.aliasesHint')} />
      </label>
      <div className="actions">
        <button type="submit" className="primary">{t('ui.codex.save')}</button>
        <button type="button" onClick={onCancel}>{t('ui.codex.cancel')}</button>
      </div>
    </form>
  );
}
