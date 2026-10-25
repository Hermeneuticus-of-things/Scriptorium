import React, { useEffect, useState } from 'react';
import { t } from '../lib/i18n.js';

const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;

// Help → Check for updates: current vs latest version, release notes, download with progress, install and restart.
export default function UpdateDialog({ api, initial = null, beforeInstall = async () => {}, onClose }) {
  const [info, setInfo] = useState(initial);
  const [state, setState] = useState(initial ? 'ready' : 'checking'); // checking | ready | downloading | downloaded | installing
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    if (!initial) {
      api.updateCheck()
        .then((r) => live && (setInfo(r), setState('ready')))
        .catch((e) => live && (setError(e.message || String(e)), setState('ready')));
    }
    const off = api.onUpdateProgress ? api.onUpdateProgress((p) => live && setProgress(p)) : null;
    return () => {
      live = false;
      off?.();
    };
  }, [api, initial]);

  const download = async () => {
    setError('');
    setState('downloading');
    try {
      setResult(await api.updateDownload());
      setState('downloaded');
    } catch (e) {
      setError(e.message || String(e));
      setState('ready');
    }
  };
  const install = async () => {
    setError('');
    setState('installing');
    try {
      await beforeInstall();
      const r = await api.updateInstall();
      if (r?.portable) {
        setResult({ ...result, shown: true });
        setState('downloaded');
      }
    } catch (e) {
      setError(e.message || String(e));
      setState('downloaded');
    }
  };

  const pct = progress && progress.total ? Math.round((progress.received / progress.total) * 100) : null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide update-dialog" role="dialog" aria-label={t('ui.update.title')} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <h2>{t('ui.update.title')}</h2>
        {state === 'checking' && <p role="status">{t('ui.update.checking')}</p>}
        {info?.unavailable && <p>{t('ui.update.browser')}</p>}
        {info && !info.unavailable && (
          <>
            <p>
              {t('ui.update.current')} <strong>{info.current}</strong> · {t('ui.update.latest')} <strong>{info.latest || '—'}</strong>
            </p>
            {!info.newer && <p role="status">{t('ui.update.upToDate')}</p>}
            {info.newer && info.notes && (
              <details open className="update-notes">
                <summary>{t('ui.update.notes')}</summary>
                <pre>{info.notes}</pre>
              </details>
            )}
            {info.newer && !info.asset && <p>{t('ui.update.noAsset')}</p>}
            {info.newer && info.portable && <p className="muted small">{t('ui.update.portableNote')}</p>}
          </>
        )}
        {state === 'downloading' && (
          <p role="status">
            {t('ui.update.downloading')} {pct != null ? `${pct}% (${mb(progress.received)} / ${mb(progress.total)})` : ''}
            {pct != null && <progress max={100} value={pct} style={{ display: 'block', width: '100%' }} />}
          </p>
        )}
        {state === 'downloaded' && result && (
          <p role="status">{result.shown ? t('ui.update.portableShown', { file: result.file }) : result.verified ? t('ui.update.verified') : t('ui.update.sizeOnly')}</p>
        )}
        {state === 'installing' && <p role="status">{t('ui.update.installing')}</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          {info?.newer && info.asset && (state === 'ready' || state === 'downloading') && (
            <button className="primary" onClick={download} disabled={state === 'downloading'}>{t('ui.update.download')}</button>
          )}
          {state === 'downloaded' && !result?.shown && (
            <button className="primary" onClick={install}>{result?.portable ? t('ui.update.showFile') : t('ui.update.install')}</button>
          )}
          <button onClick={onClose}>{t('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}

// Non-blocking "new version" banner: once per version, until the author opens it or dismisses it.
export function UpdateBanner({ info, onOpen, onDismiss }) {
  if (!info) return null;
  return (
    <div className="report-toast update-banner" role="status">
      <span>{t('ui.update.banner', { v: info.latest })}</span>
      <button className="primary" onClick={onOpen}>{t('ui.update.bannerAction')}</button>
      <button onClick={onDismiss} aria-label={t('btn.close')}>×</button>
    </div>
  );
}
