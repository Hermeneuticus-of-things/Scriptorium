import React, { useEffect, useMemo, useState } from 'react';
import { searchProject, buildTerms, listOccurrences } from '../lib/projectSearch.js';
import { PROJECT_FORMATS } from '../lib/search.js';
import { listKeywords } from '../lib/collections.js';
import { flatten } from '../lib/tree.js';
import { t as tr } from '../lib/i18n.js';

const FIELD_LABELS = () => ({
  title: tr('ui.advancedSearchDialog.titlu'),
  text: 'Text',
  notes: tr('ui.advancedSearchDialog.note'),
  synopsis: tr('ui.advancedSearchDialog.sinopsis'),
  keywords: tr('ui.advancedSearchDialog.cuvinte_cheie'),
  custom: tr('ui.common.metadate'),
});
const FIELDS = Object.keys(FIELD_LABELS());

const CSS = `
.as-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin: 8px 0; }
.as-box { border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; }
.as-box > strong { display: block; font-size: 12px; color: var(--muted); font-weight: 500; margin-bottom: 4px; }
.as-list { max-height: 110px; overflow: auto; display: flex; flex-direction: column; gap: 2px; }
.as-badge { display: inline-block; font-size: 11px; padding: 0 6px; border-radius: 8px; background: var(--accent-soft); margin-left: 4px; }
.as-field { font-size: 11px; color: var(--muted); margin-right: 4px; }
.as-ops { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.as-ops select { padding: 2px 6px; }
.as-preview { max-height: 300px; overflow: auto; border: 1px solid var(--line); border-radius: 6px; padding: 4px 8px; }
.as-occ { display: flex; gap: 6px; align-items: baseline; font-size: 13px; padding: 2px 0; }
.as-occ del { color: var(--danger, #b3261e); }
.as-occ ins { color: var(--ok, #2e7d32); text-decoration: none; font-weight: 600; }
.as-occ.off { opacity: .5; }
.as-dates input { width: 9.5em; }
`;
const TYPES = ['text', 'parent', 'folder', 'file'];

