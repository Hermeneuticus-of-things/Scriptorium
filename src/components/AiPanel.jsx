import React, { useEffect, useRef, useState } from 'react';
import { textToHtml } from '../lib/text.js';
import { actionKind, diffParts, noChange, providerText, sessionHistory } from '../lib/aiSession.js';
import '../ai.css';

const ACTIONS = [
  ['proofread', 'Corectură', 'Corectează ortografia, gramatica și punctuația (previzualizare cu diferențe)'],
  ['summarize', 'Sinopsis', 'Sinopsis de 2-3 propoziții pentru Inspector'],
  ['continue', 'Continuă', 'Continuă textul în aceeași voce'],
  ['feedback', 'Critică', 'Feedback editorial: ritm, claritate, dialog'],
  ['consistency', 'Consistență', 'Verifică textul față de notele și cercetarea proiectului'],
];
const LABEL = Object.fromEntries([...ACTIONS.map(([id, l]) => [id, l]), ['ask', 'Întrebare']]);

// Where a result goes back into the editor, captured when the request starts so a later
// caret move cannot redirect it: { from, to, before } in the editor of `docId`.
function captureRange(handle) {
  const ed = handle && handle.editor;
  if (!ed || ed.isDestroyed) return null;
  const { from, to } = ed.state.selection;
  const range = from === to ? { from: 0, to: ed.state.doc.content.size, whole: true, caret: to } : { from, to, whole: false, caret: to };
  return { ...range, before: ed.state.doc.textBetween(range.from, range.to, '\n\n') };
}

function stillThere(ed, range) {
  if (!ed || ed.isDestroyed || !range) return false;
  if (range.to > ed.state.doc.content.size) return false;
  if (range.whole) return ed.state.doc.textBetween(0, ed.state.doc.content.size, '\n\n') === range.before;
  return ed.state.doc.textBetween(range.from, range.to, '\n\n') === range.before;
}

