import React, { useState } from 'react';

const ACTIONS = [
  ['proofread', 'Corectură'],
  ['summarize', 'Sinopsis'],
  ['continue', 'Continuă'],
  ['feedback', 'Critică'],
  ['consistency', 'Consistență'],
];

export default function AiPanel({ api, hasKey, node, getText, hasSelection, getContext, onInsert, onReplace, onReplaceAll, onSynopsis, onOpenSettings, aiLabel = '' }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');

  const run = async (action) => {
    const text = getText();
    if (!text.trim() && action !== 'ask') {
      setError('Documentul e gol. Scrie ceva sau selectează un fragment.');
      return;
    }
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const selection = hasSelection();
      const res = await api.runAi({
        action,
        text,
        question,
        context: action === 'consistency' || action === 'ask' ? getContext() : '',
      });
      setResult({ action, text: res.text, selection });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="ai-panel">
      <h3>Asistent AI</h3>
      {aiLabel && <p className="muted small">Furnizor: {aiLabel}</p>}
      {!hasKey && (
        <p className="warn">
          Lipsește cheia API {aiLabel ? `pentru ${aiLabel}` : 'a furnizorului AI'}. <button className="link" onClick={onOpenSettings}>Deschide Setări</button>
        </p>
      )}
      <p className="muted">Lucrează pe textul selectat sau, fără selecție, pe tot documentul „{node.title}”.</p>
      <div className="ai-actions">
        {ACTIONS.map(([id, label]) => (
          <button key={id} disabled={busy} onClick={() => run(id)}>
            {label}
          </button>
        ))}
      </div>
      <textarea rows={3} placeholder="Întreabă orice despre text sau proiect…" value={question} onChange={(e) => setQuestion(e.target.value)} />
      <button disabled={busy || !question.trim()} onClick={() => run('ask')}>Întreabă</button>
      {busy && (
        <p className="muted">
          Se lucrează…{' '}
          {api.cancelAi && <button className="link" onClick={() => api.cancelAi()}>Anulează</button>}
        </p>
      )}
      {error && <p className="warn">{error}</p>}
      {result && (
        <div className="ai-result">
          <pre>{result.text}</pre>
          <div className="ai-actions">
            {(result.action === 'proofread' || result.action === 'continue') && result.selection && (
              <button onClick={() => onReplace(result.text)}>Înlocuiește selecția</button>
            )}
            {result.action === 'proofread' && !result.selection && (
              <button onClick={() => onReplaceAll(result.text)}>Înlocuiește documentul</button>
            )}
            {(result.action === 'continue' || result.action === 'ask') && <button onClick={() => onInsert(result.text)}>Inserează</button>}
            {result.action === 'summarize' && <button onClick={() => onSynopsis(result.text)}>Pune ca sinopsis</button>}
            <button onClick={() => navigator.clipboard.writeText(result.text)}>Copiază</button>
          </div>
        </div>
      )}
    </aside>
  );
}
