import React from 'react';
import { t, uiLocale } from '../lib/i18n.js';

function Progress({ value, max, label }) {
  if (!max) return null;
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <span className="progress" title={`${value.toLocaleString(uiLocale())} / ${max.toLocaleString(uiLocale())}`}>
      {label} <meter min="0" max={max} value={Math.min(value, max)} /> {pct}%
    </span>
  );
}

export default function StatusBar({ node, words, chars = 0, selectionCount = 1, totalDraft, draftTarget, sessionWords, sessionTarget, saveState, zoom, onZoom }) {
  return (
    <footer className="statusbar">
      <span>{node ? t('ui.statusBar.x_x_cuvintex', { title: node.title, v1: words.toLocaleString(uiLocale()), v2: chars ? t('ui.statusBar.x_caractere', { v0: chars.toLocaleString(uiLocale()) }) : '' }) : ''}</span>
      {selectionCount > 1 && <span>{selectionCount} selectate</span>}
      {node && node.target > 0 && <Progress value={words} max={node.target} label={t('ui.inspector.tinta_document')} />}
      <span className="spacer" />
      <span>Manuscris: {totalDraft.toLocaleString(uiLocale())} {t('ui.inspector.cuvinte')}</span>
      <Progress value={totalDraft} max={draftTarget} label={t('ui.statusBar.carte')} />
      <Progress value={sessionWords} max={sessionTarget} label="Sesiune" />
      {onZoom && (
        <select className="zoom-select" value={zoom} onChange={(e) => onZoom(Number(e.target.value))} title="Zoom text" aria-label="Zoom text">
          {[...new Set([75, 100, 125, 150, 175, 200, 250, 300, zoom])].sort((a, b) => a - b).map((z) => (
            <option key={z} value={z}>{z}%</option>
          ))}
        </select>
      )}
      <span className={`save ${saveState.startsWith('eroare') ? 'err' : ''}`}>{saveState}</span>
    </footer>
  );
}
