import React, { useEffect, useMemo, useState } from 'react';
import { monthlyHistory } from '../lib/panelsExtra.js';
import { filterHistoryRange, historyCsv, historyTotals } from '../lib/smallWindows.js';
import { t, uiLocale } from '../lib/i18n.js';

export default function HistoryDialog({ api, dir, onClose, onError }) {
  const [all, setAll] = useState(null);
  const [mode, setMode] = useState('daily');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [picked, setPicked] = useState([]);
  const reload = () => api.getHistory(dir).then((r) => { setAll(r || []); setPicked([]); }).catch(onError);
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, dir]);
  const rows = useMemo(() => filterHistoryRange(all || [], from, to), [all, from, to]);
  const months = useMemo(() => monthlyHistory(rows), [rows]);

  if (!all) return null;
  // Characters are shown when the history records them (row.draftChars).
  const hasChars = rows.some((r) => r.draftChars != null);
  const hasGross = rows.some((r) => r.draftAdded != null);
  const fmt = (n) => Number(n || 0).toLocaleString(uiLocale());
  const maxMonth = Math.max(1, ...months.map((m) => m.draft));
  const last = rows.slice(-30);
  const max = Math.max(1, ...last.map((r) => Math.max(r.draft, r.draftAdded || 0)));
  const tot = historyTotals(rows);
  const canDelete = Boolean(api.deleteHistory);

  const exportCsv = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([historyCsv(rows)], { type: 'text/csv' }));
    a.download = 'istoric-scriere.csv';
    a.click();
  };
  const del = async (dates) => {
    const msg = dates ? t('ui.p11.hi_delete_days_confirm', { n: dates.length }) : t('ui.p11.hi_delete_all_confirm');
    if (!window.confirm(msg)) return;
    await api.deleteHistory(dir, dates).catch(onError);
    await reload();
  };
  const toggle = (date) => setPicked((p) => (p.includes(date) ? p.filter((d) => d !== date) : [...p, date]));
  const shown = [...rows].reverse().slice(0, 120);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide history-dialog" role="dialog" aria-label={t('ui.history.titlu')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.history.titlu')}</h2>
        <div className="row history-range">
          <label>{t('ui.p11.hi_from')} <input type="date" className="hi-from" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>{t('ui.p11.hi_to')} <input type="date" className="hi-to" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          {(from || to) && <button className="link" onClick={() => { setFrom(''); setTo(''); }}>{t('ui.p11.hi_all_dates')}</button>}
        </div>
        <div className="stats">
          <div><strong className="hi-net">{fmt(tot.net)}</strong><span>{t('ui.p11.hi_net')}</span></div>
          {hasGross && <div><strong className="hi-added">{fmt(tot.added)}</strong><span>{t('ui.p11.hi_added')}</span></div>}
          {hasGross && <div><strong className="hi-deleted">{fmt(tot.deleted)}</strong><span>{t('ui.p11.hi_deleted')}</span></div>}
          <div><strong>{tot.days}</strong><span>{t('ui.historyDialog.zile_cu_scris')}</span></div>
          <div><strong>{fmt(tot.average)}</strong><span>{t('ui.historyDialog.medie_pe_zi_de_scris')}</span></div>
          <div><strong>{tot.streak}</strong><span>{t('ui.historyDialog.zile_la_rand')}</span></div>
        </div>
        <div className="seg" role="tablist">
          <button className={mode === 'daily' ? 'on' : ''} onClick={() => setMode('daily')}>{t('ui.history.zilnic')}</button>
          <button className={mode === 'monthly' ? 'on' : ''} onClick={() => setMode('monthly')}>{t('ui.history.lunar')}</button>
        </div>
        {mode === 'monthly' ? (
          <>
            <div className="bars" aria-label={t('ui.historyDialog.cuvinte_pe_luna')}>
              {months.map((m) => (
                <div key={m.month} className="bar" title={t('ui.historyDialog.x_x_cuvinte_2', { month: m.month, draft: m.draft })}>
                  <div style={{ height: `${(Math.max(0, m.draft) / maxMonth) * 100}%` }} />
                  <small>{m.month.slice(5)}/{m.month.slice(2, 4)}</small>
                </div>
              ))}
            </div>
            <table className="history-table">
              <thead>
                <tr><th>{t('ui.history.luna')}</th><th className="num">{t('ui.stats.manuscris')}</th><th className="num">{t('ui.advancedSearchDialog.tot_proiectul')}</th>{hasChars && <th className="num">{t('ui.historyDialog.caractere')}</th>}<th className="num">{t('ui.historyDialog.zile_cu_scris_2')}</th></tr>
              </thead>
              <tbody>
                {[...months].reverse().map((m) => (
                  <tr key={m.month}>
                    <td>{new Date(`${m.month}-01T12:00:00`).toLocaleDateString(uiLocale(), { month: 'long', year: 'numeric' })}</td>
                    <td className="num">{fmt(m.draft)}</td>
                    <td className="num">{fmt(m.total)}</td>
                    {hasChars && <td className="num">{fmt(m.chars)}</td>}
                    <td className="num">{m.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : last.length === 0 ? (
          <p className="muted">{t('ui.historyDialog.inca_nu_exista_istoric_se')}</p>
        ) : (
          <div className="bars" aria-label={t('ui.historyDialog.cuvinte_pe_zi_ultimele_30')}>
            {last.map((r) => (
              <div key={r.date} className="bar" title={t('ui.historyDialog.x_x_cuvinte', { date: r.date, draft: r.draft })}>
                <div style={{ height: `${Math.max(0, r.draft) / max * 100}%` }} className={r.draft < 0 ? 'neg' : ''} />
                <small>{r.date.slice(8)}</small>
              </div>
            ))}
          </div>
        )}
        {mode === 'daily' && <table className="history-table">
          <thead>
            <tr>
              {canDelete && <th aria-label={t('ui.p11.hi_pick')} />}
              <th>{t('ui.historyDialog.data')}</th>
              <th className="num">{t('ui.p11.hi_net_short')}</th>
              {hasGross && <th className="num">{t('ui.p11.hi_added_short')}</th>}
              {hasGross && <th className="num">{t('ui.p11.hi_deleted_short')}</th>}
              <th className="num">{t('ui.advancedSearchDialog.tot_proiectul')}</th>
              {hasChars && <th className="num">{t('ui.historyDialog.caractere')}</th>}
              <th className="num">{t('ui.p11.hi_total_draft')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.date} className={picked.includes(r.date) ? 'selected' : ''}>
                {canDelete && <td><input type="checkbox" className="hi-pick" aria-label={r.date} checked={picked.includes(r.date)} onChange={() => toggle(r.date)} /></td>}
                <td>{r.date}{r.imported && <small className="muted"> · .scriv</small>}</td>
                <td className="num">{fmt(r.draft)}</td>
                {hasGross && <td className="num hi-row-added">{r.draftAdded == null ? '' : fmt(r.draftAdded)}</td>}
                {hasGross && <td className="num hi-row-deleted">{r.draftDeleted == null ? '' : fmt(r.draftDeleted)}</td>}
                <td className="num">{fmt(r.total)}</td>
                {hasChars && <td className="num">{fmt(r.draftChars)}</td>}
                <td className="num">{r.draftWords == null ? '' : fmt(r.draftWords)}</td>
              </tr>
            ))}
          </tbody>
        </table>}
        <div className="actions">
          {canDelete && <button className="hi-delete-days" disabled={!picked.length} onClick={() => del(picked)}>{t('ui.p11.hi_delete_days', { n: picked.length })}</button>}
          {canDelete && <button className="hi-delete-all danger" disabled={!all.length} onClick={() => del(null)}>{t('ui.p11.hi_delete_all')}</button>}
          <button onClick={exportCsv} disabled={!rows.length}>{t('ui.p11.hi_csv')}</button>
          <button className="primary" onClick={onClose}>{t('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}
