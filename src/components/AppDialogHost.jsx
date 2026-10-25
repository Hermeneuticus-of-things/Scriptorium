import React, { useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import { registerDialogHost, bindDialogSettings, rememberDontAsk, onStatusMessage } from '../lib/appDialog.js';

let seq = 0;

// Renders the confirmations / prompts asked through lib/appDialog.js. It uses the shared
// `.modal-backdrop > .modal` markup, so DialogA11y gives it role=dialog, the focus trap and Esc
// (Esc clicks the backdrop = Cancel); Enter submits the form = the action button.
export default function AppDialogHost({ settings, onSettings }) {
  const [queue, setQueue] = useState([]);
  const sRef = useRef(settings);
  sRef.current = settings;
  useEffect(() => bindDialogSettings(() => sRef.current, (patch) => onSettings?.(patch)), [onSettings]);
  useEffect(() => registerDialogHost((req) => setQueue((q) => [...q, { ...req, id: ++seq }])), []);
  const cur = queue[0];
  if (!cur) return null;
  const finish = (value) => {
    cur.resolve(value);
    setQueue((q) => q.slice(1));
  };
  return <AppDialog key={cur.id} req={cur} finish={finish} />;
}

function AppDialog({ req, finish }) {
  const isPrompt = req.type === 'prompt';
  const [value, setValue] = useState(req.value ?? '');
  const [dontAsk, setDontAsk] = useState(false);
  const cancel = () => finish(isPrompt ? null : false);
  const submit = (e) => {
    e.preventDefault();
    if (isPrompt) return finish(value);
    if (dontAsk && req.dontAskAgainKey) rememberDontAsk(req.dontAskAgainKey);
    finish(true);
  };
  return (
    <div className="modal-backdrop app-dialog-backdrop" onClick={(e) => e.target === e.currentTarget && cancel()}>
      <form className="modal app-dialog" data-type={req.type} role={isPrompt ? 'dialog' : 'alertdialog'} onSubmit={submit}>
        {req.title && <h3>{req.title}</h3>}
        {req.message && <p className="app-dialog-msg">{req.message}</p>}
        {isPrompt && (
          <input
            className="app-dialog-input"
            autoFocus
            value={value}
            aria-label={req.title || req.message || ''}
            placeholder={req.placeholder || ''}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setValue(e.target.value)}
          />
        )}
        {!isPrompt && req.dontAskAgainKey && (
          <label className="app-dialog-dontask">
            <input type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} /> {t('ui.dlg.nu_mai_intreba')}
          </label>
        )}
        <div className="actions">
          {!req.alert && <button type="button" className="app-dialog-cancel" onClick={cancel}>{req.cancelLabel || t('ui.dlg.anuleaza')}</button>}
          <button type="submit" className={`primary app-dialog-ok${req.danger ? ' danger' : ''}`} autoFocus={!isPrompt}>
            {req.okLabel || t('ui.dlg.ok')}
          </button>
        </div>
      </form>
    </div>
  );
}

/** The short message slot of the status bar („Salvat”, „3 documente mutate”); clears itself. */
export function StatusMessage() {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    let timer;
    const off = onStatusMessage((text) => {
      setMsg(text);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(''), 4000);
    });
    return () => { off(); clearTimeout(timer); };
  }, []);
  return <span className="status-msg" role="status" aria-live="polite">{msg}</span>;
}

/** Shared empty state with a hint of what to do next. */
export function EmptyState({ title, hint, action, onAction, className = '' }) {
  return (
    <div className={`empty-state ${className}`}>
      <p className="empty-state-title">{title}</p>
      {hint && <p className="empty-state-hint muted">{hint}</p>}
      {action && onAction && <button type="button" onClick={onAction}>{action}</button>}
    </div>
  );
}
