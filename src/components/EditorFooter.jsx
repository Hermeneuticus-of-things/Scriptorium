import React, { useState } from 'react';
import { t as tr, uiLocale } from '../lib/i18n.js';

// The footer under the open document: text size, words and characters, and the document's own
// target (a small popover to set it, with a progress bar). Props: node, words, chars, zoom,
// onZoom(z), onPatch(patch) (null = read-only).
// selectedWords > 0 (words in the editor's selection) shows "Words: 37 of 1,234".
export default function EditorFooter({ node, words = 0, selectedWords = 0, chars = 0, zoom = 100, onZoom, onPatch }) {
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
      <span className="footer-words">
        {tr('ui.footer.cuvinte')}: {selectedWords > 0 ? tr('ui.footer.x_din_y', { x: fmt(selectedWords), y: fmt(words) }) : fmt(words)}
      </span>
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

const zoomOptions = (zoom) => [...new Set([75, 100, 125, 150, 175, 200, 250, 300, zoom])].sort((a, b) => a - b);

// Footer under Scrivenings: totals over all the documents shown together.
export function ScriveningsFooter({ count = 0, words = 0, chars = 0, selectedWords = 0, zoom = 100, onZoom }) {
  const fmt = (n) => n.toLocaleString(uiLocale());
  return (
    <div className="editor-footer scriv-footer">
      {onZoom && (
        <select className="zoom-select" value={zoom} onChange={(e) => onZoom(Number(e.target.value))} title={tr('ui.statusBar.zoom')} aria-label={tr('ui.statusBar.zoom')}>
          {zoomOptions(zoom).map((z) => <option key={z} value={z}>{z}%</option>)}
        </select>
      )}
      <span className="spacer" />
      <span className="footer-docs">{tr('ui.p8.docsShown', { n: fmt(count) })}</span>
      <span className="footer-words">
        {tr('ui.footer.cuvinte')}: {selectedWords > 0 ? tr('ui.footer.x_din_y', { x: fmt(selectedWords), y: fmt(words) }) : fmt(words)}
      </span>
      <span>{tr('ui.footer.caractere')}: {fmt(chars)}</span>
      <span className="spacer" />
    </div>
  );
}

const CARD_SIZES = ['mic', 'mediu', 'mare'];
// Footer under the corkboard / outliner: item count, words of the folder and the view's own
// controls. kind: 'corkboard' | 'outline'; folder: the folder shown; onPatchFolder(patch).
export function ViewFooter({ kind, folder, count = 0, words = 0, onPatchFolder }) {
  const fmt = (n) => n.toLocaleString(uiLocale());
  if (!folder) return null;
  const cork = { mode: 'grid', size: 'mediu', ratio: '3:5', ...(folder.cork || {}) };
  const setCork = (patch) => onPatchFolder?.({ cork: { ...cork, ...patch } });
  const sizeIdx = Math.max(0, CARD_SIZES.indexOf(cork.size));
  return (
    <div className={`editor-footer view-footer view-footer-${kind}`}>
      {kind === 'corkboard' && onPatchFolder && (
        <>
          <span className="cork-foot-modes" role="group" aria-label={tr('ui.p8.boardMode')}>
            {['grid', 'lines', 'free'].map((m) => (
              <button key={m} className={`link ${cork.mode === m ? 'on' : ''}`} data-mode={m} onClick={() => setCork({ mode: m })}>{tr(`ui.p8.mode_${m}`)}</button>
            ))}
          </span>
          <label className="cork-foot-size">
            {tr('ui.corkboard.marimea_fiselor')}{' '}
            <input type="range" min="0" max="2" step="1" value={sizeIdx} onChange={(e) => setCork({ size: CARD_SIZES[Number(e.target.value)] })} aria-valuetext={tr(`ui.p8.size_${CARD_SIZES[sizeIdx]}`)} />
          </label>
          <select className="cork-foot-ratio" value={cork.ratio} onChange={(e) => setCork({ ratio: e.target.value })} title={tr('ui.corkboard.proportie')} aria-label={tr('ui.corkboard.proportie')}>
            <option value="3:5">3 × 5</option>
            <option value="4:6">4 × 6</option>
            <option value="1:1">1 × 1</option>
            <option value="4:3">4 × 3</option>
          </select>
        </>
      )}
      <span className="spacer" />
      <span className="footer-docs">{tr('ui.p8.itemsShown', { n: fmt(count) })}</span>
      <span className="footer-words">{tr('ui.footer.cuvinte')}: {fmt(words)}</span>
    </div>
  );
}
