import React, { useEffect, useRef, useState } from 'react';
import { textToHtml } from '../lib/text.js';
import { insertable } from '../lib/inlineInsert.js';
import { actionKind, diffParts, noChange, providerText, sessionHistory } from '../lib/aiSession.js';
import '../ai.css';
import { t as tr, uiLocale } from '../lib/i18n.js';

const ACTIONS = () => ([
  ['proofread', tr('ui.aiPanel.corectura'), tr('ui.aiPanel.corecteaza_ortografia_gramatica_si_punctuatia')],
  ['summarize', tr('ui.advancedSearchDialog.sinopsis'), tr('ui.aiPanel.sinopsis_de_2_3_propozitii')],
  ['continue', tr('ui.aiPanel.continua'), tr('ui.aiPanel.continua_textul_in_aceeasi_voce')],
  ['feedback', tr('ui.aiPanel.critica'), tr('ui.aiPanel.feedback_editorial')],
  ['consistency', tr('ui.aiPanel.consistenta'), tr('ui.aiPanel.verifica_textul_fata_de_notele')],
  ['research', tr('ui.aiPanel.cercetare'), tr('ui.aiPanel.cercetare_tip')],
  ['define', tr('ui.aiPanel.explica'), tr('ui.aiPanel.explica_tip')],
  ['translate', tr('ui.aiPanel.traduce'), tr('ui.aiPanel.traduce_tip')],
]);
const LABEL = () => (Object.fromEntries([...ACTIONS().map(([id, l]) => [id, l]), ['ask', tr('ui.aiPanel.intrebare')]]));

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
  translateTo = '', request = null,
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

  // Actions started from the editor's context menu or the command palette ({ action, n }).
  const runRef = useRef(null);
  useEffect(() => {
    if (request && request.action) runRef.current?.(request.action);
  }, [request && request.n]);

  const cancel = () => {
    runIdRef.current = '';
    if (api.cancelAi) api.cancelAi().catch(() => {});
  };

  const run = async (action) => {
    if (busy) return;
    if (!hasKey) {
      setError({ message: tr('ui.aiPanel.configureaza_mai_intai_furnizorul_aix', { v0: aiLabel ? ` (${aiLabel})` : '' }), action, settings: true });
      return;
    }
    if (action === 'ask' && !question.trim()) return;
    const text = getText();
    if (!text.trim() && action !== 'ask') {
      setError({ message: tr('ui.aiPanel.documentul_e_gol_scrie_ceva') });
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
        lang: action === 'translate' ? translateTo : undefined,
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

  runRef.current = run;

  // Accept = one editor transaction, so a single Undo restores the original text.
  const accept = () => {
    const r = result;
    const ed = r.handle && r.handle.editor;
    const kind = actionKind(r.action);
    if (ed && r.range) {
      if (!stillThere(ed, r.range)) {
        setError({ message: tr('ui.aiPanel.textul_s_a_schimbat_de'), action: r.action });
        return;
      }
      if (kind === 'replace') {
        const before = ed.state.doc.textBetween(r.range.from, r.range.to, '\n\n');
        const sameBlock = ed.state.doc.resolve(r.range.from).sameParent(ed.state.doc.resolve(r.range.to));
        const content = sameBlock ? insertable(r.text, before) : textToHtml(r.text);
        ed.chain().focus().insertContentAt({ from: r.range.from, to: r.range.to }, content).run();
      } else ed.chain().focus().insertContentAt(r.range.whole ? r.range.caret : r.range.to, insertable(r.text)).run();
    } else if (kind === 'replace') {
      // Without the editor handle, only replace when the same text is still selected.
      if (Boolean(hasSelection()) !== Boolean(r.selection) || getText() !== r.before) {
        setError({ message: tr('ui.aiPanel.selectia_s_a_schimbat_de'), action: r.action });
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
      {who && <p className="muted small ai-provider" title={tr('ui.aiPanel.furnizorul_si_modelul_folosite')}>Model: {who}</p>}
      {!hasKey && (
        <div className="ai-setup" role="note">
          <p>
            Asistentul are nevoie de un furnizor AI configurat{aiLabel ? tr('ui.aiPanel.acum_x_fara_cheie_api', { aiLabel: aiLabel }) : ''}{tr('ui.aiPanel.poti_folosi_anthropic_openai_gemini')}
          </p>
          <button className="primary" onClick={() => onOpenSettings('ai')}>{tr('ui.aiPanel.deschide_setari_ai')}</button>
        </div>
      )}
      <p className="muted">
        {tr('ui.aiPanel.lucreaza_pe')} {hasSelection() ? tr('ui.aiPanel.textul_selectat') : tr('ui.aiPanel.tot_documentul_x', { title: node.title })}. <span className="ai-keys">{tr('ui.aiPanel.ctrl_enter_ruleaza_din_nou')}</span>
      </p>
      <div className="ai-actions">
        {ACTIONS().map(([id, label, title]) => (
          <button key={id} disabled={Boolean(busy) || !hasKey} title={title} onClick={() => run(id)}>
            {label}
          </button>
        ))}
      </div>
      <textarea
        rows={3}
        placeholder={tr('ui.aiPanel.intreaba_orice_despre_text_sau')}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        aria-label={tr('ui.aiPanel.intrebare_pentru_ai')}
      />
      <button disabled={Boolean(busy) || !question.trim() || !hasKey} onClick={() => run('ask')}>{tr('ui.aiPanel.intreaba')}</button>

      {busy && (
        <div className="ai-live" aria-live="polite">
          <p className="muted">
            {LABEL()[busy.action]}: {live ? 'scrie' : tr('ui.aiPanel.se_gandeste')}… {elapsed}s{' '}
            {api.cancelAi && <button className="link" onClick={cancel}>{tr('ui.aiPanel.anuleaza_esc')}</button>}
          </p>
          {live && <pre className="ai-stream">{live}</pre>}
        </div>
      )}
      {error && (
        <div className="ai-error" role="alert">
          <span>{error.message}</span>
          {error.settings ? (
            <button className="link" onClick={() => onOpenSettings('ai')}>{tr('ui.aiPanel.setari_ai')}</button>
          ) : (
            error.action && <button className="link" onClick={() => run(error.action)}>{tr('ui.aiPanel.reincearca')}</button>
          )}
        </div>
      )}
      {result && (
        <div className="ai-result">
          <h4>{LABEL()[result.action]}{result.selection ? tr('ui.aiPanel.selectie') : ''}</h4>
          {parts ? (
            noChange(parts) ? (
              <p className="ok">{tr('ui.aiPanel.nicio_corectura_necesara')}</p>
            ) : (
              <div className="ai-diff" aria-label={tr('ui.aiPanel.diferente_inainte_dupa')}>
                {parts.map((p, i) => (p.added ? <ins key={i}>{p.value}</ins> : p.removed ? <del key={i}>{p.value}</del> : <span key={i}>{p.value}</span>))}
              </div>
            )
          ) : (
            <pre>{result.text}</pre>
          )}
          <div className="ai-actions">
            {kind === 'replace' && parts && !noChange(parts) && (
              <button className="primary" onClick={accept} title={tr('ui.aiPanel.un_singur_pas_de_undo')}>
                {result.selection ? tr('ui.aiPanel.accepta_inlocuieste_selectia') : tr('ui.aiPanel.accepta_inlocuieste_documentul')}
              </button>
            )}
            {kind === 'insert' && <button className="primary" onClick={accept}>{tr('ui.aiPanel.insereaza')}</button>}
            {result.action === 'ask' && <button onClick={() => onInsert(result.text)}>{tr('ui.aiPanel.insereaza_la_cursor')}</button>}
            {kind === 'synopsis' && (
              <button className="primary" onClick={() => { onSynopsis(result.text); setResult(null); }}>{tr('ui.aiPanel.pune_ca_sinopsis_in_inspector')}</button>
            )}
            <button onClick={() => navigator.clipboard?.writeText(result.text)}>{tr('ui.aiPanel.copiaza')}</button>
            <button onClick={() => setResult(null)}>{kind === 'replace' || kind === 'insert' ? 'Respinge (Esc)' : tr('btn.close')}</button>
          </div>
        </div>
      )}
      {history.length > 0 && (
        <details className="ai-history">
          <summary>{tr('ui.aiPanel.rezultate_recente')}{history.length})</summary>
          <ul>
            {history.map((h) => (
              <li key={h.id}>
                <div className="small muted">
                  {LABEL()[h.action]} · „{h.docTitle}” · {new Date(h.at).toLocaleTimeString(uiLocale(), { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="ai-history-text">{h.text.length > 160 ? `${h.text.slice(0, 160)}…` : h.text}</div>
                <div className="ai-actions">
                  <button className="link" onClick={() => onInsert(h.text)}>{tr('ui.aiPanel.reinsereaza_la_cursor')}</button>
                  <button className="link" onClick={() => navigator.clipboard?.writeText(h.text)}>{tr('ui.aiPanel.copiaza')}</button>
                </div>
              </li>
            ))}
          </ul>
          <button className="link" onClick={() => { sessionHistory.clear(); setHistory([]); }}>{tr('ui.aiPanel.goleste_istoricul')}</button>
        </details>
      )}
    </aside>
  );
}
