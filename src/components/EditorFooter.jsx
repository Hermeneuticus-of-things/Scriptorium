import React, { useState } from 'react';
import { t as tr, uiLocale } from '../lib/i18n.js';

// The footer under the open document: text size, words and characters, and the document's own
// target (a small popover to set it, with a progress bar). Props: node, words, chars, zoom,
// onZoom(z), onPatch(patch) (null = read-only).
export default function EditorFooter({ node, words = 0, chars = 0, zoom = 100, onZoom, onPatch }) {
  const [open, setOpen] = useState(false);
  if (!node) return null;
  const unit = node.targetType === 'Characters' ? 'Characters' : 'Words';
  const value = unit === 'Characters' ? chars : words;
  const target = Number(node.target) || 0;
  const fmt = (n) => n.toLocaleString(uiLocale());
  return (
    <div className="editor-footer">
      <select className="zoom-select" value={zoom} onChange={(e) => onZoom?.(Number(e.target.value))} title={tr('ui.statusBar.zoom')} aria-label={tr('ui.statusBar.zoom')}>
        {[...new Set([75, 100, 125, 150, 175, 200, 250, 300, zoom])].sort((a, b) => a - b).map((z) => (
          <option key={z} value={z}>{z}%</option>
        ))}
      </select>
      <span className="spacer" />
      <span>{tr('ui.footer.cuvinte')}: {fmt(words)}</span>
      <span>{tr('ui.footer.caractere')}: {fmt(chars)}</span>
      <span className="spacer" />
      <span className="footer-target">
        <button className="link" onClick={() => setOpen((o) => !o)} aria-expanded={open} title={tr('ui.inspector.tinta_document')}>
          ◎ {target ? `${fmt(value)} / ${fmt(target)}` : tr('ui.footer.tinta')}
        </button>
        {target > 0 && <meter min="0" max={target} value={Math.min(value, target)} aria-label={tr('ui.inspector.tinta_document')} />}
        {open && (
          <div className="footer-pop" role="dialog" aria-label={tr('ui.inspector.tinta_document')}>
            <label>
              {tr('ui.inspector.tinta_document')}
              <input type="number" min="0" step="100" value={target} disabled={!onPatch} autoFocus onChange={(e) => onPatch?.({ target: Number(e.target.value) || 0 })} onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && setOpen(false)} />
            </label>
            <label>
              {tr('ui.inspector.unitate')}
              <select value={unit} disabled={!onPatch} onChange={(e) => onPatch?.({ targetType: e.target.value })}>
                <option value="Words">{tr('ui.inspector.cuvinte')}</option>
                <option value="Characters">{tr('ui.inspector.caractere')}</option>
              </select>
            </label>
            <button onClick={() => setOpen(false)}>{tr('btn.close')}</button>
          </div>
        )}
      </span>
    </div>
  );
}
