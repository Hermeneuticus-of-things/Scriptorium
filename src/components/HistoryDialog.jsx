import React, { useEffect, useMemo, useState } from 'react';
import { monthlyHistory } from '../lib/panelsExtra.js';
import { t, uiLocale } from '../lib/i18n.js';

export default function HistoryDialog({ api, dir, onClose, onError }) {
  const [rows, setRows] = useState(null);
  const [mode, setMode] = useState('daily');
  const months = useMemo(() => monthlyHistory(rows || []), [rows]);
  useEffect(() => {
    api.getHistory(dir).then(setRows).catch(onError);
  }, [api, dir, onError]);

  if (!rows) return null;
  // Characters are shown when the history records them (row.draftChars).
  const hasChars = rows.some((r) => r.draftChars != null);
  const fmt = (n) => Number(n || 0).toLocaleString(uiLocale());
  const maxMonth = Math.max(1, ...months.map((m) => m.draft));
  const last = rows.slice(-30);
  const max = Math.max(1, ...last.map((r) => r.draft));
  const totalWritten = rows.reduce((s, r) => s + Math.max(0, r.draft), 0);
  const days = rows.filter((r) => r.draft > 0).length;
  let streak = 0;
  for (let i = rows.length - 1; i >= 0 && rows[i].draft > 0; i--) streak++;

  const exportCsv = () => {
    const csv = ['data,cuvinte_manuscris,cuvinte_total,manuscris_la_final_de_zi,caractere_manuscris', ...rows.map((r) => `${r.date},${r.draft},${r.total},${r.draftWords ?? ''},${r.draftChars ?? ''}`)].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'istoric-scriere.csv';
    a.click();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label="Istoric scriere" onClick={(e) => e.stopPropagation()}>
        <h2>Istoricul scrisului</h2>
        <div className="stats">
          <div><strong>{totalWritten.toLocaleString(uiLocale())}</strong><span>{t('ui.historyDialog.cuvinte_scrise_in_manuscris')}</span></div>
          <div><strong>{days}</strong><span>{t('ui.historyDialog.zile_cu_scris')}</span></div>
          <div><strong>{days ? Math.round(totalWritten / days).toLocaleString(uiLocale()) : 0}</strong><span>{t('ui.historyDialog.medie_pe_zi_de_scris')}</span></div>
          <div><strong>{streak}</strong><span>{t('ui.historyDialog.zile_la_rand')}</span></div>
        </div>
        <div className="seg" role="tablist">
          <button className={mode === 'daily' ? 'on' : ''} onClick={() => setMode('daily')}>Zilnic</button>
          <button className={mode === 'monthly' ? 'on' : ''} onClick={() => setMode('monthly')}>Lunar</button>
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
                <tr><th>Luna</th><th className="num">Manuscris</th><th className="num">{t('ui.advancedSearchDialog.tot_proiectul')}</th>{hasChars && <th className="num">{t('ui.historyDialog.caractere')}</th>}<th className="num">{t('ui.historyDialog.zile_cu_scris_2')}</th></tr>
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
            <tr><th>{t('ui.historyDialog.data')}</th><th className="num">Manuscris</th><th className="num">{t('ui.advancedSearchDialog.tot_proiectul')}</th>{hasChars && <th className="num">{t('ui.historyDialog.caractere')}</th>}<th className="num">Total manuscris</th></tr>
          </thead>
          <tbody>
            {[...rows].reverse().slice(0, 60).map((r) => (
              <tr key={r.date}>
                <td>{r.date}{r.imported && <small className="muted"> · .scriv</small>}</td>
                <td className="num">{r.draft.toLocaleString(uiLocale())}</td>
                <td className="num">{r.total.toLocaleString(uiLocale())}</td>
                {hasChars && <td className="num">{fmt(r.draftChars)}</td>}
                <td className="num">{r.draftWords == null ? '' : r.draftWords.toLocaleString(uiLocale())}</td>
              </tr>
            ))}
          </tbody>
        </table>}
        <div className="actions">
          <button onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
          <button className="primary" onClick={onClose}>{t('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}
