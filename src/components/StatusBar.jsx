import React, { useEffect, useState } from 'react';
import { t, uiLocale } from '../lib/i18n.js';
import { editorSelectionText, selectionStats } from '../lib/text.js';

// Live word/character count of the text selected in an editor (null when nothing is selected).
function useEditorSelection() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const text = editorSelectionText();
        const next = text.trim() ? selectionStats(text) : null;
        setStats((prev) => (prev && next && prev.words === next.words && prev.chars === next.chars ? prev : next));
      });
    };
    document.addEventListener('selectionchange', update);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('selectionchange', update); };
  }, []);
  return stats;
}

function Progress({ value, max, label }) {
  if (!max) return null;
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <span className="progress" title={`${value.toLocaleString(uiLocale())} / ${max.toLocaleString(uiLocale())}`}>
      {label} <meter min="0" max={max} value={Math.min(value, max)} /> {pct}%
    </span>
  );
}

export default function StatusBar({ node, words, chars = 0, selectionCount = 1, totalDraft, draftTarget, sessionWords, sessionTarget, saveState, sync, onSync, team, onTeam, zoom, onZoom }) {
  const sel = useEditorSelection();
  return (
    <footer className="statusbar">
      <span>{node ? t('ui.statusBar.x_x_cuvintex', { title: node.title, v1: words.toLocaleString(uiLocale()), v2: chars ? t('ui.statusBar.x_caractere', { v0: chars.toLocaleString(uiLocale()) }) : '' }) : ''}</span>
      {sel && <span className="sel-count">{t('ui.statusBar.selection', { words: sel.words.toLocaleString(uiLocale()), chars: sel.chars.toLocaleString(uiLocale()) })}</span>}
      {selectionCount > 1 && <span>{t('ui.app.x_documente_selectate', { length: selectionCount })}</span>}
      {node && node.target > 0 && <Progress value={words} max={node.target} label={t('ui.inspector.tinta_document')} />}
      <span className="spacer" />
      <span>{t('ui.statusBar.draft')}: {totalDraft.toLocaleString(uiLocale())} {t('ui.inspector.cuvinte')}</span>
      <Progress value={totalDraft} max={draftTarget} label={t('ui.statusBar.carte')} />
      <Progress value={sessionWords} max={sessionTarget} label={t('ui.statusBar.session')} />
      {team && (
        <button className="team-status" onClick={onTeam} title={t('ui.team.titlu')}>
          {team.live.length ? (
            team.live.map((p) => <span key={p.machine} className="team-dot" style={{ background: p.color }} title={p.who} />)
          ) : (
            <span className="team-dot" style={{ background: team.who.color }} />
          )}{' '}
          {team.live.length ? t('ui.team.in_lucru', { n: team.live.length + 1 }) : t('ui.team.doar_tu')}
        </button>
      )}
      {sync && (
        sync.state === 'conflict' ? (
          <button className="sync-status sync-conflict" onClick={onSync} title={t('ui.sync.conflict_info')}>
            <span className="sync-dot" aria-hidden="true" /> {t('ui.sync.conflict')}
          </button>
        ) : (
          <span className={`sync-status sync-${sync.state}`} role="status" title={t(`ui.sync.${sync.state}_info`)}>
            <span className="sync-dot" aria-hidden="true" /> {t(`ui.sync.${sync.state}`, { n: sync.n || 0 })}
          </span>
        )
      )}
      {onZoom && (
        <select className="zoom-select" value={zoom} onChange={(e) => onZoom(Number(e.target.value))} title={t('ui.statusBar.zoom')} aria-label={t('ui.statusBar.zoom')}>
          {[...new Set([75, 100, 125, 150, 175, 200, 250, 300, zoom])].sort((a, b) => a - b).map((z) => (
            <option key={z} value={z}>{z}%</option>
          ))}
        </select>
      )}
      <span className={`save ${saveState === t('ui.app.eroare_la_salvare') ? 'err' : ''}`}>{saveState === 'salvat' ? t('ui.app.salvat') : saveState}</span>
    </footer>
  );
}
