import React from 'react';
import { buildRegex } from '../lib/search.js';
import { noneLabel, noneStatus } from '../lib/projectSettings.js';
import { SearchIcon } from './Icons.jsx';
import { t } from '../lib/i18n.js';

const CSS = `
.filter-bar { display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.filter-bar input[type="text"] { flex: 1; min-width: 140px; }
.filter-bar details { position: relative; }
.filter-bar summary { list-style: none; cursor: pointer; padding: 2px 7px; border: 1px solid var(--line); border-radius: 6px; user-select: none; display: inline-flex; align-items: center; gap: 4px; }
.filter-bar summary::-webkit-details-marker { display: none; }
.filter-bar summary:hover, .filter-bar details[open] summary { background: var(--accent-soft); }
.filter-pop { position: absolute; z-index: 30; top: 100%; left: 0; margin-top: 4px; padding: 8px 10px; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 4px 14px rgba(0,0,0,.18); display: flex; flex-direction: column; gap: 6px; min-width: 280px; }
.filter-pop .row { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.filter-pop .row > span { min-width: 74px; }
.filter-pop select { max-width: 170px; }
`;

// Filter bar above the Corkboard / Outliner (Scrivener 3 §11.4): one row, live
// results. Esc clears the text first, then closes; Done closes and the view
// shows the container unfiltered again.
export default function FilterBar({ project, filter, onChange, onDone, matches = null }) {
  const invalid =
    filter.regex && filter.query.trim() &&
    buildRegex({ query: filter.query, regex: true, caseSensitive: false, wholeWord: false }) === null;
  const meta = filter.meta || {};
  const values = meta.field === 'status' ? project.statuses || [] : (project.labels || []).map((l) => l.name);
  const onEsc = (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    if (filter.query) onChange({ query: '' });
    else onDone();
  };
  return (
    <div className="filter-bar" role="search" onKeyDown={onEsc}>
      <style>{CSS}</style>
      <input
        autoFocus
        type="text"
        value={filter.query}
        placeholder={t('ui.filterBar.filtreaza')}
        aria-label={t('ui.filterBar.filtreaza')}
        onChange={(e) => onChange({ query: e.target.value })}
      />
      <details>
        <summary title={t('ui.filterBar.optiuni_cautare')} aria-label={t('ui.filterBar.optiuni_cautare')}><SearchIcon /></summary>
        <div className="filter-pop">
          <label className="check">
            <input type="checkbox" checked={Boolean(filter.includeTextNotes)} onChange={(e) => onChange({ includeTextNotes: e.target.checked })} />
            {t('ui.filterBar.include_text_si_note')}
          </label>
          <label className="check">
            <input type="checkbox" checked={Boolean(filter.regex)} onChange={(e) => onChange({ regex: e.target.checked })} />
            {t('ui.filterBar.expresie_regulata')}
          </label>
        </div>
      </details>
      <details>
        <summary>{t('ui.filterBar.optiuni')}</summary>
        <div className="filter-pop">
          <div className="row">
            <span className="muted">{t('ui.filterBar.domeniu')}</span>
            <select value={filter.draftScope || 'any'} aria-label={t('ui.filterBar.domeniu')} onChange={(e) => onChange({ draftScope: e.target.value })}>
              <option value="any">{t('ui.filterBar.ori_unde')}</option>
              <option value="draft">{t('ui.filterBar.doar_manuscris')}</option>
              <option value="nondraft">{t('ui.filterBar.non_manuscris')}</option>
            </select>
          </div>
          <div className="row">
            <span className="muted">{t('ui.filterBar.compilare')}</span>
            <select value={filter.compileScope || 'all'} aria-label={t('ui.filterBar.compilare')} onChange={(e) => onChange({ compileScope: e.target.value })}>
              <option value="all">{t('ui.filterBar.toate')}</option>
              <option value="included">{t('ui.filterBar.incluse')}</option>
              <option value="excluded">{t('ui.filterBar.excluse')}</option>
            </select>
          </div>
          <div className="row">
            <span className="muted">{t('ui.filterBar.metafila')}</span>
            <select value={meta.mode || 'any'} aria-label={t('ui.filterBar.metafila')} onChange={(e) => onChange({ meta: { ...meta, mode: e.target.value } })}>
              <option value="any">{t('ui.filterBar.fara_filtru')}</option>
              <option value="include">{t('ui.filterBar.meta_include')}</option>
              <option value="exclude">{t('ui.filterBar.meta_exclude')}</option>
            </select>
            <select value={meta.field || 'label'} aria-label={t('ui.filterBar.metafila')} onChange={(e) => onChange({ meta: { ...meta, field: e.target.value, value: '' } })}>
              <option value="label">{t('ui.filterBar.eticheta')}</option>
              <option value="status">{t('ui.filterBar.stare')}</option>
            </select>
            <select value={meta.value || ''} aria-label={t('ui.filterBar.metafila')} onChange={(e) => onChange({ meta: { ...meta, value: e.target.value } })}>
              <option value="">{t('ui.filterBar.fara_valoare')}</option>
              {values.map((v) => (
                <option key={v} value={v}>{meta.field === 'status' ? noneStatus(v, t) : noneLabel(v, t)}</option>
              ))}
            </select>
          </div>
        </div>
      </details>
      {invalid && <span className="muted">{t('ui.advancedSearchDialog.expresie_regulata_invalida')}</span>}
      {typeof matches === 'number' && !invalid && <span className="muted">{matches}</span>}
      <button onClick={onDone}>{t('ui.filterBar.gata')}</button>
    </div>
  );
}
