import React, { useMemo, useRef, useState } from 'react';
import { CULTURES, generateNames, parseNameList, customCultures } from '../lib/nameGenerator.js';
import { t as tr } from '../lib/i18n.js';

/**
 * Props: onClose(), onInsert?(text) — inserts the chosen name in the editor;
 * customLists [{id, label, m, f, last}] + onCustomLists(lists): the author's own name lists.
 */
export default function NameGeneratorDialog({ onClose, onInsert, customLists = [], onCustomLists }) {
  const [startsWith, setStartsWith] = useState('');
  const [endsWith, setEndsWith] = useState('');
  const [contains, setContains] = useState('');
  const [importKind, setImportKind] = useState('any');
  const fileRef = useRef(null);
  const extra = useMemo(() => customCultures(customLists), [customLists]);
  const allKeys = [...Object.keys(CULTURES), ...Object.keys(extra)];
  const cultureLabel = (k) => (extra[k] ? extra[k].label : tr(`culture.${k}`));
  const importList = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const parsed = parseNameList(await f.text(), importKind);
    if (!parsed.m.length && !parsed.f.length && !parsed.last.length) return;
    const id = `${Date.now().toString(36)}`;
    onCustomLists?.([...customLists, { id, label: f.name.replace(/\.[^.]+$/, ''), ...parsed }]);
    setFirstOrigins((o) => [...o, `custom:${id}`]);
    if (parsed.last.length) setLastOrigins((o) => [...o, `custom:${id}`]);
  };
  const removeList = (id) => {
    onCustomLists?.(customLists.filter((l) => l.id !== id));
    setFirstOrigins((o) => (o.filter((k) => k !== `custom:${id}`).length ? o.filter((k) => k !== `custom:${id}`) : ['ro']));
    setLastOrigins((o) => (o.filter((k) => k !== `custom:${id}`).length ? o.filter((k) => k !== `custom:${id}`) : ['ro']));
  };
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
    () => generateNames({ firstOrigins, lastOrigins, gender, count, matchInitials: alliteration, doubleLast, rarity, seed, firstOnly: part === 'first', lastOnly: part === 'last', startsWith, endsWith, contains, extraCultures: extra }),
    [firstOrigins, lastOrigins, gender, count, alliteration, doubleLast, rarity, seed, part, startsWith, endsWith, contains, extra],
  );
  const toggle = (list, setList, k) => setList(list.includes(k) ? (list.length > 1 ? list.filter((x) => x !== k) : list) : [...list, k]);
  const origins = (id, label, list, setList) => (
    <fieldset className="ng-origins" aria-label={label}>
      <legend>{label}</legend>
      {allKeys.map((k) => (
        <label key={k} className="check" style={{ display: 'inline-flex', marginRight: 8 }}>
          <input type="checkbox" data-origin={`${id}-${k}`} checked={list.includes(k)} onChange={() => toggle(list, setList, k)} /> {cultureLabel(k)}
        </label>
      ))}
      <button type="button" className="link" onClick={() => setList(allKeys)}>{tr('ui.g4.ngToate')}</button>
    </fieldset>
  );
  const copy = (t) => navigator.clipboard?.writeText(t).catch(() => {});

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={tr('ui.nameGeneratorDialog.generator_de_nume')} style={{ width: 'min(560px, 92vw)' }}>
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
          <label htmlFor="ng-starts">{tr('ui.p11.ng_starts')}</label>
          <input id="ng-starts" className="ng-starts" maxLength={3} value={startsWith} placeholder={tr('ui.p11.ng_starts_ph')} onChange={(e) => setStartsWith(e.target.value)} />
          <label htmlFor="ng-ends">{tr('ui.nameGeneratorDialog.ng_ends')}</label>
          <input id="ng-ends" className="ng-starts" maxLength={3} value={endsWith} onChange={(e) => setEndsWith(e.target.value)} />
          <label htmlFor="ng-contains">{tr('ui.nameGeneratorDialog.ng_contains')}</label>
          <input id="ng-contains" className="ng-starts" maxLength={5} value={contains} onChange={(e) => setContains(e.target.value)} />
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
        {onCustomLists && (
          <fieldset className="ng-lists">
            <legend>{tr('ui.p11.ng_lists')}</legend>
            {customLists.map((l) => (
              <span key={l.id} className="ng-list" style={{ marginRight: 8 }}>
                {l.label} <small className="muted">({(l.m || []).length + (l.f || []).length} / {(l.last || []).length})</small>{' '}
                <button type="button" className="link" aria-label={tr('btn.delete')} onClick={() => removeList(l.id)}>×</button>
              </span>
            ))}
            <span style={{ display: 'inline-flex', gap: 6 }}>
              <select aria-label={tr('ui.p11.ng_kind')} value={importKind} onChange={(e) => setImportKind(e.target.value)}>
                <option value="any">{tr('ui.p11.ng_kind_any')}</option>
                <option value="m">{tr('ui.nameGeneratorDialog.masculin')}</option>
                <option value="f">{tr('ui.nameGeneratorDialog.feminin')}</option>
                <option value="last">{tr('ui.p11.ng_kind_last')}</option>
              </select>
              <button type="button" className="ng-import" onClick={() => fileRef.current?.click()}>{tr('ui.p11.ng_import')}</button>
              <input ref={fileRef} type="file" accept=".txt,.csv,text/plain" hidden onChange={importList} />
            </span>
            <p className="muted small">{tr('ui.p11.ng_import_hint')}</p>
          </fieldset>
        )}
        <ul style={{ maxHeight: 260, overflow: 'auto', margin: '10px 0', padding: 0, listStyle: 'none' }}>
          {names.map((n) => (
            <li key={n.full} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span title={`${cultureLabel(n.culture)}${n.lastCulture && n.lastCulture !== n.culture ? ` / ${cultureLabel(n.lastCulture)}` : ''}, ${n.gender === 'f' ? tr('ui.nameGeneratorDialog.feminin') : tr('ui.nameGeneratorDialog.masculin')}`}>{n.full}</span>
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
