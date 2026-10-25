import React, { useEffect, useRef, useState } from 'react';
import PaneNav from './PaneNav.jsx';
import { DocumentIcon, LockIcon, SplitIcon, UnlockIcon } from './Icons.jsx';
import { titleMenuEntries } from '../lib/panes.js';
import { t as tr } from '../lib/i18n.js';

// Header bar of one editor pane: back / forward / recent (PaneNav), the document title with
// its menu (recent documents of the pane, documents in the same folder, open elsewhere),
// previous / next document, lock in place, link with the other pane, split.
//
// pane: 'main' | 'split'; node: the document shown; className: the bar's class
// ('sc-header-bar' for the main pane, 'pane-head' for the second one).
// Everything optional is left out when its handler is missing.
export default function EditorHeader({
  pane = 'main',
  className = '',
  node,
  history,
  titleOf = () => null,
  onBack,
  onForward,
  onJump,
  siblings = [],
  onOpenDoc,
  onPrev,
  onNext,
  locked = false,
  onToggleLock,
  linked = false,
  onToggleLink,
  splitOpen = false,
  onSplit,
  splitHorizontal = false,
  onToggleOrientation,
  onOpenOther,
  onQuickRef,
  onSwap,
  onOpenInMain,
  onClose,
  children,
}) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') { setOpen(false); box.current?.querySelector('.hdr-title')?.focus(); } };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', key);
    };
  }, [open]);
  if (!node) return null;
  const { recent, near } = titleMenuEntries({ history, siblings, currentId: node.id, titleOf });
  const pick = (fn) => () => { setOpen(false); fn(); };
  const otherLabel = pane === 'main' ? tr('ui.p8.openInPane2') : tr('ui.app.deschide_in_principal');
  const onMenuKey = (e) => {
    const items = [...(box.current?.querySelectorAll('.hdr-title-menu [role="menuitem"]') || [])];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    if (e.key === 'Enter' && i >= 0) { e.preventDefault(); items[i].click(); }
  };
  const lockTitle = locked ? tr('ui.g5.deblocheazaPanou') : tr('ui.g5.fixeazaPeLoc');
  return (
    <div className={`editor-header ${className}`} ref={box} data-pane={pane}>
      <PaneNav pane={pane} history={history} titleOf={titleOf} onBack={onBack} onForward={onForward} onJump={onJump} />
      <DocumentIcon />
      <button
        className="hdr-title link"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={tr('ui.p8.titleMenu')}
      >
        <strong className="pane-title">{node.title}</strong> <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="hdr-title-menu" role="menu" aria-label={tr('ui.p8.titleMenu')} onKeyDown={onMenuKey}>
          {recent.length > 0 && <div className="hdr-menu-head">{tr('ui.p8.recentInPane')}</div>}
          {recent.map((x) => (
            <button key={`r${x.index}`} role="menuitem" className={`hdr-recent ${x.current ? 'on' : ''}`} disabled={x.current} onClick={pick(() => onJump?.(x.index))}>
              {x.current ? '• ' : ''}{x.title}
            </button>
          ))}
          {near.length > 1 && onOpenDoc && (
            <>
              <hr />
              <div className="hdr-menu-head">{tr('ui.p8.sameFolder')}</div>
              {near.map((x) => (
                <button key={`n${x.id}`} role="menuitem" className={`hdr-near ${x.current ? 'on' : ''}`} disabled={x.current} onClick={pick(() => onOpenDoc(x.id))}>
                  {x.current ? '• ' : ''}{x.title}
                </button>
              ))}
            </>
          )}
          {(onOpenOther || onQuickRef) && <hr />}
          {onOpenOther && <button role="menuitem" className="hdr-open-other" onClick={pick(onOpenOther)}>{otherLabel}</button>}
          {onQuickRef && <button role="menuitem" className="hdr-quickref" onClick={pick(onQuickRef)}>{tr('ui.binder.deschide_in_quick_reference')}</button>}
          {onToggleLock && <button role="menuitem" onClick={pick(onToggleLock)}>{lockTitle}</button>}
          {onToggleLink && splitOpen && <button role="menuitem" onClick={pick(onToggleLink)}>{linked ? tr('ui.p8.unlinkPanes') : tr('ui.p8.linkPanes')}</button>}
          {onClose && <button role="menuitem" onClick={pick(onClose)}>{tr('ui.p8.closePane')}</button>}
        </div>
      )}
      {children}
      <span className="spacer" style={{ flex: 1 }} />
      {onPrev && <button className="hdr-arrow" onClick={onPrev} title={tr('cmd.prevDoc')} aria-label={tr('cmd.prevDoc')}>▲</button>}
      {onNext && <button className="hdr-arrow" onClick={onNext} title={tr('cmd.nextDoc')} aria-label={tr('cmd.nextDoc')}>▼</button>}
      {onToggleLock && (
        <button className={`pane-lock ${locked ? 'on' : ''}`} onClick={onToggleLock} aria-pressed={locked} title={lockTitle} aria-label={pane === 'split' ? tr('ui.g5.fixeazaPeLocPanou2') : tr('ui.g5.fixeazaPeLoc')}>
          {locked ? <LockIcon /> : <UnlockIcon />}
        </button>
      )}
      {onToggleLink && splitOpen && (
        <button className={`pane-link ${linked ? 'on' : ''}`} onClick={onToggleLink} data-on={linked ? '1' : '0'} title={linked ? tr('ui.p8.unlinkPanes') : tr('ui.p8.linkPanes')} aria-label={tr('ui.p8.linkPanes')}>
          ⛓
        </button>
      )}
      {onToggleOrientation && <button className="link" onClick={onToggleOrientation}>{splitHorizontal ? tr('ui.app.split_vertical') : tr('ui.app.split_orizontal')}</button>}
      {onSwap && <button className="link" onClick={onSwap}>{tr('ui.app.inverseaza')}</button>}
      {onOpenInMain && <button className="link" onClick={onOpenInMain}>{tr('ui.app.deschide_in_principal')}</button>}
      {onSplit && <button className={`split-btn ${splitOpen ? 'on' : ''}`} onClick={onSplit} title={splitOpen ? tr('ui.p8.closeSplit') : tr('ui.common.split_editor')} aria-label={tr('ui.common.split_editor')}><SplitIcon /></button>}
      {onClose && <button className="link" onClick={onClose}>{tr('btn.close')}</button>}
    </div>
  );
}
