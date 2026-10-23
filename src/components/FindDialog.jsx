import React, { useMemo, useState } from 'react';
import { buildRegex, findInHtml } from '../lib/search.js';
import { flatten } from '../lib/tree.js';

export default function FindDialog({ project, docs, onOpen, onReplaceAll, onClose }) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [opts, setOpts] = useState({ regex: false, caseSensitive: false, wholeWord: false, includeTrash: false });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const re = useMemo(() => buildRegex({ query, ...opts }), [query, opts]);
  const invalid = query && !re;

  const results = useMemo(() => {
    if (!re) return [];
    const trash = project.tree.find((n) => n.root === 'trash');
    const trashIds = new Set(flatten(trash.children).map((n) => n.id));
    const out = [];
    for (const n of flatten(project.tree)) {
      if (n.root || (!opts.includeTrash && trashIds.has(n.id))) continue;
      const hits = findInHtml(docs[n.id] || '', re);
      re.lastIndex = 0;
      const inTitle = re.test(n.title);
      re.lastIndex = 0;
      const inSyn = re.test(n.synopsis || '');
      if (hits.length || inTitle || inSyn) out.push({ node: n, hits, inTitle, inSyn });
    }
    return out;
  }, [re, project, docs, opts.includeTrash]);

  const total = results.reduce((s, r) => s + r.hits.length, 0);
  const toggle = (k) => () => setOpts((o) => ({ ...o, [k]: !o[k] }));

  const replaceAll = async () => {
    const ids = results.filter((r) => r.hits.length).map((r) => r.node.id);
    if (!ids.length) return;
    if (!window.confirm(`Înlocuiești ${total} apariții în ${ids.length} documente? Se face snapshot automat al fiecărui document înainte.`)) return;
    setBusy(true);
    try {
      const n = await onReplaceAll(ids, re, replacement);
      setMessage(`Înlocuite: ${n}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label="Caută în proiect" onClick={(e) => e.stopPropagation()}>
        <h2>Caută și înlocuiește în proiect</h2>
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
        <div className="checks">
          <label className="check"><input type="checkbox" checked={opts.caseSensitive} onChange={toggle('caseSensitive')} /> Majuscule exacte</label>
          <label className="check"><input type="checkbox" checked={opts.wholeWord} onChange={toggle('wholeWord')} /> Cuvinte întregi</label>
          <label className="check"><input type="checkbox" checked={opts.regex} onChange={toggle('regex')} /> Expresie regulată</label>
          <label className="check"><input type="checkbox" checked={opts.includeTrash} onChange={toggle('includeTrash')} /> Include coșul</label>
        </div>
        {invalid && <p className="warn">Expresie regulată invalidă.</p>}
        {re && <p className="muted">{total} apariții în text, {results.length} documente (inclusiv titluri și sinopsis).</p>}
        <div className="results">
          {results.map(({ node, hits, inTitle, inSyn }) => (
            <div key={node.id} className="result">
              <button className="link" onClick={() => onOpen(node.id)}>
                <strong>{node.title}</strong>
              </button>{' '}
              <small className="muted">
                {hits.length} în text{inTitle ? ' · titlu' : ''}{inSyn ? ' · sinopsis' : ''}
              </small>
              {hits.slice(0, 5).map((h, i) => (
                <div key={i} className="snippet">
                  {h.before}
                  <mark>{h.match}</mark>
                  {h.after}
                </div>
              ))}
              {hits.length > 5 && <small className="muted">+ încă {hits.length - 5}</small>}
            </div>
          ))}
        </div>
        {message && <p className="ok">{message}</p>}
        <div className="actions">
          <button onClick={onClose}>Închide</button>
          <button className="primary" disabled={!re || !total || busy} onClick={replaceAll}>
            Înlocuiește tot
          </button>
        </div>
      </div>
    </div>
  );
}
