import React, { useEffect, useRef, useState } from 'react';
import Editor from './Editor.jsx';
import EditorFooter from './EditorFooter.jsx';
import MediaView from './MediaView.jsx';
import { t } from '../lib/i18n.js';

const ZOOMS = [75, 100, 125, 150, 175, 200];
const plainLen = (html) => (html || '').replace(/<[^>]+>/g, '').length;

// Floating Quick Reference window: another document open next to the main editor, with its
// own format bar and ruler, zoom, inspector (synopsis, notes, metadata), counts and target in
// the footer, and "keep on top" (stays above dialogs and the other panels).
// Research files (images, PDF, media) are shown with the media viewer.
// q = {id, x, y, zoom, tools, ruler, inspector, pinned}; onUpdate(patch) changes it.
export default function QuickRef({
  node, html, q = {}, x, y, readOnly, smartQuotes, words = 0,
  onChange, onMove, onClose, onOpen, onUpdate,
  api, dir, onError, onPatch, loadNotes, onNotesChange,
}) {
  const box = useRef(null);
  const px = q.x ?? x;
  const py = q.y ?? y;
  const [notes, setNotes] = useState(null);
  const set = (patch) => onUpdate?.(patch);
  useEffect(() => {
    if (!q.inspector || notes !== null || !loadNotes) return;
    let live = true;
    Promise.resolve(loadNotes(node.id)).then((h) => live && setNotes(h || ''), () => live && setNotes(''));
    return () => { live = false; };
  }, [q.inspector, node.id]);
  const startDrag = (e) => {
    const sx = e.clientX - px;
    const sy = e.clientY - py;
    const move = (ev) => onMove(Math.max(0, ev.clientX - sx), Math.max(0, ev.clientY - sy));
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  const zoom = q.zoom || 100;
  const isFile = node.type === 'file';
  const stop = (e) => e.stopPropagation();
  const toggle = (k, label, glyph) => (
    <button className={`link qr-${k} ${q[k] ? 'on' : ''}`} data-on={q[k] ? '1' : '0'} onMouseDown={stop} onClick={() => set({ [k]: !q[k] })} title={label} aria-label={label}>{glyph}</button>
  );
  return (
    <div
      className={`quickref ${q.pinned ? 'pinned' : ''} ${q.inspector ? 'with-inspector' : ''}`}
      ref={box}
      style={{ left: px, top: py }}
      role="dialog"
      aria-label={`Quick Reference: ${node.title}`}
      data-id={node.id}
    >
      <div className="quickref-head" onMouseDown={startDrag}>
        <strong className="qr-title" title={node.title}>{node.title}</strong>
        <span className="spacer" />
        {!isFile && (
          <select className="qr-zoom" value={zoom} onMouseDown={stop} onChange={(e) => set({ zoom: Number(e.target.value) })} title={t('ui.statusBar.zoom')} aria-label={t('ui.statusBar.zoom')}>
            {[...new Set([...ZOOMS, zoom])].sort((a, b) => a - b).map((z) => <option key={z} value={z}>{z}%</option>)}
          </select>
        )}
        {!isFile && !readOnly && toggle('tools', t('ui.p8.qrFormatBar'), 'B/I')}
        {!isFile && !readOnly && toggle('ruler', t('ui.formatBar.ruler'), '⟷')}
        {toggle('inspector', t('ui.p8.qrInspector'), 'ⓘ')}
        {toggle('pinned', t('ui.p8.qrOnTop'), '📌')}
        <button className="link" onMouseDown={stop} onClick={onOpen} title={t('ui.quickRef.deschide_in_editorul_principal')}>{t('ui.app.deschide')}</button>
        <button className="link" onMouseDown={stop} onClick={onClose} aria-label={t('btn.close')}>×</button>
      </div>
      <div className="quickref-main">
        <div className="quickref-body">
          {isFile ? (
            api ? <MediaView api={api} dir={dir} node={node} onError={onError} /> : <p className="hint">{node.title}</p>
          ) : (
            <Editor
              compact
              tools={Boolean(q.tools)}
              html={html}
              title=""
              readOnly={readOnly}
              smartQuotes={smartQuotes}
              onChange={onChange}
              view={{ zoom, ruler: Boolean(q.ruler) }}
              onViewChange={(v) => set({ zoom: v.zoom || zoom, ruler: Boolean(v.ruler) })}
            />
          )}
        </div>
        {q.inspector && (
          <aside className="quickref-inspector" aria-label={t('ui.p8.qrInspector')}>
            <label className="qr-synopsis">
              {t('ui.p8.synopsis')}
              <textarea value={node.synopsis || ''} readOnly={!onPatch} onChange={(e) => onPatch?.({ synopsis: e.target.value })} rows={4} />
            </label>
            <dl className="qr-meta">
              <dt>{t('ui.p8.label')}</dt><dd>{node.label || '—'}</dd>
              <dt>{t('ui.p8.status')}</dt><dd>{node.status || '—'}</dd>
              {(node.keywords || []).length > 0 && (<><dt>{t('ui.p8.keywords')}</dt><dd>{node.keywords.join(', ')}</dd></>)}
            </dl>
            {onPatch && (
              <label className="check">
                <input type="checkbox" checked={node.includeInCompile !== false} onChange={(e) => onPatch({ includeInCompile: e.target.checked })} /> {t('ui.p8.includeInCompile')}
              </label>
            )}
            <div className="qr-notes">
              <div className="muted small">{t('ui.p8.notes')}</div>
              {notes === null ? <p className="hint">…</p> : (
                <Editor compact html={notes} title="" readOnly={!onNotesChange} smartQuotes={smartQuotes} onChange={(h) => { setNotes(h); onNotesChange?.(node.id, h); }} />
              )}
            </div>
          </aside>
        )}
      </div>
      {!isFile && (
        <EditorFooter
          node={node}
          words={words}
          chars={plainLen(html)}
          zoom={zoom}
          onZoom={(z) => set({ zoom: z })}
          onPatch={readOnly || !onPatch ? null : onPatch}
        />
      )}
    </div>
  );
}
