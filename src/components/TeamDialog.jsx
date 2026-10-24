import React, { useMemo, useState } from 'react';
import { t, uiLocale } from '../lib/i18n.js';
import { AGENT, filterLog, people } from '../lib/team.js';

// Project → Team: who works on the project now and who changed what, when (src/lib/team.js).
export default function TeamDialog({ team, titleOf, currentId, onOpenDoc, onSettings, onClose }) {
  const [scope, setScope] = useState(currentId ? 'doc' : 'all');
  const [who, setWho] = useState('');
  const [period, setPeriod] = useState('');
  const everyone = useMemo(() => people(team.log), [team.log]);
  const rows = useMemo(() => filterLog(team.log, { doc: scope === 'doc' ? currentId : '', who, period }).slice(-300).reverse(), [team.log, scope, currentId, who, period]);
  const when = (iso) => new Date(iso).toLocaleString(uiLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const name = (n) => (n === AGENT ? t('ui.team.agent') : n);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide team-dialog" role="dialog" aria-label={t('ui.team.titlu')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.team.titlu')}</h2>
        {!team.who ? (
          <p className="muted">
            {t('ui.team.fara_nume')} <button onClick={onSettings}>{t('ui.team.deschide_setarile')}</button>
          </p>
        ) : (
          <p className="muted small">
            <span className="team-dot" style={{ background: team.who.color }} /> {t('ui.team.tu_esti', { name: team.who.name })}
          </p>
        )}

        <h4>{t('ui.team.acum')}</h4>
        {team.live.length ? (
          <ul className="team-live">
            {team.live.map((p) => (
              <li key={p.machine}>
                <span className="team-dot" style={{ background: p.color }} /> <strong>{name(p.who)}</strong>{' '}
                {p.doc ? (
                  <button className="link" onClick={() => onOpenDoc(p.doc)}>{titleOf(p.doc) || p.doc}</button>
                ) : (
                  <span className="muted">{t('ui.team.proiect_deschis')}</span>
                )}
                {p.locks?.length > 0 && <span className="muted small"> · {t('ui.team.blocate', { n: p.locks.length })}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">{t('ui.team.nimeni_acum')}</p>
        )}

        <h4>{t('ui.team.cine_a_modificat')}</h4>
        <div className="row">
          <label>
            {t('ui.team.ce')}
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              {currentId && <option value="doc">{t('ui.team.documentul_curent')}</option>}
              <option value="all">{t('ui.team.tot_proiectul')}</option>
            </select>
          </label>
          <label>
            {t('ui.team.cine')}
            <select value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="">{t('ui.team.toti')}</option>
              {everyone.map((p) => (
                <option key={p.name} value={p.name}>{name(p.name)}</option>
              ))}
            </select>
          </label>
          <label>
            {t('ui.team.cand')}
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="">{t('ui.team.oricand')}</option>
              <option value="day">{t('ui.team.ultima_zi')}</option>
              <option value="week">{t('ui.team.ultima_saptamana')}</option>
              <option value="month">{t('ui.team.ultima_luna')}</option>
            </select>
          </label>
        </div>
        {rows.length ? (
          <ul className="team-log">
            {rows.map((r, i) => (
              <li key={`${r.machine}-${r.time}-${i}`}>
                <span className="team-dot" style={{ background: r.color }} />
                <span className="team-when">{when(r.time)}</span> <strong>{name(r.who)}</strong>{' '}
                <button className="link" onClick={() => onOpenDoc(r.doc)}>{titleOf(r.doc) || r.title}</button>{' '}
                <span className="team-delta">
                  <span className="add">+{r.added}</span> <span className="del">−{r.removed}</span>
                </span>
                {r.sample && <div className="muted small team-sample">„{r.sample}”</div>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">{t('ui.team.nicio_modificare')}</p>
        )}
        <p className="muted small">{t('ui.team.revenire')}</p>
        <div className="actions">
          <span className="spacer" />
          <button onClick={onClose}>{t('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}
