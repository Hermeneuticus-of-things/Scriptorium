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

export default function StatusBar({ node, words, selectionCount = 1, totalDraft, draftTarget, sessionWords, sessionTarget, saveState }) {
  return (
    <footer className="statusbar">
      <span>{node ? `${node.title}: ${words.toLocaleString('ro-RO')} cuvinte` : ''}</span>
      {selectionCount > 1 && <span>{selectionCount} selectate</span>}
      {node && node.target > 0 && <Progress value={words} max={node.target} label="Țintă document" />}
      <span className="spacer" />
      <span>Manuscris: {totalDraft.toLocaleString('ro-RO')} cuvinte</span>
      <Progress value={totalDraft} max={draftTarget} label="Carte" />
      <Progress value={sessionWords} max={sessionTarget} label="Sesiune" />
      <span className={`save ${saveState.startsWith('eroare') ? 'err' : ''}`}>{saveState}</span>
    </footer>
  );
}
