import React, { useState } from 'react';
import { t } from '../lib/i18n.js';

export default function ImportDialog({ api, target, onImported, onClose, onError }) {
  const [mode, setMode] = useState('h1');
  const [separator, setSeparator] = useState('#');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const parts = await (api.importText ? api.importText(mode, separator) : api.importFile(mode, separator));
      if (parts && parts.length) {
        onImported(parts);
        onClose();
      }
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={t('ui.importDialog.importa_text')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.importDialog.importa_word_rtf_odt_text')}</h2>
        <p className="muted">{t('ui.importDialog.documentele_noi_se_adauga_langa')}{target}”. {t('ui.import.formate')} .docx, .rtf, .odt, .txt, .md{api.importText ? ', .html, .fountain, .fdx' : ''}{t('ui.importDialog.modificarile_urmarite_din_word_devin')}</p>
        <label>
          {t('ui.importDialog.imparte_in_documente')}
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="none">{t('ui.importDialog.nu_imparti_un_document_pe')}</option>
            <option value="h1">{t('ui.importDialog.la_fiecare_titlu_1_capitole')}</option>
            <option value="h2">{t('ui.importDialog.la_fiecare_titlu_1_si')}</option>
            <option value="separator">{t('ui.importDialog.la_un_rand_separator')}</option>
          </select>
        </label>
        {mode === 'separator' && (
          <label>
            {t('ui.importDialog.separator_randul_intreg')}
            <input value={separator} onChange={(e) => setSeparator(e.target.value)} />
          </label>
        )}
        <div className="actions">
          <button onClick={onClose}>{t('btn.cancel')}</button>
          <button className="primary" disabled={busy} onClick={run}>{busy ? t('ui.importDialog.se_importa') : t('ui.importDialog.alege_fisiere')}</button>
        </div>
      </div>
    </div>
  );
}
