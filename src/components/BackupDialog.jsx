import React, { useEffect, useState } from 'react';

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
    if (!window.confirm('Restaurarea creează o copie separată a proiectului din acest backup și o deschide. Proiectul curent rămâne neatins. Continui?')) return;
    try {
      onOpenProject(await api.restoreBackup(dir, file));
      onClose();
    } catch (e) {
      onError(e);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Backup-uri" onClick={(e) => e.stopPropagation()}>
        <h2>Backup-uri</h2>
        <p className="muted">Backup automat la închidere și la intervalul din Setări. Se păstrează ultimele copii, cele vechi se șterg.</p>
        <button className="primary" disabled={busy} onClick={now}>{busy ? 'Se face backup…' : 'Fă backup acum'}</button>
        {list.length === 0 && <p className="muted">Niciun backup încă.</p>}
        <ul className="backup-list">
          {list.map((b) => (
            <li key={b.file}>
              <span title={b.file}>{b.name}</span>
              <small className="muted">{Math.round(b.size / 1024)} KB</small>
              <button className="link" onClick={() => restore(b.file)}>Restaurează</button>
            </li>
          ))}
        </ul>
        <div className="actions">
          <button onClick={onClose}>Închide</button>
        </div>
      </div>
    </div>
  );
}
