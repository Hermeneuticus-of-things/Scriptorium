import React, { useEffect, useMemo, useRef, useState } from 'react';
import { deadlinePlan } from '../lib/stats.js';
import { measure } from '../lib/panelsExtra.js';
import { t as tr, uiLocale } from '../lib/i18n.js';
import './TargetsDialog.css';

// Display order Monday..Sunday; values follow Date#getDay (0 = Sunday).
const DAYS = () => ([[1, 'Lu'], [2, 'Ma'], [3, 'Mi'], [4, 'Jo'], [5, 'Vi'], [6, tr('ui.targetsDialog.sa')], [0, 'Du']]);
const POS_KEY = 'scribner.targetsPanel.pos';

const fmt = (n) => Number(n || 0).toLocaleString(uiLocale());
const unitName = (type) => (type === 'Characters' ? tr('ui.inspector.caractere') : type === 'Pages' ? tr('ui.targetsDialog.pagini') : tr('ui.inspector.cuvinte'));

function readPos() {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
  } catch { /* ignore */ }
  return null;
}
const clampPos = (p, el) => {
  const w = el?.offsetWidth || 340;
  const h = el?.offsetHeight || 200;
  return {
    x: Math.min(Math.max(0, p.x), Math.max(0, window.innerWidth - w)),
    y: Math.min(Math.max(0, p.y), Math.max(0, window.innerHeight - Math.min(h, 60))),
  };
};

function TypeSelect({ value, onChange, label }) {
  return (
    <select value={value} aria-label={label} onChange={(e) => onChange(e.target.value)}>
      <option value="Words">{tr('ui.inspector.cuvinte')}</option>
      <option value="Characters">{tr('ui.inspector.caractere')}</option>
      <option value="Pages">{tr('ui.targetsDialog.pagini')}</option>
    </select>
  );
}

function Progress({ label, value, target, onTarget, type, locked = false }) {
  const max = Math.max(1, Number(target) || 0);
  const pct = Number(target) > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="tp-row">
      <div className="tp-head">
        <span className="tp-label">{label}</span>
        <span className="tp-count">
          {fmt(value)} {tr('ui.targetsDialog.din')}{' '}
          <input
            type="number"
            min="0"
            className="tp-target"
            aria-label={label}
            value={target}
            disabled={locked}
            onChange={(e) => onTarget(e.target.value)}
          />{' '}
          {unitName(type)}
        </span>
      </div>
      <meter min="0" max={max} low={max * 0.5} high={max * 0.99} optimum={max} value={Math.max(0, Math.min(value, max))} aria-label={label} />
      <small className="tp-pct">{pct}%</small>
    </div>
  );
}

