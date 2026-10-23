import React, { useMemo, useState } from 'react';
import { buildTimeline } from '../lib/timeline.js';

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
  const width = Math.max(720, tl.events.length * 70 + LEFT + PAD * 2);
  const height = PAD * 2 + Math.max(1, tl.lanes.length) * LANE_H + 20;
  const span = Math.max(1, tl.max - tl.min);
  const x = (e, i) =>
    mode === 'sequence' || tl.events.length < 2
      ? LEFT + PAD + (i / Math.max(1, tl.events.length - 1)) * (width - LEFT - PAD * 2)
      : LEFT + PAD + ((e.start - tl.min) / span) * (width - LEFT - PAD * 2);
  const laneY = (lane) => PAD + tl.lanes.indexOf(lane) * LANE_H;

  return (
    <div className="timeline-view" style={{ padding: 12, overflow: 'auto', height: '100%' }}>
      <div className="toolbar" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <strong>Cronologie</strong>
        <label>Benzi după{' '}
          <select value={laneBy} onChange={(e) => setLaneBy(e.target.value)}>
            <option value="pov">Punct de vedere</option>
            <option value="location">Loc</option>
          </select>
        </label>
        <label>Scară{' '}
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="time">Proporțională cu timpul</option>
            <option value="sequence">Secvență</option>
          </select>
        </label>
        {onClose && <button onClick={onClose} style={{ marginLeft: 'auto' }}>Închide</button>}
      </div>
      {tl.events.length === 0 ? (
        <p className="muted">
          Nicio scenă nu are dată. Adaugă câmpuri de metadate personalizate (Data, Ora, Durata, POV, Loc) în Setările proiectului
          sau scrie „Data: 2024-05-01” în sinopsis.
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
            const w = mode === 'time' && e.duration ? Math.max(8, (e.duration / span) * (width - LEFT - PAD * 2)) : 8;
            const y = laneY(e.lane) + 8;
            return (
              <g key={e.id} style={{ cursor: 'pointer' }} onClick={() => onOpen && onOpen(e.id)}>
                <title>{`${e.title}\n${fmtWhen(e)}${e.pov ? `\nPOV: ${e.pov}` : ''}${e.location ? `\nLoc: ${e.location}` : ''}${e.outOfOrder ? '\n(povestită în afara ordinii cronologice)' : ''}`}</title>
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
          Fără dată ({tl.undated.length}):{' '}
          {tl.undated.map((e, i) => (
            <span key={e.id}>{i > 0 && ', '}<a href="#" onClick={(ev) => { ev.preventDefault(); onOpen && onOpen(e.id); }}>{e.title}</a></span>
          ))}
        </p>
      )}
    </div>
  );
}
