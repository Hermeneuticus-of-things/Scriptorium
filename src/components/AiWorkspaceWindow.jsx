import React, { useEffect, useRef, useState } from 'react';
import { registerDialogSurface } from '../lib/focusDialogs.js';
import { t } from '../lib/i18n.js';

export default function AiWorkspaceWindow({ focusEngine, onClose, children }) {
  const ref = useRef(null);
  const drag = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [position, setPosition] = useState(null);

  useEffect(() => {
    const cleanup = registerDialogSurface(focusEngine, 'dialog.aiBook', {
      modal: false,
      close: () => { closeRef.current(); return true; },
    });
    ref.current?.querySelector('select, textarea, button')?.focus({ preventScroll: true });
    return cleanup;
  }, [focusEngine]);

  const move = (x, y) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - r.width - 8, x)),
      y: Math.max(8, Math.min(window.innerHeight - r.height - 8, y)),
    });
  };
  const down = (event) => {
    if (event.button !== 0 || event.target.closest('button')) return;
    const r = ref.current.getBoundingClientRect();
    drag.current = { x: event.clientX - r.left, y: event.clientY - r.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  return (
    <section
      ref={ref}
      className="ai-workspace"
      role="dialog"
      aria-modal="false"
      aria-labelledby="ai-workspace-title"
      onPointerDown={() => focusEngine.switchFocus('dialog.aiBook')}
      onFocusCapture={() => focusEngine.switchFocus('dialog.aiBook')}
      style={position ? { left: position.x, top: position.y, right: 'auto' } : undefined}
    >
      <header
        className="ai-workspace-head"
        tabIndex={0}
        aria-label={t('ui.aiWorkspace.move')}
        onPointerDown={down}
        onPointerMove={(event) => {
          if (drag.current) move(event.clientX - drag.current.x, event.clientY - drag.current.y);
        }}
        onPointerUp={(event) => {
          drag.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onKeyDown={(event) => {
          if (!event.altKey) return;
          const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
          if (!delta) return;
          event.preventDefault();
          const r = ref.current.getBoundingClientRect();
          const step = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ctl-lg')) || 32;
          move(r.left + delta[0] * step, r.top + delta[1] * step);
        }}
      >
        <div className="ai-workspace-title-block">
          <h2 id="ai-workspace-title">{t('ui.aiWorkspace.title')}</h2>
          <span className="ai-workspace-subtitle">{t('ui.aiWorkspace.windowHint')}</span>
        </div>
        <div className="ai-workspace-head-actions">
          <button type="button" onClick={onClose} aria-label={t('btn.close')} title={t('btn.close')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
          </button>
        </div>
      </header>
      <div className="ai-workspace-body">{children}</div>
    </section>
  );
}
