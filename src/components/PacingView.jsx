import React, { useMemo, useState } from 'react';
import { analyzePacing } from '../lib/pacing.js';

const METRICS = [
  ['words', 'Cuvinte', (v) => v.toLocaleString('ro-RO')],
  ['dialogueRatio', 'Dialog %', (v) => `${Math.round(v * 100)}%`],
  ['avgSentence', 'Lungime medie frază', (v) => v],
  ['avgParagraph', 'Lungime medie paragraf', (v) => v],
];

// Analiză de ritm: grafic de bare pe scene, fără AI.
export default function PacingView({ project, docs, onOpen, onClose }) {
  const [metric, setMetric] = useState('words');
  const data = useMemo(() => analyzePacing(project, docs), [project, docs]);
  const [, label, fmt] = METRICS.find((m) => m[0] === metric);
  const vals = data.scenes.map((s) => s[metric]);
  const max = Math.max(1e-9, ...vals);
  const bw = Math.max(10, Math.min(40, 900 / Math.max(1, data.scenes.length)));
  const H = 260;
  const W = Math.max(600, data.scenes.length * (bw + 4) + 40);
  const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const s = data.summary;

  return (
    <div className="pacing-view" style={{ padding: 12, overflow: 'auto', height: '100%' }}>
      <div className="toolbar" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <strong>Analiză de ritm</strong>
        <select value={metric} onChange={(e) => setMetric(e.target.value)}>
          {METRICS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
        {onClose && <button onClick={onClose} style={{ marginLeft: 'auto' }}>Închide</button>}
      </div>
      <p className="muted">
        {s.count} scene · {s.totalWords.toLocaleString('ro-RO')} cuvinte · medie {s.meanWords} · abatere {s.stdDev} (CV {s.cv}) ·
        dialog mediu {Math.round(s.meanDialogue * 100)}% · frază medie {s.meanSentence} cuvinte
      </p>
      {data.scenes.length === 0 ? <p className="muted">Manuscrisul nu are scene.</p> : (
        <svg width={W} height={H + 30} role="img" aria-label={`Grafic: ${label} pe scene`} style={{ fontSize: 10 }}>
          <line x1={20} x2={W} y1={H - (mean / max) * (H - 10)} y2={H - (mean / max) * (H - 10)} stroke="currentColor" strokeDasharray="4 3" opacity={0.4} />
          {data.scenes.map((sc, i) => {
            const h = (sc[metric] / max) * (H - 10);
            const flagged = sc.flags.length > 0;
            return (
              <g key={sc.id} style={{ cursor: 'pointer' }} onClick={() => onOpen && onOpen(sc.id)}>
                <title>{`${sc.title}\n${label}: ${fmt(sc[metric])}${flagged ? `\n${sc.flags.join(', ')}` : ''}`}</title>
                <rect x={24 + i * (bw + 4)} y={H - h} width={bw} height={Math.max(1, h)} rx={2} fill={flagged ? '#c47a1d' : '#3d7bd9'} opacity={0.85} />
                <text x={24 + i * (bw + 4) + bw / 2} y={H + 12} textAnchor="middle" fill="currentColor" opacity={0.6}>{i + 1}</text>
              </g>
            );
          })}
        </svg>
      )}
      <table className="pacing-table" style={{ marginTop: 8, borderCollapse: 'collapse', width: '100%' }}>
        <thead><tr><th>#</th><th style={{ textAlign: 'left' }}>Scenă</th>{METRICS.map(([id, l]) => <th key={id}>{l}</th>)}<th>Semnale</th></tr></thead>
        <tbody>
          {data.scenes.map((sc, i) => (
            <tr key={sc.id} onClick={() => onOpen && onOpen(sc.id)} style={{ cursor: 'pointer' }}>
              <td>{i + 1}</td><td>{sc.title}</td>
              {METRICS.map(([id, , f]) => <td key={id} style={{ textAlign: 'right' }}>{f(sc[id])}</td>)}
              <td>{sc.flags.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
