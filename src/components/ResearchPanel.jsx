import React, { useEffect, useState } from 'react';
import { citationParts } from '../lib/aiSession.js';
import '../ai.css';

const KINDS = [
  ['', 'Tot proiectul'],
  ['docs', 'Manuscris'],
  ['research', 'Cercetare'],
  ['notes', 'Note'],
];

// NotebookLM-style research panel: local BM25 retrieval over the project (no AI),
// optional answer from the chosen AI provider built only from the retrieved passages.
export default function ResearchPanel({ api, dir, aiEnabled, onOpen, onClose, aiLabel = '' }) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [results, setResults] = useState([]);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(null); // { message, retry }
  const [progress, setProgress] = useState(null);
  const supported = Boolean(api.ragQuery);

  useEffect(() => {
    if (!api.onRagProgress) return undefined;
    return api.onRagProgress((p) => {
      if (p.dir && p.dir !== dir) return;
      setProgress(p.phase === 'done' ? { done: true, chunks: p.chunks, docs: p.docs } : p);
    });
  }, [api, dir]);

  const wrap = (label, fn) => {
    const go = async () => {
      setBusy(label);
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError({ message: e.message, retry: go });
      } finally {
        setBusy('');
      }
    };
    return go;
  };

  const search = wrap('Caut…', async () => {
    if (!q.trim()) return;
    setAnswer('');
    setResults(await api.ragQuery(dir, q, { k: 10, kinds: kind ? [kind] : undefined }));
  });
  const ask = wrap(`${aiLabel || 'Modelul AI'} formulează răspunsul…`, async () => {
    if (!q.trim()) return;
    setAnswer('');
    const res = await api.ragAsk(dir, q, { k: 6 });
    setAnswer(res.answer);
    setResults(res.passages);
  });
  const asking = busy && busy !== 'Caut…' && busy !== 'Reindexez…';
  useEffect(() => {
    if (!asking || !api.cancelAi) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') api.cancelAi().catch(() => {});
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [asking, api]);
  // [n] in the answer opens passage n (the document it came from).
  const openCite = (n) => {
    const r = results[n - 1];
    if (r && onOpen) onOpen(r.docId, r);
  };
  const rebuild = wrap('Reindexez…', () => api.ragBuild(dir));

  if (!supported) {
    return (
      <aside className="ai-panel research-panel">
        <h3>Cercetare (RAG)</h3>
        <p className="muted">Căutarea în proiect cu index local funcționează în aplicația desktop.</p>
        {onClose && <button onClick={onClose}>Închide</button>}
      </aside>
    );
  }

  return (
    <aside className="ai-panel research-panel">
      <h3>Cercetare în proiect</h3>
      <p className="muted">Caută pasaje în manuscris, note și cercetare. Indexul e local; AI-ul e opțional.</p>
      <form
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && aiEnabled && api.ragAsk) {
            e.preventDefault();
            ask();
          }
        }}
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <input type="search" value={q} placeholder="Ex.: culoarea ochilor lui Andrei" onChange={(e) => setQ(e.target.value)} autoFocus />
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          {KINDS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </form>
      <div className="ai-actions">
        <button onClick={search} disabled={Boolean(busy) || !q.trim()}>
          Caută
        </button>
        {aiEnabled && api.ragAsk && (
          <button onClick={ask} disabled={Boolean(busy) || !q.trim()}>
            Întreabă AI-ul
          </button>
        )}
        <button onClick={rebuild} disabled={Boolean(busy)} title="Reconstruiește indexul după modificări mari">
          Reindexează
        </button>
        {onClose && <button onClick={onClose}>Închide</button>}
      </div>
      {busy && (
        <p className="muted">
          {busy}{' '}
          {asking && api.cancelAi && <button className="link" onClick={() => api.cancelAi().catch(() => {})}>Anulează (Esc)</button>}
        </p>
      )}
      {progress && !progress.done && progress.total > 0 && <progress max={progress.total} value={progress.done} />}
      {progress && progress.done === true && <p className="muted">Index: {progress.docs} surse, {progress.chunks} pasaje.</p>}
      {error && (
        <div className="ai-error" role="alert">
          <span>{error.message}</span>
          {error.retry && <button className="link" onClick={error.retry}>Reîncearcă</button>}
        </div>
      )}
      {answer && (
        <div className="ai-result">
          <h4>Răspuns{aiLabel ? <span className="muted small"> · {aiLabel}</span> : null}</h4>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {citationParts(answer, results.length).map((p, i) =>
              p.cite ? (
                <button key={i} className="link ai-cite" title={results[p.cite - 1]?.title} onClick={() => openCite(p.cite)}>[{p.cite}]</button>
              ) : (
                <React.Fragment key={i}>{p.text}</React.Fragment>
              ),
            )}
          </div>
        </div>
      )}
      {results.length > 0 && (
        <ol className="research-results">
          {results.map((r, i) => (
            <li key={`${r.kind}:${r.docId}:${r.chunk}:${i}`}>
              <button className="link" onClick={() => onOpen && onOpen(r.docId, r)}>
                [{i + 1}] {r.title || 'Fără titlu'}
              </button>{' '}
              <span className="muted">
                {r.kind === 'notes' ? 'note' : r.kind === 'research' ? 'cercetare' : 'manuscris'} · {r.score}
              </span>
              <p>{r.text.length > 400 ? `${r.text.slice(0, 400)}…` : r.text}</p>
            </li>
          ))}
        </ol>
      )}
      {!busy && q && results.length === 0 && !error && <p className="muted">Niciun rezultat încă. Apasă Caută.</p>}
    </aside>
  );
}
