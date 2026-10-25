import React, { useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import { SearchIcon } from './Icons.jsx';

// Quick search in the toolbar: results go to the binder (Search results), options in the ▾ menu.
const CSS = `
.qs { display: inline-flex; align-items: center; position: relative; border: 1px solid var(--line); border-radius: 14px; padding: 0 4px 0 8px; background: var(--paper); min-width: 0; }
.qs svg { width: 13px; height: 13px; opacity: .7; flex-shrink: 0; }
.qs input { border: none; background: none; width: 150px; padding: 3px 4px; min-width: 0; }
.qs input:focus { outline: none; }
.qs:focus-within { border-color: var(--accent, #8a5a2b); }
.qs .qs-opt { border: none; background: none; padding: 0 4px; font-size: 11px; }
.qs .qs-clear { border: none; background: none; padding: 0 4px; }
.qs-pop { position: absolute; top: calc(100% + 4px); right: 0; z-index: 40; background: var(--paper); border: 1px solid var(--line); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,.15); padding: 8px; min-width: 230px; display: flex; flex-direction: column; gap: 4px; }
.qs-pop strong { font-size: 12px; color: var(--muted); font-weight: 500; margin-top: 4px; }
.qs-pop button { text-align: left; }
.binder-results-head { display: flex; gap: 6px; align-items: baseline; padding: 4px 8px; font-size: 12px; border-bottom: 1px solid var(--line); }
.binder-results-head .link { margin-left: auto; }
.binder-row .hit-count { margin-left: auto; font-size: 11px; padding: 0 6px; border-radius: 8px; background: var(--accent-soft); }
.qs-invalid input { color: var(--danger, #b3261e); }
`;

export const QUICK_FIELDS = ['title', 'text', 'synopsis', 'notes', 'keywords', 'custom'];

/**
 * opts: {fields, operator: 'any'|'all'|'exact'|'regex', caseSensitive, wholeWord, includeTrash}
 * onSearch(query, opts) runs the search; onClear() goes back to the binder.
 */
export default function QuickSearch({ opts, onOptsChange, onSearch, onClear, onAdvanced, onSaveAsCollection, invalid = false }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const timer = useRef(0);
  const o = { fields: [], operator: 'any', caseSensitive: false, wholeWord: false, includeTrash: false, ...(opts || {}) };
  const run = (q = query, next = o) => {
    clearTimeout(timer.current);
    if (q.trim()) onSearch(q, next);
    else onClear();
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !wrap.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  const change = (patch) => {
    const next = { ...o, ...patch };
    onOptsChange(next);
    if (query.trim()) run(query, next);
  };
  const toggleField = (f) => change({ fields: o.fields.includes(f) ? o.fields.filter((x) => x !== f) : [...o.fields, f] });
  const fieldLabel = (f) => t(`ui.p7.camp.${f}`);
  return (
    <div className={`qs ${invalid ? 'qs-invalid' : ''}`} ref={wrap} role="search">
      <style>{CSS}</style>
      <SearchIcon />
      <input
        type="search"
        value={query}
        placeholder={t('ui.p7.cautareRapida')}
        aria-label={t('ui.p7.cautareRapida')}
        title={t('ui.p7.cautareRapidaHint')}
        onChange={(e) => {
          const q = e.target.value;
          setQuery(q);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => run(q), 300);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            run();
          } else if (e.key === 'Escape') {
            setQuery('');
            onClear();
          }
        }}
      />
      {query && <button className="qs-clear" aria-label={t('ui.p7.sterge')} title={t('ui.p7.sterge')} onClick={() => { setQuery(''); onClear(); }}>×</button>}
      <button className="qs-opt" aria-haspopup="menu" aria-expanded={open} aria-label={t('ui.p7.optiuniCautare')} title={t('ui.p7.optiuniCautare')} onClick={() => setOpen((x) => !x)}>▾</button>
      {open && (
        <div className="qs-pop" role="menu" aria-label={t('ui.p7.optiuniCautare')}>
          <strong>{t('ui.p7.cautaIn')}</strong>
          <label className="check"><input type="checkbox" checked={!o.fields.length} onChange={() => change({ fields: [] })} /> {t('ui.p7.camp.all')}</label>
          {QUICK_FIELDS.map((f) => (
            <label key={f} className="check"><input type="checkbox" checked={o.fields.includes(f)} onChange={() => toggleField(f)} /> {fieldLabel(f)}</label>
          ))}
          <strong>{t('ui.p7.potrivire')}</strong>
          {['any', 'all', 'exact', 'regex'].map((m) => (
            <label key={m} className="check"><input type="radio" name="qs-op" checked={o.operator === m} onChange={() => change({ operator: m })} /> {t(`ui.p7.op.${m}`)}</label>
          ))}
          <strong>{t('ui.p7.optiuni')}</strong>
          <label className="check"><input type="checkbox" checked={o.caseSensitive} onChange={() => change({ caseSensitive: !o.caseSensitive })} /> {t('ui.p7.majuscule')}</label>
          <label className="check"><input type="checkbox" checked={o.wholeWord} onChange={() => change({ wholeWord: !o.wholeWord })} /> {t('ui.advancedSearchDialog.cuvinte_intregi')}</label>
          <label className="check"><input type="checkbox" checked={o.includeTrash} onChange={() => change({ includeTrash: !o.includeTrash })} /> {t('ui.advancedSearchDialog.include_cosul')}</label>
          <hr />
          {onSaveAsCollection && <button className="link" disabled={!query.trim()} onClick={() => { setOpen(false); onSaveAsCollection(query, o); }}>{t('ui.advancedSearchDialog.salveaza_ca_colectie')}</button>}
          {onAdvanced && <button className="link" onClick={() => { setOpen(false); onAdvanced(query); }}>{t('ui.p7.cautareAvansata')}</button>}
        </div>
      )}
    </div>
  );
}

/** Project search criteria from the quick search options. */
export function quickCriteria(query, opts = {}) {
  const regex = opts.operator === 'regex';
  return {
    query,
    regex,
    operator: regex ? 'exact' : opts.operator || 'any',
    caseSensitive: Boolean(opts.caseSensitive),
    wholeWord: Boolean(opts.wholeWord),
    includeTrash: Boolean(opts.includeTrash),
    fields: opts.fields && opts.fields.length ? opts.fields : ['title', 'text', 'synopsis', 'keywords', 'custom'],
  };
}
