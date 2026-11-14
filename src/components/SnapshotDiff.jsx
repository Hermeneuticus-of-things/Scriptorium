// The compare view of two snapshot texts — the same view in the Inspector pane and in the
// Snapshots Manager: „deleted" vs „added" legend, granularity (paragraph → word), navigation
// between changes (◀ ▶) and the ins/del rendering. Owner of the diff computation and of the
// current-change state; the caller keeps the level (so it survives toggling compare off/on).
import { useMemo, useState } from 'react';
import { t as tr } from '../lib/i18n.js';
import { htmlToText } from '../lib/text.js';
import { diffText, DIFF_LEVELS } from '../lib/snapshotDiff.js';
import { changeStarts, stepChange } from '../lib/snapshotList.js';

const LEVELS_COARSE_FIRST = [...DIFF_LEVELS].reverse(); // paragraf, frază, sintagmă, cuvânt

export default function SnapshotDiff({ aHtml, bHtml, aName, bLabel, diffLevel, onDiffLevel, boxRef }) {
  const [current, setCurrent] = useState(-1);
  const diffRef = boxRef;
  const diff = useMemo(() => diffText(htmlToText(aHtml), htmlToText(bHtml), diffLevel), [aHtml, bHtml, diffLevel]);
  const starts = useMemo(() => changeStarts(diff), [diff]);
  // part index → change number (for highlighting the current change)
  const groupOf = useMemo(() => {
    const g = [];
    let n = -1;
    (diff || []).forEach((p, i) => {
      if (starts.includes(i)) n += 1;
      g[i] = p.added || p.removed ? n : -1;
    });
    return g;
  }, [diff, starts]);
  const jump = (delta) => {
    const next = stepChange(starts.length, current, delta);
    setCurrent(next);
    if (next < 0) return;
    setTimeout(() => diffRef?.current?.querySelector(`[data-change="${next}"]`)?.scrollIntoView?.({ block: 'nearest' }), 0);
  };
  return (
    <div className="snap-compare-pane">
      <p className="muted small">
        <del>{tr('ui.inspector.sters')}</del> {tr('ui.inspector.fata_de')}„{aName}” · <ins>{tr('ui.inspector.adaugat')}</ins> {tr('ui.inspector.in')} {bLabel}
      </p>
      <div className="snap-nav">
        <label className="diff-level">
          {tr('ui.inspector.diffLevel')}{' '}
          <select value={diffLevel} onChange={(e) => onDiffLevel(e.target.value)}>
            {LEVELS_COARSE_FIRST.map((l) => <option key={l} value={l}>{tr(`ui.inspector.diff_${l}`)}</option>)}
          </select>
        </label>
        <button className="snap-prev" onClick={() => jump(-1)} disabled={!starts.length} aria-label={tr('ui.snap.prev_change')} title={tr('ui.snap.prev_change')}>◀</button>
        <button className="snap-next" onClick={() => jump(1)} disabled={!starts.length} aria-label={tr('ui.snap.next_change')} title={tr('ui.snap.next_change')}>▶</button>
        <span className="snap-count muted small" aria-live="polite">{starts.length ? `${current < 0 ? '–' : current + 1} / ${starts.length}` : tr('ui.snap.no_changes')}</span>
      </div>
      <div className="snap-preview diff" ref={diffRef}>
        {diff.map((part, i) => {
          const g = groupOf[i];
          const props = { className: g >= 0 && g === current ? 'current' : undefined, 'data-change': starts.includes(i) ? g : undefined };
          return part.added ? <ins key={i} {...props}>{part.value}</ins> : part.removed ? <del key={i} {...props}>{part.value}</del> : <span key={i}>{part.value}</span>;
        })}
      </div>
    </div>
  );
}