// Non-modal floating panel. Changes apply immediately (debounced) through onSave.
// draftValue / sessionValue are the current counts in the saved units (computed by App).
export default function TargetsDialog({ project, draftWords, draftChars, draftValue, sessionValue, onSave, onClose, onResetSession }) {
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
  const [allowNegative, setAllowNegative] = useState(Boolean(t.allowNegative));
  const [sessionFromDeadline, setSessionFromDeadline] = useState(Boolean(t.sessionFromDeadline));
  const [sessionAllProjects, setSessionAllProjects] = useState(Boolean(t.sessionAllProjects));
  const [compact, setCompact] = useState(() => { try { return localStorage.getItem('scribner.targetsPanel.compact') === '1'; } catch { return false; } });
  const toggleCompact = () => setCompact((c) => { try { localStorage.setItem('scribner.targetsPanel.compact', c ? '0' : '1'); } catch { /* ignore */ } return !c; });
  const wpp = Number(wordsPerPage) || 250;
  const current = measure({ words: draftWords || 0, chars: draftChars ?? Math.round((draftWords || 0) * 6) }, draftType, wpp);
  const draftNow = draftValue != null && draftType === (t.draftType || 'Words') && wpp === (Number(t.wordsPerPage) || 250) ? draftValue : current;
  const sessionNow = sessionValue != null && sessionType === (t.sessionType || 'Words') ? sessionValue : 0;

  const toggleDay = (d) => setWritingDays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort()));
  const plan = useMemo(
    () => deadlinePlan({ draft: Number(draft) || 0, deadline, writingDays }, current),
    [draft, deadline, writingDays, current],
  );
  const unit = unitName(draftType);
  // The session can take its target from the deadline (the words a day still needed).
  const sessionAuto = sessionFromDeadline && plan && sessionType === draftType ? plan.perDay : null;

  // Apply changes immediately (debounced); skip the initial render.
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    const id = setTimeout(() => {
      saveRef.current?.({
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
        allowNegative,
        sessionFromDeadline,
        sessionAllProjects,
      });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, draftType, session, sessionType, deadline, writingDays, sessionReset, countOnlyCompiled, notify, notifyDocuments, wordsPerPage, allowNegative, sessionFromDeadline, sessionAllProjects]);

  // Position: remembered in localStorage, dragged by the title bar.
  const panelRef = useRef(null);
  const [pos, setPos] = useState(() => readPos() || { x: Math.max(16, window.innerWidth - 380), y: 72 });
  useEffect(() => { setPos((p) => clampPos(p, panelRef.current)); }, []);
  const onDragStart = (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    e.preventDefault();
    const sx = e.clientX - pos.x;
    const sy = e.clientY - pos.y;
    let last = pos;
    const move = (ev) => { last = clampPos({ x: ev.clientX - sx, y: ev.clientY - sy }, panelRef.current); setPos(last); };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      try { localStorage.setItem(POS_KEY, JSON.stringify(last)); } catch { /* ignore */ }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  useEffect(() => {
    // A floating panel that stays open beside other windows: Esc closes it only from inside.
    const onKey = (e) => { if (e.key === 'Escape' && !e.defaultPrevented && panelRef.current?.contains(document.activeElement)) onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className={`targets-panel ${compact ? 'compact' : ''}`}
      role="dialog"
      aria-modal="false"
      aria-label={tr('ui.targetsDialog.tinte')}
      style={{ left: pos.x, top: pos.y, maxHeight: `calc(100vh - ${pos.y + 8}px)` }}
    >
      <div className="tp-title" onPointerDown={onDragStart} title={tr('ui.targetsDialog.trage')}>
        <h2>{tr('ui.targetsDialog.tinte_de_scris')}</h2>
        <button type="button" className="tp-compact" aria-pressed={compact} title={tr('ui.p11.tg_compact')} aria-label={tr('ui.p11.tg_compact')} onClick={toggleCompact}>{compact ? '▾' : '▴'}</button>
        <button type="button" className="tp-close" aria-label={tr('btn.close')} onClick={onClose}>×</button>
      </div>
      <div className="tp-body">
        <Progress label={tr('ui.targetsDialog.manuscris')} value={draftNow} target={draft} onTarget={setDraft} type={draftType} />
        <Progress label={tr('ui.targetsDialog.sesiune')} value={sessionNow} target={sessionAuto ?? session} locked={sessionAuto != null} onTarget={setSession} type={sessionType} />

        {!compact && <details className="tp-options">
          <summary>{tr('ui.targetsDialog.optiuni')}</summary>
          <fieldset>
            <legend>{tr('ui.targetsDialog.manuscris')}</legend>
            <div className="row">
              <label>{tr('ui.targetsDialog.tinta_manuscrisului')}<input type="number" min="0" value={draft} onChange={(e) => setDraft(e.target.value)} /></label>
              <label>{tr('ui.targetsDialog.unitate')}<TypeSelect value={draftType} onChange={setDraftType} /></label>
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
            <p className="muted">{tr('ui.targetsDialog.zile_de_scris')}</p>
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
                <div><strong>{plan.overdue ? tr('ui.targetsDialog.depasit') : plan.remaining === 0 ? tr('ui.targetsDialog.atinsa') : tr('ui.targetsDialog.in_grafic')}</strong><span>{tr('ui.targetsDialog.stare')}</span></div>
              </div>
            ) : (
              <p className="muted">{tr('ui.targetsDialog.alege_un_termen_limita_pentru')} {unit} {tr('ui.targetsDialog.ai_de_scris_pe_zi')}</p>
            )}
          </fieldset>
          <fieldset>
            <legend>{tr('ui.targetsDialog.sesiune')}</legend>
            <div className="row">
              <label>{tr('ui.targetsDialog.tinta_sesiunii')}<input type="number" min="0" value={session} onChange={(e) => setSession(e.target.value)} /></label>
              <label>{tr('ui.targetsDialog.unitate')}<TypeSelect value={sessionType} onChange={setSessionType} /></label>
            </div>
            <label>
              {tr('ui.targetsDialog.resetarea_sesiunii')}
              <select value={sessionReset} onChange={(e) => setSessionReset(e.target.value)}>
                <option value="midnight">{tr('ui.targetsDialog.la_miezul_noptii')}</option>
                <option value="open">{tr('ui.targetsDialog.la_deschiderea_proiectului')}</option>
                <option value="manual">{tr('ui.targetsDialog.manual')}</option>
              </select>
            </label>
            {onResetSession && <button type="button" className="link" onClick={onResetSession}>{tr('ui.targetsDialog.reset_session')}</button>}
            <label className="check">
              <input type="checkbox" className="tg-negative" checked={allowNegative} onChange={(e) => setAllowNegative(e.target.checked)} /> {tr('ui.p11.tg_negative')}
            </label>
            <label className="check">
              <input type="checkbox" className="tg-from-deadline" checked={sessionFromDeadline} onChange={(e) => setSessionFromDeadline(e.target.checked)} /> {tr('ui.p11.tg_from_deadline')}
            </label>
            {sessionFromDeadline && !plan && <p className="muted small">{tr('ui.p11.tg_from_deadline_none')}</p>}
            <label className="check">
              <input type="checkbox" className="tg-all-projects" checked={sessionAllProjects} onChange={(e) => setSessionAllProjects(e.target.checked)} /> {tr('ui.p11.tg_all_projects')}
            </label>
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
        </details>}
      </div>
    </div>
  );
}
