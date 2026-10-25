import React, { useMemo, useState } from 'react';
import { deadlinePlan } from '../lib/stats.js';
import { measure } from '../lib/panelsExtra.js';
import { t as tr, uiLocale } from '../lib/i18n.js';

// Display order Monday..Sunday; values follow Date#getDay (0 = Sunday).
const DAYS = () => ([[1, 'Lu'], [2, 'Ma'], [3, 'Mi'], [4, 'Jo'], [5, 'Vi'], [6, tr('ui.targetsDialog.sa')], [0, 'Du']]);

const fmt = (n) => Number(n || 0).toLocaleString(uiLocale());

function TypeSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="Words">{tr('ui.inspector.cuvinte')}</option>
      <option value="Characters">{tr('ui.inspector.caractere')}</option>
      <option value="Pages">{tr('ui.targetsDialog.pagini')}</option>
    </select>
  );
}

// draftChars (optional) makes character targets exact; pages use wordsPerPage.
export default function TargetsDialog({ project, draftWords, draftChars, onSave, onClose, onResetSession }) {
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
  const unit = draftType === 'Characters' ? tr('ui.inspector.caractere') : draftType === 'Pages' ? tr('ui.targetsDialog.pagini') : tr('ui.inspector.cuvinte');

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
      <div className="modal" role="dialog" aria-label={tr('ui.targetsDialog.tinte')} onClick={(e) => e.stopPropagation()}>
        <h2>{tr('ui.targetsDialog.tinte_de_scris')}</h2>
        <fieldset>
          <legend>Manuscris</legend>
          <div className="row">
            <label>{tr('ui.targetsDialog.tinta_manuscrisului')}<input type="number" min="0" value={draft} onChange={(e) => setDraft(e.target.value)} /></label>
            <label>{tr('ui.inspector.unitate')}<TypeSelect value={draftType} onChange={setDraftType} /></label>
          </div>
          {(draftType === 'Pages' || sessionType === 'Pages') && (
            <label>
              {tr('ui.targetsDialog.cuvinte_pe_pagina')}
              <input type="number" min="50" max="1000" step="10" value={wordsPerPage} onChange={(e) => setWordsPerPage(e.target.value)} />
            </label>
          )}
          <p className="muted small">{tr('ui.targetsDialog.acum')} {fmt(current)} {unit}{draftChars == null && draftType === 'Characters' ? ' (estimare)' : ''}</p>
          <div className="row">
            <label>
              {tr('ui.targetsDialog.termen_limita')}
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </label>
            <button type="button" onClick={() => setDeadline('')} disabled={!deadline}>{tr('ui.targetsDialog.fara_termen')}</button>
          </div>
          <p className="muted">Zile de scris</p>
          <div className="checks">
            {DAYS().map(([d, l]) => (
              <label key={d} className="check">
                <input type="checkbox" checked={writingDays.includes(d)} onChange={() => toggleDay(d)} /> {l}
              </label>
            ))}
          </div>
          {plan ? (
            <div className="stats">
              <div><strong>{fmt(plan.remaining)}</strong><span>{unit} {tr('ui.targetsDialog.ramase')}</span></div>
              <div><strong>{fmt(plan.daysLeft)}</strong><span>{tr('ui.targetsDialog.zile_de_scris_ramase')}</span></div>
              <div><strong>{fmt(plan.perDay)}</strong><span>{unit} {tr('ui.targetsDialog.pe_zi')}</span></div>
              <div><strong>{plan.overdue ? tr('ui.targetsDialog.depasit') : plan.remaining === 0 ? tr('ui.targetsDialog.atinsa') : tr('ui.targetsDialog.in_grafic')}</strong><span>stare</span></div>
            </div>
          ) : (
            <p className="muted">{tr('ui.targetsDialog.alege_un_termen_limita_pentru')} {unit} {tr('ui.targetsDialog.ai_de_scris_pe_zi')}</p>
          )}
        </fieldset>
        <fieldset>
          <legend>Sesiune</legend>
          <div className="row">
            <label>{tr('ui.targetsDialog.tinta_sesiunii')}<input type="number" min="0" value={session} onChange={(e) => setSession(e.target.value)} /></label>
            <label>{tr('ui.inspector.unitate')}<TypeSelect value={sessionType} onChange={setSessionType} /></label>
          </div>
          <label>
            Resetarea sesiunii
            <select value={sessionReset} onChange={(e) => setSessionReset(e.target.value)}>
              <option value="midnight">{tr('ui.targetsDialog.la_miezul_noptii')}</option>
              <option value="open">{tr('ui.targetsDialog.la_deschiderea_proiectului')}</option>
              <option value="manual">{tr('ui.targetsDialog.manual')}</option>
            </select>
          </label>
          {onResetSession && <button type="button" className="link" onClick={onResetSession}>{tr('ui.targetsDialog.reset_session')}</button>}
        </fieldset>
        <label className="check">
          <input type="checkbox" checked={countOnlyCompiled} onChange={(e) => setCountOnlyCompiled(e.target.checked)} /> {tr('ui.targetsDialog.numara_doar_textul_inclus_in')}
        </label>
        <label className="check">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> {tr('ui.targetsDialog.notificare_cand_atingi_tinta')}
        </label>
        <label className="check">
          <input type="checkbox" checked={notifyDocuments} onChange={(e) => setNotifyDocuments(e.target.checked)} /> {tr('ui.targetsDialog.notificare_si_pentru_tintele_documentelor')}
        </label>
        <div className="actions">
          <button onClick={onClose}>{tr('btn.cancel')}</button>
          <button className="primary" onClick={save}>{tr('btn.save')}</button>
        </div>
      </div>
    </div>
  );
}
