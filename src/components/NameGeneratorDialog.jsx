import React, { useMemo, useState } from 'react';
import { CULTURES, generateNames } from '../lib/nameGenerator.js';

/** Props: onClose(), onInsert?(text) — inserts the chosen name in the editor. */
export default function NameGeneratorDialog({ onClose, onInsert }) {
  const [culture, setCulture] = useState('ro');
  const [gender, setGender] = useState('any');
  const [count, setCount] = useState(15);
  const [alliteration, setAlliteration] = useState(false);
  const [part, setPart] = useState('full');
  const [seed, setSeed] = useState(() => Date.now());
  const names = useMemo(
    () => generateNames({ culture, gender, count, alliteration, seed, firstOnly: part === 'first', lastOnly: part === 'last' }),
    [culture, gender, count, alliteration, seed, part],
  );
  const copy = (t) => navigator.clipboard?.writeText(t).catch(() => {});

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label="Generator de nume" style={{ width: 460 }}>
        <h3>Generator de nume</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 10px', alignItems: 'center' }}>
          <label>Cultură</label>
          <select value={culture} onChange={(e) => setCulture(e.target.value)}>
            {Object.entries(CULTURES).map(([k, c]) => (
              <option key={k} value={k}>{c.label}</option>
            ))}
            <option value="mix">Amestec</option>
          </select>
          <label>Gen</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="any">Oricare</option>
            <option value="f">Feminin</option>
            <option value="m">Masculin</option>
          </select>
          <label>Format</label>
          <select value={part} onChange={(e) => setPart(e.target.value)}>
            <option value="full">Prenume și nume</option>
            <option value="first">Doar prenume</option>
            <option value="last">Doar nume de familie</option>
          </select>
          <label>Număr</label>
          <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Math.max(1, Math.min(100, +e.target.value || 1)))} />
          <span />
          <label>
            <input type="checkbox" checked={alliteration} onChange={(e) => setAlliteration(e.target.checked)} /> Aliterație (aceeași inițială)
          </label>
        </div>
        <ul style={{ maxHeight: 260, overflow: 'auto', margin: '10px 0', padding: 0, listStyle: 'none' }}>
          {names.map((n) => (
            <li key={n.full} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span title={`${CULTURES[n.culture].label}, ${n.gender === 'f' ? 'feminin' : 'masculin'}`}>{n.full}</span>
              <span>
                <button onClick={() => copy(n.full)}>Copiază</button>
                {onInsert && <button onClick={() => onInsert(n.full)}>Inserează</button>}
              </span>
            </li>
          ))}
          {!names.length && <li>Nicio combinație găsită. Dezactivează aliterația.</li>}
        </ul>
        <div className="modal-actions">
          <button onClick={() => setSeed(Date.now())}>Generează din nou</button>
          <button onClick={() => copy(names.map((n) => n.full).join('\n'))}>Copiază lista</button>
          <button onClick={onClose}>Închide</button>
        </div>
      </div>
    </div>
  );
}