const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function AdvancedSearchDialog({ project, docs, readNotes, onOpen, onReplace, onSaveAsCollection, onClose, initialQuery = '', onResults, onShowInBinder, initialCriteria = null, editCollection = null, onUpdateCollection }) {
  const ic = initialCriteria || {};
  const [query, setQuery] = useState(ic.query ?? initialQuery);
  const [replacement, setReplacement] = useState('');
  const [opts, setOpts] = useState({ regex: Boolean(ic.regex), caseSensitive: Boolean(ic.caseSensitive), wholeWord: Boolean(ic.wholeWord), operator: ic.operator || 'any' });
  const [fields, setFields] = useState(ic.fields?.length ? ic.fields : ['title', 'text', 'synopsis', 'keywords', 'custom']);
  const [filters, setFilters] = useState({
    labels: ic.labels || [], statuses: ic.statuses || [], keywords: ic.keywords || [], scope: ic.scope || 'all', includeTrash: Boolean(ic.includeTrash), onlyCompile: Boolean(ic.onlyCompile),
    types: ic.types || [], customField: ic.customField || '', format: ic.format || '',
    createdFrom: ic.createdFrom || '', createdTo: ic.createdTo || '', modifiedFrom: ic.modifiedFrom || '', modifiedTo: ic.modifiedTo || '',
  });
  const [preview, setPreview] = useState(false); // replace preview with one checkbox per occurrence
  const [excluded, setExcluded] = useState(() => new Set());
  const [notesById, setNotesById] = useState({});
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const notesOn = fields.includes('notes');

  // Lazy notes loading: only when the Note field is enabled.
  useEffect(() => {
    if (!notesOn || !readNotes) return undefined;
    let cancelled = false;
    const ids = flatten(project.tree || [])
      .filter((n) => !n.root && !(n.id in notesById))
      .map((n) => n.id);
    if (!ids.length) return undefined;
    setLoadingNotes(true);
    Promise.all(ids.map((id) => Promise.resolve(readNotes(id)).then((h) => [id, h || ''], () => [id, ''])))
      .then((pairs) => {
        if (!cancelled) setNotesById((m) => ({ ...m, ...Object.fromEntries(pairs) }));
      })
      .finally(() => !cancelled && setLoadingNotes(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesOn, project.tree, readNotes]);

  const criteria = useMemo(() => ({ query, ...opts, fields, ...filters }), [query, opts, fields, filters]);
  const terms = useMemo(() => buildTerms(criteria), [criteria]);
  const invalid = Boolean(query) && (terms === null || terms.some((t) => !t));
  const results = useMemo(() => searchProject(project, docs, notesById, criteria), [project, docs, notesById, criteria]);

  // The last results with a query feed the permanent "Search results" tab of the binder.
  useEffect(() => {
    if (onResults && query.trim() && !invalid) onResults(results.map((r) => r.node.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  const total = results.reduce((s, r) => s + Object.values(r.fields).reduce((a, b) => a + b, 0), 0);
  const replaceable = results.filter((r) => r.fields.title || r.fields.text || r.fields.notes || r.fields.synopsis);

  const keywordNames = useMemo(() => listKeywords(project).map((k) => k.name), [project]);
  const labels = project.labels || [];
  const statuses = project.statuses || [];

  const toggleOpt = (k) => () => setOpts((o) => ({ ...o, [k]: !o[k] }));
  const toggleFilter = (k, v) => setFilters((f) => ({ ...f, [k]: toggleIn(f[k], v) }));

  const occurrences = useMemo(
    () => (preview ? listOccurrences(project, docs, notesById, criteria, replacement, excluded) : []),
    [preview, project, docs, notesById, criteria, replacement, excluded],
  );
  const kept = occurrences.filter((o) => !excluded.has(o.key)).length;
  const toggleOcc = (key) => setExcluded((x) => {
    const n = new Set(x);
    if (n.has(key)) n.delete(key);
    else n.add(key);
    return n;
  });
  const replaceAll = async () => {
    if (!query || !replaceable.length || !onReplace) return;
    if (!preview) {
      setExcluded(new Set());
      setPreview(true);
      return;
    }
    if (!kept) return;
    if (!window.confirm(tr('ui.advancedSearchDialog.inlocuiesti_aparitiile_din_x_documente', { length: new Set(occurrences.filter((o) => !excluded.has(o.key)).map((o) => o.id)).size }))) return;
    setBusy(true);
    try {
      const n = await onReplace(criteria, replacement, excluded);
      setPreview(false);
      setExcluded(new Set());
      setMessage(typeof n === 'number' ? tr('ui.advancedSearchDialog.inlocuite_x', { n: n }) : tr('ui.advancedSearchDialog.inlocuire_efectuata'));
      if (notesOn) setNotesById({});
    } finally {
      setBusy(false);
    }
  };

  const saveAsCollection = () => {
    const title = window.prompt(tr('ui.advancedSearchDialog.numele_colectiei'), query || tr('ui.advancedSearchDialog.cautare_salvata'));
    if (title && title.trim()) onSaveAsCollection?.(title.trim(), criteria);
  };

  const checkList = (key, items) =>
    items.length ? (
      <div className="as-list">
        {items.map((v) => (
          <label key={v} className="check">
            <input type="checkbox" checked={filters[key].includes(v)} onChange={() => toggleFilter(key, v)} /> {v}
          </label>
        ))}
      </div>
    ) : (
      <small className="muted">{tr('ui.advancedSearchDialog.niciuna_definita')}</small>
    );

  const hasQuery = Boolean(query) && !invalid;
  const hasFilter = filters.labels.length || filters.statuses.length || filters.keywords.length || filters.types.length || filters.format
    || filters.createdFrom || filters.createdTo || filters.modifiedFrom || filters.modifiedTo;
  const customFields = (project.customFields || []).map((f) => f.title).filter(Boolean);
  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const date = (k, label) => (
    <label>
      {label}
      <input type="date" value={filters[k]} onChange={setF(k)} aria-label={label} />
    </label>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label={tr('ui.advancedSearchDialog.cautare_avansata')} onClick={(e) => e.stopPropagation()}>
        <style>{CSS}</style>
        <h2>{editCollection ? tr('ui.p7.editeazaCautarea', { title: editCollection.title }) : tr('ui.advancedSearchDialog.cautare_avansata_in_proiect')}</h2>
        <div className="row">
          <label>
            {tr('ui.advancedSearchDialog.cauta')}
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} className={invalid ? 'invalid' : ''} />
          </label>
          <label>
            {tr('ui.advancedSearchDialog.inlocuieste_cu')}
            <input value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder={opts.regex ? tr('ui.advancedSearchDialog.1_pentru_grupuri') : ''} />
          </label>
        </div>
        <div className="as-ops">
          <label className="check"><input type="checkbox" checked={opts.caseSensitive} onChange={toggleOpt('caseSensitive')} /> Majuscule exacte</label>
          <label className="check"><input type="checkbox" checked={opts.wholeWord} onChange={toggleOpt('wholeWord')} /> {tr('ui.advancedSearchDialog.cuvinte_intregi')}</label>
          <label className="check"><input type="checkbox" checked={opts.regex} onChange={toggleOpt('regex')} /> {tr('ui.advancedSearchDialog.expresie_regulata')}</label>
          <label className="check">
            Potrivire
            <select value={opts.operator} disabled={opts.regex} onChange={(e) => setOpts((o) => ({ ...o, operator: e.target.value }))}>
              <option value="any">{tr('ui.advancedSearchDialog.oricare_cuvant')}</option>
              <option value="all">{tr('ui.advancedSearchDialog.toate_cuvintele')}</option>
              <option value="exact">{tr('ui.advancedSearchDialog.expresia_exacta')}</option>
            </select>
          </label>
        </div>
        <div className="checks">
          <strong className="muted">{tr('ui.advancedSearchDialog.cauta_in')}</strong>
          {FIELDS.map((f) => (
            <label key={f} className="check">
              <input type="checkbox" checked={fields.includes(f)} onChange={() => setFields((fs) => toggleIn(fs, f))} /> {FIELD_LABELS()[f]}
            </label>
          ))}
          {loadingNotes && <small className="muted">{tr('ui.advancedSearchDialog.se_incarca_notele')}</small>}
          {fields.includes('custom') && customFields.length > 0 && (
            <label className="check">
              {tr('ui.p7.campMetadate')}
              <select value={filters.customField} onChange={setF('customField')} aria-label={tr('ui.p7.campMetadate')}>
                <option value="">{tr('ui.p7.toateCampurile')}</option>
                {customFields.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="as-grid">
          <div className="as-box">
            <strong>{tr('ui.advancedSearchDialog.etichete')}</strong>
            {checkList('labels', labels.map((l) => l.name))}
          </div>
          <div className="as-box">
            <strong>{tr('ui.advancedSearchDialog.stari')}</strong>
            {checkList('statuses', statuses)}
          </div>
          <div className="as-box">
            <strong>{tr('ui.advancedSearchDialog.cuvinte_cheie_toate')}</strong>
            {checkList('keywords', keywordNames)}
          </div>
          <div className="as-box">
            <strong>Domeniu</strong>
            <select value={filters.scope} onChange={(e) => setFilters((f) => ({ ...f, scope: e.target.value }))} aria-label="Domeniu">
              <option value="all">{tr('ui.advancedSearchDialog.tot_proiectul')}</option>
              <option value="draft">Manuscris</option>
              <option value="research">{tr('ui.advancedSearchDialog.cercetare')}</option>
            </select>
            <label className="check">
              <input type="checkbox" checked={filters.includeTrash} onChange={() => setFilters((f) => ({ ...f, includeTrash: !f.includeTrash }))} /> {tr('ui.advancedSearchDialog.include_cosul')}
            </label>
            <label className="check">
              <input type="checkbox" checked={filters.onlyCompile} onChange={() => setFilters((f) => ({ ...f, onlyCompile: !f.onlyCompile }))} /> {tr('ui.advancedSearchDialog.doar_incluse_in_compilare')}
            </label>
          </div>
        </div>
        <div className="as-grid">
          <div className="as-box">
            <strong>{tr('ui.p7.tipDocument')}</strong>
            <div className="as-list">
              {TYPES.map((ty) => (
                <label key={ty} className="check">
                  <input type="checkbox" checked={filters.types.includes(ty)} onChange={() => toggleFilter('types', ty)} /> {tr(`ui.p7.tip.${ty}`)}
                </label>
              ))}
            </div>
          </div>
          <div className="as-box as-dates">
            <strong>{tr('ui.p7.creat')}</strong>
            {date('createdFrom', tr('ui.p7.dela'))}
            {date('createdTo', tr('ui.p7.panala'))}
          </div>
          <div className="as-box as-dates">
            <strong>{tr('ui.p7.modificat')}</strong>
            {date('modifiedFrom', tr('ui.p7.dela'))}
            {date('modifiedTo', tr('ui.p7.panala'))}
          </div>
          <div className="as-box">
            <strong>{tr('ui.p7.formatare')}</strong>
            <select value={filters.format} onChange={setF('format')} aria-label={tr('ui.p7.formatare')}>
              <option value="">{tr('ui.p7.oriceFormatare')}</option>
              {PROJECT_FORMATS.map((f) => <option key={f} value={f}>{tr(`ui.p7.fmt.${f}`)}</option>)}
            </select>
            {filters.format && <small className="muted">{tr('ui.p7.formatareHint')}</small>}
          </div>
        </div>
        {invalid && <p className="warn">{tr('ui.advancedSearchDialog.expresie_regulata_invalida')}</p>}
        {(hasQuery || hasFilter) && (
          <p className="muted">
            {hasQuery ? tr('ui.advancedSearchDialog.x_aparitii_in', { total: total }) : ''}
            {results.length} {results.length === 1 ? 'document' : tr('ui.advancedSearchDialog.documente')}.
          </p>
        )}
        {preview && (
          <div className="as-preview" role="group" aria-label={tr('ui.p7.previzualizare')}>
            <p className="muted small">{tr('ui.p7.previzualizareHint', { n: kept, total: occurrences.length })}</p>
            <div className="row">
              <button className="link" onClick={() => setExcluded(new Set())}>{tr('ui.p7.bifeazaTot')}</button>
              <button className="link" onClick={() => setExcluded(new Set(occurrences.map((o) => o.key)))}>{tr('ui.p7.debifeazaTot')}</button>
            </div>
            {occurrences.map((o) => (
              <label key={o.key} className={`as-occ ${excluded.has(o.key) ? 'off' : ''}`}>
                <input type="checkbox" checked={!excluded.has(o.key)} onChange={() => toggleOcc(o.key)} aria-label={`${o.title}: ${o.match}`} />
                <span className="as-field">{o.title || tr('ui.advancedSearchDialog.fara_titlu')} · {FIELD_LABELS()[o.field]}:</span>
                <span>{o.before}<del>{o.match}</del><ins>{o.replaced}</ins>{o.after}</span>
              </label>
            ))}
          </div>
        )}
        <div className="results" hidden={preview}>
          {results.map(({ node, fields: counts, snippets }) => (
            <div key={node.id} className="result">
              <button className="link" onClick={() => onOpen(node.id)}>
                <strong>{node.title || tr('ui.advancedSearchDialog.fara_titlu')}</strong>
              </button>
              {FIELDS.filter((f) => counts[f]).map((f) => (
                <span key={f} className="as-badge">
                  {FIELD_LABELS()[f]}: {counts[f]}
                </span>
              ))}
              {snippets.map((h, i) => (
                <div key={i} className="snippet">
                  <span className="as-field">{FIELD_LABELS()[h.field]}:</span>
                  {h.before}
                  <mark>{h.match}</mark>
                  {h.after}
                </div>
              ))}
            </div>
          ))}
        </div>
        {message && <p className="ok">{message}</p>}
        <div className="actions">
          <button onClick={onClose}>{tr('btn.close')}</button>
          {onShowInBinder && (
            <button disabled={!results.length} onClick={() => onShowInBinder(results.map((r) => r.node.id), Object.fromEntries(results.map((r) => [r.node.id, Object.values(r.fields).reduce((a, b) => a + b, 0)])))}>
              {tr('ui.p7.arataInBinder')}
            </button>
          )}
          {editCollection && onUpdateCollection ? (
            <button disabled={!hasQuery && !hasFilter} onClick={() => onUpdateCollection(criteria)}>{tr('ui.p7.actualizeazaCautarea')}</button>
          ) : (
            <button disabled={(!hasQuery && !hasFilter) || !onSaveAsCollection} onClick={saveAsCollection}>
              {tr('ui.advancedSearchDialog.salveaza_ca_colectie')}
            </button>
          )}
          {preview && <button onClick={() => setPreview(false)}>{tr('ui.p7.inapoiLaRezultate')}</button>}
          <button className="primary" disabled={!hasQuery || !replaceable.length || busy || !onReplace || (preview && !kept)} onClick={replaceAll}>
            {preview ? tr('ui.p7.inlocuiesteBifate', { n: kept }) : tr('ui.p7.previzualizeazaInlocuirea')}
          </button>
        </div>
      </div>
    </div>
  );
}
