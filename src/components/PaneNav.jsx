import React, { useEffect, useRef, useState } from 'react';
import { BackIcon, ForwardIcon } from './Icons.jsx';
import { recentList } from '../lib/panes.js';
import { t as tr } from '../lib/i18n.js';

// Back / forward for one editor pane, with a dropdown of the pane's recent documents.
// history = {stack, index}; titleOf(id) → title or null (gone); onJump(index).
export default function PaneNav({ history, titleOf, onBack, onForward, onJump, pane = 'main' }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  const h = history || { stack: [], index: -1 };
  const items = recentList(h).filter((x) => titleOf(x.id) !== null);
  return (
    <span className="pane-nav" ref={box} data-pane={pane}>
      <button className="pane-back" onClick={onBack} disabled={h.index <= 0} title={tr('ui.app.inapoi_alt')} aria-label={tr('cmd.back')}><BackIcon /></button>
      <button className="pane-forward" onClick={onForward} disabled={h.index >= h.stack.length - 1} title={tr('ui.app.inainte_alt')} aria-label={tr('cmd.forward')}><ForwardIcon /></button>
      <button className="pane-history" onClick={() => setOpen((o) => !o)} disabled={!items.length} aria-expanded={open} aria-haspopup="menu" title={tr('ui.g5.istoricPanou')} aria-label={tr('ui.g5.istoricPanou')}>▾</button>
      {open && (
        <ul className="pane-history-list" role="menu" aria-label={tr('ui.g5.istoricPanou')}>
          {items.map((x) => (
            <li key={x.index} role="menuitem" tabIndex={-1} className={x.current ? 'on' : ''} onClick={() => { setOpen(false); onJump(x.index); }}>
              {x.current ? '• ' : ''}{titleOf(x.id) || '—'}
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
