import React from 'react';
import { t, uiLocale } from '../lib/i18n.js';

const ROWS = () => ([
  ['documents', t('ui.importReport.documente_text')],
  ['folders', t('ui.importReport.dosare')],
  ['media', t('ui.importReport.fisiere_media_imagini_pdf_audio')],
  ['comments', 'comentarii'],
  ['footnotes', t('ui.importReport.note_de_subsol')],
  ['annotations', t('ui.importReport.adnotari_inline')],
  ['images', t('ui.importReport.imagini_in_text')],
  ['links', t('ui.importReport.scrivener_links_refacute')],
  ['snapshots', 'snapshot-uri'],
  ['labels', 'etichete'],
  ['statuses', 'statusuri'],
  ['keywords', t('ui.importReport.cuvinte_cheie')],
  ['customFields', t('ui.importReport.campuri_de_metadate_personalizate')],
  ['collections', t('ui.importReport.colectii')],
  ['bookmarks', 'bookmark-uri'],
  ['historyDays', t('ui.importReport.zile_din_istoricul_scrisului')],
]);

export default function ImportReport({ report, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal import-report" role="dialog" aria-label="Raport de import" onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.importReport.import_scrivener_incheiat')}</h2>
        <p className="muted">Sursa: {report.source || t('ui.importReport.proiect_scrivener')} ({report.scrivenerVersion})</p>
        <table className="meta-table">
          <tbody>
            {ROWS().filter(([k]) => report[k]).map(([k, label]) => (
              <tr key={k}>
                <td>{label}</td>
                <td>{report[k].toLocaleString(uiLocale())}</td>
              </tr>
            ))}
            {report.projectNotes && (
              <tr>
                <td>{t('ui.importReport.note_de_proiect')}</td>
                <td>da</td>
              </tr>
            )}
          </tbody>
        </table>
        {report.originalCopy && (
          <p>
            {t('ui.importReport.copia_completa_a_proiectului_original')} <code>scrivener-original/</code>{t('ui.importReport.tot_ce_nu_are_inca')}
          </p>
        )}
        {report.warnings && report.warnings.length > 0 && (
          <>
            <h4>{t('ui.importReport.atentionari')}</h4>
            <ul>
              {report.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </>
        )}
        <div className="actions">
          <button className="primary" onClick={onClose}>{t('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}
