import React, { useMemo, useState } from 'react';
import { deadlinePlan } from '../lib/stats.js';
import { measure } from '../lib/panelsExtra.js';

// Display order Monday..Sunday; values follow Date#getDay (0 = Sunday).
const DAYS = [[1, 'Lu'], [2, 'Ma'], [3, 'Mi'], [4, 'Jo'], [5, 'Vi'], [6, 'Sâ'], [0, 'Du']];

const fmt = (n) => Number(n || 0).toLocaleString('ro-RO');

function TypeSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="Words">cuvinte</option>
      <option value="Characters">caractere</option>
      <option value="Pages">pagini</option>
    </select>
  );
}

// draftChars (optional) makes character targets exact; pages use wordsPerPage.
export default function TargetsDialog({ project, draftWords, draftChars, onSave, onClose }) {
  const t = project?.targets || {};
  const [draft, setDraft] = useState(t.draft || 0);
  const [draftType, setDraftType] = useState(t.draftType || 'Words');
  const [session, setSession] = useState(t.session || 0);
  const [sessionType, setSessionType] = useState(t.sessionType || 'Words');
  const [deadline, setDeadline] = useState(t.deadline || '');
  const [writingDays, setWritingDays] = useState(Array.isArray(t.writingDays) ? t.writingDays : [0, 1, 2, 3, 4, 5, 6]);
  const [sessionReset, setSessionReset] = useState(t.sessionReset || 'midnight');
  const [countOnlyCompiled, setCountOnlyCompiled] = useState(Boolean(t.countOnlyCompiled));
  const [notify, setNotify] = useState(t.notify !== false);
  const [notifyDocuments, setNotifyDocuments] = useState(t.notifyDocuments !== false);
  const [wordsPerPage, setWordsPerPage] = useState(t.wordsPerPage || 250);
  const current = measure({ words: draftWords || 0, chars: draftChars ?? Math.round((draftWords || 0) * 6) }, draftType, Number(wordsPerPage) || 250);

  const toggleDay = (d) => setWritingDays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort()));
  const plan = useMemo(
    () => deadlinePlan({ draft: Number(draft) || 0, deadline, writingDays }, current),
    [draft, deadline, writingDays, current],
  );
  const unit = draftType === 'Characters' ? 'caractere' : draftType === 'Pages' ? 'pagini' : 'cuvinte';

  const save = () => {
    onSave({
      ...t,
      draft: Math.max(0, Number(draft) || 0),
      draftType,
      session: Math.max(0, Number(session) || 0),
      sessionType,
      deadline,
      writingDays,
      sessionReset,
      countOnlyCompiled,
      notify,
      notifyDocuments,
      wordsPerPage: Math.max(1, Number(wordsPerPage) || 250),
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Ținte" onClick={(e) => e.stopPropagation()}>
        <h2>Ținte de scris</h2>
        <fieldset>
          <legend>Manuscris</legend>
          <div className="row">
            <label>Ținta manuscrisului<input type="number" min="0" value={draft} onChange={(e) => setDraft(e.target.value)} /></label>
            <label>Unitate<TypeSelect value={draftType} onChange={setDraftType} /></label>
          </div>
          {(draftType === 'Pages' || sessionType === 'Pages') && (
            <label>
              Cuvinte pe pagină
              <input type="number" min="50" max="1000" step="10" value={wordsPerPage} onChange={(e) => setWordsPerPage(e.target.value)} />
            </label>
          )}
          <p className="muted small">Acum: {fmt(current)} {unit}{draftChars == null && draftType === 'Characters' ? ' (estimare)' : ''}</p>
          <div className="row">
            <label>
              Termen limită
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </label>
            <button type="button" onClick={() => setDeadline('')} disabled={!deadline}>Fără termen</button>
          </div>
          <p className="muted">Zile de scris</p>
          <div className="checks">
            {DAYS.map(([d, l]) => (
              <label key={d} className="check">
                <input type="checkbox" checked={writingDays.includes(d)} onChange={() => toggleDay(d)} /> {l}
              </label>
            ))}
          </div>
          {plan ? (
            <div className="stats">
              <div><strong>{fmt(plan.remaining)}</strong><span>{unit} rămase</span></div>
              <div><strong>{fmt(plan.daysLeft)}</strong><span>zile de scris rămase</span></div>
              <div><strong>{fmt(plan.perDay)}</strong><span>{unit} pe zi</span></div>
              <div><strong>{plan.overdue ? 'Depășit' : plan.remaining === 0 ? 'Atinsă' : 'În grafic'}</strong><span>stare</span></div>
            </div>
          ) : (
            <p className="muted">Alege un termen limită pentru a vedea câte {unit} ai de scris pe zi.</p>
          )}
        </fieldset>
        <fieldset>
          <legend>Sesiune</legend>
          <div className="row">
            <label>Ținta sesiunii<input type="number" min="0" value={session} onChange={(e) => setSession(e.target.value)} /></label>
            <label>Unitate<TypeSelect value={sessionType} onChange={setSessionType} /></label>
          </div>
          <label>
            Resetarea sesiunii
            <select value={sessionReset} onChange={(e) => setSessionReset(e.target.value)}>
              <option value="midnight">La miezul nopții</option>
              <option value="open">La deschiderea proiectului</option>
              <option value="manual">Manual</option>
            </select>
          </label>
        </fieldset>
        <label className="check">
          <input type="checkbox" checked={countOnlyCompiled} onChange={(e) => setCountOnlyCompiled(e.target.checked)} /> Numără doar textul inclus în Compile
        </label>
        <label className="check">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Notificare când atingi ținta
        </label>
        <label className="check">
          <input type="checkbox" checked={notifyDocuments} onChange={(e) => setNotifyDocuments(e.target.checked)} /> Notificare și pentru țintele documentelor
        </label>
        <div className="actions">
          <button onClick={onClose}>Anulează</button>
          <button className="primary" onClick={save}>Salvează</button>
        </div>
      </div>
    </div>
  );
}
