import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import AnchoredPopover from '../components/AnchoredPopover.jsx';
import { t } from './i18n.js';

// Electron disables the native window.prompt() ("prompt() is not supported."), so every
// `const x = window.prompt(...)` in the renderer threw and the feature silently did nothing
// (Save As, snapshots, links, footnotes, comments, bookmarks, styles…). uiPrompt is the one
// replacement: an accessible modal that resolves to the typed string, or null on cancel/Escape.
// It mounts itself imperatively so callers just `await uiPrompt(message, default)` without
// wiring any React state. DialogA11y decorates the `.modal` (role, Escape, close ×) as elsewhere.
export function uiPrompt(message, defaultValue = '', opts = {}) {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    let done = false;
    const finish = (val) => {
      if (done) return;
      done = true;
      root.unmount();
      host.remove();
      resolve(val);
    };
    root.render(
      <PromptPopover message={message} defaultValue={String(defaultValue ?? '')} opts={opts} onDone={finish} />,
    );
  });
}

function PromptPopover({ message, defaultValue, opts, onDone }) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);
  useEffect(() => {
    const el = inputRef.current;
    if (el) { el.focus(); el.select(); }
  }, []);
  const submit = (e) => {
    e?.preventDefault();
    onDone(value);
  };
  // ADL §4.3 (directivă autor 2026-11-10): prompturile mici sunt popover-uri ancorate în pagină —
  // suprafața de bază rămâne vizibilă; fără backdrop, click-afară/Escape rezolvă (null).
  const ax = opts.anchor?.x ?? Math.max(12, Math.round((window.innerWidth || 1200) / 2 - 210));
  const ay = opts.anchor?.y ?? 64;
  return (
    <AnchoredPopover x={ax} y={ay} onClose={() => onDone(null)} title={null} width={400}>
      <form className="prompt-popover" onSubmit={submit}>
        <label>
          {message}
          <input
            ref={inputRef}
            type={opts.password ? 'password' : 'text'}
            value={value}
            placeholder={opts.placeholder || ''}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <div className="actions-inline">
          <button type="submit" className="primary">{opts.okLabel || t('btn.ok')}</button>
          <button type="button" onClick={() => onDone(null)}>{t('btn.cancel')}</button>
        </div>
      </form>
    </AnchoredPopover>
  );
}
