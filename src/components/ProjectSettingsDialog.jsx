import React, { useState } from 'react';
import { NONE, FIELD_TYPES, makeDraft, applyProjectSettings, validateDraft, moveItem } from '../lib/projectSettings.js';

const TABS = [
  ['proiect', 'Proiect'],
  ['etichete', 'Etichete'],
  ['statusuri', 'Statusuri'],
  ['metadate', 'Metadate'],
  ['sectiuni', 'Tipuri de secțiune'],
  ['foldere', 'Foldere speciale'],
];
const TYPE_NAMES = { text: 'Text', checkbox: 'Bifă', list: 'Listă', date: 'Dată' };
const LEVELS = [
  ['folders', 'Dosare'],
  ['containers', 'Documente cu subdocumente'],
  ['files', 'Documente text'],
];

const CSS = `
.ps-tabs { display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid rgba(128,128,128,.3); padding-bottom: 6px; }
.ps-tabs button.on { font-weight: 600; text-decoration: underline; }
.ps-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.ps-item { display: flex; align-items: center; gap: 6px; }
.ps-item > input[type=text], .ps-item > input:not([type]) { flex: 1; min-width: 0; }
.ps-item button { padding: 2px 7px; }
.ps-field { border: 1px solid rgba(128,128,128,.3); border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.ps-opts { margin-left: 16px; }
.ps-errors { color: #b33; margin: 0; padding-left: 18px; }
`;

function Reorder({ i, n, pinFirst, onMove }) {
  const lo = pinFirst ? 1 : 0;
  return (
    <>
      <button type="button" title="Mută în sus" disabled={i <= lo} onClick={() => onMove(i, -1)}>↑</button>
      <button type="button" title="Mută în jos" disabled={i < lo || i >= n - 1} onClick={() => onMove(i, 1)}>↓</button>
    </>
  );
}

