import React, { useEffect, useState } from 'react';

export default function HistoryDialog({ api, dir, onClose, onError }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api.getHistory(dir).then(setRows).catch(onError);
  }, [api, dir, onError]);

  if (!rows) return null;
  const last = rows.slice(-30);
  const max = Math.max(1, ...last.map((r) => r.draft));
  const totalWritten = rows.reduce((s, r) => s + Math.max(0, r.draft), 0);
  const days = rows.filter((r) => r.draft > 0).length;
  let streak = 0;
  for (let i = rows.length - 1; i >= 0 && rows[i].draft > 0; i--) streak++;

  const exportCsv = () => {
    const csv = ['data,cuvinte_manuscris,cuvinte_total,manuscris_la_final_de_zi', ...rows.map((r) => `${r.date},${r.draft},${r.total},${r.draftWords ?? ''}`)].join('\n');
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
        {last.length === 0 ? (
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
        <table className="history-table">
          <thead>
            <tr><th>Data</th><th className="num">Manuscris</th><th className="num">Tot proiectul</th><th className="num">Total manuscris</th></tr>
          </thead>
          <tbody>
            {[...rows].reverse().slice(0, 60).map((r) => (
              <tr key={r.date}>
                <td>{r.date}{r.imported && <small className="muted"> · Scrivener</small>}</td>
                <td className="num">{r.draft.toLocaleString('ro-RO')}</td>
                <td className="num">{r.total.toLocaleString('ro-RO')}</td>
                <td className="num">{r.draftWords == null ? '' : r.draftWords.toLocaleString('ro-RO')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="actions">
          <button onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
          <button className="primary" onClick={onClose}>Închide</button>
        </div>
      </div>
    </div>
  );
}
