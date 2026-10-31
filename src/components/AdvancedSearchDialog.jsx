import React, { useEffect, useMemo, useRef, useState } from 'react';
import { searchProject, parseQuery, buildTerms } from '../lib/projectSearch.js';
import { listKeywords } from '../lib/collections.js';
import { flatten } from '../lib/tree.js';
import { t as tr } from '../lib/i18n.js';
import { uiPrompt } from '../lib/uiPrompt.jsx';

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
.as-swap { align-self: end; white-space: nowrap; }
`;

const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function AdvancedSearchDialog({ project, docs, readNotes, onOpen, onReplace, onSaveAsCollection, onClose, initialQuery = '', onResults, onLastSearch, selectionIds = [], api }) {
  const [query, setQuery] = useState(initialQuery);
  const [replacement, setReplacement] = useState('');
  const [affectSnapshots, setAffectSnapshots] = useState(false);
  const [opts, setOpts] = useState({ regex: false, caseSensitive: false, wholeWord: false, operator: 'any', invert: false });
  const [sortCfg, setSortCfg] = useState({ by: 'binder', desc: false });
  const [fields, setFields] = useState(['title', 'text', 'synopsis', 'keywords', 'custom']);
  const [filters, setFilters] = useState({ labels: [], statuses: [], keywords: [], scope: 'all', includeTrash: false, onlyCompile: false, draftOnly: false, selectionScope: false, excludeCompile: false });
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

  const criteria = useMemo(
    () => ({
      query, ...opts, fields, ...filters, sort: sortCfg.by, sortDesc: sortCfg.desc,
      selectionIds: filters.selectionScope && selectionIds.length ? selectionIds : [],
      affectSnapshots,
    }),
    [query, opts, fields, filters, sortCfg, selectionIds, affectSnapshots]
  );
  const parsed = useMemo(() => parseQuery(criteria), [criteria]);
  const terms = useMemo(() => buildTerms(criteria), [criteria]);
  const invalid = Boolean(query) && (parsed === null || terms === null || terms.some((t) => !t));
  const results = useMemo(() => searchProject(project, docs, notesById, criteria), [project, docs, notesById, criteria]);

  // The last results with a query feed the permanent "Search results" tab of the binder.
  useEffect(() => {
    if (onResults && query.trim() && !invalid) onResults(results.map((r) => r.node.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  const total = results.reduce((s, r) => s + Object.values(r.fields).reduce((a, b) => a + b, 0), 0);
  const replaceable = results.filter((r) => r.fields.title || r.fields.text || r.fields.notes || r.fields.synopsis || r.fields.custom);

  const keywordNames = useMemo(() => listKeywords(project).map((k) => k.name), [project]);
  const labels = project.labels || [];
  const statuses = project.statuses || [];

  const toggleOpt = (k) => () => setOpts((o) => ({ ...o, [k]: !o[k] }));
  const toggleFilter = (k, v) => setFilters((f) => ({ ...f, [k]: toggleIn(f[k], v) }));

  // Scrivener §11.3: Swap exchanges the contents of the Replace and With fields.
  const swap = () => {
    setQuery(replacement);
    setReplacement(query);
  };

  const replaceAll = async () => {
    if (!query || !replaceable.length || !onReplace) return;
    if (!window.confirm(tr('ui.advancedSearchDialog.inlocuiesti_aparitiile_din_x_documente', { length: replaceable.length }))) return;
    setBusy(true);
    try {
      const n = await onReplace(criteria, replacement);
      setMessage(typeof n === 'number' ? tr('ui.advancedSearchDialog.inlocuite_x', { n: n }) : tr('ui.advancedSearchDialog.inlocuire_efectuata'));
      if (notesOn) setNotesById({});
    } finally {
      setBusy(false);
    }
  };

  const saveAsCollection = async () => {
    const title = await uiPrompt(tr('ui.advancedSearchDialog.numele_colectiei'), query || tr('ui.advancedSearchDialog.cautare_salvata'));
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
  const hasFilter = filters.labels.length || filters.statuses.length || filters.keywords.length;

  // Scrivener §11.1.1: the last search used lands in the system "Search Results"
  // collection and survives reopening. Recorded when a result is opened and once
  // more at close, so the stored criteria match what the user actually used.
  const latestRef = useRef({ criteria, hasQuery });
  latestRef.current = { criteria, hasQuery };
  useEffect(() => () => {
    const { criteria: c, hasQuery: ok } = latestRef.current;
    if (ok) onLastSearch?.(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label={tr('ui.advancedSearchDialog.cautare_avansata')} onClick={(e) => e.stopPropagation()}>
        <style>{CSS}</style>
        <h2>{tr('ui.advancedSearchDialog.cautare_avansata_in_proiect')}</h2>
        <div className="row">
          <label>
            {tr('ui.advancedSearchDialog.cauta')}
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} className={invalid ? 'invalid' : ''} />
          </label>
          <label>
            {tr('ui.advancedSearchDialog.inlocuieste_cu')}
            <input value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder={opts.regex ? tr('ui.advancedSearchDialog.1_pentru_grupuri') : ''} />
          </label>
          <button type="button" className="as-swap" onClick={swap}>
            {tr('ui.advancedSearchDialog.swap')}
          </button>
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
              <option value="startsWith">{tr('ui.advancedSearchDialog.incepe_cuvantul')}</option>
              <option value="endsWith">{tr('ui.advancedSearchDialog.se_termina_cuvantul')}</option>
            </select>
          </label>
          <label className="check">
            {tr('ui.advancedSearchDialog.ordoneaza')}
            <select value={sortCfg.by} onChange={(e) => setSortCfg((s) => ({ ...s, by: e.target.value }))}>
              <option value="binder">{tr('ui.advancedSearchDialog.ordine_binder')}</option>
              <option value="title">{tr('ui.advancedSearchDialog.dupa_titlu')}</option>
              <option value="created">{tr('ui.advancedSearchDialog.dupa_data_crearii')}</option>
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={sortCfg.desc} onChange={() => setSortCfg((s) => ({ ...s, desc: !s.desc }))} /> {tr('ui.advancedSearchDialog.descrescator')}</label>
        </div>
        <div className="checks">
          <label className="check"><input type="checkbox" checked={opts.invert} onChange={toggleOpt('invert')} /> {tr('ui.advancedSearchDialog.inverseaza_rezultatele')}</label>
        </div>
        <div className="checks">
          <strong className="muted">{tr('ui.advancedSearchDialog.cauta_in')}</strong>
          {FIELDS.map((f) => (
            <label key={f} className="check">
              <input type="checkbox" checked={fields.includes(f)} onChange={() => setFields((fs) => toggleIn(fs, f))} /> {FIELD_LABELS()[f]}
            </label>
          ))}
          {/* Snapshots are archived document text: replaceable only if the api can rewrite them. */}
          <label className="check">
            <input
              type="checkbox"
              checked={affectSnapshots}
              disabled={!api?.updateSnapshotHtml}
              onChange={() => setAffectSnapshots((v) => !v)}
            /> {tr('ui.advancedSearchDialog.include_snapshots')}
          </label>
          {loadingNotes && <small className="muted">{tr('ui.advancedSearchDialog.se_incarca_notele')}</small>}
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
            <label className="check">
              <input type="checkbox" checked={filters.draftOnly} onChange={() => setFilters((f) => ({ ...f, draftOnly: !f.draftOnly }))} /> {tr('ui.advancedSearchDialog.doar_in_manuscris')}
            </label>
            <label className="check">
              <input type="checkbox" checked={filters.selectionScope} disabled={!selectionIds.length} onChange={() => setFilters((f) => ({ ...f, selectionScope: !f.selectionScope }))} /> {tr('ui.advancedSearchDialog.doar_selectia')}{selectionIds.length ? ` (${selectionIds.length} ${selectionIds.length === 1 ? 'document' : tr('ui.advancedSearchDialog.documente')})` : ''}
            </label>
            <label className="check">
              <input type="checkbox" checked={filters.excludeCompile} onChange={() => setFilters((f) => ({ ...f, excludeCompile: !f.excludeCompile }))} /> {tr('ui.advancedSearchDialog.doar_excluse_compilare')}
            </label>
          </div>
        </div>
        {invalid && <p className="warn">{tr('ui.advancedSearchDialog.expresie_regulata_invalida')}</p>}
        {(hasQuery || hasFilter) && (
          <p className="muted">
            {hasQuery ? tr('ui.advancedSearchDialog.x_aparitii_in', { total: total }) : ''}
            {results.length} {results.length === 1 ? 'document' : tr('ui.advancedSearchDialog.documente')}.
          </p>
        )}
        <div className="results">
          {results.map(({ node, fields: counts, snippets }) => (
            <div key={node.id} className="result">
              <button className="link" onClick={() => { onLastSearch?.(criteria); onOpen(node.id); }}>
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
          <button disabled={(!hasQuery && !hasFilter) || !onSaveAsCollection} onClick={saveAsCollection}>
            {tr('ui.advancedSearchDialog.salveaza_ca_colectie')}
          </button>
          <button className="primary" disabled={!hasQuery || !replaceable.length || busy || !onReplace} onClick={replaceAll}>
            {tr('ui.advancedSearchDialog.inlocuieste_tot')}
          </button>
        </div>
      </div>
    </div>
  );
}
