import React, { useMemo, useState } from 'react';
import { CULTURES, generateNames } from '../lib/nameGenerator.js';
import { t as tr } from '../lib/i18n.js';

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
      <div className="modal" role="dialog" aria-label={tr('ui.nameGeneratorDialog.generator_de_nume')} style={{ width: 460 }}>
        <h3>{tr('ui.nameGeneratorDialog.generator_de_nume')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 10px', alignItems: 'center' }}>
          <label htmlFor="ng-culture">{tr('ui.nameGeneratorDialog.cultura')}</label>
          <select id="ng-culture" value={culture} onChange={(e) => setCulture(e.target.value)}>
            {Object.entries(CULTURES).map(([k, c]) => (
              <option key={k} value={k}>{tr(`culture.${k}`)}</option>
            ))}
            <option value="mix">{tr('ui.nameGeneratorDialog.amestec')}</option>
          </select>
          <label htmlFor="ng-gender">{tr('ui.nameGeneratorDialog.gen')}</label>
          <select id="ng-gender" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="any">{tr('ui.nameGeneratorDialog.oricare')}</option>
            <option value="f">{tr('ui.nameGeneratorDialog.feminin')}</option>
            <option value="m">{tr('ui.nameGeneratorDialog.masculin')}</option>
          </select>
          <label htmlFor="ng-part">Format</label>
          <select id="ng-part" value={part} onChange={(e) => setPart(e.target.value)}>
            <option value="full">{tr('ui.nameGeneratorDialog.prenume_si_nume')}</option>
            <option value="first">{tr('ui.nameGeneratorDialog.doar_prenume')}</option>
            <option value="last">{tr('ui.nameGeneratorDialog.doar_nume_de_familie')}</option>
          </select>
          <label htmlFor="ng-count">{tr('ui.nameGeneratorDialog.numar')}</label>
          <input id="ng-count" type="number" min={1} max={100} value={count} onChange={(e) => setCount(Math.max(1, Math.min(100, +e.target.value || 1)))} />
          <span />
          <label>
            <input type="checkbox" checked={alliteration} onChange={(e) => setAlliteration(e.target.checked)} /> {tr('ui.nameGeneratorDialog.aliteratie_aceeasi_initiala')}
          </label>
        </div>
        <ul style={{ maxHeight: 260, overflow: 'auto', margin: '10px 0', padding: 0, listStyle: 'none' }}>
          {names.map((n) => (
            <li key={n.full} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span title={`${tr(`culture.${n.culture}`)}, ${n.gender === 'f' ? tr('ui.nameGeneratorDialog.feminin') : tr('ui.nameGeneratorDialog.masculin')}`}>{n.full}</span>
              <span>
                <button onClick={() => copy(n.full)}>{tr('ui.aiPanel.copiaza')}</button>
                {onInsert && <button onClick={() => onInsert(n.full)}>{tr('ui.aiPanel.insereaza')}</button>}
              </span>
            </li>
          ))}
          {!names.length && <li>{tr('ui.nameGeneratorDialog.nicio_combinatie_gasita_dezactiveaza_aliteratia')}</li>}
        </ul>
        <div className="modal-actions">
          <button onClick={() => setSeed(Date.now())}>{tr('ui.nameGeneratorDialog.genereaza_din_nou')}</button>
          <button onClick={() => copy(names.map((n) => n.full).join('\n'))}>{tr('ui.nameGeneratorDialog.copiaza_lista')}</button>
          <button onClick={onClose}>{tr('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}
