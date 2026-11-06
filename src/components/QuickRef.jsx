import React, { useEffect, useRef } from 'react';
import Editor from './Editor.jsx';
import { t } from '../lib/i18n.js';
import { activeFocusEngine } from '../lib/focusMenus.js';
import { quickRefSurfaceId, registerQuickRefSurface } from '../lib/focusPanes.js';

// Floating Quick Reference panel: another document open next to the main editor.
// ADL §2/§10 (T4): the panel is a surface on the focus engine — `quickref.<docId>` pushed on
// mount and popped on unmount (its only close paths: the × button, „Deschide", Escape through
// the engine, the document disappearing — all unmount it). On open the panel takes the real
// focus (like a menu), and while the user works in it, it is the active surface (click/focusin
// switches it above the view, like the inspector; a click elsewhere hands the focus back to the
// view — App-level, same handler as the split pane). `engine` overrides the app's registered
// engine; without any engine the panel behaves exactly as before.
export default function QuickRef({ node, html, x, y, readOnly, smartQuotes, onChange, onMove, onClose, onOpen, engine = null }) {
  const box = useRef(null);
  const ed = useRef(null); // the panel's editor: the surface's real focus target
  const onCloseRef = useRef(onClose); // read through a ref: the surface must not re-register per render
  onCloseRef.current = onClose;
  useEffect(() => {
    const eng = engine || activeFocusEngine();
    if (!eng) return undefined; // fără motor: comportament neatins
    const offSurface = registerQuickRefSurface(eng, node.id, {
      close: () => onCloseRef.current(),
      focus: () => ed.current?.focus?.(),
    });
    const onAct = (e) => {
      if (box.current?.contains(e.target)) eng.switchFocus(quickRefSurfaceId(node.id));
    };
    document.addEventListener('focusin', onAct);
    document.addEventListener('mousedown', onAct);
    return () => {
      offSurface();
      document.removeEventListener('focusin', onAct);
      document.removeEventListener('mousedown', onAct);
    };
  }, [engine, node.id]);
  const startDrag = (e) => {
    const sx = e.clientX - x;
    const sy = e.clientY - y;
    const move = (ev) => onMove(Math.max(0, ev.clientX - sx), Math.max(0, ev.clientY - sy));
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  return (
    <div className="quickref" ref={box} style={{ left: x, top: y }} role="dialog" aria-label={`Quick Reference: ${node.title}`}>
      <div className="quickref-head" onMouseDown={startDrag}>
        <strong>{node.title}</strong>
        <span className="spacer" />
        <button className="link" onMouseDown={(e) => e.stopPropagation()} onClick={onOpen} title={t('ui.quickRef.deschide_in_editorul_principal')}>{t('ui.app.deschide')}</button>
        <button className="link" onMouseDown={(e) => e.stopPropagation()} onClick={onClose} aria-label={t('btn.close')}>×</button>
      </div>
      <div className="quickref-body">
        <Editor ref={ed} compact html={html} title="" readOnly={readOnly} smartQuotes={smartQuotes} onChange={onChange} />
      </div>
    </div>
  );
}
