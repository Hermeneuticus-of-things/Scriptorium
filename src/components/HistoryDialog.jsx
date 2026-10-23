import React, { useEffect, useMemo, useState } from 'react';
import { monthlyHistory } from '../lib/panelsExtra.js';

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
  const fmt = (n) => Number(n || 0).toLocaleString('ro-RO');
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
          <div><strong>{totalWritten.toLocaleString('ro-RO')}</strong><span>cuvinte scrise în manuscris</span></div>
          <div><strong>{days}</strong><span>zile cu scris</span></div>
          <div><strong>{days ? Math.round(totalWritten / days).toLocaleString('ro-RO') : 0}</strong><span>medie pe zi de scris</span></div>
          <div><strong>{streak}</strong><span>zile la rând</span></div>
        </div>
        <div className="seg" role="tablist">
          <button className={mode === 'daily' ? 'on' : ''} onClick={() => setMode('daily')}>Zilnic</button>
          <button className={mode === 'monthly' ? 'on' : ''} onClick={() => setMode('monthly')}>Lunar</button>
        </div>
        {mode === 'monthly' ? (
          <>
            <div className="bars" aria-label="Cuvinte pe lună">
              {months.map((m) => (
                <div key={m.month} className="bar" title={`${m.month}: ${m.draft} cuvinte`}>
                  <div style={{ height: `${(Math.max(0, m.draft) / maxMonth) * 100}%` }} />
                  <small>{m.month.slice(5)}/{m.month.slice(2, 4)}</small>
                </div>
              ))}
            </div>
            <table className="history-table">
              <thead>
                <tr><th>Luna</th><th className="num">Manuscris</th><th className="num">Tot proiectul</th>{hasChars && <th className="num">Caractere</th>}<th className="num">Zile cu scris</th></tr>
              </thead>
              <tbody>
                {[...months].reverse().map((m) => (
                  <tr key={m.month}>
                    <td>{new Date(`${m.month}-01T12:00:00`).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}</td>
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
          <p className="muted">Încă nu există istoric. Se înregistrează automat pe măsură ce scrii.</p>
        ) : (
          <div className="bars" aria-label="Cuvinte pe zi, ultimele 30 de zile">
            {last.map((r) => (
              <div key={r.date} className="bar" title={`${r.date}: ${r.draft} cuvinte`}>
                <div style={{ height: `${Math.max(0, r.draft) / max * 100}%` }} className={r.draft < 0 ? 'neg' : ''} />
                <small>{r.date.slice(8)}</small>
              </div>
            ))}
          </div>
        )}
        {mode === 'daily' && <table className="history-table">
          <thead>
            <tr><th>Data</th><th className="num">Manuscris</th><th className="num">Tot proiectul</th>{hasChars && <th className="num">Caractere</th>}<th className="num">Total manuscris</th></tr>
          </thead>
          <tbody>
            {[...rows].reverse().slice(0, 60).map((r) => (
              <tr key={r.date}>
                <td>{r.date}{r.imported && <small className="muted"> · Scrivener</small>}</td>
                <td className="num">{r.draft.toLocaleString('ro-RO')}</td>
                <td className="num">{r.total.toLocaleString('ro-RO')}</td>
                {hasChars && <td className="num">{fmt(r.draftChars)}</td>}
                <td className="num">{r.draftWords == null ? '' : r.draftWords.toLocaleString('ro-RO')}</td>
              </tr>
            ))}
          </tbody>
        </table>}
        <div className="actions">
          <button onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
          <button className="primary" onClick={onClose}>Închide</button>
        </div>
      </div>
    </div>
  );
}