export default function AiPanel({
  api, hasKey, node, getText, hasSelection, getContext, getHandle,
  onInsert, onReplace, onReplaceAll, onSynopsis, onOpenSettings, aiLabel = '', aiModel = '',
}) {
  const [busy, setBusy] = useState(null); // { action, started }
  const [live, setLive] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null); // { message, action }
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState(() => sessionHistory.list());
  const [usedBy, setUsedBy] = useState('');
  const runIdRef = useRef('');
  const lastAction = useRef(null);

  // Live text of the running request (ai:delta) and an elapsed-seconds counter.
  useEffect(() => {
    if (!api.onAiDelta) return undefined;
    return api.onAiDelta((p) => {
      if (p && p.runId === runIdRef.current) setLive((t) => t + p.delta);
    });
  }, [api]);
  useEffect(() => {
    if (!busy) return undefined;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - busy.started) / 1000)), 500);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      clearInterval(t);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [busy]);

  const cancel = () => {
    runIdRef.current = '';
    if (api.cancelAi) api.cancelAi().catch(() => {});
  };

  const run = async (action) => {
    if (busy) return;
    if (!hasKey) {
      setError({ message: `Configurează mai întâi furnizorul AI${aiLabel ? ` (${aiLabel})` : ''} în Setări → AI.`, action, settings: true });
      return;
    }
    if (action === 'ask' && !question.trim()) return;
    const text = getText();
    if (!text.trim() && action !== 'ask') {
      setError({ message: 'Documentul e gol. Scrie ceva sau selectează un fragment.' });
      return;
    }
    lastAction.current = action;
    const handle = getHandle ? getHandle() : null;
    const range = captureRange(handle);
    const selection = range ? !range.whole : hasSelection();
    const runId = `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    runIdRef.current = runId;
    setBusy({ action, started: Date.now() });
    setElapsed(0);
    setLive('');
    setError(null);
    setResult(null);
    try {
      const res = await api.runAi({
        action,
        text,
        question,
        runId,
        context: action === 'consistency' || action === 'ask' ? getContext() : '',
      });
      if (runIdRef.current !== runId) return; // cancelled meanwhile
      const entry = sessionHistory.add({
        action, text: res.text, before: range ? range.before : text, question: action === 'ask' ? question : '',
        docId: node.id, docTitle: node.title, provider: res.provider || aiLabel, model: res.model || aiModel,
      });
      setHistory(sessionHistory.list());
      if (res.provider || res.model) setUsedBy(providerText(res.provider, res.model));
      setResult({ ...entry, selection, range, handle });
    } catch (e) {
      if (runIdRef.current === runId || runIdRef.current === '') setError({ message: e.message, action });
    } finally {
      if (runIdRef.current === runId) runIdRef.current = '';
      setBusy(null);
    }
  };

  // Accept = one editor transaction, so a single Undo restores the original text.
  const accept = () => {
    const r = result;
    const ed = r.handle && r.handle.editor;
    const kind = actionKind(r.action);
    if (ed && r.range) {
      if (!stillThere(ed, r.range)) {
        setError({ message: 'Textul s-a schimbat de la cerere, rezultatul nu mai poate fi pus la locul lui. Rulează din nou sau copiază rezultatul.', action: r.action });
        return;
      }
      const html = textToHtml(r.text);
      if (kind === 'replace') ed.chain().focus().insertContentAt({ from: r.range.from, to: r.range.to }, html).run();
      else ed.chain().focus().insertContentAt(r.range.whole ? r.range.caret : r.range.to, html).run();
    } else if (kind === 'replace') {
      // Without the editor handle, only replace when the same text is still selected.
      if (Boolean(hasSelection()) !== Boolean(r.selection) || getText() !== r.before) {
        setError({ message: 'Selecția s-a schimbat de la cerere. Selectează din nou textul și rulează iar, sau copiază rezultatul.', action: r.action });
        return;
      }
      if (r.selection) onReplace(r.text);
      else onReplaceAll(r.text);
    } else {
      onInsert(r.text);
    }
    setResult(null);
  };

  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (e.target.tagName === 'TEXTAREA') run('ask');
      else if (lastAction.current) run(lastAction.current);
    } else if (e.key === 'Escape' && result && !busy) {
      e.preventDefault();
      setResult(null);
    }
  };

  const who = usedBy || providerText(aiLabel, aiModel);
  const kind = result ? actionKind(result.action) : '';
  const parts = result && kind === 'replace' ? diffParts(result.before, result.text) : null;

  return (
    <aside className="ai-panel" onKeyDown={onKeyDown} aria-busy={Boolean(busy)}>
      <h3>Asistent AI</h3>
      {who && <p className="muted small ai-provider" title="Furnizorul și modelul folosite">Model: {who}</p>}
      {!hasKey && (
        <div className="ai-setup" role="note">
          <p>
            Asistentul are nevoie de un furnizor AI configurat{aiLabel ? ` (acum: ${aiLabel}, fără cheie API)` : ''}. Poți folosi Anthropic, OpenAI, Gemini, OpenRouter
            sau un model local (Ollama, LM Studio) fără cheie.
          </p>
          <button className="primary" onClick={() => onOpenSettings('ai')}>Deschide Setări → AI</button>
        </div>
      )}
      <p className="muted">
        Lucrează pe {hasSelection() ? 'textul selectat' : `tot documentul „${node.title}”`}. <span className="ai-keys">Ctrl+Enter rulează din nou · Esc anulează</span>
      </p>
      <div className="ai-actions">
        {ACTIONS.map(([id, label, title]) => (
          <button key={id} disabled={Boolean(busy) || !hasKey} title={title} onClick={() => run(id)}>
            {label}
          </button>
        ))}
      </div>
      <textarea
        rows={3}
        placeholder="Întreabă orice despre text sau proiect… (Ctrl+Enter)"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        aria-label="Întrebare pentru AI"
      />
      <button disabled={Boolean(busy) || !question.trim() || !hasKey} onClick={() => run('ask')}>Întreabă</button>

      {busy && (
        <div className="ai-live" aria-live="polite">
          <p className="muted">
            {LABEL[busy.action]}: {live ? 'scrie' : 'se gândește'}… {elapsed}s{' '}
            {api.cancelAi && <button className="link" onClick={cancel}>Anulează (Esc)</button>}
          </p>
          {live && <pre className="ai-stream">{live}</pre>}
        </div>
      )}
      {error && (
        <div className="ai-error" role="alert">
          <span>{error.message}</span>
          {error.settings ? (
            <button className="link" onClick={() => onOpenSettings('ai')}>Setări → AI</button>
          ) : (
            error.action && <button className="link" onClick={() => run(error.action)}>Reîncearcă</button>
          )}
        </div>
      )}
      {result && (
        <div className="ai-result">
          <h4>{LABEL[result.action]}{result.selection ? ' · selecție' : ''}</h4>
          {parts ? (
            noChange(parts) ? (
              <p className="ok">Nicio corectură necesară.</p>
            ) : (
              <div className="ai-diff" aria-label="Diferențe înainte/după">
                {parts.map((p, i) => (p.added ? <ins key={i}>{p.value}</ins> : p.removed ? <del key={i}>{p.value}</del> : <span key={i}>{p.value}</span>))}
              </div>
            )
          ) : (
            <pre>{result.text}</pre>
          )}
          <div className="ai-actions">
            {kind === 'replace' && parts && !noChange(parts) && (
              <button className="primary" onClick={accept} title="Un singur pas de Undo">
                {result.selection ? 'Acceptă (înlocuiește selecția)' : 'Acceptă (înlocuiește documentul)'}
              </button>
            )}
            {kind === 'insert' && <button className="primary" onClick={accept}>Inserează</button>}
            {result.action === 'ask' && <button onClick={() => onInsert(result.text)}>Inserează la cursor</button>}
            {kind === 'synopsis' && (
              <button className="primary" onClick={() => { onSynopsis(result.text); setResult(null); }}>Pune ca sinopsis în Inspector</button>
            )}
            <button onClick={() => navigator.clipboard?.writeText(result.text)}>Copiază</button>
            <button onClick={() => setResult(null)}>{kind === 'replace' || kind === 'insert' ? 'Respinge (Esc)' : 'Închide'}</button>
          </div>
        </div>
      )}
      {history.length > 0 && (
        <details className="ai-history">
          <summary>Rezultate recente ({history.length})</summary>
          <ul>
            {history.map((h) => (
              <li key={h.id}>
                <div className="small muted">
                  {LABEL[h.action]} · „{h.docTitle}” · {new Date(h.at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="ai-history-text">{h.text.length > 160 ? `${h.text.slice(0, 160)}…` : h.text}</div>
                <div className="ai-actions">
                  <button className="link" onClick={() => onInsert(h.text)}>Reinserează la cursor</button>
                  <button className="link" onClick={() => navigator.clipboard?.writeText(h.text)}>Copiază</button>
                </div>
              </li>
            ))}
          </ul>
          <button className="link" onClick={() => { sessionHistory.clear(); setHistory([]); }}>Golește istoricul</button>
        </details>
      )}
    </aside>
  );
}
