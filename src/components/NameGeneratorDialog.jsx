import React, { useMemo, useState } from 'react';
import { CULTURES, generateNames } from '../lib/nameGenerator.js';
import { t as tr } from '../lib/i18n.js';

/** Props: onClose(), onInsert?(text) — inserts the chosen name in the editor. */
export default function NameGeneratorDialog({ onClose, onInsert }) {
  const [firstOrigins, setFirstOrigins] = useState(['ro']);
  const [lastOrigins, setLastOrigins] = useState(['ro']);
  const [rarity, setRarity] = useState(0.5);
  const [doubleLast, setDoubleLast] = useState(false);
  const [gender, setGender] = useState('any');
  const [count, setCount] = useState(15);
  const [alliteration, setAlliteration] = useState(false);
  const [part, setPart] = useState('full');
  const [seed, setSeed] = useState(() => Date.now());
  const names = useMemo(
    () => generateNames({ firstOrigins, lastOrigins, gender, count, matchInitials: alliteration, doubleLast, rarity, seed, firstOnly: part === 'first', lastOnly: part === 'last' }),
    [firstOrigins, lastOrigins, gender, count, alliteration, doubleLast, rarity, seed, part],
  );
  const toggle = (list, setList, k) => setList(list.includes(k) ? (list.length > 1 ? list.filter((x) => x !== k) : list) : [...list, k]);
  const origins = (id, label, list, setList) => (
    <fieldset className="ng-origins" aria-label={label}>
      <legend>{label}</legend>
      {Object.keys(CULTURES).map((k) => (
        <label key={k} className="check" style={{ display: 'inline-flex', marginRight: 8 }}>
          <input type="checkbox" data-origin={`${id}-${k}`} checked={list.includes(k)} onChange={() => toggle(list, setList, k)} /> {tr(`culture.${k}`)}
        </label>
      ))}
      <button type="button" className="link" onClick={() => setList(Object.keys(CULTURES))}>{tr('ui.g4.ngToate')}</button>
    </fieldset>
  );
  const copy = (t) => navigator.clipboard?.writeText(t).catch(() => {});

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={tr('ui.nameGeneratorDialog.generator_de_nume')} style={{ width: 560 }}>
        <h3>{tr('ui.nameGeneratorDialog.generator_de_nume')}</h3>
        {origins('first', tr('ui.g4.ngOriginiPrenume'), firstOrigins, setFirstOrigins)}
        {origins('last', tr('ui.g4.ngOriginiNume'), lastOrigins, setLastOrigins)}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 10px', alignItems: 'center' }}>
          <label htmlFor="ng-rarity">{tr('ui.g4.ngRaritate')}</label>
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <small className="muted">{tr('ui.g4.ngComune')}</small>
            <input id="ng-rarity" type="range" min={0} max={1} step={0.05} value={rarity} onChange={(e) => setRarity(+e.target.value)} />
            <small className="muted">{tr('ui.g4.ngRare')}</small>
          </span>
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
            <input type="checkbox" checked={alliteration} onChange={(e) => setAlliteration(e.target.checked)} /> {tr('ui.g4.ngInitiale')}
          </label>
          <span />
          <label>
            <input type="checkbox" checked={doubleLast} onChange={(e) => setDoubleLast(e.target.checked)} /> {tr('ui.g4.ngDuble')}
          </label>
        </div>
        <ul style={{ maxHeight: 260, overflow: 'auto', margin: '10px 0', padding: 0, listStyle: 'none' }}>
          {names.map((n) => (
            <li key={n.full} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span title={`${tr(`culture.${n.culture}`)}${n.lastCulture && n.lastCulture !== n.culture ? ` / ${tr(`culture.${n.lastCulture}`)}` : ''}, ${n.gender === 'f' ? tr('ui.nameGeneratorDialog.feminin') : tr('ui.nameGeneratorDialog.masculin')}`}>{n.full}</span>
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
