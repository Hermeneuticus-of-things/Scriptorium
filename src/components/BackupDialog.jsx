import React, { useEffect, useState } from 'react';
import { t } from '../lib/i18n.js';

export default function BackupDialog({ api, dir, onOpenProject, onClose, onError }) {
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const refresh = () => api.listBackups(dir).then(setList).catch(onError);
  useEffect(() => {
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const now = async () => {
    setBusy(true);
    try {
      await api.backupNow(dir);
      await refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const restore = async (file) => {
    if (!window.confirm(t('ui.backupDialog.restaurarea_creeaza_o_copie_separata'))) return;
    try {
      onOpenProject(await api.restoreBackup(dir, file));
      onClose();
    } catch (e) {
      onError(e);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal backup-dialog" role="dialog" aria-label={t('ui.backup.titlu')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.backup.titlu')}</h2>
        <p className="muted">{t('ui.backupDialog.backup_automat_la_inchidere_si')}</p>
        <button className="primary" disabled={busy} onClick={now}>{busy ? 'Se face backup…' : t('ui.backupDialog.fa_backup_acum')}</button>
        {list.length === 0 && <p className="muted">{t('ui.backupDialog.niciun_backup_inca')}</p>}
        <ul className="backup-list">
          {list.map((b) => (
            <li key={b.file}>
              <span title={b.file}>{b.name}</span>
              <small className="muted">{Math.round(b.size / 1024)} KB</small>
              <button className="link" onClick={() => restore(b.file)}>{t('ui.backupDialog.restaureaza')}</button>
            </li>
          ))}
        </ul>
        <div className="actions">
          <button onClick={onClose}>{t('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}
