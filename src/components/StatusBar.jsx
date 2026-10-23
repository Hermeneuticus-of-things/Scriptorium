import React from 'react';

function Progress({ value, max, label }) {
  if (!max) return null;
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <span className="progress" title={`${value.toLocaleString('ro-RO')} / ${max.toLocaleString('ro-RO')}`}>
      {label} <meter min="0" max={max} value={Math.min(value, max)} /> {pct}%
    </span>
  );
}

export default function StatusBar({ node, words, chars = 0, selectionCount = 1, totalDraft, draftTarget, sessionWords, sessionTarget, saveState, zoom, onZoom }) {
  return (
    <footer className="statusbar">
      <span>{node ? `${node.title}: ${words.toLocaleString('ro-RO')} cuvinte${chars ? ` · ${chars.toLocaleString('ro-RO')} caractere` : ''}` : ''}</span>
      {selectionCount > 1 && <span>{selectionCount} selectate</span>}
      {node && node.target > 0 && <Progress value={words} max={node.target} label="Țintă document" />}
      <span className="spacer" />
      <span>Manuscris: {totalDraft.toLocaleString('ro-RO')} cuvinte</span>
      <Progress value={totalDraft} max={draftTarget} label="Carte" />
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
