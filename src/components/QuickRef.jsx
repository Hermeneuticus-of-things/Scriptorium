import React, { useRef } from 'react';
import Editor from './Editor.jsx';
import { t } from '../lib/i18n.js';

// Floating Quick Reference panel: another document open next to the main editor.
export default function QuickRef({ node, html, x, y, readOnly, smartQuotes, onChange, onMove, onClose, onOpen }) {
  const box = useRef(null);
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
        <Editor compact html={html} title="" readOnly={readOnly} smartQuotes={smartQuotes} onChange={onChange} />
      </div>
    </div>
  );
}
