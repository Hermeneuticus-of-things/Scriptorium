import React, { useMemo, useState } from 'react';
import { buildRelations, forceLayout } from '../lib/relations.js';

const W = 800;
const H = 560;

// Hartă de relații: personaje legate de scenele în care apar împreună.
export default function RelationMap({ project, docs, onOpen, onClose }) {
  const [minWeight, setMinWeight] = useState(1);
  const [focus, setFocus] = useState(null);
  const rel = useMemo(() => buildRelations(project, docs, { minWeight }), [project, docs, minWeight]);
  const pos = useMemo(() => forceLayout(rel.nodes, rel.edges, { width: W, height: H }), [rel]);
  const maxW = Math.max(1, ...rel.edges.map((e) => e.weight));
  const maxS = Math.max(1, ...rel.nodes.map((n) => n.scenes));
  const titles = useMemo(() => {
    const m = {};
    const walk = (ns) => (ns || []).forEach((n) => { m[n.id] = n.title; walk(n.children); });
    walk(project?.tree);
    return m;
  }, [project]);
  const linked = (e) => !focus || e.a === focus || e.b === focus;

  return (
    <div className="relation-map" style={{ padding: 12, overflow: 'auto', height: '100%' }}>
      <div className="toolbar" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <strong>Hartă de relații</strong>
        <label>Minim scene comune{' '}
          <input type="number" min={1} value={minWeight} onChange={(e) => setMinWeight(Math.max(1, Number(e.target.value) || 1))} style={{ width: 56 }} />
        </label>
        {focus && <button onClick={() => setFocus(null)}>Toate personajele</button>}
        {onClose && <button onClick={onClose} style={{ marginLeft: 'auto' }}>Închide</button>}
      </div>
      {rel.nodes.length === 0 ? (
        <p className="muted">Nu am găsit personaje. Adaugă documente în dosarul „Personaje” sau scrie mai multe scene.</p>
      ) : (
        <div style={{ display: 'flex', gap: 12 }}>
          <svg width={W} height={H} role="img" aria-label="Hartă de relații" style={{ fontSize: 12, flex: 'none' }}>
            {rel.edges.map((e) => (
              <line key={`${e.a}|${e.b}`} x1={pos[e.a].x} y1={pos[e.a].y} x2={pos[e.b].x} y2={pos[e.b].y}
                stroke="currentColor" strokeOpacity={linked(e) ? 0.15 + 0.6 * (e.weight / maxW) : 0.04}
                strokeWidth={1 + 5 * (e.weight / maxW)}>
                <title>{`${e.a} — ${e.b}: ${e.weight} scene comune`}</title>
              </line>
            ))}
            {rel.nodes.map((n) => (
              <g key={n.id} style={{ cursor: 'pointer' }} onClick={() => setFocus(n.id === focus ? null : n.id)}>
                <circle cx={pos[n.id].x} cy={pos[n.id].y} r={6 + 12 * (n.scenes / maxS)} fill={n.id === focus ? '#c47a1d' : '#3d7bd9'} opacity={0.85} />
                <text x={pos[n.id].x} y={pos[n.id].y - 10 - 12 * (n.scenes / maxS)} textAnchor="middle" fill="currentColor">{n.name}</text>
                <title>{`${n.name}: ${n.scenes} scene`}</title>
              </g>
            ))}
          </svg>
          {focus && (
            <div style={{ minWidth: 200 }}>
              <h4>{focus}</h4>
              <p className="muted">Apare în {rel.scenesByName[focus]?.length || 0} scene:</p>
              <ul>
                {(rel.scenesByName[focus] || []).map((id) => (
                  <li key={id}><a href="#" onClick={(ev) => { ev.preventDefault(); onOpen && onOpen(id); }}>{titles[id] || id}</a></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
