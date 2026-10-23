import React, { useMemo, useState } from 'react';
import { buildTimeline } from '../lib/timeline.js';
import { t } from '../lib/i18n.js';

const LANE_H = 44;
const LEFT = 140;
const PAD = 24;

function fmtWhen(e) {
  return [e.date, e.time].filter(Boolean).join(' ');
}

// Cronologie: scenes on a time axis, one lane per POV or location. Click opens the document.
export default function TimelineView({ project, onOpen, onClose }) {
  const [laneBy, setLaneBy] = useState('pov');
  const [mode, setMode] = useState('time'); // 'time' = proportional, 'sequence' = evenly spaced
  const tl = useMemo(() => buildTimeline(project, { laneBy }), [project, laneBy]);
  // The rightmost event still draws its title after the bar, so the plot stops LABEL short of the edge.
  const LABEL = 120;
  const width = Math.max(720, tl.events.length * 70 + LEFT + PAD * 2 + LABEL);
  const plot = width - LEFT - PAD * 2 - LABEL;
  const height = PAD * 2 + Math.max(1, tl.lanes.length) * LANE_H + 20;
  const span = Math.max(1, tl.max - tl.min);
  const x = (e, i) =>
    mode === 'sequence' || tl.events.length < 2
      ? LEFT + PAD + (i / Math.max(1, tl.events.length - 1)) * plot
      : LEFT + PAD + ((e.start - tl.min) / span) * plot;
  const laneY = (lane) => PAD + tl.lanes.indexOf(lane) * LANE_H;

  return (
    <div className="timeline-view" style={{ padding: 12, overflow: 'auto', height: '100%' }}>
      <div className="toolbar" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <strong>Cronologie</strong>
        <label>{t('ui.timelineView.benzi_dupa')}{' '}
          <select value={laneBy} onChange={(e) => setLaneBy(e.target.value)}>
            <option value="pov">Punct de vedere</option>
            <option value="location">{t('ui.timelineView.loc')}</option>
          </select>
        </label>
        <label>{t('ui.timelineView.scara')}{' '}
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="time">{t('ui.timelineView.proportionala_cu_timpul')}</option>
            <option value="sequence">{t('ui.timelineView.secventa')}</option>
          </select>
        </label>
        {onClose && <button onClick={onClose} style={{ marginLeft: 'auto' }}>{t('btn.close')}</button>}
      </div>
      {tl.events.length === 0 ? (
        <p className="muted">
          {t('ui.timelineView.nicio_scena_nu_are_data')}
        </p>
      ) : (
        <svg width={width} height={height} role="img" aria-label="Cronologia scenelor" style={{ fontSize: 11 }}>
          {tl.lanes.map((lane, i) => (
            <g key={lane}>
              <rect x={0} y={PAD + i * LANE_H} width={width} height={LANE_H} fill={i % 2 ? 'rgba(127,127,127,.06)' : 'transparent'} />
              <text x={8} y={PAD + i * LANE_H + LANE_H / 2 + 4} fontWeight="600" fill="currentColor">{lane}</text>
            </g>
          ))}
          {tl.events.map((e, i) => {
            const x0 = x(e, i);
            const w = mode === 'time' && e.duration ? Math.max(8, (e.duration / span) * plot) : 8;
            const y = laneY(e.lane) + 8;
            return (
              <g key={e.id} style={{ cursor: 'pointer' }} onClick={() => onOpen && onOpen(e.id)}>
                <title>{`${e.title}\n${fmtWhen(e)}${e.pov ? `\nPOV: ${e.pov}` : ''}${e.location ? t('ui.timelineView.loc_x', { location: e.location }) : ''}${e.outOfOrder ? t('ui.timelineView.povestita_in_afara_ordinii_cronologice') : ''}`}</title>
                <rect x={x0} y={y} width={w} height={LANE_H - 16} rx={3} fill={e.outOfOrder ? '#c47a1d' : '#3d7bd9'} opacity={0.85} />
                <text x={x0 + Math.max(w, 8) + 3} y={y + 12} fill="currentColor">{e.title.length > 18 ? `${e.title.slice(0, 17)}…` : e.title}</text>
                <text x={x0} y={height - 6} fill="currentColor" opacity={0.6}>{i % 2 === 0 ? fmtWhen(e) : ''}</text>
              </g>
            );
          })}
        </svg>
      )}
      {tl.undated.length > 0 && (
        <p className="muted" style={{ marginTop: 8 }}>
          {t('ui.timelineView.fara_data')}{tl.undated.length}):{' '}
          {tl.undated.map((e, i) => (
            <span key={e.id}>{i > 0 && ', '}<a href="#" onClick={(ev) => { ev.preventDefault(); onOpen && onOpen(e.id); }}>{e.title}</a></span>
          ))}
        </p>
      )}
    </div>
  );
}
