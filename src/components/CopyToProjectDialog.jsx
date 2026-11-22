import React, { useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';

// Copiază selecția în ALT proiect (T4, S3-A.DOC.21): lista proiectelor recente + „Alege alt
// dosar…". Nimic nu se execută fără click pe Copiază; ținta trebuie să fie proiect valid.
export default function CopyToProjectDialog({ recent = [], currentDir, count = 0, onCopy, onClose, onError }) {
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const others = recent.filter((r) => r.dir && r.dir !== currentDir);
  const go = async () => {
    if (!target || busy) return;
    setBusy(true);
    try { await onCopy(target); }
    catch (e) { onError?.(e); }
    finally { setBusy(false); }
  };
  const browse = async () => {
    try {
      const dir = await window.api.pickProjectDir();
      if (dir) { setTarget(dir); }
    } catch (e) { onError?.(e); }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal copy-to-project" role="dialog" aria-label={t('ui.copyToProject.title')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.copyToProject.title')}</h2>
        <p className="muted small">{t('ui.copyToProject.info', { count })}</p>
        <div className="copy-list" role="listbox" aria-label={t('ui.copyToProject.title')}>
          {others.map((r) => (
            <button type="button" key={r.dir} role="option" aria-selected={target === r.dir}
              className={`copy-row${target === r.dir ? ' on' : ''}`}
              onClick={() => setTarget(r.dir)}>
              {r.title || r.dir}
              <span className="muted small"> · {r.dir}</span>
            </button>
          ))}
          {!others.length && <p className="muted small">{t('ui.copyToProject.noRecent')}</p>}
        </div>
        <div className="row">
          <button type="button" onClick={browse}>{t('ui.copyToProject.browse')}</button>
          {target && <span className="muted small">{target}</span>}
        </div>
        <div className="actions">
          <button type="button" onClick={onClose}>{t('btn.cancel')}</button>
          <button type="button" className="primary" disabled={!target || busy} onClick={go} ref={ref}>{busy ? t('ui.copyToProject.copying') : t('ui.copyToProject.copy')}</button>
        </div>
      </div>
    </div>
  );
}
