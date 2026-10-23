import React, { useEffect, useMemo, useState } from 'react';
import { searchProject, buildTerms } from '../lib/projectSearch.js';
import { listKeywords } from '../lib/collections.js';
import { flatten } from '../lib/tree.js';

const FIELD_LABELS = {
  title: 'Titlu',
  text: 'Text',
  notes: 'Note',
  synopsis: 'Sinopsis',
  keywords: 'Cuvinte cheie',
  custom: 'Metadate',
};
const FIELDS = Object.keys(FIELD_LABELS);

const CSS = `
.as-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin: 8px 0; }
.as-box { border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; }
.as-box > strong { display: block; font-size: 12px; color: var(--muted); font-weight: 500; margin-bottom: 4px; }
.as-list { max-height: 110px; overflow: auto; display: flex; flex-direction: column; gap: 2px; }
.as-badge { display: inline-block; font-size: 11px; padding: 0 6px; border-radius: 8px; background: var(--accent-soft); margin-left: 4px; }
.as-field { font-size: 11px; color: var(--muted); margin-right: 4px; }
.as-ops { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.as-ops select { padding: 2px 6px; }
`;

const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function AdvancedSearchDialog({ project, docs, readNotes, onOpen, onReplace, onSaveAsCollection, onClose, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [replacement, setReplacement] = useState('');
  const [opts, setOpts] = useState({ regex: false, caseSensitive: false, wholeWord: false, operator: 'any' });
  const [fields, setFields] = useState(['title', 'text', 'synopsis', 'keywords', 'custom']);
  const [filters, setFilters] = useState({ labels: [], statuses: [], keywords: [], scope: 'all', includeTrash: false, onlyCompile: false });
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

  const total = results.reduce((s, r) => s + Object.values(r.fields).reduce((a, b) => a + b, 0), 0);
  const replaceable = results.filter((r) => r.fields.title || r.fields.text || r.fields.notes || r.fields.synopsis);

  const keywordNames = useMemo(() => listKeywords(project).map((k) => k.name), [project]);
  const labels = project.labels || [];
  const statuses = project.statuses || [];

  const toggleOpt = (k) => () => setOpts((o) => ({ ...o, [k]: !o[k] }));
  const toggleFilter = (k, v) => setFilters((f) => ({ ...f, [k]: toggleIn(f[k], v) }));

  const replaceAll = async () => {
    if (!query || !replaceable.length || !onReplace) return;
    if (!window.confirm(`Înlocuiești aparițiile din ${replaceable.length} documente (titlu, sinopsis, text și note, după câmpurile bifate)? Se face snapshot automat înainte.`)) return;
    setBusy(true);
    try {
      const n = await onReplace(criteria, replacement);
      setMessage(typeof n === 'number' ? `Înlocuite: ${n}.` : 'Înlocuire efectuată.');
      if (notesOn) setNotesById({});
    } finally {
      setBusy(false);
    }
  };

  const saveAsCollection = () => {
    const title = window.prompt('Numele colecției:', query || 'Căutare salvată');
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
      <small className="muted">Niciuna definită.</small>
    );

  const hasQuery = Boolean(query) && !invalid;
  const hasFilter = filters.labels.length || filters.statuses.length || filters.keywords.length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label="Căutare avansată" onClick={(e) => e.stopPropagation()}>
        <style>{CSS}</style>
        <h2>Căutare avansată în proiect</h2>
        <div className="row">
          <label>
            Caută
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} className={invalid ? 'invalid' : ''} />
          </label>
          <label>
            Înlocuiește cu
            <input value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder={opts.regex ? '$1 pentru grupuri' : ''} />
          </label>
        </div>
        <div className="as-ops">
          <label className="check"><input type="checkbox" checked={opts.caseSensitive} onChange={toggleOpt('caseSensitive')} /> Majuscule exacte</label>
          <label className="check"><input type="checkbox" checked={opts.wholeWord} onChange={toggleOpt('wholeWord')} /> Cuvinte întregi</label>
          <label className="check"><input type="checkbox" checked={opts.regex} onChange={toggleOpt('regex')} /> Expresie regulată</label>
          <label className="check">
            Potrivire
            <select value={opts.operator} disabled={opts.regex} onChange={(e) => setOpts((o) => ({ ...o, operator: e.target.value }))}>
              <option value="any">Oricare cuvânt</option>
              <option value="all">Toate cuvintele</option>
              <option value="exact">Expresia exactă</option>
            </select>
          </label>
        </div>
        <div className="checks">
          <strong className="muted">Caută în:</strong>
          {FIELDS.map((f) => (
            <label key={f} className="check">
              <input type="checkbox" checked={fields.includes(f)} onChange={() => setFields((fs) => toggleIn(fs, f))} /> {FIELD_LABELS[f]}
            </label>
          ))}
          {loadingNotes && <small className="muted">Se încarcă notele…</small>}
        </div>
        <div className="as-grid">
          <div className="as-box">
            <strong>Etichete</strong>
            {checkList('labels', labels.map((l) => l.name))}
          </div>
          <div className="as-box">
            <strong>Stări</strong>
            {checkList('statuses', statuses)}
          </div>
          <div className="as-box">
            <strong>Cuvinte cheie (toate)</strong>
            {checkList('keywords', keywordNames)}
          </div>
          <div className="as-box">
            <strong>Domeniu</strong>
            <select value={filters.scope} onChange={(e) => setFilters((f) => ({ ...f, scope: e.target.value }))} aria-label="Domeniu">
              <option value="all">Tot proiectul</option>
              <option value="draft">Manuscris</option>
              <option value="research">Cercetare</option>
            </select>
            <label className="check">
              <input type="checkbox" checked={filters.includeTrash} onChange={() => setFilters((f) => ({ ...f, includeTrash: !f.includeTrash }))} /> Include coșul
            </label>
            <label className="check">
              <input type="checkbox" checked={filters.onlyCompile} onChange={() => setFilters((f) => ({ ...f, onlyCompile: !f.onlyCompile }))} /> Doar incluse în compilare
            </label>
          </div>
        </div>
        {invalid && <p className="warn">Expresie regulată invalidă.</p>}
        {(hasQuery || hasFilter) && (
          <p className="muted">
            {hasQuery ? `${total} apariții în ` : ''}
            {results.length} {results.length === 1 ? 'document' : 'documente'}.
          </p>
        )}
        <div className="results">
          {results.map(({ node, fields: counts, snippets }) => (
            <div key={node.id} className="result">
              <button className="link" onClick={() => onOpen(node.id)}>
                <strong>{node.title || '(fără titlu)'}</strong>
              </button>
              {FIELDS.filter((f) => counts[f]).map((f) => (
                <span key={f} className="as-badge">
                  {FIELD_LABELS[f]}: {counts[f]}
                </span>
              ))}
              {snippets.map((h, i) => (
                <div key={i} className="snippet">
                  <span className="as-field">{FIELD_LABELS[h.field]}:</span>
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
          <button onClick={onClose}>Închide</button>
          <button disabled={(!hasQuery && !hasFilter) || !onSaveAsCollection} onClick={saveAsCollection}>
            Salvează ca colecție
          </button>
          <button className="primary" disabled={!hasQuery || !replaceable.length || busy || !onReplace} onClick={replaceAll}>
            Înlocuiește tot
          </button>
        </div>
      </div>
    </div>
  );
}
