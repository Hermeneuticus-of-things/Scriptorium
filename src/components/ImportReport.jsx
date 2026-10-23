import React from 'react';

const ROWS = [
  ['documents', 'documente text'],
  ['folders', 'dosare'],
  ['media', 'fișiere media (imagini, PDF, audio, video)'],
  ['comments', 'comentarii'],
  ['footnotes', 'note de subsol'],
  ['annotations', 'adnotări inline'],
  ['images', 'imagini în text'],
  ['links', 'Scrivener Links refăcute'],
  ['snapshots', 'snapshot-uri'],
  ['labels', 'etichete'],
  ['statuses', 'statusuri'],
  ['keywords', 'cuvinte cheie'],
  ['customFields', 'câmpuri de metadate personalizate'],
  ['collections', 'colecții'],
  ['bookmarks', 'bookmark-uri'],
  ['historyDays', 'zile din istoricul scrisului'],
];

export default function ImportReport({ report, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal import-report" role="dialog" aria-label="Raport de import" onClick={(e) => e.stopPropagation()}>
        <h2>Import Scrivener încheiat</h2>
        <p className="muted">Sursa: {report.source || 'proiect Scrivener'} ({report.scrivenerVersion})</p>
        <table className="meta-table">
          <tbody>
            {ROWS.filter(([k]) => report[k]).map(([k, label]) => (
              <tr key={k}>
                <td>{label}</td>
                <td>{report[k].toLocaleString('ro-RO')}</td>
              </tr>
            ))}
            {report.projectNotes && (
              <tr>
                <td>note de proiect</td>
                <td>da</td>
              </tr>
            )}
          </tbody>
        </table>
        {report.originalCopy && (
          <p>
            Copia completă a proiectului original e păstrată în <code>scrivener-original/</code>. Tot ce nu are încă echivalent în Scribner
            (setările de Compile, pozițiile de pe corkboard-ul liber, stilurile) rămâne acolo neatins.
          </p>
        )}
        {report.warnings && report.warnings.length > 0 && (
          <>
            <h4>Atenționări</h4>
            <ul>
              {report.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </>
        )}
        <div className="actions">
          <button className="primary" onClick={onClose}>Închide</button>
        </div>
      </div>
    </div>
  );
}