// Project settings (Scrivener: Project > Project Settings).
export default function ProjectSettingsDialog({ project, folders, onSave, onClose }) {
  const [d, setD] = useState(() => makeDraft(project));
  const [tab, setTab] = useState('proiect');
  const [errors, setErrors] = useState([]);

  const set = (p) => setD((x) => ({ ...x, ...p }));
  const setList = (key, fn) => setD((x) => ({ ...x, [key]: fn(x[key]) }));
  const patchAt = (key, i, p) => setList(key, (arr) => arr.map((it, k) => (k === i ? { ...it, ...p } : it)));
  const removeAt = (key, i) => setList(key, (arr) => arr.filter((_, k) => k !== i));
  const move = (key, pinFirst) => (i, delta) => setList(key, (arr) => moveItem(arr, i, delta, pinFirst));

  const save = () => {
    const errs = validateDraft(d);
    setErrors(errs);
    if (errs.length) return;
    onSave(applyProjectSettings(project, d));
  };

  const fullFromParts = () => set({ author: [d.authorFirst, d.authorLast].filter(Boolean).join(' ') });

  const renderSimpleList = (key, withColor) => (
    <ul className="ps-list">
      {d[key].map((it, i) => (
        <li key={i} className="ps-item">
          <input
            value={it.name}
            disabled={i === 0 && it.name === NONE}
            aria-label="Nume"
            onChange={(e) => patchAt(key, i, { name: e.target.value })}
          />
          {withColor && (
            <>
              <input type="color" value={it.color || '#000000'} disabled={i === 0} aria-label="Culoare" onChange={(e) => patchAt(key, i, { color: e.target.value })} />
              <button type="button" title="Fără culoare" disabled={i === 0 || !it.color} onClick={() => patchAt(key, i, { color: '' })}>∅</button>
            </>
          )}
          <Reorder i={i} n={d[key].length} pinFirst onMove={move(key, true)} />
          <button
            type="button"
            title="Șterge"
            disabled={i === 0}
            onClick={() => {
              if (it.orig && !window.confirm(`Ștergi „${it.name}”? Documentele care îl folosesc vor primi „${NONE}”.`)) return;
              removeAt(key, i);
            }}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );

  const addNamed = (key, base, extra = {}) =>
    setList(key, (arr) => {
      const names = new Set(arr.map((x) => x.name));
      let name = base;
      for (let k = 2; names.has(name); k++) name = `${base} ${k}`;
      return [...arr, { name, orig: null, ...extra }];
    });

  const fieldPatch = (i, p) => patchAt('customFields', i, p);
  const addField = () =>
    setList('customFields', (arr) => {
      const titles = new Set(arr.map((x) => x.title));
      let title = 'Câmp nou';
      for (let k = 2; titles.has(title); k++) title = `Câmp nou ${k}`;
      return [...arr, { id: '', title, type: 'text', options: [], default: '', wraps: false, orig: null }];
    });

  const addSectionType = () =>
    setList('sectionTypes', (arr) => {
      const titles = new Set(arr.map((x) => x.title));
      let title = 'Tip nou';
      for (let k = 2; titles.has(title); k++) title = `Tip nou ${k}`;
      return [...arr, { id: '', title, orig: null }];
    });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide ps-dialog" role="dialog" aria-label="Setările proiectului" onClick={(e) => e.stopPropagation()}>
        <style>{CSS}</style>
        <h2>Setările proiectului</h2>
        <div className="ps-tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'proiect' && (
          <div className="fields">
            <label>
              Titlu
              <input value={d.title} onChange={(e) => set({ title: e.target.value })} />
            </label>
            <label>
              Titlu prescurtat
              <input value={d.titleAbbreviation} onChange={(e) => set({ titleAbbreviation: e.target.value })} />
            </label>
            <div className="row">
              <label>
                Prenume autor
                <input value={d.authorFirst} onChange={(e) => set({ authorFirst: e.target.value })} />
              </label>
              <label>
                Nume autor
                <input value={d.authorLast} onChange={(e) => set({ authorLast: e.target.value })} />
              </label>
            </div>
            <label>
              Nume complet autor
              <input value={d.author} onChange={(e) => set({ author: e.target.value })} />
            </label>
            <div>
              <button type="button" onClick={fullFromParts}>Completează din prenume și nume</button>
            </div>
          </div>
        )}

        {tab === 'etichete' && (
          <div className="fields">
            <label>
              Titlul coloanei
              <input value={d.labelTitle} onChange={(e) => set({ labelTitle: e.target.value })} />
            </label>
            {renderSimpleList('labels', true)}
            <div>
              <button type="button" onClick={() => addNamed('labels', 'Etichetă nouă', { color: '#888888' })}>Adaugă etichetă</button>
            </div>
            <p className="muted">Eticheta „{NONE}” rămâne prima și nu poate fi ștearsă.</p>
          </div>
        )}

        {tab === 'statusuri' && (
          <div className="fields">
            <label>
              Titlul coloanei
              <input value={d.statusTitle} onChange={(e) => set({ statusTitle: e.target.value })} />
            </label>
            {renderSimpleList('statuses', false)}
            <div>
              <button type="button" onClick={() => addNamed('statuses', 'Status nou')}>Adaugă status</button>
            </div>
            <p className="muted">Statusul „{NONE}” rămâne primul și nu poate fi șters.</p>
          </div>
        )}

        {tab === 'metadate' && (
          <div className="fields">
            {d.customFields.length === 0 && <p className="muted">Nu există câmpuri de metadate personalizate.</p>}
            {d.customFields.map((f, i) => (
              <div key={i} className="ps-field">
                <div className="row">
                  <label>
                    Titlu
                    <input value={f.title} onChange={(e) => fieldPatch(i, { title: e.target.value })} />
                  </label>
                  <label>
                    Tip
                    <select
                      value={f.type}
                      onChange={(e) => fieldPatch(i, { type: e.target.value, default: e.target.value === 'checkbox' ? false : '' })}
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>{TYPE_NAMES[t]}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="row">
                  <label>
                    Valoare implicită
                    {f.type === 'checkbox' ? (
                      <input type="checkbox" checked={f.default === true} onChange={(e) => fieldPatch(i, { default: e.target.checked })} />
                    ) : f.type === 'list' ? (
                      <select value={f.default || ''} onChange={(e) => fieldPatch(i, { default: e.target.value })}>
                        <option value="">(niciuna)</option>
                        {f.options.map((o, k) => (
                          <option key={k} value={o.title}>{o.title}</option>
                        ))}
                      </select>
                    ) : (
                      <input type={f.type === 'date' ? 'date' : 'text'} value={f.default || ''} onChange={(e) => fieldPatch(i, { default: e.target.value })} />
                    )}
                  </label>
                </div>
                {f.type === 'text' && (
                  <label className="check">
                    <input type="checkbox" checked={Boolean(f.wraps)} onChange={(e) => fieldPatch(i, { wraps: e.target.checked })} /> Text pe mai multe rânduri
                  </label>
                )}
                {f.type === 'list' && (
                  <div className="ps-opts">
                    <span className="muted">Opțiuni</span>
                    <ul className="ps-list">
                      {f.options.map((o, k) => (
                        <li key={k} className="ps-item">
                          <input
                            value={o.title}
                            aria-label="Opțiune"
                            onChange={(e) => fieldPatch(i, { options: f.options.map((x, j) => (j === k ? { ...x, title: e.target.value } : x)) })}
                          />
                          <Reorder i={k} n={f.options.length} onMove={(k2, dl) => fieldPatch(i, { options: moveItem(f.options, k2, dl) })} />
                          <button type="button" title="Șterge opțiunea" onClick={() => fieldPatch(i, { options: f.options.filter((_, j) => j !== k) })}>✕</button>
                        </li>
                      ))}
                    </ul>
                    <button type="button" onClick={() => fieldPatch(i, { options: [...f.options, { id: '', title: 'Opțiune nouă' }] })}>Adaugă opțiune</button>
                  </div>
                )}
                <div className="ps-item">
                  <Reorder i={i} n={d.customFields.length} onMove={move('customFields', false)} />
                  <button
                    type="button"
                    onClick={() => {
                      if (f.orig && !window.confirm(`Ștergi câmpul „${f.title}”? Valorile lui din toate documentele se vor pierde.`)) return;
                      removeAt('customFields', i);
                    }}
                  >
                    Șterge câmpul
                  </button>
                </div>
              </div>
            ))}
            <div>
              <button type="button" onClick={addField}>Adaugă câmp</button>
            </div>
          </div>
        )}

        {tab === 'sectiuni' && (
          <div className="fields">
            <ul className="ps-list">
              {d.sectionTypes.map((t, i) => (
                <li key={i} className="ps-item">
                  <input value={t.title} aria-label="Titlu" onChange={(e) => patchAt('sectionTypes', i, { title: e.target.value })} />
                  <Reorder i={i} n={d.sectionTypes.length} onMove={move('sectionTypes', false)} />
                  <button
                    type="button"
                    title="Șterge"
                    onClick={() => {
                      if (t.orig && !window.confirm(`Ștergi tipul de secțiune „${t.title}”?`)) return;
                      const removedId = t.id;
                      setD((x) => ({
                        ...x,
                        sectionTypes: x.sectionTypes.filter((_, k) => k !== i),
                        sectionTypeLevels: Object.fromEntries(
                          Object.entries(x.sectionTypeLevels).map(([k, v]) => [k, removedId && v === removedId ? null : v]),
                        ),
                      }));
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <div>
              <button type="button" onClick={addSectionType}>Adaugă tip de secțiune</button>
            </div>
            <h3>Tip implicit după nivel</h3>
            {d.sectionTypes.some((t) => !t.id) && <p className="muted">Tipurile noi pot fi alese ca implicite după salvare.</p>}
            {LEVELS.map(([k, label]) => (
              <label key={k}>
                {label}
                <select
                  value={d.sectionTypeLevels[k] || ''}
                  onChange={(e) => set({ sectionTypeLevels: { ...d.sectionTypeLevels, [k]: e.target.value || null } })}
                >
                  <option value="">(niciunul)</option>
                  {d.sectionTypes.filter((t) => t.id).map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}

        {tab === 'foldere' && (
          <div className="fields">
            <label>
              Dosar cu șabloane de documente
              <select value={d.templateFolder || ''} onChange={(e) => set({ templateFolder: e.target.value || null })}>
                <option value="">(niciunul)</option>
                {(folders || []).map((f) => (
                  <option key={f.id} value={f.id}>{f.path || f.title}</option>
                ))}
              </select>
            </label>
            <p className="muted">Documentele din acest dosar apar ca modele la crearea unui document nou.</p>
          </div>
        )}

        {errors.length > 0 && (
          <ul className="ps-errors">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}

        <div className="actions">
          <button type="button" onClick={onClose}>Anulează</button>
          <button type="button" className="primary" onClick={save}>Salvează</button>
        </div>
      </div>
    </div>
  );
}
