import React, { useEffect, useState } from 'react';
import { citationParts } from '../lib/aiSession.js';
import '../ai.css';
import { t } from '../lib/i18n.js';

const KINDS = () => ([
  ['', t('ui.advancedSearchDialog.tot_proiectul')],
  ['docs', 'Manuscris'],
  ['research', t('ui.advancedSearchDialog.cercetare')],
  ['notes', t('ui.advancedSearchDialog.note')],
]);

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
  const ask = wrap(t('ui.researchPanel.x_formuleaza_raspunsul', { v0: aiLabel || 'Modelul AI' }), async () => {
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
        <h3>{t('ui.researchPanel.cercetare_rag')}</h3>
        <p className="muted">{t('ui.researchPanel.cautarea_in_proiect_cu_index')}</p>
        {onClose && <button onClick={onClose}>{t('btn.close')}</button>}
      </aside>
    );
  }

  return (
    <aside className="ai-panel research-panel">
      <h3>{t('ui.researchPanel.cercetare_in_proiect')}</h3>
      <p className="muted">{t('ui.researchPanel.cauta_pasaje_in_manuscris_note')}</p>
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
          {KINDS().map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </form>
      <div className="ai-actions">
        <button onClick={search} disabled={Boolean(busy) || !q.trim()}>
          {t('ui.advancedSearchDialog.cauta')}
        </button>
        {aiEnabled && api.ragAsk && (
          <button onClick={ask} disabled={Boolean(busy) || !q.trim()}>
            {t('ui.researchPanel.intreaba_ai_ul')}
          </button>
        )}
        <button onClick={rebuild} disabled={Boolean(busy)} title={t('ui.researchPanel.reconstruieste_indexul_dupa_modificari_mari')}>
          {t('ui.researchPanel.reindexeaza')}
        </button>
        {onClose && <button onClick={onClose}>{t('btn.close')}</button>}
      </div>
      {busy && (
        <p className="muted">
          {busy}{' '}
          {asking && api.cancelAi && <button className="link" onClick={() => api.cancelAi().catch(() => {})}>{t('ui.aiPanel.anuleaza_esc')}</button>}
        </p>
      )}
      {progress && !progress.done && progress.total > 0 && <progress max={progress.total} value={progress.done} />}
      {progress && progress.done === true && <p className="muted">Index: {progress.docs} surse, {progress.chunks} pasaje.</p>}
      {error && (
        <div className="ai-error" role="alert">
          <span>{error.message}</span>
          {error.retry && <button className="link" onClick={error.retry}>{t('ui.aiPanel.reincearca')}</button>}
        </div>
      )}
      {answer && (
        <div className="ai-result">
          <h4>{t('ui.researchPanel.raspuns')}{aiLabel ? <span className="muted small"> · {aiLabel}</span> : null}</h4>
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
                [{i + 1}] {r.title || t('ui.app.fara_titlu')}
              </button>{' '}
              <span className="muted">
                {r.kind === 'notes' ? 'note' : r.kind === 'research' ? 'cercetare' : 'manuscris'} · {r.score}
              </span>
              <p>{r.text.length > 400 ? `${r.text.slice(0, 400)}…` : r.text}</p>
            </li>
          ))}
        </ol>
      )}
      {!busy && q && results.length === 0 && !error && <p className="muted">{t('ui.researchPanel.niciun_rezultat_inca_apasa_cauta')}</p>}
    </aside>
  );
}
